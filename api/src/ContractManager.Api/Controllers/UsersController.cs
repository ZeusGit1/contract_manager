using ContractManager.Api.Auth;
using ContractManager.Api.Data;
using ContractManager.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Controllers;

/// <summary>
/// Read-only listing of firm users that have signed in (auto-provisioned by
/// EnsureUserMiddleware). Used by the SPA to populate the procurement-owner picker
/// on the contract detail screen — plain names alone are not enough, the API's
/// PATCH /contracts/{id}/owner takes an Entra-oid GUID.
/// </summary>
[ApiController]
[Authorize(Roles = $"{AppRoles.Procurement},{AppRoles.ProcurementAdmin}")]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly ContractManagerDbContext _db;

    public UsersController(ContractManagerDbContext db) => _db = db;

    /// <summary>
    /// Return every firm user we've seen. Order alphabetically for a stable dropdown.
    /// Email is included so the SPA can disambiguate if two people share a display name.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserSummaryDto>>> List(CancellationToken cancellationToken)
    {
        var rows = await _db.Users
            .AsNoTracking()
            .OrderBy(u => u.DisplayName)
            .Select(u => new UserSummaryDto(u.UserId, u.DisplayName, u.Email))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return Ok(rows);
    }
}
