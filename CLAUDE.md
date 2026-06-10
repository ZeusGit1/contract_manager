# CLAUDE.md — Tier 1 (Production-Grade Internal Apps)

> **You are inside a Tier 1 project.** Tier 1 is the firm's standard framework for **production-grade internal applications**: React + TypeScript on the web, .NET 10 ASP.NET Core on the API, SQL Server on the database, Entra ID for authentication, hosted on Azure App Service + Azure SQL. Data ceiling is **up to client matter / privileged content**. Default peak concurrency is **100 users**.

## What this session is for

Tier 1 sessions build production applications used by named groups of firm employees (default peak: 100 concurrent). The framework is intentionally heavier than a prototype path — it includes Entra authentication, audit columns on every table, structured logging with correlation IDs, RFC 7807 ProblemDetails, Key Vault for secrets, and a single-pass review-and-remediate gate before commit. It is intentionally lighter than the regulated-content tier (no document *processing* pipeline, no workers/Service Bus, no vector search, no temporal tables — those land on a different framework). Basic file attachments (upload/list/download/delete to Blob Storage, with no processing) are in scope — see `api-blob-attachments.md`.

## Tier 1 gate — non-negotiable

Tier 1 is the right framework when **all** of these are true. If any becomes false during a build, **stop and escalate** to the AI Solutions Lead:

- Named group of up to ~100 concurrent users from the firm directory.
- Authentication via single-tenant Entra ID. App roles drive authorization.
- **Access is app-managed.** Who sees which rows is decided by role, ownership, role-scoped filter, or explicit in-app assignment — see `api-record-access.md`. Access driven by **external client-matter / ethical-wall membership** is the wrong framework — the plan skill hard-stops and recommends escalation for that case only.
- Hosted on Azure App Service + Azure SQL (or local dev equivalents).
- No document-*processing* pipeline (extraction, OCR, chunking, embeddings, vector search), no Service Bus workers, no client-facing surface. Basic file attachments (Blob upload/download, no processing) are allowed — see `api-blob-attachments.md`.

Treat the gate as a circuit breaker. If during the build you uncover a hidden requirement that breaches it (analyst says "could we also limit this to the deal team?", "could we extract and search documents?"), **stop and escalate** before continuing.

## Universal guardrails

These apply to every Tier 1 build:

- **Never log user input, AI-generated content, document content, or PII.** Log identifiers, counts, and statuses only. `UserId` (Entra `oid` only — pseudonym) and `OperationId` are the only user-correlation fields allowed in logs.
- **Never expose stack traces, exception messages, or internal paths** to clients. RFC 7807 ProblemDetails with a plain-language `detail` only. Server-side log carries the full error.
- **Never commit secrets.** API keys, passwords, tokens, connection strings with credentials live in Key Vault. Local dev uses `dotnet user-secrets`. `appsettings.Development.json` is gitignored if it contains anything sensitive.
- **Never use raw SQL string concatenation.** Parameterise — EF Core LINQ, `SqlParameter`, `FromSqlInterpolated`.
- **Never use `eval()`, `new Function()`, or unsanitised `dangerouslySetInnerHTML`.**
- **Never disable HTTPS in production.** Don't strip `UseHttpsRedirection`.
- **Validate at the controller boundary.** Data annotations + manual checks before any service call.
- **Ownership violations return `403`, never `404`.** See `api-validation.md`.
- **Every async method accepts and passes a `CancellationToken`.** See `api-coding-standards.md`.

## Stack

| Layer         | Tier 1                                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web           | React 19 + TypeScript + Vite + Vitest + CSS Modules                                                                                                                   |
| API           | ASP.NET Core 10 (controllers, `[ApiController]`) + EF Core + Microsoft.Identity.Web + Serilog                                                                         |
| Database      | SQL Server (Azure SQL in prod, LocalDB in dev)                                                                                                                        |
| Auth          | Single-tenant Entra ID, app roles for authorization, user tokens only                                                                                                 |
| Secrets       | Azure Key Vault + Managed Identity (`DefaultAzureCredential`); `dotnet user-secrets` locally                                                                          |
| Observability | Serilog → Console + Application Insights; `UserId` + `OperationId` structured fields mandatory                                                                        |
| Testing       | xUnit + `WebApplicationFactory<Program>` (API), Vitest + Testing Library + vitest-axe (web), tSQLt (stored procs). **Behavior-floor — coverage advisory, not gated.** |
| Deployment    | Azure App Service single-region. Migrations applied manually dev → staging → prod.                                                                                    |

## Deliberate deviations from the firm full Tier 1+

The firm operates a fuller Tier 1+ framework that includes the document-upload pipeline, workers, vector search, Jest + jest-axe with 80% gate, webpack 5, and an 8-artefact architecture set. This Tier 1 framework deliberately diverges on:

- **Frontend stack:** Vite + Vitest + CSS Modules (firm full uses webpack 5 + Jest + SCSS Modules). Reason: scaffold speed for greenfield apps. Documented in `decisions.md` template.
- **Coverage gate:** behavior-floor, not 80% line/branch/function/statement gate. Reason: speed of iteration on internal apps at this scale. Documented in `decisions.md` template.
- **Planning artefacts:** 2 docs (`plan.md`, `decisions.md`) rather than 7. Reason: appropriate audit-trail depth for non-regulated internal apps; the ADR-style `decisions.md` carries the compliance trail for any non-obvious architectural call.
- **Security scanning:** SonarCloud SAST + Gitleaks + `npm audit` + `dotnet list package --vulnerable` wired in CI by default (firm Tier 1+ adds Dependabot auto-PRs and CodeQL on top). Documented in `decisions.md` ADR-004.
- **Build process:** 2 skills (`/plan` + `/build`) rather than 3 (`/build-architecture` + `/build-scaffold` + `/build-application`). `/build` is a single end-to-end pass over the whole application — no incremental per-capability delivery. Reason: greenfield apps at Tier 1's bounded scope don't benefit from a separate scaffold gate or incremental delivery at this scale.

If a Tier 1 app needs to pull any of these into the fuller bar (e.g., it's been a year and the test suite is now mission-critical and 80% gates would help), promote the project to the firm Tier 1+ framework.

## Rule overlay

The full rule set lives under `.claude/rules/`. Read once at session start; do not re-read mid-session.

- `.claude/rules/dev/_core-requirements.md` — master dev rules + Pre-Implementation Checklist + Quality Gates.
- `.claude/rules/dev/{api-*,web-*,database-*}.md` — layer-specific rules.
- `.claude/rules/design/` — UI / UX rules (accessibility, forms, navigation, etc.).
- `.claude/rules/product/` — product-management standards (intake, patterns, roles, metrics).

The Pre-Implementation Checklist in `_core-requirements.md` is the gate before code. The Quality Gates table at the bottom is the gate before commit.

## Escalation

| Situation                                                                  | Escalate to                                                                                                                                         |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| App needs **external client-matter / ethical-wall** access (row visibility driven by a client/matter relationship in another system) | AI Solutions Lead — different framework                                                                                                             |
| App needs to **process** documents (extraction, OCR, search, indexing, RAG) | AI Solutions Lead — promote to Tier 1+                                                                                                              |
| App needs basic file **attachments** (Blob upload/download, no processing) | In scope for Tier 1 — see `api-blob-attachments.md`; do not escalate                                                                                |
| App needs a worker / Service Bus / queue                                   | AI Solutions Lead — promote to Tier 1+                                                                                                              |
| App needs vector search / embeddings / RAG                                 | AI Solutions Lead — promote to Tier 1+                                                                                                              |
| App needs external-audience access (clients, opposing counsel)             | AI Solutions Lead — outside Tier 1 envelope                                                                                                         |
| Compliance or audit asks for richer trail than `decisions.md` provides     | AI Solutions Lead → Compliance                                                                                                                      |
| App needs a single-shot LLM Q&A (with optional SSE streaming)                            | In scope for Tier 1 — a basic LLM call is covered by the standard rules (secrets, performance, logging); stream per the SSE note in `api-performance.md`; do not escalate. |

---

_Tier 1 is intentionally bounded. If a rule isn't in `.claude/rules/`, it isn't a Tier 1 rule. Do not import rules from the firm Tier 1+ framework or any external source without updating these files first._
