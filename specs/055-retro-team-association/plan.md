# Implementation Plan: Retrospective-Team Association

**Branch**: `055-retro-team-association` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/055-retro-team-association/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Let a facilitator optionally associate a new retrospective with one team they currently belong to,
at creation time only. The board dashboard ("My Boards") gains a team filter, sourced from every
team the viewing user belongs to (not derived from the board list — per Clarifications). The team
association is shown only on the dashboard, never inside an open retrospective session, so access
and in-session behavior stay byte-for-byte unchanged (FR-005/FR-006) — the retrospective's existing
link/ID-based join rule is untouched.

Technical approach: extend the existing `retrospectives` Firestore document with an optional
`teamId` field and the existing `boards`/`teams` vertical slices with the minimum surface needed to
set, validate, and read it back — no new Firestore collection, no new page, no new use-case beyond
what `CreateBoard`/`ListBoardsForUser` already do. `CreateBoard` gains a membership check against
the existing `TeamsPort.getMembership` (already implemented for 054); `FirestoreBoardsAdapter`
gains a batched `teams` lookup (mirroring its existing chunked `participants` join) to resolve each
listed board's team name for display. The frontend reuses the already-built `useTeamsQuery()` hook
(054) to power both the creation-flow team picker and the dashboard's team filter — zero new
backend endpoints for the frontend to call. See research.md for full rationale.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict` mode, per constitution Technology Stack standard), Node.js backend, React 18 frontend.

**Primary Dependencies**: Express 5 + `firebase-admin` 14 (Admin SDK Firestore access, backend); React 18 + `react-router-dom` + `i18next` + `react-hot-toast` + `framer-motion` (frontend). No new dependency introduced — every piece reuses what's already in `package.json`, including the 054-built `src/features/teams/` module (`useTeamsQuery`, `backendTeamsClient`, `TeamSummary` type).

**Storage**: Firestore, backend-only via Admin SDK. No new collection. One new optional field, `teamId: string | null`, on the existing `retrospectives/{id}` documents (data-model.md). Reads the existing `teams` collection (054) read-only, by id, for display-name resolution and reads the existing `teamMemberships` collection (via `TeamsPort.getMembership`) read-only, for creation-time authorization.

**Testing**: Vitest (`vitest.config.ts` for frontend/jsdom, `server/vitest.config.ts` for backend/node) + `@testing-library/react`; Playwright (`@playwright/test`) for E2E against the Firebase emulator, matching the project's existing dual-suite setup.

**Target Platform**: Web — Vite-built SPA frontend, Express backend bundled for Vercel serverless functions (existing `npm run build:backend` / `vercel --prod` pipeline). No new deployment target.

**Project Type**: Web application (existing frontend `retro-rocket/src/` + backend `retro-rocket/server/src/` in one repo) — see Project Structure below.

**Performance Goals**: No new performance target beyond the spec's UX time-bounds (SC-001/SC-003: a single extra selection at creation time, filtering results visible in under 10 seconds) — ordinary request-response latency, no new real-time/streaming requirement.

**Constraints**: Must not weaken `firestore.rules` (constitution Technology Stack: Real-Time Data Security) — the `retrospectives` collection's existing rule already covers the new `teamId` field with no change needed; the `teams`/`teamMemberships` collections stay Admin-SDK-only exactly as 054 left them. Must not change who can join a retrospective (FR-005) or what's rendered inside an open session (FR-011) — these are hard constraints, not aspirations, verified by explicit negative test cases in quickstart.md. Must keep the backend coverage floor (`server/vitest.config.ts`: branches 80 / functions 68 / lines 74 / statements 74) and the frontend's floor (`vitest.config.ts`: branches 78 / functions 64 / lines 50 / statements 50).

**Scale/Scope**: Small, additive slice: 3 user stories, 0 new entities (one new field on an existing entity), 0 new REST endpoints (two existing endpoints — `POST /api/boards`, `GET /api/boards` — gain request/response fields), 1 new dropdown control in an existing modal (`CreateBoardFlow`), 1 new filter control in an existing toolbar (`BoardControlsBar`), 1 new badge in an existing row component (`BoardRow`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — no changes required either pass.*

| Principle | Status | How this feature satisfies it |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | PASS | tasks.md (next phase) will sequence a failing test before each changed use-case/component (`CreateBoard`'s new membership branch, `useBoardListQuery`'s new team-filter branch, `FirestoreBoardsAdapter`'s team-name join), per the project's existing red-green-refactor convention. |
| II. Library-First | PASS | No new module boundary is introduced or violated: the change lands inside the existing `boards` vertical slice (backend: `server/src/application/{ports,use-cases}/boards.ts`, `adapters/firebase/FirestoreBoardsAdapter.ts`; frontend: `src/features/dashboard/`, `src/features/create-board/`) and consumes the existing `teams` slice (054) strictly through its already-published interfaces (`TeamsPort.getMembership`, `useTeamsQuery()`, `TeamSummary`) — no new cross-cutting module. |
| III. Prefer Proven Third-Party Libraries | PASS | Zero new dependencies. |
| IV. SOLID | PASS | `CreateBoard`'s new team-membership check goes through `TeamsPort.getMembership` (an existing, already-tested interface method), not a raw `teamMemberships` query — Interface Segregation/Dependency Inversion preserved, the Teams slice remains the sole owner of membership invariants. `FirestoreBoardsAdapter`'s new `teams`-collection read for name display stays inside the adapter (same pattern as its existing `participants` join), not leaked into the use-case or route layer. |
| V. Simplicity (KISS + YAGNI) | PASS | Deliberately minimal: no new Firestore collection, no new endpoint, no team-association editing after creation (spec Assumptions — explicitly deferred), team-name resolution done by direct batched read rather than introducing a cross-port join abstraction for a single id→name lookup (research.md item 1). |
| VI. Unit Testing & Coverage Floor | PASS (planned) | New/changed use-case branches (`CreateBoard` membership check, `useBoardListQuery` team-filter logic) get Vitest coverage against fakes, consistent with existing coverage of these exact modules; `FirestoreBoardsAdapter`'s new query follows the codebase's own pre-existing, documented exception (thin Admin SDK glue, E2E-covered) — same treatment as its existing methods, not a new carve-out. |
| VII. E2E Testing with Playwright | PASS (planned) | quickstart.md's scenarios (create with/without team, dashboard filter, in-session non-exposure) become Playwright coverage extending the existing dashboard/boards E2E specs. |
| VIII. WCAG 2.1 AA | PASS (planned, flagged for implementation) | The new team `<select>` in `CreateBoardFlow`, the new filter control in `BoardControlsBar`, and the new badge in `BoardRow` must independently meet contrast/focus/keyboard/color-redundancy requirements in both themes — flagged here so `/speckit-tasks` and the frontend-agent apply it, not deferred silently. |
| IX. Apple-Inspired Design & Motion Tooling | PASS (planned, flagged for implementation) | Any visual/motion decision for the new team picker, filter control, and badge (e.g. its entrance alongside the existing role badge) must go through the `apple-design`/`emil-design-eng`/`animate` skill package per Principle IX — flagged for the implementation phase. |

No violations. **Complexity Tracking is not needed** — no principle exception is being taken.

## Project Structure

### Documentation (this feature)

```text
specs/055-retro-team-association/
├── plan.md                          # This file (/speckit-plan command output)
├── research.md                      # Phase 0 output (/speckit-plan command)
├── data-model.md                    # Phase 1 output (/speckit-plan command)
├── quickstart.md                    # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── boards-api-delta.md          # Phase 1 output (/speckit-plan command) — delta over 017's boards-api.yaml
└── tasks.md                         # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── server/src/
│   ├── application/
│   │   ├── ports/
│   │   │   └── boards.ts                         # BoardSummary + CreateBoardInput gain teamId (+ teamName on BoardSummary)
│   │   └── use-cases/boards/
│   │       ├── CreateBoard.ts                    # + teamsPort dep, validates teamId membership (FR-004)
│   │       └── ListBoardsForUser.ts               # unchanged signature — name resolution stays inside the adapter
│   ├── adapters/firebase/
│   │   └── FirestoreBoardsAdapter.ts              # writes teamId; listBoardsForUser resolves teamName via batched `teams` read
│   └── http/
│       ├── routes/boards.ts                       # POST/GET /api/boards request/response gain teamId (+teamName)
│       └── boards-wiring.ts                       # + constructs FirestoreTeamsAdapter, passes as teamsPort dep
├── server/test/
│   └── application/use-cases/boards/CreateBoard.test.ts   # + membership-check test cases
├── src/
│   ├── features/
│   │   ├── create-board/components/
│   │   │   └── CreateBoardFlow.tsx                # + team <select>, populated via useTeamsQuery(), hidden when 0 teams
│   │   ├── dashboard/
│   │   │   ├── services/backendBoardsClient.ts     # BoardSummary/BoardSummaryDTO/CreateBoardParams gain teamId(+teamName)
│   │   │   ├── hooks/useBoardListQuery.ts          # + teamFilter param/logic
│   │   │   ├── components/BoardControlsBar.tsx     # + team filter control (uses useTeamsQuery())
│   │   │   └── components/BoardRow.tsx             # + team badge (renders board.teamName when present)
│   │   └── teams/ (054, reused as-is: useTeamsQuery, TeamSummary — no changes)
│   └── locales/{en,es}.json                        # + new team-picker/filter/badge i18n keys
├── src/test/features/
│   ├── create-board/CreateBoardFlow.test.tsx        # + team-selection cases
│   └── dashboard/{useBoardListQuery,BoardControlsBar,BoardRow}.test.tsx  # + team-filter/badge cases
└── e2e/ (wherever the existing dashboard/boards Playwright specs live)    # + team-association scenarios
```

**Structure Decision**: No new top-level directory or vertical slice. This feature is a small,
additive change entirely within the existing `boards` slice (backend and frontend), consuming the
existing `teams` slice (054) strictly through its already-published port method (`getMembership`)
and frontend hook (`useTeamsQuery`) — following the same "extend, don't duplicate" precedent 054
itself set relative to `profile`/`boards`.

## Complexity Tracking

*Not applicable — no Constitution Check violations were identified; this table is intentionally empty.*
