using ContractManager.Api.Auth;
using ContractManager.Api.Dtos;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContractManager.Api.Controllers;

[ApiController]
[Authorize(Roles = AppRoles.Procurement + "," + AppRoles.ProcurementAdmin)]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly IReportsService _service;

    public ReportsController(IReportsService service) => _service = service;

    [HttpGet("kpis")]
    public async Task<ActionResult<ReportsKpiDto>> Kpis(CancellationToken cancellationToken)
        => Ok(await _service.GetKpisAsync(cancellationToken).ConfigureAwait(false));

    [HttpGet("active-by-category")]
    public async Task<ActionResult<IReadOnlyList<CategoryBarDto>>> ActiveByCategory(CancellationToken cancellationToken)
        => Ok(await _service.ActiveByCategoryAsync(cancellationToken).ConfigureAwait(false));

    [HttpGet("active-by-owner")]
    public async Task<ActionResult<IReadOnlyList<OwnerBarDto>>> ActiveByOwner(CancellationToken cancellationToken)
        => Ok(await _service.ActiveByOwnerAsync(cancellationToken).ConfigureAwait(false));
}
