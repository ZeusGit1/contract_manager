namespace ContractManager.Api.Domain;

public class ContractAssignment : AuditEntity
{
    public int ContractAssignmentId { get; set; }
    public int ContractId { get; set; }
    public Contract? Contract { get; set; }
    public Guid ReviewerUserId { get; set; }
    public User? Reviewer { get; set; }
    public string ReviewerTeam { get; set; } = string.Empty;
    public DateTime AssignedAt { get; set; }
    public Guid AssignedByUserId { get; set; }
}
