# Data Model: Optimize Backend-to-Firestore Call Volume

No changes to Firestore document shapes, no new user-visible entities, and no database migration — this feature only adds internal coordination/caching state. The three Key Entities named in `spec.md` map to concrete structures as follows.

## Board Subscription Ownership (Story 3)

Backed by Redis (Upstash), not Firestore. Two related keys per board, scoped by `retrospectiveId`.

### `board-owner:{retrospectiveId}` — ownership lease

| Field | Type | Notes |
|---|---|---|
| Key | `string` | `board-owner:{retrospectiveId}` |
| Value | `string` | Opaque instance identifier (UUID v4, generated once per process boot) |
| TTL | `PX <leaseMs>` | Lease duration; renewed via heartbeat while the holder still has ≥1 local connection for the board (§5 in research.md) |

**Lifecycle**: created on first local registration for a board this instance doesn't already own, **or** on any periodic re-check while an instance has ≥1 local connection to a board it doesn't own (research.md §5's trigger (b), added to guarantee hand-off after a graceful release, not just a crash) → renewed on a fixed cadence while owned and still has ≥1 local connection → deleted on last local unregistration (clean shutdown, no hand-off notification sent) or left to expire (crash/ungraceful termination) — in both cases, the next instance whose periodic re-check observes the key absent acquires it, within one heartbeat interval.

**Invariant**: at most one valid (non-expired) value exists for a given `retrospectiveId` at any time (enforced by Redis `SET NX`).

### `board-events:{retrospectiveId}` — event relay channel

| Field | Type | Notes |
|---|---|---|
| Channel | `string` | `board-events:{retrospectiveId}` (Redis Pub/Sub, not a stored key) |
| Message payload | `RealtimeEvent` (JSON) | Identical shape to what `toEntityChangeEvent()` already produces today — see `server/src/adapters/firebase/FirestoreRealtimeGatewayAdapter.ts` and `contracts/redis-coordination-protocol.md` |

**Lifecycle**: published to only by the current owner (per `board-owner:{retrospectiveId}`); subscribed to by every instance with ≥1 local connection for that board, for as long as that connection count stays ≥1.

## Cached Profile Lookup (Story 1 / Story 2 support)

Backed by a per-instance in-memory `Map`, not Redis (see research.md §2 for why cross-instance consistency is not required here).

| Field | Type | Notes |
|---|---|---|
| Key | `string` | `uid` |
| `profile` | `ProfileRecord` | The exact shape already returned by `ProfilePort.ensureProfile()` today — no change to `ProfileRecord`'s own fields |
| `expiresAt` | `number` (epoch ms) | `now + 60_000` (60s TTL per clarification) |

**Lifecycle**: populated on a cache miss (first lookup for a `uid` on this instance, or after prior expiry); served on a cache hit while `now < expiresAt`; explicitly deleted (not just left to expire) whenever the same instance processes an explicit profile-mutating write for that `uid` (e.g. `renameParticipantsForUser`'s underlying display-name change path), so a rename is never masked for up to 60s on the instance that handled the write. Other instances' caches for that `uid` still expire naturally within ≤60s — an accepted bound per `FR-003`.

## Board Reconnection Cycle (Story 1)

Not a persisted entity — a per-request-scoped context describing the bounded sequence of steps within one reconnection (WS handshake existence-check → `POST /join` → `GET /api/retrospectives/:id`) inside which redundant lookups of the same underlying data (the board's own record, the caller's profile) must not repeat. Modeled as: the already-fetched `RetrospectiveDTO` from `JoinRetrospective`'s own `getRetrospective()` call being threaded through to `FirestoreRetrospectiveBoardAdapter.join()` instead of that method independently re-fetching it (research.md §1). No new stored type is introduced; this is a call-graph change, not a data-model change.
