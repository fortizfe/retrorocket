# Feature Specification: Backend-Mediated Firebase Access

**Feature Branch**: `017-backend-mediated-firebase-access`

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "Ahora que tenemos el backend ya en marcha, quiero refactorizar el código existente para que todas las llamadas entre frontend y firebase dejen de realizarse. El flujo debe ser pasando por el backend. Frontend debe quedar de manera que solamente llame al backend para todo lo que necesite. En este refactor no debemos perder ninguna funcionalidad."

## Clarifications

### Session 2026-07-27

- Q: When two participants act on the same card at nearly the same time (e.g., one edits the text while another deletes it, or one edits while another likes it), what should the conflict-resolution behavior be? → A: Last-write-wins — the most recent write simply overwrites/removes earlier ones; the "losing" participant's change is silently superseded, matching today's unguarded Firestore writes (no transactions or optimistic locking exist in the current implementation).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in and manage my session without the browser touching Firebase (Priority: P1)

As a RetroRocket user, I sign in with Google or GitHub and use the app normally, without the browser ever establishing a direct connection to Firebase — every request I make goes to RetroRocket's own backend.

**Why this priority**: Authentication is the entry point to every other flow. Today the backend already orchestrates OAuth and issues a session cookie, but it also hands the browser a Firebase custom token so it can talk to Firestore directly. Removing that direct channel is foundational — nothing else in this refactor matters if sign-in breaks.

**Independent Test**: Sign in with Google and with GitHub in a fresh session, confirm the session persists across a page reload, confirm the Profile page still lists linked sign-in providers correctly, and confirm (via network inspection) that no request is made to any Firebase/Firestore/Google Identity endpoint from the browser — only to the RetroRocket backend.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor, **When** they complete Google or GitHub sign-in, **Then** they land on the dashboard fully authenticated and no direct Firebase network call is made by the browser during or after sign-in.
2. **Given** a signed-in user with multiple linked providers, **When** they open their Profile page, **Then** they see the same linked-provider information as before, sourced entirely from the backend.
3. **Given** a signed-in user, **When** their session cookie is valid, **Then** all subsequent authenticated requests use that session against the backend, with no client-side Firebase Auth token in play.

---

### User Story 2 - Collaborate on a retrospective board in real time (Priority: P1)

As a participant, I create/edit/delete my own cards, like and react to cards, drag cards into groups, and see every other participant's changes reflected live — exactly as before — while none of these actions talk to Firebase directly from my browser.

**Why this priority**: Real-time multi-participant collaboration is the core value proposition of the product ("instant synchronization of every change for all users"). It is also the highest-risk area to migrate, since it depends on live, bidirectional updates that today are powered by direct Firestore listeners in the frontend.

**Independent Test**: With two browser sessions open on the same board, create, edit, like/react to, and delete cards, and drag cards to form/break a group in one session; verify the change appears in the other session without a page refresh, and verify (via network inspection) that neither session ever contacts Firebase directly — only the backend.

**Acceptance Scenarios**:

1. **Given** two participants viewing the same board, **When** one creates a card, **Then** the other sees it appear without refreshing, via a request path that only ever touches the backend.
2. **Given** a card owned by a participant, **When** that participant edits or deletes it, **Then** the change propagates to all other participants in real time, and any other participant attempting to edit/delete a card they do not own is rejected.
3. **Given** a board with existing cards, **When** a participant likes a card or adds an emoji reaction, **Then** the updated count/reaction is reflected for all participants in real time.
4. **Given** two or more cards on a board, **When** a participant drags one card onto another to group them, or accepts a suggested grouping, **Then** the group (including designated group head and stats) is reflected for all participants in real time.
5. **Given** a participant is typing in a card, **When** other participants are viewing that column, **Then** they see the same typing indicator behavior as before.
6. **Given** the participants list for a board, **When** someone joins or leaves, **Then** the presence indicator (active vs. total) updates for everyone in real time.

---

### User Story 3 - Run and experience facilitator-only tools without frontend-Firebase calls (Priority: P2)

As a facilitator, I start/pause/reset the countdown timer, write private facilitator notes, and view the AI-derived team-mood dashboard, and all participants see the facilitator-controlled state (like the countdown) update live — all mediated by the backend instead of direct Firestore access.

**Why this priority**: These are high-value differentiating features, but they are scoped to the facilitator role and a subset of sessions, so they carry somewhat less risk than the core collaboration flow in User Story 2.

**Independent Test**: As a facilitator, start a countdown and confirm all participants see it counting down live; write a facilitator note and confirm it persists and is only visible to the facilitator; confirm the team-mood dashboard reflects current per-card sentiment; confirm none of this involves a direct browser-to-Firebase call.

**Acceptance Scenarios**:

1. **Given** a facilitator on a board, **When** they create, start, pause, reset, or delete the countdown timer, **Then** every participant sees the same timer state update live, and only the facilitator can control it.
2. **Given** a facilitator writing a private note during the session, **When** they save it, **Then** it is persisted and later retrievable by that facilitator (and included in exports), and remains invisible to non-facilitator participants.
3. **Given** cards with on-device–computed sentiment, **When** the facilitator opens the team-mood dashboard, **Then** it shows the same mood score, per-column percentages, and alerts as before, sourced through the backend.

---

### User Story 4 - Manage boards from the dashboard and export results without frontend-Firebase calls (Priority: P2)

As a user, I create a new retrospective from a template, see my existing retrospectives listed on the Dashboard, rename/edit or delete ones I own, join an existing retrospective via its shared link or ID, and later export a board's results to PDF or DOCX with the same granular options as before (participants, statistics, grouping, facilitator notes) — all without the browser talking to Firebase directly.

**Why this priority**: Board creation, listing, and export are the entry and exit points of every retrospective; both are currently implemented as direct-to-Firestore operations from the frontend but are lower-risk, non-real-time flows compared to User Stories 1–3.

**Independent Test**: Create a board from each available template and confirm the correct columns (including the automatic action-items column) are created; confirm the Dashboard lists a user's boards, and that renaming/editing and deleting a board works and is reflected immediately; join an existing board via its shared link/ID; export an existing board to PDF and to DOCX with each granular option toggled, and confirm the output matches current behavior; confirm none of these flows makes a direct Firebase call.

**Acceptance Scenarios**:

1. **Given** a user on the create-board flow, **When** they pick a template (Default, Mad-Sad-Glad, Start-Stop-Continue), **Then** a board is created with the correct columns and an automatic action-items column, via the backend only.
2. **Given** a user with one or more existing retrospectives, **When** they open the Dashboard, **Then** they see their boards listed, and can rename/edit a board's title and description or delete a board they own, with the change reflected immediately, via the backend only.
3. **Given** a shared retrospective link or ID, **When** a user opens it, **Then** they join that board's real-time session via the backend only.
4. **Given** an existing board with cards, groups, facilitator notes, and countdown history, **When** the owner exports to PDF or DOCX with a chosen combination of options, **Then** the exported document contains exactly the selected sections, matching current export output.

---

### User Story 5 - Verify nothing regresses for AI assistants and diagnostics (Priority: P3)

As the team maintaining RetroRocket, I confirm that the already-backend-mediated MCP connector for AI assistants keeps working unchanged, and I get a clear, deliberate decision on what happens to the frontend's Firebase-usage diagnostics panel now that the frontend no longer talks to Firebase.

**Why this priority**: The MCP connector already goes through the backend, so it is a regression check rather than new migration work. The diagnostics panel is a developer-only tool with no end-user impact, so it is the lowest-priority concern in this refactor.

**Independent Test**: Connect an AI assistant via MCP and confirm listing retrospectives, fetching detail, and fetching a report-ready summary still work and still respect facilitator-only visibility of notes; separately, confirm the developer diagnostics panel behaves per the decision recorded for this feature (retired, replaced, or explicitly deferred).

**Acceptance Scenarios**:

1. **Given** a user with a connected AI assistant, **When** the assistant lists, reads detail, or reads a summary of a retrospective, **Then** behavior (including facilitator-notes privacy) is unchanged from before this refactor.
2. **Given** the developer-only Firebase usage/metrics panel, **When** a developer opens it after this refactor ships, **Then** it behaves according to the decision recorded for this feature (see Assumptions) rather than silently breaking.

---

### Edge Cases

- What happens when the real-time connection between the frontend and the backend drops mid-session (e.g., participant loses network)? The system must clearly surface a disconnected/reconnecting state and resynchronize state on reconnect, consistent with the project's existing requirement that Firestore-backed operations never fail silently.
- What happens when two participants act on the same card at nearly the same time (e.g., one edits while another deletes it)? The system applies last-write-wins: whichever write reaches the backend last is the one that stands, and the superseded participant's change is not applied — with no duplicated or "resurrected" cards, matching today's Firestore behavior.
- What happens when a participant who is not the card's author, or a non-facilitator attempting facilitator-only actions (countdown control, reading facilitator notes), tries to perform a restricted action directly against the backend? The backend must reject it the same way Firestore security rules do today.
- What happens to retrospectives and data created before this refactor shipped? They must remain fully readable, editable, and exportable after the migration, with no data loss or format change visible to users.
- What happens if the on-device sentiment inference produces a result but the backend call to persist it fails? The user must see an explicit error/retry state rather than a silently dropped result, consistent with existing no-silent-failure requirements.
- What happens if a stale frontend build (cached in a user's browser from before the migration) is still running against the migrated backend after the atomic cutover? Since the old direct-Firestore code paths are removed in the same release, a stale client must be forced to reload/update rather than silently falling back to a direct Firestore connection that no longer has valid credentials.
- What happens when a participant's connection drops and they were mid-write (e.g., typing a card) at the moment of disconnect? Per the agreed best-effort reconnect behavior, that in-flight write may be lost; the system must not silently pretend it succeeded — the user must see the disconnected state and can retry once reconnected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The frontend MUST NOT establish any direct connection to Firebase or Firestore (no client-SDK reads, writes, or realtime subscriptions) for any feature. Every data operation the frontend needs — create, read, update, delete, or subscribe to changes — MUST be requested through the RetroRocket backend.
- **FR-002**: The backend MUST expose the operations needed to fully replace every frontend-initiated Firestore interaction that exists today, covering at minimum: retrospective boards and their templates/columns (including listing, creating, renaming/editing, deleting, and joining a board via its shared link/ID from the Dashboard), cards (create/edit/delete/like/react/color), card groups and grouping suggestions, participants and presence, typing indicators, the facilitator countdown timer, private facilitator notes, and sentiment results.
- **FR-003**: The backend MUST deliver real-time updates for board, card, card group, participant, countdown, facilitator-note, action-item, and sentiment-result changes to all connected clients, with no perceptible loss of the "instant synchronization" experience the product provides today.
- **FR-004**: The backend MUST enforce every access-control rule currently enforced by Firestore security rules — including that only a card's author may edit or delete it, only a board's facilitator may control the countdown timer or read facilitator notes, and only board participants may read or write that board's data — since the frontend will no longer be gated by Firestore rules directly.
- **FR-005**: The system MUST preserve, without exception, all current end-user-visible functionality described in the product's feature set (the same set of capabilities enumerated in FR-002, kept in sync with it): multi-provider authentication and profile management, multi-participant real-time boards, board templates and creation, cards with likes/reactions/custom colors, card grouping and grouping suggestions, the facilitator countdown timer, private facilitator notes, on-device AI sentiment badges and the team-mood dashboard, PDF/DOCX export with granular options, and the MCP connector for AI assistants.
- **FR-006**: Authentication MUST continue to support Google and GitHub sign-in and multi-provider profile management using only the backend-issued session (no Firebase Auth client-side token whose sole purpose is enabling direct Firestore access).
- **FR-007**: The on-device AI sentiment inference itself MUST remain client-side and unchanged (it does not call Firebase today); only the storage and retrieval of its resulting sentiment data MUST move to being backend-mediated.
- **FR-008**: The system MUST NOT lose, corrupt, or make inaccessible any retrospective data (boards, cards, groups, notes, sentiment results, countdown history) that existed before this refactor; all such data MUST remain fully readable, editable, and exportable afterward.
- **FR-009**: The system MUST continue to explicitly surface loading, error, and reconnection states for every real-time or data operation, with no silent failures, regardless of the fact that the transport is no longer a direct Firestore connection.
- **FR-010**: The migration MUST ship as a single atomic cutover: the frontend stops calling Firebase entirely in one release, and the old direct-Firestore code paths (client SDK usage, custom-token sign-in, direct listeners) MUST be removed in that same release rather than kept behind a flag or run in parallel.
- **FR-011**: Backend-mediated real-time sync MUST clearly surface a disconnected/reconnecting state and automatically resume real-time sync once connectivity returns (best-effort reconnect). It is NOT required to queue and replay writes made while the client was offline — that level of offline parity with Firestore's local cache/queueing is explicitly out of scope for this refactor.
- **FR-012**: The developer-only Firebase usage/metrics diagnostics panel MUST be retired as part of this refactor, since it measures direct client-to-Firestore calls that this refactor eliminates; no backend-sourced replacement is required.
- **FR-013**: The system MUST NOT expose Firebase project credentials or configuration to the frontend once no frontend code needs them to reach Firebase directly.
- **FR-014**: When two or more participants act concurrently on the same card or other shared entity (edit, delete, like/react, group), the backend MUST resolve the conflict using last-write-wins: the most recent write is applied, and any earlier, now-superseded write is discarded without error or duplication, matching today's behavior.

### Key Entities

- **Retrospective Board**: A single retrospective session, including its template/columns, participants, and lifecycle state.
- **Card**: A single note within a board column, with owner, text, color, likes, emoji reactions, and optional sentiment result.
- **Card Group**: A cluster of related cards with a designated group head, formed manually or via grouping suggestions.
- **Participant**: A user's presence within a specific board (joined/active/left), including facilitator status.
- **Countdown Timer**: The facilitator-controlled shared timer state (duration, running/paused/finished, remaining time) for a board.
- **Facilitator Note**: A private annotation tied to a board, visible only to that board's facilitator, included in exports.
- **Sentiment Result**: The per-card sentiment classification and the aggregated team-mood data derived from it for a board.
- **User Session / Identity**: The authenticated user's identity and linked sign-in providers, and their current backend session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the product's documented user-facing features (authentication/profile, real-time boards, templates, cards with likes/reactions/grouping, facilitator countdown and notes, AI sentiment and team mood, PDF/DOCX export, MCP connector) pass a full regression pass after the refactor, with no feature removed or degraded from the user's perspective.
- **SC-002**: Zero direct network requests from the browser to any Firebase or Firestore endpoint are observed across all primary user flows, verified across a complete manual or automated pass of every flow listed in SC-001.
- **SC-003**: A change made by one participant (card create/edit/delete/like/react/group, countdown state, typing indicator, presence) is reflected to other participants viewing the same board within 2 seconds under normal network conditions, matching today's perceived "instant" experience.
- **SC-004**: 100% of retrospective boards and their data that existed before the migration remain fully accessible, correct, and exportable after the migration, with zero reported data loss.
- **SC-005**: Users attempting an action they are not authorized to perform (editing another participant's card, controlling the countdown as a non-facilitator, reading another facilitator's notes) are rejected in 100% of tested cases, matching today's Firestore-rule-enforced behavior.

## Assumptions

- The existing Firestore data model and collections are reused as-is; this refactor changes *how* the frontend reaches that data (via the backend instead of directly), not the underlying storage engine or schema.
- The backend continues to use the Firebase Admin SDK server-side (as it already does for authentication and the MCP connector) to read and write Firestore on the frontend's behalf.
- Once the migration is complete, the frontend no longer needs the Firebase client SDK, any public Firebase configuration, or a Firebase Auth custom-token sign-in step — these existed solely to support direct client-to-Firestore access, which this refactor eliminates.
- "No functionality lost" refers strictly to user-facing behavior and outcomes; the underlying implementation (where Firestore is accessed from, where security rules live) is expected and intended to change, since that change is the explicit purpose of this refactor.
- The MCP connector (see feature 015) is already backend-mediated and is treated as an existing reference pattern for this refactor, not new work — it is included here only as a regression check.
- Firestore security rules remain in place as defense-in-depth even though only the backend (using privileged Admin SDK access) will call Firestore directly going forward; the backend is the new, authoritative enforcement point for authorization.
- Existing automated test suites (unit, integration, and Playwright E2E) will be updated to exercise the new backend-mediated services and flows, preserving the intent and scenario coverage of today's tests rather than the exact implementation being tested.
