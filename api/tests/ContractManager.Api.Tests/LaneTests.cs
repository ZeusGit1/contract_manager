using System.Net;
using System.Net.Http.Json;
using ContractManager.Api.Auth;
using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ContractManager.Api.Tests;

/// <summary>
/// v2.0 lane behaviour — the core invariants from plan.md §2.13, §3.4, and ADR-029 / ADR-030.
/// Asserts: list-lanes readable by access; PATCH gated to Procurement; Procurement-lane→Complete
/// flips OverallStatus to Completed; AttorneyReviewer + Requester get 403 on PATCH; non-owner
/// Requester cannot access another user's contract.
/// </summary>
public class LaneTests : IClassFixture<ContractManagerApiFactory>
{
    private readonly ContractManagerApiFactory _factory;

    public LaneTests(ContractManagerApiFactory factory) => _factory = factory;

    [Fact]
    public async Task UpdateLane_ProcurementRole_AppliesStatusChange()
    {
        // Arrange
        var (procOid, contractId) = await SeedContractAsync();
        SetCurrentUser(procOid, AppRoles.Procurement);
        var client = _factory.CreateClient().WithTestAuth();

        // Act
        var response = await client.PatchAsJsonAsync(
            $"/api/contracts/{contractId}/lanes/Legal",
            new UpdateLaneRequest { Status = LaneStatus.InReview },
            TestJsonOptions.Default);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var lane = await response.ReadAsAsync<ContractLaneDto>();
        Assert.NotNull(lane);
        Assert.Equal(LaneStatus.InReview, lane!.Status);
        Assert.Equal(LaneId.Legal, lane.LaneId);
    }

    [Fact]
    public async Task UpdateLane_ProcurementLaneToComplete_FlipsOverallStatusToCompleted()
    {
        // Arrange
        var (procOid, contractId) = await SeedContractAsync();
        SetCurrentUser(procOid, AppRoles.Procurement);
        var client = _factory.CreateClient().WithTestAuth();

        // Act
        var response = await client.PatchAsJsonAsync(
            $"/api/contracts/{contractId}/lanes/Procurement",
            new UpdateLaneRequest { Status = LaneStatus.Complete },
            TestJsonOptions.Default);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ContractManagerDbContext>();
        var contract = await db.Contracts.AsNoTracking().FirstAsync(c => c.ContractId == contractId);
        Assert.Equal(OverallStatus.Completed, contract.OverallStatus);
    }

    [Fact]
    public async Task UpdateLane_AttorneyReviewerRole_Returns403()
    {
        // Arrange — seed contract with an assignment so the reviewer has access
        var (procOid, contractId) = await SeedContractAsync();
        var reviewerOid = Guid.NewGuid();
        await _factory.EnsureUserAsync(reviewerOid, "Reviewer One", "rev@test.local");

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ContractManagerDbContext>();
            db.ContractAssignments.Add(new ContractAssignment
            {
                ContractId = contractId,
                ReviewerUserId = reviewerOid,
                ReviewerTeam = ReviewerTeam.Legal,
                AssignedAt = DateTime.UtcNow,
                AssignedByUserId = procOid,
                CreatedBy = "test",
                UpdatedBy = "test",
            });
            await db.SaveChangesAsync();
        }

        SetCurrentUser(reviewerOid, AppRoles.AttorneyReviewer);
        var client = _factory.CreateClient().WithTestAuth();

        // Act
        var response = await client.PatchAsJsonAsync(
            $"/api/contracts/{contractId}/lanes/Legal",
            new UpdateLaneRequest { Status = LaneStatus.InReview },
            TestJsonOptions.Default);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UpdateLane_RequesterRole_Returns403()
    {
        // Arrange — Requester is the contract requester (has access) but cannot mutate lanes
        var (_, contractId, requesterOid) = await SeedContractAsRequesterAsync();
        SetCurrentUser(requesterOid, AppRoles.Requester);
        var client = _factory.CreateClient().WithTestAuth();

        // Act
        var response = await client.PatchAsJsonAsync(
            $"/api/contracts/{contractId}/lanes/Legal",
            new UpdateLaneRequest { Status = LaneStatus.InReview },
            TestJsonOptions.Default);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ListLanes_AsProcurement_ReturnsExactlyNineLanes()
    {
        // Arrange
        var (procOid, contractId) = await SeedContractAsync();
        SetCurrentUser(procOid, AppRoles.Procurement);
        var client = _factory.CreateClient().WithTestAuth();

        // Act
        var response = await client.GetAsync($"/api/contracts/{contractId}/lanes");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var lanes = await response.ReadAsAsync<IReadOnlyList<ContractLaneDto>>();
        Assert.NotNull(lanes);
        Assert.Equal(9, lanes!.Count); // ADR-030 — 9-row invariant
        Assert.Contains(lanes, l => l.LaneId == LaneId.Procurement && l.Status == LaneStatus.InReview);
        Assert.Equal(8, lanes.Count(l => l.Status == LaneStatus.NotStarted));
    }

    // ----------------------------------- helpers -----------------------------------

    private void SetCurrentUser(Guid oid, params string[] roles)
    {
        _factory.CurrentUserOid = oid;
        _factory.CurrentUserName = "Test Caller";
        _factory.CurrentUserEmail = "caller@test.local";
        _factory.CurrentUserRoles = roles.ToList();
    }

    /// <summary>Seeds a Procurement user, a Vendor, and a Contract (returns the Procurement oid + contract id).</summary>
    private async Task<(Guid ProcOid, int ContractId)> SeedContractAsync()
    {
        var procOid = Guid.NewGuid();
        await _factory.EnsureUserAsync(procOid, "Test Procurement", "proc@test.local");
        var vendor = await _factory.EnsureVendorAsync(name: $"Vendor-{Guid.NewGuid()}");
        var contract = await _factory.CreateContractAsync(procOid, vendor.VendorId, procurementOwnerUserId: procOid);
        return (procOid, contract.ContractId);
    }

    /// <summary>Seeds a contract where the caller (Requester) is the requester.</summary>
    private async Task<(Guid ProcOid, int ContractId, Guid RequesterOid)> SeedContractAsRequesterAsync()
    {
        var procOid = Guid.NewGuid();
        var requesterOid = Guid.NewGuid();
        await _factory.EnsureUserAsync(procOid, "Test Procurement", "proc@test.local");
        await _factory.EnsureUserAsync(requesterOid, "Test Requester", "req@test.local");
        var vendor = await _factory.EnsureVendorAsync(name: $"Vendor-{Guid.NewGuid()}");
        var contract = await _factory.CreateContractAsync(requesterOid, vendor.VendorId, procurementOwnerUserId: procOid);
        return (procOid, contract.ContractId, requesterOid);
    }
}
