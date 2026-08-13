# Phase 1 Data Model: Fix Redis Connection Error Noise

This feature introduces no persisted data or Firestore entities. Its "entities" are in-memory shapes describing Redis connection state for the purpose of structured logging (spec FR-001–FR-004, FR-007). Documented here per the plan template's data-model step; the authoritative field list also appears as the log schema in `contracts/redis-connection-logging.md`.

## RedisConnectionRole

Enum identifying which of the two long-lived connections a log entry concerns (`retrospective-wiring.ts` creates exactly one of each per warm serverless instance).

| Value | Meaning |
|---|---|
| `command` | The connection used for `SET`/`EVAL`/`PUBLISH` (lease acquire/renew/release, event publish). |
| `subscriber` | The connection used for `SUBSCRIBE`/`UNSUBSCRIBE` and receiving pub/sub messages. |

## RedisConnectionState

Enum tracked per connection (one instance of this state machine per `RedisConnectionRole`), mirroring the transition-only reporting idiom already used by `RedisFailOpenTracker`'s `BoardHealthState`.

| Value | Entered from `ioredis` event | Meaning |
|---|---|---|
| `connecting` | initial value at construction | No successful connect yet since this state machine was created. |
| `ready` | `'ready'` | Connection is established and usable. |
| `reconnecting` | `'reconnecting'` | A previously-established (or attempted) connection dropped and `ioredis`'s built-in retry loop is active. |
| `errored` | `'error'` | Most recent connection/retry attempt failed. (`ioredis` may emit `'error'` and `'reconnecting'` together per attempt; `errored` is the state used for log content, `reconnecting`/`errored` are collapsed into one "unhealthy" bucket for transition purposes — see Validation rule below.) |
| `ended` | `'end'` | `ioredis` has stopped retrying entirely (e.g. `.disconnect()` called, or `maxRetriesPerRequest`/retry strategy gave up). Terminal for the process lifetime of that client instance. |

**Validation / transition rule**: a new log line is emitted only when the *bucket* changes, where the bucket is `healthy` (`ready`) vs. `unhealthy` (`connecting` after the first failure, `reconnecting`, `errored`) vs. `ended`. Consecutive `error`/`reconnecting` events while already in the `unhealthy` bucket update the retained "last error" detail for the eventual transition-out log but do not themselves emit a new log line. This directly implements spec FR-003 (bounded volume) using the same collapsing approach `RedisFailOpenTracker` already applies to per-board health.

## RedisConnectionLogEvent

The structured payload passed to `LoggerPort` on each state transition (see `contracts/redis-connection-logging.md` for the exact field contract and example log lines).

| Field | Type | Notes |
|---|---|---|
| `role` | `RedisConnectionRole` | Which connection. |
| `state` | `RedisConnectionState` | The state being entered. |
| `previousState` | `RedisConnectionState` | The state being left; omitted on the very first transition out of `connecting`. |
| `errorCode` | `string \| undefined` | Node/`ioredis` error `code` (e.g. `ETIMEDOUT`, `ENOTFOUND`), present only when `state` is `errored`/`reconnecting`. |
| `errorMessage` | `string \| undefined` | Human-readable message, present only when `state` is `errored`/`reconnecting`. |
| `attempts` | `number \| undefined` | Count of consecutive failed attempts collapsed into the current `unhealthy` bucket; incremented internally without emitting a log line per FR-003, surfaced once on the eventual transition-out log so the operator knows how long the outage lasted. |

No relationships to other entities — this state lives entirely in-process, is not persisted, and is discarded on cold start (a new pair of `RedisConnectionState` instances is created each time `buildRealtimeGateway` runs).
