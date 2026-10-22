# Contract: Card Group & Column-Order HTTP API (changes only)

**Feature**: 059-drag-to-group-cards | Server: `retro-rocket/server/src/http/routes/retrospectives.ts` | Revised after clarify session 2026-10-21

All endpoints need a valid session (`requireSession`), as today, and any participant may call them (Clarification Q2). The error body is the existing `AppError` serialization: `{ "error": { "code": string, "message": string } }`.

The serialized `CardGroup` gains `origin?: 'manual' | 'suggestion'`, and `order` now carries a real position.

---

## C0. `POST /api/retrospectives/:id/cards/:cardId/move` (NEW): the single atomic move

Used by every drag drop and by both keyboard menus ("Group with…", "Move to group…", "Remove from group"), and by plain reorder in the interleaved list.

**Request**:

```json
{ "target": { "kind": "position", "order": 1712345678.5 } }
{ "target": { "kind": "card",     "cardId": "cardB" } }
{ "target": { "kind": "group",    "groupId": "g2" } }
```

**Processing** (one Firestore transaction, with all reads before any writes): see [data-model.md § State transitions](../data-model.md).

| # | Check | Failure |
|---|---|---|
| M1 | `target` has a valid shape; `order` is finite; `cardId` ≠ `:cardId` | `400 invalid_request` |
| M2 | The source card exists and `retrospectiveId === :id` | `404 not_found` |
| M3 | The target card or group exists | `404 not_found` |
| M4 | The target is in the same retrospective **and the same column** as the source | `409 group_conflict` |
| M5 | The target card is ungrouped | `409 group_conflict` |
| M6 | The target group isn't the source's own group | `400 invalid_request` |
| M7 | The source's current group, if any, still lists the source, so I1 holds | `409 group_conflict` |

**Effects**:

- Detach from the source group: promote a new head if needed, reindex the members, and **dissolve the group if 1 card is left**, putting the remaining card at `order = group.order`.
- Then attach:
  - `position`: set `order` and clear the grouping fields.
  - `card`: create a group with `origin: 'manual'`, `order = target.order` and no title.
  - `group`: append to the group.

**Success**: `200`

```json
{ "createdGroupId": "g9", "dissolvedGroupIds": ["g1"] }
```

Both fields are optional/empty when they don't apply. Changes reach every participant through the existing `entity_change` events.

---

## C1. `POST /api/retrospectives/:id/groups` (create, used by suggestion accept): hardened

The request shape is unchanged (`headCardId`, `memberCardIds`, `title?`), plus an optional `origin`, which defaults to `'suggestion'`.

| # | Check | Failure |
|---|---|---|
| P1 | `memberCardIds` has 1–50 entries, no duplicates, and doesn't contain `headCardId`; `origin` is valid if present | `400` |
| P2 | All cards exist | `404` |
| P3 | All cards have `retrospectiveId === :id` | `409 group_conflict` |
| P4 | All members are in the head's column | `409 group_conflict` |
| P5 | No card is already grouped | `409 group_conflict` |
| P6 | `title`: trimmed, empty → omitted, more than 60 chars → error | `400` |

**New effect**: `order = headCard.order`, so the group takes the head card's slot (FR-034). **Success**: `201` + `CardGroup`.

## C2. `POST /api/groups/:id/cards` (add): hardened

Transactional, with checks A1 (group exists, 404), A2 (card exists, 404), A3 (same retrospective and column, 409) and A4 (card ungrouped, 409). The request and response are unchanged. The client's drag and menu paths use C0 instead; this endpoint stays for compatibility.

## C2b. `DELETE /api/groups/:id/cards/:cardId` (remove through a control): hardened

- Transactional.
- If the group is left with 1 card, it **dissolves** (I5): the response is `200 null`, and the remaining card takes `order = group.order`.
- The removed card is placed **right after its former group** in the column order (data-model placement rules).
- Responses are unchanged: `200` with the `CardGroup`, or `null` when dissolved.

## C3. `PATCH /api/groups/:id`: partial update, adds `title`

**Request**: a non-empty subset of `{ "isCollapsed": boolean, "title": string | null }`.

- A field is applied **only if present**. This fixes today's coercion of a missing `isCollapsed` to `false`.
- `title` is trimmed. `""`, whitespace or `null` deletes the stored title. More than 60 characters → `400`.
- An empty body or wrong types → `400`. A missing group → `404`.
- **Success**: `200` + `CardGroup`. Last write wins.

## C4. `POST /api/retrospectives/:id/column-order` (NEW): renormalise one column

**Request**:

```json
{ "columnId": "what-went-well", "items": [ { "kind": "group", "id": "g1", "order": 1024 }, { "kind": "card", "id": "c7", "order": 2048 } ] }
```

| # | Check | Failure |
|---|---|---|
| R1 | 1–500 items, finite orders, no duplicates | `400` |
| R2 | Every item exists in retrospective `:id` | `404` |
| R3 | Every item is in `columnId`; cards are ungrouped | `409 group_conflict` |

**Effect**: one transaction writes every `order`. **Success**: `204`. The client calls it only when the precision guard trips (gap ≤ 1e-3), and then retries its placement.

---

## Server layering (ports and adapters)

| Layer | Change |
|---|---|
| `application/ports/cards.ts` | `CardGroupPort` gains `moveCard(retrospectiveId, cardId, target): Promise<MoveCardResult>`, `setGroupTitle(groupId, title \| null)` and `renormalizeColumnOrder(retrospectiveId, columnId, items)`. `CardGroupDTO.origin?` and `CreateCardGroupInput.origin?` are added |
| `application/use-cases/retrospective/CardGrouping.ts` | New `moveCard`, `updateCardGroup` (partial + title normalisation) and `renormalizeColumnOrder`. Input validation (M1, P1, P6, R1) lives here; invariants are delegated to the adapter |
| `adapters/firebase/FirestoreCardGroupAdapter.ts` | `runTransaction` for `createGroup`, `addCardToGroup`, `removeCardFromGroup`, `moveCard` and `renormalizeColumnOrder`, sharing private helpers `detachInTx` / `attachInTx`. `setGroupTitle` and `toCardGroup` map `origin` |
| `domain/errors.ts` | Reuse `ConflictError`, with `code: 'group_conflict'` through an additive constructor argument |
| `http/routes/retrospectives.ts` | Routes C0 and C4, C3 partial, and 409 mapping through the existing error middleware |
| `test/.../retrospectiveFakes.ts` | The fake `CardGroupPort` mirrors I1–I5 so use-case tests need no emulator |

## Client (`src/features/boards/retrospective/services/backendRetrospectiveClient.ts`)

| Function | Change |
|---|---|
| `moveCard(retrospectiveId, cardId, target)` | **New** → C0 |
| `updateCardGroup(groupId, { title?, isCollapsed? })` | **New** → C3 |
| `renormalizeColumnOrder(retrospectiveId, columnId, items)` | **New** → C4 |
| `createCardGroup`, `addCardToGroup`, `removeCardFromGroup`, `setGroupCollapse` | Unchanged signatures. `cardGroupFromDTO` maps `origin` |
