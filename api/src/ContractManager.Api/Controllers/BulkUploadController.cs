using ContractManager.Api.Auth;
using ContractManager.Api.Dtos;
using ContractManager.Api.Options;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace ContractManager.Api.Controllers;

[ApiController]
[Authorize(Roles = AppRoles.Procurement)]
[Route("api/bulk-upload")]
public class BulkUploadController : ControllerBase
{
    private const long MaxUploadBytes = 10L * 1024 * 1024; // 10 MB
    private readonly IBulkUploadService _service;

    public BulkUploadController(IBulkUploadService service) => _service = service;

    [HttpPost("preview")]
    [RequestSizeLimit(MaxUploadBytes)]
    public async Task<ActionResult<BulkUploadPreviewDto>> Preview(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            ModelState.AddModelError(nameof(file), "Upload an .xlsx file.");
            return ValidationProblem(ModelState);
        }
        if (file.Length > MaxUploadBytes)
        {
            ModelState.AddModelError(nameof(file), $"File exceeds {MaxUploadBytes / (1024 * 1024)} MB limit.");
            return ValidationProblem(ModelState);
        }
        try
        {
            await using var stream = file.OpenReadStream();
            var preview = await _service.PreviewAsync(stream, cancellationToken).ConfigureAwait(false);
            return Ok(preview);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    [HttpPost("commit")]
    public async Task<ActionResult<BulkUploadCommitResponse>> Commit(
        [FromBody] BulkUploadCommitRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _service.CommitAsync(request, cancellationToken).ConfigureAwait(false);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }
}
