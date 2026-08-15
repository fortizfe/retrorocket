# Phase 0 Research: Idle Tab Realtime Connection Cleanup

All five thresholds needed to eliminate `NEEDS CLARIFICATION` were already resolved during
`/speckit-clarify` (120s background grace, 5min retry cap, 30s listener-teardown grace,
30s/2-miss heartbeat, log-based validation for SC-004). No Technical Context field in
`plan.md` was left unresolved. This document instead records the *implementation*
decisions needed to turn those five fixed thresholds into code, each grounded in the
codebase's existing patterns and confirmed by direct inspection of the current source.

## 1. Detecting tab backgrounding (US1 / FR-001, FR-002)

**Decision**: Use the native Page Visibility API (`document.visibilityState`,
`visibilitychange` event) behind a small dedicated module
(`src/features/boards/retrospective/services/documentVisibility.ts`) exposing a single
subscribe function, rather than inlining `document.addEventListener` calls directly into
`backendRealtimeClient.ts` or the sync hook.

**Rationale**: It's the standard, zero-dependency browser API for exactly this signal,
already broadly supported in all target browsers. Isolating it in its own module (rather
than inlining) satisfies Principle II (Library-First) and makes the 120s grace-period
timer independently unit-testable with a fake `document.visibilityState` and fake timers,
without needing a real WebSocket in the test.

**Alternatives considered**:
- *Mouse/keyboard/idle-timer-based "true idle" detection* — rejected: the spec's Session
  Story 1 and its acceptance scenarios describe backgrounding (tab not visible), not
  in-tab inactivity; a mouse-idle timer would also fire while the user is actively reading
  the board without touching the mouse, which the spec's Edge Cases explicitly say must
  *not* pause the connection ("una pestaña activa en primer plano" must see zero change,
  FR-008).
- *`requestIdleCallback`* — rejected: it signals main-thread idleness, not tab visibility;
  wrong signal entirely for this use case.

## 2. Reconnect policy: respecting close codes and capping retries (US2 / FR-003, FR-004)

**Decision**: Extend `backendRealtimeClient.ts`'s existing `ws.onclose` handler to:
1. Inspect `event.code`. If it is one of the two existing server-sent terminal codes
   (`CLOSE_UNAUTHENTICATED = 4401`, `CLOSE_NOT_FOUND = 4404`, both already defined in
   `server/src/http/ws/realtimeUpgrade.ts`), do not schedule a reconnect — surface a
   terminal state to the caller instead.
2. Otherwise, keep the existing exponential backoff (`INITIAL_BACKOFF_MS = 1000` →
   `MAX_BACKOFF_MS = 30000`, unchanged) but track elapsed time since the first failure in
   the current failure streak; once elapsed time exceeds 5 minutes, stop scheduling
   reconnects and surface a "give up, offer manual retry" state instead.

**Rationale**: This is the smallest change that satisfies FR-003/FR-004 — it reuses the
existing backoff curve (already reasonable) rather than replacing it, and only adds an
exit condition. The two terminal codes are already defined server-side as named constants
(`realtimeUpgrade.ts:12-13`); the client only needs to import/mirror those two numeric
values, not invent new protocol semantics.

**Alternatives considered**:
- *Fixed retry count instead of elapsed time* — considered per the spec's original
  options (Q2 offered both), but elapsed-time was the answer selected in
  `/speckit-clarify`; also more robust than a raw attempt count because attempt duration
  varies with backoff, so time-based capping gives a predictable worst-case wait
  regardless of how many attempts fit in it.
- *New WebSocket close-code constants module shared between client and server* —
  considered for DRYness, but rejected as unnecessary abstraction (Principle V,
  Simplicity): two literal numeric constants mirrored on the client, with a comment
  pointing at their server-side definition, is simpler than adding a new shared package
  for two integers.

## 3. Server-side dead-connection pruning (US3 / FR-005)

**Decision**: In `realtimeUpgrade.ts`'s `setupConnection`, attach the `ws` library's
native protocol-level ping/pong (`ws.ping()` sent every 30s from the server, connection
`terminate()`d after 2 consecutive missed `pong` responses — i.e. within 60-90s of going
silent), independent of the existing *application-level* `{type:'ping'}`/`{type:'pong'}`
JSON messages the client already sends every 15s (`backendRealtimeClient.ts`).

**Rationale**: The existing client-sent JSON ping (`HEARTBEAT_INTERVAL_MS = 15000`) is
purely a client keep-alive nudge that the server just echoes — nothing today inspects
whether it keeps arriving, so it currently detects nothing. Protocol-level WebSocket
ping/pong (RFC 6455 opcodes, exposed by `ws` as `ws.ping()` / the `'pong'` event /
`ws.terminate()`) is the standard, already-installed mechanism for exactly this liveness
check and needs no new dependency. Keeping it separate from the JSON heartbeat avoids
entangling application-level protocol messages (`realtime-protocol.md`'s contract) with
transport-level liveness.

**Alternatives considered**:
- *Repurpose the existing JSON ping/pong as the liveness signal* — rejected: would
  require the server to track per-connection last-JSON-ping timestamps and would change
  the meaning of an existing, documented protocol message; a separate protocol-level
  ping/pong is the standard `ws` pattern and keeps the two concerns cleanly separated.
- *A single global `setInterval` sweeping all connections* — considered, but a
  per-connection interval (set up in `setupConnection`, cleared in the `'close'` handler)
  was preferred: it matches how the codebase already schedules per-entity timers (e.g.
  the client's own per-connection heartbeat), and avoids one long-lived global timer
  having to iterate a growing connection set on every tick.

## 4. Listener-teardown grace period (US4 / FR-006)

**Decision**: In `FirestoreRealtimeGatewayAdapter.unregister()` (and the equivalent path
in `CoordinatedRealtimeGatewayAdapter.ts`), replace the immediate
`if (watch.connections.size === 0) { watch.listeners.unsubscribe(); ... }` with a 30s
`setTimeout` scheduled at the moment the connection count reaches zero. If `register()` is
called again for the same `retrospectiveId` before that timer fires, the timer is
cancelled and the existing `BoardWatch` (including its live Firestore listeners) is reused
untouched. If the timer fires, teardown proceeds exactly as today.

**Rationale**: This is an event-driven grace timer scoped to a single board's watch entry
— not a fixed-interval poll — which matches the precedent already set in this same file
for `TYPING_STATUS_TTL_MS` cleanup (040 US2, whose own doc comment explicitly favors
"event-driven... eliminating the background cost while a board is open but idle" over an
unconditional fixed-interval sweep). No new global timer or polling loop is introduced.

**Alternatives considered**:
- *Debounce at the WebSocket-close level instead of the gateway level* — rejected: the
  reconnect can come from a different physical WebSocket than the one that closed
  (client tears down and opens a fresh socket on reconnect), so the grace period has to
  live where connection *count* is tracked per board (the gateway), not per individual
  socket.

## 5. Enforcing the session soft TTL on realtime/board routes (US5 / FR-007)

**Decision**: Add `session.isActive(clock.nowSeconds())` (the method already defined on
`Session.ts`, currently only used by `getCurrentSession`/`refreshSession` in
`application/use-cases/session.ts`) as an additional check alongside the existing
`sessionService.verify()` call in two places: `requireSession()`
(`server/src/http/routes/retrospectives.ts`, mirrored in `boards.ts`) and the inline
session check in `realtimeUpgrade.ts`'s `handleUpgrade`. When `isActive()` is false (soft
TTL elapsed) but the session is still cryptographically valid (absolute TTL not elapsed),
reject the same way an invalid session is rejected today (`401` / `CLOSE_UNAUTHENTICATED`
on the WS path) — the existing client-side session-refresh flow
(`GET /api/auth/session` / `POST /api/auth/refresh`, already implemented) is what recovers
an actually-present user; an abandoned tab simply stops being able to re-authenticate.

**Rationale**: `verify()` today only enforces the JWT's cryptographic `exp`, which is
deliberately set to the 30-day *absolute* expiry (`JoseSessionAdapter.ts`) — the 1-hour
soft TTL exists in `SessionData` but is invisible to these two call sites. Reusing
`Session.isActive()` (already unit-tested via the session use-cases) is the minimal
change; it requires no new session field, no new error type beyond composing the existing
401/`CLOSE_UNAUTHENTICATED` response paths.

**Alternatives considered**:
- *A new Express middleware wrapping every board route* — rejected as unnecessary
  abstraction (Principle V): only two call sites need the extra check, and both already
  call `sessionService.verify()` directly.

## 6. `setInterval`/timer usage under Vercel Fluid Compute

**Decision**: Per-connection intervals/timeouts (the 30s heartbeat sweep, the 30s
listener-teardown grace timer) are safe to rely on as-is, with no additional keep-alive
scaffolding.

**Rationale**: `CoordinatedRealtimeGatewayAdapter.ts` already runs a `setInterval`-based
per-board reconcile ticker in production today under this exact runtime (Fluid Compute
keeps warm instances alive for the lifetime of open WebSocket connections, since the
connection itself keeps the invocation alive) — this feature follows the same
already-proven pattern rather than introducing a new one.

## 7. E2E simulation of tab backgrounding (Playwright)

**Decision**: Simulate `document.visibilityState` transitions with
`page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); })`
(and the mirrored call for `'visible'`), rather than relying on real OS-level window
backgrounding or a second browser context.

**Rationale**: Playwright does not background/foreground an actual OS window per test in
CI; overriding the getter and firing the event is the standard, deterministic way to
drive this API in a headless test, and keeps the test fast and CI-stable. This follows
the existing codebase convention (`e2e/concurrent-board-network.spec.ts`) of driving real
browser/network conditions end-to-end rather than mocking application code.

## 8. New user-facing copy (manual retry / session expired)

**Decision**: Reuse the existing `react-hot-toast` notification pattern already present
in the codebase for the two new user-facing messages (manual-retry affordance after the
5-minute cap, and the "please sign in again" message on a terminal `4401` close), with new
i18next keys added to every supported locale.

**Rationale**: Reusing an established, already-accessible notification primitive avoids
introducing a new visual component; per Principle IX this still requires confirming the
specific copy/timing/motion through the Apple-design skill package if any new visual
treatment beyond a standard toast is proposed, but no new component skeleton is
anticipated at this stage.

---

**Output**: All Technical Context unknowns resolved (none required a `NEEDS
CLARIFICATION` marker to begin with — the prior `/speckit-clarify` session already fixed
every open numeric parameter). Proceeding to Phase 1.
