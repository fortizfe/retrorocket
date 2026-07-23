# Phase 0 Research: Sentiment Model Selection & Language-Aware Routing

**Feature**: 013-sentiment-model-selection · **Date**: 2026-07-23

All findings resolve the open technical choices in the plan. The *final* model
choice is still made by the evaluation harness against the curated benchmark
(that is the feature's deliverable); this document fixes the **candidate set,
the constraints, and the decision mechanics** so implementation is unambiguous.

## R1 — Candidate on-device (ONNX / transformers.js) sentiment models

**Decision**: Evaluate the following ONNX-ported models, all confirmed
loadable in-browser via `@huggingface/transformers` (the library already in the
project):

| Role | Model id | Classes | Trained on | Notes |
|------|----------|---------|-----------|-------|
| Multilingual baseline / default / fallback | `Xenova/distilbert-base-multilingual-cased-sentiments-student` (current primary) | pos/neu/neg | multilingual reviews | Smallest (distilled, 6-layer); today's model — the baseline to beat. |
| English route | `Xenova/twitter-roberta-base-sentiment-latest` | LABEL_0=neg, LABEL_1=neu, LABEL_2=pos | English tweets (informal) | CardiffNLP; matches informal retro phrasing far better than review-trained models. |
| Spanish route | `Xenova/robertuito-sentiment-analysis` | POS / NEG / NEU | ~500M Spanish tweets (informal) | pysentimiento RoBERTuito; the strongest open on-device Spanish social-text model, ONNX-ported by Xenova. |
| Multilingual alt (evaluate if ONNX port usable) | `cardiffnlp/twitter-xlm-roberta-base-sentiment(-multilingual)` | pos/neu/neg | multilingual tweets (8 langs incl ES/EN) | If an ONNX build loads, it is a single-model informal-text option competing with per-language routing. |

**Rationale**: The current models are review/general-trained; retro cards are
short, informal, often fragmentary ("faltó tiempo", "great teamwork"). The
Twitter/social-media-trained models above are purpose-matched to that register,
and dedicated ES (RoBERTuito) and EN (twitter-roberta) models are exactly the
"different model per language" the user asked us to evaluate — and they exist as
on-device ONNX ports, so routing is feasible, not hypothetical.

**Alternatives considered**: BETO (`finiteautomata/beto-sentiment-analysis`) —
strong Spanish 3-class but no confirmed Xenova ONNX port, so not on-device
without a conversion step (deprioritised vs RoBERTuito which is already ported).
`nlptown/bert-base-multilingual-uncased-sentiment` (current fallback, 1–5 stars)
— kept only as an emergency fallback; star→3-class bucketing is lossy.

## R2 — Label mapping per model (FR-004: three-category taxonomy preserved)

**Decision**: Each configured model carries its own `mapLabels` in
`SENTIMENT_MODELS` so the worker always emits `positive|negative|neutral`:

- `twitter-roberta-base-sentiment-latest`: `LABEL_2→positive`, `LABEL_1→neutral`,
  `LABEL_0→negative` (also accept literal `positive/neutral/negative` strings).
- `robertuito-sentiment-analysis`: `POS→positive`, `NEU→neutral`, `NEG→negative`.
- distilbert student: already emits positive/negative/neutral-style labels
  (existing default mapping path).

**Rationale**: Mapping lives in config, not scattered in the worker, so adding or
swapping a model is a config change (SC-007 — no change outside the module
boundary). All three candidates are natively 3-class, so no lossy 2-class/star
mapping is adopted for a primary route.

## R3 — Model-download budget tension (FR-013 / SC-006)

**Decision**: Record every candidate configuration's total on-device download
footprint and treat the ~2× current-footprint ceiling as a hard gate in the
evaluation. Prefer quantized (q8/int8) ONNX builds; only adopt language routing
if the two-model footprint stays within budget **and** clears the ≥5 pp accuracy
gate.

**Rationale (the real tension)**: Today's steady state loads **one** distilled
multilingual model (~tens of MB q8). A full ES+EN routing setup loads **two**
roberta-class models (~110–135 MB q8 each), which can exceed ~2×. Therefore:

1. First establish the best **single-model** baseline (current distilbert vs. a
   multilingual twitter-XLM-R if its port loads).
2. Then measure routing (RoBERTuito + twitter-roberta). Adopt routing only if it
   (a) beats that baseline by ≥5 pp card-accuracy **and** (b) fits the ~2×
   ceiling using quantized builds. If it wins on accuracy but breaches budget,
   record the tradeoff and fall back to the best single model (a documented,
   valid outcome per clarification 1).

**Alternatives considered**: Hybrid routing (multilingual default + one
specialized model for the language where the gap is largest) — kept as a
fallback design if full two-model routing breaches budget but one route clearly
wins. Unquantized (fp32) models — rejected on size.

## R4 — Language detection (only if routing is adopted)

**Decision**: If routing is adopted, detect each card's language from its own
text with a **small, on-device** step and route accordingly; a card whose
language is not confidently detected falls back to the multilingual default
model (FR-009). Preferred mechanism: `franc-min` (tiny, dependency-free of
models) or an equivalent lightweight heuristic; the choice is vetted against the
constitution's dependency bar before adding. Detection runs before inference,
on the same normalized text.

**Rationale**: Retro cards are short, so detection must be cheap and degrade
gracefully; misdetection must never error, only fall back. Detection is a pure
function → unit-testable without any model download (FR-014).

**Alternatives considered**: `@huggingface/transformers` language-id model —
rejected (another model download against the budget for a trivial 2-language
decision). Board-/app-level language setting — rejected: mixed ES/EN boards are
common and FR-008 forbids requiring participants to tag language.

## R5 — Evaluation harness: CI vs dev-run split

**Decision**: Split the benchmark into (a) **pure unit tests** for
`detectLanguage`, `routeModel`, and each `mapLabels` (run in CI, no network),
and (b) a **dev-run evaluation harness** (`evaluation/benchmark.ts`) that
actually downloads candidate models, runs them over the curated card set and
benchmark boards, and writes the **Model Evaluation Record** (`evaluation/
results.md`) with per-candidate card accuracy, team-mood agreement, and
footprint. The dev-run harness is excluded from the CI unit run (guarded/skipped)
so coverage never depends on model downloads.

**Rationale**: FR-014 requires the selection/routing logic to be unit-testable
without a live model; FR-001/FR-002/FR-005 require a documented benchmark that
inherently needs the real models. Separating them satisfies both and keeps CI
fast and deterministic. The existing `accuracy.bench.test.ts` is the seam to
extend.

## R6 — Staleness / model-version invalidation (reuse from 011)

**Decision**: Bump `MODEL_VERSION` (currently `'hf-transformers-3'`) whenever the
configured model set changes, and tag each stored result with the **routed**
`modelId` (the model that actually classified that card, not a global id).
`isFresh` already invalidates on `modelId` **or** `modelVersion` change, so a
model swap recomputes prior states with no new code (FR-011, SC-005).

**Rationale**: 011 already built exactly this invalidation; routing only changes
*which* `modelId` is written per card. Storing the routed id keeps staleness
correct when, e.g., a card is edited from Spanish to English and re-routes.

## Open items → none

All Technical Context unknowns are resolved. The only values intentionally left
to implementation tuning (per the spec's clarifications) are the concrete
confidence thresholds (FR-003), derived from the benchmark for the selected
model(s).

## Sources

- Transformers.js docs & pipelines — https://huggingface.co/docs/transformers.js/en/index
- `Xenova/twitter-roberta-base-sentiment-latest` — https://huggingface.co/Xenova/twitter-roberta-base-sentiment-latest
- `Xenova/robertuito-sentiment-analysis` — https://huggingface.co/Xenova/robertuito-sentiment-analysis
- `cardiffnlp/twitter-xlm-roberta-base-sentiment-multilingual` — https://huggingface.co/cardiffnlp/twitter-xlm-roberta-base-sentiment-multilingual
- RoBERTuito paper — https://arxiv.org/pdf/2111.09453
