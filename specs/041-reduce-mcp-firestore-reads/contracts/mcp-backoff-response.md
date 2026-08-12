# Contract: MCP Authorization Backoff Response (Story 1, FR-002)

This is the one genuinely new externally-observable behavior in this feature (`FR-007` forbids any change to *successful* MCP tool response shapes; this is the shape of the new rejection a client sees once it is backed off). Everything else in this feature is an internal efficiency change with no new wire contract.

## When it applies

A request to `POST /api/mcp` or `POST /api/mcp/token` from a key (per research.md §2: `client_id` when resolvable, else origin IP) that has already accumulated 5 failed authorization attempts within the current 30-second window (a fixed window, reset exactly 30s after the first failure in it — research.md §2's "Window algorithm").

## Response

| Field | Value |
|---|---|
| HTTP status | `429 Too Many Requests` — consistent with this connector's existing rate-limit responses (`tokenLimiter`/`toolLimiter` in `mcp.ts`), not `401`, since the reason for rejection is "too many recent failures," not "this specific credential is invalid" |
| Body | `{ "error": { "code": "auth_backoff", "message": "Too many failed authorization attempts — please wait before retrying." }, "correlationId": "<uuid>" }` — same envelope shape (`error.code`, `error.message`, `correlationId`) already used by every other error response in this connector (`unauthorized()` in `mcpAuth.ts`, the rate-limit handlers in `mcp.ts`) |
| `Retry-After` header | Seconds remaining until the 30s backoff window for this key clears, integer, e.g. `Retry-After: 17` — mirrors the `standardHeaders: 'draft-7'` convention already applied to `tokenLimiter`/`toolLimiter` |

## Distinguishing from existing responses

| Situation | Status | `error.code` |
|---|---|---|
| No/malformed Bearer token, or a token that fails JWT verification | `401` | `unauthorized` (unchanged) |
| Verified token, but connection revoked/inactive/uid-mismatched | `401` | `unauthorized` (unchanged) |
| `toolLimiter`/`tokenLimiter` volume threshold exceeded (a request that *did* attempt real work) | `429` | `rate_limited` (unchanged) |
| **New**: key has ≥5 failed authorization attempts in the trailing 30s | `429` | **`auth_backoff`** (new) |

A backed-off request never reaches token verification or any Firestore read — it is rejected at the top of `mcpAuthMiddleware` (or, for `/api/mcp/token`, at the top of the token-exchange handler) purely from the in-memory counter (data-model.md's Failed-Authorization Attempt Counter).

## Client-facing behavior expectation

An MCP client encountering `auth_backoff` should treat it exactly like a standard `429`: honor `Retry-After` and back off before retrying, the same as it already should for `rate_limited`. No new client-side handling contract is introduced beyond standard HTTP 429 semantics — this is deliberate (research.md §2's alternatives), so no MCP client needs code changes to behave correctly against this response.
