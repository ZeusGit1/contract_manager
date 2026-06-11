namespace ContractManager.Api.Domain;

/// <summary>The 13 canonical contract statuses from solution-requirements.md Section 4.</summary>
public enum ContractStatus
{
    InProcess = 1,
    WithVendor = 2,
    WithRequester = 3,
    WithLegal = 4,
    WithGCO = 5,
    WithInfoSec = 6,
    WithPrivacy = 7,
    OutForSignature = 8,
    Completed = 9,
    OnHold = 10,
    Canceled = 11,
    Expired = 12,
    Terminated = 13,
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

public enum ActivityType
{
    StatusChanged = 1,
    Reassigned = 2,
    CommentAdded = 3,
    NoteAdded = 4,
    AttachmentAdded = 5,
    NotificationSent = 6,
    NextDueUpdated = 7,
    BulkImported = 8,
    Created = 9,
    AssignmentChanged = 10,
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

public enum NotificationChannel
{
    InAppOnly = 1,
    Email = 2,
}

public enum NotificationStatus
{
    Sent = 1,
    Failed = 2,
    Suppressed = 3,
}
