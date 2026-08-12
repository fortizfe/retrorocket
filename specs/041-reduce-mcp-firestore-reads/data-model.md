# Data Model: Reduce Firestore Read Load from the MCP Connector

No changes to Firestore document shapes (`mcpConnections`, `retrospectives`, `cards`, `groups`, `sentimentResults`, `actionItems`, `facilitatorNotes`, `participants`), no new user-visible entities, and no database migration — this feature only adds internal, per-instance in-memory state. The three Key Entities named in `spec.md` map to concrete structures as follows.

## MCP Connection Authorization State (Story 1, FR-001)

Backed by a per-instance `InMemoryTtlCache<string, McpConnection>` (feature 040's existing generic — `server/src/adapters/cache/InMemoryTtlCache.ts`), living inside `mcpAuthMiddleware.ts`'s closure/deps, not Firestore.

| Field | Type | Notes |
|---|---|---|
| Key | `string` | `connectionId` (`claims.connectionId` from the verified JWT) |
| Value | `McpConnection` | The exact domain object already returned by `McpConnectionStorePort.getConnectionById()` today — no change to `McpConnection`'s own shape |
| TTL | `10_000` ms | Upper bound of the 5-10s window agreed in Clarifications (research.md §1) |

**Lifecycle**: populated on a cache miss (first authorized call for a `connectionId` on this instance, or ≥10s since the last one); served on a cache hit without a `getConnectionById` read or a `touched(now)`/`saveConnection` write. Explicitly evicted (not left to expire) by `RevokeConnection.ts` at the moment a connection is revoked, so a revoke issued through this same backend instance is enforced on the very next call regardless of the TTL — the accepted 5-10s staleness bound applies only to the residual case of a cache entry populated on this instance before a revoke processed through it.

## Failed-Authorization Attempt Counter (Story 1, FR-002)

A per-instance keyed counter (implementation detail: `InMemoryTtlCache<string, { count: number; windowStart: number }>` or an equivalent small structure — decided at `/speckit-tasks`), living inside `mcpAuthMiddleware.ts`.

| Field | Type | Notes |
|---|---|---|
| Key | `string` | `client_id:{clientId}` when resolvable from the request (research.md §2), else `ip:{originIp}` |
| `count` | `number` | Failed attempts observed within the current 30s window |
| Window | `30_000` ms, fixed | Starts at the first failure for a key and resets to 0 exactly 30s later, regardless of when later failures within it landed — a fixed window, not a true sliding one (research.md §2's "Window algorithm") |
| Backoff duration | `30_000` ms | Once `count` reaches 5 within the window, further attempts from that key are rejected immediately for 30s (Clarifications) |

**Lifecycle**: incremented on every failed authorization outcome (missing/invalid/expired token, or a structurally-valid token whose connection is inactive/mismatched); reset when the 30s window elapses without reaching the threshold; once the threshold is reached, the key enters a 30s backoff state during which incoming attempts are rejected without attempting token verification or any Firestore read, then the counter resets.

## MCP Tool Call Identity (Story 1, FR-003)

Not a new stored entity — `toolLimiter`'s existing `express-rate-limit` in-memory store (unchanged mechanism), re-keyed. The key changes from the default IP-based key to the authenticated uid already resolved by `mcpAuthMiddleware` (`res.locals.mcpAuth.sub`), which requires `mcpAuthMiddleware` to run before `toolLimiter` on the `/api/mcp` route (research.md §3). The existing 120 requests/minute threshold is unchanged.

## Retrospective Detail/Summary Result Cache (Story 3, FR-008)

Two per-instance caches (detail and summary have different output shapes), each `InMemoryTtlCache<string, T>`, living inside `FirestoreRetrospectiveReadAdapter.ts` (or a thin decorator around it — decided at `/speckit-tasks`).

| Field | Type | Notes |
|---|---|---|
| Key | `string` | `retrospectiveId` — **not** requester-scoped (research.md §6) |
| Value (detail) | `Omit<RetrospectiveDetailOutput, 'facilitatorNotes'>` | The requester-independent part: `retrospective`, `cards`, `groups`, `participants`, `sentiment`, `actionItems` |
| Value (summary) | `Omit<RetrospectiveSummaryOutput, 'facilitatorNotes'>` | Same principle, summary's own shape |
| TTL | `15_000` ms | Upper bound of the 5-15s window agreed in Clarifications |

**Lifecycle**: populated on a cache miss for a `retrospectiveId` (first call, or ≥15s since the last one); on a cache hit, the requester-independent fields are served from cache while the access check (`hasRetrospectiveAccess`) and `facilitatorNotes` (`canIncludeFacilitatorNotes` + `listFacilitatorNotes`, when applicable) are still evaluated live for the current caller on every call, then merged into the response. No explicit invalidation path exists (unlike §1's connection cache) — data-mutating operations on retrospective content happen through the main app's own write paths (board UI), which are entirely outside the MCP connector and have no hook into this cache; staleness is bounded purely by the 15s TTL, which Clarifications already accepted as the freshness guarantee for these two tools.

## Unchanged: `RetrospectiveReadPort.listSentimentResults` signature (Story 2, FR-004)

Not new state, but a contract change worth recording here since it affects every caller: `listSentimentResults(retrospectiveId: string)` becomes `listSentimentResults(cardIds: string[])`. `FirestoreRetrospectiveReadAdapter`'s implementation is unchanged in behavior (still a chunked-at-30 `'in'` query against `sentimentResults`) — only its input no longer requires an internal `listCards` call to derive `cardIds`, since every caller already has them.
