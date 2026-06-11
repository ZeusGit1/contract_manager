namespace ContractManager.Api.Options;

public class ReminderOptions
{
    /// <summary>How often the IHostedService wakes to scan for due reminders. Default: 60 minutes.</summary>
    public int PollIntervalMinutes { get; set; } = 60;

    /// <summary>Default cadence per category if no ReminderSetting row exists yet. Maps Category name → days.</summary>
    public Dictionary<string, int> DefaultCadenceDays { get; set; } = new()
    {
        ["Event"] = 14,
        ["Facilities"] = 14,
        ["IT"] = 14,
    };
}
