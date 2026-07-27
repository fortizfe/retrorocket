# Phase 1 Data Model: Remote Read-Only MCP Server for Retrospective Reporting

## New entities (this feature)

### McpClientRegistration

A record of an AI client that self-registered via Dynamic Client Registration. Not user-specific — one row per distinct client application.

| Field | Type | Notes |
|---|---|---|
| `clientId` | string (doc id) | Generated on registration; opaque. |
| `clientName` | string | From the DCR request (`client_name`); shown to the user on the consent screen and in their Connected Apps list. |
| `redirectUris` | string[] | Registered redirect URIs; the authorize step MUST reject any `redirect_uri` not in this list. |
| `tokenEndpointAuthMethod` | `"none"` | Public client (PKCE); no client secret is issued or stored, since MCP clients are typically installed apps/browser-based, not confidential clients. |
| `createdAt` | timestamp | |

Collection: `mcpClients/{clientId}`.

### McpAuthorizationCode

A short-lived, single-use code issued after the user completes login + consent, exchanged for an access token. Deleted (or marked consumed) immediately on exchange.

| Field | Type | Notes |
|---|---|---|
| `code` | string (doc id) | Random, high-entropy. |
| `clientId` | string | FK → `mcpClients`. |
| `uid` | string | The authorizing RetroRocket user (Firebase Auth uid). |
| `redirectUri` | string | Must match the `authorize` request exactly at exchange time. |
| `codeChallenge` | string | PKCE (`S256`). |
| `connectionId` | string | The `mcpConnections` doc this exchange will activate (created at consent time in `pending` status, flipped to `active` on successful exchange). |
| `expiresAt` | timestamp | Short TTL (e.g. minutes); expired/consumed codes are rejected. |
| `consumedAt` | timestamp \| null | Set on first (and only) use; a second exchange attempt MUST fail. |

Collection: `mcpAuthorizationCodes/{code}`.

### McpConnection

The authorized link between one user and one AI client — the entity the "Connected Apps" page lists and the user revokes. This is the record checked live on every MCP request (Clarification Q1).

| Field | Type | Notes |
|---|---|---|
| `id` | string (doc id) | `connectionId`, embedded in issued access tokens. |
| `uid` | string | Owning RetroRocket user. |
| `clientId` | string | FK → `mcpClients`. |
| `clientName` | string | Denormalized copy of `mcpClients.clientName` at authorization time, so revocation/listing never needs a join and keeps working even if the client later re-registers. |
| `status` | `"active"` \| `"revoked"` | Read live on every MCP request; flipped to `"revoked"` by `RevokeConnection`. |
| `createdAt` | timestamp | Shown in the Connected Apps list (FR-003). |
| `revokedAt` | timestamp \| null | Set when revoked. |
| `refreshTokenHash` | string \| null | Hash (not raw value) of the current refresh token, if refresh is supported; rotated on use. |

Collection: `mcpConnections/{connectionId}`.

**State transitions**: `pending` (created at consent, before code exchange) → `active` (on successful token exchange) → `revoked` (terminal; reconnecting requires a brand-new `McpConnection`, per spec Acceptance Scenario US1.5). There is no path back from `revoked` to `active`.

## Read-only projections of existing entities (no schema change)

These are read as-is from their existing collections via the new `FirestoreRetrospectiveReadAdapter`; this feature adds no new fields to them. Listed here only to fix the shape returned by the MCP tools.

- **Retrospective** (`retrospectives/{id}`): `id`, `title`, `description?`, `createdBy` (= facilitator uid), `createdAt`, `updatedAt`, `participantCount`, `isActive`.
- **Card** (`retrospectives/{id}/cards/{cardId}` or `cards/{cardId}` per existing schema): `id`, `content`, `column`, `createdBy`, `createdAt`, `votes?`, `likes?`, `reactions?`.
- **CardGroup**: grouping/column assignment metadata already modeled alongside cards; surfaced as-is.
- **Reaction / Like**: `emoji`/type, count or per-user records, attached to a card or group.
- **Participant** (`participants/{id}`): `id`, `name`, `userId`, `retrospectiveId`, `joinedAt`, `photoURL?`.
- **SentimentResult** (`sentimentResults/{id}`): `sentiment`, `confidence`, `cardId`, `timestamp`, `modelId?`. Only cards with a result include one (per spec Edge Case).
- **ActionItem** (`actionItems/{id}`): `id`, `content`, `retrospectiveId`, `createdBy`, `assignedTo?`, `assignedToName?`, `dueDate?`, `order?`.
- **FacilitatorNote** (`facilitatorNotes/{id}`): `id`, `content`, `retrospectiveId`, `facilitatorId`, `timestamp`. Included in a response only when `requesterUid === retrospective.createdBy` (`FacilitatorAccess.canIncludeFacilitatorNotes`).

## Derived entity

### RetrospectiveSummary

Not persisted — computed on demand by `GetRetrospectiveSummary` from the entities above, for the `get_retrospective_summary` MCP tool (User Story 5).

| Field | Type | Notes |
|---|---|---|
| `retrospective` | `{ id, title, createdAt }` | Identifying header info. |
| `groupedFeedback` | array of `{ groupOrColumn, cardCount, cards: [{ content, reactionCount }] }` | Cards organized by their column/group. |
| `standoutItems` | array of `{ cardId, content, reactionCount }` | Top-N by like/reaction count. |
| `sentimentBreakdown` | `{ positive, neutral, negative, unanalyzed }` counts | Omitted/zeroed when no sentiment results exist. |
| `actionItems` | array of `{ content, assignedToName?, dueDate? }` | As recorded. |
| `facilitatorNotes` | string[] \| omitted | Present only per `FacilitatorAccess` (User Story 4). |

## Access-control relationships (enforced in the application layer, not by `firestore.rules`)

- A `McpConnection` grants its `uid` access to exactly the retrospectives where `retrospective.createdBy == uid` OR a `Participant` exists with `participant.retrospectiveId == retrospective.id AND participant.userId == uid` — this is the "all-or-nothing, account-scoped" grant from Clarification Q2, re-evaluated live on every list/detail/summary call (so newly created/joined retrospectives are included automatically).
- Facilitator notes are included in a detail/summary response only when `retrospective.createdBy == uid` for the requesting connection's `uid`.
