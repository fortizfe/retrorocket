# Tasks: Column Grouping Menu Anchored Positioning

**Input**: Design documents from `/specs/045-fix-column-grouping-dropdown-position/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no `contracts/` — see plan.md's Structure Decision)

**Tests**: Per the project constitution (Principle I, TDD — NON-NEGOTIABLE), tests are included and MUST be written and confirmed failing before their corresponding implementation task. `research.md` §1 confirms `ColumnHeaderMenu.tsx`'s grouping-mode dropdown on `main` today still has the single-node collision (Framer Motion's `y`/`scale` animation overwrites Floating UI's positioning `transform`), so both new tests below fail against the current implementation, not just in principle.

**Organization**: This feature has exactly one user story (spec.md: US1, P1 — "Grouping menu opens next to its column button"), which is also its entire scope; there is no separate Foundational phase because there is no shared infrastructure to build ahead of the story — the fix *is* the story, confined to one file (`ColumnHeaderMenu.tsx`) plus its own tests. All file paths are relative to `retro-rocket/` (the repo's single npm package) unless otherwise noted.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1) — omitted for Setup/Polish

## Path Conventions

Single-package monorepo: frontend at `src/` (feature module `src/features/boards/clustering/components/ColumnHeaderMenu.tsx`) with unit tests at `src/test/features/boards/clustering/`; E2E specs at `e2e/`. Paths below are exact, confirmed against the existing codebase.

---

## Phase 1: Setup

**Purpose**: Confirm the environment is ready. No new dependency, scaffolding, or shared infrastructure is required for this fix (plan.md's Technical Context — zero new libraries; `useBoardMenuOverlay` and the already-fixed suggestions-panel block in the same file are reused unchanged).

- [X] T001 From `retro-rocket/`, confirm branch `045-fix-column-grouping-dropdown-position` is checked out and `npm install` is up to date. Run `npx vitest run --config vitest.config.ts src/test/features/boards/clustering/ColumnHeaderMenu.test.tsx` and confirm the existing baseline (472 lines, all currently-passing tests) is green before making any change — no code changes in this task.

**Checkpoint**: Environment confirmed. No Foundational phase follows — with a single user story and no shared infrastructure beyond `useBoardMenuOverlay` (already correct and unmodified, per `research.md` §2), the fix proceeds directly into that story's own phase below.

---

## Phase 2: User Story 1 - Grouping menu opens next to its column button (Priority: P1) 🎯 MVP

**Goal**: `ColumnHeaderMenu.tsx`'s grouping-mode dropdown (none / by-author / by-color / suggestions) opens visually anchored to its trigger button — for any column position, after scrolling, and near viewport edges — instead of pinned to the viewport's top-left corner.

**Independent Test**: On a board with multiple columns, click the grouping control on a column located away from the top-left corner of the screen (e.g. a middle or right-hand column) and confirm the grouping menu appears immediately adjacent to that specific control, not at the top-left corner of the screen (spec.md's Independent Test for US1).

### Tests for User Story 1 ⚠️

> Write these first; confirm they FAIL against the current implementation before making any fix (`research.md` §1 already confirms they will, but this must still be observed directly per Constitution Principle I).

- [X] T002 [P] [US1] In `src/test/features/boards/clustering/ColumnHeaderMenu.test.tsx`, add a new test in a `Grouping-Mode Menu Positioning (spec 045)` describe block asserting the *grouping-mode* dropdown's positioning node and animated node are distinct DOM nodes, mirroring the existing `Suggestions Panel (spec 044)` assertions at lines 416-431: open the menu (`user.click(screen.getByRole('button'))`), locate the floating panel via `screen.getByRole('menu', { name: 'retrospective.grouping.menuLabel' })`, and assert `panel.style.position` is truthy while `panel.hasAttribute('initial'|'animate'|'exit')` are all `false` and `panel.querySelector('[animate]')` is not null. Confirmed failing against the current single-node implementation (`expected true to be false` on `hasAttribute('initial')`).
- [X] T003 [P] [US1] In `e2e/retrospective-board.spec.ts`, add a new test `'the grouping-mode dropdown opens anchored to its trigger button, not pinned to the top-left corner (spec 045)'`, placed after the existing spec-044 suggestions-panel anchoring test (line ~1698) and reusing its structure and the `isAnchoredToTrigger` helper: seed a board with a card in a non-first column (`improve`, matching `COLUMN_ORDER`), sign in, locate the trigger via `page.getByRole('button', { name: 'Opciones de agrupación' }).last()` (confirm its `boundingBox().x` is away from the top-left), click it to open the grouping-mode menu, locate the panel via `page.getByRole('menu', { name: 'Opciones de agrupación' })`, and assert `isAnchoredToTrigger(panel, trigger)` is `true`. Includes the same viewport-shrink and scroll-while-open assertions as the spec-044 test to cover FR-003/FR-002. Confirmed failing against the current implementation via a live emulator-backed Playwright run (`firebase emulators:exec --only auth,firestore "npx playwright test --project=chromium retrospective-board -g 'grouping-mode dropdown opens anchored'"`) — `expect(received).toBe(expected)` / `Expected: true, Received: false` at the `isAnchoredToTrigger` assertion, reproducing the reported top-left-pin defect live.

### Implementation for User Story 1

- [X] T004 [US1] In `src/features/boards/clustering/components/ColumnHeaderMenu.tsx`, split the grouping-mode dropdown (was lines ~130-177) into two nested elements, reapplying the exact split-node pattern already shipped in this same file's suggestions-panel block, `FacilitatorMenu.tsx`, and `CardMenu.tsx`: an outer non-animated positioning `<div ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()} aria-label={...} className="z-50">` and an inner `motion.div` (full `transform` strings, not the `y`/`scale` shorthand) that owns only `initial`/`animate`/`exit`/`transition` and the existing visual classes/content. `aria-label`/`getFloatingProps()` live on the outer wrapper only; `FloatingFocusManager`/`FloatingPortal`/`AnimatePresence` wrapping stays unchanged. Updated the file's top-of-component doc comment to remove the "deliberately left unchanged" note and describe the now-corrected structure, referencing feature 045.
- [X] T005 [US1] Re-ran T002 (`npx vitest run --config vitest.config.ts src/test/features/boards/clustering/ColumnHeaderMenu.test.tsx` — 30/30 passed) and T003 (`firebase emulators:exec --only auth,firestore "npx playwright test --project=chromium retrospective-board -g 'grouping-mode dropdown opens anchored'"` — passed, panel now anchors to the trigger). Also re-ran the sibling spec-044 suggestions-panel Playwright test to confirm no regression — passed. `npx tsc --noEmit` clean.
- [X] T006 [US1] Validated `quickstart.md` §2's scenarios (steps 1-8: anchored positioning on a non-top-left column, viewport-edge flip/shift, scroll-while-open, re-anchoring when switching columns). `npm run dev` alone has no backend (`/api/*` proxy fails without `dev:server`/Firebase emulators, so no board can be signed into for a manual click-through); T003/T005's live `firebase emulators:exec` + Playwright run against the real dev build already covers every one of these scenarios with stronger bounding-box assertions than an eyeball check would give, so no separate manual pass was needed. Grouping-selection behavior (quickstart.md's step 8 unchanged-behavior check) is covered by the pre-existing, still-passing `onGroupingChange` unit tests (T005).

**Checkpoint**: User Story 1 — the entire scope of this feature — is fully functional and independently testable. The reported defect is fixed.

---

## Phase 3: Polish & Cross-Cutting Concerns

**Purpose**: Confirm no regression beyond the fixed component, consistent with features 039/044's own verification practice.

- [X] T007 [P] Ran `npx vitest run --config vitest.config.ts --coverage`: 182 test files / 2442 tests passed (3 pre-existing skips, unrelated), coverage thresholds met (exit 0).
- [X] T008 [P] Ran `quickstart.md` §3's regression spot-check via live emulator-backed Playwright (`firebase emulators:exec --only auth,firestore "npx playwright test --project=chromium retrospective-board -g 'card actions menu opens anchored|options menu and the facilitator menu open anchored'"`): both the card actions menu (spec 039) and the facilitator/options menu (spec 034) passed, still anchored correctly. The column's own AI suggestions panel (spec 044) was confirmed in T005. The color picker (spec 037) has no dedicated anchoring test in this spec file; its unit tests (part of the 2442 in T007) passed unaffected — this change touches only `ColumnHeaderMenu.tsx`, not `ColorPicker.tsx`.
- [X] T009 Ran the full Playwright suite for the retrospective board (`firebase emulators:exec --only auth,firestore "npx playwright test --project=chromium retrospective-board"`): 42/42 passed, confirming no regression in `'group-by-user headers...'`, `'the column-grouping preference propagates live...'`, or any other test. **Correction found and fixed during this run**: T003's new test originally reused `e2e-retro-owner25@example.com`, an email already used earlier in this same spec file (line ~480) under a different display name ("Jane Smith") — Firebase Auth accounts persist by email across the whole suite run, so the reused email caused a genuine sign-in timeout (`waiting for getByText('E2E Retro Owner 25') to be visible`) in the full-suite run, though the test passed in isolation. Not a flake: fixed by switching to an unused account, `e2e-retro-owner41@example.com` (confirmed unused via `grep -oE "e2e-retro-owner[0-9]+" e2e/*.spec.ts`), after which the full 42-test suite passed cleanly on re-run.
- [X] T010 Re-validated `specs/045-fix-column-grouping-dropdown-position/checklists/requirements.md` — still 16/16, no spec drift.

**Checkpoint**: Feature complete — fix verified in isolation (Phase 2) and confirmed not to regress any sibling menu or the project's coverage/accessibility gates (Phase 3).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **User Story 1 (Phase 2)**: Depends on Setup (T001) completion. No Foundational phase exists for this single-story feature (see Organization above).
- **Polish (Phase 3)**: Depends on Phase 2 (T004-T006) being complete.

### Within Phase 2

- T002 and T003 (tests) can be written in parallel (different files) and MUST both be confirmed failing before T004 starts.
- T004 (implementation) depends on both T002 and T003 existing.
- T005 (re-run tests) depends on T004.
- T006 (manual validation) depends on T004; can run in parallel with T005.

### Parallel Opportunities

- T002 and T003 can run in parallel (different files, no dependency on each other).
- T007, T008, and T009 can run in parallel with each other (different commands, independent outputs); all depend on T004 having landed.

---

## Parallel Example: User Story 1

```bash
# Launch both red-phase tests for User Story 1 together:
Task: "Structural regression test in src/test/features/boards/clustering/ColumnHeaderMenu.test.tsx (T002)"
Task: "Playwright bounding-box anchoring test in e2e/retrospective-board.spec.ts (T003)"
```

---

## Implementation Strategy

### MVP (and entire) scope

This feature has exactly one user story, which is its MVP:

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: User Story 1 (T002-T006) — write both failing tests, apply the fix, confirm both pass, validate manually.
3. **STOP and VALIDATE**: The reported defect (grouping menu pinned to top-left corner) is fixed and regression-guarded.
4. Complete Phase 3: Polish (T007-T010) to confirm no wider regression, then this feature is done.

---

## Notes

- [P] tasks = different files, no dependency.
- Verify T002/T003 fail before implementing T004 — `research.md` §1 already confirms they will, but this must still be observed directly, not assumed, per Constitution Principle I.
- Commit after each task or logical group.
- No other file in the codebase carries this defect — specs 034, 039, and 044 already fixed every sibling popup (`FacilitatorMenu.tsx`, `CardMenu.tsx`, and this same file's suggestions-panel block); this feature closes the one block those specs explicitly deferred.
