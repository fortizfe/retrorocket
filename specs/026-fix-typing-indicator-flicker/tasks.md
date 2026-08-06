---

description: "Task list template for feature implementation"
---

# Tasks: Fix Typing Indicator Flicker

**Input**: Design documents from `/specs/026-fix-typing-indicator-flicker/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/typing-status-timing-delta.md, quickstart.md (all present)

**Tests**: Per the project constitution (Principle I, TDD — NON-NEGOTIABLE), tests are included and MUST be written and confirmed failing before their corresponding implementation task. This holds strictly for T002–T005 (Foundational), T007/T008/T010 (US1's out-of-order/delay/column-switch resilience coverage, added by `/speckit-analyze` findings E1/E3), and T017 (US4) — all of these genuinely fail (or are not yet known to pass) against the pre-fix code. T006 and T009 (US1's core flicker regression tests), T012/T013/T016 (US2's idle/explicit-stop path), and T020 (US3) are a documented exception, mirroring the pattern established in `specs/023-fix-mcp-connection-management/tasks.md`, `specs/024-fix-mcp-connection-status/tasks.md`, and `specs/025-fix-mcp-connection-rejection/tasks.md`: because the Foundational phase (T002–T005) already implements the timing fix these rely on, T006 is a genuine red-phase test (fails against the current flicker bug) while T009/T012/T013/T020 are scenario-level proofs expected to already pass once Foundational lands, verified rather than re-implemented per story. T014 (US2's disconnect path) is also a genuine red-phase test against the current, un-retuned server constants.

**Organization**: Tasks are grouped by user story (from spec.md: US1 = P1 "stable indicator while typing", US2 = P2 "indicator disappears promptly", US3 = P3 "multiple simultaneous typists", US4 = P2 "perceivable via assistive technology") to enable independent implementation and testing of each story. US1/US2/US3 all depend on the same Foundational timing fix (research.md §1–§3); US4 is an additive, independently-implemented accessibility surface (research.md §4) that also depends on Foundational being correct for its "no duplicate announcement while typing continues" acceptance criterion to hold meaningfully. All file paths are relative to `retro-rocket/` (the repo's single npm package) unless otherwise noted.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4) — omitted for Setup/Foundational/Polish

## Path Conventions

Single-package monorepo: frontend at `src/` (feature modules under `src/features/boards/retrospective/`, shared UI under `src/lib/components/ui/`) with tests at `src/test/`; backend at `server/src/adapters/firebase/` with tests at `server/test/`; E2E specs at `e2e/`. Paths below are exact, confirmed against the existing codebase.

---

## Phase 1: Setup

**Purpose**: Confirm the environment is ready. No new dependencies or scaffolding are required for this fix (per plan.md's Technical Context — no new library, no new collection, no new endpoint).

- [X] T001 Confirm branch `026-fix-typing-indicator-flicker` is checked out, `npm install` is up to date (inside `retro-rocket/`), and the existing baseline passes: `npm run test:run` and `npm run test:server` both green before making any change — no code changes in this task.

**Checkpoint**: Environment confirmed; no new setup needed before foundational/user-story work begins.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: User Stories 1, 2, and 3 all depend on the same root-cause fix — removing the conflicting, uncoordinated timers between `OptimizedTypingStatusService` and `useTypingStatus` (research.md §1–§2) — so that fix is built and unit-tested once here, exactly as `025-fix-mcp-connection-rejection`'s Phase 2 held its shared rate-limit-key fix.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests (write first; confirm FAIL before implementation)

- [X] T002 [P] In `src/test/features/boards/retrospective/OptimizedTypingStatusService.test.ts`: remove the two tests that encode the flawed design — `'auto-deactivates after the 300ms debounce window if no further keystroke resets it'` (lines 26–32) and `'a repeated isActive:true call before the debounce fires resets the timer without a duplicate write'` (lines 34–46), since research.md §1/§2 identify the 300ms auto-deactivation timer itself as the root cause of the reported flicker. Replace them with a single new test, `'never auto-deactivates on its own — isActive:false is only ever written when explicitly called'`: call `setTypingStatusDebounced` once with `isActive:true`, advance fake timers by 10000ms with no further calls, and assert `mockSetTypingStatus` was called exactly once in total (only the initial `true` — never a `false`). Also remove the `OptimizedTypingStatusService.cleanup()` calls from `beforeEach`/`afterEach` (T003 removes the internal timer/map state those calls exist to reset). Confirm the new test fails against the current implementation.
- [X] T003 In `src/features/boards/retrospective/services/OptimizedTypingStatusService.ts`: remove `DEBOUNCE_DELAY`, `TYPING_TIMEOUT`, the `debounceTimers`/`activeStatuses` maps, the now-dead `getStats()` method (zero callers outside its own tests), and the now-dead `cleanup()` method. `setTypingStatusDebounced` becomes an unconditional, immediate pass-through: both `isActive:true` and `isActive:false` call `setTypingStatusImmediate` directly, synchronously, every time — no scheduling, no internal state. `cleanupUserTypingStatus` is unchanged (it already calls `setTypingStatusImmediate` directly and does not depend on the removed state). Update the class's doc comment (currently "Implementa debouncing y limpieza inteligente...") to describe the corrected, single-responsibility behavior (research.md §2: this service only forwards writes; `useTypingStatus` owns the "has the user stopped typing" decision). Depends on T002. Makes T002's new test pass, and keeps the existing `'writes immediately ... on the first isActive:true call'`, `'isActive:false writes the deactivation immediately'`, and `'cleanupUserTypingStatus deactivates every known column'` tests passing unmodified.
- [X] T004 [P] In `src/test/features/boards/retrospective/useTypingStatus.test.ts`: update the `'should auto-stop typing after timeout'` test (lines 121–151) — change `vi.advanceTimersByTime(4000)` to `3000`, matching the Clarification session's 3-second grace period (spec.md FR-003). Add a boundary assertion immediately before it: after advancing only 2999ms, assert `setTypingStatusDebounced` has **not** been called with `isActive:false` — proves the timeout is exactly 3000ms, not merely "eventually." Confirm both assertions fail against the current 4000ms implementation.
- [X] T005 In `src/features/boards/retrospective/hooks/useTypingStatus.ts`: replace the hardcoded `4000` in `startTyping`'s inactivity `setTimeout` (line 87) with a new named constant `INACTIVITY_TIMEOUT_MS = 3000`, declared alongside the existing `UPDATE_THROTTLE` constant for consistency. Update the hook's doc comment (lines 23–27, "Writes go through OptimizedTypingStatusService (preserving its exact 300ms debounce)...") to remove the now-inaccurate reference to the removed 300ms debounce and describe the corrected design (this hook is the sole owner of the 3-second inactivity decision; the service is a thin write-forwarder). Depends on T004. Makes T004 pass.

**Checkpoint**: The root-cause timing fix is complete and unit-proven — `OptimizedTypingStatusService` no longer independently decides when typing has stopped, and `useTypingStatus`'s own inactivity timeout matches the clarified 3-second grace period. User Stories 1, 2, and 3 can now build their end-to-end scenario tests on top of it.

---

## Phase 3: User Story 1 - Stable indicator while a teammate is actively typing (Priority: P1) 🎯 MVP

**Goal**: While a participant keeps typing in a column, other participants see that participant's "is typing" indicator appear once and stay continuously visible for as long as typing continues, with no disappear/reappear flicker — the exact defect reported. This also covers the story's resilience acceptance criterion (transient network delay) and two related spec.md edge cases (out-of-order updates, switching columns mid-grace-period).

**Independent Test**: Have one participant type continuously in a column for several seconds while a second participant observes that column; the indicator must appear once and never flicker off/on during that window, including under a brief simulated network delay.

### Tests for User Story 1 (write first; confirm FAIL, then re-run as verification where noted)

- [X] T006 [P] [US1] Extend `e2e/retrospective-board.spec.ts`'s existing test `'a typing indicator appears live for a second participant and clears after typing stops'` (line 581): after A's textarea is filled and B's indicator becomes visible, keep A "typing" for 5+ seconds (e.g. repeated small `.type()`/`.press()` calls spaced ~1s apart, staying under the 3-second inactivity window each time) and, on B's page, poll `pageB.getByText(/está escribiendo/)` for continuous visibility every ~500ms across that whole window — asserting it is visible at every sample point, never momentarily absent. Repeat the same continuous-visibility check for a second column (e.g. `hindered`, not just the default first column) to confirm FR-008's cross-column consistency. This is the direct end-to-end regression test for the reported bug (spec.md User Story 1 Acceptance Scenarios 1–2, FR-008) and is expected to **fail against the current, unfixed code** (it flickers).
- [X] T007 [P] [US1] Add a test alongside `useRetrospectiveRealtimeSync`'s existing reducer tests (`src/test/features/boards/retrospective/`, wherever `applyTypingStatusChange` is unit-tested — create a focused test if none exists yet): feed it a `created` event for user A followed by a `deleted`-then-`created` pair for the same doc id delivered in reversed order, and assert the resulting `typingStatuses` state converges to the participant's actual latest activity rather than getting stuck on stale data — the unit-level proof for FR-007/Edge Case 4 (out-of-order tolerance). Confirm this fails, or explicitly document why the existing `upsertById` last-write-wins semantics already handle it, before closing this task.
- [X] T008 [P] [US1] Extend `e2e/retrospective-board.spec.ts`'s typing-indicator test: introduce a simulated ~2 second delay on WS message delivery (Playwright CDP network throttling, or an artificial gap timed around the typing burst) while A types continuously; assert B's indicator does not flicker off/on because of that delay (spec.md User Story 1 Acceptance Scenario 3, SC-003, Edge Case 3 — "brief" defined as up to ~2 seconds per spec.md's Assumptions).
- [X] T009 [US1] Add a hook-level regression test to `src/test/features/boards/retrospective/useTypingStatus.test.ts`: call `startTyping('good')` repeatedly with `vi.advanceTimersByTime(500)` between calls for a simulated 6+ second span (staying under the 3000ms inactivity window on every call), and assert `setTypingStatusDebounced` is never called with `isActive:false` at any point during that span — the hook-level proof that continuous keystroke activity never triggers a spurious stop (spec.md FR-002/SC-001).
- [X] T010 [P] [US1] Add a hook-level test to `useTypingStatus.test.ts`: call `startTyping('helped')`, then before 3000ms elapses call `startTyping('hindered')`; assert `setTypingStatusDebounced` is called promptly with `{ column: 'hindered', isActive: true }`, and that `'helped'`'s own inactivity timer still independently fires `{ column: 'helped', isActive: false }` at its own 3000ms mark with no stale duplicate — proving per-column state is fully independent when a participant switches columns mid-grace-period (spec.md Edge Case 1).

### Implementation for User Story 1

- [X] T011 [US1] Verification checkpoint: run T006 and T009 against the Foundational implementation (T002–T005) — both are expected to now pass with no further changes; if either fails, fix the root cause in `OptimizedTypingStatusService.ts`/`useTypingStatus.ts` first. Then run T007, T008, and T010: if any of these fail, it indicates the out-of-order/network-delay/column-switch edge cases need additional handling beyond the Foundational timing fix alone (e.g., timestamp-aware reconciliation in `applyTypingStatusChange`, or explicit verification of the existing per-column `Map`/`Set` keying in `useTypingStatus`) — implement the minimal fix directly in this task and re-run until all five tests pass. User Story 1, including its resilience and edge-case coverage, is complete once they do.

**Checkpoint**: User Story 1 is fully functional and independently testable/shippable — the core reported defect ("se muestra y al instante siguiente se oculta") is fixed and proven at both the hook and browser-E2E levels, including under network delay, out-of-order delivery, and mid-grace-period column switches.

---

## Phase 4: User Story 2 - Indicator disappears promptly and predictably once typing ends (Priority: P2)

**Goal**: Once a participant stops typing — whether by going idle, submitting/cancelling, or disconnecting — their typing indicator disappears for other viewers within a short, bounded, predictable window and does not reappear on its own.

**Independent Test**: Have a participant type, then stop (idle, explicit action, or disconnect) and confirm the indicator clears within the expected bound in each case.

### Tests for User Story 2 (write first; confirm FAIL before Foundational for T012/T013, and against current constants for T014)

- [X] T012 [P] [US2] Extend `e2e/retrospective-board.spec.ts`'s typing-indicator test (already touched by T006): after A stops typing (idle, no explicit action), assert B's indicator disappears within ~4 seconds (3s grace period + render/network slack) and, once gone, stays gone for a further few seconds without reappearing (spec.md User Story 2 Acceptance Scenario 1).
- [X] T013 [P] [US2] Add a new e2e assertion (same file) for the explicit-stop path: have A submit the card (or cancel creation) while B's indicator is visible, and assert it disappears for B promptly — well under the 3-second grace period, since the explicit stop writes `isActive:false` immediately rather than waiting for the inactivity timeout (spec.md User Story 2 Acceptance Scenario 2).
- [X] T014 [US2] Add a new e2e test (same file): A starts typing, then **A's own browser context** is closed entirely (simulating disconnect/tab-close) while still marked as typing; assert **B's** indicator for A clears within a bound consistent with the retuned server sweep (~4s worst case) rather than the current ~6s worst case (spec.md User Story 2 Acceptance Scenario 3, FR-004). Confirm this is meaningfully slower (or flaky against a tight bound) against the current `TYPING_STATUS_TTL_MS=5000`/`TYPING_STATUS_SWEEP_INTERVAL_MS=1000` constants before T015.

### Implementation for User Story 2

- [X] T015 [US2] In `server/src/adapters/firebase/FirestoreRealtimeGatewayAdapter.ts`: change `TYPING_STATUS_TTL_MS` from `5000` to `3000` and `TYPING_STATUS_SWEEP_INTERVAL_MS` from `1000` to `500` (research.md §3). Update the adjacent doc comment (lines 15–17, which references "the client-side check `OptimizedTypingStatusService` used to perform per-browser") to drop that now-removed cross-reference. Also update the "5000ms hard TTL" cross-references in `server/src/application/ports/typing.ts`'s `TypingStatusPort` doc comment (lines 3–5, which also mentions "the client's 300ms debounce" — now removed by T003) and in `server/src/adapters/firebase/FirestoreTypingStatusAdapter.ts`'s class doc comment (lines 28–32) so both stay accurate at `3000ms` with no stale reference to the removed client-side debounce. Depends on T014. Makes T014 pass; does not affect T012/T013 (already satisfied by Foundational).
- [X] T016 [US2] Verification checkpoint, no new implementation expected: run T012 and T013 against the Foundational implementation (T002–T005); both should already pass, since the idle and explicit-stop paths are entirely client-side and unaffected by T015's server-only change.

**Checkpoint**: User Story 2 is fully functional — the indicator clears predictably whether the participant goes idle, takes an explicit stop action, or disconnects, each within its documented bound.

---

## Phase 5: User Story 4 - Typing status perceivable via assistive technology (Priority: P2)

**Goal**: A screen reader user is notified when a teammate starts or stops typing in a column, synchronized with the visual indicator, with no duplicate or stale announcements.

**Independent Test**: With a screen reader (or an accessibility inspector) active, confirm typing start/stop is announced in step with the visual indicator, with no repeated announcements while typing continues unchanged.

### Tests for User Story 4 (write first; confirm FAIL before implementation)

- [X] T017 [P] [US4] Create `src/test/lib/components/ui/TypingPreview.test.tsx` (new file) with tests: (a) an element with `role="status"`, `aria-live="polite"`, and `aria-atomic="true"` is present in the rendered output even when `typingUsers` is empty, with empty text content; (b) when `typingUsers` has 1, 2, or 3+ entries, that element's text content matches exactly what the visible card renders (`"{username} está escribiendo"`, `"{u1} y {u2} están escribiendo"`, `"{u1} y {N} más están escribiendo"`); (c) the element is not removed/re-mounted when `typingUsers` transitions from non-empty back to empty (only its text content changes). Confirm all three fail against the current `TypingPreview.tsx` (which returns `null` entirely when `typingUsers.length === 0` and has no live region at all).

### Implementation for User Story 4

- [X] T018 [US4] In `src/lib/components/ui/TypingPreview.tsx`: extract the `formatTypingText()` logic so it can also compute the empty-state string (`''` when `typingUsers.length === 0`), and add an always-rendered, visually-hidden element (use this codebase's existing `sr-only`-equivalent Tailwind utility, matching conventions elsewhere in `src/lib/components/ui/`) with `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, positioned outside the `typingUsers.length === 0 ? null : ...` early-return branch that gates the *visual* `AnimatePresence` card, so it is always present in the DOM (research.md §4). Depends on T017. Makes T017 pass.
- [X] T019 [US4] Extend `e2e/retrospective-board.spec.ts`'s typing-indicator test: assert the live region's accessible text appears/clears in step with the visual indicator across the start/continue/stop sequence from T006/T012; while A keeps typing with the same typist set (no state change), assert the live region's DOM text content does not mutate (no duplicate announcement, spec.md User Story 4 Acceptance Scenario 2); run the existing `@axe-core/playwright` integration against the board while A is typing and assert no new violations are introduced (Constitution VIII). Depends on T018.

**Checkpoint**: User Story 4 is fully functional — typing status is perceivable via assistive technology, synchronized with the visual indicator, with no duplicate or stale announcements.

---

## Phase 6: User Story 3 - Correct behavior with multiple simultaneous typists (Priority: P3)

**Goal**: When several participants type in the same column at overlapping times, each one's indicator is shown accurately and its show/hide lifecycle is fully independent of the others.

**Independent Test**: Two participants type in the same column at overlapping but offset times; a third observer sees both represented, and when one stops while the other continues, only the continuing one remains — with no flicker triggered by the other's state change.

### Tests for User Story 3 (write first; confirm FAIL before Foundational, then re-run as verification)

- [X] T020 [P] [US3] Add a new e2e test to `e2e/retrospective-board.spec.ts`: three participants (A, B, C) on the same board; A and B both start typing in the same column at offset times; assert C sees both represented as typing; have A stop (idle) while B keeps typing; assert C sees only B remain once A's grace period elapses, and that B's indicator never flickers during A's transition (poll continuously across the transition, reusing the polling technique from T006) (spec.md User Story 3 Acceptance Scenarios 1–2).

### Implementation for User Story 3

- [X] T021 [US3] Verification checkpoint, no new implementation expected: run T020 against the Foundational implementation (T002–T005) — each participant's typing status is already an independent Firestore doc keyed by `{retroId}_{userId}_{column}` (unchanged), so per-user isolation is a pre-existing property; this task confirms the flicker fix does not regress it.

**Checkpoint**: All four user stories are independently functional — the typing indicator is stable while typing, clears predictably when typing stops (by any means), is accessible to assistive technology, and behaves correctly with multiple concurrent typists.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify the feature end-to-end against the project's quality gates before calling it done.

- [X] T022 [P] Run `npm run test:coverage` (frontend) and `npm run test:server:coverage` (backend); confirm both stay at/above their `vitest.config.ts` thresholds (Constitution VI — no lowering the threshold) across every file touched by this feature (`OptimizedTypingStatusService.ts`, `useTypingStatus.ts`, `TypingPreview.tsx`, `FirestoreRealtimeGatewayAdapter.ts`).
- [X] T023 [P] Add a test spying on `global.setInterval`/`setTimeout` scoped to `useTypingStatus`'s and `OptimizedTypingStatusService`'s exercised code paths, asserting neither registers a recurring interval — only the pre-existing WS heartbeat in `backendRealtimeClient.ts` (untouched by this feature) uses `setInterval`, and this spy must not fire for the changed files. Direct automated guard for SC-004 (no new polling loop), complementing the manual check in T025/quickstart.md §6.
- [X] T024 [P] Run the full `npm run e2e` suite and confirm no regressions in unrelated tests — in particular, `'deleting a board cascade-deletes its groups, action items, facilitator notes, sentiment results, timer, and typing status'` (which also touches the `typingStatus` collection) must still pass unmodified.
- [X] T025 Walk through `quickstart.md` §1–§6 manually against the real dev stack + Firestore emulator, including the accessibility check in §5 (screen reader or accessibility inspector) and the wire-protocol regression check in §6.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS User Stories 1, 2, and 3 (T002 → T003 is a strict chain; T004 → T005 is a strict chain; the two chains are independent of each other and can proceed in parallel).
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on US2/US3/US4.
- **User Story 2 (Phase 4)**: Depends on Foundational. No dependency on US1/US3/US4 (T012/T013 read Foundational's client-side fix; T014/T015 are a self-contained server-side chain).
- **User Story 4 (Phase 5)**: Depends on Foundational (for its "no duplicate announcement while typing continues" criterion to be meaningful) but touches entirely different files (`TypingPreview.tsx`) than US1/US2/US3 — independently implementable in parallel with Phases 3–4 and 6 once Foundational is done.
- **User Story 3 (Phase 6)**: Depends on Foundational only — verification-only phase, can run in parallel with Phases 3–5.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependency on other stories.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — no dependency on other stories.
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) — no dependency on other stories; different files than US1/US2/US3.
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — no dependency on other stories.

### Within Each User Story

- Tests before implementation/verification in every phase.
- T006, T007, T008, T010, and T014 are genuine red-phase (or not-yet-known-to-pass) tests: T006 fails against the current flicker bug; T007/T008/T010 exercise out-of-order/network-delay/column-switch edge cases that may need small additive fixes beyond Foundational (see T011); T014 fails against the current 5000ms/1000ms server constants. Confirm each fails (or is verified/fixed, per T011) before its corresponding implementation (T002–T005 for T006/T009; T011 for T007/T008/T010; T015 for T014) lands, per Constitution I.
- T012/T013 (US2) and T020 (US3) are the documented exception (see **Tests** at the top of this file): expected to already pass once Foundational (T002–T005) is done, verified via T016/T021's checkpoints rather than a fresh red phase.
- T017 (US4) is a genuine red-phase test — the live region does not exist yet.
- Story complete before moving to Polish.

### Parallel Opportunities

- T002 and T004 (Foundational tests, different files) can be written in parallel.
- Once Foundational (Phase 2) is fully merged: Phase 3 (US1), Phase 4 (US2), Phase 5 (US4), and Phase 6 (US3) can all proceed in parallel (different files/concerns), if staffed.
- T006, T008, T012, T013, T014, T019, and T020 all extend/add tests in `e2e/retrospective-board.spec.ts` — if worked on by different people in parallel, coordinate to avoid merge conflicts in that one file; they are marked `[P]` (where applicable) for conceptual independence (no shared state/dependency), not guaranteed conflict-free co-editing.
- T022, T023, and T024 (Polish) can run in parallel.

---

## Parallel Example: Foundational tests

```bash
# Launch both Foundational test-writing tracks together (before their respective implementations):
Task: "Replace the flawed 300ms-auto-deactivate test with a no-auto-deactivation test in src/test/features/boards/retrospective/OptimizedTypingStatusService.test.ts"
Task: "Update the auto-stop-timeout test from 4000ms to 3000ms in src/test/features/boards/retrospective/useTypingStatus.test.ts"
```

## Parallel Example: User story phases after Foundational

```bash
# Once T002-T005 are merged, these can proceed independently:
Task: "US1 — extend e2e no-flicker assertion (+ cross-column check) in e2e/retrospective-board.spec.ts"
Task: "US1 — add out-of-order reducer test and simulated-network-delay/column-switch coverage"
Task: "US2 — extend e2e idle/explicit-stop/disconnect assertions in e2e/retrospective-board.spec.ts"
Task: "US4 — write TypingPreview live-region unit tests in src/test/lib/components/ui/TypingPreview.test.tsx"
Task: "US3 — write the three-participant concurrent-typists e2e test in e2e/retrospective-board.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — this is where the actual fix lives)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently (quickstart.md §2)
5. Deploy/demo if ready — this alone already fixes the reported "shows and hides an instant later" defect

### Incremental Delivery

1. Complete Setup + Foundational → the core timing fix is ready and proven at the unit level.
2. Add User Story 1 → test independently → deploy/demo (MVP! — fixes the core reported defect, plus resilience/edge-case coverage).
3. Add User Story 2 → test independently → deploy/demo (closes the "does it ever clear" half of the request).
4. Add User Story 4 → test independently → deploy/demo (closes the non-negotiable accessibility gap).
5. Add User Story 3 → test independently → deploy/demo (confirms multi-typist correctness).
6. Each story adds confidence without changing the underlying Foundational fix.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together.
2. Once Foundational is done:
   - Developer A: User Story 1 + User Story 2 (both extend the same E2E file — coordinate)
   - Developer B: User Story 4 (independent file, `TypingPreview.tsx`)
   - Developer C: User Story 3 (independent E2E test)
3. Stories complete and integrate independently; all converge on Polish.

---

## Notes

- [P] tasks = different files or independent assertions, no dependencies.
- [Story] label maps task to specific user story for traceability.
- User Stories 1, 2, and 3 share one implementation (Foundational); this is expected and documented, not a process violation — the split exists to keep each story's spec.md acceptance scenarios independently verifiable, not because the code itself splits. User Story 4 is genuinely separate implementation (the live region).
- Verify tests fail before implementing for T002, T004, T006, T007, T008, T010, T014, T017. T012/T013/T020 are the documented exception (see **Tests** at the top of this file) and are expected to already pass once Foundational (T002–T005) is done.
- Commit after each task or logical group.
- Stop at any checkpoint to validate story independently.
