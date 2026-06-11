using ContractManager.Api.Data;
using ContractManager.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Services;

/// <summary>Generates the next ContractNumber in the form CN-YYYY-NNNN, scoped per calendar year.</summary>
public interface IContractNumberGenerator
{
    Task<string> NextAsync(CancellationToken cancellationToken);
}

public class ContractNumberGenerator : IContractNumberGenerator
{
    private readonly ContractManagerDbContext _db;
    private readonly IClock _clock;

    public ContractNumberGenerator(ContractManagerDbContext db, IClock clock)
    {
        _db = db;
        _clock = clock;
    }

    public async Task<string> NextAsync(CancellationToken cancellationToken)
    {
        var year = _clock.UtcNow.Year;
        var prefix = $"CN-{year:D4}-";

        var max = await _db.Contracts
            .IgnoreQueryFilters()
            .Where(c => c.ContractNumber.StartsWith(prefix))
            .Select(c => c.ContractNumber)
            .OrderByDescending(num => num)
            .FirstOrDefaultAsync(cancellationToken).ConfigureAwait(false);

        var nextSequence = 1;
        if (!string.IsNullOrEmpty(max))
        {
            var tail = max[prefix.Length..];
            if (int.TryParse(tail, out var current))
            {
                nextSequence = current + 1;
            }
        }
        return $"{prefix}{nextSequence:D4}";
    }
}
