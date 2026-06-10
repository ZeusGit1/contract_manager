# Engineering Standards — Tier 1

## Project Scope

Tier 1 covers production-grade internal applications hosted on Azure App Service + Azure SQL, authenticated via single-tenant Entra ID, used by named groups of firm employees at default peak **100 concurrent users**, with data classification up to and including client matter / privileged content.

**Out of scope for Tier 1.** If any of these become required, **stop and escalate** — promote the project to the firm Tier 1+ framework before continuing:

- Document **processing** pipeline — text extraction, OCR, chunking, or any flow that reads _into_ a file's content.
- Vector search, embeddings, RAG, conversation history grounded on documents.
- Service Bus workers, queue-driven async processing.
- Document _pipelines_ over blob content (upload → Service Bus → Worker → extract / index). Basic file **attachments** (upload/list/download/delete to Blob Storage, no processing) ARE in scope — see `api-blob-attachments.md`.
- External client-matter / ethical-wall access (row visibility driven by a client/matter relationship in another firm system). In-app access — role, ownership, role-scope, admin assignment — is in scope; see `api-record-access.md`.
- External audience (clients, opposing counsel, regulators, the public web).
- Compliance audit trails richer than the 6 mandatory audit columns + `decisions.md` ADR log.

If the application would require any of the above, follow the escalation row above — do not introduce these features inside a Tier 1 project.

---

## MANDATORY — Before Planning or Writing Any Code

Before planning or implementing any feature, you MUST:

1. Identify every `.claude/rules/dev/` file that governs the feature area using the table below.
2. Read each of those files in full using the Read tool.
3. State which rules you read and list the key constraints they impose.

This applies to planning, design, and architecture — not just implementation. Rules contain implementation constraints that shape design decisions; you cannot plan correctly without knowing them. Read once per build, not once per phase.

Do not write a single line of implementation code — or propose an implementation plan — before completing these steps.

**Do not invent constraints.** If a limit, threshold, timeout, or behaviour is not stated in a rule file, it does not exist. Do not add it. If you are unsure, ask.

All paths in the table below are relative to `.claude/rules/dev/`.

| Feature area                   | Rule files to read before implementing                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Auth (server-side)             | `api-auth.md`, `api-secrets.md`                                                                                         |
| Auth (client-side, MSAL)       | `api-client-auth.md`                                                                                                    |
| Secrets                        | `api-secrets.md`                                                                                                        |
| PII handling                   | `api-pii-handling.md`                                                                                                   |
| Logging                        | `api-logging.md`, `api-pii-handling.md`                                                                                 |
| Error handling                 | `api-error-handling.md`                                                                                                 |
| Validation                     | `api-validation.md`, `api-defensive-coding.md`                                                                          |
| Data access (EF Core, queries) | `api-data-access.md`, `database-coding-standards.md`                                                                    |
| Coding standards (API)         | `api-coding-standards.md`                                                                                               |
| Performance                    | `api-performance.md`, `database-performance.md`, `web-performance.md`                                                   |
| LLM Q&A (+ SSE streaming)      | `api-performance.md`, `api-secrets.md`, `api-pii-handling.md`                                                           |
| API testing                    | `api-testing-guidelines.md`                                                                                             |
| Web components                 | `web-component-architecture.md`, `web-coding-standards.md`, `web-styling.md`                                            |
| Web state                      | `web-state-management.md`                                                                                               |
| Web persistence                | `web-persistence.md`                                                                                                    |
| Web testing                    | `web-testing.md`                                                                                                        |
| Web lint / format              | `web-linting-formatting.md`                                                                                             |
| Web file structure             | `web-file-structure.md`                                                                                                 |
| Web browser support            | `web-browser-support.md`                                                                                                |
| Web dependency security        | `web-dependency-security.md`                                                                                            |
| Web error logging              | `web-error-logging.md`                                                                                                  |
| Blob attachments (API)         | `api-blob-attachments.md`                                                                                               |
| Blob attachments (web)         | `web-blob-attachments.md`                                                                                               |
| Record-level access            | `api-record-access.md`                                                                                                  |
| Database tables                | `database-coding-standards.md`, `database-migrations.md`                                                                |
| Database stored procedures     | `database-stored-procedures.md`, `database-coding-standards.md`                                                         |
| Database migrations            | `database-migrations.md`                                                                                                |
| Database testing               | `database-testing.md`                                                                                                   |
| CI pipeline                    | `ci-pipeline.md`, `web-linting-formatting.md`, `web-dependency-security.md`, `web-testing.md`, `web-browser-support.md` |

---

## Sub-Agent Orchestration

Sub-agents are not the default — for work that fits in a single context, prefer single-agent execution. When you do dispatch a sub-agent, the orchestrator owns the compliance contract. The sub-agent only sees what you pass it: its starting prompt is the rules it has.

**Orchestrator obligations when dispatching a sub-agent:**

1. **Pass the relevant rule excerpts in the prompt.** Sub-agents do not inherit `CLAUDE.md` or any `.claude/rules/dev/` file. Identify the rules that govern the sub-agent's scope and quote the binding constraints into its prompt — do not assume it will go find them.
2. **State the applicable completion gates and skills.** Tell the sub-agent which `/review` or area-specific skills its work must run through, and which gates (`npm run lint`, `dotnet test`, tSQLt, etc.) must pass before it returns.
3. **Verify the output independently before accepting.** When the sub-agent reports back, read the files it changed, run the relevant gates yourself, and check the output against the rules you passed in. Do not accept the sub-agent's self-reported completion status as proof. If verification fails, re-task the sub-agent with the specific deficiencies.
4. **A task is not complete until every applicable gate passes** — at any level of the agent hierarchy. Partial completion is not completion.

---

## Execution Discipline

- **If the scope is too large, say so — do not cut silently.** State explicitly what you are skipping and why. A known gap the user can plan around is better than a silent omission.
- **Default to confirming before destructive, large-scope, or network-affecting actions.** Pause and ask before anything irreversible or shared-state (`rm -rf`, force-push, `reset --hard`, dropping schema, deploying, pushing, opening or merging PRs, posting to external services).

---

## Code Discipline

Within an approved, right-sized scope, this governs how the code itself is written.

**Simplicity first — the minimum that solves the problem, nothing speculative.**

- No features, flags, or configurability beyond what the task asks for.
- No abstraction for single-use code — inline it until a second caller actually exists.
- No error handling for scenarios that cannot occur.
- If it came out at 200 lines and 50 would do, rewrite it before moving on.

The test: would a senior engineer reviewing this call it overcomplicated? If so, simplify before shipping.

**Surgical changes — touch only what the task requires.**

- Don't reformat, rename, or "improve" code adjacent to your change.
- Don't refactor code that isn't broken and isn't in scope.
- Match the surrounding style, even where you'd personally do it differently.
- Remove imports, variables, and helpers that _your_ change orphaned — but leave pre-existing dead code alone, unless asked. Mention it; don't delete it.

The test: every changed line should trace to the task.

---

## Architectural Decision Authority

Orchestrators and sub-agents make routine architectural decisions on their own. Follow `.claude/rules/dev/`, use judgment, and note non-obvious choices briefly so the user can redirect.

**Decide and proceed:** local, low-impact choices that follow existing conventions and stay contained to a small area of the codebase.

**Stop and ask:** decisions that introduce new patterns, dependencies, or abstractions; cross-cutting concerns; affect shared contracts or schemas; span multiple areas; touch security, capacity, or scaling; pull in anything listed as out of scope under "Project Scope" above; or would change the rules themselves.

Rule of thumb: if it's reversible quickly and locally, decide. If reversing it would ripple across the codebase, ask first — present 2–3 options with tradeoffs.

**Every non-obvious architectural decision must be appended to `decisions.md` as an ADR-style one-paragraph entry** — that file IS the compliance audit trail for this framework, in lieu of the 7-doc set the firm Tier 1+ framework uses.

---

## Pre-Implementation Checklist

State which tiers this build touches in one line before walking the checklist, e.g. _"Tiers: Always, Code, API endpoint, Database table."_ Skip tiers that don't apply.

| Tier                    | Trigger                                               | Items                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Always**              | every build                                           | Every limit/threshold/timeout/count comes from a rule file (none invented). Tests ship alongside the code they cover — never deferred. Tests author here; `/review` runs them at build completion.                                                                                                                                                                                                            |
| **Code**                | any executable code                                   | User content, AI responses, document content, and PII are never logged (`HighlyConfidential` logs as `[RESTRICTED]`). `CancellationToken` is passed to every async method, including infrastructure calls.                                                                                                                                                                                                    |
| **API endpoint**        | adding/changing a controller route                    | `[Authorize(Roles="...")]` matches the app-role model for this resource (Reader / Editor / Admin or similar). Ownership / role violations return `403`, never `404`. All errors use ProblemDetails (RFC 7807) with plain-language `detail`. Stack traces, internal exceptions, and infra details are never exposed. `Cache-Control: private, no-store` set by default (override only for shared lookup data). |
| **API service**         | adding a new service class                            | Interface (`I{Name}Service`) + implementation, registered in DI by lifetime. xUnit tests cover happy path, permanent failure (no retry), and cancellation. At least one integration test covers the full request/response cycle.                                                                                                                                                                              |
| **Record-level access** | adding row-filtering by role / ownership / assignment | One server-side check on every read path (list, detail, related resources). List filters in-query; detail/mutation → `403` (never `404`) on an inaccessible row. Access source is app-managed (`CreatedBy` / role / assignment table), never external client-matter. Field-level visibility enforced at the API.                                                                                              |
| **Blob attachment**     | adding file upload/download to Blob                   | Streams directly to Blob (never buffered in API memory). Content-type allowlist + max-size, both from config, enforced at the controller boundary. Ownership verified → `403`. Blob fail → no SQL row, `502`; SQL fail after blob → delete blob, `500`. No Service Bus, no Worker, no content processing.                                                                                                     |
| **Web component**       | adding/changing a React component                     | Colocated `.test.tsx` exists with axe assertions across each meaningfully different rendered state (loading, error, disabled, open/closed, populated, empty) — not just default render. Behavior-floor coverage from real-behavior tests, not snapshots.                                                                                                                                                      |
| **Web hook**            | adding a hook that manages state transitions          | Unit tests cover all dispatch actions and edge cases.                                                                                                                                                                                                                                                                                                                                                         |
| **Database table**      | adding/altering a table                               | PK + six audit columns (`CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`, `IsDeleted`, `DeletedAt`) + soft-delete query filter. Idempotent migration (`IF NOT EXISTS`) with a rollback script. Every FK has a non-clustered index.                                                                                                                                                                          |
| **Stored procedure**    | adding/altering a proc                                | tSQLt test class covers happy path, NULL/empty inputs, and error conditions.                                                                                                                                                                                                                                                                                                                                  |

**Out-of-scope reminder.** Tiers for Worker / Service Bus, document _processing_ pipeline, extraction, vector search, conversation history, and citations are intentionally absent (basic file **attachments** are in scope and have their own tier above — see `api-blob-attachments.md`) — those features are out of scope for Tier 1 projects per the "Project Scope" header above. If the application would require any of them, stop and follow the "Project Scope" instruction rather than inventing a checklist tier on the fly.

---

## Capacity and Scalability

**Default peak: 100 concurrent users.** This applies to all scaling decisions — App Service plan size, EF connection-pool sizing, rate-limit thresholds, and SQL DTU/vCore selection. Override in `decisions.md` only if the spec calls for a materially different peak (and if that peak is much higher, consider whether the app should be on the Tier 1+ framework instead).

Do not introduce a distributed cache, Service Bus, or autoscaling tier inside Tier 1. If the spec needs them, the project has outgrown this framework.

---

## Monorepo Structure

| Area        | Location    | Stack                               |
| ----------- | ----------- | ----------------------------------- |
| Frontend    | `web/`      | React 19, TypeScript, Vite, Node 24 |
| Middle Tier | `api/`      | ASP.NET Core 10, EF Core, Azure     |
| Database    | `database/` | Azure SQL, Stored Procedures (rare) |

Each area has its own conventions captured in the layer rule files. Read the relevant `*-essentials` / `*-coding-standards` file when you start working in that area.

---

## Quality Gates

All commits go through `/ship` or `/requirements-ship` — the only authorised paths to a commit. Direct `git commit` is blocked by a PreToolUse hook. No **build work** (plan, scaffold, implementation) reaches `dev` until `/ship` runs at the end of the build. The **requirements brief** is the one input deliverable published earlier — by `/requirements-ship` (invoked automatically at `/plan` Step 0), after a secret/PII scan — so `/plan` can read it from `dev`.

| Command   | Purpose                                                                                                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/requirements-ship` | Scans the finalized requirements brief (secrets/PII) and publishes it to `dev`. Publishes the brief only — never application code. **Invoked automatically by `/plan` Step 0; the Analyst does not run it directly.** An authorised commit path. |
| `/plan`   | Produce 2 artefacts (`plan.md` + `decisions.md`) from a requirements doc. **Step 0 publishes the requirements brief to `dev`** (via `/requirements-ship`) before planning. Hard-gates on external client-matter access (refuses with escalation).                                                                                                                                           |
| `/build`  | Scaffold-on-first-run + single-pass implementation of the entire application end-to-end (DB + API + Web + tests). Pauses only when an architectural decision needs developer input (new dependency, new pattern, new third-party service).                                     |
| `/review` | **Build-completion gate.** Single-pass review-and-remediate covering OWASP Top 10, dependency scan, secret scan, the Pre-Impl Checklist, and the universal guardrails from `CLAUDE.md`. Auto-fixes mechanical findings; surfaces architectural findings in one batched prompt. |
| `/ship`   | **End of work.** Verifies the review cache, commits on the workspace's branch, merges into `dev` (the integration branch — what gets demoed), pushes. The authorised path to commit **application code**. No pull requests.                                                                  |
