namespace ContractManager.Api.Domain;

/// <summary>
/// Per-reminder log row + audit trail. Phase 1 default is Channel=InAppLogOnly, Status=Logged
/// (ADR-034). Schema accepts Email channel additively when the follow-up build wires Graph Mail.
/// Recipient name/email are stored but never logged.
/// </summary>
public class NotificationLog : AuditEntity
{
    public long NotificationLogId { get; set; }
    public int ContractId { get; set; }
    public Contract? Contract { get; set; }

    /// <summary>vendor / requester / signature (external lanes only — enforced server-side).</summary>
    public LaneId TargetLaneId { get; set; }

    public NotificationChannel Channel { get; set; } = NotificationChannel.InAppLogOnly;

    /// <summary>Vendor name / DocuSign envelope ref. NVARCHAR(512). Never logged.</summary>
    public string? RecipientLabel { get; set; }

    /// <summary>Requester email shown in the modal. NVARCHAR(320). Never logged.</summary>
    public string? RecipientEmail { get; set; }

    public string Subject { get; set; } = string.Empty;
    public NotificationStatus Status { get; set; } = NotificationStatus.Logged;
    public string? FailureReason { get; set; }
    public DateTime SentAt { get; set; }
}
