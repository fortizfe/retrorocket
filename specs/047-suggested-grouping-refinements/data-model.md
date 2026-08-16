# Phase 1 Data Model: Suggested Grouping Refinements

No Firestore/backend schema changes. Both entities below already exist (`src/features/boards/types/card.ts`); this feature adds one client-only field and clarifies how an already-existing field is populated.

## GroupSuggestion (client-only — never persisted)

```ts
export interface GroupSuggestion {
    id: string;
    cardIds: string[];
    similarity: number;       // unchanged
    suggestedTitle: string;   // NEW — ≤35 chars, always non-empty (research.md §1)
}
```

- **`suggestedTitle`**: Produced by `suggestGroupTitle()` (`groupTitleService.ts`, new) at the same time the cluster itself is formed, inside `findSemanticCardGroups` (`semanticGroupingService.ts`). Always present and ≤35 characters by construction — never generated lazily, never `undefined`/empty (FR-001, FR-001a).
- Lifecycle: exists only in `GroupableColumn`'s local `suggestions` state between "generate" and "accept/reject/close"; never written to Firestore. An in-panel edit to the title (via `GroupSuggestionModal`'s local per-suggestion edit state) does not mutate this object — see the contract in `contracts/group-title-suggestion-contract.md` for exactly how the edited value flows to acceptance.

## CardGroup (existing, persisted — `backendRetrospectiveClient.ts` `CardGroup`/`CardGroupDTO`)

```ts
export interface CardGroup {
    id: string;
    retrospectiveId: string;
    column: string;
    headCardId: string;
    memberCardIds: string[];
    title?: string;           // UNCHANGED shape — this feature changes only what
                               // value the accept-suggestion flow now supplies
    isCollapsed: boolean;
    createdAt: Date;
    createdBy: string;
    order: number;
    totalVotes?: number;
    totalLikes?: number;
    allReactions?: Reaction[];
}
```

- No field added or removed. Behavioral change: `acceptSuggestion` (`useCardGroups.ts`) now always passes a non-empty `customTitle` — the (possibly edited) suggested title, or the "Group N" fallback (`research.md` §5) when the field was cleared — instead of today's `undefined`.
- **Dissolution**: unchanged mechanism — `disbandGroup(groupId)` (`useCardGroups.ts` → `backendRetrospectiveClient.disbandCardGroup`) deletes the `CardGroup` record and clears `groupId`/`isGroupHead`/`groupOrder` on its former member cards (existing server behavior, exercised today via `GroupCard.tsx`'s manual "ungroup" action). This feature's only change is a *new caller* of this same existing operation — from `GroupableColumn.tsx`'s grouping-mode-change handler, once per group in the column, when the mode changes away from `'suggestions'` (FR-008).

## ColumnGroupingState / GroupingCriteria (`columnGrouping.ts`)

Unchanged. `GroupingCriteria = 'none' | 'user' | 'suggestions'` and `ColumnGroupingState { criteria, activeGroups }` keep their existing shape; this feature does not add a new criteria value or a new stored field. The dissolve-on-switch behavior (FR-008/009) is a side effect orchestrated in `GroupableColumn.tsx` when `criteria` transitions *away from* `'suggestions'`, not a change to this type.

## New pure function: `suggestGroupTitle`

```ts
// src/features/boards/clustering/services/groupTitleService.ts
export function suggestGroupTitle(cards: Card[], maxLength?: number): string;
```

- Input: the member `Card[]` of a single proposed cluster (2+ cards, same shape `findSemanticCardGroups` already has in hand while building each `GroupSuggestion`).
- Output: a non-empty string, ≤ `maxLength` (default 35) characters, never mid-word-truncated.
- Pure and synchronous — no I/O, no worker round-trip (`research.md` §1). Unit-testable in isolation.
