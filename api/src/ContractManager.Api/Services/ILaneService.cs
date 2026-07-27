using ContractManager.Api.Auth;
using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Services;

/// <summary>
/// Lane reads (any role with contract access) + Procurement-only writes. When the Procurement
/// lane goes Complete, OverallStatus flips to Completed in the same transaction (ADR-029).
/// </summary>
public interface ILaneService
{
    Task<IReadOnlyList<ContractLaneDto>?> ListAsync(int contractId, CancellationToken cancellationToken);
    Task<ContractLaneDto?> UpdateAsync(int contractId, LaneId laneId, UpdateLaneRequest request, CancellationToken cancellationToken);
}

public class LaneService : ILaneService
{
    private static readonly HashSet<LaneId> ExternalLanes =
        new() { LaneId.Vendor, LaneId.Requester, LaneId.Signature };

    private readonly ContractManagerDbContext _db;
    private readonly IUserContext _userContext;
    private readonly IContractAccess _access;
    private readonly IActivityRecorder _activity;
    private readonly IClock _clock;

    public LaneService(
        ContractManagerDbContext db,
        IUserContext userContext,
        IContractAccess access,
        IActivityRecorder activity,
        IClock clock)
    {
        _db = db;
        _userContext = userContext;
        _access = access;
        _activity = activity;
        _clock = clock;
    }

    public async Task<IReadOnlyList<ContractLaneDto>?> ListAsync(int contractId, CancellationToken cancellationToken)
    {
        if (!await _access.CanAccessAsync(contractId, cancellationToken).ConfigureAwait(false))
        {
            return null;
        }

        var lanes = await _db.ContractLanes.AsNoTracking()
            .Include(l => l.Owner)
            .Where(l => l.ContractId == contractId)
            .OrderBy(l => l.LaneId)
            .Select(l => new ContractLaneDto(
                l.ContractLaneId, l.ContractId, l.LaneId, l.Status,
                l.OwnerUserId, l.Owner != null ? l.Owner.DisplayName : null,
                l.OwnerLabel, l.DueDate, l.LastUpdated, l.Note))
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        return lanes;
    }

    public async Task<ContractLaneDto?> UpdateAsync(int contractId, LaneId laneId, UpdateLaneRequest request, CancellationToken cancellationToken)
    {
        // Lane updates are Procurement-only — regardless of record access (plan.md §10.11).
        if (!_userContext.IsInRole(AppRoles.Procurement) && !_userContext.IsInRole(AppRoles.ProcurementAdmin))
        {
            throw new UnauthorizedAccessException("Only Procurement can update lane state.");
        }

        if (!await _access.CanAccessAsync(contractId, cancellationToken).ConfigureAwait(false))
        {
            return null;
        }

        var contract = await _db.Contracts
            .Include(c => c.Lanes)
            .FirstOrDefaultAsync(c => c.ContractId == contractId, cancellationToken).ConfigureAwait(false);
        if (contract is null) return null;

        var lane = contract.Lanes.FirstOrDefault(l => l.LaneId == laneId);
        if (lane is null) return null;

        var changes = new List<string>();

        if (request.Status.HasValue && request.Status.Value != lane.Status)
        {
            var previous = lane.Status;
            lane.Status = request.Status.Value;
            changes.Add($"status {previous} → {lane.Status}");
            _activity.Record(contract, ActivityType.LaneStatusChanged,
                $"{laneId} lane: {previous} → {lane.Status}",
                $"{{\"laneId\":\"{laneId}\",\"from\":\"{previous}\",\"to\":\"{lane.Status}\"}}");
        }

        var isExternal = ExternalLanes.Contains(laneId);

        if (request.ClearOwner)
        {
            lane.OwnerUserId = null;
            lane.OwnerLabel = null;
            changes.Add("owner cleared");
            _activity.Record(contract, ActivityType.LaneOwnerChanged, $"{laneId} lane: owner cleared");
        }
        else if (request.OwnerLabel is not null)
        {
            // Free-text owner label — works for any lane. Procurement records the reviewer's
            // name (outside counsel, an in-house reviewer, or a vendor contact) without
            // requiring an Entra user link. If the label matches a firm user, that mapping
            // can be added later.
            lane.OwnerLabel = request.OwnerLabel;
            lane.OwnerUserId = null;
            changes.Add("owner set");
            _activity.Record(contract, ActivityType.LaneOwnerChanged,
                $"{laneId} lane: owner set to {request.OwnerLabel}");
        }
        else if (!isExternal && request.OwnerUserId.HasValue)
        {
            lane.OwnerUserId = request.OwnerUserId;
            lane.OwnerLabel = null;
            changes.Add("owner set");
            _activity.Record(contract, ActivityType.LaneOwnerChanged, $"{laneId} lane: owner set");
        }

        if (request.ClearDueDate)
        {
            lane.DueDate = null;
            changes.Add("due date cleared");
            _activity.Record(contract, ActivityType.LaneDueDateChanged, $"{laneId} lane: due date cleared");
        }
        else if (request.DueDate.HasValue)
        {
            lane.DueDate = request.DueDate.Value;
            changes.Add($"due date {lane.DueDate:yyyy-MM-dd}");
            _activity.Record(contract, ActivityType.LaneDueDateChanged,
                $"{laneId} lane: due date {lane.DueDate:yyyy-MM-dd}");
        }

        if (request.ClearNote)
        {
            lane.Note = null;
            _activity.Record(contract, ActivityType.LaneNoteUpdated, $"{laneId} lane: note cleared");
        }
        else if (request.Note is not null)
        {
            lane.Note = request.Note;
            _activity.Record(contract, ActivityType.LaneNoteUpdated, $"{laneId} lane: note updated");
        }

        if (changes.Count == 0)
        {
            // No-op — return current state unchanged.
            return await CurrentDtoAsync(lane, cancellationToken).ConfigureAwait(false);
        }

        lane.LastUpdated = _clock.UtcNow;

        // Procurement lane → Complete flips OverallStatus → Completed.
        if (laneId == LaneId.Procurement
            && lane.Status == LaneStatus.Complete
            && contract.OverallStatus == OverallStatus.Active)
        {
            contract.OverallStatus = OverallStatus.Completed;
            _activity.Record(contract, ActivityType.OverallStatusChanged,
                "Procurement lane complete → overall Completed.",
                $"{{\"from\":\"Active\",\"to\":\"Completed\",\"trigger\":\"procurement_lane_complete\"}}");
        }

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return await CurrentDtoAsync(lane, cancellationToken).ConfigureAwait(false);
    }

    private async Task<ContractLaneDto?> CurrentDtoAsync(ContractLane lane, CancellationToken cancellationToken)
    {
        var ownerName = lane.OwnerUserId.HasValue
            ? await _db.Users.AsNoTracking()
                .Where(u => u.UserId == lane.OwnerUserId.Value)
                .Select(u => u.DisplayName)
                .FirstOrDefaultAsync(cancellationToken).ConfigureAwait(false)
            : null;

        return new ContractLaneDto(
            lane.ContractLaneId, lane.ContractId, lane.LaneId, lane.Status,
            lane.OwnerUserId, ownerName, lane.OwnerLabel, lane.DueDate, lane.LastUpdated, lane.Note);
    }
}
