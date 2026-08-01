# Feature Specification: Reliable Backend-Mediated Access for Concurrent Retrospective Teams

**Feature Branch**: `021-backend-realtime-updates`

**Created**: 2026-08-01

**Status**: Draft

**Input**: User description: "Desde que hemos pasado los tableros de retrospectivas a full backend, la app ha dejado de funcionar correctamente. Actualmente se produce error http 429 too many request con muy poco uso de la app. Simplemente con que haya varios usuarios conectados ya ni siquiera se puede hacer login por este problema. Quiero que la app sea usable por quipos de hasta 10 personas simultaneas en los paneles de retrospectiva. No quiero que se gaha polling, quiero que para las actualizaciones en vivo de las tarjetas en los navegadores se haga por push o por conexiones directas con websockets, lo que consideres más optimo. Tambien observo que se produce muiy a menudo una petición a channel de firebase. No debería haber comunicación entre front y firebase, debería pasar por backend. Revisa de donde nace el problema de los errores http 429 y ajusta los desvíos que tenemos ahora mismo."

## Overview

A prior migration moved the retrospective board screen to backend-mediated access, including a genuinely push-based (not polling) live-update channel between the browser and RetroRocket's backend. In production, that goal has not been fully reached: the application now returns HTTP 429 ("Too Many Requests") errors under very light concurrent use — to the point that simply having a few teammates connected at once can prevent everyone else from signing in — and the browser is still observed making frequent direct requests to a Firebase "channel" endpoint, meaning some real-time traffic still bypasses the backend entirely.

This feature closes that gap. It requires: (1) eliminating the false-positive throttling that currently blocks legitimate concurrent teammates from signing in and using the app, (2) removing every remaining direct browser-to-Firebase communication path (for both authentication and retrospective board data) so that, as originally intended, all such traffic passes through RetroRocket's backend, and (3) confirming that live updates to board content continue to reach every participant via a genuine push-based connection, never by polling, at the scale of a full team. The specific technical mechanism is a planning-stage decision (this specification fixes the required outcomes, not the implementation), but it must build on and correct the backend-mediated, push-based direction already established, not replace it with a different architecture.

## Clarifications

### Session 2026-08-01

- Q: What should happen when an 11th participant tries to join a board that already has 10 active participants? → A: No enforced hard cap — 10 concurrent participants is the guaranteed-working minimum; an 11th+ participant may still join and use the board on a best-effort basis, with no artificial rejection.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in reliably no matter how many teammates are already online (Priority: P1)

As a team member, I open RetroRocket and sign in, and this succeeds regardless of how many of my teammates are already signed in or already have a retrospective board open — my ability to log in must never depend on how many other legitimate people are using the app at the same time.

**Why this priority**: This is the most severe symptom reported: login itself becomes unusable once a handful of people are connected, which blocks every other use of the product. Nothing else in this feature can be verified until sign-in is dependable under concurrent use.

**Independent Test**: With 8-10 people signing in within the same short window (as would happen at the start of a real retrospective), confirm every one of them signs in successfully with no "too many requests" error, and that continuing to use the app (opening boards, refreshing, reconnecting after a brief network drop) does not later produce a sign-in failure for anyone else.

**Acceptance Scenarios**:

1. **Given** several teammates are already signed in and actively using the app, **When** another teammate attempts to sign in, **Then** their sign-in succeeds and is not rejected because of other users' unrelated activity.
2. **Given** a team of up to 10 people signing in within a short window of each other, **When** each completes the sign-in flow, **Then** all of them succeed with no "too many requests" error shown to any of them.
3. **Given** a legitimate burst of requests from one user's normal activity (e.g., reconnecting after a brief network interruption), **When** that burst occurs, **Then** it does not cause any *other* user's requests to be throttled.

---

### User Story 2 - Collaborate on a retrospective board with a full team, with no direct Firebase traffic from the browser (Priority: P1)

As a participant in a retrospective session with up to 10 people on the same board at once, I can create, edit, vote on, group, and react to cards, run the timer, and see everyone else's changes live, exactly as before — while my browser never communicates directly with Firebase for any of this; every request and every live update passes through RetroRocket's own backend.

**Why this priority**: This is the core promise of the earlier backend migration that has not actually been delivered end-to-end. Closing the remaining direct-to-Firebase paths is both what the user explicitly asked for and a direct contributor to the 429 errors, since that traffic shares the same externally-imposed quota that is being exhausted.

**Independent Test**: With 10 participants on the same board performing typical actions (adding/editing/voting/grouping cards, running the timer) for an extended session, inspect network traffic from each browser and confirm zero requests are made to any Firebase-owned endpoint at any point (sign-in included); confirm every participant still sees every other participant's changes live without reloading.

**Acceptance Scenarios**:

1. **Given** a participant's browser session on an open retrospective board, **When** any board data is loaded or changed (board state, columns, cards, groups, action items, timer, participants, typing indicators), **Then** the browser communicates only with RetroRocket's backend — never directly with Firebase.
2. **Given** a participant signs in, **When** the sign-in flow completes, **Then** no direct request from the browser to Firebase's authentication service occurs at any point in the flow.
3. **Given** 10 participants have the same board open at once, **When** one of them adds, edits, votes on, or groups a card, or starts the timer, **Then** every other participant sees that change on their own screen without reloading, and without the browser having polled for it.
4. **Given** the live-update connection for a participant drops (e.g., brief network blip) and automatically reconnects, **When** it reconnects, **Then** the participant's board resynchronizes to the correct current state and neither their reconnection nor other participants' unrelated activity is rejected as "too many requests."

---

### User Story 3 - Whole-team sessions stay stable over time (Priority: P2)

As a facilitator running a 30-60 minute retrospective with a full team, the session remains fully usable from start to finish — nobody gets disconnected in a way that requires a full page reload, and nobody is ever shown a "too many requests" error during normal use, even as live connections periodically reconnect in the background.

**Why this priority**: Real retrospectives run long enough for live connections to need to reconnect at least once; this story confirms the fix holds up over a realistic session duration and connection churn, not just at the initial moment of load.

**Independent Test**: Run a simulated 30+ minute session with 10 simulated participants performing periodic actions throughout, deliberately including at least one live-connection reconnect per participant; confirm zero "too many requests" errors occur and all board state remains accurate and complete at the end.

**Acceptance Scenarios**:

1. **Given** a retrospective session running for 30 or more minutes with up to 10 participants, **When** any participant's live connection needs to reconnect during that time, **Then** the reconnection completes without a user-visible error and without affecting any other participant.
2. **Given** a long-running session with periodic reconnects across multiple participants, **When** the session ends, **Then** the board's final state (cards, votes, groups, action items, timer) is complete and accurate, with nothing lost or duplicated.

---

### Edge Cases

- What happens when an 11th (or later) participant joins a board that already has 10 active participants? There is no enforced hard cap: 10 concurrent participants is the guaranteed-working minimum, not a ceiling, so the additional participant is allowed to join and use the board on a best-effort basis rather than being rejected — but this must not come at the cost of silently corrupting state or degrading the experience for the other participants already on the board.
- What happens when many participants' live connections reconnect at nearly the same moment (e.g., a shared office network blip affecting the whole team)? None of those legitimate reconnections should be misclassified as abusive traffic and rejected.
- What happens when one user is unusually active (rapid card edits, fast typing-indicator toggling)? Their own activity may reasonably be limited if it is genuinely excessive, but it must never cause a *different* user's unrelated requests to be rejected.
- What happens when a genuinely abusive or automated client sends a high volume of requests? The system must still be able to reject that traffic — this feature must not remove the ability to defend against real abuse, only stop it from misfiring against legitimate concurrent teammates.
- What happens when a request is legitimately throttled (e.g., real abuse, or a user retrying too aggressively)? The affected user sees a clear, understandable message, not a silent failure, a broken UI, or a generic crash.
- What happens to any code path that still exists in the application but is not currently reachable by normal use and that directly contacts Firebase from the browser? It must not be left in place where it could be reconnected to the UI later and silently reintroduce direct browser-to-Firebase traffic.

## Requirements *(mandatory)*

### Functional Requirements

**Concurrent usage without false-positive throttling**

- **FR-001**: The system MUST allow at least 10 people to sign in and use the same retrospective board at the same time without any of them receiving a "too many requests" error during normal use.
- **FR-002**: The system's request-throttling protections MUST distinguish between different legitimate users, such that the combined ordinary activity of multiple concurrent users is never treated as a single user's excessive activity and rejected on that basis.
- **FR-003**: The system MUST continue to be able to reject genuinely excessive or abusive request volumes from a single source; this feature narrows false positives, it does not remove throttling protection entirely.
- **FR-004**: When a request is legitimately throttled, the system MUST present the affected user with a clear, understandable message rather than a silent failure or a broken/blank state.

**Zero direct browser-to-Firebase communication**

- **FR-005**: The browser MUST NOT communicate directly with Firebase for authentication, at any point in the sign-in flow, including reconnection or session refresh.
- **FR-006**: The browser MUST NOT communicate directly with Firebase for any retrospective board data — including board/column state, cards, groups, action items, the timer, participants, typing indicators, facilitator notes, and sentiment results — whether for the initial load or for live updates; every such request MUST go through RetroRocket's backend.
- **FR-007**: Any code path in the application that is capable of opening a direct browser-to-Firebase connection or request, even one not currently reachable through normal use of the UI, MUST be removed so it cannot be reintroduced later as a silent regression.

**Genuine push-based live updates, not polling**

- **FR-008**: Live updates to retrospective board content (cards, groups, action items, timer, typing indicators, participant presence) MUST continue to reach every open participant's screen through a persistent, push-based connection that delivers changes as they happen; the browser MUST NOT rely on repeatedly re-requesting the same data on a fixed interval to receive these updates.
- **FR-009**: Live updates MUST continue to reach every other open participant within the previously established 2-second (p95) delivery target, without regression, while supporting up to 10 concurrent participants on the same board.
- **FR-010**: When a participant's live-update connection is interrupted and automatically reconnects, the reconnection itself MUST NOT be capable of triggering a "too many requests" rejection for that participant or for any other participant.

**Correctness and continuity**

- **FR-011**: The system MUST NOT lose, duplicate, or corrupt any board state (cards, votes, groups, action items, participants, timer state) as a result of multiple participants' sessions connecting, disconnecting, or reconnecting concurrently.
- **FR-012**: Existing functionality for a single user or a small team (fewer than 10 concurrent participants) MUST continue to work exactly as it does today; this feature MUST NOT introduce a regression in already-working sign-in, dashboard, profile, or board flows.

### Key Entities

- **Participant Session**: A signed-in user's active presence on a retrospective board, including the standing connection used to deliver live updates to that user's browser.
- **Usage Throttling Policy**: The rule set that limits how many requests a given source may make in a period of time, applied per legitimate user/session rather than in a way that can be exhausted by the combined activity of unrelated users.
- **Live Update**: A change to board content (a card, group, action item, timer, typing status, or participant list change) that must be delivered to every other open participant without that participant requesting it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A team of 10 people can each sign in within the same 2-minute window with zero sign-in failures caused by "too many requests" errors.
- **SC-002**: A retrospective board with 10 simultaneous participants can run a full 30+ minute session — creating, editing, voting, grouping, and reacting to cards, running the timer, and managing action items — with zero user-visible "too many requests" errors.
- **SC-003**: 100% of live updates made by one participant (card changes, votes, groups, timer, typing indicators, action items, participant presence) are seen by every other open participant without that participant reloading or manually refreshing.
- **SC-004**: Live updates reach every other open participant within 2 seconds in 95% of cases, matching the previously established target, at up to 10 concurrent participants per board.
- **SC-005**: Inspection of network traffic from a participant's browser during sign-in and during a full retrospective session shows zero direct requests to any Firebase-owned endpoint; all data requests target RetroRocket's own backend.
- **SC-006**: Over a full week of real production usage following this fix, the rate of "too many requests" errors experienced by real users during normal usage (up to 10 concurrent participants per board, ordinary interaction frequency) is zero.

## Assumptions

- "Teams of up to 10 people simultaneous in retrospective panels" is interpreted as: at least 10 concurrent participants must be fully supported on a single retrospective board, and the system must also support multiple such boards (multiple teams) running concurrently, not just one team at a time exclusively. Per the Clarifications, 10 is a guaranteed-working minimum, not an enforced hard cap — the system MUST NOT artificially reject an 11th or later participant.
- The 2-second (p95) live-update delivery target already established for the retrospective board screen continues to be the correct bar for this feature; this feature is not expected to improve on it, only to preserve it while fixing throttling and closing remaining direct-Firebase paths.
- This feature narrows and corrects throttling false positives; it does not remove the system's ability to defend against genuine abuse or automated attacks.
- "Push or direct WebSocket connections, whichever is most appropriate" is understood as hardening and correcting the backend-mediated, push-based delivery channel already established for the retrospective board, not introducing a second, competing real-time mechanism alongside it.
- The sign-in flow is shared across the whole application (not specific to the retrospective board), so fixing it benefits every screen; a full re-audit of already-completed backend-mediation work for the Dashboard and Mi Perfil screens is out of scope beyond ensuring the shared sign-in flow itself no longer contacts Firebase directly.
- Any application code that is not currently reachable through the live UI but is still capable of contacting Firebase directly from the browser is treated as in-scope to remove, since leaving it in place risks a future silent regression of the "no direct Firebase" requirement.
