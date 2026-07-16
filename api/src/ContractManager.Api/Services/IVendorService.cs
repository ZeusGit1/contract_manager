using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Services;

public interface IVendorService
{
    Task<PagedResult<VendorRowDto>> ListAsync(string? query, VendorType? type, PreferredStatus? preferredStatus,
        int page, int pageSize, CancellationToken cancellationToken);

    Task<IReadOnlyList<VendorSuggestionDto>> AutocompleteAsync(string? query, CancellationToken cancellationToken);

    Task<VendorSummaryDto?> GetAsync(int vendorId, CancellationToken cancellationToken);

    Task<(VendorSummaryDto Vendor, Vendor? DuplicateMatch)> CreateAsync(CreateVendorRequest request, CancellationToken cancellationToken);

    Task<bool> UpdateAsync(int vendorId, UpdateVendorRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Soft-delete a vendor. Refuses if the vendor still has non-deleted contracts —
    /// callers must reassign or delete those first. Returns null when the vendor doesn't
    /// exist, true on success, false when the vendor has live contracts.
    /// </summary>
    Task<bool?> DeleteAsync(int vendorId, CancellationToken cancellationToken);
}

public class VendorService : IVendorService
{
    private const int DefaultPageSize = 50;
    private const int MaxPageSize = 200;
    private const double DuplicateSimilarityThreshold = 0.92;

    private readonly ContractManagerDbContext _db;

    public VendorService(ContractManagerDbContext db) => _db = db;

    public async Task<PagedResult<VendorRowDto>> ListAsync(
        string? query, VendorType? type, PreferredStatus? preferredStatus,
        int page, int pageSize, CancellationToken cancellationToken)
    {
        var clampedSize = Math.Clamp(pageSize <= 0 ? DefaultPageSize : pageSize, 1, MaxPageSize);
        var clampedPage = Math.Max(page, 1);

        var queryable = _db.Vendors.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(query))
        {
            var lowered = query.Trim().ToLower();
            queryable = queryable.Where(v => v.Name.ToLower().Contains(lowered));
        }
        if (type is VendorType t) queryable = queryable.Where(v => v.Type == t);
        if (preferredStatus is PreferredStatus p) queryable = queryable.Where(v => v.PreferredStatus == p);

        var total = await queryable.CountAsync(cancellationToken).ConfigureAwait(false);

        var rows = await queryable
            .OrderBy(v => v.Name)
            .Skip((clampedPage - 1) * clampedSize)
            .Take(clampedSize)
            .Select(v => new VendorRowDto(
                v.VendorId,
                v.Name,
                v.Type,
                v.PreferredStatus,
                v.PrimaryContactName,
                v.Contracts.Count(c => !c.IsDeleted)))
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        return new PagedResult<VendorRowDto>(rows, total, clampedPage, clampedSize);
    }

    public async Task<IReadOnlyList<VendorSuggestionDto>> AutocompleteAsync(string? query, CancellationToken cancellationToken)
    {
        var queryable = _db.Vendors.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(query))
        {
            var lowered = query.Trim().ToLower();
            queryable = queryable.Where(v => v.Name.ToLower().Contains(lowered));
        }
        return await queryable
            .OrderBy(v => v.Name)
            .Take(20)
            .Select(v => new VendorSuggestionDto(v.VendorId, v.Name, v.PreferredStatus))
            .ToListAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<VendorSummaryDto?> GetAsync(int vendorId, CancellationToken cancellationToken)
    {
        var vendor = await _db.Vendors.AsNoTracking()
            .FirstOrDefaultAsync(v => v.VendorId == vendorId, cancellationToken).ConfigureAwait(false);
        if (vendor is null) return null;

        var contracts = await _db.Contracts.AsNoTracking()
            .Where(c => c.VendorId == vendorId)
            .OrderByDescending(c => c.SubmittedAt)
            .Take(50)
            .Select(c => new VendorContractRefDto(
                c.ContractId,
                c.ContractNumber,
                c.Title,
                c.OverallStatus,
                c.Priority,
                c.Category,
                c.Lanes.Count(l => l.Status == LaneStatus.InReview || l.Status == LaneStatus.Waiting)))
            .ToListAsync(cancellationToken).ConfigureAwait(false);

        return new VendorSummaryDto(
            vendor.VendorId, vendor.Name, vendor.Type, vendor.PreferredStatus,
            vendor.PrimaryContactName, vendor.PrimaryContactEmail, vendor.PrimaryContactPhone,
            vendor.PrimaryContactRole, vendor.Location, vendor.VendorSinceText, vendor.Notes, contracts);
    }

    public async Task<(VendorSummaryDto Vendor, Vendor? DuplicateMatch)> CreateAsync(
        CreateVendorRequest request, CancellationToken cancellationToken)
    {
        var normalized = NormalizeForMatch(request.Name);
        var existingVendors = await _db.Vendors.AsNoTracking()
            .Select(v => new { v.VendorId, v.Name }).ToListAsync(cancellationToken).ConfigureAwait(false);

        foreach (var candidate in existingVendors)
        {
            var candidateNormalized = NormalizeForMatch(candidate.Name);
            if (JaroWinklerSimilarity(normalized, candidateNormalized) >= DuplicateSimilarityThreshold)
            {
                var match = await _db.Vendors.FirstAsync(v => v.VendorId == candidate.VendorId, cancellationToken)
                    .ConfigureAwait(false);
                var summary = await GetAsync(match.VendorId, cancellationToken).ConfigureAwait(false);
                return (summary!, match);
            }
        }

        var vendor = new Vendor
        {
            Name = request.Name,
            Type = request.Type,
            PreferredStatus = request.PreferredStatus,
            PrimaryContactName = request.PrimaryContactName,
            PrimaryContactEmail = request.PrimaryContactEmail,
            PrimaryContactPhone = request.PrimaryContactPhone,
            PrimaryContactRole = request.PrimaryContactRole,
            Location = request.Location,
            Notes = request.Notes,
        };
        _db.Vendors.Add(vendor);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var created = await GetAsync(vendor.VendorId, cancellationToken).ConfigureAwait(false);
        return (created!, null);
    }

    public async Task<bool> UpdateAsync(int vendorId, UpdateVendorRequest request, CancellationToken cancellationToken)
    {
        var vendor = await _db.Vendors.FindAsync(new object[] { vendorId }, cancellationToken).ConfigureAwait(false);
        if (vendor is null) return false;

        if (request.Name is not null) vendor.Name = request.Name;
        if (request.PreferredStatus is PreferredStatus status) vendor.PreferredStatus = status;
        if (request.PrimaryContactName is not null) vendor.PrimaryContactName = request.PrimaryContactName;
        if (request.PrimaryContactEmail is not null) vendor.PrimaryContactEmail = request.PrimaryContactEmail;
        if (request.PrimaryContactPhone is not null) vendor.PrimaryContactPhone = request.PrimaryContactPhone;
        if (request.PrimaryContactRole is not null) vendor.PrimaryContactRole = request.PrimaryContactRole;
        if (request.Location is not null) vendor.Location = request.Location;
        if (request.Notes is not null) vendor.Notes = request.Notes;

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    public async Task<bool?> DeleteAsync(int vendorId, CancellationToken cancellationToken)
    {
        var vendor = await _db.Vendors.FindAsync(new object[] { vendorId }, cancellationToken).ConfigureAwait(false);
        if (vendor is null) return null;

        // Refuse to delete a vendor that still has live contracts — the caller must move
        // or delete those first. This keeps referential integrity clean without needing
        // FK cascade rules that would silently orphan contract history.
        var liveContractCount = await _db.Contracts
            .CountAsync(c => c.VendorId == vendorId, cancellationToken)
            .ConfigureAwait(false);
        if (liveContractCount > 0) return false;

        vendor.IsDeleted = true;
        vendor.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    /// <summary>Lower-case, replace punctuation with space, strip leading article + corporate suffixes.</summary>
    internal static string NormalizeForMatch(string name)
    {
        var lowered = name.Trim().ToLowerInvariant();
        var normalized = new string(lowered.Select(ch => char.IsLetterOrDigit(ch) ? ch : ' ').ToArray());
        var tokens = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var stripTokens = new HashSet<string> { "the", "inc", "llc", "ltd", "corp", "corporation", "company", "co" };
        var filtered = tokens.Where(token => !stripTokens.Contains(token));
        return string.Join(' ', filtered);
    }

    /// <summary>Jaro-Winkler similarity in [0,1]. Standard implementation.</summary>
    internal static double JaroWinklerSimilarity(string source, string target)
    {
        if (source == target) return 1.0;
        if (source.Length == 0 || target.Length == 0) return 0.0;

        var matchRange = Math.Max(source.Length, target.Length) / 2 - 1;
        if (matchRange < 0) matchRange = 0;

        var sourceMatches = new bool[source.Length];
        var targetMatches = new bool[target.Length];

        var matches = 0;
        for (var sourceIndex = 0; sourceIndex < source.Length; sourceIndex++)
        {
            var start = Math.Max(0, sourceIndex - matchRange);
            var end = Math.Min(sourceIndex + matchRange + 1, target.Length);
            for (var targetIndex = start; targetIndex < end; targetIndex++)
            {
                if (targetMatches[targetIndex]) continue;
                if (source[sourceIndex] != target[targetIndex]) continue;
                sourceMatches[sourceIndex] = true;
                targetMatches[targetIndex] = true;
                matches++;
                break;
            }
        }
        if (matches == 0) return 0.0;

        var transpositions = 0;
        var pointer = 0;
        for (var sourceIndex = 0; sourceIndex < source.Length; sourceIndex++)
        {
            if (!sourceMatches[sourceIndex]) continue;
            while (!targetMatches[pointer]) pointer++;
            if (source[sourceIndex] != target[pointer]) transpositions++;
            pointer++;
        }
        var jaro = ((double)matches / source.Length
                    + (double)matches / target.Length
                    + (matches - transpositions / 2.0) / matches) / 3.0;

        var prefix = 0;
        var maxPrefix = Math.Min(4, Math.Min(source.Length, target.Length));
        for (var index = 0; index < maxPrefix; index++)
        {
            if (source[index] != target[index]) break;
            prefix++;
        }
        return jaro + prefix * 0.1 * (1 - jaro);
    }
}
