# Feature Specification: Team Retrospective Metrics Dashboard

**Feature Branch**: `056-team-metrics-dashboard`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Quiero un panel por equipo que muestre métricas de trabajo agregadas a lo largo del tiempo a partir de las retrospectivas vinculadas a ese equipo: número de retrospectivas realizadas, tasa de participación media, evolución del mood/sentimiento del equipo entre retrospectivas, y número de action items creados frente a completados. Solo debe ver este panel quien sea propietario o miembro del equipo."

## Clarifications

### Session 2026-08-19

- Q: The system does not currently record whether an action item is completed (no such field exists). For "created vs. completed," what should the panel show? → A: Show only the count of action items created; the completed/pending breakdown is deferred to a future iteration.
- Q: There is no "invited" count or historical team size per retrospective. How should "average participation rate" be calculated? → A: Show the average raw number of participants per retrospective (not a percentage), since no reliable expected-attendee total exists.
- Q: If a user's team membership ends while they already have the metrics panel open, should the open view be actively torn down/redirected, or is it enough that access is re-checked on the next request? → A: Access is re-checked on the next request (reload/refresh/navigation); an already-open view may keep showing already-loaded data until then — no live monitoring required.
- Q: Should the panel aggregate the team's entire retrospective history, or a bounded recent window (e.g., last 10 retrospectives / last 6 months)? → A: Full history — aggregate across every retrospective ever linked to the team, no time bound, matching how "My Boards" already shows a team's full list.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View team retrospective activity summary (Priority: P1)

A team owner or member opens their team's metrics panel and sees, at a glance, how many retrospectives the team has run and how many people, on average, have participated in them.

**Why this priority**: This is the foundational slice — a count of retrospectives and average participation are the simplest possible signals of team activity, require no cross-retrospective trend logic, and are useful on their own even before mood or action-item data is added.

**Independent Test**: Can be fully tested by having a team owner or member with several team-linked retrospectives open the panel and verifying the displayed retrospective count and average participation figure match the underlying data, independent of mood or action-item display.

**Acceptance Scenarios**:

1. **Given** a user who is an owner or member of a team with several retrospectives linked to it, **When** they open that team's metrics panel, **Then** they see the total number of retrospectives associated with the team and the average number of participants per retrospective.
2. **Given** a user who is neither an owner nor a member of a team, **When** they attempt to open that team's metrics panel (including by direct navigation), **Then** access is denied and no team metrics are shown.
3. **Given** a team with no retrospectives linked to it yet, **When** an owner or member opens the panel, **Then** the panel displays a clear empty state (zero retrospectives, no participation figure) rather than an error.

---

### User Story 2 - View action items created across the team (Priority: P2)

A team owner or member sees how many action items have come out of their team's retrospectives, giving visibility into the team's output over time.

**Why this priority**: This adds a second, independent signal (output volume) on top of the activity summary from User Story 1. It depends only on counting existing action item records tied to the team's retrospectives, so it can be delivered and verified separately from mood evolution.

**Independent Test**: Can be fully tested by having a team with a known number of action items across its retrospectives, opening the panel, and confirming the displayed count matches the total number of action items created across those retrospectives.

**Acceptance Scenarios**:

1. **Given** a team whose retrospectives have a known number of action items created across them, **When** an owner or member opens the team's metrics panel, **Then** the panel displays the total number of action items created across the team's retrospectives.
2. **Given** a team with retrospectives that have no action items, **When** an owner or member opens the panel, **Then** the action items count is shown as zero rather than omitted or erroring.

---

### User Story 3 - View team mood evolution across retrospectives (Priority: P3)

A team owner or member sees how the team's mood/sentiment has evolved from one retrospective to the next, so they can spot whether team sentiment is improving, declining, or holding steady over time.

**Why this priority**: This is the most complex signal — it depends on aggregating existing per-retrospective mood data across multiple retrospectives in chronological order — so it builds on top of the simpler activity and output metrics rather than being required for the panel to deliver initial value.

**Independent Test**: Can be fully tested by having a team with multiple retrospectives that have analyzed sentiment data, opening the panel, and confirming the mood values shown for each retrospective appear in chronological order and reflect that retrospective's own aggregated mood.

**Acceptance Scenarios**:

1. **Given** a team with multiple retrospectives that each have analyzed sentiment data, **When** an owner or member opens the team's metrics panel, **Then** they see the team's mood displayed per retrospective in chronological order, allowing them to observe the trend across retrospectives.
2. **Given** a team retrospective that has no analyzed sentiment data (e.g., no cards were analyzed), **When** its position in the mood evolution is shown, **Then** it is clearly indicated as having no mood data rather than displaying a misleading default value.

---

### Edge Cases

- A team has zero retrospectives linked to it: all metrics (count, participation, action items, mood) display a clear empty state, not an error (see User Story 1, Scenario 3).
- A user who was previously an owner or member loses their team membership: their next request for that team's metrics panel (reload, refresh, or fresh navigation) is denied; an already-open view is not required to be actively torn down or redirected mid-session.
- A user is a member of multiple teams: each team's metrics panel only ever reflects that specific team's own retrospectives, never data from another team.
- A retrospective is linked to the team but has no sentiment-analyzed cards: it is excluded from meaningful mood values and shown as "no data" rather than a zero or default score (see User Story 3, Scenario 2).
- A retrospective is linked to the team but currently has zero action items: it contributes zero to the action items total, not an error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a metrics panel scoped to a single team, showing aggregated data derived from the team's full retrospective history — every retrospective currently associated with that team, with no date-range or count bound applied.
- **FR-002**: System MUST restrict access to a team's metrics panel to users who currently hold an active membership (owner or member) on that team.
- **FR-003**: System MUST deny access to a team's metrics panel for any user who is not currently an owner or member of that team, including attempts to reach it by direct navigation.
- **FR-004**: System MUST deny access to a team's metrics panel, on the user's next request for it (reload, refresh, or fresh navigation), once that user is no longer an owner or member of the team; an already-open view is not required to be actively monitored or torn down mid-session.
- **FR-005**: System MUST display the total number of retrospectives currently associated with the team.
- **FR-006**: System MUST display the average number of participants per retrospective across the team's retrospectives.
- **FR-007**: System MUST display the total number of action items created across the team's retrospectives.
- **FR-008**: System MUST display the team's mood/sentiment per retrospective in chronological order, allowing the evolution across retrospectives to be observed.
- **FR-009**: System MUST clearly distinguish a retrospective with no analyzed sentiment data from one with an actual mood value, rather than presenting both the same way.
- **FR-010**: System MUST display all metrics as a clear empty state (not an error) when the team has no retrospectives associated with it.
- **FR-011**: System MUST calculate every metric using only the data currently associated with the team at the time the panel is viewed; the panel does not need to update in real time while it remains open.
- **FR-012**: System MUST NOT change access to the underlying retrospectives, boards, or action items as a result of this panel — the panel is read-only aggregated reporting and grants no additional access beyond viewing the metrics themselves.

### Key Entities

- **Team**: Reused as-is from the existing team-management capability. Determines who may view the panel (its current owner and members) and which retrospectives the panel aggregates.
- **Retrospective (Board)**: Reused as-is. Each retrospective already carries an optional association to at most one team; the panel aggregates over the set of retrospectives associated with the viewed team.
- **Team Metrics Summary**: A derived, read-only aggregation (not a new persisted record) computed across a team's associated retrospectives — retrospective count, average participants, total action items created, and per-retrospective mood values in chronological order.
- **Action Item**: Reused as-is from existing retrospectives. Counted per team for the "created" total; no completion/status concept exists yet, so only creation counts are reflected.
- **Mood/Sentiment data**: Reused as-is from existing per-retrospective sentiment analysis. Supplies the per-retrospective mood value shown in the evolution view; retrospectives without analyzed sentiment contribute no value.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A team owner or member can view their team's retrospective count, average participation, total action items created, and mood evolution together in a single panel view, without navigating to individual retrospectives.
- **SC-002**: 100% of access attempts to a team's metrics panel by users who are not currently an owner or member of that team are denied.
- **SC-003**: The retrospective count, average participation figure, and action items total shown on the panel match 100% of the underlying retrospective and action item records currently associated with the team.
- **SC-004**: Teams with zero retrospectives display a clear empty state in 100% of cases, with no errors or blank/broken panel states.
- **SC-005**: A team member can determine whether their team's mood is trending up, down, or holding steady across their most recent retrospectives without opening each retrospective individually.

## Assumptions

- Action item completion tracking does not currently exist in the system (no completed/pending field). Per the clarification above, this panel shows only the count of action items created; a created-vs-completed breakdown is deferred to a future iteration once completion tracking exists.
- "Average participation" is the average raw number of participants per retrospective, not a percentage rate, since no reliable "expected attendees" or historical team-size total exists per retrospective today.
- The panel includes every retrospective currently associated with the team via the team link already introduced for retrospectives, regardless of whether that retrospective is still active or has since ended, and aggregates across the team's full history with no date-range or count-limit bound in this iteration.
- Access to the panel follows the same membership model already used elsewhere for teams: any user with a current owner or member record for the team may view it; no additional or different permission tier is introduced for this panel.
- Mood/sentiment evolution reuses the team's existing per-retrospective mood aggregation derived from card-level sentiment analysis; it does not introduce a new sentiment-analysis mechanism.
- The panel is a read-only reporting view; it does not add any way to create, edit, or delete retrospectives, action items, or team membership.
