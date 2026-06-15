using System.ComponentModel.DataAnnotations;
using ContractManager.Api.Domain;

namespace ContractManager.Api.Dtos;

public record ContractRowDto(
    int ContractId,
    string ContractNumber,
    string Title,
    Category Category,
    ContractStatus Status,
    string VendorName,
    int VendorId,
    string? AssignedReviewerName,
    string? AssignedReviewerTeam,
    Guid? AssignedReviewerUserId,
    decimal? TotalCostUsd,
    DateTime? TermEndDate,
    DateTime LastActionAt,
    DateTime? NextActionDueAt,
    bool NeedsAttention,
    string? AttentionReason);

public record TriageCountsDto(
    int All,
    int Action,
    int Review,
    int Sign,
    int Expiring,
    int Closed);

public record ContractDetailDto(
    int ContractId,
    string ContractNumber,
    string Title,
    Category Category,
    ContractStatus Status,
    int VendorId,
    string VendorName,
    PreferredStatus VendorPreferredStatus,
    Guid RequesterUserId,
    string RequesterName,
    Guid? AssignedReviewerUserId,
    string? AssignedReviewerName,
    decimal? TotalCostUsd,
    DateTime? SignatureDeadline,
    DateTime SubmittedAt,
    DateTime? TermStartDate,
    DateTime? TermEndDate,
    DateTime LastActionAt,
    DateTime? NextActionDueAt,
    string? Description,
    // Event-only
    DateTime? EventDate,
    string? VenueLocation,
    bool? PartOfLargerEvent,
    string? ParentEventName,
    // Facilities-only
    string? ServiceDescription,
    // IT-only
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
    bool? UsesAI,
    int CommentCount,
    int NoteCount,
    int AttachmentCount,
    bool CanEdit);

public class CreateContractRequest
{
    [Required, StringLength(256)]
    public string Title { get; set; } = string.Empty;

    [Required] public Category Category { get; set; }
    [Required] public int VendorId { get; set; }

    [Range(0.01, 1_000_000_000)]
    public decimal? TotalCostUsd { get; set; }

    public DateTime? SignatureDeadline { get; set; }
    public DateTime? TermStartDate { get; set; }
    public DateTime? TermEndDate { get; set; }
    public string? Description { get; set; }

    // Event
    public DateTime? EventDate { get; set; }
    [StringLength(256)] public string? VenueLocation { get; set; }
    public bool? PartOfLargerEvent { get; set; }
    [StringLength(256)] public string? ParentEventName { get; set; }

    // Facilities
    public string? ServiceDescription { get; set; }

    // IT
    public ITType? ITType { get; set; }
    [StringLength(256)] public string? ApplicationName { get; set; }
    [StringLength(128)] public string? ApplicationVersion { get; set; }
    public LicensingType? LicensingType { get; set; }
    [Range(1, 100_000)] public int? NumberOfUsers { get; set; }
    public Hosting? CloudOrOnPrem { get; set; }
    public string? SystemAccess { get; set; }
    public string? Permissions { get; set; }
    public string? Integrations { get; set; }
    public bool? AccessesPersonalData { get; set; }
    public bool? AccessesPHI { get; set; }
    public bool? UsesAI { get; set; }
}

public class UpdateStatusRequest
{
    [Required] public ContractStatus NewStatus { get; set; }
    public string? Note { get; set; }
}

public class UpdateNextDueRequest
{
    public DateTime? NextActionDueDate { get; set; }
}

public class UpdateReviewerRequest
{
    public Guid? LeadReviewerUserId { get; set; }
}

public record AssignmentDto(
    int ContractAssignmentId,
    Guid ReviewerUserId,
    string ReviewerName,
    string ReviewerTeam,
    DateTime AssignedAt);

public class CreateAssignmentRequest
{
    [Required] public Guid ReviewerUserId { get; set; }
    [Required, StringLength(64)] public string Team { get; set; } = string.Empty;
}

public record CommentDto(
    int ContractCommentId,
    Guid AuthorUserId,
    string AuthorName,
    string AuthorRoleSnapshot,
    string Text,
    bool IsInternalOnly,
    DateTime CreatedAt);

public class CreateCommentRequest
{
    [Required, StringLength(8000, MinimumLength = 1)]
    public string Text { get; set; } = string.Empty;

    public bool IsInternalOnly { get; set; }
}

public record NoteDto(
    int ContractNoteId,
    Guid AuthorUserId,
    string AuthorName,
    NoteType Type,
    DateTime NoteDate,
    string? Participants,
    string Text,
    DateTime CreatedAt);

public class CreateNoteRequest
{
    [Required] public NoteType Type { get; set; }
    [Required] public DateTime Date { get; set; }
    [StringLength(512)] public string? Participants { get; set; }
    [Required, StringLength(8000, MinimumLength = 1)] public string Text { get; set; } = string.Empty;
}

public record ActivityEventDto(
    long ActivityEventId,
    Guid ActorUserId,
    string ActorName,
    ActivityType Type,
    string DescriptionLine,
    DateTime OccurredAt);

public record NotificationDto(
    long NotificationLogId,
    NotificationChannel Channel,
    string Subject,
    NotificationStatus Status,
    string? FailureReason,
    DateTime SentAt);

public record AttachmentDto(
    int ContractAttachmentId,
    Guid AttachmentGuid,
    string FileName,
    string ContentType,
    long SizeBytes,
    AttachmentStatus Status,
    DateTime CreatedAt);

public record RenewalRowDto(
    int ContractId,
    string ContractNumber,
    string Title,
    Category Category,
    string VendorName,
    DateTime? TermEndDate,
    int? DaysRemaining,
    ContractStatus Status,
    string? AssignedReviewerName,
    bool RenewalInFlight);

public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

public record ReminderSettingDto(Category Category, int CadenceDays, string TemplateBody, bool IsEnabled);

public class UpdateReminderSettingRequest
{
    [Required, Range(1, 365)]
    public int CadenceDays { get; set; }

    [Required, StringLength(4000, MinimumLength = 1)]
    public string TemplateBody { get; set; } = string.Empty;

    public bool IsEnabled { get; set; }
}

public record BulkUploadRowDto(
    int RowNumber,
    string? ContractTitle,
    string? VendorName,
    string? Category,
    decimal? TotalCost,
    DateTime? TermStartDate,
    DateTime? TermEndDate,
    IReadOnlyList<string> Errors);

public record BulkUploadPreviewDto(
    int TotalRows,
    int ValidRows,
    int InvalidRows,
    IReadOnlyList<BulkUploadRowDto> Rows);

public class BulkUploadCommitRequest
{
    [Required] public IReadOnlyList<BulkUploadRowDto> Rows { get; set; } = new List<BulkUploadRowDto>();
}

public record BulkUploadCommitResponse(int ImportedCount, int SkippedCount, IReadOnlyList<int> CreatedContractIds);
