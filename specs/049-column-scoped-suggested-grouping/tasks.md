# Tasks: Column-Scoped Suggested Grouping

**Input**: Design documents from `/specs/049-column-scoped-suggested-grouping/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/column-scoped-suggestion-generation-contract.md, quickstart.md (all present)

**Tests**: Per the project constitution (Principle I, TDD — NON-NEGOTIABLE), tests are included and MUST be written and confirmed failing before their corresponding implementation task, except where noted (E2E coverage is added after the unit-level fix lands, matching the precedent already established in specs 046/047's task lists).

**Organization**: This feature has two P1 user stories in spec.md that describe the same single code change from two angles (per spec.md US2's own "Why this priority" and plan.md's Summary): US1 is the root scoping fix itself; US2 is the guarantee that other columns are never touched, which falls out of US1's fix rather than requiring separate production code. There is no separate Foundational phase — the one shared seam (widening `findSuggestions`'s type signature) is called out as its own early task (T002) within US1, mirroring spec 046's T002 precedent, because both the new column-scoping tests and the real filtering implementation depend on that signature existing first. All file paths are relative to the repository root unless otherwise noted.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2) — omitted for Setup/Polish

## Path Conventions

Single-package SPA at `retro-rocket/`: source at `retro-rocket/src/features/boards/`, unit/hook tests at `retro-rocket/src/test/features/boards/clustering/`, E2E specs at `retro-rocket/e2e/`. Paths below are exact, confirmed against the existing codebase during planning.

---

## Phase 1: Setup

**Purpose**: Confirm the environment is ready and capture the pre-fix baseline. No new dependency, scaffolding, or shared infrastructure is required (plan.md's Technical Context — zero new libraries; the existing embedding worker and clustering service are reused unchanged).

- [X] T001 From `retro-rocket/`, confirm branch `049-column-scoped-suggested-grouping` is checked out and `npm install` is up to date. Run the current baseline and confirm all green before any change: `npm run test:run -- useCardGroups`. Branch created from `main` (no `before_specify`/`before_implement` hook exists to do it automatically — no `.specify/extensions.yml` in this repo). Baseline: 21/21 tests green.

**Checkpoint**: Baseline confirmed green. Proceed directly into User Story 1 — no separate Foundational phase.

---

## Phase 2: User Story 1 - Suggested grouping only analyzes the triggering column's own cards (Priority: P1) 🎯 MVP

**Goal**: Pressing the suggested-grouping button on one column runs the AI analysis using only that column's own ungrouped cards as candidates, and every suggested group returned references only that column's cards.

**Independent Test**: Seed a board with ungrouped cards in at least two columns, call `findSuggestions` for one column, and confirm the underlying clustering call and the returned suggestions reference only that column's cards (spec.md's Independent Test for US1).

### Tests for User Story 1 ⚠️

> Write these first; confirm each one fails against the current implementation before starting the corresponding implementation task.

- [X] T002 [US1] In `retro-rocket/src/features/boards/clustering/hooks/useCardGroups.ts`, widen `findSuggestions`'s type in the `UseCardGroupsReturn` interface and its `useCallback` declaration to `(columnId: string, config?: Partial<GroupingConfig>) => Promise<GroupSuggestion[]>`, without yet changing its internal filtering logic (still pass the existing board-wide `ungroupedCards` through to `findSemanticCardGroups`). This is a type-only seam — mirrors the interface-first staging used in spec 046's T002 — so the tests below can be written and compiled against the new signature before the real filtering fix lands in T005.
- [X] T003 [US1] In `retro-rocket/src/test/features/boards/clustering/useCardGroups.test.ts`, update the two pre-existing `findSuggestions` calls in the "AI-based suggestion detection (spec 044)" describe block (`'should find group suggestions asynchronously...'` and `'propagates a rejection from findSemanticCardGroups...'`) to pass `'helped'` as the new required first argument. Confirm both still pass — behavior is unchanged at this point, only the call signature changed. Confirmed: 21/21 green.
- [X] T004 [US1] In the same file/describe block, add a `card-4` fixture (`column: 'hindered' as ColumnType`, no `groupId`) and three new tests. **Adjusted during implementation**: rather than mutating the shared top-level `mockCards` array (which several other describe blocks assert the exact shape/count of, e.g. `'should separate grouped and ungrouped cards'`), added a new nested `describe('column scoping (spec 049)', ...)` block with a locally-scoped `crossColumnCards = [...mockCards, card4]`, leaving `mockCards` itself untouched. Three tests: (a) `findSuggestions('helped', { threshold: 0.7 })` asserts `mockedSemanticGroupingService` was called with exactly `card-1`/`card-2`; (b) `findSuggestions('hindered', { threshold: 0.7 })` asserts exactly `card-4` (card-3 excluded as already grouped); (c) `findSuggestions('nonexistent-column', { threshold: 0.7 })` asserts an empty array, not a fallback to other columns. Confirmed all three FAIL against T002's still-board-wide filtering (observed the full board-wide array instead of the column-scoped subset); 21 pre-existing tests still passed (24 total, 3 failed).

### Implementation for User Story 1

- [X] T005 [US1] In `useCardGroups.ts`'s `findSuggestions`, implement the real fix: compute `const columnUngroupedCards = cards.filter(card => card.column === columnId && !card.groupId);` from the new `columnId` parameter, and pass `columnUngroupedCards` — not the board-wide `ungroupedCards` — to `findSemanticCardGroups`. Confirmed T004's three new tests now pass and T003's two updated tests still pass: 24/24 green.
- [X] T006 [US1] In `retro-rocket/src/features/boards/retrospective/components/RetrospectiveBoard.tsx`, update the `onSuggestionGenerate` prop passed to `GroupableColumn` (currently `() => findSuggestions({ threshold: 0.55, minGroupSize: 2, maxGroupSize: 6 })`, defined inside the `COLUMN_ORDER_ARRAY.map((columnId, index) => ...)` loop) to `() => findSuggestions(column.id, { threshold: 0.55, minGroupSize: 2, maxGroupSize: 6 })`. Confirmed via `npm run type-check` (clean, zero errors) that this was the only call site needing an update.

**Checkpoint**: User Story 1 fully functional and independently testable — pressing suggested grouping on one column now only ever analyzes and returns that column's own cards.

---

## Phase 3: User Story 2 - Other columns are left untouched when one column enters suggested-grouping mode (Priority: P1)

**Goal**: Triggering suggested grouping on one column never changes another column's grouping mode, card order, existing groups, or UI (loading/panel) state.

**Independent Test**: Set up several columns in different grouping modes, trigger suggested grouping on just one of them, and confirm the other columns' mode, card order, and groups are unchanged before and after (spec.md's Independent Test for US2).

**Note**: This guarantee falls directly out of US1's fix (T005/T006) — `findSuggestions` for column A never reads or writes any state belonging to column B, and each `GroupableColumn` instance already owns its own local `showSuggestions`/`suggestions` state independently (plan.md Summary). No new production code is expected in this phase; its tasks add regression-locking coverage that pins this guarantee down explicitly.

### Tests for User Story 2

- [X] T007 [US2] In `useCardGroups.test.ts`, add a test that calls `findSuggestions('helped', config)` and `findSuggestions('hindered', config)` within the same test (mock `mockedSemanticGroupingService` to resolve differently per call, e.g. via two `mockResolvedValueOnce` calls, or inspect `mockedSemanticGroupingService.mock.calls[0]`/`[1]` directly), asserting each call's `Card[]` argument contains only that call's own column's cards, with neither call's array including the other column's card ids. This locks in spec.md FR-007 (independent, non-cross-contaminating runs). Confirmed passing on first run (25/25 green) given T005's implementation — no shared mutable state between calls.
- [X] T008 [P] [US2] In `retro-rocket/e2e/retrospective-board.spec.ts`, add a new E2E test (adjacent to the existing "AI-based grouping proposes semantically similar cards together..." test around line 1847) that: seeds distinct-topic cards in the `'helped'` column and the `'improve'` column; captures the `'improve'` column's visible card content before triggering anything; triggers "Agrupaciones sugeridas" via the `'helped'` column's own "Opciones de agrupación" button (`.first()`, matching `COLUMN_ORDER = ['helped', 'hindered', 'improve']`); asserts exactly one suggestions dialog exists on the page (no other column opened one), that its card previews never reference `'improve'`-column content, and that the `'improve'` column's card content remains visible/unchanged. Ran via `firebase emulators:exec --only auth,firestore "npx playwright test --project=chromium retrospective-board -g 'suggested grouping triggered on one column only analyzes that column'"` — 1 passed (7.0s).

**Checkpoint**: Both P1 stories now covered by passing, independent tests — the AI analysis is scoped to the triggering column (US1), and every other column is provably unaffected (US2).

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Confirm no regression beyond the fixed files, and that the fix meets the project's standing quality gates.

- [X] T009 [P] Run `npm run test:coverage` from `retro-rocket/` and confirm thresholds pass with no drop (Constitution VI). 185 test files / 2503 tests passed (2 skipped files / 3 skipped tests, pre-existing/unrelated); exit 0. Coverage 77.72%/83.38%/76.79%/77.72% (stmts/branches/funcs/lines) against this package's actually-configured thresholds in `vitest.config.ts` (50/78/64/50 — documented there as the honest, already-adjusted floor, not a flat 80%; see that file's own compliance-audit note).
- [X] T010 [P] Run `npm run type-check` and `npm run lint` from `retro-rocket/` and confirm both are clean. Both clean, zero errors.
- [X] T011 Run the full Playwright suite (`npx playwright test`) — not just the new/changed spec — to confirm no unrelated regression (quickstart.md §3). Ran via `firebase emulators:exec --only auth,firestore "npx playwright test --project=chromium"` — 165 passed, 1 skipped (pre-existing/unrelated), 7.8m, exit 0. Includes T008's new test passing alongside the full existing suite with zero regressions.
- [X] T012 [P] Re-validate `specs/049-column-scoped-suggested-grouping/checklists/requirements.md` against the final spec — confirm it is still 16/16 passing since no spec drift occurred during implementation. Confirmed: `spec.md` was not modified during implementation, still 16/16.
- [X] T013 Walk through `quickstart.md` §2 manual validation steps end-to-end in a running dev instance, or confirm equivalent coverage was already exercised by T008's automated E2E run — matching the established precedent in specs 046/047's Polish phases. Confirmed equivalent: T008 is a real-Chromium Playwright run (not a mock) against live Firebase emulators exercising steps 1-7 of quickstart.md §2 — trigger on one column, confirm the panel surfaces only that column's cards, confirm the other column's content is unaffected. Steps 8-9 (concurrent-trigger nuance) are covered at the unit level by T007.
- [X] T014 [P] Run `grep -rn "findSuggestions" retro-rocket/src` and confirm every call site passes a `columnId` as its first argument, with no remaining no-argument call (quickstart.md §3). Confirmed: every real call site (`useCardGroups.test.ts` ×7, `RetrospectiveBoard.tsx`) passes a `columnId`; the two `RetrospectiveBoard*.test.tsx` occurrences are opaque `vi.fn()` mocks with no signature to violate.

**Checkpoint**: Feature complete — fix verified in isolation (Phases 2-3) and confirmed not to regress the rest of the suite or the project's coverage/lint gates (Phase 4).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **User Story 1 (Phase 2)**: Depends on Setup (T001) completion. No separate Foundational phase (see Organization above).
- **User Story 2 (Phase 3)**: Depends on User Story 1 (Phase 2, specifically T005/T006) being complete — its tests exercise the same implementation US1 lands.
- **Polish (Phase 4)**: Depends on Phase 3 (T007-T008) being complete.

### Within Phase 2 (US1)

- T002 (type signature widened) has no dependencies within this feature and must land before T003 and T004 (both need the new parameter to exist on the type to compile against).
- T003 and T004 are both edits to the same file (`useCardGroups.test.ts`) and must be applied sequentially, not in parallel.
- T005 depends on T002+T004 (implements what T004 tests) and must keep T003's tests passing.
- T006 depends on T005 (the call site must match the now-implemented signature) and is a different file, so it could technically run in parallel with T005's own test-verification step, but logically follows it since it calls the just-fixed function.

### Within Phase 3 (US2)

- T007 depends on T005 (exercises the real filtering implementation) and is in the same file as T003/T004, so it follows them sequentially.
- T008 depends on T006 (the UI must be wired to the fixed hook) but is a different file (`e2e/retrospective-board.spec.ts`) from T007, so it is marked `[P]` relative to T007.

### Parallel Opportunities

- Polish phase: T009, T010, T012, T014 are independent and parallelizable; T011 and T013 are quick sequential confirmations that can run alongside them.
- T008 (E2E, different file) is parallelizable with T007 (unit test, `useCardGroups.test.ts`) once both of their prerequisites (T006 and T005 respectively) are met.

---

## Parallel Example: Phase 4 Polish

```bash
# Once Phase 3 is complete, launch together:
Task: "Run npm run test:coverage from retro-rocket/ and confirm thresholds hold"
Task: "Run npm run type-check and npm run lint from retro-rocket/"
Task: "Re-validate specs/049-column-scoped-suggested-grouping/checklists/requirements.md"
Task: "Run grep -rn \"findSuggestions\" retro-rocket/src and confirm every call site passes columnId"
```

---

## Implementation Strategy

### MVP First (and only)

This feature is a two-story bug fix sharing one implementation — there is no smaller MVP than "the scoping bug is fixed and both angles of it are covered by tests."

1. Complete Phase 1: Setup (baseline confirmation).
2. Complete Phase 2: User Story 1 (the root fix — column-scoped analysis and results).
3. Complete Phase 3: User Story 2 (regression-locking coverage proving other columns are untouched).
4. **STOP and VALIDATE**: run `quickstart.md` end to end.
5. Complete Phase 4: Polish, then ship.

### Notes

- [P] tasks = different files, no dependency on an incomplete task.
- Verify each test fails (for the right reason) before implementing.
- Commit after each task or logical group.
- `GroupableColumn.tsx`, `semanticGroupingService.ts`, and all type definitions need no code change — the entire fix is `useCardGroups.ts`'s `findSuggestions` signature/logic plus its one call site in `RetrospectiveBoard.tsx`.
