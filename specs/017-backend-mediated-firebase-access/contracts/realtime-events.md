# Contract: Real-Time Events Stream (`GET /api/boards/:id/events`)

See research.md §1 for the transport decision (Server-Sent Events over a per-connection Firestore Admin SDK relay).

## Connecting

Frontend: `new EventSource('/api/boards/:id/events', { withCredentials: true })`. The existing httpOnly session cookie is sent automatically (same-origin). `403 forbidden` (as a normal HTTP response, connection never upgrades to a stream) if the requester is not a participant or creator of the board.

Once accepted, the response is `Content-Type: text/event-stream` and stays open, forwarding events as they occur. `EventSource`'s native reconnect (with backoff) handles both genuine network drops and the periodic ~5-minute disconnect imposed by the Vercel function duration cap (research.md §1) — the frontend does not need to distinguish between these cases; both simply trigger the browser's built-in reconnect.

On each (re)connect, the backend sends an initial `snapshot` event containing the current state of everything the board's UI needs, so a freshly-(re)connected client is never left showing stale data while waiting for the next incremental change:

```
event: snapshot
data: {"board": {...}, "cards": [...], "groups": [...], "participants": [...], "countdown": {...}|null, "actionItems": [...], "sentiment": [...], "typing": [...], "notes": [...]|omitted}
```

`notes` is present only when the connecting user is the board's facilitator (per FR-004/data-model.md) — omitted entirely otherwise, matching the same "absent, not empty" convention already established by the MCP contract (`contracts/mcp-tools.md` in feature 015).

## Incremental events

After the initial snapshot, subsequent changes are sent as individually-typed events, one Firestore change → one SSE event:

| `event:` name | `data:` payload | Triggered by |
|---|---|---|
| `card.created` | full `Card` | `POST .../cards` |
| `card.updated` | full `Card` | `PATCH .../cards/:id`, like/reaction/reorder endpoints |
| `card.deleted` | `{ "id": "..." }` | `DELETE .../cards/:id` |
| `group.created` / `group.updated` | full `CardGroup` | group endpoints |
| `group.deleted` | `{ "id": "..." }` | disband |
| `participant.joined` | full `Participant` | `POST .../join` |
| `participant.presence` | `{ "participantId", "isActive" }` | SSE connection opened/closed (data-model.md's connection-derived presence) |
| `countdown.updated` | full `CountdownTimer` \| `null` | countdown endpoints |
| `action-item.created` / `.updated` / `.deleted` | full `ActionItem` \| `{id}` | action-item endpoints |
| `sentiment.updated` | full `SentimentResult` | sentiment endpoints |
| `typing.updated` | `{ "userId", "username", "column", "isActive" }` | `POST .../typing` |
| `note.created` / `.updated` / `.deleted` | full `FacilitatorNote` \| `{id}` | note endpoints — **facilitator connections only**, per research.md §1 |

Every incremental event is the same shape the corresponding REST endpoint already returns in its HTTP response — a client that just performed a write already has the authoritative result from the HTTP response itself; the SSE event is what lets *other* connected clients pick up the same change (User Story 2, Acceptance Scenarios 1–4).

## Heartbeat

A `: heartbeat\n\n` comment-only SSE line is sent periodically (e.g. every 15s) to keep intermediary proxies from timing out the connection early and to let the frontend distinguish "still connected, just quiet" from a silently-dead connection — this is what backs the "clearly surface a disconnected/reconnecting state" requirement (FR-009/FR-011): the UI treats "no heartbeat for N seconds" the same as an explicit `onerror` from `EventSource`.
