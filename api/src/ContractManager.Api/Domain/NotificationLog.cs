namespace ContractManager.Api.Domain;

public class NotificationLog : AuditEntity
{
    public long NotificationLogId { get; set; }
    public int ContractId { get; set; }
    public Contract? Contract { get; set; }
    public NotificationChannel Channel { get; set; }
    public string RecipientUserId { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public NotificationStatus Status { get; set; }
    public string? FailureReason { get; set; }
    public DateTime SentAt { get; set; }
}
