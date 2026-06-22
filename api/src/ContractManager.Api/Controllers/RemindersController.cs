using ContractManager.Api.Auth;
using ContractManager.Api.Dtos;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContractManager.Api.Controllers;

[ApiController]
[Authorize(Roles = AppRoles.Procurement + "," + AppRoles.ProcurementAdmin)]
[Route("api/contracts/{contractId:int}/reminders")]
public class RemindersController : ControllerBase
{
    private readonly IReminderService _service;

    public RemindersController(IReminderService service) => _service = service;

    [HttpGet("targets")]
    public async Task<ActionResult<IReadOnlyList<ReminderTargetDto>>> Targets(int contractId, CancellationToken cancellationToken)
    {
        var targets = await _service.GetTargetsAsync(contractId, cancellationToken).ConfigureAwait(false);
        return targets is null ? Forbid() : Ok(targets);
    }

    [HttpPost]
    public async Task<ActionResult<NotificationLogDto>> Send(int contractId,
        [FromBody] CreateReminderRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        try
        {
            var log = await _service.SendAsync(contractId, request, cancellationToken).ConfigureAwait(false);
            return log is null ? Forbid() : CreatedAtAction(nameof(History), new { contractId }, log);
        }
        catch (UnauthorizedAccessException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status403Forbidden); }
        catch (InvalidOperationException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest); }
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NotificationLogDto>>> History(int contractId, CancellationToken cancellationToken)
    {
        var rows = await _service.HistoryAsync(contractId, cancellationToken).ConfigureAwait(false);
        return rows is null ? Forbid() : Ok(rows);
    }
}
