using ContractManager.Api.Domain;
using ContractManager.Api.Infrastructure;
using ContractManager.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace ContractManager.Api.Data;

/// <summary>
/// Populates the six audit columns on every save: CreatedAt/UpdatedAt + CreatedBy/UpdatedBy.
/// Translates hard deletes of audited entities into soft deletes (IsDeleted = 1 + DeletedAt).
/// Resolved via DI as Scoped so it can see the current request's IUserContext.
/// </summary>
public class AuditingSaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly IUserContext _userContext;
    private readonly IClock _clock;

    public AuditingSaveChangesInterceptor(IUserContext userContext, IClock clock)
    {
        _userContext = userContext;
        _clock = clock;
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        ApplyAuditing(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ApplyAuditing(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ApplyAuditing(DbContext? context)
    {
        if (context is null) return;

        var now = _clock.UtcNow;
        var actor = _userContext.UserId?.ToString() ?? "system";

        foreach (EntityEntry entry in context.ChangeTracker.Entries())
        {
            if (entry.Entity is not AuditEntity audited) continue;

            switch (entry.State)
            {
                case EntityState.Added:
                    audited.CreatedAt = now;
                    audited.UpdatedAt = now;
                    if (string.IsNullOrWhiteSpace(audited.CreatedBy)) audited.CreatedBy = actor;
                    if (string.IsNullOrWhiteSpace(audited.UpdatedBy)) audited.UpdatedBy = actor;
                    break;

                case EntityState.Modified:
                    audited.UpdatedAt = now;
                    audited.UpdatedBy = actor;
                    entry.Property(nameof(AuditEntity.CreatedAt)).IsModified = false;
                    entry.Property(nameof(AuditEntity.CreatedBy)).IsModified = false;
                    break;

                case EntityState.Deleted:
                    // Convert hard delete to soft delete (rules: soft-delete only, perpetual retention).
                    entry.State = EntityState.Modified;
                    audited.IsDeleted = true;
                    audited.DeletedAt = now;
                    audited.UpdatedAt = now;
                    audited.UpdatedBy = actor;
                    break;
            }
        }
    }
}
