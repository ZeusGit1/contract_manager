using ContractManager.Api.Auth;
using ContractManager.Api.Dtos;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContractManager.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/categories")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _service;

    public CategoriesController(ICategoryService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> List(
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
        => Ok(await _service.ListAsync(includeInactive, cancellationToken).ConfigureAwait(false));

    [HttpGet("{categoryId:int}")]
    public async Task<ActionResult<CategoryDetailDto>> Get(int categoryId, CancellationToken cancellationToken)
    {
        var detail = await _service.GetAsync(categoryId, cancellationToken).ConfigureAwait(false);
        return detail is null ? NotFound() : Ok(detail);
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.ProcurementAdmin)]
    public async Task<ActionResult<CategoryDto>> Create([FromBody] CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        try
        {
            var category = await _service.CreateAsync(request, cancellationToken).ConfigureAwait(false);
            return CreatedAtAction(nameof(Get), new { categoryId = category.CategoryId }, category);
        }
        catch (CategoryManagementDisabledException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status503ServiceUnavailable); }
        catch (InvalidOperationException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status409Conflict); }
    }

    [HttpPatch("{categoryId:int}")]
    [Authorize(Roles = AppRoles.ProcurementAdmin)]
    public async Task<ActionResult> Update(int categoryId, [FromBody] UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _service.UpdateAsync(categoryId, request, cancellationToken).ConfigureAwait(false);
            return updated ? NoContent() : NotFound();
        }
        catch (CategoryManagementDisabledException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status503ServiceUnavailable); }
    }

    [HttpDelete("{categoryId:int}")]
    [Authorize(Roles = AppRoles.ProcurementAdmin)]
    public async Task<ActionResult> Delete(int categoryId, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _service.SoftDeleteAsync(categoryId, cancellationToken).ConfigureAwait(false);
            return deleted ? NoContent() : NotFound();
        }
        catch (CategoryManagementDisabledException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status503ServiceUnavailable); }
        catch (InvalidOperationException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status409Conflict); }
    }

    [HttpPost("{categoryId:int}/fields")]
    [Authorize(Roles = AppRoles.ProcurementAdmin)]
    public async Task<ActionResult<CategoryFieldDto>> CreateField(int categoryId,
        [FromBody] CreateCategoryFieldRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        try
        {
            var field = await _service.CreateFieldAsync(categoryId, request, cancellationToken).ConfigureAwait(false);
            return CreatedAtAction(nameof(Get), new { categoryId }, field);
        }
        catch (CategoryManagementDisabledException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status503ServiceUnavailable); }
        catch (InvalidOperationException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status409Conflict); }
    }

    [HttpPatch("{categoryId:int}/fields/{fieldId:int}")]
    [Authorize(Roles = AppRoles.ProcurementAdmin)]
    public async Task<ActionResult> UpdateField(int categoryId, int fieldId,
        [FromBody] UpdateCategoryFieldRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _service.UpdateFieldAsync(categoryId, fieldId, request, cancellationToken).ConfigureAwait(false);
            return updated ? NoContent() : NotFound();
        }
        catch (CategoryManagementDisabledException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status503ServiceUnavailable); }
    }

    [HttpDelete("{categoryId:int}/fields/{fieldId:int}")]
    [Authorize(Roles = AppRoles.ProcurementAdmin)]
    public async Task<ActionResult> DeleteField(int categoryId, int fieldId, CancellationToken cancellationToken)
    {
        try
        {
            var deleted = await _service.SoftDeleteFieldAsync(categoryId, fieldId, cancellationToken).ConfigureAwait(false);
            return deleted ? NoContent() : NotFound();
        }
        catch (CategoryManagementDisabledException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status503ServiceUnavailable); }
        catch (InvalidOperationException ex) { return Problem(detail: ex.Message, statusCode: StatusCodes.Status409Conflict); }
    }
}
