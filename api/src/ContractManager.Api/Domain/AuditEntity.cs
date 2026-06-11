namespace ContractManager.Api.Domain;

/// <summary>
/// Six mandatory audit columns per database-coding-standards.md. Every entity in the model
/// inherits from this — soft-delete query filter is wired up in ContractManagerDbContext.
/// </summary>
public abstract class AuditEntity
{
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string UpdatedBy { get; set; } = string.Empty;
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
}
