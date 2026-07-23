# Contract: Sentiment Web Worker Message Protocol

**Feature**: 011-ai-sentiment-accuracy | **Type**: Web Worker (module worker)

The worker wraps `@huggingface/transformers` inference off the main thread. The
message shapes below are **unchanged** by the migration (F8) except where noted;
the transport contract is preserved so the orchestration layer is untouched by
the library swap.

## Inbound (main → worker)

| `type` | `data` | Effect |
|--------|--------|--------|
| `init` | `{ modelId: string }` | Load the `text-classification` pipeline for `modelId`; fall back to the non-primary model on load failure. Emits `loading` then `ready` (or `error`). |
| `analyze` | `{ cardId: string; content: string }` | Normalize `content` (`normalizeForInference`); if `null` → emit neutral/0 result; else run inference and emit `result`. |
| `batch_analyze` | `{ requests: { cardId; content }[] }` | Same as `analyze` per item; emits one `batch_result`. Per-item failure ⇒ that item is neutral/0, never aborts the batch. |

## Outbound (worker → main)

| `type` | `data` | Meaning |
|--------|--------|---------|
| `loading` | `{ modelId, status }` | Model downloading/initializing. |
| `ready` | `{ modelId }` | Pipeline ready for the given model. |
| `result` | `{ cardId, sentiment, confidence, timestamp }` | Single-card outcome. |
| `batch_result` | `{ results: [{ cardId, sentiment, confidence, timestamp }] }` | Batch outcome. |
| `error` | `{ error, modelId?, cardId? }` | Load failure (`modelId`, no `cardId`) triggers main-side retry/back-off; per-card failure carries `cardId`. |

## Migration-specific requirements (F8)

- Import from `@huggingface/transformers` (not `@xenova/transformers`); keep
  `env.allowLocalModels = false`, `env.allowRemoteModels = true`.
- Create the pipeline once per model; on the primary model's load failure, fall
  back to the star-rating model (`SENTIMENT_MODELS`), mapping 1–2★→negative,
  3★→neutral, 4–5★→positive (existing `mapLabels`).
- **Typing**: eliminate the `(pipeline as any)(clean)` casts where the new
  library's types allow a correctly-typed `text-classification` call; if a
  precise type is still not expressible, retain a single narrowly-scoped `any`
  with the mandated justifying comment (Constitution: strict types).
- Pass `{ truncation: true }` (defensive) in addition to `normalizeForInference`
  capping, so text can never exceed the model's 512-token limit.

## Invariants

- Inference NEVER runs on the main thread. (Performance)
- No card text leaves the device — the worker only talks to the local model
  runtime and the HF hub for model weights, never sends card content anywhere.
  (Privacy assumption)
- Output normalization to `{ sentiment, confidence }` is centralized in
  `sentimentMapper.mapSentiment` for both single and batch paths (no divergent
  mapping).
