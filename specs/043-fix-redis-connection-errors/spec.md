# Feature Specification: Fix Redis Connection Error Noise

**Feature Branch**: `043-fix-redis-connection-errors`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "Actualment hay algunos errores de ioredis en los logs de vercel. Quiero que te conectes a vercel, que obtengas los logs y que revises y corrijas el problema con redis."

## Evidence Gathered

Production runtime logs for the `retro-rocket` Vercel project (pulled via `vercel logs --environment production --query ioredis --since 24h`) show recurring entries of the form:

```
[ioredis] Unhandled error event: Error: connect ETIMEDOUT
    at TLSSocket.<anonymous> (.../ioredis/built/Redis.js:196:41)
```

Key observations from the sampled entries:

- The errors are logged as `level: info` (not `error`/`fatal`), so they don't currently trip alerting, but they do pollute request logs.
- They appear attached to unrelated request paths (e.g. `POST /api/retrospectives/{id}/typing`, `GET /api/auth/session`) that don't themselves invoke Redis — consistent with the two long-lived `ioredis` connections (`commandClient`, `subscriberClient` in `server/src/http/retrospective-wiring.ts`) being created once per warm serverless instance and firing background reconnect errors that get attributed to whichever request happens to be in flight at that moment.
- Neither `ioredis` client has an `error` listener registered, so every socket failure falls through to ioredis's own "Unhandled error event" fallback logger instead of the app's structured `LoggerPort`.
- The board-coordination logic that consumes these connections (`CoordinatedRealtimeGatewayAdapter`, `RedisFailOpenTracker`) already has a documented fail-open design: Redis operation timeouts and failures cause a board to fall back to direct, uncoordinated Firestore listeners rather than failing the request. So the user-facing feature (real-time board updates) is not confirmed broken by this evidence — the confirmed problem is unhandled, unstructured error logging from the underlying Redis client connections.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clean, actionable production logs (Priority: P1)

As the engineer operating retro-rocket, when Redis connectivity has a problem, I want the logs to show a single structured, leveled entry that clearly identifies the failing Redis connection and cause, instead of repeated raw driver stack traces attached to unrelated requests, so I can distinguish real incidents from noise and diagnose them quickly.

**Why this priority**: This is the directly reported symptom — noisy, misleading log entries — and the prerequisite for confirming whether a deeper connectivity issue exists at all.

**Independent Test**: Simulate/observe a Redis connection failure (e.g. temporarily unreachable host) and verify the resulting log output is a single structured entry per connection-state change (not one raw entry per retry attempt) tagged with a consistent event name and Redis role (command vs. subscriber connection), logged through the application's own logger rather than raw driver output.

**Acceptance Scenarios**:

1. **Given** the Redis host is unreachable, **When** either the command or subscriber `ioredis` client fails to connect, **Then** the failure is captured by an application-level error handler and emitted as one structured log entry via the existing `LoggerPort`, not the raw `[ioredis] Unhandled error event` fallback message.
2. **Given** a Redis client is reconnecting after a transient failure, **When** multiple consecutive reconnect attempts fail, **Then** the logs reflect this without unbounded duplicate stack-trace spam (e.g. rate-limited or deduplicated status logging).
3. **Given** Redis recovers after an outage, **When** the client reconnects successfully, **Then** a log entry confirms recovery so the earlier failure entries can be understood as resolved.

---

### User Story 2 - Real-time board coordination keeps working during Redis instability (Priority: P2)

As a retrospective board participant, I want real-time updates to keep working even if the backend's Redis connection is flaky, so a transient Redis issue never breaks my board experience.

**Why this priority**: Confirms the existing fail-open behavior is preserved (not regressed) by whatever change addresses the logging noise — this is a safety-net check, not the primary reported defect.

**Independent Test**: With Redis intentionally unreachable, exercise the retrospective board's real-time flows (card create/update, typing indicators) end-to-end and confirm updates still propagate via the existing direct-Firestore fallback path.

**Acceptance Scenarios**:

1. **Given** Redis is completely unreachable for a board's lifetime, **When** participants create/update cards, **Then** all connected participants still receive real-time updates via the fail-open direct delivery path.
2. **Given** Redis becomes reachable again mid-session, **When** the next coordination reconciliation tick runs, **Then** the board transitions back to coordinated (owner/subscriber) mode without dropping in-flight updates.

---

### Edge Cases

- What happens when the Redis host is unreachable for the entire lifetime of a warm serverless instance (repeated reconnect attempts across many requests)? Logging must stay bounded, not grow linearly with request volume.
- What happens when the connection fails during the initial cold-start client creation vs. failing later on an already-established connection? Both must be captured, not just one.
- What happens when only one of the two Redis connections (command vs. subscriber) fails while the other stays healthy? The log/diagnostic output must identify which one failed.
- How does the system behave if the underlying environment configuration for reaching Redis is itself invalid or missing required values? This must surface as a clear, actionable log entry rather than silent repeated timeouts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST attach an application-level handler to every Redis client connection so connection errors are never left to the underlying driver's default/fallback logging behavior.
- **FR-002**: The system MUST log Redis connection errors through the application's existing structured logging mechanism, including which logical connection (command vs. subscriber) failed and the underlying cause.
- **FR-003**: The system MUST NOT emit a duplicate raw log entry per individual low-level retry attempt when a Redis connection is persistently down; repeated failures for the same outage MUST be represented in a bounded way.
- **FR-004**: The system MUST log a distinct, clear event when a previously failing Redis connection recovers.
- **FR-005**: The system MUST continue to serve real-time board updates via the existing direct-Firestore fail-open path for the full duration Redis is unreachable, with no regression to that behavior.
- **FR-006**: The system MUST NOT crash or leave requests hanging as a result of a Redis connection error occurring in the background, independent of which request happens to be executing at that time.
- **FR-007**: The system MUST make the current health/reachability state of each Redis connection observable, distinguishing "root cause is invalid configuration" from "root cause is transient network failure," so the underlying source of the reported `ETIMEDOUT` errors can be confirmed as configuration vs. connectivity.

### Key Entities

- **Redis command connection**: The `ioredis` connection used for lease acquisition/renewal/release and event publishing.
- **Redis subscriber connection**: The separate `ioredis` connection used for pub/sub subscription and event delivery, kept apart from the command connection because Redis places a connection into subscriber-only mode after `SUBSCRIBE`.
- **Connection error log entry**: A structured record of a Redis connection failure — includes which connection, the error cause, and timestamp — replacing the current raw driver stack trace.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Raw `[ioredis] Unhandled error event` log lines no longer appear in production logs; all Redis connection failures are represented as structured application log entries instead.
- **SC-002**: During a sustained Redis outage, the volume of Redis-related log entries no longer scales linearly with unrelated request traffic (i.e., it no longer appears on request paths that don't use Redis).
- **SC-003**: Real-time board updates (card changes, typing indicators) continue to reach all connected participants with no observable regression when Redis is unreachable, verified via the existing end-to-end coordination test suite.
- **SC-004**: Root cause of the currently observed `connect ETIMEDOUT` errors (invalid `REDIS_URL` configuration vs. genuine network/firewall unreachability vs. transient instability) is identified and documented as part of resolving this feature.

## Assumptions

- The existing fail-open architecture (`CoordinatedRealtimeGatewayAdapter`, `RedisFailOpenTracker`) is functionally correct and is in scope only to verify it isn't regressed — not to redesign.
- "Fix the Redis problem" is interpreted as: (a) stop the unhandled/noisy error logging, and (b) restore or confirm reliable Redis connectivity so board coordination isn't running in degraded fail-open mode more than necessary. Both are addressed together since the noisy logging is the visible symptom of the connectivity problem.
- The `REDIS_URL` environment variable's exact value/provider (visible in `vercel env ls` as a non-plaintext-looking string) could not be decoded/verified further in this session because pulling the raw environment variable value was blocked by the local safety policy; confirming whether `REDIS_URL` itself is malformed vs. the network path being blocked is left as an explicit task for the planning/implementation phase.
- No user-facing UI changes are required; this is a backend reliability/observability fix.
- Existing Vitest unit tests for `RedisBoardCoordinationAdapter` and the Playwright end-to-end coordination test remain the primary regression coverage; no new user-facing test surface is introduced.
