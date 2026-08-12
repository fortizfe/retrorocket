# Implementation Plan: Reduce Firestore Read Load from the MCP Connector

**Branch**: `041-reduce-mcp-firestore-reads` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/041-reduce-mcp-firestore-reads/spec.md`

## Summary

A live production incident (2026-08-12) traced `RESOURCE_EXHAUSTED` errors to traffic on the MCP connector (`/api/mcp`, `/api/mcp/token`) — a sibling cause to the one feature 040 fixed for board-join traffic, confirmed still occurring after 040 shipped because the MCP connector's read patterns were out of that feature's scope. This plan implements the spec's three independently-shippable stories, in priority order: (P1) stop reading the connection's authorization status from Firestore on every single MCP tool call by reusing a short-lived per-instance cache, back off clients that accumulate repeated failed authorization attempts, and key MCP tool-call rate limiting by authenticated identity instead of shared network origin; (P2) remove the redundant internal `listCards` re-fetch inside `listSentimentResults` and replace `listRetrospectivesForUser`'s one-lookup-per-retrospective loop with a batched read; (P3) serve `get_retrospective_detail`/`get_retrospective_summary` results from a short-lived per-instance cache instead of always re-reading live. All three reuse the `InMemoryTtlCache` pattern already introduced by feature 040 — no new external dependency or infrastructure is required.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js on Vercel Fluid Compute

**Primary Dependencies**: Express 5, `firebase-admin` 14 (Firestore Admin SDK), `express-rate-limit` (already backing `tokenLimiter`/`toolLimiter` in `server/src/http/routes/mcp.ts`). No new dependency is introduced — this feature reuses `server/src/adapters/cache/InMemoryTtlCache.ts` (feature 040) for every cache/counter introduced here.

**Storage**: Firestore (Firebase Admin SDK) remains the sole system of record — no schema/document changes. All new state (connection-authorization cache, failed-attempt counters, detail/summary result cache) is per-instance in-memory, mirroring feature 040's profile-cache precedent (research.md §2 of that feature) rather than requiring cross-instance consistency via Redis.

**Testing**: Vitest (`server/vitest.config.ts`) for the Story 1 changes — `mcpAuthMiddleware.ts` (auth-status cache, backoff counter) and `mcp.ts`'s `toolLimiter` re-keying are HTTP-layer code injected with `McpConnectionStorePort`/`McpTokenServicePort`, fully testable against the existing `inMemoryConnectionStore()` fake (`server/test/application/use-cases/mcp/mcpFakes.ts`) plus a call-counting spy, extending `server/test/http/middleware/mcpAuth.test.ts` and `server/test/http/routes/mcpTools.test.ts`. Story 2 and 3's changes (`FR-004`, `FR-005`, `FR-008`) live inside `FirestoreRetrospectiveReadAdapter.ts`'s live Firestore query composition, which — per this codebase's established, explicitly documented convention (`FirestoreProfileAdapter.ts`'s own docstring names `FirestoreRetrospectiveReadAdapter` as one of the adapters with "no dedicated Vitest unit test elsewhere in this codebase") — has no direct Vitest coverage and is instead verified end-to-end by the Playwright E2E suite against the Firebase emulator, extending `e2e/mcp-connector.spec.ts`.

**Target Platform**: Vercel Functions, Fluid Compute — unchanged. This feature is confined to request-scoped and per-instance state; it introduces no new platform dependency.

**Project Type**: Web application — Vite/React SPA (`retro-rocket/src`) + Express backend (`retro-rocket/server/src`). This feature is backend-only, confined to the MCP connector's own files; no frontend code changes.

**Performance Goals**: A sequence of authenticated MCP tool calls on the same connection issues at most one connection-authorization Firestore read per 5-10s window instead of one per call (`SC-002`, `FR-001`); a client stuck retrying failed authorization is backed off after its 5th failure within 30s (`SC-003`, `FR-002`); `get_retrospective_detail`/`get_retrospective_summary` never re-fetch the same collection twice within one call (`SC-004`, `FR-004`); `list_retrospectives` cost scales sub-linearly, not one lookup per retrospective (`SC-005`, `FR-005`); repeated detail/summary requests for the same retrospective within 5-15s are served from cache (`FR-008`).

**Constraints**: Firebase remains on the Spark (free) plan — no solution may require enabling billing. No observable change to MCP tool response shape, access-control correctness, or which retrospective data a given user can see (`FR-006`, `FR-007`). The connection-authorization staleness window is capped at 5-10s and the detail/summary cache window at 5-15s — both hard upper bounds from Clarifications, not tunable beyond that range without a spec change.

**Scale/Scope**: Confined to the MCP connector's own request paths: `server/src/http/middleware/mcpAuth.ts`, `server/src/http/routes/mcp.ts`, `server/src/adapters/firebase/FirestoreRetrospectiveReadAdapter.ts`, `server/src/application/ports/mcp.ts`, `server/src/application/use-cases/mcp/GetRetrospectiveDetail.ts`, `server/src/application/use-cases/mcp/GetRetrospectiveSummary.ts`. No other feature area (board join/real-time, dashboard, auth, profile) is touched — feature 040's mitigations there remain untouched and in place.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Gate |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Every behavior change (auth-cache hit/miss/invalidation, backoff counter accumulate/reset/expire, `listCards` dedup, batched `listRetrospectivesForUser`, detail/summary cache hit/miss/expiry) MUST have a failing test written first, per `/speckit-tasks`' task ordering | PASS |
| II. Library-First | The connection-authorization cache and the detail/summary result cache are both decoupled uses of the existing `InMemoryTtlCache<K,V>` generic (feature 040) — no new bespoke caching module is introduced; the failed-attempt backoff is a small, independently testable counter/window structure alongside it | PASS |
| III. Prefer Proven Third-Party Libraries | No new dependency added. The existing `express-rate-limit` package continues to back the identity-keyed `toolLimiter` (`FR-003`); the failed-attempt backoff reuses the same `mcpTokenKeyGenerator`-style resolved-identity-with-IP-fallback pattern `tokenLimiter` already established in `mcp.ts` for a different limiter | PASS |
| IV. SOLID | `mcpAuthMiddleware` and `RetrospectiveReadPort`'s Firestore implementation are modified internally; their public shapes (`McpAuthDeps`, `RetrospectiveReadPort`) are unchanged, so `mcp.ts`'s route handlers and `buildMcpToolServer` continue depending only on the existing interfaces | PASS |
| V. Simplicity (KISS + YAGNI) | Every mechanism here is a bounded, per-instance TTL cache or counter reusing an existing generic — no new infrastructure, no cross-instance coordination (Redis) is introduced, consistent with feature 040's own precedent that cross-instance consistency was deliberately rejected for the analogous profile cache | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | All new logic (cache reuse, backoff decision, dedup, batching) is pure/injectable-double-testable and gets Vitest coverage under the existing `server/vitest.config.ts` floor; no new file needs a coverage exclusion | PASS |
| VII. E2E Testing with Playwright | `e2e/mcp-connector.spec.ts` extends to cover Story 2/3's real-Firestore-adapter behavior (dedup, batching, cache) against the emulator — the only verification path for that adapter per established convention; `server/test/http/routes/mcpTools.test.ts` (fake-port, Vitest) continues asserting response shape and access-control correctness are unchanged (`SC-006`) | PASS |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | N/A — no user-facing surface is added or modified | N/A |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | N/A — no visual design, layout, or motion decision is made by this feature | N/A |

No violations. Complexity Tracking is empty — nothing here departs from the simplest sufficient solution.

**Post-Phase-1 re-check**: `research.md`, `data-model.md`, `contracts/mcp-backoff-response.md`, and `quickstart.md` confirm the design introduces zero new dependencies, stays behind the existing `McpAuthDeps`/`RetrospectiveReadPort` interfaces, and changes no successful-call response shape (`FR-007`) — only the new backoff path gets a newly-documented error response. All applicable gates remain PASS after Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/041-reduce-mcp-firestore-reads/
├── plan.md                          # This file (/speckit-plan command output)
├── research.md                      # Phase 0 output (/speckit-plan command)
├── data-model.md                    # Phase 1 output (/speckit-plan command)
├── quickstart.md                    # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── mcp-backoff-response.md      # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md              # /speckit-specify quality checklist
└── tasks.md                         # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/server/src/
├── http/
│   ├── middleware/
│   │   └── mcpAuth.ts                     # Story 1 (FR-001, FR-002): wraps the
│   │                                        # existing live getConnectionById() read
│   │                                        # with a short-TTL (5-10s) InMemoryTtlCache
│   │                                        # keyed by connectionId; adds the
│   │                                        # failed-attempt backoff counter (keyed
│   │                                        # by client_id, falling back to IP) ahead
│   │                                        # of token verification
│   └── routes/
│       └── mcp.ts                         # Story 1 (FR-003): toolLimiter's
│                                            # keyGenerator changes from IP-only to
│                                            # the resolved authenticated identity
│                                            # (res.locals.mcpAuth.sub, available
│                                            # because mcpAuthMiddleware already runs
│                                            # first), mirroring tokenLimiter's
│                                            # existing per-identity pattern
├── adapters/
│   └── firebase/
│       ├── FirestoreRetrospectiveReadAdapter.ts  # Story 2 (FR-004): listSentimentResults
│       │                                            # accepts already-fetched cardIds
│       │                                            # instead of re-calling listCards();
│       │                                            # Story 2 (FR-005): listRetrospectivesForUser's
│       │                                            # per-id .doc().get() loop replaced
│       │                                            # with a single batched read (Admin
│       │                                            # SDK getAll(), chunked at 30 like
│       │                                            # listSentimentResults already does);
│       │                                            # Story 3 (FR-008): detail/summary
│       │                                            # assembly wrapped with a short-TTL
│       │                                            # (5-15s) InMemoryTtlCache keyed by
│       │                                            # retrospectiveId
│       └── FirestoreMcpConnectionAdapter.ts      # Unchanged shape — still the
│                                                    # source of truth on cache miss
├── application/
│   ├── ports/
│   │   └── mcp.ts                          # Story 2 (FR-004): RetrospectiveReadPort.
│   │                                         # listSentimentResults's parameter changes
│   │                                         # from retrospectiveId to cardIds: string[]
│   └── use-cases/mcp/
│       ├── GetRetrospectiveDetail.ts       # Story 2 (FR-004): passes the cards it
│       │                                     # already fetched (cards.map(c => c.id))
│       │                                     # to listSentimentResults instead of
│       │                                     # letting it re-derive them
│       └── GetRetrospectiveSummary.ts      # Same change, mirrored
└── adapters/
    └── cache/
        └── InMemoryTtlCache.ts             # Reused as-is (feature 040) — no changes

retro-rocket/server/test/
├── http/
│   ├── middleware/
│   │   └── mcpAuth.test.ts                 # Extended (Story 1): cache-hit avoids a
│   │                                         # second getConnectionById() call; backoff
│   │                                         # counter accumulates/resets/expires,
│   │                                         # keyed by client_id with IP fallback;
│   │                                         # revoke-during-cache-window edge case
│   └── routes/
│       ├── mcpTools.test.ts                # Extended (Story 1): toolLimiter now
│       │                                     # keyed by identity, not IP
│       └── mcpToken.test.ts                # Regression: tokenLimiter behavior
│                                             # unchanged (not touched by this feature)
└── application/use-cases/mcp/
    ├── GetRetrospectiveDetail.test.ts       # Extended (Story 2): asserts
    │                                         # listSentimentResults is called with the
    │                                         # cardIds already fetched, not a second
    │                                         # independent lookup
    └── GetRetrospectiveSummary.test.ts      # Same assertion, mirrored

retro-rocket/e2e/
└── mcp-connector.spec.ts                   # Extended (Story 2, Story 3): dedup
                                              # (a fresh card added between the direct
                                              # listCards and the internal
                                              # listSentimentResults call must not
                                              # appear twice or be missed), batched
                                              # list_retrospectives with >30 joined
                                              # boards, and cache-window behavior
                                              # (repeat detail/summary call within the
                                              # window vs. after it elapses) — the only
                                              # verification path for
                                              # FirestoreRetrospectiveReadAdapter.ts's
                                              # live query composition, per this
                                              # codebase's established convention
```

**Structure Decision**: Web application structure (existing Vite/React SPA + Express backend, unchanged split). Every change is a modification to an existing file already inside `server/src/http/` or `server/src/adapters/firebase/` — no new directories, no new adapters, no new ports. `InMemoryTtlCache` (feature 040) is reused, not extended. No frontend (`retro-rocket/src/`) files are touched.

## Complexity Tracking

*No entries — Constitution Check reported no violations.*
