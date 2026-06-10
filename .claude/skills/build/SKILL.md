---
name: build
description: Scaffold (on first invocation) and implement the entire Tier 1 application end-to-end in a single pass — DB migrations + API controllers/services + Web features + tests inline. Pauses only when an architectural decision needs developer input (new dependency, new pattern, new third-party service).
---

# /build — Step 2 of 2

Reads `plan.md` and `decisions.md` from `$WT/artifacts/docs/dev/` in the shared workspace. On the first invocation against an empty workspace, populates the empty `api/`, `web/`, `database/` placeholders the CLI created. In the same invocation, implements the entire application end-to-end. No separate scaffold gate — `/review` at the end of `/build` is the structural gate.

## Workspace — shared across the build flow

`/plan` started a shared workspace (branched off `dev`) and wrote `plan.md` and `decisions.md` into `$WT/artifacts/docs/dev/`. This skill continues in that same workspace. Before any Edit/Write/NotebookEdit:

```bash
WT=$(bash .claude/hooks/begin-change.sh --type build initial-build)
```

`begin-change.sh` is idempotent on name, so this call returns the same workspace `/plan` started. Read `plan.md` and `decisions.md` from `$WT/artifacts/docs/dev/`. Issue every Edit/Write in this skill against paths inside `$WT` — the "project root" referred to throughout this skill means `$WT/`, not the actual `dev`-branch project root.

If `$WT/artifacts/docs/dev/plan.md` doesn't exist, **STOP** and tell the analyst to run `/plan` first.

## Session-start protocol

Read once, in parallel:

1. `CLAUDE.md`
2. `$WT/artifacts/docs/dev/plan.md`, `$WT/artifacts/docs/dev/decisions.md`
3. `.claude/rules/dev/_core-requirements.md`
4. Every rule file governing the layers this app touches (per the rule-file-index in `_core-requirements.md`) — API, web, and database rules at minimum.
5. `artifacts/docs/design/` — the Claude Design handoff. A bundle is present when the folder holds anything **beyond** the CLI-shipped baseline (`mws-design-system-showcase.html`, plus any `.gitkeep`). If present, read the handoff contract at `.claude/rules/design/README.md` then go to the /project folder, look at the prototype-readme.md, if that does not exist use the file-identification-protocol.md, plus the design rules `.claude/rules/design/_core-requirements.md` + companions. If absent, build `web/` from the design rules alone (no design supplied).

If `$WT/artifacts/docs/dev/plan.md` doesn't exist → **STOP**. Run `/plan` first.

## First-invocation scaffold (one-time)

The CLI already created the project skeleton: empty `api/`, `web/`, `database/` placeholders, `.github/workflows/ci.yml`, root `.gitignore`, `.claude/`, `CLAUDE.md`, and the `dev` branch. This step populates the empty layer folders and prepares the dev environment.

If `$WT/api/`, `$WT/web/`, or `$WT/database/` already contains source files (anything beyond `.gitkeep`), the scaffold has already run — skip this section and go straight to **Implementation**.

1. Populate `$WT/api/` with the ASP.NET Core 10 + EF Core + Microsoft.Identity.Web baseline (controllers folder, services folder, `Program.cs`, `App.csproj`, seed integration test). Set `App.csproj` `<AssemblyName>` and `<RootNamespace>` to match the app name (PascalCase).
2. Populate `$WT/web/` with the React 19 + TS + Vite baseline (`src/`, `index.html`, `package.json`, `vite.config.ts`, `tsconfig.json`, seed component test). Set `package.json` `name` and `index.html` `<title>` to the app name.
3. Populate `$WT/database/` with the migration + procedure folder layout (`migrations/`, `procedures/`, `tests/` for tSQLt).
4. Initialize `$WT/api/appsettings.Development.json` with placeholder values for Entra (TenantId, ClientId, Audience), the Azure SQL connection string (LocalDB by default for dev), and `Swagger:Enabled: true` for dev only.
5. Run `dotnet user-secrets init` in `$WT/api/` and seed `dotnet user-secrets set ConnectionStrings:Db ...` and the LocalDB connection string.
6. `dotnet restore` (in `$WT/api/`) + `npm install` (in `$WT/web/`).
7. Verify `dotnet build` + `npm run build` + `dotnet test` (the seed integration test should pass) + `npm test` (the seed component test should pass), all run inside `$WT`.
8. Append an ADR to `$WT/artifacts/docs/dev/decisions.md` recording the Entra app-registration values used (or "placeholder — replace before deploy").

Print: _"Scaffold complete. Implementing the application."_

## Implementation — single pass

The build implements the entire application in one continuous pass. State the Pre-Impl Checklist tiers it touches in one line up front, e.g. _"Tiers: Always, Code, API endpoint, API service, Web component, Web hook, Database table."_

### 1. Sketch the cut (the full application)

In chat (not code), list everything that will be built, organised by layer:

- **DB:** every migration file to add (`YYYYMMDD_NNN_Description.sql`) — tables, columns, indexes, rollback approach.
- **API:** every controller + service + DTO. State the `[Authorize(Roles="...")]` model per endpoint.
- **Web:** every route + components + feature folder + hooks (TanStack Query keys).
- **Tests:** per the layer rules — happy path + failure path + cancellation per API service; behavior tests per component (every rendered state listed in `web-testing.md`); tSQLt class per stored proc (if any).

Confirm the cut maps to `plan.md` section by section. Surface any inconsistency before implementing.

### 2. Implement, in this order

Build out from the database upward so dependencies resolve naturally. All paths below are relative to `$WT`:

- **Database** — write every migration file under `$WT/database/migrations/`. Idempotent (`IF NOT EXISTS`). Write rollbacks under the same name with `_Rollback.sql` suffix. Run migrations against LocalDB to verify. Do NOT apply to a shared dev DB without explicit confirmation.
- **API** — add controllers under `$WT/api/Controllers/<Resource>Controller.cs`. Move logic into services under `$WT/api/Services/` (interface + impl + DI registration in `Program.cs` or an extension method). Apply `[Authorize(Roles="...")]` per `plan.md`. Validate DTOs with data annotations + manual checks. Return `ValidationProblem()` for 400, `Forbid()` for 403, `Problem(...)` for 5xx with a plain-language `detail`. Pass `CancellationToken` through every layer.
- **Web** — add features under $WT/web/src/features/<FeatureName>/. Routes registered in App.tsx (or pages/). MSAL AuthenticatedTemplate wraps protected pages. TanStack Query hooks in features/<X>/hooks/ for server state. Use semantic HTML, CSS Modules for styles, MWS tokens from src/mws/tokens.css. When a Claude Design handoff is present in artifacts/docs/design/, build the screens from the design's HTML, consulting three references in this order: (1) full-design-blueprint.md — the reconciled plan; authoritative for what to build (which screens, features, content); (2) the design's HTML — the prototype rendering; authoritative for form (layout, hierarchy, states, intended behaviour); (3) artifacts/docs/product/solution-requirements.md — the source of product intent, for anything the blueprint and HTML don't settle. Draw every token, colour, spacing, and component style from the repo design system (.claude/rules/design/ + src/mws/tokens.css) — the HTML is a rendering, never the style source. If the design and the system disagree, the system wins; if the design needs something the system can't express, STOP and surface it. For a multi-screen flow, implement the screens the plan calls for and pause for review before the rest unless the plan says otherwise.

### 3. Architectural-decision checkpoints

The build runs continuously **except** at architectural-decision points. **Stop and ask the developer** whenever you encounter:

- A new dependency (new NuGet package, new npm package) not already in scaffold or `decisions.md`.
- A new pattern not yet used in the project (e.g., adding a background worker, introducing a new state-management approach, choosing between two non-trivial implementation strategies).
- A new third-party service or integration.
- Anything that affects shared contracts or schemas in a non-obvious way.
- Anything from the "Stop and ask" list in `_core-requirements.md` ("Architectural Decision Authority").

When you stop, present 2–3 options with tradeoffs. After the developer chooses, append the decision to `decisions.md` (ADR-NNN format) and continue.

Routine, local, low-impact choices that follow existing conventions do not need a checkpoint — decide and proceed.

### 4. Continuous edit-time checks

Run only these mid-build — they're cheap:

- `dotnet build` whenever `api/` changes meaningfully.
- `npx tsc --noEmit` whenever `web/` changes (Vite's transform errors also surface mid-edit).
- `npm run lint` once at the end of the build before declaring done.

Do **not** run `dotnet test` or `npx vitest run` continuously mid-build. They run once via `/review` at build completion.

### 5. Architectural decisions log

Append an ADR entry to `decisions.md` for every non-obvious decision made during the build (the checkpoints in step 3, plus any other judgment calls). Format:

```
## ADR-NNN — <short title>
**Date:** <today>
**Status:** Accepted
**Context:** <1–2 lines>
**Decision:** <1 line>
**Consequence:** <1 line>
```

### 6. Completion

When the entire application is implemented and edit-time checks are clean, prompt:

_"Build complete. Run `/ship` to land the work on `dev` — it'll run the tests, security audit, and code-quality checks before committing."_

## Tier 1 gate watchdog

If during the build you discover a new requirement that breaches the Tier 1 gate (analyst says "could we also extract and search these documents?", "should we also support deal-team access?"), **stop**, surface to the developer, and recommend escalation. Do not implement the gate-breaching feature in Tier 1.

## Do not

- Invoke `/review` mid-build — `/review` runs once at the end of build (or auto-invoked by `/ship` on cache miss), not interleaved with implementation. The 5-iteration loop is internal to `/review`.
- Write architecture docs as you go beyond `decisions.md` ADR entries — `plan.md` is the planning artefact; new docs require a `decisions.md` entry justifying them.
- Skip tests for "the change is small" — every layer's testing rule applies regardless of scope.
- Defer tests to a later stage — tests ship alongside the code they cover.
- Bring in MSAL alternatives (Auth0, custom JWT, basic auth) — Microsoft.Identity.Web is the only sanctioned path.
- Bring in `FluentValidation`, `AutoMapper`, `MediatR`, or similar libraries without a `decisions.md` ADR.
- Add CSS-in-JS, SCSS, Redux, Zustand, or anything else listed as "do not introduce" in the layer rules.
- Pause for non-architectural reasons — routine implementation choices that follow the rules and existing conventions do not need developer confirmation.
