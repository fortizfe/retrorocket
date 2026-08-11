# Quickstart: Validating the Card Actions Menu Positioning Fix

Prerequisites: repo checked out on `039-fix-card-menu-position`, dependencies installed (`npm install` inside `retro-rocket/`), Firebase emulators available (`firebase-tools` is already a devDependency) for E2E.

## 1. Automated checks

```bash
# Frontend unit tests (CardMenu structural regression test)
npm run test:run

# Frontend coverage gate (Constitution VI — must stay at/above vitest.config.ts thresholds)
npm run test:coverage

# E2E (Constitution VII) — requires the Firestore/Auth emulators
npm run e2e
```

All of the above must pass before this feature is considered done. New/changed test files per `plan.md`'s Project Structure section:
- `src/test/features/boards/retrospective/CardMenu.test.tsx` (modified — adds the structural test asserting the positioning wrapper and the animated wrapper are distinct DOM nodes; per `research.md` §4, confirm this test fails against the pre-fix single-node implementation before the fix lands)
- `e2e/retrospective-board.spec.ts` (modified — adds UI-driven coverage that opens `CardMenu` via its trigger button and asserts the panel's bounding box is anchored to the trigger's, distinct from the existing REST-only convert-to-action-item test)

## 2. Manual validation — User Story 1 (menu opens next to the card it belongs to)

1. Start the dev server (`npm run dev:server` in one terminal, `npm run dev` in another) against the Firestore emulator (`npm run emulators`), or against a real project via `.env.local`.
2. Sign in as a facilitator (or any role for which `canConvertToAction` is true) and open a retrospective board with several columns and enough cards to require scrolling.
3. Click the actions-menu trigger (the "⋮" icon in a card's footer, bottom-right) on a card positioned away from the top-left of the screen — e.g. the last card in the rightmost column, or a card below the fold.
4. Confirm the menu panel opens immediately adjacent to that trigger button, not at the top-left corner of the screen — this is the core reported defect (spec.md User Story 1, Acceptance Scenario 1).
5. Close the menu, scroll the page, and repeat step 3–4 on a different card to confirm the fix isn't position-specific.

## 3. Manual validation — scroll and viewport-edge behavior (Edge Cases, Acceptance Scenario 2 & 4)

1. Scroll the board down or sideways before opening a card's actions menu. Confirm the menu opens next to the trigger's *current* on-screen position, not where it would have been unscrolled.
2. Open the actions menu on a card whose trigger sits near the bottom or right edge of the viewport. Confirm the panel flips or shifts so it remains fully visible — no clipped or off-screen content.
3. With a menu already open on one card, click the actions-menu trigger on a different card. Confirm the first menu closes and the new one anchors to the newly clicked trigger (Acceptance Scenario 3).

## 4. Regression check — unrelated behavior unchanged

- The menu's content (assignee `<select>`, due-date picker, convert/cancel buttons) and the resulting `onConvertToAction` call are unchanged — confirm assigning a responsible participant and due date, then clicking "Convertir", still creates the action item as before.
- Keyboard operability: open the menu via keyboard (Tab to the trigger, Enter/Space to open), confirm focus moves into the panel (`FloatingFocusManager`) and Escape closes it and returns focus to the trigger — unchanged from today (Constitution VIII).
- The four other `useBoardMenuOverlay` consumers (options menu, facilitator menu, color picker, column-grouping menu) are unaffected — spot-check that each still opens anchored to its own trigger, since `useBoardMenuOverlay.ts` itself is not modified by this feature.
- Run the full Playwright suite (`npx playwright test`), not just the new/changed spec, to confirm no unrelated regression — consistent with feature 034's own verification practice (`specs/034-fix-retro-board-bugs/tasks.md` T020).
