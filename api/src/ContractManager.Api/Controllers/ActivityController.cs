using ContractManager.Api.Auth;
using ContractManager.Api.Dtos;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContractManager.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/contracts/{contractId:int}/activity")]
public class ActivityController : ControllerBase
{
    private readonly IContractSubResourceService _service;
    public ActivityController(IContractSubResourceService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ActivityEventDto>>> List(int contractId, CancellationToken ct)
    {
        var dtos = await _service.ListActivityAsync(contractId, ct).ConfigureAwait(false);
        return dtos is null ? Forbid() : Ok(dtos);
    }
}

[ApiController]
[Authorize(Roles = AppRoles.Procurement)]
[Route("api/contracts/{contractId:int}/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly IContractSubResourceService _service;
    public NotificationsController(IContractSubResourceService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NotificationDto>>> List(int contractId, CancellationToken ct)
    {
        var dtos = await _service.ListNotificationsAsync(contractId, ct).ConfigureAwait(false);
        return dtos is null ? Forbid() : Ok(dtos);
    }
}

[ApiController]
[Authorize]
[Route("api/contracts/{contractId:int}/assignments")]
public class AssignmentsController : ControllerBase
{
    private readonly IContractSubResourceService _service;
    public AssignmentsController(IContractSubResourceService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AssignmentDto>>> List(int contractId, CancellationToken ct)
    {
        var dtos = await _service.ListAssignmentsAsync(contractId, ct).ConfigureAwait(false);
        return dtos is null ? Forbid() : Ok(dtos);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Procurement)]
    public async Task<ActionResult<AssignmentDto>> Create(
        int contractId, [FromBody] CreateAssignmentRequest request, CancellationToken ct)
    {
        try
        {
            var dto = await _service.AddAssignmentAsync(contractId, request, ct).ConfigureAwait(false);
            return dto is null ? NotFound() : Created($"/api/contracts/{contractId}/assignments/{dto.ContractAssignmentId}", dto);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { detail = ex.Message });
        }
    }

    [HttpDelete("{assignmentId:int}")]
    [Authorize(Roles = AppRoles.Procurement)]
    public async Task<IActionResult> Delete(int contractId, int assignmentId, CancellationToken ct)
    {
        var result = await _service.RemoveAssignmentAsync(contractId, assignmentId, ct).ConfigureAwait(false);
        return result switch
        {
            null => Forbid(),
            false => NotFound(),
            true => NoContent(),
        };
    }
}
