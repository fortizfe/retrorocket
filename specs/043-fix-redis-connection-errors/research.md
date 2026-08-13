# Phase 0 Research: Fix Redis Connection Error Noise

## 1. Root cause of the observed `connect ETIMEDOUT` — config vs. network vs. transient

**Decision**: Do not attempt to resolve this conclusively before implementation. Instead, design the fix so it (a) is correct regardless of which cause is true, and (b) adds the exact observability needed to read the answer off the next production deploy's logs.

**Rationale**:
- The coordination contract (`specs/040-optimize-firebase-calls/contracts/redis-coordination-protocol.md`) states `REDIS_URL` must be "a standard RESP connection string" (i.e. `redis://` or `rediss://`), backed by the Upstash Vercel Marketplace integration.
- `vercel env ls --environment production` shows the current `REDIS_URL` value with a prefix (`eyJ2IjoidjIiLCJjIj…`) that base64-decodes to `{"v":"v2","c":…}` — not a `redis(s)://` URL shape.
- This is ambiguous between two real possibilities that can't be told apart without either the raw value (pulling it was blocked by local tooling policy in the `/speckit-specify` session) or a fresh, instrumented deploy:
  1. **CLI display artifact**: some `vercel env ls` output modes show an internal encrypted-value envelope instead of the resolved plaintext, especially on an out-of-date CLI (the installed CLI is 58.9.1; 58.11.0 is current). In this case `process.env.REDIS_URL` at runtime is the correct, valid RESP string and the real bug is purely on the connection-handling side (§2 below).
  2. **Genuine misconfiguration**: the env var itself holds the wrong value (e.g. a Marketplace integration reference that was never resolved into a literal connection string for this project). In this case the fix must include re-provisioning/re-linking the Upstash integration's `REDIS_URL`, which is an operational (Vercel dashboard/CLI) action, not a code change.
- `ETIMEDOUT` specifically (vs. `ENOTFOUND`/`ECONNREFUSED`) is consistent with either cause: a malformed string can still make ioredis's URL parser fall through to a default host that nothing answers on, and a genuinely valid-but-unreachable host (network/firewall block) times out the same way at the TCP layer.

**Alternatives considered**:
- *Pull the raw env var value now via `vercel env pull`*: blocked by local sandbox policy in the `/speckit-specify` session (denied by the auto-mode classifier); re-attempting the same action inside implementation is expected to hit the same policy, so it is not treated as available.
- *Ask the user to paste the value*: viable but unnecessary — the logging added in §2 answers the question from the next deploy without handling the secret at all, which is strictly safer.

**Follow-up task for `/speckit-tasks`**: an early implementation task must log the resolved connection target in a redacted form (host + port only, never credentials) once at client construction, so the very next production log line answers "did ioredis even get a parseable host" definitively.

## 2. Structured, bounded Redis connection-error logging with `ioredis` v6

**Decision**: Attach `error`, `reconnecting`, `ready`, and `end` listeners to both the command and subscriber `ioredis` clients at construction time, routed through the existing `LoggerPort` (not raw `console`), and only emit a log line on a **state transition** (e.g. healthy → erroring, erroring → recovered) rather than once per individual retry attempt.

**Rationale**:
- `ioredis` (the installed `^6.0.0`) emits `'error'` on every failed connection attempt during its built-in `retryStrategy` loop. If no listener is registered — the current state of `retrospective-wiring.ts` — `ioredis` falls back to its own internal "Unhandled error event" console logger specifically so the process doesn't crash from Node's default "throw on unhandled 'error' event" `EventEmitter` behavior. That fallback logger is the exact raw text observed in production logs.
- Registering a listener is necessary and sufficient to stop the raw fallback text, but registering one *that logs on every event* just replaces one noisy log line with another — the real requirement (spec FR-003) is bounded volume during a sustained outage. `ioredis`'s default `retryStrategy` retries indefinitely with a capped backoff (`Math.min(times * 50, 2000)` ms), so an unattended sustained outage would still produce roughly one event every ≤2s without deduplication.
- `RedisFailOpenTracker` already establishes the right idiom in this codebase for exactly this problem — "only report on `transitioned: true`, not on every call" — for board coordination health. Reusing that same shape for connection-level state (rather than inventing a second, different debouncing mechanism) keeps the two observability layers consistent and satisfies Constitution Principle V (Simplicity: prefer the pattern already proven here over a new one).
- `'ready'` (successful connect/reconnect) and `'end'` (connection closed, no more retries) are the natural transition-out and terminal events pairing with `'error'`/`'reconnecting'`, giving full state coverage without needing to inspect `ioredis` internals beyond its public event API.

**Alternatives considered**:
- *Rate-limit/throttle by wall-clock time (e.g. "log at most once per 30s")*: works but introduces a time-based coupling and hides how many attempts actually happened; a state-transition model is simpler and deterministic (Principle V), and is already the pattern this codebase uses.
- *Suppress `ioredis`'s internal retries entirely and manage reconnection manually*: rejected — `ioredis`'s built-in `retryStrategy` is already relied on implicitly today and works correctly; replacing it would be a larger, riskier change than the actual problem (missing observability) requires.
- *Only attach a listener without any additional connectTimeout/retry tuning*: considered sufficient to satisfy FR-001/FR-002 on its own; explicit `connectTimeout` tuning is left as a possible follow-up only if the redacted-host logging in §1 reveals the host is in fact reachable-but-slow, not attempted speculatively (YAGNI, Principle V).

## 3. Where the new logic lives (testability vs. existing wiring conventions)

**Decision**: Extract the listener-attachment/state-transition logic into a small new module under `server/src/adapters/firebase/redis/` (parallel to `RedisFailOpenTracker.ts`), taking a narrow interface (a subset of `ioredis`'s `EventEmitter` surface: `on('error'|'reconnecting'|'ready'|'end', …)`) rather than the concrete `Redis` type, and give it a dedicated Vitest unit test. Leave `retrospective-wiring.ts` itself as a two-line call site.

**Rationale**:
- Matches the codebase's own established split: `RedisLike`/`RedisBoardCoordinationAdapter`/`RedisFailOpenTracker` are all pure/injectable and fully unit-tested; `retrospective-wiring.ts` and `CoordinatedRealtimeGatewayAdapter.ts` are deliberately excluded from the Vitest coverage gate (`server/vitest.config.ts`) as "thin composition glue... exercised by the Playwright E2E suite," not unit tests. Adding raw event-listener code directly inline in `retrospective-wiring.ts` would put new, meaningfully-branching logic (state-transition detection) in the one place this codebase's convention says not to put testable logic.
- Satisfies Constitution Principle I (TDD, non-negotiable) and Principle VI (coverage floor) cleanly: the new module is where the actual decision logic (is this a transition, what to log) lives, so it's exactly the kind of unit this codebase already knows how to test with a fake double, matching `RedisBoardCoordinationAdapter.test.ts`'s existing pattern of a fake `RedisLike`.
- Satisfies Principle IV (SOLID / Interface Segregation): depending on a narrow "the events I actually listen to" interface, not `ioredis.Redis` directly, mirrors why `RedisLike` exists in the first place.

**Alternatives considered**:
- *Put the logic inline in `retrospective-wiring.ts`*: rejected per above — breaks the existing coverage-exclusion convention's own rationale (that file is glue, not logic).
- *Subclass `ioredis.Redis`*: rejected — heavier than needed, and the existing codebase already avoids depending on `ioredis` types directly outside the one documented wiring boundary (see the cast comment in `retrospective-wiring.ts`).

## 4. Confirm no change to the Redis transport approach (stay on TCP `ioredis`, not Upstash REST)

**Decision**: Keep raw TCP `ioredis` connections; do not migrate to Upstash's REST client (`@upstash/redis`, covered by this repo's installed `upstash-redis-js` skill).

**Rationale**: The coordination protocol requires `SUBSCRIBE`/`PUBLISH` (a persistent, stateful connection) and atomic `EVAL` Lua scripts for compare-and-renew/compare-and-delete. Upstash's REST API is stateless request/response and does not support `SUBSCRIBE` at all, so it cannot implement §4-5 of `contracts/redis-coordination-protocol.md` (the pub/sub relay) regardless of how connection errors are handled. This was already the reasoning baked into the existing code's own comments (`retrospective-wiring.ts`'s note on why two separate connections are needed); this feature does not revisit that decision, only the missing error handling around it.

**Alternatives considered**:
- *Switch to `@upstash/redis` (REST) for the command connection, keep `ioredis` only for pub/sub*: rejected as out of scope — doubles the client surface and dependency footprint to solve a problem (log noise) that doesn't require it; would also not address the `SUBSCRIBE` connection's identical error-handling gap.

## Summary of unresolved items carried into planning

None block Phase 1 design. The single open question (exact root cause of `ETIMEDOUT`: CLI display artifact vs. genuine misconfiguration vs. network block) is answered by design, not deferred as a `NEEDS CLARIFICATION` — §1's redacted host/port logging plus the transition-based error logging from §2 together give an operator everything needed to read the real cause off the next deploy.
