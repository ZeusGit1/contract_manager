using ContractManager.Api.Auth;
using ContractManager.Api.Dtos;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContractManager.Api.Controllers;

/// <summary>
/// Bulk-upload preview + commit. Procurement-only. Four flows (file drop, paste, type, manual)
/// converge on the same JSON row shape per ADR-011 / plan.md §3.10.
/// </summary>
[ApiController]
[Authorize(Roles = AppRoles.Procurement + "," + AppRoles.ProcurementAdmin)]
[Route("api/bulk-upload")]
public class BulkUploadController : ControllerBase
{
    private readonly IBulkUploadService _service;

    public BulkUploadController(IBulkUploadService service) => _service = service;

    [HttpPost("preview")]
    public async Task<ActionResult<BulkUploadPreviewDto>> Preview(
        [FromBody] BulkUploadPreviewRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var preview = await _service.PreviewAsync(request, cancellationToken).ConfigureAwait(false);
        return Ok(preview);
    }

    [HttpPost("commit")]
    public async Task<ActionResult<BulkUploadCommitResult>> Commit(
        [FromBody] BulkUploadCommitRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var result = await _service.CommitAsync(request, cancellationToken).ConfigureAwait(false);
        return Ok(result);
    }
}
