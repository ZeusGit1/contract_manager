namespace ContractManager.Api.Domain;

/// <summary>
/// Values for admin-added (non-system) category fields. System-defined fields store their
/// values in the typed <see cref="Contract"/> columns; admin fields land here per ADR-037.
///
/// Single ValueText column — parsed by the service layer per <see cref="CategoryField.Type"/>.
/// Filtered-unique on (ContractId, CategoryFieldId, IsDeleted=0).
/// </summary>
public class ContractFieldValue : AuditEntity
{
    public int ContractFieldValueId { get; set; }

    public int ContractId { get; set; }
    public Contract? Contract { get; set; }

    public int CategoryFieldId { get; set; }
    public CategoryField? CategoryField { get; set; }

    /// <summary>Denormalized from <see cref="CategoryField.FieldKey"/> for query convenience.</summary>
    public string FieldKey { get; set; } = string.Empty;

    /// <summary>Canonical wire form. NVARCHAR(MAX). Never logged.</summary>
    public string? ValueText { get; set; }
}
