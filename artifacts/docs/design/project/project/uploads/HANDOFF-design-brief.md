# Contract Manager — Claude Design Handoff Brief

## How to use this brief

This brief describes a small slice of a larger product. Onboard the **McDermott design system** before pasting this. Then paste this entire brief **once** at the start of the session. After that, **build one screen per turn** in the order listed below — ask Claude Design to build screen 1 first and stop. Review it, then ask for screen 2, and so on. Each screen should reuse the patterns the previous one established (shell, navigation, status pill style, table density, form chrome). Don't ask for multiple screens in one turn.

---

## Anchor

- **Product:** Contract Manager — an internal web platform the firm's Procurement team uses to manage the full contract lifecycle (intake → review → signature → filing → expiration / termination) across three contract categories: Event, Facilities, and IT.
- **Primary user:** Lisa Farkas (Procurement) running Monday-morning triage. The prototype walks her path: scan the dashboard, open a contract, review a vendor, see how a new IT contract gets submitted, and bulk-upload the legacy spreadsheet at go-live.
- **Audience:** Internal firm users. **Procurement** is the primary power user. **Attorney Reviewers** (Privacy, InfoSec, GCO, Litigation, Corporate) and **Requesters** (firm staff and attorneys) are secondary roles — they have constrained variants of the same screens that are not in this prototype.
- **Tone:** Professional and dense. Procurement is a power-user surface where many contracts are managed at once — information density matters more than whitespace. Restrained McDermott aesthetic — pale fills, navy text, status pills not loud colors.
- **Platform:** Web. Desktop is the primary viewport. Mobile responsive per the McDermott design system — but Procurement and Bulk Upload screens are dense workspaces that demand editorial decisions for narrow viewports (not naive scaling).
- **Data and auth in the prototype:** Use realistic seeded data. **No sign-in screen — assume the user is signed in as Lisa Farkas** and lands directly on the dashboard.

## Design system

Adhere to the onboarded **McDermott design system** as the source of truth for components, tokens, typography, spacing, status badges, alerts, sidebar / top-bar shell, forms, tables, and disclosure surfaces. Every design decision is guided by it. Use the application lockup pattern in the sidebar header (symbol + divider + product name "Contract Manager"). If a pattern isn't covered by the system, default to the lightest treatment that makes the meaning clear.

## Larger product (context only — do not build)

This prototype shows 5 screens of a larger product. The full product also includes: sign-in (Entra ID redirect), Event Intake Form, Facilities Intake Form, a category-picker before any intake form, Vendor Detail, an Archive view of completed / canceled / expired / terminated contracts, a Renewal Report, role-restricted variants of the Contract Detail screen (Requester view with read-only + comment, Attorney Reviewer view with comment + attach), separate worklists for Requesters ("My Submitted Contracts") and Attorney Reviewers ("My Assigned Contracts"), a Reminder Configuration settings surface, and a User Profile / Settings page. **These exist so the prototype reflects a real larger product — but do not build them in this session.** If a link in the sidebar or top nav refers to one of these (e.g., "Archive", "Renewal Report", "Settings"), it can appear as a navigation entry but the target screen is out of scope.

## Less is more

Prefer the minimal set of components needed to serve each screen's purpose. **No optional metadata, secondary controls, decorative chrome, or "kitchen sink" toolbars.** If a control isn't core to the screen's purpose as described below, leave it out. McDermott's aesthetic emerges from restraint — generic-enterprise-AI density is the wrong direction.

---

## Prototype screens (build in this order)

1. **S2 — Procurement Dashboard (Active Contracts)**
2. **S3 — Contract Detail (Procurement view)** ★
3. **S5 — IT Intake Form** ★
4. **S8 — Vendor Master List**
5. **S12 — Bulk Upload — Preview & Fix** ★

★ = highest design uncertainty; these most need feedback before the rest of the product is built.

**Build screen 1 first and wait for review.** Then I'll ask for screen 2, then 3, and so on.

---

## S2 — Procurement Dashboard (Active Contracts)

**Purpose:** A Procurement team member's daily landing surface — see every active contract in one place, who's reviewing it, what stage it's at, and what needs attention today. The screen answers "what's on my plate this morning?" at a glance.

**Primary action:** Click into any contract row to open its full record.

**Link onward:** Opens the Contract Detail screen (S3) for the clicked contract. The sidebar also lets Lisa jump to the Vendor Master, kick off a new contract intake, or start a bulk upload — those are entry points to the other prototype screens.

---

## S3 — Contract Detail (Procurement view) ★

**Purpose:** Everything about a single contract on one surface — its intake fields, its current position in the review workflow, attached documents with version history, internal comments from reviewers, and a chronological log of every system notification on the record. Procurement does the actual work of managing a contract here.

**Primary action:** Move the contract forward — change its status, add a comment, attach a document, or reassign the reviewer. (Status / reassign / edit controls are visible because this is the Procurement view; other roles see this same record without those controls — but that variant is not in the prototype.)

**Link onward:** Back to the dashboard (S2). The vendor name on this record links onward to the Vendor Detail screen (out of prototype scope — leave it as a link but the target is described in the blueprint).

---

## S5 — IT Intake Form ★

**Purpose:** A Requester submitting a software or professional-services contract for review — the form captures everything Procurement needs to start review without back-and-forth, including the IT-specific risk-review attributes (whether the contract / system accesses personal data, accesses PHI, or uses AI). This is the most complex of the three intake forms (Event and Facilities follow the same pattern with their own fields, but those are out of prototype scope).

**Primary action:** Submit the contract for Procurement review. The form blocks submission until every required field for the chosen IT type (Software vs. Professional Services) is filled.

**Link onward:** On successful submit, the new contract appears on the Procurement Dashboard (S2) with status "In process."

---

## S8 — Vendor Master List

**Purpose:** Procurement's single source of truth for every vendor the firm works with — including the attribute that drives critical workflow decisions (Preferred / Standard / Difficult / Blacklisted) and basic contact info. Lisa uses this to spot vendor concerns before agreeing to terms, and to avoid duplicate vendor records when new contracts come in.

**Primary action:** Open a vendor record to see its full history and contacts. (The Vendor Detail screen itself is out of prototype scope — link to it but don't build the target.)

**Link onward:** Back to the dashboard (S2) via sidebar nav.

---

## S12 — Bulk Upload — Preview & Fix ★

**Purpose:** At go-live, Procurement uploads the legacy contracts spreadsheet from SpendConnect to seed the system. The preview pane shows what will be imported, separates valid rows from rows with per-cell errors, and lets Procurement fix flagged rows inline or skip them before committing. This is genuinely novel UX — most "import" flows hide the messy reality; this one surfaces it.

**Primary action:** Review the preview, resolve flagged rows (fix inline or skip), then confirm import.

**Link onward:** On commit, the imported contracts appear on the dashboard (S2).

---

## Scope guardrail

- **One direction per screen.** Build a single confident answer per screen — no variant exploration in this session.
- **No extra screens.** If a sidebar link or row action would lead to a screen not in the list above, leave the link visible but don't build the target. Refer to the "Larger product (context only)" paragraph above if you need to understand the broader context.
- **No invented features.** If something isn't described in this brief, don't add it.
- **Stop after each screen** for review before moving to the next.
