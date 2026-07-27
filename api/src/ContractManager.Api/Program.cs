using System.Text.Json.Serialization;
using ContractManager.Api.Auth;
using ContractManager.Api.Data;
using ContractManager.Api.Infrastructure;
using ContractManager.Api.Middleware;
using ContractManager.Api.Options;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Identity.Web;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Strongly-typed options
builder.Services.AddOptions<SecurityOptions>().Bind(builder.Configuration.GetSection("Security"));
builder.Services.AddOptions<AttachmentOptions>().Bind(builder.Configuration.GetSection("Attachments"));
builder.Services.AddOptions<ReminderOptions>().Bind(builder.Configuration.GetSection("Reminders"));
builder.Services.AddOptions<SwaggerOptions>().Bind(builder.Configuration.GetSection("Swagger"));
builder.Services.AddOptions<CategoriesAdminOptions>().Bind(builder.Configuration.GetSection("CategoriesAdmin"));
builder.Services.AddOptions<MailOptions>().Bind(builder.Configuration.GetSection("Mail"));

// Serilog from configuration
builder.Host.UseSerilog((ctx, services, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "ContractManager.Api"));

// Database
var connectionString = builder.Configuration.GetConnectionString("Db")
    ?? throw new InvalidOperationException("ConnectionStrings:Db is required");
builder.Services.AddScoped<AuditingSaveChangesInterceptor>();
builder.Services.AddDbContext<ContractManagerDbContext>((sp, options) =>
{
    options.UseSqlServer(connectionString, sql => sql.MigrationsAssembly("ContractManager.Api"));
    options.AddInterceptors(sp.GetRequiredService<AuditingSaveChangesInterceptor>());
});

// Entra ID / Microsoft.Identity.Web — only configured when AzureAd:TenantId is set,
// so tests can use the test authentication handler instead.
var azureAdSection = builder.Configuration.GetSection("AzureAd");
if (!string.IsNullOrWhiteSpace(azureAdSection["TenantId"]))
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddMicrosoftIdentityWebApi(azureAdSection);
}

// DEV-ONLY: if the gitignored DevBypass class is present AND environment is
// Development, let it override the auth scheme with a mock-user handler. Uses
// reflection so this Program.cs compiles cleanly when the DevBypass folder is
// absent (i.e. everywhere outside a developer's local checkout).
if (builder.Environment.IsDevelopment())
{
    var devBypass = Type.GetType("ContractManager.Api.DevBypass.DevBypass, ContractManager.Api");
    devBypass?.GetMethod("Install")?.Invoke(null, new object[] { builder });
}

builder.Services.AddAuthorization(options =>
{
    // ProcurementAdmin ⊃ Procurement — the admin policy also satisfies the Procurement
    // policy via role composition at the controller level (ADR-032). Each policy still
    // checks exactly its named role; controllers that allow both write Roles="Procurement,ProcurementAdmin".
    options.AddPolicy(AppRoles.Procurement, p => p.RequireRole(AppRoles.Procurement));
    options.AddPolicy(AppRoles.ProcurementAdmin, p => p.RequireRole(AppRoles.ProcurementAdmin));
    options.AddPolicy(AppRoles.Requester, p => p.RequireRole(AppRoles.Requester));
    options.AddPolicy(AppRoles.AttorneyReviewer, p => p.RequireRole(AppRoles.AttorneyReviewer));
});

// CORS — origins from config
builder.Services.AddCors(options =>
{
    var origins = builder.Configuration.GetSection("Api:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
    options.AddDefaultPolicy(policy =>
    {
        if (origins.Length > 0)
        {
            policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
        }
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// ProblemDetails default factory — used by ValidationProblem() for RFC 7807 responses
builder.Services.AddProblemDetails();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Services
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IUserContext, UserContext>();
builder.Services.AddSingleton<EnsureUserCache>();

builder.Services.AddScoped<IContractAccess, ContractAccess>();
builder.Services.AddScoped<IContractNumberGenerator, ContractNumberGenerator>();
builder.Services.AddScoped<IActivityRecorder, ActivityRecorder>();
builder.Services.AddScoped<IVendorService, VendorService>();
builder.Services.AddScoped<IContractSubResourceService, ContractSubResourceService>();
builder.Services.AddScoped<IReminderSettingsService, ReminderSettingsService>();
builder.Services.AddScoped<IAttachmentService, AttachmentService>();
builder.Services.AddScoped<IContractService, ContractService>();
builder.Services.AddScoped<ILaneService, LaneService>();
builder.Services.AddScoped<IReminderService, ReminderService>();
builder.Services.AddScoped<IReportsService, ReportsService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IBulkUploadService, BulkUploadService>();
// IMailSender — Phase 1 ships only the InAppLogOnly impl (ADR-039). When MailOptions.Provider
// flips to GraphMail later, a GraphMailSender registration replaces this line.
builder.Services.AddScoped<IMailSender, InAppLogOnlyMailSender>();

// Blob storage — Managed Identity → Azure Blob in real environments; filesystem in dev.
// Program.cs picks by whether BlobServiceUri is configured. The test factory swaps
// the IAttachmentBlobStore registration directly.
builder.Services.AddSingleton<IAttachmentBlobStore>(serviceProvider =>
{
    var options = serviceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<AttachmentOptions>>().Value;
    if (!string.IsNullOrWhiteSpace(options.BlobServiceUri))
    {
        var blobServiceClient = new Azure.Storage.Blobs.BlobServiceClient(
            new Uri(options.BlobServiceUri), new Azure.Identity.DefaultAzureCredential());
        var container = blobServiceClient.GetBlobContainerClient(options.ContainerName);
        return new AzureBlobAttachmentStore(container);
    }
    // No Azure endpoint configured. In Development, fall back to a filesystem store so
    // local smoke-testing works without Azurite. Everywhere else this is a config bug.
    if (!builder.Environment.IsDevelopment())
    {
        throw new InvalidOperationException(
            "Attachments:BlobServiceUri is required outside Development. " +
            "Set it in configuration or grant the app's Managed Identity access to the storage account.");
    }
    var root = string.IsNullOrWhiteSpace(options.LocalStoragePath)
        ? Path.Combine(AppContext.BaseDirectory, "attachments-local")
        : options.LocalStoragePath;
    return new FilesystemAttachmentStore(root);
});

// Phase 1 reminders are log-only — no IHostedService mail loop (ADR-034 supersedes
// the v1.0 ADR-006 design). Future Graph Mail send wires here per ADR-039.

var app = builder.Build();

// DEV-ONLY: run the seed routine on startup if the gitignored DevBypass is present.
// No-op outside Development or when the DevBypass folder is absent.
if (app.Environment.IsDevelopment())
{
    var devBypass = Type.GetType("ContractManager.Api.DevBypass.DevBypass, ContractManager.Api");
    var seedMethod = devBypass?.GetMethod("SeedAsync");
    if (seedMethod is not null)
    {
        var task = (Task)seedMethod.Invoke(null, new object?[] { app.Services, CancellationToken.None })!;
        await task;
    }
}

// Middleware pipeline order — per api-performance.md:
// Exception → HTTPS → CORS → OperationId → AFD lockdown → Auth → Authz
// → EnsureUser → Cache-Control default → Security headers → Endpoints
app.UseExceptionHandler();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors();

// OperationId must come before any logging middleware so every entry is correlated.
app.UseMiddleware<OperationIdMiddleware>();

// Azure Front Door lockdown (no-op when Security:FrontDoor:FrontDoorId is unset).
app.UseMiddleware<FrontDoorLockdownMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

// Provision user on first authenticated request (after authz, before controllers).
app.UseMiddleware<EnsureUserMiddleware>();

app.UseMiddleware<CacheControlDefaultMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();

// Swagger gated by config flag (NOT IsDevelopment) per api-coding-standards.md.
var swagger = app.Services.GetRequiredService<Microsoft.Extensions.Options.IOptions<SwaggerOptions>>().Value;
if (swagger.Enabled)
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();

app.Run();

// Used by WebApplicationFactory<Program> in integration tests.
public partial class Program { }
