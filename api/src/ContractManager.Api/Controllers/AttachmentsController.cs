using ContractManager.Api.Auth;
using ContractManager.Api.Dtos;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContractManager.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Procurement},{AppRoles.AttorneyReviewer}")]
[Route("api")]
public class AttachmentsController : ControllerBase
{
    private readonly IAttachmentService _service;
    public AttachmentsController(IAttachmentService service) => _service = service;

    [HttpPost("contracts/{contractId:int}/attachment-batches")]
    public async Task<IActionResult> CreateBatch(int contractId, CancellationToken ct)
    {
        var batchId = await _service.CreateBatchAsync(contractId, ct).ConfigureAwait(false);
        return batchId is null ? Forbid() : Created($"/api/attachment-batches/{batchId}", new { batchId });
    }

    [HttpPost("attachment-batches/{batchId:int}/complete")]
    public async Task<IActionResult> CompleteBatch(int batchId, CancellationToken ct)
    {
        var total = await _service.CompleteBatchAsync(batchId, ct).ConfigureAwait(false);
        return total is null ? Forbid() : Ok(new { totalAttachments = total });
    }

    [HttpPost("attachments")]
    [DisableRequestSizeLimit]
    public async Task<IActionResult> Upload(
        [FromQuery] int contractId,
        [FromQuery] int? batchId,
        IFormFile? file,
        CancellationToken ct)
    {
        if (file is null || file.Length == 0)
        {
            ModelState.AddModelError(nameof(file), "Attach a file.");
            return ValidationProblem(ModelState);
        }
        try
        {
            await using var stream = file.OpenReadStream();
            var outcome = await _service.UploadAsync(
                contractId, batchId, stream, file.FileName, file.ContentType, file.Length, ct).ConfigureAwait(false);
            return StatusCode(StatusCodes.Status201Created, new { outcome.AttachmentId });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
        catch (BlobUploadFailedException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status502BadGateway);
        }
        catch (SqlPersistFailedAfterBlobException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    [HttpGet("contracts/{contractId:int}/attachments")]
    public async Task<ActionResult<IReadOnlyList<AttachmentDto>>> List(int contractId, CancellationToken ct)
    {
        var dtos = await _service.ListAsync(contractId, ct).ConfigureAwait(false);
        return dtos is null ? Forbid() : Ok(dtos);
    }

    [HttpGet("attachments/{attachmentId:int}/content")]
    public async Task<IActionResult> Download(int attachmentId, CancellationToken ct)
    {
        var download = await _service.DownloadAsync(attachmentId, ct).ConfigureAwait(false);
        if (download is null) return Forbid();
        Response.Headers["Cache-Control"] = "private, no-store";
        return File(download.Content, download.ContentType, download.FileName);
    }

    [HttpDelete("attachments/{attachmentId:int}")]
    public async Task<IActionResult> Delete(int attachmentId, CancellationToken ct)
    {
        var result = await _service.DeleteAsync(attachmentId, ct).ConfigureAwait(false);
        return result switch
        {
            null => Forbid(),
            false => NotFound(),
            true => NoContent(),
        };
    }
}
