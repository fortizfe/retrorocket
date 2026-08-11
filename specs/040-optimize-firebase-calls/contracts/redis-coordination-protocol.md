# Contract: Redis Board-Listener Coordination Protocol (Story 3, internal)

This is not a public/client-facing contract — the browser-facing REST and WebSocket wire formats are explicitly unchanged by this feature (`FR-009`, `FR-010`; see feature 019's `contracts/realtime-protocol.md` for that unaffected contract). This document is the **server-to-server** contract between backend instances, mediated entirely through Redis, that `FR-006`, `FR-007`, `FR-008`, and `FR-008a` depend on.

## Actors

- **Any backend instance** — a single running process of the bundled backend (`api/index.ts` → `buildApp()`), identified by a per-process-boot `instanceId` (UUID v4).
- **Redis** — the shared Upstash database (Vercel Marketplace, free tier), reachable via a standard RESP connection string.

## Keys & Channels

| Name pattern | Kind | Owner-writable | Reader | Purpose |
|---|---|---|---|---|
| `board-owner:{retrospectiveId}` | String key, `PX`-expiring | The instance currently holding it | Any instance attempting to acquire/verify ownership | Exclusive lease determining which single instance runs real Firestore listeners for this board |
| `board-events:{retrospectiveId}` | Pub/Sub channel | The current owner only | Every instance with ≥1 local connection for this board | Relays translated Firestore change events to every instance so they can forward to their own local WebSocket connections |

## Operations

### 1. Acquire ownership

Triggered by **two** independent events — this dual trigger is deliberate; see the callout below.

(a) When an instance registers the first local connection for a board it does not currently own.

(b) **Periodically**, on the same cadence as the heartbeat interval (`leaseMs / 3`), for as long as an instance has ≥1 local connection for a board and does not currently believe it owns it — regardless of whether it just registered a new connection.

```
SET board-owner:{retrospectiveId} {instanceId} NX PX {leaseMs}
```

- Success (key was absent) → this instance is now the owner; it starts its Firestore `onSnapshot` listeners for the board (existing `startWatch()` logic) and begins publishing translated events to `board-events:{retrospectiveId}`.
- Failure (key already held by another instance) → this instance is not the owner; it only subscribes to `board-events:{retrospectiveId}` for local relay, and keeps re-attempting (b) on the next heartbeat tick.

> **Why trigger (b) exists**: without it, an instance that already has local connections when a board's owner *gracefully* releases (§3 — last local connection on the owner's side unregistering, not a crash) would never have a new registration event to hang an acquire attempt on, and would be left as a subscriber to a channel nobody publishes to — participants on that instance would silently stop receiving real-time updates, indefinitely, which violates `FR-007`/`FR-009` and the constitution's "silent failures are prohibited" standard. Trigger (b) makes every non-owner instance with active local connections a candidate that self-heals within one heartbeat interval, covering both the crash/lease-expiry case (already handled) and the graceful-release case (previously unhandled) with the same mechanism — no new message type or push notification needed, keeping this a simple pull model (Constitution Principle V, Simplicity).

### 2. Renew ownership (heartbeat)

Every `leaseMs / 3`, while the owning instance still has ≥1 local connection for the board:

```
-- Lua script, atomic compare-and-renew
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("PEXPIRE", KEYS[1], ARGV[2])
else
  return 0
end
```

- Returns `1` (renewed) → continue as owner.
- Returns `0` (lock no longer held by this instance, e.g. it already expired and another instance took over) → this instance stops publishing and falls back to being a plain subscriber; it resumes attempting to re-seize ownership via §1's trigger (b) on its next heartbeat tick, same as any other non-owner instance.

### 3. Release ownership

On the last local connection for a board unregistering (clean shutdown path):

```
-- Lua script, atomic compare-and-delete
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
```

No explicit hand-off notification is sent here. Recovery is entirely the responsibility of §1's trigger (b): any remaining instance with local connections for this board notices, within one heartbeat interval, that `board-owner:{retrospectiveId}` is absent and acquires it. This keeps release a one-sided operation (no coordination with, or acknowledgment from, other instances required) while still guaranteeing hand-off completes — see §1's callout for why trigger (b) is what makes this safe.

### 4. Publish an event (owner only)

For every Firestore change the owner's listeners observe, after translating it to the existing `RealtimeEvent` shape:

```
PUBLISH board-events:{retrospectiveId} {JSON.stringify(RealtimeEvent)}
```

### 5. Subscribe / relay (every instance with local connections)

```
SUBSCRIBE board-events:{retrospectiveId}
```

On each received message: `JSON.parse` it back into a `RealtimeEvent`, then apply the existing per-connection visibility filter (`isVisibleToConnection`) and deliver to matching local WebSocket connections only — identical to today's `broadcast()` loop, just fed from a Redis message instead of directly from a Firestore snapshot callback.

## Message schema

Identical to the existing `RealtimeEvent` type (`server/src/application/ports/realtime.ts`) — no new fields:

```ts
interface RealtimeEvent {
  type: 'entity_change';
  entity: 'card' | 'group' | 'actionItem' | 'timer' | 'typingStatus' | 'participant' | 'retrospective' | 'facilitatorNote';
  op: 'created' | 'updated' | 'deleted';
  id: string;
  data?: Record<string, unknown>; // omitted when op === 'deleted'
}
```

## Failure semantics (`FR-008a`)

Any operation in §1-§5 that errors or exceeds a short timeout is treated as "Redis unavailable for this board, right now":

1. The instance immediately (re-)starts direct local Firestore listeners for that specific board — i.e. it behaves exactly like `FirestoreRealtimeGatewayAdapter` does today, with no coordination at all, scoped only to boards it has local connections for.
2. The instance marks that board as degraded and retries §1 (acquire) on a fixed backoff (e.g. every 10-30s) while degraded.
3. On a successful acquire/subscribe after degradation, the instance tears down its temporary direct Firestore listeners for that board and resumes normal coordinated relay.

No cross-instance agreement is required to enter or exit degraded mode — each instance decides independently, per board, based only on its own ability to reach Redis. Because trigger (b) in §1 is itself just another Redis operation subject to this same failure handling, a Redis outage and a graceful-release hand-off can overlap safely: every affected instance simply falls back to direct listeners until Redis is reachable again, then resumes normal §1(b) periodic acquisition — recovery is not lost, only delayed.

## Non-goals

- This protocol does not change how a board's data is written (`create`/`update`/`delete` routes are untouched).
- This protocol does not introduce a new client-facing API, header, or WebSocket message type.
- This protocol does not require Redis to be durable/persistent — all keys are ephemeral coordination state, safe to lose entirely (every instance falls back to direct Firestore listeners, per the failure semantics above, if the Redis database itself were ever reset).
