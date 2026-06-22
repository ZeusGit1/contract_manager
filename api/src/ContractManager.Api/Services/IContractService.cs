using ContractManager.Api.Auth;
using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Services;

/// <summary>
/// Core contract operations for the v2.0 parallel-lanes model. Lane-mutation logic lives in
/// <see cref="ILaneService"/>; this service handles header CRUD, list/detail (role-filtered),
/// archive, and the create flow that inserts the 9 lanes per ADR-030.
/// </summary>
public interface IContractService
{
    Task<PagedResult<ContractRowDto>> ListAsync(ContractListFilter filter, int page, int pageSize, CancellationToken cancellationToken);
    Task<PagedResult<ContractRowDto>> ArchiveAsync(ContractArchiveFilter filter, int page, int pageSize, CancellationToken cancellationToken);
    Task<ContractDetailDto?> GetAsync(int contractId, CancellationToken cancellationToken);
    Task<ContractDetailDto> CreateAsync(CreateContractRequest request, CancellationToken cancellationToken);
    Task<ContractDetailDto?> UpdateAsync(int contractId, UpdateContractRequest request, CancellationToken cancellationToken);
    Task<bool> UpdateOverallStatusAsync(int contractId, UpdateOverallStatusRequest request, CancellationToken cancellationToken);
    Task<bool> UpdateProcurementOwnerAsync(int contractId, UpdateProcurementOwnerRequest request, CancellationToken cancellationToken);
    Task<bool> SoftDeleteAsync(int contractId, CancellationToken cancellationToken);
}

public class ContractService : IContractService
{
    private const int MaxPageSize = 200;

    private readonly ContractManagerDbContext _db;
    private readonly IUserContext _userContext;
    private readonly IContractAccess _access;
    private readonly IContractNumberGenerator _numberGenerator;
    private readonly IActivityRecorder _activity;
    private readonly IClock _clock;

    public ContractService(
        ContractManagerDbContext db,
        IUserContext userContext,
        IContractAccess access,
        IContractNumberGenerator numberGenerator,
        IActivityRecorder activity,
        IClock clock)
    {
        _db = db;
        _userContext = userContext;
        _access = access;
        _numberGenerator = numberGenerator;
        _activity = activity;
        _clock = clock;
    }

    public async Task<PagedResult<ContractRowDto>> ListAsync(ContractListFilter filter, int page, int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = page < 1 ? 1 : page;
        var clampedSize = pageSize < 1 ? 50 : Math.Min(pageSize, MaxPageSize);

        var query = _access.ApplyListFilter(_db.Contracts.AsNoTracking());

        // view=master is Procurement-only — list filter already restricts by role.
        // For "mine" (default Procurement landing), restrict to contracts where the signed-in
        // Procurement owner has any lane in {InReview, Waiting}.
        if (string.Equals(filter.View, "mine", StringComparison.OrdinalIgnoreCase))
        {
            var oid = _userContext.UserId ?? Guid.Empty;
            query = query.Where(c =>
                c.OverallStatus == OverallStatus.Active
                && c.Lanes.Any(l => l.OwnerUserId == oid
                    && (l.Status == LaneStatus.InReview || l.Status == LaneStatus.Waiting)));
        }
        else if (string.Equals(filter.View, "submissions", StringComparison.OrdinalIgnoreCase))
        {
            // Already constrained via ApplyListFilter for Requester role, but be explicit.
            var oid = _userContext.UserId ?? Guid.Empty;
            query = query.Where(c => c.RequesterUserId == oid);
        }
        else if (string.Equals(filter.View, "reviews", StringComparison.OrdinalIgnoreCase))
        {
            var oid = _userContext.UserId ?? Guid.Empty;
            query = query.Where(c => c.Assignments.Any(a => a.ReviewerUserId == oid));
        }
        else
        {
            // master view (or null) — Procurement sees all active by default; the archive endpoint
            // covers completed/canceled.
            query = query.Where(c => c.OverallStatus == OverallStatus.Active);
        }

        if (filter.Category.HasValue) query = query.Where(c => c.Category == filter.Category.Value);
        if (filter.Priority.HasValue) query = query.Where(c => c.Priority == filter.Priority.Value);
        if (filter.ProcurementOwnerUserId.HasValue)
            query = query.Where(c => c.ProcurementOwnerUserId == filter.ProcurementOwnerUserId.Value);

        if (!string.IsNullOrWhiteSpace(filter.Query))
        {
            var pattern = $"%{filter.Query.Trim()}%";
            query = query.Where(c =>
                EF.Functions.Like(c.Title, pattern)
                || EF.Functions.Like(c.ContractNumber, pattern)
                || (c.Vendor != null && EF.Functions.Like(c.Vendor.Name, pattern))
                || (c.Requester != null && EF.Functions.Like(c.Requester.DisplayName, pattern)));
        }

        var total = await query.CountAsync(cancellationToken).ConfigureAwait(false);

        var pageOfContracts = await query
            .OrderByDescending(c => c.Priority)
            .ThenByDescending(c => c.LastActionAt)
            .Skip((clampedPage - 1) * clampedSize)
            .Take(clampedSize)
            .Select(c => new
            {
                c.ContractId,
                c.ContractNumber,
                c.Title,
                c.Category,
                c.OverallStatus,
                c.Priority,
                c.VendorId,
                VendorName = c.Vendor != null ? c.Vendor.Name : string.Empty,
                c.RequesterUserId,
                RequesterName = c.Requester != null ? c.Requester.DisplayName : string.Empty,
                c.ProcurementOwnerUserId,
                ProcurementOwnerName = c.ProcurementOwner != null ? c.ProcurementOwner.DisplayName : null,
                c.TotalCostUsd,
                c.TermStartDate,
                c.TermEndDate,
                c.SubmittedAt,
                c.LastActionAt,
                Lanes = c.Lanes
                    .OrderBy(l => l.LaneId)
                    .Select(l => new
                    {
                        l.LaneId,
                        l.Status,
                        l.OwnerUserId,
                        OwnerName = l.Owner != null ? l.Owner.DisplayName : null,
                        l.DueDate,
                    }).ToList(),
            })
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        var rows = pageOfContracts.Select(c => new ContractRowDto(
            c.ContractId, c.ContractNumber, c.Title, c.Category, c.OverallStatus, c.Priority,
            c.VendorId, c.VendorName,
            c.RequesterUserId, c.RequesterName,
            c.ProcurementOwnerUserId, c.ProcurementOwnerName,
            c.TotalCostUsd, c.TermStartDate, c.TermEndDate, c.SubmittedAt, c.LastActionAt,
            c.Lanes.Count(l => l.Status == LaneStatus.InReview || l.Status == LaneStatus.Waiting),
            c.Lanes.Select(l => new LanePillDto(l.LaneId, l.Status, l.OwnerName, l.DueDate)).ToList())).ToList();

        return new PagedResult<ContractRowDto>(rows, clampedPage, clampedSize, total);
    }

    public async Task<PagedResult<ContractRowDto>> ArchiveAsync(ContractArchiveFilter filter, int page, int pageSize, CancellationToken cancellationToken)
    {
        var clampedPage = page < 1 ? 1 : page;
        var clampedSize = pageSize < 1 ? 50 : Math.Min(pageSize, MaxPageSize);

        var query = _access.ApplyListFilter(_db.Contracts.AsNoTracking())
            .Where(c => c.OverallStatus == OverallStatus.Completed || c.OverallStatus == OverallStatus.Canceled);

        if (filter.Year.HasValue)
        {
            var start = new DateTime(filter.Year.Value, 1, 1);
            var end = start.AddYears(1);
            query = query.Where(c => c.SubmittedAt >= start && c.SubmittedAt < end);
        }

        if (!string.IsNullOrWhiteSpace(filter.Query))
        {
            var pattern = $"%{filter.Query.Trim()}%";
            query = query.Where(c =>
                EF.Functions.Like(c.Title, pattern)
                || EF.Functions.Like(c.ContractNumber, pattern)
                || (c.Vendor != null && EF.Functions.Like(c.Vendor.Name, pattern)));
        }

        var total = await query.CountAsync(cancellationToken).ConfigureAwait(false);

        var pageOfContracts = await query
            .OrderByDescending(c => c.LastActionAt)
            .Skip((clampedPage - 1) * clampedSize)
            .Take(clampedSize)
            .Select(c => new
            {
                c.ContractId, c.ContractNumber, c.Title, c.Category, c.OverallStatus, c.Priority,
                c.VendorId,
                VendorName = c.Vendor != null ? c.Vendor.Name : string.Empty,
                c.RequesterUserId,
                RequesterName = c.Requester != null ? c.Requester.DisplayName : string.Empty,
                c.ProcurementOwnerUserId,
                ProcurementOwnerName = c.ProcurementOwner != null ? c.ProcurementOwner.DisplayName : null,
                c.TotalCostUsd, c.TermStartDate, c.TermEndDate, c.SubmittedAt, c.LastActionAt,
                Lanes = c.Lanes.OrderBy(l => l.LaneId).Select(l => new
                {
                    l.LaneId, l.Status, l.OwnerUserId,
                    OwnerName = l.Owner != null ? l.Owner.DisplayName : null,
                    l.DueDate,
                }).ToList(),
            })
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        var rows = pageOfContracts.Select(c => new ContractRowDto(
            c.ContractId, c.ContractNumber, c.Title, c.Category, c.OverallStatus, c.Priority,
            c.VendorId, c.VendorName,
            c.RequesterUserId, c.RequesterName,
            c.ProcurementOwnerUserId, c.ProcurementOwnerName,
            c.TotalCostUsd, c.TermStartDate, c.TermEndDate, c.SubmittedAt, c.LastActionAt,
            0, // archive rows have no active lanes by definition
            c.Lanes.Select(l => new LanePillDto(l.LaneId, l.Status, l.OwnerName, l.DueDate)).ToList())).ToList();

        return new PagedResult<ContractRowDto>(rows, clampedPage, clampedSize, total);
    }

    public async Task<ContractDetailDto?> GetAsync(int contractId, CancellationToken cancellationToken)
    {
        if (!await _access.CanAccessAsync(contractId, cancellationToken).ConfigureAwait(false))
        {
            return null; // controller returns 403 — 404 leaks existence
        }

        var contract = await _db.Contracts.AsNoTracking()
            .Include(c => c.Vendor)
            .Include(c => c.Requester)
            .Include(c => c.ProcurementOwner)
            .Include(c => c.FieldValues)
            .ThenInclude(v => v.CategoryField)
            .Where(c => c.ContractId == contractId)
            .FirstOrDefaultAsync(cancellationToken).ConfigureAwait(false);

        return contract is null ? null : ProjectDetail(contract);
    }

    public async Task<ContractDetailDto> CreateAsync(CreateContractRequest request, CancellationToken cancellationToken)
    {
        var vendor = await _db.Vendors.FirstOrDefaultAsync(v => v.VendorId == request.VendorId, cancellationToken).ConfigureAwait(false)
            ?? throw new InvalidOperationException($"Vendor {request.VendorId} not found");

        // Blacklisted vendor blocks Requester submit unless ProcurementOverride=true with a reason.
        if (vendor.PreferredStatus == PreferredStatus.Blacklisted)
        {
            var isProcurement = _userContext.IsInRole(AppRoles.Procurement) || _userContext.IsInRole(AppRoles.ProcurementAdmin);
            if (!isProcurement || !request.ProcurementOverride || string.IsNullOrWhiteSpace(request.OverrideReason))
            {
                throw new InvalidOperationException("Vendor is blacklisted. Procurement override + reason required.");
            }
        }

        var now = _clock.UtcNow;
        var contractNumber = await _numberGenerator.NextAsync(cancellationToken).ConfigureAwait(false);

        var contract = new Contract
        {
            ContractNumber = contractNumber,
            Title = request.Title.Trim(),
            Category = request.Category,
            OverallStatus = OverallStatus.Active,
            Priority = request.Priority,
            VendorId = request.VendorId,
            RequesterUserId = _userContext.UserId ?? Guid.Empty,
            RequesterEmail = request.RequesterEmail.Trim(),
            ProcurementOwnerUserId = null,
            TotalCostUsd = request.TotalCostUsd,
            TermStartDate = request.TermStartDate,
            TermEndDate = request.TermEndDate,
            Description = request.Description,
            SubmittedAt = now,
            LastActionAt = now,
        };

        ApplyCategoryFields(contract, request.EventFields, request.FacilitiesFields, request.ItFields);

        _db.Contracts.Add(contract);

        // Insert the 9 lanes — Procurement = InReview, others = NotStarted (ADR-030).
        foreach (var laneId in Enum.GetValues<LaneId>())
        {
            contract.Lanes.Add(new ContractLane
            {
                LaneId = laneId,
                Status = laneId == LaneId.Procurement ? LaneStatus.InReview : LaneStatus.NotStarted,
                LastUpdated = now,
            });
        }

        _activity.Record(contract, ActivityType.ContractCreated, $"Contract {contractNumber} created.");

        // Save once so ContractId + ContractLane FKs resolve correctly.
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        // Custom (admin) field values write after save so we have a stable ContractId.
        await ApplyCustomFieldValuesAsync(contract.ContractId, request.Category, request.CustomFieldValues, cancellationToken).ConfigureAwait(false);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return (await GetAsync(contract.ContractId, cancellationToken).ConfigureAwait(false))
            ?? throw new InvalidOperationException("Contract created but could not be read back.");
    }

    public async Task<ContractDetailDto?> UpdateAsync(int contractId, UpdateContractRequest request, CancellationToken cancellationToken)
    {
        if (!await _access.CanAccessAsync(contractId, cancellationToken).ConfigureAwait(false)) return null;
        if (!await _access.CanEditAsync(contractId, cancellationToken).ConfigureAwait(false))
        {
            throw new UnauthorizedAccessException("Only Procurement can edit contract headers.");
        }

        var contract = await _db.Contracts
            .Include(c => c.FieldValues)
            .FirstOrDefaultAsync(c => c.ContractId == contractId, cancellationToken).ConfigureAwait(false);
        if (contract is null) return null;

        if (!string.IsNullOrWhiteSpace(request.Title)) contract.Title = request.Title!.Trim();
        if (request.Priority.HasValue) contract.Priority = request.Priority.Value;
        if (request.VendorId.HasValue) contract.VendorId = request.VendorId.Value;
        if (!string.IsNullOrWhiteSpace(request.RequesterEmail)) contract.RequesterEmail = request.RequesterEmail!.Trim();
        if (request.TotalCostUsd.HasValue) contract.TotalCostUsd = request.TotalCostUsd;
        if (request.TermStartDate.HasValue) contract.TermStartDate = request.TermStartDate;
        if (request.TermEndDate.HasValue) contract.TermEndDate = request.TermEndDate;
        if (request.Description is not null) contract.Description = request.Description;

        ApplyCategoryFields(contract, request.EventFields, request.FacilitiesFields, request.ItFields);

        _activity.Record(contract, ActivityType.OwnerReassigned, $"Contract {contract.ContractNumber} header updated.");

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        if (request.CustomFieldValues is { Count: > 0 })
        {
            await ApplyCustomFieldValuesAsync(contract.ContractId, contract.Category, request.CustomFieldValues, cancellationToken).ConfigureAwait(false);
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        return await GetAsync(contract.ContractId, cancellationToken).ConfigureAwait(false);
    }

    public async Task<bool> UpdateOverallStatusAsync(int contractId, UpdateOverallStatusRequest request, CancellationToken cancellationToken)
    {
        if (!await _access.CanAccessAsync(contractId, cancellationToken).ConfigureAwait(false)) return false;
        if (!await _access.CanEditAsync(contractId, cancellationToken).ConfigureAwait(false))
        {
            throw new UnauthorizedAccessException("Only Procurement can change overall status.");
        }

        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.ContractId == contractId, cancellationToken).ConfigureAwait(false);
        if (contract is null) return false;

        var previous = contract.OverallStatus;
        if (previous == request.OverallStatus) return true; // no-op

        contract.OverallStatus = request.OverallStatus;
        var reasonNote = string.IsNullOrWhiteSpace(request.Reason) ? string.Empty : $" — {request.Reason}";
        _activity.Record(contract, ActivityType.OverallStatusChanged,
            $"Overall status {previous} → {request.OverallStatus}{reasonNote}",
            $"{{\"from\":\"{previous}\",\"to\":\"{request.OverallStatus}\"}}");

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<bool> UpdateProcurementOwnerAsync(int contractId, UpdateProcurementOwnerRequest request, CancellationToken cancellationToken)
    {
        if (!await _access.CanAccessAsync(contractId, cancellationToken).ConfigureAwait(false)) return false;
        if (!await _access.CanEditAsync(contractId, cancellationToken).ConfigureAwait(false))
        {
            throw new UnauthorizedAccessException("Only Procurement can reassign the Procurement owner.");
        }

        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.ContractId == contractId, cancellationToken).ConfigureAwait(false);
        if (contract is null) return false;

        contract.ProcurementOwnerUserId = request.ProcurementOwnerUserId;
        _activity.Record(contract, ActivityType.OwnerReassigned,
            request.ProcurementOwnerUserId.HasValue
                ? $"Procurement owner reassigned."
                : $"Procurement owner unset.");

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<bool> SoftDeleteAsync(int contractId, CancellationToken cancellationToken)
    {
        if (!await _access.CanAccessAsync(contractId, cancellationToken).ConfigureAwait(false)) return false;
        if (!await _access.CanEditAsync(contractId, cancellationToken).ConfigureAwait(false))
        {
            throw new UnauthorizedAccessException("Only Procurement can delete contracts.");
        }

        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.ContractId == contractId, cancellationToken).ConfigureAwait(false);
        if (contract is null) return false;

        contract.IsDeleted = true;
        contract.DeletedAt = _clock.UtcNow;
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    // -------------------------------- helpers --------------------------------

    private ContractDetailDto ProjectDetail(Contract contract)
    {
        var customFieldValues = contract.FieldValues
            .Where(v => !v.IsDeleted)
            .ToDictionary(v => v.FieldKey, v => v.ValueText);

        return new ContractDetailDto(
            contract.ContractId,
            contract.ContractNumber,
            contract.Title,
            contract.Category,
            contract.OverallStatus,
            contract.Priority,
            contract.VendorId,
            contract.Vendor?.Name ?? string.Empty,
            contract.Vendor?.PreferredStatus ?? PreferredStatus.Standard,
            contract.RequesterUserId,
            contract.Requester?.DisplayName ?? string.Empty,
            contract.RequesterEmail,
            contract.ProcurementOwnerUserId,
            contract.ProcurementOwner?.DisplayName,
            contract.TotalCostUsd,
            contract.TermStartDate,
            contract.TermEndDate,
            contract.SubmittedAt,
            contract.LastActionAt,
            contract.Description,
            contract.Category == Category.Event
                ? new EventFieldsDto(contract.EventName, contract.EventDate, contract.VenueLocation, contract.ParentEventName)
                : null,
            contract.Category == Category.Facilities
                ? new FacilitiesFieldsDto(contract.Building, contract.ServiceDescription)
                : null,
            contract.Category == Category.IT
                ? new ItFieldsDto(contract.ITType, contract.ApplicationName, contract.ApplicationVersion,
                    contract.LicensingType, contract.NumberOfUsers, contract.CloudOrOnPrem,
                    contract.SystemAccess, contract.Permissions, contract.Integrations,
                    contract.AccessesPersonalData, contract.AccessesPHI, contract.AccessesClientMatter, contract.UsesAI)
                : null,
            customFieldValues,
            CapabilitiesForCaller());
    }

    private ContractCapabilitiesDto CapabilitiesForCaller()
    {
        var isProc = _userContext.IsInRole(AppRoles.Procurement) || _userContext.IsInRole(AppRoles.ProcurementAdmin);
        return new ContractCapabilitiesDto(
            CanEditHeader: isProc,
            CanUpdateLanes: isProc,
            CanManageAssignments: isProc,
            CanSendReminder: isProc,
            CanSeeInternalOnlyComments: _access.CanSeeInternalOnlyComments(),
            CanSeeNotes: _access.CanSeeNotesTab());
    }

    private static void ApplyCategoryFields(Contract contract, EventFieldsDto? eventFields, FacilitiesFieldsDto? facilitiesFields, ItFieldsDto? itFields)
    {
        // Null out everything category-specific first, then populate only the category in play.
        contract.EventName = null;
        contract.EventDate = null;
        contract.VenueLocation = null;
        contract.ParentEventName = null;
        contract.Building = null;
        contract.ServiceDescription = null;
        contract.ITType = null;
        contract.ApplicationName = null;
        contract.ApplicationVersion = null;
        contract.LicensingType = null;
        contract.NumberOfUsers = null;
        contract.CloudOrOnPrem = null;
        contract.SystemAccess = null;
        contract.Permissions = null;
        contract.Integrations = null;
        contract.AccessesPersonalData = null;
        contract.AccessesPHI = null;
        contract.AccessesClientMatter = null;
        contract.UsesAI = null;

        switch (contract.Category)
        {
            case Category.Event when eventFields is not null:
                contract.EventName = eventFields.EventName;
                contract.EventDate = eventFields.EventDate;
                contract.VenueLocation = eventFields.VenueLocation;
                contract.ParentEventName = eventFields.ParentEventName;
                break;
            case Category.Facilities when facilitiesFields is not null:
                contract.Building = facilitiesFields.Building;
                contract.ServiceDescription = facilitiesFields.ServiceDescription;
                break;
            case Category.IT when itFields is not null:
                contract.ITType = itFields.ITType;
                contract.ApplicationName = itFields.ApplicationName;
                contract.ApplicationVersion = itFields.ApplicationVersion;
                contract.LicensingType = itFields.LicensingType;
                contract.NumberOfUsers = itFields.NumberOfUsers;
                contract.CloudOrOnPrem = itFields.CloudOrOnPrem;
                contract.SystemAccess = itFields.SystemAccess;
                contract.Permissions = itFields.Permissions;
                contract.Integrations = itFields.Integrations;
                contract.AccessesPersonalData = itFields.AccessesPersonalData;
                contract.AccessesPHI = itFields.AccessesPHI;
                contract.AccessesClientMatter = itFields.AccessesClientMatter;
                contract.UsesAI = itFields.UsesAI;
                break;
        }
    }

    private async Task ApplyCustomFieldValuesAsync(int contractId, Category category,
        IDictionary<string, string?>? customFieldValues, CancellationToken cancellationToken)
    {
        if (customFieldValues is null || customFieldValues.Count == 0) return;

        // Resolve admin (non-system) fields for this category. System fields are not stored here.
        var fields = await _db.CategoryFields.AsNoTracking()
            .Where(f => f.Category!.Code == category.ToString() && !f.IsSystemDefined && f.IsActive)
            .Select(f => new { f.CategoryFieldId, f.FieldKey })
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        var byKey = fields.ToDictionary(f => f.FieldKey, f => f.CategoryFieldId);

        var existing = await _db.ContractFieldValues
            .Where(v => v.ContractId == contractId)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        var existingByKey = existing.ToDictionary(v => v.FieldKey, v => v);

        foreach (var (key, value) in customFieldValues)
        {
            if (!byKey.TryGetValue(key, out var categoryFieldId)) continue; // unknown key — silently skip
            if (existingByKey.TryGetValue(key, out var row))
            {
                row.ValueText = value;
            }
            else
            {
                _db.ContractFieldValues.Add(new ContractFieldValue
                {
                    ContractId = contractId,
                    CategoryFieldId = categoryFieldId,
                    FieldKey = key,
                    ValueText = value,
                });
            }
        }
    }
}
