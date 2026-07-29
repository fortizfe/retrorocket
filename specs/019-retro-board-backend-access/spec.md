# Feature Specification: Retrospective Board Backend-Mediated Access

**Feature Branch**: `019-retro-board-backend-access`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "Siguiendo con la migración hacia backend, nos queda solamente la pantalla de retrospectiva. Lo que queremos es que la comunicación frontend para esa pantalla sea lo más posible orientada a backend. Especial atención a que en esa pantalla puede haber eventos en tiempo real. Como cuando otro usuario añade una tarjeta o el control que muestra si otra persona está escribiendo. Revisa detenidamente lo que es posible mover a backend y lo que no es posible mover. Lo que no se pueda mover, tiene que quedar documentado."

## Overview

This is the last of the screens in RetroRocket's phased migration away from direct browser-to-Firebase access, following `017-dashboard-backend-access` and `018-profile-backend-access`. The retrospective board is also by far the richest of the three: participants create, edit, vote on, react to, and reorder cards; group related cards together; manage action items; run a shared countdown timer; and — unlike the other two screens — see each other's actions **live**, without reloading (another participant's new card appearing instantly, a "so-and-so is typing" indicator, the list of who has joined).

Every action a participant takes that changes data (adding a card, voting, reordering, starting the timer, and so on) can be moved behind the backend the same way Dashboard and Mi Perfil were: the browser asks the backend to make the change, and the backend is the only thing that talks to Firebase. That part of this migration is a direct continuation of the established pattern.

The live, "I see it the instant it happens" behavior is different in kind. Today it works because the browser holds an open, standing connection to Firebase and Firebase pushes changes down the moment they occur. The backend that was built for this project is intentionally lightweight (it wakes up to answer one request and goes back to sleep) and has no equivalent standing connection to push changes down to browsers today. Building one is a real, substantial piece of infrastructure — not a small extension of the request/response pattern used for Dashboard and Mi Perfil. This specification requires that this feature close that gap too: by completion, a backend-mediated delivery channel MUST exist so that live updates (cards, groups, action items, timer, typing indicators, participant list) reach every open participant's screen with no direct, standing browser-to-Firebase connection remaining for any purpose. The specific technical mechanism used to build that channel is a technical/architectural decision reserved for planning, not dictated here — but the requirement that it exist, fully backend-mediated, is fixed.

## Clarifications

### Session 2026-07-28

- Q: Should this feature ship with live-update delivery still on a direct, read-only Firebase connection (deferring a backend-mediated realtime channel to a later effort), or must this feature itself design and build a backend-mediated real-time delivery channel so that zero direct browser-to-Firebase communication remains, including for live updates? → A: This feature MUST design and build a backend-mediated real-time delivery channel; by completion, no direct browser-to-Firebase connection may remain for any purpose, including live-update delivery.
- Q: What is the concrete maximum acceptable delay for a live update to reach another participant's screen through the new backend-mediated delivery channel? → A: 2 seconds (p95).
- Q: Should the new backend-mediated delivery channel be required to genuinely push updates to the client, be allowed to poll the backend at a short interval, or should that transport choice be left entirely to technical planning? → A: The channel MUST genuinely push updates to the client as they happen; periodic polling alone does not satisfy this requirement.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open a retrospective board and see it come alive (Priority: P1)

As a signed-in user, I open a retrospective board (arriving directly, or automatically joining it for the first time), and I see its columns, cards, groups, action items, participants, and timer state exactly as I do today — sourced through RetroRocket's backend rather than a direct request to Firebase — and the board continues to update as other participants act, without me reloading the page.

**Why this priority**: This is the screen's entry point. Nothing else here (adding a card, voting, running the timer) can be verified until a participant can open the board, see its current state, and see it stay current.

**Independent Test**: As a user who has never joined a given board, open it via its link; confirm you are automatically added as a participant and see the board's current columns, cards, groups, action items, participant list, and timer state, sourced through the backend for the initial load. While the board is open, have a second participant add a card in another session; confirm it appears on the first participant's screen without a reload.

**Acceptance Scenarios**:

1. **Given** a signed-in user opening a board they haven't joined yet, **When** the page loads, **Then** they are automatically recorded as a participant and see the board's full current state (columns, cards, groups, action items, participants, timer), fetched through the backend.
2. **Given** a signed-in user who has already joined a board, **When** they return to it, **Then** they see the same up-to-date state without being re-added as a duplicate participant.
3. **Given** a participant has the board open, **When** another participant adds, edits, deletes, or votes on a card, **Then** the change appears on the first participant's screen without them reloading the page.
4. **Given** a board that has just been permanently deleted by its owner, **When** a participant who has it open takes any further action, **Then** they see a clear "this board no longer exists" state rather than a broken or stuck UI.
5. **Given** a temporary backend/network failure while loading the board, **When** the request fails, **Then** the user sees a clear error state, not a silent blank board or crash.

---

### User Story 2 - Add, edit, vote on, and react to cards (Priority: P1)

As a participant, I add cards to a column, edit or delete my own cards, vote, like, and react to cards, exactly as I do today, with every one of those changes made through the backend rather than a direct write to Firebase, and visible to other participants live.

**Why this priority**: Cards are the core content of a retrospective; this is the primary write-path on the screen and the one most explicitly called out by the user ("cuando otro usuario añade una tarjeta").

**Independent Test**: Add a card to a column, edit its text, vote on it, like it, and react to it with an emoji; confirm each action is reflected immediately in your own view and, from a second participant's session, that the same changes appear there too — while network inspection shows the write requests reaching only the backend.

**Acceptance Scenarios**:

1. **Given** a participant on an open column, **When** they submit a new card, **Then** it is created via the backend and appears in that column for every participant.
2. **Given** a card, **When** its owner edits its text or deletes it, **Then** the change is applied via the backend and reflected for every participant.
3. **Given** a card, **When** multiple participants vote or like it at the same time, **Then** the resulting vote/like count is accurate for all of them — no vote or like is silently lost because two people acted at once.
4. **Given** a card, **When** a participant adds or changes their emoji reaction, **Then** the backend records it and it is visible to every participant.
5. **Given** the backend rejects or fails a card write (network/backend error), **When** the failure occurs, **Then** the user sees a clear error message and the card list is left in a consistent state (no duplicate or half-created card).

---

### User Story 3 - See who's typing and who's here (Priority: P1)

As a participant, I see a live "X está escribiendo…" indicator when someone else is composing a card in a column, and I see the up-to-date list of who has joined the board, exactly as I do today, with my own typing signal sent through the backend.

**Why this priority**: Explicitly called out by name as needing special attention. It is the screen's most latency-sensitive feature and the clearest test of whether the new backend-mediated real-time delivery channel (required by this feature) preserves today's responsiveness.

**Independent Test**: Start typing in a card composer in one session; confirm a second participant's session shows a live "typing" indicator for that column, and that it disappears shortly after typing stops or the composer closes. Separately, join a board from a new session and confirm the existing participant's view updates to include the new participant without a reload.

**Acceptance Scenarios**:

1. **Given** a participant starts typing in a column's card composer, **When** their typing status is sent, **Then** it is recorded via the backend (not a direct Firebase write).
2. **Given** a participant is shown as "typing" to others, **When** they stop typing or leave the composer for longer than the existing short grace period, **Then** the indicator clears for other participants without requiring any action from them.
3. **Given** a new participant joins the board, **When** their join is recorded via the backend, **Then** they appear in every other open session's participant list without a reload.
4. **Given** the delivery mechanism that pushes another participant's typing status or participant-list change to your screen, **When** it is built during technical planning, **Then** it delivers those changes through the backend as well — the frontend MUST NOT retain any direct, standing connection to Firebase for this or any other live signal on this screen.

---

### User Story 4 - Reorder and group cards (Priority: P2)

As a participant, I drag cards to reorder them or move them between columns, and I group related cards together (or ungroup them), exactly as I do today, with every change made through the backend and visible to other participants live.

**Why this priority**: Card organization is a secondary but expected part of running a retrospective; it depends on cards already existing (Story 2) and is lower-frequency than adding/voting.

**Independent Test**: Drag a card to a new position and to a different column; confirm the new order/column persists after reload and appears for a second participant. Group two cards together, then disband the group; confirm both operations persist and appear for a second participant — all via the backend.

**Acceptance Scenarios**:

1. **Given** a column with multiple cards, **When** a participant reorders them or moves one to a different column, **Then** the new order/column is saved via the backend and reflected for every participant.
2. **Given** a reorder/move is interrupted partway (e.g., a network drop mid-drag), **When** the interruption occurs, **Then** no card is left duplicated or missing — the operation either completes fully or the board reconciles back to its last valid state.
3. **Given** two or more related cards, **When** a participant groups them, **Then** the group is created via the backend and shown to every participant; disbanding the group, or adding/removing a card from it, behaves the same way.

---

### User Story 5 - Run facilitator tools (Priority: P2)

As the board's facilitator, I control the shared countdown timer and keep my own private notes, and I can convert any card into an action item, exactly as I do today, with every change made through the backend.

**Why this priority**: Facilitator tools are used by one role on a subset of boards, not by every participant on every board, so they are scoped below the core card-collaboration stories.

**Independent Test**: As the facilitator, start, pause, and reset the shared timer and confirm participants see the same running state; write a private note and confirm it does not appear to any other participant; convert a card into an action item and confirm it appears in the Action Items list — all via the backend.

**Acceptance Scenarios**:

1. **Given** the facilitator starts, pauses, or resets the countdown timer, **When** the action is taken, **Then** it is applied via the backend and every participant sees the same timer state.
2. **Given** a participant who is not the facilitator, **When** they attempt to control the timer directly against the backend (bypassing the UI), **Then** the backend rejects it.
3. **Given** the facilitator writes, edits, or deletes a private note, **When** the change is saved via the backend, **Then** it is visible only to that facilitator, never to other participants.
4. **Given** any card, **When** the facilitator converts it into an action item, **Then** the conversion is performed via the backend and the resulting action item appears in the Action Items list for every participant.

---

### User Story 6 - Manage action items (Priority: P2)

As a participant, I create, edit, delete action items directly (not only by converting a card), exactly as I do today, with every change made through the backend and visible to every participant live.

**Why this priority**: Action items are the retrospective's concrete output; important, but naturally scoped after the core card-collaboration stories since they are typically populated later in a session.

**Independent Test**: Create an action item directly, edit its details, and delete it; confirm each change appears for a second participant — all via the backend.

**Acceptance Scenarios**:

1. **Given** a participant on the Action Items list, **When** they create, edit, or delete an action item, **Then** the change is applied via the backend and reflected for every participant.

---

### User Story 7 - See AI sentiment results persist across sessions (Priority: P3)

As a participant, when a card's AI-estimated sentiment/mood has been computed, I see that result reflected on the card, and it remains available the next time the board is opened, with the result saved and loaded through the backend.

**Why this priority**: Sentiment analysis is a supporting insight layer, not core retrospective functionality, and its underlying computation already runs locally in the browser — only the saving/loading of the result is affected by this migration.

**Independent Test**: Trigger sentiment analysis on a card (or have the facilitator override a result), reload the board, and confirm the result is still shown, sourced through the backend rather than a direct Firebase read/write.

**Acceptance Scenarios**:

1. **Given** a card's sentiment has been computed or manually overridden, **When** the result is saved, **Then** it is persisted via the backend.
2. **Given** a board is reopened, **When** its cards load, **Then** any previously saved sentiment results are loaded via the backend and shown on the corresponding cards.

---

### Edge Cases

- What happens when a participant's session expires mid-action (typing, voting, dragging, converting a card)? They see a clear "please sign in again" state rather than a silent failure or a stale success indicator.
- What happens when two participants vote, like, or react to the same card at the same instant? The resulting count/state must be accurate for both — no lost update.
- What happens when a reorder/move is interrupted partway through (e.g., a network drop mid-drag-and-drop)? No card ends up duplicated or missing; the board reconciles to a correct final state.
- What happens when a non-facilitator attempts to control the timer, or read another facilitator's private notes, directly against the backend (bypassing the UI)? The backend rejects it.
- What happens when a participant's typing indicator is left active because they closed the tab without it clearing normally? It expires on its own shortly after, exactly as it does today, rather than sticking forever for other participants.
- What happens when a participant attempts to join a board that was just deleted by its owner? They see a clear "board not found" error, not a partial or broken join.
- What happens to boards, cards, groups, action items, timers, facilitator notes, and sentiment results that existed before this migration shipped? They remain fully visible, correct, and usable afterward, with no data loss.
- What happens when the mechanism delivering live updates to a participant's screen is temporarily unavailable (e.g., a dropped connection)? The participant's view resynchronizes to the board's correct current state once connectivity is restored, without duplicated or "ghost" cards, and without requiring a full page reload to recover.

## Requirements *(mandatory)*

### Functional Requirements

**General backend-mediation**

- **FR-001**: Every data-changing action on the retrospective board screen — creating, editing, deleting, or voting/liking/reacting to a card; reordering or moving a card; creating, disbanding, or modifying a card group; creating, editing, deleting, or converting-from-a-card an action item; starting, pausing, resetting, or deleting the countdown timer; creating, editing, or deleting a facilitator note; saving or overriding a sentiment result; joining the board; and sending a typing-status signal — MUST be requested through the RetroRocket backend, never written directly to Firebase from the browser.
- **FR-002**: The one-time initial load of a retrospective board's full state (columns, cards, groups, action items, participants, timer state, facilitator's own notes, and previously saved sentiment results) MUST be fetched through the backend, never read directly from Firebase from the browser.
- **FR-003**: The backend MUST authenticate every retrospective-board request using the existing session-based authentication already in place; the frontend MUST NOT use a Firebase Auth client-side credential to authorize any of the writes or the initial load covered by FR-001/FR-002.

**Board load and participation**

- **FR-004**: The backend MUST expose an operation that returns a board's complete current state in one request, matching what the screen displays today.
- **FR-005**: The backend MUST expose an operation to join a board (recording the requesting user as a participant), automatically invoked on first visit, and MUST NOT create a duplicate participant record if the user has already joined.
- **FR-006**: The system MUST explicitly surface loading, error, and empty/not-found states for every operation in this feature — board load and join, card lifecycle and interactions, reorder/grouping, facilitator timer/notes/convert-to-action-item, action items, sentiment persistence, and the typing signal — with no silent failures, including when a participant's session expires mid-action (matching the equivalent requirement already established for every operation in `017`'s and `018`'s specs).

**Card lifecycle and interactions**

- **FR-007**: The backend MUST expose operations to create, edit, and delete a card, restricted to the same ownership rules already enforced today.
- **FR-008**: The backend MUST expose an operation to vote on a card and MUST keep the resulting vote count accurate under concurrent votes from multiple participants, with no lost updates.
- **FR-009**: The backend MUST expose operations to like a card and to add, change, or remove an emoji reaction on a card, with the same no-lost-update guarantee as voting.

**Card organization**

- **FR-010**: The backend MUST expose an operation to reorder cards within a column or move a card to a different column, leaving no card duplicated or missing if the operation is interrupted partway through.
- **FR-011**: The backend MUST expose operations to create a card group, disband a group, add or remove a card from a group, collapse or expand an individual group, and save a column's group-display preference (which grouping criteria — none, by-user, or by-suggestion — is active, and which groups are currently shown for that column).

**Facilitator tools**

- **FR-012**: The backend MUST expose operations to start, pause, and reset the shared countdown timer, restricted to the board's facilitator, and MUST reject the request if the requesting user is not the facilitator.
- **FR-013**: The backend MUST expose operations to create, edit, and delete a facilitator's private notes, and MUST return a given facilitator's notes only to that same facilitator.
- **FR-014**: The backend MUST expose an operation to convert an existing card into an action item.

**Action items**

- **FR-015**: The backend MUST expose operations to create, edit, and delete an action item directly (independent of card conversion).

**AI sentiment results**

- **FR-016**: The backend MUST expose operations to save a computed sentiment result and to save a facilitator's manual override of one, and to load previously saved results as part of the board's initial state (FR-004). The underlying AI computation itself continues to run locally in the browser and is unaffected by this migration.

**Real-time collaboration signals**

- **FR-017**: The backend MUST expose an operation to record a participant's typing-status signal (starting or stopping) for a given column, so that the signal itself is always backend-recorded, per FR-001.
- **FR-018**: The system MUST continue to deliver, to every other participant with the board open, live updates reflecting card changes, group changes, action-item changes, timer changes, typing-status changes, and participant-list changes — without any participant needing to reload the page — within **2 seconds (p95)** of the originating change.
- **FR-019**: By completion of this feature, the mechanism that satisfies FR-018 MUST itself be backend-mediated: the browser MUST NOT retain any direct, standing connection to Firebase — read-only or otherwise — to receive live updates. The specific technical transport/design used to build this delivery channel is a technical/architectural decision reserved for planning; only the requirement that it be fully backend-mediated is fixed here (see Assumptions for the documented reasoning behind why this is new, non-trivial infrastructure).
- **FR-019a**: The delivery channel required by FR-019 MUST genuinely push each change to affected participants' screens as it happens; periodically polling the backend for changes, on its own, does NOT satisfy FR-018/FR-019, regardless of poll frequency.

**Authorization and integrity**

- **FR-020**: The backend MUST enforce the same ownership and role-based authorization rules already enforced today (e.g., only a card's owner may edit/delete it; only the facilitator may control the timer; a facilitator's notes are visible only to that facilitator) for every operation in this feature, independent of what the frontend UI shows or hides.
- **FR-021**: The system MUST NOT lose, corrupt, or make inaccessible any board, card, group, action item, timer, facilitator note, or sentiment result that existed before this migration; all of it MUST remain fully visible, correct, and usable afterward.

**Out of scope**

- **FR-022**: Screens and flows outside the retrospective board (Dashboard, Mi Perfil, authentication sign-in, the MCP connector's own tool surface) are explicitly OUT OF SCOPE for this feature and MUST continue to function as they do today, unaffected by this migration.
- **FR-023**: Export (PDF/DOCX/TXT) already operates entirely on data already loaded into the screen and makes no Firebase calls of its own; it requires no change and remains OUT OF SCOPE.

### Key Entities

- **Retrospective Board**: The retrospective session itself — title, columns, active/inactive state, facilitator, timer state, and the requesting user's participation in it.
- **Column**: A named, ordered section of the board (e.g., "What went well") that cards belong to.
- **Card**: A single note added to a column — text, owner, votes, likes, reactions, order/position, and optional sentiment result.
- **Card Group**: A cluster of related cards a participant has merged together, with a collapse/expand display state.
- **Participant**: A user who has joined the board, shown in the participant list.
- **Action Item**: A follow-up task recorded on the board, either created directly or converted from a card.
- **Countdown Timer**: The board's shared timer state (running/paused, remaining time), controlled by the facilitator.
- **Facilitator Note**: A private note belonging to one facilitator, never visible to other participants.
- **Sentiment Result**: The saved outcome of AI mood analysis for a card, either automatically computed or manually overridden by the facilitator.
- **Typing-Status Signal**: A short-lived record of a participant actively composing a card in a given column.
- **User Session**: The authenticated user's backend session, used to identify who is acting on the board.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every data-changing action on the board (add/edit/delete/vote/like/react to a card, reorder/move, group/ungroup, timer control, facilitator note, action item, join) completes within **3 seconds (p95) on a warm backend** and **5 seconds (p95) including a cold serverless start**, matching the latency baseline already established for this backend.
- **SC-002**: Zero direct network requests or standing connections from the browser to any Firebase/Firestore endpoint are observed for any data-changing action, the board's initial load, or the delivery of live updates.
- **SC-003**: 100% of existing retrospective-board functionality (viewing, joining, card CRUD, voting, liking, reacting, reordering/moving, grouping, action items, facilitator timer, facilitator notes, sentiment results, typing indicator, participant list) passes a full regression pass after the migration, with no feature removed or degraded from the user's perspective.
- **SC-004**: Live updates from one participant's action reach every other open participant's screen within **2 seconds (p95)**, with no manual reload required.
- **SC-005**: 100% of boards, cards, groups, action items, timers, facilitator notes, and sentiment results that existed before the migration remain visible, correct, and usable afterward, with zero reported data loss.
- **SC-006**: 100% of tested unauthorized write attempts (e.g., a non-owner editing another participant's card, a non-facilitator controlling the timer, reading another facilitator's private notes) are rejected by the backend.

## Assumptions

- **Scope**: This is the fourth and final phase of the browser-to-backend migration begun in `014-backend-auth-foundation` and continued in `017-dashboard-backend-access` and `018-profile-backend-access`. After this feature, no remaining application screen is expected to require direct browser-to-Firebase access for its core functionality — this feature closes that gap entirely, including for real-time delivery.
- **What moves to the backend**: Every data-changing (write) action on this screen, its one-time initial data load, and — per this feature's Clarifications — the delivery of live updates all move behind the backend, the same pattern already applied to Dashboard and Mi Perfil, extended here to cover real-time delivery as well.
- **Real-time delivery requires new backend infrastructure (documented complexity, not a documented exception)**: The *delivery* of live updates to a participant's already-open screen — another participant's new card appearing instantly, the typing indicator updating, the participant list updating — currently depends on the browser holding an open, standing connection that Firebase pushes changes down through. The backend built for this project (per `014-backend-auth-foundation`) answers one request at a time and has no equivalent standing connection or push mechanism to browsers today. Closing that gap is genuinely new infrastructure, not an extension of the request/response pattern used for every other operation in this feature, and this materially raises this feature's technical complexity and risk relative to `017`/`018`, since no backend-mediated realtime precedent exists yet in this codebase. Per `018-profile-backend-access`'s own assumptions, this screen ("real-time board collaboration") was previously identified as the one place still depending on the app-wide Firebase Auth bridge kept in place for exactly this reason; this feature is what retires that dependency. The specific transport/design chosen to build the delivery channel is a technical/architectural decision reserved for planning, not dictated by this specification — except that, per this feature's Clarifications, it must be genuine server-initiated push (FR-019a), not periodic polling, which further raises the bar on the infrastructure this feature must introduce (the current backend, per `014-backend-auth-foundation`, has no push-capable infrastructure to build on).
- **AI sentiment analysis**: The AI computation itself already runs locally in the browser (not a Firebase or backend call) and is unaffected by this migration; only saving and loading its results changes.
- **Leaving a board**: Today, leaving is a purely client-side navigation action with no corresponding Firebase write (participants remain permanently listed once joined); this migration introduces no backend operation for it and preserves that behavior.
- **Participant list vs. presence**: The existing participant list reflects permanent board membership, not real-time online/offline status — there is no such status today. This migration preserves that existing behavior and does not introduce new online/offline presence tracking.
- **Authentication**: The backend's existing session-based authentication (already used for sign-in, Dashboard, and Mi Perfil) is reused to identify the requesting user for every operation in this feature; no new authentication mechanism is introduced.
- **Export**: PDF/DOCX/TXT export already operates purely on data already loaded into the screen and makes no Firebase calls; it is unaffected by this migration.
