# Quickstart: Validating the Firestore Call-Volume Optimizations

Prerequisites: Firebase emulator suite running (`npm run emulators` from `retro-rocket/`), backend dev server running (`npm run dev:server`), frontend dev server running (`npm run dev`) or `npm run dev:all` for both. For Story 3 checks, a local or Upstash-free-tier Redis instance reachable via a connection string in `REDIS_URL` (or the project's chosen env var name, finalized during implementation) — for local development, the simplest option is `docker run --rm -p 6379:6379 redis:7-alpine`; the same instance (or a dedicated CI service container) is required for Story 3's automated E2E coverage, not just this manual walkthrough — see tasks.md's Redis test-infrastructure task.

## Story 1 — Deduplicated `/join` reads

1. Start the Firestore emulator with its debug log enabled (`firestore-debug.log` is already produced by `npm run emulators`).
2. Sign in as a test user and join a board once (`POST /api/retrospectives/:id/join`) so the participant record exists.
3. Clear/mark the emulator debug log, then call `POST /api/retrospectives/:id/join` again for the *same* already-joined user (simulating a reconnection).
4. Count `retrospectives/{id}` document reads attributable to that single request in the debug log.
   - **Expected (after fix)**: 1 read of `retrospectives/{id}` from this call (down from the up-to-2 duplicated reads inside the old `JoinRetrospective` → `join()` path; the WS handshake's own read is a separate call and outside this specific count — see research.md §1).
5. Repeat the same check for `GET /api/retrospectives/:id` immediately after — confirms `SC-001`'s reconnection-cycle target holds across the full resync, not just the join call in isolation.

## Story 2 — Idle typing-status sweep

1. Open a board in the browser, leave it idle (no typing) for at least 2 minutes.
2. Watch backend logs / emulator debug log for `typingStatus` collection queries during that idle window.
   - **Expected (after fix)**: no `typingStatus` queries fire while idle (event-driven sweep never schedules a check because no typing write ever occurred) — versus today's constant ~120/minute.
3. Type in a column, then stop. Time how long the "someone is typing" indicator takes to disappear for another connected browser/session viewing the same board.
   - **Expected**: indicator disappears within ~3.5s of the last keystroke, matching current behavior (`SC-002`).

## Story 3 — Single listener set across multiple instances

1. Start two (or more) local backend instances against the same Firestore emulator and the same Redis instance, on different ports (e.g. `SERVER_PORT=3001` and `SERVER_PORT=3002`), each with the coordination env vars set.
2. Open the same board from two separate browser tabs/sessions, each pointed at a different backend instance's WebSocket endpoint (`/api/retrospectives/:id/live`).
3. Inspect each instance's logs for Firestore `onSnapshot` listener start/stop events on the shared board.
   - **Expected**: only one instance logs "started Firestore listeners" for that board (the owner); the other logs only a Redis channel subscription, no direct Firestore listener start.
4. Create a card from the browser tab connected to the *non-owner* instance.
   - **Expected**: the card appears in real time in the browser tab connected to the *owner* instance too (proves the Redis relay path works end-to-end, not just within one instance).
5. Kill the owner instance's process (simulating a crash/redeploy) while the non-owner instance still has an active connection to the board.
   - **Expected**: after at most one lease TTL period, the surviving instance's logs show it acquiring ownership and starting its own Firestore listeners; real-time updates keep flowing to its connected clients throughout (`FR-007`).
6. Restart both instances fresh. Repeat steps 2-4, then this time close the *owner* instance's browser tab/WebSocket connection cleanly (not the process) so it releases the lease gracefully (§3 of `contracts/redis-coordination-protocol.md`) while the non-owner instance still has its own separate participant connected.
   - **Expected**: within one heartbeat interval (`leaseMs / 3`), the surviving (former non-owner) instance's logs show it acquiring ownership via the periodic re-check (contract §1 trigger (b)) and starting its own Firestore listeners — not just on a *new* registration event. This is the scenario `/speckit-analyze` flagged as unhandled by trigger (a) alone; confirming it here is the acceptance check for that fix.
7. With both instances running normally (coordinated mode), stop/block the Redis instance (e.g. pause the local Redis container, or point `REDIS_URL` at an unreachable host).
   - **Expected**: both instances' logs show a fallback to direct local Firestore listeners for the board(s) they're serving (per `FR-008a`); real-time updates keep flowing to each instance's own locally connected clients without interruption, though (in this degraded state only) each instance is running its own listener set again.
8. Restore Redis reachability.
   - **Expected**: within the retry backoff window, logs show the instances re-acquiring/re-subscribing via the normal protocol and tearing down the temporary direct listeners, returning to single-owner mode.

## Regression check (all stories)

Run the full existing suites and confirm no failures/coverage drop:

```sh
npm run test:server:coverage   # server/vitest.config.ts — 80/68/74/74 thresholds must still pass
npm run test:coverage          # root vitest.config.ts — frontend unaffected but must still pass
npm run e2e                    # Playwright against the Firebase emulator, including board-join.spec.ts,
                                # retrospective-board.spec.ts, and concurrent-board-*.spec.ts
```

`e2e/concurrent-board-network.spec.ts` and `e2e/concurrent-board-session.spec.ts` are the existing closest analogues to Story 3's multi-connection scenarios and are the natural home for new coverage extending them to assert real-time delivery still works when connections are deliberately routed through more than one backend process/gateway instance in test.
