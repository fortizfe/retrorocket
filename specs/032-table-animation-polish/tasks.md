---

description: "Task list template for feature implementation"
---

# Tasks: Mis Tableros Table Motion Refinement

**Input**: Design documents from `/specs/032-table-animation-polish/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Per the project constitution (Principle I, TDD, NON-NEGOTIABLE, and Principle VI, coverage floor), tests ARE included below and MUST be written and confirmed failing before their corresponding implementation task.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each story. All commands below run from `retro-rocket/` (the project root inside the repo).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are relative to `retro-rocket/` unless stated otherwise

## Path Conventions

Single-frontend web app (see [plan.md](./plan.md) Project Structure) — no `backend/`/`frontend/` split, no new top-level directory. All paths below are under `retro-rocket/src/`, `retro-rocket/e2e/`, or the repo-root `specs/032-table-animation-polish/`.

---

## Phase 1: Setup

**Purpose**: Establish the TDD baseline before any change — no new dependency, environment config, or scaffolding is needed (research.md confirms `framer-motion` and the app-root `MotionConfig` are already sufficient).

- [X] T001 Run the dashboard unit-test suite (`npm run test:run -- BoardRow Dashboard`, from `retro-rocket/`, covering `src/test/features/dashboard/BoardRow.test.tsx` and `src/test/pages/Dashboard.test.tsx`) and record the current passing baseline, so later task checkpoints can confirm nothing pre-existing regressed.

**Checkpoint**: Baseline recorded — safe to begin the foundational fix.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `BoardRow.tsx` is the single component that renders every row for all three triggers (scope filter → US1, sort → US1, pagination → US2), and research.md R1/R2 identified one shared root cause across all of them: its `transition` prop (`src/features/dashboard/components/BoardRow.tsx:66-71`) applies the same index-delayed timing to mount, `layout` reflow, and `exit` alike. Splitting that transition by purpose is the one change every user story depends on — it MUST land before any story's acceptance scenarios can pass.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Write failing unit tests in `src/test/features/dashboard/BoardRow.test.tsx` asserting the target behavior from data-model.md's Row Transition State: (a) a row whose `key` persists across a re-render but whose `index` changes (a `reflowing` row) receives a `layout` transition with no delay; (b) a row present in one render and absent from the next (an `exiting` row, simulated via `AnimatePresence`) receives an `exit`-specific transition with no inherited entrance delay; (c) a row whose `key` is genuinely new (a `mounting` row) still receives the existing fade+slide entrance with its index-based stagger, unchanged. Confirm all three assertions fail against the current code.
- [X] T003 Using the `animate` skill to finalize and justify the exact duration/easing/delay-gating values (per Constitution Principle IX / plan.md FR-008), split the shared `transition` prop in `src/features/dashboard/components/BoardRow.tsx` (currently lines 66-71) into: a mount-only entrance transition (keeps today's `delay: Math.min(index * 0.05, 0.3)` stagger, applied only via `initial`/`animate`), an undelayed `layout` transition (set via the `transition` prop's `layout` sub-key so FLIP reflows are never delayed), and an undelayed, faster `exit`-specific transition (set directly on the `exit` prop so leaving rows never inherit the entrance delay). Do not change the animated properties (`opacity`, `y`) or the existing ease curve (`[0.23, 1, 0.32, 1]`) — only how delay/duration are scoped per animation purpose. Depends on T002.
- [X] T004 Extend `src/test/features/dashboard/BoardRow.test.tsx` (same file as T002/T003) with an assertion that the split transition values from T003 remain governed by the app-root `<MotionConfig reducedMotion="user">` (`src/App.tsx:25`) — i.e., no new per-component reduced-motion branch was introduced that could diverge from research.md R4's "already solved app-wide" finding. Depends on T003.
- [X] T005 Run `npm run test:run -- BoardRow` and confirm T002's and T004's assertions now pass (green), closing the TDD red-green cycle for the shared fix. Depends on T003, T004.

**Checkpoint**: Foundation ready — `BoardRow.tsx`'s transition is correctly split by purpose; all user stories can now be verified.

---

## Phase 3: User Story 1 - Switching the scope filter (and sort) feels smooth (Priority: P1) 🎯 MVP

**Goal**: Scope-filter changes and sort-key/direction changes transition the row set smoothly — no inherited exit delay, no uneven reflow cascade, reduced-motion honored, interruption-safe (spec.md User Story 1, acceptance scenarios 1-4).

**Independent Test**: Load a board list with boards in more than one scope, click through each filter segment and each sort control, and confirm every transition reads as smooth and immediate, independent of any pagination change.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before any US1-specific change (though most behavior should already pass thanks to Phase 2 — these tests exist to pin the story's specific scenarios, not to drive new production code)**

- [X] T006 [US1] Add an integration test in `src/test/pages/Dashboard.test.tsx` asserting that changing `scopeFilter` (via `BoardControlsBar`'s segmented control) causes rows no longer matching the filter to begin their exit transition immediately (no `index`-derived delay) and causes remaining/newly-visible rows to settle via the Phase 2 undelayed reflow/mount paths, with no duplicate or leftover `<li>` elements after the transition (spec.md US1 scenario 1, FR-001, FR-004).
- [X] T007 [US1] Add an integration test in `src/test/pages/Dashboard.test.tsx` (same file as T006) that triggers a second `scopeFilter` change before the first transition's timers/promises resolve, asserting the component tree remains consistent (no thrown errors, no stray rows, final rendered set matches the second filter) — spec.md US1 scenario 2, FR-005.
- [X] T008 [US1] Add an integration test in `src/test/pages/Dashboard.test.tsx` (same file as T006/T007) asserting that a `sortKey`/`sortDirection` change reorders rows through the same undelayed `layout` transition path exercised in T006, not a separate or lesser treatment — spec.md US1 scenario 4, FR-010, confirming research.md R5.

### Implementation for User Story 1

- [X] T009 [P] [US1] Add a Playwright test in `e2e/dashboard-list.spec.ts` (using the existing `seedBoards`/`createBoardViaApi` helpers from `e2e/fixtures/`) that signs in, creates boards in more than one scope, clicks through each scope-filter segment, and asserts the expected rows become visible/hidden — closing the gap that today's e2e suite has no scope-filter-click coverage. Validates quickstart.md §1 steps 1-3 end-to-end.
- [X] T010 [US1] Manually run quickstart.md §1 steps 4-5 against the local dev server (`npm run dev`): with `prefers-reduced-motion` enabled (Chrome DevTools → Rendering → emulate), change the scope filter and confirm rows crossfade via opacity only, with no translate/position movement — the one research.md R4 item flagged as "confirm at runtime, not just by reading code."
- [X] T011 [P] [US1] Add a Playwright test in `e2e/dashboard-list.spec.ts` (or extend T009's test) that clicks the "Sort by name"/"Sort by date" controls and their direction toggle, asserting the row order changes as expected — closing the gap that today's e2e suite only exercises sort incidentally (via the 210-board reachability test), not as a first-class scenario.

**Checkpoint**: User Story 1 fully functional and independently testable — this is the MVP, since it directly addresses the user's primary complaint ("al seleccionar algún filtro").

---

## Phase 4: User Story 2 - Changing page feels smooth (Priority: P1)

**Goal**: Page-number, previous/next, and items-per-page changes transition the row set with the same quality bar as US1, and pagination controls give immediate press feedback (spec.md User Story 2, acceptance scenarios 1-3).

**Independent Test**: Load a board list with enough boards to span at least 3 pages, click through page numbers, previous/next, and change items-per-page, and confirm each change transitions smoothly with no layout jump or unresponsive-feeling delay.

### Tests for User Story 2

- [X] T012 [US2] Add an integration test in `src/test/pages/Dashboard.test.tsx` (same file as T006-T008) asserting that a `currentPage` change and an `itemsPerPage` change both drive `paginatedBoards` through the same Phase 2 exit/reflow/mount paths validated in T006, with no jump/reflow in the surrounding header/controls/pagination-footer markup (spec.md US2 scenarios 1-2, FR-002, FR-004).
- [X] T013 [US2] Add an integration test in `src/test/pages/Dashboard.test.tsx` (same file) asserting that clicking a disabled pagination control (e.g., "Next" on the last page) produces no state change and no stray animation/transition side effect (spec.md US2 scenario 3).

### Implementation for User Story 2

- [X] T014 [P] [US2] Add a Playwright test in `e2e/dashboard-list.spec.ts` (using `seedBoards` to create 25+ boards) that clicks page number 2, "Previous"/"Next", and changes the items-per-page selector, asserting the expected board titles become visible/hidden on each change and that no horizontal/vertical layout overflow occurs (reuse `expectNoHorizontalOverflow` from `e2e/fixtures/board.ts` if applicable) — extends beyond the existing 210-board reachability test's incidental "Next"-clicking to first-class pagination coverage. Validates quickstart.md §2.
- [X] T015 [P] [US2] Regression-check (no source change expected per research.md R6): confirm in `src/test/features/dashboard/BoardRow.test.tsx` or an existing `Pagination`-focused test file that pagination buttons still render through the shared `Button` component's `whileHover={{ scale: 1.02 }}`/`whileTap={{ scale: 0.98 }}` after the Phase 2 change — FR-009 must remain satisfied, not reimplemented.

**Checkpoint**: User Stories 1 AND 2 both work independently — the two interactions the user explicitly named as crude are both fixed and verified.

---

## Phase 5: User Story 3 - Motion feels consistent with the rest of the product (Priority: P2)

**Goal**: The refined filter/sort/pagination transition reads as the same motion language as the table's existing entrance animation, while remaining appropriately distinct for its direct-manipulation trigger (spec.md User Story 3, acceptance scenario 1).

**Independent Test**: Compare the timing/easing "feel" of the filter, sort, and pagination transitions against the table's initial-load row entrance and confirm they read as part of the same motion language.

- [X] T016 [US3] Re-run the `review-animations` skill against the post-fix `src/pages/Dashboard.tsx`, `src/features/dashboard/components/BoardRow.tsx`, `Pagination.tsx`, and `BoardControlsBar.tsx`, using the same scope as the Phase 0 planning review. Confirm the verdict changes from the Phase 0 **Block** (recorded in research.md) to **Approve** — this is this story's acceptance test (SC-001, SC-005).
- [X] T017 [US3] Record the T003/T016 skill usage (which Apple-design skills were used and why) in the feature's pull request description, per the constitution's Development Workflow gate for any PR that modifies frontend animation.

**Checkpoint**: All three user stories independently functional — feature is feature-complete pending cross-cutting polish.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification that spans more than one user story, plus the spec's remaining edge cases and non-functional requirements.

- [X] T018 [P] Add an integration test in `src/test/pages/Dashboard.test.tsx` for the cross-story edge case: trigger a scope-filter change immediately followed by a page change, before the first transition settles, asserting the table never lands in a visually inconsistent state (spec.md Edge Cases, FR-005, SC-003).
- [X] T019 [P] Add/extend a test (unit or e2e) confirming the transition into the empty/"no results" state (via `SearchX` empty state in `src/pages/Dashboard.tsx`) remains smooth with no stray row remnants from the previous set, after the Phase 2 change (spec.md Edge Cases, FR-004).
- [X] T020 [P] Run the project's WCAG 2.1 AA verification pass (contrast, visible focus, keyboard operability, no color-only signaling) against the dashboard table, scope-filter segmented control, sort controls, and pagination controls, in both light and dark themes, per quickstart.md §7 (FR-007, Constitution Principle VIII).
- [X] T021 [P] Run `npm run test:coverage` (from `retro-rocket/`) and confirm the 80% branch/function/line/statement floor in `vitest.config.ts` is still met after all `src/` changes (Constitution Principle VI).
- [X] T022 Run `npm run e2e` (from `retro-rocket/`) and confirm the full Playwright suite passes, including the new tests from T009, T011, T014 (Constitution Principle VII).
- [X] T023 Execute the full [quickstart.md](./quickstart.md) validation guide (§1-§8) end-to-end against a running dev server, recording the §5 settle-time measurement (SC-002: ≤300ms) and the §8 `review-animations` re-run result, before considering the feature done.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion (T001) — BLOCKS all user stories, since T003's single-file change is what every story's acceptance scenarios verify.
- **User Stories (Phase 3-5)**: All depend on Foundational (Phase 2) completion.
  - US1 (Phase 3) and US2 (Phase 4) are both P1 and independent of each other — either can go first, or both in parallel if staffed.
  - US3 (Phase 5) depends only on Foundational, but its `review-animations` re-check (T016) is most meaningful once US1/US2 have landed, so sequencing it last is recommended even though not strictly required.
- **Polish (Phase 6)**: Depends on all desired user stories being complete (T018 specifically needs both US1's filter behavior and US2's pagination behavior to exist).

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependency on US2 or US3.
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) — no dependency on US1 or US3.
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) — reviews the combined result of US1+US2 but does not require them to be "done" first, since it re-runs a code review, not a runtime test.

### Within Each Phase

- Tests (T002, T006-T008, T012-T013) MUST be written and confirmed failing before their corresponding implementation/verification task.
- T002 → T003 → T004 → T005 is a strict sequential chain (same file, each depends on the last).
- T006, T007, T008 edit the same file (`Dashboard.test.tsx`) sequentially — not parallelizable with each other.
- T012, T013 continue in the same file after T006-T008 — sequential, not parallelizable with each other.

### Parallel Opportunities

- T009 and T011 (different assertions, can be the same or sibling Playwright test file `e2e/dashboard-list.spec.ts`) may be split across two contributors if desired, but note they touch the same file — coordinate merges.
- T014 and T015 touch different files (`e2e/dashboard-list.spec.ts` vs. a `BoardRow`/`Pagination` test file) and can run in parallel.
- Phase 6's T018-T021 each touch different files/commands and can run in parallel; T022 and T023 are final gate-checks that should run after everything else lands.
- US1 (Phase 3) and US2 (Phase 4) can be staffed by two different contributors in parallel once Phase 2 is merged.

---

## Parallel Example: Phase 6 Polish

```bash
# Once US1, US2, and US3 are all merged, these can run in parallel:
Task: "Add integration test for filter-then-page interruption in src/test/pages/Dashboard.test.tsx"
Task: "Verify empty/no-results transition in src/pages/Dashboard.tsx"
Task: "Run WCAG 2.1 AA verification pass on dashboard table and controls"
Task: "Run npm run test:coverage and confirm 80% floor maintained"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002-T005) — CRITICAL, blocks all stories.
3. Complete Phase 3: User Story 1 (T006-T011).
4. **STOP and VALIDATE**: Run quickstart.md §1, §4 (interruption), §5 (settle-time) against User Story 1 alone.
5. This addresses the user's primary named complaint ("al seleccionar algún filtro") and can ship as an incremental improvement even before US2/US3 land.

### Incremental Delivery

1. Setup + Foundational → shared fix ready (T001-T005).
2. Add US1 → test independently → the filter/sort complaint is resolved (T006-T011).
3. Add US2 → test independently → the pagination complaint is resolved (T012-T015).
4. Add US3 → confirms overall cohesion via a second `review-animations` pass (T016-T017).
5. Polish (T018-T023) closes out cross-cutting verification (interruption across stories, accessibility, coverage, full e2e, full quickstart).

### Parallel Team Strategy

With two contributors:

1. Both complete Setup + Foundational together (T001-T005) — this is the shared blocking fix.
2. Once Foundational is done:
   - Contributor A: User Story 1 (T006-T011).
   - Contributor B: User Story 2 (T012-T015).
3. Either contributor picks up User Story 3 (T016-T017) once both are merged, then both close out Polish (T018-T023) together.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- This feature's Foundational phase (Phase 2) is unusually load-bearing relative to a typical feature: because US1 and US2 share the exact same `BoardRow.tsx` rendering path (research.md R1/R2/R5), nearly all the real implementation work happens once, in Phase 2 — the user story phases are primarily tests/verification against that shared fix, not separate implementations.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- Avoid: vague tasks, same-file conflicts (see same-file sequencing notes above), cross-story dependencies that break independence.
