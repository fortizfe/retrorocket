# Quickstart: Validating the Updated README

This guide proves the updated `README.md` satisfies `spec.md`'s Success
Criteria end to end. It has two parts: a **content cross-check** (read-only,
no environment needed) and a **live walkthrough** (actually follow the
README to set up the app), matching SC-002 through SC-005 and SC-001
respectively.

## Prerequisites

- A clone of this repository with the updated `README.md`.
- Node.js and npm installed (for the live walkthrough only).
- A Firebase project (free tier) for the live walkthrough only, per the
  README's own Prerequisites.

## Part A — Content cross-check (SC-002, SC-003, SC-004, SC-005)

Read only the updated `README.md` (do not consult any spec file) and confirm:

1. **Anonymous Board Mode (SC-005)**: Without opening any file under
   `specs/051-anonymous-board-mode/`, can you explain — from the README
   alone — how to create an anonymous board, how a facilitator toggles it
   mid-retrospective, and what changes for participants when it's on?
   Expected: yes, using only Key Features + Usage Guide.
2. **Feature completeness (SC-002)**: Check that each of the following has a
   README mention: Anonymous Board Mode, TXT export, AI-generated editable
   group titles, the live typing indicator. Cross-reference
   [data-model.md](data-model.md) — every row's "Required Change" should be
   visibly present in the rendered README.
3. **Architecture map (SC-003)**: Compare the Project Architecture file tree
   against the real repository:
   ```bash
   ls retro-rocket
   ls retro-rocket/src/features
   ```
   Confirm `server/`, `api/`, `scripts/`, and `features/landing/` all appear
   in both the tree and the `ls` output.
4. **No contradictions (SC-004)**: Spot-check every npm script name and CI
   step the README names against the source of truth:
   ```bash
   grep -E '"(dev|dev:server|dev:all|type-check|type-check:server|test|test:server|test:coverage|test:server:coverage|emulators|e2e)":' retro-rocket/package.json
   grep -n "name:" .github/workflows/ci.yml
   ```
   Every script/step name the README references must appear in this output.
5. **Roadmap accuracy**: Confirm none of the Roadmap's unchecked items match
   a shipped capability (cross-reference [research.md](research.md) §8).

## Part B — Live walkthrough (SC-001)

Starting from a machine with nothing set up beyond the prerequisites above,
follow **only** the updated README's Getting Started section, in order:

```bash
git clone <repository-url>
cd retrorocket/retro-rocket
npm install
cp .env.example .env
# fill in the Firebase + backend variables exactly as the README instructs
npm run dev:all   # or the two-terminal alternative the README documents
```

Expected outcome:

- The frontend is reachable at `http://localhost:3000` (or the port the
  README states).
- Backend-dependent functionality — specifically, **signing in with Google or
  GitHub** — works without any console error about a failed `/api/*` proxy
  target or missing environment variable.
- No step required consulting a file outside what the README pointed to
  (e.g. `retro-rocket/server/README.md` should only be needed if the reader
  chooses to go deeper, never to get basic local dev running).

If any step fails or requires undocumented knowledge, the corresponding
functional requirement in [spec.md](spec.md) (FR-006, FR-007) is not yet
satisfied.

## Exit Criteria

Both Part A and Part B pass → the feature is complete and ready for review.
