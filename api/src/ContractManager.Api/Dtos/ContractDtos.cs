using System.ComponentModel.DataAnnotations;
using ContractManager.Api.Domain;

namespace ContractManager.Api.Dtos;

/// <summary>
/// v2.0 contract DTOs. Lane summary travels with row + detail responses so the SPA can render
/// pills without a second round-trip. Role-filtering happens server-side in IContractService;
/// every consumer of these DTOs sees the same shape but values filtered to the caller's role.
/// </summary>
public record ContractRowDto(
    int ContractId,
    string ContractNumber,
    string Title,
    Category Category,
    OverallStatus OverallStatus,
    Priority Priority,
    int VendorId,
    string VendorName,
    Guid RequesterUserId,
    string RequesterName,
    Guid? ProcurementOwnerUserId,
    string? ProcurementOwnerName,
    decimal? TotalCostUsd,
    DateTime? TermStartDate,
    DateTime? TermEndDate,
    DateTime SubmittedAt,
    DateTime LastActionAt,
    int ActiveLaneCount,
    IReadOnlyList<LanePillDto> Lanes);

/// <summary>Compact lane summary used in row-level pills.</summary>
public record LanePillDto(LaneId LaneId, LaneStatus Status, string? OwnerName, DateTime? DueDate);

public record ContractDetailDto(
    int ContractId,
    string ContractNumber,
    string Title,
    Category Category,
    OverallStatus OverallStatus,
    Priority Priority,
    int VendorId,
    string VendorName,
    PreferredStatus VendorPreferredStatus,
    Guid RequesterUserId,
    string RequesterName,
    string RequesterEmail,
    Guid? ProcurementOwnerUserId,
    string? ProcurementOwnerName,
    decimal? TotalCostUsd,
    DateTime? TermStartDate,
    DateTime? TermEndDate,
    DateTime SubmittedAt,
    DateTime LastActionAt,
    string? Description,
    // Category-specific (system fields) — only the ones for this Category are populated.
    EventFieldsDto? EventFields,
    FacilitiesFieldsDto? FacilitiesFields,
    ItFieldsDto? ItFields,
    // Admin-added field values (CategoryField.IsSystemDefined = false), keyed by FieldKey.
    IReadOnlyDictionary<string, string?> CustomFieldValues,
    // Caller-role capabilities, surfaced so the SPA can hide controls correctly. The API still
    // enforces every gate server-side; this is presentation hint only.
    ContractCapabilitiesDto Capabilities);

public record EventFieldsDto(string? EventName, DateTime? EventDate, string? VenueLocation, string? ParentEventName);
public record FacilitiesFieldsDto(string? Building, string? ServiceDescription);
public record ItFieldsDto(
    ITType? ITType,
    string? ApplicationName,
    string? ApplicationVersion,
    LicensingType? LicensingType,
    int? NumberOfUsers,
    Hosting? CloudOrOnPrem,
    string? SystemAccess,
    string? Permissions,
    string? Integrations,
    bool? AccessesPersonalData,
    bool? AccessesPHI,
    bool? AccessesClientMatter,
    bool? UsesAI);

public record ContractCapabilitiesDto(
    bool CanEditHeader,
    bool CanUpdateLanes,
    bool CanManageAssignments,
    bool CanSendReminder,
    bool CanSeeInternalOnlyComments,
    bool CanSeeNotes);

/// <summary>Generic paginated response shape — unchanged from v1.0 scaffold.</summary>
public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);

public class CreateContractRequest
{
    [Required, StringLength(256)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public Category Category { get; set; }

    public Priority Priority { get; set; } = Priority.Medium;

    [Required]
    public int VendorId { get; set; }

    public bool ProcurementOverride { get; set; }
    [StringLength(512)]
    public string? OverrideReason { get; set; }

    [Required, StringLength(320), EmailAddress]
    public string RequesterEmail { get; set; } = string.Empty;

    public decimal? TotalCostUsd { get; set; }
    public DateTime? TermStartDate { get; set; }
    public DateTime? TermEndDate { get; set; }
    public string? Description { get; set; }

    // Category-specific — only one set should be populated per the chosen Category.
    public EventFieldsDto? EventFields { get; set; }
    public FacilitiesFieldsDto? FacilitiesFields { get; set; }
    public ItFieldsDto? ItFields { get; set; }

    /// <summary>Admin-added field values, keyed by FieldKey. Optional.</summary>
    public Dictionary<string, string?>? CustomFieldValues { get; set; }
}

public class UpdateContractRequest
{
    [StringLength(256)] public string? Title { get; set; }
    public Priority? Priority { get; set; }
    public int? VendorId { get; set; }
    [StringLength(320), EmailAddress] public string? RequesterEmail { get; set; }
    public decimal? TotalCostUsd { get; set; }
    public DateTime? TermStartDate { get; set; }
    public DateTime? TermEndDate { get; set; }
    public string? Description { get; set; }
    public EventFieldsDto? EventFields { get; set; }
    public FacilitiesFieldsDto? FacilitiesFields { get; set; }
    public ItFieldsDto? ItFields { get; set; }
    public Dictionary<string, string?>? CustomFieldValues { get; set; }
}

public class UpdateOverallStatusRequest
{
    [Required] public OverallStatus OverallStatus { get; set; }
    [StringLength(512)] public string? Reason { get; set; }
}

public class UpdateProcurementOwnerRequest
{
    public Guid? ProcurementOwnerUserId { get; set; }
}

public record ContractListFilter(
    string? View,           // mine | master | submissions | reviews | null
    Category? Category,
    Priority? Priority,
    Guid? ProcurementOwnerUserId,
    string? Query);

public record ContractArchiveFilter(string? Query, int? Year);

// ----- Comments -----
public record CommentDto(int ContractCommentId, Guid AuthorUserId, string AuthorName,
    string AuthorRoleSnapshot, string Text, bool IsInternalOnly, DateTime CreatedAt);

public class CreateCommentRequest
{
    [Required] public string Text { get; set; } = string.Empty;
    public bool IsInternalOnly { get; set; }
}

// ----- Notes -----
public record NoteDto(int ContractNoteId, Guid AuthorUserId, string AuthorName, NoteType Type,
    DateTime NoteDate, string? Participants, string Text, DateTime CreatedAt);

public class CreateNoteRequest
{
    [Required] public NoteType Type { get; set; }
    [Required] public DateTime NoteDate { get; set; }
    [StringLength(512)] public string? Participants { get; set; }
    [Required] public string Text { get; set; } = string.Empty;
}

public class UpdateNoteRequest
{
    public NoteType? Type { get; set; }
    public DateTime? NoteDate { get; set; }
    [StringLength(512)] public string? Participants { get; set; }
    public string? Text { get; set; }
}

// ----- Activity -----
public record ActivityEventDto(long ActivityEventId, Guid ActorUserId, string ActorName,
    ActivityType Type, string DescriptionLine, DateTime OccurredAt);

// ----- Assignments -----
public record AssignmentDto(int ContractAssignmentId, Guid ReviewerUserId, string ReviewerName,
    ReviewerTeam ReviewerTeam, DateTime AssignedAt);

public class CreateAssignmentRequest
{
    [Required] public Guid ReviewerUserId { get; set; }
    [Required] public ReviewerTeam ReviewerTeam { get; set; }
}
