# Quickstart: Validating the Card Owner Action Hub

**Feature**: 058-card-owner-action-hub | **Date**: 2026-10-12

This guide checks, end to end, that a card's owner reaches edit, colour and delete from one always-visible control, and that nobody else sees it. For component and ARIA details see [contracts/owner-action-menu.md](./contracts/owner-action-menu.md). For states see [data-model.md](./data-model.md).

## Prerequisites

```bash
cd retro-rocket
npm install
npm run dev:all        # web (vite) + api (vite-node) — or use the Firebase emulators for e2e
```

You need two signed-in identities, for example two browser profiles: **A** is the facilitator and creates the board, **B** joins it.

## Automated checks

```bash
cd retro-rocket
npm run type-check && npm run lint
npm run test:run -- OwnerActionMenu DraggableCard CardFooter postDeleteFocus cardColors.a11y
npm run test:coverage   # 80% floor must hold; OwnerActionMenu ≥ 80% (SC-011)
npm run e2e             # includes the new card-owner-actions + axe scenarios
```

Expected: all green. `cardColors.a11y` reports the trigger icon at ≥ 4.5:1 on 15/15 colours in light **and** dark themes (SC-004).

## Manual scenarios

| # | Steps | Expected | Spec |
|---|---|---|---|
| 1 | As **B**, add a card. Look at it without hovering. | Exactly one owner trigger in the footer (settings icon). No colour chip in the top-right corner. No pencil or bin buttons. | US1-1, FR-001–003, SC-001 |
| 2 | As **B**, look at **A**'s cards. | No owner trigger, no colour control, no edit or delete. | FR-001, SC-002 |
| 3 | Open the trigger on your card. Pick a different colour. | The card repaints at once. The panel closes. Focus goes back to the trigger. **A** sees the new colour live. A screen reader announces "Colour changed to …". | US1-3, FR-008, FR-020 |
| 4 | Open the trigger. Choose **Edit card**, then **Cancel**. | Edit mode shows only Save and Cancel, with no trigger. After Cancel, the trigger is back and focused. | US1-4/5, FR-004, FR-009 |
| 5 | Double-click your card's text. | Nothing happens; edit mode does not start. | FR-009 (clarification Q4) |
| 6 | Open the trigger. Choose **Delete card**, then **Cancel**. | The confirmation appears inside the panel. Cancel returns to the option list. The card is still there. | US1-6/8, FR-010, SC-003 |
| 7 | Column has 3 cards. Delete the **middle** card (Confirm). | Busy state, then the exit animation. Focus moves to the card that was below it. | US1-7, FR-011/012 |
| 8 | Delete the **last** remaining card in a column. | Focus moves to that column's "Add card" button. | FR-012 |
| 9 | DevTools → Network → offline. Try to delete, then to change colour. | Delete: the card stays, the panel returns to the confirmation, and an error toast appears. Colour: it reverts and an error toast appears. Nothing fails silently. | Edge cases, FR-008/011 |
| 10 | Double-click **Confirm** quickly. | Only one DELETE request is sent (Network tab). | Edge "Repeated activation" |
| 11 | As **A** (facilitator), look at your own card and at one of **B**'s. | Own card: owner trigger **and** ⋮ convert-to-action, with different icons. B's card: only ⋮. Converting works as before. | US2, FR-005, FR-016, SC-010 |
| 12 | As **A**, group two of **B**'s cards. As **B**, look at the group's member cards. | B's grouped cards show the owner trigger and it works. In grouping/selection mode, and in the grouping-suggestions preview, no trigger is shown. | Clarification Q3, edge "Editing not allowed" |
| 13 | As **B**, open the panel. As **A**, start grouping mode. | B's panel closes and the trigger disappears. | Edge "Editing becomes disallowed" |
| 14 | Turn on anonymous mode. | Author names are hidden. The trigger still shows only on your own cards. | US1 (anonymous), edge "Anonymous board" |
| 15 | Keyboard only: Tab to the trigger → Enter → arrows → Space on a swatch. Reopen → Delete → Escape. | Visible focus ring. Focus lands on "Edit card". Arrows move through the items and the 5×3 grid. Escape closes and returns focus to the trigger. | FR-018/019, SC-009 |
| 16 | Viewport 375px (mobile emulation): measure the trigger and the menu items. | Trigger 44×44px. Items ≥ 44px tall. Panel fits on screen, ≤ 90vh. | US3-2, FR-022, SC-005 |
| 17 | Viewport ≥ 768px: open the panel on a card near the top or right edge. | Trigger ≥ 36×36px. The panel flips or shifts to stay fully visible. | US3-3, FR-014 |
| 18 | OS setting "Reduce motion" on. Open and close the panel; delete a card. | No movement, only a fade or instant change. No layout shift (Performance panel → Layout Shifts = 0). | US3-4, FR-023/024, SC-006 |
| 19 | Dark theme: repeat 1 and 15. | The trigger icon and focus ring are clearly visible on all card colours. | FR-021 |

## Done when

- [ ] All automated checks pass and coverage thresholds hold.
- [ ] Manual scenarios 1–19 behave as described.
- [ ] axe reports 0 violations with the panel closed, open and confirming delete (SC-007).
- [ ] The PR description lists the Apple-design skills used (`animate`, `apple-design`/`emil-design-eng`, `review-animations`), as required by Principle IX.
