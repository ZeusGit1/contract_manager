# Frontend Security Remediation Patterns — Tier 1

Auto-apply mechanical fixes; surface architectural fixes in the batched prompt. Every applied fix is recorded in `artifacts/docs/dev/reviews/remediations-applied/<label>.md` per the SKILL.md flow.

## Auto-fixable (apply, re-run affected gates, record)

### One-liner fixes

- **`console.log` of tokens / PII** — remove the call (or redact the value if the surrounding code legitimately needs a debug breadcrumb — gate by `if (import.meta.env.DEV)`).
- **Missing `rel="noopener noreferrer"`** — add to every `<a target="_blank">`.
- **Source maps in production** — set `build.sourcemap: false` in `vite.config.ts` (or remove the override — that's already the default).
- **Missing `autocomplete` on sensitive fields** — add `autocomplete="current-password"` / `"new-password"` / `"email"` / `"given-name"` etc. per the semantic field.
- **Redux DevTools in production** (if Redux Toolkit is in use) — set `devTools: import.meta.env.DEV` when configuring the store.
- **`eval()` / `new Function()`** — remove. Flag every occurrence; do not auto-replace.
- **`document.write()`** — refactor to JSX.
- **MSAL `cacheLocation: "localStorage"`** — change to `"sessionStorage"`. See `api-client-auth.md`.
- **HTTP URL for production resource** — change to HTTPS.
- **`postMessage('*')`** — replace `'*'` with the specific trusted origin.

### Pattern fixes

**`dangerouslySetInnerHTML` without sanitization**

```tsx
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

Install `dompurify` + `@types/dompurify` if missing. Add to `package.json` and `package-lock.json`. Re-run `npm run build` and `npx tsc --noEmit`.

**Hardcoded secret → env var**

```tsx
const value = import.meta.env.VITE_PUBLIC_VALUE;
```

Move the value to `.env` (gitignored) and add a placeholder to `.env.example`. **Important:** `VITE_*` env vars are inlined into the bundle and visible to anyone with the JS. Only put values that are public-by-design (MSAL `clientId`, App Insights ingestion connection string, the API base URL). Anything that's actually a secret belongs in the API + Key Vault, not the SPA. If the diff was leaking a true secret, flag for rotation, escalate to architectural.

**`javascript:` URI — protocol allowlist**

```tsx
const isSafeUrl = (url: string) => {
  try {
    return ['http:', 'https:', 'mailto:'].includes(
      new URL(url, window.location.origin).protocol,
    );
  } catch {
    return false;
  }
};
```

Apply before any `href` / `src` derived from user input.

**`postMessage` listener without origin check**

```tsx
window.addEventListener('message', (event) => {
  if (event.origin !== TRUSTED_ORIGIN) return;
  handleData(event.data);
});
```

`TRUSTED_ORIGIN` is a module-level const sourced from `import.meta.env.VITE_TRUSTED_ORIGIN` or hardcoded for known internal URLs.

**Missing error-boundary telemetry**

Add `appInsights.trackException({ exception })` in the boundary's `componentDidCatch` / `getDerivedStateFromError` per `web-error-logging.md`.

**`fetch` URL from user input — allowlist**

```ts
const ALLOWED_HOSTS = ['api.firm.internal', 'login.microsoftonline.com'];

function safeFetch(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!ALLOWED_HOSTS.includes(url.host)) {
    throw new Error('URL not in allowlist');
  }
  return fetch(url);
}
```

---

## Manual (report + suggest approach; do not auto-apply)

- **Token storage migration** — moving from `sessionStorage` (Tier 1 default) to httpOnly cookies is a large architectural change. Requires backend `Set-Cookie` with `HttpOnly` / `Secure` / `SameSite=Strict`, and CSRF protection added to every mutation. Surface as architectural; do not propose silently.
- **Auth guard refactor** — adding `<ProtectedRoute>` wrappers across routes that previously rendered without one. Identify the routes; let the developer wire them.
- **CSP tightening** — if the diff adds a third-party script or font, the API's CSP (`api-performance.md`) may need to widen `script-src` or `font-src`. Cross-coordination with the API change; surface as architectural.
- **CORS** — origin changes belong on the API side (`Api:AllowedOrigins`). Coordinate.
- **Dependency vulnerabilities (`npm audit`)** — Critical / High block per `web-dependency-security.md`. Auto-apply `npm audit fix` only when it does not introduce a breaking version change; otherwise propose the upgrade path and let the developer decide.
- **Third-party script SRI** — add `integrity` + `crossorigin="anonymous"` to external `<script>` and `<link>` tags. The hash must match the served file; surface to the developer with the suggested hash so they can verify and pin.
- **Cross-origin messaging architecture** — multi-iframe / multi-window flows with `postMessage` typically need an architectural review before adding handlers.
