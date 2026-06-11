using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Infrastructure;
using ContractManager.Api.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ContractManager.Api.Services;

public interface IReminderSettingsService
{
    Task<IReadOnlyList<ReminderSettingDto>> ListAsync(CancellationToken cancellationToken);
    Task<ReminderSettingDto> UpsertAsync(Category category, UpdateReminderSettingRequest request, CancellationToken cancellationToken);
    Task<ReminderSetting> GetEffectiveAsync(Category category, CancellationToken cancellationToken);
}

public class ReminderSettingsService : IReminderSettingsService
{
    private readonly ContractManagerDbContext _db;
    private readonly IOptions<ReminderOptions> _options;
    private readonly IClock _clock;

    public ReminderSettingsService(ContractManagerDbContext db, IOptions<ReminderOptions> options, IClock clock)
    {
        _db = db;
        _options = options;
        _clock = clock;
    }

    public async Task<IReadOnlyList<ReminderSettingDto>> ListAsync(CancellationToken cancellationToken)
    {
        var existing = await _db.ReminderSettings.AsNoTracking()
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        return Enum.GetValues<Category>().Select(cat =>
        {
            var match = existing.FirstOrDefault(r => r.Category == cat);
            if (match is not null)
            {
                return new ReminderSettingDto(cat, match.CadenceDays, match.TemplateBody, match.IsEnabled);
            }
            var defaultCadence = _options.Value.DefaultCadenceDays.TryGetValue(cat.ToString(), out var days) ? days : 14;
            return new ReminderSettingDto(cat, defaultCadence, DefaultTemplate(), true);
        }).ToList();
    }

    public async Task<ReminderSettingDto> UpsertAsync(
        Category category, UpdateReminderSettingRequest request, CancellationToken cancellationToken)
    {
        var existing = await _db.ReminderSettings
            .FirstOrDefaultAsync(r => r.Category == category, cancellationToken).ConfigureAwait(false);
        if (existing is null)
        {
            existing = new ReminderSetting
            {
                Category = category,
                CadenceDays = request.CadenceDays,
                TemplateBody = request.TemplateBody,
                IsEnabled = request.IsEnabled,
            };
            _db.ReminderSettings.Add(existing);
        }
        else
        {
            existing.CadenceDays = request.CadenceDays;
            existing.TemplateBody = request.TemplateBody;
            existing.IsEnabled = request.IsEnabled;
        }
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new ReminderSettingDto(existing.Category, existing.CadenceDays, existing.TemplateBody, existing.IsEnabled);
    }

    public async Task<ReminderSetting> GetEffectiveAsync(Category category, CancellationToken cancellationToken)
    {
        var existing = await _db.ReminderSettings.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Category == category, cancellationToken).ConfigureAwait(false);
        if (existing is not null) return existing;

        var defaultCadence = _options.Value.DefaultCadenceDays.TryGetValue(category.ToString(), out var days) ? days : 14;
        return new ReminderSetting
        {
            Category = category,
            CadenceDays = defaultCadence,
            TemplateBody = DefaultTemplate(),
            IsEnabled = true,
        };
    }

    private static string DefaultTemplate() =>
        "Reminder: Contract {contractName} with {vendorName} is awaiting signature. " +
        "If you have already signed, please share the executed copy.";
}
