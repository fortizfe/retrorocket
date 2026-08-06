# Feature Specification: Fix Typing Indicator Flicker

**Feature Branch**: `026-fix-typing-indicator-flicker`

**Created**: 2026-08-06

**Status**: Draft

**Input**: User description: "Actualmente el componente que muestra quien está escribiendo no funciona correctamente. Se muestra y al instante siguiente se oculta. Me gustaría investigar y revisar el comportamiento de este componente para que muestre cuando una persona está escribiendo durante un tiempo más óptimo. Al menos que no se oculte hasta que la persona acaba de escribir. Evita caer en el uso de polling de modo que pueda colgar el servidor."

## Clarifications

### Session 2026-08-06

- Q: What should the bounded inactivity grace period be before a participant's typing indicator hides after they stop typing (no explicit stop action)? → A: 3 seconds
- Q: Should this fix also make typing status perceivable to assistive technology (screen readers), given the project's non-negotiable WCAG 2.1 AA standard, or is accessibility out of scope for this timing fix? → A: In scope — add an accessible, non-visual announcement (e.g., ARIA live region) synchronized with the visual indicator, as part of this fix

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Stable indicator while a teammate is actively typing (Priority: P1)

As a retrospective participant, when a teammate starts writing a card in a column, I want the "is typing" indicator for that teammate to stay visible continuously for as long as they keep typing, so I have reliable, trustworthy awareness of who is actively contributing right now instead of a flickering, unreliable signal.

**Why this priority**: This is the exact defect reported — the indicator currently appears and disappears an instant later, making it useless. Fixing the continuity of the signal while typing is ongoing is the core value of this feature.

**Independent Test**: Have one participant type continuously in a column for several seconds while a second participant observes that column. The indicator must appear once and remain visible, without disappearing and reappearing, for the whole time the first participant keeps typing.

**Acceptance Scenarios**:

1. **Given** participant A is not typing, **When** participant A starts typing in a column, **Then** participant B sees a typing indicator for participant A appear in that column.
2. **Given** the typing indicator for participant A is visible to participant B, **When** participant A continues typing (including brief pauses between keystrokes of under 3 seconds, normal while composing a sentence), **Then** the indicator remains continuously visible to participant B without disappearing and reappearing.
3. **Given** a brief network delay occurs while participant A is still actively typing, **When** the delayed update arrives, **Then** participant B's view does not show the indicator flicking off and back on because of that delay.

---

### User Story 2 - Indicator disappears promptly and predictably once typing ends (Priority: P2)

As a retrospective participant, once a teammate finishes typing (or leaves/loses connection while typing), I want their typing indicator to disappear within a short, predictable amount of time, so the indicator reflects current activity and doesn't mislead me into thinking someone is still writing when they are not.

**Why this priority**: Solving the flicker (User Story 1) by simply extending the indicator's visibility forever would trade one bug for another. This story protects the "leave once done" half of the request ("al menos que no se oculte hasta que la persona acaba de escribir").

**Independent Test**: Have participant A type for a few seconds and then stop (without submitting or navigating away). Confirm the indicator disappears for participant B within 3 seconds of the last keystroke, and stays hidden afterward.

**Acceptance Scenarios**:

1. **Given** participant A was typing and the indicator is visible to participant B, **When** participant A stops typing and takes no further action, **Then** the indicator disappears for participant B within 3 seconds and does not reappear on its own.
2. **Given** participant A was typing, **When** participant A submits or cancels the card they were writing, **Then** the indicator disappears for participant B promptly, without waiting out the full 3-second inactivity grace period.
3. **Given** participant A was typing, **When** participant A closes their browser tab or loses connection, **Then** the indicator disappears for participant B within the same 3-second grace period rather than remaining stuck on indefinitely.

---

### User Story 3 - Correct behavior with multiple simultaneous typists (Priority: P3)

As a retrospective participant, when several teammates are typing in the same column at the same time, I want to see all of them represented accurately, with each one's indicator following its own show/hide lifecycle independent of the others.

**Why this priority**: Retrospectives are collaborative and multiple people frequently write in the same column at once; the fix must hold up under that realistic condition, not just the single-typist case.

**Independent Test**: Have two participants type in the same column at overlapping but different times (one starts first, the other joins in, the first one stops while the second keeps going). Confirm the displayed set of typists updates correctly at each step without one participant's state affecting the other's.

**Acceptance Scenarios**:

1. **Given** participants A and B are both typing in the same column, **When** either one is observed by participant C, **Then** C sees both A and B represented as typing.
2. **Given** participants A and B are both typing in the same column and A stops while B continues, **When** A's grace period elapses, **Then** C sees only B represented as typing, with no flicker of B's indicator caused by A's state change.

---

### User Story 4 - Typing status perceivable via assistive technology (Priority: P2)

As a retrospective participant who uses a screen reader, I want to be notified when a teammate starts or stops typing in a column, so that I have the same awareness of collaborative activity as sighted participants who see the visual indicator.

**Why this priority**: The typing indicator conveys live collaboration state visually only today. Per the project's non-negotiable WCAG 2.1 AA accessibility standard, any user-facing state change communicated visually must have an equivalent non-visual channel. This is bundled into the same fix rather than deferred, since correct lifecycle/timing (User Stories 1–2) is required infrastructure for a usable announcement too — announcing on every flicker would be as unusable for screen reader users as the visual bug is for sighted users.

**Independent Test**: With a screen reader active, have participant A start typing in a column; confirm the screen reader announces that participant A is typing. Have participant A stop typing; confirm the accessible state clears in step with the visual state, with no repeated or stale announcements.

**Acceptance Scenarios**:

1. **Given** a screen reader user is on the board, **When** a teammate starts typing in a column, **Then** the screen reader announces that the teammate is typing without requiring the user to manually navigate to the indicator.
2. **Given** the screen reader has already announced a teammate is typing, **When** that teammate continues typing with no state change, **Then** no repeated or duplicate announcements are made while typing continues.
3. **Given** a teammate's typing indicator hides (per the grace period or an explicit stop action), **When** that state change happens, **Then** the screen reader user is not left with a stale "is typing" announcement — the accessible state matches the visual state.

---

### Edge Cases

- What happens when a participant switches from typing in one column directly to typing in another before the first column's grace period has elapsed? The first column's indicator should clear promptly and the new column's indicator should appear, without a stale duplicate lingering in the original column.
- How does the system handle a participant who pauses for a long time mid-sentence without closing the input? The indicator must eventually hide after the bounded inactivity grace period rather than remaining shown indefinitely just because the input still has focus.
- What happens if the connection between a typing participant and the real-time channel is briefly interrupted and then recovers while they are still typing? The indicator should not flicker off due solely to a transient delivery gap that resolves within the grace period.
- What happens if two updates for the same participant/column arrive out of order (e.g., a "stopped" update delivered before a slightly earlier "typing" update)? The displayed state must converge to the participant's actual latest activity rather than getting stuck in the wrong state.
- What happens when the participant who was typing is the only other person on the board and they leave entirely? Their indicator must not remain visible to the last remaining participant.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST show a typing indicator for a participant in a column as soon as that participant starts typing there.
- **FR-002**: The system MUST keep a participant's typing indicator continuously visible for the entire time that participant is actively typing, without the indicator disappearing and reappearing while typing activity is ongoing.
- **FR-003**: The system MUST hide a participant's typing indicator only after that participant has produced no further typing activity for 3 seconds, or after an explicit stop action (e.g., submitting or cancelling the card), whichever happens first.
- **FR-004**: The system MUST hide a participant's typing indicator for other viewers within 3 seconds if that participant disconnects, closes their session, or loses connectivity while marked as typing.
- **FR-005**: The system MUST correctly represent multiple participants typing concurrently in the same column, with each participant's show/hide lifecycle evaluated independently of the others.
- **FR-006**: The system MUST reflect typing status changes to other participants through real-time, event-driven updates and MUST NOT depend on any client repeatedly requesting ("polling") the current typing status on a fixed interval to detect changes.
- **FR-007**: The system MUST tolerate transient delivery delays or minor out-of-order updates for the same participant/column without producing a visibly incorrect or flickering indicator state.
- **FR-008**: The typing indicator behavior defined above MUST be consistent across every column of the retrospective board.
- **FR-009**: The system MUST expose typing status changes (a participant starting or stopping typing) to assistive technology through an accessible, non-visual notification (e.g., an ARIA live region or equivalent), synchronized with the visual indicator's show/hide state defined in FR-001–FR-004, and MUST NOT re-announce while the state is unchanged.

### Key Entities

- **Typing Status**: Represents whether a specific participant is currently typing in a specific column of a retrospective, including when that activity was last observed. Used to derive what is shown to other participants.
- **Typing Indicator (displayed)**: The user-facing representation, per column, of the set of participants currently considered to be typing there, derived from the underlying Typing Status data with the show/hide timing rules from this spec applied.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: While a participant types continuously in a column, the typing indicator for that participant remains visible to other participants for the full duration, with zero occurrences of it disappearing and reappearing during that active period.
- **SC-002**: After a participant stops typing without an explicit action, the typing indicator disappears for other participants within 3 seconds (±0.5s tolerance for network/render delay) in at least 95% of observed cases, rather than varying unpredictably or lingering indefinitely.
- **SC-003**: No spurious flicker (the indicator appearing and disappearing again in under one second while the source participant is still actively typing) is observed during normal typing or under a brief simulated network delay.
- **SC-004**: The fix does not introduce any new fixed-interval network request loop; the number of real-time messages exchanged to support typing indicators does not scale with a polling interval, only with actual typing activity and the existing grace-period checks.
- **SC-005**: With two or more participants typing in the same column at overlapping times, each participant's typing indicator accurately reflects their own activity at all times, independent of other participants' start/stop actions in the same column.
- **SC-006**: Screen reader users receive a non-visual notification of typing start/stop events synchronized with the visual indicator's state, with zero duplicate or stale announcements, verified against WCAG 2.1 AA (status messages) conformance.

## Assumptions

- "Explicit stop" actions (submitting or cancelling the card being written, or navigating away/closing the session) are expected to clear the indicator faster than waiting out the full inactivity grace period, since the system has direct evidence typing has ended in those cases.
- The real-time delivery mechanism already used elsewhere on the retrospective board for live updates (card changes, votes, etc.) is assumed to remain the transport for typing status changes; this feature only corrects the show/hide timing behavior of the indicator, it does not introduce a new transport mechanism.
- "Polling" in the user's request refers to a client repeatedly asking a server on a fixed interval whether something changed; event-driven push updates delivered as they occur are not considered polling and remain acceptable (and preferred) under this constraint.
- "Brief" network delay/interruption (User Story 1 Acceptance Scenario 3, Edge Cases) means a gap of up to ~2 seconds — realistic jitter/reconnect latency, comfortably under the 3-second grace period. "Minor" out-of-order updates (FR-007, Edge Cases) means events for the same participant/column arriving within that same ~2-second window in reversed order.
- The ARIA live region introduced by FR-009 reuses the exact, currently non-i18next-routed string already rendered by the visual indicator. Migrating that string to i18next is explicitly out of scope for this fix (pre-existing debt, unrelated to the reported defect); WCAG 2.1 AA conformance concerns the presence and behavior of the status message, not its localization.
