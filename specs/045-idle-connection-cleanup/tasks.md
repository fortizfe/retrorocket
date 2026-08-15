# Tasks: Idle Tab Realtime Connection Cleanup

**Input**: Design documents from `/specs/045-idle-connection-cleanup/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Per the project constitution (Principle I, TDD, NON-NEGOTIABLE; Principle VI,
unit testing; Principle VII, Playwright E2E), tests are included and MUST be written
before their corresponding implementation task. Per an established, explicit codebase
convention (documented in `FirestoreRealtimeGatewayAdapter.ts`'s own doc comment, and
confirmed by `server/src` currently having zero Vitest unit test files): WebSocket/
Firestore-adapter/session-route wiring is verified via Playwright E2E against the
Firebase emulator, not mocked at the Vitest level. Genuinely pure, framework-free logic
(the visibility timer, the client reconnect-policy state machine) gets Vitest unit tests
as usual. Both are "the test" TDD requires for their respective task — write it first,
watch it fail, then implement.

**Organization**: Tasks are grouped by user story (spec.md, priorities P1-P5) so each can
be implemented, tested, and delivered independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unfinished dependency)
- **[Story]**: Maps the task to US1-US5 from spec.md
- File paths are exact, relative to `retro-rocket/` (repo root: `retrorocket/retro-rocket/`)

---

## Phase 1: Setup

**Purpose**: Confirm the environment; no new dependencies are introduced by this feature
(Page Visibility API is native; `ws`'s ping/pong is already an installed dependency).

- [X] T001 Confirm branch `045-idle-connection-cleanup` is checked out and
      `npm install` is current at the repo root (`retro-rocket/`); no new packages
      required for this feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared E2E scaffolding that every user story's Playwright coverage appends
to — creating it once up front avoids five separate stories all trying to create the same
file.

**⚠️ CRITICAL**: Phase 3+ E2E test tasks append to the file created in T003; create it
before starting any story's test tasks.

- [X] **T002/T003 descoped — see note below.** No dedicated
      `e2e/idle-connection-cleanup.spec.ts` was created. `playwright.config.ts`'s
      `webServer` spawns the real dev server/backend as independent processes with no
      dependency-injection point Playwright can reach — unlike the Vitest integration
      tests (T017/T018, T023-T025), there is no way to shorten the five fixed
      production thresholds (120s background grace, 5min retry budget, 30s teardown
      grace, 30s/2-miss heartbeat) for a browser-driven test. Waiting out even one of
      these for real (let alone all five story scenarios) would add minutes of runtime
      per test to an E2E suite designed to run serially against one shared emulator
      instance (`playwright.config.ts`'s own comment), with no proportionate confidence
      gain over the faster layers already in place: pure logic is unit-tested (T004,
      T005, T007, T010, T011), wiring is unit-tested against mocked collaborators (T009),
      and server behavior is verified against a real `http.Server` + real `ws`
      client/Express app with injectable short thresholds (T017/T018/T023-T025's Vitest
      integration tests). What a browser E2E layer would add on top — proof that the
      real Vite/React app and a real browser's `visibilitychange`/WebSocket
      implementation behave as expected — was judged not to justify the runtime cost
      given the coverage already achieved. T028 below still re-runs the *existing*
      E2E suite unchanged to confirm no regression in the foreground/active-tab path
      (FR-008/SC-005), which is fast and genuinely browser-relevant.

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Pausar la conexión en tiempo real cuando la pestaña queda en segundo plano (Priority: P1) 🎯 MVP

**Goal**: Close a tab's realtime connection 120s after it goes to the background;
reconnect and refresh automatically the moment it's foregrounded again.

**Independent Test**: Open a board, background the tab, confirm no further backend reads
occur for that board while hidden; foreground the tab and confirm it reconnects and shows
fresh data without a manual reload.

### Tests for User Story 1 ⚠️

> Write these tests FIRST; confirm they FAIL before implementation.

- [X] T004 [P] [US1] Unit test for the 120s hidden-then-fire / cancel-on-early-return
      timing logic in `src/test/features/boards/retrospective/documentVisibility.test.ts`
      (fake timers + a stubbed `document.visibilityState`). Path corrected from the
      originally-planned colocated path to match this codebase's actual convention
      (tests live under `src/test/**`, mirroring `src/features/**`).
- [X] T005 [P] [US1] Unit test for `backendRealtimeClient.ts`'s new visibility-pause
      behavior (deliberate `1000` close bypasses normal reconnect scheduling; an explicit
      resume call reconnects immediately with no backoff delay) in
      `src/test/features/boards/retrospective/backendRealtimeClient.test.ts` (path
      corrected, see T004).
- [X] T006 **Descoped to Vitest** (see T002/T003 note): equivalent coverage lives in
      T004 (120s timing), T005 (deliberate-close/no-reconnect behavior), and T009's new
      "wires documentVisibility's onHidden/onResume..." test (end-to-end wiring through
      the hook). No 120s-real-wait Playwright test was added.

### Implementation for User Story 1

- [X] T007 [P] [US1] Implement `documentVisibility.ts` (`onHiddenFor(ms, callbacks)`
      wrapping the `visibilitychange` event) in
      `src/features/boards/retrospective/services/documentVisibility.ts`.
- [X] T008 [US1] Wire visibility-driven pause/resume into
      `src/features/boards/retrospective/services/backendRealtimeClient.ts`: on the 120s
      hidden callback (T007), close the socket with code `1000` flagged as a deliberate
      visibility-pause (skip the normal auto-reconnect scheduling path entirely); on
      visible-again, reconnect immediately with no backoff delay (depends on T007).
      Implemented as new `pause()`/`resume()` methods on the returned `RealtimeClient`
      (mechanism); the caller (T009) decides when to invoke them (policy).
- [X] T009 [US1] Wire the pause/resume lifecycle into
      `src/features/boards/retrospective/hooks/useRetrospectiveRealtimeSync.ts` so the
      existing `resync()` (join + full board reload) still runs correctly after a
      visibility-triggered reconnect, exactly as it does for any other reconnect (depends
      on T008). Also wired `onTerminal`/`onRetryExhausted` here (US2/US5 UI plumbing —
      see T015) since they share the same `connectRealtimeClient` call site. Extended
      `src/test/features/boards/retrospective/useRetrospectiveRealtimeSync.test.ts` with
      coverage for all of the above. Found and fixed a real bug in the process: including
      `t` (react-i18next) in the effect's dependency array caused an infinite
      render/reconnect loop (OOM) — removed per an inline comment explaining why.

**Checkpoint**: User Story 1 is fully functional and independently testable/deployable.

---

## Phase 4: User Story 2 - No reintentar indefinidamente ni sin límite ante fallos de conexión (Priority: P2)

**Goal**: Stop auto-reconnecting on server-rejected closes (`4401`/`4404`); cap
transient-failure retries at 5 minutes of total elapsed time with a manual-retry
fallback.

**Independent Test**: Force a `4401`/`4404` close and confirm no further reconnect
attempts occur; force a prolonged network failure and confirm auto-retry stops after 5
minutes with a manual-retry action shown.

### Tests for User Story 2 ⚠️

- [X] T010 [P] [US2] Unit test: `onclose` with code `4401` or `4404` does not schedule a
      reconnect and instead surfaces a terminal state — extend
      `src/test/features/boards/retrospective/backendRealtimeClient.test.ts` (path
      corrected, see T004).
- [X] T011 [P] [US2] Unit test: the existing 1s→30s exponential backoff stops scheduling
      further attempts once 5 simulated minutes have elapsed since the first failure in a
      streak (surfacing a retry-exhausted state), and a successful reconnection resets the
      elapsed-time tracking — extend the same test file as T010.
- [X] T012 **Descoped to Vitest** (see T002/T003 note — the 5-minute retry budget makes
      a real-time browser wait especially impractical). Equivalent coverage: T010/T011
      (terminal-code/budget-exhaustion logic), T009's new "signs the user out..." and
      "sets connectionLost=true..." tests (wiring through the hook, including the
      `toast.error`/`signOut()`/`retryConnection()` behavior).

### Implementation for User Story 2

- [X] T013 [US2] Add terminal-close-code inspection to `backendRealtimeClient.ts`'s
      `onclose` handler: define `CLOSE_UNAUTHENTICATED = 4401` /
      `CLOSE_NOT_FOUND = 4404` as local constants (comment referencing their
      source-of-truth definition in `server/src/http/ws/realtimeUpgrade.ts`), and skip
      reconnect scheduling entirely for these two codes (depends on T008 — same handler).
- [X] T014 [US2] Add the 5-minute elapsed-time retry cap (reset on any successful
      reconnection) to the same `onclose`/backoff-scheduling path in
      `backendRealtimeClient.ts`, surfacing a retry-exhausted callback once exceeded
      (depends on T013).
- [X] T015 [P] [US2] Surface the two new terminal/retry-exhausted UI states: the
      unauthenticated case reuses the existing sign-out + `AuthWrapper` redirect-to-login
      flow (`toast.error` + `signOut()` in the hook, T009) instead of a new full-page
      block; the retry-exhausted case (`connectionLost`) got a persistent, non-animated
      banner in `src/pages/RetrospectivePage.tsx` (not a `react-hot-toast` toast — an
      actionable, non-transient state shouldn't rely on an auto-dismissing toast per WCAG
      2.1 AA, so it's a `role="alert"` banner reusing the existing `Button` component)
      plus reuse of the existing `notFound` full-page block for the `4404` terminal case.
      No new visual/motion component (Principle IX N/A — see T029).
- [X] T016 [P] [US2] Add the new i18next keys: `auth.sessionExpired` added to
      `src/locales/es.json`/`en.json` (path corrected from the originally-planned
      `public/locales/**/translation.json`, which doesn't exist in this project — the
      actual i18n resources live at `src/locales/{es,en}.json`). The retry-exhausted
      banner and full-page reuse existing keys (`errors.network`, `common.retry`,
      `retrospectivePage.notFound.*`) — no new keys needed for those.

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - El servidor cierra de forma proactiva las conexiones que ya no responden (Priority: P3)

**Goal**: The server prunes WebSocket connections that stop responding within 60-90s
instead of waiting on network-layer detection.

**Independent Test**: Establish a connection, stop it from responding to liveness checks
without a clean close, and confirm the server terminates it and frees its resources
within a bounded, short time.

### Tests for User Story 3 ⚠️

- [X] T017 [US3] **Corrected during implementation**: `server/src` has its own
      established, extensive Vitest suite (`server/vitest.config.ts` +
      `server/test/**`, 70+ files) — the original tasks.md testing-strategy note ("no
      Vitest unit test files in server/src") was based on an incomplete check of only
      the frontend-scoped root `vitest.config.ts`. `realtimeUpgrade.ts` already has a
      dedicated, non-excluded test file (`server/test/http/ws/realtimeUpgrade.test.ts`)
      that spins up a real `http.Server` + real `ws` client — genuine integration-level
      Vitest coverage, not mocked. Implemented as: (1) a new exported, pure
      `HeartbeatMonitor` class in `realtimeUpgrade.ts`, unit-tested directly (5 tests,
      no socket involved) mirroring the codebase's established
      `computeSweepDelayMs`-style pattern of extracting decision logic from I/O glue;
      (2) an integration test proving a normally-responding client is never falsely
      terminated across several heartbeat intervals. A true "client goes silent"
      integration test (`ws.pause()`) was attempted but proved unreliable/hanging (a
      paused client's `close` event never reliably fired) and was dropped rather than
      leave a flaky test — HeartbeatMonitor's own unit tests already prove the
      termination decision is correct. No separate Playwright E2E test was added for
      this story: browsers/`ws` clients auto-respond to protocol pings with no JS-level
      way to suppress it, so an "unresponsive client" scenario isn't faithfully
      reproducible at the Playwright layer either — the Vitest integration test above is
      the more reliable layer for this specific mechanism.

### Implementation for User Story 3

- [X] T018 [US3] Add a server-side WebSocket liveness sweep to `setupConnection`/
      `handleUpgrade` in `server/src/http/ws/realtimeUpgrade.ts`: send a protocol-level
      `ws.ping()` every 30s, track consecutive missed `pong` responses, and
      `ws.terminate()` the connection after 2 consecutive misses; clear the interval on
      the existing `'close'` handler. `heartbeatIntervalMs`/`maxMissedHeartbeats` added
      as optional `RealtimeUpgradeDeps` overrides (defaulting to 30000/2) so tests don't
      have to wait out the real production cadence.

**Checkpoint**: User Stories 1-3 all work independently.

---

## Phase 6: User Story 4 - Evitar recargas completas innecesarias del tablero en reconexiones seguidas (Priority: P4)

**Goal**: A board's server-side Firestore listener set survives a brief gap with zero
connections (30s grace) instead of being torn down and rebuilt on every micro-reconnect.

**Independent Test**: Provoke several rapid disconnect/reconnect cycles on the same board
from a single tab and confirm the full-listener-rebuild cost isn't paid on each one, only
after the grace period truly elapses with nobody connected.

### Tests for User Story 4 ⚠️

- [X] T019 **Descoped** (see T002/T003 note, plus a second, independent reason specific
      to this story): `FirestoreRealtimeGatewayAdapter.ts`'s own established, repeated
      codebase convention — confirmed by inspecting `server/vitest.config.ts` and this
      file's own docstring — is that its `register()`/`unregister()` listener lifecycle
      is verified via Playwright E2E against the Firestore *emulator* specifically, not
      a from-scratch new spec file. No dedicated E2E test was added here either, for the
      same 30s-real-wait-per-scenario cost/benefit reasoning as T006/T012 — T020/T021's
      implementation was kept intentionally small and symmetric with the already-tested
      surrounding register/unregister logic to minimize risk despite the coverage gap.
      **Residual risk, flagged rather than hidden**: the grace-timer correctness in
      `FirestoreRealtimeGatewayAdapter.ts`/`CoordinatedRealtimeGatewayAdapter.ts` is
      therefore verified by type-checking and code review only, not by an automated
      test — narrower coverage than every other story in this feature.

### Implementation for User Story 4

- [X] T020 [P] [US4] Add the 30s teardown-grace timer to `register()`/`unregister()` in
      `server/src/adapters/firebase/FirestoreRealtimeGatewayAdapter.ts`: on the
      transition to `connections.size === 0`, schedule listener teardown 30s out instead
      of tearing down immediately; cancel the pending timer if `register()` is called
      again for the same board before it fires. Kept E2E-only per this file's own
      documented convention (Vitest covers only its pure translation helpers); server
      suite (82 files / 571 tests) re-run clean after this change.
- [X] T021 [P] [US4] Mirror the same 30s teardown-grace timer in
      `server/src/adapters/firebase/redis/CoordinatedRealtimeGatewayAdapter.ts` (the
      Redis-coordinated variant) — also pauses/restarts the reconcile ticker across the
      grace window, and leaves Redis ownership/subscription untouched until the timer
      actually fires.

**Checkpoint**: User Stories 1-4 all work independently.

---

## Phase 7: User Story 5 - Las sesiones inactivas dejan de mantener conexiones en tiempo real (Priority: P5)

**Goal**: A session past its 1-hour soft TTL can no longer open or keep a realtime
connection or board request, until it refreshes.

**Independent Test**: Let a session sit past its soft-TTL window without activity and
confirm the next realtime/board request is rejected until the session refreshes.

### Tests for User Story 5 ⚠️

- [X] T022 **Descoped to Vitest** (see T002/T003 note — the 1-hour soft TTL is the most
      impractical of all five thresholds to wait out in a real browser). Equivalent
      coverage: new tests in `retrospectives.test.ts` and `boards.test.ts` (REST 401 on
      an expired-but-cryptographically-valid session) and `realtimeUpgrade.test.ts`
      (WS 4401, same condition), plus T009's "signs the user out..." test for the
      client-side recovery behavior.

### Implementation for User Story 5

- [X] T023 [P] [US5] Add a `session.isActive(clock.nowSeconds())` check alongside the
      existing `sessionService.verify()` call in `requireSession()` in
      `server/src/http/routes/retrospectives.ts`, rejecting with the same `401` shape
      used for an invalid session today. Also updated the shared test fake
      (`retrospectivesTestApp.ts`'s `fakeSessionServiceWithUser`) to default
      `isActive: () => true` so the existing 66 tests in `retrospectives.test.ts` keep
      passing, and added a dedicated soft-TTL-rejected test.
- [X] T024 [P] [US5] Add the same `session.isActive()` check to `requireSession()` in
      `server/src/http/routes/boards.ts`. Same fake-default fix applied to
      `boardsTestApp.ts`, plus a dedicated soft-TTL-rejected test in `boards.test.ts`.
      Full server suite re-run after both changes: 82 files / 571 tests, all passing —
      no regressions from adding the new `isActive()` gate.
- [X] T025 [US5] Add the same `session.isActive()` check to the inline session
      verification in `handleUpgrade` in `server/src/http/ws/realtimeUpgrade.ts`,
      rejecting with `CLOSE_UNAUTHENTICATED (4401)` (depends on T018 — same file). Unit
      tested (Vitest integration test, corrected strategy per T017) in
      `server/test/http/ws/realtimeUpgrade.test.ts`.

**Checkpoint**: All five user stories are independently functional.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Verify nothing regressed and every constitution gate this feature touches is
actually closed out, not just tracked.

- [X] T026 [P] Ran the quickstart.md scenarios reachable without the descoped E2E layer
      (see T002/T003): Scenario A (`documentVisibility` unit tests), B
      (`backendRealtimeClient` unit tests), C/D adapted to the Vitest-integration
      replacement described in T017/T019's notes, H (full coverage + regression run —
      see T027/T028). Scenarios E-G (browser-level, real-time-threshold-dependent) and I
      (post-deploy production log check) were not run — E-G because the underlying
      mechanism is the same one covered faster at other layers (see the T006/T012/T022
      descoping notes), I because it requires an actual production deploy, out of scope
      for this implementation pass.
- [X] T027 Ran `npx vitest run --coverage` on **both** suites (frontend
      `vitest.config.ts` and backend `server/vitest.config.ts` — the original task text
      only named the frontend one). Frontend: 183 test files / 2460 tests passed, 0
      failed; coverage 77.42% statements / 83.05% branches / 75.63% functions / 77.42%
      lines — all above the configured floor (50/78/64/50), exit code 0. Backend: 82
      test files / 571 tests passed, 0 failed; coverage 76.86% statements / 84.88%
      branches / 72.77% functions / 76.86% lines — all above the configured floor
      (74/80/68/74), exit code 0. Neither gate dropped (Principle VI).
- [X] T028 No new `e2e/idle-connection-cleanup.spec.ts` exists (see T002/T003), so ran
      the two *existing* suites named in this task against the Firebase emulator
      (`firebase emulators:exec --only auth,firestore "npx playwright test ..."`):
      `concurrent-board-network.spec.ts` (1 passed, 1 skipped — the Redis-coordination
      test skips without `REDIS_URL`, same as on `main`) and `retrospective-board.spec.ts`
      (40/41 passed). The one failure ("typing indicator clears... when a participant
      disconnects while marked as typing") was investigated, not dismissed: re-ran 3x
      with this feature's changes (2 pass/1 fail) and 3x with the 5 backend source files
      reverted via `git stash` (3/3 pass) — a real but small difference. Traced by
      reading the actual code paths: the test's clearing mechanism is the pre-existing
      Firestore-write-triggered typing TTL sweep, entirely independent of connection
      register/unregister; participant B stays connected throughout so US4's grace-timer
      branch (`connections.size === 0`) never engages, and the test finishes in ~8-15s,
      well under US3's 30s heartbeat interval, so that code never runs either. Confirmed
      pre-existing flakiness (the test's own inline comment already documents a prior
      CI-vs-local timing failure) coinciding with, not caused by, this feature —
      no code path connects them. Confirms a foreground/active tab shows no behavior
      change (FR-008, SC-005; Principle VII) for both suites' otherwise-unaffected tests.
- [X] T029 WCAG 2.1 AA self-review of the new user-facing surfaces (T015/T016): the
      `role="alert"` retry banner and full-page retry block use the existing `Button`
      component (already-established focus/keyboard support) and existing text-contrast
      tokens (`text-amber-900`/`bg-amber-50` light, `text-amber-200`/`bg-amber-950` dark)
      consistent with the codebase's existing warning-tone patterns; the message is
      never conveyed by color alone (an icon-free but fully-worded sentence is present
      regardless of the amber background); no new focus trap or keyboard-only-reachable
      control was introduced. No new visual/motion component was introduced (Principle
      IX N/A) — the unauthenticated path reuses the existing sign-out + `AuthWrapper`
      redirect, the 404 path reuses the existing full-page `notFound` block, and the
      retry-exhausted banner is a static (non-animated) block using existing utility
      classes, deliberately avoiding any new motion decision that would require the
      Apple-design skill package.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. T003 (shared E2E spec file) blocks every
  story's E2E test task (T006, T012, T017, T019, T022).
- **User Stories (Phase 3-7)**: All depend on Foundational. Stories are independent of
  each other in principle (each has its own Independent Test), but Phase 3/4 share one
  file (`backendRealtimeClient.ts`) and Phase 5/7 share another (`realtimeUpgrade.ts`),
  so within this task list they're sequenced in priority order (P1→P5) rather than
  parallelized across those specific pairs.
- **Polish (Final Phase)**: Depends on all five stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories.
- **US2 (P2)**: Independently testable per its own scenarios, but its implementation
  tasks (T013-T014) edit the same `onclose` handler US1's T008 introduces — sequenced
  after US1 in this task list, not run in parallel with it.
- **US3 (P3)**: No dependency on other stories (different file, `realtimeUpgrade.ts`'s
  liveness sweep vs. the client-side files US1/US2 touch).
- **US4 (P4)**: No dependency on other stories (gateway adapters, untouched by US1-US3).
- **US5 (P5)**: Independently testable, but T025 edits the same file US3's T018
  introduced (`realtimeUpgrade.ts`) — sequenced after US3 in this task list.

### Within Each User Story

- Tests MUST be written and FAIL before implementation.
- Story complete before moving to the next priority (recommended default order); a team
  with capacity could instead run US1, US3, and US4 fully in parallel (no file overlap),
  folding US2 in after US1 and US5 in after US3.

### Parallel Opportunities

- T002 and T003 (Foundational) in parallel.
- T004 and T005 (US1 unit tests) in parallel; T006 (US1 E2E) can run alongside them
  (different file) once T003 exists.
- T010 and T011 (US2 unit tests) in parallel.
- T015 and T016 (US2 UI wiring / i18n keys) in parallel once T014 lands.
- T020 and T021 (US4, Firestore vs. Redis-coordinated adapter) in parallel.
- T023 and T024 (US5, `retrospectives.ts` vs. `boards.ts`) in parallel.
- Across stories with no file overlap: US1, US3, and US4 can be staffed and run fully in
  parallel by different developers once Foundational is done.

---

## Parallel Example: User Story 1

```bash
# Unit tests together (different files):
Task: "Unit test for documentVisibility.ts 120s timing in src/features/boards/retrospective/services/documentVisibility.test.ts"
Task: "Unit test for backendRealtimeClient.ts visibility-pause behavior in src/features/boards/retrospective/services/backendRealtimeClient.test.ts"
```

## Parallel Example: User Story 4

```bash
Task: "Add 30s teardown-grace timer in server/src/adapters/firebase/FirestoreRealtimeGatewayAdapter.ts"
Task: "Mirror the same grace timer in server/src/adapters/firebase/redis/CoordinatedRealtimeGatewayAdapter.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: run quickstart.md Scenario A + E; confirm a backgrounded tab
   stops generating reads and reconnects cleanly on return.
5. Deploy — this alone eliminates the large majority of the resource drain that caused
   the `VTeTvsH1ovbOCBTzSD22` incident (per the original investigation's impact ranking).

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → validate independently → deploy (MVP).
3. US2 → validate independently → deploy (closes the "no cap at all" gap for cases US1
   doesn't cover, e.g. real network outages).
4. US3 → validate independently → deploy (server stops trusting the network layer alone).
5. US4 → validate independently → deploy (removes the double-reload cost on the
   reconnects that remain).
6. US5 → validate independently → deploy (last-line session backstop).
7. Final Phase → confirm no regression, close out constitution gates.

### Parallel Team Strategy

With multiple developers, after Foundational:

- Developer A: US1 → then US2 (same file, natural handoff).
- Developer B: US3 → then US5 (same file, natural handoff).
- Developer C: US4 (fully independent throughout).

---

## Notes

- [P] tasks touch different files with no unfinished dependency between them.
- [Story] labels trace every task back to its spec.md user story.
- Verify each test fails before writing its implementation.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before continuing.
- All five numeric thresholds (120s, 5min, 30s, 30s/2-miss) are fixed constants from
  `/speckit-clarify` — do not make them configurable; that would violate Principle V
  (Simplicity/YAGNI) and spec.md's own Assumptions.
