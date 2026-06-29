# Contract Manager — Baseline Requirements

**Version:** 1.0 (baseline)
**Date created:** 2026-06-29
**Owner:** Laura Ros (AI Solutions Analyst)
**Source documents merged into this baseline:**

- `artifacts/docs/product/solution-requirements.md` v2.0 — canonical narrative source.
- `artifacts/docs/product/complete-functional-requirements.md` — paste-ready summary derived from the canonical doc.

Merged on 2026-06-29 to seed the `requirements-finalizer` change-log workflow. Where the two source documents disagree, `solution-requirements.md` v2.0 is authoritative. From this point forward, every change to a requirement is recorded in `requirements/change-log.md` via LOG mode; the final reconciled requirements doc is produced at the end via COMPILE mode.

---

## 1. Purpose & scope

Phase 1 of Contract Manager is a Tier 2 web platform for tracking procurement contract review at McDermott, structured around **parallel review lanes**. It covers intake, triage, parallel-lane status tracking, basic file attachments, bulk legacy migration, vendor master, archive, reports, and a data-driven categories admin. Renewals, document processing, full reviewer collaboration, iManage / SpendConnect integration, and outbound email production are explicitly deferred.

The product serves the Procurement team (4 named owners), firm staff and attorneys as Requesters, and internal firm attorneys (Legal / GCO / InfoSec / Privacy) as Attorney Reviewers. External vendors and DocuSign envelopes are tracked as lanes, not authenticated users.

---

## 2. Functional Requirements (FR)

### Intake & routing

- **FR-1 — Category-driven intake.** Requesters select a category (Event / Facilities / IT); the intake form rendered is specific to the selected category.
- **FR-2 — Per-category required-field validation.** The intake form blocks submission if any required field for the selected category is empty.
- **FR-3 — Review-routing preview.** Each intake form displays a "Review routing" panel showing Procurement with `In review` and each applicable downstream lane (Legal, GCO, plus InfoSec / Privacy when triggered by IT flags) with `Not started`.
- **FR-4 — Initial lane state.** On submission, the Procurement lane is set to `In review` and all other applicable lanes are set to `Not started`.

### Parallel-lane data model

- **FR-5 — Nine lanes per contract.** Each contract supports up to 9 lanes: Procurement, Legal, InfoSec, Privacy, GCO, Vendor, Requester, Signature, Filed.
- **FR-6 — Lane fields.** Each lane carries: status, owner (nullable), due date (nullable), last-updated timestamp, and a free-text note (nullable).
- **FR-7 — Lane status enum.** Lane status is one of: `not_started`, `in_review`, `waiting`, `approved`, `canceled`, `na`, `complete`.
- **FR-8 — Active-lane definition.** A lane counts as "active" only when its status is `in_review` or `waiting`. All counters across dashboards, contract rows, and reports honor this definition.
- **FR-9 — Procurement-complete closes contract.** Setting the Procurement lane to `complete` transitions the contract's overall status to `completed`, removes it from active dashboards, and places it in Archive.
- **FR-10 — Overall contract status enum.** Overall status is one of: `active`, `completed`, `canceled`.
- **FR-11 — Priority enum.** Priority is one of: `low`, `medium`, `high`, `critical`. Default `medium`. Set on intake by the Requester; editable by the Procurement owner.

### Screens

- **FR-12 — My dashboard.** Per-procurement-owner landing page filtered to contracts where the signed-in user has at least one active lane.
- **FR-13 — Master view.** A view of every active contract across all owners, with the same row shape as My dashboard plus a visible owner column.
- **FR-14 — Contract detail.** A per-contract detail screen serving as the central object view, with a right-rail of key facts (requester, value, vendor, parent event for Event contracts).
- **FR-15 — My submissions.** A Requester-mode view of contracts the signed-in user submitted, with status visibility and a comments affordance.
- **FR-16 — Vendors master.** A searchable, sortable list of vendors. Clicking a vendor opens a summary modal — never a separate vendor detail page.
- **FR-17 — Archive.** Lists contracts with overall status in {`completed`, `canceled`}, searchable; soft-deleted records are excluded.
- **FR-18 — Reports.** Six KPI tiles (Contracts reviewed YTD, My reviewed YTD, Active right now, My active, Completed YTD, Canceled YTD) plus active-by-category and active-by-procurement-owner horizontal bar series.
- **FR-19 — Categories & Fields admin.** A data-driven schema editor for categories and their field sets; adding a category does not require a code change.

### Actions & flows

- **FR-20 — Send-reminder location.** The "Send reminder" action lives at the top of the contract detail screen. Lane rows do not show bell icons or per-lane reminder controls.
- **FR-21 — Reminder modal targets.** The Send-reminder modal lists only currently-open external lanes (`vendor`, `requester`, `signature`). When the Requester lane is selected, the modal shows the requester's email address.
- **FR-22 — Bulk upload — four flows.** The bulk-upload surface offers four mutually-exclusive flows: file drop (`.xlsx`), paste (TSV / CSV), type (inline editor), and manual entry (single row at a time).
- **FR-23 — Bulk upload preview & validation.** Each flow produces an editable preview with per-row validation and a confirm-and-commit step. A failed row does not fail the batch; failures are flagged for fix-and-retry.
- **FR-24 — Vendor de-duplication on import.** During bulk upload, vendor names are matched against the `Vendors` sheet to prevent duplicate vendor records.
- **FR-25 — Attachments.** Files can be uploaded to, listed for, downloaded from, and deleted on a contract record via basic Azure Blob storage. No document processing (no extraction, OCR, indexing, embedding, RAG).
- **FR-26 — Activity log.** Each contract has a chronological activity log capturing status changes, reminders sent, and notes added — every entry timestamped and attributed.
- **FR-27 — Lane panel default & toggle.** On the contract detail screen, the Lanes panel displays only the Procurement lane by default, with a "Show N other lanes" toggle that reveals the remaining lanes.
- **FR-28 — Risk-review banner.** A persistent banner on every contract detail screen reads: *"This tracks that review is happening — it does not replace the firm's existing risk-review process."*

### Roles & permissions

- **FR-29 — Procurement permissions.** Procurement owners have full edit, assign, and lane-status control on every lane of any contract.
- **FR-30 — Requester permissions.** Requesters have read-only access to their own submissions and can add comments and attach supporting documents. They cannot edit fields or change lane status.
- **FR-31 — Attorney Reviewer permissions.** Attorney Reviewers can comment and attach on contracts assigned to them. They cannot reassign contracts or change any lane's status.

---

## 3. Non-Functional Requirements (NFR)

### Auth & access

- **NFR-1 — Authentication.** Single-tenant Entra ID; app roles drive authorization.
- **NFR-2 — App-managed access only.** Access is decided by role, ownership, and explicit in-app assignment. The system does not consult any external client-matter or ethical-wall data source. External reviewers (vendor, DocuSign signature) are tracked as lanes, not authenticated identities.
- **NFR-3 — Ownership violations return 403.** Any request referencing a record the caller does not own returns HTTP 403, never 404.

### Data sensitivity & retention

- **NFR-4 — Sensitivity classification.** All contract data is Confidential by default; contracts routed through Legal or GCO are treated as Privileged. PII is present (contacts, signers).
- **NFR-5 — Log redaction.** Logs capture only pseudonymous `UserId` (Entra `oid`) and `OperationId`. Contract content, vendor terms, note bodies, and PII are never logged at any level.
- **NFR-6 — Soft-delete only.** No hard-delete path exists for contracts or vendors. Records are retained in perpetuity.
- **NFR-7 — Access audit.** Every read and write of a contract record is audited.
- **NFR-8 — Audit columns.** Every database table includes the six standard audit columns (`CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`, `IsDeleted`, `DeletedAt`) per `database-coding-standards.md`.

### Architecture & integration

- **NFR-9 — Approved Tier 1 stack only.** The build uses only the firm's approved Tier 1 stack: React 19 + TypeScript + Vite (web), .NET 10 ASP.NET Core + EF Core (API), Azure SQL, Entra ID, Azure Key Vault, Application Insights, Azure Blob Storage.
- **NFR-10 — Future integrations are additive.** The data model and document handling are structured so iManage and SpendConnect integrations can be added in a later phase without schema rework.
- **NFR-11 — Bulk upload server-side.** Bulk upload is processed server-side; the raw spreadsheet is not persisted outside the validated database rows.

### Errors & secrets

- **NFR-12 — RFC 7807 error responses.** All error responses use ProblemDetails (RFC 7807) with a plain-language `detail` field. Stack traces, exception messages, and internal paths are never exposed to clients.
- **NFR-13 — Secrets in Key Vault only.** All secrets live in Azure Key Vault. No secrets in source control, configuration files, or container environment variables.

### Communications

- **NFR-14 — Communications logged.** All user-facing communications (reminders, notifications) are logged on the contract's activity log.
- **NFR-15 — Phase 1 reminder behavior.** Phase 1 logs the reminder intent and the recipient on the activity log; the production email-send pattern (Microsoft Graph mail send vs. SMTP) is a build-time decision per `api-performance.md`.
- **NFR-16 — No auto-execute of external obligations.** The system does not auto-execute any external-obligation action (e.g., sending a contract to a vendor) without explicit Procurement confirmation.

### Capacity

- **NFR-17 — Concurrent user target.** Default peak of approximately 100 concurrent users, per Tier 1 default.

---

## 4. Universal Tier 1 guardrails (inherited, not enumerated)

The universal engineering guardrails from `CLAUDE.md` and `.claude/rules/dev/_core-requirements.md` apply to every requirement in this baseline and are intentionally not re-enumerated as individual NFRs. They include — without limitation — validation at controller boundaries, `CancellationToken` on every async method, no raw SQL string concatenation, no `eval()` / `new Function()` / unsanitised `dangerouslySetInnerHTML`, HTTPS in production, and the universal logging / PII / secrets rules.

Any *deviation* from a universal guardrail (or a project-specific extension of one) must be captured as an explicit NFR in this baseline AND recorded in `artifacts/docs/dev/decisions.md`.

---

*Baseline frozen 2026-06-29. Subsequent changes are tracked via `requirements/change-log.md`.*
