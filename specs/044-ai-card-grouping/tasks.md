# Tasks: AI Card Grouping

**Input**: Design documents from `/specs/044-ai-card-grouping/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/anchored-suggestions-panel-contract.md, contracts/ai-grouping-service-contract.md, quickstart.md (all present)

**Tests**: Per the project constitution (Principle I, TDD — NON-NEGOTIABLE), tests are included and MUST be written and confirmed failing before their corresponding implementation task.

**Organization**: Two user stories, matching spec.md's priorities (US1/P1: popup anchoring; US2/P2: AI-based grouping). There is no separate Foundational phase: `research.md` found no shared infrastructure that blocks both stories — US1's mechanism (a second anchored panel on `ColumnHeaderMenu.tsx`'s existing trigger) and US2's mechanism (a new embedding worker/service, decoupled from any UI) are independent enough to build in parallel; only the final UI-wiring tasks within US2 (T021-T023) depend on US1's panel existing. All file paths are relative to the repo root (`retro-rocket/` is the frontend package).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2) — omitted for Setup/Polish

## Path Conventions

Single-package monorepo: frontend at `retro-rocket/src/` (feature module `retro-rocket/src/features/boards/clustering/`), tests at `retro-rocket/src/test/features/boards/clustering/`, E2E specs at `retro-rocket/e2e/`, locales at `retro-rocket/src/locales/`.

---

## Phase 1: Setup

**Purpose**: Confirm the environment is ready. No new dependency is required (`@huggingface/transformers` `^3.8.1` is already installed and used for sentiment analysis; `@floating-ui/react` and `framer-motion` are reused unchanged — plan.md's Technical Context).

- [X] T001 From `retro-rocket/`, confirm branch `044-ai-card-grouping` is checked out and `npm install` is up to date. Run `npm run test:run -- clustering` and confirm the existing clustering test suite is green before making any change. Confirmed: 235/235 tests passing across 11 files.
- [X] T002 [P] Spike-confirm `pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2')` loads via the installed `@huggingface/transformers` and returns a fixed-length vector for both a Spanish and an English sample sentence, in a throwaway script (not committed) — validates `research.md` §3's model choice before building the worker around it. Confirmed: both sentences produce 384-dim vectors; cosine similarity between the same-topic ES/EN pair was 0.68, further supporting the model choice.

**Checkpoint**: Environment confirmed, model choice validated. No Foundational phase follows (see Organization above) — proceed directly into User Story 1.

---

## Phase 2: User Story 1 - Suggestions popup opens next to its button (Priority: P1) 🎯 MVP

**Goal**: The grouping-suggestions panel opens visually anchored to the column's grouping-mode trigger button — for any column position, after scrolling, and near viewport edges — instead of pinned to the viewport's top-left corner. The suggestions shown are still computed by today's text-similarity algorithm; only where the panel renders changes.

**Independent Test**: Open the suggestions panel from a column in any position on the board (left edge, right edge, center, scrolled down) and confirm it consistently renders attached to the triggering button and fully within the visible screen area (spec.md's Independent Test for US1).

### Tests for User Story 1 ⚠️

> Write these first; confirm they FAIL against the current implementation before making any fix.

- [X] T003 [P] [US1] In `retro-rocket/src/test/features/boards/clustering/ColumnHeaderMenu.test.tsx`, add a structural test (mirroring `src/test/features/boards/facilitator/FacilitatorMenu.test.tsx`'s `vi.mock('framer-motion', ...)` technique, per `contracts/anchored-suggestions-panel-contract.md`) asserting: (a) the suggestions panel's positioning wrapper (carrying `floatingStyles`) and its animated inner wrapper are distinct DOM nodes, and (b) the suggestions panel shares the same trigger-button reference element as the existing grouping-mode dropdown. Confirmed failing (2/3 new tests red) against the current implementation.
- [X] T004 [P] [US1] In `retro-rocket/e2e/retrospective-board.spec.ts`, add a test that opens the suggestions panel via the real grouping-mode trigger button on a column away from the top-left of the board (e.g. the last column, or after scrolling down), and asserts: the panel's bounding box is adjacent to the trigger's bounding box (not pinned near viewport `(0, 0)`); the panel flips/shifts to stay fully visible when the trigger sits near a viewport edge; and the panel stays anchored to the trigger after a scroll (spec.md US1 Acceptance Scenarios 1-3). Confirmed failing against `main` via a real emulator-backed Playwright run (reproduces the reported top-left pin: `isAnchoredToTrigger` returned false).

### Implementation for User Story 1

- [X] T005 [US1] In `retro-rocket/src/features/boards/clustering/components/ColumnHeaderMenu.tsx`, add a second `useBoardMenuOverlay` instance (`role: 'dialog'`) sharing the existing trigger button's `refs.setReference`, rendered via its own `FloatingPortal` + `FloatingFocusManager`, controlled by new props: `suggestionsOpen`, `suggestions`, `suggestionCards`, `suggestionsLoading`, `suggestionsError`, `onAcceptSuggestion`, `onRejectSuggestion`, `onCloseSuggestions` (per `research.md` §2's decision that `ColumnHeaderMenu.tsx` stays the sole owner of "things anchored to this button"). Note: `research.md` didn't catch that `ColumnHeaderMenu.tsx`'s *existing* dropdown already has the identical single-node `floatingStyles`+`animate` collision feature 039 found and deferred elsewhere in this file; the new suggestions panel is built correctly split, but that pre-existing, separately-scoped bug is deliberately left untouched (documented inline), matching feature 039's own precedent. `suggestionsError` is accepted but intentionally unused until US2's T023 wires the unavailable state (non-blocking ESLint warning noted).
- [X] T006 [US1] Rewrite `retro-rocket/src/features/boards/clustering/components/GroupSuggestionModal.tsx` to render as content inside `ColumnHeaderMenu.tsx`'s new anchored panel from T005: removed the `fixed inset-0 bg-black/50` backdrop/centering wrapper, the outer `motion.div` that previously combined positioning and animation, the `isOpen` prop (mounting is now the caller's decision), and the component's own Escape-key listener (now `useBoardMenuOverlay`'s `useDismiss`, upstream). Header/body/footer content, preview toggle, and accept/reject actions are functionally unchanged (the `algorithm`/`keywords` fields and their computation are untouched in this story — that is US2's scope).
- [X] T007 [US1] In `retro-rocket/src/features/boards/clustering/components/GroupableColumn.tsx`, stopped rendering `GroupSuggestionModal` directly (removed the inline render at the bottom of the file); its existing suggestions state (`showSuggestions`, `suggestions`, `ungroupedCards`, `isGeneratingSuggestions`) and handlers (`handleAcceptSuggestion`, `handleRejectSuggestion`, `handleCloseSuggestions`) are now passed down into `ColumnHeaderMenu` via the new props from T005.
- [X] T008 [US1] Re-ran T003 and T004; both pass against the anchored implementation (T004 via a real emulator-backed Playwright run). Also updated `GroupSuggestionModal.test.tsx` (4 tests, replacing the 5 old ones that asserted the now-moved `isOpen`/Escape/`AnimatePresence` responsibilities) — full clustering suite: 237/237 passing. `tsc --noEmit` clean.
- [X] T009 [US1] Validated `quickstart.md` §2 via T004's real-browser Playwright coverage (panel opens next to the button from any column position, flips near viewport edges, stays anchored through scroll) plus regression runs of the sibling anchored-menu E2E tests (card menu, options/facilitator menu) and the existing grouping-propagation E2E test — all pass, confirming FR-010 (other behavior unchanged).

**Checkpoint**: User Story 1 is fully functional and independently testable — the panel is correctly anchored, still using today's text-similarity suggestions under the hood.

---

## Phase 3: User Story 2 - Groupings reflect AI-based topic/content similarity (Priority: P2)

**Goal**: Proposed groupings are computed from on-device AI semantic analysis (sentence embeddings via the same `@huggingface/transformers` library already used for sentiment analysis) instead of the text-similarity algorithm, which is deleted along with its tests, types, and UI surface.

**Independent Test**: Add cards to a column that describe the same topic using varied wording (no shared keywords) and confirm the "Suggestions" action proposes them as a group; add clearly unrelated cards and confirm they are not grouped together (spec.md's Independent Test for US2).

### Tests for User Story 2 ⚠️

> Write these first; confirm they FAIL before implementation (the modules/behaviors below don't exist yet).

- [X] T010 [P] [US2] Create `retro-rocket/src/test/features/boards/clustering/embeddingWorker.test.ts` (mirroring `src/test/features/boards/sentiment/workers/sentimentWorker.contract.test.ts`) asserting: `init` loads the `feature-extraction` pipeline for the configured model id; a batched `embed` message returns exactly one vector per input card, paired by `cardId`; a failed model load surfaces a distinguishable `error` message (per `contracts/ai-grouping-service-contract.md`). 7/7 passing (co-designed with T015's implementation given the worker's message-protocol complexity — not a strict red-first sequence for this one file, noted for transparency).
- [X] T011 [P] [US2] Create `retro-rocket/src/test/features/boards/clustering/useEmbeddingWorkerManager.test.ts` (mirroring `src/test/features/boards/sentiment/hooks/useWorkerManager.test.ts`) asserting the `{ready, loading, error}` state transitions and retry-on-failure behavior. 6/6 passing; caught and fixed a real bug during red-green cycling (the worker's `onmessage` handler couldn't originally distinguish a model-load error from a per-embed-call error — fixed by checking `!stateRef.current.ready` instead of message shape).
- [X] T012 [P] [US2] Create `retro-rocket/src/test/features/boards/clustering/semanticGroupingService.test.ts` (replaces `similarityService.test.ts`) against a mocked embedding source, covering every case in `contracts/ai-grouping-service-contract.md`'s verification section: same-column-only scoping, threshold inclusion/exclusion, `maxGroupSize` capping (FR-005a), `minGroupSize` filtering, already-grouped-card exclusion, empty array for too-few-cards, a distinguishable rejection when the embedding source errors, and a same-language grouping-quality case (FR-006a) — mocked embeddings for Spanish-only and English-only fixtures each cluster correctly within their own language, with no assertion made about cross-language matching (explicitly not required by spec.md's clarification). Confirmed failing (module not found) before implementation; 13/13 passing after.
- [X] T013 [P] [US2] Update `retro-rocket/src/test/features/boards/clustering/useCardGroups.test.ts` so `findSuggestions` is asserted as `Promise`-returning and delegates to the new grouping service; confirmed failing against the current synchronous implementation, 21/21 passing after T019.
- [X] T014 [P] [US2] In `retro-rocket/e2e/retrospective-board.spec.ts`, added a test that seeds a column with two similar-topic cards (varied wording) plus one clearly unrelated card, requests suggestions, and asserts the similar cards are proposed together while the unrelated card is excluded, then accepts the suggestion and confirms a real `CardGroup` is persisted via the REST API (spec.md US2 Acceptance Scenarios 1-3); plus a second, now-warm 25-card batch asserting total suggestion-generation time is under 5s (SC-004). Passed in 13.7s total against the real model/worker (`test.setTimeout(150_000)` override for the cold-start model download). Also added a second E2E test (beyond the original task scope, folded into T027's manual-validation intent) simulating AI-unavailable via `page.route()` blocking the model host — confirms the distinct unavailable state (FR-008), not silently falling back. This curated-example assertion is the automated proxy for SC-002's 80%-coherence bar — the numeric 80% figure itself is validated via T027's manual usability review, not computed here (no automated benchmark suite is being built for this feature).

### Implementation for User Story 2

- [X] T015 [P] [US2] Create `retro-rocket/src/features/boards/clustering/workers/embeddingWorker.ts`: `feature-extraction` pipeline using `Xenova/paraphrase-multilingual-MiniLM-L12-v2` (`research.md` §3), `init`/batched-`embed` message handling mirroring `sentimentWorker.ts`'s structure and `env.allowLocalModels = false` / `env.allowRemoteModels = true` settings.
- [X] T016 [P] [US2] Create `retro-rocket/src/features/boards/clustering/hooks/useEmbeddingWorkerManager.ts`, mirroring `useWorkerManager.ts`'s lifecycle/retry logic, pointed at `embeddingWorker.ts` from T015. Promise-based `embed()` API (rather than callback-registration) since this is a single request/response cycle per suggestions-request, not a continuous stream.
- [X] T017 [P] [US2] Create `retro-rocket/src/features/boards/clustering/services/semanticGroupingService.ts`: a cosine-similarity function over two embedding vectors (clamped to `[0, 1]` per `data-model.md`), the new `GroupingConfig` type (`threshold`/`minGroupSize`/`maxGroupSize`, replacing `SimilarityConfig`), and `findSemanticCardGroups(cards, embeddingFetcher, config?)` reusing the existing greedy clustering shape from `similarityService.ts`'s `findSimilarCardGroups` (`research.md` §5) but keyed on embedding cosine similarity instead of Levenshtein/Jaccard text scores. Accepts an injected embedding-fetch function so it stays unit-testable without a real worker (matches T012's mocked-source approach).
- [X] T018 [P] [US2] In `retro-rocket/src/features/boards/types/card.ts`, removed the `SimilarityAlgorithm` type and the `algorithm`/`keywords`/`reason` fields from `GroupSuggestion` (`data-model.md`). Also updated `src/test/features/boards/types/card.test.ts`, the only other file referencing the removed type/fields.
- [X] T019 [US2] In `retro-rocket/src/features/boards/clustering/hooks/useCardGroups.ts`, rewrote `findSuggestions` to be async, calling `findSemanticCardGroups` (T017) via `useEmbeddingWorkerManager` (T016) instead of the deleted `findSimilarCardGroups`; updated its `SimilarityConfig` import to the new `GroupingConfig` type (T017/T018).
- [X] T020 [US2] Deleted `retro-rocket/src/features/boards/clustering/services/similarityService.ts` and `retro-rocket/src/test/features/boards/clustering/similarityService.test.ts` (FR-009) — confirmed nothing else imported them first.
- [X] T021 [US2] In `retro-rocket/src/features/boards/clustering/components/GroupableColumn.tsx`, updated `handleGenerateSuggestions` to properly `await` the now-async `onSuggestionGenerate()` call, added a `suggestionsError` state set on rejection (FR-008) and cleared on retry/close, and passed it down to `ColumnHeaderMenu`. Found and fixed a real FR-007 bug while validating against T014's E2E scenario: the panel originally only opened *after* the promise resolved (no visible loading state at all, since `setShowSuggestions(true)` was inside the try/catch instead of before it) — fixed by opening the panel immediately, in its loading state, before awaiting; added a dedicated regression test in `GroupableColumn.test.tsx` that would have caught this.
- [X] T022 [US2] In `retro-rocket/src/features/boards/retrospective/components/RetrospectiveBoard.tsx` (~line 294-298), the call site already returns the new async `findSuggestions` signature unchanged; recalibrated `threshold` from `0.6` to `0.55` (documented inline) since the old value was tuned for the removed text-similarity score, not cosine similarity — `minGroupSize`/`maxGroupSize` left as the same product-tuned `2`/`6`.
- [X] T023 [US2] In `retro-rocket/src/features/boards/clustering/components/GroupSuggestionModal.tsx` (already restructured by T006), removed the "Algorithm: …" / "Keywords: …" / "Reason: …" detail rows (all three fields no longer exist per T018) and added a distinct "AI analysis unavailable" state (FR-008, `role="alert"`, `AlertTriangle` icon — distinguishable from loading/empty by icon and copy, not color alone) shown when `error` is set, wired through `ColumnHeaderMenu.tsx`'s new `error` prop on the panel.
- [X] T024 [P] [US2] In `retro-rocket/src/locales/en.json` and `retro-rocket/src/locales/es.json`, removed `groupSuggestion.algorithm`, `groupSuggestion.keywords`, and `groupSuggestion.reason`; added `groupSuggestion.unavailableTitle` and `groupSuggestion.unavailableBody` (both locales).
- [X] T025 [US2] Updated `useCardGroups.test.ts` (T013) and `card.test.ts` (T018) as noted above. `GroupSuggestionModal.test.tsx` was already updated in T006/T008 (US1). `GroupableColumn.test.tsx`'s "Group Suggestions" block was thin/non-functional (its mocked `ColumnHeaderMenu` used a stale `'similarity'` criteria value that never matched the real `'suggestions'` value, so the suggestion flow was never actually exercised) — rewrote the mock and the block with 4 substantive tests: async resolution showing suggestions, rejection showing the distinct error state, accept-suggestion → `onGroupCreate`, and close-clears-state. `.basic.test.tsx`/`.simple.test.tsx` needed no changes (no suggestion-flow-specific tests present).
- [X] T026 [US2] Re-ran T010-T014; all pass against the new implementation (embeddingWorker 7/7, useEmbeddingWorkerManager 6/6, semanticGroupingService 13/13, useCardGroups 21/21, and both new E2E specs — the semantic-grouping/persistence/timing test and the unavailable-state test).
- [X] T027 [US2] Validated `quickstart.md` §3-4 via T014's real-model E2E coverage: semantic grouping quality (similar cards grouped, unrelated excluded — real embeddings, not mocked), loading state on first use (implicit in the cold-start test passing within its generous timeout, and explicitly regression-tested at the unit level), and unavailable-state simulation (network-blocked E2E test). SC-002's 80% coherence bar remains a qualitative bar best validated through ongoing usage/facilitator feedback beyond this implementation session; the automated coverage here (both positive and negative curated examples passing) is the practical stand-in documented in T014.

**Verification beyond the task list**: `npx tsc --noEmit` clean; full frontend suite (`npx vitest run`) — 2440/2440 tests passing across 182 files, 0 regressions, including `src/test/i18n/no-hardcoded-text.test.ts`.

**Checkpoint**: User Stories 1 and 2 are both independently functional — the panel is correctly anchored (US1) and its suggestions are computed by on-device AI with the old algorithm fully removed (US2).

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Confirm no regression beyond the changed components, and that old-code removal (FR-009) is complete.

- [X] T028 [P] Ran `npm run test:coverage` in `retro-rocket/`; confirmed the `vitest.config.ts` thresholds are still met (Constitution VI). Note: `vitest.config.ts`'s actual configured thresholds are `branches: 78, functions: 64, lines: 50, statements: 50` (a documented, honest baseline per its own inline comment — not the literal 80%/80%/80%/80% the constitution text and this feature's `plan.md` describe; that's a pre-existing discrepancy predating this feature, not introduced by it). Actual coverage: 77.36% statements, 83.09% branches, 75.35% functions, 77.36% lines — all above their respective real thresholds. 182/182 test files, 2441/2441 tests passing, exit code 0.
- [X] T029 [P] Ran the full Playwright suite (`npm run e2e`, ~159 tests, 4 full runs total) — no regression in the other four `useBoardMenuOverlay` consumers, sentiment-analysis flows, or any other existing spec; every spec-044 test (anchoring, semantic grouping/persistence/timing, unavailable state) passes reliably in isolation and in small groups (confirmed repeatedly). One test — the new "AI analysis unavailable" E2E test — failed in 3 of 4 full-suite runs with a `signInAs` navigation timeout, deep in the ~159-test sequential run (`playwright.config.ts`: `workers: 1`, `fullyParallel: false`). Investigated thoroughly rather than dismissed: (1) reordering the two new AI tests so the heavy real-model test doesn't precede it — no change; (2) removing this test's own `page.route()` call entirely — still failed at the identical `signInAs` step, and in that same run a *different, pre-existing, unrelated test* (`typing indicator clears... while marked as typing`) also failed the same way, proving the cause is cumulative environmental resource pressure in this specific sandboxed execution environment over a long sequential run, not this feature's code, this test's logic, or `page.route()`; (3) a same-helper retry did not help either, since the pressure is sustained rather than momentary. `auth-helpers.ts`'s own top-of-file comment already documents awareness of this exact cumulative-load flakiness class. Consistent with `playwright.config.ts`'s own `retries: process.env.CI ? 1 : 0` (the project already anticipates transient E2E flakiness in CI) and feature 039's own polish-task precedent of documenting environmental failures as non-blocking once isolated. No code or test change was made to paper over this — it is an environment characteristic, not a defect.
- [X] T030 [P] Extended `retro-rocket/e2e/accessibility.spec.ts` with 4 new tests for the suggestions panel: axe WCAG 2.1 AA scan of the populated panel (light + dark), keyboard operability (Tab to trigger, Enter to open the dropdown, keyboard-select "Agrupaciones sugeridas", Escape closes and returns focus to the trigger via `FloatingFocusManager`), and the unavailable state's distinguishability verified via accessible semantics (`role="alert"`, distinct icon/copy — not merely a CSS color) plus its own axe scan. All 4 pass; full `accessibility.spec.ts` file re-run clean at 62/62 (no regressions). Interprets "not by color alone" as encoded in DOM/ARIA semantics (role, text, icon) rather than a pixel-level grayscale render comparison, which is more of a manual/visual-regression concern than an E2E assertion.
- [X] T031 Verified no remaining reference to the removed algorithm: `grep -rn "similarityService\|SimilarityAlgorithm\|groupSuggestion.algorithm\|groupSuggestion.keywords\|groupSuggestion.reason" retro-rocket/src` (FR-009, `quickstart.md` §5) returns only 2 matches, both historical design-rationale comments inside `semanticGroupingService.ts` explaining what it replaced (`// removed similarityService.ts used...`, `// mirrors similarityService.ts`) — no functional code, type, i18n key, or import references the removed algorithm anywhere. `similarityService.ts` and its test are deleted (T020); `SimilarityAlgorithm` and the `algorithm`/`keywords`/`reason` fields are gone from `GroupSuggestion` (T018); the corresponding i18n keys are removed from both locales (T024).
- [X] T032 Re-validated `specs/044-ai-card-grouping/checklists/requirements.md` (still 16/16, unchanged — spec.md wasn't touched during implementation) and all 9 Constitution Check gates from `plan.md` against the final implementation: **I. TDD** — new modules had failing tests first (embeddingWorker.test.ts was co-designed with its implementation, documented as a caveat in T010); **II. Library-First** — `semanticGroupingService`/`embeddingWorker`/`useEmbeddingWorkerManager` isolated and decoupled from UI; **III. Proven libraries** — zero new dependencies (confirmed via `git diff` on `package.json`/`package-lock.json` — no changes); **IV. SOLID** — `ColumnHeaderMenu` stayed the single owner of anchored panels, the new worker is fully independent of the sentiment worker; **V. Simplicity** — reused the existing greedy-clustering shape, no new clustering algorithm/dependency; **VI. Coverage** — 2441/2441 tests passing, thresholds met (T028); **VII. E2E** — closed the prior zero-coverage gap with 3 new retrospective-board specs plus 4 new accessibility specs; **VIII. Accessibility** — WCAG 2.1 AA verified via axe + keyboard operability + color-independent state distinction (T030); **IX. Apple-Inspired Design** — reused the existing `FacilitatorMenu.tsx`-derived split-node motion pattern, no new design decision requiring the `animate` skill. All gates PASS, matching `plan.md`'s pre-implementation assessment. `tsc --noEmit` clean; `eslint` clean (0 errors, 0 warnings) across every new/modified source and test file in this feature.

**Checkpoint**: Feature complete — both stories verified independently (Phases 2-3) and confirmed not to regress sibling menus, the sentiment feature, or the project's coverage gate (Phase 4).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **User Story 1 (Phase 2)**: Depends on Setup (T001) completion. No Foundational phase (see Organization above).
- **User Story 2 (Phase 3)**: Its test/implementation of the embedding worker, hook, and grouping service (T010-T020) has no dependency on US1 and can be built in parallel by a different developer once Setup is done. Its UI-wiring tasks (T021, T023, T025) depend on US1's anchored panel existing (T005-T007), since that is where suggestions render.
- **Polish (Phase 4)**: Depends on both User Story phases being complete.

### Within Phase 2 (US1)

- T003 and T004 (tests) can be written in parallel (different files) and MUST both be confirmed failing before T005 starts.
- T005 → T006 → T007 are sequential (each restructures content the next task renders inside).
- T008 (re-run tests) depends on T005-T007. T009 (manual validation) depends on T008.

### Within Phase 3 (US2)

- T010-T014 (tests) can all be written in parallel (different files) before any implementation task starts.
- T015, T016, T017, T018 (new worker, new hook, new service, type edits) touch independent files and can be built in parallel.
- T019 depends on T016-T018. T020 depends on T019. T021 depends on T019 and T007 (US1). T022 depends on T019. T023 depends on T006 (US1) and T018.
- T024 (i18n) can happen any time before T023 needs the new keys.
- T025 depends on T021 and T023. T026 depends on all of T015-T025. T027 depends on T026.

### Parallel Opportunities

- T002 (Setup) can run alongside T001.
- T003/T004 (US1 tests) in parallel.
- T010/T011/T012/T013/T014 (US2 tests) in parallel.
- T015/T016/T017/T018 (US2 new-file implementation) in parallel.
- T024 (i18n) in parallel with most of US2's implementation tasks.
- T028/T029/T030 (Polish) in parallel.
- A second developer could start all of US2's non-UI work (T010-T020) while US1 (T003-T009) is still in progress.

---

## Parallel Example: User Story 1

```bash
Task: "Structural anchoring test in ColumnHeaderMenu.test.tsx (T003)"
Task: "Playwright anchoring test in retrospective-board.spec.ts (T004)"
```

## Parallel Example: User Story 2

```bash
# Tests
Task: "embeddingWorker.test.ts (T010)"
Task: "useEmbeddingWorkerManager.test.ts (T011)"
Task: "semanticGroupingService.test.ts (T012)"
Task: "useCardGroups.test.ts async assertions (T013)"
Task: "Playwright semantic-grouping E2E test (T014)"

# Implementation
Task: "embeddingWorker.ts (T015)"
Task: "useEmbeddingWorkerManager.ts (T016)"
Task: "semanticGroupingService.ts (T017)"
Task: "card.ts type edits (T018)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: User Story 1
3. **STOP and VALIDATE**: Confirm the panel anchors correctly from any column position (still using today's text-similarity suggestions)
4. Deploy/demo if ready — this alone fixes the reported positioning bug

### Incremental Delivery

1. Setup → User Story 1 (positioning fix) → Test independently → Deploy/Demo (MVP)
2. Add User Story 2 (AI-based grouping + old-code removal) → Test independently → Deploy/Demo
3. Polish (coverage, full E2E suite, old-code-removal verification)

### Parallel Team Strategy

With two developers: Developer A takes User Story 1 (T003-T009) while Developer B starts User Story 2's non-UI work (T010-T020) in parallel once Setup is done; Developer B's final UI-wiring tasks (T021, T023, T025) wait for Developer A's T005-T007 to land.

---

## Notes

- [P] tasks = different files, no dependency on an incomplete task
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at either checkpoint to validate a story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence beyond the one documented UI-wiring dependency above
