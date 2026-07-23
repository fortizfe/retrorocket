# Phase 1 Data Model: Sentiment Model Selection & Routing

**Feature**: 013-sentiment-model-selection · **Date**: 2026-07-23

Entities are the configuration and evaluation shapes this feature introduces or
changes. Runtime `SentimentResult` and the team-mood entities are reused from
011 with one behavioural note (routed `modelId`).

## ModelConfig *(changed)*

Per-model configuration entry in `SENTIMENT_MODELS`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | HF model id, e.g. `Xenova/robertuito-sentiment-analysis`. |
| `name` | `string` | Human-readable label (non-user-facing / dev). |
| `description` | `string` | Purpose/notes. |
| `language` | `'es' \| 'en' \| 'multilingual'` | **NEW** — the route this model serves. `multilingual` is the default/fallback. |
| `primary` | `boolean` | Retained for single-model mode; the `multilingual` default is primary when routing is off. |
| `mapLabels?` | `(labels) => SentimentType` | Per-model label→taxonomy map (R2). Required for any model whose raw labels are not already `positive/negative/neutral`. |

**Validation rules**:
- Every configured model MUST resolve to the 3-category taxonomy (native or via
  `mapLabels`) — FR-004.
- Exactly one model MUST have `language: 'multilingual'` to serve as the
  default/fallback route — FR-009.
- When routing is **off**, the config reduces to a single primary model (the
  011 shape) with no behavioural change.

## Language Route Table *(new — present only if routing adopted)*

Derived from `SENTIMENT_MODELS`; maps a detected language to a model id.

| Key | Value | Notes |
|-----|-------|-------|
| `'es'` | model id with `language:'es'` | Falls back to the `multilingual` model if no ES model configured. |
| `'en'` | model id with `language:'en'` | Falls back to `multilingual` if none. |
| `'unknown'` / low-confidence | the `multilingual` model id | FR-009 — never errors. |

Pure resolver: `routeModel(language, config) → modelId`.

## Detected Language *(new — transient, not persisted)*

Output of `detectLanguage(normalizedText)`.

| Field | Type | Notes |
|-------|------|-------|
| `language` | `'es' \| 'en' \| 'unknown'` | `'unknown'` when below the detector's confidence floor → default route. |

## SentimentResult *(reused; one behavioural change)*

Unchanged shape (see 011). Behavioural note: `modelId` now stores the **routed**
model that actually classified the card (not a single global id), and
`modelVersion` stores the bumped `MODEL_VERSION`. This keeps `isFresh`
invalidation correct across routing (FR-011, SC-005): editing a card such that
its detected language (and therefore its route) changes yields a different
`modelId` → recompute.

| Field | Type | Change |
|-------|------|--------|
| `sentiment` | `SentimentType` | — |
| `confidence` | `number` | — |
| `cardId` | `string` | — |
| `modelId?` | `string` | now = routed model id |
| `modelVersion?` | `string` | bumped when the model set changes |
| `contentHash?` | `string` | — |
| `isOverride?` | `boolean` | overrides remain authoritative (fresh regardless of model) |

## Model Evaluation Record *(new — documentation artifact)*

Persisted at `src/test/features/boards/sentiment/evaluation/results.md`,
produced by the dev-run harness. Not runtime data.

| Field | Type | Notes |
|-------|------|-------|
| `candidateId` | `string` | Model id or routing-config name. |
| `cardAccuracy` | `percentage` | Share of curated cards matching human labels (FR-001, SC-001). |
| `teamMoodAgreement` | `percentage` | Share of benchmark boards whose report matches intended tone (FR-002, SC-002). |
| `confidenceThresholds` | `{positive,negative,neutral}` | Thresholds used for this candidate (FR-003). |
| `downloadFootprint` | `MB` | Total on-device model download (FR-013, SC-006). |
| `decision` | `'adopted' \| 'rejected'` | With one-line rationale. |
| `baselineDelta` | `percentage points` | vs. the two current models (SC-001) and vs. single-multilingual baseline for routing (FR-007). |

**Validation rules**:
- The adopted candidate MUST be the highest-scoring within budget, or — if none
  beats the current models by ≥10 pp — the record MUST show the current models
  retained (clarification 1).
- Routing is marked `adopted` only if `baselineDelta` vs the single-multilingual
  baseline ≥ 5 pp **and** `downloadFootprint` ≤ ~2× current (FR-007, FR-013).

## Configuration state transitions

```text
single-model (011 default)
      │  evaluation shows routing wins ≥5pp AND fits ~2× budget
      ▼
language-aware routing (es→RoBERTuito, en→twitter-roberta, default→multilingual)
      │  any model set change  → MODEL_VERSION bump → stored results stale → recompute
      ▼
(warm state) fresh results reused; overrides always preserved
```
