# Implementation Plan: Fix Suggested Grouping Card Loss

**Branch**: `046-fix-suggested-grouping-card-loss` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/046-fix-suggested-grouping-card-loss/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Accepting an AI-generated grouping suggestion (spec 044) creates a `CardGroup` document whose `column` field is never populated by the client, so it persists as `''`. The board UI removes the member cards from the ungrouped list (they now have a `groupId`) but never renders them in any group (`columnGroups` filters `group.column === column.id`, which `''` never matches), so the cards silently vanish. The fix makes the server derive a group's `column` authoritatively from its head card — rather than trusting client-supplied input — for both new group creation and a self-healing read-time repair of already-broken groups, and adds a visible error toast when group formation fails so cards are never left in a grouped-but-invisible state without the facilitator knowing.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js (Express 5 backend), React 18 (frontend)

**Primary Dependencies**: Express 5 (`server/`), Firebase Admin SDK / Firestore (`firebase-admin`), React + Vite (`src/`), `react-hot-toast` (user-facing error surfacing), `i18next` (all user-visible text)

**Storage**: Firestore — `cards` and `groups` collections, accessed only through the existing `CardPort`/`CardGroupPort` adapters (`FirestoreCardGroupAdapter`, Firestore-backed `CardPort` impl)

**Testing**: Vitest + Testing Library (unit/integration, 80% coverage floor per constitution), Playwright (E2E, not required for this bug fix since no new critical user flow is introduced — existing grouping E2E coverage, if any, is a regression check)

**Target Platform**: Web (existing RetroRocket retrospective board), browser + Node.js server, no new platform surface

**Project Type**: Web application — existing `retro-rocket/src` (frontend) + `retro-rocket/server` (backend, hexagonal ports/adapters)

**Performance Goals**: No new performance target; the read-time repair (self-heal) must add no perceptible latency to `GET /api/retrospectives/:id` for boards with a normal number of groups (consistent with existing board-load performance)

**Constraints**: Fix must not change the AI suggestion-generation, scoring, or presentation logic (spec 044 scope); must not require a manual one-off data-migration script or operational runbook step, since existing broken groups must self-heal the next time their retrospective is loaded (FR-009/SC-005)

**Scale/Scope**: Touches the card-grouping slice only (`src/features/boards/clustering/*`, `server/src/application/use-cases/retrospective/CardGrouping.ts`, `GetBoardState.ts`, `FirestoreCardGroupAdapter.ts`, `backendRetrospectiveClient.ts`); no other feature area is affected

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Assessment |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Yes | Every changed unit (server use case, adapter, client hook, component) gets a failing test first: server-side column derivation, read-time self-heal, client error toast. Existing suites (`CardGrouping.test.ts`, `GetBoardState.test.ts`, `useCardGroups.test.ts`, `GroupableColumn*.test.tsx`) are the base to extend. |
| II. Library-First | Yes | No new module; the fix stays inside the existing `clustering` feature slice and the existing hexagonal `CardGroupPort`/`CardPort` boundary — it corrects behavior inside established interfaces rather than adding new coupling. |
| III. Prefer Proven Third-Party Libraries | Yes | Reuses `react-hot-toast` (already a dependency, already used for identical error-surfacing elsewhere) instead of introducing a new notification mechanism. |
| IV. SOLID | Yes | Column derivation moves server-side behind `CardPort`/`CardGroupPort`, keeping the domain use case (`CardGrouping.ts`) as the single place that decides a group's column — not the client, not the Firestore adapter. |
| V. Simplicity (KISS/YAGNI) | Yes | Self-healing repair on read (inside `GetBoardState`) avoids inventing new migration tooling/scripts — the simplest mechanism that satisfies FR-009 using infrastructure that already exists (the board-load path every retrospective already goes through). |
| VI. Unit Testing & Coverage Floor | Yes | New/changed logic (column derivation, self-heal, error toast) gets unit tests; 80% coverage floor maintained. |
| VII. E2E Testing (Playwright) | Yes | Confirmed during `/speckit-analyze`: `e2e/retrospective-board.spec.ts`'s `'grouping cards, adding/removing a member, and disbanding propagate live to a second participant'` already exercises the exact `POST /groups` code path this feature fixes (real-time propagation, add/remove member, disband). No new Playwright suite is needed — tasks.md T019 now runs this test by name as part of verification. |
| VIII. WCAG 2.1 AA | Yes | The only new user-facing surface is an error toast, reusing the existing `toast.error(...)` component/pattern already verified elsewhere in the app — no new custom UI. |
| IX. Apple-Inspired Design & Motion | N/A | No new visual design, layout, or motion is introduced; the error toast reuses an existing, already-designed component verbatim. |

No violations requiring justification — Complexity Tracking section is not needed.

**Post-Phase-1 re-check**: Design artifacts (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`) introduce one new internal port method (`repairGroupColumn`) and one new error path (`NotFoundError` on a missing head card) — both follow existing patterns in the same files and do not change this table's assessment. No new violations.

## Project Structure

### Documentation (this feature)

```text
specs/046-fix-suggested-grouping-card-loss/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── groups-endpoint-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── server/                                    # Backend (Express 5, hexagonal ports/adapters)
│   ├── src/
│   │   ├── application/
│   │   │   ├── ports/
│   │   │   │   └── cards.ts                   # CardGroupPort — add repairGroupColumn(groupId, column)
│   │   │   └── use-cases/retrospective/
│   │   │       ├── CardGrouping.ts             # createCardGroup: derive column from head card via CardPort.getCard(), not request body
│   │   │       └── GetBoardState.ts            # reconcile each group's column against its head card's actual column (self-heal, FR-009)
│   │   ├── adapters/firebase/
│   │   │   └── FirestoreCardGroupAdapter.ts    # add repairGroupColumn() Firestore update
│   │   └── http/routes/
│   │       └── retrospectives.ts               # POST /groups: stop reading undocumented column field from request body
│   └── test/
│       └── application/use-cases/retrospective/
│           ├── CardGrouping.test.ts            # extend: column derived from head card, error on missing head card
│           └── GetBoardState.test.ts           # extend: mismatched/empty group.column is repaired and persisted
│
├── src/                                        # Frontend (React 18 + Vite)
│   ├── features/boards/clustering/components/
│   │   └── GroupableColumn.tsx                 # handleAcceptSuggestion: surface toast.error(...) on failure (FR-007a)
│   └── locales/
│       ├── en.json                             # add groupSuggestion.acceptError
│       └── es.json                             # add groupSuggestion.acceptError
│
└── src/test/features/boards/clustering/
    └── GroupableColumn.test.tsx                # extend: failed acceptance shows an error toast, cards stay visible/ungrouped
```

Note: the client (`backendRetrospectiveClient.createCardGroup`, `useCardGroups.createGroup`/`acceptSuggestion`) never had a `column` field to begin with — `CreateCardGroupParams` only ever carried `headCardId`/`memberCardIds`/`title`. The bug was entirely server-side (an undocumented `body.column` read defaulting to `''`), so no client request-shape change is needed; only the route and the use case change.

**Structure Decision**: Existing web application layout (`retro-rocket/server` hexagonal backend + `retro-rocket/src` React frontend) is reused as-is — this is a bug fix confined to the card-grouping vertical slice already established by spec 044 (feature 019's hexagonal ports/adapters on the backend, `src/features/boards/clustering` on the frontend). No new directories, packages, or architectural layers are introduced.

## Complexity Tracking

*No constitution violations — this section is not applicable.*
