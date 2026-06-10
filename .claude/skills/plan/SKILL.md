---
name: plan
description: Plan a Tier 1 application from a requirements doc. Produces two artefacts under artifacts/docs/dev/ — plan.md (data model, API contracts, UI sketch) and decisions.md (ADR-style log doubling as the compliance audit trail). Hard-stops when the design implies external client-matter / ethical-wall access.
---

# /plan — Step 1 of 2

Reads the requirements doc and produces **two** planning artefacts: `plan.md` and `decisions.md`. **No code is written.** Target time: 30–45 min for a small Tier 1 app.

The requirements doc is **always** `artifacts/docs/product/solution-requirements.md` — the Analyst's solution-requirements deliverable from `/requirements-gathering`. It is the authoritative input; do not accept ad-hoc paths or pasted requirements in its place. **Step 0 below publishes this brief to `dev`** (after a secret/PII scan) before any planning begins, so this skill's workspace — branched off `dev` — already has it. The Analyst runs only `/requirements-gathering` then `/plan`; `/plan` handles publishing the brief for them.

## Step 0 — Publish the requirements brief to `dev`

Before creating the workspace, make sure the finalized requirements brief is on `dev` — that is what makes it available to this skill's `dev`-branched workspace.

**Invoke `/requirements-ship`.** It locates the completed brief, scans it (secrets/PII), and publishes it to `dev`. It is **idempotent**: if `dev` already has the current brief (a `/plan` re-run, or a bug-fix/feature on an already-shipped app), it does nothing. The Analyst does not run `/requirements-ship` themselves — `/plan` runs it for them.

- If `/requirements-ship` publishes (or confirms) the brief on `dev` → **continue to the Workspace section below.** Do not stop here.
- If `/requirements-ship` **STOPs** because there is no completed brief (missing, or still the blank template, or unresolved `[PENDING]` sections) → relay its message (run `/requirements-gathering` first) and **STOP** `/plan` too. Do not create a workspace without a brief.
- If `/requirements-ship` **STOPs** on a Critical/High secret/PII finding → relay it and **STOP**. The brief must be cleaned before planning.

This is the **only** point where `/plan` writes to `dev`. Everything after this produces artefacts inside the workspace, uncommitted, until `/ship`.

## Workspace — shared across the build flow

`/plan`, `/build`, and `/ship` all operate against a **shared workspace** branched off `dev` at the start of `/plan`. This is a deliberate exception to the CLAUDE.md "derive a kebab-case name from the user's request" rule for the integration-branch guard.

Before any Edit/Write/NotebookEdit in this skill, ask for the shared workspace by its fixed name:

```bash
WT=$(bash .claude/hooks/begin-change.sh --type build initial-build)
```

`begin-change.sh` is idempotent on name, so when `/build` and `/ship` later run the same command, they continue in the same workspace and see this skill's `plan.md` and `decisions.md` (both under `$WT/artifacts/docs/dev/`). **No build work is committed until the analyst runs `/ship`** at the end of the build — that final ship lands the planning artefacts + scaffold + implementation on `dev` as one merge commit. (The requirements brief is the one exception: Step 0 above already published it to `dev` via `/requirements-ship` — that's why this workspace, branched off `dev`, already has it. `/ship` and `/requirements-ship` are the only commands that commit.)

Issue every Edit/Write in this skill against paths inside `$WT`. The "project root" referred to throughout this skill means `$WT/`, not the actual `dev`-branch project root. Both planning artefacts produced by this skill live under `$WT/artifacts/docs/dev/`.

If `begin-change.sh` reports the project is missing `dev` or has uncommitted edits on `dev`, **STOP** and report in plain English — that is a setup issue the analyst can't fix mid-flow.

## Session-start protocol

Read these once at session start, in parallel:

1. `CLAUDE.md`
2. `.claude/profile.json`
3. `.claude/rules/dev/_core-requirements.md`
4. The full set of `.claude/rules/dev/{api-*,web-*,database-*}.md` files (rule-file-index in `_core-requirements.md` points to them).
5. `artifacts/docs/product/solution-requirements.md` — the requirements doc. Required.
6. `artifacts/docs/design/` — the Claude Design handoff. If a bundle has been dropped here (see step 2 for how to detect it), read the handoff contract at .claude/rules/design/README.md first, then the project folder to understand screens, layout, hierarchy, states, and intended behaviour. Also read full-design-blueprint.md if present — it is the canonical full screen map and holds the deferred-screen specs (the screens the prototype does not cover). The repo design system (.claude/rules/design/_core-requirements.md + companions) stays the single source of truth for tokens and component styling — the HTML is a rendering, not the spec.

Treat them as in-context after the first read. Do not re-read mid-session.

## Steps

### 1. Confirm the Tier 1 gate

Walk every gate in `CLAUDE.md`:

- Named group of ≤ ~100 concurrent firm users?
- Single-tenant Entra ID + app roles for authorization?
- **Does row visibility come from external client-matter / ethical-wall membership?** — if YES, **STOP**. This is the wrong framework. Print: _"External client-matter access is out of scope for Tier 1. Stop and escalate to the AI Solutions Lead — a different framework (matter-team membership) is required. The plan will not be produced."_ In-app access (role, ownership, role-scope, admin assignment) is in scope — see `api-record-access.md`.
- Hosted on Azure App Service + Azure SQL?
- No document **processing** (extraction / search / RAG), no workers, no external audience? (Basic file attachments — Blob upload/download, no processing — are fine; see `api-blob-attachments.md`.)

If any gate is "no" or "unclear" beyond the matter gate, surface it and ask the developer for confirmation before continuing. Never adapt the plan to bypass a gate.

### 2. Read the requirements doc

Read `artifacts/docs/product/solution-requirements.md` in full. Don't skim — every section of the plan must trace back to a section of this file. If any required section is `[PENDING]` or missing, **STOP** and ask the Analyst to complete it before continuing.

Then detect a **Claude Design handoff** — **do not eyeball this.** Glancing at one file inside `artifacts/docs/design/` (e.g. opening only `project/research/requirements.txt`) and concluding "no design" is a known, costly mistake. Run the deterministic detector instead:

```bash
bash .claude/hooks/detect-design-handoff.sh
```

If it prints **`DESIGN-HANDOFF: PRESENT`**, a bundle exists and you **MUST** implement against it — read the handoff contract at `.claude/rules/design/README.md`, then the project folder + token CSS, and let it drive the UI sketch (§4): every screen, state, and component the design shows must appear there, named to match. The repo design system stays the source of truth for tokens and styling; the HTML is a rendering, not the spec — never copy tokens, colours, or spacing out of it. **Recording "no handoff present" in `plan.md` while the detector prints PRESENT is a hard error** — stop and re-do the detection.

If it prints **`DESIGN-HANDOFF: ABSENT`** (only the CLI baseline, or only the CLI baseline plus `/design-foundation`'s outputs), the handoff is **optional — continue the build.** But absence of a handoff is **never** a licence to free-build or invent tokens: the UI is still built to the **repo design system**, which is always binding — `.claude/rules/design/_core-requirements.md` and its companions govern every colour, token, radius, and component whether or not a handoff exists. A handoff, when present, is an *additional* screen-level spec layered on top of those rules; when absent, the rules alone drive the UI sketch (§4). (`/review` enforces this via `check-design-conformance.sh` regardless of handoff presence.) Optionally let the Analyst know they can drop a Claude Design bundle into `artifacts/docs/design/` and re-run `/plan` for a tighter screen-level spec.
**The prototype is only the demo half — plan the whole product.** Whenever `full-design-blueprint.md` is present, the bundle HTML (if any) covers only the prototyped screens; the blueprint's screen map and **deferred-screen** section describe the rest of the product (admin, settings, billing, notifications, reporting, etc.). Account for **every** deferred screen: each is either planned in full (§4 UI, plus its data model in §2, endpoints in §3, and role in §5) or listed in §7 Out of scope with a one-line reason — never silently dropped. Derive contracts from the blueprint's plain-language specs (purpose, content, business rules, role/access, connects-to); the blueprint intentionally carries no schemas, endpoints, or components — those are yours to design. `/plan` is Tier 1 (small, bounded), so do not reflexively pull in the entire deferred set — decide screen by screen, keep the build within the Tier 1 gate, and record borderline calls in §8.

### 3. Produce `plan.md`

Single artefact at `$WT/artifacts/docs/dev/plan.md`. Ensure the `artifacts/docs/dev/` folder exists (create it if missing) before writing. Required sections, in this order:

```markdown
# <App Name> — Tier 1 Plan

**Sensitivity:** <Internal Only / Employee PII / Client Matter>
**Users:** <named group; expected peak concurrency — default 100>
**Stack:** React 19 + TS + Vite (web); ASP.NET Core 10 controllers + EF Core + Microsoft.Identity.Web (api); SQL Server (db); Azure App Service + Azure SQL hosting.
**Time budget:** ~4–6 focused hours

## 1. Tier 1 gate confirmation

- [ ] Named group of ≤ ~100 concurrent firm users: <description>
- [ ] Single-tenant Entra, app roles for authorization: <roles list, e.g. Reader / Editor / Admin>
- [ ] Row access is app-managed (role / ownership / role-scope / assignment), not external client-matter membership: <one-line confirmation>
- [ ] Azure App Service + Azure SQL hosting: <confirmation>
- [ ] No doc **processing** / workers / vector search / external audience (basic file attachments OK): <confirmation>

## 2. Data model
## 2. Data model
If `full-design-blueprint.md` is present, include the entities its in-scope deferred screens imply (from their content + business rules), not only the prototyped screens'.

For each entity:

- C# class snippet (incl. mandatory 6 audit columns: `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`, `IsDeleted`, `DeletedAt`).
- Index list (every FK + every column you'll filter/sort on frequently).
- Soft-delete: yes by default.
- Note any unique-constraint or check-constraint needed.

## 3. API contracts
If `full-design-blueprint.md` is present, add the endpoints in-scope deferred screens need (derived from their business rules and connects-to), not only the prototyped screens'.

Table per resource:

| Method | Path            | Auth        | Body  | Returns        | Notes                 |
| ------ | --------------- | ----------- | ----- | -------------- | --------------------- |
| GET    | /health/live    | anon        | —     | 200 `{status}` | liveness — no DB call |
| GET    | /health/ready   | anon        | —     | 200 / 503      | DB ping               |
| GET    | /api/<resource> | Role=Reader | —     | 200 list       | paginated             |
| POST   | /api/<resource> | Role=Editor | <DTO> | 201            | validation            |
| ...    | ...             | ...         | ...   | ...            | ...                   |

State the `[Authorize(Roles="...")]` model up front (Reader / Editor / Admin or similar).

State error contract: RFC 7807 ProblemDetails. Ownership/role violations → 403.

## 4. UI sketch

One short paragraph per screen. List required components (rough names, not full specs). Note non-trivial UX choices. Identify which app role each screen requires.

If a Claude Design handoff is present in `artifacts/docs/design/`, **every in-scope screen must appear here — both halves of the product:**
- **Prototyped screens** — walk the bundle's HTML screen by screen; every screen, state, and component the design shows must appear, named to match. Capture what the design shows; do not redesign its layout.
- **Deferred screens** (from `full-design-blueprint.md`) — one short paragraph each from the blueprint's per-screen spec (purpose, content, role, connects-to). These have no HTML; the blueprint is their source.
Tag each screen **[prototyped]** or **[deferred]**, and put any deferred screen you are *not* building in §7. Note at the top of the sketch: _"Claude Design handoff present — `/build` implements every in-scope screen against it (prototyped screens from the design's HTML, deferred screens from the blueprint; tokens and styling from the repo design system)."_

## 5. Auth + observability plan

- **Entra app registration:** single-tenant. App roles: <list>. App roles must cover in-scope deferred screens too — use the blueprint's role/access matrix to set their `[Authorize(Roles="…")]` model.
- **MSAL config:** authority, clientId, redirect URI (one paragraph; values go to .env / Key Vault).
- **User provisioning:** `EnsureUserMiddleware` upserts on first auth.
- **Logging:** Serilog → Console + App Insights. `UserId` (`oid`) + `OperationId` on every log entry.
- **Telemetry events to capture:** one short list of business events (login, primary-action invocations) — five or fewer.

## 6. Security plan

For each OWASP A0x category, one line on the app's surface area:

- A01 Broken access control — <how this app handles it: role checks on every endpoint + ownership in services>
- A02 Cryptographic failures — <secrets in Key Vault; TLS via App Service>
- A03 Injection — <EF Core LINQ everywhere; no `FromSqlRaw` with concatenation>
- A04 Insecure design — <one line>
- A05 Security misconfig — <CSP / X-Frame-Options / nosniff; HTTPS redirect>
- A06 Vulnerable components — <SonarCloud scan in CI>
- A07 Identification/auth — <Microsoft.Identity.Web>
- A08 Software / data integrity — <Key Vault + Managed Identity>
- A09 Logging / monitoring — <Serilog + App Insights + OperationId>
- A10 SSRF — <no outbound user-controlled URLs unless documented here>

## 7. Out of scope

Bullet list — what this build does NOT do. Include Tier 1 hard limits (no doc **processing**, no workers, no external client-matter access, no external audience) plus spec-driven exclusions.

## 8. Open questions

Items the developer needs to confirm during build. Keep short.
```

### 4. Produce `decisions.md` (compliance audit trail)

Single artefact at `$WT/artifacts/docs/dev/decisions.md`. This file is the **architectural decision log** for this project and the compliance audit trail in lieu of the firm Tier 1+ 7-doc set. Seed it with the Tier 1-default deviations now; append one entry per non-obvious decision during /build.

```markdown
# <App Name> — Architectural Decisions Log

This file records every non-obvious architectural decision made on this project. It is the compliance audit trail; reviewers will read it.

Format: one entry per decision, ADR-lite (≈ 5 lines each).

---

## ADR-001 — Coverage gate: behavior-floor, not 80% line/branch

**Date:** <today>
**Status:** Accepted (framework default)
**Context:** Firm Tier 1+ standard mandates 80% coverage gate on web (jest-axe per component) and CI-level enforcement.
**Decision:** Tier 1 runs behavior-floor coverage — every behavior listed in `_core-requirements.md` Pre-Impl Checklist and the layer testing rules must be tested; coverage percentage is reported but not gated.
**Consequence:** Speed of iteration vs. compliance defensibility on coverage. If compliance asks, point them at the test list, not the percentage.

## ADR-002 — Frontend stack: Vite + Vitest + CSS Modules

**Date:** <today>
**Status:** Accepted (framework default)
**Context:** Firm Tier 1+ standard is webpack 5 + Jest + SCSS Modules.
**Decision:** Tier 1 uses Vite + Vitest + CSS Modules.
**Consequence:** Faster dev server, simpler config; documented deviation from firm rule files (web-testing.md, web-styling.md).

## ADR-003 — Planning artefacts: 2 docs, not 7

**Date:** <today>
**Status:** Accepted (framework default)
**Context:** Firm Tier 1+ produces 7 architecture docs as the compliance audit trail.
**Decision:** Tier 1 produces 2 docs — `plan.md` and `decisions.md`. The ADR-style `decisions.md` carries the compliance trail.
**Consequence:** Less ceremony; relies on disciplined ADR authorship during /build.

## ADR-004 — Security scanning baseline

**Date:** <today>
**Status:** Accepted (framework default)
**Context:** Firm Tier 1+ references Gitleaks + Dependabot + SonarQube as expected inputs to /remediation.
**Decision:** Tier 1 ships four scanners in CI by default (see `ci/build.yml`): SonarCloud SAST, Gitleaks secret-scan, `dotnet list package --vulnerable --include-transitive`, and `npm audit --audit-level=high`. Dependabot/Renovate is NOT pre-configured — add it per project if auto-PR triage is desired.
**Consequence:** Baseline catches committed secrets, vulnerable direct/transitive deps, and SAST patterns. No license-compliance, container, or CodeQL scanning by default; add as needed (e.g., privileged-content apps should add CodeQL).

## ADR-005 — Build process: 2 skills, single-pass build

**Date:** <today>
**Status:** Accepted (framework default)
**Context:** Firm Tier 1+ uses /build-architecture → /build-scaffold → /build-application, with incremental per-capability delivery.
**Decision:** Tier 1 collapses to /plan → /build. Scaffolding happens on first /build invocation; the same invocation implements the entire application end-to-end. The build pauses only when an architectural decision needs developer input (new dependency, new pattern, new third-party service).
**Consequence:** No separate scaffold-gate review and no intermediate reviews — `/review` is the single build-completion gate that catches structural issues. Suits internal apps at Tier 1's bounded scope; not appropriate for projects large enough to need incremental delivery.

---

## App-specific decisions

(Add entries here as they arise during /build. Use ADR-NNN format starting from 006.)
```

### 5. Cross-check and stop

- Every requirement in the spec maps to a section of `plan.md`, an `out of scope` bullet, or an `open question`.
- No section bypasses the Tier 1 gate.
- Both files exist at `$WT/artifacts/docs/dev/plan.md` and `$WT/artifacts/docs/dev/decisions.md`.

Print:

- Files written (paths).
- Gate confirmation summary.
- Open questions awaiting developer confirmation.

Then **STOP** and prompt: _"Plan ready. Run `/build` to scaffold and implement the application. Or reply with corrections."_

## Do not

- Write code.
- Produce more than two planning artefacts.
- Plan around the external client-matter access gate — stop and escalate. (In-app access patterns are in scope; see `api-record-access.md`.)
- Plan features that pull in document **processing** (extraction / OCR / search / RAG), workers, vector search, or external-audience surface — those are out of scope; escalate. (Basic file attachments — Blob upload/download with no processing — are in scope; see `api-blob-attachments.md`.)
- Specify a coverage percentage gate or a documented exception that contradicts ADR-001 / ADR-004 — those defaults are the framework defaults; deviations need a new ADR entry, not a silent override.
