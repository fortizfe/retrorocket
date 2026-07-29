# Feature Specification: Show Display Names Instead of User IDs on Retro Board Cards

**Feature Branch**: `020-user-display-name-fix`

**Created**: 2026-07-29

**Status**: Draft

**Input**: User description: "Tenemos un bug por el cual en los boards de retrospectivas, las tarjetas ordenadas por usuario, en vez de salir el nombre para mostrar del usuario, aparece su id. Debe mostrarse el display name del usuario."

## Clarifications

### Session 2026-07-29

- Q: When a card's author is no longer among the retrospective's active participants, should their real name still be shown (requiring the name to be durably stored, e.g. at card-creation time) — or is it acceptable that departed authors always show a generic fallback like "Unknown user"? → A: Persist the author's display name at card-creation time (mirroring the existing precedent for boards, which already store both an id and a name). Departed authors still show their real, captured name — a generic fallback is reserved only for cards where no name was ever captured (e.g., cards created before this capability existed) and the author can no longer be resolved live either.
- Q: When cards are grouped by user, should the groups be visually ordered alphabetically by the now-visible display name, or keep whatever internal order they have today (based on the raw identifier)? → A: Sort groups alphabetically (A→Z) by the author's display name.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Group headers show the author's name when grouping cards by user (Priority: P1)

As a retrospective participant, when I group the board's cards by author, I see each group labeled with the author's display name (e.g. "Jane Smith"), not their internal user identifier (e.g. a long alphanumeric string), so I can immediately tell whose cards I'm looking at.

**Why this priority**: This is the exact behavior reported as broken and the primary reason participants group cards by user — to scan contributions per teammate. An unreadable identifier defeats the purpose of the grouping feature entirely.

**Independent Test**: On a retrospective board with cards from multiple participants, switch the grouping mode to "by user" and confirm every group header shows a human-readable display name, with no raw identifier visible anywhere in the group headers.

**Acceptance Scenarios**:

1. **Given** a board with cards authored by several signed-in participants, **When** a user switches grouping to "by user", **Then** each group header shows the corresponding author's display name, and the groups are ordered alphabetically (A→Z) by that display name.
2. **Given** two different participants who happen to share the same display name, **When** the board is grouped by user, **Then** each participant's cards remain in their own separate, correctly attributed group (cards are not merged just because the visible names match), and both groups sort together at their shared alphabetical position.
3. **Given** a card authored by someone who is no longer among the retrospective's active participants, **When** the board is grouped by user, **Then** that group header still shows the author's real display name (captured when the card was created), not a generic fallback and not the raw identifier.
4. **Given** a card created before this capability existed, whose author is also no longer an active participant, **When** the board is grouped by user, **Then** that group shows a clear, readable generic fallback label instead of the raw identifier.

---

### User Story 2 - Each card's author label shows a display name (Priority: P2)

As a retrospective participant, when I look at an individual card (in any grouping mode), the author indicator on the card shows the author's display name rather than their internal identifier, so I always know who wrote it without needing to group by user first.

**Why this priority**: This is the same underlying defect (a raw identifier surfacing where a name is expected) affecting the per-card author label shown on every card at all times, not only in the "group by user" view. Fixing it closes the same class of bug consistently across the board rather than leaving it partially fixed.

**Independent Test**: Open a retrospective board with cards from multiple authors in any grouping mode and confirm each card's author label shows a display name, not a raw identifier.

**Acceptance Scenarios**:

1. **Given** a card created by a signed-in participant, **When** the card is rendered on the board, **Then** its author label shows that participant's display name.
2. **Given** a card whose author is no longer an active participant on the board, **When** the card is rendered, **Then** its author label still shows the author's real display name (captured when the card was created), not a generic fallback and not the raw identifier.
3. **Given** a card created before this capability existed, whose author is also no longer an active participant, **When** the card is rendered, **Then** its author label shows a clear, readable generic fallback instead of the raw identifier.

---

### Edge Cases

- What happens when a card's author has left the retrospective and is no longer in the current participant list? The UI must show the author's real display name, captured when the card was created — not the raw identifier and not a generic fallback.
- What happens with a card created before this capability existed (no captured name) whose author has also left the retrospective and can no longer be resolved live? The UI must show a readable generic fallback label (not the raw identifier and not a blank/broken label).
- What happens when a card has no recorded author at all? The UI must show the existing "no author" fallback behavior, not a raw identifier.
- What happens when grouping by user while participants are actively joining or leaving the board in real time? Group labels must stay consistent with each author's captured display name and must never regress to showing a raw identifier.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display each author's display name — not their internal user identifier — as the group header when retrospective cards are grouped by user.
- **FR-002**: System MUST display each author's display name — not their internal user identifier — in the per-card author label, regardless of the active grouping mode.
- **FR-003**: System MUST continue to treat each participant as a distinct group when grouping by user, even if two participants share the same display name (grouping correctness must not depend on the displayed name being unique).
- **FR-004**: System MUST order groups alphabetically (A→Z) by the author's display name when cards are grouped by user.
- **FR-005**: System MUST capture and durably store the author's display name at the time a card is created, so that name remains available for display even after the author is no longer an active participant in the retrospective.
- **FR-006**: System MUST show a clear, readable generic fallback label — never the raw internal identifier — only when no display name can be determined for a card's author at all (e.g., a card created before this capability existed, whose author is also no longer resolvable as an active participant).
- **FR-007**: System MUST preserve existing behavior for cards with no recorded author (no regression to showing an identifier or a broken label).
- **FR-008**: Resolving, capturing, and displaying the author's name MUST NOT change which cards are included in a group or how votes, likes, and reactions are aggregated for that group.

### Key Entities

- **Card**: A retrospective contribution with an author reference; today only the author's internal identifier is stored on the card, which is what leaks into the UI. Going forward, a card also captures the author's display name at creation time, so the name remains correct and displayable independent of who is currently connected.
- **Participant**: A person taking part in a specific retrospective, associated with a display name; used as a live fallback to resolve an author's identifier to a human-readable name when a card predates the captured-name capability.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of group headers shown when grouping retrospective cards by user display a human-readable name, with zero raw user identifiers visible in that view.
- **SC-002**: 100% of per-card author labels across all grouping modes display a human-readable name (or an explicit readable fallback), with zero raw user identifiers visible.
- **SC-003**: Participants can correctly identify which teammate authored a given card or group at a glance, without needing to decode or cross-reference an identifier.
- **SC-004**: When grouping by user on a board with multiple authors, group headers appear in alphabetical order by display name 100% of the time.

## Assumptions

- The retrospective board already loads a list of current participants (identifier-to-display-name mapping) on the client; this remains available as a live fallback path for cards that predate the captured-name capability.
- Capturing the author's display name at card-creation time mirrors an existing precedent already used elsewhere in the system for a comparable entity (which stores both an identifier and a name), so this approach is consistent with how the system already solves this class of problem.
- The per-card author label (User Story 2) is included in scope because it is the same defect (raw identifier displayed instead of a name) visible on every card at all times, not only in the "group by user" view; a participant reporting the grouped view as broken would reasonably expect the always-visible author label to be fixed too.
- The generic fallback label (for cards with no determinable author name at all) is a distinct, clearly non-identifier placeholder (e.g., an "unknown user" style label).
- Existing cards created before this capability ships will not have a captured name; for those, the live participant-list fallback resolves the name whenever the author is still active, and the generic fallback label applies only once the author is also no longer resolvable that way.
- No change to how cards are grouped, voted on, or otherwise processed is intended — this is a display/data-capture fix for how the author is represented to the user.
