# Implementation Plan: Accurate AI Card Sentiment & Team Mood Analysis

**Branch**: `011-ai-sentiment-accuracy` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-ai-sentiment-accuracy/spec.md`

## Summary

Correct the deviations that make per-card sentiment states (F1–F3) and the
team-mood report (F4–F7) unreliable, and restructure the capability behind one
library-first module boundary (F8) with the dead code removed (F9). Concretely:
fix content-hash staleness so results survive reloads and re-run only on real
text/model changes; normalize/cap card text before inference; unify a single
confidence rule used by badges, counts, filters, and the mood aggregation;
recompute the mood report from one column-role-adjusted distribution so the
score, percentages, and alerts always agree; replace the mood formula so an
all-neutral board lands at ≈4.6/10 ("Preocupante"); migrate inference from the
frozen `@xenova/transformers` v2 to the maintained `@huggingface/transformers`
(current major), keeping inference fully on-device; and expose the feature
through a single barrel entry point.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18, targeting ESNext.

**Primary Dependencies**: `@huggingface/transformers` (current maintained major
— replaces `@xenova/transformers@^2.17.2`), Firebase 10 (Firestore), Vite 4,
react-i18next, framer-motion, lucide-react. Inference runs in a Web Worker
(module worker) on-device via ONNX Runtime Web.

**Storage**: Firestore collection `sentimentResults` (one upsert doc per
`retrospectiveId_cardId`). Client-side hash cache in memory. No new collection.

**Testing**: Vitest + Testing Library (unit/hooks/services, jsdom), Playwright
(targeted facilitator/team-mood E2E). Model inference is stubbed in unit tests;
no live model download in CI.

**Target Platform**: Modern evergreen browsers (WASM + Web Workers). Offline-
capable after first model download (HF hub cached by the library).

**Project Type**: Single-page web application (frontend) with a Firebase
real-time backend; this feature is entirely client-side plus Firestore
persistence.

**Performance Goals**: Analysis never runs on the main thread (worker only); a
board of up to ~200 analysable cards is analysed incrementally in batches
without perceptible board jank; unchanged boards reuse persisted results with
zero re-inference on reload (SC-002); first per-card results appear within a few
seconds after the one-time model load.

**Constraints**: Inference stays on-device (no card text leaves the browser);
DistilBERT multilingual student model, 512-token limit → card text normalized
and capped before inference; TypeScript `strict`, no unjustified `any`; WCAG 2.1
AA for badges/dashboard in both themes; all strings via i18next; 80% coverage
floor maintained.

**Scale/Scope**: Sentiment feature module under
`retro-rocket/src/features/boards/sentiment/` plus `types/sentiment.ts`,
`types/teamMood.ts`, `vite.config.ts`, `package.json`. ~15 source files touched,
1 dependency swapped, 1+ dead files/methods removed.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Impact & Compliance |
|-----------|---------------------|
| **I. TDD (NON-NEGOTIABLE)** | Every deviation F1–F7 gets a failing test first (SC-005). Mood-formula, confidence-unification, and staleness logic are pure functions → red-green-refactor is straightforward. **PASS (by process)**. |
| **II. Library-First** | The capability is consolidated behind one public barrel (`sentiment/index.ts`); internal hooks/services/worker stay private. Consumers stop deep-importing (SC-007). **PASS**. |
| **III. Prefer Proven Third-Party Libraries** | Migrating from frozen `@xenova/transformers` v2 to actively-maintained `@huggingface/transformers` (same API family). Dependency vetting (maintenance, bundle, license Apache-2.0, no duplication) recorded in research.md. **PASS**. |
| **IV. SOLID** | Firestore stays behind `SentimentResultsService`; UI reads via context; pure domain logic (scoring, confidence, staleness) extracted from hooks for isolated testing. **PASS**. |
| **V. Simplicity (KISS/YAGNI)** | Single multilingual model, no per-card language routing (FR-002a); one confidence predicate replacing the dual threshold systems; one adjusted distribution feeding the whole report. Net reduction in surface area. **PASS**. |
| **VI. Coverage Floor 80% (NON-NEGOTIABLE)** | Pure-function extraction raises testability; new logic fully covered. No threshold lowered. **PASS**. |
| **VII. E2E Playwright (NON-NEGOTIABLE)** | Sentiment/team-mood is not among the constitution's enumerated critical flows, but a targeted E2E asserting the facilitator team-mood panel renders a consistent score/alerts on a seeded board is added. **PASS (targeted)**. |
| **VIII. WCAG 2.1 AA (NON-NEGOTIABLE)** | Sentiment badges must not rely on color alone — retain icon + accessible text/aria and verify contrast in both themes for any restyle. No new color-only signal introduced. **PASS (verified in design + review)**. |
| **Strict types / i18n / a11y / error handling** | Remove the worker `any` casts where the new library's types allow; all user-visible strings remain i18next keys; worker load/analyze failures keep explicit non-silent states (FR-013). **PASS**. |

**Result**: No violations. Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/011-ai-sentiment-accuracy/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── sentiment-module.md   # Public module interface (barrel surface)
│   └── worker-protocol.md    # Worker message contract
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # /speckit-tasks output (NOT created here)
```

### Source Code (repository root)

```text
retro-rocket/src/features/boards/sentiment/
├── index.ts                       # NEW public barrel — the single entry point (SC-007)
├── domain/                        # NEW: pure, framework-free logic (unit-tested in isolation)
│   ├── moodScore.ts               # New neutral-aware mood formula (F5) — moved from types/teamMood.ts
│   ├── confidence.ts              # Single confidence predicate used everywhere (F3/F7)
│   ├── moodDistribution.ts        # One column-role-adjusted distribution feeding score+%+insights (F4)
│   └── textNormalization.ts       # Normalize + cap card text before inference (F2)
├── workers/
│   ├── sentimentWorker.ts         # Migrated to @huggingface/transformers; typed pipeline (F8)
│   └── sentimentMapper.ts         # Uses domain/textNormalization; label mapping
├── hooks/
│   ├── useSentiment.ts            # Orchestration (unchanged public shape)
│   ├── useWorkerManager.ts        # Worker lifecycle
│   ├── useSentimentResults.ts     # Results store + staleness on load (F1); dead getProgress removed (F9)
│   ├── useSentimentCache.ts       # hashContent + debounce (content-based, F1)
│   └── useTeamMood.ts             # Consumes domain/* ; fixed useMemo deps (F6)
├── services/
│   └── sentimentResultsService.ts # Stores real contentHash + modelId/version (F1); saveResult removed (F9)
├── contexts/SentimentContext.tsx  # Read/write context (re-exported from index)
└── components/                    # Badge, Dashboard, Filter, ProgressBar, Controls*
                                   # (*SentimentControls removed if confirmed dead — F9)

retro-rocket/src/features/boards/types/
├── sentiment.ts                   # Config/types; thresholds consolidated (F3)
└── teamMood.ts                    # Types kept; scoring logic moved to domain/moodScore.ts

retro-rocket/vite.config.ts        # manualChunks: @xenova → @huggingface/transformers
retro-rocket/package.json          # dependency swap
retro-rocket/src/test/features/boards/sentiment/  # Vitest specs (existing + new domain specs)
```

**Structure Decision**: Keep the existing feature-module layout under
`src/features/boards/sentiment/` (matches the codebase's feature-first
convention) and add a `domain/` subfolder that isolates the pure, framework-free
logic (mood scoring, confidence, distribution, text normalization) so each
deviation fix is unit-testable without React, Firestore, or a live model. A new
`index.ts` barrel becomes the single public surface (Library-First); all
external consumers (topbar, facilitator menu, board, draggable card) import from
it instead of deep paths.

## Phase 0 & 1 Outputs

- **Phase 0** — [research.md](./research.md): library migration decision & risks,
  the new mood-score formula, the unified confidence rule, text-normalization
  strategy, and the staleness/invalidation model.
- **Phase 1** — [data-model.md](./data-model.md) (Card State + Firestore doc +
  Team-Mood Report + Column Role), [contracts/](./contracts/) (module barrel
  surface + worker message protocol), [quickstart.md](./quickstart.md)
  (runnable validation for each deviation).

## Complexity Tracking

> No Constitution Check violations — this section intentionally left empty.
