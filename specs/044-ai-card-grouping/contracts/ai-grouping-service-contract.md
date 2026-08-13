# Phase 1 Contract: AI-Based Card Grouping Service

Per Constitution Principle II (Library-First), the grouping computation is a decoupled module with a clear public interface, independent of the UI that calls it. This contract documents that interface's observable behavior — what `useCardGroups.ts` and its tests may assume — replacing `similarityService.ts`'s implicit contract (`research.md` §5, §7).

## Contract — `findSemanticCardGroups` (replaces `findSimilarCardGroups`)

**Signature shape**: `(cards: Card[], config?: Partial<GroupingConfig>) => Promise<GroupSuggestion[])` — async, unlike its synchronous predecessor, because it requires an on-device inference round-trip (`data-model.md`).

- **Given** a list of cards from a single column, **when** the function is called, **then** it MUST only ever propose groups whose members share that column — cross-column grouping MUST NOT occur (spec.md FR-006, unchanged from today's behavior).
- **Given** two or more cards whose content is judged semantically similar (cosine similarity between their embeddings at or above `config.threshold`), **when** grouping runs, **then** those cards MUST be included together in a returned `GroupSuggestion` (spec.md FR-004, Acceptance Scenario 1).
- **Given** cards on clearly unrelated topics, **when** grouping runs, **then** they MUST NOT be proposed as a group together (spec.md Acceptance Scenario 2).
- **Given** a resulting cluster would exceed `config.maxGroupSize` cards, **when** grouping runs, **then** the cluster MUST be capped at `config.maxGroupSize` rather than returned uncapped (spec.md FR-005a).
- **Given** a candidate cluster has fewer than `config.minGroupSize` cards, **when** grouping runs, **then** it MUST NOT be returned as a suggestion.
- **Given** a card is already a member of an existing group (`card.groupId` is set), **when** grouping runs, **then** that card MUST be excluded from consideration (unchanged from `similarityService.ts`'s existing behavior).
- **Given** fewer than `config.minGroupSize` ungrouped cards exist in the column, **when** grouping runs, **then** the function MUST resolve to an empty array rather than reject or throw (spec.md Acceptance Scenario 4 / Edge Cases).
- **Given** the on-device embedding pipeline fails to load or errors during inference, **when** grouping is requested, **then** the returned `Promise` MUST reject (or resolve to a distinguishable error signal) rather than silently resolving to an empty array indistinguishable from "no similar cards found" — callers need to tell "unavailable" (FR-008) apart from "nothing similar" (spec.md Edge Cases).
- **Given** the same card content is written in two different supported languages within the same column, **when** grouping runs, **then** matching those cards together is explicitly NOT guaranteed (spec.md clarification, cross-language grouping out of scope).

## Contract — Embedding computation (internal to the service, exercised via `useEmbeddingWorkerManager`)

- **Given** a batch of card texts, **when** embeddings are requested, **then** exactly one vector MUST be returned per input card, in a form that can be paired back to its `cardId` (no silent drops) — mirrors `sentimentWorker.ts`'s existing `batch_analyze` guarantee of one result per request.
- **Given** the embedding model has not finished loading, **when** a caller requests embeddings, **then** the caller MUST be able to distinguish "still loading" from "ready" (exposed via the same `{ready, loading, error}` shape `useWorkerManager.ts` already exposes for the sentiment worker) so the UI's loading state (FR-007) can be driven correctly.
- **Given** no card content leaves the device beyond the one-time model weights download (spec.md FR-011, SC-003), **when** embeddings are computed, **then** the computation MUST run entirely inside the browser (Web Worker), with no card text transmitted to any server or third-party endpoint — identical privacy posture to the existing sentiment-analysis worker.

**Verification**: unit tests for `findSemanticCardGroups` against a mocked embedding source (deterministic vectors, avoiding a real model load in CI, mirroring how `similarityService.test.ts` tests pure functions today) covering: same-column-only scoping, threshold inclusion/exclusion, `maxGroupSize` capping, `minGroupSize` filtering, already-grouped-card exclusion, and the "too few cards" empty-array case; a worker-level test verifying one-vector-per-input batching (mirroring `sentimentWorker.contract.test.ts`); and an integration-level test asserting a failed embedding load surfaces as a distinguishable error state up through `useCardGroups.ts`.

## Explicitly not covered by this contract

- Persistence of an accepted suggestion into a real `CardGroup` — unchanged, covered by `useCardGroups.ts`'s existing `createGroup`/`acceptSuggestion` contract.
- The panel's visual/positioning behavior — see `anchored-suggestions-panel-contract.md`.
- The specific embedding model id or vector dimensionality — implementation detail (`research.md` §3), not part of this module's public contract.
