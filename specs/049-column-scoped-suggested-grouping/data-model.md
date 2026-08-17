# Phase 1 Data Model: Column-Scoped Suggested Grouping

No Firestore/backend schema changes, no new or modified persisted entity. This feature changes the *input selection* of one existing function; no type in `src/features/boards/types/card.ts` is added, removed, or restructured.

## Changed function signature: `useCardGroups.findSuggestions`

```ts
// src/features/boards/clustering/hooks/useCardGroups.ts

// Before
findSuggestions: (config?: Partial<GroupingConfig>) => Promise<GroupSuggestion[]>;

// After
findSuggestions: (columnId: string, config?: Partial<GroupingConfig>) => Promise<GroupSuggestion[]>;
```

- **`columnId`** (new, required, first positional parameter): identifies which column's cards are eligible for this analysis run. Matches the same column identifier already used throughout the app (`Card.column`, `CardGroup.column`, `ColumnGroupingState` keys, `DynamicColumnConfig.id`) — no new column concept introduced.
- Behavior: internally computes `cards.filter(card => card.column === columnId && !card.groupId)` and passes only that filtered list to `findSemanticCardGroups`, in place of the previous board-wide `ungroupedCards`.
- Callers: exactly one call site today, `RetrospectiveBoard.tsx`'s `onSuggestionGenerate` closure, which already has `column.id` in scope from the `COLUMN_ORDER_ARRAY.map((columnId, index) => ...)` loop it's defined inside.

## Unchanged: `GroupSuggestion` (client-only — never persisted)

```ts
export interface GroupSuggestion {
    id: string;
    cardIds: string[];
    similarity: number;
    suggestedTitle: string;
}
```

- No field added. Every `cardIds` entry is now guaranteed, by construction of the filtered input above, to belong to the single column the analysis was run for (research.md §3) — this is an input guarantee, not a new field to validate.

## Unchanged: `findSemanticCardGroups` (`semanticGroupingService.ts`)

```ts
export async function findSemanticCardGroups(
    cards: Card[],
    embeddingFetcher: EmbeddingFetcher,
    config: Partial<GroupingConfig> = {}
): Promise<GroupSuggestion[]>;
```

- Signature and internal clustering/embedding logic unchanged. Its existing per-cluster guard (`card2.column !== card1.column`, research.md §2) remains in place, now structurally unreachable given single-column input, but untouched.

## Unchanged: `CardGroup`, `ColumnGroupingState` / `GroupingCriteria`

No change to either. Group creation (`acceptSuggestion` → `createGroup`) and grouping-mode state (`useColumnGrouping.ts`) are unaffected — this fix only narrows which cards are ever considered as suggestion candidates in the first place.
