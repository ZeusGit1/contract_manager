namespace ContractManager.Api.Domain;

public class ContractNote : AuditEntity
{
    public int ContractNoteId { get; set; }
    public int ContractId { get; set; }
    public Contract? Contract { get; set; }
    public Guid AuthorUserId { get; set; }
    public User? Author { get; set; }
    public NoteType Type { get; set; }
    public DateTime NoteDate { get; set; }
    public string? Participants { get; set; }
    public string Text { get; set; } = string.Empty;
}
