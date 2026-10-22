# Quickstart & Validation: Drag-to-Group Cards with Inline Group Title Editing

**Feature**: 059-drag-to-group-cards | **Spec**: [spec.md](./spec.md) | Contracts: [group-api.md](./contracts/group-api.md), [drag-group-ui.md](./contracts/drag-group-ui.md)

## What it does (for end users)

You can now group cards in a retrospective column by dragging one onto another.

- **Group two cards**: drag a card and hold it over the middle of another card in the same column. When the target lifts and shows "Drop to group", release. A new group appears **in the target card's place** with its title ready to type; type a name and press Enter, or just press Enter to keep "New group".
- **Reorder instead**: drop near the top or bottom edge of a card, where a thin line shows the insertion point, to just move it.
- **Add to a group**: drag a card onto the middle of an existing group and hold until it shows "Drop to group". Dropping on a group's top or bottom edge places the card before or after it instead.
- **Take a card out or move it**: drag a card that's inside a group to a spot in the column to take it out, or onto another group to move it there. A group left with a single card is undone automatically.
- **Rename a group**: click its title (or Tab to it and press Enter), type, then press Enter. Escape cancels. Clearing the title brings back "New group".
- **Without a mouse**: open the card's **Group with…** button (or **Move to group…** for a card already in a group, which also offers **Remove from group**) and pick a card or group from the list. While keyboard-dragging (Space, then the arrow keys), press **G** to switch between moving and grouping.
- Cards never move to another column this way. In a column set to **Group by user**, drag-to-group is turned off.
- If you switch a column away from **AI suggestions** and it has groups you made by hand, you're asked to confirm first, because switching undoes all of that column's groups.

## Prerequisites

```bash
cd retro-rocket
npm install   # frontend and server share one package.json
```

You need the Firebase emulators (auth and firestore) for the server adapter tests and E2E, as for the rest of the suite.

## Automated validation

| Step | Command | Expect |
|---|---|---|
| Types + lint | `npm run type-check && npm run type-check:server && npm run lint` (in `retro-rocket/`) | 0 errors |
| Frontend unit/component | `npm run test:run -- src/test/features/boards/clustering src/test/features/boards/retrospective` | Green; covers contract B1–B9, D1–D7, K1–K5, T1–T9, G1–G7, S1–S4, X1 |
| Coverage floor | `npm run test:coverage && npm run test:server:coverage` | At least 80% on all four metrics, with no threshold change |
| Server | `npm run test:server -- CardGrouping FirestoreCardGroupAdapter retrospectives` | Green; covers C0 M1–M7 (every source × target), C1 P1–P6, C2/C2b, C3 partial PATCH, C4 R1–R3, invariants I1–I5 |
| E2E | `firebase emulators:exec --only auth,firestore "npx playwright test --project=chromium card-grouping-dnd accessibility"` (the `e2e` npm script can't take spec names) | Green; axe reports 0 WCAG 2.1 AA violations on the armed target, title editor and picker, in light and dark themes |

## Manual validation scenarios

Run `npm run emulators` and `npm run dev:all` (frontend + server against the emulators). Open one board in **two browsers**, A and B, as different participants, with column "What went well" in mode **No grouping**.

1. **Create by drag (Story 1)**: in A, add cards "Pairing helped" and "Pair reviews". Drag the first onto the middle of the second and hold for about 0.2 s. The target lifts, gets an accent outline and shows **Drop to group**. Release.
   - In A, a group appears **in the second card's position** (the column doesn't jump), with "New group" selected for editing.
   - In B, the group appears within 1 s and is **not** in edit mode.
2. **Fast fly-over (SC-002)**: drag a card quickly across another card's middle without stopping, and release on an edge. It reorders, and no group is created.
3. **Rename (Story 2)**: in A, type "Pairing" and press Enter. B shows "Pairing" within 1 s.
   - Click the title again, type "x", press Escape. The title stays "Pairing".
   - Clear the title and press Enter. It shows "New group" (and "Nuevo grupo" in a browser set to Spanish).
4. **Add to group (Story 3)**: drag a third card onto the group header and hold, then release. The card animates in as the last member, and the header totals include its votes and likes.
5. **Cross-column (Story 4)**: drag a card over "What didn't go well". The cursor shows not-allowed and that column shows no indicator. Release there: the card springs back, and nothing changes in either browser.
6. **By user (Story 4)**: switch the column to **Group by user**. Dragging onto a card's middle shows no grouping feedback, and **Group with…** isn't offered.
7. **Keyboard only (Story 5)**: Tab to a card's **Group with…** button, press Enter, choose a card with the arrow keys, press Enter. A group is created and its title input is focused.
   - Keyboard drag: Tab to a drag handle, press Space, press an arrow key, press **G**. A screen reader (VoiceOver) announces "…Drop to create a group with both cards." Press Space and the group is created.
8. **Concurrency (FR-022–FR-024)**: in A, start dragging card X over card Y. Meanwhile, in B, delete Y. Release in A. A shows "That card or group changed. Nothing was grouped." and X stays ungrouped. Reload: no group references Y.
9. **Drag out & move (Story 6)**: make group G1 with 3 cards and G2 with 2 cards. Drag a G1 member to a gap between ungrouped cards: it becomes independent there, and G1 keeps 2 cards. Drag a G2 card onto G1's middle and release: it moves into G1, G2 is left with 1 card and dissolves, and the remaining card takes G2's slot. Both browsers match.
10. **Mode-switch safeguard (FR-033)**: switch the column to **AI suggestions**, then back to **No grouping**. The confirmation lists how many groups will be undone. Press Cancel: the mode stays on suggestions and the groups remain. Repeat and confirm: the groups are undone.
11. **Interleaved order persists**: reorder a card between two groups, then reload both browsers. The order is identical.
12. **Reduced motion**: with OS "Reduce motion" on, the armed target shows the outline, surface and badge with no scale or spring.

## Done when

- [ ] Every automated step above is green.
- [ ] Manual scenarios 1–12 pass in Chrome and Safari, light and dark themes.
- [ ] The PR description lists the Principle IX skills used (`animate`, `apple-design`, `emil-design-eng`, `review-animations`).
- [ ] The in-app Getting Started guide (057) gets a short "Group cards by dragging" entry. Hand it to docs-agent.
- [x] Performance (T078), measured by `ColumnDndProvider.perf.test.tsx` on a column of 18 cards + 2 groups (22 cards rendered): a burst of 60 `onDragMove` frames inside one zone caused 0 item re-renders; an armed-card to armed-card transition re-rendered exactly 2 items (the old and the new target, 1 render each); card to group re-rendered the old card and the group's cards once each. Before the fix (feedback in the context value) the same transition re-rendered every card of the column. Feedback now lives in a per-column `DragFeedbackStore` read through `useItemDragFeedback`.
