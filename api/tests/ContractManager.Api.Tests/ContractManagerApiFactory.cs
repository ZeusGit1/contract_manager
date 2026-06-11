using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Encodings.Web;
using ContractManager.Api.Auth;
using ContractManager.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ContractManager.Api.Tests;

/// <summary>
/// WebApplicationFactory for integration tests. Per api-testing-guidelines.md:
/// - Uses ephemeral SQL Server LocalDB (one DB per test class instance).
/// - Replaces Microsoft.Identity.Web token validation with a test handler that injects oid/name/roles.
/// </summary>
public class ContractManagerApiFactory : WebApplicationFactory<Program>
{
    public Guid CurrentUserOid { get; set; } = Guid.NewGuid();
    public string CurrentUserName { get; set; } = "Test User";
    public string CurrentUserEmail { get; set; } = "test.user@firm.com";
    public List<string> CurrentUserRoles { get; set; } = new() { AppRoles.Procurement };

    private readonly string _databaseName = $"ContractManager_Test_{Guid.NewGuid():N}";
    private readonly string _connectionString;

    public ContractManagerApiFactory()
    {
        _connectionString =
            $"Server=(localdb)\\MSSQLLocalDB;Database={_databaseName};Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true";
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");

        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Db"] = _connectionString,
                ["Swagger:Enabled"] = "false",
                ["AzureAd:TenantId"] = string.Empty,
            });
        });

        builder.ConfigureServices(services =>
        {
            // Replace the DbContext registration with the per-test connection string so the
            // appsettings.json default never wins.
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ContractManagerDbContext>));
            if (descriptor is not null) services.Remove(descriptor);

            services.AddDbContext<ContractManagerDbContext>(options =>
                options.UseSqlServer(_connectionString,
                    sql => sql.MigrationsAssembly("ContractManager.Api")));

            // Replace authentication with a test handler so we don't call the real Entra tenant.
            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
            services.AddSingleton<ITestAuthConfig>(_ => new TestAuthConfig(this));
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ContractManagerDbContext>();
        db.Database.EnsureCreated();
        return host;
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetService<ContractManagerDbContext>();
            try { db?.Database.EnsureDeleted(); } catch { /* best effort */ }
        }
        base.Dispose(disposing);
    }
}

/// <summary>Snapshot of the factory's auth state at handler-construction time.</summary>
public interface ITestAuthConfig
{
    Guid Oid { get; }
    string Name { get; }
    string Email { get; }
    IReadOnlyList<string> Roles { get; }
}

internal sealed class TestAuthConfig : ITestAuthConfig
{
    private readonly ContractManagerApiFactory _factory;
    public TestAuthConfig(ContractManagerApiFactory factory) => _factory = factory;
    public Guid Oid => _factory.CurrentUserOid;
    public string Name => _factory.CurrentUserName;
    public string Email => _factory.CurrentUserEmail;
    public IReadOnlyList<string> Roles => _factory.CurrentUserRoles;
}

/// <summary>
/// Test authentication handler — populates ClaimsPrincipal with oid/name/preferred_username/roles
/// per api-client-auth.md token-claim contract.
/// </summary>
public sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Test";

    private readonly ITestAuthConfig _config;

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory loggerFactory,
        UrlEncoder encoder,
        ITestAuthConfig config)
        : base(options, loggerFactory, encoder)
    {
        _config = config;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Allow anonymous endpoints to skip without claims.
        if (Request.Headers.Authorization.Count == 0 &&
            !Request.Headers.ContainsKey("X-Test-Authenticate"))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var claims = new List<Claim>
        {
            new("oid", _config.Oid.ToString()),
            new("name", _config.Name),
            new("preferred_username", _config.Email),
        };
        claims.AddRange(_config.Roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var identity = new ClaimsIdentity(claims, SchemeName, "name", ClaimTypes.Role);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}

internal static class TestAuthHeaderExtensions
{
    public static HttpClient WithTestAuth(this HttpClient client)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Test");
        return client;
    }
}
