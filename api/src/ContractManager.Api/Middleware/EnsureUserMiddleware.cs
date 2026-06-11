using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Infrastructure;
using ContractManager.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Middleware;

/// <summary>
/// Idempotently upserts a User row on the first authenticated request from each Entra oid.
/// Per api-auth.md: best-effort, failures log Warning and the request continues.
/// Per-replica cache prevents re-upsert. Pipeline placement: after UseAuthorization, before controllers.
/// </summary>
public class EnsureUserMiddleware
{
    private readonly RequestDelegate _next;

    public EnsureUserMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(
        HttpContext context,
        IUserContext userContext,
        EnsureUserCache cache,
        IClock clock,
        ContractManagerDbContext db,
        ILogger<EnsureUserMiddleware> logger)
    {
        var userId = userContext.UserId;

        if (userContext.IsAuthenticated && userId is Guid oid && !cache.Contains(oid))
        {
            try
            {
                var displayName = userContext.DisplayName ?? string.Empty;
                var email = userContext.Email ?? string.Empty;
                var now = clock.UtcNow;

                // EF Core upsert via FindAsync + Add — single-table operation, no joins.
                var existing = await db.Users.FindAsync(new object[] { oid }, context.RequestAborted)
                    .ConfigureAwait(false);
                if (existing is null)
                {
                    db.Users.Add(new User
                    {
                        UserId = oid,
                        DisplayName = displayName,
                        Email = email,
                        FirstSignInAt = now,
                        CreatedAt = now,
                        UpdatedAt = now,
                        CreatedBy = oid.ToString(),
                        UpdatedBy = oid.ToString(),
                    });
                    await db.SaveChangesAsync(context.RequestAborted).ConfigureAwait(false);
                }
                cache.TryAdd(oid);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "EnsureUser upsert failed for {UserId}; request will continue", oid);
            }
        }

        await _next(context).ConfigureAwait(false);
    }
}
