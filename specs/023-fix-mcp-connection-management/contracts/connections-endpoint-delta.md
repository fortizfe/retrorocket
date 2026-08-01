# Contract Delta: Connection Management Endpoints

This documents only what changes on top of the base contract established in `specs/015-mcp-read-server/contracts/oauth-endpoints.md` § "Connection management". All routes, auth requirements (session-cookie, not MCP access token), and error shape from that contract are unchanged and still apply.

## `GET /api/mcp/connections` *(unchanged auth: normal web session cookie)*

**Behavior change**: Connections whose `status` is `"revoked"` are no longer included in the response. This is the fix for the reported bug — previously all statuses were returned and the frontend rendered them regardless.

**Response `200`** (fields added: `origin`, `lastUsedAt`):

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
    },
    {
      "id": "...",
      "clientName": "Claude",
      "createdAt": "2026-07-29T08:00:00Z",
      "status": "active",
      "origin": "mobile",
      "lastUsedAt": null
    }
  ]
}
```

- `status` is now always `"pending"` or `"active"` — never `"revoked"`.
- `origin` is one of `"desktop" | "mobile" | "web" | "unknown"`. Connections created before this feature shipped report `"unknown"`.
- `lastUsedAt` is `null` until the connection has been used for at least one MCP tool call; an ISO 8601 timestamp thereafter.

## `DELETE /api/mcp/connections/:id` *(unchanged)*

No change to request, response, or idempotency behavior. Included here only to note explicitly: this endpoint already worked correctly (flips `status` to `"revoked"`, persists `revokedAt`) — the bug was entirely in how `GET /api/mcp/connections` reported connections afterward, not in the revoke path itself.

## `POST /api/mcp/authorize/decision` *(unchanged request/response shape)*

**Internal behavior change only** (not visible in the request/response bodies, which are unchanged from the base contract): on approval, the server now reads the `User-Agent` header already present on this HTTP request and classifies it into the `origin` category stored on the newly created (`pending`) `McpConnection`. No new request field is required or read from the JSON body; this is purely a server-side use of standard HTTP header metadata already available on the request.

## `POST /api/mcp` (MCP tool transport) *(unchanged request/response shape)*

**Internal behavior change only**: `mcpAuthMiddleware` now also updates the connection's `lastUsedAt` to the current time on every successful (i.e., token valid + connection active) request, immediately before invoking the tool handler. This has no visible effect on the tool-call request/response contract itself; it is only observable via `GET /api/mcp/connections`'s `lastUsedAt` field.
