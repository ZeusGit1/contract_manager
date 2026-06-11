namespace ContractManager.Api.Domain;

public class ActivityEvent : AuditEntity
{
    public long ActivityEventId { get; set; }
    public int ContractId { get; set; }
    public Contract? Contract { get; set; }
    public Guid ActorUserId { get; set; }
    public User? Actor { get; set; }
    public ActivityType Type { get; set; }
    public string DescriptionLine { get; set; } = string.Empty;
    public string? StructuredJson { get; set; }
    public DateTime OccurredAt { get; set; }
}
