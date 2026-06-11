using System.ComponentModel.DataAnnotations;
using ContractManager.Api.Domain;

namespace ContractManager.Api.Dtos;

public record VendorRowDto(
    int VendorId,
    string Name,
    VendorType Type,
    PreferredStatus PreferredStatus,
    string? PrimaryContactName,
    int ContractCount);

public record VendorSuggestionDto(int VendorId, string Name, PreferredStatus PreferredStatus);

public record VendorSummaryDto(
    int VendorId,
    string Name,
    VendorType Type,
    PreferredStatus PreferredStatus,
    string? PrimaryContactName,
    string? PrimaryContactEmail,
    string? PrimaryContactPhone,
    string? PrimaryContactRole,
    string? Location,
    string? VendorSinceText,
    string? Notes,
    IReadOnlyList<VendorContractRefDto> Contracts);

public record VendorContractRefDto(
    int ContractId,
    string ContractNumber,
    string Title,
    ContractStatus Status,
    Category Category);

public class CreateVendorRequest
{
    [Required, StringLength(256)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public VendorType Type { get; set; }

    public PreferredStatus PreferredStatus { get; set; } = PreferredStatus.Standard;

    [StringLength(256)]
    public string? PrimaryContactName { get; set; }

    [EmailAddress, StringLength(320)]
    public string? PrimaryContactEmail { get; set; }

    [StringLength(64)]
    public string? PrimaryContactPhone { get; set; }

    [StringLength(128)]
    public string? PrimaryContactRole { get; set; }

    [StringLength(256)]
    public string? Location { get; set; }

    public string? Notes { get; set; }
}

public class UpdateVendorRequest
{
    [StringLength(256)] public string? Name { get; set; }
    public PreferredStatus? PreferredStatus { get; set; }
    [StringLength(256)] public string? PrimaryContactName { get; set; }
    [EmailAddress, StringLength(320)] public string? PrimaryContactEmail { get; set; }
    [StringLength(64)] public string? PrimaryContactPhone { get; set; }
    [StringLength(128)] public string? PrimaryContactRole { get; set; }
    [StringLength(256)] public string? Location { get; set; }
    public string? Notes { get; set; }
}
