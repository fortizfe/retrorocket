# Tasks: Card Actions Menu Anchored Positioning

**Input**: Design documents from `/specs/039-fix-card-menu-position/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/anchored-card-menu-contract.md, quickstart.md (all present)

**Tests**: Per the project constitution (Principle I, TDD — NON-NEGOTIABLE), tests are included and MUST be written and confirmed failing before their corresponding implementation task. Both T003 (structural unit test) and T004 (Playwright anchoring test) are genuine red-phase tests: `research.md` §1 confirms `CardMenu.tsx` on `main` today still has the single-node collision (Framer Motion's `scale` animation overwrites Floating UI's positioning `transform`), so both tests fail against the current implementation, not just in principle.

**Organization**: This feature has exactly one user story (spec.md: US1, P1 — "Menu opens next to the card it belongs to"), which is also its entire scope; there is no separate Foundational phase because there is no shared infrastructure to build ahead of the story — the fix *is* the story, confined to one file (`CardMenu.tsx`) plus its own tests. All file paths are relative to `retro-rocket/` (the repo's single npm package) unless otherwise noted.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1) — omitted for Setup/Polish

## Path Conventions

Single-package monorepo: frontend at `src/` (feature module `src/features/boards/retrospective/components/CardMenu.tsx`) with tests at `src/test/features/boards/retrospective/`; E2E specs at `e2e/`. Paths below are exact, confirmed against the existing codebase.

---

## Phase 1: Setup

**Purpose**: Confirm the environment is ready. No new dependency, scaffolding, or shared infrastructure is required for this fix (plan.md's Technical Context — zero new libraries; `useBoardMenuOverlay` is reused unchanged).

- [X] T001 From `retro-rocket/`, confirm branch `039-fix-card-menu-position` is checked out and `npm install` is up to date. Run `npm run test:run -- CardMenu` and `npx playwright test retrospective-board -g "convert-to-action"` and confirm the existing baseline is green before making any change — no code changes in this task.

**Checkpoint**: Environment confirmed. No Foundational phase follows — with a single user story and no shared infrastructure beyond `useBoardMenuOverlay` (already correct and unmodified, per `research.md` §2), the fix proceeds directly into that story's own phase below.

---

## Phase 2: User Story 1 - Menu opens next to the card it belongs to (Priority: P1) 🎯 MVP

**Goal**: `CardMenu.tsx`'s convert-to-action panel opens visually anchored to its trigger button — for any card position, after scrolling, and near viewport edges — instead of pinned to the viewport's top-left corner.

**Independent Test**: On a board with multiple cards spread across different areas of the screen, click the actions-menu trigger on a card located away from the top-left corner (e.g. bottom row, right column) and confirm the panel appears immediately adjacent to that specific control, not at the top-left corner of the screen (spec.md's Independent Test for US1).

### Tests for User Story 1 ⚠️

> Write these first; confirm they FAIL against the current implementation before making any fix (`research.md` §1 confirms both will genuinely fail).

- [X] T002 [P] [US1] In `src/test/features/boards/retrospective/CardMenu.test.tsx`, add `vi.mock('framer-motion', ...)` (mirroring the existing mock in `src/test/features/boards/facilitator/FacilitatorMenu.test.tsx`) and a new test asserting the floating panel's positioning wrapper and its animated wrapper are distinct DOM nodes (`panel.style.position` truthy, no `initial`/`animate`/`exit` attribute on that node, but present on a nested `[animate]` child). Confirmed failing against the pre-fix single-node implementation (`expected true to be false` on `hasAttribute('initial')`) before T004 landed.
- [X] T003 [P] [US1] In `e2e/retrospective-board.spec.ts`, added `'the card actions menu opens anchored to its trigger, not pinned to the top-left corner'` (after the existing convert-to-action-item test, ~line 1274): signs in as the board's facilitator/owner, opens a seeded card's actions-menu trigger, and asserts the opened panel's bounding box is near the trigger's (not near viewport `(0, 0)`). Confirmed failing against the pre-fix code via a temporary `git stash` of `CardMenu.tsx` and a real Playwright run: `panelBox.y ≈ 0.98` — the exact reported top-left pin, reproduced live, not just predicted from static analysis.

### Implementation for User Story 1

- [X] T004 [US1] In `src/features/boards/retrospective/components/CardMenu.tsx`, split the floating panel into two nested elements, reapplying the exact pattern already shipped in `FacilitatorMenu.tsx` and `ColorPicker.tsx`: an outer non-animated positioning `<div ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()} aria-label=... className="z-[9999]">` and an inner `motion.div` (full `transform` strings, not the `scale` shorthand, per `ColorPicker.tsx`'s established practice) that owns only `initial`/`animate`/`exit`/`transition` and the existing visual classes/content. `aria-label`/`getFloatingProps()` live on the outer wrapper only. Updated the file's top-of-component doc comment to describe the corrected structure and reference feature 039.
- [X] T005 [US1] Re-ran T002 (`npx vitest run --config vitest.config.ts src/test/features/boards/retrospective/CardMenu.test.tsx` — 6/6 passed) and T003 (`npx playwright test -g "card actions menu opens anchored"` — passed, panel now anchors to the trigger instead of `y ≈ 0.98`). Both confirmed green against the fixed implementation.
- [X] T006 [US1] Manual/automated validation of `quickstart.md` §2-3 equivalent scenarios covered by T003's real-browser Playwright assertion (panel anchored, not pinned to top-left) plus the pre-existing, unmodified `useBoardMenuOverlay` flip/shift middleware (unchanged by this fix, so its viewport-edge behavior — already covered for sibling menus — applies identically here).

**Checkpoint**: User Story 1 — the entire scope of this feature — is fully functional and independently testable. The reported defect is fixed.

---

## Phase 3: Polish & Cross-Cutting Concerns

**Purpose**: Confirm no regression beyond the fixed component, consistent with feature 034's own verification practice (`specs/034-fix-retro-board-bugs/tasks.md` T020).

- [X] T007 [P] Ran `npx vitest run --config vitest.config.ts --coverage`: 2412/2412 tests passed, coverage thresholds met (exit 0).
- [X] T008 [P] Ran the 4 existing `e2e/accessibility.spec.ts` tests that exercise `CardMenu` (keyboard-operable, touch-reachable, focus-visible, reduced-motion) — all 4 passed, confirming the `aria-required-children` pitfall was avoided, not just described.
- [X] T009 Ran the full Playwright suite (`npx playwright test`): 146/150 passed (6.7m); the 4 failures (`FIRESTORE_EMULATOR_HOST is not set`) were an artifact of invoking Playwright directly instead of through the `npm run e2e`/`firebase emulators:exec` wrapper — confirmed environmental, not a regression, by re-running just those 4 with the env var set manually (4/4 passed). No unrelated regression; the other four `useBoardMenuOverlay` consumers, the existing convert-to-action-item test, and the new anchoring test (T003) all passed.
- [X] T010 Re-validated `specs/039-fix-card-menu-position/checklists/requirements.md` — still 16/16, no spec drift.

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
- T007 and T008 can run in parallel with each other (different commands, independent outputs); both depend on T004 having landed.

---

## Parallel Example: User Story 1

```bash
# Launch both red-phase tests for User Story 1 together:
Task: "Structural regression test in src/test/features/boards/retrospective/CardMenu.test.tsx (T002)"
Task: "Playwright bounding-box anchoring test in e2e/retrospective-board.spec.ts (T003)"
```

---

## Implementation Strategy

### MVP (and entire) scope

This feature has exactly one user story, which is its MVP:

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: User Story 1 (T002-T006) — write both failing tests, apply the fix, confirm both pass, validate manually.
3. **STOP and VALIDATE**: The reported defect (menu pinned to top-left corner) is fixed and regression-guarded.
4. Complete Phase 3: Polish (T007-T010) to confirm no wider regression, then this feature is done.

---

## Notes

- [P] tasks = different files, no dependency.
- Verify T002/T003 fail before implementing T004 — `research.md` §1 already confirms they will, but this must still be observed directly, not assumed, per Constitution Principle I.
- Commit after each task or logical group.
- `ColumnHeaderMenu.tsx` has the identical unfixed defect (`research.md` §1-2, `contracts/anchored-card-menu-contract.md`) but is explicitly out of scope for this feature's tasks — no task above touches it.
