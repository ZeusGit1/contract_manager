# Code-review findings — fix/demo-launcher

## Tooling diff (no application layer changes)

The diff adds two top-level files only:

- `demo-start.ps1` — PowerShell launcher: clears stale processes on ports 5000 / 5173 / 5174, installs web deps if missing, spins up the API on http://localhost:5000 in Development mode, waits for `/api/contracts` to respond, starts `npm run dev`, waits for the SPA to respond, then opens the default browser.
- `demo-start.cmd` — double-click wrapper that runs the PowerShell script with `-ExecutionPolicy Bypass` so no machine-level policy change is needed.

**Findings:** 0 Critical · 0 High · 0 Medium · 0 Low.

Notes:

- No web / API / database source changed.
- PowerShell parses cleanly (`[Parser]::ParseFile` reports zero errors).
- Script does not introduce dependencies and uses Windows built-ins only (`Get-NetTCPConnection`, `Invoke-WebRequest`, `Start-Process`).
- No secrets or sensitive values written into the script.

No mechanical fixes required.
