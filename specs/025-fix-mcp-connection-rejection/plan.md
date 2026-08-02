# Implementation Plan: Fix MCP Connections Always Resolving as Rejected

**Branch**: `025-fix-mcp-connection-rejection` | **Date**: 2026-08-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/025-fix-mcp-connection-rejection/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Root cause, confirmed directly in the code (`server/src/http/routes/mcp.ts:125-144`): `tokenLimiter`, the rate limiter guarding `POST /api/mcp/token` (the token-exchange step every connect **and every refresh** must pass through), is keyed by `req.ip` — deliberately, per its own comment, because the MCP client authenticates this call itself (Bearer/OAuth), never via the browser's `rr_session` cookie, so there was "no session identity to key on here." That reasoning breaks down for exactly this endpoint: the caller is not a browser tab representing one person, it is the AI client's own backend (e.g. Claude's hosted remote-MCP-connector infrastructure) making a server-to-server call on behalf of potentially many different RetroRocket users. `app.set('trust proxy', 1)` (`app.ts:42`) already resolves `req.ip` to the *real* upstream caller correctly (fixed earlier, unrelated bug) — but "the real upstream caller" for this route is the AI client's own infrastructure, not the individual end user, so distinct RetroRocket users connecting through the same AI client collapse into one shared 60-requests/15-minutes bucket. Once that shared bucket is saturated by combined traffic (or by an individual client's own reconnect/refresh retries), every subsequent legitimate token exchange — including this user's own refresh — gets a blunt `429 rate_limited`, which the AI client surfaces as a bare connection rejection with no further detail. This is a deterministic, self-reinforcing condition (not intermittent), which matches "siempre" (always) in the bug report exactly. `server/test/http/routes/mcpToken.test.ts`'s existing `tokenLimiter` test suite proves the mechanism (two distinct IPs are isolated; the same IP is throttled after 61 calls) but only ever exercised it with synthetic, obviously-distinct `X-Forwarded-For` values — it never tested the actual failure condition, two *different users'* requests colliding on one IP because the calling client itself is shared.

This is a materially different defect from the one already investigated and fixed in `024-fix-mcp-connection-status` (research.md §6 there: OAuth/PKCE semantic correctness inside `exchangeMcpToken`, and per-branch `InvalidGrantError` messages). A 429 from `tokenLimiter` is returned by Express's rate-limit middleware *before* the request ever reaches `exchangeMcpToken` — none of 024's improved error messages, or its `'failed'`-status bookkeeping, are ever triggered by this failure mode, which is why the underlying problem persisted after 024 shipped.

**Fix** (Clarifications 2026-08-02): stop keying `tokenLimiter` by IP. Resolve the actual per-user identity the request already carries — the `uid` behind the `code` (via the existing, non-mutating `connectionStore.getAuthorizationRequest(code)`) for an `authorization_code` grant, or the `uid` behind the `refresh_token`'s hash (via the existing `connectionStore.getConnectionByRefreshTokenHash(hash)`) for a `refresh_token` grant — and key the bucket on that `uid` instead. A request whose identity cannot be resolved (a bogus/unknown code or token — never a legitimate in-flight attempt) falls back to the current IP-keyed behavior, so abuse protection against garbage/guessed input is unchanged. This preserves the protection (Clarification Q1: "preserve, rescope per-user") while guaranteeing no two distinct users' legitimate attempts ever share a bucket, regardless of what the calling AI client's own infrastructure looks like from the outside. `toolLimiter` (`POST /api/mcp`, tool calls made *after* a connection already exists) is deliberately left untouched: it is not part of the connection/token flow this spec covers, already runs after Bearer-token auth resolves a real `uid` today it just isn't keyed on it, and per Constitution V (Simplicity/YAGNI) is out of scope until a spec calls for it.

**Observability** (Clarification 2026-08-02, FR-008/SC-006): every time `tokenLimiter`'s `handler` rejects a request, emit a structured metric via the already-existing, currently-unused `MetricsPort.increment` (`server/src/application/ports/observability/index.ts`, `StdoutMetrics` in `adapters/observability/stdout.ts`), tagged by whether the request's identity resolved to a `uid` (a real user hit their own limit — expected, not alarming) or fell back to `ip` (an unresolvable/garbage request, or a genuine shared-bucket collision if this fix is ever incomplete). A spike in the `ip`-tagged tag going forward is the signal that would have caught this exact regression before a user had to report it. No new alerting infrastructure is introduced — this is the first real use of a port that already existed for exactly this purpose.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 22 (matches CI/`ci.yml`)

**Primary Dependencies**: Express 5 (HTTP routes), `express-rate-limit` (existing dependency, already used by `tokenLimiter`/`toolLimiter`/`rateLimiting.ts`), firebase-admin 14 (Firestore, server-side only) — all unchanged from 023/024; no new dependency introduced

**Storage**: Firestore — existing `mcpConnections`/`mcpAuthorizationCodes` collections (`FirestoreMcpConnectionAdapter`); this feature adds no new field, no new collection, no new index — it reads `uid` off records that are already fetched via existing, non-mutating port methods (`getAuthorizationRequest`, `getConnectionByRefreshTokenHash`)

**Testing**: Vitest (unit, 80% coverage floor per Constitution VI), Playwright (E2E, Constitution VII) extending the existing `e2e/mcp-connector.spec.ts` flow

**Target Platform**: Vercel serverless Node.js functions (backend) + SPA (frontend), unchanged deployment target

**Project Type**: Web application (existing `retro-rocket/` frontend + `retro-rocket/server/` backend, hexagonal/ports-and-adapters architecture)

**Performance Goals**: No new perceptible latency — the new key resolver adds at most one extra Firestore read per token request (resolving `uid` from the already-supplied `code`/`refresh_token`), on the same request path that already reads that same record moments later inside `exchangeMcpToken`; no new latency on any other route

**Constraints**: Must not regress 023/024 (revoked connections excluded from the active list; failed/expired attempts correctly classified; distinct `InvalidGrantError` messages); must not weaken `tokenLimiter`'s protection against genuinely unresolvable/garbage requests (IP-keyed fallback preserved); domain code (`domain/mcp/`) must not import `express`/`firebase-admin`/`jose` (`domain-isolation.test.ts`, unaffected — no domain change in this feature); MCP-exposed retrospective data access must remain read-only (unaffected)

**Scale/Scope**: Same small per-user connection counts as 023/024; no batching/pagination needed; the fix is local to one router file's rate-limiter wiring plus one new dependency (`metrics`) threaded through existing MCP composition wiring

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Assessment |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Yes | Every change (new per-user key resolver + IP fallback, `metrics` dependency threading, rate-limit rejection metric) gets a failing test first — see tasks.md when generated. |
| II. Library-First | Yes | No new capability module — this extends the existing `mcpRouter` (`server/src/http/routes/mcp.ts`) in place, matching how 023/024 extended existing files rather than introducing new ones. |
| III. Prefer Proven Third-Party Libraries | Yes | No new dependency; reuses `express-rate-limit`'s existing async `keyGenerator` support (already the pattern `rateLimiting.ts`'s `sessionAwareKeyGenerator` uses) and the project's own existing `MetricsPort`. |
| IV. SOLID | Yes | "How to resolve the identity behind a token request" stays an HTTP-layer concern (a key generator function beside the route, mirroring `sessionAwareKeyGenerator`), using only existing port methods (`McpConnectionStorePort`) — no business rule moves into the adapter, no adapter logic leaks into the route. |
| V. Simplicity (KISS/YAGNI) | Yes | Reuses the exact async-keyGenerator pattern `rateLimiting.ts` already established for the same class of problem, rather than inventing a new mechanism; reuses the existing `MetricsPort` rather than adding new alerting infrastructure; deliberately leaves `toolLimiter` untouched since it is outside this spec's "connection attempt" scope (see Summary). |
| VI. Mandatory Unit Testing & Coverage Floor | Yes | New/changed units (the MCP token key resolver's per-`uid` isolation + IP fallback, the rate-limit rejection metric emission, `mcp-wiring.ts`/`composition-root.ts`'s `metrics` threading) all get Vitest coverage. |
| VII. E2E Testing with Playwright | Yes | `e2e/mcp-connector.spec.ts` is extended to cover: two distinct users' connection/refresh flows succeeding independently within the same short window (US1/US2), simulating the collision this bug caused. |
| VIII. Accessibility WCAG 2.1 AA | Yes | No UI surface is touched by this feature (backend-only fix); not applicable. |
| i18n (Additional Standard) | Yes | No new user-facing strings are introduced. |
| Real-Time Data Security (Additional Standard) | Yes | No `firestore.rules` change — the key resolver only performs existing, already-authorized read operations (`getAuthorizationRequest`, `getConnectionByRefreshTokenHash`) that `exchangeMcpToken` already performs moments later on the same request; no new bypass or write path is introduced. |

No violations requiring Complexity Tracking.

**Post-Phase 1 re-check**: research.md and data-model.md confirm the design introduces no new entity, collection, dependency, or UI surface, and touches only `mcp.ts`, `mcp-wiring.ts`, and `composition-root.ts` — the gate assessment above is unchanged after design.

## Project Structure

### Documentation (this feature)

```text
specs/025-fix-mcp-connection-rejection/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── token-rate-limit-delta.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── server/
│   ├── src/
│   │   ├── application/
│   │   │   └── ports/
│   │   │       └── observability/
│   │   │           └── index.ts                # unchanged — MetricsPort already exists, first real caller added
│   │   └── http/
│   │       ├── routes/
│   │       │   └── mcp.ts                       # MODIFY: tokenLimiter gets an async, per-uid keyGenerator (IP fallback preserved) + metrics.increment on every rejection; toolLimiter unchanged
│   │       ├── mcp-wiring.ts                    # MODIFY: buildMcpDeps gains a `metrics: MetricsPort` parameter, passed through to McpRouterDeps
│   │       └── composition-root.ts              # MODIFY: passes observability.metrics into buildMcpDeps
│   └── test/
│       ├── http/
│       │   └── routes/
│       │       ├── mcpToken.test.ts             # MODIFY: replaces the "two distinct IPs" framing with "two distinct users colliding on the same IP are still isolated"; existing IP-fallback-for-garbage-input case kept
│       │       └── mcpTestApp.ts                # MODIFY: default `metrics` fake in McpRouterDeps test fixture
│       └── application/use-cases/mcp/
│           └── mcpFakes.ts                      # MODIFY (if needed): expose a fake/spy MetricsPort helper reused by mcpToken.test.ts
└── e2e/
    └── mcp-connector.spec.ts                    # MODIFY: two concurrent/back-to-back simulated users connecting through the same client within one rate-limit window both succeed
```

**Structure Decision**: This is a bug fix entirely within the existing `retro-rocket/server` (hexagonal domain/application/adapters/http layers) structure established by features 015/021/023/024. No new top-level module, package, collection, or domain entity is introduced — the change is scoped to `mcp.ts`'s rate-limiter wiring and the existing MCP composition wiring (`mcp-wiring.ts`, `composition-root.ts`) needed to thread through the pre-existing `MetricsPort`. No frontend change: the defect and its fix are entirely server-side, before any response reaches the browser or the AI client's UI.

## Complexity Tracking

*No Constitution Check violations — table intentionally omitted.*
