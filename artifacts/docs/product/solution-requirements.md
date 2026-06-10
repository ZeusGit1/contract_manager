# SOLUTION REQUIREMENTS
> **For Claude:** Read this file at the start of every session for this project. Use all sections below as your primary context before taking any action. If a section is marked `[PENDING]`, ask the Analyst to complete it before proceeding.
>
> *This artifact is the Analyst's requirements deliverable for a solution — what should be built, for whom, and why. Distinct from a developer specification (how it should be built), which is owned by Development.*

---

## 1. SOLUTION IDENTITY

| Field | Details |
|---|---|
| **Solution Name** | Contract Manager |
| **Solution Tier** | `Tier 2` — multi-user web platform with planned integrations (iManage, SpendConnect) and a UI beyond Claude Code. Does not meet two of the four Tier 3 criteria (no external clients; no new MCP build; deep integration with two firm systems planned, not three+; standard Entra auth). |
| **Version** | v1.0 |
| **Status** | `Draft` |
| **Date Created** | 2026-06-10 |
| **Last Updated** | 2026-06-10 |
| **Analyst Owner** | [PENDING — Analyst name] |

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
| **Primary Contact** | Lisa Farkas, [PENDING — title] |
| **Executive Sponsor** | [PENDING — to be identified] |
| **End Users** | Procurement team (Lisa Farkas, Rich Patterson, Noor Abid); firm staff and attorneys (as Requesters); firm attorneys, including Privacy / InfoSec / Litigation / Corporate / GCO (as Attorney Reviewers) |
| **Approximate User Count** | [PENDING — counts per role to be confirmed] |

---

## 3. THE REQUEST

### Problem Being Solved
Procurement currently runs the contract review lifecycle manually — intake, triage, assignment, review routing, status tracking, document version control, communications, and reminders all live across email, spreadsheets, and the SpendConnect database. The process has no centralized dashboard, no enforced intake schema per contract category, no consistent place for meeting notes or comments, and no automated follow-up when contracts are out for signature. Vendor information is fragmented and prone to duplicates. Historical context (prior negotiations, vendor issues, expired terms) is held informally.

### Proposed Solution
A web-based contract management platform that handles the full contract lifecycle from intake through expiration/termination. Requesters submit contracts via category-specific intake forms (Event / Facilities / IT). Procurement triages from a centralized dashboard, assigns reviewers, moves contracts through defined workflow stages, and logs notes, documents, and communications on each record. The platform maintains a master vendor list with attributes, contacts, and history; automates reminder cadences (e.g., for executed copies); and archives completed contracts to a separate view while keeping them searchable. For the POC, integrations with iManage and SpendConnect are deferred — but the architecture is structured so they can be added later without rework. The POC includes a one-time bulk upload of the existing SpendConnect contracts spreadsheet.

### User Workflow — Today vs. With the Solution

| Step | Today | With the Solution |
|---|---|---|
| 1 | Requester emails or messages Procurement with a contract review request | Requester submits a category-specific intake form in the web app |
| 2 | Procurement gathers missing information through back-and-forth emails | Form enforces required fields per category (Event / Facilities / IT) before submit |
| 3 | Lisa logs the request in SpendConnect plus a tracking spreadsheet | New contract auto-appears on the Procurement dashboard with status `In process` |
| 4 | Procurement assigns to an internal reviewer (Lisa / Rich / Noor) by email | Procurement assigns reviewer in-app; reviewer is notified |
| 5 | Status tracked manually as the contract moves through vendor / legal / GCO / InfoSec / Privacy | Status updated in-app through defined stages; visible to all parties on the contract record |
| 6 | Documents emailed back and forth; versions tracked manually | Documents attached to the contract record with versioning |
| 7 | Notes kept in scattered emails, notebooks, or call logs | Notes and meeting logs added to the contract record, timestamped and attributed |
| 8 | Lisa manually chases requesters for fully executed copies | Automated reminders sent at configurable intervals when status is `Out for signature` |
| 9 | All communications scattered across inboxes | All notifications and communications logged on the contract record (ServiceNow-style log) |
| 10 | Completed contracts clutter the active list | Completed contracts auto-archive to a separate view; still searchable |

### Solution Category

- [x] Workflow automation (routing, approvals, notifications)
- [x] Document automation (intake forms, document versioning)
- [x] Internal reporting (dashboard, renewal pipeline, status reports)
- [x] Data processing (vendor master data, contract attribute extraction)
- [ ] Q&A / Knowledge retrieval
- [ ] Research & analysis
- [ ] Client-facing output

---

## 4. DATA & INPUTS

### Input Sources

| Input | Format | Example |
|---|---|---|
| Category-specific intake form | Web form | Event / Facilities / IT-specific schemas (see Data Schema below) |
| Contract drafts and executed copies | PDF / Word | Vendor agreements, MSAs, SOWs, order forms |
| Supporting documents | PDF / image / Office | Certificates of insurance, vendor forms, redline trails |
| Existing contracts spreadsheet (one-time migration) | XLSX | See `sample-data/contracts-seed-data.xlsx` for the schema and representative test data |
| Comments and meeting notes | Free text in-app | Procurement / reviewer notes on each contract |

### Data Schema — Bulk Upload (MVP)

The platform must accept a bulk upload of the existing contracts spreadsheet to seed the system. The schema below — represented by `sample-data/contracts-seed-data.xlsx` — covers the union of fields across all three contract categories. Category-specific columns are blank for rows where they don't apply.

**Sheet: `Contracts`** (29 columns)

| Field | Type | Required | Notes |
|---|---|---|---|
| ContractId | text | Y | Format `CN-YYYY-NNNN` |
| ContractName | text | Y | Display name for the contract |
| Category | enum | Y | `Event` / `Facilities` / `IT` |
| Status | enum | Y | One of: `In process`, `With vendor`, `With requester`, `With legal`, `With GCO`, `With InfoSec`, `With Privacy`, `Out for signature`, `Completed`, `On hold`, `Canceled`, `Expired`, `Terminated` |
| RequesterName | text | Y | Submitter's name |
| RequesterEmail | email | Y | Submitter's email |
| VendorName | text | Y | Should match a row in the Vendors sheet (duplicate prevention on import) |
| AssignedReviewer | enum | Y | Procurement team member: `Lisa Farkas` / `Rich Patterson` / `Noor Abid` |
| TotalCost | currency (USD) | Y | Total contract value |
| SignatureDeadline | date | N | Deadline by which both parties must sign |
| SubmittedDate | date | Y | Date the intake was submitted |
| TermStartDate | date | N | Contract effective date |
| TermEndDate | date | N | Contract expiration / end date |
| LastActionDate | date | Y | Date of the most recent action on this contract |
| NextActionDueDate | date | N | When the next action is due (drives dashboard prioritization) |
| EventDate | date | N (Event only) | Date of the event |
| VenueLocation | text | N (Event only) | City, State |
| PartOfLargerEvent | Y/N | N (Event only) | Whether the event is part of a larger conference / symposium |
| ParentEventName | text | N (Event only) | Name of the parent event if applicable |
| ServiceDescription | text | N (Facilities only) | Description of services being filled |
| ITType | enum | N (IT only) | `Software` / `Professional Services` |
| ApplicationName | text | N (IT Software only) | Application name |
| ApplicationVersion | text | N (IT Software only) | Version / flavor (e.g. `Lexis+`, `Enterprise edition`) |
| LicensingType | enum | N (IT Software only) | `Subscription` / `Perpetual` / `Per-User` |
| NumberOfUsers | integer | N (IT Software only) | Seat count |
| CloudOrOnPrem | enum | N (IT Software only) | `Cloud` / `On-Premise` / `Hybrid` |
| SystemAccess | text | N (IT only) | Free-text: what firm systems the contract / vendor gets access to |
| Permissions | text | N (IT only) | Free-text: scope of permissions granted (read / write / admin / etc.) |
| Integrations | text | N (IT only) | Free-text: which firm systems the product integrates with |
| AccessesPersonalData | Y/N | N (IT only) | Risk-review attribute |
| AccessesPHI | Y/N | N (IT only) | Risk-review attribute |
| UsesAI | Y/N | N (IT only) | Risk-review attribute |
| Notes | text | N | Free-text notes / history |

**Sheet: `Vendors`** (9 columns) — `VendorId`, `VendorName`, `VendorType` (`Event Venue` / `Facilities Service` / `Software` / `Professional Services`), `PreferredStatus` (`Preferred` / `Standard` / `Difficult` / `Blacklisted`), `PrimaryContactName`, `PrimaryContactEmail`, `PrimaryContactPhone`, `PrimaryContactRole`, `Notes`.

**Sheet: `Users`** (4 columns) — `UserName`, `Email`, `Role` (`Requester` / `Procurement` / `Attorney Reviewer`), `Department`.

> **For Claude:** Sample data with 31 contract rows, 23 vendors, and 15 users lives at `artifacts/docs/product/sample-data/contracts-seed-data.xlsx`. Use it for design, build, and QA. Future schema additions are expected — keep the import path additive (don't hard-code column lists).

### Data Sensitivity
- [x] **Confidential** — Vendor terms, pricing, internal review notes
- [x] **Privileged** — Contracts routed through Legal / GCO carry attorney-client privileged commentary
- [x] **PII Present** — Vendor contact details, requester / reviewer identities, signers

### Data Handling Notes
- Treat every contract record as Confidential by default; treat any record with legal / GCO routing or privileged commentary as Privileged.
- Audit access to contract records (read and write). Logs must capture user identity (Entra `oid`), action, and timestamp — never the underlying contract content. See `api-pii-handling.md` and `api-logging.md`.
- Soft-deletion only — never hard-delete a contract record (history must be retained in perpetuity per the requirement). See `database-coding-standards.md`.
- Bulk-upload payloads (the existing contracts spreadsheet) must be processed server-side without persisting the raw file outside the validated database rows.

---

## 5. OUTPUTS & SUCCESS CRITERIA

### User Stories

| As a... | I want to... | So that... |
|---|---|---|
| Requester (firm staff or attorney) | Submit a contract for review through a category-specific intake form | Procurement gets everything they need on day one without follow-up emails |
| Requester | View the status of contracts I submitted and add comments | I know where my request stands without asking |
| Procurement team member | See a centralized dashboard of all active contracts and statuses | I can see "what's on deck" and prioritize daily work |
| Procurement team member | Assign contracts to reviewers and move them through workflow stages | Nothing falls through the cracks and I can track ownership |
| Procurement team member | Maintain a master vendor list with attributes, contacts, and history | I don't re-research vendors and avoid creating duplicates |
| Procurement team member | Bulk-upload our existing contracts from the spreadsheet | We don't lose historical context when we switch off SpendConnect |
| Procurement team member | Configure automated reminders for executed-copy follow-up | I stop manually chasing requesters |
| Procurement team member | Report on contracts up for renewal in a given window | I can proactively plan renewal negotiations |
| Attorney Reviewer | Attach documents and add comments on contracts assigned to me | I can collaborate without needing admin rights |
| Procurement team member | Archive completed contracts to a separate view while keeping them searchable | My active worklist stays focused on current work |

### Expected Output

| Output | Format | Destination |
|---|---|---|
| Centralized dashboard of active contracts | Web UI | Procurement landing page |
| Contract record (detail view) | Web UI | One per contract; tabs for fields, documents, comments, notification log |
| Archived contracts view | Web UI | Separate tab from the active dashboard; searchable |
| Vendor master view | Web UI | Searchable / sortable list with attributes and history |
| Renewal pipeline report | Web UI + CSV / XLSX export | Filterable by term-end window (e.g., next 30 / 60 / 90 days) |
| Automated reminder notifications | Email (in-app log) | Sent to requester at configurable cadence while status = `Out for signature` |
| In-app communications log | Web UI | One per contract; chronological record of all system notifications and comments |

### Testable Acceptance Criteria

| User Story | Criterion | How tested |
|---|---|---|
| Requester submits intake | Form blocks submission if any required field for the chosen category is empty | QA submits forms with missing required fields and expects validation errors per field |
| Procurement triage | Dashboard shows all non-archived contracts with current status, assignee, last action date, and next action due date | QA seeds 20 contracts in mixed states and verifies the dashboard lists each with the correct columns |
| Workflow status | Status changes are restricted to the defined enum (13 values listed above) | QA attempts to set an unauthorized status via API; expects `400` per `api-validation.md` |
| Role permissions — Requester | Requester cannot edit fields or change status after submit; can only add comments and attach supporting documents | QA logs in as a Requester and verifies all edit controls are disabled except comments/attachments |
| Role permissions — Attorney Reviewer | Attorney Reviewer cannot reassign contracts or change status; can only attach documents and comment | QA logs in as a Reviewer and verifies assignment / status controls are hidden |
| Role permissions — Procurement | Procurement team members have full edit / assign / status control | QA logs in as each Procurement member and verifies all controls available |
| Vendor master — autocomplete | Vendor field autocompletes from the master list as the user types | QA types a partial vendor name and expects matching suggestions |
| Vendor master — duplicate prevention | Submitting a new vendor name that closely matches an existing one prompts a merge confirmation rather than creating a duplicate | QA attempts to add a near-match vendor and verifies the merge prompt |
| Bulk upload | Uploading `contracts-seed-data.xlsx` imports all 31 valid rows; invalid rows are flagged and can be fixed inline before commit | QA uploads the sample plus a copy with 3 corrupted rows; verifies preview, fix flow, final import counts |
| Automated reminders | Reminders fire on the configured cadence only while status is `Out for signature`; stop on status change | QA configures cadence to 1 day, advances clock, verifies notification logged, then changes status and verifies reminders stop |
| Archive view | Contracts with status `Completed`, `Canceled`, `Expired`, or `Terminated` move off the active dashboard but remain searchable in the archive view | QA marks a contract `Completed`, verifies it leaves the active list, searches archive, verifies record returned |
| Renewal report | Procurement can filter contracts by `TermEndDate within next X days` and export results | QA runs the report at 30 / 60 / 90 days against the seeded data and verifies the expected subset of contracts |
| Communication log | Every notification sent by the system is logged on the contract record with timestamp, recipient, and channel | QA triggers a reminder, opens the contract record, verifies the log entry |
| Multi-party collaboration | Multiple Attorney Reviewers (e.g., Privacy + InfoSec) can comment and attach documents concurrently on the same contract without overwriting each other | QA simulates two reviewers; verifies both comments persist with attribution |
| History retention | Soft-deleted / completed contracts and their history remain retrievable indefinitely | QA verifies no hard-delete path exists; archive contains records older than the test set's earliest date |

### Use Cases

**Use Case 1: Submit a new contract for review**
- **Trigger:** Requester needs Procurement to review a vendor contract
- **Main flow:** (1) Requester picks category (Event / Facilities / IT) → (2) Fills the category-specific intake form → (3) Attaches contract draft and any supporting documents → (4) Submits → (5) New contract appears on the Procurement dashboard with status `In process`
- **Alternative flow:** Vendor isn't in the master list → Requester selects "Add new vendor" → Form captures vendor details inline → New vendor flagged for Procurement review on save
- **Exception:** Required field missing, attachment exceeds size limit, or vendor flagged as `Blacklisted` → Form blocks submission with a specific error and preserves entered data (returns `400` per `api-validation.md`)

**Use Case 2: Procurement triages and assigns**
- **Trigger:** A new contract lands on the dashboard
- **Main flow:** (1) Procurement opens the record → (2) Reviews intake info → (3) Assigns to an internal reviewer (Lisa / Rich / Noor) → (4) Sets status (e.g., `With legal`, `With vendor`) → (5) Logs next action date
- **Alternative flow:** Request needs more information from the Requester → Status moves to `With requester`; Requester is notified and can comment
- **Exception:** Request is out of scope or canceled → Status set to `Canceled` with reason note; record is retained for history (never hard-deleted)

**Use Case 3: Multi-party collaboration on a contract**
- **Trigger:** Contract requires concurrent review by Legal, InfoSec, and Privacy (e.g., an IT contract with PHI and AI flags)
- **Main flow:** (1) Procurement assigns multiple Attorney Reviewers → (2) Each reviewer attaches documents and comments on the same record → (3) Comments are timestamped and attributed to the author → (4) Status reflects the current stage (e.g., `With InfoSec` while InfoSec is the gating reviewer)
- **Alternative flow:** Reviewers reach conflicting conclusions → Notes log preserves both views; Procurement coordinates resolution and updates status accordingly
- **Exception:** Reviewer attempts to change status or assign others → Blocked at the API (`403` per `api-validation.md` ownership-violation rule); only Procurement can change status or assignment

**Use Case 4: Bulk-upload existing contracts (MVP migration)**
- **Trigger:** Go-live; the existing SpendConnect spreadsheet needs to be imported
- **Main flow:** (1) Procurement uploads `contracts-seed-data.xlsx` (or equivalent) → (2) App validates columns and rows → (3) Preview shows what will be imported, including vendor de-duplication matches → (4) Procurement confirms → (5) Contracts are created with original metadata and status
- **Alternative flow:** Some rows have missing or invalid data → Preview flags those rows with specific errors; Procurement can fix inline, skip, or abort the import
- **Exception:** Spreadsheet schema doesn't match the expected columns → Import refused with a specific column-mismatch error; nothing is written

**Use Case 5: Out-for-signature reminder loop**
- **Trigger:** Contract status changes to `Out for signature`
- **Main flow:** (1) System starts a reminder timer per the configured interval (e.g., every 2 weeks) → (2) Sends reminder to the Requester for the executed copy → (3) Logs the notification on the contract record → (4) Stops when status moves to `Completed`, `Canceled`, or `Terminated`
- **Alternative flow:** Requester replies in-app with the executed copy → Procurement uploads it to the record and moves status to `Completed`
- **Exception:** Reminder fails to send (e.g., email bounce) → Failure logged on the record; surfaced to Procurement for manual follow-up

### What "Good Output" Looks Like

A good Procurement dashboard at 9 a.m. on a Monday shows: every active contract sorted by `NextActionDueDate`, the current status visible at a glance, the assigned reviewer, and a clear visual signal for items past their next-action date. Clicking a row opens the contract record where every comment, document version, status change, and notification is preserved in a chronological log — no detail lives in someone's inbox. The archive view contains every completed contract back through the SpendConnect migration, fully searchable. A renewal report run at any time shows exactly which contracts expire in the next 30 / 60 / 90 days and who owns each one.

---

## 6. CONSTRAINTS & BOUNDARIES

### What the Solution Should NOT Do

- [x] Do not track software license entitlements or user-level entitlements (explicitly out of scope per Lisa)
- [x] Do not hard-delete contracts or vendor records — soft-delete only, retained in perpetuity
- [x] Do not expose internal review commentary or privileged notes to Requesters
- [x] Do not allow Attorney Reviewers to change status or reassign contracts
- [x] Do not derive access from any external client-matter or ethical-wall system (per the Tier 1 framework gate — app-managed access only via role / ownership)
- [x] Do not auto-execute any contract action that creates an external obligation (e.g., sending a contract to a vendor for signature) without explicit Procurement confirmation

### Technical Constraints

- [x] Must work within the firm's approved tools only (Tier 1 framework stack: React + .NET on Azure, Entra ID, Azure SQL, Key Vault)
- [x] Output must be compatible with the future integration target systems (**iManage** for document storage and **SpendConnect** for reporting) — though both integrations are **deferred for POC**
- [x] POC scope: structure the data model and document handling so that the iManage and SpendConnect integrations can be added later without schema or API rework
- [x] All user-facing communication (emails, in-app notifications) must be logged on the contract record (ServiceNow-style)
- [x] Bulk upload must be processed server-side; raw spreadsheet content is not persisted outside the validated rows

### Approved Integrations for This Solution (POC)

- Entra ID (single-tenant) — authentication and role mapping
- Azure SQL — primary data store
- Azure Blob Storage — document attachments (basic attachments only, per `api-blob-attachments.md`)
- Azure Key Vault — secrets
- Application Insights — telemetry

**Deferred to a later phase (not POC):**
- iManage integration (document storage / version control)
- SpendConnect integration (reporting feed)
- Email service for outbound notifications — POC may use a basic SMTP / Microsoft Graph mail send; production integration scope to be confirmed

---

## 7. ROLES & HANDOFFS

| Role | Responsibility for This Solution |
|---|---|
| **AI Solutions Analyst** | Requirements owner; maintains this brief; coordinates prototype review with Lisa |
| **UI/UX Designer** | Yes — required. Dashboard, intake forms (per category), contract record / detail view, vendor master, archive, renewal report. Multi-role interaction patterns matter (Requester read-only with comments; Procurement full edit; Reviewer comment-and-attach). |
| **Developer** | Tier 2 build: React web app, .NET API, Azure SQL schema, bulk-upload pipeline, automated reminders (e.g., `IHostedService` + timer per `api-performance.md`), audit logging. Structure the data model + document handling so iManage and SpendConnect integrations are additive in a later phase. |
| **QA** | Test plan against the testable acceptance criteria above; include the role-permission matrix, bulk-upload happy / unhappy paths, the reminder lifecycle, and archive behavior. |
| **Requestor / Business Owner** | Lisa Farkas — UAT sign-off |

---

## 8. APPROVALS REQUIRED

| Approval Type | Required? | Approver | Status |
|---|---|---|---|
| IT / Security Review | [x] Yes | [PENDING — InfoSec lead] | `Pending` |
| Data Privacy Review | [x] Yes | [PENDING — Privacy lead] | `Pending` |
| Practice Group Sign-off | [ ] No | — | n/a |
| Legal / Compliance | [ ] Yes / [ ] No | [PENDING — confirm during POC] | `Pending` |
| Executive Sponsor | [ ] Yes / [ ] No | [PENDING] | `Pending` |
| Procurement Team Approval | [x] Yes | Lisa Farkas (and Procurement team) | `Pending` |

> **Note:** Approvals beyond Procurement may change as the POC matures and InfoSec / Privacy assess the planned future integrations (iManage, SpendConnect).

---

## 9. TIMELINE

Open-ended. Target a working POC that:
1. Accepts a bulk upload of the existing contracts spreadsheet (`contracts-seed-data.xlsx` schema).
2. Presents a dashboard for adding and managing new contract entries.
3. Is architected so iManage and SpendConnect integrations can be added later without rework.

| Milestone | Target Date | Owner | Status |
|---|---|---|---|
| Requirements finalized | [PENDING] | Analyst | In progress |
| Solution design approved | [PENDING] | Analyst | Not started |
| POC build complete | [PENDING] | Developer | Not started |
| QA complete | [PENDING] | QA | Not started |
| UAT / Procurement review | [PENDING] | Lisa Farkas | Not started |
| POC demo | [PENDING] | Analyst | Not started |

---

## 10. INSTRUCTIONS FOR CLAUDE

*This section is written directly to Claude. Follow these instructions every time you work on this solution.*

1. **Always read this entire brief before taking any action** — including before planning, designing, building, or reviewing. The Tier 1 engineering framework rules in `CLAUDE.md` and `.claude/rules/dev/` govern *how* to build; this brief governs *what* to build.
2. If any required field above is blank or marked `[PENDING]`, flag it to the user before proceeding past planning.
3. **Treat all contract data in this project as `Confidential` by default and `Privileged` for any contract routed through Legal / GCO or containing legal commentary.** Apply the PII-handling rules in `api-pii-handling.md` end-to-end — never log contract content, vendor terms, or comment bodies. Only pseudonymous `UserId` (Entra `oid`) and `OperationId` are permitted in logs (per `api-logging.md`).
4. **Primary audiences for outputs:**
   - **Procurement team** — primary daily users; calibrate density and information hierarchy for power-user workflows.
   - **Attorney Reviewers** — comment-and-attach surface; minimize friction for contract-by-contract review.
   - **Requesters** — read-mostly status visibility plus structured intake forms.
5. **Access model is app-managed (per `api-record-access.md`)** — role + assignment on the contract record. **Do not introduce any external client-matter / ethical-wall data source.** That breaches the Tier 1 framework gate and requires escalation.
6. **POC scope excludes iManage and SpendConnect integrations.** However, the data model, document handling, and contract identifiers must be structured so those integrations can be added later as a clean additive change. Document any design decision that supports future integrability in `decisions.md`.
7. **Soft-delete only, retention in perpetuity.** Never propose a hard-delete or retention-window scheme for contracts or vendors.
8. **Audit access on every read and write** to a contract record — see `api-logging.md` for the `OperationId` / `UserId` pattern. Audit columns on every table per `database-coding-standards.md`.
9. **The 13-value status enum is canonical.** When designing the data model or any state-machine logic, do not invent new statuses or collapse existing ones without updating this brief and the Change Log first.
10. **The data schema in Section 4 is the contract for the bulk upload feature.** Treat `artifacts/docs/product/sample-data/contracts-seed-data.xlsx` as the seed and as QA's first test fixture. Future schema additions are expected — keep import paths additive.
11. **Automated reminders** must fire only while a contract's status is `Out for signature`, at a configurable cadence (default: every 2 weeks), and stop on any other status change. Every notification — including failures — must be logged on the contract record.
12. When in doubt about scope, refer back to Section 3 (The Request) and Section 6 (Constraints).

---

## 11. CHANGE LOG

| Date | Changed By | Section(s) Affected | What Changed & Why |
|---|---|---|---|
| 2026-06-10 | AI Solutions Analyst | All | Initial requirements captured via intake interview based on Lisa Farkas's intake session. Tier 2 assigned; reasoning recorded in Section 1. Data sensitivity confirmed (Confidential + Privileged + PII). POC scope excludes iManage and SpendConnect integrations but the architecture must support adding them later. Test seed data generated at `artifacts/docs/product/sample-data/contracts-seed-data.xlsx` (31 contracts, 23 vendors, 15 users). |
| 2026-06-10 | AI Solutions Analyst | Section 4 (Data Schema), Section 5 (implicit via blueprint) | Updated alongside design-code-handoff. Added structured IT fields to the Data Schema: `ApplicationVersion`, `SystemAccess`, `Permissions`, `Integrations`. These were named in the original intake notes as software details and risk-review attributes but had been simplified out of the seed schema during gathering. The prototype's IT Intake form refines but does not gate on them; restoring them here gives Development the structured spec for the deferred Event / Facilities / IT forms. Workflow model confirmed: **no formal approval gates** — Attorney Reviewers comment and attach concurrently; Procurement assigns reviewers per contract type and advances status. Vendor Detail page (originally listed as deferred screen S9 in the blueprint) dropped in favor of a vendor summary modal accessible from the Vendor Master List. "Requester" is the canonical spelling — Code normalizes the prototype's "Requestor" labels on build. |
| | | | |

---

*Template Version: 1.0 | Maintained by: AI Solutions Analyst*
