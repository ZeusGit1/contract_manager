# Backend API — Test Guidelines

## Unit tests

- Cover all business logic, validation, and branching. No database, no external services.
- Mock all dependencies with Moq. Use xUnit.
- Name test classes `{Class}Tests`. Name methods `{Method}_{Scenario}_{ExpectedResult}`.
- Recurring test setup (mock factories, fixture builders, `WebApplicationFactory` configurations) used by 3+ test classes must be extracted to a shared `TestUtilities` or `TestFixture` class in the test project, not re-implemented per file.

## Integration tests

- Use `WebApplicationFactory<Program>` against an **ephemeral SQL Server** per test class (LocalDB by default; Testcontainers if running in CI on Linux). No in-memory provider — it has different semantics from SQL Server and will mask bugs. No mocks for EF Core.
- Every controller endpoint needs at least one integration test covering the full request/response cycle.
- Test auth (valid token, invalid token, expired token), pagination, validation failures, and error responses.
- The test factory must override `Microsoft.Identity.Web` token validation with a test-only authentication handler that injects synthetic claims (`oid`, `name`, `roles`) per test — never call the real Entra tenant from tests.

## Always test

- Every validation rule and every branch.
- Every boundary value.
- Every error response shape (ProblemDetails fields, status code, headers).
- Soft-delete exclusion — confirm queries don't return `IsDeleted = 1` rows.
- Ownership / role-gating — confirm a caller without the required role gets `403`, and a caller with the role but referencing a resource they don't own gets `403` (not `404`).

## Required test cases for every service

- **Happy path** — valid inputs, assert expected output and dependencies called with correct arguments.
- **Permanent failure (400/401/403)** — mock to throw once; assert no retry and no rethrow.
- **Cancellation** — pass cancelled `CancellationToken`; assert exits cleanly without calling dependencies.

## Coverage

Tier 1 runs **behavior-floor** coverage — every behavior described above must be tested. Coverage percentage is reported but not gated. Do not write tests purely to move the line-coverage percentage; do not write `[ExcludeFromCodeCoverage]` to game it either.

If a behavior listed under "Always test" or in the table inside `_core-requirements.md` is uncovered, add the test. If a code path is uncovered but corresponds to no required behavior (defensive null check, framework-generated code, DI registration), leave it alone.

## Shared JSON options

Integration-test deserialization must mirror the API's serialization options — provide a shared `TestJsonOptions.ReadAsAsync<T>(this HttpResponseMessage)` helper that constructs a `JsonSerializerOptions` with `JsonStringEnumConverter` registered, so test assertions on response bodies do not silently coerce string-enum responses.
