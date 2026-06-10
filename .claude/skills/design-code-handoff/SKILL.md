---
name: design-code-handoff
description: >-
  Reconciles `full-design-blueprint.md` in a single pass against the Claude Design prototype,
  `solution-requirements.md`, AND the gates for the product's tier (defined in the project's root
  `claude.md`). Reads the blueprint and requirements from `artifacts/docs/design/` and
  `artifacts/docs/product/`, takes Claude Design's exported bundle as input, and updates the
  blueprint in place (and the requirements doc if scope changes or a tier promotion were accepted).
  The user confirms all findings at once. Use once the prototype is approved and the user is ready
  to start the build, e.g. "the prototype is done, what's next."
---

# design-code-handoff

By the time the prototype is approved, the blueprint is stale (prototypes evolve during iteration), the requirements may have drifted from the design (features dropped, scope crept in), and the design may have crept beyond the gates allowed at the product's tier (additions during prototyping that bump the product into a higher tier). This skill reconciles all three in one pass: it reads the prototype, the requirements, and the tier gates directly, detects all drift, and asks the user to confirm once. After sign-off, it updates the blueprint in place (and the requirements doc if scope changes or a tier promotion were accepted).

## Inputs

This skill operates on two paired paths inside the active directory: **`artifacts/docs/design/`** (where design-foundation wrote its outputs) and **`artifacts/docs/product/`** (where the requirements live). Three of the four inputs are already there:

1. **`artifacts/docs/design/full-design-blueprint.md`** — produced by design-foundation. The skill updates this file in place during reconciliation.
2. **`artifacts/docs/product/solution-requirements.md`** — written by the requirements-gathering skill. The skill **actively compares this against the blueprint**, and may update it in place if the user accepts scope additions, rewordings, or a tier promotion during the checkpoint.
3. **`claude.md` at the project root** — read once for the **tier-gate definitions**. The file defines three tiers (Tier 1, Tier 2, Tier 3), each with a different set of gates. The skill applies the gates for whichever tier `solution-requirements.md` names.
4. **Claude Design's project archive** — the only input the user provides for this run. This is the **"Project archive"** export from Claude Design (the full package — not the HTML-only export or a single-screen export). The user places it in `artifacts/docs/design/`; the skill identifies it (asking inline if multiple candidates exist) and renames it to the canonical path **`artifacts/docs/design/project/`**.

If the design bundle is missing, ask for it before starting — there's no useful partial run.

## Procedure

The skill runs in five steps, with **one combined validation checkpoint** between detection and application. The user confirms all findings at once — no separate review per comparison.

**Run Steps 1–4 silently.** Don't narrate to the user what you're reading, what you're inventorying, what deltas you're finding, or what each detection step turns up. No *"I'm reading the blueprint now,"* no *"I found 3 added screens,"* no per-step recaps, no "here's what's in the prototype" inventories. Work invisibly. The first finding the user sees from this run is the **unified checkpoint output** — until then, all detection and processing happens in the background. The only allowed user-facing messages during Steps 1–4 are the inline questions the file identification protocol requires when the archive is genuinely ambiguous (multiple candidates, possible same-screen duplicates, a file that may not be a real screen) — those are necessary input, not narration. Keeping the run silent until the checkpoint is what lets the findings stand out; raw processing detail in chat dilutes them and tires the user before they need to decide.

### 1. Identify and normalize the prototype, then read everything
**Use the file identification protocol in `assets/file-identification-protocol.md`** to (1) find the project archive at the folder level (asking the user inline if multiple candidates exist), (2) rename it to the canonical path `artifacts/docs/design/project/`, and (3) find any `README.md` at the archive root, **rename it to `prototype-readme.md`** (to disambiguate it from build-side READMEs), and follow its guidance to identify the focal screen, then follow its imports to discover the rest of the screens — or fall back to scanning HTMLs directly if no prototype-readme is present. **Leave the archive's files in place otherwise** — the protocol only moves files into `project/_skipped/` when the user explicitly asks for a specific file to be removed. If the protocol's error fires (no parseable HTML content found), follow its recovery instructions and stop the run.

Then read everything you need:

- Open `artifacts/docs/design/project/` and inventory every screen the prototype contains: name, role (which user it serves), what it presents in plain language, what it connects to (which screens it links to, by what action), and its **footprint type** — one of: **full rendered screen**, **out-of-scope stub/placeholder**, or **nav entry only**. Only these three footprint types count as evidence a screen exists in the prototype. **Do not treat code comments, commented-out or dead code, or seed/sample data as evidence that a screen or feature is intended** — these are frequently leftovers from removed work, and inferring intent from them re-introduces deleted features. Also capture which screens from the blueprint (both Prototype-tagged and Deferred) have any presence (stub or nav entry) versus none — this feeds the absence check in step 2.
- **Capture notable visual/interaction decisions** beyond default design-system application (custom styling, iterated components, micro-interactions, states, animations, layout choices). For each: **what**, **where**, and a **source pointer** (file/screenshot) if available. Feeds the checkpoint and persists into the blueprint after sign-off.
- Read `solution-requirements.md` and extract the requirement items it specifies (features, user roles, journeys, data entities, any screens it names), **plus the tier the product is on** (one of Tier 1, Tier 2, Tier 3).
- Read `claude.md` at the project root and extract the gates for the named tier.

Do all of this directly from the source files — do not ask the user to describe what was built, specified, or which tier applies.

### 2. Detect prototype-vs-blueprint deltas
Compare the prototype inventory against the screen map section of `full-design-blueprint.md` and classify the differences:

- **Navigation changes** — Prototype-tagged screens whose connects-to differ from the plan.
- **Added screens** — screens in the prototype that don't appear in the plan.
- **Removed / absent screens** — any screen in the plan with no footprint in the prototype (no rendered screen, no stub, no nav entry). For a Prototype-tagged screen this is a removal. For a Deferred screen, absence is normally expected — but **flag it as possibly removed when**: (a) its sibling screens in the same group are present as stubs or nav entries while it is not (e.g. the admin panel stubs Billing rates and Band plans but not Staff roster), or (b) its only remaining trace is a stale comment, dead code, or seed data. Surface every such flag at the checkpoint.
- **Tag changes** — Deferred screens that ended up prototyped, or Prototype-tagged screens that weren't built.
- **Content shifts** — Prototype-tagged screens whose plan-described contents don't match what the prototype actually shows.

The result is the **proposed-updated blueprint** — what the blueprint would look like after the prototype's evolution is incorporated. Use this as the comparison target in steps 3 and 4.

### 3. Detect requirements-vs-blueprint deltas
Compare `solution-requirements.md` against the proposed-updated blueprint from step 2 and classify the differences:

- **Missing implementations** — items specified in the requirements (features, user roles, journeys, screens) that don't appear in the blueprint as either a Prototype screen or a Deferred screen. The team may have dropped them — accidentally or deliberately.
- **Unrequired additions** — screens or features in the blueprint that aren't traceable to any requirement. Usually means scope crept in during planning or prototyping.
- **Interpretation drift** — items present in both requirements and the blueprint, but where the design reads differently from the requirement (a screen handles a different action than implied, a role's permissions differ, a feature has different scope).

Comparison is **model-judged (loose)** — phrasing differences shouldn't trigger false positives.

### 4. Detect tier-gate violations
Check the proposed-updated blueprint against each gate for the product's tier (from `claude.md`). For each failed gate, surface a finding with: the specific gate that failed, what in the blueprint violates it (screens, features, capabilities), and a proposed fix to comply at the current tier (e.g., defer a feature, remove a screen, redesign a flow).

### Checkpoint — user validates all findings (required, do not skip)
**Merge all findings from steps 2, 3, and 4 into one simple unified list for the user.** The user should not need to know whether a difference is between the design and the blueprint or between the design and the requirements — internally the skill tracks the source, but the user just sees one clean list grouped by what the difference looks like.

Group findings into six user-facing categories:

- **Added** — something in the design that wasn't in the original plan. Covers prototype-added screens AND unrequired additions in the blueprint.
- **Missing** — something originally planned that isn't in the design. Covers Prototype-tagged screens that weren't built AND requirements that don't appear in the blueprint.
- **Changed** — something present in both but looking different. Covers navigation tweaks, tag changes, content shifts, AND interpretation drift between requirements and blueprint.
- **Tier-gate violations** — anything in the design that exceeds the product's tier.
- **Deferred-screen confirmation (required)** — **list every Deferred screen in the blueprint** and have the user confirm each individually: **keep deferred**, **remove entirely**, or **promote to Prototype**. Do not silently carry deferred screens forward. A screen the user deliberately removed is indistinguishable from one that's legitimately deferred unless the user says so — always ask, even when the user has previously said "keep the deferred screens" (that means *don't drop by accident*, not *don't check*).
- **Visual/interaction decisions to preserve** — list each notable visual or interaction decision captured from the prototype in Step 1 (distinctive styling, custom or iterated components, bespoke micro-interactions, particular states, animations, layout choices) and ask the user to confirm it's worth recording in the blueprint. **Default to including them** — let the user drop any that are incidental.

For each finding, propose the specific update it implies. The user signs off **once** for the whole set.

Per category, the user can:

- **Added:** accept (and codify in `solution-requirements.md` if it wasn't specified there), or remove/defer.
- **Missing:** add it back (Prototype or Deferred in the blueprint), or accept it was dropped (and remove from `solution-requirements.md` if it was specified).
- **Changed:** keep the design (and update `solution-requirements.md` if the original wording came from there), or revert the design to match the original.
- **Tier-gate violation:** fix to fit (apply proposed change), or promote the tier (Tier 1 → 2 or 2 → 3; skill updates `solution-requirements.md` and re-checks against the new tier's gates — any new violations surface in this same checkpoint).
- **Deferred-screen confirmation:** keep deferred (no change), remove entirely (delete from blueprint and `solution-requirements.md`), or promote to Prototype (move into the active screen set with full spec).
- **Visual/interaction decisions to preserve:** keep (record in the blueprint with the screen reference and prototype source/screenshot pointer), or drop (treat as incidental, don't record).

Ask the user inline and wait for sign-off before applying anything. **Do not split this into multiple checkpoints — keep the cognitive load low.**

### 5. Apply updates to the blueprint (and the requirements doc, if needed)
After sign-off, update `full-design-blueprint.md` in place: refresh the master table (tags, connects-to, contents), rewrite the navigation graph to match the prototype, fix the deferred-screen details (corrected connects-to, removed blocks for newly promoted screens, added blocks for newly deferred ones or accepted missing implementations), and append a short "Reconciled with prototype on [date]" note covering all three reconciliations (prototype, requirements, tier-gates) for traceability.

**Persist confirmed visual/interaction decisions** by adding (or appending to) a **"Design decisions to preserve"** section in `full-design-blueprint.md` under the cross-cutting notes. For each decision the user kept at the checkpoint, record in plain language: **what it is**, **which screen/element it applies to**, and a **pointer to the prototype file and screenshot** (if available) that demonstrate it. This is the durable record that survives outside the prototype — once the bundle is gone, the blueprint still says "the dashboard's hero card uses a custom gradient header" with a pointer to where to verify.

If the user accepted scope changes or a tier promotion, update `solution-requirements.md` in place too: add new feature entries, reword interpretation-drift items, remove dropped items, or update the named tier. Append "Updated alongside design-code-handoff on [date]".

The design brief (`HANDOFF-design-brief.md`) is left in place but is **superseded by the prototype** — Claude Code should not build from it. However, **if it will be regenerated or re-run in Claude Design** (e.g. to re-prototype or extend the product), **it must be re-validated against the reconciled blueprint first**: scan it for any reference to a screen or feature that was removed or remains deferred, and either strip the reference or wrap it as an explicit "context only — do not build" guardrail. A regenerated brief must not contain a hook — reference-data block, "larger product" mention, or screen block — for anything not in the prototype's final screen set.

## At the end of every run — tell the user what's next

**Communicate this clearly as the final message of the run.** No preamble:

The blueprint is reconciled against the prototype, the requirements, and the gates for the product's tier. If scope changes or a tier promotion were accepted, `solution-requirements.md` was updated too. The blueprint passes all gates for the current tier.

**Next step:** Run the build pipeline (or hand the project to your developer) — Code reads everything in place from `artifacts/docs/design/` and `artifacts/docs/product/`. Stay available to review what gets built.
