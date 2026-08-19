# Feature Specification: Retrospective-Team Association

**Feature Branch**: `055-retro-team-association`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Quiero que, al crear una retrospectiva, el facilitador pueda asociarla opcionalmente a uno de sus equipos existentes. El dashboard (\"Mis tableros\") debe permitir filtrar por equipo. Una retrospectiva sin equipo asociado debe seguir funcionando exactamente igual que hoy. Vincular una retrospectiva a un equipo no debe cambiar quién puede unirse a ella: sigue siendo accesible por enlace/ID igual que ahora, salvo que se decida lo contrario más adelante."

## Clarifications

### Session 2026-08-19

- Q: Where should a retrospective's associated team be visibly indicated? → A: Only on the dashboard/board list (the user's own "My Boards" view) — never inside the open retrospective session itself, so participants who join via link but aren't part of the team never see it.
- Q: Which teams populate the dashboard's team-filter options? → A: Every team the viewing user currently belongs to (via the existing "my teams" list), plus "no team" — shown even if a given team currently has zero matching boards in the list.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Link a new retrospective to a team at creation (Priority: P1)

A facilitator creating a new retrospective, who already belongs to at least one team, can optionally pick one of their teams and have the retrospective associated with it from the moment it is created.

**Why this priority**: This is the foundational capability — nothing else in this feature (filtering, at-a-glance team identification) has meaning until a retrospective can actually carry a team association. It is also the smallest slice that delivers standalone value: a retrospective record now shows which team it belongs to.

**Independent Test**: Can be fully tested by having a facilitator who belongs to a team create a retrospective, selecting that team during creation, and verifying the resulting retrospective displays that team as its association — independent of any dashboard filtering behavior.

**Acceptance Scenarios**:

1. **Given** a facilitator who belongs to at least one team, **When** they create a retrospective and select one of their teams, **Then** the retrospective is created and associated with that team.
2. **Given** a facilitator who belongs to at least one team, **When** they create a retrospective without selecting any team, **Then** the retrospective is created with no team association, behaving exactly as retrospectives do today.
3. **Given** a facilitator who belongs to no teams, **When** they open the retrospective creation flow, **Then** they can complete creation without being required to select or interact with any team option.
4. **Given** a facilitator creating a retrospective, **When** they attempt to associate it with a team they do not belong to, **Then** the system rejects the association.

---

### User Story 2 - Filter "My Boards" dashboard by team (Priority: P2)

A user viewing their board dashboard can narrow the list down to only the retrospectives associated with a specific team, or to retrospectives that have no team association at all.

**Why this priority**: Filtering only becomes useful once retrospectives can carry a team association (User Story 1), so it naturally follows as the next layer of value — helping users navigate as the number of team-linked retrospectives grows.

**Independent Test**: Can be fully tested by having a user with a mix of team-linked and unlinked boards apply a team filter and confirming only the matching boards appear, then clearing the filter and confirming the full list returns — independent of the creation flow itself.

**Acceptance Scenarios**:

1. **Given** a user whose board list includes retrospectives linked to different teams, **When** they filter by one specific team, **Then** only retrospectives associated with that team are shown.
2. **Given** a user whose board list includes retrospectives with no team, **When** they filter for "no team," **Then** only retrospectives without a team association are shown.
3. **Given** a user with an active team filter and an active search or scope filter (e.g., "created by me"), **When** both filters are applied together, **Then** only retrospectives matching all active filters are shown.
4. **Given** a user with no team filter applied, **When** they view the dashboard, **Then** all their retrospectives are shown regardless of team association, exactly as today.

---

### User Story 3 - See a retrospective's team at a glance on the dashboard (Priority: P3)

On the dashboard ("My Boards"), a user can see which team a retrospective is associated with, if any, without having to open it or apply a filter. This indicator appears only in the dashboard/board-list view — it is not shown inside the open retrospective session itself, so participants who join a retrospective via its link/ID but are not part of the associated team never see which team it belongs to.

**Why this priority**: This is a visibility layer that makes the association from User Story 1 useful even without actively filtering. It is lower priority because the feature is functionally complete (linking and filtering both work) without it, but it meaningfully improves usability.

**Independent Test**: Can be fully tested by viewing the dashboard with a mix of team-linked and unlinked boards and confirming the team-linked ones display their team's identity while unlinked ones show no team indicator, and by confirming the indicator does not appear inside an open retrospective session.

**Acceptance Scenarios**:

1. **Given** a retrospective associated with a team, **When** it appears in a user's dashboard board list, **Then** its associated team is visibly indicated.
2. **Given** a retrospective with no team association, **When** it appears in a user's dashboard board list, **Then** no team indicator is shown, matching today's appearance.
3. **Given** a retrospective associated with a team, **When** a participant opens the retrospective session itself (rather than viewing it from the dashboard), **Then** no team indicator is shown within the session, regardless of whether that participant belongs to the team.

---

### Edge Cases

- A facilitator belongs to no teams: the creation flow must not force any team-related decision or block completion (see User Story 1, Scenario 3).
- A facilitator selects a team they belong to at creation time, then later leaves that team (or the team becomes ownerless): the retrospective keeps its existing team association; nothing is retroactively unlinked, and the retrospective's behavior is otherwise unaffected.
- A user who is not a member of a retrospective's linked team opens it via its link/ID: joining succeeds exactly as it does today; team association is informational only and grants no extra access, restricts no access, and does not require team membership.
- Two different teams happen to share the same name (team names are not unique per the team-management feature): filtering and display must still correctly distinguish between them, since the association is to a specific team record, not merely a name.
- A facilitator attempts to submit a retrospective creation request naming a team they do not belong to (e.g., via a manipulated request rather than the normal UI): the system must reject the team association rather than silently linking it or failing the whole creation.
- A user filters the dashboard by a team they belong to that currently has no matching boards in their list: the filter is still selectable, and the result is simply an empty board list rather than an error or a hidden/disabled option.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a facilitator, while creating a retrospective, to optionally select one team from the set of teams they currently belong to, and associate the new retrospective with that team.
- **FR-002**: System MUST allow a facilitator to create a retrospective without selecting any team, exactly as is possible today.
- **FR-003**: System MUST persist a retrospective's team association (or explicit absence of one) as part of the retrospective's record.
- **FR-004**: System MUST reject any attempt to associate a retrospective with a team that the requesting facilitator is not currently a member of.
- **FR-005**: System MUST NOT change who is able to join a retrospective based on whether it is associated with a team; joining a retrospective continues to depend solely on today's existing rule (a valid link/ID to an active retrospective), independent of the joining user's team membership.
- **FR-006**: System MUST leave the behavior, appearance, and functionality of a retrospective with no team association unchanged from its current behavior.
- **FR-007**: The board dashboard MUST allow a user to filter their visible board list down to retrospectives associated with one specific team, chosen from the full set of teams the viewing user currently belongs to (regardless of whether any of the user's currently visible boards are linked to that team).
- **FR-008**: The board dashboard MUST allow a user to filter their visible board list down to retrospectives that have no team association.
- **FR-009**: The board dashboard's team filter MUST be usable together with the dashboard's existing filters (e.g., search by name, created/joined scope), narrowing results to retrospectives matching all active filters simultaneously.
- **FR-010**: The board dashboard MUST, when no team filter is applied, continue to show every retrospective the user can currently see, regardless of team association, exactly as it does today.
- **FR-011**: The board dashboard MUST visibly indicate, wherever a retrospective is listed in a user's board list, which team (if any) it is associated with. This indicator MUST NOT appear inside the open retrospective session itself, so that participants who join via link/ID cannot learn a retrospective's team association from within the session.
- **FR-012**: System MUST NOT require a facilitator who belongs to no teams to interact with any team-related control in order to create a retrospective.
- **FR-013**: System MUST preserve a retrospective's team association after creation even if the retrospective's creator subsequently leaves that team or the team becomes ownerless.

### Key Entities

- **Retrospective (Board)**: The existing retrospective/board entity gains an optional reference to at most one Team, set at creation time. This reference does not affect who can access or join the retrospective — it is a descriptive attribute, not an access-control mechanism.
- **Team**: Reused as-is from the existing team-management capability. Supplies the list of options a facilitator can choose from at creation (limited to teams they belong to) and the values available for dashboard filtering.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A facilitator who belongs to a team can create a team-linked retrospective with no more effort than a single additional selection compared to creating an unlinked one today.
- **SC-002**: 100% of retrospectives created without a team selection are indistinguishable in behavior (creation time, joinability, functionality) from retrospectives created before this feature existed.
- **SC-003**: A user can narrow their board dashboard down to a single team's retrospectives in under 10 seconds, with the filtered results containing 100% of that team's retrospectives and none belonging to other teams.
- **SC-004**: Across both team-linked and unlinked retrospectives, 100% of join attempts via a valid link/ID succeed or fail based solely on today's existing join rule, unaffected by team association.
- **SC-005**: 100% of team-linked retrospectives visibly display their associated team on the dashboard, and 0% expose that association inside the open retrospective session.

## Assumptions

- A facilitator may only select, at creation time, a team they are currently a member of (owner or regular member); this is enforced the same way the existing team-management feature already scopes "my teams."
- The team association is set only at creation time for this iteration; changing, adding, or removing a retrospective's team association after it has been created is out of scope and deferred to a later iteration.
- The dashboard's team filter offers, as selectable values, every team the viewing user currently belongs to (the same "my teams" set used at retrospective-creation time) plus a "no team" option — not the full catalog of every team in the product, and not limited to only teams that already have a matching board in the user's current list.
- Per the user's explicit instruction, this iteration deliberately keeps retrospective access unchanged: team association is informational/organizational only and is not a permission or invitation mechanism. Restricting join access by team membership is an explicit non-goal here and may be reconsidered in a future iteration.
- The existing retrospective creation flow, dashboard search, and created/joined scope filter continue to work as they do today; the team association and filter are additive on top of them.
