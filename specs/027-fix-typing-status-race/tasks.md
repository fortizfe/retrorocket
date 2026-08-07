---

description: "Task list template for feature implementation"
---

# Tasks: Fix Typing Indicator Ghost State on Column Switch

**Input**: Design documents from `/specs/027-fix-typing-status-race/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Per the project constitution (TDD, NON-NEGOTIABLE), the unit tests covering the new write-ordering behavior MUST be written before their corresponding implementation task. This feature's single shared implementation (the per-key write queue in `OptimizedTypingStatusService`) resolves all three user stories at once — see `research.md §2` — so it lives in the Foundational phase, and each user story phase consists of the acceptance-level verification specific to that story.

**Organization**: Tasks are grouped by user story to enable independent verification of each story's acceptance scenarios against the one shared fix.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files/commands, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

All paths are relative to the repository root; the app lives under `retro-rocket/` (single Vite/React client + Express/Firebase-admin backend repo — see `plan.md`'s Structure Decision). Commands below assume `cd retro-rocket` first, as noted per task.

---

## Phase 1: Setup

**Purpose**: Establish the TDD red baseline before any code change

- [X] T001 From `retro-rocket/`, run `npm run e2e -- -g "typing indicator appears live for a second participant"` and confirm it fails with the reported Playwright strict-mode violation (two `está escribiendo` elements) at `retro-rocket/e2e/retrospective-board.spec.ts:596` — no file changes, this establishes the starting red state this feature must turn green

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The one shared write-ordering fix that all three user stories depend on for their acceptance criteria to pass

**⚠️ CRITICAL**: No user story verification can meaningfully begin until this phase is complete

- [X] T002 Write failing unit tests in `retro-rocket/src/test/features/boards/retrospective/OptimizedTypingStatusService.test.ts` covering: (a) writes for the same `{retrospectiveId}_{column}` key reach the mocked `setTypingStatus` in issuance order even when their underlying promises are resolved out of order by the test, (b) a rejected write for a key does not block the next queued write for that same key (per spec.md FR-007), (c) writes for different keys remain independent/unqueued relative to each other
- [X] T003 Implement a per-key (`{retrospectiveId}_{column}`) FIFO write queue in `retro-rocket/src/features/boards/retrospective/services/OptimizedTypingStatusService.ts`: `setTypingStatusDebounced` fires immediately when no write for that key is pending (preserving today's synchronous-call behavior for existing tests), and chains onto the prior write's settlement otherwise, so server-observed order always matches client-issued order — makes T002 pass (depends on T002)
- [X] T004 From `retro-rocket/`, run `npm run test:coverage` and confirm the 80% branch/function/line/statement coverage floor (per `vitest.config.ts`, Constitution VI) still holds after the change (depends on T003)

**Checkpoint**: The fix is implemented and unit-verified — each user story phase below independently confirms one facet of it at the acceptance level

---

## Phase 3: User Story 1 - Typing indicator follows the participant, not a stale column (Priority: P1) 🎯 MVP

**Goal**: Close out the originally reported CI failure — a participant switching from one column to another never shows as "typing" in both at once

**Independent Test**: Run the existing E2E regression test in isolation; it must pass consistently, not intermittently

- [X] T005 [US1] From `retro-rocket/`, run `npm run e2e -- -g "typing indicator appears live for a second participant"` (covering `e2e/retrospective-board.spec.ts:596`) 20 times back-to-back and confirm it passes every time, per SC-001; also run `npm run e2e -- -g "does not flicker for the other participant under a brief simulated network delay"` (covering `e2e/retrospective-board.spec.ts:741`) and confirm it still passes, closing the FR-005/SC-004 no-flicker-regression gap; additionally extend the existing test at `e2e/retrospective-board.spec.ts:596` with a rapid, repeated column-switch loop for the same participant, asserting at every sampled moment at most one column shows them as typing (spec.md US1 Acceptance Scenario 2) (depends on T003)

**Checkpoint**: User Story 1 (the MVP / originally reported defect) is verified fixed

---

## Phase 4: User Story 2 - Stopped typing stays stopped (Priority: P2)

**Goal**: Confirm the ordering fix does not regress the existing "stop clears promptly" and "disconnect clears" guarantees

**Independent Test**: Run the two existing E2E tests covering explicit-stop and disconnect cleanup in isolation; both must still pass unchanged

- [X] T006 [US2] From `retro-rocket/`, run `npm run e2e -- -g "typing indicator clears"` (covering `e2e/retrospective-board.spec.ts:672` and `:706`) and confirm both tests still pass unchanged (depends on T003)

**Checkpoint**: User Stories 1 AND 2 are both verified independently

---

## Phase 5: User Story 3 - Multiple participants typing in different columns stay independent (Priority: P3)

**Goal**: Confirm the fix introduces no cross-participant interference, including the specific different-columns-at-once scenario not covered by existing tests

**Independent Test**: Run the existing same-column multi-participant test plus a new different-columns multi-participant test in isolation; both must pass

- [X] T007 [US3] From `retro-rocket/`, run `npm run e2e -- -g "multiple participants typing in the same column"` (covering `e2e/retrospective-board.spec.ts:784`) and confirm it still passes unchanged (depends on T003)
- [X] T008 [US3] Add a new E2E test to `retro-rocket/e2e/retrospective-board.spec.ts` covering two participants typing in two different columns at the same time, where one switches to a third column mid-session, asserting the other participant's indicator is unaffected throughout; the test also measures wall-clock time from the switch to the indicator settling into its correct final column and asserts it is under 1 second — new coverage for User Story 3's acceptance scenario and SC-002's explicit timing bound (depends on T003)

**Checkpoint**: All three user stories are independently verified against the one shared fix

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full CI-gate parity before opening the PR

- [X] T009 [P] From `retro-rocket/`, run `npm run type-check` and confirm no new TypeScript errors
- [X] T010 [P] From `retro-rocket/`, run `npm run lint` and confirm no new ESLint errors
- [X] T011 From `retro-rocket/`, run the full quickstart.md validation sequence (`npm run type-check && npm run lint && npm run test:coverage && npm run e2e`) and confirm every gate passes, matching the constitution's merge-blocking CI checks (depends on T004, T005, T006, T007, T008, T009, T010)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001) establishing the red baseline — BLOCKS all user story verification
- **User Stories (Phase 3-5)**: All depend on Foundational (T003) being complete
  - Can proceed in parallel once T003 lands, or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user story phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after T003 — no dependency on other stories
- **User Story 2 (P2)**: Can start after T003 — independent of US1's verification, no shared files
- **User Story 3 (P3)**: Can start after T003 — independent of US1/US2's verification; T008 adds a new test file section but does not modify existing tests

### Within Phase 2 (Foundational)

- T002 (failing tests) before T003 (implementation) before T004 (coverage check) — strict TDD order

### Parallel Opportunities

- T005, T006, and T007 (running existing, unmodified E2E tests) can run in parallel once T003 is done — different `-g` filters, no shared state beyond the emulator
- T009 and T010 (type-check, lint) can run in parallel — independent tool invocations, no shared files

---

## Parallel Example: Post-Foundational Verification

```bash
# Once T003 (the queue implementation) is merged, launch story verification together:
Task: "Run npm run e2e -- -g \"typing indicator appears live for a second participant\" (US1)"
Task: "Run npm run e2e -- -g \"typing indicator clears\" (US2)"
Task: "Run npm run e2e -- -g \"multiple participants typing in the same column\" (US3, existing coverage)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (confirm red baseline)
2. Complete Phase 2: Foundational (write ordering fix — this is the entire code change)
3. Complete Phase 3: User Story 1 verification
4. **STOP and VALIDATE**: the originally reported CI failure is closed
5. Open a PR / merge if ready — Phases 4 and 5 add regression-safety confidence but are not required to resolve the reported defect

### Incremental Delivery

1. Complete Setup + Foundational → the fix exists and is unit-verified
2. Verify User Story 1 → confirms the MVP (reported defect resolved)
3. Verify User Story 2 → confirms no regression to stop/disconnect behavior
4. Verify User Story 3 → confirms no cross-participant interference, adds new coverage for a previously-untested interaction shape
5. Polish → full CI-gate parity before merge

---

## Notes

- [P] tasks = different files/commands, no dependencies
- [Story] label maps task to specific user story for traceability
- This feature's implementation is a single, small, shared code change (per research.md §2) — the user-story split here is about verification/acceptance coverage, not independent code paths
- Verify T002's tests fail before starting T003
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
