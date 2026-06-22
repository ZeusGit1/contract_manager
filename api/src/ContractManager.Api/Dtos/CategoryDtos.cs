using System.ComponentModel.DataAnnotations;
using ContractManager.Api.Domain;

namespace ContractManager.Api.Dtos;

public record CategoryDto(
    int CategoryId,
    string Code,
    string Label,
    string IconKey,
    int SortOrder,
    bool IsSystemDefined,
    bool IsActive);

public record CategoryFieldDto(
    int CategoryFieldId,
    int CategoryId,
    string FieldKey,
    string Label,
    CategoryFieldType Type,
    string? HelperText,
    IReadOnlyList<string>? Options,
    bool IsRequired,
    int SortOrder,
    bool IsSystemDefined,
    bool IsActive);

public record CategoryDetailDto(CategoryDto Category, IReadOnlyList<CategoryFieldDto> Fields);

public class CreateCategoryRequest
{
    [Required, StringLength(32)] public string Code { get; set; } = string.Empty;
    [Required, StringLength(64)] public string Label { get; set; } = string.Empty;
    [Required, StringLength(64)] public string IconKey { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateCategoryRequest
{
    [StringLength(64)] public string? Label { get; set; }
    [StringLength(64)] public string? IconKey { get; set; }
    public int? SortOrder { get; set; }
    public bool? IsActive { get; set; }
}

public class CreateCategoryFieldRequest
{
    [Required, StringLength(64)] public string FieldKey { get; set; } = string.Empty;
    [Required, StringLength(128)] public string Label { get; set; } = string.Empty;
    [Required] public CategoryFieldType Type { get; set; }
    [StringLength(512)] public string? HelperText { get; set; }
    public IReadOnlyList<string>? Options { get; set; }
    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateCategoryFieldRequest
{
    [StringLength(128)] public string? Label { get; set; }
    [StringLength(512)] public string? HelperText { get; set; }
    public IReadOnlyList<string>? Options { get; set; }
    public bool? IsRequired { get; set; }
    public int? SortOrder { get; set; }
    public bool? IsActive { get; set; }
}
