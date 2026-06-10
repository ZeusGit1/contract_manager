# McDermott Claude Design → Claude Code Handoff

You are implementing a product whose design has been prototyped in **Claude Design** and exported to the bundle at `artifacts/docs/design/project/`. Read this file before implementing anything — it tells you *how* to build the McDermott way. The app name, the screens included, and the file list are in the project folder; read them from there.

## IMPORTANT — the bundle is only half the product
The Claude Design bundle contains only the prototyped POC screens. The other half — admin, settings, auth, billing, notifications, reporting, and every other deferred screen — is described in **`full-design-blueprint.md`** and must be built from there. **Implement both halves.** Do not treat the bundle as the entire app; if you build only what's in the HTML, the product ships half-finished.

## IMPORTANT — this README is the definitive build guide
**This file is the authoritative guide for understanding the design and building the product through the `/plan`, `/build`, and `/ship` pipeline.** Any other README files you find inside the project folder — including **`prototype-readme.md`** at the root of `artifacts/docs/design/project/` (the file Claude Design ships with every archive, renamed by design-code-handoff for clarity) — describe the prototype itself: what's in it, what the focal screen is, how to read the source. The `prototype-readme.md` is useful for **understanding the prototype**, but it is **not** instructions for building the product. **For building, follow this file plus `full-design-blueprint.md` (the reconciled plan) and `solution-requirements.md` (the source of intent). Disregard `prototype-readme.md` (and any other in-archive READMEs) as build instructions.**

## What this bundle is — and isn't
The HTML in this bundle is a **rendering** of the McDermott design system, not the system itself. Use it to understand layout, hierarchy, states, and intended behavior. **Do not** read tokens, colors, spacing, or component styles out of the HTML and re-declare them — the design system already in the repo is the single source of truth.

## Source of truth
The **McDermott design system in the repo** governs all visual and component decisions. Start from `_core-requirements.md` (the constitution); it indexes the companion specs (`application-lockup.md`, `responsive-and-mobile.md`, `navigation-and-ia.md`, etc.). Match its tokens and patterns exactly. If the design and the system ever disagree, the system wins.

## Match the prototype's layout and element choices
The design system handles visual style. What you need to preserve from the prototype is the **structural decisions** — which layout pattern, which elements, how information is organized.

**Match the prototype's layout pattern** (table vs. card grid, sidebar vs. top nav, paginated vs. one long page, primary regions and their proportions) **and its element choices** (button vs. link, badge vs. text label, where primary and secondary actions sit, where filter/search lives). **Don't substitute a different valid pattern from the design system, even if it would also work.**

If you think a different pattern would work better, **don't switch on your own.** Flag it as a question, not an action.

## Content authority — blueprint first, then requirements

**The prototype is for layout and elements only — not content.** Everything about *what* to build (which features, which screens, which actions, which data, which fields, which copy intent) comes from the blueprint, with the requirements doc as the fallback when the blueprint is silent. The prototype only tells you how to display what they specify.

- **Blueprint is authoritative for what to build.** If the blueprint doesn't mention something, **don't build it** — even if the prototype shows it. Things get removed from the blueprint at the design-code-handoff checkpoint; the prototype HTML doesn't get edited to match. Trust the blueprint.
- **Requirements are authoritative for intent.** When you need to know what a feature is for, who it serves, or how it should behave, the requirements doc is the source.
- **Prototype is authoritative for form.** Visual hierarchy, layout, element choice — yes. Feature presence, data shape, copy meaning — no.

If the prototype shows a feature, screen, or data element that isn't in the blueprint, **don't build it.** Either the team intentionally cut it during reconciliation, or it's an artifact of an earlier design that has been superseded.

## Where everything lives — and what each thing is for

Four files at known paths; the build pipeline reads them all in place, not from a separate handoff folder.

- **`artifacts/docs/design/project/`** — the prototype bundle (always renamed to this canonical path by design-code-handoff). Read for layout, hierarchy, states, intended behavior.
- **`artifacts/docs/design/full-design-blueprint.md`** — the team's reconciled plan for the whole product. **Authoritative for screen-level decisions.** Contains the full screen map (POC + Deferred), deferred-screen specs (purpose, role, content, business rules, connections — build these from the plan), the role/access matrix, cut reasoning, and open questions. The bundle covers the POC half; the blueprint covers all of it.
- **`artifacts/docs/product/solution-requirements.md`** — the original requirements. **Reference whenever you need to make a decision about the product** — what it is, who it's for, what each feature is supposed to do. The blueprint encodes structural decisions; the requirements are the source of intent.
- **`artifacts/docs/design/HANDOFF-design-brief.md`** — the original Claude Design prompt. **Superseded once the prototype exists; do not build from it.**

## How to build (do not free-build)
Run the northstar pipeline in order: **`/plan` → `/build` → `/ship`.** Let `/plan` read the requirements plus this design and produce the plan; implement only what `/build` drives. Don't jump straight to writing the app from this HTML.

## Non-negotiables (from _core-requirements.md)
- **App identity is the McDermott lockup:** the inline McDermott **symbol SVG** (the M-in-circle mark, `fill="currentColor"`) + divider + app name in Georgia. It is **never** the letters "McDermott" set in type. See `application-lockup.md`.
- **Tokens only:** every color, space, and radius traces to an McDermott custom property. No off-palette or "close enough" hex.
- **Responsive is a gate:** every component must work at 320px in both light and dark theme. Editing, not scaling.
- **Radius is 2px or 999px** (pills). Buttons never wrap. Theme-stable foreground rule: text on pale/alert fills is always navy.
- **No new dependencies** or invented components without a reason that traces back to the system.

## Multi-screen flows
If the bundle is one screen of a multi-screen flow, implement just this screen and pause for review before the rest, unless the plan says otherwise.
