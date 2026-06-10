# Testing

Testing is mandatory. All new features and bug fixes must include tests.

## Vitest + React Testing Library

Tier 1 uses **Vitest** (not Jest). The semantics are the same as Jest for the test bodies; the runner and config differ. (This is a deliberate deviation from the firm full Tier 1+ standard, which uses Jest; recorded in `decisions.md` template.)

- Test behavior, not implementation — query by role, label, and text, not by class or test ID unless unavoidable.
- Prefer `userEvent` from `@testing-library/user-event` over `fireEvent` for simulating user interactions.
- Aim for meaningful coverage, not 100% line coverage for its own sake — focus on critical paths and edge cases.
- Mock only at the boundary (API calls, third-party modules) — do not over-mock.
- Shared test fixtures must be module-level constants defined before the `describe` block, not inside individual `it` callbacks.
- Recurring test setup (provider wrappers, hook mocks, timer resets) used by 3+ files must be extracted to `src/test-utils.{ts,tsx}` and imported, not re-implemented per file.
- jsdom is missing several browser APIs. Add all polyfills and stubs to `src/setupTests.ts` — do not patch globals inline inside individual test files.
- Name test cases using the pattern `unitName — scenario — expected result`, for example: `filterRecords — no date range provided — returns all records`. This makes CI failure output self-describing. The SUT (the component or function under test) should be held in a variable named `sut` or `component` for consistency across test files.
- Structure every test with explicit Arrange / Act / Assert phases, separated by blank lines and labelled with `// Arrange`, `// Act`, `// Assert` comments. This makes intent scannable without reading the assertion logic and is especially useful for complex setup:

  ```ts
  it('filterRecords — past reminder date — excludes record', () => {
    // Arrange
    const records = [buildRecord({ reminderDate: '2020-01-01' })];

    // Act
    const result = filterRecords(records, { from: '2024-01-01' });

    // Assert
    expect(result).toHaveLength(0);
  });
  ```

## jsdom polyfill pack

A SPA on this stack (React 19 + MSAL + fetch + axe) needs ~10 jsdom polyfills before any test can run. Wire them all in `src/setupTests.ts` **at scaffold time** — discovering them lazily mid-build burns 30–45 min per project.

**Reference implementation:** `template/web/src/setupTests.ts` — copy verbatim into new projects rather than re-deriving. Install `undici` as a devDep (Node's built-in `fetch` is not exposed inside jsdom).

**Two non-obvious traps when editing the pack:**

- **Ordering.** Assign `TextEncoder`/`TextDecoder` to `globalThis` BEFORE the `undici` import — undici's module-load code reads them.
- **Crypto binding.** Polyfill `crypto` with Node's `webcrypto` object directly (`Object.defineProperty(global, 'crypto', { value: webcrypto, ... })`), then patch `randomUUID` onto that instance. Do NOT use `{ randomUUID }` only or `Object.assign({}, webcrypto)` — MSAL's `BrowserCrypto.validateCryptoAvailable()` checks `this` is a real `Crypto` instance, and hand-rolled wrappers lose the prototype binding.

## Test categories

Tag tests by category to enable selective CI execution:

| Category    | What it covers                             | CI stage                |
| ----------- | ------------------------------------------ | ----------------------- |
| Unit        | Pure functions, hooks, services (no I/O)   | Every push, every PR    |
| Component   | Rendered component behaviour (mocked deps) | Every PR                |
| Integration | Real API / real app stack                  | PR merge gate           |
| Browser     | Playwright / full user flows (optional)    | PR merge gate + nightly |

In Vitest: use `describe` block names or `--reporter` filters to separate categories. Run unit and component tests first; gate integration and browser tests on their passing.

## Coverage — behavior-floor

Tier 1 runs **behavior-floor** coverage. **There is no 80% gate.** (Deliberate deviation from firm Tier 1+; recorded in `decisions.md` template.)

What must be covered (every one):

- Every validation rule in the form schema.
- Every meaningful rendered state of a component — default, loading, error, disabled, open/closed, populated, empty. Not just default render.
- Every dispatch action in a `useReducer` / state hook.
- Every status-changing user interaction (submit, delete, toggle).
- Every authorization gate the component reads — confirm the Reader / Editor / Admin variations render correctly.

What is **not** required to cover:

- Composition roots (`App.tsx`, `main.tsx`).
- Barrel exports.
- Type-only files.
- Defensive null checks for cases the type system already prevents.

Coverage is run via `npm run test:coverage` and reported, but not gated in `vitest.config.ts`. Reviewers reference the report; they don't block on percentage.

## CI gate — no empty or placeholder tests

The CI pipeline must fail if any test file contains test cases with no assertions. Vitest with `--passWithNoTests=false` plus a check that each test file contains at least one `expect(...)`.

A test file that contains only `it('does something', () => {})` or `it.todo(...)` blocks provides false confidence — it inflates the test count without verifying any behaviour. Treat such a file as equivalent to no test coverage for that unit.

## vitest-axe

- **Every component test for a form-bearing or interactive component must include an axe accessibility assertion.** A failing axe assertion blocks merging.
- Pure layout / data-display components (e.g., a table cell renderer with no interaction) may skip the axe assertion — include a one-line comment explaining why.
- Logic-only hooks (no rendered DOM output) cannot be passed to `axe` — no assertion needed.

## Playwright (optional)

- E2E is **opt-in** in Tier 1 — recommended once the app has at least one critical user flow that the team relies on.
- When added, tests live in `e2e/` at the project root, split by concern: `<feature>.spec.ts` for user flows, `accessibility.spec.ts` for axe checks.
- Use `getByRole`, `getByLabel`, and `getByText` locators — avoid CSS selectors and `data-testid` where possible.
- Each test must be independent. Reset `localStorage` in `beforeEach` using the `goto + evaluate(clear) + reload` pattern — **not** `addInitScript` (it re-runs on every subsequent reload, breaking persistence tests):
  ```ts
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });
  ```
- Run `@axe-core/playwright` on every key page/state in a dedicated `accessibility.spec.ts`. A violation fails the build.
- In CI, set `forbidOnly: !!process.env.CI` and `retries: 2` in the Playwright config.
