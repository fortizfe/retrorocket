# Quickstart: Validating Idle Tab Realtime Connection Cleanup

> **Implementation note (post-`/speckit-implement`)**: Scenarios C, D, and E-G below
> assumed a dedicated `e2e/idle-connection-cleanup.spec.ts` Playwright file, which was
> not built — `playwright.config.ts`'s `webServer` spawns real, unmodifiable-clock
> processes, making the five real-time-threshold waits (120s/5min/30s/30s) impractical
> for a browser-driven test. That coverage was instead achieved faster and more
> reliably at two other layers: pure logic via Vitest unit tests, and real
> `http.Server`/`ws`-client/Express-app behavior via Vitest integration tests with
> injectable short thresholds. See `tasks.md`'s T002/T003/T006/T012/T017/T019/T022 notes
> for the full reasoning and the exact replacement test files. Scenarios A, B, H, and I
> below are unaffected and were run as written (see T026/T027/T028 in `tasks.md`).

## Prerequisites

- Local checkout on branch `045-idle-connection-cleanup` with the implementation applied.
- `npm install` already run at the repo root (`retro-rocket/`).
- Firebase emulator running for Playwright scenarios (existing `e2e/` setup —
  `npm run dev:emulators` or whatever the current e2e npm script wires up; see
  `playwright.config.ts`'s `webServer` for the exact command already in place).
- For the production-log scenario (D): Vercel CLI authenticated with access to the
  `retro-rocket` project, matching the access already confirmed during the original
  incident investigation.

## Scenario A — Unit: visibility-driven pause/resume (US1)

```bash
cd retro-rocket
npm run test -- documentVisibility
```

**Expected outcome**: the new unit suite for `src/features/boards/retrospective/services/documentVisibility.ts`
uses fake timers plus a stubbed `document.visibilityState` to assert:
- No callback fires before 120 simulated seconds of `'hidden'`.
- The pending callback is cancelled if `'visible'` occurs before 120s elapse (spec Edge
  Case 2 — no observable connection change).
- The callback fires exactly once per continuous hidden period ≥120s.

## Scenario B — Unit: reconnect policy (US2)

```bash
npm run test -- backendRealtimeClient
```

**Expected outcome**: extended unit coverage for `backendRealtimeClient.ts` asserts:
- `onclose` with code `4401` or `4404` does not schedule a reconnect and instead invokes
  a terminal-state callback.
- `onclose` with any other code keeps the existing 1s→30s exponential backoff, and stops
  scheduling further attempts once 5 simulated minutes have elapsed since the first
  failure, invoking a retry-exhausted callback instead.
- A successful reconnection resets the elapsed-time tracking (a later, independent
  failure streak again gets its own full 5-minute budget).

## Scenario C — Integration: server-side liveness pruning (US3)

```bash
npx playwright test e2e/idle-connection-cleanup.spec.ts -g "prunes an unresponsive connection"
```

**Expected outcome**: a test double WebSocket client that stops responding to protocol-
level pings after connecting gets `terminate()`d by the server within 60-90 seconds, and
the board's connection-count-driven data subscription (Scenario D below) reflects the
drop — i.e. this is observed indirectly through the *next* connection to the same board
no longer needing a full listener rebuild delay, per `contracts/
realtime-connection-lifecycle-delta.md` §3-4.

## Scenario D — Integration: listener-teardown grace period (US4)

```bash
npx playwright test e2e/idle-connection-cleanup.spec.ts -g "reuses listeners within the grace window"
```

**Expected outcome**: closing the only connection to a board and reopening a new one
within 30 seconds shows continuous `entity_change` delivery with no gap (an update
written between the close and the reconnect is still received); reopening after 30
seconds still works correctly but goes through the full listener-attach path again (both
are correct from the client's perspective — this scenario is really validating no
functional regression, since the grace period is a resource-cost optimization invisible
to the wire protocol per `data-model.md` §2).

## Scenario E — E2E: full tab-backgrounding flow (US1 + US2, browser-level)

```bash
npx playwright test e2e/idle-connection-cleanup.spec.ts -g "backgrounded tab stops generating backend reads"
```

**Expected outcome**, using the `document.visibilityState` override pattern from
`research.md` §7:
1. Open a board, confirm the WebSocket is open (`page.on('websocket')`).
2. Simulate `'hidden'` for 120+ seconds (fake/advanced clock, not a real 2-minute wait).
3. Assert the WebSocket closes with code `1000` and no further reconnect attempts occur
   while still hidden.
4. Simulate `'visible'` again.
5. Assert a new WebSocket opens immediately and the board shows current data with no
   manual reload (SC-003).

## Scenario F — E2E: terminal close does not retry (US2, Edge Case 3)

```bash
npx playwright test e2e/idle-connection-cleanup.spec.ts -g "does not retry after 4401"
```

**Expected outcome**: forcing a `4401` (e.g. by invalidating the session cookie
server-side mid-connection, or connecting to a board id crafted to be deleted) results in
zero further `GET .../live` upgrade attempts from that page, and a visible,
i18next-driven "sign in again" message (Content Quality / WCAG check: message has
sufficient contrast, is not conveyed by color alone, and is reachable by screen reader).

## Scenario G — E2E: session soft-TTL rejection (US5)

```bash
npx playwright test e2e/idle-connection-cleanup.spec.ts -g "soft TTL"
```

**Expected outcome**: with the clock advanced past the session's 1-hour soft TTL but
before its 30-day absolute TTL (`server/src/domain/auth/Session.ts` constants), both a
REST board call and a WS upgrade attempt are rejected (`401`/`4401`) per `contracts/
session-soft-ttl-enforcement.md`, and — for a page that's still open and interactive —
the existing silent-refresh flow transparently recovers it (no user-visible interruption
for a present user, only for a genuinely abandoned tab that never calls refresh).

## Scenario H — Regression: coverage floor and existing realtime suite unaffected

```bash
npm run test -- --coverage
npx playwright test e2e/concurrent-board-network.spec.ts e2e/retrospective-board.spec.ts
```

**Expected outcome**: coverage numbers in `vitest.config.ts` do not drop below their
current thresholds (Principle VI); the existing 10-participant concurrent-board and core
retrospective-board E2E suites pass unchanged — confirming none of the five mitigations
regress a tab that stays active and in the foreground (FR-008, SC-005).

## Scenario I — Production log verification (post-deploy, the original incident's board)

```bash
vercel logs --project retro-rocket --environment production --query "retrospectives" --since 24h
```

**Expected outcome, once deployed**: no repeat of the `VTeTvsH1ovbOCBTzSD22` pattern —
no sustained, evenly-spaced sequence of `GET /api/retrospectives/{id}/live` timeouts for
a single board over hours with no corresponding user activity. This is the same
log-based validation method used to diagnose the original incident, per SC-004's
clarified measurement approach (no new metric/instrumentation is added by this feature).
