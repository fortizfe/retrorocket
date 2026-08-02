# Phase 1 Data Model: Fix MCP Connection Status Reporting and Reconnection Flow

This feature does not introduce a new entity or Firestore collection — it adds one field and one status value to the existing `McpConnection` entity (`mcpConnections/{connectionId}`, introduced in feature 015, extended by feature 023) and changes two use cases' behavior. Existing fields are shown for context; only `status`'s new value and `failedAt` are new.

## McpConnection (modified)

The authorized (or attempted) link between one user and one AI client.

| Field | Type | Notes |
|---|---|---|
| `id` | string (doc id) | Unchanged. |
| `uid` | string | Unchanged. |
| `clientId` | string | Unchanged. |
| `clientName` | string | Unchanged. |
| `status` | `"pending"` \| `"active"` \| `"revoked"` \| `"failed"` | **`"failed"` is new** (Clarifications, Session 2026-08-02). Terminal, like `"revoked"` — reached only from `"pending"`, never from `"active"` (an attempt that already succeeded is not retroactively "failed" by this feature; only revocation can end an active connection). Reached via explicit signal (an `InvalidGrantError` during token exchange, data-model §"State transitions" below) or via timeout (a `"pending"` connection whose authorization code has definitively expired). `ListConnections` now excludes `"failed"` from its result, the same way it already excludes `"revoked"`. |
| `createdAt` | number (epoch seconds) | Unchanged. Used to detect timeout-based expiry: a `"pending"` connection is expired once `now - createdAt > MCP_AUTHORIZATION_REQUEST_TTL_SECONDS`. |
| `revokedAt` | number \| null | Unchanged. |
| `failedAt` | number \| null | **NEW.** `null` unless `status === "failed"`; set to the time the transition occurred (either the explicit-signal moment in `ExchangeMcpToken`, or the moment `ListConnections` lazily detects the timeout). Existing connections created before this feature ships default to `null` via the same backfill pattern already used for `origin`/`lastUsedAt` (`hydrateConnectionData`, fe0db0f) — never left `undefined`. |
| `refreshTokenHash` | string \| null | Unchanged. |
| `origin` | `"desktop"` \| `"mobile"` \| `"web"` \| `"unknown"` | Unchanged (023). |
| `lastUsedAt` | number (epoch seconds) \| null | Unchanged (023). |

Collection: `mcpConnections/{connectionId}` (unchanged).

**State transitions** (extends feature 015/023's `pending → active → revoked`):

```
pending ──(token exchange succeeds)──▶ active ──(user revokes)──▶ revoked
   │                                                                  ▲
   │                                                                  │
   └──(explicit InvalidGrantError, §ExchangeMcpToken)──▶ failed        │
   └──(timeout: code TTL elapsed, §ListConnections)────▶ failed        │
                                                                       │
                                            active ──(user revokes)───┘ (unchanged, terminal)
```

- `failed` and `revoked` are both terminal — neither transitions anywhere else. `McpConnection.failed(nowSeconds)` is idempotent and safe to call from any status: only a currently-`"pending"` connection actually transitions; any other status (`"active"`, `"revoked"`, already-`"failed"`) is returned unchanged, mirroring the existing `.revoked()` method's idempotency (`McpConnection.ts:71-74`).
- An `"active"` connection can never become `"failed"` — this feature only marks failure on attempts that never successfully completed the token exchange. A connection that already reached `"active"` is by definition a completed, working attempt; its only further transition remains revocation.

## McpConnection domain behavior (modified)

| Method | Change |
|---|---|
| `McpConnection.failed(nowSeconds)` | **NEW.** `pending → failed`, setting `failedAt`. No-op (returns `this` unchanged) for any other current status — same idempotent shape as `.revoked(nowSeconds)`. |
| `connection.activated(refreshTokenHash)` | Unchanged — still only valid from `"pending"`; throws `InvalidConnectionTransitionError` otherwise (this already prevents a `"failed"` connection from ever being activated after the fact, with no additional guard needed). |
| `connection.revoked(nowSeconds)` | Unchanged. |
| `connection.touched(nowSeconds)` | Unchanged (023). |

## ConnectionSummary (application-layer DTO, `ListConnections.ts`) — modified

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unchanged. |
| `clientName` | string | Unchanged. |
| `createdAt` | number (epoch seconds) | Unchanged. |
| `status` | `"active"` | **Narrowed** from `"pending" \| "active"` — since the list now excludes everything except `"active"` (superset fix covering `"pending"`, `"failed"`, and the already-excluded `"revoked"`), this union collapses to a single literal. |
| `origin` | `"desktop"` \| `"mobile"` \| `"web"` \| `"unknown"` | Unchanged (023). |
| `lastUsedAt` | number \| null | Unchanged (023). |

## Frontend `ConnectedApp` (`connectedAppsService.ts`) — modified

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unchanged. |
| `clientName` | string | Unchanged. |
| `createdAt` | string (ISO 8601) | Unchanged. |
| `status` | `"active"` | Narrowed, mirrors the backend DTO change above. A defensive filter in `fetchConnectedApps()` drops any entry whose `status` is not `"active"` before this type is ever constructed, independent of what the backend returns (research.md §5). |
| `origin` | `"desktop"` \| `"mobile"` \| `"web"` \| `"unknown"` | Unchanged (023). |
| `lastUsedAt` | string (ISO 8601) \| null | Unchanged (023). |

## Validation rules

- `ListConnections` MUST NOT return any `ConnectionSummary` whose underlying `McpConnection.data.status` is anything other than `"active"`.
- `failedAt`, when non-null, MUST be `>= createdAt`.
- A connection's `status` MUST NOT transition from `"failed"` or `"revoked"` back to `"pending"` or `"active"` by any code path — both are terminal (unchanged principle from 023's revocation Clarification, now extended to `"failed"`).
- `McpConnection.failed(nowSeconds)` MUST only mutate a connection currently in `"pending"`; calling it on `"active"`, `"revoked"`, or already-`"failed"` MUST be a safe no-op, never an error and never a state change.
