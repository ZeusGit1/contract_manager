# Contract Manager — Architectural Decisions Log

This file records every non-obvious architectural decision made on this project. It is the compliance audit trail; reviewers will read it.

Format: one entry per decision, ADR-lite (≈ 5 lines each).

---

## ADR-001 — Coverage gate: behavior-floor, not 80% line/branch

**Date:** 2026-06-10
**Status:** Accepted (framework default)
**Context:** Firm Tier 1+ standard mandates an 80% coverage gate on web (jest-axe per component) and CI-level enforcement.
**Decision:** Tier 1 runs behavior-floor coverage — every behavior listed in `_core-requirements.md` Pre-Impl Checklist and the layer testing rules must be tested; coverage percentage is reported but not gated.
**Consequence:** Speed of iteration vs. compliance defensibility on coverage. If compliance asks, point them at the test list, not the percentage.

## ADR-002 — Frontend stack: Vite + Vitest + CSS Modules

**Date:** 2026-06-10
**Status:** Accepted (framework default)
**Context:** Firm Tier 1+ standard is webpack 5 + Jest + SCSS Modules.
**Decision:** Tier 1 uses Vite + Vitest + CSS Modules.
**Consequence:** Faster dev server, simpler config; documented deviation from firm rule files (`web-testing.md`, `web-styling.md`).

## ADR-003 — Planning artefacts: 2 docs, not 7

**Date:** 2026-06-10
**Status:** Accepted (framework default)
**Context:** Firm Tier 1+ produces 7 architecture docs as the compliance audit trail.
**Decision:** Tier 1 produces 2 docs — `plan.md` and `decisions.md`. The ADR-style `decisions.md` carries the compliance trail.
**Consequence:** Less ceremony; relies on disciplined ADR authorship during /build.

## ADR-004 — Security scanning baseline

**Date:** 2026-06-10
**Status:** Accepted (framework default)
**Context:** Firm Tier 1+ references Gitleaks + Dependabot + SonarQube as expected inputs to /remediation.
**Decision:** Tier 1 ships four scanners in CI by default (see `ci/build.yml`): SonarCloud SAST, Gitleaks secret-scan, `dotnet list package --vulnerable --include-transitive`, and `npm audit --audit-level=high`. Dependabot/Renovate is NOT pre-configured — add it per project if auto-PR triage is desired.
**Consequence:** Baseline catches committed secrets, vulnerable direct/transitive deps, and SAST patterns. No license-compliance, container, or CodeQL scanning by default; add as needed (e.g., privileged-content apps should add CodeQL — see ADR-016 below).

## ADR-005 — Build process: 2 skills, single-pass build

**Date:** 2026-06-10
**Status:** Accepted (framework default)
**Context:** Firm Tier 1+ uses /build-architecture → /build-scaffold → /build-application, with incremental per-capability delivery.
**Decision:** Tier 1 collapses to /plan → /build. Scaffolding happens on first /build invocation; the same invocation implements the entire application end-to-end. The build pauses only when an architectural decision needs developer input (new dependency, new pattern, new third-party service).
**Consequence:** No separate scaffold-gate review and no intermediate reviews — `/review` is the single build-completion gate that catches structural issues. Suits internal apps at Tier 1's bounded scope; not appropriate for projects large enough to need incremental delivery.

---

## App-specific decisions

### ADR-006 — Out-for-signature reminder loop: in-process `IHostedService`, not Service Bus

**Date:** 2026-06-10
**Status:** Accepted
**Context:** The reminder workflow needs to fire periodically (default every 2 weeks per category) for contracts in `OutForSignature` status. Service Bus + Worker is the firm Tier 1+ pattern but is out of scope for Tier 1.
**Decision:** Implement as an `IHostedService` per `api-performance.md` — wakes every 60 minutes, queries due reminders, sends via Microsoft Graph, writes to `NotificationLog` and `ActivityEvent`. Cancellation token propagates per `api-coding-standards.md`.
**Consequence:** Single-replica execution risk (two replicas would double-fire reminders). For Tier 1 single-region App Service this is acceptable; if the app ever scales out, take a lease via SQL row-lock (single row, refreshed each tick) before sending. Recorded here so the future scale-out has the answer ready.

### ADR-007 — POC integrations deferred: iManage and SpendConnect

**Date:** 2026-06-10
**Status:** Accepted
**Context:** Lisa's intake explicitly excluded iManage and SpendConnect from the POC ("For this proof of concept we won't need to connect to iManage or Spend Connect but structure the app to be able to add those integrations later").
**Decision:** Document storage uses Azure Blob (`api-blob-attachments.md`) with an opaque `AttachmentGuid` blob name and SQL-authoritative path mapping. The `Contract.ContractNumber` is a stable, externally-meaningful key suitable for future iManage indexing. Reporting is in-product (S11) plus a CSV/XLSX export endpoint; no SpendConnect connector wired.
**Consequence:** Future iManage integration adds an `ImanageDocId` column to `ContractAttachment` and a sync job — no schema rework. Future SpendConnect can read from `/api/contracts/renewals/export` or a dedicated reporting view.

### ADR-008 — Blob attachment path shape

**Date:** 2026-06-10
**Status:** Accepted
**Context:** `api-blob-attachments.md` requires the framework invariants (flat container, opaque GUID key, SQL-authoritative pointer, access enforced from SQL not path) but leaves the exact path shape to the app.
**Decision:** Container `contract-attachments`; blob name `{AttachmentGuid}/{sanitized-filename}`. The `/{filename}` segment is cosmetic (storage-tooling visibility); it is never used to derive identity or access.
**Consequence:** Per-contract bulk listing happens via SQL (`WHERE ContractId = @id`), not via container enumeration. Future bulk-delete by contract is also SQL-driven.

### ADR-009 — Soft-delete semantics: blob retained on attachment delete

**Date:** 2026-06-10
**Status:** Accepted
**Context:** `api-blob-attachments.md` allows either blob removal on attachment soft-delete or retention per documented policy. The brief requires perpetual retention of contract history.
**Decision:** On `DELETE /api/attachments/{attachmentId}`, soft-delete the SQL row only — leave the blob in place. The blob is reachable only via the soft-deleted SQL row, which is filtered out of every GET. No public surface returns it.
**Consequence:** Storage grows; cost is acceptable at the bounded user count. If retention policy ever shifts (e.g. 7-year archive), update this ADR and add a periodic blob-purge `IHostedService`.

### ADR-010 — Vendor de-duplication: fuzzy match + manual confirmation, no auto-merge

**Date:** 2026-06-10
**Status:** Accepted
**Context:** The brief calls for a master vendor list with autocomplete and duplicate prevention. "Ritz Carlton" and "The Ritz-Carlton" should merge; "Microsoft" and "Microsoft Federal" should not.
**Decision:** On vendor-add (POST `/api/vendors`), normalize the proposed name (lower-case, strip punctuation, strip "Inc"/"LLC"/"Ltd"/"Corp" suffixes) and run a Jaro-Winkler similarity (≥ 0.92) against existing vendor names. On match, return 409 with the candidate; the client surfaces a merge-confirmation modal; manual choice is required.
**Consequence:** No silent merges; Procurement keeps authority. The 0.92 threshold is a tunable starting point — record adjustments here.

### ADR-011 — Bulk-upload preview: stateless server, client holds the resolved rows

**Date:** 2026-06-10
**Status:** Accepted
**Context:** The bulk-upload flow has a preview step where Procurement can fix or skip flagged rows, then commit. The simplest implementation persists the parsed rows server-side keyed by a session-scoped ID.
**Decision:** The preview endpoint does **not** persist anything. The server parses + validates the file and returns the rows (valid + flagged with per-cell errors). The client holds the working state. On commit, the client POSTs the resolved rows back to `/api/bulk-upload/commit`; the server re-validates each before insert.
**Consequence:** No session state, no temp tables, no cleanup. Cost is one extra round-trip of the row payload on commit; acceptable at the expected scale (one-time migration of a few hundred rows). If row counts ever exceed ~5000 in a single batch, revisit and persist preview server-side.

### ADR-012 — Activity feed: single denormalized `ActivityEvent` table

**Date:** 2026-06-10
**Status:** Accepted
**Context:** The Activity tab on the Contract Detail surface aggregates status changes, comment adds, note adds, attachment adds, reassignments, next-due updates, notification sends, and bulk-import marks. A normalized model would have one table per source; a denormalized model has one append-only table.
**Decision:** Use a single `ActivityEvent` table with `Type` + `DescriptionLine` + optional `StructuredJson`. Every event-producing API call also writes one row.
**Consequence:** Activity-tab query is one non-joined select; the Activity feed is the canonical audit trail. Trade-off: cross-event analytics need to parse `StructuredJson` — acceptable since no cross-event analytic surface is in scope.

### ADR-013 — Workflow model: no formal approval gates

**Date:** 2026-06-10
**Status:** Accepted (reconciled at design-code-handoff)
**Context:** The Claude Design prototype introduced a formal per-team Approvals panel that gated the workflow at signature. Lisa's feedback at the reconciliation checkpoint was explicit: Procurement assigns reviewers per the contract type and moves the contract through stages itself; there are no formal team approvals.
**Decision:** Drop the Approvals panel and gating. Attorney Reviewers comment and attach concurrently; Procurement assigns via `POST /api/contracts/{id}/assignments` and advances status via `PATCH /api/contracts/{id}/status`. The workflow stepper visualizes status only — no approval state.
**Consequence:** Simpler data model (no `Approval` entity), simpler API, smaller UI surface. Multi-party coordination relies on Procurement's discretion rather than a formal gate.

### ADR-014 — Outbound email channel: Microsoft Graph mail send via Managed Identity

**Date:** 2026-06-10
**Status:** Proposed (pending confirmation in plan.md open Q1)
**Context:** The reminder loop and notification surface need an outbound email channel. Options: Microsoft Graph (`Mail.Send` app permission, no shared mailbox secret), SMTP via firm relay, or a third-party (SendGrid/etc.). The brief rules out third-party with confidential content unless explicitly approved.
**Decision:** Use Microsoft Graph with the API's Managed Identity holding the `Mail.Send` app permission, sender pinned to a `no-reply@firm.com` shared mailbox. Falls under existing Tier 1 Graph patterns; throttling/retry handled by the official Graph SDK per `api-performance.md`.
**Consequence:** No SMTP creds in Key Vault. If InfoSec rejects the Graph App permission (it requires admin consent), fall back to in-app log only and surface a manual-send hint to Procurement — record the change here and update plan.md §3.10.

### ADR-015 — Audit on read: contract-record access logged with `OperationId` + `UserId`

**Date:** 2026-06-10
**Status:** Accepted
**Context:** Contracts carry Confidential / Privileged content. The brief calls for audit on every read and write. `api-logging.md` requires `UserId` (Entra `oid`) + `OperationId` on every log entry.
**Decision:** On every GET to a contract record (list or detail), emit an Information-level Serilog event with `UserId`, `OperationId`, `ContractId`, `Action` ("ContractRead"). On mutations, the existing `ActivityEvent` row captures the actor + intent. Never log contract content, comment bodies, or note bodies — only IDs and action names.
**Consequence:** Read-access trail lives in App Insights (queryable by `UserId` and `ContractId`). Volume is bounded at the user count; cost is negligible.

### ADR-016 — CodeQL not added to CI for this project

**Date:** 2026-06-10
**Status:** Accepted (defaults from ADR-004 stand)
**Context:** ADR-004 notes that privileged-content apps should consider adding CodeQL. Contract Manager handles Privileged content (Legal/GCO-routed records).
**Decision:** Defer CodeQL for v1. SonarCloud SAST + Gitleaks + dependency scanners cover the most common defect classes for the language mix here (C# + TS), and the privileged content is shielded by hard rules (no logging of content; access enforced server-side; RFC 7807 errors with no detail leakage). Re-evaluate at the first major refactor or when Tier 1+ promotion is considered.
**Consequence:** Marginal coverage gap on deep-dataflow patterns the SAST doesn't catch; mitigated by `/review`'s checklist. Recorded here so audit knows it was a conscious choice, not an omission.

### ADR-017 — Phased `/build` execution: scaffold + database in turn 1, API in turn 2, web in turn 3

**Date:** 2026-06-10
**Status:** Accepted
**Context:** The plan covers 17 screens, 10 entities, ~30 endpoints, MSAL + design system + IHostedService reminder loop. A single Claude turn cannot produce all of that to production quality without truncation or quality loss. The `/build` skill targets "single pass" but the scope exceeds one turn's message budget.
**Decision:** Execute `/build` in three phases across separate turns: (1) scaffold all three layers + database migrations; (2) API tier (Program.cs, EF Core, controllers, services, middleware, IHostedService, integration tests); (3) web tier (MSAL, McDermott tokens, AppShell, 17 screens, hooks, tests). Architectural-decision checkpoints surface inline as they arise.
**Consequence:** Build spans multiple developer turns rather than one; each phase is verified to compile/install before moving on. `/review` runs once at the end of phase 3, not per-phase.

### ADR-018 — System.Memory.Data pinned at 10.0.3, not 8.0.0 as `api-coding-standards.md` recommends

**Date:** 2026-06-10
**Status:** Accepted
**Context:** `api-coding-standards.md` pins `System.Memory.Data` at 8.0.0 to handle the case where older Azure transitive deps pull in 1.x. In the .NET 10 ecosystem `Azure.Identity 1.21.0` now transitively requires `System.Memory.Data ≥ 10.0.3`, and pinning at 8.0.0 produces NU1605 "package downgrade" errors that fail the build.
**Decision:** Reference `System.Memory.Data` explicitly at `10.0.3` in the API csproj. The rule's intent (don't silently fall back to ancient versions) is satisfied; the literal version number was written for an earlier package state.
**Consequence:** Updates needed to `api-coding-standards.md` to reflect the .NET 10 floor; flagged for the next rule refresh. No runtime difference — 10.0.3 is a superset of the 8.0 APIs the rule was protecting.

### ADR-019 — `Microsoft.ApplicationInsights.WorkerService` instead of `Microsoft.ApplicationInsights.AspNetCore`

**Date:** 2026-06-10
**Status:** Accepted
**Context:** The `Serilog.Sinks.ApplicationInsights` package pulls in `Microsoft.ApplicationInsights 2.x` as a peer constraint, but `Microsoft.ApplicationInsights.AspNetCore` resolves at 3.x in the .NET 10 transitive graph (`NU1608` warning). The two are mutually compatible at runtime (the warning is advisory), but the `.AspNetCore` package adds host-specific telemetry initializers that overlap with the Serilog sink.
**Decision:** Drop `Microsoft.ApplicationInsights.AspNetCore` and add `Microsoft.ApplicationInsights.WorkerService` instead. The Serilog sink + `TelemetryConfiguration` from the worker package covers the needed observability surface and avoids overlapping initializers.
**Consequence:** Build emits one NU1608 warning rather than two; runtime behavior unchanged. If we ever need request-tracking middleware from `.AspNetCore` we'll revisit.

### ADR-020 — `eslint-plugin-jsx-a11y` installed with `--legacy-peer-deps`

**Date:** 2026-06-10
**Status:** Accepted
**Context:** `web-linting-formatting.md` requires `plugin:jsx-a11y/recommended` in ESLint config. Vite's scaffold installs ESLint 10, but `eslint-plugin-jsx-a11y@6.10.2` declares a peer dep of `eslint@"^3 || … || ^9"` — it has not yet released ESLint 10 support.
**Decision:** Install `eslint-plugin-jsx-a11y` with `--legacy-peer-deps`. The plugin's runtime usage of ESLint's public API is stable across 9→10; the peer-dep constraint is conservative metadata. Revisit when the plugin publishes an ESLint-10-compatible version.
**Consequence:** A jsx-a11y plugin version bump is on the maintenance list — track in this ADR and flip back to a strict resolution once released.

### ADR-021 — Dashboard column sort runs server-side, not client-side

**Date:** 2026-06-15
**Status:** Accepted
**Context:** The dashboard table grew column-sort support during the dashboard-polish change. The dashboard is paginated (50 rows default), so client-side sort would only reorder the current page — wrong for a user expecting "highest value first" across all active contracts.
**Decision:** Sort runs server-side. Added `sortBy` + `sortDir` query parameters on `GET /api/contracts`, mapped to a fixed allow-list of columns inside `ApplySort`. The client passes `sortBy` only when the user actively sorted a column; cleared sort falls back to the original "next-due first" ordering.
**Consequence:** Adds eight `OrderBy` branches to the service. The allow-list pattern keeps the API surface predictable and prevents arbitrary column expressions from the client. New columns need to be added explicitly to both the client `SortKey` union and the server's `ApplySort` switch.

### ADR-022 — Triage counts shipped as a dedicated endpoint, not embedded in the list response

**Date:** 2026-06-15
**Status:** Accepted
**Context:** Each triage chip on the dashboard now shows a live count. Two options: extend the list response with counts (one fewer round-trip) or split into a dedicated `/triage-counts` endpoint.
**Decision:** Dedicated endpoint at `GET /api/contracts/triage-counts`. Returns a single `TriageCountsDto` with all six counts.
**Consequence:** One extra network call. Trade-off accepted because (a) counts are filter-independent — embedding in the list response would cause confusing payloads when the user filters by triage chip, (b) the counts query can be cached separately by TanStack Query, and (c) the list response stays single-purpose. The counts endpoint is cheap — six EF `CountAsync` calls against the same `IQueryable` source.

### ADR-023 — Row DTO carries reviewer team derived from the latest assignment

**Date:** 2026-06-15
**Status:** Accepted
**Context:** The dashboard row needs to display the reviewer's team (InfoSec, GCO, Privacy, etc.) as a sub-line under their name. The `Contract` entity has `AssignedReviewerUserId` but no team field — team lives on `ContractAssignment.ReviewerTeam`, the history table.
**Decision:** The list projection looks up the most recent `ContractAssignment` for the current `AssignedReviewerUserId` and selects its `ReviewerTeam`. EF Core compiles this into a SQL `OUTER APPLY (SELECT TOP 1 …)`, which is index-friendly when `(ReviewerUserId, AssignedAt)` is indexed.
**Consequence:** If `AssignedReviewerUserId` ever points at a user with no historical assignment row, `AssignedReviewerTeam` is null and the UI shows just the name. That is the right behavior — name without team is more honest than guessing. Performance is fine at Tier 1 scale (≤100 users, ≤50 rows per page).

---

## ADR-024 — Contract detail page composed from four scoped sub-components

**Date:** 2026-06-15
**Status:** Accepted
**Context:** The contract detail screen grew during the contract-detail-polish change to include a status banner / workflow flag, an approvals panel, a right rail, and a forward/backward status changer with Resume/Reopen. A single component file would exceed the 250-line page limit and bury intent.
**Decision:** Extracted four sub-components into `web/src/features/contracts/components/` — `StatusBanner`, `ApprovalsPanel`, `ContractDetailRail`, `StatusChanger`. The page file composes them; each subcomponent owns its own CSS module and a single responsibility.
**Consequence:** The page file stays narrative — it's the orchestration layer — and each piece is independently testable. The detail screen still exceeds 200 lines (currently ~230) because it owns the tab-panel renderers, but that's covered by the documented page-component allowance with a justification comment in the file.

## ADR-025 — Status dropdown allows arbitrary forward + OnHold; Resume/Reopen handled separately

**Date:** 2026-06-15
**Status:** Accepted
**Context:** The prototype's status changer is a dropdown of reachable next states plus Resume/Reopen affordances when the contract is paused or closed. The production app previously offered a single "Advance to next stage" button, which couldn't express jumps (e.g. WithLegal → OutForSignature when an attorney waives a review).
**Decision:** `StatusChanger` renders three shapes based on current status: (a) a `<select>` of forward stages plus `OnHold`, with an Apply button, for in-flow contracts; (b) a "Resume review" button (target `InProcess`) when `OnHold`; (c) a "Reopen contract" button (target `InProcess`) when `Completed`. All three call the existing `useUpdateStatus` mutation — no new endpoint.
**Consequence:** Users can skip ahead or pause from a single control. Closed terminal states (`Canceled`, `Expired`, `Terminated`) don't get a Reopen button because the data model and business rules around those aren't part of this change — surface as a follow-up if needed.

## ADR-026 — Approvals panel derives state from assignments + current contract status

**Date:** 2026-06-15
**Status:** Accepted
**Context:** The prototype shows an "Attorney approvals" panel — Legal, GCO, InfoSec, Privacy — each with an approved / current / pending state and a reviewer name. The production schema has `ContractAssignment` rows (reviewer per team) but no per-stage "approved at" timestamp.
**Decision:** Derive state without schema changes: a review stage is `approved` when its index in `FORWARD_STATUS_ORDER` precedes the contract's current status, `current` when it matches, `pending` otherwise. The reviewer comes from the most recent `ContractAssignment` matching that team (case-insensitive team-name normalisation).
**Consequence:** No migration needed for the polish change. The trade-off: approvals "complete" the moment a contract advances past a stage, even if the reviewer never explicitly approved. If the business needs an explicit approval audit trail in the future, add an `ApprovalStageStatus` table — until then the lifecycle status is the source of truth, which matches how the prototype users were already reading the data.

---

## ADR-027 — Routing preview is derived client-side; thresholds come from a single source

**Date:** 2026-06-15
**Status:** Accepted
**Context:** The prototype shows a "Review routing" panel as the user fills in the intake form, so they understand which teams will look at the contract before submitting. The production API already routes contracts through stages based on the same field values when a contract is created.
**Decision:** The `RoutingPreview` component derives the routing client-side from the form values: Legal always, GCO when `totalCostUsd >= 50_000`, InfoSec when `cloudOrOnPrem` is Cloud/Hybrid or `usesAI` is true, Privacy when `accessesPHI` or `accessesPersonalData` is true. This is presentation-only — the server still owns the authoritative routing call when the contract is created.
**Consequence:** If the server's routing rules change, both the API logic and `RoutingPreview` need updating. We accept this duplication because (a) the preview is a hint, not a decision, (b) the values are simple and stable, and (c) the alternative — a server `/api/contracts/preview-routing` endpoint — is overkill for a UI hint. If the rules grow complex, replace this with a dedicated endpoint.

## ADR-028 — Bulk upload inline-edit is client-only; server re-validates on commit

**Date:** 2026-06-15
**Status:** Accepted
**Context:** The prototype lets the user click any cell in the bulk-upload preview, fix it inline, and commit only the rows that resolve. The production endpoint already accepts a `BulkUploadRowDto[]` on commit and re-validates server-side.
**Decision:** `BulkUploadScreen` keeps the rows in local state and lets the user edit `contractTitle`, `vendorName`, `category`, and `totalCost` per cell. Skip and restore are also client-side. On commit the (possibly-edited) rows are POSTed to `/api/bulk-upload/commit`, which is the existing endpoint — no new server route, no new contract.
**Consequence:** The client's error highlighting reads the original error strings from the preview response and matches them to columns by keyword (title/vendor/category/cost). After an edit, the original error still shows until the next preview — that's a small UX gap accepted in exchange for not re-calling the preview endpoint on every edit. Server-side validation on commit is the authoritative check; a row a user thinks they fixed may still fail there and surface in the commit response.

---

## ADR-029 — v2.0 parallel-lanes data model supersedes the v1.0 linear status

**Date:** 2026-06-22
**Status:** Accepted — supersedes the v1.0 single-status-per-contract model
**Context:** v1.0 used a single 13-value `ContractStatus` enum (`InProcess`, `WithVendor`, `WithLegal`, …, `OutForSignature`, `Completed`, `OnHold`, etc.) on `Contract`. Procurement triage was concurrent in real life (Legal, GCO, InfoSec, Privacy often review the same contract in parallel), but the linear model collapsed that to "with X" — losing visibility into the other lanes. The Analyst's v2.0 rewrite (brief 2026-06-22, change-log entry of the same date) replaces the linear enum with **9 parallel review lanes** per contract (`procurement`, `legal`, `infosec`, `privacy`, `gco`, `vendor`, `requester`, `signature`, `filed`), each with its own **7-value `LaneStatus`** (`not_started`, `in_review`, `waiting`, `approved`, `canceled`, `na`, `complete`) and its own owner / due date / note. A 3-value `OverallStatus` (`active`, `completed`, `canceled`) gates archival.
**Decision:** Drop `Contract.Status` and `ContractStatus` entirely. Introduce `ContractLane` (§2.3 of `plan.md`) with one row per (Contract, LaneId). "Active" is **`status ∈ {in_review, waiting}`** across every counter (dashboard tiles, row pills, Reports KPIs). Procurement lane → `complete` is the **only** path that flips `OverallStatus → completed`; cancellation is an explicit overall-contract action via `PATCH /api/contracts/{id}/overall`.
**Consequence:** Supersedes the v1.0 status-changer (ADR-024, ADR-025) and the v1.0 approvals panel (ADR-026) on the contract detail surface. Web layer migrated in commit `efd2d8b`; API + DB layers follow in the next `/build`. Reports KPIs match the new active definition. Risk-review banner is now mandatory on contract detail (brief §10.13). Send-reminder restricted to external lanes (vendor/requester/signature) only.

## ADR-030 — `ContractLane` is not soft-deleted; the 9-row invariant is enforced at insert + tSQLt

**Date:** 2026-06-22
**Status:** Accepted
**Context:** Every contract carries exactly nine lanes. The natural way to mark a lane "not happening" is via `LaneStatus = na` (or `canceled` for an in-flight lane the user explicitly stops). If `ContractLane` were soft-deleted, the EF Core query filter (`IsDeleted = 0`) would hide lanes from queries and break the "all 9 lanes always render" invariant; reading the panel would require a `IgnoreQueryFilters()` override that defeats the purpose.
**Decision:** `ContractLane` carries audit columns for traceability but `DeletedAt` is unused; there is **no soft-delete path** on lanes. Cancellation/N-A is absorbed by the `Status` enum (`canceled` / `na`). The 9-row invariant is enforced at two levels: (1) the `POST /api/contracts` controller creates the nine rows in a single transaction; (2) a tSQLt test asserts that any `Contract` row has `(SELECT COUNT(*) FROM ContractLane WHERE ContractId = c.ContractId) = 9`.
**Consequence:** Any path that creates a `Contract` (intake API + bulk-upload commit) must create the lanes in the same transaction; bulk-upload commit failures roll back both. The unique constraint on `(ContractId, LaneId)` prevents duplicates.

## ADR-031 — Hybrid Category storage: typed columns for known fields + `CategoryField` for metadata; admin add-new deferred

**Date:** 2026-06-22
**Status:** Accepted (Phase 1) — add-new path deferred to a follow-up
**Context:** The brief requires the Categories & Fields admin to be data-driven ("adding a category does not require a code change", §10.10, testable in §5). At the same time, the brief enumerates the Phase 1 fields concretely — Event needs `EventDate` / `VenueLocation` / `ParentEventName`; Facilities needs `Building` / `ServiceDescription`; IT needs `ITType` / `ApplicationName` / `ApplicationVersion` / `LicensingType` / `NumberOfUsers` / `CloudOrOnPrem` / `SystemAccess` / `Permissions` / `Integrations` / `AccessesPersonalData` / `AccessesPHI` / `UsesAI`. Every QA acceptance criterion refers to these named fields. A fully EAV `ContractFieldValue` table would lose type safety, indexability, and query simplicity.
**Decision:** **Hybrid storage.**
- Keep the **known** Phase 1 fields as typed nullable columns on `Contract` (§2.2 of `plan.md`).
- Add `Category` + `CategoryField` tables (§2.4) that drive the intake form's field rendering. The admin can re-label, re-order, toggle `IsActive`, and edit helper text for existing fields without code changes.
- The "add a brand-new category" and "add a new field of any type to an existing category" paths are **out of Phase 1 scope.** The endpoints exist (`POST /api/categories`, `POST /api/categories/{id}/fields`) but are gated by a `categoriesAdminAddEnabled` feature flag (off by default) and return 501 when disabled.

**Consequence:** The brief's "categories are data-driven" acceptance criterion is partially satisfied (edit-existing-only). Going fully data-driven requires deciding the storage shape for admin-added category-specific values: (a) `ContractFieldValue` EAV (recommended), (b) JSON column on `Contract`, or (c) shadow-typed columns added per category via migration. Open question §8.2 in `plan.md`; revisit before flipping the flag.

## ADR-032 — `ProcurementAdmin` as a separate app role layered on `Procurement`

**Date:** 2026-06-22
**Status:** Accepted
**Context:** The brief references "Procurement admin" as the role that manages categories (§5 user stories, §10.10). Two options: (a) add a boolean `IsProcurementAdmin` on the user, gated server-side; (b) introduce a separate Entra app role `ProcurementAdmin` and check it via `[Authorize(Roles="ProcurementAdmin")]`. Tier 1 frameworks the firm uses always model authorization via app roles per `api-record-access.md` — boolean attributes on the user table are not a sanctioned access source.
**Decision:** Add `ProcurementAdmin` as a fourth Entra app role. A user assigned `ProcurementAdmin` is **also** expected to be assigned `Procurement` (an admin is a Procurement member with extra capability). Endpoints that mutate `Category` / `CategoryField` require `[Authorize(Roles="ProcurementAdmin")]`. All other Procurement endpoints accept either role.
**Consequence:** Entra app-roles list grows from three to four (`Procurement`, `ProcurementAdmin`, `Requester`, `AttorneyReviewer`). `/api/me` returns `roles[]` so the SPA can show the Categories admin nav item conditionally. The role separation also gives Procurement leadership a clean way to revoke admin access without removing the user from Procurement altogether.

## ADR-033 — Stale v1.0 design bundle preserved as historical context; v2.0 visual decisions come from live web/src + brief

**Date:** 2026-06-22
**Status:** Accepted
**Context:** The v2.0 brief rewrite (`efd2d8b`) updated the demo HTML (`artifacts/demo/Contract-Manager-Demo.html`) and the live React implementation (`web/src/*`) but did **not** rewrite `artifacts/docs/design/project/` (the Claude Design HTML/JSX bundle) or `artifacts/docs/design/full-design-blueprint.md`. Both still describe the v1.0 linear 13-status workflow. The repo design system (`.claude/rules/design/`) is unchanged. The `detect-design-handoff.sh` hook flags the bundle as `PRESENT` and forbids `plan.md` from recording "no handoff" — so the plan cannot ignore the bundle's existence.
**Decision:** Treat the stale bundle and blueprint as **historical context only**. Authoritative sources for v2.0 visual + structural decisions are, in order: (1) `solution-requirements.md` v2.0, (2) `complete-functional-requirements.md`, (3) the live React implementation under `web/src/` (the de-facto approved prototype), (4) `Contract-Manager-Demo.html`. Tokens + components always come from the repo design system. `/build` does NOT generate code against the stale bundle. The `plan.md` UI sketch and §4 are written explicitly against the v2.0 sources.
**Consequence:** The design-handoff detector still prints `PRESENT` (correct — there IS a bundle, even if stale) and `plan.md` acknowledges it. Future updates: if the team ever re-prototypes in Claude Design, the bundle gets refreshed and this ADR can be revisited. If the team retires the bundle, delete it and the detector flips to `ABSENT` — at which point the plan can simplify §4's preamble.

## ADR-034 — Phase 1 reminders are log-only; supersedes ADR-006 in-process loop; ADR-014 channel deferred

**Date:** 2026-06-22
**Status:** Accepted — supersedes ADR-006 and recasts ADR-014
**Context:** ADR-006 (in-process `IHostedService` reminder loop) and ADR-014 (Microsoft Graph mail send via Managed Identity) were drafted for v1.0 against a `Status = OutForSignature` background sweep. The v2.0 brief reframes reminders: §6 says outbound email "is a build-time decision per `api-performance.md`"; UC4 and §10.12 say Phase 1 *logs* the reminder intent and recipient. The Send-reminder modal lives at the top of the contract detail as an explicit Procurement action — there is no longer a background loop to drive periodic mail.
**Decision:** Phase 1 ships **`NotificationChannel = InAppLogOnly` only**. The `POST /api/contracts/{id}/reminders` endpoint writes a `NotificationLog` row + paired `ActivityEvent: ReminderLogged` on every Procurement-initiated reminder click. No `IHostedService` background sweep is registered for Phase 1. The `NotificationLog` schema accepts the `Email` channel additively (no migration) when/if InfoSec confirms the channel (open Q §8.1) and a follow-up build wires the sender.
**Consequence:** Supersedes ADR-006 — no in-process reminder loop in Phase 1. ADR-014 is recast as "proposed channel for a future build" — its content stands as the recommended approach **if/when** the channel is approved, but does not apply in Phase 1. Procurement chases external lanes (vendor / requester / signature) via the manual "Send reminder" button; the in-app log is the audit trail. ADR-006's single-replica execution risk no longer applies; if the loop is ever reintroduced, take a lease via a SQL row-lock first.

## ADR-035 — Bulk-upload legacy-status mapping at import (`LegacyStatus` → lane state)

**Date:** 2026-06-22
**Status:** Accepted
**Context:** The legacy SpendConnect spreadsheet (`contracts-seed-data.xlsx`) carries a single `LegacyStatus` column with one of the v1.0 13 values (`InProcess` / `WithVendor` / `WithLegal` / etc.). The v2.0 schema expects per-lane state. Without a mapping, bulk-imported contracts would default all lanes to the same initial state — losing the legacy review-stage signal Procurement needs to triage migrated work.
**Decision:** Implement a deterministic, documented mapping at the server's bulk-upload commit step. Examples (full table to be confirmed with Lisa during build):
- `InProcess` → Procurement `in_review`, others `not_started`.
- `WithVendor` → Procurement `in_review`, Vendor `waiting`, others `not_started`.
- `WithLegal` / `WithGCO` / `WithInfoSec` / `WithPrivacy` → Procurement `in_review`, the named lane `in_review`, others `not_started`.
- `WithRequester` → Procurement `in_review`, Requester `waiting`, others `not_started`.
- `OutForSignature` → Procurement `in_review`, Signature `waiting`, others `not_started`.
- `Completed` → all lanes set to `complete` (or `na` where the lane was never activated); `OverallStatus = completed`.
- `OnHold` → Procurement `waiting` (with note carrying the hold reason), others retain prior state inferred from legacy data; `OverallStatus = active`.
- `Canceled` / `Expired` / `Terminated` → `OverallStatus = canceled` (Expired and Terminated collapse to Canceled in the v2.0 model — there is no Expired/Terminated overall status); lane states set to `canceled`.

The mapping table is implemented as a static dictionary in the import service, covered by unit tests for every legacy value.
**Consequence:** Bulk-imported contracts land on the dashboard with a reasonable starting state. Anything `OverallStatus = canceled` ends up in the Archive immediately. Where the mapping has multiple plausible interpretations (e.g. `OnHold`), Procurement can adjust lane state post-import via the standard PATCH endpoint. If the mapping needs to change post-launch, update the dictionary + tests + this ADR.

---

## ADR-036 — Reviewer team is a fixed enum (with `Other` escape hatch)

**Date:** 2026-06-22
**Status:** Accepted (closes the open question recorded in the original `plan.md` §8)
**Context:** `ContractAssignment.ReviewerTeam` was originally NVARCHAR(64) free text (Privacy / InfoSec / GCO / Legal / Litigation / Corporate). Free text invites typo drift across rows ("Info Sec" vs "InfoSec" vs "infosec"), which breaks the dashboard's per-team "review stage" derivation (ADR-026) and any future per-team reporting. The MVP needs deterministic team values.
**Decision:** Define `ReviewerTeam` as a closed enum — `Privacy`, `InfoSec`, `GCO`, `Legal`, `Litigation`, `Corporate`, `Other`. Stored as a string (per the JSON-string-enum convention from `api-coding-standards.md`) and gated by `CK_ContractAssignment_ReviewerTeam`. `Other` is the explicit escape hatch — when used, the UI may prompt for a short clarifying note on the assignment (out of MVP scope to model as a separate column; can be added additively if pattern emerges).
**Consequence:** The dashboard's reviewer-team derivation (ADR-023, ADR-026) becomes case-stable. Adding a new team is a code change — small, single-point, deliberate. Migration on first deploy seeds existing assignments (none in production yet) against the enum.

## ADR-037 — Database-backed categories admin: system vs admin-defined; feature flag gates the management surface

**Date:** 2026-06-22
**Status:** Accepted — supersedes the earlier ADR-031 framing (which restricted admin add-new to a future build)
**Context:** The brief calls for data-driven categories ("adding a category does not require a code change", §10.10 / §5 acceptance). The Analyst clarified the intent on 2026-06-22:
1. Use **database-backed configuration** for admin-added categories and fields **now** — do not defer the data model.
2. Keep **system-defined** categories (Event / Facilities / IT, which are the seeded set tied to the brief's Phase 1 acceptance criteria) **separate** from **admin-defined** categories so QA can validate the system set without admin churn affecting it.
3. The **feature flag controls only whether admins can manage** categories/fields — not whether the data model functions.

**Decision:**
- Add `Category.IsSystemDefined` and `CategoryField.IsSystemDefined` BIT columns (true for seeded Event/Facilities/IT and their named fields; false for anything an admin creates).
- Add `ContractFieldValue (ContractId, CategoryFieldId, FieldKey, ValueText)` so admin-added field values have a home **at all times**. System-defined fields keep using their typed columns on `Contract`.
- The existing `Contract` typed columns for Event/Facilities/IT remain authoritative for system fields — no migration to push them into `ContractFieldValue`.
- The configuration flag `categoriesAdminEnabled` (in app config, default `false`) gates the **write endpoints + admin UI controls**. Reads (`GET /api/categories*`) are always available. When the flag is off, write endpoints return `503 Service Unavailable` and the admin screen renders read-only.
- System protections are enforced server-side regardless of the flag: `Code` and `IsSystemDefined` are immutable on system rows; system categories and system fields cannot be soft-deleted; categories with active contracts cannot be soft-deleted (409).

**Consequence:** Flipping `categoriesAdminEnabled` to `true` later requires no schema change and no data migration. The two storage paths (typed columns for system fields, `ContractFieldValue` for admin fields) are stable boundaries — a system field is never demoted, an admin field is never promoted, no row ever moves between them. QA's acceptance criteria for the system set are insulated from admin churn. **The earlier ADR-031 stance ("admin add-new is out of Phase 1 scope") is replaced — the data model ships fully in Phase 1; only the management surface is feature-flagged.**

## ADR-038 — Renewals screen ships as a routed "Coming Soon" stub

**Date:** 2026-06-22
**Status:** Accepted (closes the renewals open question)
**Context:** A `RenewalsScreen.tsx` exists in `web/src/features/contracts/` but is not routed in `App.tsx`. The Analyst confirmed renewals reporting is dormant for Phase 1 but the route should be reserved and visible so users discover the future destination.
**Decision:** Register the `/renewals` route in `App.tsx`. The route renders a minimal stub: AppShell + page head ("Renewals") + a single centered card with the **"Coming Soon"** badge (pale-gold badge with navy text per the McDermott badge pattern) and one-sentence subtitle ("Renewal reporting will be available in a later phase. Until then, the Reports KPIs and Archive search cover near-term needs."). The sidebar nav item "Renewals" carries a small "Coming Soon" pill so users see the future capability before clicking. **No API call, no query, no data-fetching hook** — the stub is intentionally static.
**Consequence:** When the renewal report is wired later, the route is in place and the sidebar entry just changes its pill; no nav restructure needed. The `GET /api/contracts/renewals` endpoint is **not** included in §3.3 (only the existing archive query is) — adding it is additive.

## ADR-039 — Microsoft 365 / Graph Mail send: designed for, not implemented in Phase 1

**Date:** 2026-06-22
**Status:** Accepted — pairs with ADR-034 (Phase 1 reminders are log-only) and recasts the proposed ADR-014
**Context:** The Analyst confirmed Microsoft 365 / Graph Mail as the future outbound channel for reminders, but does not want it implemented in Phase 1. The plan must still be **shaped** so adding Graph send later is a small additive change.
**Decision:** Phase 1 ships reminder writes only — `Channel = InAppLogOnly`, no SDK, no Key Vault entries, no `Mail.Send` app permission on the API's MI. The architecture preserves the path forward:
- **`NotificationLog.Channel`** enum already includes `Email`; `Status` already includes `Sent` / `Failed`.
- **Service abstraction** — the reminder controller calls into an `IMailSender` interface in the API project. Phase 1's only implementation is `InAppLogOnlyMailSender` which writes the log row and returns success without attempting any outbound call. Adding a `GraphMailSender` later is a new DI registration + a per-environment flag (`Mail:Provider = "InAppLogOnly" | "GraphMail"`) — no controller or DTO change.
- **No background mail loop** in Phase 1 (consistent with ADR-034). If Graph Mail is enabled later, the firm can choose between (a) keeping reminders Procurement-initiated only (the simpler path), or (b) reintroducing an `IHostedService` periodic sweep (would also require ADR-006's single-replica lease consideration if the API ever scales out).
- **MI permissions** — when Graph Mail is wired, the API's MI takes the `Mail.Send` Graph **app permission** scoped to a no-reply mailbox via Exchange RBAC (per `api-client-auth.md` "MI Graph permission" pattern); admin consent required. **Not granted in Phase 1.**
- **Throttling/retry** — handled by the official `Microsoft.Graph` SDK's built-in retry middleware (per `api-performance.md`). No hand-rolled Polly policy needed.

**Consequence:** Phase 1 emits no outbound mail; Procurement sees reminders only in the in-app activity log. Adding Graph Mail later is a self-contained slice: bind `Mail:Provider = GraphMail`, register `GraphMailSender`, grant the MI permission, redeploy. No schema migration, no controller change, no API contract change.

---

## ADR-040 — Database migration authoring: EF Core code-first, scripted into `database/migrations/`

**Date:** 2026-06-22
**Status:** Accepted (build-time decision, Analyst-confirmed)
**Context:** `database-migrations.md` describes SQL-file migrations applied manually dev→staging→prod, named `YYYYMMDD_NNN_Description.sql` with paired `_Rollback.sql`. The existing scaffold uses EF Core code-first migrations under `api/src/ContractManager.Api/Migrations/`. The `database/migrations/` folder shipped empty.
**Decision:** **EF Core code-first remains the authoring tool.** Every schema change is authored as an EF Core migration (`dotnet ef migrations add …`). The build then runs `dotnet ef migrations script <from> <to> --idempotent -o database/migrations/<stamp>_<name>.sql` to emit an idempotent SQL file into `database/migrations/`. A matching `_Rollback.sql` (also EF-Core-scripted, target=from migration) is committed alongside. **Both files are checked in.** The SQL file is the artifact the DBA workflow applies; the C# migration is the developer-friendly source.
**Consequence:** Devs get EF Core's snapshot-diffing ergonomics; DBAs get the SQL files the rule file requires. One extra scripting step per migration — automate it in a `db:script` npm script in `package.json` or a shell helper. Future schema-only changes (rename a column, add an index) don't need hand-written SQL.

## ADR-041 — Full v1.0→v2.0 rewrite, not incremental

**Date:** 2026-06-22
**Status:** Accepted (build-time decision, Analyst-confirmed)
**Context:** The v1.0 API scaffold (~55 `.cs` files: 10 controllers, 11 services, 11 entities) was end-to-end for the linear `Contract.Status` model. The v2.0 model (ADR-029) drops `Status` and introduces `ContractLane` + lane-aware everything. Two paths existed: incremental (keep v1.0, add v2.0 alongside) or full rewrite.
**Decision:** **Full rewrite.** v1.0 controllers and services that reference `Contract.Status`, `ContractStatus`, `AssignedReviewerUserId`, `NextActionDueAt`, `LastReminderSentAt`, or the `ReminderHostedService` are deleted. The v2.0 build re-uses the scaffolding patterns already in place (`AuditingSaveChangesInterceptor`, `EnsureUserMiddleware`, `OperationIdMiddleware`, `SecurityHeadersMiddleware`, `IClock`, `ContractManagerApiFactory` test harness, `IUserContext`, `IContractAccess`, `IActivityRecorder`) and rewrites the domain content (entities, services, controllers, DTOs) against `plan.md` v2.0.
**Consequence:** The build is large but linear — no dual-API surface, no v1.0 backward-compat shims to maintain. The v1.0 EF Core migration (`20260611002508_InitialSchema.cs`) is also removed; a new v2.0-from-scratch migration takes its place. The web layer already calls no v1.0 endpoint (it reads `phase1Data.ts`), so there's no cross-layer breakage during the rewrite.

## ADR-042 — Web wiring is a follow-up build, not in this `/build`

**Date:** 2026-06-22
**Status:** Accepted (build-time decision, Analyst-confirmed)
**Context:** The web is already at v2.0 visually but reads from `web/src/lib/phase1Data.ts` (local seed) — no API calls. Wiring the SPA to the new API requires ~15 TanStack Query hooks plus a refactor of every feature screen's data source — roughly the same scope as the API itself.
**Decision:** **This build covers DB + API + tests + only the small SPA additions** (the `/renewals` Coming Soon stub per ADR-038, the sidebar "Coming Soon" pill, and `ProcurementAdmin`-role gating for the Categories admin nav item). The wholesale `phase1Data.ts → TanStack Query` replacement is scheduled as its own follow-up `/build` invocation after this one ships.
**Consequence:** Stakeholders can demo the SPA exactly as it is today (seeded), and the API + DB are production-shaped and tested underneath. The follow-up build is bounded and focused; its `/review` covers the data-fetching layer specifically. No mixed half-wired state in `dev` between this build and the next.

---

## ADR-043 — `Category` entity renamed to `CategoryDefinition` to resolve enum collision

**Date:** 2026-06-22
**Status:** Accepted (Phase B build-time fix)
**Context:** Phase A introduced a `Category` entity (the data-driven categories table) alongside the existing `Category` enum (Event / Facilities / IT). Both live in `ContractManager.Api.Domain`. C# rejects duplicate types in the same namespace — build error `CS0101: The namespace … already contains a definition for 'Category'`. The enum is referenced from ~20 places (DTOs, controllers, services, web/src wire format); the entity is referenced from ~5 (Service impl + DbContext).
**Decision:** Rename the **entity** to `CategoryDefinition`. The enum keeps the name `Category` — the wire format and the web layer's `type Category = 'Event' | 'Facilities' | 'IT'` are stable. The table name stays `Categories` (declared via `ToTable("Categories")`), so the SQL surface is unchanged. CategoryField's navigation property stays `Category` (its declared type is now `CategoryDefinition?`).
**Consequence:** Smaller diff than renaming the enum. The entity-vs-enum naming is a common .NET pattern — the entity is the schema config, the enum is the closed value set. Future readers see the distinction immediately.

## ADR-044 — Database-level domain CHECK constraints deferred; EF Core migration is canonical

**Date:** 2026-06-22
**Status:** Accepted (Phase B build-time decision)
**Context:** Phase A drafted hand-authored SQL with ~17 CHECK constraints (e.g., `CK_Contracts_CategoryShape` for conditional category-field shape, `CK_ContractLanes_OwnerShape` for internal-vs-external owner shape). Per ADR-040 the EF Core code-first migration is the authoring tool; `dotnet ef migrations script` is what populates `database/migrations/`. EF Core's `dotnet ef migrations script` output **does not include** these constraints because they were never declared in the DbContext via `ToTable(t => t.HasCheckConstraint(...))`.
**Decision:** The EF-scripted SQL (`20260622_001_InitialV2Schema.sql`) is the **canonical** schema. The hand-authored `20260622_001_RebuildForParallelLanes.sql` is **deleted**. The check constraints are deferred — application-level validation (C# enum constraints via `HasConversion<int>` + JsonStringEnumConverter + service-layer enum range checks) already prevents invalid values from reaching the database under normal flow; the DB constraints would be defense-in-depth against direct SQL writes. Adding them is a single follow-up migration: declare them in the DbContext via `HasCheckConstraint` and `dotnet ef migrations add AddDomainCheckConstraints`.
**Consequence:** Strict defense-in-depth at the DB level is not in Phase 1. The application is the only writer (no scripts or DBA tools mutate rows directly), so the practical risk is small. Recorded so audit knows it's a conscious deferral, not an omission. Tracked as a follow-up in the `/review` cycle.

## ADR-045 — Phase B build complete: 12 new files in services + controllers, 6 new DTOs, Program.cs DI wired

**Date:** 2026-06-22
**Status:** Accepted (Phase B completion record)
**Context:** Phase B implemented services, controllers, and DTOs for the v2.0 parallel-lanes model per `plan.md` §2–§5. The project builds clean (only pre-existing NU1608 warnings from ADR-019).
**Decision:** Phase B deliverables:
- **DTOs:** `ContractDtos.cs` (rewritten — row + detail + create + update + comments + notes + activity + assignments DTOs), `LaneDtos.cs`, `ReminderDtos.cs`, `ReportsDtos.cs`, `CategoryDtos.cs`, `BulkUploadDtos.cs`, `AttachmentDtos.cs` (surviving compatibility records).
- **Options:** `CategoriesAdminOptions.cs`, `MailOptions.cs`.
- **Services:** `IMailSender` + `InAppLogOnlyMailSender` (Phase 1 implementation per ADR-039), `IContractService`, `ILaneService`, `IReminderService`, `IReportsService`, `ICategoryService` + `CategoryManagementDisabledException`, `IBulkUploadService` (rewrite with legacy-status mapping per ADR-035).
- **Controllers:** `ContractsController` (rewrite), `LanesController`, `RemindersController`, `ReportsController`, `CategoriesController`, `BulkUploadController` (rewrite); `MeController` extended to include `ProcurementAdmin` in returned `roles[]`.
- **Surviving services patched:** `IVendorService.GetAsync` projects to the v2.0 `VendorContractRefDto`; `IContractSubResourceService` uses `request.NoteDate`, `request.ReviewerTeam`, `ActivityType.AssignmentAdded / AssignmentRemoved`.
- **EF Core migration:** `20260622211128_InitialV2Schema.cs` generated + idempotent SQL scripted into `database/migrations/20260622_001_InitialV2Schema.sql` and `_Rollback.sql`.
**Consequence:** API is structurally complete for v2.0. Phase C (tests) and Phase D (web wiring) follow. `/review` will run the test suite + checklists at build-completion.

---

## ADR-046 — Phase D web scope: Renewals Coming Soon stub + sidebar pill + role gating only

**Date:** 2026-06-22
**Status:** Accepted (Phase D completion record — within the ADR-042 envelope)
**Context:** Per ADR-042 this `/build` does not flip the SPA from local `phase1Data.ts` seed reads to TanStack Query API calls; that's a focused follow-up build. Phase D is therefore minimal: the Renewals route stub (ADR-038), the sidebar entry with a "Coming soon" pill, and the role gating that surfaces on the nav (ProcurementAdmin restriction for Categories admin per ADR-032 / ADR-037).
**Decision:** Phase D deliverables:
- **`AppRole` widened to include `ProcurementAdmin`** in `web/src/types/contract.ts` so the existing `NavItem.roles[]` predicate handles the new role naturally. Six of the existing nav items (`/`, `/master`, `/my-submissions`, `/reports`, `/vendors`, `/new-contract/category`, `/bulk-upload`, `/archive`) include `ProcurementAdmin` alongside `Procurement` so an admin sees the full Procurement surface. `/settings/categories` is gated to `ProcurementAdmin` only.
- **`RenewalsScreen.tsx` rewritten** as a static stub: McDermott-style card on `--bg-surface`, "Coming soon" `Badge status="pending"` (pale-gold), one explanatory sentence. No API call, no data hook. Paired `RenewalsScreen.module.css`. Old data-driven `RenewalsScreen` (v1 — queried `/api/contracts/renewals`) is replaced; its consumers were never wired since the route wasn't registered.
- **`/renewals` route registered** in `App.tsx` between `/archive` and `/reports`.
- **Sidebar `NavItem` gained a `comingSoon?: boolean`** flag — when true, the `NavItemLink` renders a small `Soon` pill (pale-gold/navy per theme-stable rule) at the right end of the nav row. CSS extension `.comingSoon` in `AppShell.module.css`.
- **`RenewalsScreen.test.tsx`** — covers the static render + axe assertion per `web-testing.md`.
**Consequence:** Stakeholders demoing the SPA see the future Renewals destination in the sidebar with a clear "not yet" signal. ProcurementAdmin role lights up the Categories admin nav item that ordinary Procurement no longer sees. The seed data (`phase1Data.ts`) flow is unchanged — the SPA still demos as it does today. The next `/build` invocation focuses solely on wiring the live API.

## ADR-047 — /build complete — clean compile / typecheck / lint; tests run via /review

**Date:** 2026-06-22
**Status:** Accepted (build-completion record)
**Context:** Per `_core-requirements.md`, `/build` runs `dotnet build`, `npx tsc -b --noEmit`, and `npm run lint` mid-build; `dotnet test`, `npm test`, and `tSQLt` are deferred to `/review` at build completion (or auto-invoked by `/ship` on cache miss). The four phases of this build (Domain + DB / Services + Controllers / Tests / Web wiring) are written and each surface compiles clean.
**Decision:** Declare `/build` complete. Build artefacts in place:
- API: 13 controllers, 13 service interface+impl files, 8 DTO files, 2 new option classes, all wired in `Program.cs`. `dotnet build` returns 0 errors (only the pre-existing `NU1608` warning from ADR-019).
- Database: EF Core-scripted `20260622_001_InitialV2Schema.sql` + rollback + `20260622_002_SeedSystemCategories.sql` + rollback in `database/migrations/`. `usp_AppendContractLanes.sql` in `database/procedures/`. `test_ContractLane.sql` + `test_Category.sql` in `database/tests/`.
- API tests: `LaneTests`, `ReportsTests`, `CategoriesAdminTests`, `RemindersTests`, plus the existing `AuthorizationTests`, `HealthControllerTests`, `VendorServiceTests`. `TestSeed` helper for prerequisite rows. All compile clean.
- Web: `/renewals` route + sidebar entry with "Soon" pill + `RenewalsScreen` stub + colocated test. `AppRole` widened for `ProcurementAdmin`. Categories nav gated. `npx tsc -b --noEmit` and `npm run lint` clean.
**Consequence:** Ready for `/review` (or `/ship` which auto-invokes `/review` on cache miss). The follow-up build that wires the SPA to the live v2.0 API is scheduled per ADR-042.

---

*Append new ADRs to this file as `/build` (and later `/review`) make non-obvious decisions. Use ADR-NNN starting from 048.*
