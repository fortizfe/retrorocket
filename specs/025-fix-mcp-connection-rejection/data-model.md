# Phase 1 Data Model: Fix MCP Connections Always Resolving as Rejected

This feature introduces **no new entity, Firestore field, or status value**. `McpConnection` and `McpAuthorizationCodeRecord` (both introduced in 015, extended in 023/024) are unchanged. The fix reads `uid` off two existing fields via two existing, already-used, non-mutating port methods — it does not add persistence.

## Existing entities used (read-only, unchanged shape)

### McpAuthorizationCodeRecord (unchanged — `mcpAuthorizationCodes/{code}`)

Read via the existing `McpConnectionStorePort.getAuthorizationRequest(code)`. Relevant field for this feature:

| Field | Type | Used for |
|---|---|---|
| `uid` | string | Resolves the rate-limit bucket key for an `authorization_code` grant request, before (and independently of) the consuming read `exchangeMcpToken` performs moments later via `consumeAuthorizationCode`. |

No new read pattern: `ExchangeMcpToken.ts`'s existing failure path (024, `markConnectionFailed`) already calls `getAuthorizationRequest` in some branches; this feature adds one more, earlier, always-executed non-consuming read of the same record, at the rate-limiter layer.

### McpConnection (unchanged — `mcpConnections/{connectionId}`)

Read via the existing `McpConnectionStorePort.getConnectionByRefreshTokenHash(hash)`. Relevant field for this feature:

| Field | Type | Used for |
|---|---|---|
| `data.uid` | string | Resolves the rate-limit bucket key for a `refresh_token` grant request. |

No new read pattern: `ExchangeMcpToken.ts`'s `refresh_token` branch already performs this exact lookup with this exact hash function; this feature adds one more, earlier read of the same record, at the rate-limiter layer.

## New concept (in-memory only, not persisted): rate-limit bucket key

Not an entity — a value computed per-request by the new key resolver and handed to `express-rate-limit`, which owns its own in-memory bucket store (unchanged, existing dependency). Two shapes:

| Key shape | When | Meaning |
|---|---|---|
| `mcp-uid:<uid>` | The request's `code` or `refresh_token` resolves to a known record | One bucket per real RetroRocket user; two different users never share a bucket regardless of calling IP. |
| `ip:<address>` | Neither resolves (unknown/garbage/malformed `code`/`refresh_token`, or `grant_type` other than the two supported) | Falls back to today's behavior — `express-rate-limit`'s IPv6-safe `ipKeyGenerator(req.ip)`, unchanged. |

This mirrors the existing `sessionAwareKeyGenerator` (`rateLimiting.ts:27-37`) precedent (`session:<sub>` vs. `ip:<address>`), applied to identity resolved from the request body instead of a session cookie.

## New concept (emitted, not persisted): rate-limit rejection metric

Not a domain entity — a structured event emitted through the existing `MetricsPort.increment` (`server/src/application/ports/observability/index.ts`), written to stdout by the existing `StdoutMetrics` adapter (`server/src/adapters/observability/stdout.ts`), the same sink every other request/error event in this codebase already uses.

| Field | Value | Notes |
|---|---|---|
| `name` | `"mcp.token.rate_limited"` | Emitted once per `429` response from `tokenLimiter`. |
| `tags.keyType` | `"uid"` \| `"ip"` | Whether the rejected request's bucket key resolved to a real user (`uid`, expected under heavy legitimate retry activity) or fell back to IP (`ip`, the class of problem this feature fixes — expected to be rare/garbage-only after this ships). |

No schema/index/collection implication — this is a log line, not a database write.

## Explicitly unchanged

- `McpConnectionStatus` (`'pending' | 'active' | 'revoked' | 'failed'`, 024) — no new value.
- `McpConnection`'s state-transition diagram (024, data-model.md) — no new transition.
- `toolLimiter`'s key strategy (`req.ip`, unchanged) — out of scope, see research.md §2.
