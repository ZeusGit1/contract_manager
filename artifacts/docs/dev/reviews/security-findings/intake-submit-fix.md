# Security findings — fix/intake-submit-fix

## Web layer (OWASP A01–A10)

Walked `security-web.md` against the 4 changed files.

**Findings:** 0 Critical · 0 High · 0 Medium · 0 Low.

Notes:

- **A01 Access Control** — `requesterEmail` is sourced from the authenticated `/api/me` response, not user-typed input. The API still enforces authorization (`[Authorize(Roles=Procurement,ProcurementAdmin,Requester)]`).
- **A02–A10** — Not applicable. The diff is a bug fix to the POST body shape and a CSS tweak.

No mechanical fixes required.
