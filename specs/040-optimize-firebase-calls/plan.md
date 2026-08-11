# Implementation Plan: Optimize Backend-to-Firestore Call Volume

**Branch**: `040-optimize-firebase-calls` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/040-optimize-firebase-calls/spec.md`

## Summary

The backend runs as a Vercel serverless Function (Fluid Compute) whose per-instance Firestore usage multiplies with the number of concurrently active instances, which recently tripped Firestore's undocumented Spark-plan anti-abuse throttle during a routine ~40% traffic spike (`RESOURCE_EXHAUSTED`, confirmed to be well under the documented daily quota). This plan implements the spec's three independently-shippable stories, in priority order: (P1) deduplicate the redundant Firestore reads inside the board-join/reconnection cycle (up to 4 reads → 1) and add a short-TTL in-memory profile cache; (P2) make the `typingStatus` background sweep event-driven instead of an unconditional 500ms poll; (P3) coordinate real-time Firestore listener ownership across concurrently active instances via a Redis (Upstash, Vercel Marketplace free tier) lease + pub/sub relay, so exactly one instance holds each board's Firestore listeners regardless of instance count, with a fail-open fallback to today's per-instance behavior if Redis is temporarily unreachable.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, ES2022 target), Node.js on Vercel Fluid Compute

**Primary Dependencies**: Express 5, `firebase-admin` 14 (Firestore Admin SDK), `ws` 8 (WebSocket server), `zod` (existing validation). New for Story 3 only: `ioredis` (RESP client, connects to Upstash Redis's standard Redis-protocol endpoint — see research.md §4 for why the REST-only `@upstash/redis` SDK is insufficient here).

**Storage**: Firestore (Firebase Admin SDK) remains the sole system of record — no schema/document changes. New for Story 3 only: Redis (Upstash via Vercel Marketplace, free tier) holding purely ephemeral coordination state (ownership leases + pub/sub channels), never durable application data — see data-model.md and contracts/redis-coordination-protocol.md.

**Testing**: Vitest (`server/vitest.config.ts`, node environment, thresholds branches 80/functions 68/lines 74/statements 74 — Constitution Principle VI) for pure logic (dedup call-graph changes, cache TTL/eviction, lease-renewal decision logic); Playwright E2E against the Firebase emulator (Constitution Principle VII) extending `e2e/concurrent-board-network.spec.ts`/`e2e/concurrent-board-session.spec.ts` for cross-instance real-time delivery. Firestore-adapter-level composition (raw `onSnapshot`/query wiring) is, consistent with every existing adapter in this codebase, verified via the emulator-backed E2E suite rather than mocked at the Vitest level; the new Redis adapter files follow the same convention and must be added to `server/vitest.config.ts`'s `coverage.exclude` list alongside the existing `*-wiring.ts` entries. Story 3's E2E coverage additionally requires a Redis instance available during test execution — `.github/workflows/ci.yml`'s `e2e` job currently provisions only the Firebase emulators (`--only auth,firestore`), so a Redis service container must be added there as part of this feature, not assumed to already exist (found during `/speckit-analyze`; see tasks.md's dedicated Redis test-infrastructure task).

**Target Platform**: Vercel Functions, Fluid Compute, single region (`iad1`), `maxDuration: 300`s (`vercel.json`) — unchanged by this feature (Assumptions: forced ~5-minute reconnections are an accepted existing constraint, not something this feature removes).

**Project Type**: Web application — Vite/React SPA (`retro-rocket/src`) + Express backend (`retro-rocket/server/src`), bundled into one Vercel Function (`api/index.ts` → `api/_backend.mjs`). This feature is backend-only; no frontend code changes (`FR-010` forbids any user-visible behavior change).

**Performance Goals**: Reconnection cycle issues ≤1 read of the board's own record (`SC-001`); idle-board typing-status checks drop ≥70% (`SC-002`); no anti-abuse errors under a traffic increase matching the incident's magnitude (`SC-003`); exactly one active Firestore listener set per board regardless of concurrent instance count, verified with ≥3 concurrent instances (`SC-004`); no perceptible regression in real-time update latency (`SC-005`).

**Constraints**: Firebase remains on the Spark (free) plan — no solution may require enabling billing. Any new shared/external store must be Vercel-Marketplace-provisionable on a free tier (Redis/Upstash, per stakeholder preference). Zero user-visible behavior change is a hard constraint on Stories 1-2 (`FR-010`). Redis-coordination failure must fail open to today's existing (safe, already-shipped) per-instance behavior, never fail closed (`FR-008a`).

**Scale/Scope**: Confined to the retrospective board real-time feature's backend call path (`server/src/http/routes/retrospectives.ts`, `server/src/http/ws/realtimeUpgrade.ts`, `server/src/application/use-cases/retrospective/*`, `server/src/adapters/firebase/*`). No other feature area (dashboard, auth, MCP, sentiment) is touched.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Gate |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Every behavior change (dedup logic, cache TTL/invalidation, event-driven sweep scheduling, lease acquire/renew/release decision logic, fail-open fallback trigger) MUST have a failing test written first, per `/speckit-tasks`' task ordering | PASS |
| II. Library-First | The Redis coordination logic (lease management, pub/sub relay) MUST be designed as its own decoupled module behind the existing `RealtimeGatewayPort` interface — routes and the WS upgrade handler continue depending only on that port, never on `ioredis` directly | PASS |
| III. Prefer Proven Third-Party Libraries | `ioredis` is the one new dependency this feature adds — established, actively maintained, MIT-licensed, no capability duplicated in-repo (research.md §4 documents the evaluation) | PASS |
| IV. SOLID | `RealtimeGatewayPort` (Interface Segregation, already in place) is extended with a coordinated implementation, not modified in a way that breaks its existing consumers (`realtimeUpgrade.ts` depends only on the port); Firestore access stays behind adapters exactly as today | PASS |
| V. Simplicity (KISS + YAGNI) | Stories 1-2 add zero new dependencies or infrastructure — pure refactors of existing call graphs plus a per-instance `Map` cache. Story 3's Redis dependency is confirmed-necessary (not speculative) per the source investigation and is scoped to a single-key lease + one pub/sub channel per board, deliberately rejecting heavier options (Redlock multi-node consensus, a second external database) — see Complexity Tracking below and research.md §5 | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | New pure-logic units (cache TTL/eviction, lease acquire/renew/release decisions, fail-open trigger/recovery, event-driven sweep scheduling) get Vitest coverage; thin Redis/Firestore wiring follows the same documented precedent as existing `*-wiring.ts` files (excluded from coverage, exercised by E2E) — coverage floor in `server/vitest.config.ts` must not drop | PASS |
| VII. E2E Testing with Playwright | New coverage extends `e2e/concurrent-board-network.spec.ts`/`e2e/concurrent-board-session.spec.ts` for cross-instance real-time delivery (Story 3) and `e2e/board-join.spec.ts` for reconnection-cycle read-count behavior where externally observable (Story 1) | PASS |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | N/A — no user-facing surface is added or modified; `FR-010` explicitly forbids any UI change | N/A |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | N/A — no visual design, layout, or motion decision is made by this feature | N/A |

No unjustified violations. See Complexity Tracking for the one deliberate, justified addition (Redis, Story 3 only).

**Post-Phase-1 re-check**: `research.md`, `data-model.md`, `contracts/redis-coordination-protocol.md`, and `quickstart.md` confirm the design stays behind `RealtimeGatewayPort`, introduces exactly one new dependency (`ioredis`) scoped to Story 3, changes no public/client-facing contract (`FR-009`, `FR-010`), and defines an explicit fail-open path (`FR-008a`) rather than a new failure mode. All applicable gates remain PASS after Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/040-optimize-firebase-calls/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── redis-coordination-protocol.md   # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/server/src/
├── application/
│   ├── ports/
│   │   ├── realtime.ts                      # RealtimeGatewayPort — unchanged
│   │   │                                      # shape; gains no new public
│   │   │                                      # method (register/unregister
│   │   │                                      # stay the only entry points)
│   │   ├── profile.ts                       # ProfilePort — unchanged shape
│   │   └── typing.ts                        # TypingStatusPort — loses
│   │                                          # listActive() (FR-011, dead code)
│   └── use-cases/
│       ├── retrospective/
│       │   └── JoinRetrospective.ts         # Story 1: pass the board it
│       │                                      # already fetched through to
│       │                                      # join() instead of letting the
│       │                                      # adapter re-fetch it
│       └── profile/
│           └── EnsureUserProfile.ts         # Story 1: reads through the new
│                                              # profile cache decorator
├── adapters/
│   └── firebase/
│       ├── FirestoreRetrospectiveBoardAdapter.ts  # Story 1: join() accepts/
│       │                                            # reuses the caller's
│       │                                            # already-fetched board
│       │                                            # doc instead of a second
│       │                                            # boardRef.get()
│       ├── FirestoreProfileAdapter.ts             # Story 1: gains (or is
│       │                                            # wrapped by) the 60s
│       │                                            # per-instance profile
│       │                                            # cache, with explicit
│       │                                            # invalidation on rename
│       ├── FirestoreRealtimeGatewayAdapter.ts     # Story 2: sweep becomes
│       │                                            # event-driven, scheduled
│       │                                            # from the typingStatus
│       │                                            # onSnapshot callback
│       │                                            # instead of setInterval.
│       │                                            # Story 3: split into the
│       │                                            # "owner" (Firestore→
│       │                                            # Redis publish) and
│       │                                            # "subscriber" (Redis→
│       │                                            # local connections) roles
│       │                                            # described in research.md
│       │                                            # §5-§7
│       ├── FirestoreTypingStatusAdapter.ts         # FR-011: listActive()
│       │                                            # removed
│       └── redis/                                  # NEW (Story 3 only):
│           ├── RedisBoardCoordinationAdapter.ts    # Lease acquire/renew/
│           │                                        # release (incl. the
│           │                                        # periodic re-acquire
│           │                                        # check, contracts/redis-
│           │                                        # coordination-protocol.md
│           │                                        # §1 trigger (b)) + pub/
│           │                                        # sub publish/subscribe
│           └── CoordinatedRealtimeGatewayAdapter.ts # Composes
│                                                      # RedisBoardCoordinationAdapter
│                                                      # with the Firestore-
│                                                      # listener extraction
│                                                      # from FirestoreRealtimeGatewayAdapter.ts
│                                                      # to implement
│                                                      # RealtimeGatewayPort;
│                                                      # this is the class
│                                                      # actually wired in as
│                                                      # `realtimeGateway` when
│                                                      # Redis is configured
│                                                      # (retrospective-wiring.ts)
├── http/
│   ├── routes/
│   │   └── retrospectives.ts                # resolveDisplayName() unchanged
│   │                                          # signature; benefits from the
│   │                                          # cache transparently
│   ├── ws/
│   │   └── realtimeUpgrade.ts               # Unchanged public behavior;
│   │                                          # depends only on
│   │                                          # RealtimeGatewayPort, so Story
│   │                                          # 3's coordinated adapter is a
│   │                                          # drop-in replacement
│   ├── retrospective-wiring.ts              # Story 3: wires
│   │                                          # RedisBoardCoordinationAdapter
│   │                                          # + REDIS_URL config into the
│   │                                          # composition root, mirroring
│   │                                          # the existing *-wiring.ts
│   │                                          # pattern (excluded from
│   │                                          # coverage, same as today)
│   └── composition-root.ts                  # No structural change — still
│                                              # the single place adapters are
│                                              # selected
└── config/
    └── env.ts                                # Story 3: new optional
                                                 # REDIS_URL (or equivalent)
                                                 # config entry, absent =
                                                 # Story 3 disabled (falls back
                                                 # to today's uncoordinated
                                                 # FirestoreRealtimeGatewayAdapter,
                                                 # same pattern already used for
                                                 # other optional deps like
                                                 # authDeps)

retro-rocket/server/test/
├── adapters/firebase/
│   ├── FirestoreRetrospectiveBoardAdapter.test.ts   # Story 1 regression coverage
│   ├── FirestoreProfileAdapter.test.ts              # Story 1 cache coverage
│   ├── FirestoreRealtimeGatewayAdapter.test.ts      # Story 2 event-driven
│   │                                                  # sweep coverage
│   └── redis/
│       └── RedisBoardCoordinationAdapter.test.ts    # NEW — lease/pub-sub pure
│                                                      # decision logic (using
│                                                      # a Redis test double,
│                                                      # not a live Redis)
└── application/use-cases/retrospective/
    └── JoinRetrospective.test.ts                     # Story 1 dedup coverage

retro-rocket/e2e/
├── board-join.spec.ts                        # Story 1: reconnection-cycle
│                                                # coverage extension
├── concurrent-board-network.spec.ts          # Story 3: cross-instance
│                                                # real-time delivery coverage
│                                                # extension
└── concurrent-board-session.spec.ts          # Story 3: same, session-scoped
                                                 # variant
```

**Structure Decision**: Web application structure (existing Vite/React SPA + Express backend, unchanged split). Stories 1 and 2 are pure modifications to existing files under `server/src/adapters/firebase/` and `server/src/application/use-cases/`, no new directories. Story 3 adds exactly one new directory, `server/src/adapters/firebase/redis/` (kept under the existing `adapters/` tree since it is still a concrete adapter behind `RealtimeGatewayPort`, not a new architectural layer), plus one new wiring touch-point in the existing `retrospective-wiring.ts`/`env.ts` files. No frontend (`retro-rocket/src/`) files are touched by any story.

## Complexity Tracking

> One deliberate addition requires justification; everything else passes without exception.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New external dependency + infrastructure: Redis (Upstash) and the `ioredis` client, scoped to Story 3 | The structural root cause (`FR-006`/`FR-007`/`FR-008`) is that each backend instance independently opens its own Firestore listeners for the same board; Vercel's own WebSocket documentation states in-memory per-instance coordination is unreliable even under Fluid Compute and explicitly recommends an external store such as Redis for this exact pattern (research.md, source investigation §3) | Simply changing Vercel's deployment/compute mode was investigated directly against the project's live configuration and confirmed insufficient — the project already runs Fluid Compute (the most persistent option Vercel offers), and Vercel's own documentation states connections still have no cross-instance affinity even so. A same-process-only fix (e.g., a bigger in-memory cache) cannot solve a problem that is fundamentally about *coordinating across separate processes* |
