using System.Net;
using ContractManager.Api.Auth;
using ContractManager.Api.Dtos;

namespace ContractManager.Api.Tests;

/// <summary>
/// Verifies the [Authorize(Roles=...)] gates on the contract surface — Requester cannot read the
/// archive (Procurement-only), and an anonymous caller can't reach any /api endpoint.
/// </summary>
public class AuthorizationTests : IClassFixture<ContractManagerApiFactory>
{
    private readonly ContractManagerApiFactory _factory;

    public AuthorizationTests(ContractManagerApiFactory factory) => _factory = factory;

    [Fact]
    public async Task ContractsArchive_RequesterRole_Returns403()
    {
        // Arrange
        _factory.CurrentUserOid = Guid.NewGuid();
        _factory.CurrentUserRoles = new List<string> { AppRoles.Requester };
        var client = _factory.CreateClient().WithTestAuth();

        // Act
        var response = await client.GetAsync("/api/contracts/archive");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task MeEndpoint_NoAuthHeader_Returns401()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/api/me");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task MeEndpoint_AuthenticatedCaller_ReturnsCurrentUser()
    {
        // Arrange
        var oid = Guid.NewGuid();
        _factory.CurrentUserOid = oid;
        _factory.CurrentUserName = "Test Person";
        _factory.CurrentUserEmail = "test.person@firm.com";
        _factory.CurrentUserRoles = new List<string> { AppRoles.Procurement };
        var client = _factory.CreateClient().WithTestAuth();

        // Act
        var response = await client.GetAsync("/api/me");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.ReadAsAsync<CurrentUserResponse>();
        Assert.NotNull(body);
        Assert.Equal(oid, body!.UserId);
        Assert.Contains(AppRoles.Procurement, body.Roles);
    }
}
