# Phase 0 Research: AI Card Grouping

## 1. Root cause of the "top-left corner" popup positioning bug

`GroupSuggestionModal.tsx` positions itself with raw CSS on a `motion.div`: `className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"` (a viewport-centered backdrop overlay, no Floating UI, not portaled). It is rendered inline inside `GroupableColumn.tsx` (`retro-rocket/src/features/boards/clustering/components/GroupableColumn.tsx:436-444`), which itself renders inside a per-column `motion.div` in `RetrospectiveBoard.tsx` (`retro-rocket/src/features/boards/retrospective/components/RetrospectiveBoard.tsx:271-276`) carrying `animate={{ opacity: 1, y: 0 }}`.

Per the CSS spec, any ancestor with an active `transform` becomes the containing block for `position: fixed` descendants. Framer Motion's `animate` prop writes an inline `transform` on that column wrapper, so `GroupSuggestionModal`'s "fixed inset-0" is computed relative to the *column's* box, not the real viewport. Columns sit near the top-left of the board grid, which is why the popup renders pinned there instead of centered on screen or anchored to the button that opened it. This is the same defect class already found and fixed in `RetrospectiveTopbar.tsx`'s options menu, `FacilitatorMenu.tsx` (feature 034), and explicitly flagged-but-deferred for `ColumnHeaderMenu.tsx` (feature 039) — this feature is the first to touch the grouping-suggestions surface itself.

**Decision**: Replace the raw `fixed inset-0` backdrop approach with the app's established anchored-overlay pattern: `useBoardMenuOverlay` (`@floating-ui/react`'s `useFloating` + `offset`/`flip`/`shift`/`size`/`autoUpdate`), rendered inside `FloatingPortal` + `FloatingFocusManager`. This portals the panel to `document.body`, so it is immune to the ancestor-`transform` containing-block issue entirely (not just papered over), and it is the identical mechanism every other popup in the app already uses — directly satisfying the user's "pegado al botón como el resto de popups" request.

**Alternatives considered**:
- Keep the centered-backdrop modal design but fix only the CSS (e.g. move the modal to a portal at the app root without adopting `useBoardMenuOverlay`). Rejected: still wouldn't be "anchored to the button" per the user's explicit ask, and would introduce a second, bespoke positioning mechanism alongside the one every other popup already uses — the app already has a shared solution.
- Fix only the `RetrospectiveBoard.tsx` column wrapper's transform (e.g. remove `animate={{y}}`). Rejected: fixes this one popup by accident but leaves the same latent trap for any future `position: fixed` content nested in a column, and doesn't address that `ColumnHeaderMenu.tsx`'s sibling dropdown already proves the anchored pattern is the intended one for this exact area of the UI.

## 2. Sharing one trigger button between the existing grouping-mode menu and the new suggestions panel

`ColumnHeaderMenu.tsx` owns the single visible button for grouping controls (`LayoutGrid` icon + chevron) and its own `useBoardMenuOverlay` instance/reference (`refs.setReference`) for its dropdown (grouping-mode options: none / by-user / suggestions). Selecting "Suggestions" from that dropdown calls back up to `GroupableColumn.tsx`'s `handleGenerateSuggestions`, which today opens the unrelated, unanchored `GroupSuggestionModal`.

To anchor the suggestions panel to that same button, the panel needs access to the button's DOM node. Two options:

- **(a)** Lift the button/reference out of `ColumnHeaderMenu.tsx` so both the grouping-mode dropdown and the new suggestions panel share one `useBoardMenuOverlay` reference.
- **(b)** Keep `ColumnHeaderMenu.tsx` owning the button, and move suggestions-panel *rendering* into `ColumnHeaderMenu.tsx` itself (as a second floating element anchored to the same `refs.reference`), with `GroupableColumn.tsx` continuing to own the suggestions *data* (loading state, results, accept/reject handlers) and passing them down as props.

**Decision**: (b) — keep `ColumnHeaderMenu.tsx` as the sole owner of the trigger button and its Floating UI reference; it renders both its existing options dropdown and the new suggestions panel, each as an independent `useBoardMenuOverlay`/`FloatingPortal` instance anchored to the same reference element, toggled by which mode is active. `GroupableColumn.tsx` keeps owning suggestion data/state and passes it into `ColumnHeaderMenu.tsx` as props, mirroring how it already passes `currentGrouping`/`onGroupingChange`. This keeps one component responsible for "things anchored to this button" (Constitution IV, Single Responsibility) instead of duplicating trigger-ref plumbing across two components.

**Alternatives considered**: (a) was rejected because it would require restructuring `ColumnHeaderMenu.tsx`'s existing, already-correct dropdown to consume an externally-owned ref, for no behavioral benefit over (b).

## 3. On-device AI approach for semantic grouping

The sentiment-analysis feature already runs `@huggingface/transformers` (transformers.js v3, `^3.8.1`) fully client-side in a dedicated Web Worker (`src/features/boards/sentiment/workers/sentimentWorker.ts`), using `pipeline('text-classification', modelId)`. Its output is strictly `{ sentiment: 'positive'|'negative'|'neutral', confidence: number }` (`sentimentMapper.ts`) — a classification head's output, not a reusable vector representation of meaning. Classification-head models cannot be repurposed for semantic similarity without retraining; there is no existing embedding output to reuse as-is.

**Decision**: Add a second, dedicated on-device pipeline using the same already-installed `@huggingface/transformers` library's `feature-extraction` task (`pipeline('feature-extraction', modelId)`) to produce sentence embeddings for card content, and compute grouping from cosine similarity between those embeddings. Model: `Xenova/paraphrase-multilingual-MiniLM-L12-v2` — a small (~120MB fp32 / ~60MB quantized) sentence-embedding model covering Spanish and English (RetroRocket's only two supported locales, `src/i18n/config.ts`), consistent with the existing per-language routing precedent (`SENTIMENT_MODELS`, `modelRouting.ts`) without requiring cross-language matching (out of scope per spec.md's clarification). This reuses transformers.js's existing WASM/ONNX runtime, download/caching behavior, and license posture (Apache-2.0, already vetted for the sentiment feature) — no new third-party dependency, satisfying Constitution Principle III.

**Alternatives considered**:
- Reuse a currently-loaded sentiment classification model's internal hidden states as a pseudo-embedding (e.g. mean-pooling the encoder's last hidden layer before the classification head). Rejected: transformers.js's `text-classification` pipeline does not expose intermediate hidden states through its public API; extracting them would require bypassing the pipeline abstraction and coupling grouping to sentiment-model internals — a fragile, unsupported integration for a marginal download-size saving.
- `Xenova/all-MiniLM-L6-v2` (English-only, smaller). Rejected: RetroRocket boards are frequently in Spanish (`fallbackLng: 'es'`) and this model has no meaningful Spanish training, which would silently degrade grouping quality for the majority-language case.
- A larger multilingual model (e.g. `Xenova/multilingual-e5-base`). Rejected for v1: meaningfully larger download for accuracy gains not required to clear the spec's 80% coherence success criterion; can be revisited later without changing the public contract (model id is an internal implementation constant).

## 4. Worker architecture for the embedding pipeline

`useWorkerManager.ts` (`src/features/boards/sentiment/hooks/`) hardcodes the sentiment worker's URL and its return/message types are sentiment-specific (`SentimentResult`, `{sentiment, confidence}`).

**Decision**: Add a new, independent worker and hook scoped to the clustering feature — `src/features/boards/clustering/workers/embeddingWorker.ts` (loads the `feature-extraction` pipeline, message contract: `init` / `embed` in, `ready` / `loading` / `result` (vector) / `error` out — mirroring `sentimentWorker.ts`'s message shape) and `src/features/boards/clustering/hooks/useEmbeddingWorkerManager.ts` (mirroring `useWorkerManager.ts`'s retry/lifecycle behavior). This keeps the clustering capability self-contained (Constitution II, Library-First) and leaves the sentiment feature's worker/hook completely untouched, rather than generalizing `useWorkerManager` to carry two unrelated result shapes.

**Alternatives considered**: Generalizing `useWorkerManager` to be worker-URL-agnostic and result-type-generic. Rejected: would touch a NON-NEGOTIABLE-adjacent, already-shipping, well-tested sentiment code path for a benefit (shared retry/lifecycle boilerplate, ~50 lines) that doesn't offset the regression risk to a feature outside this change's scope (Constitution V, Simplicity — don't generalize for a single second caller).

## 5. Clustering computation from embeddings

Today's `findSimilarCardGroups()` (`similarityService.ts`) is a synchronous, greedy single-pass grouping over a pairwise similarity function: sort cards, for each ungrouped card scan forward for others above `threshold`, cap at `maxGroupSize`, keep clusters with at least `minGroupSize` members, skip cards already in a column-scoped group.

**Decision**: Keep the same greedy clustering *shape* (grouping is not the part the user asked to change) but swap the pairwise similarity function: instead of `combinedSimilarity()` (Levenshtein + Jaccard on card text), use cosine similarity between each pair of cards' precomputed embedding vectors. Concretely: compute one embedding per card in the column (batched through the new worker), then run the existing threshold/min/max greedy grouping logic over the resulting cosine-similarity matrix instead of the string-similarity matrix. This directly satisfies FR-005a (group-size cap carried over) and keeps `GroupingConfig`'s `threshold`/`minGroupSize`/`maxGroupSize` shape meaningful (a cosine-similarity threshold plays the same structural role a string-similarity threshold did), while dropping the now-meaningless `algorithm` and `excludeKeywords` fields (data-model.md).

Because embedding generation is now asynchronous (worker round-trip) where the old text-similarity computation was synchronous, `useCardGroups.ts`'s `findSuggestions` and `GroupableColumn.tsx`'s `handleGenerateSuggestions`/`onSuggestionGenerate` chain (currently synchronous, `RetrospectiveBoard.tsx:294-298`) must become `Promise`-returning. `handleGenerateSuggestions` already wraps the call in `try/finally` with an `isGeneratingSuggestions` loading flag, so the loading-state UI (FR-007) already exists and mainly needs the call awaited for real instead of being a formality.

**Alternatives considered**: A proper unsupervised clustering algorithm (k-means, agglomerative/hierarchical clustering with a dendrogram cut, HDBSCAN). Rejected for v1: none of these are already a project dependency (Constitution III would require justifying a new one), they need a cluster-count or distance-cutoff hyperparameter that is no easier to tune than the existing threshold, and the greedy threshold approach is already proven adequate for typical retro column sizes (≤25 cards per the spec's clarified scale target) — swapping only the similarity function is the smallest change that satisfies the spec (Constitution V, Simplicity/YAGNI).

## 6. Performance target feasibility (SC-004: a few seconds for up to 25 cards)

Sentence-embedding inference with a MiniLM-class model in transformers.js (WASM backend) for a batch of ~25 short card texts (well under the model's 128-256 token typical limit) is consistent with the existing sentiment feature's own per-card inference latency (already validated acceptable in production for real-time batch sentiment analysis). Because the model is downloaded once and cached (same `env.allowRemoteModels`/browser-cache behavior as the sentiment models), first-use latency includes a one-time download — covered by the required loading state (FR-007) — while subsequent analyses in the same session are inference-only and fast.

**Decision**: Batch all of a column's ungrouped cards into a single `embed` worker message (list in, list of vectors out) rather than one message per card, minimizing worker round-trip overhead — mirroring `sentimentWorker.ts`'s existing `batch_analyze` message type.

## 7. Scope of old-code removal (FR-009)

Files/exports tied exclusively to the text-similarity algorithm, to be deleted or rewritten (not merely deprecated):

- `src/features/boards/clustering/services/similarityService.ts` — deleted; its clustering *shape* (§5) is reimplemented against embeddings in its replacement.
- `src/test/features/boards/clustering/similarityService.test.ts` — deleted; replaced by tests for the new embedding-based grouping module.
- `SimilarityAlgorithm` type and `GroupSuggestion.algorithm`/`GroupSuggestion.keywords` fields (`src/features/boards/types/card.ts`) — removed; no longer meaningful once there is exactly one computation method and no discrete keyword output (data-model.md).
- `GroupSuggestionModal.tsx`'s "Algorithm: …" / "Keywords: …" detail rows and the `groupSuggestion.algorithm`/`groupSuggestion.keywords` i18n keys (`en.json`/`es.json`) — removed along with the fields that fed them.
- `useCardGroups.ts`'s `findSuggestions` — rewritten to call the new async embedding-based grouping module instead of `findSimilarCardGroups`; its `SimilarityConfig` import is replaced with the new `GroupingConfig` type.
- `RetrospectiveBoard.tsx:294-298`'s literal `{ threshold: 0.6, minGroupSize: 2, maxGroupSize: 6 }` call site — kept (same shape, new meaning per §5), updated only if the tuned threshold for cosine similarity differs from the tuned threshold for the old blended text score (to be validated during implementation, not a spec-level decision).

**Correction to prior exploration**: an earlier repo scan reported a server-side `server/src/application/use-cases/retrospective/CardGrouping.ts` "equivalent." A direct search of `server/src` for `group`/`similarity`/`cluster` (any case) found no such file and no server-side grouping computation of any kind — `backendRetrospectiveClient.createCardGroup`/`disbandCardGroup`/`setGroupCollapse` are thin REST calls that only persist a group record the client already decided on (`headCardId`/`memberCardIds`). There is nothing server-side to reconcile with or exclude; all grouping computation is, and remains, client-only.

## 8. i18n additions needed (Constitution: no hardcoded user-facing strings)

- New keys for the AI-unavailable state (FR-008) — no existing precedent string in `groupSuggestion.*`; add e.g. `groupSuggestion.unavailableTitle`/`groupSuggestion.unavailableBody` to both `en.json` and `es.json`.
- Remove `groupSuggestion.algorithm` and `groupSuggestion.keywords` (§7) from both locale files once their UI usage is deleted.
- `groupSuggestion.analyzing` (existing) is reused as-is for the AI loading state — no new key needed there.

## 9. Test-coverage gaps identified

- No Playwright E2E spec exercises the grouping-suggestions flow at all today (`grep` across `e2e/*.spec.ts` for "suggestion" returns nothing) — a real gap against Constitution Principle VII, which explicitly names "grouping cards" as a critical flow requiring E2E coverage. This feature must add one.
- Existing unit tests (`similarityService.test.ts`, parts of `GroupSuggestionModal.test.tsx`, `useCardGroups.test.ts`) assert on the old algorithm's specific behavior (Levenshtein/Jaccard scores, `algorithm`/`keywords` fields) and must be replaced, not just left passing incidentally.
