# Feature Specification: Dashboard Backend-Mediated Firebase Access

**Feature Branch**: `017-dashboard-backend-access`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "Ahora que ya tenemos el backend implantado y funcionando tanto para la autorización como para el conector MCP, quiero ir migrando en fases poco a poco todas las conexiones directas entre front y otros servicios hacia el backend. Para este desarrollo vamos a empezar migrando la pantalla de mis tableros. Quiero que esa pantalla mantenga todas sus funcionalidades pero la comunicación con firebase debe pasar por backend. Tanto para consulta como para crear una nueva retrospectiva como para unirse a una."

## Clarifications

### Session 2026-07-28

- Q: What is the measurable performance target for Dashboard operations (list/create/join)? → A: Reuse the existing backend latency baseline established in `014-backend-auth-foundation`: **3 s (p95) warm** and **5 s (p95) including a cold serverless start**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View my list of boards (Priority: P1)

As a signed-in user, I open "My Boards" and see every retrospective board I created and every one I've joined, exactly as I do today, without my browser ever making a direct request to Firebase — the list is fetched through RetroRocket's backend instead.

**Why this priority**: The board list is the first thing rendered on this screen and the entry point to every other action here (create, join, open, rename, delete). Nothing else on the screen can be verified until listing works.

**Independent Test**: Sign in as a user with a mix of created and joined boards, open the Dashboard, and confirm the same boards, titles, descriptions, participant counts, and created/joined categorization appear as before — while network inspection shows zero requests to any Firebase/Firestore endpoint from the browser, only requests to the RetroRocket backend.

**Acceptance Scenarios**:

1. **Given** a signed-in user with both created and joined boards, **When** they open the Dashboard, **Then** all of their boards are listed with the same information (title, description, participant count, created-vs-joined status, timestamps) as before, sourced entirely through the backend.
2. **Given** a signed-in user with no boards, **When** they open the Dashboard, **Then** they see the existing empty-state messaging with options to create or join a board.
3. **Given** the board list has loaded, **When** the user searches, sorts (by name/date), filters (all/created/joined), switches between grid and list view, or paginates, **Then** these controls behave exactly as before, operating on the data already fetched from the backend.
4. **Given** a temporary backend/network failure while loading boards, **When** the request fails, **Then** the user sees a clear error state (not a silent empty list or a crash) consistent with the app's existing no-silent-failure behavior.

---

### User Story 2 - Create a new retrospective (Priority: P1)

As a signed-in user, I start the "New Board" flow, pick a template, and get a new retrospective board with the correct columns, without the browser writing to Firebase directly — the board is created through the backend.

**Why this priority**: Creating a board is the primary way new retrospectives come into existence; it must keep working identically, and it is the first write-path being moved off direct Firestore access.

**Independent Test**: From the Dashboard, run the create-board flow for each available template, confirm a new board appears in the list with the correct columns (including the automatic action-items column) and that the user is taken into the new board, while network inspection shows the creation request only reaching the backend.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the create-board flow, **When** they choose a template (e.g. Default, Mad-Sad-Glad, Start-Stop-Continue) and confirm, **Then** a new board is created with that template's columns plus the automatic action-items column, via the backend only.
2. **Given** a newly created board, **When** creation succeeds, **Then** the Dashboard's board list refreshes to include it and the user is navigated into the new board.
3. **Given** the create request fails (e.g. backend or network error), **When** the failure occurs, **Then** the user sees a clear error message and no partial/orphaned board is left behind or shown in their list.

---

### User Story 3 - Join an existing retrospective (Priority: P1)

As a signed-in user with a board's shared link or ID, I open the "Join" flow, submit it, and become a participant of that board, without the browser writing to Firebase directly — joining is handled by the backend.

**Why this priority**: Joining is the other primary entry path into a retrospective (alongside creating one) and is explicitly called out by name in this migration's scope.

**Independent Test**: As a signed-in user who is not yet a participant of a given board, use its ID/shared link in the Join flow from the Dashboard, confirm the board now appears in their "joined" list and that they can enter it, while network inspection shows the join request only reaching the backend.

**Acceptance Scenarios**:

1. **Given** a signed-in user and a valid board ID/shared link they are not yet part of, **When** they submit it in the Join flow, **Then** they become a participant of that board via the backend only, and the board subsequently appears in their Dashboard list categorized as "joined."
2. **Given** a signed-in user submits an invalid or non-existent board ID/link, **When** they submit it, **Then** they see a clear error message and no partial join record is created.
3. **Given** a signed-in user who is already a participant (or the creator) of the board they submit, **When** they submit it again, **Then** the system does not create a duplicate membership and takes them into the board as normal.

---

### User Story 4 - Rename and delete my own boards (Priority: P2)

As the owner of a board, I can still rename it and permanently delete it, from the Dashboard, without the browser talking to Firebase directly, and these actions remain unavailable to me on boards I don't own.

**Why this priority**: These are existing Dashboard capabilities the user asked to keep in full ("mantenga todas sus funcionalidades"). They are scoped lower than list/create/join because they are secondary, less-frequently-used management actions on the same screen, but they must not regress.

**Independent Test**: As the owner of a board, rename it and confirm the new title is reflected immediately and persists after reload; delete a board and confirm it disappears from the list and its data is gone; as a non-owner participant, confirm neither action is available/possible against a board owned by someone else — all via the backend only.

**Acceptance Scenarios**:

1. **Given** a board the signed-in user owns, **When** they edit its title and save, **Then** the change is persisted via the backend and reflected immediately in the Dashboard list.
2. **Given** a board the signed-in user owns, **When** they confirm permanent deletion, **Then** the board and its associated data are removed via the backend and the board disappears from the Dashboard list.
3. **Given** a board the signed-in user does not own, **When** they view it on the Dashboard, **Then** they have no way to rename or delete it, and any attempt to do so directly against the backend is rejected.

---

### Edge Cases

- What happens when the backend rejects a create, join, edit, or delete request because the user's session has expired mid-action? The user must see a clear "please sign in again" state rather than a silent failure or a stale success indicator.
- What happens when two browser tabs/devices for the same user create or delete boards concurrently? The Dashboard must reflect the correct final list on next load/refresh with no duplicated or "ghost" boards.
- What happens when a user attempts to join a board that has just been deleted by its owner? The join attempt must fail with a clear "board not found" error, not a partial or broken join.
- What happens when a user attempts to rename/delete a board they don't own by calling the backend directly (bypassing the UI)? The backend must reject it the same way today's Firestore security rules do, independent of what the frontend shows.
- What happens to boards and join relationships that existed before this migration shipped? They must remain fully visible, correctly categorized (created vs. joined), editable, and deletable afterward, with no data loss.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Dashboard ("My Boards") screen MUST NOT establish any direct connection to Firebase or Firestore from the browser for any of its operations. Listing boards, creating a board, joining a board, editing/renaming a board, and deleting a board MUST all be requested through the RetroRocket backend.
- **FR-002**: The backend MUST expose an operation that returns, for the requesting signed-in user, the complete list of boards they created and boards they have joined, with the same information the Dashboard displays today (title, description, participant count, created-vs-joined status, timestamps).
- **FR-003**: The backend MUST expose an operation to create a new retrospective board from a template, producing the same columns (including the automatic action-items column) as the current template definitions, and MUST record the requesting user as its owner.
- **FR-004**: The backend MUST expose an operation to join an existing board by its ID/shared link, recording the requesting user as a participant, and MUST NOT create a duplicate membership if the user already belongs to that board.
- **FR-005**: The backend MUST expose an operation to edit a board's title, restricted to that board's owner, and MUST reject the request if the requesting user is not the owner.
- **FR-006**: The backend MUST expose an operation to permanently delete a board and its associated data, restricted to that board's owner, and MUST reject the request if the requesting user is not the owner.
- **FR-007**: The Dashboard's existing client-side search, sort (by name/date), filter (all/created/joined), grid/list view toggle, and pagination behavior MUST remain unchanged, operating over the board list returned by the backend.
- **FR-008**: The system MUST explicitly surface loading, error, and empty states for every Dashboard operation (list, create, join, edit, delete) with no silent failures, consistent with the project's existing no-silent-failure requirement.
- **FR-009**: The system MUST NOT lose, corrupt, or make inaccessible any board or board-membership data that existed before this migration; all previously created and joined boards MUST remain fully visible, correct, editable, and deletable afterward.
- **FR-010**: The backend MUST authenticate every Dashboard request using the existing session-based authentication already in place; the frontend MUST NOT use any Firebase Auth client-side credential to authorize these operations.
- **FR-011**: Screens and flows outside the Dashboard (individual board/retrospective real-time collaboration, facilitator tools, export, authentication sign-in itself, the MCP connector) are explicitly OUT OF SCOPE for this feature and MUST continue to function as they do today, unaffected by this migration.

### Key Entities

- **Retrospective Board**: A retrospective session shown on the Dashboard, with title, description, template/columns, owner, participant count, creation/update timestamps, and the requesting user's relationship to it (creator or participant).
- **Board Membership**: The relationship recording that a given user is a participant of a given board, established either by creating it (as owner) or by joining it.
- **User Session**: The authenticated user's backend session, used to identify who is listing, creating, joining, editing, or deleting boards.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see their complete, correctly categorized (created vs. joined) list of boards on the Dashboard within **3 seconds (p95) on a warm backend** and within **5 seconds (p95) including a cold serverless start**, matching the latency baseline already established for this backend. Create and join operations meet the same target.
- **SC-002**: Zero direct network requests from the browser to any Firebase or Firestore endpoint are observed while listing, creating, joining, editing, or deleting a board from the Dashboard.
- **SC-003**: 100% of existing Dashboard functionality (list, search, sort, filter, grid/list view, pagination, create, join, rename/edit, delete) passes a full regression pass after the migration, with no feature removed or degraded from the user's perspective.
- **SC-004**: 100% of boards and board memberships that existed before the migration remain visible, correctly categorized, and usable afterward, with zero reported data loss.
- **SC-005**: 100% of tested unauthorized attempts (a non-owner trying to rename or delete a board) are rejected by the backend.

## Assumptions

- **Scope is limited to the Dashboard ("My Boards") screen and its five operations**: listing boards, creating a board, joining a board, renaming/editing a board, and deleting a board. This is the first of several planned phases; other screens (individual board real-time collaboration, facilitator tools, export, authentication, the MCP connector) are migrated in later, separate phases.
- A prior attempt to migrate the entire application's Firebase access to the backend in a single atomic cutover was built, merged, and then fully reverted shortly after release. This feature intentionally re-scopes that effort down to one independently deployable, independently testable screen, to reduce the risk and blast radius of any single change.
- The backend's existing session-based authentication (already used for sign-in and the MCP connector) is reused to identify the requesting user for all Dashboard operations; no new authentication mechanism is introduced.
- Joining a board continues to work by submitting the board's ID/shared link, with no separate join-code mechanism, consistent with current behavior.
- The Dashboard's client-side search, sort, filter, view-mode, and pagination logic is already pure frontend computation over an in-memory board list and requires no backend change beyond returning an equivalent list shape.
- The backend enforces the same ownership/authorization rules for edit and delete that Firestore security rules enforce today (only a board's owner may rename or delete it).
- Navigating from the Dashboard into an individual board still lands the user on the existing board detail experience, which is out of scope for this feature and is not required to be backend-mediated yet.
