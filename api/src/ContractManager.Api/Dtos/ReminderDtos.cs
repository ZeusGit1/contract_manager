using System.ComponentModel.DataAnnotations;
using ContractManager.Api.Domain;

namespace ContractManager.Api.Dtos;

public record ReminderTargetDto(
    LaneId LaneId,
    LaneStatus Status,
    string? OwnerLabel,
    string? RecipientEmail);

public class CreateReminderRequest
{
    [Required] public LaneId TargetLaneId { get; set; }
    [StringLength(256)] public string? Subject { get; set; }
    public string? Message { get; set; }
}

public record NotificationLogDto(
    long NotificationLogId,
    int ContractId,
    LaneId TargetLaneId,
    NotificationChannel Channel,
    string? RecipientLabel,
    string? RecipientEmail,
    string Subject,
    NotificationStatus Status,
    string? FailureReason,
    DateTime SentAt);

public record ReminderSettingDto(Category Category, int CadenceDays, string TemplateBody, bool IsEnabled);

public class UpdateReminderSettingRequest
{
    [Range(1, 365)] public int CadenceDays { get; set; }
    [Required] public string TemplateBody { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}
