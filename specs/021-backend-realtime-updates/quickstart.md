# Quickstart: Validating the Fix

Prerequisites: local dev server running against the Firebase Emulator Suite (existing project
convention — `VITE_USE_FIREBASE_EMULATOR=true`), so validation never touches production Firebase
quota. This mirrors how `019`'s own Playwright E2E suite is already run.

## 1. Concurrent sign-in no longer 429s (spec SC-001, User Story 1)

1. Start the app locally (`npm run dev` plus the emulator suite, per existing project scripts).
2. Open 8–10 separate browser contexts (Playwright's `browser.newContext()` in a test, or manually
   in separate private-browsing windows) and sign in through each within a couple of minutes of
   each other.
3. **Expected**: every sign-in succeeds; no `429`/"rate_limited" response appears in any session's
   network log, including the last one to sign in.
4. Automated equivalent: `server/test/http/middleware/rateLimiting.test.ts` (new) asserts that N
   distinct session-keyed requests within one window are never throttled against each other, and
   that IP-keyed requests from N distinct simulated client IPs behave the same way.

## 2. Zero direct browser-to-Firebase traffic (spec SC-005, User Story 2)

1. With the emulator suite running, open a retrospective board signed in as a participant.
2. Inspect the browser's network panel (or drive it via Playwright's request-interception API in an
   E2E test) for the full session: sign-in, board load, adding/editing/voting a card, running the
   timer.
3. **Expected**: zero requests to any Firebase/Firestore/Identity-Toolkit-owned host at any point;
   every data request targets `/api/*` on the app's own origin.
4. Automated equivalent: `src/test/architecture/retrospective-board-no-firestore.test.ts`, updated
   so both `EXPECTED_REMAINING_OFFENDERS` and `PERMANENT_EXCEPTIONS` are empty — the test fails the
   build if any tracked file (or a new one) imports `firebase/firestore` again.

## 3. Live updates still push, not poll, at 10 participants (spec SC-003, SC-004, User Story 2/3)

1. Open the same board in 10 browser contexts.
2. From one context, add a card, vote, start the timer, and toggle a typing indicator.
3. **Expected**: every other of the 9 contexts reflects each change within 2 seconds, with no
   context ever issuing a repeated fetch of the same board-state endpoint on a fixed interval
   (confirm via network panel: only the initial `GET /api/retrospectives/:id`, the one WebSocket
   upgrade, and the actions each participant explicitly performs).
4. Automated equivalent: existing `019` realtime E2E coverage, re-run at this feature's target
   participant count (10) rather than the smaller count it may have originally been validated at.

## 4. Session stays stable through reconnects (spec SC-002, User Story 3)

1. With 10 contexts open on the same board, force one WebSocket connection to drop (e.g. briefly
   block the `/api/retrospectives/:id/live` request in a Playwright route handler) and let the
   client's existing exponential-backoff reconnect logic run.
2. **Expected**: the reconnecting client resyncs via `GET /api/retrospectives/:id` and resumes
   receiving live events with no user-visible error; no other of the 9 contexts sees a 429 as a
   side effect of that reconnect.

## 5. Abuse protection still works (spec FR-003, edge case)

1. Send a rapid burst of requests from a single simulated identity (same session or same IP,
   depending on which routes are still IP-keyed) well beyond the resized limit.
2. **Expected**: that single source is throttled with the `rate_limited` envelope
   (`contracts/rate-limiting-contract.md`); a concurrently-running second identity, verified in
   step 1 above, is unaffected.
