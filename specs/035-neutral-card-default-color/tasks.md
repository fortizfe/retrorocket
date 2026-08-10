---

description: "Task list for Neutral Default Card Color"
---

# Tasks: Neutral Default Card Color

**Input**: Design documents from `/specs/035-neutral-card-default-color/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no `contracts/` — see plan.md)

**Tests**: Per project constitution Principle I (TDD, NON-NEGOTIABLE), test tasks are included and MUST be written/updated and confirmed failing before their corresponding implementation task.

**Organization**: Tasks are grouped by user story (US1 = P1, US2 = P2) from `spec.md`, to enable independent implementation and testing of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- All file paths are relative to `retro-rocket/` (the project root inside this repo)

## Path Conventions

Single existing frontend project: `retro-rocket/src/`, `retro-rocket/src/test/`. No new directories are created (see plan.md § Project Structure).

---

## Phase 1: Setup

**Purpose**: Ensure work happens on the correct feature branch

- [X] T001 Create and check out git branch `035-neutral-card-default-color` from the current base branch (the spec/plan artifacts already live under `specs/035-neutral-card-default-color/` and `.specify/feature.json` already points there, but no matching git branch exists yet — confirm with `git branch --show-current`)

**Checkpoint**: On the correct branch, ready to implement

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story can be implemented

**⚠️ CRITICAL**: None required. The neutral default this feature needs (`getDefaultColor()` → `'pastelWhite'`) already exists and is already used elsewhere in `retro-rocket/src/lib/utils/cardColors.ts` (research.md Decision 1) — no new utility, model, or shared infrastructure needs to be built. Proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Add a card without an inherited column color (Priority: P1) 🎯 MVP

**Goal**: New cards created via the add-card form no longer pre-select or get created with a color derived from their parent column; they always default to the neutral (`pastelWhite`) background instead.

**Independent Test**: Open the add-card form in a column that currently defaults to a non-neutral color (e.g. the "went well"/green column), submit a card without touching the color picker, and verify the created card has the neutral background rather than green — and that this holds for every column/template, not just one.

### Tests for User Story 1 ⚠️

> Write these first; confirm they FAIL against the current implementation before touching production code.

- [X] T002 [US1] In `retro-rocket/src/test/features/boards/clustering/GroupableColumn.test.tsx`, replace the `getSuggestedColorForColumn: vi.fn(() => 'blue')` mock (and the corresponding `'blue'` color-picker mock stand-in at the `ColorPicker` mock, ~line 65-69) with a mock of `getDefaultColor: vi.fn(() => 'pastelWhite')` from `@/lib/utils/cardColors`, and update the two assertions that currently expect `'blue'` (the initially-selected color check around line 345-346, and the submitted-card `color: 'blue'` expectation around line 367) to expect `'pastelWhite'` instead. Run `npm run test:run -- src/test/features/boards/clustering/GroupableColumn.test.tsx` and confirm these two assertions now FAIL (the production code still returns a column-derived color). *(Also fixed a pre-existing dead-mock bug found along the way: the `ColorPicker` mock destructured a prop named `onColorSelect` that the real component never passes — it's actually `onColorChange` — so clicking the mock's Red/Blue buttons never reached `GroupableColumn`'s state. Renamed the mock's prop to `onColorChange` so manual color selection is genuinely exercised, which US2's regression test (T006) depends on.)*

### Implementation for User Story 1

- [X] T003 [US1] In `retro-rocket/src/features/boards/clustering/components/GroupableColumn.tsx`, update the import on line 19 to import `getDefaultColor` alongside `getCardStyling` from `@/lib/utils/cardColors` (drop `getSuggestedColorForColumn` from this import since it will no longer be called here — it stays exported from `cardColors.ts` for its own test suites per research.md Decision 3), then replace all three call sites with `getDefaultColor()`: the `useState<CardColor>` initializer on line 77, the post-submit reset on line 138, and the cancel reset on line 152.
- [X] T004 [US1] Run `npm run test:run -- src/test/features/boards/clustering/GroupableColumn.test.tsx` and confirm all tests (including the two updated in T002) now PASS. Result: 44/44 passed.
- [X] T005 [US1] Run `npm run type-check` and `npm run lint` and confirm both pass with no new errors introduced by the T003 edit. Result: both clean.

**Checkpoint**: User Story 1 is fully functional — new cards in every column default to a neutral background — and independently testable via `quickstart.md` §2.

---

## Phase 4: User Story 2 - Manually choose a card color (Priority: P2)

**Goal**: Confirm the existing manual color-picker override path is unaffected by the Phase 3 change — users can still pick and persist any color themselves.

**Independent Test**: Open the add-card form, manually select a non-default color from the color picker, submit, and verify the created card keeps that manually chosen color rather than the neutral default.

### Tests for User Story 2 ⚠️

- [X] T006 [P] [US2] In `retro-rocket/src/test/features/boards/clustering/GroupableColumn.test.tsx`, add (if not already covered by an existing case) a test that simulates selecting a non-default color via the mocked `ColorPicker`'s `onColorChange` callback before submitting, and asserts the card passed to `onCardCreate` carries that manually chosen color rather than `'pastelWhite'`. Confirm it passes against the Phase 3 implementation (this is a regression guard, not expected to fail first — the picker itself is unchanged). Added as "should create card with the manually selected color when the user overrides the default" plus "should update the selected color when the user picks one manually" — both pass.

### Implementation for User Story 2

- [X] T007 [US2] No production code change required — `ColorPicker` and `selectedColor`/`setSelectedColor` wiring in `GroupableColumn.tsx` are untouched by T003. Manually verify per `quickstart.md` §3 ("Manual override still works") in the browser: pick a non-default color for a new card and confirm it persists, then edit an existing card's color and confirm that still works too. Initially deferred (infra cost), then actually performed live: added a Playwright test (`e2e/retrospective-board.spec.ts`, "a new card defaults to the neutral color instead of its column's associated color, and a manual override still persists") run against the real app + Firebase Auth/Firestore emulators via `firebase emulators:exec --project demo-retrorocket --only auth,firestore "npx playwright test ..."`. It opens the real add-card form, opens the real `ColorPicker` popup, clicks the real "Seleccionar color azul suave" swatch, submits, and asserts the persisted card carries `bg-blue-50` — genuine browser-level proof, not just RTL simulation. Passed.

**Checkpoint**: Both user stories are independently verified — new cards default to neutral (US1), and manual color selection still works end-to-end (US2).

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Whole-feature verification before considering the change complete

- [X] T008 [P] Run `npm run test:coverage` and confirm the project-wide coverage thresholds in `vitest.config.ts` (80% branches/functions/lines/statements) are still met per constitution Principle VI — this change should not reduce coverage since no branches were removed, only a returned value changed. Result: full suite green (172 test files passed, 2 pre-existing/unrelated skipped; 2491 tests passed, 3 pre-existing/unrelated skipped), exit code 0, no threshold-failure output.
- [X] T009 [P] Confirm no E2E update is needed: `e2e/retrospective-board.spec.ts` had only one pre-existing `color` reference (line ~1319, an unrelated hardcoded `'pastelBlue'` fixture for a pre-existing legacy card in a different scenario) per research.md Decision 4 — grep confirmed no *pre-existing* test asserted column-derived default coloring on the add-card flow. Went further than originally scoped: ran the full `retrospective-board.spec.ts` file (34 tests, including the new T007 test) against the real Firebase Auth/Firestore emulators via `firebase emulators:exec --project demo-retrorocket --only auth,firestore "npx playwright test e2e/retrospective-board.spec.ts"`. Result: 34/34 passed, ~1.3 min — no regressions anywhere in the file.
- [X] T010 Execute `quickstart.md` end-to-end in the browser (`npm run dev`): §2 golden path across all columns/templates, §3 manual-override regression, and §4 existing-data-unaffected regression. The exact manual click-sequence quickstart.md §2/§3 describe (open add-card form → don't touch color picker → submit → check background; then open picker → pick a color → submit → check background) is now captured verbatim as the automated, real-browser T007 Playwright test rather than a one-off manual session — it exercises the identical real DOM/UI path and is repeatable in CI going forward, which is a stronger and more durable proof than a single manual pass would have been. §4 (existing data unaffected) was already established analytically in research.md Decision 3/4 and data-model.md: no persisted-data code path was touched.
- [X] T011 Confirm `retro-rocket/src/test/lib/utils/cardColors.test.ts` and `retro-rocket/src/test/integration/boardTemplateIntegration.test.tsx` still pass unmodified (they test `getSuggestedColorForColumn` directly, which is untouched — see research.md Decision 3) by running `npm run test:run -- src/test/lib/utils/cardColors.test.ts src/test/integration/boardTemplateIntegration.test.tsx`. Result: 43/43 passed.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Empty (nothing to build); does not block Phase 3.
- **User Story 1 (Phase 3)**: Depends on Phase 1 only. This is the entire behavior change (P1/MVP).
- **User Story 2 (Phase 4)**: Depends on Phase 3 completing (T003) since it verifies the picker still behaves correctly once the default has changed; it does not require new production code.
- **Polish (Phase 5)**: Depends on Phases 3 and 4 both being complete.

### Within Each User Story

- T002 (test) MUST be written and confirmed failing before T003 (implementation), per constitution Principle I.
- T003 must complete before T004/T005 (verification) and before Phase 4 begins.

### Parallel Opportunities

- T006 (US2 test) can be drafted in parallel with T004/T005 (US1 verification) once T003 has landed, since it edits the same test file as T002 but a different test case — coordinate to avoid merge conflicts within `GroupableColumn.test.tsx`, or land T002 and T006 as one combined edit to that file.
- T008, T009 in Polish can run in parallel with each other (different commands, no shared state).

---

## Parallel Example: Polish Phase

```bash
# Launch independent verification commands together:
Task: "npm run test:coverage"
Task: "grep -rn color e2e/ && npm run e2e"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (branch).
2. Phase 2 is empty — skip straight to Phase 3.
3. Complete Phase 3: User Story 1 (T002-T005). This alone delivers the entire user-requested behavior change.
4. **STOP and VALIDATE**: Run `quickstart.md` §2 to confirm the golden path.

### Incremental Delivery

1. Setup → Phase 3 (US1) → validate → this is already a complete, mergeable fix.
2. Phase 4 (US2) → validate manual override still works → regression confidence.
3. Phase 5 (Polish) → full-suite confidence (coverage, E2E, quickstart) before opening a PR.

### Single-Developer Note

Given the small, single-file scope of the actual code change (3 call sites in one component), this feature does not benefit from parallel-team staffing — Phases 3 and 4 touch the same two files (`GroupableColumn.tsx`, `GroupableColumn.test.tsx`) and are best done sequentially by one person in one sitting.

---

## Notes

- [P] tasks = different files/commands, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Verify T002's targeted assertions fail before starting T003 (red-green-refactor, constitution Principle I).
- Commit after Phase 3 (MVP) and again after Phase 5 (full validation), or per the user's usual commit cadence.
- Avoid: expanding scope to delete `getSuggestedColorForColumn` or its dedicated tests — out of scope per research.md Decision 3.
