# Feature Specification: Fix MCP Connection Status Reporting and Reconnection Flow

**Feature Branch**: `024-fix-mcp-connection-status`

**Created**: 2026-08-02

**Status**: Draft

**Input**: User description: "Tras los últimos cambios veo comportamientos no esperados en las conexiones MCP. He revocado mis conexiones desde la página de perfil con el objetivo de comprobar el flujo de conexión en https://retro-rocket.vercel.app/api/mcp. He iniciado la autenticación de mi conector de claude, pero se resuelve como \"no es posible realizar la conexión\". Por lo que no se puede usar dicha conexión para explotar los datos. Sin embargo en la página de mi perfil si que aparecen dichas conexiones fallidas como satisfactorias. Quiero que si una conexión es fallida, no aparezca como conexión satisfactoria en el perfil. Y también quiero investigar donde se produce el desvío con las conexiones y corregirlo para volver a poder conectar. Si no existe, crea el testing necesario para esta parte de la app."

## Clarifications

### Session 2026-08-02

- Q: How should non-completed connection attempts be excluded from the active/successful list? → A: Introduce a distinct terminal status (e.g., "failed"/"expired") that attempts transition into, plus a backfill/expiry step to migrate already-stuck records into it.
- Q: What triggers a connection attempt to become "failed"/"expired"? → A: Both — an explicit failure signal marks it failed immediately, and a timeout also expires attempts that are silently abandoned with no signal at all.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Failed connection attempts never look successful (Priority: P1)

A user starts authorizing an AI client (e.g., Claude) against their account. The authorization attempt does not complete successfully — the client itself reports it could not connect, and no working access was actually granted. The user then opens their profile page expecting to see an accurate picture of what's connected. Today, the incomplete attempt shows up in the connected-apps list looking exactly like a fully working connection, giving the user false confidence that the client has working access when it does not.

**Why this priority**: This is a trust and correctness problem — the profile page is the user's only way to audit what has access to their account. If it reports failed attempts as successful, the user cannot tell what is actually connected, cannot know whether the client can access their data, and may leave a broken entry untouched believing it works, or waste time trying to "revoke" something that never worked in the first place.

**Independent Test**: Start (but do not complete) an authorization attempt so it fails before a working connection is established, then load the profile page and verify the attempt is not shown as an active/successful connection.

**Acceptance Scenarios**:

1. **Given** a user starts authorizing an AI client and the attempt does not complete successfully, **When** the user opens their profile page, **Then** that attempt does not appear in the list of active/successful connections.
2. **Given** a user has one genuinely active connection and one failed/incomplete attempt for the same AI client, **When** the user views their profile page, **Then** only the genuinely active connection is presented as connected, and the failed attempt is not indistinguishable from it.
3. **Given** an authorization attempt has failed, **When** the user retries and completes authorization successfully, **Then** the profile page shows exactly one active connection reflecting the successful attempt, without the earlier failed attempt appearing as a second, separate successful connection.
4. **Given** a user reloads the profile page or returns in a new session, **When** an authorization attempt still has not completed, **Then** it still does not appear as an active/successful connection (the fix must persist, not just apply to the current page load).

---

### User Story 2 - Reconnecting after a revoke actually works (Priority: P1)

A user who previously revoked an AI client's access wants to reconnect that same client. They start the standard authorization flow again, expecting it to work the same way it did the first time. Instead, the client reports it is unable to establish the connection, and the user is left without working access — even though, per Story 1, the profile page misleadingly shows something as connected.

**Why this priority**: Without a working reconnection path, revoking access becomes a one-way action users cannot undo through the normal flow, which defeats the purpose of having a revoke/reconnect cycle at all and blocks the legitimate use case of re-authorizing a client after intentionally disconnecting it.

**Independent Test**: Revoke an existing AI client connection, then start a fresh authorization attempt for the same client from scratch and verify it completes and results in a working, active connection.

**Acceptance Scenarios**:

1. **Given** a user has previously revoked a connection to an AI client, **When** they start a new authorization attempt for that same client, **Then** the attempt completes successfully and results in a new active connection.
2. **Given** a user has never connected a given AI client before, **When** they complete the standard authorization flow, **Then** the attempt completes successfully and results in an active connection (confirming the flow itself, not just the revoke/reconnect path, is sound).
3. **Given** a new active connection has been established, **When** the AI client subsequently uses that connection to access the user's data, **Then** the access succeeds.

---

### User Story 3 - Automated coverage for this part of the app (Priority: P2)

Anyone maintaining the connection flow and the profile's connected-apps display needs automated tests that would have caught both problems above, so that a future change cannot silently reintroduce a failed attempt showing as successful, or break the ability to (re)connect an AI client.

**Why this priority**: This is a safety net rather than user-facing behavior — it doesn't change what an end user sees, but without it, the two problems above (or close variants) can recur unnoticed in a later change. It's ordered after the fixes themselves because tests are only meaningful once the correct behavior they verify actually exists.

**Independent Test**: Run the automated test suite for the connection/authorization flow and the profile connected-apps display in isolation and confirm it fails against the pre-fix behavior and passes against the fixed behavior.

**Acceptance Scenarios**:

1. **Given** the automated test suite for this area, **When** it is run against the corrected behavior, **Then** it passes, including cases covering a failed/incomplete connection attempt and a successful revoke-then-reconnect cycle.
2. **Given** an existing gap where no test previously verified a given behavior (e.g., that an incomplete attempt is excluded from the active list, or that reconnecting after a revoke succeeds), **When** the new tests are added, **Then** they explicitly exercise that previously-unverified behavior rather than only re-checking already-covered cases.

---

### Edge Cases

- What happens when an authorization attempt is abandoned partway (the user closes the AI client or browser tab before finishing) rather than failing outright? No explicit failure signal will ever arrive for it, so it must still transition to the failed/expired terminal state after a bounded amount of time (per FR-008b), rather than appearing as active/successful or remaining "in progress" forever.
- What happens when a user has multiple failed/incomplete attempts for the same AI client piled up over time? None of them should appear as active/successful connections, regardless of how many accumulate.
- What happens when a failed attempt is retried multiple times in quick succession? Only a fully completed attempt should ever result in an active connection; none of the earlier incomplete tries should surface as active.
- What happens if the connection genuinely succeeds but the AI client fails to actually use it afterward (e.g., a later data request fails for unrelated reasons)? That is outside this feature's scope — this feature covers whether the connection itself was established, not the client's later usage behavior.
- What happens when the underlying cause that blocks reconnection today also affects brand-new (never-before-connected) AI clients, not just revoke-then-reconnect cases? The fix must cover both, per User Story 2's second acceptance scenario.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST NOT present a connection attempt in the profile's list of active/successful connections unless that attempt has fully and successfully completed (i.e., the AI client actually obtained working access).
- **FR-002**: The system MUST exclude connection attempts that fail, are abandoned, or never complete from the active/successful list, consistently across page reloads and new sessions.
- **FR-003**: A connection attempt that starts but never completes MUST NOT block or be confused with a later, separate successful attempt for the same AI client — each attempt's outcome must be tracked independently.
- **FR-004**: The system MUST identify and correct the underlying defect that currently prevents users from completing authorization for an AI client, including the case of reconnecting a client whose prior connection was revoked.
- **FR-005**: After the defect in FR-004 is corrected, a user MUST be able to complete authorization for an AI client they have not connected before, and separately, for one they previously revoked, with both cases resulting in a working active connection.
- **FR-006**: The system MUST NOT regress the existing, already-shipped behavior that revoked connections stay out of the active/successful list (previously fixed) — this feature adds correct handling of failed/incomplete attempts on top of that, without reopening the earlier fix.
- **FR-007**: The project MUST have automated test coverage that (a) asserts a failed/incomplete connection attempt is excluded from the active/successful list, and (b) asserts a user can successfully complete authorization after a prior revoke, and after never having connected before. Where such coverage does not already exist, it MUST be added.
- **FR-008**: The system MUST record a distinct terminal state (e.g., "failed"/"expired") for a connection attempt that fails or never completes, rather than leaving it indistinguishable from an attempt still genuinely in progress. This terminal state MUST be reached in two ways: (a) immediately, when the system observes an explicit failure signal for the attempt (e.g., a rejected or invalid token exchange), and (b) after a bounded amount of time has passed with no completion and no explicit signal, so silently abandoned attempts (e.g., the user closes the client without an error ever being reported) do not stay "in progress" indefinitely.
- **FR-009**: The system MUST migrate connection attempts that are already stuck in an incomplete state at the time this fix ships into the new terminal state, so previously-affected users see them disappear from the active/successful list without needing to take any manual action.

### Key Entities

*Note: "Connection Attempt" and "AI Client Connection" below are the same underlying record at different points in its lifecycle, not two separate entities — one record starts as an attempt and, once it fully and successfully completes, is what's referred to as the AI Client Connection.*

- **Connection Attempt**: A single try at authorizing an AI client against a user's account. Outcomes are: still in progress, successfully completed (working access established), or explicitly failed/expired (a distinct terminal state, no working access, will never complete on its own). Only successfully completed attempts should read as "active"/"successful" to the user; failed/expired attempts are recorded as such rather than left looking like an in-progress attempt indefinitely.
- **AI Client Connection**: The user-facing record of an AI client's access to the user's account, as introduced in the prior connection-management fix (see 023-fix-mcp-connection-management). This feature refines when such a record is allowed to be presented as active, adds the failed/expired terminal state, and ensures the record can be freshly (re-)established after a revoke.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of connection attempts that do not fully succeed are absent from the profile's active/successful connections list, verified across repeated tests including page reloads and new sessions.
- **SC-002**: Users can go from "previously revoked an AI client" to "that client has working access again" by completing the standard authorization flow once, with no manual workaround, in a single attempt under normal conditions.
- **SC-003**: Users connecting an AI client for the first time (no prior revoke involved) can also complete authorization successfully in a single attempt, confirming the underlying flow defect is fixed generally and not only for the revoke-then-reconnect case.
- **SC-004**: Reports of "connection shows as successful in profile but the AI client cannot access data" drop to zero after release.
- **SC-005**: The automated test suite for this area fails when run against the pre-fix behavior and passes against the fixed behavior, for both the status-reporting fix and the reconnection-flow fix.

## Assumptions

- "Failed to connect" as reported by the AI client (e.g., Claude) means the authorization/token exchange never completed, so no working access was actually granted — this feature treats any such attempt as not-active, without needing to distinguish the specific technical reason for the failure at the specification level.
- Failed/expired connection attempts (per the new terminal state, Clarifications Session 2026-08-02) are excluded from the connections list shown to the user, rather than being shown with an explicit "failed" label in the UI; the terminal state exists in the underlying record so the system can reliably distinguish and migrate them, not necessarily to surface a new visible UI label. A future need to show failed attempts explicitly (e.g., for troubleshooting) is out of scope unless requested separately.
- Stale, never-completed connection attempts do not require a user-facing deletion action as part of this feature beyond being migrated into the failed/expired terminal state (FR-009); permanent deletion/garbage collection of failed/expired records from storage is an implementation concern, not a user-facing requirement.
- This feature builds directly on top of the already-shipped fix in 023-fix-mcp-connection-management (revoked connections excluded from the active list, origin/last-used tracking) and must not undo or weaken that behavior.
- The specific technical root cause of the current "unable to connect" failure is not yet known at the specification stage and will be identified during implementation planning; this spec requires the defect to be found and fixed, not a particular fix mechanism.
- This applies uniformly to all AI clients using the MCP connector, not only to Claude, even though Claude is used as the motivating example.
