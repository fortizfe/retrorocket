# Quickstart: Validating Suggested Grouping Refinements

Prerequisites: repo checked out on `047-suggested-grouping-refinements`, dependencies installed (`npm install` inside `retro-rocket/`), Firebase emulators available for E2E. No new model download is required (`research.md` §1 — title generation is a pure client-side function, not a second on-device model).

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
- `src/test/features/boards/clustering/groupTitleService.test.ts` (new — see `contracts/group-title-suggestion-contract.md`)
- `src/test/features/boards/clustering/semanticGroupingService.test.ts` (modified — asserts each returned `GroupSuggestion` carries a `suggestedTitle`)
- `src/test/features/boards/clustering/GroupSuggestionModal.test.tsx` (modified — inline-editable title input, `maxLength=35`, per-suggestion edit isolation, edit discarded on reject)
- `src/test/features/boards/clustering/useCardGroups.test.ts` (modified — `acceptSuggestion` passes title through to `createGroup`)
- `src/test/features/boards/clustering/GroupableColumn.test.tsx` (modified — accept-flow title branches; mode-switch teardown per `contracts/grouping-mode-switch-teardown-contract.md`)
- `e2e/retrospective-board.spec.ts` (extended — see §2/§3 below)

## 2. Manual validation — User Story 1 (suggested, editable title)

1. Start the dev server against the Firestore emulator or a real project via `.env.local`.
2. In one column, add 3+ cards describing the same underlying topic in varied wording (e.g. "La reunión diaria se alarga demasiado", "Perdemos mucho tiempo en el standup", "El daily dura casi 40 minutos").
3. Open "Suggestions" on that column and confirm the proposed group displays a short title (≤35 characters) alongside the member cards, at the same time the group itself appears (no separate loading step for the title).
4. Click into the title and try typing/pasting a very long string — confirm it stops accepting characters at 35.
5. Edit the title to something custom, then accept the group — open the resulting `GroupCard` and confirm it shows your edited title.
6. Repeat, but leave the title unedited on a second proposed group — accept it and confirm the group's title matches what the panel showed.
7. With two or more proposed groups visible at once, edit one's title and confirm the other's title is untouched.
8. Edit a proposed group's title, then click "Discard" on it instead of accepting — confirm the group disappears with no trace of the edit (e.g. re-running suggestions on the same cards shows a fresh, unedited suggestion).
9. Edit a proposed group's title down to blank/spaces-only and accept it — confirm the resulting group's title reads "Group N" / "Grupo N" (N = its position among that column's groups), not blank.

## 3. Manual validation — User Story 2 (mode switch dissolves groups)

1. In a column, accept at least one suggested group (per §2 above), so the column has one or more `GroupCard`s visible plus some ungrouped cards.
2. Open the grouping-mode menu on that column and select "No grouping". Confirm the previously-accepted group is gone and *all* the column's cards (formerly grouped and formerly ungrouped) now render individually, exactly like a column that was never grouped.
3. Repeat from a fresh "Suggestions" acceptance, this time switching to "Group by author" instead. Confirm the group is gone and its cards are now sorted into author-based groups alongside the column's other cards.
4. Open "Suggestions" again, let the panel populate with proposed (not-yet-accepted) groups, then switch the mode to "No grouping" *without* accepting or rejecting anything. Confirm the panel closes and no leftover suggestion state reappears if you reopen "Suggestions" later.
5. With a column that has accepted groups, open the same board in a second browser/tab as a different participant. Switch the mode away from "Suggestions" in the first tab and confirm the second tab's view updates to match (groups dissolve, cards re-sort) without a manual refresh.
6. Switch a column directly between "No grouping" and "Group by author" (never touching "Suggestions") and confirm behavior is unchanged from before this feature — cards simply re-sort, no groups exist to dissolve.

## 4. Regression check — unrelated behavior unchanged

- Grouping-suggestions panel positioning/anchoring (spec 044/045) is unaffected — spot-check it still opens anchored to its trigger button.
- The similarity badge/label per proposed group (High/Medium/Low) is unaffected.
- A card's own votes/likes/reactions survive a mode-switch teardown unchanged — check one before and after dissolving its group.
- Run the full Playwright suite (`npx playwright test`), not just the new/changed spec, to confirm no unrelated regression.
- `grep -rn "suggestedTitle" retro-rocket/src` should show the new field used consistently (type, service, component, tests) with no stray/duplicate naming.
