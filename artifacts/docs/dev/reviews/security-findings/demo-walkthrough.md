# Security findings — fix/demo-walkthrough

## Documentation-only diff

Single new file: `DEMO.md` at the repo root.

**Findings:** 0 Critical · 0 High · 0 Medium · 0 Low.

Notes:

- Doc references localhost URLs only.
- No secrets, tokens, credentials, internal-system URLs, real client names, or matter identifiers.
- Discussion of architecture (Entra ID, Azure SQL, Key Vault) restates the Tier 1 framework defaults and contains no environment-specific values.

No mechanical fixes required.
