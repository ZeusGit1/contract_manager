using System.Globalization;
using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Services;

/// <summary>
/// Bulk-upload preview + commit. Server stateless between calls (ADR-011) — the client holds
/// the working state. On commit, each row creates a Contract + 9 lanes in one transaction per
/// row; failures don't fail the batch (plan.md §3.10). Legacy status mapping per ADR-035.
/// </summary>
public interface IBulkUploadService
{
    Task<BulkUploadPreviewDto> PreviewAsync(BulkUploadPreviewRequest request, CancellationToken cancellationToken);
    Task<BulkUploadCommitResult> CommitAsync(BulkUploadCommitRequest request, CancellationToken cancellationToken);
}

public class BulkUploadService : IBulkUploadService
{
    private readonly ContractManagerDbContext _db;
    private readonly IUserContext _userContext;
    private readonly IContractNumberGenerator _numberGenerator;
    private readonly IClock _clock;

    public BulkUploadService(
        ContractManagerDbContext db,
        IUserContext userContext,
        IContractNumberGenerator numberGenerator,
        IClock clock)
    {
        _db = db;
        _userContext = userContext;
        _numberGenerator = numberGenerator;
        _clock = clock;
    }

    public async Task<BulkUploadPreviewDto> PreviewAsync(BulkUploadPreviewRequest request, CancellationToken cancellationToken)
    {
        var inputs = request.Rows ?? Array.Empty<BulkUploadInputRow>();

        // Pre-load vendor + user lookups so we can match without N+1 queries.
        var vendorsByName = await _db.Vendors.AsNoTracking()
            .Select(v => new { v.VendorId, v.Name })
            .ToDictionaryAsync(v => v.Name, v => v.VendorId, StringComparer.OrdinalIgnoreCase, cancellationToken)
            .ConfigureAwait(false);

        var ownersByName = await _db.Users.AsNoTracking()
            .Select(u => new { u.UserId, u.DisplayName })
            .ToDictionaryAsync(u => u.DisplayName, u => u.UserId, StringComparer.OrdinalIgnoreCase, cancellationToken)
            .ConfigureAwait(false);

        var rows = new List<BulkUploadPreviewRow>(inputs.Count);
        int vendorDupes = 0;

        foreach (var row in inputs)
        {
            var errors = new List<BulkRowError>();
            var title = row.Title?.Trim();
            if (string.IsNullOrWhiteSpace(title)) errors.Add(new("Title", "Title is required."));

            Category? category = null;
            if (string.IsNullOrWhiteSpace(row.Category)) errors.Add(new("Category", "Category is required."));
            else if (!Enum.TryParse<Category>(row.Category, ignoreCase: true, out var cat)) errors.Add(new("Category", $"Unknown category '{row.Category}'."));
            else category = cat;

            int? matchedVendorId = null;
            var vendorName = row.VendorName?.Trim();
            if (string.IsNullOrWhiteSpace(vendorName)) errors.Add(new("VendorName", "Vendor name is required."));
            else if (vendorsByName.TryGetValue(vendorName, out var vendorId))
            {
                matchedVendorId = vendorId;
                vendorDupes++;
            }
            else errors.Add(new("VendorName", $"Unknown vendor '{vendorName}'. Add the vendor first or correct the name."));

            Priority? priority = null;
            if (!string.IsNullOrWhiteSpace(row.Priority))
            {
                if (Enum.TryParse<Priority>(row.Priority, ignoreCase: true, out var pri)) priority = pri;
                else errors.Add(new("Priority", $"Unknown priority '{row.Priority}'."));
            }
            else priority = Priority.Medium;

            Guid? procOwnerId = null;
            if (!string.IsNullOrWhiteSpace(row.ProcurementOwnerName))
            {
                if (ownersByName.TryGetValue(row.ProcurementOwnerName.Trim(), out var uid)) procOwnerId = uid;
                else errors.Add(new("ProcurementOwnerName", $"Unknown procurement owner '{row.ProcurementOwnerName}'."));
            }

            decimal? totalCost = null;
            if (!string.IsNullOrWhiteSpace(row.TotalCost))
            {
                if (decimal.TryParse(row.TotalCost, NumberStyles.Currency | NumberStyles.Number, CultureInfo.InvariantCulture, out var amount)) totalCost = amount;
                else errors.Add(new("TotalCost", $"Invalid amount '{row.TotalCost}'."));
            }

            var termStart = ParseDate(row.TermStartDate, "TermStartDate", errors);
            var termEnd = ParseDate(row.TermEndDate, "TermEndDate", errors);
            if (termStart.HasValue && termEnd.HasValue && termEnd.Value < termStart.Value)
            {
                errors.Add(new("TermEndDate", "Term end date is before term start date."));
            }

            var submittedDate = ParseDate(row.SubmittedDate, "SubmittedDate", errors) ?? _clock.UtcNow.Date;

            if (string.IsNullOrWhiteSpace(row.RequesterEmail)) errors.Add(new("RequesterEmail", "Requester email is required."));

            rows.Add(new BulkUploadPreviewRow(
                row.Index,
                row.ContractNumber?.Trim(),
                title,
                category,
                vendorName,
                matchedVendorId,
                priority,
                procOwnerId,
                row.RequesterName?.Trim(),
                row.RequesterEmail?.Trim(),
                totalCost,
                termStart,
                termEnd,
                submittedDate,
                row.LegacyStatus?.Trim(),
                errors.Count == 0,
                row.IsSkipped,
                errors));
        }

        return new BulkUploadPreviewDto(
            rows,
            rows.Count(r => r.IsValid && !r.IsSkipped),
            rows.Count(r => !r.IsValid && !r.IsSkipped),
            vendorDupes);
    }

    public async Task<BulkUploadCommitResult> CommitAsync(BulkUploadCommitRequest request, CancellationToken cancellationToken)
    {
        var failures = new List<BulkCommitFailure>();
        int imported = 0;
        int skipped = 0;
        var actor = _userContext.UserId ?? Guid.Empty;

        foreach (var row in request.Rows)
        {
            if (row.IsSkipped) { skipped++; continue; }
            if (!row.IsValid) { failures.Add(new(row.Index, row.ContractNumber, "Row is flagged invalid.")); continue; }

            try
            {
                await CommitOneAsync(row, actor, cancellationToken).ConfigureAwait(false);
                imported++;
            }
            catch (Exception ex)
            {
                // Per-row isolation: log + collect; don't fail the batch.
                failures.Add(new(row.Index, row.ContractNumber, ex.Message));
            }
        }

        return new BulkUploadCommitResult(imported, failures.Count, skipped, failures);
    }

    private async Task CommitOneAsync(BulkUploadPreviewRow row, Guid actor, CancellationToken cancellationToken)
    {
        if (row.Category is null || row.MatchedVendorId is null || string.IsNullOrWhiteSpace(row.Title) || string.IsNullOrWhiteSpace(row.RequesterEmail))
        {
            throw new InvalidOperationException("Row is missing required values.");
        }

        var contractNumber = string.IsNullOrWhiteSpace(row.ContractNumber)
            ? await _numberGenerator.NextAsync(cancellationToken).ConfigureAwait(false)
            : row.ContractNumber!.Trim();

        var (overallStatus, laneStatuses) = MapLegacyStatus(row.LegacyStatus);

        var now = _clock.UtcNow;
        var contract = new Contract
        {
            ContractNumber = contractNumber,
            Title = row.Title!.Trim(),
            Category = row.Category.Value,
            OverallStatus = overallStatus,
            Priority = row.Priority ?? Priority.Medium,
            VendorId = row.MatchedVendorId.Value,
            RequesterUserId = actor,
            RequesterEmail = row.RequesterEmail!.Trim(),
            ProcurementOwnerUserId = row.ProcurementOwnerUserId,
            TotalCostUsd = row.TotalCostUsd,
            TermStartDate = row.TermStartDate,
            TermEndDate = row.TermEndDate,
            SubmittedAt = row.SubmittedDate ?? now,
            LastActionAt = now,
        };
        foreach (var (laneId, status) in laneStatuses)
        {
            contract.Lanes.Add(new ContractLane
            {
                LaneId = laneId,
                Status = status,
                LastUpdated = now,
            });
        }
        contract.ActivityEvents.Add(new ActivityEvent
        {
            ActorUserId = actor,
            Type = ActivityType.BulkImported,
            DescriptionLine = $"Imported via bulk upload (legacy status: {row.LegacyStatus ?? "(none)"}).",
            OccurredAt = now,
        });

        _db.Contracts.Add(contract);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Legacy-status → (overallStatus, per-lane statuses) per ADR-035. Returned tuple lists every
    /// lane in canonical order so callers can drop straight into ContractLane rows.
    /// </summary>
    private static (OverallStatus Overall, IReadOnlyList<(LaneId LaneId, LaneStatus Status)> Lanes) MapLegacyStatus(string? legacyStatus)
    {
        var notStarted = LaneStatus.NotStarted;
        LaneStatus Proc = LaneStatus.InReview, Legal = notStarted, InfoSec = notStarted, Privacy = notStarted, Gco = notStarted,
            Vendor = notStarted, Requester = notStarted, Signature = notStarted, Filed = notStarted;
        var overall = OverallStatus.Active;

        switch ((legacyStatus ?? "InProcess").Trim())
        {
            case "WithVendor": Vendor = LaneStatus.Waiting; break;
            case "WithRequester": Requester = LaneStatus.Waiting; break;
            case "WithLegal": Legal = LaneStatus.InReview; break;
            case "WithGCO": Gco = LaneStatus.InReview; break;
            case "WithInfoSec": InfoSec = LaneStatus.InReview; break;
            case "WithPrivacy": Privacy = LaneStatus.InReview; break;
            case "OutForSignature": Signature = LaneStatus.Waiting; break;
            case "Completed":
                Proc = LaneStatus.Complete;
                Legal = InfoSec = Privacy = Gco = Vendor = Requester = Signature = Filed = LaneStatus.NA;
                overall = OverallStatus.Completed;
                break;
            case "OnHold": Proc = LaneStatus.Waiting; break;
            case "Canceled":
            case "Expired":
            case "Terminated":
                Proc = LaneStatus.Canceled;
                Legal = InfoSec = Privacy = Gco = Vendor = Requester = Signature = Filed = LaneStatus.Canceled;
                overall = OverallStatus.Canceled;
                break;
            case "InProcess":
            default:
                break;
        }

        return (overall, new[]
        {
            (LaneId.Procurement, Proc), (LaneId.Legal, Legal), (LaneId.InfoSec, InfoSec),
            (LaneId.Privacy, Privacy), (LaneId.GCO, Gco), (LaneId.Vendor, Vendor),
            (LaneId.Requester, Requester), (LaneId.Signature, Signature), (LaneId.Filed, Filed),
        });
    }

    private static DateTime? ParseDate(string? raw, string fieldKey, List<BulkRowError> errors)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        if (DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed)) return parsed;
        if (DateTime.TryParse(raw, out parsed)) return parsed.ToUniversalTime();
        errors.Add(new(fieldKey, $"Invalid date '{raw}'."));
        return null;
    }
}
