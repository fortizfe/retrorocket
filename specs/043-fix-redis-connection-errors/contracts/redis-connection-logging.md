# Contract: Redis Connection Log Events (internal, operator-facing)

Not a client-facing API — this is the structured-logging contract between the backend's Redis wiring (`server/src/http/retrospective-wiring.ts` and the new connection-observability module under `server/src/adapters/firebase/redis/`) and whoever reads production logs (`vercel logs`), replacing the current raw `[ioredis] Unhandled error event` fallback text. Companion to `specs/040-optimize-firebase-calls/contracts/redis-coordination-protocol.md`, which this does not modify.

## Emitting rule

One `LoggerPort` call per connection **state-transition** (see `data-model.md`'s `RedisConnectionState` bucket rule), never per raw `ioredis` retry attempt. Two independent state machines exist per warm serverless instance — one for the `command` connection, one for the `subscriber` connection — so at most two log lines are produced for a single simultaneous outage of both.

## Log entries

All entries use the existing `LoggerPort` (`server/src/application/ports/observability/index.ts`), which currently writes structured JSON via the stdout adapter — this is what Vercel's runtime logs already capture and what `vercel logs --json` already parses, so no new log pipeline is introduced.

### `redis_connection_configured` (once, at client construction, `info`)

Emitted immediately after each `ioredis` client is constructed, before any connection attempt result is known. Exists to answer Research §1 ("did we even get a parseable host") from the very next deploy, without ever logging credentials.

| Field | Example |
|---|---|
| `role` | `"command"` |
| `resolvedHost` | `"climbing-mantis-12345.upstash.io"` (host only — never the password or full connection string) |
| `resolvedPort` | `6379` |
| `tls` | `true` |

If the configured `REDIS_URL` does not parse into a usable host/port at all, this event's `resolvedHost`/`resolvedPort` are omitted and a `parseError: true` field is included instead — this alone would confirm Research §1's "genuine misconfiguration" branch.

### `redis_connection_unhealthy` (transition into the `unhealthy` bucket, `warn`)

| Field | Example |
|---|---|
| `role` | `"command"` |
| `state` | `"errored"` or `"reconnecting"` |
| `previousState` | `"ready"` |
| `errorCode` | `"ETIMEDOUT"` |
| `errorMessage` | `"connect ETIMEDOUT"` |

### `redis_connection_recovered` (transition back to `ready` from `unhealthy`, `info`)

| Field | Example |
|---|---|
| `role` | `"command"` |
| `attempts` | `14` (how many failed attempts were collapsed while unhealthy) |
| `unhealthyForMs` | `31200` |

### `redis_connection_ended` (transition to `ended`, `error`)

Terminal for that client instance's lifetime — `ioredis` has stopped retrying entirely.

| Field | Example |
|---|---|
| `role` | `"subscriber"` |
| `previousState` | `"reconnecting"` |

## Explicit non-goals

- Does not change the `board-owner:*` / `board-events:*` Redis protocol itself (`redis-coordination-protocol.md` §1-5 unchanged).
- Does not introduce a new metrics/tracing backend — reuses the existing `LoggerPort`/`MetricsPort` seam; adding `MetricsPort.increment` calls alongside these log events is allowed as a natural follow-up but is not required to satisfy this feature's functional requirements.
- Does not change what `CoordinatedRealtimeGatewayAdapter`/`RedisFailOpenTracker` do with a failed operation (their existing fail-open behavior, per `redis-coordination-protocol.md`'s Failure semantics, is unchanged — this contract only governs what gets logged about the underlying connections).
