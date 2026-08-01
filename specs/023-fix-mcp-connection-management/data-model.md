# Phase 1 Data Model: Fix MCP Connection Management

This feature does not introduce a new entity or Firestore collection — it adds two fields to the existing `McpConnection` entity (`mcpConnections/{connectionId}`, introduced in feature 015, see `specs/015-mcp-read-server/data-model.md`) and changes one use case's filtering behavior. Existing fields are shown for context; only `origin` and `lastUsedAt` are new.

## McpConnection (modified)

The authorized link between one user and one AI client — the entity the "Connected Apps" page lists and the user revokes.

| Field | Type | Notes |
|---|---|---|
| `id` | string (doc id) | Unchanged. |
| `uid` | string | Unchanged. |
| `clientId` | string | Unchanged. |
| `clientName` | string | Unchanged. |
| `status` | `"pending"` \| `"active"` \| `"revoked"` | Unchanged. Read live on every MCP tool request; flipped to `"revoked"` by `RevokeConnection`. **This feature's core fix**: `ListConnections` now excludes `"revoked"` before returning results (see below) — no schema change, a use-case-level filter. |
| `createdAt` | number (epoch seconds) | Unchanged. |
| `revokedAt` | number \| null | Unchanged. |
| `refreshTokenHash` | string \| null | Unchanged. |
| `origin` | `"desktop"` \| `"mobile"` \| `"web"` \| `"unknown"` | **NEW.** Set once, at creation (`McpConnection.createPending`), from the `User-Agent` header on the consent-decision request (`POST /api/mcp/authorize/decision`), classified by `domain/mcp/ConnectionOrigin.ts`. Immutable thereafter. Never derived from IP address or location (Clarification, spec.md). Existing connections created before this feature ships default to `"unknown"` (no backfill required — see spec.md Assumptions). |
| `lastUsedAt` | number (epoch seconds) \| null | **NEW.** `null` until the connection's first successful MCP tool call after activation; updated to the current time on every subsequent successful call, via `McpConnection.touched(nowSeconds)` inside `mcpAuthMiddleware.ts`. Not set for `pending` or freshly-`revoked` connections that were never used. |

Collection: `mcpConnections/{connectionId}` (unchanged).

**State transitions** (unchanged from feature 015): `pending` → `active` → `revoked` (terminal). `origin` is fixed at `pending` creation. `lastUsedAt` only advances while `status === "active"`; it is not touched or cleared by revocation (an already-revoked connection's last-used history is simply no longer visible once it's excluded from the list — see Assumptions in spec.md).

## McpConnection domain behavior (modified)

| Method | Change |
|---|---|
| `McpConnection.createPending(params)` | Gains a required `origin` param, stored as-is on the new record; `lastUsedAt` initialized to `null`. |
| `connection.touched(nowSeconds)` | **NEW.** Returns a new `McpConnection` with `lastUsedAt` set to `nowSeconds`. Only meaningful on an `active` connection; calling it is the caller's (`mcpAuthMiddleware.ts`'s) responsibility, gated on the same `isActive` check already performed there. |
| `connection.revoked(nowSeconds)` | Unchanged (idempotent; does not touch `origin`/`lastUsedAt`). |

## ConnectionSummary (application-layer DTO, `ListConnections.ts`) — modified

The shape returned by `listConnections` to the HTTP layer, and from there to the frontend.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unchanged. |
| `clientName` | string | Unchanged. |
| `createdAt` | number (epoch seconds) | Unchanged. |
| `status` | `"pending"` \| `"active"` | **Narrowed** — `"revoked"` connections are filtered out entirely before mapping, so this union no longer includes `"revoked"` in what's returned (fixes the reported bug). |
| `origin` | `"desktop"` \| `"mobile"` \| `"web"` \| `"unknown"` | **NEW**, passed through from `McpConnection.data.origin`. |
| `lastUsedAt` | number \| null | **NEW**, passed through from `McpConnection.data.lastUsedAt`. |

## Frontend `ConnectedApp` (`connectedAppsService.ts`) — modified

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unchanged. |
| `clientName` | string | Unchanged. |
| `createdAt` | string (ISO 8601) | Unchanged. |
| `status` | `"pending"` \| `"active"` | Narrowed, mirrors the backend DTO change above. |
| `origin` | `"desktop"` \| `"mobile"` \| `"web"` \| `"unknown"` | **NEW.** |
| `lastUsedAt` | string (ISO 8601) \| null | **NEW.** |

## Validation rules

- `origin` MUST be one of the four literal values; the classifier (`ConnectionOrigin.classify`) always returns one of them, defaulting to `"unknown"` for an absent or unrecognized `User-Agent` — it never throws.
- `lastUsedAt`, when non-null, MUST be `>= createdAt`.
- `ListConnections` MUST NOT return any `ConnectionSummary` whose underlying `McpConnection.data.status === "revoked"`.
