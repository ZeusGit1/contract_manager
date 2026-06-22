using ContractManager.Api.Auth;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContractManager.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/contracts")]
public class ContractsController : ControllerBase
{
    private readonly IContractService _service;

    public ContractsController(IContractService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResult<ContractRowDto>>> List(
        [FromQuery] string? view,
        [FromQuery] Category? category,
        [FromQuery] Priority? priority,
        [FromQuery] Guid? procurementOwnerUserId,
        [FromQuery] string? query,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var filter = new ContractListFilter(view, category, priority, procurementOwnerUserId, query);
        var result = await _service.ListAsync(filter, page, pageSize, cancellationToken).ConfigureAwait(false);
        return Ok(result);
    }

    [HttpGet("archive")]
    [Authorize(Roles = AppRoles.Procurement + "," + AppRoles.ProcurementAdmin)]
    public async Task<ActionResult<PagedResult<ContractRowDto>>> Archive(
        [FromQuery] string? query,
        [FromQuery] int? year,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.ArchiveAsync(new ContractArchiveFilter(query, year), page, pageSize, cancellationToken).ConfigureAwait(false);
        return Ok(result);
    }

    [HttpGet("{contractId:int}")]
    public async Task<ActionResult<ContractDetailDto>> Get(int contractId, CancellationToken cancellationToken)
    {
        var detail = await _service.GetAsync(contractId, cancellationToken).ConfigureAwait(false);
        return detail is null ? Forbid() : Ok(detail);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Procurement + "," + AppRoles.ProcurementAdmin + "," + AppRoles.Requester)]
    public async Task<ActionResult<ContractDetailDto>> Create(
        [FromBody] CreateContractRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        try
        {
            var detail = await _service.CreateAsync(request, cancellationToken).ConfigureAwait(false);
            return CreatedAtAction(nameof(Get), new { contractId = detail.ContractId }, detail);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [HttpPatch("{contractId:int}")]
    [Authorize(Roles = AppRoles.Procurement + "," + AppRoles.ProcurementAdmin)]
    public async Task<ActionResult<ContractDetailDto>> Update(int contractId,
        [FromBody] UpdateContractRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        try
        {
            var detail = await _service.UpdateAsync(contractId, request, cancellationToken).ConfigureAwait(false);
            return detail is null ? Forbid() : Ok(detail);
        }
        catch (UnauthorizedAccessException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status403Forbidden); }
    }

    [HttpPatch("{contractId:int}/overall")]
    [Authorize(Roles = AppRoles.Procurement + "," + AppRoles.ProcurementAdmin)]
    public async Task<ActionResult> UpdateOverall(int contractId,
        [FromBody] UpdateOverallStatusRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        try
        {
            var updated = await _service.UpdateOverallStatusAsync(contractId, request, cancellationToken).ConfigureAwait(false);
            return updated ? NoContent() : Forbid();
        }
        catch (UnauthorizedAccessException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status403Forbidden); }
    }

    [HttpPatch("{contractId:int}/owner")]
    [Authorize(Roles = AppRoles.Procurement + "," + AppRoles.ProcurementAdmin)]
    public async Task<ActionResult> UpdateOwner(int contractId,
        [FromBody] UpdateProcurementOwnerRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _service.UpdateProcurementOwnerAsync(contractId, request, cancellationToken).ConfigureAwait(false);
            return updated ? NoContent() : Forbid();
        }
        catch (UnauthorizedAccessException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status403Forbidden); }
    }

    [HttpDelete("{contractId:int}")]
    [Authorize(Roles = AppRoles.Procurement + "," + AppRoles.ProcurementAdmin)]
    public async Task<ActionResult> Delete(int contractId, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _service.SoftDeleteAsync(contractId, cancellationToken).ConfigureAwait(false);
            return deleted ? NoContent() : Forbid();
        }
        catch (UnauthorizedAccessException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status403Forbidden); }
    }
}
