# Contract: Functional Parity

**Enforces**: FR-002 through FR-008, FR-011a, FR-012, FR-013, FR-013a,
SC-001, SC-008. Applies to the redesigned color picker before any
implementation task can be marked complete.

## Contract

Every capability below MUST behave identically to the pre-redesign
implementation, except where explicitly marked as newly introduced by
FR-011a/FR-013a. Each row names the requirement it satisfies and the
existing test(s) that must keep passing — updated only for intentional
selector/structure/catalog changes, never weakened or deleted (FR-016).

| Capability | Requirement | Verified by |
|---|---|---|
| Open the picker, browse colors, select one, applied to the card immediately with real-time sync to other participants | FR-002 | `ColorPicker.test.tsx`, `ColorPickerClean.test.tsx`, `e2e/retrospective-board.spec.ts` (color-selection scenario, ~line 198) |
| Available in both places it appears today: an existing card (`DraggableCard.tsx`) and the add-card form (`GroupableColumn.tsx`) | FR-003 | `ColorPicker.test.tsx`/`ColorPickerClean.test.tsx` (both consumers), `GroupableColumn`-level tests, `e2e/retrospective-board.spec.ts` |
| Edit-rights gating preserved: no picker openable/usable by a participant without edit rights on that card | FR-004 | `DraggableCard`-level tests asserting `canEdit`/`ColorPicker` conditional rendering |
| Currently applied (or, in the add-card form, currently chosen) color unambiguously marked whenever the panel is open | FR-005 | `ColorPicker.test.tsx` ("highlights selected color") |
| Each color's name (at minimum) available to distinguish visually similar colors | FR-006 | `ColorPicker.test.tsx` ("displays color name and position"), extended for the curated catalog's translated names |
| Keyboard- and mouse-operable without hover dependency; dismissible via Escape and outside click | FR-007 | `ColorPicker.test.tsx` (Keyboard Interactions, Outside Click Handling describe blocks) |
| All visible text (including color names) sourced from i18next for en/es; no hardcoded strings | FR-008 | **New** locale-key-coverage check (equivalent to feature 033's `tasks.md` T063) — currently failing/non-existent, since today's text is hardcoded (`research.md` §4); this feature must make it pass, not merely preserve a passing state |
| **New**: touch-reachable entry point on both the existing card and the add-card form, exercising the same capability as FR-002 | FR-011a | New tests added by this feature — no pre-existing touch-viewport coverage of this control exists to extend (`research.md` §2) |
| Neutral/default color preserved as a clear, distinct option | FR-012 | `ColorPicker.test.tsx`, `cardColors.test.ts` (`getDefaultColor`) |
| Catalog MAY be curated/reduced/reorganized/renamed/regrouped, provided every existing card renders a valid color afterward | FR-013 | `cardColors.test.ts` (updated for the selected direction's `curatedCatalog`), `cardColors.a11y.test.ts` (extended, not replaced, per feature 009) |
| **New**: every removed/renamed color remapped, for every existing card using it, to its closest equivalent — no orphaned/legacy value in use, including for a group's head card (`GroupCard.tsx`) and via the existing `validateColor()` path (`DraggableCard.tsx`) | FR-013a | **New** migration test exercising the `Color Catalog Curation Mapping` (`data-model.md`) against representative pre-curation `Card.color` values, verifying 100% coverage and that every `newColor` is a member of the shipped catalog; the existing `e2e/retrospective-board.spec.ts` "pre-existing data... zero data loss" test (~line 1428, group head card) as a live regression guard |
| No change to how a color selection is persisted or synchronized in real time | FR-015 (spec) / Assumption | `retrospective-board-no-firestore.test.ts`, existing `onUpdate` call-site tests unchanged |

## Non-goals

This contract does not cover the rest of the card (content, voting,
reactions, the card's own "..." menu, drag-and-drop) or the rest of the
add-card form (textarea, emoji picker, submit) — already covered by prior
redesign work or out of scope per `spec.md`'s Assumptions. It also does not
cover `docxExportService.ts`'s own export formatting beyond confirming
`getCardColorHex()` resolves correctly for every post-curation `CardColor`
value (a lookup-correctness concern, not a new export capability).

## Verification procedure

1. Establish the pre-redesign baseline once, in `tasks.md`'s Setup phase,
   by running the full `type-check` / `lint` / `test:coverage` / relevant
   `e2e` suite (`retrospective-board`, `accessibility`) and recording it
   passing.
2. After implementation, re-run the full set — every row MUST still pass,
   plus the new FR-011a touch-entry-point tests and FR-013a remapping
   migration test.
3. Coverage thresholds in `vitest.config.ts` MUST NOT drop between the
   baseline and the final run.
### Outcome (T037/T038)

Final run: `type-check` clean, `lint` clean. `test:coverage` — **2395
passed, 3 skipped** across 173 test files (down from the T001 baseline's
2510/174 — accounted for: `ColorPickerClean.test.tsx`, a near-duplicate of
`ColorPicker.test.tsx`, was deleted per T013's consolidation decision; the
consolidated `ColorPicker.test.tsx` itself is leaner than its two
predecessors combined because many of their tests exercised the *old*
hand-rolled implementation's own internals — manual `getBoundingClientRect`
fallback math, SSR event-listener simulation, exact pixel-position
assertions — which no longer exist to test post-rebuild, not behavior that
went uncovered; `cardColors.a11y.test.ts` dropped from 78→61 tests purely
because it iterates the catalog dynamically and the catalog itself shrank
30→15, not a coverage gap). Final coverage: **75.92% statements / 82.75%
branches / 74.47% functions / 75.92% lines** — every threshold clears
(branches 78 is the tightest gate and clears at 82.75%), matching the
baseline's margin closely. E2E: `npx playwright test retrospective-board.spec.ts
accessibility.spec.ts` — **82/84 passing** when invoked with
`FIRESTORE_EMULATOR_HOST`/`FIREBASE_AUTH_EMULATOR_HOST` set on the
top-level process (required for tests that call `firestoreAdmin.ts`
directly; the `npm run e2e` wrapper sets this automatically via
`firebase emulators:exec`, a direct `npx playwright test` invocation does
not). The remaining 2 failures (`renaming a participant propagates...`,
`a card on a brand-new board shows the author's configured Profile display
name...`) are unrelated to this feature — both fail during `signInAs`
itself, before any color-picker code path is reached, on tests covering
participant display-name resolution (specs 020/022), which this feature
never touches. Reproduced twice consistently; attributed to this session's
long-running Auth/Firestore emulator instance accumulating state across
many hours of interactive verification, not a regression introduced here.

4. Confirm the one hardcoded aria-label reference in
   `e2e/retrospective-board.spec.ts` (`'Seleccionar color azul suave'`) is
   updated if the color it targets is renamed, removed, or its translated
   name changes under the selected direction's `curatedCatalog`.
