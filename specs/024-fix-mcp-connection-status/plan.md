# Implementation Plan: Fix MCP Connection Status Reporting and Reconnection Flow

**Branch**: `024-fix-mcp-connection-status` | **Date**: 2026-08-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/024-fix-mcp-connection-status/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Two related problems, both examined directly in the code (`server/src/application/use-cases/mcp/`, `server/src/domain/mcp/McpConnection.ts`, `retro-rocket/src/features/auth/`):

1. **Display bug**: `ListConnections.ts` only excludes `status === 'revoked'` (the fix shipped in 023), so a connection stuck in `'pending'` — created at consent-approval time, before the token exchange ever completes (`AuthorizeMcpConnection.ts` → `decideMcpAuthorization`) — is still returned and rendered by `ConnectedAppsCard.tsx` exactly like a genuinely active one; neither the service nor the component inspects `status` at all. There is no terminal state today for "this attempt failed or was abandoned" — only `pending → active → revoked`.
2. **Reconnection flow defect (FR-004)**: the OAuth/PKCE implementation itself (`AuthorizeMcpConnection.ts`, `ExchangeMcpToken.ts`, DCR in `RegisterMcpClient.ts`) reads as spec-conformant on inspection — no missing-CORS concern applies (`/api/mcp/token` is a server-to-server call from the AI client's backend, never browser JS, confirmed by `server/src/http/app.ts` having no CORS layer anywhere in the app, consistent with every other route too). The concrete, verifiable defect found is an **observability gap**: every one of `ExchangeMcpToken.ts`'s four distinct `authorization_code` failure branches (unknown/expired/reused code, `client_id`/`redirect_uri` mismatch, PKCE mismatch, denied/incomplete authorization) throws `new InvalidGrantError()` with the identical default message ("The grant is invalid, expired, or already used"). `errorHandler.ts` already logs every request error via `logger.error('request_error', { code, detail, ... })`, but `detail` is that same generic message for all four cases — so today's logs cannot distinguish which of the four is actually firing for the reported "no es posible realizar la conexión," making the defect currently undiagnosable from production evidence, only guessable. Phase 0 (research.md) fixes this first, as the concrete prerequisite to a real diagnosis.

**Design**: Add a `'failed'` terminal `McpConnectionStatus` (alongside `pending | active | revoked`) plus a `failedAt` field, reached two ways — mirroring the Clarifications' "explicit signal or timeout" decision:
- **Explicit signal**: `ExchangeMcpToken.ts` now gives each `InvalidGrantError` a distinct message, and marks the associated (still-`pending`) connection `'failed'` immediately whenever one can be identified from the authorization-code record, even on the failure path.
- **Timeout**: `ListConnections.ts` lazily expires any `'pending'` connection older than `MCP_AUTHORIZATION_REQUEST_TTL_SECONDS` (the same 10-minute window the authorization code itself is bound by — once that code has expired, the connection can never be activated through it) into `'failed'` and persists the transition, on read. This single mechanism also satisfies FR-009's migration requirement for free: the first time a user's connections are listed after this ships, their already-stuck `pending` rows (days old, per the bug report) get caught and persisted as `'failed'` — no separate backfill script needed.

`ListConnections.ts` is simplified to return only `status === 'active'` connections (dropping the now-unused `'pending'` branch of its return type entirely), matching the spec's Assumption that failed/incomplete attempts are excluded outright rather than shown with a distinct label. `mcpAuthMiddleware.ts`'s existing `connection.isActive` check (`status === 'active'` strict equality) already rejects `'failed'` connections with no code change required — adding the new status introduces no new attack surface.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 22 (matches CI/`ci.yml`)

**Primary Dependencies**: Express 5 (HTTP routes), firebase-admin 14 (Firestore, server-side only), jose 5 (session/MCP JWTs, adapters-only per `domain-isolation.test.ts`) — all unchanged from 023; no new dependency introduced

**Storage**: Firestore — existing `mcpConnections` collection (`FirestoreMcpConnectionAdapter`); this feature adds one field (`failedAt: number | null`) and one enum value (`'failed'`) to existing documents, no new collection, no new composite index (filtering stays an in-memory step in the use case, consistent with 023's research.md precedent)

**Testing**: Vitest (unit, 80% coverage floor per Constitution VI), Playwright (E2E, Constitution VII) extending the existing `e2e/mcp-connector.spec.ts` flow

**Target Platform**: Vercel serverless Node.js functions (backend) + SPA (frontend), unchanged deployment target

**Project Type**: Web application (existing `retro-rocket/` frontend + `retro-rocket/server/` backend, hexagonal/ports-and-adapters architecture)

**Performance Goals**: No new perceptible latency — the lazy-expiry check in `ListConnections` is one cheap in-memory age comparison per already-fetched connection, with an extra Firestore write only for the (rare, one-time-per-stuck-record) case where a transition actually occurs; `ExchangeMcpToken`'s failure paths add at most one extra Firestore read (`getAuthorizationRequest`), and only on the already-erroring path, never on success

**Constraints**: Must not regress 023's revoked-connection exclusion (FR-006); must not collect IP/location data (023's Clarification, still binding); domain code (`domain/mcp/`) must not import `express`/`firebase-admin`/`jose` (`domain-isolation.test.ts`); MCP-exposed retrospective data access must remain read-only (`mcp-read-only.test.ts`, unaffected — this feature only touches connection bookkeeping)

**Scale/Scope**: Same small per-user connection counts as 023; no batching/pagination needed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Assessment |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Yes | Every change (new `'failed'` status + `.failed()` transition, distinct `InvalidGrantError` messages + failure-marking, `ListConnections` lazy-expiry + simplified filter, adapter backfill) gets a failing test first — see tasks.md when generated. |
| II. Library-First | Yes | No new capability module — this extends the existing `domain/mcp/McpConnection` entity and two existing use cases in place, matching how 023 extended the same files rather than introducing a new one. |
| III. Prefer Proven Third-Party Libraries | Yes | No new dependency. |
| IV. SOLID | Yes | "What counts as failed/expired" and "what counts as active-for-display" both stay business rules in the application-layer use cases (`ExchangeMcpToken`, `ListConnections`), not the Firestore adapter or the React component — same Single Responsibility split 023 established. |
| V. Simplicity (KISS/YAGNI) | Yes | One terminal status (not two, despite the spec saying "failed"/"expired" as alternatives) covers both trigger paths; the timeout mechanism reuses the existing authorization-code TTL constant instead of introducing a second, independently-configured expiry; no new Firestore collection, index, or scheduled/cron job is introduced — migration of already-stuck records piggybacks on the existing list-read path for free. |
| VI. Mandatory Unit Testing & Coverage Floor | Yes | New/changed units (`McpConnection.failed()`, `ExchangeMcpToken`'s four distinguished failure messages + failure-marking, `ListConnections`'s lazy-expiry + narrowed filter, `FirestoreMcpConnectionAdapter`'s `failedAt` backfill, `connectedAppsService`'s defensive `status === 'active'` filter) all get Vitest coverage. |
| VII. E2E Testing with Playwright | Yes | `e2e/mcp-connector.spec.ts` is extended to cover: an authorization attempt that fails token exchange never appears in the Connected Apps list (US1), and a fresh authorize→consent→token-exchange run after a revoke completes successfully end-to-end (US2). |
| VIII. Accessibility WCAG 2.1 AA | Yes | No new UI surface is introduced (failed/incomplete attempts are excluded, not labeled, per the spec's Assumptions) — existing `ConnectedAppsCard` markup and its already-passing accessibility gate (`e2e/accessibility.spec.ts`) are unaffected. |
| i18n (Additional Standard) | Yes | No new user-facing strings are introduced by this feature (no new UI state to label). |
| Real-Time Data Security (Additional Standard) | Yes | No `firestore.rules` change needed — `mcpConnections` writes already go exclusively through the trusted Admin SDK server path; the new `'failed'` status is rejected by the existing `isActive` (`status === 'active'`) check in `mcpAuthMiddleware.ts` with no code change, so no new bypass is introduced. |

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/024-fix-mcp-connection-status/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── connection-status-delta.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── server/
│   ├── src/
│   │   ├── domain/mcp/
│   │   │   └── McpConnection.ts                # MODIFY: add 'failed' status + failedAt field + .failed() idempotent transition (pending -> failed; no-op otherwise, mirrors .revoked())
│   │   ├── application/
│   │   │   └── use-cases/mcp/
│   │   │       ├── ExchangeMcpToken.ts         # MODIFY: distinct InvalidGrantError message per failure branch; mark the associated pending connection 'failed' on each explicit failure signal
│   │   │       └── ListConnections.ts          # MODIFY: gains `clock` dep; lazily expires stale 'pending' connections to 'failed' (persisted) before filtering; returns only status === 'active'
│   │   ├── adapters/firebase/
│   │   │   └── FirestoreMcpConnectionAdapter.ts # MODIFY: hydrateConnectionData backfills failedAt for pre-existing docs (same defensive pattern fe0db0f established for origin/lastUsedAt)
│   │   └── http/
│   │       └── routes/mcp.ts                   # MODIFY: pass `clock` into listConnections' deps; no response-shape change (status is now always "active" once returned)
│   └── test/
│       ├── domain/mcp/
│       │   └── McpConnection.test.ts           # MODIFY: .failed() transition + idempotency cases
│       ├── application/use-cases/mcp/
│       │   ├── ExchangeMcpToken.test.ts        # MODIFY: each existing InvalidGrantError case now also asserts a distinct message and that the pending connection ends up 'failed'
│       │   └── ListConnectionsAndRevoke.test.ts # MODIFY: excludes 'pending'/'failed' the same as 'revoked'; a stale pending connection is expired+persisted as 'failed'; a fresh (non-expired) pending connection is still excluded from the returned list but NOT yet persisted as 'failed'
│       ├── adapters/firebase/
│       │   └── FirestoreMcpConnectionAdapter.test.ts # MODIFY: backfills failedAt same as origin/lastUsedAt
│       └── http/routes/mcpConnections.test.ts   # MODIFY: a pending connection (fresh or stale) never appears in the response
└── src/
    ├── features/auth/
    │   ├── services/connectedAppsService.ts     # MODIFY: ConnectedApp.status narrows to 'active'; defensive status === 'active' filter applied client-side too (defense-in-depth for a trust-sensitive list, research.md §4)
    │   └── components/ConnectedAppsCard.tsx     # unchanged (already renders whatever the service returns; no new UI state to add)
    └── test/features/auth/
        └── services/connectedAppsService.test.ts # MODIFY: asserts the defensive filter drops a non-active entry even if the API ever regressed

retro-rocket/e2e/
└── mcp-connector.spec.ts                        # MODIFY: failed/incomplete attempt never listed (US1) + revoke-then-reconnect full flow succeeds end-to-end (US2)
```

**Structure Decision**: This is a bug fix entirely within the existing `retro-rocket/server` (hexagonal domain/application/adapters/http layers) and `retro-rocket/src` (React SPA) structure established by features 015/021/023. No new top-level module, package, or collection is introduced — every change modifies an existing file in place, consistent with Simplicity (KISS/YAGNI). No frontend UI change is needed beyond a defensive filter, since the spec's Assumptions call for exclusion, not a new visible state.

## Complexity Tracking

*No Constitution Check violations — table intentionally omitted.*
