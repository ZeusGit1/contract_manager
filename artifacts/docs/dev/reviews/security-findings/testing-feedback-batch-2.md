# Security findings — fix/testing-feedback-batch-2

## Web layer (OWASP A01–A10)

Walked `security-web.md` against the 12 changed files + 2 new files. Diff is purely frontend; no API surface introduced.

**Findings:** 0 Critical · 0 High · 0 Medium · 0 Low.

Notes:

- **A01 Access Control** — Vendor add/edit and the new in-memory state on the contract detail rely on existing API authorization (`[Authorize(Roles=Procurement)]` on `VendorsController`). UI does not gate by role — API does.
- **A02 Crypto Failures** — Only `crypto.randomUUID()` introduced (Web Crypto). No custom crypto.
- **A03 Injection / XSS** — All user-supplied text in the new Documents / Comments / Notes / Approvals UIs renders via React JSX text interpolation (escaped). CSV export uses RFC 4180 escaping (validated by `exportCsv.test.ts`). No `dangerouslySetInnerHTML`, no `eval`.
- **A04 Insecure Design** — Document/comment/note state is in-memory only for the prototype; no persistence concerns.
- **A05–A10** — Not applicable to the frontend diff scope.

No mechanical fixes required from this layer.
