namespace ContractManager.Api.Domain;

public class ContractComment : AuditEntity
{
    public int ContractCommentId { get; set; }
    public int ContractId { get; set; }
    public Contract? Contract { get; set; }
    public Guid AuthorUserId { get; set; }
    public User? Author { get; set; }
    public string AuthorRoleSnapshot { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public bool IsInternalOnly { get; set; }
}
