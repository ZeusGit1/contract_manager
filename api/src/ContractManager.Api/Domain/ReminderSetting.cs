namespace ContractManager.Api.Domain;

public class ReminderSetting : AuditEntity
{
    public int ReminderSettingId { get; set; }
    public Category Category { get; set; }
    public int CadenceDays { get; set; }
    public string TemplateBody { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}
