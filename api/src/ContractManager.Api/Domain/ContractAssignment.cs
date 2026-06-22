namespace ContractManager.Api.Domain;

/// <summary>
/// Reviewer membership on a contract. Read-and-comment access grant for Attorney Reviewers;
/// lane state updates remain Procurement-only per plan.md §10.11.
/// ReviewerTeam is the fixed <see cref="Domain.ReviewerTeam"/> enum per ADR-036.
/// </summary>
public class ContractAssignment : AuditEntity
{
    public int ContractAssignmentId { get; set; }
    public int ContractId { get; set; }
    public Contract? Contract { get; set; }
    public Guid ReviewerUserId { get; set; }
    public User? Reviewer { get; set; }
    public ReviewerTeam ReviewerTeam { get; set; }
    public DateTime AssignedAt { get; set; }
    public Guid AssignedByUserId { get; set; }
}
