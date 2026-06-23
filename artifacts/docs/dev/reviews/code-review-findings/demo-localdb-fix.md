# Code-review findings — fix/demo-localdb-fix

## Tooling diff (no application layer changes)

- `demo-start.ps1` — adds a `sqllocaldb start MSSQLLocalDB` step before launching the API; mirrors API/web stdout+stderr to log files in `.demo-logs/`; surfaces the last 20 log lines when either server fails the wait loop; switches from heredoc to single-line semicolon-separated `-Command` strings to dodge multi-line argument-passing pitfalls.
- `.gitignore` — adds `.demo-logs/` so the captured logs never get tracked (already covered by `*.log` but explicit is clearer).

**Findings:** 0 Critical · 0 High · 0 Medium · 0 Low.

Notes:

- No web / API / database source changed.
- PowerShell parses cleanly (`[Parser]::ParseFile` reports zero errors).
- Single-line `-Command` strings still escape `$Host` and `$env:` with backtick so the spawned shell evaluates them.
- LocalDB start is guarded by a `Get-Command sqllocaldb` check; missing-tool case prints a warning and falls through to the wait loop, which will then surface the API log tail on failure.
- Root cause this fixes: cold MSSQLLocalDB instance returns SqlException 4060 ("Cannot open database ContractManager") because `DevBypass.SeedAsync` runs at startup before LocalDB has finished attaching user databases. The API process crashes before binding to port 5000, leaving the launcher polling forever.

No mechanical fixes required.
