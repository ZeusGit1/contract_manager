namespace ContractManager.Api.Domain;

public class Contract : AuditEntity
{
    public int ContractId { get; set; }
    public string ContractNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public Category Category { get; set; }
    public ContractStatus Status { get; set; }

    public int VendorId { get; set; }
    public Vendor? Vendor { get; set; }

    public Guid RequesterUserId { get; set; }
    public User? Requester { get; set; }

    public Guid? AssignedReviewerUserId { get; set; }
    public User? AssignedReviewer { get; set; }

    public decimal? TotalCostUsd { get; set; }
    public DateTime? SignatureDeadline { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime? TermStartDate { get; set; }
    public DateTime? TermEndDate { get; set; }
    public DateTime LastActionAt { get; set; }
    public DateTime? NextActionDueAt { get; set; }
    public DateTime? LastReminderSentAt { get; set; }
    public string? Description { get; set; }

    // Event-only
    public DateTime? EventDate { get; set; }
    public string? VenueLocation { get; set; }
    public bool? PartOfLargerEvent { get; set; }
    public string? ParentEventName { get; set; }

    // Facilities-only
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
    public bool? UsesAI { get; set; }

    public ICollection<ContractAssignment> Assignments { get; set; } = new List<ContractAssignment>();
    public ICollection<ContractComment> Comments { get; set; } = new List<ContractComment>();
    public ICollection<ContractNote> Notes { get; set; } = new List<ContractNote>();
    public ICollection<ContractAttachment> Attachments { get; set; } = new List<ContractAttachment>();
    public ICollection<ActivityEvent> ActivityEvents { get; set; } = new List<ActivityEvent>();
}
