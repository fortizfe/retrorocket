# Phase 0 Research: Remote Read-Only MCP Server for Retrospective Reporting

All items from the Technical Context are resolved below; there are no remaining `NEEDS CLARIFICATION` markers.

## 1. MCP transport for a stateless serverless backend

**Decision**: Use the MCP TypeScript SDK's **Streamable HTTP** server transport, mounted as a single Express route (`POST /api/mcp`, with the SDK handling `GET` for server-initiated streaming when needed), reusing the same `/api` Vercel function the rest of the backend already runs in.

**Rationale**: Streamable HTTP is the current MCP transport for remote servers and is designed around ordinary request/response HTTP semantics (a client POSTs a JSON-RPC message and gets a response, optionally upgraded to an SSE stream for that single exchange) — this maps directly onto a Vercel Node.js serverless function invocation, including one that streams, per the platform's current Fluid Compute model. No persistent, long-lived socket is required between calls.

**Alternatives considered**:
- *stdio transport* — not applicable; that's for local/subprocess MCP servers, not a remote connector.
- *Legacy dual-endpoint HTTP+SSE transport* (the pre-2025-03 MCP transport) — superseded by Streamable HTTP in the current spec, and its long-lived, session-pinned SSE stream is a worse fit for independently-invoked serverless functions than Streamable HTTP's per-request model.

## 2. Authorization pattern for "any RetroRocket user, any MCP client"

**Decision**: Implement the MCP Authorization spec's expected pattern: OAuth 2.1 Authorization Code flow with PKCE, fronted by **Dynamic Client Registration (DCR)** and standard metadata discovery (`/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`). RetroRocket's backend acts as the Authorization Server; the underlying identity check is the same Google/GitHub-via-Firebase-Auth login the app already has (feature 014's `StartOAuthLogin`/`CompleteOAuthLogin` use-cases), reused as-is for the "prove you're signed in" step before consent.

**Rationale**: The spec requires this to work for "any user... any AI client (like Claude)", not one pre-registered app. MCP clients (Claude included) are built to discover an MCP server's OAuth metadata and self-register via DCR; supporting anything less standard would mean every new client integration needs bespoke, manual setup, which directly contradicts "any client."

**Alternatives considered**:
- *Single static pre-registered OAuth client "for Claude"* — rejected: doesn't generalize to "AI clients (como Claude)" (i.e., not exclusively Claude), and most MCP clients won't have a way to plug in a manually-issued client ID/secret.
- *Personal access token pasted into the AI client* — rejected: doesn't reuse "authenticate with your existing account" in the way MCP clients expect (an interactive browser consent, not a copy-pasted secret), and offers a worse revocation UX than a named, listed connection.

## 3. Access-token shape and the "revoke immediately" guarantee

**Decision**: MCP access tokens are short-lived signed JWTs (via the existing `jose` dependency and signing pattern already used for web sessions), carrying `{ sub: uid, connectionId, client_id, iat, exp }`. Every MCP request first verifies the JWT signature/expiry, then performs a **live Firestore read** of `mcpConnections/{connectionId}` to confirm `status == "active"` before any tool executes. As with the existing web session, the actual `jose` signing/verification lives in an **adapter** (`adapters/session/JoseMcpTokenAdapter.ts`, implementing a new `McpTokenServicePort`), not in `domain/mcp/` — the repository's `domain-isolation.test.ts` already forbids `jose`/`firebase-admin`/`express` imports anywhere under `domain/`, and `domain/auth/Session.ts` + `adapters/session/JoseSessionAdapter.ts` is the existing precedent for this split.

**Rationale**: This satisfies Clarification Session 2026-07-27 (Q1): revocation must take effect immediately, not just at token expiry. Because every tool call already needs a live Firestore read anyway (there is no caching layer per FR-014), the extra connection-status read adds no new infrastructure — it's the same kind of read the tool handlers are already doing.

**Alternatives considered**:
- *Fully stateless JWT, no live check (matching the existing web-session pattern)* — this was the first option and was explicitly rejected in clarification: a stateless token remains valid until its own expiry, which cannot deliver "revoked = rejected on the very next request."
- *Fully opaque token = literal Firestore document ID, no JWT at all* — considered and viable, but a signed JWT gives tamper-evidence and lets malformed/expired tokens be rejected without touching Firestore at all, which is a cheap, standard defense-in-depth layer to keep.

## 4. Firestore read access from the backend

**Decision**: Add a new `FirestoreRetrospectiveReadAdapter` using the Firestore Admin SDK (via the already-installed `firebase-admin` package, currently used only for Auth) with **read-only methods only** (no `set`/`update`/`delete` exposed on this adapter's interface) for `retrospectives`, `cards`, `cardGroups`, `participants`, `sentimentResults`, `actionItems`, and `facilitatorNotes`.

**Rationale**: `firebase-admin` is already a project dependency; extending its use from Auth-only to Firestore reads adds no new dependency. Admin SDK access bypasses `firestore.rules` by design (it's a trusted server context), so all authorization logic (ownership, participation, facilitator check) must be — and is — enforced explicitly in the application/use-case layer, not delegated to the security rules.

**Alternatives considered**:
- *Client-side Firestore SDK with a minted custom token, mirroring how the SPA reads data* — rejected: the backend has no browser session to hold a live `onSnapshot` listener across serverless invocations, and one-shot reads via the client SDK gain nothing over the Admin SDK while adding an unnecessary custom-token mint per request.

## 5. No-caching constraint

**Decision**: No in-memory, edge/CDN, or Firestore-level caching is introduced anywhere in the MCP request path — not for the tool responses, and not for the connection-status check used for revocation. Every response is computed from a live read at request time.

**Rationale**: This is an explicit, non-negotiable instruction from the feature owner, not a performance trade-off open to reconsideration; it also simplifies the design by removing any need for cache-invalidation logic when a card is edited, a connection is revoked, or facilitator notes change.

**Alternatives considered**: None — this was given as a hard constraint, not a decision point.

## 6. Fitting the Vercel free tier

**Decision**: Reuse the existing single bundled `/api` serverless function (`retro-rocket/api/_backend.mjs`, produced by `scripts/bundle-backend.mjs`) for the new MCP/OAuth routes rather than adding a second Vercel function; rely on the platform's current default Node.js function execution timeout, which comfortably covers detail/summary generation for realistically sized retrospectives.

**Rationale**: Adding a second serverless function would add deployment complexity for no benefit — the existing function already hosts `/api/auth/*`, and Express routing lets `/api/mcp/*` live in the same process, so the free tier's per-function and per-invocation limits are not multiplied by a second entry point.

**Alternatives considered**:
- *Separate Vercel project/function dedicated to MCP* — rejected: no functional benefit, and it would double the surface area to keep within free-tier limits (e.g., separate cold-start/invocation accounting) for no isolation benefit the constitution or spec asks for.

## 7. Facilitator-notes gating — where the rule lives

**Decision**: Express the facilitator-only rule exactly once, as a small pure function (`domain/mcp/FacilitatorAccess.ts`, e.g. `canIncludeFacilitatorNotes(retrospective, requesterUid)`), used by both `GetRetrospectiveDetail` and `GetRetrospectiveSummary` use-cases.

**Rationale**: The existing codebase already expresses this same rule twice, independently, in `firestore.rules` (`request.auth.uid == resource.data.facilitatorId`) and in `facilitatorNotesService`'s query (`where('facilitatorId', '==', facilitatorId)`); adding a third, backend-side copy is unavoidable (Admin SDK bypasses rules), but at minimum this feature must not introduce *two* new independent copies of the same rule — one shared helper covers both new use-cases.

**Alternatives considered**:
- *Duplicate the uid-comparison inline in each use-case* — rejected: the whole point of this feature's privacy guarantee (User Story 4, SC-005) is that this check can never be forgotten or written slightly differently in a second call site.
