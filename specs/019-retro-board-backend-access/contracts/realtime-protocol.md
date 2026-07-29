# Realtime Delivery Protocol (FR-018, FR-019, FR-019a)

WebSocket, one connection per open board per browser tab. Not expressible in OpenAPI (see `retrospective-api.yaml` for the REST surface); documented here as this feature's other interface contract.

## Connecting

```
GET /api/retrospectives/{id}/live         (HTTP Upgrade: websocket)
```

- Authenticated via the same `rr_session` httpOnly cookie as every REST call (research.md §4) — sent automatically by the browser on the same-origin upgrade request. No token-in-URL, no separate handshake message.
- Server verifies the session during the `upgrade` event, **before** completing the WebSocket handshake. An invalid/missing session closes the connection immediately with code `4401` (custom app-level close code mirroring HTTP 401).
- A caller who is not currently a participant of the board is upgraded anyway (read access to a board's live updates does not require having called `POST /retrospectives/{id}/join` first, mirroring today's client behavior where the subscription and the join call are independent) but receives only events for the board id in the URL.
- One board per connection — no multiplexing. A client viewing a different board opens a new connection (and closes the old one).

## Server → Client: `entity_change` events

Every change reaches every other open connection for the same board within **2 seconds (p95)** of the write that caused it (SC-004), via a server-side `firebase-admin` listener translating Firestore changes into these events (research.md §1) — never by the browser polling.

```jsonc
{
  "type": "entity_change",
  "entity": "card" | "group" | "actionItem" | "timer" | "typingStatus" | "participant" | "retrospective" | "facilitatorNote",
  "op": "created" | "updated" | "deleted",
  "id": "<document id>",
  "data": { /* full current entity, same shape as the REST GET response for that entity type — see data-model.md */ }
  // "data" is omitted when op === "deleted"
}
```

- `entity: "retrospective"` covers board metadata changes, timer-adjacent board fields, and `columnGroupingStates` updates (all live on the same `retrospectives/{id}` document).
- `entity: "facilitatorNote"` events are filtered server-side before relay: only sent to the connection belonging to that same `facilitatorId` (FR-013's visibility scoping applies over the wire, not just in REST responses).
- `entity: "typingStatus"` events follow the same 300ms-debounce / 5000ms-TTL lifecycle as the underlying Firestore document (data-model.md) — a `created`/`updated` event means "so-and-so is typing," a `deleted` event means the indicator should clear.

## Client → Server messages

The connection is otherwise **read-only from the client's perspective for this protocol** — every state-changing action (including typing-status writes) goes through the REST API (FR-017 et al.), not a message sent over this socket. The only client-initiated message is a lightweight heartbeat:

```jsonc
{ "type": "ping" }
```
Server replies `{ "type": "pong" }`. Used for keep-alive and for the client to detect a half-open connection faster than the underlying TCP/WebSocket close event might otherwise fire.

## Disconnection and resync (research.md §2)

- The server may close the connection when the underlying Vercel Function reaches its configured `maxDuration` — this is expected, routine behavior on this platform, not an error condition.
- On any close (expected or not), the client reconnects with exponential backoff (starting at 1s, capped at 30s, per Vercel's documented client pattern).
- On every successful (re)connection, the client first performs a fresh `GET /api/retrospectives/{id}` (REST) to resync full board state, **then** resumes processing live events — this guarantees no missed-event gap ever produces a stale or "ghost" card, satisfying the spec's reconnection edge case without a full page reload.

## Error / close codes

| Code | Meaning |
|---|---|
| `4401` | No valid session at upgrade time |
| `4404` | Board does not exist |
| `1000` | Normal closure (client navigated away, or server graceful shutdown) |
| `1001` | Going away (server-initiated, e.g. `maxDuration` reached) — client MUST reconnect |
