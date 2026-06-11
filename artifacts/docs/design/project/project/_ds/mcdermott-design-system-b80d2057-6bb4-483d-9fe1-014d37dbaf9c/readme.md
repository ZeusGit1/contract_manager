# McDermott Design System

The shared design system for McDermott's internal AI applications. Every app shares **one identity**: a single symbol + divider + app-name lockup (no per-app logos), a fixed token set for color, type, and spacing, light **and** dark modes, and a consciously restrained, professional aesthetic.

> **Version 1.4** · A navy + pale + accent visual system for building beautiful, consistent, enterprise-grade web applications. **Saturated colors are targeted spice, not default tools.** Every value is a CSS custom property — never hardcoded.

This project is the machine-readable build of that system: token CSS, foundation specimen cards, reusable React primitives, and full-screen UI-kit recreations. The constitution and companion specs live in [`docs/`](docs/).

---

## Sources

This design system was built from the official McDermott Design System repository. If you have access, explore it to build richer, more faithful designs:

- **GitHub:** [`chriskonopka/DesignSystem`](https://github.com/chriskonopka/DesignSystem) `@main`
  - `_core-requirements.md` — the constitution (tokens, critical rules, component specs)
  - `application-lockup.md` — symbol + divider + name lockup and naming conventions
  - `app-shell-and-headers.md` — top-bar minimalism + sidebar drawer pattern
  - `navigation-and-ia.md` — sidebar contents + information architecture
  - `steppers-and-wizards.md` — stepper spec + anti-patterns
  - `extrapolating-the-system.md` — pre-flight compliance checklist for un-spec'd components
  - `responsive-and-mobile.md` — every component works down to 320px
  - `mws-design-system-showcase.html` — live reference rendering of every component (light + dark)

All eight source files are mirrored in [`docs/`](docs/). The showcase is a **reference rendering only** — never re-derive tokens, colors, or spacing from it; they live in `tokens/`.

---

## What this system is for

McDermott runs a growing fleet of **internal AI applications** — purpose-built tools for legal/professional workflows (e.g. "Deposition Summarizer", "Privilege Log Analyzer", "Review Cost Estimator"). Rather than each app inventing its own look, they all draw from this one system so the firm's hundreds of apps read as a single, trustworthy product family.

The core surfaces this system dresses:
- **App shells** — sidebar + top bar + content frame, persistent across pages
- **Wizard/builder flows** — multi-step estimators and document processors
- **Data tables** — the workhorse for matter lists, logs, and review queues
- **AI surfaces** — chat, generation, citations, tool calls, streaming
- **Forms** — matter setup, settings, configuration

---

## Brand voice & attributes

**Precise. Warm. Confident. Never cute. Editorial in headlines, neutral in UI.**

---

## CONTENT FUNDAMENTALS

How McDermott copy is written. The voice is that of a senior professional who respects the reader's time — clear, exact, and quietly confident. It never performs enthusiasm and never talks down.

### Casing
- **Headlines / page titles → sentence case.** "Estimate summary", never "Estimate Summary". This is the single most-broken rule; enforce it.
- **Proper nouns → Title Case.** App names are Title Case ("Deposition Summarizer") because they are names.
- **Eyebrows / labels / buttons → ALL CAPS.** Eyebrows track at 10%, buttons at 5%.
- **Everything else → sentence case.**

### Buttons
Always **verb + noun**: "Save changes", "Generate estimate", "Request access". Never bare "OK", "Yes", "No", "Submit". Labels stay short enough to never wrap (`white-space: nowrap`).

### Errors & system messages
Format = **what happened + (if known) why + how to fix.** Errors are shown as navy text on a pale-orange left-bordered fill — **never red text**. No exclamation marks. No "Oops!", "Whoops!", "Just", "Simply". Example:
> "Couldn't save the matter. The connection dropped mid-save — check your network and try again."

### AI copy
- **Confidence is linguistic, never numeric** — "may", "likely", "appears to". Never "87% confident".
- **Citations are mandatory** for factual claims. Unsourced claims are never dressed up as sourced.
- AI-generated content is **labelled** ("Generated", with a `ph-sparkle` mark) — it never silently blends with human content.
- Permission prompts name the **specific** consequence ("Send email to jordan@…"), never generic "Confirm".

### Forms copy
- **Mark optional, not required.** No asterisks. Append "(optional)" to optional fields.
- Placeholder text is never the only label.

### Pronouns & tone
Second person ("you") for instructions and empty states; the product refers to itself in the third person or not at all ("Working on it…"). No first-person "I". Tone is collegial, not chummy.

### Emoji
**Not used.** No emoji in UI, copy, or iconography. Status and meaning are carried by Phosphor icons + text, never emoji.

---

## VISUAL FOUNDATIONS

The look is **restrained, editorial, and enterprise-calm.** Navy does the heavy lifting; pale tints carry status; one accent (blue in light, teal in dark) marks everything interactive. Saturated brand colors appear as rare, deliberate accents — never as default surfaces.

### Color
- **Base:** navy (`#000042`) for text on light and for the sidebar (navy in *both* themes). Page is near-white `#F7F7FC` (light) / deep navy `#13134E` (dark); surfaces are white / `#1C1C66`.
- **One interactive accent:** `--accent-interactive` = **blue** in light, **teal** in dark. Primary buttons, focus rings, selected states, active tabs, single-series charts, AI cursor — all use it.
- **Teal is restricted.** `var(--color-teal)` direct usage is allowed in *only two* places: the navy sidebar's active state, and categorical chart series. Everything else interactive uses `--accent-interactive`.
- **Pale tints** (`--color-pale-*`) carry status and soft emphasis. They are **theme-stable** — they don't flip between modes, so text on them is **always navy**, never `--text-primary`.
- **Alert colors** (error/success/warning) are **background fills only**; text on them is always navy. Default status treatments use the *pale* variants, not the saturated alert colors.
- **Neon** (`#D2FF3E`) is a max-attention-only color — used almost never.
- Internal utility grays (`--color-navy-gray-*`) are **never** used in client-facing UI.

### Type
- **System fonts only — no web fonts.** `--font-mix` is **Georgia** and carries the brand: it sets display headings, H1–H3, card titles, navigation links, and the app name in the lockup. Body, UI, and buttons use the system sans stack. Monospace is reserved for identifier badges, code, and figures.
- Scale: Display 64 / H1 44 / H2 32 / H3 24 / Body-lg 20 / Body 16 / Eyebrow & Caption 13. Display drops to 44 at ≤768px and 32 at ≤480px.
- Headlines carry **negative tracking** (Display −4%, H1 −3%, H2 −2%); eyebrows carry **+10%**, buttons **+5%**.

### Spacing & layout
4px base scale (`--space-1`…`--space-9`). Vertical rhythm: `--space-4` between siblings, `--space-6` between sections, `--space-8` between major regions. Content column caps at `min(100%, 1200px)`. Mobile design is **editing, not scaling** — every element is kept, removed, moved, reshaped, or replaced when adapting down to 320px.

### Corners, borders, elevation
- **Radius is binary: 2px (`--radius`) or 999px (`--radius-pill`).** Nothing in between, ever.
- Borders are **1px, light** (`--border-light`) — no heavy outlines.
- Shadows are **subtle and rare** — `--shadow-sm/md/lg` are low-opacity and reserved for genuinely floating surfaces (cards on hover, modals, popovers, drawers, toasts). No drop shadows on everything.
- **Cards:** `--bg-surface`, 1px `--border-light`, 2px radius. Optional full-width 30px top-stroke in a secondary color. Hover = `translateY(-2px)` + `--shadow-md`. No colored-left-border-only cards.

### Backgrounds & imagery
No gradient backgrounds as a default, no textures, no full-bleed hero photography in the core UI. Surfaces are flat token colors. The one sanctioned gradient is a decorative card image-fill (pale-blue → pale-magenta) used as a placeholder.

### Motion
- Durations: 100ms micro / 200ms default / 300ms surfaces / 500ms choreographed. Easing: standard `cubic-bezier(0.4,0,0.2,1)`, emphasis for entering, exit for leaving.
- **Fades and short slides, no bounces.** Surfaces enter with a small scale (0.96→1) or slide (drawer/sheet). Decorative loops (skeleton pulse, cursor blink, thinking dots) exist but are **disabled under `prefers-reduced-motion`** — state transitions stay near-instant, never `transition: none`.

### States
- **Hover** on text-bearing clickable elements flips **both** border accent **and** text color to `--accent-interactive`. Border-only hover is the broken state.
- **Press / active:** one step darker, **no movement**.
- **Focus-visible:** always a 2px `--focus-ring` outline at 2px offset (3px on buttons). `outline: none` without a replacement is forbidden.
- **Disabled:** `opacity: 0.4`, `pointer-events: none`.
- **Loading:** label → spinner, dimensions retained.

### Transparency & blur
Used sparingly: scrims behind modals/drawers are navy-tinted (`--scrim`) with a 4px backdrop blur where supported. Secondary text uses alpha-on-navy / alpha-on-white rather than separate gray tokens.

---

## ICONOGRAPHY

- **Source:** [Phosphor Icons](https://phosphoricons.com/), **Regular weight only** (2px monoline stroke, no fill). Filled and duotone variants are **forbidden**.
- **In this project** the cards and UI kits load Phosphor from CDN (`@phosphor-icons/web`) via `<i class="ph ph-{name}"></i>`. In production React apps the system uses `@phosphor-icons/react`.
- **Sizes:** 16 / 20 / 24 / 32 / 48 / 64px — never in between. In-button icons lock to 16px.
- **Color:** navy on light, teal on dark — `var(--icon-default)` makes this automatic.
- **Accessibility:** decorative icons paired with a text label get `aria-hidden="true"`; icon-only buttons require an `aria-label`.
- **Common glyphs:** `list` (hamburger), `caret-right` (breadcrumb separator), `caret-up`/`caret-down` (sort), `dots-three-vertical` (kebab), `cloud-check` (autosave), `arrows-clockwise` (sync), `sparkle` (AI), `info`/`check-circle`/`warning-circle`/`x-circle` (alerts), `bell`, `lock`, `magnifying-glass`.
- **No emoji. No unicode glyphs as icons.** Meaning is carried by Phosphor + text.

### The brand mark
The only brand graphic is the **McDermott symbol** — an "M" inside a circle ([`assets/mcdermott-symbol.svg`](assets/mcdermott-symbol.svg)). It is an inline vector with `fill="currentColor"`, so it inherits its surface color (white on the navy sidebar, `--text-primary` on light surfaces). It is **never** the letters "McDermott" set in type, never recolored or cropped, never replaced by a per-app logo. It always appears as part of the lockup: **symbol + 1px divider + app name (Georgia, Title Case)**.

---

## CONTENT INDEX (manifest)

Root files:
- **`styles.css`** — global entry point (consumers link this one file). `@import` lines only.
- **`tokens/`** — `colors.css`, `typography.css`, `spacing.css`, `motion.css`, `theme.css` (light/dark aliases), `base.css` (reset, type helpers, `.lockup`).
- **`assets/`** — `mcdermott-symbol.svg` (the brand mark).
- **`docs/`** — the constitution + 7 companion specs + the reference showcase.
- **`components/`** — reusable React primitives, grouped by concern. Each has `<Name>.jsx`, `<Name>.d.ts` (props), `<Name>.prompt.md` (usage), and one `*.card.html` live demo per group:
  - **`core/`** — `Button`, `IconButton`, `Badge`, `Avatar`, `Card`
  - **`forms/`** — `Input`, `Checkbox` (+ radio), `Switch`, `Select`
  - **`feedback/`** — `Alert`, `Modal`, `Toast`
  - **`navigation/`** — `Tabs`, `Breadcrumb`
- **`ui_kits/deposition-summarizer/`** — a full interactive recreation of an internal AI app: login → matters data table → AI summary surface, with app shell, sidebar drawer, and theme toggle. See its `README.md`.
- **`SKILL.md`** — Agent-Skills-compatible entry point.

Foundation specimen cards (Design System tab) live in `guidelines/`, tagged `@dsCard` (Colors ×7, Type ×5, Spacing ×3, Brand ×2). Component demos and the UI kit are tagged cards too.

### Using the components

The compiler bundles every `<Name>.jsx` into `_ds_bundle.js` under the namespace `window.McDermottDesignSystem_b80d20`. In a card or kit HTML, link `styles.css`, load React + Babel + the bundle, then:

```js
const { Button, Badge, Input, Alert, Tabs } = window.McDermottDesignSystem_b80d20;
```

Set `data-theme="light"` or `"dark"` on `<html>` to pick the theme. Icons load from the Phosphor CDN (`@phosphor-icons/web`, Regular).

---

## The non-negotiables (memorize)

1. **Navy + pale + accent.** `var(--color-teal)` direct ONLY for the dark sidebar's active state and categorical chart series. Everything else interactive uses `var(--accent-interactive)`.
2. **Text on pale and alert fills is ALWAYS navy**, never `var(--text-primary)`.
3. **Border radius is 2px or 999px.** Nothing between.
4. **Buttons never wrap** (`white-space: nowrap`).
5. **Hover flips both border accent AND text color** to `--accent-interactive`.
6. **Sentence-case headlines.** Title Case is for proper nouns only.
7. **The identity is the symbol SVG + divider + name** — never the firm name set in type, never a per-app logo, never omit the divider.
8. **WCAG 2.2 AA is the floor.** Focus rings always visible; color never the sole indicator of state; touch targets ≥ 24×24.
9. **Phosphor Regular icons only.** No fills, no duotone, no emoji.
10. **Mobile is editing, not scaling.** Every component works 320 → 1920px in both themes.
