# Security Findings — bulk-upload vendor resolution

## Web layer — OWASP A01–A10 walk

| OWASP | Result | Notes |
|---|---|---|
| A01 Broken Access Control | Pass | No new routes; typeahead / POST endpoints are already `[Authorize(Roles = "Procurement,ProcurementAdmin")]` on the API. Row-level access uncontested (bulk upload is procurement-only). |
| A02 Cryptographic Failures | Pass | No secrets in source; no `localStorage`/`sessionStorage` writes added. |
| A03 Injection / XSS | Pass | No `dangerouslySetInnerHTML`, no `eval`, no `document.write`. `encodeURIComponent(query)` on the autocomplete URL. |
| A04 Insecure Design | Pass w/ Low | Vendor-create uses `useMutation` → POST. Missing `autocomplete` attributes on the AddVendorInline form — Low severity (see code-review findings). Modal confirm via Add button — not a destructive action so no confirm modal required. |
| A05 Security Misconfiguration | Pass | Error UI shows plain-language message ("Couldn't save the vendor. Check for a similar existing name, or try again."), never the raw error. |
| A06 Vulnerable Components | Pass | No new dependencies added. |
| A07 Identification & Authentication | Pass | No token/credentials handling touched. |
| A08 Software & Data Integrity | Pass | No third-party scripts, no `package.json` script changes, no dynamic `import()`. |
| A09 Security Logging & Monitoring | Pass | No `console.log` in new code; error path uses in-UI messages only. |
| A10 SSRF | Pass | Autocomplete URL is same-origin relative path `/api/vendors/autocomplete` — no user-controlled protocol or host. |

**No Critical or High findings.**
