using System.Net;
using System.Net.Http.Json;
using ContractManager.Api.Auth;
using ContractManager.Api.Dtos;

namespace ContractManager.Api.Tests;

/// <summary>
/// Categories admin per ADR-037. Reads are always open; writes require ProcurementAdmin
/// AND the <c>CategoriesAdmin:Enabled</c> flag. When the flag is off, writes return 503.
/// Phase 1 default is flag=off, so these tests run against that default and override per-test
/// as needed.
/// </summary>
public class CategoriesAdminTests : IClassFixture<ContractManagerApiFactory>
{
    private readonly ContractManagerApiFactory _factory;

    public CategoriesAdminTests(ContractManagerApiFactory factory) => _factory = factory;

    [Fact]
    public async Task ListCategories_AnyAuthenticatedRole_Returns200()
    {
        // Arrange
        SetCurrentUser(Guid.NewGuid(), AppRoles.Requester);
        var client = _factory.CreateClient().WithTestAuth();

        // Act
        var response = await client.GetAsync("/api/categories");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task CreateCategory_FlagOff_Returns503ServiceUnavailable()
    {
        // Arrange — default configuration has CategoriesAdmin:Enabled = false (unset),
        // and the caller has the required role
        SetCurrentUser(Guid.NewGuid(), AppRoles.ProcurementAdmin);
        var client = _factory.CreateClient().WithTestAuth();

        // Act
        var response = await client.PostAsJsonAsync("/api/categories",
            new CreateCategoryRequest
            {
                Code = "TestCategory",
                Label = "Test category",
                IconKey = "tag",
                SortOrder = 99,
            }, TestJsonOptions.Default);

        // Assert
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task CreateCategory_ProcurementRoleWithoutAdmin_Returns403()
    {
        // Arrange — Procurement is not enough for category writes; ProcurementAdmin is required.
        SetCurrentUser(Guid.NewGuid(), AppRoles.Procurement);
        var client = _factory.CreateClient().WithTestAuth();

        // Act
        var response = await client.PostAsJsonAsync("/api/categories",
            new CreateCategoryRequest { Code = "X", Label = "X", IconKey = "tag" },
            TestJsonOptions.Default);

        // Assert
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
