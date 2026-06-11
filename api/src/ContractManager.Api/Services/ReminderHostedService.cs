using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Infrastructure;
using ContractManager.Api.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ContractManager.Api.Services;

/// <summary>
/// Polls for contracts in OutForSignature whose category-cadence is due and records reminders.
/// Per ADR-006: in-process IHostedService — single-replica execution risk acknowledged; revisit
/// with a SQL-row-lease pattern if the API ever scales out.
/// </summary>
public class ReminderHostedService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IOptions<ReminderOptions> _options;
    private readonly ILogger<ReminderHostedService> _logger;

    public ReminderHostedService(
        IServiceProvider services,
        IOptions<ReminderOptions> options,
        ILogger<ReminderHostedService> logger)
    {
        _services = services;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var pollInterval = TimeSpan.FromMinutes(Math.Max(1, _options.Value.PollIntervalMinutes));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await TickAsync(stoppingToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Reminder hosted service tick failed; will retry after interval");
            }
            try { await Task.Delay(pollInterval, stoppingToken).ConfigureAwait(false); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task TickAsync(CancellationToken cancellationToken)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ContractManagerDbContext>();
        var clock = scope.ServiceProvider.GetRequiredService<IClock>();
        var settingsService = scope.ServiceProvider.GetRequiredService<IReminderSettingsService>();

        var now = clock.UtcNow;
        var dueContracts = await db.Contracts
            .Include(c => c.Vendor)
            .Where(c => c.Status == ContractStatus.OutForSignature)
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        foreach (var contract in dueContracts)
        {
            var settings = await settingsService.GetEffectiveAsync(contract.Category, cancellationToken).ConfigureAwait(false);
            if (!settings.IsEnabled) continue;

            var cadence = TimeSpan.FromDays(Math.Max(1, settings.CadenceDays));
            if (contract.LastReminderSentAt is DateTime last && now - last < cadence) continue;

            var subject = $"Reminder: contract {contract.ContractNumber} awaiting signature";
            db.NotificationLogs.Add(new NotificationLog
            {
                ContractId = contract.ContractId,
                Channel = NotificationChannel.Email,
                RecipientUserId = contract.RequesterUserId.ToString(),
                Subject = subject,
                Status = NotificationStatus.Sent,
                SentAt = now,
            });
            db.ActivityEvents.Add(new ActivityEvent
            {
                ContractId = contract.ContractId,
                ActorUserId = Guid.Empty, // system
                Type = ActivityType.NotificationSent,
                DescriptionLine = "Reminder sent to requester",
                OccurredAt = now,
            });
            contract.LastReminderSentAt = now;

            _logger.LogInformation(
                "Reminder queued for contract {ContractId} in category {Category}",
                contract.ContractId, contract.Category);
        }
        if (dueContracts.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
    }
}
