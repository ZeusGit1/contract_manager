# Styling

Visual design tokens, color palette, typography, breakpoints, theme tokens, and the responsive system are owned by the **design system** in `rules/design/_core-requirements.md` and its companions (especially `responsive-and-mobile.md`). This file covers only the dev-side CSS implementation choices that the design system does not dictate.

- **CSS Modules** — required for all component-scoped styles. Plain CSS, not SCSS. (Tier 1 deliberately diverges from the firm full Tier 1+ standard on this point; recorded in `decisions.md` template.)
- **MWS tokens** — defined in `src/mws/tokens.css` as CSS custom properties on `:root`. Components consume them via `var(--mws-...)`. When the firm publishes a real `@mws/design-system` package, swap the `src/mws/` folder for the package import.
- **Container Queries** — prefer over media queries when the layout depends on the component's container width, not the viewport.
- No inline styles except for truly dynamic values (e.g., calculated widths set via JS).
- No CSS-in-JS libraries (styled-components, Emotion, etc.).
- Use `color-mix()` for semi-transparent tints rather than hardcoded `rgba` values.
- Use `min-height: 100dvh` (dynamic viewport height) rather than `100vh` for full-height layouts.
- Do not import a global CSS file from a component module; import global resets and tokens once in `src/main.tsx` (or `src/App.tsx`).
