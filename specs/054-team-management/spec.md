# Feature Specification: Team Management Foundation

**Feature Branch**: `054-team-management`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Quiero introducir el concepto de \"equipo\" en RetroRocket. Un facilitador debe poder crear un equipo con un nombre (y una descripción opcional) y convertirse automáticamente en su propietario. Desde la pantalla del equipo, el propietario debe poder añadir miembros existentes de RetroRocket (buscándolos o invitándolos) y eliminarlos cuando ya no formen parte del equipo. Cualquier miembro debe poder ver la lista de compañeros del equipo y los equipos a los que pertenece. Un usuario puede pertenecer a varios equipos a la vez. Esta primera versión NO debe todavía vincular retrospectivas a un equipo, ni calcular métricas, ni incluir encuestas de health check: es solo la base (creación y gestión de la pertenencia al equipo) sobre la que se construirán esas capacidades en iteraciones posteriores."

## Clarifications

### Session 2026-08-19

- Q: When the owner searches for an existing RetroRocket user to add, what should the search capability match on and expose? → A: Exact email match only — owner types a complete email address; system finds that exact account if it exists. No partial/typeahead results.
- Q: Can a team be deleted outright in this iteration? → A: No deletion in this iteration — teams can only be created, never deleted; an empty/ownerless team (from the sole owner leaving) simply stays inert. Deletion is deferred to a later iteration.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a team and become its owner (Priority: P1)

Any authenticated RetroRocket user (acting as a facilitator) creates a new team by giving it a name and, optionally, a description. The moment the team is created, that user automatically becomes the team's owner.

**Why this priority**: Team creation is the entry point for the entire feature — nothing else (membership, future retrospective linking, metrics) can exist without a team first existing and having an owner. It is the minimum slice that delivers standalone value (a named team record exists and is attributable to someone).

**Independent Test**: Can be fully tested by having a user create a team with just a name, and verifying the team appears with that user recorded as owner — no membership management is required for this to be a complete, demonstrable slice.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the team creation screen, **When** they submit a team name only, **Then** the team is created and the user is shown as its owner.
2. **Given** an authenticated user on the team creation screen, **When** they submit a team name and a description, **Then** the team is created with both the name and description stored and visible.
3. **Given** an authenticated user on the team creation screen, **When** they submit the form without a name, **Then** the system rejects the submission and explains that a name is required.

---

### User Story 2 - Owner manages team membership (Priority: P2)

From the team's screen, the team owner searches for an existing RetroRocket user and adds them as a member, or removes a member who should no longer be part of the team.

**Why this priority**: Membership management is what turns a team from a solitary record into a group. It depends on User Story 1 (a team and an owner must already exist) but delivers the next layer of value on its own.

**Independent Test**: Can be fully tested by having a team owner search for another existing user, add them, confirm they appear in the roster, then remove them and confirm they no longer appear — independent of any retrospective, metric, or survey functionality.

**Acceptance Scenarios**:

1. **Given** a team owner on the team's screen, **When** they enter the exact email address of an existing RetroRocket user and select "add," **Then** that user is added to the team and appears in the member list.
2. **Given** a team owner on the team's screen, **When** they enter an email address that matches no existing RetroRocket account, **Then** the system indicates no matching user was found and does not add anyone.
3. **Given** a team owner viewing the member list, **When** they remove a member who is not the owner, **Then** that person no longer appears in the team's member list.
4. **Given** a team owner attempting to add a user who is already a member, **When** they select that user again, **Then** the system prevents a duplicate membership and indicates the user is already on the team.
5. **Given** a user who is a team member but not its owner, **When** they attempt to add or remove another member, **Then** the system denies the action.
6. **Given** a non-owner member who no longer wants to be part of a team, **When** they choose to leave the team, **Then** they are removed from the member list without needing the owner to act.
7. **Given** a team owner who chooses to leave a team that still has other members, **When** they leave, **Then** ownership automatically transfers to the longest-standing remaining member and the former owner is no longer part of the team.

---

### User Story 3 - View team roster and personal team memberships (Priority: P3)

Any member of a team (owner or not) can see the full list of teammates in that team, and any authenticated user can see the list of all teams they currently belong to.

**Why this priority**: This is the read-only visibility layer. It is valuable on its own once teams and memberships exist (Stories 1–2), giving members situational awareness, but it does not block the ability to create teams or manage membership, so it is the lowest-priority independent slice.

**Independent Test**: Can be fully tested by having a member open a team's screen and confirm every current member is listed, and by having a user open their teams overview and confirm every team they belong to is listed — independent of the add/remove actions themselves.

**Acceptance Scenarios**:

1. **Given** a user who belongs to a team, **When** they open that team's screen, **Then** they see every current member of the team, including the owner.
2. **Given** a user who belongs to more than one team, **When** they open their teams overview, **Then** they see every team they belong to, with no team missing or duplicated.
3. **Given** a user who belongs to no teams, **When** they open their teams overview, **Then** they see an empty state indicating they are not part of any team yet.

---

### Edge Cases

- When the owner leaves a team that still has other members, ownership automatically transfers to the longest-standing remaining member (see FR-013); the previous owner becomes a regular member (or leaves entirely, if they chose to leave rather than just step down).
- When the owner is the sole remaining member and leaves, the team ends up with zero members and no owner; it is not deleted (see FR-015) and simply persists inertly, with no further membership changes possible on it, until deletion or ownership-recovery is addressed in a future iteration (see FR-014).
- What happens when the owner enters an email address with different capitalization or surrounding whitespace than how the account was registered? The lookup must still find the matching account (email matching is not case- or whitespace-sensitive).
- What happens when the team name entered duplicates the name of another, unrelated team? Creation still succeeds; team names are not required to be globally unique (see Assumptions).
- What happens when a user who is added to a team is later added to the same team again by a different route (e.g., a race between two concurrent add actions)? The system must not create a second membership record for the same user/team pair (see FR-007).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow any authenticated user to create a team by providing a name (required, non-empty) and a description (optional).
- **FR-002**: System MUST automatically record the user who creates a team as that team's owner, with no separate confirmation step.
- **FR-003**: System MUST allow a team's owner to look up an existing RetroRocket user by entering that user's exact, complete email address, in order to add them as a member; the system MUST NOT return partial matches or a browsable list of other users' accounts.
- **FR-004**: System MUST add a found existing user as a member of the team immediately once the owner selects them, with no invitation-acceptance step required.
- **FR-005**: System MUST allow a team's owner to remove any member of the team other than themself from that team.
- **FR-006**: System MUST prevent adding, as a team member, anyone who does not already have a RetroRocket account (no invitations to people outside the product in this iteration).
- **FR-007**: System MUST prevent a team from having more than one membership record for the same user.
- **FR-008**: System MUST restrict adding and removing members to the team's owner; other members MUST NOT be able to perform these actions.
- **FR-009**: System MUST allow any member of a team (owner or not) to view the complete current list of that team's members.
- **FR-010**: System MUST allow any authenticated user to view the list of all teams they currently belong to.
- **FR-011**: System MUST allow a single user to belong to multiple teams at the same time, with no upper limit imposed by this feature.
- **FR-012**: System MUST allow any non-owner member to voluntarily leave a team on their own, in addition to the owner being able to remove them.
- **FR-013**: System MUST automatically transfer ownership to another existing member (the longest-standing member other than the current owner, i.e. the one with the earliest join date) when the owner leaves a team that still has other members, so that a team with remaining members is never left without an owner.
- **FR-014**: System MUST allow the owner to leave a team where they are the only remaining member; the team then has zero members and no owner, and (per FR-008) no further membership changes can occur on it until this is addressed in a future iteration.
- **FR-015**: System MUST NOT provide any way to delete a team in this iteration; once created, a team persists (even if it ends up with zero members per FR-014) until team deletion is introduced in a future iteration.
- **FR-016**: System MUST NOT link retrospectives or boards to a team in this iteration.
- **FR-017**: System MUST NOT compute or display any team-level metrics in this iteration.
- **FR-018**: System MUST NOT include health-check surveys in this iteration.

### Key Entities

- **Team**: Represents a named group of RetroRocket users. Key attributes: name (required), description (optional), the user who owns it, and when it was created. A team exists independently of any retrospective, metric, or survey in this iteration.
- **Team Membership**: Represents the relationship between a user and a team, including whether that user is the team's owner or a regular member, and when they joined. A user may hold memberships in multiple teams simultaneously; a team may have multiple members but, in this iteration, exactly one owner.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can create a new team and see themselves listed as its owner in under 30 seconds from opening the creation screen.
- **SC-002**: A team owner can look up and add an existing RetroRocket user to the team by email in under 1 minute, without needing help or documentation.
- **SC-003**: 100% of a team's current members are visible to every member of that team, with no missing or extra entries, whenever the roster is viewed.
- **SC-004**: 100% of the teams a user currently belongs to are visible on their personal teams overview, with no missing, extra, or duplicated entries.
- **SC-005**: A team owner can remove a member and see that removal reflected in the team roster in under 30 seconds, with no page reload required to notice the change is possible.
- **SC-006**: Users attempting membership actions they are not authorized to perform (e.g., a non-owner adding or removing a member) are blocked 100% of the time.

## Assumptions

- "Facilitator" in this context means any authenticated RetroRocket user; RetroRocket does not currently have a separate global facilitator role, so team creation itself is what grants ownership, similar to how creating a retrospective today makes its creator that retrospective's de facto owner.
- Only people who already have a RetroRocket account can be added to a team in this iteration; inviting someone who has never used RetroRocket (e.g., by external email) is out of scope and deferred to a later iteration.
- In this iteration, a team has exactly one owner at a time; there is no co-owner or admin role distinct from "owner" and "member."
- Team names are not required to be unique across the whole product; two unrelated teams may share the same name.
- No limit is placed, by this feature, on the number of members a team may have or the number of teams a single user may belong to.
- The existing authentication system (Firebase-backed accounts identified by email) is reused as-is; this feature does not change how users sign in or how their identity is established.
