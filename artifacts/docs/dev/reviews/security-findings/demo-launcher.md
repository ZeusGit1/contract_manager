# Security findings — fix/demo-launcher

## Tooling diff (no application layer changes)

The diff adds two top-level local-tooling files (`demo-start.ps1`, `demo-start.cmd`).

**Findings:** 0 Critical · 0 High · 0 Medium · 0 Low.

Notes:

- Script targets `localhost` only — no external endpoints.
- No secrets, tokens, or credentials embedded.
- `ASPNETCORE_ENVIRONMENT=Development` is set inside the spawned process only; not persisted to the user's environment.
- Process-kill loop is scoped to ports 5000 / 5173 / 5174 — no broad `Stop-Process` patterns.

No mechanical fixes required.
