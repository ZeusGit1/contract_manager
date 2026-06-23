# Code-review findings — fix/intake-submit-fix-2

## Web layer

Walked `code-review-web.md` against the 6 changed files.

**Findings:** 0 Critical · 0 High · 0 Medium · 0 Low.

Notes:

- Primary button text is now theme-aware: white in light theme, navy in dark theme — matches the design system's filled-accent foreground rule (white-in-light / navy-in-dark on `--accent-interactive` fills).
- Intake submit success no longer routes to `/contracts/:id`, which couldn't resolve under Phase-1 synthetic data. New target is `/?submitted=<contractNumber>` with a dismissible success banner on the dashboard. Comment in each intake screen explains why.
- Dashboard reads the `submitted` query param and renders a one-line success banner (pale-success fill + check-circle icon + navy text, theme-stable per the design rule).
- No new components, no new dependencies, no new tests required (UI-only success-state surface; banner is data-driven from URL).

No mechanical fixes required.
