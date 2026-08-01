# Phase 0 Research: Fix MCP Connection Management

No items in Technical Context were left as `NEEDS CLARIFICATION` — the spec's own `/speckit-clarify` session already resolved the two scope-impacting product decisions (origin-label data source, exact last-used timestamp). What remains here is the small set of implementation-strategy decisions needed to turn those decisions into a plan, gathered by reading the existing MCP connector code (feature 015/021).

## 1. Root cause of the reported "revoke doesn't stick" bug

**Decision**: The bug is entirely in `listConnections` (`server/src/application/use-cases/mcp/ListConnections.ts`): it maps every connection returned by `connectionStore.listConnectionsForUser(uid)` regardless of `status`, including `revoked` ones. `ConnectedAppsCard.tsx` renders whatever the list contains and never inspects `status`. The fix is to filter to `pending`/`active` before mapping.

**Rationale**: `mcpAuthMiddleware.ts` already performs a live Firestore read of connection status before allowing any tool call through (`connection.isActive` check, feature-015 Clarification Q1) — so actual data access was never at risk. This is a *display* bug, not an access-control bug, which keeps the fix small and low-risk.

**Alternatives considered**: Filtering at the Firestore query level (`where('status', 'in', ['pending', 'active'])` in `FirestoreMcpConnectionAdapter.listConnectionsForUser`) — rejected because (a) it would require a composite index for a query this codebase doesn't currently need, (b) it conflates a storage-adapter method with a presentation-layer business rule ("what counts as active-for-display" belongs in the use case, not the adapter — SOLID/Single Responsibility, Constitution IV), and (c) the same adapter method might reasonably be reused later for a case that does want all statuses (e.g. `revokeConnection`'s ownership check already calls `getConnectionById`, not this list method, so no such conflict exists today, but keeping the adapter dumb keeps that option open at zero cost).

## 2. Data source for the per-connection origin label

**Decision**: Classify the connection's origin from the `User-Agent` header present on `POST /api/mcp/authorize/decision` (the consent-decision request — made by the browser/webview rendering RetroRocket's own consent screen at the moment the user approves the connection). Only the *classified category* (`'desktop' | 'mobile' | 'web' | 'unknown'`) is persisted — never the raw User-Agent string, and never an IP address or derived location, per the `/speckit-clarify` decision (2026-07-27 — recorded in spec.md `## Clarifications`). Classification is a small pure function (`domain/mcp/ConnectionOrigin.ts`) taking a `string | undefined` and returning the category, so it has zero framework dependencies (satisfies `domain-isolation.test.ts`) and is unit-testable with plain string fixtures.

**Rationale**: This is the only signal already flowing through the existing OAuth/consent hand-off without requiring any AI client (Claude or otherwise) to change what it sends. It directly reflects "what the user was using at the moment they clicked Allow," which is exactly the distinguishing detail Story 2 needs (Claude Desktop's embedded browser vs. Claude mobile's vs. a plain browser tab typically carry recognizably different `User-Agent` strings — e.g. presence of a "Mobile" token, a known desktop-app/Electron marker, or neither).

**Alternatives considered**:
- *Client-declared device name* (a new field the AI client would send during DCR/authorize) — rejected: no MCP client integration RetroRocket talks to today sends any such hint, so this would produce "unknown" for 100% of real traffic until every client integrator adopted a new, RetroRocket-specific parameter outside their control.
- *IP-based geolocation* — explicitly rejected by the clarification session (privacy/data-minimization).
- *Displaying the raw User-Agent string* — rejected: unreadable to end users ("Mozilla/5.0 (Macintosh...)" is not a distinguishing label), and retains more identifying data than the feature needs.

## 3. Where/when the origin label is captured

**Decision**: Read `req.header('user-agent')` in the `POST /api/mcp/authorize/decision` route handler (`server/src/http/routes/mcp.ts`), classify it, and pass the resulting category into `decideMcpAuthorization`'s input so `McpConnection.createPending(...)` can store it at creation time. The field is immutable thereafter (an origin doesn't change mid-connection-lifetime).

**Rationale**: This is the one point in the whole OAuth flow where a human's browser (not the AI client's backend token-exchange call) makes the request — the token exchange (`POST /api/mcp/token`) is a server-to-server call from the AI client's backend and its `User-Agent` reflects the client's HTTP library, not the human's device.

## 4. Last-used timestamp: where and how it's updated

**Decision**: Add `lastUsedAt: number | null` to `McpConnectionData` (epoch seconds; `null` until the connection's first tool call after activation). Update it synchronously inside `mcpAuthMiddleware.ts`, immediately after the existing live `connection.isActive` check succeeds and before calling `next()`, via a new `McpConnection.touched(nowSeconds)` transition + the existing `connectionStore.saveConnection(...)`.

**Rationale**: `mcpAuthMiddleware.ts` already does a live Firestore *read* of the connection on every tool call (feature-015 Clarification Q1) — adding one *write* alongside it, gated on the same already-authenticated, already-fetched connection object, is the smallest possible change and needs no new port method beyond what `McpConnectionStorePort` already exposes (`saveConnection`).

**Alternatives considered**:
- *Fire-and-forget (unawaited) write* to shave a few ms off response latency — rejected for this iteration: MCP tool-call volume per user is low (personal retrospective-reading assistant use, not a high-throughput API), so the correctness/simplicity of a synchronous await (Constitution V, KISS) outweighs the marginal latency cost, and an unawaited write risks silently swallowing a Firestore error.
- *Relative/bucketed freshness ("used today", "over 30 days ago") instead of an exact timestamp* — rejected: the `/speckit-clarify` session explicitly chose the exact-timestamp option.

## 5. Frontend surface changes

**Decision**: Extend the existing `ConnectedApp` type (`connectedAppsService.ts`) with `origin: 'desktop' | 'mobile' | 'web' | 'unknown'` and `lastUsedAt: string | null` (ISO 8601, mirroring the existing `createdAt` convention), returned by `GET /api/mcp/connections`. `ConnectedAppsCard.tsx` renders a short icon+text origin label next to the existing "Connected on {{date}}" line, plus a "Last used {{date}}" line (or an "never used yet" copy when `lastUsedAt` is `null`, e.g. immediately after authorization before the first tool call) — no new component needed, this extends the existing card/list/action pattern already used for `LinkedProvidersCard`.

**Rationale**: Matches the "modeled directly on LinkedProvidersCard" precedent already documented in `ConnectedAppsCard.tsx`'s file comment; keeps this a data/copy change to an existing component rather than a new one (Constitution V, Library-First doesn't apply — this isn't a new independent capability, just richer display of existing data).

**Alternatives considered**: A separate "connection detail" expandable/modal view — rejected as over-engineering for two extra lines of text (YAGNI).

## 6. Accessibility & i18n

**Decision**: The origin label is always paired with text (e.g. an icon *and* the word "Desktop"/"Mobile"/"Web"), never conveyed by icon or color alone (WCAG 2.1 AA, Constitution VIII, "no information conveyed by color alone"). All new copy (origin labels, "last used" phrasing, "never used yet") is added as new `i18next` keys under `mcpConnector.connectedApps.*` in both `en.json` and `es.json` (Constitution's i18n Additional Standard) — no hardcoded strings.

**Rationale**: Directly follows the existing pattern already used for every other string in this card (`t('mcpConnector.connectedApps.connectedOn', ...)` etc.).
