# Implementation Plan: AI Card Grouping

**Branch**: `044-ai-card-grouping` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/044-ai-card-grouping/spec.md`

## Summary

Refine the retrospective board's card-grouping-suggestions feature in two parts. First, fix `GroupSuggestionModal.tsx` so it opens anchored to the grouping-mode button that triggers it, instead of rendering pinned to the viewport's top-left corner — the same ancestor-`transform`-traps-`position:fixed` defect class already fixed elsewhere in the app (feature 034, feature 039), here caused by `RetrospectiveBoard.tsx`'s animated per-column wrapper. Second, replace the current text-similarity algorithm (Levenshtein + Jaccard keyword overlap, `similarityService.ts`) with grouping computed from on-device sentence embeddings, produced by a new `feature-extraction` pipeline built on the same `@huggingface/transformers` library already used for sentiment analysis, and delete the old algorithm's code, types, tests, and UI surface entirely.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.2, built with Vite 4

**Primary Dependencies**: `@huggingface/transformers` `^3.8.1` (already installed for sentiment analysis; this feature adds a second pipeline instance — `feature-extraction` with `Xenova/paraphrase-multilingual-MiniLM-L12-v2` — no new package); `@floating-ui/react` `^0.27.20` (via the existing `useBoardMenuOverlay` hook, reused unchanged); `framer-motion` `^10.18.0` (panel entrance/exit animation, applied to a correctly split node per the app's established pattern). No new dependency is introduced.

**Storage**: N/A for this feature's own data — see `data-model.md`. Existing `CardGroup` Firestore persistence is untouched.

**Testing**: Vitest + Testing Library (unit/component); Playwright (E2E) — see `contracts/*.md` and `quickstart.md` for the specific new/modified test files.

**Target Platform**: Web (responsive), evergreen browsers, light/dark theme, es/en locales (`src/i18n/config.ts`'s only two `supportedLngs`) — no platform-specific behavior introduced.

**Project Type**: Web application (single Vite/React SPA + a thin Express backend mediation layer; confirmed the backend has no grouping-computation code to reconcile with, `research.md` §7).

**Performance Goals**: Suggestions returned (or a clear empty/unavailable state shown) within a few seconds for a column of up to 25 cards (spec.md SC-004, clarified), via a single batched worker round-trip for embedding computation rather than one round-trip per card (`research.md` §6).

**Constraints**: No card content leaves the device beyond the one-time model-weights download (spec.md FR-011/SC-003) — embedding inference runs entirely in a Web Worker, mirroring the sentiment feature's existing privacy posture. Grouping stays scoped to a single column (FR-006); cross-language matching is explicitly not required (spec.md clarification). No fallback to the deleted text-similarity algorithm if the AI pipeline is unavailable (FR-008; spec.md Assumptions).

**Scale/Scope**: Two components rewritten in place (`GroupSuggestionModal.tsx` positioning; `ColumnHeaderMenu.tsx` gains the anchored panel), one service replaced (`similarityService.ts` → new embedding-based grouping service), one new worker + hook pair added (`embeddingWorker.ts` / `useEmbeddingWorkerManager.ts`), `useCardGroups.ts`'s `findSuggestions` becomes async. No new route, page, or persisted entity.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Gate |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | New/replaced modules (`semanticGroupingService`, `embeddingWorker`, `useEmbeddingWorkerManager`, anchored panel) MUST have failing tests written first per `contracts/*.md`'s verification sections, then implemented to pass — mirroring feature 039's precedent of a structural test confirmed failing against the pre-fix component | PASS |
| II. Library-First | Grouping computation and embedding inference are isolated in `src/features/boards/clustering/{services,workers,hooks}` with the public interfaces documented in `contracts/ai-grouping-service-contract.md`, decoupled from the UI layer that calls them (`useCardGroups.ts`) | PASS |
| III. Prefer Proven Third-Party Libraries | Reuses `@huggingface/transformers` (already vetted, already a dependency) for a second, standard pipeline task (`feature-extraction`) instead of hand-rolling embeddings or adding a new ML library; reuses `@floating-ui/react` via the existing shared hook. No new dependency (`research.md` §3–4) | PASS |
| IV. SOLID | `ColumnHeaderMenu.tsx` remains the single owner of "things anchored to this button" (Single Responsibility, `research.md` §2); the new embedding worker/hook are independent of, and do not couple to, the sentiment worker's types (`research.md` §4); Firestore access (group persistence) is untouched and stays behind `backendRetrospectiveClient.ts` | PASS |
| V. Simplicity (KISS + YAGNI) | Reuses the existing greedy threshold/min/max clustering *shape*, swapping only the pairwise similarity function, rather than introducing a new clustering algorithm/dependency (`research.md` §5); does not generalize `useWorkerManager.ts` for a single second caller (`research.md` §4) | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | New service/worker/hook modules ship with unit tests per `contracts/*.md`; deleted modules' tests are removed, not left orphaned; coverage floor in `vitest.config.ts` must not drop | PASS |
| VII. E2E Testing with Playwright | Closes a real, confirmed gap: no existing Playwright spec exercises the grouping-suggestions flow at all (`research.md` §9) — new coverage added per `quickstart.md` §1 | PASS |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | New anchored panel reuses `useBoardMenuOverlay`'s existing `FloatingFocusManager`/`useDismiss`/`useRole`/keyboard wiring rather than reimplementing it; must avoid duplicating ARIA wiring onto both the positioning wrapper and the animated inner node (the specific pitfall documented in `ColorPicker.tsx` and restated in feature 039's contract) — loading/empty/unavailable states must each be distinguishable without relying on color alone | PASS |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | The panel's entrance/exit motion reuses the already-`animate`-skill-derived pattern from `ColumnHeaderMenu.tsx`'s existing dropdown and `FacilitatorMenu.tsx`/`ColorPicker.tsx` (full `transform` strings, correct split-node structure) rather than deriving new motion from scratch — consistent with Constitution V's guidance against unjustified scope expansion for a fix that preserves the existing interaction feel | PASS |

No unjustified violations. Complexity Tracking is left empty.

**Post-Phase-1 re-check**: `research.md`, `data-model.md`, `contracts/*.md`, and `quickstart.md` introduce no new dependency, no new Firestore/domain coupling, and no reduction in test or accessibility coverage — they add the missing E2E coverage and the unit/contract tests for every new/replaced module identified in Phase 0. All nine gates remain PASS after Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/044-ai-card-grouping/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── anchored-suggestions-panel-contract.md   # Phase 1 output
│   └── ai-grouping-service-contract.md          # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/src/
├── features/
│   └── boards/
│       ├── clustering/
│       │   ├── components/
│       │   │   ├── ColumnHeaderMenu.tsx        # Gains: a second anchored
│       │   │   │                                # floating panel (the
│       │   │   │                                # suggestions view), sharing
│       │   │   │                                # the existing trigger
│       │   │   │                                # button's reference
│       │   │   │                                # (research.md §2)
│       │   │   ├── GroupSuggestionModal.tsx    # Rewritten: from a raw
│       │   │   │                                # fixed-inset backdrop to
│       │   │   │                                # content rendered inside
│       │   │   │                                # ColumnHeaderMenu's new
│       │   │   │                                # anchored panel; loses the
│       │   │   │                                # "Algorithm"/"Keywords"
│       │   │   │                                # detail rows
│       │   │   └── GroupableColumn.tsx         # handleGenerateSuggestions
│       │   │                                    # becomes a real async call;
│       │   │                                    # data/state ownership for
│       │   │                                    # suggestions is passed down
│       │   │                                    # into ColumnHeaderMenu
│       │   ├── hooks/
│       │   │   ├── useCardGroups.ts            # findSuggestions becomes
│       │   │   │                                # async, calls the new
│       │   │   │                                # grouping service
│       │   │   └── useEmbeddingWorkerManager.ts # NEW — mirrors
│       │   │                                     # useWorkerManager.ts for
│       │   │                                     # the embedding pipeline
│       │   ├── services/
│       │   │   ├── similarityService.ts        # DELETED (FR-009)
│       │   │   └── semanticGroupingService.ts  # NEW — replaces it;
│       │   │                                    # findSemanticCardGroups()
│       │   │                                    # per ai-grouping-service-
│       │   │                                    # contract.md
│       │   └── workers/
│       │       └── embeddingWorker.ts          # NEW — feature-extraction
│       │                                        # pipeline, mirrors
│       │                                        # sentimentWorker.ts's
│       │                                        # message-passing shape
│       ├── retrospective/
│       │   ├── components/
│       │   │   └── RetrospectiveBoard.tsx      # onSuggestionGenerate call
│       │   │                                    # site updated for the new
│       │   │                                    # (async) signature; column
│       │   │                                    # wrapper's animate={{y}}
│       │   │                                    # is the root-cause transform
│       │   │                                    # (research.md §1, left as-is
│       │   │                                    # — the portal-based fix
│       │   │                                    # sidesteps it entirely)
│       │   └── hooks/
│       │       └── useBoardMenuOverlay.ts      # Reused unchanged
│       ├── sentiment/
│       │   ├── workers/sentimentWorker.ts      # Reference precedent only —
│       │   │                                    # not modified
│       │   └── hooks/useWorkerManager.ts       # Reference precedent only —
│       │                                        # not modified
│       └── types/
│           ├── card.ts                         # GroupSuggestion fields
│           │                                    # trimmed; SimilarityAlgorithm
│           │                                    # type deleted (data-model.md)
│           └── columnGrouping.ts               # Unchanged — grouping modes
│                                                 # (none/by-user/suggestions)
│                                                 # are orthogonal to this
│                                                 # feature
├── locales/
│   ├── en.json                                 # groupSuggestion.algorithm /
│   │                                            # .keywords removed; new
│   │                                            # unavailable-state keys
│   │                                            # added (research.md §8)
│   └── es.json                                 # Same changes, es locale

retro-rocket/src/test/features/boards/clustering/
├── similarityService.test.ts                   # DELETED
├── semanticGroupingService.test.ts              # NEW
├── embeddingWorker.test.ts                      # NEW
├── useEmbeddingWorkerManager.test.ts             # NEW
├── ColumnHeaderMenu.test.tsx                     # MODIFIED — anchored-panel
│                                                  # assertions
├── GroupSuggestionModal.test.tsx                 # MODIFIED — drops
│                                                  # algorithm/keywords
│                                                  # assertions, adds
│                                                  # loading/empty/unavailable
│                                                  # state coverage
├── useCardGroups.test.ts                         # MODIFIED — async
│                                                  # findSuggestions
└── GroupableColumn.test.tsx (+ .basic/.simple)   # MODIFIED as needed for
                                                    # the async suggestion flow

retro-rocket/e2e/
└── retrospective-board.spec.ts                   # Gains new UI-driven
                                                    # coverage: open the
                                                    # suggestions panel via
                                                    # the real trigger,
                                                    # assert anchoring and
                                                    # the accept/reject flow
                                                    # (there is currently no
                                                    # E2E coverage at all for
                                                    # this feature, research.md §9)
```

**Structure Decision**: Web application structure (existing `retro-rocket/` SPA + `server/`), unchanged at the top level. All changes are confined to `retro-rocket/src/features/boards/clustering/` (new/replaced service, worker, hook; modified components), two call sites outside it (`RetrospectiveBoard.tsx`'s call to `onSuggestionGenerate`, `useCardGroups.ts`'s `findSuggestions`), the shared type file (`card.ts`), and locale files. No new top-level directory or project. `server/` is untouched — confirmed to contain no grouping-computation code to reconcile with (`research.md` §7).

## Complexity Tracking

*No violations to justify.* All Constitution Check gates pass without exception; no new dependency, abstraction, or project is introduced — the embedding pipeline reuses the already-installed `@huggingface/transformers` library via a second, standard pipeline task.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_ | | |
