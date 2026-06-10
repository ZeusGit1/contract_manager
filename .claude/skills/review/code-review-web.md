# Frontend Code Review Checklist — Tier 1

Walk every changed frontend file against the rules below. For each potential finding, classify severity (Critical / High / Medium / Low) and decide whether the fix is mechanical (auto-apply per `remediation-web.md`) or architectural (surface in the batched prompt).

Tier 1 stack reference: React 19 + TypeScript + Vite + Vitest + CSS Modules + `@azure/msal-react`. No Webpack, no Jest, no SCSS, no document *processing* UI (viewer / citations). (Basic multi-file attachment upload/download UI and a simple LLM Q&A UI — including streamed text — are allowed; see `web-blob-attachments.md`.)

---

## Basic Code Review

### Rule Compliance

Check every changed file against the applicable project rules:

- @.claude/rules-analyst/dev/web-coding-standards.md — naming conventions (PascalCase components, camelCase hooks/variables, UPPER_SNAKE_CASE constants), boolean prefixes (is/has/should/can), error handling, App Insights usage
- @.claude/rules-analyst/dev/web-component-architecture.md — one component per file, colocated styles/tests, named exports (not default), no prop drilling beyond 2 levels, React.memo + useCallback together for list items, crypto.randomUUID() for IDs
- @.claude/rules-analyst/dev/web-file-structure.md — feature-based organization, barrel exports via index.ts, shared components in src/components/, shared hooks in src/hooks/
- @.claude/rules-analyst/dev/web-linting-formatting.md — ESLint flat config compliance, Prettier rules (semi, singleQuote, trailingComma: all, printWidth: 100, tabWidth: 2)
- @.claude/rules-analyst/dev/web-styling.md — **CSS Modules** for component styles (plain CSS, not SCSS — Tier 1 deliberate divergence), CSS custom properties for design tokens, container queries over media queries, no inline styles (except dynamic values), no CSS-in-JS
- @.claude/rules-analyst/dev/web-state-management.md — correct state tool for scope (useState → useReducer → Context → Redux Toolkit), TanStack Query for server state
- @.claude/rules-analyst/design/accessibility.md — WCAG 2.2 AA, semantic HTML first, ARIA patterns, keyboard navigation, focus indicators, touch targets, reduced motion
- @.claude/rules-analyst/dev/web-testing.md — `vitest-axe` assertion in every form-bearing/interactive component test (Tier 1 uses Vitest, not Jest), query by role/label/text (not class/testid), userEvent over fireEvent, **behavior-floor coverage (no 80% gate — Tier 1 deliberate divergence, ADR-001)**, mock only at boundaries
- @.claude/rules-analyst/dev/web-performance.md — lazy loading, vendor chunk splitting, no console.* in production builds, memoization for expensive computations
- @.claude/rules-analyst/dev/web-persistence.md — IndexedDB via usePersistedReducer, localStorage only for theme preference, no sensitive data in client storage
- @.claude/rules-analyst/dev/web-dependency-security.md — audit before install, severity policy (Critical/High: reject, Moderate: case-by-case, Low: accept with monitoring)
- @.claude/rules-analyst/dev/web-browser-support.md — Chrome, Edge, Safari (latest), verify API/CSS support before using new features, explicit polyfills
- @.claude/rules-analyst/design/_core-requirements.md — design tokens, color palette, typography, theme tokens, and anti-patterns (canonical design system)

### TypeScript Discipline

- No `any` without a justification comment explaining why
- No `@ts-ignore` or `@ts-expect-error` without a documented reason
- Exhaustive switch statements in reducers (use `never` type for default case)
- Props typed with explicit interfaces (not `React.FC`, not inline object types)
- No type assertions (`as`) unless necessary and commented

### General Code Quality

- No magic numbers — extract constants with descriptive names
- No commented-out code — delete it or open an issue
- No `TODO` without a linked issue reference
- No `eslint-disable` without a justification comment
- No direct DOM manipulation — use React refs (`useRef`)
- No `console.log` left in committed code (use proper error reporting per `web-error-logging.md`)
- Imports organized: external packages first, then internal modules, then relative imports

---

## Advanced Code Review

### Architecture Violations

- **API calls in presentation components** — data fetching belongs in custom hooks (TanStack Query `useQuery` / `useMutation`), not in components that render UI. Components should receive data via props or hooks.
- **Business logic in UI components** — extract complex logic into pure utility functions or custom hooks. Components should focus on rendering.
- **Bypassing barrel exports** — importing from a feature's internal files (e.g., `../features/Todo/utils`) instead of the public API (`../features/Todo`).
- **Prop drilling beyond 2 levels** — if props pass through more than 2 intermediate components, use Context or restructure the component tree.
- **Circular dependencies** — module A imports from B which imports from A. Restructure to break the cycle.

### Performance Issues

- **Missing memo/useCallback on list items** — components rendered inside `.map()` that receive callback props should use `React.memo` and the parent should wrap callbacks in `useCallback`.
- **Missing dependency array entries** — `useEffect`, `useCallback`, and `useMemo` must list all referenced variables in their dependency arrays.
- **Derived state in useEffect** — values that can be computed from existing state/props should be calculated inline during render, not synced via `useEffect`.
- **Inline object/array literals in JSX** — `style={{...}}` or `options={[...]}` creates a new reference every render. Extract to a constant or memoize.
- **Missing code splitting** — route-level components should use `React.lazy()` + `Suspense`. Large feature modules should be dynamically imported.
- **Expensive computations without memoization** — filtering, sorting, or transforming large datasets should use `useMemo`.

### Memory Leaks

- **Missing useEffect cleanup** — event listeners (`addEventListener`), subscriptions, and timers (`setInterval`, `setTimeout`) added in `useEffect` must be cleaned up in the return function.
- **Stale closures** — event handlers or callbacks that capture outdated state values. Use refs or functional state updates.
- **Uncleared intervals/timeouts** — `setInterval` and `setTimeout` IDs must be stored and cleared on unmount.

### Race Conditions

- **Async state updates without abort controllers** — `fetch` calls in `useEffect` should use `AbortController` to cancel in-flight requests when the component unmounts or dependencies change. TanStack Query handles this automatically — flag any raw `fetch` in `useEffect`.
- **Missing cleanup for concurrent requests** — when a dependency changes and triggers a new fetch, the previous fetch's response should be ignored.

### Bundle Size

- **Full library imports** — `import _ from 'lodash'` instead of `import debounce from 'lodash/debounce'`. Use named or path imports for tree-shaking.
- **Dev-only code in production** — conditional imports or debug utilities that should be excluded from production builds. Gate with `if (import.meta.env.DEV)`.
- **Unnecessary polyfills** — polyfills for features already supported by all target browsers (per @.claude/rules-analyst/dev/web-browser-support.md).
