# Quickstart: Validating the Retro Board Bug Fixes

This guide lets a reviewer confirm, end-to-end, that all four fixes in this feature work — without reading implementation code. Run from the `retro-rocket/` project directory.

## Prerequisites

- Node.js and project dependencies installed (`npm install` in `retro-rocket/`).
- Firebase CLI available (already a project dev dependency) for the local emulators the E2E suite drives.
- A `.env`/local config with Firebase project credentials, as already required for local development (unchanged by this feature).

## 1. Automated validation (primary signal)

```bash
cd retro-rocket

# Unit/component tests (Vitest) — covers the new/changed contracts in
# GroupableColumn, NotesTab, useBoardMenuOverlay consumers, useTypingStatus,
# OptimizedTypingStatusService (Contracts 1–4).
npm run test -- --coverage

# Full Playwright E2E suite, including the two specs this feature must fix:
#   - "a facilitator note is never visible to another participant's session" (Contract 3)
#   - "a typing indicator appears live ... and clears after typing stops" (Contract 4)
npm run e2e
```

**Expected outcome (SC-005)**: run the `npm run e2e` command at least 5 times consecutively; all runs pass with zero failures and zero flaky retries on `e2e/retrospective-board.spec.ts`.

## 2. Manual validation — User Story 1 (menu anchoring)

1. Open a retrospective board in a browser at a comfortable desktop width.
2. Click the "Opciones" (options) button in the top bar. **Expect**: the menu panel appears directly below that button, not at the top-left of the screen.
3. Scroll the page down slightly, then click the options button again. **Expect**: the panel still opens anchored below the (now-repositioned) button.
4. Resize the browser window narrower/shorter while the menu is open. **Expect**: the panel stays anchored to the button (or flips above it if there's no room below), never detaching to the corner.
5. Repeat steps 2–4 for the facilitator menu button (visible to the board's owner/facilitator).

## 3. Manual validation — User Story 2 (column headers)

1. Open a board with columns that have long titles and/or many cards.
2. **Expect**: each column header shows, top to bottom: (row 1) icon + full title + card count [+ groups badge if grouped], (row 2) the column's subtitle/description if one is configured, (row 3) the group button and the add button together.
3. Confirm the title is fully readable — not truncated behind the buttons — at both a wide desktop width and the narrowest supported viewport (use browser dev tools device emulation).
4. Open a column that has no configured subtitle. **Expect**: no empty gap where row 2 would have been.

## 4. Manual validation — User Story 3 (private note save)

1. As the board's facilitator, open the facilitator menu → Notes tab.
2. Click "Nueva nota" (or equivalent), type some text, and click "Guardar".
3. **Expect**: the text transitions smoothly from the editable textarea to the saved, read-only note — at no point do both appear on screen together (watch closely around the save click; this is a fast transition).
4. Repeat several times in quick succession (save, save, save) to increase the chance of catching a regression, per the Edge Cases in spec.md.

## 5. Manual validation — User Story 4 (typing indicator)

1. Open the same board in two browser sessions (e.g. one normal window, one incognito), signed in as two different participants.
2. In session A, start typing in one column's "add card" textarea without submitting. **Expect**: session B sees a "... está escribiendo" indicator for that column.
3. Switch to typing in a different column in session A (cancel the first, open the second). **Expect**: session B's indicator moves to the new column and the old column's indicator disappears — never both showing indefinitely.
4. Stop typing entirely in session A. **Expect**: within a few seconds, session B's indicator disappears and does not reappear on its own.

## Reference

- Full behavioral contracts: [contracts/ui-behavior-contracts.md](./contracts/ui-behavior-contracts.md)
- Entity/state details: [data-model.md](./data-model.md)
- Root-cause findings and rejected alternatives: [research.md](./research.md)
