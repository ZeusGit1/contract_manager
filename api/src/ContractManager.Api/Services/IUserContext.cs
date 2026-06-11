using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace ContractManager.Api.Services;

/// <summary>
/// Resolves the current authenticated caller from the HTTP context.
/// Scoped — per-request. Reads Entra claims; never exposes display name / email beyond DTOs.
/// </summary>
public interface IUserContext
{
    /// <summary>Entra ID object identifier (oid). The only user identifier permitted in logs.</summary>
    Guid? UserId { get; }

    string? DisplayName { get; }
    string? Email { get; }
    bool IsAuthenticated { get; }

    bool IsInRole(string role);
}

public class UserContext : IUserContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public UserContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? Principal => _httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

    public Guid? UserId
    {
        get
        {
            // Microsoft.Identity.Web maps oid to one of these depending on token version.
            var oid = Principal?.FindFirstValue("oid")
                ?? Principal?.FindFirstValue("http://schemas.microsoft.com/identity/claims/objectidentifier");
            return Guid.TryParse(oid, out var parsed) ? parsed : null;
        }
    }

    public string? DisplayName => Principal?.FindFirstValue("name");

    public string? Email => Principal?.FindFirstValue("preferred_username")
        ?? Principal?.FindFirstValue(ClaimTypes.Email);

    public bool IsInRole(string role) => Principal?.IsInRole(role) ?? false;
}
