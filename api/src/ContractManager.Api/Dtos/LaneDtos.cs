using System.ComponentModel.DataAnnotations;
using ContractManager.Api.Domain;

namespace ContractManager.Api.Dtos;

public record ContractLaneDto(
    int ContractLaneId,
    int ContractId,
    LaneId LaneId,
    LaneStatus Status,
    Guid? OwnerUserId,
    string? OwnerName,
    string? OwnerLabel,
    DateTime? DueDate,
    DateTime LastUpdated,
    string? Note);

/// <summary>
/// Partial update — only properties whose <see cref="Domain.LaneStatus"/>/owner/etc. value
/// should change are populated. <see cref="ClearOwner"/> and <see cref="ClearDueDate"/> are
/// explicit null-set sentinels (otherwise we can't tell "leave alone" from "set to null").
/// </summary>
public class UpdateLaneRequest
{
    public LaneStatus? Status { get; set; }
    public Guid? OwnerUserId { get; set; }
    [StringLength(256)] public string? OwnerLabel { get; set; }
    public DateTime? DueDate { get; set; }
    public string? Note { get; set; }

    public bool ClearOwner { get; set; }
    public bool ClearDueDate { get; set; }
    public bool ClearNote { get; set; }
}
