# Quickstart: Validate Suggested-Grouping Card Loss Fix

Prerequisites: repo installed (`npm install` at repo root of `retro-rocket/`), a Firestore project configured for local dev per existing project setup (unchanged by this feature).

## 1. Automated regression checks

```bash
# Backend: column derivation + self-heal repair
npm run test:server -- CardGrouping GetBoardState

# Frontend: accept-suggestion flow no longer sends column; failure shows a toast
npm run test:run -- useCardGroups GroupableColumn

# Full suites (coverage floor gate, per constitution)
npm run test:server:coverage
npm run test:coverage
```

Expected: all pass, coverage floor (80% branches/functions/lines/statements) maintained.

## 2. Manual validation — new group formation (FR-001–FR-005)

1. `npm run dev:server` and `npm run dev` (or the project's existing combined dev command).
2. Open a retrospective board, add 3+ cards with similar wording to one column.
3. Open that column's "Suggestions" menu, wait for a proposed grouping.
4. Accept the suggestion.
5. **Expected**: all cards from the suggestion are immediately visible, shown together as a group in the same column — none disappear. Card count for the column is unchanged (grouped, not lost).
6. Open the same board in a second browser/incognito session as another participant.
7. **Expected**: the new group and its cards are visible there too, without a manual refresh.
8. Reload the first browser tab.
9. **Expected**: the group is still visible, still correctly placed in its column.
10. Try group actions (collapse/expand, remove a member card, disband) on the new group.
11. **Expected**: identical behavior to a group created via any other existing method.

## 3. Manual validation — failure feedback (FR-007a)

1. Temporarily force the group-creation request to fail (e.g., stop the local backend mid-request, or use browser devtools to block the `POST /api/retrospectives/:id/groups` request).
2. Accept a suggestion.
3. **Expected**: a visible error toast appears; the cards remain visible and ungrouped; the suggestion can be retried once the backend/network is restored.

## 4. Manual validation — repairing pre-existing broken data (FR-009, SC-005)

1. Using a Firestore console (or the local emulator's UI) on a **pre-fix** environment/backup, manually create a `groups` document with `column: ''` and a `headCardId` pointing at a real card in some column, then set that card's (and any member cards') `groupId` to the new group's id — reproducing the exact broken state this bug produced.
2. Deploy/run the fixed code.
3. Load that retrospective's board (any participant, once).
4. **Expected**: the previously invisible cards now appear, grouped, in their correct column — no manual action beyond opening the board was required.
5. Re-inspect the `groups` document in Firestore.
6. **Expected**: its `column` field now matches the head card's actual `column` (persisted, not just corrected in the UI).

## Out of scope for this quickstart

Suggestion generation, scoring, and the suggestions-panel UI (spec 044) are unchanged — no need to re-validate them here.
