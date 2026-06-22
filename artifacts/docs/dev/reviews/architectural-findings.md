# Architectural findings — `/review` 2026-06-22 (fix/phase-1-parallel-lanes)

Surface area: prototype iteration (mock-data UI changes + rewritten requirements docs + demo HTML). No API or database code changed.

## Findings

### [1] Component line-limit violations — [Code-Review / High]

**Files:**
- `web/src/features/contracts/ContractDetailScreen.tsx` — **988 lines** (target ≤200, page-route max ≤250)
- `web/src/features/contracts/DashboardScreen.tsx` — **487 lines**
- `web/src/features/bulk-upload/BulkUploadScreen.tsx` — **530 lines**

**Rule:** [web-component-architecture.md](.claude/rules/dev/web-component-architecture.md) — "Components must not exceed 200 lines (excluding imports and type definitions). … Page/route components that compose multiple feature components may extend to 250 lines with a justification comment, but no further."

**Why it matters:** Components this large are hard to test, review, and refactor. The 200-line rule exists so a single component stays a single responsibility.

**Context:** These are prototype screens reading from in-memory mock data (`phase1Data.ts`). The next `/build` pass will rewrite all three to call the real API via TanStack Query and will extract sub-components in the process.

**Proposed disposition:** **Reject** with rationale — "Prototype scope; resolved by upcoming `/build` rewrite against the real API."

---

### [2] Heavy inline styling in `ContractDetailScreen.tsx` — [Code-Review / High]

**Count:** 73 inline `style={{…}}` declarations.

**Rule:** [web-styling.md](.claude/rules/dev/web-styling.md) — "No inline styles except for truly dynamic values (e.g., calculated widths set via JS)."

**Why it matters:** Defeats CSS Modules scoping; loses theme adaptability; defeats React Compiler memoization of style objects.

**Context:** Layout shortcuts during prototype iteration. Should migrate to a `.module.css` companion when the screen is rewritten against the API in `/build`.

**Proposed disposition:** **Reject** with rationale — "Prototype scope; will migrate to CSS Modules during `/build` rewrite."

---

### [3] Missing colocated tests for new feature screens — [Pre-Impl / Medium]

**Files without `.test.tsx`:**
- `web/src/features/contracts/ReportsScreen.tsx` (new)
- `web/src/features/settings/CategoriesSettingsScreen.tsx` (new)
- Plus: no `.test.tsx` files exist anywhere under `web/src/features/` — the gap is broader than this branch.

**Rule:** [_core-requirements.md](.claude/rules/dev/_core-requirements.md) Web component tier — "Colocated `.test.tsx` exists with axe assertions across each meaningfully different rendered state."

**Why it matters:** Behavior-floor coverage is the Tier 1 testing gate.

**Context:** Pre-existing pattern across `web/src/features/` — the gap predates this branch. The `/build` pass that rewrites these screens against the real API will add tests then.

**Proposed disposition:** **Reject** with rationale — "Pre-existing gap across `web/src/features/`; resolved by `/build` rewrite that adds tests when wiring screens to the real API."

---

### [4] Pre-existing API NuGet version conflict — [Pre-Impl / Medium]

**Warning (4 instances during `dotnet build`):** `NU1608: Serilog.Sinks.ApplicationInsights 5.0.1 requires Microsoft.ApplicationInsights (>= 2.23.0 && < 3.0.0) but version Microsoft.ApplicationInsights 3.1.2 was resolved.`

**Rule:** [_core-requirements.md](.claude/rules/dev/_core-requirements.md) — "must pass with zero warnings (warnings-as-errors)."

**Why it matters:** Serilog 5.x ↔ ApplicationInsights 3.x is an unsupported transitive combination. The warning will become an error if Serilog tightens the upper bound.

**Context:** The API project (`api/src/ContractManager.Api`) is untouched by this fix branch — no `.cs` or `.csproj` changes in the diff. The warning predates this branch.

**Proposed disposition:** **Reject** with rationale — "Pre-existing on the integration branch; not introduced by this fix branch. Fix in next `/build` pass by either downgrading Microsoft.ApplicationInsights to 2.x or upgrading the Serilog sink package."

---

## Dispositions (final — analyst decision recorded 2026-06-22)

| # | Finding | Severity | Status | Rationale |
|---|---|---|---|---|
| 1 | Component line limits (ContractDetailScreen 988, DashboardScreen 487, BulkUploadScreen 530) | High | **Rejected** | Prototype scope. The next `/build` pass rewrites all three to call the real API via TanStack Query and will naturally extract sub-components. Fixing line counts on code that's about to be regenerated is wasted work. Re-evaluate after `/build`. |
| 2 | Inline styling in ContractDetailScreen (73 declarations) | High | **Rejected** | Prototype scope. Will migrate to a `.module.css` companion when the screen is rewritten against the API during `/build`. Re-evaluate after `/build`. |
| 3 | Missing colocated tests for `ReportsScreen.tsx`, `CategoriesSettingsScreen.tsx` (and broader: no `.test.tsx` anywhere in `web/src/features/`) | Medium | **Rejected** | Pre-existing gap across the entire `web/src/features/` directory — predates this fix branch. Tests will be added during `/build` when screens are rewired to the real API. |
| 4 | API NuGet warning NU1608 (Serilog.Sinks.ApplicationInsights ↔ Microsoft.ApplicationInsights version constraint) | Medium | **Rejected** | Pre-existing on the integration branch. No `.cs` or `.csproj` changes in this fix branch's diff — the warning was already there. Resolve in next `/build` pass by downgrading Microsoft.ApplicationInsights to 2.x OR upgrading the Serilog sink. |

**Rationale for blanket rejection:** this fix branch is a prototype iteration. The code paths flagged as High will not survive the next `/build` pass in their current form. Applying the fixes here would produce throwaway work; the right place to enforce the line-limit, inline-style, and test-coverage rules is on the post-`/build` codebase that talks to the real API. The pre-existing dependency warning is unrelated to this branch's changes.
