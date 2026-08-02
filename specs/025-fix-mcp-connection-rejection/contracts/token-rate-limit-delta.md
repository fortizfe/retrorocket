# Contract Delta: Token Endpoint Rate Limiting

This documents only what changes on top of the base contract in `specs/015-mcp-read-server/contracts/oauth-endpoints.md` and the deltas already applied by `specs/023-fix-mcp-connection-management/contracts/connections-endpoint-delta.md` and `specs/024-fix-mcp-connection-status/contracts/connection-status-delta.md`. All routes, request/response shapes, and error envelope shape from those contracts are unchanged and still apply unless noted below. **No wire-protocol change** — this delta is entirely about which requests receive a `429`, not about any request/response body.

## `POST /api/mcp/token` *(unchanged request/response shape on success and on `400 invalid_grant`)*

**Behavior change**: the criteria for receiving `429 { error: { code: "rate_limited" } } }` change from "this IP has made 60+ requests in 15 minutes" to "this **user** (resolved from the request's own `code` or `refresh_token`) has made 60+ requests in 15 minutes, OR this request's identity could not be resolved and this IP has made 60+ such unresolvable requests in 15 minutes."

Concretely:

| Scenario | Before | After |
|---|---|---|
| User A and User B both connect through the same AI client (same apparent IP) within 15 minutes, each well under 60 requests individually | User B's requests may be throttled by User A's activity (shared bucket) | Both succeed independently — never share a bucket |
| A single user retries excessively (60+ requests referencing their own valid/recent `code`/`refresh_token` in 15 minutes) | Throttled (IP-keyed) | Still throttled (now `uid`-keyed) — protection preserved |
| A request with an unknown/garbage/expired `code` or `refresh_token`, or an unsupported `grant_type` | Throttled by IP after 60 such requests in 15 minutes | Unchanged — still throttled by IP after 60 such requests in 15 minutes |

**New internal side effect** (not visible in the response body): every `429` response from this endpoint now also emits one `mcp.token.rate_limited` metric (`tags.keyType: "uid" | "ip"`, see data-model.md) through the server's existing observability port. This has no visible effect on this endpoint's contract; it is only observable via server-side metrics/log output.

**Unchanged**: the `400 invalid_grant` error paths and their per-branch messages (024) are untouched — this delta only concerns the `429` rate-limit path, which today happens *before* any of that logic runs.

## `POST /api/mcp` (tool transport) *(unchanged)*

No contract change. `toolLimiter`'s IP-keyed rate limiting is unchanged and out of scope for this feature (research.md §2) — included here only to note explicitly that it was considered and deliberately left as-is.

## `GET /api/mcp/authorize`, `POST /api/mcp/authorize/decision`, DCR (`POST /api/mcp/register`), `.well-known/*` *(unchanged)*

No request/response contract change; none of these routes carry a rate limiter today, and this feature does not add one.
