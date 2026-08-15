# Phase 1 Data Model: Idle Tab Realtime Connection Cleanup

This feature adds no new persisted entities and no Firestore schema changes. It extends
the **lifecycle/state** of three entities already implicit in the existing code
(`spec.md`'s Key Entities), grounded in their current concrete shapes.

## 1. Realtime Connection (client-side)

Concrete today as the WebSocket wrapped by `backendRealtimeClient.ts` plus the
`RealtimeConnection` object (`server/src/application/ports/realtime.ts`) it maps to
server-side (`{ retrospectiveId, uid, send() }`).

**New client-side state** (frontend-only; not sent over the wire):

| State | Meaning | Entered from | Exits to |
|---|---|---|---|
| `connecting` | Initial connect or a reconnect attempt in flight | app start; `reconnecting` after backoff delay elapses | `open`, `reconnecting`, `terminal` |
| `open` | Live WebSocket, tab in foreground or within grace | `connecting` on successful handshake | `backgrounded` (US1), `reconnecting` (unexpected close), `terminal` (server rejection) |
| `backgrounded` | Tab hidden ≥120s (FR-001); connection deliberately closed by the client, not by the server | `open`, once the 120s visibility timer fires | `open` (US1, tab foregrounded again — reconnects immediately) |
| `reconnecting` | Transient close (network), auto-retry in progress with exponential backoff | `open`, `connecting` | `connecting` (next attempt), `retry_exhausted` (5 min elapsed, FR-004) |
| `retry_exhausted` | 5-minute retry budget spent; no more automatic attempts | `reconnecting` | `connecting` (only via explicit user-triggered manual retry, US2) |
| `terminal` | Server sent `4401` (unauthenticated) or `4404` (board not found); no automatic retry (FR-003) | `open`, `connecting` | none automatically — requires the user's own corrective action (re-auth / navigate away) |

**Validation rules**:
- A transition into `backgrounded` MUST NOT occur before 120 continuous seconds of
  `document.visibilityState === 'hidden'` (FR-001); returning to `'visible'` before that
  cancels the pending transition with no observable connection change (Edge Case 2).
- A transition into `retry_exhausted` MUST NOT occur before 5 minutes of elapsed time
  since the first failure in the current `reconnecting` streak (FR-004).
- `terminal` MUST NOT auto-transition back to `connecting` (FR-003) — distinguishing it
  from `retry_exhausted`, which also stops retrying but for a different, non-definitive
  reason.

## 2. Board Data Subscription (server-side, per `retrospectiveId`)

Concrete today as `BoardWatch` in `FirestoreRealtimeGatewayAdapter.ts` (mirrored by
`CoordinatedRealtimeGatewayAdapter.ts`):

```ts
interface BoardWatch {
    connections: Set<RealtimeConnection>;
    listeners: FirestoreBoardListenerSet;   // 8 onSnapshot listeners
}
```

**New state** added by this feature — a pending-teardown timer:

| State | Meaning | Entered from | Exits to |
|---|---|---|---|
| `active` | `connections.size > 0`; listeners attached | first `register()` for a board | `draining` (last connection unregisters) |
| `draining` | `connections.size === 0`; listeners still attached; 30s teardown timer running (FR-006) | `active`, on the transition to zero connections | `active` (a `register()` arrives within 30s — timer cancelled, listeners reused), `torn_down` (30s elapses with no new registration) |
| `torn_down` | Listeners unsubscribed, `BoardWatch` entry removed from the map | `draining`, once its 30s timer fires | `active` (a fresh `register()` starts a brand-new `BoardWatch`, as happens today) |

**Validation rule**: entering `draining` MUST NOT itself close, invalidate, or resend any
data to connections of *other* boards — the grace timer is keyed per-`retrospectiveId`
(Edge Case 4: other participants on the same board are unaffected regardless, since their
presence keeps `connections.size > 0`).

## 3. User Session

Concrete today as `Session`/`SessionData` (`server/src/domain/auth/Session.ts`) — **no
field changes**; this feature only starts *checking* a field that already exists.

| Field | Already exists? | Used by this feature how |
|---|---|---|
| `exp` (soft TTL, `iat + SESSION_SOFT_TTL_SECONDS`, 1h) | Yes | `Session.isActive(now)` (`now < exp && now < absExp`) becomes a required check on `requireSession()` and the WS upgrade path (US5 / FR-007) — previously only checked by `getCurrentSession`/`refreshSession` |
| `absExp` (absolute TTL, 30 days) | Yes | Unchanged — already cryptographically enforced by `JoseSessionAdapter.verify()` via the JWT's `exp` claim |

**New state surfaced to callers of `requireSession()`/the WS upgrade handler**:

| Outcome | Condition | Response |
|---|---|---|
| Accepted | `verify()` succeeds AND `isActive(now)` is true | proceeds as today |
| Rejected — needs refresh | `verify()` succeeds but `isActive(now)` is false (soft TTL elapsed, absolute TTL not) | Same shape as an invalid session today: `401` on REST, `CLOSE_UNAUTHENTICATED (4401)` on WS — recoverable by the client's existing `POST /api/auth/refresh` flow if a real user is present |
| Rejected — expired | `verify()` returns `null` (absolute TTL elapsed or signature invalid) | Unchanged from today |

No new entity, no new Firestore collection, no new cookie field.
