# Feature Specification: Fix MCP Connections Always Resolving as Rejected

**Feature Branch**: `025-fix-mcp-connection-rejection`

**Created**: 2026-08-02

**Status**: Draft

**Input**: User description: "Actualmente las conexiones MCP se rechazan siempre. Abro claude, intento refrescar mi conexión y siempre termina en rechazada. Quiero que hagas una investigación de donde está el problema y lo corrijas. Las conexiones revocadas tienen que volver a abrirse si se realiza el flujo de conexión. Las peticiones de conexión deben resolver correctamente como aceptadas si el flujo llega al final del proceso."

## Clarifications

### Session 2026-08-02

- Q: If investigation confirms a shared protective mechanism (e.g., rate limiting) is the root cause, should the fix preserve some form of abuse protection or is removal acceptable? → A: Preserve, rescope per-user — keep abuse/rate protection but key it per-user/per-account instead of a shared/deployment-wide scope.
- Q: Should this fix include monitoring/alerting so a future blanket-rejection regression is caught automatically, or is it out of scope (tests only)? → A: Add rejection-rate alerting — detect and alert when erroneous/legitimate rejection rates spike, so a future regression of this kind is caught before users report it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connecting an AI client actually succeeds (Priority: P1)

A user opens their AI client (e.g., Claude) and starts or refreshes the connection to their account. They go through the standard authorization steps and approve access. Today, the attempt always ends up rejected, even though the user did everything right, leaving them with no working connection and no way to use the AI client against their data.

**Why this priority**: This is the core complaint and it blocks the feature entirely — if no connection attempt can ever succeed, nothing built on top of MCP connections (data access, prior status-reporting fixes, etc.) has any value, because no user can ever get into a working state.

**Independent Test**: Start a fresh authorization attempt for an AI client that has never been connected before, approve access, and complete the flow through to its end; verify the result is an accepted, working connection rather than a rejection.

**Acceptance Scenarios**:

1. **Given** a user starts a new connection attempt for an AI client and approves access, **When** the authorization flow reaches the end of the process, **Then** the attempt resolves as accepted and results in a working connection.
2. **Given** a user retries a connection attempt shortly after a previous attempt, **When** they complete the flow and approve access, **Then** the new attempt is also correctly resolved as accepted, not rejected because of the earlier attempt.
3. **Given** a user explicitly denies consent during the authorization flow, **When** the flow ends, **Then** the attempt resolves as rejected/denied — this genuine denial path is unaffected by the fix.
4. **Given** a connection request is genuinely invalid (e.g., expired, malformed, or unauthenticated), **When** the flow is evaluated, **Then** it still resolves as rejected — the fix only removes erroneous rejections, not legitimate ones.

---

### User Story 2 - Reconnecting a revoked connection works through the normal flow (Priority: P1)

A user who previously revoked an AI client's access decides to reconnect it. They start the standard connection flow again for that same client, expecting the same experience as connecting for the first time.

**Why this priority**: Revoking access is only a safe, usable action if reconnecting afterward works. Without this, revoke becomes a one-way, irreversible action through the normal flow, which undermines trust in the revoke feature itself and forces users into a broken state with no supported way out.

**Independent Test**: Revoke an existing AI client connection, then start a brand-new authorization attempt for that same client from scratch and verify it completes and results in a working, accepted connection.

**Acceptance Scenarios**:

1. **Given** a user has previously revoked a connection to an AI client, **When** they perform the connection flow again for that same client and approve access, **Then** the flow resolves as accepted and a new working connection is established.
2. **Given** a newly re-established connection after a revoke, **When** the AI client uses that connection to access the user's data, **Then** the access succeeds.
3. **Given** a user has revoked and reconnected the same AI client multiple times, **When** each reconnection flow is completed and approved, **Then** each one independently resolves as accepted.

---

### Edge Cases

- What happens when multiple users of the deployment attempt to connect or reconnect around the same time? No individual user's legitimate, approved attempt should be rejected because of other users' concurrent activity — any protective limit that applies MUST be scoped to each user individually, not shared across users.
- What happens when a user's earlier attempt failed or was abandoned and they immediately retry? The retry must be evaluated on its own merits and must not inherit a rejection from the earlier, unrelated attempt.
- What happens when the user genuinely denies consent, or the request is expired/malformed/unauthenticated? These must continue to resolve as rejected — this feature fixes erroneous rejections, not legitimate ones.
- What happens when a first-time connection (never previously connected) is attempted, not just a revoke-then-reconnect? It must also succeed, confirming the defect is general and not specific to the revoke case.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST identify and correct the underlying defect that currently causes MCP connection and reconnection attempts to resolve as rejected even when the user approved access and the flow completed normally.
- **FR-002**: When a user completes the standard connection/authorization flow and approves access, the request MUST resolve as accepted, except where the user explicitly denies consent or the request is genuinely invalid (expired, malformed, or unauthenticated) — those cases must continue to resolve as rejected.
- **FR-003**: Users MUST be able to re-establish a connection for an AI client whose access was previously revoked by performing the standard connection flow again, without any special-case workaround.
- **FR-004**: The system MUST NOT let conditions unrelated to a specific request's own validity (e.g., activity from other users or from earlier, unrelated attempts) cause a legitimate, approved connection attempt to be rejected. Where this is enforced by an abuse/protective mechanism (e.g., a rate or usage limit), that mechanism MUST be preserved but scoped per-user/per-account rather than shared across unrelated users, so it still protects against abuse without letting one user's activity affect another's ability to connect.
- **FR-005**: The system MUST correctly distinguish between an erroneous rejection (caused by the defect in FR-001) and a legitimate rejection (user denial, an invalid/expired/malformed request, or a per-user protective limit correctly triggered by that same user's own excessive activity), preserving the latter's behavior unchanged.
- **FR-006**: The fix MUST NOT regress previously shipped MCP connection behavior — namely that revoked connections are excluded from the active/successful list (023) and that failed/expired attempts are correctly classified and excluded (024).
- **FR-007**: Both first-time connection attempts and revoke-then-reconnect attempts, for any AI client using the MCP connector, MUST succeed when the user approves and the flow reaches its end.
- **FR-008**: The system MUST emit a distinguishable, queryable signal for every connection-attempt rejection (at minimum, distinguishing a legitimate per-user throttle from an unresolvable/garbage request), sufficient for external monitoring to detect an abnormal rise in rejection rate and alert the team — so a future recurrence of erroneous, blanket-style rejections can be caught proactively rather than only through user reports. Configuring the actual alert rule/threshold in monitoring tooling is a deployment-level activity outside this feature's build.

### Key Entities

- **Connection Attempt**: A single try at authorizing an AI client against a user's account, ending in one of: accepted (working access established), rejected due to genuine denial or invalidity, or rejected due to the defect this feature removes. Only the first two outcomes are legitimate; the third must no longer occur after this fix.
- **AI Client Connection**: The user-facing record of an AI client's access to a user's account, as established in prior work (023-fix-mcp-connection-management, 024-fix-mcp-connection-status). This feature ensures the connection flow that produces this record actually succeeds when it should, including after a revoke.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user completing the connection flow and approving access ends up with a working, accepted connection on the first attempt, under normal conditions, 100% of the time.
- **SC-002**: 100% of previously revoked AI client connections can be re-established through the standard connection flow in a single attempt.
- **SC-003**: Reports of "connection always rejected" or "unable to connect" for approved, correctly-completed flows drop to zero after release.
- **SC-004**: Legitimate rejections (explicit user denial, expired/malformed/unauthenticated requests, or a user's own excessive activity correctly triggering a per-user protective limit) continue to be reported correctly, confirming the fix removes only erroneous rejections.
- **SC-005**: Connection success for any individual user is unaffected by how many other users are connecting or reconnecting around the same time.
- **SC-006**: Every connection-attempt rejection emits a signal distinguishing a legitimate per-user throttle from an unresolvable/garbage request, in a form external monitoring can use to detect an abnormal rise in rejection rate and alert the team — without waiting for a user report.

## Assumptions

- The defect affects connection attempts broadly (any user, any AI client using the MCP connector), not just the reporting user — the fix must address the general case, not a single account.
- The specific technical root cause of the erroneous rejection is not fixed at the specification stage; it is to be identified and corrected during planning/implementation. One working hypothesis worth validating first is a shared, deployment-wide protective constraint (e.g., a resource or usage limit applied without distinguishing between individual users or requests) rather than a per-request logic defect, since the symptom is a consistent, blanket "always rejected" rather than an intermittent or user-specific failure — this must still be confirmed during investigation, but if confirmed, per the Clarifications above, the fix rescopes such a constraint per-user rather than removing it.
- This feature builds on top of the already-shipped fixes in 023-fix-mcp-connection-management and 024-fix-mcp-connection-status and must not undo or weaken their behavior (revoked/failed/expired connections still excluded from the active list).
- Legitimate rejection paths (explicit consent denial, expired/malformed/unauthenticated requests) are out of scope for change — only the erroneous "always rejected" behavior is being fixed.
- This applies uniformly to all AI clients using the MCP connector, not only to Claude, even though Claude is used as the motivating example.
- FR-008/SC-006's "alert" is satisfied by emitting the underlying signal in a form external monitoring can act on; wiring an actual alert rule/threshold into a monitoring or paging tool is a deployment/operational configuration step, not a code deliverable of this feature.
