namespace ContractManager.Api.Domain;

/// <summary>
/// Firm user — auto-provisioned by EnsureUserMiddleware on first authenticated request.
/// PK is the Entra ID object identifier (oid). DisplayName + Email come from token claims
/// and must NEVER appear in log statements (api-logging.md / api-pii-handling.md).
/// </summary>
public class User : AuditEntity
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Department { get; set; }
    public DateTime FirstSignInAt { get; set; }
}
