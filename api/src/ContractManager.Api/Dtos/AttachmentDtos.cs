using ContractManager.Api.Domain;

namespace ContractManager.Api.Dtos;

/// <summary>
/// Compact attachment DTO used by the read endpoint. See <see cref="AttachmentDownload"/> in
/// the service layer for the binary-download contract.
/// </summary>
public record AttachmentDto(
    int AttachmentId,
    Guid AttachmentGuid,
    string FileName,
    string ContentType,
    long SizeBytes,
    AttachmentStatus Status,
    DateTime CreatedAt);

/// <summary>
/// Compact notification log row exposed by the surviving sub-resource service. The newer
/// <see cref="NotificationLogDto"/> in ReminderDtos.cs carries the v2.0 lane + recipient fields;
/// this record is the smaller projection the activity-tab pattern uses.
/// </summary>
public record NotificationDto(
    long NotificationLogId,
    NotificationChannel Channel,
    string Subject,
    NotificationStatus Status,
    string? FailureReason,
    DateTime SentAt);
