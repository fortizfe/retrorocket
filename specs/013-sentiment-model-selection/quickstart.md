# Quickstart & Validation: Sentiment Model Selection & Routing

**Feature**: 013-sentiment-model-selection · **Date**: 2026-07-23

How to run the evaluation, read its output, and validate each success criterion.
All commands run from `retro-rocket/`.

## Prerequisites

- Node + project deps installed (`npm install`).
- `@huggingface/transformers` ^3.8.1 already present.
- The curated benchmark: labelled cards in
  `src/test/features/boards/sentiment/fixtures/cards.ts` and boards with intended
  tone in `fixtures/boards.ts` (extended by this feature with more short/informal
  ES + EN examples).

## 1. Run the fast unit/logic suite (CI-safe, no downloads)

```bash
npm run test -- src/test/features/boards/sentiment
```

Expected: green, including new pure-unit tests for `detectLanguage`,
`routeModel`, and each model's `mapLabels`; coverage stays ≥80%. These never
download a model (FR-014).

## 2. Run the model evaluation harness (dev-run, downloads models)

```bash
npm run bench:sentiment      # wraps evaluation/benchmark.ts; excluded from CI
```

Expected: writes/refreshes
`src/test/features/boards/sentiment/evaluation/results.md` — the **Model
Evaluation Record** — with, per candidate: card accuracy, team-mood agreement,
confidence thresholds used, download footprint, delta vs the two current models
(and vs the single-multilingual baseline for routing), and adopt/reject.

## 3. Validate success criteria against the record

| Criterion | How to check |
|-----------|--------------|
| **SC-001** (card accuracy) | Adopted config ≥90% on the curated set **and** ≥10 pp over the current models — or, if nothing clears it, record shows current models retained with all candidates' scores. |
| **SC-002** (team mood) | Adopted config agrees with intended tone on ≥90% of benchmark boards and on more boards than the current models. |
| **SC-003** (routing decision) | Record shows the single-vs-routing comparison; routing adopted only if ≥5 pp gain (FR-007) within budget; else single model with reason. |
| **SC-004** (uncertain language) | `modelRouting.test.ts`: 100% of `'unknown'`-language cards route to the multilingual default and produce a valid state, no error. |
| **SC-005** (staleness on swap) | Bump `MODEL_VERSION`, reload a board with stored results → all prior results recompute; overrides preserved. |
| **SC-006** (privacy + budget) | No network calls to an inference endpoint (inference is in-worker/WASM); record's `downloadFootprint` ≤ ~2× current. |
| **SC-007** (module boundary) | `moduleBoundary.test.ts` green; swapping the configured model needs no change outside `features/boards/sentiment`. |

## 4. Manual smoke test in the app

```bash
npm run dev
```

1. Open a board; enable analysis.
2. Add clearly positive/negative/neutral cards in **Spanish** and **English**,
   including short informal ones ("faltó tiempo", "great teamwork", "reuniones
   eternas"). Confirm badges match human judgement.
3. Add a mixed ES/EN board; confirm each card is judged on its own text (no
   cross-contamination) and the team-mood report matches the room.
4. Reload with unchanged text → no re-analysis flicker (warm reuse).
5. Override a card, reload → override persists and is counted in the report.

## Rollback / conditional outcome

If the evaluation shows no on-device candidate beats the current models by the
target margin, keep `SENTIMENT_MODELS` as-is, do **not** add routing or a
language-detector dependency, and commit only the evaluation harness + record
documenting the negative result. This is a valid, successful outcome
(clarification 1) and leaves runtime behaviour unchanged.
