using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ContractManager.Api.Tests;

/// <summary>
/// Per-test helpers for seeding prerequisite rows (User, Vendor, Category) so integration
/// tests can focus on the v2.0 behaviour under test. Each helper is idempotent on the
/// LocalDB instance the factory provisions per test class.
/// </summary>
internal static class TestSeed
{
    public static async Task<User> EnsureUserAsync(this ContractManagerApiFactory factory, Guid oid, string displayName, string emailHint)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ContractManagerDbContext>();

        var existing = await db.Users.FirstOrDefaultAsync(u => u.UserId == oid);
        if (existing is not null) return existing;

        // The User table has a filtered-unique index on Email. Tests often pass a stable hint
        // (e.g. "proc@test.local") while generating a fresh OID per test, so embed the OID in
        // the stored email to keep it unique without callers having to thread it.
        var localPart = emailHint.Split('@')[0];
        var domain = emailHint.Contains('@') ? emailHint.Split('@')[1] : "test.local";
        var uniqueEmail = $"{localPart}+{oid:N}@{domain}";

        var user = new User
        {
            UserId = oid,
            DisplayName = displayName,
            Email = uniqueEmail,
            FirstSignInAt = DateTime.UtcNow,
            CreatedBy = "test",
            UpdatedBy = "test",
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public static async Task<Vendor> EnsureVendorAsync(this ContractManagerApiFactory factory,
        string name = "Acme Test Vendor",
        VendorType type = VendorType.Software,
        PreferredStatus preferredStatus = PreferredStatus.Standard)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ContractManagerDbContext>();

        var existing = await db.Vendors.FirstOrDefaultAsync(v => v.Name == name);
        if (existing is not null) return existing;

        var vendor = new Vendor
        {
            Name = name,
            Type = type,
            PreferredStatus = preferredStatus,
            CreatedBy = "test",
            UpdatedBy = "test",
        };
        db.Vendors.Add(vendor);
        await db.SaveChangesAsync();
        return vendor;
    }

    /// <summary>
    /// Creates a Contract + 9 lanes directly via DbContext, bypassing the HTTP controllers.
    /// Useful when the test is about lane behaviour, not the create flow itself.
    /// </summary>
    public static async Task<Contract> CreateContractAsync(this ContractManagerApiFactory factory,
        Guid requesterUserId, int vendorId,
        Guid? procurementOwnerUserId = null,
        Domain.Category category = Domain.Category.IT,
        Priority priority = Priority.Medium)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ContractManagerDbContext>();

        var now = DateTime.UtcNow;
        var contract = new Contract
        {
            ContractNumber = $"CTR-TEST-{Guid.NewGuid().ToString()[..8]}",
            Title = "Test contract",
            Category = category,
            OverallStatus = OverallStatus.Active,
            Priority = priority,
            VendorId = vendorId,
            RequesterUserId = requesterUserId,
            RequesterEmail = "requester@test.local",
            ProcurementOwnerUserId = procurementOwnerUserId,
            SubmittedAt = now,
            LastActionAt = now,
            CreatedBy = "test",
            UpdatedBy = "test",
        };
        foreach (var laneId in Enum.GetValues<LaneId>())
        {
            contract.Lanes.Add(new ContractLane
            {
                LaneId = laneId,
                Status = laneId == LaneId.Procurement ? LaneStatus.InReview : LaneStatus.NotStarted,
                LastUpdated = now,
                CreatedBy = "test",
                UpdatedBy = "test",
            });
        }
        db.Contracts.Add(contract);
        await db.SaveChangesAsync();
        return contract;
    }

    public static async Task UpdateLaneAsync(this ContractManagerApiFactory factory,
        int contractId, LaneId laneId, LaneStatus newStatus, Guid? ownerUserId = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ContractManagerDbContext>();

        var lane = await db.ContractLanes
            .FirstAsync(l => l.ContractId == contractId && l.LaneId == laneId);
        lane.Status = newStatus;
        if (ownerUserId.HasValue) lane.OwnerUserId = ownerUserId;
        lane.LastUpdated = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }
}
