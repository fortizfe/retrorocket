# Phase 1 Data Model: Update README to Reflect Current Product State

This feature has no software data entities — its only artifact is prose in
[`README.md`](../../README.md). In place of a data model, this document maps
each **README section** (the unit being changed) to its current state,
required change, and the functional requirement driving it, so the change
surface is unambiguous going into `/speckit-tasks`.

| README Section | Current State | Required Change | Driving FR |
|---|---|---|---|
| Key Features → Real-Time Collaboration | No mention of typing indicator | Add bullet: live "who's typing" indicator, notes it respects Anonymous Board Mode | FR-005 |
| Key Features → Cards & Board Templates | No TXT export mention (export is in its own section, see below) | No change needed here — export formats live in the Export section | — |
| Key Features → Card Grouping & AI-Assisted Suggestions | "Group suggestions" bullet is generic | Add: suggested groups carry an editable, AI-generated title | FR-004 |
| Key Features → *(new)* Anonymous Board Mode | Not present anywhere | Add bullet group: create-time toggle (default off, all templates), facilitator mid-retro toggle, effects (no author names, no "group by user", no typist identity, persistent mode indicator) | FR-001 |
| Key Features → Export | Lists PDF and DOCX only | Add TXT; note anonymous-board exports omit author names in all three formats | FR-003 |
| Project Architecture (file tree) | Omits `server/`, `api/`, `scripts/`, `features/landing/` | Insert all four in structurally correct positions | FR-008 |
| Getting Started → step 4 "Run in development" | Only documents `npm run dev` | Add `npm run dev:all` (or `dev` + `dev:server` in two terminals) as the way to get a fully working local app | FR-006 |
| Getting Started → step 3 "Configure environment variables" | Only documents `VITE_*` frontend vars | Add description of the non-prefixed backend vars block in `.env.example` (no real secret values printed) | FR-007 |
| Firestore Security Rules | Correct but silent on "anonymous board" vs. Firebase anonymous auth | Add one clarifying sentence distinguishing the two | FR-010 |
| Usage Guide → Create a retrospective | No anonymity mention | Add: how to mark a board anonymous at creation | FR-002 |
| Usage Guide → Facilitator mode | No anonymity mention | Add: how the facilitator toggles anonymity mid-retro | FR-002 |
| Usage Guide → Export results | Lists PDF/DOCX only | Add TXT; anonymous-export note | FR-003 |
| Testing, Quality & CI → "Run locally" script list | Missing backend scripts | Add `type-check:server`, `test:server`, `test:server:coverage` | FR-009 |
| Testing, Quality & CI → CI bullet list | One undifferentiated "type-check, lint, test with coverage" bullet | Split into explicit frontend + backend CI steps | FR-009 |
| Roadmap | 9 unchecked items | Re-verify only — no content change expected (see [research.md](research.md) §8) | FR-011 |
| *(all sections)* | — | No version number, script name, or path may be introduced that doesn't match the current repository state | FR-012 |
| *(all sections)* | — | Everything not listed above stays as-is; structure, ordering, and tone are preserved | FR-013 |

## Relationships

Every row is independent — no row's change depends on another row's change
being applied first or in a particular order, which is why `spec.md`'s user
stories are independently testable. The only cross-cutting constraint is
FR-012/FR-013 applying uniformly to every edited section (accuracy and
minimal-diff discipline), which is a validation rule rather than a sequencing
dependency.

## Validation Rules

- Every new or changed sentence must trace to a row above (and, transitively,
  to the evidence in [research.md](research.md)) — no speculative content.
- No row introduces a real secret value, API key, or credential (FR-007).
- No row's change removes or contradicts a still-accurate existing statement
  without that statement being demonstrably obsolete (FR-013).
