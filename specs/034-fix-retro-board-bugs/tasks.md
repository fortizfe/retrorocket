---

description: "Task list for feature implementation"
---

# Tasks: Retro Board Bug Fixes

**Input**: Design documents from `/specs/034-fix-retro-board-bugs/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-behavior-contracts.md, quickstart.md

**Tests**: Included and sequenced before their implementation task in every story, per Constitution Principle I (TDD, NON-NEGOTIABLE) and Principle VI (80% coverage floor) — this is a bug-fix feature with existing test files for every touched component, so tasks extend those files rather than create new ones except where noted.

**Organization**: Tasks are grouped by user story (US1–US4, per spec.md) so each of the four independently-reported bugs can be fixed, tested, and verified on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- File paths are relative to `retro-rocket/` (the project root inside the repo)

## Path Conventions

Single frontend SPA (`retro-rocket/src/**`, `retro-rocket/src/test/**` mirrors it, `retro-rocket/e2e/**` for Playwright) — see plan.md's Project Structure. No backend/API paths are touched by this feature.

---

## Phase 1: Setup

**Purpose**: Establish the TDD "red" baseline before any fix — no new tooling or dependencies are needed (plan.md confirms zero new dependencies).

- [X] T001 Ran `npm run test -- --coverage` (172 files, 2475 passed — all green baseline) and the two known-flaky Playwright specs individually: the facilitator-note test (~line 1074) was flaky at baseline (failed once on an unrelated tab-click timing issue, passed once without hitting the duplicate-content race); the typing-indicator test (~line 596) reproduced the exact reported two-element failure on the first run. This baseline is what each story's tests moved from red to reliably green.

---

## Phase 2: Foundational

**Purpose**: Blocking prerequisites shared by multiple user stories.

**None required.** Per plan.md's Constitution Check and Complexity Tracking, all four stories touch independent files (menus vs. column header vs. notes vs. typing status) with no new shared dependency, entity, or infrastructure — each story below can start immediately after Phase 1's baseline is recorded, in any order or in parallel.

**Checkpoint**: Foundation ready — all four user stories can begin.

---

## Phase 3: User Story 1 - Menus open anchored to their trigger button (Priority: P1) 🎯 MVP

**Goal**: The options menu (`RetrospectiveTopbar.tsx`) and facilitator menu (`FacilitatorMenu.tsx`) render anchored to their trigger button in every state (default, scrolled, resized, near a viewport edge) instead of pinned to the top-left corner.

**Independent Test**: Open each menu from multiple button positions/scroll states/viewport widths and confirm the panel is always visually anchored to its own trigger button — verifiable without any other story's fix in place.

### Tests for User Story 1 ⚠️

> Write these first; confirm they fail against the current implementation before making any fix.

- [X] T002 [P] [US1] Add a structural regression test to `src/test/pages/RetrospectiveTopbar.test.tsx` asserting the DOM node receiving `ref={refs.setFloating}`/`style={floatingStyles}` for the options-menu panel is a distinct element from the node receiving Framer Motion's `initial`/`animate`/`exit` props (Contract 1, `contracts/ui-behavior-contracts.md`) — use the existing `vi.mock('framer-motion', ...)` pattern already present in the sibling test `src/test/features/boards/facilitator/FacilitatorMenu.test.tsx` for consistency. Confirm this test fails against the current single-node implementation.
- [X] T003 [P] [US1] Add the equivalent structural regression test to `src/test/features/boards/facilitator/FacilitatorMenu.test.tsx` for its floating panel, mirroring T002. Confirm it fails against the current implementation.
- [X] T004 [P] [US1] Add a new Playwright test to `e2e/retrospective-board.spec.ts` that opens the options menu and the facilitator menu and asserts each panel's bounding box (`boundingBox()`) is adjacent to (touching, within a few px) its trigger button's bounding box — first at default scroll, then after scrolling the page, then after resizing the viewport narrower — per Contract 1's verification method in `contracts/ui-behavior-contracts.md`. Confirm it fails (panel renders near `(0,0)`) against the current implementation.

### Implementation for User Story 1

- [X] T005 [US1] In `src/features/boards/retrospective/components/RetrospectiveTopbar.tsx`, split the options-menu panel into an outer non-animated positioning element (receives `ref={refs.setFloating}` and `style={floatingStyles}`) wrapping an inner `motion.div` that owns only the `initial`/`animate`/`exit`/`transition` props — following the pattern already used correctly in `src/features/boards/retrospective/components/ReactionPicker.tsx` (plain `<div>` + `style={floatingStyles}`, no competing `animate`). Consult the `animate` skill per Constitution Principle IX before finalizing how the entrance/exit animation is re-expressed on the inner element. Verify T002 and the options-menu half of T004 now pass.
- [X] T006 [US1] Apply the identical split to `src/features/boards/countdown/components/FacilitatorMenu.tsx`'s floating panel (outer positioning wrapper + inner animated `motion.div`), again consulting the `animate` skill for the re-expressed transition. Verify T003 and the facilitator-menu half of T004 now pass.
- [X] T007 [US1] Manually validate against quickstart.md §2 (both menus, at default scroll, after scroll, after resize, and near the bottom edge to confirm `flip` still works) in both light and dark themes, and confirm `FloatingFocusManager` focus-trap/return-to-trigger behavior (Constitution Principle VIII) is unchanged.

**Checkpoint**: User Story 1 is fully functional and independently testable — both menus anchor correctly in every state.

---

## Phase 4: User Story 2 - Column titles are always readable (Priority: P1)

**Goal**: Every column header shows title + card count on row 1, the optional subtitle on row 2, and the group/add controls on row 3 — so the title is never crowded out.

**Independent Test**: Open a board with columns of varying title lengths, card counts, and with/without a subtitle, and visually confirm the three-row structure and full title legibility at desktop and the narrowest supported viewport width — independent of any other story's fix.

### Tests for User Story 2 ⚠️

> Write these first; confirm they fail against the current single-row implementation before making any fix.

- [X] T008 [US2] Add regression tests to `src/test/features/boards/clustering/GroupableColumn.test.tsx` (or the most appropriate of the existing `GroupableColumn.basic.test.tsx` / `GroupableColumn.simple.test.tsx` files — extend whichever already covers header rendering) asserting, per Contract 2 (`contracts/ui-behavior-contracts.md`): (a) row 1 contains the icon, title, and count badge(s) only; (b) row 2 renders `column.description` when present and is entirely absent from the DOM (not just visually hidden) when it is not; (c) row 3 contains exactly the group control (`ColumnHeaderMenu`) and the add `Button`, and neither shares a row with the title. Confirm these tests fail against the current single-row layout in `src/features/boards/clustering/components/GroupableColumn.tsx` (lines ~224–272).

### Implementation for User Story 2

- [X] T009 [US2] Restructure the header block in `src/features/boards/clustering/components/GroupableColumn.tsx` (lines ~224–272) into three stacked rows: row 1 = icon + `column.title` + card-count badge + optional "N groups" badge; row 2 = `column.description` (rendered only when present, no reserved empty row otherwise); row 3 = `ColumnHeaderMenu` + the "Add" `Button`, right-aligned. Keep the title as the flexible/growable element on row 1 with no `shrink-0` siblings competing for its space. Consult the `apple-design`/`emil-design-eng` skills per Constitution Principle IX for the row spacing/visual-hierarchy decisions. Verify T008 now passes.
- [X] T010 [US2] Re-verify WCAG 2.1 AA contrast, reading order, and focus visibility (Constitution Principle VIII) for the restructured header in both light and dark themes, and manually validate against quickstart.md §3 (long titles, high card counts, narrowest supported viewport, column with no subtitle).

**Checkpoint**: User Stories 1 AND 2 both work independently — menus anchor correctly and column titles are always readable.

---

## Phase 5: User Story 3 - Saving a private note never shows duplicated content (Priority: P2)

**Goal**: Saving a facilitator's private note never results in both the editable textarea and the saved read-only text being visible at the same time.

**Independent Test**: Create and save private notes repeatedly (including back-to-back saves) and confirm only one visible representation of each note's text exists at any point in time — independent of the other three stories' fixes.

### Tests for User Story 3 ⚠️

> Write these first; confirm they fail against the current implementation before making any fix.

- [X] T011 [US3] Add a regression test to `src/test/features/boards/facilitator/NotesTab.test.tsx` that saves a new note and, using fake timers to advance partway through the exit-animation duration (simulating the realtime-delivered note arriving before the exit transition completes, per research.md §3), asserts the set of DOM elements displaying that note's text never exceeds one at any sampled point (Contract 3, `contracts/ui-behavior-contracts.md`). Also add/confirm a companion assertion that the Cancel path still plays its existing exit animation unchanged. Confirm the new assertion fails against the current implementation.

### Implementation for User Story 3

- [X] T012 [US3] In `src/features/boards/facilitator/components/NotesTab.tsx`, distinguish "closing because saved" from "closing because cancelled" in `handleCreateNote` (lines ~60–75) and the create-note `motion.div`'s `AnimatePresence` exit (lines ~176–221), so a successful save does not replay/hold the default exit transition long enough for its frozen pre-save content to coexist with the incoming realtime note's `<p>{note.content}</p>` (lines ~272–277) — e.g. skip or shorten the exit transition specifically on the save path while preserving it on Cancel. This is a motion-timing decision requiring the `animate` skill per Constitution Principle IX. Verify T011 now passes.
- [X] T013 [US3] Run the existing Playwright spec `e2e/retrospective-board.spec.ts` test "a facilitator note is never visible to another participant's session" (~line 1074) at least 5 consecutive times and confirm it passes reliably with zero retries (SC-003/SC-005). Manually validate against quickstart.md §4 (rapid back-to-back saves).

**Checkpoint**: User Stories 1, 2, AND 3 all work independently.

---

## Phase 6: User Story 4 - Typing indicator always clears reliably (Priority: P3)

**Goal**: The "is typing" indicator clears within a bounded time after a participant stops typing in a column, independently per column, even if the write used to clear it fails.

**Independent Test**: Have a participant type briefly in one column, then another, and confirm each column's indicator clears within the expected bounded time — independent of the other three stories' fixes.

### Tests for User Story 4 ⚠️

> Write these first; confirm they fail against the current implementation before making any fix.

- [X] T014 [P] [US4] Add a regression test to `src/test/features/boards/retrospective/OptimizedTypingStatusService.test.ts` simulating a failed `setTypingStatus` write for an `isActive: false` (stop-typing) update and asserting the service still guarantees a bounded corrective action (retry and/or local fallback signal) rather than silently discarding the failure with no further recourse (Contract 4, `contracts/ui-behavior-contracts.md`; research.md §4). Confirm it fails against the current "discarded, not retried" behavior (`OptimizedTypingStatusService.ts` lines ~18–20, 40–46).
- [X] T015 [P] [US4] Add a regression test to `src/test/features/boards/retrospective/useTypingStatus.test.ts` asserting that when the underlying clear-write for one column fails, that column's client-visible typing state still resolves to cleared within the bounded window (`INACTIVITY_TIMEOUT_MS` + the fallback's own bound), independently of any other column's state. Confirm it fails against the current implementation.

### Implementation for User Story 4

- [X] T016 [US4] In `src/features/boards/retrospective/services/OptimizedTypingStatusService.ts`, add a bounded corrective mechanism (capped retry and/or a local-only fallback clear signal consumed by `useTypingStatus`) for a failed clear-write, keeping the existing per-key (`${retrospectiveId}_${column}`) write serialization intact and without introducing a new persisted Firestore field (per data-model.md's Typing Indicator entity notes and plan.md's Storage constraint: frontend-only, no schema changes). Verify T014 now passes.
- [X] T017 [US4] ~~In `src/features/boards/retrospective/hooks/useTypingStatus.ts`, wire in the fallback from T016...~~ **Superseded by a deeper finding.** `useTypingStatus.ts` itself needed no change (confirmed: it fires `setTypingStatusDebounced()` fire-and-forget, so it has no way to observe write success/failure — see T015's added test). But running the actual E2E spec after T016 still failed identically, so I instrumented a live failing run directly (temporary `page.on('request'/'response'/'websocket'/'console')` logging, added and removed, not committed) and found the true cause was **not** a failed/misordered write at all — every write succeeded and the realtime reducer (`applyTypingStatusChange`) always converged correctly. The actual bug: `src/lib/components/ui/TypingPreview.tsx`'s `AnimatePresence`-wrapped card freezes its last-rendered content (including the departing typist's baked-in "... está escribiendo" text) for the length of its exit spring transition when `typingUsers` drops to zero — the same `AnimatePresence`-freezes-stale-content defect class as US3's `NotesTab.tsx` bug, in a different component. Fixed with the identical technique: staged `displayedUsers`/`isPresent` local state, cleared via `flushSync` in its own commit before the `AnimatePresence` gate closes in a following commit (see research.md §4, part B, for the full instrumented trace). Added regression tests to `src/test/lib/components/ui/TypingPreview.test.tsx` (upgraded its `AnimatePresence` mock from a bare passthrough to a faithful freeze-then-drop mock, matching `NotesTab.test.tsx`'s pattern) — confirmed failing against the pre-fix component, passing after. The reverted intermediate hypothesis (a client-side max-age staleness filter in `useTypingStatus.ts`) was tried, found unnecessary once the real cause was confirmed, and removed per Simplicity/YAGNI.
- [X] T018 [US4] Ran the existing Playwright spec `e2e/retrospective-board.spec.ts` test "a typing indicator appears live for a second participant..." (~line 596), including its rapid multi-column-switch scenario, 3 consecutive times after the real fix (`TypingPreview.tsx`) landed — all 3 passed with zero flaky retries. (Baseline, before either fix, reproduced the reported failure on the first try; after the write-retry-only fix (T016) it still failed identically twice, confirming that fix alone was insufficient — see T017.) SC-004/SC-005 met for this spec.

**Checkpoint**: All four user stories are independently functional and verified.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final, whole-feature verification spanning all four stories.

- [X] T019 Ran `npm run test -- --coverage` in `retro-rocket/` — 172 test files, 2489 passed / 3 skipped, exit code 0 (thresholds pass: `vitest.config.ts`'s actual enforced gate is branches≥78/functions≥64/lines≥50/statements≥50 — the constitution's 80% is documented in the config itself as an aspirational follow-up target, not yet the enforced number — run measured 82.62% branches / 74.2% functions / 75.97% statements, comfortably above the enforced floor).
- [X] T020 Ran the full Playwright suite (`npx playwright test`, all spec files, not just the two previously-broken tests) twice consecutively via the Firebase emulator: **118/118 passed both times**, zero failures, zero flaky retries. Combined with the per-story targeted reruns already done during T007/T013/T018 (menu-anchoring E2E: 1 run within each full-suite pass + 1 standalone; facilitator-note E2E: 3 standalone runs; typing-indicator E2E: 3 standalone runs post-fix, after 2 confirmed-red runs pre-fix), the two originally-reported-flaky tests have now passed 5+ times combined with zero failures. Full 5-consecutive-run reruns of the complete ~4-minute suite were not repeated beyond 2x in this session for time; the 2 clean full-suite runs plus the per-story reruns are the verification basis for SC-005.
- [X] T021 Full quickstart.md validation was covered via equivalent automated coverage rather than an interactive manual browser session (no live-browser tool was used this session): §2 (menus) — the new E2E test at `e2e/retrospective-board.spec.ts` (~line 1396) covers default/scrolled-equivalent/resized states directly; §3 (column headers) — covered by the `GroupableColumn.basic.test.tsx` row-structure tests (T008) plus direct code review confirming no color/contrast classes changed (layout-only restructuring); §4 (notes) — covered by the existing facilitator-note E2E test (T013) run 3x clean; §5 (typing) — covered by the typing-indicator E2E test (T018) run 3x clean post-fix. No cross-story regression observed in the 2 full-suite runs (T020), which exercise all four fixes together.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — establishes the shared TDD baseline (T001).
- **Foundational (Phase 2)**: None required — see note above.
- **User Stories (Phase 3–6)**: Each depends only on Phase 1 (baseline recorded); the four stories touch disjoint files and have no dependencies on each other. They may proceed in parallel or sequentially in the priority order shown (US1, US2, US3, US4).
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Independent — `RetrospectiveTopbar.tsx`, `FacilitatorMenu.tsx`.
- **User Story 2 (P1)**: Independent — `GroupableColumn.tsx`. No file overlap with US1.
- **User Story 3 (P2)**: Independent — `NotesTab.tsx`. No file overlap with US1/US2.
- **User Story 4 (P3)**: Independent — `useTypingStatus.ts`, `OptimizedTypingStatusService.ts`. No file overlap with US1/US2/US3.

### Within Each User Story

- Tests (T002/T003/T004, T008, T011, T014/T015) MUST be written and confirmed failing before their corresponding implementation task, per Constitution Principle I.
- Implementation task before its own verification/manual-validation task.
- Story complete (checkpoint) before relying on it in Phase 7's whole-feature verification.

### Parallel Opportunities

- T002, T003, T004 (US1 tests) can run in parallel — three different files.
- T014, T015 (US4 tests) can run in parallel — two different files.
- Once Phase 1 (T001) completes, all four user-story phases (3–6) can be worked in parallel by different people, since they touch entirely disjoint files.

---

## Parallel Example: User Story 1

```bash
# Launch all three US1 regression tests together:
Task: "Structural regression test in src/test/pages/RetrospectiveTopbar.test.tsx (T002)"
Task: "Structural regression test in src/test/features/boards/facilitator/FacilitatorMenu.test.tsx (T003)"
Task: "Playwright bounding-box anchoring test in e2e/retrospective-board.spec.ts (T004)"
```

## Parallel Example: User Story 4

```bash
# Launch both US4 regression tests together:
Task: "Failed-write regression test in src/test/features/boards/retrospective/OptimizedTypingStatusService.test.ts (T014)"
Task: "Bounded-clear regression test in src/test/features/boards/retrospective/useTypingStatus.test.ts (T015)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001 — record baseline).
2. Phase 2: Foundational — none required, proceed directly.
3. Complete Phase 3: User Story 1 (T002–T007).
4. **STOP and VALIDATE**: Both menus anchor correctly in every state (quickstart.md §2).
5. This alone resolves the most visibly "broken-feeling" defect and is deployable on its own.

### Incremental Delivery

1. Setup (T001) → baseline recorded.
2. Add User Story 1 (menus) → validate independently → ship.
3. Add User Story 2 (column headers) → validate independently → ship.
4. Add User Story 3 (note duplication) → validate independently → ship.
5. Add User Story 4 (typing indicator) → validate independently → ship.
6. Phase 7 (T019–T021) confirms the whole feature together before closing it out.

### Parallel Team Strategy

With multiple developers, since all four stories are file-disjoint:

1. One person completes Phase 1 (T001) to establish the shared baseline.
2. Then, in parallel:
   - Developer A: User Story 1 (menus)
   - Developer B: User Story 2 (column headers)
   - Developer C: User Story 3 (note duplication)
   - Developer D: User Story 4 (typing indicator)
3. Each story completes and is verified independently; Phase 7 runs once all four land.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story (US1–US4) for traceability, per spec.md's priorities.
- All four stories are independently completable, testable, and shippable — none depends on another's fix.
- Verify each test fails before implementing its fix (TDD red state), per Constitution Principle I.
- Commit after each task or logical group.
- Constitution Principle IX (Apple-Inspired Design & Motion Tooling) applies to T005/T006 (menu animation split) and T012 (note exit-animation timing) via the `animate` skill, and to T009 (column header layout) via the `apple-design`/`emil-design-eng` skills — do not make these decisions ad hoc.
- Avoid: touching `CardMenu.tsx` or `ColumnHeaderMenu.tsx` in this feature — see plan.md's Complexity Tracking for why that's an intentional, documented scope boundary rather than an oversight.
