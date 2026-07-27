# Contract: Cards & Card Groups API (`/api/boards/:id/cards/*`, `/api/boards/:id/groups/*`)

All routes require the requester to be a participant (or creator) of board `:id` — `403 forbidden` otherwise (FR-004). All mutating endpoints broadcast the resulting change over that board's SSE stream (see `realtime-events.md`) in addition to returning it in the HTTP response.

## Cards

### `POST /api/boards/:id/cards`
Request: `{ "content": "...", "column": "helped", "color"?: "pastel-blue" }`. `createdBy` derived from session.
Response `201`: full `Card` shape (data-model.md), `likes: [], reactions: [], order` set server-side.

### `PATCH /api/boards/:id/cards/:cardId`
Request: `{ "content"?, "color"?, "column"?, "order"? }`. Only the card's `createdBy` may edit — `403 forbidden` otherwise (Edge Case: non-owner edit attempt). Concurrent edits resolve last-write-wins (FR-014).
Response `200`: updated `Card`.

### `DELETE /api/boards/:id/cards/:cardId`
Only `createdBy` may delete. Response `204`. If the card is a group head, the backend promotes the next member or disbands the group server-side (mirrors `cardGroupService.removeCardFromGroup`'s head-removal logic, now made atomic).

### `POST /api/boards/:id/cards/:cardId/like`
Toggles the requester's like atomically (fixes the current non-atomic read-then-write in `cardInteractionService.toggleLike`).
Response `200`: `{ "liked": true, "likes": [ ... ] }`.

### `PUT /api/boards/:id/cards/:cardId/reaction`
Request: `{ "emoji": "🎉" }`. Replaces the requester's existing reaction (one per user), atomically.
Response `200`: `{ "reactions": [ ... ] }`.

### `DELETE /api/boards/:id/cards/:cardId/reaction`
Removes the requester's reaction. Response `200`: `{ "reactions": [ ... ] }`.

### `PATCH /api/boards/:id/cards/reorder`
Request: `{ "updates": [ { "cardId": "...", "order": 3, "column"?: "improve" } ] }`. Applied as a single Firestore batch write (fixes `batchUpdateCardOrder`'s current sequential-non-atomic behavior).
Response `200`: `{ "cards": [ ...updated Card[] ] }`.

> `votes`/up-down voting is **not** given a dedicated endpoint. The field is carried through generically via `PATCH .../cards/:cardId` for read/write parity with existing stored data, since the product's own documentation marks the numeric voting stepper deprecated in favor of likes/reactions. If any UI surface is later found still calling the legacy vote stepper, add a dedicated endpoint at that point rather than speculatively now.

## Card Groups

### `POST /api/boards/:id/groups`
Request: `{ "headCardId": "...", "memberCardIds": ["..."], "title"?: "..." }`. Atomic (Firestore batch, matching today's already-correct `cardGroupService.createCardGroup`).
Response `201`: full `CardGroup` shape, with `totalVotes`/`totalLikes`/`allReactions` computed server-side from current card state.

### `DELETE /api/boards/:id/groups/:groupId`
Disbands the group (clears `groupId`/`isGroupHead`/`groupOrder` on all member/head cards, then deletes the group doc) — atomic. Response `204`.

### `PUT /api/boards/:id/groups/:groupId/cards/:cardId`
Adds a card to an existing group. Response `200`: updated `CardGroup`.

### `DELETE /api/boards/:id/groups/:groupId/cards/:cardId`
Removes a card from a group; promotes the next member to head if the head is removed, or disbands if the group becomes empty (same semantics as today's `removeCardFromGroup`, made atomic). Response `200`: updated `CardGroup` or `204` if the group was disbanded as a result.

### `PATCH /api/boards/:id/groups/:groupId`
Request: `{ "isCollapsed": true }`. Response `200`: updated `CardGroup`.

### `PATCH /api/boards/:id/column-grouping`
Request: `{ "states": { "helped": { "mode": "grouped" } } }` (opaque per-column UI state blob, unchanged shape from today's `columnGroupingService`). Response `200`: `{ "states": { ... } }`.
