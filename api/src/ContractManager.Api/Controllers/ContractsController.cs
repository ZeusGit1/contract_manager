using ContractManager.Api.Auth;
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
        [FromQuery] string? triage,
        [FromQuery] Domain.Category? category,
        [FromQuery] Guid? assigneeUserId,
        [FromQuery] string? query,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortDir,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var filter = new ContractListFilter(triage, category, assigneeUserId, query, sortBy, sortDir);
        var result = await _service.ListAsync(filter, page, pageSize, cancellationToken).ConfigureAwait(false);
        return Ok(result);
    }

    [HttpGet("triage-counts")]
    public async Task<ActionResult<TriageCountsDto>> TriageCounts(CancellationToken cancellationToken = default)
    {
        var counts = await _service.GetTriageCountsAsync(cancellationToken).ConfigureAwait(false);
        return Ok(counts);
    }

    [HttpGet("archive")]
    [Authorize(Roles = AppRoles.Procurement)]
    public async Task<ActionResult<PagedResult<ContractRowDto>>> Archive(
        [FromQuery] string? query,
        [FromQuery] int? year,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.ListArchiveAsync(query, year, page, pageSize, cancellationToken).ConfigureAwait(false);
        return Ok(result);
    }

    [HttpGet("renewals")]
    [Authorize(Roles = AppRoles.Procurement)]
    public async Task<ActionResult<PagedResult<RenewalRowDto>>> Renewals(
        [FromQuery] int windowDays = 30,
        [FromQuery] Domain.Category? category = null,
        [FromQuery] Guid? assigneeUserId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.ListRenewalsAsync(windowDays, category, assigneeUserId, page, pageSize, cancellationToken)
            .ConfigureAwait(false);
        return Ok(result);
    }

    [HttpGet("{contractId:int}")]
    public async Task<ActionResult<ContractDetailDto>> Get(int contractId, CancellationToken cancellationToken)
    {
        var dto = await _service.GetAsync(contractId, cancellationToken).ConfigureAwait(false);
        return dto is null ? Forbid() : Ok(dto);
    }

    [HttpPost]
    [Authorize(Roles = $"{AppRoles.Requester},{AppRoles.Procurement}")]
    public async Task<ActionResult<ContractDetailDto>> Create(
        [FromBody] CreateContractRequest request, CancellationToken cancellationToken)
    {
        if (!ValidateCategoryShape(request, out var validationError))
        {
            ModelState.AddModelError(validationError.Field, validationError.Message);
            return ValidationProblem(ModelState);
        }
        try
        {
            var created = await _service.CreateAsync(request, cancellationToken).ConfigureAwait(false);
            return CreatedAtAction(nameof(Get), new { contractId = created.ContractId }, created);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [HttpPatch("{contractId:int}/status")]
    [Authorize(Roles = AppRoles.Procurement)]
    public async Task<ActionResult<ContractDetailDto>> UpdateStatus(
        int contractId, [FromBody] UpdateStatusRequest request, CancellationToken cancellationToken)
    {
        var updated = await _service.UpdateStatusAsync(contractId, request, cancellationToken).ConfigureAwait(false);
        return updated is null ? Forbid() : Ok(updated);
    }

    [HttpPatch("{contractId:int}/next-due")]
    [Authorize(Roles = AppRoles.Procurement)]
    public async Task<ActionResult<ContractDetailDto>> UpdateNextDue(
        int contractId, [FromBody] UpdateNextDueRequest request, CancellationToken cancellationToken)
    {
        var updated = await _service.UpdateNextDueAsync(contractId, request, cancellationToken).ConfigureAwait(false);
        return updated is null ? Forbid() : Ok(updated);
    }

    [HttpPatch("{contractId:int}/reviewer")]
    [Authorize(Roles = AppRoles.Procurement)]
    public async Task<ActionResult<ContractDetailDto>> UpdateReviewer(
        int contractId, [FromBody] UpdateReviewerRequest request, CancellationToken cancellationToken)
    {
        var updated = await _service.UpdateReviewerAsync(contractId, request, cancellationToken).ConfigureAwait(false);
        return updated is null ? Forbid() : Ok(updated);
    }

    [HttpDelete("{contractId:int}")]
    [Authorize(Roles = AppRoles.Procurement)]
    public async Task<IActionResult> Delete(int contractId, CancellationToken cancellationToken)
    {
        var deleted = await _service.SoftDeleteAsync(contractId, cancellationToken).ConfigureAwait(false);
        return deleted ? NoContent() : Forbid();
    }

    private static bool ValidateCategoryShape(CreateContractRequest request, out (string Field, string Message) error)
    {
        error = ("", "");
        switch (request.Category)
        {
            case Domain.Category.Event when request.EventDate is null:
                error = (nameof(CreateContractRequest.EventDate), "Event date is required for event contracts.");
                return false;
            case Domain.Category.Facilities when string.IsNullOrWhiteSpace(request.ServiceDescription):
                error = (nameof(CreateContractRequest.ServiceDescription), "Service description is required for facilities contracts.");
                return false;
            case Domain.Category.IT when request.ITType is null:
                error = (nameof(CreateContractRequest.ITType), "IT type is required for IT contracts.");
                return false;
        }
        return true;
    }
}
