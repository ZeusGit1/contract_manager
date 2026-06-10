# Middle-Tier Security Remediation Patterns — Tier 1

Auto-apply mechanical fixes; surface architectural fixes in the batched prompt. Every applied fix is recorded in `artifacts/docs/dev/reviews/remediations-applied/<label>.md` per the SKILL.md flow.

## Auto-fixable (apply, re-run affected gates, record)

### One-liner fixes

- **Missing `[Authorize]`** — add to the controller. Only `GET /health/*` may carry `[AllowAnonymous]` (Tier 1 rule, `api-auth.md`).
- **Missing `[Authorize(Roles = "…")]`** — add the role from `plan.md` section 3.
- **Missing `[ApiController]`** — add to the controller class so automatic model validation runs.
- **Secrets in `appsettings.*.json`** — remove. The Key Vault URI is fine; the secret value belongs in Key Vault and is loaded via `DefaultAzureCredential` (`api-secrets.md`). Flag for credential rotation.
- **Sensitive data in `_logger.Log*`** — replace the offending interpolation with identifier-only logging. Drop user input, DTO bodies, claims other than `oid` / role names. Tier 1 rule (`api-logging.md`): `UserId` (Entra `oid`) and `OperationId` are the only user-correlation fields.
- **Log injection (string concatenation)** — switch to structured logging.

  ```csharp
  // Before
  _logger.LogInformation("User: " + userInput);
  // After
  _logger.LogInformation("User: {UserId}", userId);
  ```

  Never log raw `userInput`; log the identifier you already have.

- **Path traversal** — wrap `userInput` with `Path.GetFileName(userInput)` and reject inputs containing `..`, `/`, `\`.
- **Swagger gated by `IsDevelopment()`** — replace with the `Swagger:Enabled` config flag check (`api-coding-standards.md`).
- **`BinaryFormatter` usage** — replace with `System.Text.Json` serialization. RCE risk.
- **`TypeNameHandling.All` / `Auto`** in Newtonsoft.Json — set to `TypeNameHandling.None`.
- **Model binding to EF entity** — extract a request DTO with only the settable properties; bind that instead.
- **Legacy App Insights instrumentation key** — replace with `APPLICATIONINSIGHTS_CONNECTION_STRING` config + `Microsoft.ApplicationInsights.AspNetCore` setup.
- **`Results.NotFound()` on ownership failure** — replace with `Results.Forbid()` per Tier 1 rule (`api-validation.md`).
- **Missing `CancellationToken`** — add to the method signature; thread through every async call.
- **`AllowAnyOrigin()` in CORS** — replace with `Api:AllowedOrigins` config lookup.
- **Dockerfile `latest` tag** — pin to specific version (e.g., `mcr.microsoft.com/dotnet/aspnet:10.0.1`).
- **Secrets as Docker `ARG` / `ENV`** — remove from the Dockerfile; inject via App Service environment variables at runtime.

### Pattern fixes

**Raw SQL concatenation → parameterized**

```csharp
// Before (forbidden)
await _context.Database.ExecuteSqlRawAsync(
    $"SELECT * FROM Users WHERE Name = '{userName}'", ct);

// After (parameterized)
await _context.Database.ExecuteSqlRawAsync(
    "EXEC dbo.usp_GetUserByName @Name",
    new SqlParameter("@Name", userName), ct);

// Or via FromSqlInterpolated (auto-parameterizes)
var users = await _context.Users
    .FromSqlInterpolated($"EXEC dbo.usp_GetUserByName {userName}")
    .ToListAsync(ct);
```

**XXE prevention**

```csharp
var settings = new XmlReaderSettings {
    DtdProcessing = DtdProcessing.Prohibit,
    XmlResolver = null,
};
using var reader = XmlReader.Create(stream, settings);
```

**CORS restriction**

```csharp
builder.Services.AddCors(options => options.AddPolicy("Spa", p => p
    .WithOrigins(builder.Configuration.GetSection("Api:AllowedOrigins").Get<string[]>()!)
    .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
    .WithHeaders("Content-Type", "Authorization", "X-Operation-Id")));
```

**Baseline security headers middleware** (`api-performance.md`)

```csharp
app.Use(async (context, next) => {
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("Referrer-Policy", "no-referrer");
    context.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

    var path = context.Request.Path.Value ?? string.Empty;
    if (path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase)) {
        context.Response.Headers.Append("Content-Security-Policy",
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'");
    } else {
        context.Response.Headers.Append("Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'");
    }
    await next();
});
```

**Default `Cache-Control` middleware** (`api-coding-standards.md`)

```csharp
app.Use(async (context, next) => {
    context.Response.OnStarting(() => {
        if (!context.Response.Headers.ContainsKey("Cache-Control")) {
            context.Response.Headers["Cache-Control"] = "private, no-store";
        }
        return Task.CompletedTask;
    });
    await next();
});
```

**Rate limiting on expensive operations**

```csharp
builder.Services.AddRateLimiter(options =>
    options.AddFixedWindowLimiter("expensive", opt => {
        opt.PermitLimit = 10;
        opt.Window = TimeSpan.FromMinutes(1);
    }));
// Controller: [EnableRateLimiting("expensive")]
```

**OperationId middleware (first in pipeline)** (`api-logging.md`)

```csharp
app.Use(async (context, next) => {
    var operationId = context.Request.Headers["X-Operation-Id"].FirstOrDefault()
        ?? Activity.Current?.Id
        ?? Guid.NewGuid().ToString();
    using (LogContext.PushProperty("OperationId", operationId)) {
        context.Response.Headers.Append("X-Operation-Id", operationId);
        await next();
    }
});
```

**AFD lockdown (when production has Front Door)** (`api-auth.md`)

```csharp
app.Use(async (context, next) => {
    var configured = builder.Configuration["Security:FrontDoor:FrontDoorId"];
    if (!string.IsNullOrEmpty(configured)) {
        var header = context.Request.Headers["X-Azure-FDID"].FirstOrDefault();
        if (!string.Equals(header, configured, StringComparison.Ordinal)) {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return;
        }
    }
    await next();
});
```

**`.dockerignore` baseline**

```
appsettings.*.json
.env
*.user
*.suo
bin/
obj/
TestResults/
.vs/
.idea/
```

**Structured `JsonStringEnumConverter` registration** (`api-coding-standards.md`)

```csharp
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
```

---

## Manual (report + suggest approach; do not auto-apply)

- **Ownership verification refactor** — adding ownership filters to a service that wasn't checking them is a multi-file change with implications for query shape and tests. Surface as architectural and let the developer wire the policy.
- **Managed Identity migration** — replacing password-based connection strings with `DefaultAzureCredential` requires Azure infra changes (role assignments on the SQL database, etc.) documented in `api-secrets.md` "Required MI role assignments at first deploy." Surface as architectural.
- **Request body size limits** — adding `[RequestSizeLimit(n)]` on specific endpoints requires knowing the expected payload shape. Propose with a default of 1 MB and let the developer tune.
- **Vulnerable NuGet packages** — Critical / High block. Auto-upgrade only when the new version is a patch release with no breaking changes; otherwise propose the upgrade and surface the breaking-change notes.
- **Token refresh / lifetime overrides** — `Microsoft.Identity.Web` defaults are correct; if the diff overrides `ValidateLifetime`, surface as architectural.
- **SSRF allowlist** — adding an outbound `HttpClient` call to an external service is an architectural decision; document the target host(s) in `decisions.md` and add the allowlist with the developer.
- **Multi-stage Dockerfile** — restructuring a single-stage Dockerfile into SDK build → aspnet runtime is a structural change; propose with a template and let the developer apply.
- **MI Graph permissions** — granting `User.Read.All` to the MI requires admin consent via `New-MgServicePrincipalAppRoleAssignment` (`api-client-auth.md`). Document in `decisions.md` and surface to the developer; do not silently change permissions.
