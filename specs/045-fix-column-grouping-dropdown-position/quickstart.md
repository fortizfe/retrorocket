# Quickstart: Validating the Column Grouping Menu Positioning Fix

## Prerequisites

- Repo checked out on branch `045-fix-column-grouping-dropdown-position`.
- Dependencies installed: `cd retro-rocket && npm install` (if not already).

## 1. Automated verification (primary)

Run the unit test suite scoped to the fixed component:

```sh
cd retro-rocket
npx vitest run --config vitest.config.ts src/test/features/boards/clustering/ColumnHeaderMenu.test.tsx
```

**Expected outcome**: All tests pass, including the new/updated test asserting the grouping-mode menu's floating wrapper node (carrying Floating UI's `ref`/`style`) is structurally separate from the animated `motion.div` (carrying Framer Motion's `initial`/`animate`/`exit`) — mirroring the already-passing assertion for the suggestions-panel block in the same file.

Run the full suite with coverage to confirm the 80% floor (Constitution Principle VI) is unaffected:

```sh
npm run test:coverage
```

## 2. Manual / visual verification

1. Start the dev server: `npm run dev` (or `npm run dev:all` if backend-dependent features are also needed).
2. Open the app and navigate to a retrospective board with multiple columns (create one if needed, or use an existing seeded board).
3. Scroll the board so a column is **not** in the top-left area of the viewport (e.g. a middle or right-hand column, or scroll the page down).
4. Click that column's grouping control (the button showing the current grouping icon + chevron in the column header).
5. **Expected**: The grouping menu (None / By author / By color / Suggestions) opens immediately adjacent to the button that was clicked — not at the top-left corner of the screen.
6. Repeat near the right edge of the viewport and confirm the menu flips/shifts to remain fully visible (no clipping).
7. Open the menu on one column, then open it on a different column — confirm the first menu closes and the new one anchors to the newly clicked button.
8. Select a grouping option from the (now correctly positioned) menu and confirm the column's cards regroup exactly as before — behavior is unchanged, only position.

## 3. Regression check on sibling popups

Since the fix reuses a pattern already applied elsewhere, spot-check that these still work correctly (no shared-code regression expected, but confirms consistency):

- The same column header's AI suggestions panel (already fixed under spec 044).
- A card's actions menu (already fixed under spec 039).
- The facilitator/options menu (already fixed under spec 034).
- A card's color picker (already fixed under spec 037).

All four should continue to open anchored to their respective triggers, identical to before this change.
