# Quickstart: Validating Retrospective Board Backend-Mediated Access

Prerequisites: Firebase emulator suite configured (as used by `npm run e2e`), repo dependencies installed (`npm install` at `retro-rocket/`). Most scenarios below need **two browser sessions** (e.g. one normal window + one private/incognito window, each signed in as a different user) since this feature is fundamentally about cross-participant live updates.

## 1. Run the backend and frontend together against the emulator

```bash
cd retro-rocket
npm run emulators &        # firebase emulators:start --only auth,firestore
npm run dev:all            # vite (frontend) + vite-node --watch server/src/dev-server.ts (backend)
```

## 2. Confirm zero direct Firebase calls, including for live updates

1. Sign in as User A, create a board, open it. Open DevTools Network, filter by domain.
2. **Expected**: `GET /api/retrospectives/:id` on load, a `wss://.../api/retrospectives/:id/live` WebSocket connection, and `POST /api/retrospectives/:id/join`. Zero requests to any `*.googleapis.com`/`*.firebaseio.com`/`identitytoolkit.googleapis.com` endpoint from this screen (the app-wide bootstrap `signInWithCustomToken` call is expected/out of scope — spec Assumptions, research.md §14).
3. Sign in as User B (second session), open the same board via its link. Confirm the same pattern — REST + WebSocket only, never a direct Firestore/`onSnapshot` network entry.

## 3. Exercise each user story (two sessions: A and B)

**Open and see it come alive (US1)**: User B opens the board for the first time — confirm auto-join (`POST .../join`) and full state load (`GET /api/retrospectives/:id`) reflect existing columns/cards/groups/action items/participants/timer. With both A and B open, have A add a card; confirm it appears on B's screen **without B reloading**, within ~2 seconds (SC-004). Delete the board as its owner (from Dashboard) while B still has it open, then have B take an action — confirm a clear "board no longer exists" state, not a broken UI (Acceptance Scenario 4). Simulate a load failure (abort `GET /api/retrospectives/:id`) — confirm a visible error state, not a blank board.

**Cards (US2)**: From A: create, edit, delete, vote, like, and react to a card. Confirm each change appears on B's screen live. Open the same card in two sessions and vote/like from both within a second of each other — confirm the final count reflects both actions (no lost update, FR-008/FR-009). Abort a card-create request — confirm a clear error and no duplicate/half-created card left behind.

**Typing and participants (US3 — special attention)**: From A, start typing in a column's composer. Confirm B sees a live "A está escribiendo…" indicator within ~2 seconds, and that it clears within a few seconds of A stopping (matching the existing 300ms debounce / 5000ms TTL — data-model.md). Have a third session join the board; confirm A and B's participant lists update live without reloading. Confirm (via Network tab) that A's typing signal is sent via `POST /api/retrospectives/:id/typing`, never a direct Firestore write.

**Reorder and grouping (US4)**: Drag a card to reorder it and to a different column from A; confirm the change persists (reload B) and, live, appears on B without reload. Group two cards, then disband the group from A; confirm both operations appear live on B. Interrupt a reorder request (abort mid-flight) — confirm no card ends up duplicated or missing (FR-010's atomic batch).

**Facilitator tools (US5)**: As the facilitator (board creator), start/pause/reset the timer; confirm B sees the identical running state live. From B (non-facilitator), attempt to call `POST /api/retrospectives/:id/timer/start` directly (e.g. via a REST client) — confirm `403`. Write a facilitator note as A; confirm it never appears in B's session (even if B is also a facilitator on a *different* board — check the `GET` response's `myFacilitatorNotes` only ever contains the caller's own). Convert a card to an action item as facilitator; confirm it appears live in B's Action Items list.

**Action items (US6)**: Create, edit, delete an action item directly from A; confirm each appears live on B.

**Sentiment persistence (US7)**: Trigger local sentiment analysis on a card (or override as facilitator); reload the board; confirm the result is still shown, sourced from `GET /api/retrospectives/:id`'s `sentimentResults`, not a direct Firestore read.

## 4. Validate reconnection (FR-018/FR-019/FR-019a, realtime-protocol.md)

1. With A's board open and the WebSocket connected, use DevTools to force-close the WebSocket connection (or throttle to offline briefly).
2. **Expected**: the client detects the close, reconnects with backoff, performs a fresh `GET /api/retrospectives/:id` on reconnect, and resumes receiving live events — no full page reload, no duplicated/"ghost" cards, matching the spec's reconnection edge case.
3. While A is disconnected, have B add a card. **Expected**: once A reconnects, the resync (`GET`) picks it up even though A missed the live event for it.

## 5. Automated checks

```bash
npm run test:server           # backend unit tests: new retrospective/cards/groups/timer/notes/action-items/sentiment/typing use-cases, adapters, routes, and the realtime gateway
npm run test:run              # frontend unit tests: new backendRetrospectiveClient, backendRealtimeClient, updated hooks
npm run type-check:server && npm run type-check
npm run lint
npm run e2e                   # Playwright, incl. new retrospective-board.spec.ts critical-flow spec (two-context live-update scenarios)
```

All must pass, and coverage thresholds (80% branches/functions/lines/statements) must hold, per constitution Principles I, VI, VII.

## 6. Validate SC-001 (write/read latency) and SC-004 (live-update latency)

1. **SC-001, warm**: with `npm run dev:all` already running, time each data-changing REST call (create card, vote, reorder, etc.) from request start to response. **Expected**: under 3s.
2. **SC-001, cold**: restart the backend (or deploy a preview and hit it after inactivity) and repeat. **Expected**: under 5s.
3. **SC-004**: with A and B both open, timestamp a card creation on A's side and the moment the `entity_change` WebSocket message arrives on B's side. **Expected**: under 2s (p95 across repeated trials).
4. Record observed timings against these targets; a miss is a regression to fix, not a target to loosen.

## 7. Validate SC-002 and SC-006 (no direct Firebase, authorization)

1. **SC-002**: repeat step 2 above across every user story in step 3 — confirm the running total of direct-to-Firebase requests from this screen stays at zero throughout, including during live updates (the WebSocket connection is the only "standing connection," and it terminates at the backend, not Firebase).
2. **SC-006**: with a REST client (not the UI), attempt: editing/deleting a card you don't own, controlling the timer as a non-facilitator, reading another facilitator's notes (via a manipulated `GET` if the API ever exposed a facilitator-id parameter — it doesn't, by design), and reordering cards on a board you're not a participant of. **Expected**: every attempt is rejected (`401`/`403`), confirming FR-020 holds independent of the frontend UI.
