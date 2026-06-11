using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Services;

public interface IContractService
{
    Task<PagedResult<ContractRowDto>> ListAsync(ContractListFilter filter, int page, int pageSize, CancellationToken ct);
    Task<PagedResult<ContractRowDto>> ListArchiveAsync(string? query, int? year, int page, int pageSize, CancellationToken ct);
    Task<PagedResult<RenewalRowDto>> ListRenewalsAsync(int windowDays, Category? category, Guid? reviewerUserId, int page, int pageSize, CancellationToken ct);
    Task<ContractDetailDto?> GetAsync(int contractId, CancellationToken ct);
    Task<ContractDetailDto> CreateAsync(CreateContractRequest request, CancellationToken ct);
    Task<ContractDetailDto?> UpdateStatusAsync(int contractId, UpdateStatusRequest request, CancellationToken ct);
    Task<ContractDetailDto?> UpdateNextDueAsync(int contractId, UpdateNextDueRequest request, CancellationToken ct);
    Task<ContractDetailDto?> UpdateReviewerAsync(int contractId, UpdateReviewerRequest request, CancellationToken ct);
    Task<bool> SoftDeleteAsync(int contractId, CancellationToken ct);
}

public record ContractListFilter(string? Triage, Category? Category, Guid? AssigneeUserId, string? Query);

public class ContractService : IContractService
{
    private const int DefaultPageSize = 50;
    private const int MaxPageSize = 200;
    private const int ExpiringSoonDays = 14;

    private readonly ContractManagerDbContext _db;
    private readonly IContractAccess _access;
    private readonly IContractNumberGenerator _numberGenerator;
    private readonly IActivityRecorder _activity;
    private readonly IUserContext _userContext;
    private readonly IClock _clock;

    public ContractService(
        ContractManagerDbContext db,
        IContractAccess access,
        IContractNumberGenerator numberGenerator,
        IActivityRecorder activity,
        IUserContext userContext,
        IClock clock)
    {
        _db = db;
        _access = access;
        _numberGenerator = numberGenerator;
        _activity = activity;
        _userContext = userContext;
        _clock = clock;
    }

    public async Task<PagedResult<ContractRowDto>> ListAsync(
        ContractListFilter filter, int page, int pageSize, CancellationToken ct)
    {
        var clampedSize = Math.Clamp(pageSize <= 0 ? DefaultPageSize : pageSize, 1, MaxPageSize);
        var clampedPage = Math.Max(page, 1);

        var queryable = _access.ApplyListFilter(_db.Contracts.AsNoTracking());

        // Exclude archived/terminal states from the active dashboard.
        queryable = queryable.Where(c =>
            c.Status != ContractStatus.Completed
            && c.Status != ContractStatus.Canceled
            && c.Status != ContractStatus.Expired
            && c.Status != ContractStatus.Terminated);

        queryable = ApplyTriage(queryable, filter.Triage);

        if (filter.Category is Category cat) queryable = queryable.Where(c => c.Category == cat);
        if (filter.AssigneeUserId is Guid assignee) queryable = queryable.Where(c => c.AssignedReviewerUserId == assignee);
        if (!string.IsNullOrWhiteSpace(filter.Query))
        {
            var lowered = filter.Query.Trim().ToLower();
            queryable = queryable.Where(c =>
                c.Title.ToLower().Contains(lowered)
                || c.ContractNumber.ToLower().Contains(lowered)
                || (c.Vendor != null && c.Vendor.Name.ToLower().Contains(lowered)));
        }

        var total = await queryable.CountAsync(ct).ConfigureAwait(false);
        var today = _clock.UtcNow.Date;

        var rows = await queryable
            .OrderBy(c => c.NextActionDueAt == null)
            .ThenBy(c => c.NextActionDueAt)
            .ThenBy(c => c.ContractId)
            .Skip((clampedPage - 1) * clampedSize)
            .Take(clampedSize)
            .Select(c => new ContractRowDto(
                c.ContractId,
                c.ContractNumber,
                c.Title,
                c.Category,
                c.Status,
                c.Vendor!.Name,
                c.VendorId,
                c.AssignedReviewer == null ? null : c.AssignedReviewer.DisplayName,
                c.AssignedReviewerUserId,
                c.TotalCostUsd,
                c.TermEndDate,
                c.LastActionAt,
                c.NextActionDueAt,
                c.AssignedReviewerUserId == null
                    || (c.NextActionDueAt != null && c.NextActionDueAt < today),
                c.AssignedReviewerUserId == null ? "Unassigned — needs a reviewer"
                    : (c.NextActionDueAt != null && c.NextActionDueAt < today ? "Past due" : null)))
            .ToListAsync(ct).ConfigureAwait(false);

        return new PagedResult<ContractRowDto>(rows, total, clampedPage, clampedSize);
    }

    public async Task<PagedResult<ContractRowDto>> ListArchiveAsync(
        string? query, int? year, int page, int pageSize, CancellationToken ct)
    {
        var clampedSize = Math.Clamp(pageSize <= 0 ? DefaultPageSize : pageSize, 1, MaxPageSize);
        var clampedPage = Math.Max(page, 1);

        var queryable = _access.ApplyListFilter(_db.Contracts.AsNoTracking())
            .Where(c =>
                c.Status == ContractStatus.Completed
                || c.Status == ContractStatus.Canceled
                || c.Status == ContractStatus.Expired
                || c.Status == ContractStatus.Terminated);

        if (year is int filterYear)
        {
            queryable = queryable.Where(c => c.SubmittedAt.Year == filterYear);
        }
        if (!string.IsNullOrWhiteSpace(query))
        {
            var lowered = query.Trim().ToLower();
            queryable = queryable.Where(c =>
                c.Title.ToLower().Contains(lowered)
                || c.ContractNumber.ToLower().Contains(lowered)
                || (c.Vendor != null && c.Vendor.Name.ToLower().Contains(lowered)));
        }

        var total = await queryable.CountAsync(ct).ConfigureAwait(false);

        var rows = await queryable
            .OrderByDescending(c => c.LastActionAt)
            .Skip((clampedPage - 1) * clampedSize)
            .Take(clampedSize)
            .Select(c => new ContractRowDto(
                c.ContractId, c.ContractNumber, c.Title, c.Category, c.Status,
                c.Vendor!.Name, c.VendorId,
                c.AssignedReviewer == null ? null : c.AssignedReviewer.DisplayName,
                c.AssignedReviewerUserId,
                c.TotalCostUsd, c.TermEndDate, c.LastActionAt, c.NextActionDueAt,
                false, null))
            .ToListAsync(ct).ConfigureAwait(false);

        return new PagedResult<ContractRowDto>(rows, total, clampedPage, clampedSize);
    }

    public async Task<PagedResult<RenewalRowDto>> ListRenewalsAsync(
        int windowDays, Category? category, Guid? reviewerUserId, int page, int pageSize, CancellationToken ct)
    {
        var clampedSize = Math.Clamp(pageSize <= 0 ? DefaultPageSize : pageSize, 1, MaxPageSize);
        var clampedPage = Math.Max(page, 1);
        var clampedWindow = Math.Clamp(windowDays, 1, 365);

        var today = _clock.UtcNow.Date;
        var horizon = today.AddDays(clampedWindow);

        var queryable = _access.ApplyListFilter(_db.Contracts.AsNoTracking())
            .Where(c => c.TermEndDate != null && c.TermEndDate >= today && c.TermEndDate <= horizon);

        if (category is Category cat) queryable = queryable.Where(c => c.Category == cat);
        if (reviewerUserId is Guid rev) queryable = queryable.Where(c => c.AssignedReviewerUserId == rev);

        var total = await queryable.CountAsync(ct).ConfigureAwait(false);

        var rows = await queryable
            .OrderBy(c => c.TermEndDate)
            .Skip((clampedPage - 1) * clampedSize)
            .Take(clampedSize)
            .Select(c => new RenewalRowDto(
                c.ContractId, c.ContractNumber, c.Title, c.Category,
                c.Vendor!.Name, c.TermEndDate,
                c.TermEndDate == null ? (int?)null : (int)(c.TermEndDate.Value - today).TotalDays,
                c.Status,
                c.AssignedReviewer == null ? null : c.AssignedReviewer.DisplayName,
                _db.Contracts.Any(other =>
                    other.VendorId == c.VendorId
                    && other.ContractId != c.ContractId
                    && other.SubmittedAt > c.SubmittedAt
                    && other.TermStartDate != null && other.TermStartDate <= horizon)))
            .ToListAsync(ct).ConfigureAwait(false);

        return new PagedResult<RenewalRowDto>(rows, total, clampedPage, clampedSize);
    }

    public async Task<ContractDetailDto?> GetAsync(int contractId, CancellationToken ct)
    {
        if (!await _access.CanAccessAsync(contractId, ct).ConfigureAwait(false)) return null;
        return await BuildDetailAsync(contractId, ct).ConfigureAwait(false);
    }

    public async Task<ContractDetailDto> CreateAsync(CreateContractRequest request, CancellationToken ct)
    {
        var vendor = await _db.Vendors.FirstOrDefaultAsync(v => v.VendorId == request.VendorId, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Vendor not found");

        if (vendor.PreferredStatus == PreferredStatus.Blacklisted
            && !_userContext.IsInRole(Auth.AppRoles.Procurement))
        {
            throw new InvalidOperationException("Vendor is blacklisted; Procurement override required");
        }

        var requesterId = _userContext.UserId
            ?? throw new InvalidOperationException("Authenticated requester required");

        var now = _clock.UtcNow;
        var contract = new Contract
        {
            ContractNumber = await _numberGenerator.NextAsync(ct).ConfigureAwait(false),
            Title = request.Title,
            Category = request.Category,
            Status = ContractStatus.InProcess,
            VendorId = request.VendorId,
            RequesterUserId = requesterId,
            TotalCostUsd = request.TotalCostUsd,
            SignatureDeadline = request.SignatureDeadline,
            SubmittedAt = now,
            TermStartDate = request.TermStartDate,
            TermEndDate = request.TermEndDate,
            LastActionAt = now,
            Description = request.Description,
            EventDate = request.EventDate,
            VenueLocation = request.VenueLocation,
            PartOfLargerEvent = request.PartOfLargerEvent,
            ParentEventName = request.ParentEventName,
            ServiceDescription = request.ServiceDescription,
            ITType = request.ITType,
            ApplicationName = request.ApplicationName,
            ApplicationVersion = request.ApplicationVersion,
            LicensingType = request.LicensingType,
            NumberOfUsers = request.NumberOfUsers,
            CloudOrOnPrem = request.CloudOrOnPrem,
            SystemAccess = request.SystemAccess,
            Permissions = request.Permissions,
            Integrations = request.Integrations,
            AccessesPersonalData = request.AccessesPersonalData,
            AccessesPHI = request.AccessesPHI,
            UsesAI = request.UsesAI,
        };
        _db.Contracts.Add(contract);
        await _db.SaveChangesAsync(ct).ConfigureAwait(false);

        _activity.Record(contract, ActivityType.Created, $"Contract {contract.ContractNumber} submitted");
        await _db.SaveChangesAsync(ct).ConfigureAwait(false);

        return (await BuildDetailAsync(contract.ContractId, ct).ConfigureAwait(false))!;
    }

    public async Task<ContractDetailDto?> UpdateStatusAsync(int contractId, UpdateStatusRequest request, CancellationToken ct)
    {
        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.ContractId == contractId, ct).ConfigureAwait(false);
        if (contract is null) return null;

        if (!await _access.CanEditAsync(contractId, ct).ConfigureAwait(false)) return null;

        if (contract.Status == request.NewStatus)
        {
            return await BuildDetailAsync(contractId, ct).ConfigureAwait(false);
        }

        var fromStatus = contract.Status;
        contract.Status = request.NewStatus;
        _activity.Record(contract, ActivityType.StatusChanged,
            $"Status changed from {fromStatus} to {request.NewStatus}",
            $"{{\"from\":\"{fromStatus}\",\"to\":\"{request.NewStatus}\"}}");

        // Reset reminder window when leaving OutForSignature
        if (fromStatus == ContractStatus.OutForSignature && request.NewStatus != ContractStatus.OutForSignature)
        {
            contract.LastReminderSentAt = null;
        }

        await _db.SaveChangesAsync(ct).ConfigureAwait(false);
        return await BuildDetailAsync(contractId, ct).ConfigureAwait(false);
    }

    public async Task<ContractDetailDto?> UpdateNextDueAsync(int contractId, UpdateNextDueRequest request, CancellationToken ct)
    {
        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.ContractId == contractId, ct).ConfigureAwait(false);
        if (contract is null) return null;
        if (!await _access.CanEditAsync(contractId, ct).ConfigureAwait(false)) return null;

        contract.NextActionDueAt = request.NextActionDueDate;
        _activity.Record(contract, ActivityType.NextDueUpdated,
            request.NextActionDueDate is DateTime due
                ? $"Next action due set to {due:yyyy-MM-dd}"
                : "Next action due cleared");
        await _db.SaveChangesAsync(ct).ConfigureAwait(false);
        return await BuildDetailAsync(contractId, ct).ConfigureAwait(false);
    }

    public async Task<ContractDetailDto?> UpdateReviewerAsync(int contractId, UpdateReviewerRequest request, CancellationToken ct)
    {
        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.ContractId == contractId, ct).ConfigureAwait(false);
        if (contract is null) return null;
        if (!await _access.CanEditAsync(contractId, ct).ConfigureAwait(false)) return null;

        contract.AssignedReviewerUserId = request.LeadReviewerUserId;
        var description = request.LeadReviewerUserId is Guid id
            ? $"Lead reviewer reassigned to {id}"
            : "Lead reviewer cleared";
        _activity.Record(contract, ActivityType.Reassigned, description);
        await _db.SaveChangesAsync(ct).ConfigureAwait(false);
        return await BuildDetailAsync(contractId, ct).ConfigureAwait(false);
    }

    public async Task<bool> SoftDeleteAsync(int contractId, CancellationToken ct)
    {
        var contract = await _db.Contracts.FirstOrDefaultAsync(c => c.ContractId == contractId, ct).ConfigureAwait(false);
        if (contract is null) return false;
        if (!await _access.CanEditAsync(contractId, ct).ConfigureAwait(false)) return false;

        // Interceptor converts hard delete to soft delete + flags IsDeleted/DeletedAt.
        _db.Contracts.Remove(contract);
        await _db.SaveChangesAsync(ct).ConfigureAwait(false);
        return true;
    }

    private IQueryable<Contract> ApplyTriage(IQueryable<Contract> queryable, string? triage)
    {
        if (string.IsNullOrEmpty(triage) || string.Equals(triage, "all", StringComparison.OrdinalIgnoreCase))
        {
            return queryable;
        }

        var today = _clock.UtcNow.Date;
        return triage.ToLowerInvariant() switch
        {
            "action" => queryable.Where(c =>
                c.AssignedReviewerUserId == null
                || (c.NextActionDueAt != null && c.NextActionDueAt < today)),
            "review" => queryable.Where(c =>
                c.Status == ContractStatus.WithLegal
                || c.Status == ContractStatus.WithGCO
                || c.Status == ContractStatus.WithInfoSec
                || c.Status == ContractStatus.WithPrivacy),
            "sign" => queryable.Where(c => c.Status == ContractStatus.OutForSignature),
            "expiring" => queryable.Where(c => c.TermEndDate != null
                && c.TermEndDate >= today
                && c.TermEndDate <= today.AddDays(ExpiringSoonDays)),
            "closed" => queryable.Where(c => c.Status == ContractStatus.OnHold),
            _ => queryable,
        };
    }

    private async Task<ContractDetailDto?> BuildDetailAsync(int contractId, CancellationToken ct)
    {
        var contract = await _db.Contracts.AsNoTracking()
            .Include(c => c.Vendor)
            .Include(c => c.Requester)
            .Include(c => c.AssignedReviewer)
            .FirstOrDefaultAsync(c => c.ContractId == contractId, ct).ConfigureAwait(false);
        if (contract is null) return null;

        var commentCount = await _db.ContractComments.CountAsync(x => x.ContractId == contractId, ct).ConfigureAwait(false);
        var noteCount = await _db.ContractNotes.CountAsync(x => x.ContractId == contractId, ct).ConfigureAwait(false);
        var attachmentCount = await _db.ContractAttachments.CountAsync(x => x.ContractId == contractId, ct).ConfigureAwait(false);
        var canEdit = await _access.CanEditAsync(contractId, ct).ConfigureAwait(false);

        return new ContractDetailDto(
            contract.ContractId,
            contract.ContractNumber,
            contract.Title,
            contract.Category,
            contract.Status,
            contract.VendorId,
            contract.Vendor!.Name,
            contract.Vendor.PreferredStatus,
            contract.RequesterUserId,
            contract.Requester?.DisplayName ?? string.Empty,
            contract.AssignedReviewerUserId,
            contract.AssignedReviewer?.DisplayName,
            contract.TotalCostUsd,
            contract.SignatureDeadline,
            contract.SubmittedAt,
            contract.TermStartDate,
            contract.TermEndDate,
            contract.LastActionAt,
            contract.NextActionDueAt,
            contract.Description,
            contract.EventDate,
            contract.VenueLocation,
            contract.PartOfLargerEvent,
            contract.ParentEventName,
            contract.ServiceDescription,
            contract.ITType,
            contract.ApplicationName,
            contract.ApplicationVersion,
            contract.LicensingType,
            contract.NumberOfUsers,
            contract.CloudOrOnPrem,
            contract.SystemAccess,
            contract.Permissions,
            contract.Integrations,
            contract.AccessesPersonalData,
            contract.AccessesPHI,
            contract.UsesAI,
            commentCount,
            noteCount,
            attachmentCount,
            canEdit);
    }
}
