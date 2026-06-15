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

*Append new ADRs to this file as `/build` (and later `/review`) make non-obvious decisions. Use ADR-NNN starting from 027.*
