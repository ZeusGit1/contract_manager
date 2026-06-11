using System.Collections.Concurrent;

namespace ContractManager.Api.Middleware;

/// <summary>
/// Per-replica cache of Entra oids that have already been provisioned by EnsureUserMiddleware.
/// Singleton — one shared cache per process. Per api-auth.md.
/// </summary>
public class EnsureUserCache
{
    private readonly ConcurrentDictionary<Guid, byte> _provisioned = new();

    public bool TryAdd(Guid userId) => _provisioned.TryAdd(userId, 0);

    public bool Contains(Guid userId) => _provisioned.ContainsKey(userId);
}
