using System.Text.Json;
using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Infrastructure;
using ContractManager.Api.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ContractManager.Api.Services;

/// <summary>
/// Categories admin per ADR-037. Reads are always open to any authenticated user (intake
/// renders from these). Writes require ProcurementAdmin <i>and</i> the
/// <see cref="CategoriesAdminOptions.Enabled"/> flag; otherwise the controller returns 503.
/// System protections (Code/IsSystemDefined immutable, system rows cannot be deleted, etc.)
/// are enforced here regardless of the flag.
/// </summary>
public interface ICategoryService
{
    bool IsManagementEnabled { get; }

    Task<IReadOnlyList<CategoryDto>> ListAsync(bool includeInactive, CancellationToken cancellationToken);
    Task<CategoryDetailDto?> GetAsync(int categoryId, CancellationToken cancellationToken);
    Task<CategoryDto> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken);
    Task<bool> UpdateAsync(int categoryId, UpdateCategoryRequest request, CancellationToken cancellationToken);
    Task<bool> SoftDeleteAsync(int categoryId, CancellationToken cancellationToken);
    Task<CategoryFieldDto> CreateFieldAsync(int categoryId, CreateCategoryFieldRequest request, CancellationToken cancellationToken);
    Task<bool> UpdateFieldAsync(int categoryId, int fieldId, UpdateCategoryFieldRequest request, CancellationToken cancellationToken);
    Task<bool> SoftDeleteFieldAsync(int categoryId, int fieldId, CancellationToken cancellationToken);
}

public class CategoryService : ICategoryService
{
    private readonly ContractManagerDbContext _db;
    private readonly IClock _clock;
    private readonly CategoriesAdminOptions _options;

    public CategoryService(ContractManagerDbContext db, IClock clock, IOptions<CategoriesAdminOptions> options)
    {
        _db = db;
        _clock = clock;
        _options = options.Value;
    }

    public bool IsManagementEnabled => _options.Enabled;

    public async Task<IReadOnlyList<CategoryDto>> ListAsync(bool includeInactive, CancellationToken cancellationToken)
    {
        var query = _db.Categories.AsNoTracking();
        if (!includeInactive) query = query.Where(c => c.IsActive);

        return await query
            .OrderBy(c => c.SortOrder)
            .Select(c => new CategoryDto(c.CategoryId, c.Code, c.Label, c.IconKey, c.SortOrder, c.IsSystemDefined, c.IsActive))
            .ToListAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<CategoryDetailDto?> GetAsync(int categoryId, CancellationToken cancellationToken)
    {
        var category = await _db.Categories.AsNoTracking()
            .FirstOrDefaultAsync(c => c.CategoryId == categoryId, cancellationToken).ConfigureAwait(false);
        if (category is null) return null;

        var fields = await _db.CategoryFields.AsNoTracking()
            .Where(f => f.CategoryId == categoryId)
            .OrderBy(f => f.SortOrder)
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        return new CategoryDetailDto(
            new CategoryDto(category.CategoryId, category.Code, category.Label, category.IconKey,
                category.SortOrder, category.IsSystemDefined, category.IsActive),
            fields.Select(f => new CategoryFieldDto(
                f.CategoryFieldId, f.CategoryId, f.FieldKey, f.Label, f.Type, f.HelperText,
                ParseOptions(f.OptionsJson), f.IsRequired, f.SortOrder, f.IsSystemDefined, f.IsActive)).ToList());
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        EnsureManagementEnabled();

        var code = request.Code.Trim();
        var exists = await _db.Categories.AnyAsync(c => c.Code == code, cancellationToken).ConfigureAwait(false);
        if (exists) throw new InvalidOperationException($"Category code '{code}' already exists.");

        var category = new CategoryDefinition
        {
            Code = code,
            Label = request.Label.Trim(),
            IconKey = request.IconKey.Trim(),
            SortOrder = request.SortOrder,
            IsSystemDefined = false,
            IsActive = request.IsActive,
        };
        _db.Categories.Add(category);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new CategoryDto(category.CategoryId, category.Code, category.Label, category.IconKey,
            category.SortOrder, category.IsSystemDefined, category.IsActive);
    }

    public async Task<bool> UpdateAsync(int categoryId, UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        EnsureManagementEnabled();

        var category = await _db.Categories.FirstOrDefaultAsync(c => c.CategoryId == categoryId, cancellationToken).ConfigureAwait(false);
        if (category is null) return false;

        if (!string.IsNullOrWhiteSpace(request.Label)) category.Label = request.Label!.Trim();
        if (!string.IsNullOrWhiteSpace(request.IconKey)) category.IconKey = request.IconKey!.Trim();
        if (request.SortOrder.HasValue) category.SortOrder = request.SortOrder.Value;
        if (request.IsActive.HasValue) category.IsActive = request.IsActive.Value;

        // System categories: Code and IsSystemDefined are immutable. The above doesn't touch
        // them, so system rows can be re-labelled but never re-coded.

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<bool> SoftDeleteAsync(int categoryId, CancellationToken cancellationToken)
    {
        EnsureManagementEnabled();

        var category = await _db.Categories.FirstOrDefaultAsync(c => c.CategoryId == categoryId, cancellationToken).ConfigureAwait(false);
        if (category is null) return false;
        if (category.IsSystemDefined)
        {
            throw new InvalidOperationException("System categories cannot be deleted.");
        }

        // Refuse delete if any contracts reference this category by domain enum.
        var domain = Enum.TryParse<Category>(category.Code, ignoreCase: true, out var parsed) ? parsed : (Category?)null;
        if (domain.HasValue)
        {
            var hasContracts = await _db.Contracts.AnyAsync(c => c.Category == domain.Value, cancellationToken).ConfigureAwait(false);
            if (hasContracts)
            {
                throw new InvalidOperationException("Cannot delete a category that has active contracts.");
            }
        }

        category.IsDeleted = true;
        category.DeletedAt = _clock.UtcNow;
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<CategoryFieldDto> CreateFieldAsync(int categoryId, CreateCategoryFieldRequest request, CancellationToken cancellationToken)
    {
        EnsureManagementEnabled();

        var category = await _db.Categories.FirstOrDefaultAsync(c => c.CategoryId == categoryId, cancellationToken).ConfigureAwait(false)
            ?? throw new InvalidOperationException($"Category {categoryId} not found.");

        var key = request.FieldKey.Trim();
        var exists = await _db.CategoryFields.AnyAsync(f => f.CategoryId == categoryId && f.FieldKey == key, cancellationToken).ConfigureAwait(false);
        if (exists) throw new InvalidOperationException($"Field key '{key}' already exists for this category.");

        var field = new CategoryField
        {
            CategoryId = categoryId,
            FieldKey = key,
            Label = request.Label.Trim(),
            Type = request.Type,
            HelperText = request.HelperText,
            OptionsJson = SerializeOptions(request.Options),
            IsRequired = request.IsRequired,
            SortOrder = request.SortOrder,
            IsSystemDefined = false,
            IsActive = request.IsActive,
        };
        _db.CategoryFields.Add(field);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return new CategoryFieldDto(field.CategoryFieldId, field.CategoryId, field.FieldKey, field.Label,
            field.Type, field.HelperText, request.Options, field.IsRequired, field.SortOrder, field.IsSystemDefined, field.IsActive);
    }

    public async Task<bool> UpdateFieldAsync(int categoryId, int fieldId, UpdateCategoryFieldRequest request, CancellationToken cancellationToken)
    {
        EnsureManagementEnabled();

        var field = await _db.CategoryFields.FirstOrDefaultAsync(f => f.CategoryFieldId == fieldId && f.CategoryId == categoryId, cancellationToken).ConfigureAwait(false);
        if (field is null) return false;

        if (!string.IsNullOrWhiteSpace(request.Label)) field.Label = request.Label!.Trim();
        if (request.HelperText is not null) field.HelperText = request.HelperText;
        if (request.Options is not null) field.OptionsJson = SerializeOptions(request.Options);
        if (request.IsRequired.HasValue) field.IsRequired = request.IsRequired.Value;
        if (request.SortOrder.HasValue) field.SortOrder = request.SortOrder.Value;
        if (request.IsActive.HasValue) field.IsActive = request.IsActive.Value;

        // System fields: FieldKey, Type, IsSystemDefined immutable — nothing above touches them.

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<bool> SoftDeleteFieldAsync(int categoryId, int fieldId, CancellationToken cancellationToken)
    {
        EnsureManagementEnabled();

        var field = await _db.CategoryFields.FirstOrDefaultAsync(f => f.CategoryFieldId == fieldId && f.CategoryId == categoryId, cancellationToken).ConfigureAwait(false);
        if (field is null) return false;
        if (field.IsSystemDefined) throw new InvalidOperationException("System fields cannot be deleted.");

        field.IsDeleted = true;
        field.DeletedAt = _clock.UtcNow;
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    private void EnsureManagementEnabled()
    {
        if (!_options.Enabled)
        {
            throw new CategoryManagementDisabledException();
        }
    }

    private static IReadOnlyList<string>? ParseOptions(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<List<string>>(json); }
        catch { return null; }
    }

    private static string? SerializeOptions(IReadOnlyList<string>? options)
        => options is null ? null : JsonSerializer.Serialize(options);
}

/// <summary>Thrown when a write is attempted while the management flag is off. Controller maps to 503.</summary>
public class CategoryManagementDisabledException : Exception
{
    public CategoryManagementDisabledException() : base("Category management is disabled in this environment.") { }
}
