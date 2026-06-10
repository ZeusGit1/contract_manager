# Middle-Tier Security Audit Checklist — Tier 1

Walk every OWASP category against the diff. For each potential finding, classify severity (Critical / High / Medium / Low) and decide whether the fix is mechanical (auto-apply per `remediation-api.md`) or architectural (surface in the batched prompt).

Tier 1 stack reference: ASP.NET Core 10 controllers + `[ApiController]` + EF Core + `Microsoft.Identity.Web` + Serilog + Azure App Service + Azure SQL + Azure Key Vault + Managed Identity. **Out of scope:** Service Bus / workers, document *processing* pipeline (extraction / OCR / RAG), vector search, queue-driven async processing. Basic file attachments (Blob upload/download, no processing) and a single-shot LLM Q&A (with optional SSE streaming) are in scope — see `api-blob-attachments.md` and `api-performance.md`.

---

## A01: Broken Access Control

- **Missing `[Authorize]` attribute** — every endpoint must carry `[Authorize]` unless explicitly public. The only sanctioned anonymous endpoint in Tier 1 is `GET /health/*`. Flag every other anonymous route as Critical.
- **Missing `[Authorize(Roles = "…")]`** — Tier 1 authorization is by Entra app role (Reader / Editor / Admin or equivalent per `plan.md`). Endpoints performing role-gated work must declare the role explicitly, not just `[Authorize]`.
- **Ownership not verified** — user-supplied IDs (`{id}` in route, foreign-key fields in DTOs) used to fetch / mutate a resource without verifying the requesting user's ownership. Per Tier 1 rule (`api-validation.md`), ownership violations return `403`, not `404`.
- **Client-side-only authorization** — a role check that lives only in the SPA without a matching `[Authorize(Roles="…")]` on the controller.
- **Authorization model not documented** — if the diff adds a new role gate, the corresponding role must appear in `plan.md` section 3 (API contracts) and `plan.md` section 5 (auth + observability plan).

---

## A02: Cryptographic Failures

- **Secrets in `appsettings.json` / `appsettings.*.json`** — Tier 1 rule (`api-secrets.md`): all secrets in Azure Key Vault, loaded via `DefaultAzureCredential`. `appsettings*.json` holds non-secret config only (Key Vault URI, endpoint URIs, allowed origins). Connection strings with passwords, API keys, signing keys, OAuth client secrets, webhook secrets, encryption keys are all forbidden in config files. Flag as Critical.
- **Sensitive data in Serilog / App Insights** — Tier 1 universal guardrail bans logging user input, PII, document content. `UserId` (Entra `oid` — pseudonym) and `OperationId` are the only user-correlation fields permitted (`api-logging.md`, `api-pii-handling.md`). Flag any `_logger.Log*` that interpolates a request body, DTO content, or claim other than `oid` / role names.
- **Passwords stored or transmitted in plain text** — Tier 1 uses Entra for authentication so the API never stores passwords. Flag any code that does.
- **Credentials in connection strings** — Azure SQL and Blob connections must use Managed Identity via `DefaultAzureCredential`. A connection string containing `User Id=` / `Password=` / `Authentication=SqlPassword` is a finding. (Tier 1 uses Blob only for basic attachments — via Managed Identity — and does not use Service Bus, so a connection string carrying credentials for either is a finding.)
- **Legacy App Insights instrumentation key** — use `APPLICATIONINSIGHTS_CONNECTION_STRING`, never the legacy instrumentation key (`api-logging.md`).

---

## A03: Injection

- **Raw SQL string concatenation** — Tier 1 universal guardrail and `api-data-access.md`. `ExecuteSqlRawAsync` / `FromSqlRaw` are only permitted when every dynamic value is a `SqlParameter` (or via `FromSqlInterpolated` / `ExecuteSqlInterpolatedAsync`, which parameterize automatically). Flag any concatenated or template-interpolated raw SQL as Critical.
- **Unvalidated input from `[FromBody]` / `[FromQuery]` / `[FromRoute]`** — every controller method must validate at the boundary (`api-validation.md`): data annotations on DTOs + manual cross-field checks before any service call.
- **Log injection** — user input in log messages must use structured parameters (`"User: {User}", input`), never string concatenation (`"User: " + input`). The injection vector is multi-line log entries forging log records (`api-logging.md`).
- **Path traversal** — user-supplied file names must be sanitized with `Path.GetFileName()`. Reject `..`, `/`, `\` (`api-validation.md`). Tier 1 allows basic file attachments (see `api-blob-attachments.md`), so user-supplied file names DO occur on the attachment upload/download path — verify they are sanitized there. Outside that path, file paths in user input are rare — flag every occurrence.
- **XML External Entity (XXE)** — if XML parsing is added (rare in Tier 1), `DtdProcessing` must be `Prohibit` and `XmlResolver` must be `null`.

---

## A04: Insecure Design

- **State-changing operation via GET** — mutations use POST/PUT/PATCH/DELETE. Never GET (`api-coding-standards.md`).
- **Unbounded list endpoint** — any endpoint returning a collection must enforce pagination with a max page size. `api-coding-standards.md` requires the page size to be a named constant; never an inline literal.
- **Missing `CancellationToken`** — every async controller / service method must accept and pass `CancellationToken` through (`api-coding-standards.md`, universal guardrail in `CLAUDE.md`).
- **`EnsureUserMiddleware` bypass** — Tier 1 provisions users on first authenticated request via `EnsureUserMiddleware` (`api-auth.md`). The middleware must sit after `UseAuthorization` and before `MapControllers`. Flag any controller that calls a "register user" endpoint or expects clients to call one — this contract is the API's, not the SPA's.
- **AFD lockdown disabled when production has Front Door** — `X-Azure-FDID` header validation must run before `UseAuthentication` (`api-auth.md`). A `403` on header mismatch; never `401` (which would trigger a token refresh).

---

## A05: Security Misconfiguration

- **`AllowAnyOrigin()` in production CORS** — production CORS must restrict to the `Api:AllowedOrigins` config list. Hardcoded `AllowAnyOrigin` / `*` is a finding (`api-client-auth.md` lists every SPA origin including dev-server fallback ports).
- **Stack traces / exception details to client** — Tier 1 universal guardrail + `api-error-handling.md`. All errors return RFC 7807 ProblemDetails with plain-language `detail`. Stack traces, exception messages, internal paths must never reach the client. Global exception middleware logs the full exception server-side at `Error` with `OperationId`.
- **Unnecessary HTTP methods** — endpoints should only allow the methods they implement.
- **Missing security headers** — minimum baseline (`api-performance.md`): `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, and `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` on API responses. Swagger paths get a relaxed CSP (see api-performance.md).
- **Swagger enabled in production** — Tier 1 rule (`api-coding-standards.md`): Swagger UI is gated by `Swagger:Enabled` configuration flag, NOT by `IsDevelopment()`. Flag any code using `app.Environment.IsDevelopment()` to gate Swagger — that pattern co-mingles Swagger with the developer exception page, which violates the stack-trace rule.
- **Default `Cache-Control` not set** — Tier 1 rule (`api-coding-standards.md`): every authenticated response sets `Cache-Control: private, no-store` by default (because the API sits behind Azure Front Door which caches by default). Public lookup data may override. A user-scoped endpoint without an explicit `Cache-Control` is a data-leak vector at the edge.
- **`AllowAnyHeader()` + `AllowAnyMethod()`** — restrict to the headers and methods the SPA actually needs.
- **No request body size limits** — unbounded request bodies enable DoS. Add `[RequestSizeLimit(n)]` on any endpoint that accepts bodies larger than a few KB, or configure globally in Kestrel.
- **Developer exception page in production** — must never ship. Tied to `ASPNETCORE_ENVIRONMENT`; Swagger is gated separately for this reason.
- **Middleware ordering** — `api-performance.md` defines the pipeline order. OperationId before authentication; security headers middleware before custom middleware; exception handling wraps the pipeline. Flag any reordering.

---

## A06: Vulnerable and Outdated Components (NuGet)

- **`dotnet list package --vulnerable` findings** — run and check for known CVEs. Critical / High block; Medium investigate.
- **New NuGet package verification** — for every new package in the diff: official NuGet gallery, recent maintenance activity (no updates in 2+ years is a risk), reasonable download count (typosquatting flag), no non-ASCII characters in package name, established publisher, signed.
- **`NuGet.Config` modification** — changes could redirect package resolution to a malicious source. Require explanation in `decisions.md`.
- **Local file path references (`<HintPath>`)** — bypass NuGet vulnerability scanning. Require justification.
- **Explicit transitive-dep pin** — some Azure SDK overloads need `System.Memory.Data` 8.0.0+ even when the top-level package is current (see `api-coding-standards.md`). If a `BinaryData.FromBytes` 2-arg call is added in the diff, verify the pin is present.

ADR-004 note: Tier 1 does not ship Dependabot by default. This checklist and SonarCloud's SCA capability are the enforcement mechanism.

---

## A07: Authentication

- **Custom JWT parsing / validation** — Tier 1 uses `Microsoft.Identity.Web` exclusively (`api-auth.md`). No manual `JwtSecurityTokenHandler`, no custom token validation pipeline.
- **Missing or misconfigured JWT validation** — issuer, audience, lifetime, signing key all enforced by `Microsoft.Identity.Web`. Flag any override of `TokenValidationParameters` that loosens any of these.
- **Hardcoded test credentials or auth-bypass flags** — must be removed before merge. Any `[AllowAnonymous]` outside `/health/*` is a finding.
- **Expired tokens accepted** — `ValidateLifetime` must be `true` (the default in `Microsoft.Identity.Web`). Flag any override.
- **No rate limiting on auth-sensitive endpoints** — Tier 1 has no traditional login endpoint (Entra handles that), but expensive operations (search, export) should have rate limits. `api-performance.md` lists `UseRateLimiter` in the middleware order.
- **MI Graph permissions misaligned** — if the API resolves users by email via Graph (e.g. for invitations), the Managed Identity needs `User.Read.All` as an *App* permission with admin consent (`api-client-auth.md`). Flag any code calling Graph user lookup without this provisioning in `decisions.md`.

---

## A08: Software and Data Integrity

- **CI/CD pipeline modification** — changes that skip security steps (SonarCloud, `dotnet test`) must be flagged as Critical and escalated.
- **`BinaryFormatter` usage** — vulnerable to RCE. Must use `System.Text.Json`.
- **`TypeNameHandling.All` / `TypeNameHandling.Auto`** in Newtonsoft.Json — deserialization attack vector. Must be `TypeNameHandling.None` (the default) or a custom `SerializationBinder`.
- **Model binding directly to EF entity** — must use dedicated request DTOs with only settable properties; never bind to entities directly. The DTO contract is documented in `plan.md` section 3.
- **Missing `[ApiController]`** — without it, automatic model-state validation does not run, and the boundary-validation rule in `api-validation.md` is silently violated.
- **`JsonSerializerOptions` ad hoc** — every controller / service must use the project's standard `JsonSerializerOptions` (with `JsonStringEnumConverter` per `api-coding-standards.md`). Flag any inline `JsonSerializerOptions` redefinition.

---

## A09: Security Logging and Monitoring

- **Authentication events not logged** — sign-in success, token-validation failure, role-mismatch must produce structured log entries (`api-logging.md`).
- **Sensitive operations without audit trail** — privileged actions (admin overrides, bulk operations) must be logged. The 6 audit columns (`CreatedBy`, `UpdatedBy`, etc.) cover row-level audit; application-level audit logs cover the operation.
- **Sensitive data in logs** — tokens, passwords, PII (name, email, phone, address, IP), document content, AI responses must never appear in logs. The Serilog destructuring policy must redact known DTO types (`api-pii-handling.md`). `UserId` is the pseudonym (Entra `oid`); never substitute or supplement it with email or display name.
- **Logs written to insecure destinations** — Tier 1 default sinks are Console (container stdout) and Application Insights. Flag any file-based or HTTP sink without a documented justification.
- **Missing OperationId middleware** — must be the first pipeline item (`api-logging.md`, `api-performance.md` middleware order). Reads `X-Operation-Id` from the request, generates if absent, pushes to Serilog `LogContext`, echoes on response header.
- **OperationId forwarded to third-party services** — internal correlation IDs must not leak to OpenAI, Stripe, or any other external service (`api-logging.md`). A single-shot LLM Q&A is in scope in Tier 1, and a provider call (OpenAI / Anthropic) is exactly where to verify `OperationId` is not forwarded.

---

## A10: Server-Side Request Forgery (SSRF)

- **User-supplied URLs in `HttpClient`** — URLs from user input passed to `HttpClient.GetAsync` / `PostAsync` without allowlist validation.
- **Internal service URLs constructable from user input** — internal endpoints (other firm services, Azure metadata service `169.254.169.254`) reachable via user-controlled string substitution.
- **Server-side redirects with user-supplied URLs** — `Redirect(userControlledUrl)`. Use a validated allowlist.

---

## Advanced

- **Rate limits beyond auth** — file-upload endpoints (not in Tier 1 default but flag if added), expensive search / export operations, API tokens without expiration.
- **`Cache-Control: no-store`** — responses containing PII must include `[ResponseCache(NoStore = true)]` in addition to the global `private, no-store` default — defense in depth.
- **Secrets exposure routes** — secrets as CLI arguments (visible in `ps aux`), secrets in query strings (server logs + browser history), shared secrets across environments, hardcoded encryption keys. Tier 1 rule: Key Vault is the only sanctioned store.
- **Required MI role assignments** — if the diff adds a new Azure resource access (Key Vault, Azure SQL, App Insights), the Managed Identity needs the role assigned (Key Vault Secrets User, the database role, etc. — see `api-secrets.md`). Missing assignments surface only as runtime crashloops — verify the deployment recipe in `decisions.md` mentions the role. Anything beyond these (Blob, Service Bus, AI Search, etc.) is out of scope for Tier 1 — if the diff is reaching for them, stop and escalate per `CLAUDE.md`.

## Container / Hosting

- **Base images pinned** — never `:latest`. Use `mcr.microsoft.com/dotnet/aspnet:10.0.x` with a specific patch version. Tier 1 hosts on Azure App Service which doesn't always use a Dockerfile; flag any Dockerfile that uses `:latest`.
- **No secrets as Docker `ARG` / `ENV`** — secrets stay in Key Vault, fetched at startup via `DefaultAzureCredential`. App Service environment variables hold non-secret config only.
- **`.dockerignore` excludes** — `appsettings.*.json`, `.env`, `*.user`, `*.suo`, `bin/`, `obj/`.
- **Same image promoted across environments** — only env vars and Key Vault URIs differ between dev / staging / prod.
