# Contract: Facilitator Tools & Sentiment API

All routes require the requester to be a participant (or creator) of board `:id` for reads; facilitator-only writes require `uid == retrospective.createdBy` (`403 forbidden` otherwise, FR-004).

## Countdown Timer (`/api/boards/:id/countdown`)

### `POST /api/boards/:id/countdown` — create/update (facilitator only)
Request: `{ "duration": 300 }` (seconds). Response `201`: full `CountdownTimer` shape.

### `POST /api/boards/:id/countdown/start` — facilitator only
Computes `endTime` server-side from `duration`. Response `200`: updated timer.

### `POST /api/boards/:id/countdown/pause` — facilitator only
Computes remaining duration from elapsed wall time server-side. Response `200`: updated timer.

### `POST /api/boards/:id/countdown/reset` — facilitator only
Restores `originalDuration`, paused state. Response `200`: updated timer.

### `DELETE /api/boards/:id/countdown` — facilitator only
Response `204`.

All participants (not just the facilitator) can `GET`/subscribe (via the events stream) to timer state — read is unrestricted among board participants, matching today's product behavior (README: "real-time sync to every participant").

## Facilitator Notes (`/api/boards/:id/notes`)

Read AND write both restricted to the board's own facilitator (`uid == retrospective.createdBy`) — this is the collection where research.md §2 found the current Firestore rule to be dead code; the backend is where this restriction becomes real for the first time.

### `POST /api/boards/:id/notes` — facilitator only
Request: `{ "content": "..." }`. Response `201`: `{ id, content, createdAt, updatedAt }`.

### `PATCH /api/boards/:id/notes/:noteId` — facilitator only, must own the note
Request: `{ "content": "..." }`. Response `200`: updated note.

### `DELETE /api/boards/:id/notes/:noteId` — facilitator only, must own the note
Response `204`.

Notes are also delivered over the board's SSE stream, but **only into the facilitator's own connection** (the relay checks `uid == retrospective.createdBy` per-connection before forwarding a `note.*` event) — non-facilitator connections never receive these events at all, not even filtered client-side.

## Action Items (`/api/boards/:id/action-items`)

Read open to all participants; create/update/delete restricted to the facilitator.

### `POST /api/boards/:id/action-items` — facilitator only
Request: `{ "content": "...", "assignedTo"?: "uid", "assignedToName"?: "...", "dueDate"?: "ISO date" }`.
Response `201`: full `ActionItem`.

### `POST /api/boards/:id/action-items/from-card` — facilitator only
Convenience endpoint replacing `convertCardToActionItem`. Request: `{ "cardContent": "...", "assignedTo"?, "assignedToName"?, "dueDate"? }`. Response `201`: full `ActionItem`.

### `PATCH /api/boards/:id/action-items/:itemId` — facilitator only
Response `200`: updated `ActionItem`.

### `DELETE /api/boards/:id/action-items/:itemId` — facilitator only
Response `204`.

## Sentiment Results (`/api/boards/:id/cards/:cardId/sentiment`)

The on-device inference itself is unchanged/client-side (FR-007) — these endpoints only persist/retrieve its output.

### `PUT /api/boards/:id/cards/:cardId/sentiment` — any participant (whoever's client just computed it)
Request: `{ "sentiment": "positive"|"negative"|"neutral", "confidence": 0.87, "contentHash": "...", "modelId"?, "modelVersion"? }`. Upserts (matches today's `saveResultWithHash` semantics — only overwrites if `contentHash` differs, i.e. the card content actually changed since the last analysis).
Response `200`: full `SentimentResult`.

### `PUT /api/boards/:id/cards/:cardId/sentiment/override` — facilitator only
Request: `{ "sentiment": "positive"|"negative"|"neutral" }`. Sets `isOverride: true, confidence: 1.0, overrideBy: <uid>`.
Response `200`: full `SentimentResult`.

### `DELETE /api/boards/:id/cards/:cardId/sentiment`
Response `204`.

Sentiment results for a board are also delivered via the board's SSE stream so the team-mood dashboard (facilitator-only UI, but not facilitator-only *data* — any participant's client could in principle compute it) updates live without a poll.
