using ContractManager.Api.Auth;
using ContractManager.Api.Data;
using ContractManager.Api.Dtos;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/me")]
public class MeController : ControllerBase
{
    private readonly IUserContext _userContext;
    private readonly ContractManagerDbContext _db;

    public MeController(IUserContext userContext, ContractManagerDbContext db)
    {
        _userContext = userContext;
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<CurrentUserResponse>> Get(CancellationToken cancellationToken)
    {
        var userId = _userContext.UserId ?? Guid.Empty;
        var profile = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserId == userId, cancellationToken).ConfigureAwait(false);

        var roles = new[] { AppRoles.Procurement, AppRoles.Requester, AppRoles.AttorneyReviewer }
            .Where(_userContext.IsInRole).ToList();

        return Ok(new CurrentUserResponse(
            userId,
            profile?.DisplayName ?? _userContext.DisplayName ?? string.Empty,
            profile?.Email ?? _userContext.Email ?? string.Empty,
            profile?.Department,
            roles));
    }
}
