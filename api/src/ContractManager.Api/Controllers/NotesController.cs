using ContractManager.Api.Auth;
using ContractManager.Api.Dtos;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContractManager.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{AppRoles.Procurement},{AppRoles.AttorneyReviewer}")]
[Route("api/contracts/{contractId:int}/notes")]
public class NotesController : ControllerBase
{
    private readonly IContractSubResourceService _service;
    public NotesController(IContractSubResourceService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NoteDto>>> List(int contractId, CancellationToken ct)
    {
        var dtos = await _service.ListNotesAsync(contractId, ct).ConfigureAwait(false);
        return dtos is null ? Forbid() : Ok(dtos);
    }

    [HttpPost]
    public async Task<ActionResult<NoteDto>> Create(
        int contractId, [FromBody] CreateNoteRequest request, CancellationToken ct)
    {
        var dto = await _service.AddNoteAsync(contractId, request, ct).ConfigureAwait(false);
        return dto is null ? Forbid() : Created($"/api/contracts/{contractId}/notes/{dto.ContractNoteId}", dto);
    }

    [HttpDelete("{noteId:int}")]
    public async Task<IActionResult> Delete(int contractId, int noteId, CancellationToken ct)
    {
        var result = await _service.DeleteNoteAsync(contractId, noteId, ct).ConfigureAwait(false);
        return result switch
        {
            null => Forbid(),
            false => NotFound(),
            true => NoContent(),
        };
    }
}
