using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Services;

/// <summary>
/// Procurement-only KPI math per plan.md §3.11. "Active" = contracts where at least one
/// lane is in {InReview, Waiting} (plan.md §2.13). "My" variants filter to the signed-in
/// Procurement owner. YTD = calendar year of <see cref="IClock.UtcNow"/>.
/// </summary>
public interface IReportsService
{
    Task<ReportsKpiDto> GetKpisAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<CategoryBarDto>> ActiveByCategoryAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<OwnerBarDto>> ActiveByOwnerAsync(CancellationToken cancellationToken);
}

public class ReportsService : IReportsService
{
    private readonly ContractManagerDbContext _db;
    private readonly IUserContext _userContext;
    private readonly IClock _clock;

    public ReportsService(ContractManagerDbContext db, IUserContext userContext, IClock clock)
    {
        _db = db;
        _userContext = userContext;
        _clock = clock;
    }

    public async Task<ReportsKpiDto> GetKpisAsync(CancellationToken cancellationToken)
    {
        var now = _clock.UtcNow;
        var ytdStart = new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var ytdEnd = ytdStart.AddYears(1);

        var me = _userContext.UserId ?? Guid.Empty;

        // Reviewed YTD = contracts whose Procurement owner = me and were touched (LastActionAt) this year.
        var allReviewedYtd = await _db.Contracts
            .Where(c => c.LastActionAt >= ytdStart && c.LastActionAt < ytdEnd)
            .CountAsync(cancellationToken).ConfigureAwait(false);

        var myReviewedYtd = await _db.Contracts
            .Where(c => c.ProcurementOwnerUserId == me
                        && c.LastActionAt >= ytdStart && c.LastActionAt < ytdEnd)
            .CountAsync(cancellationToken).ConfigureAwait(false);

        // Active = contracts where any lane is in {InReview, Waiting}.
        var activeRightNow = await _db.Contracts
            .Where(c => c.OverallStatus == OverallStatus.Active
                        && c.Lanes.Any(l => l.Status == LaneStatus.InReview || l.Status == LaneStatus.Waiting))
            .CountAsync(cancellationToken).ConfigureAwait(false);

        var myActive = await _db.Contracts
            .Where(c => c.OverallStatus == OverallStatus.Active
                        && c.ProcurementOwnerUserId == me
                        && c.Lanes.Any(l => l.Status == LaneStatus.InReview || l.Status == LaneStatus.Waiting))
            .CountAsync(cancellationToken).ConfigureAwait(false);

        var completedYtd = await _db.Contracts
            .Where(c => c.OverallStatus == OverallStatus.Completed
                        && c.LastActionAt >= ytdStart && c.LastActionAt < ytdEnd)
            .CountAsync(cancellationToken).ConfigureAwait(false);

        var canceledYtd = await _db.Contracts
            .Where(c => c.OverallStatus == OverallStatus.Canceled
                        && c.LastActionAt >= ytdStart && c.LastActionAt < ytdEnd)
            .CountAsync(cancellationToken).ConfigureAwait(false);

        var myOwnerName = me == Guid.Empty
            ? string.Empty
            : (await _db.Users.AsNoTracking()
                .Where(u => u.UserId == me)
                .Select(u => u.DisplayName)
                .FirstOrDefaultAsync(cancellationToken).ConfigureAwait(false) ?? string.Empty);

        return new ReportsKpiDto(allReviewedYtd, myReviewedYtd, myOwnerName, activeRightNow, myActive, completedYtd, canceledYtd);
    }

    public async Task<IReadOnlyList<CategoryBarDto>> ActiveByCategoryAsync(CancellationToken cancellationToken)
    {
        var rows = await _db.Contracts
            .Where(c => c.OverallStatus == OverallStatus.Active
                        && c.Lanes.Any(l => l.Status == LaneStatus.InReview || l.Status == LaneStatus.Waiting))
            .GroupBy(c => c.Category)
            .Select(g => new CategoryBarDto(g.Key, g.Count()))
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        // Ensure every category appears at least once with a zero count so the chart axis is stable.
        var present = rows.Select(r => r.Category).ToHashSet();
        foreach (var category in Enum.GetValues<Category>())
        {
            if (!present.Contains(category)) rows.Add(new CategoryBarDto(category, 0));
        }
        return rows.OrderBy(r => r.Category).ToList();
    }

    public async Task<IReadOnlyList<OwnerBarDto>> ActiveByOwnerAsync(CancellationToken cancellationToken)
    {
        return await _db.Contracts
            .Where(c => c.OverallStatus == OverallStatus.Active
                        && c.ProcurementOwnerUserId.HasValue
                        && c.Lanes.Any(l => l.Status == LaneStatus.InReview || l.Status == LaneStatus.Waiting))
            .GroupBy(c => new { OwnerUserId = c.ProcurementOwnerUserId!.Value, OwnerName = c.ProcurementOwner!.DisplayName })
            .Select(g => new OwnerBarDto(g.Key.OwnerUserId, g.Key.OwnerName, g.Count()))
            .OrderByDescending(r => r.Count)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
    }
}
