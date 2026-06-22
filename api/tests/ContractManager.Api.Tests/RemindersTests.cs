using System.Net;
using System.Net.Http.Json;
using ContractManager.Api.Auth;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;

namespace ContractManager.Api.Tests;

/// <summary>
/// Reminder behaviour per plan.md §3.5 / ADR-034. Targets are external lanes only
/// (vendor / requester / signature). Phase 1 channel is InAppLogOnly.
/// </summary>
public class RemindersTests : IClassFixture<ContractManagerApiFactory>
{
    private readonly ContractManagerApiFactory _factory;

    public RemindersTests(ContractManagerApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Targets_ReturnsOnlyOpenExternalLanes()
    {
        // Arrange
        var (procOid, contractId) = await SeedContractAsync();
        // Open the Vendor and Requester lanes (both external) and Legal (internal — must NOT appear)
        await _factory.UpdateLaneAsync(contractId, LaneId.Vendor, LaneStatus.Waiting);
        await _factory.UpdateLaneAsync(contractId, LaneId.Requester, LaneStatus.Waiting);
        await _factory.UpdateLaneAsync(contractId, LaneId.Legal, LaneStatus.InReview);

        SetCurrentUser(procOid, AppRoles.Procurement);
        var client = _factory.CreateClient().WithTestAuth();

        // Act
        var response = await client.GetAsync($"/api/contracts/{contractId}/reminders/targets");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var targets = await response.ReadAsAsync<IReadOnlyList<ReminderTargetDto>>();
        Assert.NotNull(targets);
        Assert.Equal(2, targets!.Count);
        Assert.All(targets, t => Assert.Contains(t.LaneId, new[] { LaneId.Vendor, LaneId.Requester, LaneId.Signature }));
        Assert.DoesNotContain(targets, t => t.LaneId == LaneId.Legal);
    }

    [Fact]
    public async Task SendReminder_InternalLaneTarget_Returns400()
    {
        // Arrange
        var (procOid, contractId) = await SeedContractAsync();
        SetCurrentUser(procOid, AppRoles.Procurement);
        var client = _factory.CreateClient().WithTestAuth();

        // Act — Legal is an internal lane; not a valid reminder target
        var response = await client.PostAsJsonAsync($"/api/contracts/{contractId}/reminders",
            new CreateReminderRequest { TargetLaneId = LaneId.Legal },
            TestJsonOptions.Default);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SendReminder_OpenExternalLane_LogsAndReturns201()
    {
        // Arrange
        var (procOid, contractId) = await SeedContractAsync();
        await _factory.UpdateLaneAsync(contractId, LaneId.Vendor, LaneStatus.Waiting);
        SetCurrentUser(procOid, AppRoles.Procurement);
        var client = _factory.CreateClient().WithTestAuth();

        // Act
        var response = await client.PostAsJsonAsync($"/api/contracts/{contractId}/reminders",
            new CreateReminderRequest { TargetLaneId = LaneId.Vendor, Subject = "Reminder" },
            TestJsonOptions.Default);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var log = await response.ReadAsAsync<NotificationLogDto>();
        Assert.NotNull(log);
        Assert.Equal(LaneId.Vendor, log!.TargetLaneId);
        Assert.Equal(NotificationChannel.InAppLogOnly, log.Channel);
        Assert.Equal(NotificationStatus.Logged, log.Status);
    }

    private void SetCurrentUser(Guid oid, params string[] roles)
    {
        _factory.CurrentUserOid = oid;
        _factory.CurrentUserName = "Test Caller";
        _factory.CurrentUserEmail = "caller@test.local";
        _factory.CurrentUserRoles = roles.ToList();
    }

    private async Task<(Guid ProcOid, int ContractId)> SeedContractAsync()
    {
        var procOid = Guid.NewGuid();
        await _factory.EnsureUserAsync(procOid, "Test Procurement", "proc@test.local");
        var vendor = await _factory.EnsureVendorAsync(name: $"Vendor-{Guid.NewGuid()}");
        var contract = await _factory.CreateContractAsync(procOid, vendor.VendorId, procurementOwnerUserId: procOid);
        return (procOid, contract.ContractId);
    }
}
