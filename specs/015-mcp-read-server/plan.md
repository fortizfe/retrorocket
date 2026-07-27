# Implementation Plan: Remote Read-Only MCP Server for Retrospective Reporting

**Branch**: `015-mcp-read-server` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-mcp-read-server/spec.md`

## Summary

Add a remote, read-only Model Context Protocol (MCP) connector to RetroRocket's existing backend (`retro-rocket/server/`, hexagonal Express service already deployed under `/api/*` on Vercel per feature 014) so any user's own AI client (Claude or another MCP-compatible client) can authorize against their existing Google/GitHub RetroRocket account, list their retrospectives, fetch a retrospective's full detail or a report-ready structured summary, and have facilitator notes included only for that retrospective's own facilitator — exactly like the existing PDF/DOCX export. Authorization is implemented as an OAuth 2.1 Authorization Code + PKCE flow with Dynamic Client Registration (required because the spec targets *any* MCP client, not one pre-registered app), layered on top of the OAuth login building blocks feature 014 already built. A new, minimal `mcpConnections` Firestore collection is the one new piece of server-side state — required to satisfy the clarified "revoke immediately, checked live on every request" guarantee, which a purely stateless JWT (as used for the plain web session) cannot provide. Every MCP tool call and every token validation reads Firestore live via `firebase-admin` at request time; no caching layer of any kind is introduced anywhere in the path, and no new Firestore write path is added for retrospective data itself — every tool this connector exposes is read-only.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22/24 LTS (Vercel Fluid Compute default), ES2022/ESNext target — matching the existing `retro-rocket/server` config.

**Primary Dependencies**: Express 5 (existing), `firebase-admin` (existing — currently Auth-only; extended here to Firestore Admin SDK reads), `jose` (existing — JWT signing/verification, reused for MCP access tokens), `express-rate-limit` (existing). One new dependency: `@modelcontextprotocol/sdk` (the official MCP TypeScript SDK), used for the Streamable HTTP server transport and tool/schema registration.

**Storage**: Google Cloud Firestore (existing project database, Spark/free tier, unaffected by the Vercel plan). Read-only access to existing collections (`retrospectives`, their `cards` subcollection, `cardGroups`, `participants`, `sentimentResults`, `actionItems`, `facilitatorNotes`) via a new Admin SDK read adapter. Three new collections for connector state: `mcpClients` (Dynamic Client Registration records), `mcpAuthorizationCodes` (short-lived, single-use OAuth codes), `mcpConnections` (authorized connections + live status for revocation).

**Testing**: Vitest (`server/vitest.config.ts`, existing) for unit/integration tests of the new domain/use-case/adapter code; Playwright (existing `e2e/`) for one new critical-flow spec covering connect → list → detail → revoke → rejected, run against the Firebase emulator per the existing E2E pattern.

**Target Platform**: Vercel serverless functions (Node.js runtime, Fluid Compute), same Vercel project and same single `/api` function entry point (`retro-rocket/api/_backend.mjs`) the existing backend already uses — no new Vercel function is added.

**Project Type**: Backend extension to the existing web application (SPA in `retro-rocket/src/`, backend in `retro-rocket/server/`) — this feature adds backend routes/domain code plus one small new frontend surface (a "Connected Apps" management page) in the existing SPA.

**Performance Goals**: Every MCP tool response (list, detail, summary) completes in under 10s (p95) for a retrospective with up to ~100 cards — comfortably inside the platform's 300s default function execution limit — doing a small, bounded number of Firestore reads per call (no N+1 per-card reads where a batched/collection-group query will do).

**Constraints**: No caching layer anywhere (in-memory, edge/CDN, or data-store-level) — every response is a live Firestore read at request time (FR-014). Must run entirely within the free tier of Vercel (the platform RetroRocket is already hosted on) — no new paid infrastructure, no new Vercel function/project (FR-015). Every MCP-exposed operation is read-only against retrospective data (FR-013); the only new writes are to the three connector-state collections above, which are not retrospective data.

**Scale/Scope**: Single AI-client session per user at a time is the expected usage pattern (a person chatting with their own assistant); no specific concurrent-connection or throughput target beyond fitting Vercel's free-tier request/execution limits.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | PASS | New domain logic (connection lifecycle/status, facilitator-notes gating, access-token validation) gets a failing Vitest test before implementation, per existing `server/` test setup. |
| II. Library-First | PASS | New capability lives behind explicit modules — `server/src/domain/mcp/`, `server/src/application/use-cases/mcp/`, `server/src/application/ports/mcp.ts` — before any Express/MCP-SDK wiring touches it. |
| III. Prefer Proven Third-Party Libraries | PASS (justified) | One new dependency: `@modelcontextprotocol/sdk`, the official, actively maintained MCP TypeScript SDK — reimplementing the MCP wire protocol and OAuth-discovery metadata shapes by hand would duplicate a solved, spec-governed problem. Everything else reuses libraries already in the project (`firebase-admin`, `jose`, `express`). |
| IV. SOLID | PASS | Firestore Admin SDK access sits behind two new ports (`RetrospectiveReadPort`, `McpConnectionStorePort`); facilitator-notes gating and connection-status logic are pure, injected-dependency use-cases testable without a live Firestore connection, matching the existing `server/` pattern (`CompleteOAuthLogin`, `session.ts`). The MCP access-token JWT helper is likewise kept out of `domain/mcp/` and placed in `adapters/session/JoseMcpTokenAdapter.ts` behind a new `McpTokenServicePort`, matching the existing `Session`/`JoseSessionAdapter` split and satisfying the repo's enforced `domain-isolation.test.ts` rule (no `jose`/`firebase-admin`/`express` imports under `domain/`). |
| V. Simplicity (KISS/YAGNI) | PASS | Authorization scope is all-or-nothing (no per-retrospective sharing UI, per Clarification), the existing OAuth login use-cases (`StartOAuthLogin`/`CompleteOAuthLogin`) are reused rather than re-implemented for the underlying Google/GitHub handshake, and no caching layer is added anywhere (simplest option, and also an explicit hard requirement). |
| VI. Mandatory Unit Testing & Coverage Floor | PASS | New server code is covered by Vitest and must not drop the existing 80% branches/functions/lines/statements floor in `server/vitest.config.ts`. |
| VII. E2E Testing (Playwright, NON-NEGOTIABLE) | PASS | One new critical-flow Playwright spec added alongside the existing auth/export flows: authorize a connection, list retrospectives, fetch detail (with and without facilitator role), revoke, confirm the next call is rejected. |
| VIII. Accessibility WCAG 2.1 AA (NON-NEGOTIABLE) | PASS | The only new user-facing surfaces are the OAuth consent screen and the "Connected Apps" management page; both are built with the project's existing accessible components/patterns and verified in light and dark themes before merge. |
| Strict Type Safety | PASS | New code lives in the existing `strict`-mode TS project; no `any`. |
| Code Consistency (ESLint) | PASS | New files pass the existing lint config; no new tooling introduced. |
| Real-Time Data Security (`firestore.rules`) | PASS (justified change) | `firestore.rules` gains deny-all-from-client rules for the three new collections (`mcpClients`, `mcpAuthorizationCodes`, `mcpConnections`): only the backend's Admin SDK (which bypasses rules) may read/write them, so the addition *strengthens* the security posture (explicit deny) rather than weakening any existing rule. |
| Internationalization | PASS | The new consent screen and Connected Apps page route all copy through i18next; keys added for every currently supported locale. |
| Error Handling & Resilience | PASS | Every MCP tool handler and token-validation path explicitly distinguishes "not found/inaccessible", "revoked/invalid credential", and "rate limited" (FR-016) rather than failing silently. |
| Performance | PASS | Detail/summary generation is validated against a realistically large retrospective in the quickstart before merge; no speculative optimization added beyond that. |

No unjustified violations. Two items are recorded in Complexity Tracking below because they add more moving parts than a minimal read API would otherwise need — both are direct, traceable consequences of explicit spec requirements, not incidental complexity.

## Project Structure

### Documentation (this feature)

```text
specs/015-mcp-read-server/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── mcp-tools.md
│   └── oauth-endpoints.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── server/                                  # Existing hexagonal backend (feature 014)
│   └── src/
│       ├── domain/
│       │   ├── auth/                        # Existing (Session, UserIdentity, OAuthState)
│       │   └── mcp/                         # NEW: pure domain types/logic only — no jose/firebase-admin/express
│       │       ├── McpConnection.ts         #   connection entity + status transitions
│       │       ├── McpClientRegistration.ts #   DCR client record
│       │       ├── FacilitatorAccess.ts     #   shared facilitator-notes gating rule
│       │       └── RetrospectiveSummary.ts  #   pure summary-shaping logic
│       ├── application/
│       │   ├── ports/
│       │   │   └── mcp.ts                   # NEW: RetrospectiveReadPort, McpConnectionStorePort, McpClientStorePort, McpTokenServicePort
│       │   └── use-cases/
│       │       └── mcp/                     # NEW
│       │           ├── RegisterMcpClient.ts       # DCR
│       │           ├── AuthorizeMcpConnection.ts  # authorize + consent → code
│       │           ├── ExchangeMcpToken.ts        # code/PKCE → access token
│       │           ├── ListConnections.ts         # for the Connected Apps UI
│       │           ├── RevokeConnection.ts
│       │           ├── ListRetrospectives.ts
│       │           ├── GetRetrospectiveDetail.ts
│       │           └── GetRetrospectiveSummary.ts
│       ├── adapters/
│       │   ├── firebase/
│       │   │   ├── FirebaseIdentityAdapter.ts     # Existing (Auth)
│       │   │   ├── FirestoreRetrospectiveReadAdapter.ts  # NEW: read-only Admin SDK reads
│       │   │   └── FirestoreMcpConnectionAdapter.ts      # NEW: mcpClients/mcpAuthorizationCodes/mcpConnections
│       │   └── session/
│       │       ├── JoseSessionAdapter.ts          # Existing (web session JWE)
│       │       └── JoseMcpTokenAdapter.ts         # NEW: implements McpTokenServicePort (jose-based MCP access-token issue/verify) —
│       │                                          #   lives here, not in domain/mcp/, mirroring the existing Session/JoseSessionAdapter
│       │                                          #   split enforced by test/architecture/domain-isolation.test.ts (no jose in domain/)
│       └── http/
│           └── routes/
│               ├── auth.ts                  # Existing
│               └── mcp.ts                   # NEW: DCR, authorize, token, connections CRUD, MCP transport mount
├── src/
│   ├── pages/
│   │   └── Profile.tsx                      # Existing — amended to render the new ConnectedAppsCard
│   └── features/
│       ├── boards/                          # Existing
│       └── auth/                            # Existing — the new Connected Apps UI lives here, alongside
│           ├── components/
│           │   ├── LinkedProvidersCard.tsx  # Existing — the direct precedent for ConnectedAppsCard's shape
│           │   ├── ConnectedAppsCard.tsx    # NEW: lists connections + revoke, rendered from pages/Profile.tsx
│           │   └── McpConsentScreen.tsx     # NEW: OAuth consent screen (served by the backend's /api/mcp/authorize flow)
│           └── services/
│               └── connectedAppsService.ts  # NEW: calls GET/DELETE /api/mcp/connections
└── firestore.rules                          # Amended: deny-all-from-client for the 3 new collections
```

**Structure Decision**: Extend the existing hexagonal backend in place (new `domain/mcp`, `application/*/mcp`, `adapters/firebase/*Mcp*`, `adapters/session/JoseMcpTokenAdapter.ts`, `http/routes/mcp.ts`) rather than starting a second service — the constitution's Library-First and Simplicity principles and the existing `server/` composition-root pattern (`buildApp` wiring ports to adapters) both point at reusing the same app, same Vercel function, and same deployment. Crypto/framework-touching code (the MCP access-token JWT helper) sits in `adapters/session/`, not `domain/mcp/`, mirroring the existing `Session`/`JoseSessionAdapter` split — `domain/` stays free of `jose`/`firebase-admin`/`express` imports, which the repository already enforces via `server/test/architecture/domain-isolation.test.ts`. The frontend gets no new feature folder: the "manage my connections" UI is a new card (`ConnectedAppsCard.tsx`) added to the existing `src/features/auth/components/` directory and rendered from the existing `src/pages/Profile.tsx`, directly alongside the existing `LinkedProvidersCard.tsx` it is modeled on — there is no `features/account/` or "settings" area in this codebase to invent. The MCP protocol surface itself has no UI (it is consumed by the AI client, not rendered).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| Full OAuth 2.1 Authorization Code + PKCE flow with Dynamic Client Registration (register/authorize/token endpoints, metadata discovery), instead of a single static long-lived personal access token per user | The spec requires *any* RetroRocket user to connect *any* MCP-compatible AI client (not one pre-registered app) using their existing account, with standard, discoverable revocation — this is exactly the shape the MCP Authorization spec expects remote servers to expose so generic clients (Claude and others) can connect without bespoke per-client setup | A single shared/static personal-access-token approach would need its own bespoke issuance and copy/paste UX, would not be auto-discoverable by MCP clients that expect OAuth metadata, and would not scale to "any AI client" without reinventing the same registration/consent concepts OAuth+DCR already standardizes |
| Three new small Firestore collections (`mcpClients`, `mcpAuthorizationCodes`, `mcpConnections`) — i.e. real server-side state, versus a fully stateless JWT-only design (no new persistence at all) | Clarification (Session 2026-07-27, Q1) explicitly requires that revoking a connection take effect immediately, checked live on every request — a purely stateless bearer token (the pattern already accepted for the plain web session in feature 014) cannot offer that guarantee, since a signed token remains valid until its own expiry with no way to invalidate it early | A stateless-only design (matching the web session's existing bounded-delay trade-off) was the first option considered and was explicitly rejected during clarification precisely because it cannot deliver "revoke access at any time" as an immediate guarantee, which the spec treats as a privacy-critical requirement (SC-002) |
