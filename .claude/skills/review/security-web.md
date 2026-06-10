# Frontend Security Audit Checklist — Tier 1

Walk every OWASP category against the diff. For each potential finding, classify severity (Critical / High / Medium / Low) and decide whether the fix is mechanical (auto-apply per `remediation-web.md`) or architectural (surface in the batched prompt).

Tier 1 stack reference: React 19 + TypeScript + Vite + Vitest + CSS Modules + `@azure/msal-react`. No Webpack, no Jest, no document *processing* UI. (Basic multi-file attachment upload/download UI and a simple LLM Q&A UI — including streamed text — are allowed; see `web-blob-attachments.md`.)

---

## A01: Broken Access Control

- **Protected routes without auth guards** — every route that displays user-specific data or performs privileged actions must be wrapped by `<AuthenticatedTemplate>` (or equivalent guard) before render. Anonymous flicker is a finding.
- **Role gate enforced only client-side** — `[Authorize(Roles="...")]` must exist on the matching API endpoint. Client-side hiding of a button is not access control; flag any feature that relies on it alone.
- **Sensitive data in URL parameters** — Entra `oid`, internal record IDs, role names, or any PII in `?query=…` are visible in browser history, referrer headers, and App Insights page-view telemetry. Use route params + an authenticated server lookup instead.
- **Open redirect** — `navigate()`, `window.location`, or `<a href>` values derived from user input or query parameters used without validation against an allowlist of internal paths.
- **Direct object references** — user-supplied IDs passed to the API without server-side ownership verification. Tier 1 rule: ownership violations return `403`, never `404` (see `api-validation.md`).

---

## A02: Cryptographic Failures

- **Hardcoded secrets in source** — API keys, signing keys, tokens, MSAL client secrets in `.ts`, `.tsx`, `.json`. The MSAL public client `clientId` is not a secret; an actual signing secret is. Flag anything other than `clientId`, `authority`, `redirectUri`.
- **Secrets in `.env` committed to git** — `.env` must be in `.gitignore`. Only `.env.example` with placeholder values can be committed.
- **Tokens or PII in `localStorage` / `sessionStorage`** — `sessionStorage` is the MSAL default and is acceptable for access tokens (see `api-client-auth.md`). `localStorage` is NOT — flag any MSAL `cacheLocation: "localStorage"`. Tier 1 rule (`web-persistence.md`): localStorage holds only the `theme-preference` key; all other persistent state goes through IndexedDB via `usePersistedReducer`. Tokens, passwords, PII never go in either.
- **HTTP for sensitive resources** — every API call, CDN asset, or external script reference must be `https://`. Local dev `http://localhost:…` is fine; production references must not be HTTP.
- **Weak / missing TLS** — Vite preview server in production, missing HSTS hints (the API enforces HSTS server-side per `api-performance.md`; flag if the frontend somehow disables it).

---

## A03: Injection / XSS

- **`dangerouslySetInnerHTML` without sanitization** — every occurrence. Required pattern: DOMPurify wrapper. See `remediation-web.md`. Tier 1 universal guardrail bans unsanitised `dangerouslySetInnerHTML` (`CLAUDE.md`).
- **User-controlled `href` / `src`** — values derived from user input, query parameters, or API responses placed in `<a href>`, `<img src>`, `<iframe src>`, `<script src>` without protocol validation. `javascript:` URIs are the canonical exploit; allowlist `http:` / `https:` / `mailto:` only.
- **`eval()` / `new Function()`** — every occurrence. Tier 1 universal guardrail bans these (`CLAUDE.md`).
- **`document.write()` / direct `innerHTML`** — bypasses React's XSS protections. Refactor to JSX or sanitized `dangerouslySetInnerHTML`.
- **Template-literal injection** — user input interpolated into strings later parsed as HTML, URL, or code (e.g., `new URL(\`/users/${userInput}\`)` without validation, or building an SVG `d` attribute from a query param).

---

## A04: Insecure Design

- **GET for mutations** — every state-changing TanStack Query call must use `useMutation` with POST / PUT / PATCH / DELETE. Never GET.
- **Missing `autocomplete` attributes** — password fields need `autocomplete="current-password"` or `"new-password"`. PII fields (email, given-name, etc.) need their semantic autocomplete value. See `web-coding-standards.md` and `forms-and-input.md`.
- **Forms with `method="get"`** — forms posting sensitive data must use POST. React Router actions and TanStack Query mutations are fine; raw `<form method="get">` carrying sensitive fields is not.
- **CSRF on cookie-auth endpoints** — Tier 1 default is Bearer token in `Authorization` header (MSAL), which is not CSRF-vulnerable. If the build ever switches to cookie auth, CSRF tokens become mandatory. Flag any move toward cookie auth without that.
- **Sensitive operations without confirmation** — destructive actions (delete record, revoke access) need an explicit confirm modal per `disclosure-surfaces.md`.

---

## A05: Security Misconfiguration

- **Source maps in production** — Vite default is to disable source maps in production (`build.sourcemap: false`). Flag any `build.sourcemap: true` in `vite.config.ts` for a production build.
- **Verbose error messages in production** — error boundaries that render the raw `error.message` or `error.stack` to the user. Show a generic message; log details via App Insights (`web-error-logging.md`).
- **CORS misconfiguration** — frontend doesn't set CORS, but watch for code that proxies through a dev server (`vite.config.ts` `server.proxy`) that would never be deployed but might leak into production builds.
- **Missing Content Security Policy** — the API serves the security headers (`api-performance.md`), but if the SPA injects a `<meta http-equiv="Content-Security-Policy">` tag, confirm it matches the API's CSP and doesn't loosen it.
- **React DevTools / Redux DevTools enabled in production** — must be gated by `import.meta.env.PROD` (Vite) or absent entirely from production bundles. Tier 1 default state management is React Context — Redux DevTools applies only if Redux Toolkit was added.
- **Exposed dev endpoints / mock servers** — any MSW handler, mock API, or `vite.config.ts` proxy that points at a non-production target must not ship to production.

---

## A06: Vulnerable Components

- **`npm audit` findings** — every new direct dependency added in the diff must be checked. Tier 1 policy (`web-dependency-security.md`): Critical/High block; Medium investigate; Low/Info acceptable.
- **Outdated dependencies with known CVEs** — published advisories with available patches against any package in the diff.
- **Unvetted `postinstall` / `preinstall` / `install` scripts** — new dependencies with install-time scripts execute arbitrary code on every `npm install`. Verify before approving.
- **Dependencies from non-official registries** — packages from anything other than the official npm registry need explicit justification documented in `decisions.md`.
- **Unpinned versions** — `*`, `latest`, or overly broad version ranges that could pull a compromised version. Use exact pins on security-sensitive packages (`web-dependency-security.md`).

ADR-004 note: Tier 1 does not ship Gitleaks or Dependabot by default — the universal guardrail and this checklist are the enforcement mechanism for committed secrets and vulnerable deps. SonarCloud SAST covers other findings.

---

## A07: Identification & Authentication

- **Tokens in `localStorage`** — see A02. MSAL `cacheLocation` must be `sessionStorage`; `localStorage` is the canonical anti-pattern. See `api-client-auth.md`.
- **Credentials in client-side code** — never put a password, server-side secret, or admin token in any frontend file.
- **Routes rendering before auth resolves** — show a loading state until MSAL's `inProgress !== "none"`. A flash of content the user shouldn't see is a finding.
- **Token expiry not handled** — MSAL handles refresh; flag any code that swallows `InteractionRequiredAuthError` without falling back to interactive sign-in.
- **`isFallbackPublicClient: true` on a SPA registration** — incompatible with the SPA auth flow. Surfaces as `AADSTS9002326` at runtime. See `api-client-auth.md` for the diagnostic table.
- **Redirect URI not registered for the dev-server port that's actually used** — Vite falls back to 5174, 5175, etc. if 5173 is busy. Each fallback port needs its own entry in the Entra app registration. See `api-client-auth.md`.

---

## A08: Software & Data Integrity

- **Third-party scripts without SRI** — external `<script src>` and `<link href>` without `integrity` and `crossorigin="anonymous"` attributes. Tier 1 default ships no third-party scripts; flag any addition.
- **Unexpected `package.json` script modifications** — changes to `postinstall`, `preinstall`, `prepare`, `prebuild` that could execute arbitrary code. Verify intent.
- **CDN resources without SRI** — CSS, fonts, or JS loaded from CDNs need SRI hashes. Same default as above — Tier 1 ships none; flag any addition.
- **Unverified dynamic `import()`** — `import()` with user-controlled module paths.

---

## A09: Security Logging & Monitoring

- **`console.log` of sensitive data** — tokens, MSAL state, PII, session identifiers. The universal guardrail in `CLAUDE.md` bans logging user input / AI content / PII; the frontend equivalent is `console.*`. `web-coding-standards.md` also bans committed `console.log`.
- **PII in App Insights `trackException` / `trackEvent`** — see `web-error-logging.md`. Only identifiers and counts; never user content.
- **Debug logging in production** — verbose logging exposing internal state or request/response bodies. Vite's `import.meta.env.DEV` gate is the standard mechanism.
- **Error boundaries swallowing errors silently** — every React error boundary must call `appInsights.trackException()` (`web-error-logging.md`).

---

## A10: Server-Side Request Forgery (SSRF)

- **User-controlled URLs in `fetch` / `axios`** — URLs from user input, query parameters, or external data passed directly to `fetch()` without allowlist validation.
- **Unvalidated redirect URLs** — redirect targets from query parameters used without domain validation.
- **Proxy endpoints without URL validation** — any BFF / proxy route that forwards user-supplied URLs without restriction.

---

## Advanced Frontend-Specific Checks

- **Cross-origin messaging without origin check** — `window.addEventListener('message', …)` handlers that do not validate `event.origin` before processing data.
- **Prototype pollution** — `Object.assign()` or spread operators applied to user-controlled objects that could inject `__proto__`, `constructor`, `prototype`.
- **WebSocket connections without authentication** — WebSocket connections established without validating auth tokens or session state.
- **Service worker scope too broad** — service workers registered with scope that could intercept requests outside the app boundary.
- **Cache poisoning** — service worker or HTTP cache strategies that could serve stale or manipulated content without revalidation.
- **`postMessage()` with `'*'` target** — must specify a trusted origin.
- **Client-side data exposure** — sensitive data in global variables, `window` properties, or DOM data attributes.
