namespace ContractManager.Api.Domain;

/// <summary>
/// Canonical enums for the v2.0 parallel-lanes model. See artifacts/docs/dev/plan.md §2.12
/// and decisions.md ADR-029 / ADR-036 / ADR-037 for the rationale.
/// </summary>

public enum OverallStatus
{
    Active = 1,
    Completed = 2,
    Canceled = 3,
}

public enum Priority
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4,
}

/// <summary>
/// The nine canonical lanes. Ordering is meaningful — used for sort + display.
/// Internal lanes carry an OwnerUserId; external lanes carry an OwnerLabel.
/// </summary>
public enum LaneId
{
    Procurement = 1,
    Legal = 2,
    InfoSec = 3,
    Privacy = 4,
    GCO = 5,
    Vendor = 6,
    Requester = 7,
    Signature = 8,
    Filed = 9,
}

/// <summary>
/// Seven canonical lane statuses. Active = {InReview, Waiting} per plan.md §2.13.
/// </summary>
public enum LaneStatus
{
    NotStarted = 1,
    InReview = 2,
    Waiting = 3,
    Approved = 4,
    Canceled = 5,
    NA = 6,
    Complete = 7,
}

public enum Category
{
    Event = 1,
    Facilities = 2,
    IT = 3,
}

public enum VendorType
{
    EventVenue = 1,
    FacilitiesService = 2,
    Software = 3,
    ProfessionalServices = 4,
}

public enum PreferredStatus
{
    Preferred = 1,
    Standard = 2,
    Difficult = 3,
    Blacklisted = 4,
}

public enum ITType
{
    Software = 1,
    ProfessionalServices = 2,
}

public enum LicensingType
{
    Subscription = 1,
    Perpetual = 2,
    PerUser = 3,
}

public enum Hosting
{
    Cloud = 1,
    OnPremise = 2,
    Hybrid = 3,
}

public enum NoteType
{
    Meeting = 1,
    Call = 2,
    Email = 3,
    Note = 4,
}

/// <summary>
/// Fixed enum for ContractAssignment.ReviewerTeam per ADR-036.
/// `Other` is the escape hatch for unanticipated teams.
/// </summary>
public enum ReviewerTeam
{
    Privacy = 1,
    InfoSec = 2,
    GCO = 3,
    Legal = 4,
    Litigation = 5,
    Corporate = 6,
    Other = 7,
}

public enum CategoryFieldType
{
    Text = 1,
    Date = 2,
    Select = 3,
    Radio = 4,
    YesNo = 5,
    Number = 6,
}

public enum AttachmentStatus
{
    Pending = 1,
    Stored = 2,
    Failed = 3,
}

public enum BatchStatus
{
    Pending = 1,
    InProgress = 2,
    Complete = 3,
}

/// <summary>
/// Activity log event types. Append-only — never renumber existing values.
/// New types are appended at the end. See plan.md §2.10.
/// </summary>
public enum ActivityType
{
    // Lane-scoped events
    LaneStatusChanged = 1,
    LaneOwnerChanged = 2,
    LaneNoteUpdated = 3,
    LaneDueDateChanged = 4,
    // Contract-scoped events
    OverallStatusChanged = 10,
    OwnerReassigned = 11,
    CommentAdded = 12,
    NoteAdded = 13,
    AttachmentAdded = 14,
    AttachmentRemoved = 15,
    // Reminder events
    ReminderLogged = 20,
    // Bulk import
    BulkImported = 30,
    // Assignment events
    AssignmentAdded = 40,
    AssignmentRemoved = 41,
    // Category admin
    CategoryUpdated = 50,
    CategoryFieldUpdated = 51,
    // Contract creation
    ContractCreated = 60,
}

/// <summary>
/// Per ADR-034 / ADR-039 — Phase 1 ships only InAppLogOnly. Email is reserved for the
/// follow-up build that wires Microsoft 365 / Graph Mail send.
/// </summary>
public enum NotificationChannel
{
    InAppLogOnly = 1,
    Email = 2,
}

public enum NotificationStatus
{
    Logged = 1,
    Sent = 2,
    Failed = 3,
    Suppressed = 4,
}
