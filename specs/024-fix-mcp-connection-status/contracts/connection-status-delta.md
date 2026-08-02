# Contract Delta: Connection Status & Token Exchange

This documents only what changes on top of the base contract in `specs/015-mcp-read-server/contracts/oauth-endpoints.md` and the delta already applied by `specs/023-fix-mcp-connection-management/contracts/connections-endpoint-delta.md`. All routes, auth requirements, and error envelope shape from those contracts are unchanged and still apply unless noted below.

## `GET /api/mcp/connections` *(unchanged auth: session cookie)*

**Behavior change**: Connections whose `status` is `"pending"` or `"failed"` are no longer included in the response, in addition to `"revoked"` (023). Only fully-completed, currently-active connections are returned.

**Response `200`** — `status` is now always the literal `"active"`:

```json
{
  "connections": [
    {
      "id": "...",
      "clientName": "Claude",
      "createdAt": "2026-07-20T10:00:00Z",
      "status": "active",
      "origin": "desktop",
      "lastUsedAt": "2026-07-30T09:15:00Z"
    }
  ]
}
```

- A connection that is still mid-authorization (fresh `"pending"`, within its 10-minute window) is **not** included — it will appear once (and only if) the token exchange completes.
- A connection whose authorization failed or was abandoned is never included, at any point in its lifecycle, before or after the internal `"failed"` transition happens.

## `POST /api/mcp/token` *(unchanged request/response shape on success)*

**Behavior change on failure** (`grant_type=authorization_code` only): the `error` response body's `message` still comes from `InvalidGrantError`, but the message text is now specific to which of four conditions triggered it, instead of the previous single generic string for all four:

| Condition | Previous message (all four identical) | New message |
|---|---|---|
| Code unknown, already consumed, or expired | "The grant is invalid, expired, or already used" | Distinguishes "unknown or already used" vs. "expired" |
| `client_id`/`redirect_uri` mismatch | (same) | States the mismatch explicitly |
| PKCE verifier mismatch | (same) | States the PKCE failure explicitly |
| Authorization was denied / has no associated connection | (same) | States there is no completed authorization to exchange |

The HTTP status code (`400`) and error `code` (`invalid_grant`) are **unchanged** — this is a `message`/log-detail change only, not a wire-protocol change; existing AI-client integrations parsing `error.code` are unaffected.

**New internal side effect** (not visible in the response body): on any of the four failure conditions above, if the failing attempt can be traced to a specific `McpConnection` record (i.e., the authorization request had already reached the consent-approval step and a `pending` connection exists), that connection is transitioned to `"failed"` server-side. This has no visible effect on this endpoint's contract; it is only observable via `GET /api/mcp/connections` no longer showing that attempt, ever.

## `GET /api/mcp/authorize`, `POST /api/mcp/authorize/decision`, DCR (`POST /api/mcp/register`) *(unchanged)*

No request/response contract change. Included here only to note explicitly: these endpoints' request/response shapes were reviewed as part of this feature's root-cause investigation (research.md §6) and found spec-conformant; no change is being made to them by this feature.
