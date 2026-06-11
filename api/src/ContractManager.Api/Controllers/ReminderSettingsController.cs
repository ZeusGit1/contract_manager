using ContractManager.Api.Auth;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContractManager.Api.Controllers;

[ApiController]
[Authorize(Roles = AppRoles.Procurement)]
[Route("api/reminder-settings")]
public class ReminderSettingsController : ControllerBase
{
    private readonly IReminderSettingsService _service;
    public ReminderSettingsController(IReminderSettingsService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ReminderSettingDto>>> List(CancellationToken cancellationToken)
    {
        var dtos = await _service.ListAsync(cancellationToken).ConfigureAwait(false);
        return Ok(dtos);
    }

    [HttpPut("{category}")]
    public async Task<ActionResult<ReminderSettingDto>> Upsert(
        Category category, [FromBody] UpdateReminderSettingRequest request, CancellationToken cancellationToken)
    {
        var dto = await _service.UpsertAsync(category, request, cancellationToken).ConfigureAwait(false);
        return Ok(dto);
    }
}
