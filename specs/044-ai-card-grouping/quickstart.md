# Quickstart: Validating AI Card Grouping

Prerequisites: repo checked out on `044-ai-card-grouping`, dependencies installed (`npm install` inside `retro-rocket/`), Firebase emulators available for E2E, and a network connection available at least once (to download the on-device embedding model on first use, same as the existing sentiment feature).

## 1. Automated checks

```bash
# Frontend unit tests (grouping service, embedding worker, panel positioning)
npm run test:run

# Frontend coverage gate (Constitution VI — must stay at/above vitest.config.ts thresholds)
npm run test:coverage

# E2E (Constitution VII) — requires the Firestore/Auth emulators
npm run e2e
```

New/changed test files per `plan.md`'s Project Structure section:
- `src/test/features/boards/clustering/embeddingWorker.test.ts` (new — one-vector-per-input batching, mirroring `sentimentWorker.contract.test.ts`)
- `src/test/features/boards/clustering/useEmbeddingWorkerManager.test.ts` (new — mirroring `useWorkerManager.test.ts`)
- `src/test/features/boards/clustering/semanticGroupingService.test.ts` (new, replaces the deleted `similarityService.test.ts` — see `contracts/ai-grouping-service-contract.md` for the cases it must cover)
- `src/test/features/boards/clustering/GroupSuggestionModal.test.tsx` / `ColumnHeaderMenu.test.tsx` (modified — anchored-positioning assertions per `contracts/anchored-suggestions-panel-contract.md`, and removal of assertions on the deleted `algorithm`/`keywords` fields)
- `src/test/features/boards/clustering/useCardGroups.test.ts` (modified — `findSuggestions` is now async)
- `e2e/retrospective-board.spec.ts` (new coverage — there is currently none for this flow, `research.md` §9)

## 2. Manual validation — User Story 1 (panel opens next to its button)

1. Start the dev server (`npm run dev:server` in one terminal, `npm run dev` in another) against the Firestore emulator, or a real project via `.env.local`.
2. Open a retrospective board with several columns and enough cards in one column to require scrolling.
3. Click the grouping-mode button (`LayoutGrid` icon) on a column positioned away from the top-left of the screen — e.g. the last column on the right, or after scrolling down.
4. Select "Suggestions" from the dropdown.
5. Confirm the suggestions panel opens immediately adjacent to that same button, not pinned to the top-left corner of the screen — this is the core reported defect (spec.md User Story 1, Acceptance Scenario 1).
6. Repeat near a viewport edge (rightmost column, or after scrolling so the button sits near the bottom of the window) and confirm the panel flips/shifts to stay fully visible (Acceptance Scenario 2).
7. With the panel open, scroll or resize the window and confirm it stays anchored to the button (Acceptance Scenario 3).

## 3. Manual validation — User Story 2 (AI-based grouping quality)

1. In one column, add several cards describing the same underlying topic using different wording (no shared keywords) — e.g. "La reunión diaria se alarga demasiado", "Perdemos mucho tiempo en el standup", "El daily dura casi 40 minutos".
2. Add a few clearly unrelated cards to the same column.
3. Open the "Suggestions" panel (as above). On first use, confirm a loading/in-progress state is shown while the embedding model downloads and analysis runs (FR-007) — this may take longer the very first time in a fresh browser profile.
4. Confirm the topically-related cards are proposed together as a group, and the unrelated cards are not included (Acceptance Scenarios 1–2).
5. Accept one proposed group and confirm it creates a real card group exactly as today (unchanged persistence path, `data-model.md`).
6. Reject a proposed group and confirm it's removed from the panel without affecting the cards.
7. Open "Suggestions" on a column with 0 or 1 ungrouped card and confirm a clear "no groupings found" state, not an empty or broken panel (Acceptance Scenario 4).

## 4. Manual validation — unavailable state (FR-008)

Simulate the embedding model failing to load (e.g. block the model-host domain via browser devtools network conditions, matching how the sentiment feature's own failure path is typically exercised) and confirm the panel shows a clear, non-technical "unavailable" message rather than an empty/broken panel or a silent fallback to any other computation.

## 5. Regression check — unrelated behavior unchanged

- The other grouping modes (none / by-user) in `ColumnHeaderMenu.tsx` are unaffected.
- The four other `useBoardMenuOverlay` consumers (options menu, facilitator menu, color picker, card menu) are unaffected — spot-check each still opens anchored to its own trigger.
- Sentiment analysis badges on cards are unaffected — the new embedding worker is fully independent of `sentimentWorker.ts` (`research.md` §4).
- Run the full Playwright suite (`npx playwright test`), not just the new/changed spec, to confirm no unrelated regression.
- Confirm no remaining reference to `similarityService.ts`, `SimilarityAlgorithm`, or the `groupSuggestion.algorithm`/`groupSuggestion.keywords` i18n keys anywhere in `retro-rocket/src` (FR-009): `grep -rn "similarityService\|SimilarityAlgorithm\|groupSuggestion.algorithm\|groupSuggestion.keywords" retro-rocket/src` should return nothing.
