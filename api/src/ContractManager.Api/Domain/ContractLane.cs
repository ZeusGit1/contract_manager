namespace ContractManager.Api.Domain;

/// <summary>
/// The v2.0 parallel-review-lane row. Every contract has exactly nine rows in this table
/// (one per <see cref="LaneId"/>). Not soft-deleted — absence would break the 9-row invariant
/// (ADR-030). Cancellation / N-A is absorbed by <see cref="LaneStatus"/>.
///
/// Owner shape (enforced by CK_ContractLane_OwnerShape):
///   - Internal lanes (procurement / legal / infosec / privacy / gco / filed) may set OwnerUserId.
///   - External lanes (vendor / requester / signature) leave OwnerUserId null and may set OwnerLabel.
/// </summary>
public class ContractLane : AuditEntity
{
    public int ContractLaneId { get; set; }

    public int ContractId { get; set; }
    public Contract? Contract { get; set; }

    public LaneId LaneId { get; set; }
    public LaneStatus Status { get; set; }

    /// <summary>Set only for internal lanes.</summary>
    public Guid? OwnerUserId { get; set; }
    public User? Owner { get; set; }

    /// <summary>
    /// Free-text label for external lanes (e.g., "Relativity ODA LLC", "DocuSign envelope #4421").
    /// Never logged. NVARCHAR(256).
    /// </summary>
    public string? OwnerLabel { get; set; }

    public DateTime? DueDate { get; set; }
    public DateTime LastUpdated { get; set; }

    /// <summary>NVARCHAR(MAX). Never logged.</summary>
    public string? Note { get; set; }
}
