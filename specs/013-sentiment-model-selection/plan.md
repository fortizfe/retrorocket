# Implementation Plan: Better-Fitting Sentiment Models & Language-Aware Model Selection

**Branch**: `013-sentiment-model-selection` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-sentiment-model-selection/spec.md`

## Summary

The team-mood capability shipped in feature 011 works structurally (correct
aggregation, single public module, staleness on model change) but its two
configured general-purpose multilingual models classify short, informal ES/EN
retro-card text poorly, which drags both per-card badges and the derived
team-mood report off. This feature is an **evidence-based model-selection
change** inside the existing `src/features/boards/sentiment` module: build a
repeatable evaluation harness over a curated ES/EN benchmark, measure candidate
on-device (ONNX / transformers.js) models on *both* card accuracy and team-mood
agreement, and adopt whichever configuration wins — including, if it beats the
best single-multilingual baseline by ≥5 pp, a **language-aware routing** layer
that sends Spanish cards and English cards to the model best for each. If no
candidate beats the current models by the target margin, the current models are
kept and the evaluation record documents why (a valid outcome).

Web research already confirms the key candidates exist as ONNX ports runnable
in-browser: `Xenova/twitter-roberta-base-sentiment-latest` (English, 3-class,
tweet-trained → informal), `Xenova/robertuito-sentiment-analysis` (Spanish,
3-class POS/NEG/NEU, RoBERTuito, 500M tweets → informal), and the current
`Xenova/distilbert-base-multilingual-cased-sentiments-student` as the
multilingual baseline/default. Details and the size/budget tension are captured
in [research.md](./research.md).

The change is deliberately confined to the model **selection and routing** seam
(config + worker pipeline management + an optional language-detection step) plus
the confidence thresholds those models feed; the 011 aggregation, staleness,
override, and privacy machinery is reused unchanged.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`), React 18.2

**Primary Dependencies**: `@huggingface/transformers` ^3.8.1 (on-device ONNX
inference in a Web Worker); i18next ^25 (existing user-visible strings); Vite ^4
(Web Worker bundling via `new Worker(new URL(...))`). Candidate new dependency:
a tiny language detector (e.g. `franc-min`) **only if** language-aware routing is
adopted — subject to the constitution's dependency-vetting bar.

**Storage**: Firestore for persisted `SentimentResult`s (unchanged); each result
already carries `modelId` + `modelVersion` + `contentHash` for staleness.

**Testing**: Vitest + Testing Library (unit, ≥80% coverage floor); an offline
evaluation/benchmark harness that runs candidate models against the curated set
(dev-run, not CI — it downloads models); Playwright for the existing critical
flows (unchanged surface).

**Target Platform**: Browser (WASM + Web Worker); inference runs fully on-device,
no card text leaves the client.

**Project Type**: Web application (SPA under `retro-rocket/`).

**Performance Goals**: Warm reload performs zero re-inference (011 SC-002,
preserved). A model swap invalidates and recomputes prior states. Board
interaction stays responsive during batch analysis (existing chunked dispatch).

**Constraints**: On-device only (no external inference). Total model-download
footprint of the selected configuration ≤ ~2× the current footprint (FR-013,
SC-006). Three-category taxonomy (positive/negative/neutral) preserved; any
2-class/star model needs a validated mapping (FR-004). Selection/routing logic
MUST be unit-testable without a live model download (FR-014).

**Scale/Scope**: One retro board's worth of cards per session (tens to low
hundreds); ES + EN locales only.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Impact & Compliance |
|-----------|--------------------|
| I. TDD (NON-NEGOTIABLE) | Each behavioural change (label mapping per new model, language routing, default/fallback on uncertain language, `MODEL_VERSION` bump → recompute) lands test-first. New pure units: `detectLanguage`, `routeModel`, per-model `mapLabels`. |
| II. Library-First | All work stays inside the existing `src/features/boards/sentiment` module behind its single public `index.ts`; no new top-level feature. Model config + routing added as internal domain units. |
| III. Proven Third-Party Libraries | Inference stays on `@huggingface/transformers`. New models are HF-hosted ONNX ports (no bespoke inference). A language-detector dependency (if routing adopted) is vetted for maintenance/license/bundle before adding; a zero-dependency heuristic is the fallback. |
| IV. SOLID | Model selection/routing sits behind pure functions; the worker depends on a config-driven pipeline registry, not hard-coded model ids. No Firestore coupling changes. |
| V. Simplicity (KISS/YAGNI) | Routing is **conditional** — added only if it beats the single-model baseline by ≥5 pp; otherwise the simpler single-model design is kept. This reverses 011's blanket no-routing rule *only when evidence justifies it* → tracked in Complexity Tracking. |
| VI. Unit Testing & 80% Floor | New domain units fully unit-tested; coverage floor maintained. The model-download benchmark is a dev-run harness (mocked/skipped in CI) so unit tests never require network. |
| VII. E2E (Playwright) | No change to critical-flow surface (board create/add/vote/group/countdown/export/auth). Existing E2E remains green; sentiment badges are non-critical UI. |
| VIII. Accessibility (WCAG 2.1 AA) | No new user-facing surface; badges/dashboard unchanged in structure. Any changed/added string goes through i18next; contrast/focus/use-of-color already satisfied by 009 and unchanged here. |
| Type safety / no `any` | New units strictly typed. Existing narrow casts in the worker (documented) are not widened. |

**Result**: PASS (no unjustified violations). One deliberate, evidence-gated
reversal of an 011 decision is recorded in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/013-sentiment-model-selection/
├── plan.md              # This file
├── research.md          # Phase 0 — candidate models, sizes, routing/detection decisions
├── data-model.md        # Phase 1 — config & evaluation entities
├── quickstart.md        # Phase 1 — how to run the evaluation & validate outcomes
├── contracts/
│   └── sentiment-module.md   # Public module + worker message contract (delta)
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
retro-rocket/src/features/boards/
├── types/
│   ├── sentiment.ts                 # SENTIMENT_MODELS → language-keyed config;
│   │                                #   ModelConfig gains `language`; MODEL_VERSION bump
│   └── teamMood.ts                  # unchanged
└── sentiment/
    ├── index.ts                     # public surface (add routing/detect exports if useful)
    ├── domain/
    │   ├── languageDetection.ts     # NEW — detectLanguage(text) → 'es'|'en'|'unknown' (pure)
    │   ├── modelRouting.ts          # NEW — routeModel(language, config) → modelId (pure)
    │   ├── confidence.ts            # thresholds re-validated for selected model(s)
    │   ├── staleness.ts             # unchanged (already keys on modelId + version)
    │   ├── textNormalization.ts     # unchanged
    │   └── moodScore.ts / moodDistribution.ts  # unchanged
    ├── workers/
    │   ├── sentimentWorker.ts       # multi-pipeline registry (one per configured model);
    │   │                            #   route per card by language when routing active
    │   └── sentimentMapper.ts       # per-model label maps (roberta LABEL_x, robertuito POS/NEG/NEU)
    └── hooks/
        ├── useWorkerManager.ts      # init/load the configured model set (not a single id)
        └── useSentiment.ts          # enrich() tags result with the *routed* modelId

retro-rocket/src/test/features/boards/sentiment/
├── accuracy.bench.test.ts          # EXTEND — run candidate configs over the curated set
├── evaluation/                     # NEW — Model Evaluation Record output + fixtures
│   ├── benchmark.ts                # dev-run harness (downloads models; skipped in CI)
│   └── results.md                  # documented per-candidate scores + final decision
├── fixtures/cards.ts               # EXTEND — more short/informal ES + EN labelled cards
├── fixtures/boards.ts              # EXTEND — benchmark boards with intended tone
├── domain/languageDetection.test.ts # NEW
├── domain/modelRouting.test.ts       # NEW
└── moduleBoundary.test.ts          # keep public surface enforced
```

**Structure Decision**: Single SPA project (`retro-rocket/`), all changes inside
the existing `features/boards/sentiment` module and its mirror test tree. No new
module or app is introduced — this is a targeted change to the model-selection
seam of an existing library-first capability.

## Complexity Tracking

> Filled because the design conditionally reverses an explicit 011 decision
> (FR-002a: "single multilingual model, no per-card language routing").

| Violation / Deviation | Why Needed | Simpler Alternative Rejected Because |
|-----------------------|------------|--------------------------------------|
| Per-card language detection + per-language model routing (reverses 011 FR-002a) | The user explicitly asked to evaluate a per-language model, and informal ES has a strong dedicated on-device model (RoBERTuito) that a general multilingual model underperforms. | Keeping a single multilingual model is the *default* and is retained unless routing wins by ≥5 pp on the benchmark; the complexity is gated on measured value, not added speculatively. |
| Loading 2 models instead of 1 (routing) | Each language route needs its own pipeline in the worker. | Rejected only if it breaches the ~2× download budget (FR-013); the evaluation records footprint and may conclude a single model wins on the accuracy/size tradeoff — in which case routing is dropped and no extra model is loaded. |

## Phase 0 — Research (complete)

See [research.md](./research.md). All open technical choices resolved: concrete
ONNX candidate models per language, their label schemes and approximate sizes,
the download-budget tension and how the evaluation resolves it, the
language-detection approach (conditional), and the CI-vs-dev split for the
benchmark. No `NEEDS CLARIFICATION` remain.

## Phase 1 — Design & Contracts (complete)

- [data-model.md](./data-model.md) — `ModelConfig` (+`language`), the
  language-keyed `SENTIMENT_MODELS` / route table, the Model Evaluation Record,
  and the unchanged `SentimentResult` (with `modelId`/`modelVersion` now set to
  the *routed* model).
- [contracts/sentiment-module.md](./contracts/sentiment-module.md) — the delta to
  the worker message contract (init loads a model *set*; results tagged with the
  routed model) and the module's public surface.
- [quickstart.md](./quickstart.md) — how to run the evaluation harness, read the
  Model Evaluation Record, and validate SC-001…SC-007.

**Post-design Constitution re-check**: PASS — design keeps everything behind the
existing module boundary, adds only pure, unit-testable units plus a config-driven
worker registry, and gates the one KISS deviation on measured benchmark value.
