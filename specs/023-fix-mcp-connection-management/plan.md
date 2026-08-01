# Implementation Plan: Fix MCP Connection Management

**Branch**: `023-fix-mcp-connection-management` | **Date**: 2026-08-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/023-fix-mcp-connection-management/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

`GET /api/mcp/connections` currently returns connections of every status (pending/active/revoked), and the frontend renders whatever it gets without filtering — so a revoked connection reappears as "connected" on page reload even though live tool-access is already correctly blocked. The fix is a one-line-of-business-logic change: the `listConnections` use case must exclude `revoked` connections before returning them. On top of that, this feature adds two small, denormalized fields to `McpConnection` — an automatically classified `origin` ("desktop"/"mobile"/"web"/"unknown", derived only from the `User-Agent` header already present on the consent-decision request, never IP/location) and a `lastUsedAt` timestamp (updated on each live tool-auth check) — surfaced in the Connected Apps list so a user with two connections from the same AI client (e.g. Claude mobile + Claude desktop) can tell them apart before revoking one.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 22 (matches CI/`ci.yml`)

**Primary Dependencies**: Express 5 (HTTP routes), firebase-admin 14 (Firestore, server-side only), jose 5 (session/MCP JWTs, adapters-only per `domain-isolation.test.ts`), react-i18next (frontend copy), framer-motion + lucide-react (existing `ConnectedAppsCard` UI)

**Storage**: Firestore — existing `mcpConnections` collection (`FirestoreMcpConnectionAdapter`); this feature adds two fields to existing documents, no new collection

**Testing**: Vitest (unit, `server/vitest.config.ts` and root `vitest.config.ts`, 80% coverage floor per Constitution VI), Playwright (E2E, Constitution VII) for the Connected Apps critical flow

**Target Platform**: Vercel serverless Node.js functions (backend) + SPA (frontend), existing deployment target — unchanged by this feature

**Project Type**: Web application (existing `retro-rocket/` frontend + `retro-rocket/server/` backend in one repo, hexagonal/ports-and-adapters architecture)

**Performance Goals**: No new perceptible latency on `GET /api/mcp/connections` (small per-user list, in-memory filter) or on MCP tool calls (one additional Firestore field write on the already-existing live connection-status read in `mcpAuthMiddleware.ts`)

**Constraints**: No IP address or location data may be collected or stored for the origin label (Clarification, 2026-07-27 session — see spec.md `## Clarifications`); domain/ code must not import `express`/`firebase-admin`/`jose` (enforced by `domain-isolation.test.ts`); MCP-exposed retrospective data access must remain read-only (enforced by `mcp-read-only.test.ts` — unaffected, since this feature only touches connection bookkeeping, already an established write path)

**Scale/Scope**: Per-user connection counts are small (a handful of AI-client authorizations per account); no batching/pagination needed for the connections list

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Assessment |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Yes | Every change (use-case filter, domain `origin`/`lastUsedAt` fields, route/adapter wiring, UI) gets a failing test first — see tasks.md when generated. |
| II. Library-First | Yes | Origin classification is a small standalone pure function in `domain/mcp/` with its own unit tests, not inlined into the route handler. |
| III. Prefer Proven Third-Party Libraries | Yes | No new dependency is introduced — the origin classifier is a handful of `User-Agent` substring checks (`Mobile`, `Electron`, etc.), which doesn't justify pulling in a UA-parsing library for 3 categories. |
| IV. SOLID | Yes | Filtering "what counts as an active connection to show" stays in the `listConnections` use case (business rule), not the Firestore adapter (storage) or the React component (presentation) — Single Responsibility preserved. |
| V. Simplicity (KISS/YAGNI) | Yes | No new collection, no audit/history feature, no user-editable nicknames — matches the spec's Assumptions (revoked connections are simply excluded, not archived). |
| VI. Mandatory Unit Testing & Coverage Floor | Yes | New/changed units (`listConnections` filter, `ConnectionOrigin` classifier, `McpConnection.touched()`, `mcpAuthMiddleware` last-used write, `ConnectedAppsCard` rendering, `connectedAppsService` response mapping) all get Vitest coverage — including a new `connectedAppsService.test.ts`, since that file is modified by this feature and previously had none. |
| VII. E2E Testing with Playwright | Yes | The existing Connected Apps Playwright flow (`e2e/mcp-connector.spec.ts`) is extended to cover: revoke → reload → connection gone (US1), and two same-client connections with distinct origins (US2). |
| VIII. Accessibility WCAG 2.1 AA | Yes | New origin-label/last-used text in `ConnectedAppsCard` must not convey status by color alone (existing pattern already pairs icons with text) and must meet contrast in both themes. The project's existing merge-blocking axe-core gate (`e2e/accessibility.spec.ts`, scans `/perfil`) is extended to seed a connection first, so it actually renders and checks this new markup rather than relying on manual review alone. |
| i18n (Additional Standard) | Yes | New user-facing strings (origin labels, "last used" phrasing) added to `en.json` and `es.json` via `i18next` keys, no hardcoded strings. |
| Real-Time Data Security (Additional Standard) | Yes | No `firestore.rules` change needed — `mcpConnections` writes already go exclusively through the trusted Admin SDK server path (`FirestoreMcpConnectionAdapter`), not client-side Firestore access. |

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/023-fix-mcp-connection-management/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── connections-endpoint-delta.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── server/
│   ├── src/
│   │   ├── domain/mcp/
│   │   │   ├── McpConnection.ts            # MODIFY: add `origin`, `lastUsedAt` fields + `touched()` transition
│   │   │   └── ConnectionOrigin.ts         # NEW: pure User-Agent → 'desktop'|'mobile'|'web'|'unknown' classifier
│   │   ├── application/
│   │   │   └── use-cases/mcp/
│   │   │       ├── ListConnections.ts      # MODIFY: exclude 'revoked', include origin/lastUsedAt in ConnectionSummary
│   │   │       └── AuthorizeMcpConnection.ts # MODIFY: pass classified origin into McpConnection.createPending
│   │   ├── adapters/firebase/
│   │   │   └── FirestoreMcpConnectionAdapter.ts # unchanged (persists whatever McpConnectionData contains)
│   │   └── http/
│   │       ├── routes/mcp.ts               # MODIFY: read User-Agent on /authorize/decision, map origin/lastUsedAt into JSON response
│   │       └── middleware/mcpAuth.ts       # MODIFY: touch lastUsedAt on each successful tool-auth check
│   └── test/
│       ├── domain/mcp/
│       │   ├── McpConnection.test.ts       # MODIFY: origin/lastUsedAt behavior
│       │   └── ConnectionOrigin.test.ts    # NEW
│       ├── application/use-cases/mcp/
│       │   ├── ListConnectionsAndRevoke.test.ts # MODIFY: filters revoked, same-client revoke isolation, exposes origin/lastUsedAt
│       │   └── AuthorizeMcpConnection.test.ts # MODIFY
│       └── http/
│           ├── middleware/mcpAuth.test.ts  # MODIFY: asserts lastUsedAt touch
│           ├── routes/mcpAuthorize.test.ts # MODIFY: asserts UA-derived origin on the created connection
│           └── routes/mcpConnections.test.ts # MODIFY: response shape, revoked filtering, reload regression
└── src/
    ├── features/auth/
    │   ├── services/connectedAppsService.ts # MODIFY: ConnectedApp type gains origin/lastUsedAt
    │   ├── hooks/useConnectedApps.ts        # unchanged (already just proxies fetch results)
    │   └── components/ConnectedAppsCard.tsx # MODIFY: render origin label + last-used text
    ├── locales/en.json                      # MODIFY: new mcpConnector.connectedApps.* keys
    └── locales/es.json                      # MODIFY: same keys, Spanish

retro-rocket/src/test/features/auth/
├── components/ConnectedAppsCard.test.tsx    # NEW
└── services/connectedAppsService.test.ts    # NEW

retro-rocket/e2e/
├── mcp-connector.spec.ts                    # MODIFY: reload regression (US1) + second-origin distinguishing flow (US2)
└── accessibility.spec.ts                    # MODIFY: seed an MCP connection before the /perfil axe scan so the new UI is exercised
```

Note (ports/mcp.ts): `McpConnectionData` is defined in `domain/mcp/McpConnection.ts`, not in `application/ports/mcp.ts` — `McpConnectionStorePort`'s method signatures (`saveConnection`, `listConnectionsForUser`, etc.) are unaffected by adding fields to the data it carries, so `ports/mcp.ts` needs no change and is intentionally omitted from the tree above.

**Structure Decision**: This is a bug fix + small additive enhancement entirely within the existing `retro-rocket/server` (hexagonal domain/application/adapters/http layers) and `retro-rocket/src` (React SPA) structure established by features 015/019/021. No new top-level module, package, or collection is introduced — every change modifies or extends an existing file in place, consistent with Simplicity (KISS/YAGNI).

## Complexity Tracking

*No Constitution Check violations — table intentionally omitted.*
