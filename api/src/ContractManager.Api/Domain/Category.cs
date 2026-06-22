namespace ContractManager.Api.Domain;

/// <summary>
/// Categories drive intake-form schemas. Per ADR-037, the data model supports admin-defined
/// categories from day one; whether the management UI is exposed is controlled by the
/// <c>CategoriesAdmin:Enabled</c> configuration flag.
///
/// System-defined categories (Event / Facilities / IT) are seeded with IsSystemDefined=true
/// and have additional server-side protections (immutable Code / IsSystemDefined; cannot be
/// soft-deleted; their system fields back typed columns on <see cref="Contract"/>).
/// </summary>
public class CategoryDefinition : AuditEntity
{
    public int CategoryId { get; set; }

    /// <summary>Stable code, e.g. "Event", "Facilities", "IT". Filtered-unique on (Code, IsDeleted=0).</summary>
    public string Code { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    /// <summary>Phosphor icon name, e.g. "ticket" / "wrench" / "desktop".</summary>
    public string IconKey { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    /// <summary>True for seeded Event/Facilities/IT. Immutable on system rows.</summary>
    public bool IsSystemDefined { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<CategoryField> Fields { get; set; } = new List<CategoryField>();
}
