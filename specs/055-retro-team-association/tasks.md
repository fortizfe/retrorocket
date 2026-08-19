---

description: "Task list template for feature implementation"
---

# Tasks: Retrospective-Team Association

**Input**: Design documents from `/specs/055-retro-team-association/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/boards-api-delta.md, quickstart.md

**Tests**: Per the project constitution (Principle I, TDD — NON-NEGOTIABLE), tests MUST be written before their corresponding implementation task and MUST fail first. Every test task below is REQUIRED, not optional. `FirestoreBoardsAdapter`'s query-composition methods (`listBoardsForUser`'s Firestore reads, `createBoard`'s write) are exempt from Vitest-level unit tests per the codebase's own documented, pre-existing convention (`server/test/adapters/firebase/FirestoreBoardsAdapter.test.ts`'s own header comment) — only its pure mapping helper (`toBoardSummary`) is unit-tested directly; everything else is covered by the Playwright E2E tasks below.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task includes exact file paths, matching the layout in plan.md's Project Structure

## Path Conventions

Existing monorepo layout (plan.md): backend `retro-rocket/server/src/` + `retro-rocket/server/test/`, frontend `retro-rocket/src/` + `retro-rocket/src/test/`, E2E `retro-rocket/e2e/`. All paths below are relative to `retro-rocket/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Non-code prerequisites shared by every story.

None required. This feature introduces no new Firestore collection (`firestore.rules`'s existing
`retrospectives` rule already covers the new `teamId` field with no change needed, per
data-model.md), no new dependency, and no new i18n namespace (keys are added inside the existing
`createBoard`/`dashboard` namespaces per-story, below).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared `BoardsPort` type surface every user story's backend task builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 Add `teamId?: string | null` to `CreateBoardInput`, and `teamId: string | null` + `teamName: string | null` to `BoardSummary`, in `server/src/application/ports/boards.ts`, per data-model.md's "Derived read shapes" section.

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Link a new retrospective to a team at creation (Priority: P1) 🎯 MVP

**Goal**: A facilitator creating a retrospective can optionally select one of their existing teams and have it associated from creation; a facilitator with no teams is never blocked; a manipulated request naming a team the facilitator doesn't belong to is rejected server-side.

**Independent Test**: Create a retrospective while selecting a team the facilitator belongs to and confirm (via `GET /api/boards`'s raw `teamId` field — dashboard display isn't built yet, per User Story 3) that the association was persisted; create one without selecting a team and confirm it behaves identically to today; attempt to associate with a team the facilitator isn't a member of and confirm it's rejected — all independent of dashboard filtering (User Story 2) or the at-a-glance badge (User Story 3).

### Tests for User Story 1 ⚠️ (write first, confirm they fail)

- [X] T002 [P] [US1] Unit test: `toBoardSummary` reads `teamId` from Firestore document data and defaults it to `null` when absent, in `server/test/adapters/firebase/FirestoreBoardsAdapter.test.ts` (extend the existing `describe('toBoardSummary', ...)` block).
- [X] T003 [P] [US1] Unit test: `CreateBoard` use-case's new team-membership branches — no `teamId` provided behaves exactly as before; `teamId` provided and the requester has a membership (via a fake `TeamsPort.getMembership`) passes it through; `teamId` provided and the requester has no membership throws a `403 forbidden` `ForbiddenError` before any board is created — in `server/test/application/use-cases/boards/CreateBoard.test.ts` (extend the existing file; define a minimal inline fake for `Pick<TeamsPort, 'getMembership'>`, no new shared fakes file needed for one method).
- [X] T004 [P] [US1] Component test: `CreateBoardFlow` renders a team `<select>` (populated from `useTeamsQuery()`) on the "details" step when the signed-in user belongs to ≥1 team, omits the control entirely when they belong to 0 teams, and includes the selected `teamId` (or `null` when left unselected) in its call to `createBoard()` — in `src/test/features/create-board/CreateBoardFlow.test.tsx` (extend the existing file).

### Implementation for User Story 1

- [X] T005 [P] [US1] Make `toBoardSummary` read `teamId: data.teamId ?? null` in `server/src/adapters/firebase/FirestoreBoardsAdapter.ts` (depends on T002, T001).
- [X] T006 [P] [US1] Add a `teamsPort: Pick<TeamsPort, 'getMembership'>` dependency to `CreateBoard` and, when `params.teamId` is provided, reject with `ForbiddenError` unless `teamsPort.getMembership(params.teamId, params.createdBy)` resolves non-null (FR-004) — in `server/src/application/use-cases/boards/CreateBoard.ts` (depends on T003, T001).
- [X] T007 [US1] Write `teamId: input.teamId ?? null` onto the new retrospective document in `FirestoreBoardsAdapter.createBoard`, `server/src/adapters/firebase/FirestoreBoardsAdapter.ts` (depends on T001; same file as T005, do after it).
- [X] T008 [US1] In `server/src/http/routes/boards.ts`: add `teamsPort: Pick<TeamsPort, 'getMembership'>` to `BoardsRouterDeps`, read `body.teamId` (string → pass through, anything else → `null`) into the `POST /api/boards` handler's call to `createBoard`, and add `teamId: board.teamId` to `serializeBoard()` so `GET /api/boards` exposes the raw association (depends on T006).
- [X] T009 [US1] Construct `FirestoreTeamsAdapter` and pass it as `teamsPort` in `server/src/http/boards-wiring.ts`'s `buildBoardsDeps`, mirroring how `profilePort` is already built there (depends on T008).
- [X] T010 [P] [US1] Add `teamId?: string | null` to `CreateBoardParams` (sent in the `POST /api/boards` request body) and `teamId: string | null` to `BoardSummary`/`BoardSummaryDTO`, in `src/features/dashboard/services/backendBoardsClient.ts` (depends on T008).
- [X] T011 [US1] Add the team `<select>` to `CreateBoardFlow.tsx`'s "details" step — populated via the existing, unmodified `useTeamsQuery()` hook (054), hidden entirely (not disabled) when the user belongs to 0 teams, wired into the `createBoard()` call's new `teamId` param — use the `apple-design`/`emil-design-eng` skill package for the control's visual/interaction design per constitution Principle IX, in `src/features/create-board/components/CreateBoardFlow.tsx` (depends on T004, T010).
- [X] T012 [P] [US1] Add `createBoard.team.*` i18n keys (picker label, "no team" default option copy) to `src/locales/en.json` and `src/locales/es.json`.
- [X] T013 [US1] WCAG 2.1 AA pass on the new team `<select>` in `CreateBoardFlow.tsx` — keyboard operability, visible focus indicator, contrast, correct label association — in both light and dark themes, per constitution Principle VIII (depends on T011).
- [X] T014 [P] [US1] Playwright E2E covering quickstart.md Scenarios 1 and 2 (create linked to a team and confirm `teamId` persisted; create without a team and confirm unaffected behavior; a facilitator with zero teams sees no picker at all; a manipulated request naming a team the facilitator doesn't belong to is rejected with `403`) in a new `e2e/board-team-association.spec.ts` (depends on T009, T011).

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable.

---

## Phase 4: User Story 2 - Filter "My Boards" dashboard by team (Priority: P2)

**Goal**: The dashboard's team filter, sourced from every team the viewing user belongs to (`GET /api/teams` via the existing `useTeamsQuery()` hook — per the Clarifications session, not derived from the board list), narrows the visible board list to `board.teamId` matches (or "no team"), combinable with the existing search/scope filters.

**Independent Test**: With a mix of team-linked and unlinked boards (from User Story 1) on the dashboard, select a specific team filter and confirm only matching boards show; select "no team" and confirm only unlinked boards show; combine with the search box; clear the filter and confirm the full list returns — independent of the creation flow itself and of the at-a-glance badge (User Story 3). Requires no backend change: `board.teamId` is already returned by `GET /api/boards` as of User Story 1.

### Tests for User Story 2 ⚠️ (write first, confirm they fail)

- [X] T015 [P] [US2] Unit test: `useBoardListQuery`'s new `teamFilter` param — filters to boards whose `teamId` matches a specific selection, filters to boards with `teamId === null` for a "no team" selection, leaves the list unfiltered by team when no team filter is active, and combines correctly with the existing `scopeFilter`/`searchText` (all active filters narrow simultaneously) — in `src/test/features/dashboard/useBoardListQuery.test.ts` (extend the existing file).
- [X] T016 [P] [US2] Component test: `BoardControlsBar`'s new team-filter control renders every team from `useTeamsQuery()` plus a "no team" option (even a team with zero currently-visible boards, per the Clarifications session), and calls the change handler with the selected value — in `src/test/features/dashboard/BoardControlsBar.test.tsx` (extend the existing file).

### Implementation for User Story 2

- [X] T017 [US2] Add a `teamFilter` param (`'all' | 'none' | string` — a specific teamId) and its filtering logic to `useBoardListQuery` in `src/features/dashboard/hooks/useBoardListQuery.ts` (depends on T015).
- [X] T018 [US2] Add the team-filter control (populated via `useTeamsQuery()`, includes an "all teams" default and a "no team" option) to `BoardControlsBar.tsx`, `src/features/dashboard/components/BoardControlsBar.tsx` (depends on T016).
- [X] T019 [US2] Wire `teamFilter` state through `src/pages/Dashboard.tsx` — new `useState`, passed to `useBoardListQuery` and `BoardControlsBar`, reset to `'all'` alongside the existing page-reset effect when other filters change (depends on T017, T018).
- [X] T020 [P] [US2] Add `dashboard.controls.team.*` i18n keys (filter label, "all teams"/"no team" option copy) to `src/locales/en.json` and `src/locales/es.json`.
- [X] T021 [US2] WCAG 2.1 AA pass on the new team-filter control — keyboard operability, visible focus, contrast, correct label association — in both themes, per constitution Principle VIII (depends on T018).
- [X] T022 [US2] Extend `e2e/board-team-association.spec.ts` with quickstart.md Scenario 3 (team filter shows every team the user belongs to, not just teams with matching boards; filtering by a specific team and by "no team" each narrow correctly; combines with search; clearing returns the full list) (depends on T019, T014).

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - See a retrospective's team at a glance on the dashboard (Priority: P3)

**Goal**: Each dashboard board row visibly shows its associated team's name, resolved server-side regardless of the viewer's own team membership — and, per the Clarifications session, this indicator never appears inside an open retrospective session.

**Independent Test**: View the dashboard with a mix of team-linked and unlinked boards and confirm the linked ones show a team badge with the correct name while unlinked ones show none; separately confirm no team identifier appears anywhere in an open retrospective session's UI or network responses, and that joining a team-linked board via link/ID is completely unaffected — independent of the filter control (User Story 2).

### Tests for User Story 3 ⚠️ (write first, confirm they fail)

- [X] T023 [P] [US3] Component test: `BoardRow` renders a team badge showing `board.teamName` when `board.teamId` is set, and renders no badge when it's `null` — in `src/test/features/dashboard/BoardRow.test.tsx` (extend the existing file).

### Implementation for User Story 3

- [X] T024 [US3] In `FirestoreBoardsAdapter.listBoardsForUser` (`server/src/adapters/firebase/FirestoreBoardsAdapter.ts`), after building the board summaries, collect the distinct non-null `teamId`s and resolve their names via a batched, chunked read of the `teams` collection (`where('__name__', 'in', chunk)`, 30-id chunks — mirrors the existing `participants`-join pattern in this same method), setting `teamName` on each matching summary (depends on T001, T007; not unit-tested per this file's documented adapter-exception convention — covered by T014/T022/T030's E2E instead).
- [X] T025 [US3] Add `teamName: board.teamName` to `serializeBoard()` in `server/src/http/routes/boards.ts`, so `GET /api/boards` exposes the resolved name (depends on T024).
- [X] T026 [P] [US3] Add `teamName: string | null` to `BoardSummary`/`BoardSummaryDTO` in `src/features/dashboard/services/backendBoardsClient.ts` (depends on T025).
- [X] T027 [US3] Add the team badge to `BoardRow.tsx` — rendered next to the existing owner/joined role badge, showing `board.teamName` only when present — use the `apple-design`/`emil-design-eng` skill package for the badge's visual design per constitution Principle IX, in `src/features/dashboard/components/BoardRow.tsx` (depends on T023, T026).
- [X] T028 [P] [US3] Add `dashboard.boardCard.team` i18n keys (badge `aria-label`/tooltip copy, e.g. "Team: {{name}}") to `src/locales/en.json` and `src/locales/es.json`.
- [X] T029 [US3] WCAG 2.1 AA pass on the new team badge — contrast, no color-only meaning (an icon or text label accompanies it, matching the existing role-badge pattern), visible in both themes — per constitution Principle VIII (depends on T027).
- [X] T030 [US3] Extend `e2e/board-team-association.spec.ts` with quickstart.md Scenarios 4 and 5 (a user with no relationship to the linked team joins the board via link/ID exactly as they would an unlinked board; the dashboard badge is visible to the owner; no team identifier or name appears anywhere in the open retrospective session's rendered UI or session-specific network traffic) (depends on T024, T025, T022).

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Whole-feature validation once all desired stories are complete.

- [X] T031 Run every quickstart.md scenario (1–5) end-to-end against the emulator, including the "out-of-scope checks" (no `PATCH` endpoint exists; a retrospective's `teamId` survives its creator leaving that team), and record the outcome.
- [X] T032 [P] Run `npm run test:server:coverage` and confirm `server/src/application/use-cases/boards/**` and `server/src/adapters/firebase/FirestoreBoardsAdapter.ts` keep the thresholds in `server/vitest.config.ts` (branches 80 / functions 68 / lines 74 / statements 74).
- [X] T033 [P] Run `npm run test:coverage` and confirm `src/features/dashboard/**` and `src/features/create-board/**` keep the thresholds in `vitest.config.ts` (branches 78 / functions 64 / lines 50 / statements 50).
- [X] T034 [P] Run `npm run type-check`, `npm run type-check:server`, and `npm run lint` and fix any findings across all changed files.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: None — nothing to do.
- **Foundational (Phase 2)**: BLOCKS all user stories (every story's backend task reads or writes the `teamId`/`teamName` fields T001 adds).
- **User Stories (Phase 3–5)**: All depend on Foundational phase completion.
  - US1 has no dependency on US2/US3.
  - US2 depends on US1 only for test data (`board.teamId` must exist to filter on) — it makes **no backend changes** of its own; the filter is entirely a client-side consumer of a field US1 already exposes via `GET /api/boards`.
  - US3 is backend-independent of US2 (it adds its own `teamName` resolution to the same adapter method) but its E2E task (T030) extends the same growing spec file as US1's (T014) and US2's (T022) for narrative continuity, not because the underlying feature code depends on US2.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### Within Each User Story

- Tests MUST be written and FAIL before their corresponding implementation task (constitution Principle I).
- Port/type changes before adapter changes; adapter changes before route changes; route changes before wiring; backend contract before frontend client; client before hooks/components.
- WCAG pass is the last implementation task in each story, once that story's UI exists.

### Parallel Opportunities

- T002, T003, T004 (US1 tests) touch three different files and can run in parallel.
- T005 and T006 (US1 impl) touch different files (`FirestoreBoardsAdapter.ts` vs `CreateBoard.ts`) and have no dependency on each other — parallel. T007 shares a file with T005, so it follows T005 sequentially.
- T010 and T012 (US1) touch different files than the T008/T009/T011 chain and can proceed in parallel once T008 lands.
- T015 and T016 (US2 tests) touch different files — parallel.
- T020 (US2 i18n) has no dependency on T017–T019 and can proceed in parallel.
- T026 and T028 (US3) touch different files than the T024/T025/T027 chain — parallel once T025 lands.
- T032, T033, T034 (Polish) are independent verification commands — parallel.

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test toBoardSummary reads/defaults teamId in server/test/adapters/firebase/FirestoreBoardsAdapter.test.ts"
Task: "Unit test CreateBoard's membership-validation branches in server/test/application/use-cases/boards/CreateBoard.test.ts"
Task: "Component test CreateBoardFlow's team picker in src/test/features/create-board/CreateBoardFlow.test.tsx"

# Launch independent-file implementation tasks for User Story 1 together:
Task: "toBoardSummary reads teamId in server/src/adapters/firebase/FirestoreBoardsAdapter.ts"
Task: "CreateBoard use-case gains teamsPort dependency + membership check in server/src/application/use-cases/boards/CreateBoard.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (nothing to do).
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: run quickstart.md Scenarios 1 and 2 independently.
5. Deploy/demo if ready — a facilitator can link a new retrospective to a team, verifiable via `GET /api/boards`'s raw `teamId`, even with no dashboard filter or badge yet.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. Add User Story 1 → validate with quickstart.md Scenarios 1–2 → deploy/demo (MVP!).
3. Add User Story 2 → validate with Scenario 3 → deploy/demo.
4. Add User Story 3 → validate with Scenarios 4–5 → deploy/demo.
5. Phase 6 Polish → full quickstart.md pass, coverage/lint/type-check verification.

### Parallel Team Strategy

With multiple developers, once Foundational (Phase 2, T001) is done:

- Developer A: User Story 1 (T002–T014) — the only story with backend authorization logic.
- Developer B: prepares User Story 2's test scaffolding (T015–T016) against `useBoardListQuery`'s
  existing shape, ready to implement (T017–T022) as soon as T010 (US1's `BoardSummary.teamId` on
  the client) lands.
- Developer C: prepares User Story 3's test scaffolding (T023) and the `teamName`-resolution work
  (T024–T025), which only needs T001/T007 from Foundational/US1, not US2.

---

## Notes

- [P] tasks touch different files with no unfinished dependency between them.
- [Story] labels map every user-story-phase task to its story in spec.md for traceability.
- Each user story is independently completable and testable per its Independent Test description.
- Verify each test fails before implementing the task it covers (TDD, Principle I).
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before continuing.
- Out of scope for every task above (per spec.md Assumptions, do not implement): editing/removing a
  retrospective's team after creation, deriving the dashboard filter from the board list instead of
  "my teams," and any team indicator inside the open retrospective session itself.
