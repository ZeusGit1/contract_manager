---
name: design-foundation
description: >-
  Turns a product requirements document into a prototype plan: decides which screens belong in the
  prototype, defines what each contains and how they connect, writes a staged brief for Claude Design
  to prototype them, and an architecture spec for the deferred screens for Claude Code to build.
  **Reads `artifacts/docs/product/solution-requirements.md` and writes its outputs to
  `artifacts/docs/design/`.** Presents `HANDOFF-design-brief.md` to the user as a downloadable file.
  Use whenever the user has a requirements doc, PRD, spec, or brief and wants to move toward a
  prototype, MVP, or a Claude Code handoff — including when they say "POC" or "proof of concept."
---

# design-foundation

A requirements doc describes a whole product, but you don't prototype the whole product. The prototype exists to validate what's novel or central and to give stakeholders something concrete to react to; everything else should be specified for the builder, not prototyped. This skill makes that selection deliberately and hands clean, separate deliverables to Claude Design and Claude Code.

## Core model

Build one canonical **Screen Map** of the entire product, then derive both outputs from it: `full-design-blueprint.md` (the canonical plan, humans + Code) and `HANDOFF-design-brief.md` (a staged prompt for Claude Design). Because both derive from one source, the prototype and the full build stay consistent.

The Screen Map lists every screen with role, platform, contents, connections, value score, uncertainty score, Source tag, and a **Prototype / Deferred** tag.

Keep the prototype small: Claude Design does its best work on a focused ask, and deferring is cheap. Bias every decision toward a smaller Design ask.

## Inputs

This skill reads from one **fixed input path** and writes to one **fixed output path**, both inside the active directory:

- **Input:** `artifacts/docs/product/solution-requirements.md` (written by the requirements-gathering skill).
- **Output:** `artifacts/docs/design/` — both `full-design-blueprint.md` and `HANDOFF-design-brief.md` are written here.

The two paths are paired: requirements live in `product/`, design artifacts live in `design/`, side by side.

**At the start of every run:**

1. From the active directory, open **`artifacts/docs/product/solution-requirements.md`**. The path and filename are always exactly this; don't search for alternatives. **Do not ask the user to upload anything.**
2. If the file is missing, ask the user to confirm they've run the requirements-gathering skill before continuing — don't try to recover by guessing.

Extract from `solution-requirements.md`: the product summary and primary value, user roles, features, user journeys, data entities, and any screens/flows it names. If the doc has a known section structure, map its sections onto these fields directly. *(Pin this skill to your requirements skill by recording its section names here, so extraction is deterministic.)*

Write the output files to `artifacts/docs/design/full-design-blueprint.md` and `artifacts/docs/design/HANDOFF-design-brief.md`. Create the directory if it doesn't exist.

**At the end of every run:** present `artifacts/docs/design/HANDOFF-design-brief.md` to the user **as a downloadable file** — a clickable file link or download card, depending on what the host environment supports. **Do not paste the file's contents into the conversation.** The user needs to save the actual file to their computer so they can upload it into Claude Design in the next step; pasted text is the wrong format for that handoff.

**Then state the next steps clearly so the user knows exactly what to do.** End with a short scannable numbered list — no preamble before it:

1. **Save the HANDOFF brief** from the download link above.
2. **Open Claude Design** (claude.ai/design), enter your product name, select "High Fidelity", **select the McDermott design system**, then click "Create".
3. **Upload the HANDOFF brief** and click "Send".
4. **Build screen 1**, then ask Claude Design to build screen 2, and continue through screens in flow order.
5. **Once the prototype is approved**, export it from Claude Design using the **"Project archive"** option (the full export, not HTML-only or a single screen), drop the archive into `artifacts/docs/design/` (the design-code-handoff skill will rename it to `project/` for you), and run the **design-code-handoff** skill to reconcile and finish the handoff.

## Procedure

Run in two phases with a **required checkpoint** between. Phase A proposes a selection; the user validates it; Phase B writes the files. The gate exists because the selection decides what gets prototyped — a wrong selection wastes a whole Design pass. Never skip to Phase B without sign-off.

### Phase A — analyze and propose
1. **Build the Screen Map.** Enumerate every screen across all roles, including the unglamorous ones (auth, settings, admin, billing, empty/error states). For each: stable ID (`S1`…), name, role, platform, what it contains, what it connects to (by ID + the action), and a **Source** tag indicating where the screen came from:
    - `requirement` — named or clearly implied by the requirements.
    - `inferred-infrastructure` — needed for any real product (auth, settings, errors).
    - `inferred-feature` — needed to fulfill a requirement.
    - `suggested-enhancement` — proactive, not required.

    IDs are referenced everywhere downstream — keep them stable. Be conservative with `suggested-enhancement` — only add what feels essential, never pile on features the user didn't ask for.
2. **Score each screen 1–5** on **Value** (how central to the core value; would a demo touch it?) and **Uncertainty** (how novel/unclear the UX is, such that *prototyping it* would change a decision).
3. **Make the selection.** Tag a screen **Prototype** if **Value ≥4 OR Uncertainty ≥4** — this catches both the core-value screens and the ones that most need feedback. Then pull in any **connective screens** the happy path can't run without. Tag everything else **Deferred**.
4. **Apply the budget.** The screen budget (default **6**) is a hard ceiling, not a suggestion — the main defense against overwhelming Claude Design. If more screens qualify, rank by combined score and draw the line at the budget; defer borderline screens rather than grow the ask. Note the screens just above/below the line for the checkpoint.

### Checkpoint — user validates the selection AND Claude's additions (required, do not skip)
Before writing anything, present and get sign-off on:

1. **The proposed prototype screen list** — one line each on why each screen is included.
2. **What's deferred** — what didn't make the cut.
3. **The borderline screens** at the budget line — what was close.
4. **Claude's additions** — every screen or feature with a Source tag other than `requirement`. Group them by source so the user can clearly see what Claude inferred or suggested versus what came from the requirements doc:
    - **Inferred infrastructure** (auth, settings, error states, etc.) — usually safe but worth confirming.
    - **Inferred features** (added to make a requirement work) — worth confirming the inference is right.
    - **Suggested enhancements** (proactive additions) — most likely to be removed; surface these prominently.

    The user can accept or remove any addition.
5. **The Skill settings** in effect.

Ask the user to confirm or adjust — move screens in/out, remove additions Claude suggested, change the budget or Skill settings. Ask the user inline and wait for sign-off before proceeding. Lead with a clear recommendation, not a blank menu — the user validates a strong proposal, they don't decide from scratch. If the selection shifts, re-check the flow is still walkable.

### Phase B — generate the deliverables
Only after sign-off, write the two output files: `full-design-blueprint.md` and `HANDOFF-design-brief.md` (described below). Both derive from the validated Screen Map and reflect the final selection — including any Claude additions the user kept or removed at the checkpoint.

After Phase B, this skill's job is done. The sibling **design-code-handoff** skill picks up from there once the prototype is approved.

## Output file names — use these exactly
Two files come out of this skill. When they reference each other, use these exact names so links stay live.

| Filename | Consumer | Purpose |
|----------|----------|---------|
| `full-design-blueprint.md` | Humans + Claude Code | The canonical plan: selection, scoring, full screen map, deferred-screen details, Skill settings, open questions, handoff |
| `HANDOFF-design-brief.md` | Claude Design | Staged prompt brief for the prototype screens |

## What each file contains
- **full-design-blueprint.md:** the single canonical planning document. Sections, in order: an at-a-glance summary (product, prototype count vs total, direction count, demo persona); the core flow as a numbered walkthrough; a *what's-in-and-why* table with scores; a brief "what's deferred" list pointing forward to the detailed section; Skill settings used; open questions for sign-off; the full screen map (master table with every screen — ID, name, role, platform, contains, connects-to, tag, value, uncertainty, source — plus the prototype navigation graph); deferred screen details (role/access matrix and per-screen blocks of purpose, who uses it, content in plain language, business rules, connects-to); cross-cutting notes; and handoff steps. Humans read it top to bottom; Code reads the structured sections; design-code-handoff updates it after the prototype is approved. **No routes, endpoints, data schemas, or UI components** — those are Code's decisions.
- **HANDOFF-design-brief.md:** a short how-to (onboard the McDermott design system, paste the brief once, then build incrementally by steering through one screen per turn so each reuses the patterns the previous one established); an **Anchor** that orients Claude Design on the whole product (product, audience, tone, platforms, seeded-data/no-auth), a **"adhere to the onboarded McDermott design system" line** (the system is the source of truth for components, tokens, typography, and spacing — design decisions are guided by it), a **"larger product (context only — do not build)" paragraph** naming the broader product scope (admin, settings, user management, billing, notifications, reporting, etc.) so the prototyped screens reflect a real larger product without inviting hallucinated ones, a **"less is more" line** (prefer minimal components in service of each screen's purpose; no optional metadata or secondary controls), the ordered prototype screen list, and a closing instruction to build screen 1 first and wait; one **screen block per prototype screen** in flow order, written as **purpose + primary action + link onward**, *not* a component list (★ the highest-uncertainty ones); a **scope guardrail** (one direction, no extra screens, variant note). Specifying components in the brief tends to make Claude Design include all of them; naming the screen's purpose lets it choose the form, which is what it's actually good at.

## Skill settings (defaults keep the prototype small and decisive)
- **screen_budget** — hard ceiling on prototype screens. Default **6**. Lower freely; raising is a conscious choice.
- **directions** — design directions per screen. Default **1** (one confident answer).
- **variant_exploration** — default **off**. When on, applies *only* to ★ high-uncertainty screens, one or two of them, two variants each — never across the board.
