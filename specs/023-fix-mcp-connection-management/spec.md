# Feature Specification: Fix MCP Connection Management

**Feature Branch**: `023-fix-mcp-connection-management`

**Created**: 2026-08-01

**Status**: Draft

**Input**: User description: "La gestión de conexiones mcp parece no funcionar correctamente. He visto que un usuario hace click sobre el botón de desconectar, todo parece ir bien, pero al recargar la página, la conexión sigue apareciendo entre las activas. Parece que no se ha revocado correctamente. También, cuando se conecta desde dos origines distintos del mismo modelo, por ejemplo claude desde movil y claude desktop, no se distingue que conexión es cada una. Corrige el bug de la desconexión y revisa si es posible mostrar al usuario algo más de información para distinguir las conexiones."

## Clarifications

### Session 2026-08-01

- Q: What signal may the per-connection origin/device label be derived from? → A: Device/client category only (e.g. "Desktop", "Mobile", "Web"), inferred from information already present in the connection request. No IP address or location data is collected or stored.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Revoking an AI client connection actually removes it (Priority: P1)

A user viewing their list of connected AI clients (e.g., "Claude") clicks "Revoke" on one of them. The connection disappears from the list right away. When the user later reloads the page (or returns in a new session), that same connection must not reappear in the list of connected/active clients.

**Why this priority**: This is the reported bug. Users rely on the revoke action to actually revoke access — if a revoked client keeps showing up as connected, users lose trust that they can control which apps have access to their account, and may believe access has not actually been revoked (a security/trust concern) even when the underlying access was in fact blocked.

**Independent Test**: Connect an AI client, revoke it via the UI, reload the page, and verify the client no longer appears in the connected-apps list. Can be fully tested and delivers value on its own, independent of Story 2.

**Acceptance Scenarios**:

1. **Given** a user has one active AI client connection, **When** they click "Revoke" on it, **Then** the connection is removed from the visible list immediately.
2. **Given** a user has just revoked an AI client connection, **When** they reload the page or revisit it in a new session, **Then** the revoked connection does not appear in the list of connected/active clients.
3. **Given** a connection has already been revoked, **When** the user (or a stale open tab) attempts to revoke it again, **Then** the system treats it as already revoked without showing an error.
4. **Given** a user has two separate active connections to the same AI client, **When** they revoke only one of them, **Then** the other connection remains active and unaffected.

---

### User Story 2 - Telling apart multiple connections from the same AI client (Priority: P2)

A user has connected the same AI client from two different places — for example, Claude on their phone and Claude on their desktop app. Both show up in the connected-apps list under the same name, with no way to tell which is which. The user needs enough information about each connection to confidently revoke the right one (e.g., to remove access from a lost phone while keeping their desktop connection active).

**Why this priority**: This is a usability/safety improvement on top of the core fix — without it, a user with multiple connections to the same client is at risk of revoking the wrong one, or leaving an unwanted connection active because they can't distinguish it. It builds directly on Story 1 (an accurate, trustworthy list is a prerequisite for this to be useful).

**Independent Test**: Authorize the same AI client twice (simulating two different origins), and verify the connections list shows distinguishing details for each entry, allowing an observer to tell them apart without prior knowledge of which was created when.

**Acceptance Scenarios**:

1. **Given** a user has two active connections for the same AI client created at different times, **When** they view their connections list, **Then** each entry shows enough distinguishing detail that the user can tell the two apart.
2. **Given** a user is deciding which of several same-named connections to revoke, **When** they review the list, **Then** they are not required to guess based on list order alone.

---

### Edge Cases

- What happens when a user has never connected any AI client? (No change — empty state is unaffected by this fix.)
- What happens when a revoke request fails due to a network error? The connection must remain visible as connected (no false removal), and the user must be able to retry.
- What happens when an AI client is revoked and then reconnects/re-authorizes later? The new authorization must appear as a new, distinct, active connection; the old revoked one must stay revoked and must not be revived or merged with the new one.
- What happens when two connections for the same AI client are created back-to-back (e.g., seconds apart)? They must still be distinguishable from one another per Story 2.
- What happens if a user revokes a connection in one browser tab while it is also open in another tab? Both tabs must eventually reflect the revoked state consistently (no tab should keep offering to revoke an already-revoked connection as if it were still active).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST NOT include revoked connections in the list of connections presented to the user as connected/active.
- **FR-002**: When a user revokes a connection, that connection MUST remain excluded from the connected/active list across page reloads and new sessions — the revoke action must be durably persisted, not just reflected in the current page's temporary state.
- **FR-003**: Revoking a connection MUST be idempotent: repeating the action on an already-revoked connection MUST NOT produce an error visible to the user, and MUST leave the connection revoked.
- **FR-004**: Revoking one connection MUST NOT affect the state of any other connection, including other active connections belonging to the same AI client.
- **FR-005**: The system MUST continue to immediately update the visible list when a revoke succeeds, without requiring a manual page reload.
- **FR-006**: A previously revoked connection MUST NOT be reactivated by any means; reconnecting the same AI client MUST always produce a new, separate connection.
- **FR-007**: When a user has multiple connections for the same AI client, the system MUST display, for each connection, an automatically detected device/client category label (e.g., "Desktop", "Mobile", "Web") without requiring the user to name or configure anything. This label MUST be derived only from information already present in the connection request (e.g., what platform/client the request identifies itself as) — the system MUST NOT collect or store IP address or location data for this purpose.
- **FR-008**: The connections list MUST show, for each connection, both when it was first connected and the exact date/time it was last used, so a user can identify stale or forgotten connections as well as which origin was active most recently.
- **FR-009**: If a revoke action fails (e.g., due to a network error), the system MUST keep the connection visible as connected and MUST allow the user to retry, rather than silently removing it from view.

### Key Entities

- **AI Client Connection**: An individual authorized link between a user's account and one instance of an AI client. Belongs to exactly one user; has a status (pending, active, or revoked), a creation time, and a display name identifying the AI client. Multiple connections can share the same AI client identity while representing distinct origins (e.g., one per device or installation).
- **AI Client**: The registered application (e.g., "Claude") that a user can authorize. A single AI client may have several separate Connections tied to it, each independently connectable and revocable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of connections a user revokes remain absent from the connected/active list after a page reload or new session, verified across repeated tests.
- **SC-002**: Users viewing a list containing multiple connections for the same AI client can correctly identify which entry corresponds to which origin without external help, on first viewing.
- **SC-003**: Revoking a connection never removes or alters any other connection in the same account's list.
- **SC-004**: Reports of "revoked app still shows as connected" drop to zero after release.

## Assumptions

- The existing enforcement that blocks a revoked connection from being used for actual data access already works correctly and takes effect immediately; this feature addresses the connections list display and the durability of the revoke action, not the underlying access-revocation enforcement.
- Revoked connections are fully removed from the primary connections list; a historical/audit view of past revoked connections is out of scope for this feature unless a future need arises.
- This fix and enhancement apply uniformly to all AI clients using the MCP connector, not only to Claude, even though Claude is used as the motivating example.
- Existing connections created before this feature ships may lack an origin label or last-used history; such connections may show as "unknown origin" or omit last-used detail until they are used again, rather than requiring a backfill.
- The origin/device label is inferred automatically from information already available when a connection is created or used, without requiring the user to grant any new permission or provide input, and without collecting IP address or location data (per Clarifications, Session 2026-08-01).
