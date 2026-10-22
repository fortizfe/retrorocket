# Data Model: Drag-to-Group Cards with Inline Group Title Editing

**Feature**: 059-drag-to-group-cards | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md) (revised after clarify session 2026-10-21)

There are **no new collections and no data migration**. Changes:

- Two optional fields on `groups` gain meaning: `origin` is new, and `order` becomes meaningful.
- `title` becomes mutable.
- All grouping writes become validated transactions.
- Groups and ungrouped cards share one order space per column.
- There is new transient drag state on the client.

## Persisted entities (Firestore, written only by the server's Admin SDK)

### CardGroup (`groups/{groupId}`)

| Field | Type | Change | Rules |
|---|---|---|---|
| `retrospectiveId` | string | — | Equals every member card's `retrospectiveId` (enforced) |
| `column` | string | — | Equals every member card's `column` (enforced) |
| `headCardId` | string | — | Primary card. For drag/menu creation it is the **target** card. Removing it promotes `memberCardIds[0]` |
| `memberCardIds` | string[] | — | Ordered, with at least 1 entry while the group exists, since a group has **at least 2 cards** in total (FR-031) |
| `title` | string? | **Mutable** | Trimmed, 1–60 chars. Absent means the localized default is displayed. It is never stored as `""` |
| `origin` | `'manual' \| 'suggestion'`? | **New** | Written as `'manual'` by `moveCard` and as `'suggestion'` by `POST /groups` by default. Absent is treated as `'suggestion'` (legacy) |
| `order` | number | **Now meaningful** | A position in the column's shared order space (see Column order). Set to the target card's `order` on creation. Legacy groups have `0` |
| `isCollapsed` | boolean | — | PATCH is partial |
| `createdAt`, `createdBy`, `updatedAt` | — | — | Unchanged |

### Card (`cards/{cardId}`), grouping and order fields

| Field | Change | Invariant |
|---|---|---|
| `order` | Semantics widened | For an **ungrouped** card, its position in the column's shared order space. For a grouped card it is ignored for display; when the card leaves its group, it gets a new value |
| `groupId?`, `isGroupHead?`, `groupOrder?` | — | Consistent with the group doc (I1–I4) |
| `votes`, `likes`, `reactions` | — | Never modified by grouping (FR-025) |

### Column order (derived, not a stored document)

`ColumnItems(column) = ungroupedCards(column) ∪ groups(column)`, sorted by:

1. `order` ascending;
2. tie → groups before cards;
3. then `createdAt` ascending;
4. then `id`.

This order applies in modes `none` and `suggestions`. In mode `user`, groups are listed above the author sections and sorted by `order`. The tie-break reproduces today's layout for legacy data, where groups have `order` 0 and come first.

**Placement rules** (FR-035):

| Operation | Resulting order |
|---|---|
| Reorder or drag-out to a position between `a` and `b` | Client midpoint `(a+b)/2`. At the start `b−1`, at the end `a+1` |
| Create a group on target T | `group.order = T.order` |
| Add a card to group G | G keeps its order |
| Group dissolves (1 card left) | The remaining card gets `order = group.order` |
| Remove through a control | Midpoint between `group.order` and the next item's order, or `group.order + 1` |
| Precision guard: gap ≤ `1e-3` | Client renormalisation of the column, spaced 1024 apart, in one transaction |

**No new index**: the repo has no `firestore.indexes.json` and no deployed composite indexes. The removal-through-control path therefore reads the retrospective's `cards` and `groups` with the existing single-field equality `retrospectiveId ==`, the same query `listGroups` and `GetBoardState` already use, and picks the next item of the column in memory. Board sizes (tens of cards) keep this cheap.

### Integrity invariants (enforced in every grouping transaction; asserted for SC-005)

- **I1**: For every card with `groupId = g`, `groups/g` exists, and the card is `g.headCardId` or is in `g.memberCardIds`.
- **I2**: For every group `g`, every id in `{headCardId} ∪ memberCardIds` exists with `groupId = g.id`.
- **I3**: A card belongs to at most one group.
- **I4**: All of a group's cards share the group's `column` and `retrospectiveId`.
- **I5** (new): A group has at least 2 cards. Any operation that would leave 1 dissolves the group in the same transaction.

### State transitions: `moveCard(source, target)`

| Source \ Target | `position(order)` | `card(T)` (T ungrouped) | `group(G)` |
|---|---|---|---|
| **Ungrouped** | Set `order` (plain reorder) | Create group {head T, members [source]}, `origin: manual`, `order = T.order` | Append to G |
| **Grouped in S** | Detach from S (dissolve if 1 left), set `order`, clear its grouping fields | Detach from S (dissolve if 1 left), create the group as on the left | `G ≠ S`: detach from S (dissolve if 1 left), append to G. `G = S`: 400 (the client never sends it) |

A violated invariant gives `409 group_conflict` with **no writes**. A missing entity gives `404 not_found`, also with no writes.

## Client-only (transient) models

### ColumnItem

```ts
type ColumnItem =
  | { kind: 'card'; id: `card:${string}`; card: Card }
  | { kind: 'group'; id: `group:${string}`; group: CardGroup };
```

Built by the pure function `buildColumnItems(cards, groups, columnId)` in `clustering/dnd/columnOrder.ts`, which also exports `computeOrder(items, placement)` and `needsRenormalize(...)`.

### DragIntent

```ts
type DragIntent =
  | { kind: 'idle' }
  | { kind: 'none' }                                         // grouped source over its own group
  | { kind: 'reorder'; overId: string; edge: 'before' | 'after' }
  | { kind: 'pendingGroup'; target: MoveTarget; since: number }
  | { kind: 'group'; target: MoveTarget }
  | { kind: 'outside' };

type MoveTarget =
  | { kind: 'position'; order: number }
  | { kind: 'card'; cardId: string }
  | { kind: 'group'; groupId: string };
```

Constants: `ZONE_EDGE = 0.25`, `GROUP_EDGE_MAX_PX = 16`, `DWELL_MS = 180`. Drag source kinds: `card:*` (sortable) and `member:*` (draggable).

### ColumnGroupingContext

| Value | Purpose |
|---|---|
| `columnId`, `groupingEnabled` | Scope, and `displayedCriteria !== 'user'` combined with the editor permission |
| `items`, `groups`, `ungroupedCards` | Rendering and menu candidates |
| `armedTargetId` | Which item renders the armed feedback |
| `pendingEditGroupId`, `consumePendingEdit()` | Auto-edit of the title on the creating client only |
| `requestMove(sourceCardId, target)` | The single orchestration path for drop, menu and reorder |
| `computeOrder(placement)` | Midpoint plus the precision guard (it may trigger a renormalise) |

### GroupTitleEditor local state

`mode: 'display' | 'edit'`, `draft`, `valueAtEditStart`, `optimisticTitle | null`.

## Validation rules

| Rule | Client | Server |
|---|---|---|
| Title: trim, empty → absent, at most 60 chars | `maxLength`, trim | Trim; empty → `FieldValue.delete()`; over 60 → 400 |
| Same column and retrospective; target ungrouped; a card in at most one group | Fast-path guard | **Authoritative**, in a transaction → 409 |
| A group has at least 2 cards | — | Dissolve in the same transaction (I5) |
| `order` is a finite number | `computeOrder` | `Number.isFinite`, otherwise 400 |
| Renormalisation items all belong to the column | — | Validated in the transaction → 409 if any item moved |
| Grouping disabled in mode `user` | No group intent, no member handles, no menu | Not enforced: the mode is a display preference, not a data invariant |
| Member cap on `POST /groups` | — | At most 50 → 400 |
