# Phase 1 Data Model: AI Card Grouping

This feature introduces **no new persisted entity, Firestore field, or collection**. Group persistence (`CardGroup`, `createCardGroup`/`disbandCardGroup`/`setGroupCollapse`) is entirely unchanged — the server only ever stored the *result* of a grouping decision (`headCardId` + `memberCardIds`), never the algorithm or scoring that produced it (`research.md` §7). What changes is the shape of the transient, client-only suggestion data computed before a group is created, and the addition of one new transient, in-memory concept (card embeddings) that is never persisted or sent to a server.

## Modified: `GroupSuggestion` (`src/features/boards/types/card.ts`)

| Field | Before | After | Why |
|---|---|---|---|
| `id` | `string` | `string` (unchanged) | Suggestion identity within one popup session |
| `cardIds` | `string[]` | `string[]` (unchanged) | Member cards proposed for the group |
| `similarity` | `number` (0–1, blended Levenshtein/Jaccard score) | `number` (0–1, cosine similarity between card embeddings, clamped to `[0, 1]`) | Same field, new source — the similarity-badge UI (`getSimilarityColor`/`getSimilarityLabel` in `GroupSuggestionModal.tsx`) keeps working unmodified against the same 0–1 range |
| `reason` | `string` (e.g. "Common themes: X, Y, Z") | *removed* | Was derived from discrete shared keywords, which embeddings don't produce; no equivalent replacement is required by the spec |
| `algorithm` | `SimilarityAlgorithm` (`'levenshtein' \| 'jaccard' \| 'keyword' \| 'combined'`) | *removed* | There is exactly one computation method now (FR-009); a field naming "which algorithm" is meaningless |
| `keywords` | `string[]` (optional) | *removed* | No discrete keyword extraction step exists in the AI-based path |

`SimilarityAlgorithm` (the type) is deleted entirely — it has no remaining reference once `GroupSuggestion.algorithm` is removed.

## New (replaces `SimilarityConfig`): `GroupingConfig` (new home: alongside the new grouping service, `src/features/boards/clustering/services/`)

| Field | Type | Notes |
|---|---|---|
| `threshold` | `number` (0–1) | Minimum cosine similarity for two cards to be considered part of the same group (structurally the same role `SimilarityConfig.threshold` played; the tuned value may differ since it now scores semantic similarity, not text similarity — `research.md` §5) |
| `minGroupSize` | `number` | Minimum cards for a cluster to become a suggestion (unchanged concept; default `2`) |
| `maxGroupSize` | `number` | Maximum cards per suggested group (unchanged concept; carries forward FR-005a's cap — default `8`, matching today's `similarityService.ts` default) |

Removed from the old `SimilarityConfig`: `algorithm` (no longer a choice — one method) and `excludeKeywords` (stopword filtering was specific to the keyword-overlap computation; embeddings consume raw card text).

## New, transient, non-persisted: Card Embedding

Not a domain entity and never serialized to Firestore, the network (beyond the one-time model download), or any store — it exists only inside the browser tab for the duration of one "generate suggestions" action.

| Field | Type | Notes |
|---|---|---|
| `cardId` | `string` | Identifies which card the vector belongs to, for pairing back to `Card` after computation |
| `vector` | `number[]` | Fixed-length sentence-embedding vector produced by the on-device `feature-extraction` pipeline (`research.md` §3); dimensionality is a model implementation detail, not a contract surface |

Produced by the new `embeddingWorker.ts`'s `embed` message (batched: one worker round-trip computes vectors for every ungrouped card in a column at once, `research.md` §6), consumed immediately by the grouping computation, then discarded — no caching or reuse across requests is required by the spec.

## Existing entities used (unchanged shape)

- **`Card`** (`src/features/boards/types/card.ts`) — `content`, `id`, `column`, `groupId`, `createdAt` are read exactly as `similarityService.ts` reads them today; no field added or removed.
- **`CardGroup`** — entirely unchanged; still just `id`, `retrospectiveId`, `column`, `headCardId`, `memberCardIds`, collapse state.

## Explicitly unchanged

- `createGroup`/`acceptSuggestion`/`disbandGroup`/`addToGroup`/`removeFromGroup`/`toggleGroupCollapse` in `useCardGroups.ts` — persistence and group-lifecycle operations are untouched; only `findSuggestions`'s internals and return-path timing (now async) change (`research.md` §5).
- `backendRetrospectiveClient.ts`'s group endpoints and the server-side `CardGroup` persistence — confirmed to contain no grouping computation at all (`research.md` §7); nothing here changes.
- The `useBoardMenuOverlay` hook's own public shape — reused as-is by the new suggestions panel (`research.md` §2).
