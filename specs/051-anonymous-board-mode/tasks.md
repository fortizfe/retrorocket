# Tasks: Anonymous Board Mode

**Input**: Design documents from `/specs/051-anonymous-board-mode/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Per the project constitution (Principle I, TDD, NON-NEGOTIABLE), every implementation task below is preceded by a failing-test task covering the same unit. Write the test, confirm it fails, then implement.

**Organization**: Tasks are grouped by user story (spec.md priorities: US1/US2 = P1, US3 = P2) so each story can be implemented, tested, and demoed independently on top of the shared Foundational plumbing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1, US2, or US3 — omitted for Setup/Foundational/Polish tasks
- All paths are relative to `retro-rocket/`

## Path Conventions

Existing web app split: `retro-rocket/server/**` (backend, hexagonal ports/adapters/use-cases/routes) and `retro-rocket/src/**` (frontend). No new top-level directory is introduced (plan.md's Structure Decision).

---

## Phase 1: Setup

**Purpose**: Confirm the environment this feature is built and validated against; no new dependency or scaffolding is needed (research.md — zero new dependencies).

- [X] T001 Confirm `npm run emulators` and `npm run dev:all` run cleanly from `retro-rocket/` per [quickstart.md](./quickstart.md) §1 (no code change — environment check only)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Get `isAnonymous` flowing end-to-end, read-only, through every existing layer (Firestore → DTO → REST/realtime → frontend state → domain type) before any user story is built on top of it. Every story below depends on this being in place.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Backend read path

- [X] T002 [P] Add failing tests asserting `toRetrospective()` defaults `isAnonymous` to `false` when the Firestore document has no such field, and passes through `true` when present, in `server/test/adapters/firebase/FirestoreRetrospectiveBoardAdapter.test.ts`
- [X] T003 [P] Add `isAnonymous: boolean` to `RetrospectiveDTO` in `server/src/application/ports/retrospective.ts`
- [X] T004 Implement the `isAnonymous` default (`data.isAnonymous as boolean ?? false`, mirroring the existing `columnGroupingStates ?? {}` fallback) in `toRetrospective()` in `server/src/adapters/firebase/FirestoreRetrospectiveBoardAdapter.ts` (depends on: T002, T003)
- [X] T005 [P] Add a failing test asserting `GetBoardState`'s result includes `isAnonymous` in `server/test/application/use-cases/retrospective/GetBoardState.test.ts`
- [X] T006 Propagate `isAnonymous` through `RetrospectiveStateResult` in `server/src/application/use-cases/retrospective/GetBoardState.ts` (depends on: T004, T005)
- [X] T007 [P] Add a failing test asserting `GET /api/retrospectives/:id`'s response body includes `isAnonymous` in `server/test/http/routes/retrospectives.test.ts`
- [X] T008 Add `isAnonymous: state.isAnonymous` to `serializeBoardState()` in `server/src/http/routes/retrospectives.ts` (depends on: T006, T007)

### Frontend read path

- [X] T009 [P] Add a failing test asserting `RetrospectiveState`/`RetrospectiveStateDTO` round-trip `isAnonymous` correctly in `src/test/features/boards/retrospective/backendRetrospectiveClient.test.ts`
- [X] T010 [P] Add `isAnonymous: boolean` to `RetrospectiveState` (and its wire `RetrospectiveStateDTO`) in `src/features/boards/retrospective/services/backendRetrospectiveClient.ts` (depends on: T009)
- [X] T011 [P] Add a failing test asserting `parseRetrospectiveFields()` maps `isAnonymous` from a live `retrospective` `entity_change` event onto board state, in `src/test/features/boards/retrospective/useRetrospectiveRealtimeSync.test.ts`
- [X] T012 Add `isAnonymous` to `parseRetrospectiveFields()` in `src/features/boards/retrospective/hooks/useRetrospectiveRealtimeSync.ts` (depends on: T010, T011)
- [X] T013 [P] Add `isAnonymous: boolean` to the `Retrospective` type in `src/features/boards/types/retrospective.ts`
- [X] T014 [P] Add a failing test asserting `RetrospectivePage`'s `board → Retrospective` mapping includes `isAnonymous` in `src/test/pages/RetrospectivePage.test.tsx`
- [X] T015 Add `isAnonymous: board.isAnonymous` to the `board → Retrospective` object literal in `src/pages/RetrospectivePage.tsx` (depends on: T010, T013, T014)

**Checkpoint**: `isAnonymous` now flows end-to-end, read-only, for any board (new or legacy). All three user stories can now be built.

---

## Phase 3: User Story 1 - Create a Board as Anonymous or Named (Priority: P1) 🎯 MVP

**Goal**: The create-board flow lets the user choose anonymity (default off) for any board template; the choice is persisted atomically with the new board.

**Independent Test**: Create one board leaving the toggle at its default, another with it switched on; confirm each opens with the corresponding `isAnonymous` value ([quickstart.md](./quickstart.md) §2).

### Tests for User Story 1

- [X] T016 [P] [US1] Add failing tests asserting `FirestoreBoardsAdapter.createBoard()` persists `isAnonymous: false` when the input omits it and `isAnonymous: true` when the input provides it, in `server/test/adapters/firebase/FirestoreBoardsAdapter.test.ts`
- [X] T017 [P] [US1] Add a failing test asserting the `createBoard` use-case passes `isAnonymous` through to `boardsPort.createBoard`, in `server/test/application/use-cases/boards/CreateBoard.test.ts`
- [X] T018 [P] [US1] Add a failing test asserting `POST /api/boards` accepts an optional `isAnonymous` boolean and forwards it, defaulting to `false` when omitted, in `server/test/http/routes/boards.test.ts`
- [X] T019 [P] [US1] Add a failing test asserting `backendBoardsClient.createBoard()` includes `isAnonymous` in its request body, in `src/test/features/dashboard/backendBoardsClient.test.ts`
- [X] T020 [P] [US1] Add a new test file asserting `CreateBoardFlow` renders an anonymity toggle defaulted off in the "details" step, and that creating with it switched on passes `isAnonymous: true` to `createBoard()`, in `src/test/features/create-board/CreateBoardFlow.test.tsx` (new file)

### Implementation for User Story 1

- [X] T021 [P] [US1] Add `isAnonymous?: boolean` to `CreateBoardInput` in `server/src/application/ports/boards.ts`
- [X] T022 [US1] Add `isAnonymous: input.isAnonymous ?? false` to the board document's `batch.set()` in `createBoard()` in `server/src/adapters/firebase/FirestoreBoardsAdapter.ts` (depends on: T016, T021)
- [X] T023 [P] [US1] Add `isAnonymous?: boolean` to `CreateBoardParams` and pass it through to `boardsPort.createBoard` in `server/src/application/use-cases/boards/CreateBoard.ts` (depends on: T017)
- [X] T024 [US1] Parse an optional `isAnonymous` boolean from the request body and pass it through in the `POST /api/boards` handler in `server/src/http/routes/boards.ts` (depends on: T018, T023)
- [X] T025 [P] [US1] Add `isAnonymous?: boolean` to `createBoard()`'s params/payload in `src/features/dashboard/services/backendBoardsClient.ts` (depends on: T019)
- [X] T026 [US1] Add the anonymity toggle (defaulted off) to the "details" step of `src/features/create-board/components/CreateBoardFlow.tsx`, wiring its value into the `createBoard()` call (depends on: T020, T025)
- [X] T027 [P] [US1] Add `en`/`es` i18n keys for the creation-flow anonymity toggle's label and description in `src/locales/en.json` and `src/locales/es.json`

**Checkpoint**: User Story 1 is independently functional — verified via [quickstart.md](./quickstart.md) §2.

---

## Phase 4: User Story 2 - Participate in an Anonymous Board (Priority: P1)

**Goal**: On an anonymous board, no card shows author identity anywhere, "group by user" is unavailable, a persistent indicator shows the mode, and exports omit authorship — with every other board interaction unaffected.

**Independent Test**: Open an anonymous board with cards from multiple participants (including the facilitator); confirm no author labels, no "group by user" option, the indicator is visible, and TXT/DOCX/PDF exports omit authorship; confirm a non-anonymous board is unaffected ([quickstart.md](./quickstart.md) §3, §5).

### Tests for User Story 2

- [X] T028 [P] [US2] Add a failing test asserting the card author label is not rendered when the board is anonymous (and is rendered as today when it isn't), in `src/test/features/boards/retrospective/CardHeader.test.tsx`
- [X] T029 [P] [US2] Add a failing test asserting `getGroupingOptions()` omits the `'user'` entry when called with the anonymous-exclusion flag, and includes it otherwise, in `src/test/features/boards/types/columnGrouping.test.ts`
- [X] T030 [P] [US2] Add failing tests asserting `GroupableColumn` renders a column whose saved criteria is `'user'` as ungrouped (without calling `setGroupingCriteria`) while the board is anonymous, and automatically shows it grouped by user again once it isn't, in `src/test/features/boards/clustering/GroupableColumn.test.tsx`
- [X] T031 [P] [US2] Add a failing test asserting `RetrospectiveTopbar` shows the anonymity indicator (via a text label, not color/icon alone) only when `board.isAnonymous` is true, in `src/test/pages/RetrospectiveTopbar.test.tsx`
- [X] T032 [P] [US2] Add failing tests asserting `txtExportService`, `docxExportService`, and `pdfExportService` each omit the per-card author line/field when `retrospective.isAnonymous` is true (and include it otherwise), in `src/test/features/boards/export/txtExportService.test.ts`, `src/test/features/boards/export/docxExportService.test.ts`, and `src/test/features/boards/export/pdfExportService.test.ts`
- [X] T033 [P] [US2] Add a failing test asserting `unifiedExportService` passes `isAnonymous` through to each format-specific export call, in `src/test/features/boards/export/unifiedExportService.test.ts`

### Implementation for User Story 2

- [X] T034 [US2] Gate the author label in `src/features/boards/retrospective/components/CardHeader.tsx` (via its caller in `src/features/boards/retrospective/components/DraggableCard.tsx`) on `useBoardData().retrospective?.isAnonymous` (depends on: T028)
- [X] T035 [US2] Add an `excludeUserGrouping` (or equivalent) parameter to `getGroupingOptions()` in `src/features/boards/types/columnGrouping.ts` (depends on: T029)
- [X] T036 [US2] Derive a display-time-only `effectiveCriteria` (never written back through `setGroupingCriteria`) in `src/features/boards/clustering/components/GroupableColumn.tsx`, feeding `ColumnHeaderMenu`'s `currentGrouping`, `processCards()`, `GroupedCardList`'s `groupBy`, and the `getGroupingOptions()` call from T035 (depends on: T030, T035)
- [X] T037 [US2] Add the persistent anonymity indicator to `src/features/boards/retrospective/components/RetrospectiveTopbar.tsx` (depends on: T031)
- [X] T038 [P] [US2] Add the `isAnonymous` conditional (omit the author line) to `src/features/boards/export/services/txtExportService.ts` (depends on: T032)
- [X] T039 [P] [US2] Add the `isAnonymous` conditional to `src/features/boards/export/services/docxExportService.ts` (depends on: T032)
- [X] T040 [P] [US2] Add the `isAnonymous` conditional to `src/features/boards/export/services/pdfExportService.ts` (depends on: T032)
- [X] T041 [US2] Thread `isAnonymous` through `src/features/boards/export/services/unifiedExportService.ts` into each format-specific call (depends on: T033, T038, T039, T040)
- [X] T042 [P] [US2] Add `en`/`es` i18n keys for the persistent anonymity indicator's text in `src/locales/en.json` and `src/locales/es.json`

**Checkpoint**: User Stories 1 AND 2 both work independently — verified via [quickstart.md](./quickstart.md) §3 and §5.

---

## Phase 5: User Story 3 - Facilitator Toggles Anonymity Mid-Retrospective (Priority: P2)

**Goal**: The facilitator can flip a board's anonymity at any time from the facilitator menu; the change reaches every connected participant live, with no reload; non-facilitators can neither see nor use the control.

**Independent Test**: Two sessions (facilitator + participant) on a live board; the facilitator toggles from the menu; the participant's view updates within ~2s with no reload; a direct call from the non-facilitator's session is rejected with `403` ([quickstart.md](./quickstart.md) §4).

### Tests for User Story 3

- [X] T043 [P] [US3] Add failing tests asserting `setAnonymous()` throws `ForbiddenError` for a non-facilitator `uid` and persists + returns the new value for the facilitator, in `server/test/adapters/firebase/FirestoreRetrospectiveBoardAdapter.test.ts`
- [X] T044 [P] [US3] Add a new test file asserting the `setAnonymity` use-case delegates to `retrospectiveBoardPort.setAnonymous` with the given params, in `server/test/application/use-cases/retrospective/Anonymity.test.ts` (new file)
- [X] T045 [P] [US3] Add failing tests asserting `PUT /api/retrospectives/:id/anonymity` requires a session (`401`), requires the facilitator (`403` otherwise), validates the request body is a boolean (`400` otherwise), and returns `200` with the new value on success, in `server/test/http/routes/retrospectives.test.ts`
- [X] T046 [P] [US3] Add a failing test asserting `backendRetrospectiveClient.setAnonymity()` sends a `PUT` to the expected path with the expected body, in `src/test/features/boards/retrospective/backendRetrospectiveClient.test.ts`
- [X] T047 [P] [US3] Add failing tests asserting `ControlsTab` renders the anonymity toggle only when `isFacilitator` is true, reflects the board's current `isAnonymous` value, and calls `setAnonymity` on change, in `src/test/features/boards/facilitator/ControlsTab.test.tsx`

### Implementation for User Story 3

- [X] T048 [US3] Add `setAnonymous(retrospectiveId: string, uid: string, isAnonymous: boolean): Promise<RetrospectiveDTO>` to `RetrospectiveBoardPort` in `server/src/application/ports/retrospective.ts` (depends on: T043)
- [X] T049 [US3] Implement `setAnonymous()` in `server/src/adapters/firebase/FirestoreRetrospectiveBoardAdapter.ts`, reusing the existing private `requireFacilitator()` helper (mirrors `configureTimer()`) (depends on: T043, T048)
- [X] T050 [US3] Create `server/src/application/use-cases/retrospective/Anonymity.ts` with a thin `setAnonymity` delegate (mirrors `Timer.ts`'s `configureTimer`) (depends on: T044, T048)
- [X] T051 [US3] Add `PUT /api/retrospectives/:id/anonymity` to `server/src/http/routes/retrospectives.ts` — `requireSession` + route-level `requireFacilitator` + body validation, calling the T050 use-case, returning `{ id, isAnonymous }` (depends on: T045, T050)
- [X] T052 [US3] Add `setAnonymity(retrospectiveId: string, isAnonymous: boolean): Promise<void>` to `src/features/boards/retrospective/services/backendRetrospectiveClient.ts` (depends on: T046)
- [X] T053 [US3] Add the facilitator-only anonymity toggle to `src/features/boards/facilitator/components/ControlsTab.tsx`, gated on `useBoardData().isFacilitator`, calling `setAnonymity` from T052 and surfacing a visible error (with the toggle left unchanged) on failure (depends on: T047, T052)
- [X] T054 [US3] Thread the board's `isAnonymous` value and the toggle handler from `useBoardData()` into `ControlsTab` via `src/features/boards/countdown/components/FacilitatorMenu.tsx` (depends on: T053)
- [X] T055 [P] [US3] Add `en`/`es` i18n keys for the facilitator-menu toggle's label, description, and error message in `src/locales/en.json` and `src/locales/es.json`
- [x] T056 [US3] Add a two-browser-context Playwright scenario (facilitator toggles; participant's view updates live with no reload; a non-facilitator's direct call gets `403`) to `e2e/retrospective-board.spec.ts` (depends on: T051, T054)

**Checkpoint**: All three user stories are independently functional — verified via [quickstart.md](./quickstart.md) §4.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full-suite validation and the remaining quickstart scenarios that span more than one story.

- [x] T057 [P] Add the anonymous-board-creation Playwright scenario to `e2e/board-creation.spec.ts` ([quickstart.md](./quickstart.md) §2)
- [x] T058 [P] Add the legacy-board-default coverage (a Firestore document with no `isAnonymous` field reads as non-anonymous, no migration) to `server/test/adapters/firebase/FirestoreRetrospectiveBoardAdapter.test.ts` ([quickstart.md](./quickstart.md) §6 — extends T002's suite) — landed instead as an E2E test in `e2e/retrospective-board.spec.ts` (option (b)): T002's unit test already covers `toRetrospective()`'s fallback in isolation, and the route-level fakes (`retrospectiveFakes.ts`) already hardcode the same `?? false` default, so a genuinely new layer needed a real Firestore-emulator document with the field truly absent (via `FieldValue.delete()`), read through the real adapter/route/UI end-to-end
- [X] T059 Run the full [quickstart.md](./quickstart.md) validation (§1–§8) end-to-end against the emulator
- [X] T060 Run `npm run test:server && npm run test:run && npm run type-check:server && npm run type-check && npm run lint && npm run e2e` from `retro-rocket/` and confirm the 80% branches/functions/lines/statements coverage floor holds (constitution Principles I, VI, VII)
- [X] T061 WCAG 2.1 AA spot-check: keyboard operability and visible focus for both new toggles (creation-flow, facilitator-menu), and 4.5:1 text contrast for the persistent indicator in both light and dark themes (constitution Principle VIII, [quickstart.md](./quickstart.md) §8)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational only. Independently testable (MVP).
- **User Story 2 (Phase 4)**: Depends on Foundational only — does **not** depend on Phase 3 (it needs *a* board with `isAnonymous` set, which Foundational's read path plus any pre-existing/legacy board already provides; US1 makes creating one convenient but is not a hard prerequisite).
- **User Story 3 (Phase 5)**: Depends on Foundational only, for the same reason — needs a board whose `isAnonymous` it can read and toggle, not specifically one created via US1's new toggle.
- **Polish (Phase 6)**: Depends on all three user stories being complete (T057/T059/T060/T061 exercise all of them together; T058 depends only on Foundational's T002).

### Within Each Phase

- Tests MUST be written and confirmed failing before their paired implementation task (constitution Principle I).
- Port/type changes before adapter implementation before use-case before route (backend); type/client changes before hook/component wiring (frontend).
- A phase's Checkpoint marks the point at which that story is demoable end-to-end.

### Parallel Opportunities

- All Setup tasks marked `[P]` (none here beyond T001) can run in parallel.
- Within Foundational: T002+T003 in parallel, then T005+T007 (after T004/T006 resp.) — see per-task `depends on` notes; the backend read-path chain (T002→T008) and frontend read-path chain (T009→T015) can proceed in parallel with each other once T004 lands (frontend's `parseRetrospectiveFields` only needs the wire shape, not the live backend).
- Once Foundational is complete, **US1, US2, and US3 can be staffed and built in parallel** by different developers — none of the three phases' implementation tasks touch a file another phase also touches (confirmed against plan.md's Project Structure), so there is no cross-story file conflict.
- Within each story, all `[P]`-marked test tasks can run together; export-service tasks T038/T039/T040 (three different files) can run together once T037's pattern is established.

---

## Parallel Example: Foundational Phase

```bash
# Backend and frontend read-path work can proceed together once the DTO/type shapes are agreed:
Task: "Add failing tests for toRetrospective() isAnonymous default in server/test/adapters/firebase/FirestoreRetrospectiveBoardAdapter.test.ts"
Task: "Add isAnonymous: boolean to RetrospectiveDTO in server/src/application/ports/retrospective.ts"
Task: "Add failing test for RetrospectiveState/RetrospectiveStateDTO round-trip in src/test/features/boards/retrospective/backendRetrospectiveClient.test.ts"
Task: "Add isAnonymous: boolean to Retrospective type in src/features/boards/types/retrospective.ts"
```

## Parallel Example: User Story 2

```bash
# Once T034-T037 land, the three export services are independent files:
Task: "Add isAnonymous conditional to src/features/boards/export/services/txtExportService.ts"
Task: "Add isAnonymous conditional to src/features/boards/export/services/docxExportService.ts"
Task: "Add isAnonymous conditional to src/features/boards/export/services/pdfExportService.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run [quickstart.md](./quickstart.md) §2 independently
5. Deploy/demo if ready — boards can be created anonymous, though nothing yet *does* anything with that flag visibly (US2 delivers the visible payoff)

### Incremental Delivery

1. Setup + Foundational → `isAnonymous` readable everywhere, no user-visible change yet
2. Add User Story 1 → creation toggle works → demo (MVP scaffolding)
3. Add User Story 2 → anonymization actually visible (cards, grouping, indicator, exports) → demo (the feature's core value)
4. Add User Story 3 → facilitator can flip it live mid-retro → demo (full feature)
5. Polish → full-suite + quickstart + accessibility sign-off

### Parallel Team Strategy

With multiple developers, once Foundational is done:

- Developer A: User Story 1 (creation flow, backend + frontend)
- Developer B: User Story 2 (view-layer hiding, indicator, exports)
- Developer C: User Story 3 (facilitator mutation endpoint + menu toggle)

Each story's task list touches a disjoint file set (per plan.md's Project Structure), so all three can proceed genuinely in parallel and integrate without conflict.

---

## Notes

- `[P]` tasks = different files, no dependency on an incomplete task.
- `[Story]` label maps each task to its user story for traceability back to spec.md.
- Every implementation task has a corresponding test task that must be written and failing first (constitution Principle I, NON-NEGOTIABLE).
- Commit after each task or logical group.
- Stop at any Checkpoint to validate a story independently before continuing.
- No task in this list touches a file another story's task also touches — cross-story file conflicts were checked against plan.md's Project Structure during generation.
