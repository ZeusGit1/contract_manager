using ContractManager.Api.Domain;

namespace ContractManager.Api.Services;

/// <summary>
/// Outbound mail abstraction. Phase 1 only registers <see cref="InAppLogOnlyMailSender"/>;
/// a follow-up build adds <c>GraphMailSender</c> per ADR-039.
/// </summary>
public interface IMailSender
{
    NotificationChannel Channel { get; }

    /// <summary>
    /// Attempt to send the reminder. Phase 1's InAppLogOnly impl just returns Logged.
    /// Future Graph impl returns Sent on success or Failed with a reason.
    /// </summary>
    Task<MailSendOutcome> SendAsync(MailSendRequest request, CancellationToken cancellationToken);
}

public record MailSendRequest(
    int ContractId,
    LaneId TargetLaneId,
    string? RecipientLabel,
    string? RecipientEmail,
    string Subject,
    string? Body);

public record MailSendOutcome(NotificationStatus Status, string? FailureReason);

public class InAppLogOnlyMailSender : IMailSender
{
    public NotificationChannel Channel => NotificationChannel.InAppLogOnly;

    public Task<MailSendOutcome> SendAsync(MailSendRequest request, CancellationToken cancellationToken)
    {
        // No outbound call — Phase 1 logs the intent in NotificationLogs and that's the whole story.
        return Task.FromResult(new MailSendOutcome(NotificationStatus.Logged, null));
    }
}
