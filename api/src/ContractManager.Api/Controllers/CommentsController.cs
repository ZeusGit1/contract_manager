using ContractManager.Api.Dtos;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContractManager.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/contracts/{contractId:int}/comments")]
public class CommentsController : ControllerBase
{
    private readonly IContractSubResourceService _service;
    public CommentsController(IContractSubResourceService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CommentDto>>> List(int contractId, CancellationToken ct)
    {
        var dtos = await _service.ListCommentsAsync(contractId, ct).ConfigureAwait(false);
        return dtos is null ? Forbid() : Ok(dtos);
    }

    [HttpPost]
    public async Task<ActionResult<CommentDto>> Create(
        int contractId, [FromBody] CreateCommentRequest request, CancellationToken ct)
    {
        var dto = await _service.AddCommentAsync(contractId, request, ct).ConfigureAwait(false);
        return dto is null ? Forbid() : Created($"/api/contracts/{contractId}/comments/{dto.ContractCommentId}", dto);
    }
}
