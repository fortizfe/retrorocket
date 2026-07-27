# Contract: MCP Authorization HTTP Endpoints

All routes are mounted on the existing backend, same-origin under `/api/mcp/*` (and two `/.well-known/*` discovery routes at the app root, per OAuth/MCP spec convention). All are new in this feature; none replace existing `/api/auth/*` routes, which are reused internally for the underlying sign-in step.

## Discovery

### `GET /.well-known/oauth-protected-resource`
Returns metadata pointing MCP clients at this server's authorization server, per the MCP Authorization spec's resource-metadata discovery step.

### `GET /.well-known/oauth-authorization-server`
Standard RFC 8414 metadata: `issuer`, `authorization_endpoint`, `token_endpoint`, `registration_endpoint`, `code_challenge_methods_supported: ["S256"]`, `grant_types_supported: ["authorization_code", "refresh_token"]`.

## Dynamic Client Registration

### `POST /api/mcp/register`
Request body (subset of RFC 7591 relevant fields):
```json
{ "client_name": "Claude", "redirect_uris": ["https://claude.ai/api/mcp/callback"] }
```
Response `201`:
```json
{ "client_id": "generated-id", "client_name": "Claude", "redirect_uris": ["..."], "token_endpoint_auth_method": "none" }
```
No `client_secret` is issued (public client, PKCE-only, per Research §2).

## Authorization

### `GET /api/mcp/authorize?client_id&redirect_uri&code_challenge&code_challenge_method=S256&state`
- If the browser has no valid RetroRocket session, redirects into the existing `/api/auth/login/:provider` flow first (`returnTo` = back to this `authorize` URL with its original query preserved).
- Once signed in, renders the consent screen (`clientName`, "Allow RetroRocket data access to <client>?").
- On approval: creates an `McpConnection` (`status: "pending"`) and an `McpAuthorizationCode`, then redirects to `redirect_uri?code=...&state=...`.
- On denial, or an unknown/mismatched `client_id`/`redirect_uri`: redirects with `?error=access_denied` (or `invalid_request`) — no code or connection is created.

## Token exchange

### `POST /api/mcp/token`
```json
{ "grant_type": "authorization_code", "code": "...", "redirect_uri": "...", "client_id": "...", "code_verifier": "..." }
```
- Validates the code (unconsumed, unexpired, `redirect_uri`/`client_id`/PKCE match), marks it consumed, flips the `McpConnection` to `active`.
- Response `200`:
```json
{ "access_token": "<jwt>", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "<opaque>" }
```
- Also supports `grant_type: "refresh_token"` to mint a fresh access token for a still-`active` connection (rotating the stored `refreshTokenHash`); an already-`revoked` connection's refresh attempt fails with `invalid_grant`.

## Connection management (used by the RetroRocket web app itself, not by the AI client)

### `GET /api/mcp/connections` *(requires the normal web session cookie, not an MCP access token)*
```json
{ "connections": [ { "id": "...", "clientName": "Claude", "createdAt": "2026-07-20T10:00:00Z", "status": "active" } ] }
```

### `DELETE /api/mcp/connections/:id` *(requires the normal web session cookie; `:id` must belong to the caller)*
- Flips `status` to `"revoked"`, sets `revokedAt`. Idempotent (revoking an already-revoked connection is `204`, not an error).
- Response `204`.

## Error shape (all endpoints above)

Matches the existing backend's structured error convention (`errorHandler.ts`):
```json
{ "error": { "code": "invalid_grant", "message": "..." }, "correlationId": "..." }
```
