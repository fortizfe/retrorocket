# Realtime Connection Lifecycle — Delta over `019-retro-board-backend-access/contracts/realtime-protocol.md`

This amends the existing realtime protocol contract (`GET /api/retrospectives/{id}/live`)
with the behavior this feature adds. It does not replace the original document — the
message shapes, entity events, and REST resync-on-reconnect behavior it defines are
unchanged. Only the client's reconnection *policy* and the server's liveness handling
change.

## 1. Client-initiated close on backgrounding (new)

When a browser tab holding an open connection has had
`document.visibilityState === 'hidden'` continuously for 120 seconds, the **client**
closes the connection itself with the standard normal-closure code:

```
close code 1000 (Normal Closure)
```

This is indistinguishable on the wire from a user navigating away — the server's existing
`ws.on('close', ...)` handling (`gateway.unregister(connection)`) requires no change to
recognize it. The distinguishing behavior is entirely client-side: unlike a `1000` caused
by navigation (where the page/component actually unmounts and no reconnect is desired),
a `1000` caused by backgrounding is followed by an automatic reconnect the moment
`document.visibilityState` returns to `'visible'` (no backoff delay — this is a
deliberate, expected reconnect, not a failure recovery).

## 2. Reconnect policy on close (changed)

Supersedes the original contract's blanket "on any close (expected or not), the client
reconnects with exponential backoff":

| Close code | New client behavior |
|---|---|
| `4401` (no valid session) | Client MUST NOT auto-reconnect. Surface a terminal, user-actionable state ("sign in again"). |
| `4404` (board not found) | Client MUST NOT auto-reconnect. Surface a terminal, user-actionable state. |
| `1000` from the client's own backgrounding pause | Reconnect immediately on next foreground transition (§1) — not subject to the 5-minute cap below, since it isn't a failure. |
| Any other code (`1001` `maxDuration`, network drop, server restart, etc.) | Reconnect with the existing exponential backoff (1s → 30s cap), but only for up to **5 minutes of total elapsed time** since the first failure in the streak. After 5 minutes, stop and surface a manual-retry affordance. A successful reconnection resets the elapsed-time counter. |

## 3. Server → client protocol-level ping/pong (new)

In addition to the existing application-level `{"type":"ping"}` / `{"type":"pong"}` JSON
messages (unchanged, still client-initiated every 15s for keep-alive), the server now
also sends **WebSocket protocol-level ping frames** (RFC 6455, not JSON) every 30 seconds
of an open connection's lifetime. If two consecutive protocol-level pings go unanswered
(no `pong` frame within the second 30s window — i.e. 60-90s of total silence), the server
terminates the connection.

This is invisible to the JSON message contract above — it operates below the
application-message layer and requires no client-side code change (`ws`/browsers respond
to protocol-level pings automatically). It exists purely so the server stops counting an
unresponsive socket (laptop sleep, dead NAT mapping) as an active board participant, and
so the board's data-subscription reference count (§4) drops promptly instead of waiting
on an OS-level TCP timeout that can take much longer.

## 4. Board data-subscription teardown grace (server-internal, not wire-visible)

Not a change to any message format. Documented here because it's observable indirectly:
after the *last* connection for a board unregisters (whether via `1000`, `4401`/`4404`,
or a pruned dead socket per §3), the server keeps that board's Firestore listeners alive
for 30 seconds before actually detaching them. A reconnect to the same board within that
window resumes receiving `entity_change` events with no gap and no re-fetch cost on the
server side beyond the client's normal REST resync (unchanged, per the original
contract's "every successful (re)connection first performs a fresh
`GET /api/retrospectives/{id}`").

## Unchanged

- Message shapes (`entity_change`, `{"type":"ping"}"`/`{"type":"pong"}"`).
- The REST resync-on-reconnect behavior.
- Close codes `4401`/`4404`/`1000`/`1001` themselves (no new codes introduced).
- One connection per open board per browser tab.
