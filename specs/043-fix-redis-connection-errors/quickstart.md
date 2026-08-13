# Quickstart: Validating the Redis Connection Logging Fix

## Prerequisites

- Local checkout on branch `043-fix-redis-connection-errors` with the implementation applied.
- `npm install` already run at the repo root (`retro-rocket/`).
- For the local-Redis scenario: Docker (or any local `redis-server`) available to run a throwaway Redis instance.
- For the production-log scenario: Vercel CLI authenticated with access to the `retro-rocket` project (`vercel whoami`, `vercel project ls`), matching the access already confirmed during `/speckit-specify`.

## Scenario A — Unit-level: bounded, structured logging (fast, no network)

```bash
cd retro-rocket
npm run test:server -- RedisConnectionObservability
```

**Expected outcome**: the new unit test suite (see Phase 2 tasks) exercises a fake event-emitter double through `connecting → errored → reconnecting → errored → ready` and asserts:
- Exactly one `redis_connection_unhealthy` log call for the whole unhealthy run (not one per `error`/`reconnecting` event).
- Exactly one `redis_connection_recovered` log call on the transition back to `ready`, with `attempts` reflecting how many raw events were collapsed.
- No call ever reaches a raw `console.*`/`ioredis` fallback path — only `LoggerPort`.

## Scenario B — Local integration: real `ioredis` against an unreachable host

```bash
# From retro-rocket/, point REDIS_URL at a host that will time out (nothing listening):
REDIS_URL="redis://127.0.0.1:1" npm run dev:server
```

**Expected outcome**: within a few seconds, the dev server's stdout shows a single structured `redis_connection_unhealthy` JSON log line per connection (command + subscriber = at most 2 lines), not a growing stream of raw `[ioredis] Unhandled error event` stack traces. The process stays up and `/api/health` (or any route) continues to respond.

## Scenario C — Local integration: real `ioredis` against a working local Redis

```bash
docker run --rm -p 6379:6379 redis:7
REDIS_URL="redis://127.0.0.1:6379" npm run dev:server
```

**Expected outcome**: a single `redis_connection_configured` log line per connection at startup (host `127.0.0.1`, port `6379`, `tls: false`), no `redis_connection_unhealthy` lines. This also re-validates the existing coordination protocol still works end-to-end — exercise a retrospective board's real-time updates (per `e2e/concurrent-board-network.spec.ts`) to confirm no regression.

## Scenario D — Production log verification (the original reported symptom)

```bash
vercel logs --project retro-rocket --environment production --query "redis_connection" --since 24h --json
```

**Expected outcome, once deployed**:
- No more raw `[ioredis] Unhandled error event` lines for new traffic.
- A `redis_connection_configured` line confirms whether `REDIS_URL` parsed into a real host (resolves Research §1 — CLI display artifact vs. genuine misconfiguration vs. transient network issue).
- If still unhealthy, `redis_connection_unhealthy`/`redis_connection_recovered` lines show the actual outage pattern (frequency, duration) instead of an undifferentiated stack-trace stream.

## Scenario E — Fail-open regression check (spec User Story 2)

```bash
cd retro-rocket
npx playwright test e2e/concurrent-board-network.spec.ts
```

**Expected outcome**: passes unchanged — confirms real-time board updates still work via the direct-Firestore fallback path when Redis is unreachable, i.e. this feature's logging change did not alter `CoordinatedRealtimeGatewayAdapter`/`RedisFailOpenTracker` behavior (spec FR-005).
