---

description: "Task list for Fix Redis Connection Error Noise"
---

# Tasks: Fix Redis Connection Error Noise

**Input**: Design documents from `/specs/043-fix-redis-connection-errors/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/redis-connection-logging.md, quickstart.md

**Tests**: Per the project constitution (Principle I, TDD, NON-NEGOTIABLE), tests are included and MUST be written and failing before their corresponding implementation task.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- File paths are relative to the repository root (`/Users/fortizfe/Repositories/retrorocket/`)

---

## Phase 1: Setup

**Purpose**: Confirm the baseline this feature builds on before any new code is written

- [X] T001 Confirm branch `043-fix-redis-connection-errors` is checked out, `npm install` is up to date at the repo root, and `ioredis` in `retro-rocket/package.json` is still `^6.0.0` with no new dependency required (per research.md §4 — no migration to `@upstash/redis`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types both the test and implementation tasks in User Story 1 depend on

**⚠️ CRITICAL**: Must complete before any User Story 1 task

- [X] T002 Define `RedisConnectionRole`, `RedisConnectionState`, and `RedisConnectionLogEvent` per data-model.md in `retro-rocket/server/src/adapters/firebase/redis/redisConnectionTypes.ts`

**Checkpoint**: Foundation ready — User Story 1 implementation can now begin

---

## Phase 3: User Story 1 - Clean, actionable production logs (Priority: P1) 🎯 MVP

**Goal**: Replace the raw `[ioredis] Unhandled error event` stack traces currently flooding production logs with bounded, structured log entries that identify which connection failed and why, per `contracts/redis-connection-logging.md`.

**Independent Test**: Point the dev server at an unreachable Redis host (quickstart.md Scenario B) and confirm the resulting logs are a small, bounded set of structured `redis_connection_*` entries — not a growing stream of raw driver stack traces — while the process stays up and continues serving requests.

### Tests for User Story 1 ⚠️

> Write these tests FIRST; confirm they FAIL before starting the corresponding implementation task.

- [X] T003 [P] [US1] Unit test for `redactRedisUrl()` in `retro-rocket/server/test/adapters/firebase/redis/redactRedisUrl.test.ts`: valid `redis://`/`rediss://` URLs resolve to `{ host, port, tls }`; malformed input (including a JSON-blob shape like the one observed in `vercel env ls` for production `REDIS_URL`) resolves to `{ parseError: true }`; the returned value never contains credentials
- [X] T004 [P] [US1] Unit test for `attachRedisConnectionLogging()` in `retro-rocket/server/test/adapters/firebase/redis/RedisConnectionObservability.test.ts`, driving a fake event-emitter double (matching the `RedisBoardCoordinationAdapter.test.ts` fake-double pattern) and a fake `LoggerPort`, asserting: (a) exactly one `redis_connection_configured` info log at construction; (b) a run of consecutive `error`/`reconnecting` events collapses into exactly one `redis_connection_unhealthy` warn log carrying the latest `errorCode`/`errorMessage`; (c) the transition back to `ready` emits exactly one `redis_connection_recovered` info log with the correct `attempts` count; (d) an `end` event emits one `redis_connection_ended` error log; (e) no call ever reaches `console`/the raw `ioredis` fallback logger

### Implementation for User Story 1

- [X] T005 [P] [US1] Implement `redactRedisUrl(url: string | undefined)` in `retro-rocket/server/src/adapters/firebase/redis/redactRedisUrl.ts` per `contracts/redis-connection-logging.md`'s `redis_connection_configured` fields, using the types from T002 (makes T003 pass)
- [X] T006 [US1] Implement the connection state machine and `attachRedisConnectionLogging(client, role, logger, redisUrl)` in `retro-rocket/server/src/adapters/firebase/redis/RedisConnectionObservability.ts`, depending on a narrow `on('error'|'reconnecting'|'ready'|'end', …)` interface (not the concrete `ioredis.Redis` type) and using `redactRedisUrl` from T005 for the construction-time log, implementing the transition-collapsing rule from data-model.md (makes T004 pass) — depends on T004, T005
- [X] T007 [US1] Call `attachRedisConnectionLogging()` for both the `commandClient` and `subscriberClient` in `buildRealtimeGateway()`, `retro-rocket/server/src/http/retrospective-wiring.ts`, passing the existing `LoggerPort` and `redisUrl` — depends on T006
- [X] T008 [US1] Manually verify quickstart.md Scenario B (`REDIS_URL` pointed at an unreachable host) and Scenario C (local healthy Redis via `docker run redis:7`) against `npm run dev:server`, confirming bounded structured logs replace the raw fallback text and the dev server stays up — depends on T007

**Checkpoint**: User Story 1 is fully functional and independently testable — the reported log-noise symptom is fixed.

---

## Phase 4: User Story 2 - Real-time board coordination keeps working during Redis instability (Priority: P2)

**Goal**: Confirm the existing fail-open coordination behavior (`CoordinatedRealtimeGatewayAdapter`, `RedisFailOpenTracker`) is unmodified and unregressed by User Story 1's changes.

**Independent Test**: With Redis intentionally unreachable, exercise a retrospective board's real-time flows end-to-end and confirm updates still propagate via the existing direct-Firestore fallback, and that coordination resumes when Redis becomes reachable again.

- [X] T009 [US2] Run `npx playwright test e2e/concurrent-board-network.spec.ts` (quickstart.md Scenario E) from `retro-rocket/` against the branch with T007's wiring change applied; confirm it passes unchanged with no code modifications to `CoordinatedRealtimeGatewayAdapter.ts`/`RedisFailOpenTracker.ts` — depends on T007

**Checkpoint**: Both user stories validated — logging is fixed (US1) and coordination fail-open/recovery behavior is confirmed unregressed (US2).

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final verification before merge, and closing the root-cause question from research.md §1

- [X] T010 [P] Run `npm run test:server:coverage` from `retro-rocket/` and confirm the thresholds in `retro-rocket/server/vitest.config.ts` (80% branches, 68% functions, 74% lines, 74% statements) are still met with the new files included
- [X] T011 [P] Run `npm run lint` and `npm run type-check:server` from `retro-rocket/` across all changed/added files
- [ ] T012 Deploy to a Vercel preview and run quickstart.md Scenario D (`vercel logs --project retro-rocket --query "redis_connection" --json`) to read the `redis_connection_configured` log and resolve research.md §1's open question (CLI display artifact vs. genuine `REDIS_URL` misconfiguration vs. network block); if it reveals a genuine misconfiguration, re-provision/re-link the Upstash `REDIS_URL` value via the Vercel dashboard/CLI as a follow-up operational action (not a code change)
- [ ] T013 Run all of quickstart.md's scenarios (A-E) end-to-end as final sign-off before merge

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS User Story 1
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on T007 (User Story 1's wiring change) being in place, since it verifies no regression to that same change — not independent of US1 for this feature, because US2 has no code of its own to implement in isolation
- **Polish (Phase 5)**: Depends on Phases 3 and 4 both being complete

### Within User Story 1

- T003 and T004 (tests) can be written in parallel — different files
- T005 can be implemented in parallel with T004 (different files), but must land before T006
- T006 depends on both T004 (its own failing test) and T005 (the function it calls)
- T007 depends on T006
- T008 depends on T007

### Parallel Opportunities

- T003 and T004 (test-writing) can run in parallel
- T005 can run in parallel with T004
- T010 and T011 (Polish) can run in parallel with each other

---

## Parallel Example: User Story 1

```bash
# Write both failing tests together:
Task: "Unit test for redactRedisUrl() in retro-rocket/server/test/adapters/firebase/redis/redactRedisUrl.test.ts"
Task: "Unit test for attachRedisConnectionLogging() in retro-rocket/server/test/adapters/firebase/redis/RedisConnectionObservability.test.ts"

# Implement the pure redaction helper while the observability test is still being written:
Task: "Implement redactRedisUrl() in retro-rocket/server/src/adapters/firebase/redis/redactRedisUrl.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 — this alone resolves the reported symptom (noisy production logs)
4. **STOP and VALIDATE**: run quickstart.md Scenarios A-C
5. Deploy to preview and confirm via Scenario D

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. User Story 1 → validate independently → this is the MVP fix for the reported bug
3. User Story 2 → regression check (no independent deploy value on its own, but required before merging US1's change with confidence)
4. Polish → coverage/lint sign-off + production log verification of the root cause

---

## Notes

- This feature has one primary implementation story (US1); US2 is a regression-verification story over existing, unmodified code, so it is sequenced after US1's wiring task rather than in parallel with it.
- Commit after each task or logical group.
- Never log Redis credentials — only host/port (see `redactRedisUrl`, T005).
- `retrospective-wiring.ts` and `CoordinatedRealtimeGatewayAdapter.ts` remain in `server/vitest.config.ts`'s existing coverage-exclusion list; do not remove them from it as part of this feature (T007 only adds a two-line call, no new branching logic in that file).
