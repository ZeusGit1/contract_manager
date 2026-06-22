using ContractManager.Api.Auth;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContractManager.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/contracts/{contractId:int}/lanes")]
public class LanesController : ControllerBase
{
    private readonly ILaneService _service;

    public LanesController(ILaneService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ContractLaneDto>>> List(int contractId, CancellationToken cancellationToken)
    {
        var lanes = await _service.ListAsync(contractId, cancellationToken).ConfigureAwait(false);
        return lanes is null ? Forbid() : Ok(lanes);
    }

    /// <summary>
    /// Partial update of one lane. Procurement-only — Requester and Reviewer roles get 403
    /// per plan.md §10.11 / decisions.md ADR-029.
    /// </summary>
    [HttpPatch("{laneId}")]
    [Authorize(Roles = AppRoles.Procurement + "," + AppRoles.ProcurementAdmin)]
    public async Task<ActionResult<ContractLaneDto>> Update(int contractId, LaneId laneId,
        [FromBody] UpdateLaneRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var lane = await _service.UpdateAsync(contractId, laneId, request, cancellationToken).ConfigureAwait(false);
            return lane is null ? Forbid() : Ok(lane);
        }
        catch (UnauthorizedAccessException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status403Forbidden); }
    }
}
