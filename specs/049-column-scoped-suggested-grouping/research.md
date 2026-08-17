# Phase 0 Research: Column-Scoped Suggested Grouping

## §1. Where should the column-scoping fix live: `useCardGroups.ts`'s `findSuggestions`, or a pre-filter at the call site?

**Decision**: Add a required `columnId: string` parameter to `useCardGroups.ts`'s `findSuggestions`, and filter `cards` to `card.column === columnId && !card.groupId` inside it, before calling `findSemanticCardGroups`. `RetrospectiveBoard.tsx`'s `onSuggestionGenerate` closure (currently `() => findSuggestions({ threshold: 0.55, minGroupSize: 2, maxGroupSize: 6 })`, passed identically to every `GroupableColumn`) becomes `() => findSuggestions(column.id, { threshold: 0.55, minGroupSize: 2, maxGroupSize: 6 })`.

```ts
// useCardGroups.ts
const findSuggestions = useCallback(
    (columnId: string, config?: Partial<GroupingConfig>): Promise<GroupSuggestion[]> => {
        const columnUngroupedCards = cards.filter(
            (card) => card.column === columnId && !card.groupId
        );
        return findSemanticCardGroups(columnUngroupedCards, embeddingWorker.embed, config);
    },
    [cards, embeddingWorker.embed],
);
```

**Rationale**:
- Root cause: `useCardGroups` is instantiated once, board-wide, in `RetrospectiveBoard.tsx` (`cards` = the full board's card list from `useOptimizedCards`). `findSuggestions` previously closed over `ungroupedCards` — computed once as `cards.filter(c => !c.groupId)`, with no column filter at all. Every column's `onSuggestionGenerate` closure called this exact same board-wide function, so pressing the button on any one column ran the embeddings analysis over every column's cards and returned a suggestion set spanning the whole board — the reported bug.
- Filtering inside `findSuggestions` (rather than only at the call site) makes the column-scoping a property of the function's own contract — any future caller gets correct-by-construction behavior, and the existing unit test for this function is the natural place to pin the behavior (Constitution I/VI).
- `GroupableColumn.tsx`'s own prop contract (`onSuggestionGenerate: () => Promise<GroupSuggestion[]>`) does not need to change — it already knows its own `column.id` internally and doesn't need to receive it back; only the closure `RetrospectiveBoard.tsx` hands it needs updating to close over that column's id when calling `findSuggestions`.
- Matches Constitution V (Simplicity): one new required parameter, one `.filter()` added, one call-site update — no new prop threaded through `GroupableColumn.tsx`, no new hook, no new component.

**Alternatives considered**:
- *Instantiate `useCardGroups` once per column instead of once per board*: rejected — a much larger refactor (the hook also owns `groups`, `createGroup`, `disbandGroup`, etc., which are legitimately board-wide today via the `groups` prop already scoped per column at the `GroupableColumn` level); would touch far more call sites for no behavioral gain over the targeted parameter fix.
- *Filter only at the `RetrospectiveBoard.tsx` call site (pass pre-filtered `Card[]` into a `findSuggestions(cards, config)` overload)*: rejected — `findSuggestions` already has a `cards` closure from the hook's own props; asking every caller to remember to pre-filter is easier to get wrong again later than making the hook itself column-aware via an id parameter (Constitution IV, Single Responsibility: the hook is already the right owner of "which cards are eligible").
- *Add a `columnId` field to `GroupSuggestion` and filter suggestions after the fact in `GroupableColumn.tsx`*: rejected — this would still run the (expensive) embedding pass over every column's cards on every trigger, and would only filter the *display*, not the actual analysis input; the user's report explicitly objects to the analysis itself running board-wide, not just to stray results being shown (spec.md FR-002).

## §2. Does `findSemanticCardGroups`'s existing per-cluster cross-column guard need to change?

**Decision**: No change. `semanticGroupingService.ts:88` already refuses to pair two cards into the same cluster when `card2.column !== card1.column`. Once its input is always single-column (per §1), this check becomes structurally unreachable (there is never a second column present to compare against) but is left in place unchanged as harmless defense-in-depth, consistent with the function's own doc comment ("Finds groups of semantically similar ungrouped cards within the same column").

**Rationale**: Removing it would be a pure code-golf change with no behavioral or test benefit, and would strip a safety net if some future caller ever again passes it multi-column input by mistake — leaving it costs nothing (Constitution V: simplicity favors the smallest diff that fully fixes the reported bug, not incidental cleanup of adjacent, already-correct code).

**Alternatives considered**: Deleting the guard — rejected as unnecessary churn outside this fix's scope.

## §3. Does `GroupSuggestion` need a new `columnId` field for defense-in-depth or test assertions?

**Decision**: No. Every `GroupSuggestion` returned by `findSemanticCardGroups` is now guaranteed by construction to reference only cards from the single column passed into it (per §1); tests assert this by inspecting the `Card[]` argument `findSemanticCardGroups` was called with (already mockable per the existing `useCardGroups.test.ts` pattern), not by inspecting a new field on the suggestion itself.

**Rationale**: Adding a field to carry information already guaranteed by the caller's input would be redundant state that could drift from the truth if ever set incorrectly (Constitution V, YAGNI) — the existing `cardIds`/member-card lookup already lets any consumer resolve each suggestion's column via the card records it already has in hand.

**Alternatives considered**: Adding `columnId: string` to `GroupSuggestion` for a cheaper equality check in tests/UI — rejected; no consumer currently needs it, and every card in `cardIds` already carries its own `column` field, so deriving it (if ever needed) requires no new stored data.
