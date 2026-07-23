# Contract: Sentiment Module Public Surface & Worker Messages (delta)

**Feature**: 013-sentiment-model-selection · **Date**: 2026-07-23

This records only the **delta** to the existing contract. Everything not listed
here is unchanged from feature 011. The module's single public entry point
remains `@/features/boards/sentiment` (enforced by `moduleBoundary.test.ts`).

## Public module surface (`src/features/boards/sentiment/index.ts`)

**Unchanged**: `useSentiment`, `useTeamMood`, `SentimentBadge`,
`SentimentFilter`, `TeamMoodDashboard`, `isConfident`, `isFresh`, `hashContent`,
`normalizeForInference`, `calculateMoodScore`, `computeMoodDistribution`,
`SentimentResult`, `SentimentConfiguration`, `DEFAULT_SENTIMENT_CONFIG`,
`SENTIMENT_MODELS`, `MODEL_VERSION`, team-mood types.

**Added (internal → optionally exported for tests)**:

| Export | Signature | Purpose |
|--------|-----------|---------|
| `detectLanguage` | `(text: string) => 'es' \| 'en' \| 'unknown'` | Pure, on-device language detection for routing (R4). |
| `routeModel` | `(language, config) => string` | Pure resolver: detected language → model id, with multilingual default (R1/R4). |

**Changed types**:
- `ModelConfig` gains `language: 'es' \| 'en' \| 'multilingual'` (see data-model).
- `SENTIMENT_MODELS` becomes a language-tagged set; `MODEL_VERSION` is bumped.

**Invariant**: Consumers outside the module continue to import only from
`index.ts`; adding/swapping a model or toggling routing is a config-only change
with no new required import for consumers (SC-007).

## Worker message contract (`workers/sentimentWorker.ts`)

### Inbound

| Message | Before | After |
|---------|--------|-------|
| `init` | `{ modelId: string }` — loads one pipeline | `{ modelIds: string[] }` — loads the configured model **set** (1 for single-model mode, N for routing). Backward-tolerant: a single `modelId` still works. |
| `analyze` | `{ cardId, content }` | unchanged; worker routes internally by detected language when routing is active |
| `batch_analyze` | `{ requests: {cardId, content}[] }` | unchanged |

### Outbound

| Message | Change |
|---------|--------|
| `ready` | `{ modelIds: string[] }` — reports the loaded set. |
| `loading` | unchanged (per-model status ok). |
| `result` / `batch_result` | **adds `modelId`** to each result = the model that classified that card (routed). Consumer already tags results; it now trusts the worker's routed id instead of a single config id. |
| `error` | unchanged; per-card failure still yields neutral/0 fallback (FR-015). |

### Routing behaviour (worker-internal)

```text
for each card:
  clean = normalizeForInference(content)         # unchanged (011)
  if !clean: emit neutral/0                       # unchanged (FR-005)
  lang  = routing ? detectLanguage(clean) : 'multilingual'
  model = routeModel(lang, config)               # multilingual default on 'unknown'
  out   = pipelines[model](clean, {truncation})
  emit { cardId, sentiment: mapLabels(out), confidence, modelId: model }
```

**Contract tests** (extend `sentimentWorker.contract.test.ts`):
- `init` with N model ids reaches `ready` reporting all N.
- A Spanish-detected card is classified by the ES model id; an English-detected
  card by the EN model id; an undetectable card by the multilingual model id.
- Each emitted `result` carries the routed `modelId`.
- Model-load failure of one route falls back per FR-015 without aborting others.

## Persistence contract (Firestore) — unchanged

`SentimentResult` schema is unchanged; `modelId` now carries the routed id and
`modelVersion` the bumped value. `isFresh` (already shipped) invalidates on
either change — no migration needed; stale results simply recompute (SC-005).
