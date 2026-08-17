# Quickstart: Validating Column-Scoped Suggested Grouping

Prerequisites: repo checked out on `049-column-scoped-suggested-grouping`, dependencies installed (`npm install` inside `retro-rocket/`), Firebase emulators available for E2E. No new model download is required — the fix only changes which cards are handed to the existing on-device embedding pipeline.

## 1. Automated checks

```bash
# Frontend unit tests
npm run test:run

# Frontend coverage gate (Constitution VI)
npm run test:coverage

# E2E (Constitution VII) — requires the Firestore/Auth emulators
npm run e2e
```

New/changed test files per `plan.md`'s Project Structure section:
- `src/test/features/boards/clustering/useCardGroups.test.ts` (modified — see `contracts/column-scoped-suggestion-generation-contract.md` for the exact assertions: single-column filtering, zero/one-card column, two independent calls not cross-contaminating)
- `e2e/retrospective-board.spec.ts` (extended — see §2 below)

## 2. Manual validation — User Story 1 & 2 (scoped analysis, other columns untouched)

1. Start the dev server against the Firestore emulator or a real project via `.env.local`.
2. Create a retrospective board and add distinct, clearly-different ungrouped cards to at least two columns — e.g. 3 cards about standup meetings in "Went Well" (Column A) and 3 unrelated cards about deployment issues in "To Improve" (Column B).
3. Set Column B to "Group by author" (or leave it at "No grouping") and note its current card order.
4. On Column A, open the grouping-mode menu and select "Suggestions."
5. Confirm Column A's suggestions panel opens and shows proposed groups whose cards are all standup-related (i.e., all from Column A) — no deployment-related card from Column B appears in any proposed group.
6. While Column A's panel is loading/showing suggestions, confirm Column B shows no loading indicator, no suggestions panel, and its card order/mode is exactly what it was in step 3.
7. Accept one of Column A's proposed groups and confirm the resulting group's member cards are all Column A cards.
8. Repeat steps 4-7, but this time also switch Column B to "Suggestions" afterward (with Column A now holding an accepted group). Confirm Column B's own suggestions only reference Column B's (deployment-related) cards, and Column A's already-accepted group and remaining cards are unaffected by Column B's trigger.
9. With both columns' suggestions generated close together (e.g., trigger Column A, then immediately trigger Column B before the first finishes), confirm each panel still only ever shows that column's own cards once both resolve.

## 3. Regression check — unrelated behavior unchanged

- Per-suggestion inline-editable titles (spec 047) still populate and are editable exactly as before, per suggested group.
- Switching a column away from "Suggestions" still dissolves that column's accepted groups and re-sorts its cards per the newly selected mode (spec 047, US2) — unaffected by this fix.
- The similarity badge/label per proposed group (High/Medium/Low) is unaffected.
- Run the full Playwright suite (`npx playwright test`), not just the new/changed spec, to confirm no unrelated regression.
- `grep -rn "findSuggestions" retro-rocket/src` should show every call site passing a `columnId` as the first argument, with no remaining no-argument call.
