using System.Net;

namespace ContractManager.Api.Tests;

public class HealthControllerTests : IClassFixture<ContractManagerApiFactory>
{
    private readonly ContractManagerApiFactory _factory;

    public HealthControllerTests(ContractManagerApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Live_AnonymousCallerGetsOk()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/health/live");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var cacheControl = response.Headers.CacheControl?.ToString() ?? string.Empty;
        Assert.Contains("private", cacheControl);
        Assert.Contains("no-store", cacheControl);
        Assert.True(response.Headers.Contains("X-Operation-Id"), "OperationId middleware should echo correlation id");
    }
}
