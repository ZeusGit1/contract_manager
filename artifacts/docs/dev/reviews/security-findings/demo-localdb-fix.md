# Security findings — fix/demo-localdb-fix

## Tooling diff (no application layer changes)

`demo-start.ps1` adds a LocalDB start step and writes API/web stdout to `.demo-logs/`.
`.gitignore` adds `.demo-logs/` so logs never get tracked.

**Findings:** 0 Critical · 0 High · 0 Medium · 0 Low.

Notes:

- Script targets `localhost` only — no external endpoints.
- No secrets, tokens, or credentials embedded.
- `ASPNETCORE_ENVIRONMENT=Development` is set inside the spawned process only; not persisted to the user's environment.
- `.demo-logs/` content is local Serilog console output. DevBypass injects synthetic seed-user claims (`Lisa Farkas (DEV)` / fixed Entra-style GUID) — no real PII. The `api-logging.md` rules forbid logging user input / AI output / document content, and the running API conforms.
- Logs are gitignored so they cannot accidentally land in source control.

No mechanical fixes required.
