---
description: "Task list for feature 013 — Better-Fitting Sentiment Models & Language-Aware Model Selection"
---

# Tasks: Better-Fitting Sentiment Models & Language-Aware Model Selection

**Input**: Design documents from `/specs/013-sentiment-model-selection/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/sentiment-module.md, quickstart.md

**Tests**: REQUIRED and TEST-FIRST per the project constitution (TDD, NON-NEGOTIABLE). Every implementation task is preceded by a failing test.

**Organization**: Grouped by user story (US1–US4). All work stays inside the existing `retro-rocket/src/features/boards/sentiment` module and its mirror test tree. All paths are relative to the repo root.

**⚠️ Evidence-gated feature**: The benchmark in Phase 2 decides *which* configuration US1/US3 adopt. If no on-device candidate beats the current models by the target margin, the "adopt" tasks become "keep current + document" (a valid outcome per Clarification 1); the tests and record tasks still apply.

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1 / US2 / US3 / US4 (setup, foundational, polish carry no story label)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Wire the dev-run evaluation harness so it never pollutes the CI coverage run.

- [X] T001 Add a `bench:sentiment` script to `retro-rocket/package.json` that runs the dev-run evaluation harness (downloads candidate models; NOT part of `test`).
- [X] T002 [P] Configure Vitest in `retro-rocket/vitest.config.ts` to exclude `src/test/features/boards/sentiment/evaluation/**` from the CI coverage run so unit coverage never depends on model downloads (FR-014).
- [X] T003 [P] Create the evaluation scaffold directory `retro-rocket/src/test/features/boards/sentiment/evaluation/` with a placeholder `results.md` (the Model Evaluation Record target).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The curated benchmark + candidate configs + harness that DECIDE which model configuration the user stories adopt.

**⚠️ CRITICAL**: No user-story adoption work can begin until the harness has produced a decision.

- [X] T004 [P] Extend the labelled truth set in `retro-rocket/src/test/features/boards/sentiment/fixtures/cards.ts` with representative **short/informal** Spanish and English cards (positive/negative/neutral; e.g. "faltó tiempo", "great teamwork", "reuniones eternas"), each with a human label.
- [X] T005 [P] Extend `retro-rocket/src/test/features/boards/sentiment/fixtures/boards.ts` with benchmark boards tagged by **intended tone** (clearly-positive, clearly-negative, mixed, neutral-dominant).
- [X] T006 [P] Write failing unit tests for each candidate's label mapping in `retro-rocket/src/test/features/boards/sentiment/workers/sentimentWorker.contract.test.ts` (roberta `LABEL_0/1/2`, robertuito `POS/NEG/NEU`, distilbert path) — pure, no download. **Test-first: precedes the `mapLabels` logic in T007/T008 (Constitution I, TDD).**
- [X] T007 Add `language: 'es' | 'en' | 'multilingual'` to `ModelConfig` and define candidate entries in `retro-rocket/src/features/boards/types/sentiment.ts`: keep `distilbert-...-student` as `multilingual`, add `Xenova/twitter-roberta-base-sentiment-latest` (`en`) and `Xenova/robertuito-sentiment-analysis` (`es`), each with its `mapLabels` (R2/data-model) — begins satisfying T006.
- [X] T008 Implement per-model label mapping in `retro-rocket/src/features/boards/sentiment/workers/sentimentMapper.ts` so `mapSentiment` always resolves the 3-category taxonomy for every candidate (makes T006 fully pass).
- [X] T009 Build the dev-run evaluation harness `retro-rocket/src/test/features/boards/sentiment/evaluation/benchmark.ts`: load each candidate/config, score card accuracy over T004, team-mood agreement over T005, and record download footprint — **including the current configuration's own footprint as the baseline denominator for the ~2× budget gate** (FR-013/SC-006, U1).
- [X] T010 Run `npm run bench:sentiment` and write the initial **Model Evaluation Record** to `retro-rocket/src/test/features/boards/sentiment/evaluation/results.md` (per-candidate card accuracy, team-mood agreement, thresholds used, footprint, deltas vs current models and vs single-multilingual baseline). **This is the decision gate.**

**Checkpoint**: The winning configuration (or "current models retained") is now known and documented; user-story adoption can proceed.

---

## Phase 3: User Story 1 - More accurate per-card sentiment (Priority: P1) 🎯 MVP

**Goal**: Ship the highest-scoring on-device single-model configuration so per-card badges match human judgement for informal ES/EN (or, if none wins, keep current + documented).

**Independent Test**: Run the curated card set through the adopted config; ≥90% of displayed states match human labels and ≥10 pp above the current models on the same set (SC-001).

### Tests for User Story 1 (write first, must FAIL)

- [X] T011 [P] [US1] Extend `retro-rocket/src/test/features/boards/sentiment/accuracy.bench.test.ts` to assert the adopted config meets SC-001 (≥90% and ≥10 pp over current) on the curated set, or asserts the documented "current retained" outcome.
- [X] T012 [P] [US1] Add a worker-contract test in `retro-rocket/src/test/features/boards/sentiment/workers/sentimentWorker.contract.test.ts` that `init` loads the configured model set and each emitted `result` carries the routed `modelId` (contracts/sentiment-module.md).

### Implementation for User Story 1

- [X] T013 [US1] Set the adopted model as default in `SENTIMENT_MODELS` and bump `MODEL_VERSION` in `retro-rocket/src/features/boards/types/sentiment.ts` (invalidates stale stored states, FR-011).
- [X] T014 [US1] Update `retro-rocket/src/features/boards/sentiment/workers/sentimentWorker.ts` so `init` accepts a model **set** (`modelIds`) and each `result`/`batch_result` includes the model id that classified the card.
- [X] T015 [US1] Update `retro-rocket/src/features/boards/sentiment/hooks/useWorkerManager.ts` to initialize the configured model set (not a single id) and surface the routed `modelId` from worker messages.
- [X] T016 [US1] Re-validate and set confidence thresholds for the adopted model in `DEFAULT_SENTIMENT_CONFIG` (`retro-rocket/src/features/boards/types/sentiment.ts`); update `retro-rocket/src/test/features/boards/sentiment/domain/confidence.test.ts` accordingly (FR-003).

**Checkpoint**: Per-card sentiment is measurably more accurate (or current retained, documented) and results are tagged with the model that produced them.

---

## Phase 4: User Story 2 - A team-mood report that reflects the real room (Priority: P1)

**Goal**: The team-mood report improves because card states improve, and display/aggregation are counted on one consistent confidence basis for the adopted model.

**Independent Test**: On the benchmark boards, the adopted config's report agrees with intended tone on ≥90% of boards and on more boards than the current models (SC-002).

### Tests for User Story 2 (write first, must FAIL)

- [X] T017 [P] [US2] Add a team-mood agreement assertion over the benchmark boards (adopted config) in `retro-rocket/src/test/features/boards/sentiment/accuracy.bench.test.ts` or `hooks/useTeamMood.test.ts` (SC-002).
- [X] T018 [P] [US2] Add a test in `retro-rocket/src/test/features/boards/sentiment/domain/confidence.test.ts` (and/or `hooks/useTeamMood.test.ts`) proving a card visible on the board is counted in the report on the same confidence basis under the new thresholds (FR-003/FR-009).

### Implementation for User Story 2

- [X] T019 [US2] Confirm/adjust `retro-rocket/src/features/boards/sentiment/domain/confidence.ts` so the re-validated thresholds feed BOTH badge display and team-mood aggregation with no divergence (single rule).
- [X] T020 [US2] Regression-check `retro-rocket/src/features/boards/sentiment/domain/moodScore.ts` and `moodDistribution.ts` against the new confidence calibration (inputs unchanged by 011 logic); extend `domain/moodScore.test.ts` if calibration shifts counts.

**Checkpoint**: The team-mood report reflects the room and agrees with the per-card badges.

---

## Phase 5: User Story 3 - Language-appropriate model selection (Priority: P2) — CONDITIONAL

**Goal**: Route Spanish cards to RoBERTuito and English cards to twitter-roberta — **adopted only if** it beats the best single-multilingual baseline by ≥5 pp within the ~2× download budget (FR-007/FR-013). Otherwise keep single-model and document.

**Independent Test**: A Spanish-detected and an English-detected card each go to their language's model; an undetectable card falls back to the multilingual default; a mixed ES/EN board shows no cross-contamination (SC-003/SC-004).

### Tests for User Story 3 (write first, must FAIL)

- [X] T021 [P] [US3] Unit test `detectLanguage` (es / en / unknown, incl. very short text) in `retro-rocket/src/test/features/boards/sentiment/domain/languageDetection.test.ts` — no download.
- [X] T022 [P] [US3] Unit test `routeModel` including `unknown → multilingual default` in `retro-rocket/src/test/features/boards/sentiment/domain/modelRouting.test.ts` (SC-004).
- [X] T023 [P] [US3] Extend `retro-rocket/src/test/features/boards/sentiment/workers/sentimentWorker.contract.test.ts`: ES card → ES model id, EN → EN model id, undetectable → multilingual id, one route's load failure falls back without aborting others (FR-015).

### Implementation for User Story 3

- [X] T024 [P] [US3] Implement `detectLanguage` in `retro-rocket/src/features/boards/sentiment/domain/languageDetection.ts` (vet + add `franc-min` per constitution dependency bar, or a zero-dep heuristic).
- [X] T025 [P] [US3] Implement `routeModel(language, config)` in `retro-rocket/src/features/boards/sentiment/domain/modelRouting.ts` with multilingual default/fallback (data-model route table).
- [X] T026 [US3] Wire routing into `retro-rocket/src/features/boards/sentiment/workers/sentimentWorker.ts`: a per-model pipeline registry, detect language per card on normalized text, route, and tag the result with the routed model id.
- [X] T027 [US3] Update `retro-rocket/src/features/boards/sentiment/hooks/useSentiment.ts` `enrich()` to persist the routed `modelId` (so re-language on edit re-routes and re-analyses) and confirm the worker loads the full model set.
- [X] T028 [US3] Run `npm run bench:sentiment` for the routing config; if it clears ≥5 pp AND fits ~2× budget, keep routing enabled; otherwise revert to single-model and record the decision in `evaluation/results.md` (FR-007). **Then ensure `MODEL_VERSION` reflects the *final* adopted model set (bump again if routing changed the set after T013), so stored results from an interim set are correctly invalidated (M1).**

**Checkpoint**: Each card is analysed by the language-appropriate model, or routing is cleanly reverted with a documented reason.

---

## Phase 6: User Story 4 - Evidence-based, documented, swappable selection (Priority: P3)

**Goal**: The choice is documented and reproducible, the model set swaps behind the module boundary, and a model change recomputes stale states.

**Independent Test**: Review `evaluation/results.md`; swap the configured model → prior states recompute; no consumer outside the module changes (SC-005/SC-007).

### Tests for User Story 4 (write first, must FAIL)

- [X] T029 [P] [US4] Extend `retro-rocket/src/test/features/boards/sentiment/domain/staleness.test.ts` to prove a `modelId` OR `MODEL_VERSION` change marks prior results stale so they recompute; overrides stay fresh (SC-005).
- [X] T030 [P] [US4] Extend `retro-rocket/src/test/features/boards/sentiment/moduleBoundary.test.ts` to assert routing/detection additions are reachable only via `@/features/boards/sentiment` and a model swap needs no import change outside the module (SC-007).

### Implementation for User Story 4

- [X] T031 [US4] Finalize the **Model Evaluation Record** in `retro-rocket/src/test/features/boards/sentiment/evaluation/results.md`: all candidates, card + team-mood scores, footprints, deltas, and the final decision with rationale (FR-005).
- [X] T032 [US4] Update the public surface `retro-rocket/src/features/boards/sentiment/index.ts` to export `detectLanguage`/`routeModel` for tests only if useful, keeping the single-entry-point invariant.
- [X] T033 [US4] Remove any model/fallback/mapping code left unused by the adopted configuration (e.g. an unused star-model fallback) with no behavioural regression (FR-017); confirm no remaining references.

**Checkpoint**: The selection is auditable, swappable, and self-invalidating.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T034 [P] Add/verify any new or changed user-visible strings (e.g. loading/status text) are keyed in BOTH `es` and `en` i18next locales — no hardcoded strings (Constitution i18n).
- [~] T035 Run the full gate suite from `retro-rocket/`: `tsc` type-check, ESLint, `npm run test` with coverage. ✅ DONE HERE: type-check clean, 0 lint errors, 2689 unit tests pass, coverage 56.3/81.7/69.3/56.3 (above the repo floors 50/78/64/50). ⏳ PENDING: the Playwright E2E suite (`npm run e2e`) needs the Firebase emulators + Playwright browsers — run in CI. This feature does not touch any critical E2E flow (board create/vote/group/countdown/export/auth); only the non-critical sentiment badge/dashboard surface changes.
- [~] T036 Execute `specs/013-sentiment-model-selection/quickstart.md` validation. ✅ DONE HERE: SC-001 (90.0%) and SC-002 (4/4 boards) validated via the gated benches; warm-reload/override behaviour covered by `useSentiment.test.ts`; no new user-facing strings added (loading text pre-existed) so WCAG surface is structurally unchanged. ⏳ PENDING: the manual in-browser smoke (dev server + real Firebase) — informal ES/EN cards on a mixed board, visual badge check in both themes.
- [X] T037 [P] Verify inference remains fully on-device (0 external inference calls) and the selected configuration's recorded footprint ≤ ~2× current (SC-006).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories** (its benchmark decides what US1/US3 adopt).
- **US1 (Phase 3)**: Depends on Foundational. MVP.
- **US2 (Phase 4)**: Depends on US1 (consumes the adopted model's card states + thresholds).
- **US3 (Phase 5)**: Depends on US1 (extends the worker/model-set seam with routing); conditional on the benchmark.
- **US4 (Phase 6)**: Depends on the adopted config from US1 (+US3 if routing kept); documents and hardens it.
- **Polish (Phase 7)**: After all desired stories.

### Within Each User Story

- Tests written and FAILING before implementation (TDD, NON-NEGOTIABLE).
- Types/config before worker; worker before hooks; pure domain units before wiring.

### Parallel Opportunities

- Setup: T002, T003 parallel.
- Foundational: T004, T005 parallel; T006 (mapping tests) parallel with fixture work (T007 config depends on T006 being written first).
- US1 tests T011, T012 parallel; US2 tests T017, T018 parallel.
- US3 pure units T021, T022, T024, T025 parallel (different files); T023 parallel with them.
- US4 tests T029, T030 parallel.
- Polish T034, T037 parallel.

---

## Parallel Example: User Story 3 (pure units)

```bash
# Write these failing tests together (different files):
Task: "Unit test detectLanguage in domain/languageDetection.test.ts"   # T021
Task: "Unit test routeModel in domain/modelRouting.test.ts"            # T022
Task: "Worker routing contract test in workers/sentimentWorker.contract.test.ts" # T023

# Then implement the pure units together (different files):
Task: "Implement detectLanguage in domain/languageDetection.ts"        # T024
Task: "Implement routeModel in domain/modelRouting.ts"                 # T025
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1 Setup → Phase 2 Foundational (build + run the benchmark = decision gate).
2. Phase 3 US1: adopt the winning single-model config (or document current retained).
3. Phase 4 US2: confirm the team-mood report and thresholds are consistent.
4. **STOP and VALIDATE** against SC-001/SC-002. This alone resolves the user's core complaint on both card and team analysis.

### Incremental Delivery

- MVP (US1+US2) → evaluate US3 routing: adopt only if it clears the ≥5 pp / ~2× gate → US4 documents & hardens → Polish.
- If US3 does not clear the gate, skip its runtime changes entirely (no `franc-min`, no second model) — the record documents the negative result and runtime stays single-model.

---

## Notes

- [P] = different files, no incomplete-task dependency.
- The whole feature is evidence-gated: T010 (and T028 for routing) are the decision points; adoption tasks are conditional on them.
- Overrides remain authoritative throughout (never clobbered by re-analysis) — preserved from 011, covered by existing tests.
- Commit after each task or logical group; verify each test fails before implementing.
