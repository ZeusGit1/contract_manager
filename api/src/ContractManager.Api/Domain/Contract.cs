namespace ContractManager.Api.Domain;

/// <summary>
/// v2.0 Contract header. Lane state lives in <see cref="ContractLane"/> (one row per LaneId).
/// There is no linear Status enum on this entity — see ADR-029.
/// </summary>
public class Contract : AuditEntity
{
    public int ContractId { get; set; }

    /// <summary>Display ID, e.g. CTR-2026-0142. Filtered-unique on (ContractNumber, IsDeleted=0).</summary>
    public string ContractNumber { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public Category Category { get; set; }

    /// <summary>active / completed / canceled. See plan.md §2.13.</summary>
    public OverallStatus OverallStatus { get; set; } = OverallStatus.Active;

    /// <summary>low / medium / high / critical. Default medium per ADR-029.</summary>
    public Priority Priority { get; set; } = Priority.Medium;

    public int VendorId { get; set; }
    public Vendor? Vendor { get; set; }

    public Guid RequesterUserId { get; set; }
    public User? Requester { get; set; }

    /// <summary>Snapshotted at intake. Surfaced in the reminder modal for the Requester lane.</summary>
    public string RequesterEmail { get; set; } = string.Empty;

    /// <summary>Procurement-side owner. One of the four named Procurement owners.</summary>
    public Guid? ProcurementOwnerUserId { get; set; }
    public User? ProcurementOwner { get; set; }

    public decimal? TotalCostUsd { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime? TermStartDate { get; set; }
    public DateTime? TermEndDate { get; set; }
    public DateTime LastActionAt { get; set; }
    public string? Description { get; set; }

    // Event-only (system fields — IsSystemDefined=true on CategoryField)
    public string? EventName { get; set; }
    public DateTime? EventDate { get; set; }
    public string? VenueLocation { get; set; }
    public string? ParentEventName { get; set; }

    // Facilities-only
    public string? Building { get; set; }
    public string? ServiceDescription { get; set; }

    // IT-only
    public ITType? ITType { get; set; }
    public string? ApplicationName { get; set; }
    public string? ApplicationVersion { get; set; }
    public LicensingType? LicensingType { get; set; }
    public int? NumberOfUsers { get; set; }
    public Hosting? CloudOrOnPrem { get; set; }
    public string? SystemAccess { get; set; }
    public string? Permissions { get; set; }
    public string? Integrations { get; set; }
    public bool? AccessesPersonalData { get; set; }
    public bool? AccessesPHI { get; set; }
    public bool? AccessesClientMatter { get; set; }
    public bool? UsesAI { get; set; }

    public ICollection<ContractLane> Lanes { get; set; } = new List<ContractLane>();
    public ICollection<ContractAssignment> Assignments { get; set; } = new List<ContractAssignment>();
    public ICollection<ContractComment> Comments { get; set; } = new List<ContractComment>();
    public ICollection<ContractNote> Notes { get; set; } = new List<ContractNote>();
    public ICollection<ContractAttachment> Attachments { get; set; } = new List<ContractAttachment>();
    public ICollection<ActivityEvent> ActivityEvents { get; set; } = new List<ActivityEvent>();
    public ICollection<ContractFieldValue> FieldValues { get; set; } = new List<ContractFieldValue>();
}
