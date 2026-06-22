namespace ContractManager.Api.Domain;

/// <summary>
/// Field schema for a <see cref="Category"/>. System fields back typed columns on
/// <see cref="Contract"/>; admin-added fields store values in <see cref="ContractFieldValue"/>.
/// See ADR-037 for the storage split.
/// </summary>
public class CategoryField : AuditEntity
{
    public int CategoryFieldId { get; set; }

    public int CategoryId { get; set; }
    public CategoryDefinition? Category { get; set; }

    /// <summary>Stable identifier, e.g. "eventDate". Filtered-unique on (CategoryId, FieldKey, IsDeleted=0).</summary>
    public string FieldKey { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;
    public CategoryFieldType Type { get; set; }
    public string? HelperText { get; set; }

    /// <summary>JSON array of strings for select/radio. Validated by the service layer; never indexed.</summary>
    public string? OptionsJson { get; set; }

    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }

    /// <summary>True for fields backed by typed <see cref="Contract"/> columns. Immutable on system rows.</summary>
    public bool IsSystemDefined { get; set; }

    public bool IsActive { get; set; } = true;
}
