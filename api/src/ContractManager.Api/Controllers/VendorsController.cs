using ContractManager.Api.Auth;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContractManager.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/vendors")]
public class VendorsController : ControllerBase
{
    private readonly IVendorService _service;

    public VendorsController(IVendorService service) => _service = service;

    [HttpGet]
    [Authorize(Roles = AppRoles.Procurement)]
    public async Task<ActionResult<PagedResult<VendorRowDto>>> List(
        [FromQuery] string? query,
        [FromQuery] VendorType? type,
        [FromQuery] PreferredStatus? preferredStatus,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.ListAsync(query, type, preferredStatus, page, pageSize, cancellationToken)
            .ConfigureAwait(false);
        return Ok(result);
    }

    [HttpGet("autocomplete")]
    public async Task<ActionResult<IReadOnlyList<VendorSuggestionDto>>> Autocomplete(
        [FromQuery] string? q, CancellationToken cancellationToken)
    {
        var result = await _service.AutocompleteAsync(q, cancellationToken).ConfigureAwait(false);
        return Ok(result);
    }

    [HttpGet("{vendorId:int}")]
    [Authorize(Roles = AppRoles.Procurement)]
    public async Task<ActionResult<VendorSummaryDto>> Get(int vendorId, CancellationToken cancellationToken)
    {
        var dto = await _service.GetAsync(vendorId, cancellationToken).ConfigureAwait(false);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Procurement)]
    public async Task<ActionResult<VendorSummaryDto>> Create(
        [FromBody] CreateVendorRequest request, CancellationToken cancellationToken)
    {
        var (vendor, duplicate) = await _service.CreateAsync(request, cancellationToken).ConfigureAwait(false);
        if (duplicate is not null)
        {
            return Conflict(new
            {
                detail = "A similar vendor already exists. Confirm whether to merge or proceed.",
                vendor,
            });
        }
        return CreatedAtAction(nameof(Get), new { vendorId = vendor.VendorId }, vendor);
    }

    [HttpPatch("{vendorId:int}")]
    [Authorize(Roles = AppRoles.Procurement)]
    public async Task<IActionResult> Update(
        int vendorId, [FromBody] UpdateVendorRequest request, CancellationToken cancellationToken)
    {
        var updated = await _service.UpdateAsync(vendorId, request, cancellationToken).ConfigureAwait(false);
        return updated ? NoContent() : NotFound();
    }
}
