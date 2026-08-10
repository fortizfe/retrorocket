# Quickstart: Validate Neutral Default Card Color

## Prerequisites

- Repo checked out on branch `035-neutral-card-default-color`, dependencies installed (`npm install` in `retro-rocket/`).
- Implementation complete per `tasks.md` (this guide validates the finished feature, it does not implement it).

## 1. Unit tests

```bash
cd retro-rocket
npm run test:run -- src/test/features/boards/clustering/GroupableColumn.test.tsx
```

**Expected**: All tests pass, including the updated assertions that the add-card form pre-selects and resets to the neutral default color (`pastelWhite`) rather than a column-derived color.

Also confirm the untouched utility suites still pass (they document — but no longer drive — the column→color mapping):

```bash
npm run test:run -- src/test/lib/utils/cardColors.test.ts src/test/integration/boardTemplateIntegration.test.tsx
```

## 2. Manual / browser validation (golden path)

```bash
npm run dev
```

1. Open a retrospective board with the default template ("Qué funcionó bien" / "Problemas encontrados" / "Acciones a tomar", or an English equivalent).
2. Click "Add card" in the **green-default column** ("went well"). Before typing anything, open the color picker — confirm the pre-selected swatch is the neutral/white swatch, not green.
3. Type some content and submit **without** touching the color picker. Confirm the created card has a neutral/white background, not green.
4. Repeat step 2–3 in the **red-default column** ("went wrong" / "hindered") and the **yellow-default column** ("action items" / "improve"). Confirm both also produce neutral-background cards by default.
5. Click "Add card" again in any column, submit a second card without touching the picker. Confirm it is also neutral (not carrying over any prior manual selection).

## 3. Manual override still works (regression check)

1. Click "Add card" in any column, manually select a non-default color (e.g. blue) from the color picker, then submit.
2. Confirm the created card has the manually chosen color (blue), proving the picker itself is unaffected.
3. Edit an existing card's color via its own color picker; confirm it still changes as before.

## 4. Existing data unaffected (regression check)

1. Open a board that already has cards created before this change (or seed one via existing fixtures/tests).
2. Confirm those cards' colors are unchanged — this feature only affects the default shown at creation time, never existing persisted data.

## Success criteria mapping

- Step 2–4 validate **SC-001** (100% of new cards default to neutral, regardless of column).
- Step 3 of "Manual override still works" validates **SC-002** (manual selection still succeeds in 100% of cases).
- Step 4 validates **SC-003** (no existing card's stored color changes).
