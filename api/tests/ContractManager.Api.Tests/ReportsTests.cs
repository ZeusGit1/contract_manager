using System.Net;
using ContractManager.Api.Auth;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;

namespace ContractManager.Api.Tests;

/// <summary>
/// Reports KPI math per plan.md §2.13 / §3.11. "Active" = contracts with ≥1 lane in
/// {InReview, Waiting}. Verifies the rule end-to-end through the HTTP surface.
/// </summary>
public class ReportsTests : IClassFixture<ContractManagerApiFactory>
{
    private readonly ContractManagerApiFactory _factory;

    public ReportsTests(ContractManagerApiFactory factory) => _factory = factory;

    [Fact]
    public async Task ActiveRightNow_CountsContractsWithInReviewOrWaitingLanes()
    {
        // IClassFixture shares the LocalDB across tests in this class, so contracts seeded by
        // other tests are present in the universe. We assert the *delta* against a baseline
        // snapshot taken before this test seeds its own three contracts.
        var procOid = Guid.NewGuid();
        await _factory.EnsureUserAsync(procOid, "Procurement Lead", "proc@test.local");
        var vendor = await _factory.EnsureVendorAsync(name: $"Vendor-{Guid.NewGuid()}");

        SetCurrentUser(procOid, AppRoles.Procurement);
        var client = _factory.CreateClient().WithTestAuth();

        // Arrange — capture baseline before seeding the three contracts this test owns.
        var baseline = await client.GetAsync("/api/reports/kpis");
        var beforeKpis = await baseline.ReadAsAsync<ReportsKpiDto>();
        Assert.NotNull(beforeKpis);
        var baselineActive = beforeKpis!.ActiveRightNow;
        var baselineMyActive = beforeKpis.MyActive;

        // Seed three contracts:
        //   #1 — default lanes (Procurement=InReview, others=NotStarted) → ACTIVE
        //   #2 — every lane flipped to Approved → NOT active
        //   #3 — Legal=Waiting on top of default → ACTIVE (only counted once)
        var c1 = await _factory.CreateContractAsync(procOid, vendor.VendorId, procOid);
        var c2 = await _factory.CreateContractAsync(procOid, vendor.VendorId, procOid);
        foreach (var laneId in Enum.GetValues<LaneId>())
        {
            await _factory.UpdateLaneAsync(c2.ContractId, laneId, LaneStatus.Approved);
        }
        var c3 = await _factory.CreateContractAsync(procOid, vendor.VendorId, procOid);
        await _factory.UpdateLaneAsync(c3.ContractId, LaneId.Legal, LaneStatus.Waiting);

        // Act
        var response = await client.GetAsync("/api/reports/kpis");

        // Assert — delta is +2 (c1 and c3 add to active; c2 does not).
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var kpis = await response.ReadAsAsync<ReportsKpiDto>();
        Assert.NotNull(kpis);
        Assert.Equal(baselineActive + 2, kpis!.ActiveRightNow);
        Assert.Equal(baselineMyActive + 2, kpis.MyActive);
    }

    [Fact]
    public async Task ActiveByCategory_GroupsActiveContractsByCategory()
    {
        // Shared DB across tests in this class — assert deltas against a baseline.
        var procOid = Guid.NewGuid();
        await _factory.EnsureUserAsync(procOid, "Procurement Lead", "proc@test.local");
        var vendor = await _factory.EnsureVendorAsync(name: $"Vendor-{Guid.NewGuid()}");

        SetCurrentUser(procOid, AppRoles.Procurement);
        var client = _factory.CreateClient().WithTestAuth();

        // Arrange — baseline counts per category
        var baseline = await client.GetAsync("/api/reports/active-by-category");
        var beforeBars = await baseline.ReadAsAsync<IReadOnlyList<CategoryBarDto>>();
        Assert.NotNull(beforeBars);
        var baseByCat = beforeBars!.ToDictionary(b => b.Category, b => b.Count);

        // Seed: 2 Event, 1 IT, 0 Facilities
        await _factory.CreateContractAsync(procOid, vendor.VendorId, procOid, Category.Event);
        await _factory.CreateContractAsync(procOid, vendor.VendorId, procOid, Category.Event);
        await _factory.CreateContractAsync(procOid, vendor.VendorId, procOid, Category.IT);

        // Act
        var response = await client.GetAsync("/api/reports/active-by-category");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var bars = await response.ReadAsAsync<IReadOnlyList<CategoryBarDto>>();
        Assert.NotNull(bars);
        Assert.Equal(3, bars!.Count); // every category appears, even zero-count
        var afterByCat = bars.ToDictionary(b => b.Category, b => b.Count);
        Assert.Equal(baseByCat.GetValueOrDefault(Category.Event) + 2, afterByCat[Category.Event]);
        Assert.Equal(baseByCat.GetValueOrDefault(Category.IT) + 1, afterByCat[Category.IT]);
        Assert.Equal(baseByCat.GetValueOrDefault(Category.Facilities), afterByCat[Category.Facilities]);
    }

    [Fact]
    public async Task ReportsEndpoints_RequesterRole_Returns403()
    {
        SetCurrentUser(Guid.NewGuid(), AppRoles.Requester);
        var client = _factory.CreateClient().WithTestAuth();

        var response = await client.GetAsync("/api/reports/kpis");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private void SetCurrentUser(Guid oid, params string[] roles)
    {
        _factory.CurrentUserOid = oid;
        _factory.CurrentUserName = "Test Caller";
        _factory.CurrentUserEmail = "caller@test.local";
        _factory.CurrentUserRoles = roles.ToList();
    }
}
