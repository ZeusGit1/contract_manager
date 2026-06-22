namespace ContractManager.Api.Options;

/// <summary>
/// Per ADR-037, this flag controls whether the categories management UI / write endpoints are
/// exposed — not whether the data model functions. Off by default in Phase 1. Configuration
/// section: <c>CategoriesAdmin:Enabled</c>.
/// </summary>
public class CategoriesAdminOptions
{
    public bool Enabled { get; set; }
}
