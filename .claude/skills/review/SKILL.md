---
name: review
description: Bounded 5-iteration review-and-remediate loop run at the end of /build (or auto-invoked by /ship on cache miss). Runs the full test suite, walks universal guardrails + Pre-Impl Checklist tiers, a layered per-layer code-review walk (web + api + database checklists), then a layered OWASP A01–A10 security audit (web + api + database checklists) with auto-remediation. Critical/High findings (code-review or security) block the clean status; Medium/Low are reported. Auto-applies mechanical fixes; surfaces architectural findings in one batched prompt per iteration. Writes artifacts/docs/dev/reviews/.last-clean-run.json on clean status so /ship can skip its own review.
---

# /review — Build-completion gate

Bounded loop — max 5 iterations. Run at the end of `/build` against the full diff inside the shared workspace (or auto-invoked by `/ship` when its review-cache is missing or stale). Each iteration walks **five gates in order**: tests, universal guardrails, the Pre-Impl Checklist, the layered per-layer code-review walk, and the layered OWASP A01–A10 security audit. Auto-fixes mechanical findings (code-review and security remediations). Surfaces architectural findings — code-quality and security together — in a single batched prompt per iteration. Exits early when status reaches `CLEAN`; stops at iteration 5 with `UNRESOLVED-CAP` if open Critical/High findings remain; stops earlier with `UNRESOLVED-STUCK` if an iteration produces no net progress. Writes `artifacts/docs/dev/reviews/.last-clean-run.json` only on `CLEAN` so the next `/ship` is fast.

## Workspace — shared across the build flow

`/plan` and `/build` already populated a shared workspace branched off `dev`. This skill continues in that same workspace. Before any Edit/Write/NotebookEdit:

```bash
WT=$(bash .claude/hooks/begin-change.sh --type build initial-build)
```

`begin-change.sh` is idempotent on name, so this call returns the same workspace `/plan` and `/build` used. Run every git command and every test command from inside `$WT` (use `git -C "$WT" …` and `cd "$WT"` for tooling that needs the right working directory). Write `artifacts/docs/dev/reviews/.last-clean-run.json` and every review-artefact file into `$WT/artifacts/docs/dev/reviews/`, not into the actual `dev`-branch project root. Ensure the `artifacts/docs/dev/reviews/` folder exists (create it if missing) before the first write.

If `$WT` is empty or missing the expected build output (`api/`, `web/`, `database/`), **STOP** and tell the analyst to run `/build` first.

## Session-start protocol

Read once, in parallel:

1. `CLAUDE.md`
2. `$WT/artifacts/docs/dev/plan.md`, `$WT/artifacts/docs/dev/decisions.md`
3. `.claude/rules/dev/_core-requirements.md`
4. Layer rule files covering the scoped changes (per rule-file-index in `_core-requirements.md`)
5. `.claude/rules/design/_core-requirements.md` for UI changes
6. **Code-review, security, and remediation logic for the layers in scope**:
   - Frontend files (`web/**`, `**/*.ts`, `**/*.tsx`, `**/*.css`) → `code-review-web.md` + `security-web.md` + `remediation-web.md`
   - API files (`api/**`, `**/*.cs`, `**/appsettings*.json`, `**/Dockerfile`) → `code-review-api.md` + `security-api.md` + `remediation-api.md`
   - Database files (`database/**`, `**/*.sql`) → `code-review-database.md` + `security-database.md` + `remediation-database.md`

   These nine files (under `.claude/skills/review/`) are the authoritative content for steps 5, 6, and 7 below.

## Severity and blocking policy

Every finding (mechanical or architectural) is classified by severity. The blocking policy determines whether the run can reach `CLEAN`:

| Severity     | What it is                                                                                                                                                                                                       | Effect on cache write                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Critical** | Security: actively exploitable vulnerability, exposed secret, credential leak, RCE vector, raw SQL concat with user input. Code-review: violations of universal guardrails surfaced again at code level (PII in logs, secrets in source, `eval`, raw SQL concat).                                                 | **Blocks** — must be Applied or rationale-Rejected before `CLEAN`.                       |
| **High**     | Security: XSS vectors, auth bypass, missing `[Authorize]`, ownership-violation returning 404, `dangerouslySetInnerHTML` without sanitization, tokens in `localStorage`, vulnerable NuGet/npm package with patch available. Code-review: missing `CancellationToken` on async API, controller doing business logic / direct DB access, default export in shared component, missing 6 audit columns on a new table. | **Blocks** — same as Critical.                                                           |
| **Medium**   | Security: missing security headers, weak defaults, CORS too permissive, missing rate limit, missing SRI. Code-review: prop drilling > 2 levels, missing `React.memo` + `useCallback` pair on list items, methods > 40 lines, non-SARGable WHERE clause.                                                                                            | **Does not block.** Auto-applied if mechanical; surfaced for awareness if architectural. |
| **Low**      | Best-practice / defense-in-depth improvements. Naming inconsistencies, missing constants for magic numbers, unused imports.                                                                                                                                                                   | **Does not block.** Reported only.                                                       |

Any **Critical or High** finding (code-review or security) that is not Applied or Rejected in the architectural prompt leaves the status as `OPEN` and prevents the cache file from being written.

## Iteration loop

Run iterations `1..MAX_ITERATIONS` (default 5). Each iteration is one complete pass of steps 1–8 below. After each iteration, evaluate the **stop conditions** before deciding to loop or exit.

**Per-iteration sequence:**

1. Steps 1–7 run as documented below — scope → tests → guardrails → Pre-Impl Checklist → code-review walk → OWASP audit → apply mechanical fixes.
2. Step 8 (architectural findings) only surfaces findings that aren't already Applied or Rejected in `artifacts/docs/dev/reviews/architectural-findings.md`. The analyst's decisions from prior iterations carry forward; previously-Rejected findings are silently skipped.
3. At the end of the iteration, evaluate stop conditions in this order:
   - **CLEAN** → all blocking conditions clear (per step 9's "what counts as CLEAN"). Exit loop. Run step 9 (cache write) and step 10 (summarise).
   - **UNRESOLVED-CAP** → current iteration == `MAX_ITERATIONS` (5) AND status is not CLEAN. Exit loop. Skip step 9. Run step 10 with status `UNRESOLVED-CAP`.
   - **UNRESOLVED-STUCK** → the set of open findings is the same as the previous iteration AND no mechanical fix was applied this iteration (no net progress). Exit loop. Skip step 9. Run step 10 with status `UNRESOLVED-STUCK`.
   - **Continue** → none of the above. Loop back to step 1.

`--max-iterations <n>` (rare) can override the default of 5; lower bound 1, no upper bound enforced but iteration 5 is the documented cap.

The cache file (step 9) is only written when the loop exits with `CLEAN`. `UNRESOLVED-*` outcomes leave the prior cache file untouched — they do not invalidate or rewrite it.

## Steps

> The numbered steps below describe a single iteration. The outer loop wraps steps 1–8; steps 9 and 10 run once after the loop exits.

### 1. Determine scope

Run `git -C "$WT" status --porcelain` + `git -C "$WT" diff --name-only` to identify files changed since the last clean run (or all uncommitted files if no `$WT/artifacts/docs/dev/reviews/.watermark.json`). Drop:

- `.claude/`, `artifacts/docs/dev/reviews/`, `prompts/` (tooling output)
- Lockfiles, `bin/`, `obj/`, `dist/`, `node_modules/`
- `artifacts/docs/dev/plan.md`, `artifacts/docs/dev/decisions.md` (planning artefacts — reviewed by content, not as code)

Scope set: `source_scope` = the rest. Identify the layers present (`web`, `api`, `database`) and load the matching pair of helper files per the session-start protocol. Stop with "Nothing to review" if `source_scope` is empty.

**Documentation-only commits.** If `source_scope` is non-empty but matches **no** code layer (`web`, `api`, `database`) — e.g. the diff is only the intake brief (`solution-requirements.md`), design exports (`artifacts/docs/**`, `*.html`, images), or other docs — do **not** treat it as "nothing to review." The layered code-review walk and the OWASP audit (steps 5–6) correctly have nothing to walk, but **content scanning still applies**. Run a **documentation review** instead of skipping:

- **Secret scan** — grep the changed docs for credential patterns: `api[_-]?key`, `secret`, `password\s*[=:]`, `token`, `connectionstring`, `sk-`, AWS/Azure key shapes, long hex/base64 blobs, bearer tokens, and embedded internal URLs.
- **PII / privileged-content scan** — flag client names, matter numbers/references, personal emails and phone/extension numbers, and anything classified above `Internal` per the project's `Sensitivity` field. (Critical for intake briefs — they're the highest-risk document in the flow.)
- A **Critical or High** finding here (e.g. a live-looking credential, or privileged client content in a doc destined for a shared branch) **blocks `CLEAN`**, exactly like a code finding. Mechanical removals (e.g. stripping a pasted secret, redacting a matter reference) auto-apply; judgement calls go to the architectural prompt (step 8).
- Then proceed to steps 9–10 normally. On `CLEAN`, the cache is written so `/ship` proceeds deterministically — no improvised skip.

**Tool-call budget for the code-review + security audit:** target ≤ 45 tool calls for steps 5 + 6 + 7 combined (15 per layered walk on average). The audit is a focused diff scan, not a full repo audit. If you find yourself reading files outside the diff "for context," stop and re-scope.

### 2. Run the test suite once

- `dotnet build` — must pass with zero warnings (warnings-as-errors). Stop if it doesn't.
- `dotnet test --nologo` — capture pass/fail counts. Stop if any test fails; print failures and ask developer.
- `npm run lint` in `web/` — zero errors required. Stop if not.
- `npm run format:check` in `web/` — zero errors required. Stop if not.
- `npx tsc --noEmit` in `web/` — zero errors required. Stop if not.
- `npx vitest run` in `web/` — capture pass/fail. Stop on failure.
- If `database/procedures/` has procs: run the tSQLt suite. Stop on failure.
- **Design conformance** (when `web/` is in scope) — `bash .claude/hooks/check-design-conformance.sh`. This is the design analogue of the OWASP pass: every colour and radius in component CSS must trace to a design token (`var(--...)`), radius is `2px` or `999px`. A **FAIL** lists off-token hex / off-spec radii and is a **blocking High finding** — it prevents `CLEAN` exactly like a Critical/High security finding (a green build with an off-design UI is the failure mode this gate exists to catch). Tests, lint, and build are blind to design fidelity; this gate is not.

Tier 1 does **not** gate on coverage percentages (deliberate deviation — see `decisions.md` ADR-001). It does check that every changed file has a test counterpart per `check-test-coverage.ps1` semantics; that check runs implicitly via the PreToolUse hook on `/ship`, but surface any gaps here as well.

For the "Always" tier check below: every behavior required by the Pre-Impl Checklist and the layer testing rules has a test (none deferred).

### 3. Walk the universal guardrails (from `CLAUDE.md`)

For each guardrail, grep the diff:

| #   | Guardrail                             | What to look for                                                                                                                                            |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | No user input in logs                 | `_logger.Log*` calls — verify they log IDs/counts only, not bodies/titles/notes                                                                             |
| 2   | No stack traces / internals to client | `Results.Problem`, `Results.BadRequest`, `Problem(...)` — check `detail` is plain-language                                                                  |
| 3   | No secrets in source                  | Grep diff for likely-secret patterns (`api_key`, `password`, `secret`, hex/base64 blobs); confirm `.env`, `appsettings.Development.json` are gitignored     |
| 4   | No raw SQL concat                     | Grep for `ExecuteSqlRaw`, `FromSqlRaw`, string interpolation in SQL — verify parameters                                                                     |
| 5   | No `eval` / dangerous innerHTML       | Grep `web/src` for `eval(`, `Function(`, `dangerouslySetInnerHTML`                                                                                          |
| 6   | HTTPS in production                   | `UseHttpsRedirection` present unless explicitly excluded for dev                                                                                            |
| 7   | Validation at boundary                | Every new controller endpoint has data annotations on DTOs or a manual check before service call                                                            |
| 8   | 403 not 404 on ownership              | Grep for `Results.NotFound()` in service / controller paths that handle resource lookup; verify ownership-failure path uses `Forbid()` / `Results.Forbid()` |
| 9   | CancellationToken everywhere          | Every new async method's signature ends with `CancellationToken ct` and passes it through                                                                   |

Any guardrail violation is at minimum **High** severity (the universal guardrails are non-negotiable per `CLAUDE.md`).

### 4. Walk the Pre-Impl Checklist tiers (from `_core-requirements.md`)

For each tier touched by the diff:

- **Always:** every limit/threshold from a rule file? tests shipped alongside their code (not deferred)?
- **Code:** PII not logged? CancellationToken passed?
- **API endpoint:** `[Authorize(Roles="...")]` applied? ProblemDetails on errors? 403 not 404? `Cache-Control: private, no-store` default?
- **API service:** interface + impl + DI registration? happy / permanent-failure / cancellation tests?
- **Web component:** axe assertion on form-bearing components? every meaningful rendered state tested?
- **Web hook:** all dispatch actions tested?
- **Database table:** 6 audit columns + soft delete + indexes + idempotent migration + rollback?
- **Stored procedure:** tSQLt class covering happy / NULL / error?

For each item, mark Pass / Fail and reference the file + line.

### 5. Layered code-review walk

For each layer in scope, walk the loaded code-review checklist file end-to-end against the diff:

- **Web** → walk every section in `code-review-web.md` against the changed frontend files. The file is reference-based — it points to `web-coding-standards.md`, `web-component-architecture.md`, `web-styling.md`, `web-state-management.md`, `web-testing.md`, `web-performance.md`, `web-persistence.md`, `web-dependency-security.md`, `web-browser-support.md`, `web-file-structure.md`, `web-linting-formatting.md`, and the design rules. For each changed file, verify rule compliance against the rules pointed to.
- **API** → walk every section in `code-review-api.md` against the changed `.cs` / config / `Program.cs` files. The file is self-contained — it spells out API standards, error responses, pagination, validation, cancellation tokens, naming, DI, configuration, logging, defensive coding, code quality, and testing rules inline.
- **Database** → walk every section in `code-review-database.md` against the changed `.sql` / migration files. Self-contained — naming, data types, schema design, query standards, indexing, stored-procedure standards, migration standards, data integrity, views, bulk operations, tSQLt testing rules inline.

For each potential finding, apply the in-scope / out-of-scope filter:

- **In scope:** issues that map to the layer's coding-standards rule files (web) or the inline checklist sections (api, database) — naming, architecture, code quality, type discipline, performance patterns, memory/resource lifecycle, testing structure.
- **Out of scope:** OWASP-flavored security findings (those belong in step 6), framework-level invariants already covered by the Pre-Impl Checklist (step 4) or the universal guardrails (step 3).

Record every finding with:

- File + line
- Rule category (e.g., "Naming Conventions", "Architecture Violations", "TypeScript Discipline")
- Severity (Critical / High / Medium / Low — per the blocking-policy table above)
- Fix class (`Mechanical` if listed in `remediation-{layer}.md`'s auto-fixable section, else `Architectural`)
- Rule reference (e.g., `code-review-web.md#typescript-discipline` or `web-component-architecture.md`)
- Proposed fix (one-line summary)

Append findings to `artifacts/docs/dev/reviews/code-review-findings/<label>.md`.

**Hard limits for this step:**

- Read only files in the diff. Do not chase context across the repo "to be thorough."
- Walk each layer's checklist once. There is no second pass.
- A finding whose context isn't visible in the diff is recorded as `Requires Manual Review` and surfaced as architectural.

### 6. Layered OWASP A01–A10 security audit

For each layer in scope, walk the loaded security checklist file end-to-end against the diff:

- **Web** → walk every OWASP section in `security-web.md` against the changed frontend files.
- **API** → walk every OWASP section in `security-api.md` against the changed `.cs` / config / Dockerfile files.
- **Database** → walk every OWASP section in `security-database.md` against the changed `.sql` / migration files.

For each potential finding, apply the in-scope / out-of-scope filter from the checklist:

- **In scope:** issues that map to OWASP A01–A10 or the layer-specific advanced sections (data protection, container security, privilege escalation).
- **Out of scope:** code quality, naming, performance, accessibility, missing tests, error-message wording. Those belong in step 4 (Pre-Impl Checklist), step 5 (code-review), or step 8's architectural findings, not here.

Record every finding with:

- File + line
- OWASP category (A01–A10) or advanced section
- Severity (Critical / High / Medium / Low — per the blocking-policy table above)
- Fix class (`Mechanical` if listed in `remediation-{layer}.md`'s auto-fixable section, else `Architectural`)
- Rule reference (e.g., `security-api.md#A02` or `api-secrets.md`)
- Proposed fix (one-line summary)

Append findings to `artifacts/docs/dev/reviews/security-findings/<label>.md`.

**Hard limits for this step** (inherited from the Tier 3 lean audit):

- Read only files in the diff. Do not chase context across the repo "to be thorough."
- Walk each layer's checklist once. There is no second pass.
- A finding whose context isn't visible in the diff is recorded as `Requires Manual Review` and surfaced as architectural.

### 7. Apply mechanical fixes (code-review + security)

For every finding marked `Mechanical` — from steps 3, 4, 5, or 6 — apply the canonical fix from the layer's remediation file:

- Universal guardrails (step 3) and Pre-Impl-Checklist fixes (step 4): per the rule file referenced.
- Code-review fixes (step 5): per `remediation-web.md` / `remediation-api.md` / `remediation-database.md` if a matching auto-fix pattern is listed. If no matching pattern exists, **demote to architectural** (surface in step 8) rather than improvise a fix.
- Security fixes (step 6): per `remediation-web.md` / `remediation-api.md` / `remediation-database.md`.

Common auto-fixes (non-exhaustive):

- Missing security header → edit `Program.cs` middleware (per `remediation-api.md` baseline-headers pattern).
- Missing data annotation → add to the DTO.
- `Results.NotFound()` where `Results.Forbid()` belongs → swap.
- Missing `CancellationToken` parameter → add and thread through.
- Missing test for a required behaviour → add the test.
- Raw-SQL concat → switch to `FromSqlInterpolated` or parameter binding.
- Missing axe assertion on a form-bearing component → add it.
- `_logger.LogXxx(...)` interpolating user content → swap to identifier-only.
- `dangerouslySetInnerHTML` without sanitization → wrap with DOMPurify (install if missing).
- MSAL `cacheLocation: "localStorage"` → switch to `"sessionStorage"`.
- Missing `[Authorize]` / `[Authorize(Roles="…")]` → add per `plan.md`.
- Bare `sp_` prefix → rename to `usp_`.
- Missing soft-delete filter → add `WHERE IsDeleted = 0`.
- Schema-unqualified SQL → qualify with `dbo.`.

Re-run the affected gates after each fix (e.g. `dotnet test` for an API fix, `vitest run <path>` for a web fix, the tSQLt class for a procedure fix). If a mechanical fix surfaces an architectural concern (the fix doesn't fit cleanly), **demote** it to architectural for the developer prompt and revert the partial change.

Append every applied fix to `artifacts/docs/dev/reviews/remediations-applied/<label>.md`:

```
| File | Issue | Severity | Source | Fix | Status |
|---|---|---|---|---|---|
| api/Controllers/X.cs:42 | Missing CancellationToken | Medium | guardrail-9 | Added + threaded through | Applied |
| web/src/features/Y/index.tsx:18 | dangerouslySetInnerHTML w/o sanitization | High | security-web.md#A03 | Added DOMPurify.sanitize() | Applied |
| database/procedures/usp_GetX.sql:24 | Missing soft-delete filter | Medium | security-database.md#A01 | Added AND IsDeleted = 0 | Applied |
```

### 8. Surface architectural findings (code-review + security, batched)

Batch every remaining non-mechanical finding from steps 3, 4, 5, and 6 into a **single** prompt — sorted by severity (Critical → High → Medium → Low), tagged with the source (`Guardrail` / `Pre-Impl` / `Code-Review` / `Security A0n`):

```
Architectural findings — please decide (<count>):

[1] <file>:<line> — <one-line summary>        [Security A02 / Critical]
    Rule:           <rule reference, e.g. security-api.md#A02 or api-secrets.md>
    Why it matters: <one-sentence why>
    Proposed fix:   <one-sentence what>

[2] <file>:<line> — <one-line summary>        [Code-Review / High]
    Rule:           <rule reference, e.g. code-review-api.md#architecture-violations or web-component-architecture.md>
    Why it matters: ...
    Proposed fix:   ...

[3] <file>:<line> — <one-line summary>        [Pre-Impl / High]
    Rule:           <rule reference>
    Why it matters: ...
    Proposed fix:   ...

[4] ...

Reply per finding:
  apply 1, defer 2, reject 3 (reason: ...)
or:
  apply all / defer all / reject all
```

Parse the reply:

- `apply` → make the fix, re-verify, record `Applied` in `artifacts/docs/dev/reviews/architectural-findings.md`.
- `defer` → record `Deferred` with date; re-surface on next `/review`. **Not allowed for Critical or High severity** — the run cannot reach CLEAN with a deferred Critical/High finding. If the developer attempts to defer one, surface the rule and ask for `apply` or `reject` with rationale.
- `reject` → record `Rejected` with reason; never re-raised for the same match key until manually cleared. A rejected Critical/High finding requires a rationale comment so a future reviewer can audit the decision.

If the developer skips the prompt or doesn't reply, the run stays open with findings as `Pending`.

### 9. Write the cache file (clean status only)

A run is `CLEAN` when **all** of the following are true:

1. All steps 2–4 passed.
2. Zero Critical or High **code-review or security** findings remain `Pending`, `Deferred`, or otherwise unresolved.
3. Every architectural finding has been Applied or Rejected.

If `CLEAN`, write `$WT/artifacts/docs/dev/reviews/.last-clean-run.json` atomically:

```json
{
  "label": "<branch-slug-or-commit-subject>-<short-sha>",
  "head_sha": "<git rev-parse HEAD>",
  "diff_hash": "<sha256 of git diff HEAD>",
  "completed_at": "<ISO 8601 UTC>",
  "max_severity_reached": "Low",
  "phases_run": [
    "tests",
    "guardrails",
    "pre-impl",
    "code-review-web",
    "code-review-api",
    "code-review-database",
    "security-web",
    "security-api",
    "security-database"
  ]
}
```

`phases_run` lists only the layers actually walked (e.g., a diff that touches only `web/` records `["tests", "guardrails", "pre-impl", "code-review-web", "security-web"]`).

`/ship` consults this file to skip its own review pass when nothing has changed since.

If status is not clean (any open Critical / High finding remains, or any deferred-Critical/High would block), do **not** write the cache file. The developer must run `/review` again after resolving them.

### 10. Summarise and stop

Print:

- Tests: `dotnet test <pass/fail> / vitest <pass/fail> / tSQLt <pass/fail>`
- Lint / type-check: pass/fail
- Universal guardrails: <pass count> / 9
- Pre-Impl Checklist tiers: <list, with pass/fail per applicable tier>
- Code-review by layer:
  - Web: <findings by severity, e.g. `Crit 0 / High 1 / Med 2 / Low 3`>
  - API: ...
  - Database: ...
- Security audit by layer:
  - Web: <findings by severity, e.g. `Crit 0 / High 1 / Med 2 / Low 3`>
  - API: ...
  - Database: ...
- Mechanical fixes applied: <count> (broken down by source: guardrail / pre-impl / code-review / security)
- Architectural findings: <count> (with applied / deferred / rejected breakdown and Critical/High call-out)
- Iterations run: `<n>` of 5
- Status: `CLEAN` | `UNRESOLVED-STUCK` | `UNRESOLVED-CAP`
- Recommendation:
  - `CLEAN` → _"Run /ship to land this work on dev."_
  - `UNRESOLVED-STUCK` → list the recurring open findings and ask the analyst to resolve them by hand, then re-run /review.
  - `UNRESOLVED-CAP` → list the unresolved Critical/High findings, suggest splitting the diff or resolving by hand, then re-run /review.

Then **STOP**.

## When to run `/review` again after `UNRESOLVED-*`

The bounded loop handles normal convergence (mechanical fixes → re-run → architectural decisions → re-verify) automatically across iterations. A fresh invocation is the right move only when the loop exits with `UNRESOLVED-STUCK` or `UNRESOLVED-CAP`:

- **After `UNRESOLVED-STUCK`** — the same findings keep recurring without progress. Inspect the open findings, resolve them by hand (or split the diff so the next loop sees less surface area), and re-run `/review`.
- **After `UNRESOLVED-CAP`** — the loop hit 5 iterations with Critical/High findings still open. Same drill: resolve the remaining items and re-run.
- **After a `Deferred` Critical/High is resolved out of band** — re-run so the cache reflects the new clean state.

If `/review` returns `UNRESOLVED-*` twice in a row on the same diff, the diff is too coarse to safely auto-remediate. Split the change and re-run on the smaller scope.

## Do not

- Skip the loop. The iteration cap is the safety bound, not an opt-in.
- Write the cache file on non-clean status. A `/ship` skip on an unresolved review is a compliance violation.
- Walk the firm Tier 1+ 80% coverage gate — Tier 1 is behavior-floor (ADR-001).
- Refuse to declare clean over stylistic preferences — the only blockers are guardrail failures, Pre-Impl Checklist failures, Critical/High code-review or security findings, and unresolved architectural findings.
- Read files outside the diff "to be thorough" during the code-review or security audits. The 45-tool-call budget for steps 5+6+7 exists to keep the audit lean; if you blow through it, you're auditing the repo, not reviewing the diff.
- Auto-apply a remediation that isn't listed in the layer's `remediation-{layer}.md` auto-fixable section. Architectural fixes go through the developer prompt, not silent code edits. Code-review findings without a matching auto-fix pattern are demoted to architectural, never improvised.
- Defer a Critical or High code-review or security finding. Those require Apply or Reject with rationale before the run can reach CLEAN.
