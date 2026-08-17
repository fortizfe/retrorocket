# Phase 1 Contract: Column-Scoped Suggestion Generation

Documents the observable behavior of `useCardGroups.ts`'s `findSuggestions` once this feature lands (`research.md` §1). The only change is what `Card[]` reaches `findSemanticCardGroups`; that service's own signature and clustering logic are unchanged.

## Contract — Triggering suggested grouping on a column

- **Given** a board with ungrouped cards in more than one column, **when** `findSuggestions(columnId, config)` is called for column A, **then** `findSemanticCardGroups` MUST be called with a `Card[]` containing only cards where `card.column === columnId('A')` and `card.groupId` is unset — no card from any other column MUST be present in that array (spec.md FR-001, FR-002).
- **Given** the suggestions returned by that call, **when** they are shown in column A's suggestions panel, **then** every `cardIds` entry in every returned `GroupSuggestion` MUST resolve to a card whose `column` is A (spec.md FR-003) — guaranteed by construction, since no other column's cards were ever passed in.
- **Given** a suggested group from that result is accepted, **when** `createGroup`/`acceptSuggestion` runs, **then** the resulting `CardGroup`'s member cards MUST all belong to column A (spec.md FR-004) — guaranteed by the same input restriction.
- **Given** the analysis for column A is in progress, **when** it runs, **then** no card belonging to any other column is read, embedded, or evaluated as a candidate at any point in the call (spec.md FR-002, Acceptance Scenario 3) — not merely excluded from the final result.

## Contract — Other columns are unaffected

- **Given** a column B currently in `'none'`, `'user'`, or `'suggestions'` mode with its own card order/groups, **when** `findSuggestions` is triggered for column A, **then** column B's grouping mode, card order, and existing `CardGroup` records are not read, written, or recomputed as a side effect of that call (spec.md FR-005) — `findSuggestions` for column A has no code path that touches any state belonging to column B.
- **Given** column A's suggestions panel opens and enters a loading state while its analysis runs, **when** this happens, **then** no other column's local UI state (its own `showSuggestions`/`isGeneratingSuggestions`) changes, since each `GroupableColumn` instance owns and calls `findSuggestions` independently with its own `column.id` (spec.md FR-006).

## Contract — Independent, non-interfering runs

- **Given** suggested grouping is triggered for column A and, separately, for column C (sequentially or with overlapping in-flight requests), **when** both calls resolve, **then** column A's result set MUST reflect only column A's cards and column C's result set MUST reflect only column C's cards, regardless of call order or overlap (spec.md FR-007) — each call independently filters `cards` by its own `columnId` argument with no shared mutable state between the two filter operations.

## Explicitly not covered by this contract

- The embedding pipeline itself (`useEmbeddingWorkerManager`, model loading/inference) — unchanged, out of scope; this fix only changes which cards are handed to it.
- Per-suggestion title generation (`suggestGroupTitle`, spec 047) — unchanged, continues to operate per proposed cluster exactly as today.
- The mode-switch-dissolves-groups behavior (spec 047, US2) and the suggestions-panel positioning (spec 045) — unchanged, unrelated to this fix.

**Verification**: a `useCardGroups` hook test seeding cards across two-plus columns, calling `findSuggestions('columnA', config)`, and asserting the mocked `findSemanticCardGroups` was called with exactly column A's ungrouped cards (by id) and no others; a companion case for a column with zero/one ungrouped card asserting an empty candidate array is passed through rather than falling back to other columns; a companion case calling `findSuggestions` for two different column ids and asserting each call's `Card[]` argument only contains that call's own column's cards. An E2E scenario (`retrospective-board.spec.ts`) seeding cards in two columns, triggering suggestions on one, and asserting the panel's shown suggestions reference only that column's card content while the other column's card order/mode is unchanged before and after.
