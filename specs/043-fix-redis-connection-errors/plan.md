# Implementation Plan: Fix Redis Connection Error Noise

**Branch**: `043-fix-redis-connection-errors` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/043-fix-redis-connection-errors/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Production logs show recurring raw `[ioredis] Unhandled error event: Error: connect ETIMEDOUT` lines attached to unrelated request paths, caused by the two long-lived `ioredis` connections in `retrospective-wiring.ts` (command + subscriber, created once per warm serverless instance) having no `error` listener registered — every socket failure falls through to `ioredis`'s own noisy fallback logger. The fix: attach `error`/`reconnecting`/`ready`/`end` listeners routed through the existing `LoggerPort`, collapsed to one structured log line per connection *state transition* (not per raw retry, matching the transition-only idiom `RedisFailOpenTracker` already uses for board health), plus a one-time redacted-host log at construction to resolve whether `REDIS_URL` itself is malformed. The existing fail-open coordination behavior (`CoordinatedRealtimeGatewayAdapter`, `RedisFailOpenTracker`) is unchanged — this is purely an observability fix at the connection layer, extracted into a new small, unit-testable module so `retrospective-wiring.ts` stays thin per this codebase's existing coverage-exclusion convention.

## Technical Context

**Language/Version**: TypeScript (strict mode), Node.js (Vercel Functions runtime, Node 22.x per `vercel project ls`)

**Primary Dependencies**: `ioredis@^6.0.0` (already in use, no new dependency), Express (existing HTTP layer), `firebase-admin`, this repo's own `LoggerPort`/stdout observability adapter

**Storage**: N/A — Redis here is ephemeral cross-instance coordination state (leases + pub/sub), not primary storage (Firestore remains primary); this feature touches no persisted data

**Testing**: Vitest (`server/vitest.config.ts`, unit) for the new connection-observability module; existing Playwright E2E (`e2e/concurrent-board-network.spec.ts`) re-run to confirm no regression to fail-open behavior — no new E2E scenario needed since no user-facing flow changes

**Target Platform**: Vercel serverless Function (`api/index.ts`, single entry, `maxDuration: 300`), Fluid Compute warm-instance reuse — this is *why* the bug is visible (one pair of `ioredis` clients created at cold start, background reconnect errors logged under whatever request happens to be in flight later)

**Project Type**: web-service (existing single-repo layout: `server/src` backend, `api/` Vercel entry, `src/` frontend — no new top-level project)

**Performance Goals**: N/A — no throughput/latency target; the goal is bounded log volume (does not scale with unrelated request traffic) during a Redis outage, not speed

**Constraints**: Must not change the client-facing WS/REST contracts or the `board-owner:*`/`board-events:*` Redis protocol (`redis-coordination-protocol.md` explicitly out of scope); must not regress the existing fail-open behavior; must never log Redis credentials, only host/port

**Scale/Scope**: Exactly two long-lived connections per warm serverless instance (`command`, `subscriber`); change surface is `server/src/http/retrospective-wiring.ts` (wiring only) plus one new module under `server/src/adapters/firebase/redis/`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Assessment |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Applies | New state-transition/logging logic is extracted into a dedicated module specifically so it CAN be test-first (red-green-refactor against a fake event-emitter double), matching `RedisBoardCoordinationAdapter.test.ts`'s existing pattern. PASS (design enables compliance; enforced during `/speckit-implement`). |
| II. Library-First | Applies | New capability (connection-state observability) is its own module (`server/src/adapters/firebase/redis/`) with a narrow public interface, wired in afterward — not built inline in the wiring file. PASS. |
| III. Prefer Proven Third-Party Libraries | Applies | No new dependency introduced; reuses `ioredis`'s existing public event API and this repo's own `LoggerPort`. PASS. |
| IV. SOLID | Applies | New module depends on a narrow interface (the subset of `ioredis`'s `EventEmitter` surface actually used: `on('error'\|'reconnecting'\|'ready'\|'end')`), not the concrete `Redis` type — mirrors why `RedisLike` exists. PASS. |
| V. Simplicity (KISS/YAGNI) | Applies | Reuses `RedisFailOpenTracker`'s existing transition-only reporting idiom rather than inventing a new debouncing mechanism; no new config surface; no connectTimeout/retryStrategy tuning added speculatively (deferred pending what the new logging actually reveals). PASS. |
| VI. Coverage Floor (NON-NEGOTIABLE) | Applies | New module is pure/injectable and unit-tested; `retrospective-wiring.ts` remains in the existing, already-justified coverage exclusion list (thin composition glue). PASS. |
| VII. E2E Playwright (NON-NEGOTIABLE) | Applies | No new user-facing flow; existing `e2e/concurrent-board-network.spec.ts` re-run to confirm fail-open behavior (spec User Story 2) is unaffected. PASS. |
| VIII. WCAG 2.1 AA (NON-NEGOTIABLE) | N/A | No user-facing surface is added or modified (backend logging only). |
| IX. Apple-Inspired Design & Motion | N/A | No frontend/visual/animation work. |

No violations — Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/043-fix-redis-connection-errors/
├── plan.md                                    # This file
├── research.md                                # Phase 0 output
├── data-model.md                               # Phase 1 output
├── quickstart.md                               # Phase 1 output
├── contracts/
│   └── redis-connection-logging.md             # Phase 1 output
├── checklists/
│   └── requirements.md                         # From /speckit-specify
└── tasks.md                                    # Phase 2 output (/speckit-tasks — not this command)
```

### Source Code (repository root)

Existing single-repo web-service layout (`retro-rocket/`) — no new top-level project, no frontend change:

```text
retro-rocket/
├── api/
│   └── index.ts                                          # Vercel serverless entry (unchanged)
├── server/
│   ├── src/
│   │   ├── http/
│   │   │   └── retrospective-wiring.ts                    # EDIT: attach new observability module to both ioredis clients
│   │   ├── adapters/firebase/redis/
│   │   │   ├── RedisLike.ts                                # unchanged
│   │   │   ├── RedisBoardCoordinationAdapter.ts             # unchanged
│   │   │   ├── CoordinatedRealtimeGatewayAdapter.ts         # unchanged
│   │   │   ├── RedisFailOpenTracker.ts                      # unchanged (pattern reused, not modified)
│   │   │   └── RedisConnectionObservability.ts              # NEW: state machine + LoggerPort integration (contracts/redis-connection-logging.md)
│   │   └── application/ports/observability/index.ts        # LoggerPort (reused, unchanged)
│   └── test/adapters/firebase/redis/
│       └── RedisConnectionObservability.test.ts             # NEW unit tests
└── e2e/
    └── concurrent-board-network.spec.ts                     # re-run only, not modified — regression check
```

**Structure Decision**: Single-project web-service structure (this repo's existing `server/src` + `api/` + `e2e/` layout). No new project, package, or top-level directory. The change is additive within the existing `adapters/firebase/redis/` module family, following the same narrow-interface/unit-tested pattern already used by its siblings, with the one existing wiring file (`retrospective-wiring.ts`) edited only to call the new module — consistent with its documented "thin composition glue" role.

## Complexity Tracking

> No Constitution Check violations — this section is not applicable.
