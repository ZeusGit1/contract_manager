using ContractManager.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Controllers;

/// <summary>
/// Liveness + readiness probes. Both anonymous per api-auth.md.
/// /health/live: process is up, no DB call.
/// /health/ready: DB connectivity check.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("health")]
public class HealthController : ControllerBase
{
    private readonly ContractManagerDbContext _db;

    public HealthController(ContractManagerDbContext db) => _db = db;

    [HttpGet("live")]
    public IActionResult Live() => Ok(new { status = "live" });

    [HttpGet("ready")]
    public async Task<IActionResult> Ready(CancellationToken cancellationToken)
    {
        try
        {
            var canConnect = await _db.Database.CanConnectAsync(cancellationToken).ConfigureAwait(false);
            return canConnect
                ? Ok(new { status = "ready" })
                : StatusCode(StatusCodes.Status503ServiceUnavailable, new { status = "unavailable" });
        }
        catch (Exception) when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { status = "unavailable" });
        }
    }
}
