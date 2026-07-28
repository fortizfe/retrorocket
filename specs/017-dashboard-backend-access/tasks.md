---

description: "Task list template for feature implementation"
---

# Tasks: Dashboard Backend-Mediated Firebase Access

**Input**: Design documents from `/specs/017-dashboard-backend-access/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/boards-api.yaml, quickstart.md

**Tests**: Included and sequenced before their corresponding implementation task per constitution Principle I (TDD, NON-NEGOTIABLE) and Principle VII (Playwright E2E on critical flows — board creation is explicitly named).

**Organization**: Tasks are grouped by user story (US1–US4, from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Web app split per plan.md: `retro-rocket/server/src/` (+ `retro-rocket/server/test/`) for the backend, `retro-rocket/src/` (+ `retro-rocket/src/test/`) for the frontend, `retro-rocket/e2e/` for Playwright. All paths below are relative to `retro-rocket/`.

**Important shared-file note**: Unlike a feature with per-story-isolated files, this small CRUD surface has five genuinely shared files that every story appends to: `server/src/adapters/firebase/FirestoreBoardsAdapter.ts`, `server/test/adapters/firebase/FirestoreBoardsAdapter.test.ts`, `server/src/http/routes/boards.ts`, `server/test/http/routes/boards.test.ts`, `src/features/dashboard/services/backendBoardsClient.ts`, and `src/test/features/dashboard/services/backendBoardsClient.test.ts`. Each story's task against one of these files is additive (a new method/route/describe-block/function), so stories remain independently *testable*, but implementing them truly concurrently across developers would create merge conflicts on those files. **Implement stories sequentially in priority order (US1 → US2 → US3 → US4).** [P] markers below apply only to tasks *within* the same story phase that touch distinct files.

<!--
  Tasks are organized by user story from spec.md:
  US1 (P1) View my list of boards · US2 (P1) Create a new retrospective ·
  US3 (P1) Join an existing retrospective · US4 (P2) Rename/edit/delete my own boards
-->

## Phase 1: Setup

**Purpose**: Confirm no new dependencies are needed and the vertical-slice directories exist.

- [X] T001 Create the backend `boards` vertical-slice directories: `server/src/application/use-cases/boards/`, `server/src/domain/boards/`, `server/test/application/use-cases/boards/`; confirm `express-rate-limit`, `firebase-admin`, and `zod` are already in `package.json` (research.md — no new dependency required)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared contract (port, error, wiring, router mount, adapter/client skeletons) every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add `ForbiddenError` (code `forbidden`, `httpStatus: 403`) to `server/src/domain/errors.ts`, alongside the existing `AppError`/`NotFoundError`/`ConfigError` (data-model.md, research.md §8)
- [X] T003 [P] Define the `BoardsPort` interface and `BoardSummary`/`CreateBoardInput` DTOs in `server/src/application/ports/boards.ts`, per data-model.md's `BoardsPort` shape
- [X] T004 [P] Port the `BOARD_TEMPLATES`/`ACTION_COLUMN` definitions (default, madSadGlad, startStopContinue) into `server/src/domain/boards/templates.ts`, matching `src/features/create-board/boardTemplates.ts` exactly (research.md §5)
- [X] T005 Create the `FirestoreBoardsAdapter` class skeleton in `server/src/adapters/firebase/FirestoreBoardsAdapter.ts` — constructor taking a `Firestore` instance, `retrospectives`/`participants` collection constants, `implements BoardsPort` with all five methods stubbed as `async ...(): Promise<never> { throw new Error('Not implemented'); }` so the class type-checks immediately; each story (T015, T025, T035, T047) replaces its own stub with a real implementation (depends on T003)
- [X] T006 Create the `/api/boards` router skeleton in `server/src/http/routes/boards.ts`: exported `boardsRouter(deps: BoardsRouterDeps): Router`, a `boardsLimiter` (`express-rate-limit`, mirrors `mcp.ts`'s `tokenLimiter`), and a local `requireSession(req, deps)` helper (mirrors `mcp.ts:45-49`) — no routes registered yet (depends on T003)
- [X] T007 Create `buildBoardsDeps(source, config, logger, sessionService)` composition wiring in `server/src/http/boards-wiring.ts`, mirroring `mcp-wiring.ts` (resolves `getFirestore()`, injects `FirestoreBoardsAdapter`, `SystemClock`/`SystemRandom`) (depends on T005, T006)
- [X] T008 Mount `boardsRouter` in `server/src/http/app.ts` behind an optional `deps.boardsDeps`, with the same `503 config_error` fallback used for `authDeps`/`mcpDeps` (depends on T007)
- [X] T009 [P] Create the `backendBoardsClient.ts` skeleton in `src/features/dashboard/services/backendBoardsClient.ts`: `const API = '/api/boards'`, exported `BoardSummary` type (mirrors `contracts/boards-api.yaml`'s schema) — functions added per story below

**Checkpoint**: Foundation ready — user story implementation can now begin (sequentially, per the shared-file note above).

---

## Phase 3: User Story 1 - View my list of boards (Priority: P1) 🎯 MVP

**Goal**: `GET /api/boards` returns the requesting user's created + joined boards; the Dashboard renders them with zero direct Firestore calls, and existing search/sort/filter/pagination/view-toggle controls keep working unchanged.

**Independent Test**: Sign in as a user with a mix of created and joined boards, open the Dashboard, confirm the same boards/info appear as before, and confirm via network inspection that only `/api/boards` (and `/api/auth/session`) requests fire — zero direct Firebase/Firestore requests.

### Tests for User Story 1 ⚠️

> Write these tests FIRST; confirm they FAIL before implementing.

- [X] T010 [P] [US1] Unit test for the `listBoardsForUser` use-case (merges owned + joined, no duplicates, correct `isCreator` flag) in `server/test/application/use-cases/boards/ListBoardsForUser.test.ts`
- [X] T011 [P] [US1] Unit test for `FirestoreBoardsAdapter.listBoardsForUser` against the emulator — owned via `createdBy`, joined via `participants` collection, per research.md §3 — in `server/test/adapters/firebase/FirestoreBoardsAdapter.test.ts`
- [X] T012 [P] [US1] Contract test for `GET /api/boards` (200 with `{ boards }`, 401 without a valid session) in `server/test/http/routes/boards.test.ts`, mirroring `mcpConnections.test.ts`'s structure
- [X] T013 [P] [US1] Unit test for `backendBoardsClient.listBoards()` (success + non-OK throws) in `src/test/features/dashboard/services/backendBoardsClient.test.ts`

### Implementation for User Story 1

- [X] T014 [US1] Implement the `listBoardsForUser` use-case in `server/src/application/use-cases/boards/ListBoardsForUser.ts` (depends on T010)
- [X] T015 [US1] Implement `FirestoreBoardsAdapter.listBoardsForUser` in `FirestoreBoardsAdapter.ts` — owned boards via `where('createdBy','==',uid)`, joined boards derived from `participants` (no read of `users.joinedBoards`/`userBoardHistory`, per research.md §3) (depends on T011)
- [X] T016 [US1] Implement the `GET /api/boards` route handler in `boards.ts` (depends on T012, T014, T015)
- [X] T017 [US1] Implement `listBoards(): Promise<BoardSummary[]>` in `backendBoardsClient.ts` (depends on T013, T016)
- [X] T018 [US1] In `src/pages/Dashboard.tsx`'s `loadUserBoards`, replace the `userService.getUserBoards(user.uid)` call with `backendBoardsClient.listBoards()`, preserving the existing loading/error/empty-state handling (FR-008) (depends on T017)
- [X] T019 [US1] Add `e2e/dashboard-list.spec.ts` — signed-in user with created and joined boards sees both, categorized correctly, with a network assertion that no request reaches a Firebase/Firestore endpoint from the Dashboard (depends on T018)

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Create a new retrospective (Priority: P1)

**Goal**: `POST /api/boards` creates a board (with the chosen template's columns + the automatic action-items column) via the backend only; the Dashboard's create flow uses it and navigates into the new board.

**Independent Test**: Run the create-board flow for each template from the Dashboard; confirm the new board appears with correct columns and the user is navigated into it, with the creation request only reaching the backend.

### Tests for User Story 2 ⚠️

- [X] T020 [P] [US2] Unit test for the `createBoard` use-case (rejects unknown `templateId` and empty `title`, sets `createdBy`, produces the template's columns + `actionItems`) in `server/test/application/use-cases/boards/CreateBoard.test.ts`
- [X] T021 [P] [US2] Unit test for `FirestoreBoardsAdapter.createBoard` against the emulator — writes the `retrospectives` doc and its `columns` subcollection atomically via a single `WriteBatch` — in `FirestoreBoardsAdapter.test.ts`
- [X] T022 [P] [US2] Contract test for `POST /api/boards` (201 `{ boardId }`, 400 invalid template/empty title, 401) in `boards.test.ts`
- [X] T023 [P] [US2] Unit test for `backendBoardsClient.createBoard(...)` in `backendBoardsClient.test.ts`

### Implementation for User Story 2

- [X] T024 [US2] Implement the `createBoard` use-case in `server/src/application/use-cases/boards/CreateBoard.ts`, using the T004 template constants (depends on T020)
- [X] T025 [US2] Implement `FirestoreBoardsAdapter.createBoard` in `FirestoreBoardsAdapter.ts`, writing the `retrospectives` doc and its `columns` subcollection in a single Firestore `WriteBatch` (atomic — prevents the orphaned, column-less board that today's non-atomic frontend write can leave on partial failure; see US2 Acceptance Scenario 3) (depends on T021)
- [X] T026 [US2] Implement the `POST /api/boards` route handler in `boards.ts` (depends on T022, T024, T025)
- [X] T027 [US2] Implement `createBoard(input): Promise<{ boardId: string }>` in `backendBoardsClient.ts` (depends on T023, T026)
- [X] T028 [US2] In `src/features/create-board/components/CreateBoardFlow.tsx`, replace the `createBoardFromTemplate` call with `backendBoardsClient.createBoard`, preserving the existing success-navigation and error-toast behavior (depends on T027)
- [X] T029 [US2] Extend `e2e/board-creation.spec.ts` to assert board creation goes only through `/api/boards`, for each of the three templates (depends on T028)

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Join an existing retrospective (Priority: P1)

**Goal**: `POST /api/boards/:id/join` records the requesting user as a participant via the backend only; the Dashboard's join flow uses it, idempotently.

**Independent Test**: As a user not yet a participant, submit a board's ID/link via the Join flow; confirm it appears under "joined" and that re-submitting the same ID doesn't duplicate membership, with the request only reaching the backend.

### Tests for User Story 3 ⚠️

- [X] T030 [P] [US3] Unit test for the `joinBoard` use-case (404 for missing/inactive board, idempotent when already owner/participant) in `server/test/application/use-cases/boards/JoinBoard.test.ts`
- [X] T031 [P] [US3] Unit test for `FirestoreBoardsAdapter.joinBoard`/`getBoard` against the emulator — existence/`isActive` check, `participants` dedup, `participantCount` increment — in `FirestoreBoardsAdapter.test.ts`
- [X] T032 [P] [US3] Contract test for `POST /api/boards/:id/join` (200, 404, idempotent re-join, 401) in `boards.test.ts`
- [X] T033 [P] [US3] Unit test for `backendBoardsClient.joinBoard(id)` in `backendBoardsClient.test.ts`

### Implementation for User Story 3

- [X] T034 [US3] Implement the `joinBoard` use-case in `server/src/application/use-cases/boards/JoinBoard.ts` (depends on T030)
- [X] T035 [US3] Implement `FirestoreBoardsAdapter.joinBoard` and `getBoard` in `FirestoreBoardsAdapter.ts` (depends on T031)
- [X] T036 [US3] Implement the `POST /api/boards/:id/join` route handler in `boards.ts` (depends on T032, T034, T035)
- [X] T037 [US3] Implement `joinBoard(id): Promise<BoardSummary>` in `backendBoardsClient.ts` (depends on T033, T036)
- [X] T038 [US3] In `src/features/dashboard/components/JoinRetrospectiveModal.tsx` (via `src/features/boards/retrospective/hooks/useJoinRetrospective.ts`), replace the `joinRetrospectiveById` + `addParticipant` + `incrementParticipantCount` calls with `backendBoardsClient.joinBoard`, preserving invalid-ID and already-a-participant behavior (depends on T037)
- [X] T039 [US3] Add `e2e/board-join.spec.ts` — join by valid ID, duplicate join is a no-op, invalid ID shows a visible error, and (per SC-002) a network assertion that no request reaches a Firebase/Firestore endpoint during the join flow (depends on T038)

**Checkpoint**: User Stories 1–3 (all P1) are independently functional — this is the MVP.

---

## Phase 6: User Story 4 - Rename, edit, and delete my own boards (Priority: P2)

**Goal**: `PATCH`/`DELETE /api/boards/:id` let a board's owner rename or permanently delete it via the backend only, rejecting non-owners.

**Independent Test**: As owner, rename and confirm persistence after reload; delete and confirm removal from the list; as a non-owner, confirm neither action is available/possible.

### Tests for User Story 4 ⚠️

- [X] T040 [P] [US4] Unit test for the `renameBoard` use-case (owner succeeds, non-owner throws `ForbiddenError`, empty title rejected) in `server/test/application/use-cases/boards/RenameBoard.test.ts`
- [X] T041 [P] [US4] Unit test for the `deleteBoard` use-case (owner succeeds, non-owner throws `ForbiddenError`) in `server/test/application/use-cases/boards/DeleteBoard.test.ts`
- [X] T042 [P] [US4] Unit tests for `FirestoreBoardsAdapter.renameBoard`/`deleteBoard` against the emulator — delete removes only the top-level `retrospectives/{id}` doc, matching today's exact behavior (research.md §6) — in `FirestoreBoardsAdapter.test.ts`
- [X] T043 [P] [US4] Contract tests for `PATCH /api/boards/:id` and `DELETE /api/boards/:id` (204, 403 non-owner, 404, 401) in `boards.test.ts`
- [X] T044 [P] [US4] Unit tests for `backendBoardsClient.renameBoard(id, title)` / `deleteBoard(id)` in `backendBoardsClient.test.ts`

### Implementation for User Story 4

- [X] T045 [US4] Implement the `renameBoard` use-case in `server/src/application/use-cases/boards/RenameBoard.ts` (depends on T040)
- [X] T046 [US4] Implement the `deleteBoard` use-case in `server/src/application/use-cases/boards/DeleteBoard.ts` (depends on T041)
- [X] T047 [US4] Implement `FirestoreBoardsAdapter.renameBoard`/`deleteBoard` in `FirestoreBoardsAdapter.ts` (depends on T042)
- [X] T048 [US4] Implement the `PATCH`/`DELETE /api/boards/:id` route handlers in `boards.ts` (depends on T043, T045, T046, T047)
- [X] T049 [US4] Implement `renameBoard(id, title)` / `deleteBoard(id)` in `backendBoardsClient.ts` (depends on T044, T048)
- [X] T050 [US4] In `src/features/dashboard/components/EditRetrospectiveModal.tsx`, replace the `updateRetrospective` call with `backendBoardsClient.renameBoard` (depends on T049)
- [X] T051 [US4] In `src/pages/Dashboard.tsx`'s `handleHardDelete`, replace `OptimizedRetrospectiveService.deleteRetrospectiveCompletely` with `backendBoardsClient.deleteBoard` (depends on T049)
- [X] T052 [US4] Add `e2e/dashboard-manage.spec.ts` — owner renames and deletes a board; a non-owner has no rename/delete affordance on a board they don't own; and (per SC-002) a network assertion that no request reaches a Firebase/Firestore endpoint during either flow (depends on T050, T051)

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full-feature validation across all stories.

- [X] T053 [P] Run the full `quickstart.md` validation pass (sections 1–4: zero-Firestore-call check, all four user stories, unaffected-controls regression) against the emulator
- [X] T054 [P] Update `server/README.md`'s architecture tree to add the new `boards` slice (`application/ports/boards.ts`, `application/use-cases/boards/`, `adapters/firebase/FirestoreBoardsAdapter.ts`, `http/routes/boards.ts`), mirroring how `auth`/`mcp` are already documented
- [X] T055 Run `npm run test:server:coverage` and `npm run test:coverage`; confirm both remain at/above the 80% branches/functions/lines/statements floor (`vitest.config.ts`) per constitution Principle VI
- [X] T056 Run `npm run lint`, `npm run type-check`, and `npm run type-check:server`; fix any errors
- [X] T057 Run `npm run e2e` (full Playwright suite against the emulator) and confirm all new/updated specs pass
- [X] T058 Validate SC-001: measure `GET /api/boards`, `POST /api/boards`, and `POST /api/boards/:id/join` response times (DevTools Network tab or a Playwright timing assertion) on a warm backend and after a cold serverless start; confirm both are within the 3 s (p95 warm) / 5 s (p95 cold) targets, per `quickstart.md` §6

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–6)**: All depend on Foundational completion. Implement **sequentially in priority order (US1 → US2 → US3 → US4)** — see the shared-file note above; this is not a "parallel team" feature despite the four independent stories.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational. No dependency on other stories.
- **US2 (P1)**: Starts after Foundational. Independently testable; shares `FirestoreBoardsAdapter.ts`/`boards.ts`/`backendBoardsClient.ts` with US1 (sequential file edits, not a functional dependency).
- **US3 (P1)**: Same as US2.
- **US4 (P2)**: Same as US2/US3. Optional fast-follow after the P1 MVP (US1–US3).

### Within Each User Story

- Tests are written and confirmed failing before implementation (constitution Principle I).
- Use-case before adapter method before route handler before frontend client function before UI wiring before E2E spec.
- Story checkpoint reached (independently testable) before moving to the next priority.

### Parallel Opportunities

- T003 and T004 (Foundational) can run in parallel — distinct files, no interdependency.
- Within any single story's Tests block, all four listed tests touch distinct files and can run in parallel.
- Across stories: not parallel-safe for the shared adapter/router/client files (see shared-file note); the four independent use-case files (`ListBoardsForUser.ts`, `CreateBoard.ts`, `JoinBoard.ts`, `RenameBoard.ts`/`DeleteBoard.ts`) themselves could be drafted in parallel by different developers, but final integration into the shared adapter/router/client files must be serialized.

---

## Parallel Example: User Story 1

```bash
# Launch all four US1 tests together (distinct files):
Task: "Unit test for listBoardsForUser use-case in server/test/application/use-cases/boards/ListBoardsForUser.test.ts"
Task: "Unit test for FirestoreBoardsAdapter.listBoardsForUser in server/test/adapters/firebase/FirestoreBoardsAdapter.test.ts"
Task: "Contract test for GET /api/boards in server/test/http/routes/boards.test.ts"
Task: "Unit test for backendBoardsClient.listBoards() in src/test/features/dashboard/services/backendBoardsClient.test.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1–3, all P1)

Spec.md marks list, create, and join all as P1 — the user explicitly named all three as equally in-scope. Treat US1–US3 together as this feature's MVP, not US1 alone:

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: US1 (list) → validate independently
4. Complete Phase 4: US2 (create) → validate independently
5. Complete Phase 5: US3 (join) → validate independently
6. **STOP and VALIDATE**: run `quickstart.md` sections 1–3; this is a demoable, independently-shippable increment
7. Complete Phase 6: US4 (rename/delete, P2) as a fast-follow
8. Complete Phase 7: Polish

### Incremental Delivery

Each story phase ends at a checkpoint where the Dashboard is fully functional with that story's capability backend-mediated and everything else unchanged — safe to pause and ship after any checkpoint, including after US1 alone if a smaller first slice is preferred.

### Team Strategy

Because of the shared-file constraint noted above, this feature is best executed by one implementer moving through phases sequentially rather than split across a team by user story. If parallelized, coordinate merges of `FirestoreBoardsAdapter.ts`, `boards.ts`, `boards.test.ts`, `backendBoardsClient.ts`, and `backendBoardsClient.test.ts` explicitly to avoid conflicts.

---

## Notes

- [P] tasks = different files, no dependencies (see shared-file note for what does *not* qualify here).
- [Story] label maps each task to its user story for traceability.
- Verify each test fails before implementing (TDD, constitution Principle I).
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- Delete semantics intentionally do not cascade to `cards`/`groups`/`participants` subcollections — this matches today's actual behavior exactly (research.md §6); fixing that pre-existing gap is out of scope for this feature.
