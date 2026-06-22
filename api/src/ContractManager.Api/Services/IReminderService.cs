using ContractManager.Api.Auth;
using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Services;

/// <summary>
/// Manual reminder writes. Phase 1 ships <see cref="InAppLogOnlyMailSender"/>; the
/// NotificationLog row is the durable record + audit trail (ADR-034). Reminder targets are
/// the open external lanes only — vendor / requester / signature (plan.md §3.5).
/// </summary>
public interface IReminderService
{
    Task<IReadOnlyList<ReminderTargetDto>?> GetTargetsAsync(int contractId, CancellationToken cancellationToken);
    Task<NotificationLogDto?> SendAsync(int contractId, CreateReminderRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<NotificationLogDto>?> HistoryAsync(int contractId, CancellationToken cancellationToken);
}

public class ReminderService : IReminderService
{
    private static readonly HashSet<LaneId> ExternalLanes =
        new() { LaneId.Vendor, LaneId.Requester, LaneId.Signature };

    private readonly ContractManagerDbContext _db;
    private readonly IUserContext _userContext;
    private readonly IContractAccess _access;
    private readonly IMailSender _mailSender;
    private readonly IActivityRecorder _activity;
    private readonly IClock _clock;

    public ReminderService(
        ContractManagerDbContext db,
        IUserContext userContext,
        IContractAccess access,
        IMailSender mailSender,
        IActivityRecorder activity,
        IClock clock)
    {
        _db = db;
        _userContext = userContext;
        _access = access;
        _mailSender = mailSender;
        _activity = activity;
        _clock = clock;
    }

    public async Task<IReadOnlyList<ReminderTargetDto>?> GetTargetsAsync(int contractId, CancellationToken cancellationToken)
    {
        if (!_userContext.IsInRole(AppRoles.Procurement) && !_userContext.IsInRole(AppRoles.ProcurementAdmin))
        {
            return null; // controller maps to 403
        }
        if (!await _access.CanAccessAsync(contractId, cancellationToken).ConfigureAwait(false)) return null;

        var contract = await _db.Contracts.AsNoTracking()
            .FirstOrDefaultAsync(c => c.ContractId == contractId, cancellationToken).ConfigureAwait(false);
        if (contract is null) return null;

        var lanes = await _db.ContractLanes.AsNoTracking()
            .Where(l => l.ContractId == contractId
                        && (l.Status == LaneStatus.InReview || l.Status == LaneStatus.Waiting)
                        && (l.LaneId == LaneId.Vendor || l.LaneId == LaneId.Requester || l.LaneId == LaneId.Signature))
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        return lanes.Select(l => new ReminderTargetDto(
            l.LaneId,
            l.Status,
            l.OwnerLabel,
            l.LaneId == LaneId.Requester ? contract.RequesterEmail : null)).ToList();
    }

    public async Task<NotificationLogDto?> SendAsync(int contractId, CreateReminderRequest request, CancellationToken cancellationToken)
    {
        if (!_userContext.IsInRole(AppRoles.Procurement) && !_userContext.IsInRole(AppRoles.ProcurementAdmin))
        {
            throw new UnauthorizedAccessException("Only Procurement can send reminders.");
        }
        if (!await _access.CanAccessAsync(contractId, cancellationToken).ConfigureAwait(false)) return null;
        if (!ExternalLanes.Contains(request.TargetLaneId))
        {
            throw new InvalidOperationException("Reminders are restricted to vendor, requester, and signature lanes.");
        }

        var contract = await _db.Contracts
            .Include(c => c.Lanes)
            .FirstOrDefaultAsync(c => c.ContractId == contractId, cancellationToken).ConfigureAwait(false);
        if (contract is null) return null;

        var lane = contract.Lanes.FirstOrDefault(l => l.LaneId == request.TargetLaneId);
        if (lane is null) return null;
        if (lane.Status != LaneStatus.InReview && lane.Status != LaneStatus.Waiting)
        {
            throw new InvalidOperationException("Target lane is not open. Reminders are only valid for InReview / Waiting lanes.");
        }

        var recipientEmail = request.TargetLaneId == LaneId.Requester ? contract.RequesterEmail : null;
        var recipientLabel = lane.OwnerLabel;
        var subject = string.IsNullOrWhiteSpace(request.Subject)
            ? $"Reminder: {contract.ContractNumber} — {contract.Title}"
            : request.Subject!.Trim();

        var outcome = await _mailSender.SendAsync(
            new MailSendRequest(contractId, request.TargetLaneId, recipientLabel, recipientEmail, subject, request.Message),
            cancellationToken).ConfigureAwait(false);

        var log = new NotificationLog
        {
            ContractId = contractId,
            TargetLaneId = request.TargetLaneId,
            Channel = _mailSender.Channel,
            RecipientLabel = recipientLabel,
            RecipientEmail = recipientEmail,
            Subject = subject,
            Status = outcome.Status,
            FailureReason = outcome.FailureReason,
            SentAt = _clock.UtcNow,
        };
        _db.NotificationLogs.Add(log);

        _activity.Record(contract, ActivityType.ReminderLogged,
            $"Reminder sent to {request.TargetLaneId} lane.",
            $"{{\"targetLaneId\":\"{request.TargetLaneId}\",\"channel\":\"{_mailSender.Channel}\",\"status\":\"{outcome.Status}\"}}");

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new NotificationLogDto(
            log.NotificationLogId, log.ContractId, log.TargetLaneId, log.Channel,
            log.RecipientLabel, log.RecipientEmail, log.Subject, log.Status, log.FailureReason, log.SentAt);
    }

    public async Task<IReadOnlyList<NotificationLogDto>?> HistoryAsync(int contractId, CancellationToken cancellationToken)
    {
        if (!_userContext.IsInRole(AppRoles.Procurement) && !_userContext.IsInRole(AppRoles.ProcurementAdmin))
        {
            return null;
        }
        if (!await _access.CanAccessAsync(contractId, cancellationToken).ConfigureAwait(false)) return null;

        return await _db.NotificationLogs.AsNoTracking()
            .Where(n => n.ContractId == contractId)
            .OrderByDescending(n => n.SentAt)
            .Select(n => new NotificationLogDto(
                n.NotificationLogId, n.ContractId, n.TargetLaneId, n.Channel,
                n.RecipientLabel, n.RecipientEmail, n.Subject, n.Status, n.FailureReason, n.SentAt))
            .ToListAsync(cancellationToken).ConfigureAwait(false);
    }
}
