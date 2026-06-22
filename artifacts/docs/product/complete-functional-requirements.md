# Contract Manager — Complete Functional Requirements (Phase 1)

> **Use:** paste this entire file into a brand-new Claude session at McDermott to drive the firm's skill pipeline (`/plan` → `/build` → `/review` → `/ship`). It is a self-contained restatement of the finalized prototype. The authoritative artifact is `artifacts/docs/product/solution-requirements.md` at v2.0; this file is a paste-ready summary derived from it. If they disagree, the canonical file wins.

---

## 1. What we're building

A **Tier 2** web platform that tracks procurement contract review at McDermott. Phase 1 narrows the scope to **procurement contract review tracking** structured around **parallel review lanes**. Renewals, advanced reporting, and full reviewer-collaboration features are deferred.

- **Stack:** React 19 + TypeScript + Vite (web), .NET 10 ASP.NET Core + EF Core (API), Azure SQL, Entra ID, Key Vault, Application Insights, Azure Blob Storage.
- **Users:** Procurement team (4 named owners), firm staff and attorneys as Requesters, internal firm attorneys (Legal / GCO / InfoSec / Privacy) as Reviewers.
- **Not users:** external vendors and DocuSign envelopes — they're tracked as lanes, not authenticated identities.
- **Data sensitivity:** Confidential by default; Privileged for any contract routed through Legal / GCO; PII present (contacts, signers).
- **Hard rule (Tier 1 gate):** in-app access only — role / ownership / assignment. **No external client-matter / ethical-wall lookups.**

---

## 2. Parallel review lanes — the core data model

Every contract has up to **9 lanes**. Each lane carries its own status, owner, due date, last-updated timestamp, and note.

| Lane | Type | Default at intake |
|---|---|---|
| Procurement | Internal | **In review** |
| Legal | Internal | Not started |
| InfoSec | Internal | Not started |
| Privacy | Internal | Not started |
| GCO | Internal | Not started |
| Vendor | External | Not started |
| Requester | External (firm staff via email) | Not started |
| Signature | External (DocuSign envelope) | Not started |
| Filed | Internal | Not started |

### Lane status enum

`not_started | in_review | waiting | approved | canceled | na | complete`

### "Active" definition — canonical

A lane counts as **active** only when its status is `in_review` or `waiting`. Across every counter (My dashboard tiles, Master view summaries, Reports KPIs, contract row pills), `not_started`, `approved`, `complete`, `canceled`, and `na` are NOT counted active.

### Overall contract status

`active | completed | canceled`. Procurement lane → `complete` flips overallStatus → `completed`, which removes the contract from active dashboards and moves it to Archive.

### Priority enum

`low | medium | high | critical`. Default `medium`. Set on intake; editable by Procurement owner.

---

## 3. Screens (the prototype's surface area)

### 3.1 My dashboard
Filtered to contracts where the signed-in Procurement owner has an active lane. KPI tiles for action-needed counts; table of contracts with lane status pills and next-action due dates. Overdue items visually flagged.

### 3.2 Master view
Every active contract across all owners. Same row shape as My dashboard; owner column visible; sort by priority / next-action / category.

### 3.3 Contract detail
- **Status banner** at the top: "This tracks that review is happening — it does not replace the firm's existing risk-review process."
- **"Send reminder"** button at the top right (external lanes only — vendor / requester / signature).
- **Lanes panel** collapsed to **Procurement only** by default with a "Show N other lanes" toggle. Each lane row shows owner, status pill, due date, last updated, and an "Update" affordance.
- **Right rail** with key facts (requester, value, vendor, parent event for Event contracts).
- **Activity log** below — chronological entries for status changes, reminders sent, notes added.
- **Attachments** — basic file list (upload / list / download / delete), no document processing.

### 3.4 Intake — category chooser
Procurement Requester picks Event / Facilities / IT. Categories are data-driven (admin schema), not hardcoded.

### 3.5 Intake — Event / Facilities / IT forms
Each category has its own form with category-specific fields and a **Review-routing preview** panel:

> "On submission, Procurement starts as **In review**. The other lanes stay **Not started** until the Procurement owner activates them."

The preview lists Procurement (with "In review" pill) and each applicable lane (Legal, GCO, plus InfoSec / Privacy if triggered by IT flags) with a "Not started" pill.

### 3.6 Vendors
Master list with search, sort, filter by preferred status. Clicking a vendor opens a **summary modal** (not a separate page).

### 3.7 My submissions
A Requester-mode view that shows contracts the signed-in user submitted, with status visibility and a comments affordance.

### 3.8 Bulk upload
Four mutually-exclusive flows:
1. **File drop** — `.xlsx` drag-and-drop.
2. **Paste** — TSV / CSV from clipboard.
3. **Type** — inline editor with live row validation.
4. **Manual entry** — single-row form (same fields as intake).

All flows produce an editable preview with per-row validation + vendor de-dup matching + a confirm-and-commit step. A failed row does not fail the batch.

### 3.9 Reports
KPI tiles:
- **Contracts reviewed YTD** — "Across all owners"
- **My reviewed YTD** — current user's count
- **Active right now** — no sub-label
- **My active** — current user's name
- **Completed YTD**
- **Canceled YTD**

Plus horizontal bar series: Active by category (Event / Facilities / IT), Active by procurement owner (4 names), All-time totals by category.

### 3.10 Completed / Canceled (Archive)
Contracts with `overallStatus` ∈ {`completed`, `canceled`}. Searchable. Soft-deleted contracts are filtered out.

### 3.11 Categories & fields (admin)
Schema editor: list of categories and their field sets. Adding a category does not require a code change. Phase 1 ships with Event / Facilities / IT pre-populated.

---

## 4. Key behaviors (non-obvious things that must be right)

| Behavior | Rule |
|---|---|
| **Active counting** | `in_review` or `waiting` only. Everything else is non-active. |
| **Procurement-complete closes contract** | Procurement lane → `complete` → contract overallStatus → `completed` → drops from active dashboards → in Archive. |
| **Initial review routing copy** | Procurement starts `In review`; every other lane starts `Not started`. The intake "Review routing" panel must communicate this. |
| **Send reminder** | Top-of-detail button only — NO bell icons in lane rows. Modal restricted to open external lanes (vendor / requester / signature). For the Requester lane, the modal shows the requester's email (derived from `requesterEmailFrom(name)`). |
| **Lane panel default** | Procurement-only with a "Show N other lanes" toggle. |
| **Vendor surface** | Summary modal, never a separate detail page. |
| **External reviewers aren't users** | Vendor + DocuSign signature lanes don't authenticate. The Requester IS a user. |
| **Categories are data-driven** | Admin schema; no hardcoded category logic. |
| **Risk-review banner** | Persistent on every contract detail. |
| **Bulk upload** | Four flows; failed rows isolated; preview before commit. |
| **Priority** | `low | medium | high | critical`. Default `medium`. Critical = saturated `--color-error`, High = `--color-pale-orange`, Medium = `--color-pale-gold`, Low = transparent + 1px border. |
| **Soft-delete only** | No hard-delete path. Retention in perpetuity. |
| **Logging** | Pseudonymous `UserId` (Entra `oid`) + `OperationId` only — never contract content, vendor terms, note bodies, or PII. |

---

## 5. Bulk upload data schema (one-time legacy migration)

`Contracts` sheet — ~29 columns covering the union of Event / Facilities / IT fields. Sample seed at `artifacts/docs/product/sample-data/contracts-seed-data.xlsx` (31 contracts, 23 vendors, 15 users).

Required columns:
- `ContractId` (`CN-YYYY-NNNN`)
- `ContractName`
- `Category` (`Event` | `Facilities` | `IT`)
- `RequesterName`, `RequesterEmail`
- `VendorName` (de-duped against the `Vendors` sheet on import)
- `ProcurementOwner` (one of the four named owners)
- `Priority` (`low | medium | high | critical`)
- `TotalCost` (USD)
- `SubmittedDate`, `LastActionDate`

Optional / category-specific columns:
- Event: `EventDate`, `VenueLocation`, `ParentEvent`
- Facilities: `Building`
- IT: `ITType`, `AccessesPersonalData`, `AccessesPHI`, `UsesAI`, plus structured IT details (`ApplicationVersion`, `SystemAccess`, `Permissions`, `Integrations`)
- All: `TermStartDate`, `TermEndDate`, `Notes`, `LegacyStatus` (mapped to lane states on import)

Sheets: `Contracts`, `Vendors`, `Users`.

---

## 6. Acceptance criteria (QA contract)

Every item below is testable. QA's plan covers each.

1. Intake form blocks submit on any missing required field per category.
2. Intake routing-preview panel shows Procurement "In review" + every other applicable lane "Not started" per category.
3. On submission, Procurement lane = `In review`, all other lanes = `Not started`.
4. "Active" counters across dashboards / reports / row summaries include only `in_review` + `waiting`.
5. Setting Procurement lane → `complete` flips overallStatus → `completed`, removes from active dashboards, places in Archive (searchable).
6. Lane panel on contract detail shows Procurement only by default with a "Show N other lanes" toggle.
7. "Send reminder" modal lists only open vendor / requester / signature lanes. Requester target shows the requester's email.
8. No bell icons in lane rows. Only the top-of-detail "Send reminder" surface.
9. Bulk upload exposes four flows (file drop / paste / type / manual). Each validates inline; failed rows don't fail the batch.
10. Reports KPIs: Contracts reviewed YTD (all owners) + My reviewed YTD + Active right now (no sub-label) + My active + Completed YTD + Canceled YTD; plus bars for active-by-category and active-by-procurement-owner.
11. Categories & Fields admin lists Event / Facilities / IT and their field sets from data, not hardcoded.
12. Persistent risk-review banner on every contract detail.
13. Vendor surface is a summary modal, not a separate detail page.
14. Priority enum is `low | medium | high | critical`, default `medium`.
15. Soft-delete only — no hard-delete API surface.
16. Audit log captures every read/write with pseudonymous `UserId` + `OperationId`; never contract content.
17. Role permissions:
    - **Procurement** — full edit / assign / status control on every lane.
    - **Requester** — read-mostly on their own submissions; can add comments and attach supporting documents; cannot edit fields or change lane status.
    - **Attorney Reviewer** — comment-and-attach on the contracts they're assigned to; cannot reassign or change status.
18. Tier 1 universal guardrails per the firm's CLAUDE.md hold: never log PII, never expose stack traces, never hard-code secrets, ProblemDetails errors only, ownership violations return 403 (not 404), every async method passes `CancellationToken`.

---

## 7. Constraints & explicit non-goals

**Phase 1 will NOT:**
- Replace the firm's existing risk-review process. Phase 1 tracks *that* review is happening per lane; it does not host the legal commentary or risk-assessment work product.
- Process documents (no extraction, OCR, embeddings, vector search, RAG). Basic Blob attachments only per `api-blob-attachments.md`.
- Integrate with iManage or SpendConnect — deferred to a later phase, but the data model and document handling must permit those integrations to be added additively.
- Track software license entitlements.
- Treat the vendor or DocuSign envelope as authenticated users.
- Surface a separate vendor detail page (summary modal only).
- Allow Attorney Reviewers to change lane status or reassign contracts.
- Hard-delete any contract or vendor record.
- Auto-execute any external-obligation action (e.g., sending a contract to a vendor) without explicit Procurement confirmation.
- Send outbound email in production without confirming the firm's preferred channel (Graph mail send vs. SMTP — build-time decision).

---

## 8. Approved integrations (Phase 1)

- Entra ID (single-tenant)
- Azure SQL
- Azure Blob Storage (attachments only, no processing)
- Azure Key Vault
- Application Insights

Deferred to later phases: iManage, SpendConnect, outbound email service.

---

## 9. How to use this with the firm's skill pipeline

Run the skills in this order in a fresh Claude Code session at the project root:

1. **`/requirements-ship`** — auto-invoked by `/plan` Step 0; publishes this brief to `dev` after a secret/PII scan. The analyst does not run it directly.
2. **`/plan`** — produces `artifacts/docs/dev/plan.md` (data model, API contracts, UI sketch) and `artifacts/docs/dev/decisions.md` (ADR log). Hard-stops if external client-matter access is implied.
3. **`/build`** — single-pass end-to-end implementation (DB migrations + API + Web + tests). Pauses only on architectural decisions that need developer input.
4. **`/review`** — full review-and-remediate loop. OWASP A01–A10, Pre-Impl checklist, design conformance gates.
5. **`/ship`** — verifies the review cache and merges into `dev`.

**Reference documents this brief assumes are in place at the project root:**
- `CLAUDE.md` — Tier 1 framework constitution.
- `.claude/rules/dev/_core-requirements.md` — engineering standards.
- `.claude/rules/design/_core-requirements.md` — McDermott design system constitution.
- `artifacts/docs/product/sample-data/contracts-seed-data.xlsx` — 31 contracts, 23 vendors, 15 users for build + QA.
- `artifacts/demo/Contract-Manager-Demo.html` — the approved Phase 1 prototype (read-only reference for layout, hierarchy, lane interactions).
- `artifacts/docs/product/screenshots/` — screen images per route + key modal states.

---

## 10. The 4 Procurement owners (seed data)

Used everywhere a "Procurement owner" appears.

| Initials | Name | Tone | Notes |
|---|---|---|---|
| LF | Lisa Farkas | 1 (blue) | The signed-in user in the prototype demos |
| MW | Marcus Webb | 2 (magenta) | |
| LP | Lauren Pike | 3 (gold) | |
| TR | Tom Reyes | 4 (teal) | |

These are placeholder names for the Phase 1 prototype; the real Procurement team roster is configured at deploy via the Categories & Fields / Users admin.

---

*Generated 2026-06-22 from `solution-requirements.md` v2.0 at the end of the prototype-approved checkpoint.*
