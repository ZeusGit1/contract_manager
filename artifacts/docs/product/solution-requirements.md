# SOLUTION REQUIREMENTS — Contract Manager (Phase 1)

> **For Claude:** Read this file at the start of every session for this project. Use all sections below as your primary context before taking any action. If a section is marked `[PENDING]`, ask the Analyst to complete it before proceeding.
>
> *This artifact is the Analyst's requirements deliverable for a solution — what should be built, for whom, and why. Distinct from a developer specification (how it should be built), which is owned by Development.*

---

## 1. SOLUTION IDENTITY

| Field | Details |
|---|---|
| **Solution Name** | Contract Manager |
| **Solution Tier** | `Tier 2` — multi-user web platform with planned integrations (iManage, SpendConnect) and a UI beyond Claude Code. Does not meet two of the four Tier 3 criteria (no external clients; no new MCP build; deep integration with two firm systems planned, not three+; standard Entra auth). |
| **Version** | v2.0 — parallel review lanes (Phase 1 prototype approved) |
| **Status** | `Prototype approved` — ready for `/plan` |
| **Date Created** | 2026-06-10 |
| **Last Updated** | 2026-06-22 |
| **Analyst Owner** | Laura Sros |
| **Phase** | Phase 1 — **procurement contract review tracking only.** Renewals, advanced reporting, and full-fidelity reviewer collaboration are explicitly deferred to a later phase. |

**Tier Definitions (for Claude and Analysts):**
- **Tier 1** — Analyst-owned. Runs interactively in Claude Code. No system integrations. Human always present. No developer needed.
- **Tier 2** — Analyst builds the AI layer in Claude Code; Developer wraps infrastructure (scheduling, auth, UI, integrations). **MCP note:** if an approved platform MCP covers a required system integration, the Analyst calls it directly — the developer only builds what the MCP doesn't cover.
- **Tier 3** — Full development project. Complex UI, deep multi-system integration, multi-user scale, or building a new MCP server. Developer leads from the start. All Enterprise solutions are Tier 3 by default.

> **For Claude:** Read the Tier field before taking any design or build action. Tier 1 means the Analyst owns the full build — do not route work to a Developer. Tier 2 or 3 means include infrastructure handoff notes in any solution design you produce. If this field is blank or `[PENDING]`, treat the solution as Tier 2 and flag it.

---

## 2. REQUESTOR & STAKEHOLDERS

| Field | Details |
|---|---|
| **Requesting Group / Department** | Procurement |
| **Primary Contact** | Lisa Farkas, Procurement Lead |
| **Executive Sponsor** | [PENDING — to be identified] |
| **End Users (in-app)** | Procurement team (Lisa Farkas, Marcus Webb, Lauren Pike, Tom Reyes); firm staff and attorneys (as Requesters); internal firm attorneys (as Attorney Reviewers — Legal, GCO, InfoSec, Privacy). |
| **Non-user participants** | External vendors and DocuSign envelopes are **not users** of the system; they are tracked as lanes (`Vendor`, `Signature`) that Procurement advances. The Requester (firm employee) IS a user. |
| **Approximate User Count** | ~100 concurrent (Tier 1 default). Procurement: 4 named owners. Reviewers: variable across the named groups above. Requesters: any firm employee submitting a contract. |

---

## 3. THE REQUEST

### Problem Being Solved

Procurement currently runs the contract review lifecycle manually — intake, triage, assignment, status tracking, document version control, communications, and reminders all live across email, spreadsheets, and SpendConnect. The process has no centralized dashboard, no enforced intake schema per category, no concurrent visibility into who is reviewing what, and no automated follow-up when contracts are out for signature.

The reviewer experience is concurrent in real life — Legal, GCO, InfoSec, and Privacy often review the same contract at the same time — but the tracking model has been linear, which loses information ("with legal" doesn't tell you InfoSec hasn't started yet).

### Proposed Solution (Phase 1 — narrow, focused)

A web-based contract management platform focused on **procurement contract review tracking**, structured around **parallel review lanes**. Requesters submit contracts via category-specific intake forms (Event / Facilities / IT). Procurement triages from a centralized dashboard and advances individual review lanes independently. Each contract has up to **9 lanes** (Procurement, Legal, InfoSec, Privacy, GCO, Vendor, Requester, Signature, Filed); each lane has its own status, owner, and notes.

Phase 1 covers:
- Category-driven intake (Event / Facilities / IT) with admin-configurable categories and fields.
- Master dashboard, per-procurement-owner dashboards, contract detail with parallel lanes.
- Bulk upload of legacy SpendConnect data via four flows (file drop, paste, type, manual entry).
- Send-reminder action for external lanes (vendor, requester, signature).
- Vendor master with summary-modal access.
- Reports for procurement leadership and individual owners.
- Configurable categories & fields (data-driven, not hardcoded).
- Completed/canceled archive.

Phase 1 explicitly **does not** replace the firm's risk-review process. A banner on the contract detail surface communicates this: the app tracks *that* review is happening on each lane; it does not host the legal commentary or risk-assessment work product itself.

### Workflow — Today vs With Phase 1

| Step | Today | With Phase 1 |
|---|---|---|
| 1 | Requester emails or messages Procurement with a contract review request | Requester submits a category-specific intake form in the web app |
| 2 | Procurement gathers missing info via back-and-forth | Form enforces required fields per category before submit |
| 3 | Lisa logs the request in SpendConnect plus a spreadsheet | New contract auto-appears on the Procurement dashboard with Procurement lane `In review`, all others `Not started` |
| 4 | Procurement decides which reviewers to involve, emails them | Procurement activates the relevant lanes (Legal, InfoSec, Privacy, GCO, Vendor) by setting them from `Not started` → `In review` or `Waiting` |
| 5 | Status tracked as one linear thing ("with legal"), losing parallel visibility | Each lane has its own status, owner, due date, and notes — visible side by side on the contract detail screen |
| 6 | Documents emailed; versions tracked manually | Documents attached to the contract record (basic Blob attachments, no processing) |
| 7 | Notes kept in scattered emails | Notes/activity entries logged on the contract record, timestamped and attributed |
| 8 | Lisa manually chases vendors / requesters / DocuSign envelopes | "Send reminder" on the contract detail for external lanes (vendor / requester / signature); reminder logged as an activity entry |
| 9 | Completed contracts clutter the active list | Procurement marks Procurement lane `Complete` → contract drops from active dashboards, lands in archive |

### Solution Patterns Matched

- **Workflow tracking** (parallel review lanes)
- **Document attachment** (basic Blob storage — no processing)
- **Internal reporting** (KPI dashboards + procurement-owner breakdowns)
- **Bulk data ingestion** (four flows for legacy spreadsheet import)
- **Configurable schema** (categories and fields managed by Procurement admin, not hardcoded)

---

## 4. DATA & INPUTS

### Input Sources

| Input | Format | Example |
|---|---|---|
| Category-specific intake form | Web form | Event / Facilities / IT-specific schemas |
| Contract drafts and executed copies | PDF / Word / image | Vendor agreements, MSAs, SOWs, order forms |
| Supporting documents | PDF / image / Office | Certificates of insurance, vendor forms |
| Legacy contracts spreadsheet (one-time migration) | XLSX (file drop / paste / type / manual entry) | `sample-data/contracts-seed-data.xlsx` |
| Notes and activity entries | Free text in-app | Procurement / reviewer notes, reminder log |

### Parallel Review Lanes — Data Model

The unit of state for a contract is the **lane**. A contract has up to 9 lanes:

| Lane ID | Label | Internal/External | Default on intake |
|---|---|---|---|
| `procurement` | Procurement | Internal | `In review` |
| `legal` | Legal | Internal | `Not started` |
| `infosec` | InfoSec | Internal | `Not started` |
| `privacy` | Privacy | Internal | `Not started` |
| `gco` | GCO | Internal | `Not started` |
| `vendor` | Vendor | External | `Not started` |
| `requester` | Requester | External (firm staff via email) | `Not started` |
| `signature` | Signature | External (DocuSign envelope) | `Not started` |
| `filed` | Filed | Internal | `Not started` |

Each lane carries: `status`, `owner` (nullable), `dueDate` (nullable, set by Procurement), `lastUpdated`, `note` (nullable, free text).

### Lane Status Enum (canonical)

| Status | Counts as "active"? | Meaning |
|---|---|---|
| `not_started` | No | Lane has not been activated by the Procurement owner. |
| `in_review` | **Yes** | Lane is actively in progress. |
| `waiting` | **Yes** | Lane is open but blocked on external response (e.g. waiting on vendor or attorney). |
| `approved` | No | Lane has completed its review with a positive outcome. |
| `canceled` | No | Lane is no longer required. |
| `na` | No | Lane is explicitly not applicable to this contract. |
| `complete` | No | Lane work is finished (terminal). |

> **For Claude:** "Active right now" counters across the dashboard, reports, and contract row summaries count only `in_review` and `waiting`. `not_started` lanes are queued; `approved`, `complete`, `canceled`, and `na` are closed.

### Overall Contract Status

Derived/managed independently of individual lane states: `active` | `completed` | `canceled`. When the **Procurement** lane is set to `complete`, the contract's `overallStatus` transitions to `completed` and the contract moves from active dashboards to the archive.

### Priority Enum

`low` | `medium` | `high` | `critical`. Default `medium`. Set on intake by Requester; editable by Procurement owner.

### Bulk Upload — Legacy Spreadsheet Schema (one-time migration)

**Sheet: `Contracts`** (~29 columns covering the union of Event / Facilities / IT fields; legacy linear status field gets mapped into the parallel-lanes model on import).

| Field | Type | Required | Notes |
|---|---|---|---|
| ContractId | text | Y | Format `CN-YYYY-NNNN` |
| ContractName | text | Y | Display name |
| Category | enum | Y | `Event` / `Facilities` / `IT` |
| LegacyStatus | enum | N | One of the legacy 13-value statuses; mapped to lane states on import (Procurement lane state derived from it). |
| RequesterName / RequesterEmail | text / email | Y | Submitter identity |
| VendorName | text | Y | Should match Vendors sheet (duplicate prevention on import) |
| ProcurementOwner | enum | Y | `Lisa Farkas` / `Marcus Webb` / `Lauren Pike` / `Tom Reyes` |
| Priority | enum | Y | `low` / `medium` / `high` / `critical` |
| TotalCost | currency (USD) | Y | Total contract value |
| TermStartDate / TermEndDate | date | N | Effective dates |
| SubmittedDate | date | Y | Intake submission date |
| LastActionDate | date | Y | Most recent action |
| EventDate / VenueLocation / ParentEvent | (Event-only) | N | |
| Building (Facilities-only) | text | N | |
| IT-specific fields | various | N | `ITType`, `AccessesPersonalData`, `AccessesPHI`, `UsesAI`, plus the structured IT details (ApplicationVersion, SystemAccess, Permissions, Integrations) per category configuration |
| Notes | text | N | Free text |

**Sheet: `Vendors`** — `VendorId`, `VendorName`, `VendorType`, `PreferredStatus`, `PrimaryContactName/Email/Phone/Role`, `Notes`.
**Sheet: `Users`** — `UserName`, `Email`, `Role` (`Requester` / `Procurement` / `Attorney Reviewer`), `Department`.

> **For Claude:** Sample data lives at `artifacts/docs/product/sample-data/contracts-seed-data.xlsx` (31 contracts, 23 vendors, 15 users). Categories and their field sets are data-driven via the Categories & Fields admin screen — never hardcoded. Keep the import path additive; future field additions must not require code changes.

### Bulk Upload — Four Flows

The bulk-upload surface offers four mutually-exclusive flows; pick one per upload session:

1. **File drop** — drag-and-drop an `.xlsx`.
2. **Paste** — paste TSV / CSV from clipboard.
3. **Type** — typed-in inline editor with live row validation.
4. **Manual entry** — one row at a time via the same form fields used by intake.

All flows produce an editable preview with per-row validation, vendor de-duplication matches, and a confirmation step before commit. A failed row does not fail the batch — others continue; failures are flagged for fix-and-retry.

### Data Sensitivity

- [x] **Confidential** — Vendor terms, pricing, internal review notes
- [x] **Privileged** — Contracts routed through Legal / GCO may carry attorney-client privileged commentary
- [x] **PII Present** — Vendor contact details, requester / reviewer identities, signers

### Data Handling Notes

- Treat every contract record as Confidential by default; treat any record with Legal / GCO routing as Privileged.
- Audit access to contract records (read and write). Logs capture pseudonymous `UserId` (Entra `oid`) + `OperationId` only — never contract content. See `api-pii-handling.md`, `api-logging.md`.
- Soft-deletion only — never hard-delete a contract or vendor record (history retained in perpetuity).
- Bulk-upload payloads are processed server-side; the raw spreadsheet is not persisted outside the validated database rows.
- Attachments are stored in Azure Blob Storage with no processing (no extraction, no OCR, no indexing). See `api-blob-attachments.md`.

---

## 5. OUTPUTS & SUCCESS CRITERIA

### User Stories

| As a... | I want to... | So that... |
|---|---|---|
| Requester | Submit a contract for review through a category-specific intake form | Procurement gets everything needed on day one |
| Requester | View the status of contracts I submitted and add comments | I know where my request stands without asking |
| Procurement owner | See a dashboard of contracts where my Procurement lane is active | I can prioritize my daily work |
| Procurement owner | See the master view of every active contract across all owners | I have shared visibility into team workload |
| Procurement owner | Advance individual review lanes for a contract independently | I can run Legal, InfoSec, Privacy, and GCO in parallel |
| Procurement owner | Send a "follow-up" reminder for external lanes (vendor / requester / signature) | I stop manually chasing in email |
| Procurement owner | Bulk-upload the legacy SpendConnect spreadsheet via any of four flows | We don't lose historical context on migration |
| Procurement owner | Mark Procurement lane `Complete` to close a contract | Closed contracts leave the active dashboards and land in archive |
| Procurement owner | Configure due dates on lanes | The dashboard can flag overdue items |
| Procurement admin | Configure categories and their field sets | Phase 2 categories don't require a code change |
| Attorney Reviewer (internal) | Attach documents and add notes on a contract assigned to me | I can collaborate without admin rights — and the firm's existing risk-review process is not replaced |
| Procurement leadership | See KPI rollups by category, by procurement owner, and YTD | I can plan staffing and challenge rush requests |

### Expected Output

| Output | Format | Destination |
|---|---|---|
| My dashboard (per-procurement-owner) | Web UI | Procurement landing page; filtered to lanes the owner is assigned to |
| Master view | Web UI | All active contracts across all owners |
| Contract detail with parallel review lanes | Web UI | Per contract; lanes panel collapses to Procurement-only by default with expand toggle |
| Vendor master | Web UI | Searchable / sortable list; vendor summary modal (not a full detail page) |
| Archive | Web UI | Completed + canceled contracts, searchable |
| Reports | Web UI | KPIs: Contracts reviewed YTD (all owners), My reviewed YTD, Active right now, My active, Completed YTD, Canceled YTD; bars by category and by procurement owner |
| Send-reminder log entries | Activity entries on contract | Logged per reminder; email address (requester) or vendor/DocuSign target shown in the modal |
| Categories & fields admin | Web UI | Data-driven schema editor; no hardcoded category logic |

### Testable Acceptance Criteria

| User Story | Criterion | How tested |
|---|---|---|
| Requester submits intake | Form blocks submission if any required field for the chosen category is empty | QA submits intake forms with missing required fields; expects per-field validation errors. |
| Routing preview on intake | Each category-specific intake form shows a "Review routing" panel: Procurement starts as `In review`, all other applicable lanes start as `Not started`. The panel lists Legal, GCO, and any IT-driven InfoSec/Privacy gates. | QA inspects intake form per category; verifies routing copy and pill states. |
| Lane state defaults | On submission, Procurement lane = `In review`, all other lanes = `Not started`. | QA submits a new contract and inspects the resulting lane states. |
| Active-lane counting | Across dashboard tiles, contract row summaries, and reports, "active" counts only `in_review` and `waiting`. `not_started`, `approved`, `complete`, `canceled`, `na` do NOT count active. | QA seeds contracts in mixed lane states and verifies counters. |
| Procurement-complete closes contract | Setting Procurement lane → `complete` transitions overallStatus → `completed` and removes the contract from active dashboards. | QA marks a contract complete; verifies it's no longer in My/Master views; searches archive; confirms findable. |
| Lane panel default | On the contract detail screen, the Lanes panel shows only Procurement by default with a "Show N other lanes" toggle. | QA opens a contract; sees only Procurement; clicks toggle; sees all 9 lanes. |
| Send reminder — external lanes only | "Send reminder" button on contract detail opens a modal listing only `vendor`, `requester`, `signature` lanes that are open. Internal reviewer lanes never appear as reminder targets. | QA opens the modal; verifies only the three external lanes; toggles `not_started` requester lane and confirms it doesn't appear. |
| Send reminder — requester email shown | When the requester lane is selected as the reminder target, the modal shows the requester's email address. | QA selects requester target; verifies the email is shown. |
| Bulk upload — four flows | The bulk-upload surface offers file drop, paste, type, manual entry. Each flow validates inline and offers per-row fix before commit. | QA exercises each flow against good + bad data. |
| Reports KPIs | The Reports screen shows: Contracts reviewed YTD (all owners), My reviewed YTD, Active right now (no sub-text), My active, Completed YTD, Canceled YTD; plus active-by-category and active-by-procurement-owner bars. | QA inspects Reports; verifies each KPI and bar series. |
| Categories are data-driven | The Categories & Fields admin lists every category and its field schema, and adding a category does not require a code change. | QA reviews the admin; verifies the prototype's three categories (Event / Facilities / IT) are rendered from data, not hardcoded. |
| Risk-review banner | The contract detail surface shows a persistent banner: "This tracks that review is happening — it does not replace the firm's existing risk-review process." | QA opens any contract; verifies banner present. |
| Vendor summary modal (not page) | Clicking a vendor opens a summary modal, not a separate vendor detail page. | QA clicks any vendor on a contract / Vendors list; verifies modal opens. |
| External reviewers are not users | The vendor and DocuSign-signature lanes do not require user accounts. The requester (firm staff) IS a user with sign-in. | QA reviews the role/access matrix; confirms vendor + DocuSign aren't expected to authenticate. |
| Priority enum | Priority values are `low | medium | high | critical`. Default `medium`. Critical renders saturated, high pale-orange, medium pale-gold, low transparent + border. | QA inspects intake, detail, dashboard, and reports for the four priorities. |
| Archive | Contracts with `overallStatus` ∈ {`completed`, `canceled`} live in the archive and remain searchable; do not appear on active dashboards. | QA marks contracts complete/canceled; verifies archive listing and active exclusion. |
| Soft-delete only | No hard-delete path exists for contracts or vendors. | QA verifies API surface; confirms only soft-delete operations. |

### Use Cases

**UC1 — New contract intake:** Requester picks a category → fills the category-specific form → submits → contract lands on Procurement dashboard with Procurement lane `In review`, others `Not started`.

**UC2 — Procurement triage & lane activation:** Procurement owner opens contract → activates the relevant lanes (e.g., Legal `In review`, InfoSec `In review`, Vendor `Waiting`) → sets due dates → captures notes per lane.

**UC3 — Parallel review:** Multiple internal reviewers work the same contract concurrently across different lanes. Procurement watches the lane statuses; doesn't need to chase reviewers in email. The firm's existing risk-review process happens off-platform.

**UC4 — External follow-up reminder:** Procurement owner uses the top-of-detail "Send reminder" button → selects vendor / requester / signature target → reminder is sent (Phase 1 logs the intent; full email send is a build-time decision per `api-performance.md`) → activity entry logged.

**UC5 — Bulk upload (one-time migration):** Procurement opens Bulk Upload → picks one of four flows → previews + edits rows → confirms → contracts are created with overall status `active` and Procurement lane `In review` (or per legacy-status mapping).

**UC6 — Contract closure:** Procurement owner marks Procurement lane `Complete` → contract overallStatus = `completed` → drops from active dashboards → appears in Archive (searchable).

### What "Good Output" Looks Like

A good Procurement dashboard on a Monday morning shows: every contract where the signed-in owner has an active lane (`in_review` or `waiting`), sorted by next-action due date, with each contract's lane status pills visible at a glance and overdue items flagged. Clicking a row opens the contract detail with Procurement lane visible first and the other 8 lanes one click away. The "Active right now" KPI counts only lanes that are in progress, not lanes that haven't started. The Reports screen shows both the team-wide YTD totals and the signed-in owner's YTD totals side by side.

---

## 6. CONSTRAINTS & BOUNDARIES

### What Phase 1 Will NOT Do

- **Will not replace the firm's existing risk-review process.** Phase 1 tracks *that* review is happening on each lane — it does not host the legal commentary, risk assessment, or playbook scoring. A banner on the contract detail communicates this.
- Will not track software license entitlements or per-user entitlements.
- Will not hard-delete contracts or vendor records — soft-delete only, retained in perpetuity.
- Will not expose internal review notes to Requesters.
- Will not allow Attorney Reviewers (internal counsel) to change Procurement-owned lane states or reassign contracts.
- Will not derive access from any external client-matter / ethical-wall system (per the Tier 1 framework gate).
- Will not auto-execute any contract action that creates an external obligation without explicit Procurement confirmation.
- Will not treat the vendor or DocuSign envelope as a user — they're external participants tracked as lanes, not as authenticated identities.
- Will not surface a separate Vendor Detail page — vendor info shows as a summary modal accessible from the Vendor Master and contract detail.

### Technical Constraints

- Must work within the firm's approved Tier 1 stack: React 19 + TypeScript + Vite (web), .NET 10 ASP.NET Core + EF Core (API), Azure SQL, Entra ID, Key Vault, Application Insights, Azure Blob Storage.
- Document storage (Phase 1): basic Blob attachments per `api-blob-attachments.md` (upload / list / download / delete; no processing).
- Architecture must permit iManage and SpendConnect integrations to be added in a later phase without schema rework.
- All user-facing communication (reminders, notifications) must be logged on the contract record (activity log).
- Bulk upload is processed server-side; raw spreadsheet content is not persisted outside the validated rows.

### Approved Integrations for Phase 1

- Entra ID (single-tenant) — authentication and role mapping
- Azure SQL — primary data store
- Azure Blob Storage — basic file attachments (no processing)
- Azure Key Vault — secrets
- Application Insights — telemetry

**Deferred to a later phase (not Phase 1):**

- iManage integration (document storage / version control)
- SpendConnect integration (reporting feed)
- Reviewer-collaboration features beyond basic attach-and-note
- Renewal pipeline reporting
- Outbound email service for reminders — Phase 1 logs the reminder intent and the recipient on the activity log; production email send pattern (Microsoft Graph mail send vs. SMTP) is a build-time decision per `api-performance.md`

---

## 7. ROLES & HANDOFFS

| Role | Responsibility for This Solution |
|---|---|
| **AI Solutions Analyst** | Requirements owner; maintains this brief; coordinates prototype review with Lisa Farkas. |
| **UI/UX Designer** | Required for Phase 1. Dashboard, intake forms (per category), contract detail with parallel lanes, vendor master (with summary modal), archive, reports, categories & fields admin. Multi-role interaction patterns matter (Requester read-only with comments; Procurement full edit; Reviewer comment-and-attach). |
| **Developer** | Tier 2 build: React web app, .NET API, Azure SQL schema, four-flow bulk upload pipeline, basic Blob attachments, reminder logging (Phase 1 logs intent; full email send is a build-time decision per `api-performance.md`), audit logging. Structure schema + document handling so iManage and SpendConnect can be added additively in a later phase. |
| **QA** | Test plan against the testable acceptance criteria in Section 5; include the role-permission matrix, parallel-lane interactions, bulk-upload four flows, the reminder flow, and archive behavior. |
| **Requestor / Business Owner** | Lisa Farkas — UAT sign-off. |

---

## 8. APPROVALS REQUIRED

| Approval Type | Required? | Approver | Status |
|---|---|---|---|
| IT / Security Review | [x] Yes | [PENDING — InfoSec lead] | `Pending` |
| Data Privacy Review | [x] Yes | [PENDING — Privacy lead] | `Pending` |
| Practice Group Sign-off | [ ] No | — | n/a |
| Legal / Compliance | [ ] Yes / [ ] No | [PENDING — confirm during Phase 1 build] | `Pending` |
| Executive Sponsor | [ ] Yes / [ ] No | [PENDING] | `Pending` |
| Procurement Team Approval | [x] Yes | Lisa Farkas (and Procurement team) | `Pending` |

---

## 9. TIMELINE

Open-ended. Target a working Phase 1 build that:

1. Accepts bulk upload of the existing contracts spreadsheet via any of the four flows (`contracts-seed-data.xlsx` schema).
2. Presents the My / Master / Detail / Archive / Reports / Vendors / Categories surfaces against parallel-lane data.
3. Is architected so iManage and SpendConnect can be added in a later phase without rework.

| Milestone | Target Date | Owner | Status |
|---|---|---|---|
| Requirements finalized (this doc, v2.0) | 2026-06-22 | Analyst | Complete |
| Prototype approved (parallel lanes) | 2026-06-22 | Analyst + Lisa Farkas | Complete |
| Build complete | [PENDING] | Developer | Not started |
| QA complete | [PENDING] | QA | Not started |
| UAT / Procurement review | [PENDING] | Lisa Farkas | Not started |
| Phase 1 demo | [PENDING] | Analyst | Not started |

---

## 10. INSTRUCTIONS FOR CLAUDE

*This section is written directly to Claude. Follow these instructions every time you work on this solution.*

1. **Always read this entire brief before taking any action** — including before planning, designing, building, or reviewing. The Tier 1 engineering framework rules in `CLAUDE.md` and `.claude/rules/dev/` govern *how* to build; this brief governs *what* to build.
2. If any required field above is blank or marked `[PENDING]`, flag it before proceeding past planning.
3. **Treat all contract data as `Confidential` by default and `Privileged` for any contract routed through Legal / GCO.** Apply `api-pii-handling.md` end-to-end — never log contract content, vendor terms, or note bodies. Only pseudonymous `UserId` (Entra `oid`) and `OperationId` are permitted in logs.
4. **Primary audiences for outputs:**
   - **Procurement team** — primary daily users; calibrate for power-user workflows.
   - **Attorney Reviewers** (internal counsel) — comment-and-attach surface; minimize friction.
   - **Requesters** — read-mostly status visibility plus structured intake forms.
5. **Access model is app-managed (per `api-record-access.md`)** — role + assignment on the contract record. **Do not introduce any external client-matter / ethical-wall data source.** That breaches the Tier 1 gate.
6. **Phase 1 excludes iManage, SpendConnect, and document processing.** Data model, blob handling, and contract identifiers must permit those integrations to be added later as a clean additive change. Document any design decision that supports future integrability in `decisions.md`.
7. **Soft-delete only, retention in perpetuity.** Never propose a hard-delete path for contracts or vendors.
8. **Audit access on every read and write** to a contract record. Audit columns on every table per `database-coding-standards.md`.
9. **The parallel-lane model is canonical.**
   - 9 lanes per contract (Procurement, Legal, InfoSec, Privacy, GCO, Vendor, Requester, Signature, Filed).
   - 7-value lane status enum (`not_started | in_review | waiting | approved | canceled | na | complete`).
   - "Active" = `in_review` ∪ `waiting`. Nothing else counts active.
   - 3-value overall status (`active | completed | canceled`); transitions to `completed` when Procurement lane goes `complete`.
   - Default priority is `medium`; values `low | medium | high | critical`.
10. **The Categories & Fields schema is data-driven.** Adding a category is an admin action, not a code change. The Tier 1 framework can accommodate three categories at Phase 1 launch and N at any later point.
11. **External reviewers are not users.** Vendor and DocuSign signature lanes are tracked, not authenticated. Reminder targets are restricted to those three lanes plus Requester (who is a firm employee — the requester email derives from their identity).
12. **The "Send reminder" action lives at the top of the contract detail.** No bell icons in lane rows. The reminder modal is limited to open external lanes (vendor / requester / signature).
13. **Phase 1 does not replace the firm's risk-review process.** A banner on the contract detail surface communicates this.
14. **Bulk upload supports four flows** (file drop, paste, type, manual entry). Failed rows do not fail the batch.
15. When in doubt about scope, refer back to Section 3 (The Request) and Section 6 (Constraints).

---

## 11. CHANGE LOG

| Date | Changed By | Section(s) Affected | What Changed & Why |
|---|---|---|---|
| 2026-06-10 | AI Solutions Analyst | All | Initial requirements captured. Tier 2 assigned. Data sensitivity: Confidential + Privileged + PII. POC scope excludes iManage and SpendConnect. Seed data generated at `artifacts/docs/product/sample-data/contracts-seed-data.xlsx`. |
| 2026-06-10 | AI Solutions Analyst | Section 4, Section 5 | Updated alongside design-code-handoff. Added structured IT fields (`ApplicationVersion`, `SystemAccess`, `Permissions`, `Integrations`). Workflow model confirmed: no formal approval gates; Attorney Reviewers comment and attach concurrently; Procurement assigns reviewers per contract type. Vendor Detail page dropped in favor of a vendor summary modal. "Requester" canonical (vs prototype's "Requestor"). |
| 2026-06-22 | AI Solutions Analyst | All | **Major rewrite to v2.0 — parallel review lanes.** The linear 13-value status enum was replaced with a 9-lane × 7-state model. Each contract now has up to 9 lanes (Procurement, Legal, InfoSec, Privacy, GCO, Vendor, Requester, Signature, Filed) with independent state. Defined the canonical lane status set (`not_started | in_review | waiting | approved | canceled | na | complete`) and the "active" definition (`in_review` ∪ `waiting`). Procurement lane defaults to `In review` on submission; all other lanes default to `Not started`. Setting Procurement lane → `complete` transitions overallStatus → `completed` and moves the contract to archive. Priority enum confirmed (`low | medium | high | critical`, default `medium`). Send-reminder surface lives at the top of the contract detail, restricted to external lanes (vendor / requester / signature) with the requester email shown in the modal. Lane panel collapses to Procurement-only by default with a "Show N other lanes" toggle. Bulk upload supports four flows. Categories are data-driven (admin schema editor). Reports KPIs split into all-owner and per-owner YTD totals. Risk-review banner is mandatory on contract detail. External reviewers (vendor, DocuSign) are NOT users. Phase 1 explicitly scoped to procurement contract review tracking; renewals, reviewer collaboration beyond attach-and-note, and outbound email send pattern deferred. |

---

*Template Version: 2.0 | Maintained by: AI Solutions Analyst*
