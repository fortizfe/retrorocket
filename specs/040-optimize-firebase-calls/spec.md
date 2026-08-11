# Feature Specification: Optimize Backend-to-Firestore Call Volume

**Feature Branch**: `040-optimize-firebase-calls`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "Actualmente tenemos un problema de escalado entre vercel y firebase. Resumiendo mucho, la creación de nuevas instancias crea nuevas conexiones a firebase y eso acaba alcanzando el límite de firebase muy rápido. He estado investigando y quiero atajar este problema. Mis investigaciones están en fortizfe/documents/mejora llamadas firebase.md. Lee dicho documento y desarrolla un plan para optimizar el tratamiento de las llamadas entre backend y firebase para minimizar el consumo. Si es necesario algún tipo de servicio para compartir información entre instancias, prefiero que sea redis en vercel en su plan gratuito."

## Clarifications

### Session 2026-08-11

- Q: When the shared coordination mechanism (Story 3) becomes temporarily unavailable, what should instances do about a board's real-time subscriptions? → A: Fail-open — each instance temporarily falls back to opening its own listeners for boards it's serving (today's behavior), accepting brief duplicate load until coordination recovers; real-time updates never stop.
- Q: What should the profile-lookup cache TTL be (FR-003)? → A: 60 seconds.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Uninterrupted board access during traffic spikes (Priority: P1)

A team is running a retrospective and, at the same moment, other teams across the organization are also active on the platform. A short-lived burst of traffic (people joining boards, reconnecting after a network blip, or simply many boards being active at once) must not cause anyone to see a service error or lose their connection to the board, even though the backend's data-store usage stays well inside its documented daily limits.

**Why this priority**: This is the direct cause of the production incident (`RESOURCE_EXHAUSTED` errors reproduced during a traffic increase that was nowhere near the documented daily quota). It is the highest-impact, most user-visible risk, and the investigation identifies a concrete, low-risk fix.

**Independent Test**: Can be fully tested by repeatedly reconnecting to an already-joined board (simulating the periodic reconnects the platform forces) and confirming the number of data-store reads issued per reconnection drops to the minimum necessary, with no behavior change visible to the user.

**Acceptance Scenarios**:

1. **Given** a user who has already joined a board and is reconnecting after a routine periodic disconnect, **When** the reconnection completes, **Then** the board's own record is read at most once during that reconnection cycle instead of multiple times.
2. **Given** a user whose profile was already looked up earlier in the same request cycle, **When** a later step in that same cycle needs the profile again, **Then** the stored result is reused instead of issuing a new lookup.
3. **Given** a moderate, sudden increase in overall platform traffic (consistent with the ~40% spike observed during the incident), **When** users join, rejoin, or reconnect to boards during that spike, **Then** no user-facing request fails due to the data store's anti-abuse throttling.

---

### User Story 2 - Lower steady-state background load (Priority: P2)

A board is open in a browser tab but nobody is actively typing. The platform should not keep consuming backend/data-store capacity to check for a "someone is typing" state that isn't happening, especially when many boards are left open simultaneously (a common pattern for teams that keep retrospectives open across a sprint).

**Why this priority**: This is a constant, traffic-independent background cost (documented at 120 checks/minute per open board) that erodes the safety margin below the anti-abuse threshold before any real usage even occurs. It is lower priority than User Story 1 because it did not directly trigger the incident, but it materially increases exposure to the next one.

**Independent Test**: Can be fully tested by opening a board, leaving it idle (no typing) for several minutes, and confirming the number of background checks against the data store drops substantially compared to current behavior, while the "someone is typing" indicator still appears and disappears within an acceptable, unnoticeable delay.

**Acceptance Scenarios**:

1. **Given** a board left open with no one typing, **When** time passes, **Then** the system checks for stale "typing" state far less frequently than once every 500ms, without needing an active typist to justify the check.
2. **Given** a user who was typing and then stops, **When** the inactivity period elapses, **Then** the "someone is typing" indicator still disappears within a delay that is not perceptibly different from today's behavior.

---

### User Story 3 - Consistent real-time updates regardless of instance count (Priority: P3)

As more people use the platform at once, the backend automatically runs more concurrent instances to keep up. Today, each instance independently opens its own full set of real-time subscriptions to a board's data, so the more instances are running for the same active board, the more redundant backend-to-data-store connections exist for that single board — multiplying cost without multiplying value delivered to users. Real-time updates (new cards, votes, groupings, timer changes) must keep arriving promptly for every connected participant no matter how many backend instances are currently serving that board.

**Why this priority**: This is the deepest structural driver of excess data-store load (the investigation ties it directly to the incident) but it is also the largest and riskiest change, requiring new shared infrastructure. It is sequenced after Stories 1 and 2 so the lower-risk, higher-certainty wins ship first and reduce exposure immediately, while this structural fix is designed and rolled out carefully.

**Independent Test**: Can be fully tested by forcing multiple backend instances to serve the same active board concurrently (e.g., via simulated concurrent connections or a controlled scale-out) and confirming only one active set of real-time subscriptions exists for that board across all instances at any given time, while every connected participant still receives live updates without delay.

**Acceptance Scenarios**:

1. **Given** two or more backend instances simultaneously serving connections to the same board, **When** any of those instances needs to relay real-time updates for that board, **Then** only one shared set of subscriptions to that board's data exists across all instances at once.
2. **Given** the instance currently responsible for a board's shared subscriptions stops running or is replaced (e.g., due to a deployment or scale-down), **When** other instances still have participants connected to that board, **Then** responsibility for that board's subscriptions transfers without participants losing real-time updates.
3. **Given** the shared coordination mechanism becomes temporarily unavailable, **When** instances can no longer confirm which one owns a board's subscriptions, **Then** each affected instance falls back to independently opening its own listeners for the boards it is serving (today's per-instance behavior) rather than dropping real-time updates, and reconciles back to a single shared owner once coordination is restored.

---

### Edge Cases

- What happens when the periodic forced reconnection (every few minutes) happens to many boards at once (a "reconnection storm")? The deduplication in Story 1 must keep each individual reconnection cheap so a storm doesn't reintroduce the same spike pattern that caused the incident.
- How does the system behave if the shared coordination store used for Story 3 is briefly unreachable? Per the fail-open decision above, affected instances temporarily revert to independently opening their own listeners (today's baseline behavior) rather than losing real-time updates, and reconcile back to single ownership once coordination is restored.
- What happens when a board has zero connected participants across all instances — are its background checks (typing sweep) and real-time subscriptions fully released rather than left running?
- What happens when a user's profile changes (e.g., display name update) between two reuses of a cached lookup within the same 60-second caching window — is the change still reflected promptly through the existing explicit-update path?
- What happens when two backend instances start up at nearly the same instant and both attempt to claim ownership of the same board's subscriptions — does exactly one win, with no duplicate subscriptions surviving the race?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST avoid issuing more than one read of a board's own record per reconnection cycle when a user rejoins or resyncs a board they are already a member of.
- **FR-002**: The system MUST reuse a user's profile lookup result within a single request/reconnection cycle instead of re-fetching it when it is needed more than once in that cycle.
- **FR-003**: The system MUST serve repeated profile lookups for the same user within a 60-second window without issuing a fresh data-store read for each one, while still reflecting explicit profile updates promptly (via the existing explicit-update path).
- **FR-004**: The system MUST reduce the frequency of the idle "typing status" background check so that it is no longer a fixed, always-on cost independent of real activity, while keeping the "someone is typing" indicator's appearance/disappearance delay within a range that is not perceptibly different to users from current behavior.
- **FR-005**: The system MUST stop performing "typing status" background checks for a board once no participants remain connected to it (across all instances), and MUST resume them only when a participant reconnects.
- **FR-006**: The system MUST ensure that, regardless of how many backend instances are concurrently serving connections for the same board, only one active set of real-time data-store subscriptions exists for that board at any given time.
- **FR-007**: The system MUST transfer responsibility for a board's real-time subscriptions to another eligible instance when the instance currently holding it stops serving that board (e.g., shutdown, redeploy, or forced periodic reconnection), without participants missing real-time updates.
- **FR-008**: The system MUST use a shared, external coordination mechanism (independent of any single instance's in-memory state) to determine which instance is currently responsible for a given board's real-time subscriptions.
- **FR-008a**: When the shared coordination mechanism is temporarily unavailable, the system MUST fail open — each affected instance independently opens its own listeners for the boards it is serving (reverting to today's per-instance behavior) rather than dropping real-time updates — and MUST reconcile back to a single shared owner per board once coordination is restored.
- **FR-009**: The system MUST continue delivering real-time updates (cards, groups, action items, participants, timer, facilitator notes, typing status) to every connected participant with no user-perceptible change in latency or reliability after these optimizations are applied.
- **FR-010**: The system MUST NOT change any user-visible behavior (join flow, real-time update latency, typing indicator timing, profile display) as an observable side effect of these internal efficiency changes.
- **FR-011**: The system MUST remove or avoid retaining backend code paths that are confirmed unused and that only add unnecessary maintenance surface without contributing to the optimization goal.

### Key Entities *(include if feature involves data)*

- **Board Subscription Ownership**: Represents which single backend instance currently holds the active real-time subscriptions for a given board, so that only one instance issues that board's live update streams at a time. Includes the board identifier, the currently responsible instance, and enough information to detect and recover when that instance stops being available.
- **Cached Profile Lookup**: A short-lived, reusable copy of a user's profile data, keyed by user, used to avoid repeated identical lookups within a 60-second window or within a single request cycle.
- **Board Reconnection Cycle**: The bounded sequence of steps (authentication/handshake, joining, fetching current board state) that occurs each time a participant's connection to a board is (re-)established, within which redundant lookups of the same data should not repeat.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A single board reconnection (rejoin + state resync for an already-joined user) results in no more than 1 read of the board's own record, down from up to 4 today.
- **SC-002**: Background "typing status" checks against the data store drop by at least 70% for boards with no active typing, while the typing indicator still disappears within its currently expected timeframe (no more than ~3.5 seconds after the last keystroke).
- **SC-003**: A traffic increase of the magnitude observed during the incident (roughly 40% above baseline request volume) no longer results in any user-facing service errors caused by the data store's anti-abuse protection.
- **SC-004**: Regardless of how many backend instances are concurrently active for a given board (tested with at least 3 concurrent instances), exactly one set of real-time subscriptions is open against the data store for that board at any point in time.
- **SC-005**: Real-time updates (new cards, votes, groupings, timer changes) continue to reach all connected participants within the same perceived delay as before these changes (no user-reported or measured regression in real-time responsiveness).
- **SC-006**: No regression is introduced in existing join, real-time sync, or typing-indicator behavior, as verified by the project's existing automated test suite plus targeted new coverage for the deduplicated/cached paths.

## Assumptions

- The three user stories are independently shippable and may be released as separate, incremental changes in priority order (P1, then P2, then P3), consistent with the source investigation's explicit recommendation not to bundle the structural fix (Story 3) into the same change as the lower-risk quick wins (Stories 1–2).
- If a shared, external coordination mechanism is needed to implement Story 3 (multi-instance subscription ownership), it will be a Redis-compatible store provisioned on Vercel's free tier, per stakeholder preference — not a move to a different hosting platform or a persistent non-serverless process.
- The project remains on Firebase's free (Spark) plan for the scope of this feature; solutions that depend on enabling billing are out of scope.
- The periodic forced reconnection behavior (backend connections cycling roughly every 5 minutes) is an existing platform constraint that is not being changed by this feature — the goal is to make each reconnection cheap, not to eliminate reconnections.
- "No user-perceptible change in behavior" is the guiding constraint for all optimizations in Stories 1 and 2: these are efficiency changes, not feature changes.
- Deliberately-tuned typing-indicator throttling on the write side (how often a client reports "I'm typing") is out of scope, since the source investigation found it already optimized with a documented history of prior flicker-related fixes, and touching it risks regressing that prior work.
- Removal of confirmed-unused backend code (FR-011) is limited to code with zero call sites found across the codebase; anything with any uncertainty about usage is out of scope for removal.
