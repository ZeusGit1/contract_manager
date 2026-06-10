---
name: requirements-ship
description: Publish the finalized requirements brief to `dev` after a secret/PII scan, so `/plan` can read it. Run once, after `/requirements-gathering` and before `/plan`. The brief is the analyst's input deliverable; this is the authorised path that commits it. Never ships application code — that is `/ship` at the end of the build.
version: "0.1"
---

# /requirements-ship — publish the requirements brief to `dev`

`/requirements-gathering` fills in `artifacts/docs/product/solution-requirements.md`, but does not commit it. This skill **scans that brief for secrets/PII and publishes it to `dev`** so the rest of the flow can use it.

Why this exists: `/plan` builds its workspace as a fresh worktree off `dev`. If the brief is only an uncommitted edit in some other working tree, that workspace can't see it (especially across sessions). Publishing the brief to `dev` first means `/plan`'s workspace simply has it — no copying, no guessing.

**The Analyst does not run this skill directly — `/plan` invokes it as its Step 0.** It is documented here as a standalone skill so the logic lives in one place (and can be run on its own if ever needed), but in the normal flow the Analyst only runs `/requirements-gathering` then `/plan`:

```
/requirements-gathering   → fills the brief
/plan                     → Step 0 invokes THIS skill (scan + publish brief to dev),
                            then plans the app
/build → /ship            → builds and ships the app
```

When invoked by `/plan`, publish the brief (or confirm it's already current) and **return control to `/plan`** — do not tell the analyst to "run `/plan`" (they're already in it).

## What this skill does and does not do

- **Does:** scan the finalized requirements brief (secrets + PII) and, if clean, commit it to `dev` and push.
- **Does NOT:** ship application code, run tests, run `/plan` or `/build`, or touch anything other than the brief. Application code ships through `/ship` at the end of the build — never here.

This keeps `/ship` entirely focused on shipping built applications; the requirements brief — the analyst's *input* deliverable — has its own small, single-purpose publish path. Both use the same one-shot commit gate, so `/ship` and `/requirements-ship` are the only authorised ways anything reaches `dev`.

## Step 1 — Locate and validate the brief

The brief is **always** `artifacts/docs/product/solution-requirements.md`. Find it in the current working tree:

```bash
ROOT="$(git rev-parse --show-toplevel)"
BRIEF="$ROOT/artifacts/docs/product/solution-requirements.md"
```

Validate before doing anything else:

- **Missing or still the blank template** (contains `[PENDING]` or `[Short descriptive name]` / bracketed-placeholder markers, or any unresolved `[PENDING]` section) → **STOP**. Plain English: *"I couldn't find a completed requirements brief. Run `/requirements-gathering` to fill it in first."* (When `/plan` invoked this, that STOP propagates: `/plan` relays the message and stops too.)
- **A build workspace already exists** (`.claude/worktrees/initial-build/…` present) → **do not STOP.** This is normal on a `/plan` re-run. This skill only ever publishes the brief — it physically never stages or commits application code — so continue; the idempotency check in Step 4 makes it a no-op if `dev` already has the current brief. (If a human somehow runs this standalone after a full build, the worst case is a harmless no-op republish of the brief; to ship application code they use `/ship`.)

## Step 2 — Capture the brief safely

Copy the filled brief out of the worktree first, so the later git operations can never lose it:

```bash
TMP="$(mktemp)"
cp "$BRIEF" "$TMP"
```

## Step 3 — Scan the brief (mandatory)

The brief is the highest-risk document in the flow — it can contain pasted client/matter content or credentials, and it is about to land on a shared, pushed branch. Run the same content scan `/review` applies to documentation-only commits, against `$TMP`:

- **Secret scan** — `api[_-]?key`, `secret`, `password\s*[=:]`, `token`, `connectionstring`, `sk-`, AWS/Azure key shapes, long hex/base64 blobs, bearer tokens, embedded internal URLs.
- **PII / privileged-content scan** — client names, matter numbers/references, personal emails, phone/extension numbers, and anything classified above `Internal`.

If a **Critical or High** finding appears (a live-looking credential, or privileged client content) → **STOP**. Plain English: *"The requirements brief contains something that shouldn't be saved to a shared branch — [what it is]. Please remove it and run `/requirements-ship` again."* Do **not** commit. Clean up: `rm -f "$TMP"`.

## Step 4 — Publish the brief to `dev`

Resolve the primary (`dev`) worktree:

```bash
PRIMARY="$(git worktree list --porcelain | awk '
  /^worktree / { p=$2 }
  /^branch refs\/heads\/dev$/ { print p; exit }
')"
export PRIMARY
```

If `PRIMARY` is empty → **STOP**: *"This project doesn't have a `dev` branch (the integration branch). That's a setup problem, not something you caused — let me know and we'll fix it."*

Run this loop, up to 3 attempts (race-safe, same shape as `/ship`'s merge loop):

```bash
git -C "$PRIMARY" fetch origin dev
git -C "$PRIMARY" checkout dev
git -C "$PRIMARY" reset --hard origin/dev          # clean latest dev (brief is safe in $TMP)

mkdir -p "$PRIMARY/artifacts/docs/product"
cp "$TMP" "$PRIMARY/artifacts/docs/product/solution-requirements.md"

# Idempotent, scoped to the brief only (ignore any unrelated untracked files
# on dev): if the brief is already identical to what's committed, nothing to do.
if git -C "$PRIMARY" diff --quiet HEAD -- artifacts/docs/product/solution-requirements.md; then
  echo "brief already current on dev"; break
fi

# Commit directly on dev through the one-shot commit gate (the same token
# mechanism /ship uses — $PRIMARY is exported so the subshell sees it).
# The brief is placed via cp (bash), so the Edit/Write integration-branch
# guard does not apply; the commit is authorised by the .commit-allowed token.
bash -c '
  trap "rm -f .claude/.commit-allowed" EXIT
  mkdir -p .claude
  touch .claude/.commit-allowed
  git -C "$PRIMARY" add artifacts/docs/product/solution-requirements.md
  git -C "$PRIMARY" commit -m "docs(intake): publish requirements brief for <app>" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
'

if ! git -C "$PRIMARY" push origin dev; then
  continue   # someone landed on dev between fetch and push — retry
fi
break
```

Then clean up: `rm -f "$TMP"`.

Derive `<app>` from the brief's Solution Name (Section 1), falling back to the project folder name.

> The brief commits **directly on `dev`** (a plain commit, not a `--no-ff` merge). That's deliberate: a documentation brief doesn't need the merge-commit shape that build ships use for clean `/undo` — it's a single doc, committed once. `/plan` and `/build` never modify the brief, so a later `/ship` produces no diff for it (an unchanged file is never re-committed).

## Step 5 — Report and hand back

- **Invoked by `/plan` (the normal case):** briefly note the brief is on `dev` (e.g. *"Requirements brief published to `dev`."*) and **return control to `/plan`** so it continues into planning. Do not stop, and do not tell the analyst to run `/plan` — they are already in it.
- **Run standalone (rare):** print one short sentence — *"Requirements brief saved to `dev`. Run `/plan` to start planning the app."* — and **STOP**.

## Prerequisites

- `/requirements-gathering` has produced a completed `solution-requirements.md` (no `[PENDING]` sections).
- Project has a `dev` branch locally and on `origin` (the CLI scaffold creates this).
- `git` is authenticated against `origin` (push access to `dev`).

## Important

- This skill publishes **only** the requirements brief. It never stages, commits, or pushes application code, planning artefacts, or anything else.
- The secret/PII scan (Step 3) is mandatory and blocking — never publish a brief with an unresolved Critical/High finding to `dev`.
- `git commit` is gated by `.claude/hooks/block-git-commit.sh`; the one-shot `.commit-allowed` token (Step 4) is the authorised unlock, exactly as in `/ship`. Never leave the token on disk between turns.
- Speak in plain English alongside git terms per [rules/dev/git-workflow.md](../../rules/dev/git-workflow.md). The analyst does not see worktrees, branches, or pushes — they see "saving the requirements" and "saved."
