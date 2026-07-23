---
description: "Task list for feature implementation"
---

# Tasks: Accurate AI Card Sentiment & Team Mood Analysis

**Input**: Design documents from `/specs/011-ai-sentiment-accuracy/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included and written FIRST (Constitution I & VI — TDD + 80% coverage, NON-NEGOTIABLE). Every deviation F1–F7 gets a failing test before its fix (SC-005).

**Organization**: Tasks are grouped by the four user stories from spec.md so each can be implemented and validated independently.

## Path Conventions

All paths are relative to `retro-rocket/` (the app root). Feature module lives at
`src/features/boards/sentiment/`; tests at `src/test/features/boards/sentiment/`.

## Deviation → Story map

- **US1 (P1)** Trustworthy card states → F1 (staleness), F2 (text normalization), F3 (display confidence)
- **US2 (P1)** Team-mood self-consistency → F4 (one adjusted distribution), F5 (mood formula), F6 (deps), F7 (report confidence)
- **US3 (P2)** Override durability → FR-011/FR-012 preserved under new invalidation
- **US4 (P3)** Library-first module + cleanup → F8 (library migration + barrel), F9 (dead code)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffolding shared by multiple stories

- [X] T001 Create `src/features/boards/sentiment/domain/` folder and an empty barrel `src/features/boards/sentiment/index.ts` (skeleton export block, filled incrementally per story)
- [X] T002 [P] Add validation fixtures in `src/test/features/boards/sentiment/fixtures/cards.ts` (≥30 curated ES/EN cards labelled positive/negative/neutral, incl. long + <3-char) and `.../fixtures/boards.ts` (benchmark boards: all-neutral, mostly-positive, heavy-negativity-in-negative-role-column, balanced) — feeds SC-001 & SC-003
- [X] T003 [P] Add `MODEL_VERSION` constant and extend `SentimentResult` with `modelVersion: string` (and enforce `modelId`) in `src/features/boards/types/sentiment.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The single confidence rule that BOTH US1 and US2 depend on (FR-003/FR-009)

**⚠️ CRITICAL**: US1 and US2 cannot be made consistent until this phase is complete

- [X] T004 [P] Write failing unit test `src/test/features/boards/sentiment/domain/confidence.test.ts` — `isConfident(result, config)`: per-sentiment thresholds (pos 0.4/neg 0.4/neu 0.25), fallback to flat `threshold` when `thresholds` absent, and "shown-on-board ⇔ counted" parity
- [X] T005 Implement `isConfident` in `src/features/boards/sentiment/domain/confidence.ts` (corrected form of `shouldShowSentimentBadge`); re-export from `sentiment/index.ts`
- [X] T006 Consolidate confidence config in `src/features/boards/types/sentiment.ts`: `thresholds` is the single source of truth; deprecate the standalone team-mood gate (removed in US2) — keep `DEFAULT_SENTIMENT_CONFIG` values, ensure `shouldShowSentimentBadge` delegates to `isConfident`

**Checkpoint**: One confidence predicate exists and is unit-tested — stories can build on it

---

## Phase 3: User Story 1 - Trustworthy card states (Priority: P1) 🎯 MVP

**Goal**: Card states reflect the actual text, survive reloads unchanged, and re-run only on real text/model change (F1, F2, F3-display).

**Independent Test**: Add ES/EN positive/negative/neutral/long/short cards → each badge matches human judgement; reload → no re-analysis flicker; edit a card → only that card re-analyses.

### Tests for User Story 1 (write FIRST, must FAIL) ⚠️

- [X] T007 [P] [US1] Failing test `src/test/features/boards/sentiment/domain/textNormalization.test.ts` — trims/collapses whitespace, strips bare URLs, caps ≤512 chars on word boundary, returns `null` for <3 non-ws chars (F2/FR-002/FR-005)
- [X] T008 [P] [US1] Failing test `src/test/features/boards/sentiment/domain/staleness.test.ts` — `isFresh(stored, text, modelId, modelVersion)` true only when content-hash AND modelId AND modelVersion all match; `isOverride` always fresh (F1/FR-004/FR-004a)
- [X] T009 [P] [US1] Failing test `src/test/features/boards/sentiment/services/sentimentResultsService.test.ts` — persisted `contentHash` is hash of **card text** (not cardId) and `modelId`/`modelVersion` are written by `saveResultWithHash` and the batch path
- [X] T010 [P] [US1] Failing test/extend `src/test/features/boards/sentiment/hooks/useSentiment.test.ts` — on reload with unchanged text + same model, no analyze/batch message is dispatched (SC-002); on text edit only the edited card is re-dispatched

### Implementation for User Story 1

- [X] T011 [P] [US1] Implement `normalizeForInference` in `src/features/boards/sentiment/domain/textNormalization.ts`; export from barrel
- [X] T012 [P] [US1] Implement `isFresh`/staleness helpers in `src/features/boards/sentiment/domain/staleness.ts`; export from barrel
- [X] T013 [US1] Wire normalization into inference in `src/features/boards/sentiment/workers/sentimentMapper.ts` (replace `prepareContent` with `normalizeForInference`) and pass `{ truncation: true }` at the call sites in `src/features/boards/sentiment/workers/sentimentWorker.ts`
- [X] T014 [US1] Fix persistence in `src/features/boards/sentiment/services/sentimentResultsService.ts`: store real `contentHash` (card text), write `modelId` + `modelVersion`; load returns those fields (remove the `hashContent(cardId)` misuse)
- [X] T015 [US1] Update `src/features/boards/sentiment/hooks/useSentimentResults.ts`: pass real content hash on persist (fix `persistBatch` hashing `cardId`), tag results with `modelId`/`modelVersion`, and on load mark records stale via `isFresh` instead of blind merge
- [X] T016 [US1] Update `src/features/boards/sentiment/hooks/useSentiment.ts` unanalyzed-filter and `analyzeCard`/`analyzeBatch` to treat a card as "already analysed" only when a fresh (text+model) persisted/in-memory result exists — eliminating full re-analysis on reload
- [X] T017 [US1] Ensure card badges, `getSentimentCounts`, and `filterCardsBySentiment` all route through `isConfident` (T005) in `useSentiment.ts` / `SentimentBadge.tsx` — one display rule (F3)

> Added coverage tasks (IDs appended out of numeric order to avoid renumbering; they belong to this US1 phase):

- [X] T046 [US1] Test resilience (FR-013) in `src/test/features/boards/sentiment/hooks/useWorkerManager.test.ts` / `useSentiment.test.ts` — a worker `error` (model-load failure) sets `WorkerState.error` and surfaces a non-silent state without breaking the board; a single-card analysis failure yields a neutral/confidence-0 fallback and never aborts the batch
- [X] T047 [US1] Test the disable path (FR-014) in `src/test/features/boards/sentiment/hooks/useSentiment.test.ts` — `setEnabled(false)` clears results, the content-hash cache, and the derived team-mood report with no lingering state
- [X] T045 [US1] Add a gated accuracy benchmark `src/test/features/boards/sentiment/accuracy.bench.test.ts` running the real model over `fixtures/cards.ts`, asserting ≥90% label match (SC-001); wire an npm script (e.g. `test:accuracy`) so it is NOT part of the default `test`/coverage run (model download) and does not gate the 80% floor

**Checkpoint**: Card states are accurate, reused on reload, and displayed via one confidence rule — MVP demonstrable

---

## Phase 4: User Story 2 - Team-mood report that agrees with itself (Priority: P1)

**Goal**: Score, percentages, and alerts all derive from one column-role-adjusted distribution; all-neutral board = ~4.0; report recomputes on input change (F4, F5, F6, F7).

**Independent Test**: On benchmark boards — all-neutral ⇒ score 4.0 "Preocupante"; heavy expected-negativity column ⇒ no false critical alert & score not depressed; changing a column role recomputes the report; card visible on board is counted in report.

### Tests for User Story 2 (write FIRST, must FAIL) ⚠️

- [X] T018 [P] [US2] Failing test `src/test/features/boards/sentiment/domain/moodScore.test.ts` — anchor table: (1/0/0)→10, (0/1/0)→4.6 ("Preocupante"), (0/0/1)→1, (0.5/0/0.5)→5.5, monotonic & clamped (F5/FR-007)
- [X] T019 [P] [US2] Failing test `src/test/features/boards/sentiment/domain/moodDistribution.test.ts` — negatives in a `negative`-role column reclassified as expected; score, percentages, AND alert inputs all read the same adjusted counts (F4/FR-006); action columns excluded
- [X] T020 [P] [US2] Failing test/extend `src/test/features/boards/sentiment/hooks/useTeamMood.test.ts` — report recomputes when `columnConfigs` role/title changes (F6/FR-008); only `isConfident` cards counted (F7/FR-009); <3 analysable cards ⇒ insufficient-data insight (FR-010)

### Implementation for User Story 2

- [X] T021 [P] [US2] Implement new `calculateMoodScore(dist)` = `clamp(1,10, 1 + 9·(p + 0.4·u))` (1-dp) in `src/features/boards/sentiment/domain/moodScore.ts`; export from barrel. Neutral weight is 0.4 so an all-neutral board scores ≈4.6, staying in the "Preocupante" band (≥4.5); do NOT change `getMoodScoreLabel` bands
- [X] T022 [P] [US2] Implement `computeMoodDistribution(cards, results, columnConfigs, config)` in `src/features/boards/sentiment/domain/moodDistribution.ts` — one adjusted distribution (uses `getColumnRole` + `isConfident`); export from barrel
- [X] T023 [US2] Refactor `src/features/boards/sentiment/hooks/useTeamMood.ts` to derive metrics, percentages, AND insights from `computeMoodDistribution`, score via `moodScore`; remove the separate `minConfidenceThreshold` gate (use `isConfident`)
- [X] T024 [US2] Fix the `report` `useMemo` dependency array in `useTeamMood.ts` to include `columnConfigs` (F6)
- [X] T025 [US2] Move scoring logic out of `src/features/boards/types/teamMood.ts` (keep types only; delete the old `moodFormula`/`calculateMoodScore` and `minConfidenceThreshold` from `TeamMoodConfig`), re-point imports to `domain/moodScore`. Also verify whether `getMoodScoreLabel` strings ('Excelente'…'Crítico') are rendered by `TeamMoodDashboard`; if so, route them through i18next keys present in ES + EN (Constitution: no hardcoded user-visible strings) instead of returning hardcoded Spanish
- [X] T026 [US2] Verify `TeamMoodDashboard.tsx` renders the new score/label/percentages unchanged in shape (no UI contract break; label bands already map 4.0→"Preocupante")

**Checkpoint**: Team-mood score, percentages, and alerts are mutually consistent; neutral floor holds

---

## Phase 5: User Story 3 - Facilitator override remains authoritative (Priority: P2)

**Goal**: Overrides persist across re-analysis, reload, model-change, and are what the report counts (FR-011, FR-012).

**Independent Test**: Override a card → reload + edit a different card + (simulated) model bump → override sticks and is reflected in the team-mood report.

### Tests for User Story 3 (write FIRST, must FAIL) ⚠️

- [X] T027 [P] [US3] Failing test/extend `src/test/features/boards/sentiment/hooks/useSentimentResults.test.ts` — an `isOverride` result is exempt from `isFresh` invalidation on model/version change and is never overwritten by `applyResult`/`applyBatch`
- [X] T028 [P] [US3] Failing test `src/test/features/boards/sentiment/domain/moodDistribution.test.ts` (override case) — an overridden card's sentiment (confidence 1) is the value counted in the adjusted distribution (FR-012)

### Implementation for User Story 3

- [X] T029 [US3] Confirm/adjust `src/features/boards/sentiment/hooks/useSentimentResults.ts` so `isFresh` short-circuits `true` for overrides and the load-merge never re-queues overridden cards under model-change invalidation
- [X] T030 [US3] Confirm overrides flow into `computeMoodDistribution` via the shared results map (no separate path) so US2's report counts them (wire-through check in `useTeamMood.ts`)

**Checkpoint**: Overrides are durable and authoritative across all invalidation paths

---

## Phase 6: User Story 4 - Maintainable, library-first module (Priority: P3)

**Goal**: Inference on `@huggingface/transformers`; one public barrel; dead code removed (F8, F9).

**Independent Test**: `grep -r "@xenova/transformers" src vite.config.ts` empty; consumers import only from `@/features/boards/sentiment`; removed symbols have no references; all checks pass.

### Tests for User Story 4 (write FIRST, must FAIL) ⚠️

- [X] T031 [P] [US4] Extend `src/test/features/boards/sentiment/workers/*` (or add `sentimentWorker.contract.test.ts`) asserting the worker message protocol (init/analyze/batch → ready/result/batch_result/error) holds after the library swap, with inference mocked
- [X] T032 [P] [US4] Add a guard test/lint check that fails if any file under `src/` imports `@xenova/transformers` or deep-imports `features/boards/sentiment/**` from outside the module (barrel-only)

### Implementation for User Story 4

- [X] T033 [US4] Swap dependency in `package.json` (`@xenova/transformers` → `@huggingface/transformers` current major) and run `npm install`
- [X] T034 [US4] Update `vite.config.ts` `manualChunks.transformers` to `['@huggingface/transformers']`
- [X] T035 [US4] Migrate `src/features/boards/sentiment/workers/sentimentWorker.ts` imports to `@huggingface/transformers`; remove/narrow the `(pipeline as any)` casts using the new types (retain one justified `any` only if unavoidable); bump `MODEL_VERSION` (T003) to invalidate cross-library stale results
- [X] T036 [US4] Fill `src/features/boards/sentiment/index.ts` with the full public surface per `contracts/sentiment-module.md` (providers, hooks, components, types, domain fns)
- [X] T037 [US4] Repoint all external consumers to the barrel: `src/App.tsx`, `src/features/boards/countdown/components/FacilitatorMenu.tsx`, `src/features/boards/retrospective/components/{RetrospectiveTopbar,RetrospectiveBoard,DraggableCard}.tsx`, facilitator `SentimentTab.tsx`/`TeamMoodTab.tsx`
- [X] T038 [US4] Remove dead code (F9): `SentimentResultsService.saveResult` (unused); verify with grep and remove if unreferenced: `getProgress` in `useSentimentResults.ts` and `components/SentimentControls.tsx` (+ its `index.ts` export)

**Checkpoint**: Single maintained library, single entry point, no dead code

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Constitution gates and full validation across all stories

- [X] T039 [P] Accessibility: verify `SentimentBadge.tsx` conveys state via icon + accessible text/aria (not color alone) and meets WCAG 2.1 AA contrast in BOTH themes (Constitution VIII)
- [X] T040 [P] i18n: ensure any new/changed user-visible strings in `TeamMoodDashboard.tsx` / insights use i18next keys present in ES + EN locales (no hardcoded strings)
- [X] T041 Add targeted Playwright E2E asserting the facilitator team-mood panel shows a consistent score/alerts on a seeded benchmark board (Constitution VII)
- [X] T042 Run `npm run test:coverage` — confirm ≥80% branches/functions/lines/statements; add tests for any gap in touched files
- [X] T043 Run `npm run type-check` + `npm run lint` + `npm run build`; confirm transformers chunk resolves the new package and bundle size does not materially regress
- [ ] T044 Execute `specs/011-ai-sentiment-accuracy/quickstart.md` sections A–D; confirm all manual scenarios (B1–B7) pass

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (P1)**: no dependencies
- **Foundational (P2)**: depends on Setup; **blocks US1 and US2** (shared `isConfident`)
- **US1 (P3 phase)**: depends on Foundational
- **US2 (P4 phase)**: depends on Foundational; independent of US1 (different files: domain/mood* + useTeamMood vs. domain/text+staleness + useSentiment)
- **US3 (P5 phase)**: depends on US1 (staleness/`isFresh`) and US2 (distribution counting) existing — validates their override behavior
- **US4 (P6 phase)**: depends on US1 (touches the same worker for normalization wiring — do US1's T013 before US4's T035); otherwise independent
- **Polish (P7)**: depends on all targeted stories complete

### Story independence

- US1 and US2 are both P1 and touch disjoint files → parallelizable after Foundational.
- US3 is a preservation/verification story layered on US1+US2 invariants.
- US4 is structural; sequence its worker edit (T035) after US1's T013 to avoid a merge conflict on `sentimentWorker.ts`.

### Within each story

- Tests (⚠️) written first and must FAIL before implementation.
- Pure `domain/*` modules before the hooks that consume them.
- Hooks/services before the components that read them.

---

## Parallel Opportunities

- **Setup**: T002, T003 in parallel.
- **Foundational**: T004 (test) then T005/T006.
- **US1 tests**: T007, T008, T009, T010 in parallel (different files).
- **US1 impl**: T011, T012 in parallel (independent domain modules) before T013–T017.
- **US2 tests**: T018, T019, T020 in parallel; **US2 impl**: T021, T022 in parallel before T023–T026.
- **US1 and US2 whole phases** can run in parallel by two developers after Foundational.
- **Polish**: T039, T040 in parallel.

### Parallel example — after Foundational

```bash
# Developer A → User Story 1
Task: "T007 textNormalization test" ; "T008 staleness test" ; "T009 service test" ; "T010 useSentiment reload test"

# Developer B → User Story 2 (in parallel)
Task: "T018 moodScore test" ; "T019 moodDistribution test" ; "T020 useTeamMood test"
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational → Phase 3 US1.
2. **STOP & VALIDATE**: card states accurate, reused on reload, one display rule.
3. Demo — this alone resolves the primary complaint ("tarjetas poco satisfactorias").

### Incremental delivery

1. Setup + Foundational → shared confidence rule ready.
2. + US1 → trustworthy card states (MVP).
3. + US2 → self-consistent team-mood report (second P1 — the reported "desvíos").
4. + US3 → override durability verified.
5. + US4 → library migration + cleanup.
6. Polish → a11y/i18n/coverage/E2E/quickstart gates.

---

## Notes

- [P] = different files, no incomplete-task dependency.
- Every F1–F7 fix has a test that fails on old behavior and passes after (SC-005).
- Inference is mocked in unit tests — no model download in CI.
- Commit after each task or logical group; stop at any checkpoint to validate.
- Do NOT lower `vitest.config.ts` coverage thresholds (Constitution VI).
