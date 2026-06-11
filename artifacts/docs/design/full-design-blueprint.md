# Full Design Blueprint — Contract Manager

> Canonical plan for the Contract Manager product. Humans read this top to bottom; Claude Code reads the structured sections (full screen map, deferred-screen details, cross-cutting notes, design decisions to preserve) to build the deferred half of the product.
>
> **Reconciled with the approved prototype on 2026-06-10.** See the reconciliation log at the foot of this file for the changes applied.
>
> **Source of intent** for anything ambiguous: `artifacts/docs/product/solution-requirements.md`.

---

## At a glance

| | |
|---|---|
| **Product** | Contract Manager — internal web platform for the firm's Procurement team to manage the full contract lifecycle (intake → review → signature → filing → expiration / termination) across Event, Facilities, and IT contracts. |
| **Demo persona** | Lisa Farkas (Procurement) — Monday-morning triage walk-through. |
| **Prototype screens** | 5 of 17 total in the screen map (post-reconciliation; the planned-but-replaced Vendor Detail page was dropped in favor of a modal pattern). |
| **Directions per screen** | 1 (one confident answer). |
| **Variant exploration** | Off. |
| **Solution Tier** | Tier 2 (per `solution-requirements.md` Section 1). |

---

## Core flow — what the prototype walks through

1. **Lisa lands on the Procurement Dashboard** (S2). Every active contract, current status, assignee, last action date, and next-action-due date. The dashboard surfaces a **triage chip strip** at the top — "Needs your action / In attorney review / Awaiting signature / Expiring ≤14 days / On hold & closed" — that lets her cut to what matters today in one click. A leftmost flag column marks rows that need her attention with a tooltip showing the specific action.
2. **She clicks a contract row** to open the Contract Detail (S3). The full record on one surface — a **workflow stepper** visualizing the 13-status lifecycle, a contextual primary CTA ("Advance to X" / "Mark completed" / "Start renewal" / "Resume review" / "Reopen contract"), a right rail with status / action dates / lead reviewer (all editable inline), and five tabs: Details, Documents, Comments, Notes, Activity. Reviewers from Legal / GCO / InfoSec / Privacy comment and attach concurrently; Procurement moves the status forward.
3. **She navigates to the Vendor Master** (S8) via the sidebar. Every vendor the firm works with, attributes (Preferred / Standard / Difficult / Blacklisted), primary contact, contract footprint. Clicking a vendor row opens a **summary modal** with status, contact info, vendor-since date, and a list of all contracts with this vendor (clickable through to S3). The modal replaces what was originally planned as a separate Vendor Detail page (S9, now dropped).
4. **A new IT contract comes in** — she opens the IT Intake Form (S5) via "+ New Contract → IT" to see what Requesters submit. The form enforces Software vs. Professional Services subtype and surfaces the risk-review attributes (personal data, PHI, AI) plus structured Software details (deployment, hosting, seats) and risk-review additions captured in the deferred form spec (system access, permissions, integrations, application version/flavor, licensing type).
5. **At go-live she bulk-uploads the legacy SpendConnect spreadsheet** through the Bulk Upload — Preview & Fix flow (S12). Preview shows what will be imported, flags invalid rows per-cell, lets her fix inline or skip the row, then commits.

The two role-aware surfaces (Requester / Attorney Reviewer) are described in the deferred section but not prototyped — Claude Code builds them as constrained variants of the Procurement-view screens.

---

## What's in the prototype — and why

| ID | Screen | Source | V | U | Rationale |
|---|---|---|---|---|---|
| **S2** | Procurement Dashboard (Active Contracts) | requirement | 5 | 4 | The home screen for the primary user; multi-status, multi-assignee, prioritized worklist. Demo-defining. |
| **S3** | Contract Detail (Procurement view) ★ | requirement | 5 | 4 | Where the actual work happens — highest design density in the product. Combines fields, status workflow, attachments, comments, typed discussion notes, and an activity log on one record. |
| **S5** | IT Intake Form ★ | requirement | 4 | 4 | Most complex of the three intake forms. Establishes the form pattern that Event and Facilities reuse. |
| **S8** | Vendor Master List | requirement | 4 | 3 | Separate workspace; demonstrates the attribute badge pattern (Preferred / Difficult / Blacklisted) and surfaces vendor detail via modal. |
| **S12** | Bulk Upload — Preview & Fix ★ | requirement | 4 | 4 | First thing Procurement does at go-live. Preview-with-inline-fix is genuinely novel UX worth getting on screen for sign-off. |

★ = highest-uncertainty screens — design decisions on these most directly affect downstream work.

---

## What's deferred

Specified for Claude Code to build, not prototyped. Full per-screen detail is in **Deferred Screen Details** below.

- **S1** Sign-in (Entra redirect) — auth boilerplate
- **S4** Submit Contract — category picker (3-card chooser)
- **S6** Event Intake Form — pattern established by S5
- **S7** Facilities Intake Form — pattern established by S5
- **S10** Archive View — variant of S2 with status filter
- **S11** Renewal Report — filterable table + export
- **S13** My Submitted Contracts (Requester home) — derivative of S2 with Requester gating
- **S14** Contract Detail — Requester variant — role-gated variant of S3
- **S15** My Assigned Contracts (Reviewer home) — derivative of S2 with Reviewer scope
- **S16** Contract Detail — Reviewer variant — role-gated variant of S3
- **S17** Reminder Configuration — settings page
- **S18** User Profile / Settings — standard infrastructure

> **Dropped from the plan:** the originally-planned S9 (Vendor Detail page) is removed. The vendor summary modal from S8 covers Procurement's needs; a full Vendor Detail page would be redundant. See cross-cutting notes for the modal pattern.

---

## Skill settings used

| Setting | Value |
|---|---|
| `screen_budget` | 6 (5 used) |
| `directions` | 1 |
| `variant_exploration` | off |

---

## Open questions for sign-off

**Resolved by the prototype:**

1. ~~**Dashboard default sort.**~~ **Resolved:** the dashboard uses a triage chip strip (Needs your action / In attorney review / Awaiting signature / Expiring ≤14 days / On hold & closed) plus per-column sortable headers. No default-sort decision needed; the triage pattern surfaces priorities directly.
2. ~~**Procurement "Take it" pattern.**~~ **Resolved:** reviewer assignment happens on the Contract Detail screen (S3) via the right-rail "Lead reviewer" card with inline reassign. Unassigned contracts surface in the dashboard's reviewer cell as "Unassigned" and roll up into the "Needs your action" triage chip. No inline dashboard self-assign.
3. ~~**Inline status change vs. modal.**~~ **Resolved:** status change happens on the Contract Detail right rail via a dropdown (covers all 13 values) plus the contextual primary CTA ("Advance to X"). No inline-on-row status change on the dashboard.
4. ~~**Bulk-upload error tolerance.**~~ **Resolved:** the prototype handles this as inline-fix per cell plus a row-level skip option. Confirm import only when flagged rows are resolved (fixed or skipped).

**Still open:**

5. **Notification channel.** POC plan is in-app + email via Microsoft Graph mail send. Confirm Graph is the sanctioned outbound channel (vs. a third-party email service).
6. **Vendor de-duplication threshold.** Fuzzy matching at what similarity threshold? "Ritz Carlton" vs. "The Ritz-Carlton" should merge; "Microsoft" vs. "Microsoft Federal" should not. Recommend a tunable threshold with a manual merge confirmation per match.

---

## Full screen map

Master list — every screen across all three roles, both Prototype and Deferred. IDs are stable and referenced throughout this file.

| ID | Screen | Role(s) | Platform | Contents (plain language) | Connects to | Tag | V | U | Source |
|---|---|---|---|---|---|---|---|---|---|
| S1 | Sign-in (Entra redirect) | All | Web | Entra ID sign-in handoff; on first sign-in, server provisions the user record per `api-auth.md` `EnsureUserMiddleware` | S2 / S13 / S15 (role-based landing) | Deferred | 1 | 1 | inferred-infrastructure |
| S2 | Procurement Dashboard (Active Contracts) | Procurement | Web | Triage chip strip (All active / Needs your action / In attorney review / Awaiting signature / Expiring ≤14 days / On hold & closed) over a worklist of all non-archived contracts: attention flag, contract title + ID, vendor, category, stage badge, assigned reviewer (name + team), value, expires, last action date, next action due date. Sortable column headers. Sidebar quick-actions: "+ New Contract", "Bulk Upload". | S3 (click row), S5 (+ New → IT), S6/S7 (+ New → Event/Facilities), S8 (sidebar), S10 (sidebar), S11 (sidebar), S12 (sidebar) | **Prototype** | 5 | 4 | requirement |
| S3 | Contract Detail (Procurement view) | Procurement | Web | Header (ID, name, category, current status badge, total cost, vendor link); contextual notice alert; **workflow stepper** showing the 13-status lifecycle; contextual primary CTA (Advance to X / Mark completed / Start renewal / Resume review / Reopen contract); five tabs (Details, Documents, Comments, Notes — typed Meeting/Call/Email/Note entries, Activity log); right rail with three cards (Status with dropdown override, Action dates with inline next-due edit, Lead reviewer with inline reassign). | S2 (back), S8 (vendor link → modal) | **Prototype** | 5 | 4 | requirement |
| S4 | Submit Contract — category picker | Requester | Web | Three large cards: Event / Facilities / IT. One sentence each describing what kind of contract belongs in that category. | S5 / S6 / S7 | Deferred | 3 | 1 | requirement |
| S5 | IT Intake Form | Requester | Web | Common fields (requester, vendor with autocomplete from the master list, contract title, total cost, term start, term end, description) + IT-type toggle (Software / Professional Services) + Software fields (deployment: SaaS-vendor-hosted / On-prem / Hybrid; hosting location: US / EU / other; seats; application version/flavor; licensing type: Subscription / Perpetual / Per-User; system access; permissions; integrations) + Professional-services fields (engagement: Fixed fee / T&M / Retainer; scope; hours; on-site Y/N) + risk-review attributes (accesses personal data Y/N, accesses PHI Y/N, uses AI Y/N) + supporting document attachments. | S2 (after submit), S13 (after submit, for Requester) | **Prototype** | 4 | 4 | requirement |
| S6 | Event Intake Form | Requester | Web | Common fields + event date, venue/location, part-of-larger-event flag, parent event name. Same pattern as S5. | S2 / S13 | Deferred | 3 | 2 | requirement |
| S7 | Facilities Intake Form | Requester | Web | Common fields + service description (free text), term of contract dates. Same pattern as S5. | S2 / S13 | Deferred | 3 | 2 | requirement |
| S8 | Vendor Master List | Procurement | Web | Sortable / searchable list of every vendor: name, type (Event Venue / Facilities Service / Software / Professional Services), preferred-status badge (Preferred / Standard / Difficult / Blacklisted), primary contact, contract footprint count. Clicking a row opens a **vendor summary modal** (see cross-cutting). Autocomplete on add-new with fuzzy duplicate matching. | S2 (sidebar). Modal → S3 (click historical contract) | **Prototype** | 4 | 3 | requirement |
| S10 | Archive View | Procurement | Web | Variant of S2 filtered to status in {Completed, Canceled, Expired, Terminated}. Searchable by contract name, vendor, requester, year. | S3 (click row), S2 (sidebar) | Deferred | 3 | 2 | requirement |
| S11 | Renewal Report | Procurement | Web | Filterable table of contracts with `TermEndDate` within N days (default 30 / 60 / 90 picker). Columns: contract, vendor, end date, days remaining, assigned reviewer, current status. Export to CSV / XLSX. | S3 (click row), S2 (sidebar) | Deferred | 3 | 3 | requirement |
| S12 | Bulk Upload — Preview & Fix | Procurement | Web | Upload spreadsheet (matches the schema in `solution-requirements.md` Section 4 / `contracts-seed-data.xlsx`). Preview pane shows valid rows ready to import vs. flagged rows with per-cell error reasons. Inline fix per cell OR skip the row OR abort. Confirm import → contracts created with original metadata. | S2 (after commit), S2 (sidebar entry) | **Prototype** | 4 | 4 | requirement |
| S13 | My Submitted Contracts (Requester home) | Requester | Web | Read-only worklist of contracts the requester submitted. Columns: contract name, vendor, current status, assigned reviewer, last action date. Action: open record (read-only) and add a comment. | S14 (click row), S4 (+ New) | Deferred | 3 | 2 | inferred-feature |
| S14 | Contract Detail — Requester variant | Requester | Web | Same record as S3 but field edit / status / reassignment / Notes tab controls hidden. Comment-add and attachment-add enabled. Internal-only comments hidden. | S13 (back) | Deferred | 3 | 3 | inferred-feature |
| S15 | My Assigned Contracts (Reviewer home) | Attorney Reviewer | Web | Worklist of contracts assigned to this reviewer. Same column set as S2 minus assignee column. | S16 (click row) | Deferred | 3 | 2 | inferred-feature |
| S16 | Contract Detail — Reviewer variant | Attorney Reviewer | Web | Same record as S3 with status / reassignment hidden; comment-add and attachment-add enabled; all comments visible (internal review surface); Notes tab visible but read-only for non-assigning reviewers. | S15 (back) | Deferred | 3 | 3 | inferred-feature |
| S17 | Reminder Configuration | Procurement | Web | Settings surface: cadence for `Out for signature` reminders (default every 2 weeks; range 1–8 weeks), template editor for the reminder body, on/off switch per contract category. | S2 (sidebar → settings) | Deferred | 2 | 2 | inferred-feature |
| S18 | User Profile / Settings | All | Web | Standard infrastructure: name, email, role (read-only — set by Entra). Editable: in-app vs. email notification preferences. | Sidebar account menu | Deferred | 1 | 1 | inferred-infrastructure |

### Prototype navigation graph

```
S2 (Procurement Dashboard, with triage chip strip)
 ├── click row ──────────────────────────► S3 (Contract Detail)
 ├── sidebar: Vendors ────────────────────► S8 (Vendor Master List)
 │                                          └── click row ──► (Vendor summary modal)
 │                                                              └── click contract ─► S3
 ├── sidebar: + New Contract ─────────────► S5 (IT Intake Form) ── submit ──► back to S2
 └── sidebar: Bulk Upload ────────────────► S12 (Bulk Upload — Preview & Fix) ── confirm ──► back to S2

S3 (Contract Detail)
 └── vendor link in header / Details tab ─► S8 (Vendor Master List)
```

---

## Deferred screen details

For Claude Code to build. Each block: purpose, who uses it, content in plain language, business rules, connects-to. **No routes, endpoints, data schemas, or UI components** — those are Code's decisions. The data shape is in `solution-requirements.md` Section 4.

### Role and access matrix

| Surface | Requester | Procurement | Attorney Reviewer |
|---|---|---|---|
| Sign-in (S1) | Yes | Yes | Yes |
| Procurement Dashboard (S2) | — | Yes | — |
| Contract Detail — Procurement view (S3) | — | Yes (full edit) | — |
| Category picker (S4) | Yes | Yes (Procurement can also submit on behalf) | — |
| Intake forms (S5/S6/S7) | Yes | Yes (on behalf) | — |
| Vendor Master + vendor modal (S8) | — | Yes | — |
| Archive View (S10) | — | Yes | — |
| Renewal Report (S11) | — | Yes | — |
| Bulk Upload (S12) | — | Yes | — |
| My Submitted Contracts (S13) | Yes | — | — |
| Contract Detail — Requester variant (S14) | Yes (own contracts only) | — | — |
| My Assigned Contracts (S15) | — | — | Yes |
| Contract Detail — Reviewer variant (S16) | — | — | Yes (assigned contracts only) |
| Reminder Configuration (S17) | — | Yes | — |
| User Profile (S18) | Yes | Yes | Yes |

Permission enforcement is server-side per `api-record-access.md` — every read path (list, detail, related resources) re-applies the access check. Ownership violations return `403`, never `404`.

### S1 — Sign-in (Entra redirect)

- **Purpose:** Authenticate every user against the firm's single-tenant Entra ID and provision their user record on first sign-in.
- **Who uses it:** All three roles.
- **Content:** Standard Entra-hosted sign-in (no custom UI). Post-redirect, the API runs `EnsureUserMiddleware` per `api-auth.md` to idempotently upsert `dbo.Users`. The user lands on the role-appropriate home (S2 / S13 / S15).
- **Business rules:** Entra `oid` is the only user identifier the server logs. Display name and email come from the token claims. Cross-origin token redemption is handled per `api-client-auth.md`.
- **Connects to:** S2 (Procurement) / S13 (Requester) / S15 (Attorney Reviewer) by role.

### S4 — Submit Contract — category picker

- **Purpose:** Help a requester pick the right intake form before they start filling fields.
- **Who uses it:** Requesters; Procurement when submitting on a requester's behalf.
- **Content:** Three large category cards (Event, Facilities, IT) with one sentence each describing what belongs in that category. A muted hint at the bottom: "Not sure? Ask your Procurement contact."
- **Business rules:** The picker is a one-way fork — the chosen category sets the intake form's required-field schema and persists with the contract record. Category is not editable after submission.
- **Connects to:** S5 (IT), S6 (Event), S7 (Facilities).

### S6 — Event Intake Form

- **Purpose:** Capture every detail Procurement needs to review an event-related contract.
- **Who uses it:** Requesters; Procurement on behalf.
- **Content:** Common fields (requester, vendor with autocomplete from the master list, contract title, total cost, signature deadline) + event-specific fields (event date, venue location, part-of-larger-event flag, parent event name if applicable) + supporting document attachments.
- **Business rules:** Same submission rules as S5. The event cost should be for *this engagement only*, not the entire conference if the event is part of a larger one — surface this as helper text under the cost field. Same vendor-blacklist block as S5.
- **Connects to:** S2 (after Procurement submit) / S13 (after Requester submit).

### S7 — Facilities Intake Form

- **Purpose:** Capture every detail Procurement needs to review a facilities-related contract.
- **Who uses it:** Requesters; Procurement on behalf.
- **Content:** Common fields + facilities-specific fields (term start, term end, service description as free text) + supporting document attachments.
- **Business rules:** Same submission rules as S5.
- **Connects to:** S2 / S13.

### S10 — Archive View

- **Purpose:** Search and review contracts that are no longer active.
- **Who uses it:** Procurement.
- **Content:** Same column set as S2 — but filtered to status in {Completed, Canceled, Expired, Terminated}. Adds a search box (name, vendor, requester) and a year selector. No "+ New" or "Bulk Upload" actions here.
- **Business rules:** Records in the archive are read-only-by-default; reopening (status change back to an active state) requires a Procurement confirmation. Soft-delete only — never hard-delete (perpetual retention per `solution-requirements.md` Section 6).
- **Connects to:** S3 (click row), S2 (sidebar).

### S11 — Renewal Report

- **Purpose:** Surface contracts coming up for renewal so Procurement can plan negotiations.
- **Who uses it:** Procurement.
- **Content:** Window picker (next 30 / 60 / 90 days, custom range) + filter by category and assigned reviewer + a table with contract, vendor, end date, days remaining, current status. Export to CSV / XLSX.
- **Business rules:** "Days remaining" is computed from `TermEndDate` and the current date. Rows where the contract has already been renewed (a newer contract for the same vendor with overlapping term) are flagged "Renewal in flight" rather than appearing as a pure expiry candidate — recommend surfacing this as a join hint to Code (not a derived column).
- **Connects to:** S3 (click row), S2 (sidebar).

### S13 — My Submitted Contracts (Requester home)

- **Purpose:** Give Requesters a worklist of their own submissions.
- **Who uses it:** Requesters.
- **Content:** Read-only worklist scoped to contracts where `RequesterEmail` matches the signed-in user. Columns: contract name, vendor, current status, assigned reviewer, last action date.
- **Business rules:** Read-only at the row level. Clicking a row opens S14 (Requester-variant detail).
- **Connects to:** S14 (click row), S4 (+ New Contract).

### S14 — Contract Detail — Requester variant

- **Purpose:** Show a Requester the state of their own contract and let them comment.
- **Who uses it:** Requesters.
- **Content:** Same record as S3 with: status / reassign / field-edit / Notes-tab controls hidden; internal-only comments hidden; document attachment surface available; comment-add available. Workflow stepper visible (read-only) so the Requester can see lifecycle progress.
- **Business rules:** Per `api-record-access.md`, the server check denies edit / status / reassign — UI hides the controls but the API is authoritative. Internal-only comments are filtered server-side, not just hidden client-side.
- **Connects to:** S13 (back).

### S15 — My Assigned Contracts (Reviewer home)

- **Purpose:** Give Attorney Reviewers a worklist of contracts assigned to them across active workflow stages.
- **Who uses it:** Attorney Reviewers (Privacy, InfoSec, GCO, Litigation, Corporate, etc.).
- **Content:** Worklist scoped to contracts where the signed-in reviewer is on the assignment list. Columns: contract name, vendor, current status, last action date.
- **Business rules:** A contract can have multiple Attorney Reviewers concurrently — the worklist shows all contracts where I am one of them. Read-only at the row level; opening a row goes to S16.
- **Connects to:** S16 (click row).

### S16 — Contract Detail — Reviewer variant

- **Purpose:** Let Attorney Reviewers comment, attach documents, and read the full record without changing status or assignment.
- **Who uses it:** Attorney Reviewers.
- **Content:** Same record as S3 with: status / reassign controls hidden; comment-add available; attachment-add available; all comments visible (internal review surface); workflow stepper visible (read-only).
- **Business rules:** Server enforces that the signed-in user is on the assignment list before any read or write. Multiple reviewers can comment and attach concurrently without overwriting each other. **Reviewers do not approve or gate the workflow** — they comment, attach, and Procurement advances the status as appropriate for the contract type.
- **Connects to:** S15 (back).

### S17 — Reminder Configuration

- **Purpose:** Let Procurement tune the cadence and content of the `Out for signature` reminder loop.
- **Who uses it:** Procurement.
- **Content:** Cadence selector (every 1 / 2 / 4 / 8 weeks — default 2). Reminder message editor with a small set of allowed merge fields (contract name, vendor name, requester name). On/off switch per contract category. Read-only summary: "Reminders fire only while status is `Out for signature` and stop on any other status change."
- **Business rules:** Changes are audited. The cadence is global per category; per-contract overrides are out of scope for v1.
- **Connects to:** Sidebar → Settings.

### S18 — User Profile / Settings

- **Purpose:** Standard profile and per-user notification preferences.
- **Who uses it:** All roles.
- **Content:** Read-only: name, email, role (set by Entra). Editable: in-app vs. email notification preferences.
- **Business rules:** Role is not user-editable — it derives from Entra app-role membership.
- **Connects to:** Sidebar account menu.

---

## Cross-cutting notes

Patterns that apply across the product, not specific to any one screen.

- **Status pill is the single source of truth for workflow state.** The 13-value enum (`solution-requirements.md` Section 4) is canonical. A single visual treatment per status across every screen (dashboard, detail, archive, reports) — the McDermott design system's status-badge pattern (pale fills, navy text per the theme-stable rule). The "On hold" status is not in the base design-system Badge set — see Design decisions to preserve.
- **Vendor name on Procurement surfaces opens a vendor summary modal** (status badge, vendor-since date, primary contact details — name, email, phone, location, primary category — and a list of all contracts with this vendor, each clickable through to S3). On Requester / Reviewer surfaces, the vendor name renders as plain text (no modal, no link). The modal replaces what was originally planned as a separate Vendor Detail page.
- **No formal approval gates.** Reviewers (Legal / GCO / InfoSec / Privacy / Corporate / Litigation) comment and attach documents concurrently on a contract. **Procurement** assigns reviewers, moves the contract through the appropriate workflow stages for the contract type, and advances to signature. There is no per-team "approval" state, no "Record approval" action, and no gating of the workflow on reviewer sign-off. Multi-party collaboration is concurrent commenting + attaching, not formal approval.
- **Notes vs. Comments — two distinct discussion surfaces on the contract record.** "Comments" is a running internal stream (Slack-like) for ad-hoc discussion among Procurement and Reviewers. "Notes" is a structured discussion log of typed entries — Meeting / Call / Email / Note — each with date, optional participants, and free-text body. Both are visible on the same record; only Procurement and Attorney Reviewers can add either; Requester-variant S14 hides Notes entirely.
- **Activity is the chronological system log** on each contract record — every status change, every assignment change, every notification sent, every document attached. It's the "ServiceNow-style log" the requirements asked for. Never log content of the contract or comment bodies — log identifiers, timestamps, action, recipient (per `api-logging.md` and `api-pii-handling.md`).
- **Soft-delete only.** No hard-delete path anywhere in the product, ever. Confirms render as "Cancel contract" or "Archive" — never "Delete."
- **Audit on read and write.** Every contract-record access is logged with `UserId` (Entra `oid`) and `OperationId` per `api-logging.md`.
- **Role-restricted detail variants are the same backend record with server-enforced filtering.** S14 and S16 are not separate documents — the API returns a role-filtered DTO. Don't build them as independent pages.
- **POC integrations.** iManage and SpendConnect are explicitly out of POC scope (`solution-requirements.md` Section 6) but the data model and document-handling code must be additive-compatible. Record any design decision that supports future integrability in `decisions.md`.
- **Mobile responsive.** Every screen must work at 320px viewport per `responsive-and-mobile.md`. Procurement Dashboard and Bulk Upload preview need careful editorial decisions for mobile — these are dense workspaces, not casual reads.
- **Terminology: "Requester," not "Requestor."** Standardize on "Requester" in code, copy, and column names. The prototype data uses "Requestor" in some labels — Code should normalize to "Requester" when implementing.

---

## Design decisions to preserve

These are notable visual and interaction decisions captured from the approved prototype. Build to match them, not to defaults from the design system alone. Each names the screen / element it applies to and points to the prototype source (under `artifacts/docs/design/project/project/`) and the screenshots folder (`artifacts/docs/design/project/project/screenshots/`) where applicable.

1. **Triage chip strip on the Procurement Dashboard** — six pre-canned filter chips above the contracts table: "All active", "Needs your action", "In attorney review", "Awaiting signature", "Expiring ≤ 14 days", "On hold & closed". Each chip shows a count and a colored dot. Active chip has a pressed state. *Source:* `DashboardScreen.jsx` (search "triage"), screenshot `s2-dashboard.png`.
2. **"Needs attention" flag column** on the Procurement Dashboard — leftmost column shows a small flag dot for rows that need Procurement's attention; tooltip on hover (`title=` attribute) shows the specific action needed ("Unassigned — needs a reviewer", "Imported — assign a reviewer", etc.). *Source:* `DashboardScreen.jsx` (`flag-slot`, `flag-dot`), screenshot `dash-cols.png`.
3. **Sortable column headers with three-state indicator** — every sortable column shows `caret-up-down` when inactive, `caret-up` or `caret-down` when active; `aria-sort` is set. *Source:* `SortHead` in `DashboardScreen.jsx` and `VSortHead` in `VendorScreen.jsx`.
4. **Custom "On hold" status pill** — pale-magenta background, navy text. Added to the design system's badge set as `mws-badge--hold` in `app.css`; theme-stable foreground rule applies (navy text in both light and dark). *Source:* the inline `<style>` in `Contract Manager.html` and the `STAGES.on_hold` mapping in `data.js`.
5. **Workflow stepper on Contract Detail** — horizontal step bar showing 9 forward-path steps (Intake → Vendor → Requestor → Legal → GCO → InfoSec → Privacy → Signature → Completed); current step ringed, prior steps checked, future steps numbered. For exception statuses (On hold / Canceled / Expired / Terminated) the stepper is muted and a workflow flag below names the exception and what to do next. *Source:* `Stepper` in `ContractDetailScreen.jsx`, screenshots `s3-detail.png`, `detail-onhold.png`.
6. **Five-tab Contract Detail structure** — Details, Documents, Comments, **Notes**, Activity. Notes is distinct from Comments (typed Meeting/Call/Email/Note entries with date and optional participants). *Source:* `TABS` in `ContractDetailScreen.jsx`, screenshots `01-detail-notes.png`, `02-detail-notes.png`, `notes-form.png`, `01-notes-edit.png`, `02-notes-edit.png`.
7. **Contextual primary CTA on Contract Detail** — single primary button whose label depends on the current status: "Advance to [next stage]" / "Mark completed" on the forward path; "Start renewal" on Completed or Expired; "Resume review" on On hold; "Reopen contract" on Canceled or Terminated. *Source:* the `advance-wrap` block in `ContractDetailScreen.jsx`, screenshot `s3-detail.png`.
8. **Right-rail status / action-dates / lead-reviewer cards** with inline editing — Status card with a dropdown override of all 13 values and a hint ("Each change is recorded in the activity trail"); Action dates card with inline next-due-date edit (calendar input + Save/Cancel); Lead reviewer card with inline reassign (Select + Save/Cancel). *Source:* the `rail` block in `ContractDetailScreen.jsx`, screenshots `s3-approvals.png` (now reframed as "Reviewer assignment & status rail").
9. **Contextual notice alert on Contract Detail** — single alert above the workflow stepper that reflects live state: "Unassigned" warning when no reviewer is set, "Expiring soon" warning on Completed contracts within 14 days of expiry, exception-state messages for On hold / Canceled / Expired / Terminated. *Source:* the `notice` block in `ContractDetailScreen.jsx`.
10. **Vendor row → summary modal** on Vendor Master — clicking a vendor row opens a centered modal showing: status badge, vendor-since date, free-text note, primary contact details (name, email, phone, location, primary category), and a list of all contracts with this vendor. Each contract in the modal is clickable through to S3. *Source:* `VendorModalBody` in `VendorScreen.jsx`, screenshots `vendor-modal.png`, `vendor-modal2.png`.
11. **Bulk Upload inline-per-cell error fix with row-level skip** — the preview table flags errors per cell (Missing title, Unknown vendor, Unknown category, Invalid amount, Missing date, Ends before start). Procurement fixes inline or skips the whole row; commit is blocked while any flagged row is unresolved (not skipped, not fixed). *Source:* `BulkUploadScreen.jsx` (`fieldError`, `rowErrorCount`), screenshots `bulk-preview.png`, `bulk-dropzone.png`.

> **Not preserved from the prototype:** the corner "Tweaks panel" (`tweaks-panel.jsx`) is prototype-only tooling for live-tweaking density / triage strip / contract numbers / reviewer team / dark mode. It is **not** a production feature and should not be carried into the build. Theme toggle is a real product feature and lives in the top bar (see `AppShell.jsx`).

---

## Handoff steps

1. **Phase A complete.** Selection signed off; this blueprint and the Claude Design brief were written.
2. **Phase B complete.** The prototype is built, approved, exported, and reconciled — see the reconciliation log below.
3. **Next — plan.** Run `/plan`. It reads `solution-requirements.md`, this blueprint, the reconciled `project/` bundle, and `claude.md`, and produces `plan.md` + `decisions.md` for the build.
4. **Then build.** `/build` implements both halves — the prototyped surfaces (S2, S3, S5, S8, S12) and the deferred ones described in this file (S1, S4, S6, S7, S10, S11, S13, S14, S15, S16, S17, S18).
5. **Then ship.** `/ship` lands the build on `dev`.

---

## Reconciliation log

| Date | Reconciliation pass | Changes applied |
|---|---|---|
| 2026-06-10 | Initial design-code reconciliation against the approved prototype, the requirements doc, and the Tier 1 framework gates from `CLAUDE.md` | **Dropped** S9 Vendor Detail (replaced by a vendor summary modal from S8). **Reverted** the prototype's formal Approvals panel and per-team approval gating — no formal approval state; Procurement assigns and advances. **Added** the structured Notes tab as a first-class concept distinct from Comments. **Added** to the deferred S5 / S6 / S7 IT Intake spec: application version/flavor, licensing type, system access, permissions, integrations (per the original requirements). **Resolved** open questions 1–4 against the prototype's choices (triage chips for sort priority; reviewer assignment at Contract Detail; status change via right-rail dropdown + advance CTA; inline-fix + row-skip in Bulk Upload). **Standardized** spelling on "Requester" (the prototype data used "Requestor"). **Recorded** 11 visual / interaction decisions to preserve. **Tier 1 framework gates:** all passing — no document processing, no external client-matter access, app-managed access only, basic attachments only, internal audience. |
