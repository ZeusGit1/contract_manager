# CI Pipeline

Every web project must ship a populated `.github/workflows/ci.yml`. The starter at `templates/.github/workflows/ci.yml` is a stub — fill it in; do not leave it empty.

## Required gates

The workflow must run on `pull_request` for changes under `web/src/**`, `api/**`, and `database/**` and enforce the gates already mandated by the rules below. Do not restate thresholds or rule sets here — link out.

Every job that runs Node-based tooling (`prettier`, `eslint`, `npm audit`, `jest`, `playwright`) must pin Node via `actions/setup-node@v4` with `node-version: '24'`. Do not rely on the runner's default Node — it is unpinned and drifts.

| Gate                     | Command                | Rule                                       |
| ------------------------ | ---------------------- | ------------------------------------------ |
| Formatting               | `prettier --check`     | `web-linting-formatting.md`                |
| Linting                  | `eslint` (flat config) | `web-linting-formatting.md`                |
| Dependency audit         | `npm audit`            | `web-dependency-security.md`               |
| Unit tests (web)         | `jest --ci`            | `web-testing.md`                           |
| E2E (supported browsers) | `playwright test`      | `web-browser-support.md`, `web-testing.md` |
| Unit tests (api)         | `dotnet test`          | `api-testing-guidelines.md`                |
| Integration tests (api)  | `dotnet test`          | `api-testing-guidelines.md`                |
| Unit tests (database)    | `tSQLt.RunAll`         | `database-testing.md`                      |

Any gate failing fails the build. Do not add `continue-on-error` to make a gate advisory.
