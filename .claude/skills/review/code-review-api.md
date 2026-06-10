# Middle Tier Code Review Checklist — Tier 1 (.NET / Azure)

Walk every changed `.cs` / config / `Program.cs` file against the rules below. For each potential finding, classify severity (Critical / High / Medium / Low) and decide whether the fix is mechanical (auto-apply per `remediation-api.md`) or architectural (surface in the batched prompt).

Tier 1 stack reference: ASP.NET Core 10 controllers + EF Core + `Microsoft.Identity.Web` + Serilog + Azure App Service + Azure SQL + Key Vault + App Insights. **No Workers, no Service Bus, no queue-driven processing, no document *processing* pipeline** — those are Tier 1 hard limits; escalate if a change would require them. Basic file attachments (Blob upload/download, no processing) are allowed — see `api-blob-attachments.md`.

---

## Basic Code Review

### API Standards

- Every API must implement `GET /health/live` (no DB call) and `GET /health/ready` (DB ping) — required for App Service health checks
- No API versioning — breaking changes are coordinated, not versioned
- CORS configured with environment-driven allowed origins — never hardcoded
- Prefer POST with JSON body over GET with query strings — exceptions: simple ID lookups and health endpoints
- No sensitive or complex parameters in query strings — use a request body
- `Cache-Control: private, no-store` default on every endpoint (override only for shared lookup data, e.g. categories/statuses)

### Error Responses

- All errors return a ProblemDetails response (RFC 7807) via `Results.Problem(...)` / `ValidationProblem()` / `Results.Forbid()` / `Results.NotFound()`
- `detail` field must contain a plain-language explanation suitable for UI display
- Never return an empty error response
- Never expose stack traces, internal exception messages, or infrastructure details
- Correct HTTP status codes:

| Situation | Status |
|---|---|
| Validation failure | 400 Bad Request (`ValidationProblem()`) |
| Not authenticated | 401 Unauthorized (handled by `Microsoft.Identity.Web`) |
| Authenticated but not allowed | 403 Forbidden (`Results.Forbid()`) — including ownership violations |
| Resource not found *(only when the resource truly does not exist for ANY user)* | 404 Not Found |
| Unhandled server error | 500 Internal Server Error (`Results.Problem(...)`) |

**Ownership violations return 403, never 404** (Tier 1 universal guardrail). See `api-validation.md` and the universal guardrails in `CLAUDE.md`.

### Pagination

- Any endpoint returning a collection must be paginated — no unbounded lists
- Pagination parameters in POST request body: `{ "page": 1, "pageSize": 20, "filters": {} }`
- Response must include: `{ "items": [...], "totalCount": 0, "page": 1, "pageSize": 20 }`
- Default page size: 20. Maximum: 100. Requests above 100 rejected with 400.
- Exception: small bounded reference data (lookup values, status codes) — use judgement

### Request Validation

- Data Annotations for simple field validation (`[Required]`, `[MaxLength]`, `[Range]`, `[RegularExpression]`)
- Manual validation for business rules requiring context (cross-field rules, database lookups)
- **Do not introduce `FluentValidation` without a `decisions.md` ADR** — Tier 1 framework default
- ASP.NET Core model validation runs automatically — do not re-validate annotated fields manually
- Never trust client-supplied IDs for authorization — always verify ownership server-side
- Sanitize string inputs used in file paths or queries

### Cancellation Tokens

- Every async method must accept and pass a `CancellationToken` (universal guardrail #9)
- Applies to controllers, services, and all infrastructure calls (EF Core, `HttpClient`)
- Pass the token all the way down — do not swallow it at the service boundary

### Naming Conventions

- Controllers: `[Resource]Controller` (PascalCase)
- Services: `I[Name]Service` (interface) + `[Name]Service` (implementation)
- DTOs: `[Name]Request`, `[Name]Response`
- Action methods: HTTP verb conventions — `Get[Resource]`, `Create[Resource]`, `Update[Resource]`, `Delete[Resource]`
- Private fields: `_camelCase` with underscore prefix

### Project & Service Structure

- Controllers handle request/response only — authentication, validation, routing, returning results
- Simple synchronous operations belong as internal service classes within the API project
- **Tier 1 has no Worker pattern.** If a change introduces long-running, queue-driven, or document-pipeline work, **STOP and escalate** — that's a Tier 1+ project, not Tier 1.
- Service-to-service triggering: not in scope for Tier 1 — there is only one service
- Service-to-service reads: not in scope for Tier 1 — there is only one service + one database

### Where Business Logic Lives

| Location | Use for |
|---|---|
| **API service class** | Validation, orchestration, routing, simple transformations, single-table CRUD |
| **Stored Procedure** | Complex queries, aggregations, multi-table joins, performance-sensitive data operations |

- Do not duplicate logic across layers
- Business logic requiring database context (joins, aggregations, set-based operations) belongs in a stored procedure
- Long-running work (>~500ms request latency) is a Tier 1 capacity smell — surface as architectural finding

### Data Access

- EF Core for single-table operations with no joins, no aggregations, no business logic
- Stored procedures for anything beyond that: multi-table joins, aggregations, filtering with business rules, reporting, performance-critical queries
- Call stored procedures via `AppDbContext.Database.ExecuteSqlInterpolated()` or `FromSqlInterpolated()` — **never `FromSqlRaw`/`ExecuteSqlRaw` with string concatenation** (universal guardrail #4)
- No repository abstraction — use EF Core and stored procedures directly
- Soft deletes by default — `IsDeleted` flag + `DeletedAt` timestamp, with EF Core query filter
- Soft-deleted records excluded from all queries by default

### Dependency Injection

- Register services in `Program.cs` or a dedicated extension method
- Constructor injection only — never `HttpContext.RequestServices` (service locator anti-pattern)
- Appropriate lifetimes: `Scoped` for DB contexts and per-request services, `Singleton` for stateless services, `Transient` for lightweight utilities

### Configuration

- Access via `IOptions<T>` pattern — not raw `IConfiguration` in services
- Never hardcode connection strings, API keys, or secrets
- **Tier 1: credentials stored in Azure Key Vault, accessed via Managed Identity** (not Container Apps environment variables — that's a Tier 1+ pattern)
- Use strongly-typed configuration classes
- `appsettings.Development.json` may carry placeholder values for Entra (TenantId, ClientId, Audience) and a LocalDB connection — production values live in Key Vault

### Logging (Serilog)

- Serilog with `Serilog.Sinks.ApplicationInsights` and `Serilog.Sinks.Console` (local dev only)
- Use `APPLICATIONINSIGHTS_CONNECTION_STRING` — not legacy instrumentation key
- Required structured properties on every log entry: `UserId` (Entra `oid`), `OperationId`
- `OperationId` generated at API boundary (middleware), pushed via `LogContext`
- Correct log levels: `Debug` (internals), `Information` (normal ops), `Warning` (unexpected but handled), `Error` (failures), `Critical` (platform broken)
- **Never log** (universal guardrail #1): user input (form values, search queries, expense descriptions, notes), AI response content (out of scope for Tier 1 anyway), client matter identifiers, client/customer details in error messages. `HighlyConfidential` logs as `[RESTRICTED]`.

### Defensive Coding

- Validate at every boundary crossing — internal calls within the same boundary do not need defensive checks
- Boundaries: Frontend → API (HTTP request), API → External (response from DB, third-party API)
- Use C# nullable reference types — do not suppress warnings with `!` unless value is provably non-null
- Empty string and whitespace treated as null at all boundaries — use `string.IsNullOrWhiteSpace()`

### Code Quality

- Methods ≤40 lines, classes ≤300 lines
- Do not use exceptions for control flow — use result patterns or boolean returns
- Use `ConfigureAwait(false)` in library code
- No fire-and-forget async calls without error handling
- No LINQ with side effects (`.Select()` that mutates state)
- Do not build for hypothetical future requirements — flag concerns as comments and wait for a decision

### Testing

- **Integration tests via `WebApplicationFactory<Program>` with synthetic-claims test handler** (Tier 1 standard — see `api-testing-guidelines.md`)
- Every endpoint: at least one integration test. Cover auth (valid/invalid/wrong-role), pagination, validation failures, errors
- Always test: soft-delete exclusion, ownership-403-not-404
- Do not test: simple property mappings, framework behavior, code with no branching
- xUnit tests cover happy path, permanent failure (no retry), and cancellation per service class

### Engineering Decisions

- No patterns or abstractions (repository, mediator, CQRS) without a `decisions.md` ADR
- No new packages (`FluentValidation`, `AutoMapper`, `MediatR`, etc.) without a `decisions.md` ADR
- Performance/scaling/concurrency considered from the start — Tier 1 default peak is 100 concurrent users (`_core-requirements.md` "Capacity and Scalability")

---

## Advanced Code Review

- **N+1 queries** — DB queries inside loops → `.Include()`, projection, or batch queries. No lazy loading.
- **Thread safety** — protect static mutable state; don't capture `HttpContext` in background threads; singletons must be thread-safe
- **Resources** — `IHttpClientFactory` not per-request `HttpClient`; `IDisposable` for unmanaged resources; stream large responses
- **Caching** — always set expiration; `SemaphoreSlim` for expensive cache population to prevent stampede
- **Middleware order** — exception handling → HTTPS redirection → CORS → auth → authz → rate limiting → custom → endpoints
- **Architecture** — thin controllers (no business logic); services depend on abstractions; cross-cutting via middleware/decorators/Polly

### Architecture Violations

- Controllers must be thin — no business logic, no direct database access, no complex conditionals
- Services must depend on abstractions (interfaces), not concrete implementations
- Cross-cutting concerns (logging, caching, retry) handled via middleware, decorators, or Polly policies — not scattered across service methods
- **API must not perform long-running work inline** — if a request looks like it'll exceed a few hundred milliseconds, surface as architectural finding. **Tier 1 has no Worker fallback** — the right answer may be a stored procedure, a denormalized read model, or escalation to Tier 1+.
