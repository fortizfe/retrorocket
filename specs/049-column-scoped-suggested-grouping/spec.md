# Feature Specification: Column-Scoped Suggested Grouping

**Feature Branch**: `049-column-scoped-suggested-grouping`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "Siguiendo con el desarrollo de las agrupaciones sugeridas, actualmente, cuando se selecciona el modo agrupaciones sugeridas, se lanza para todas las columnas. Ese comportamiento no es el esperado. Lo que se desea conseguir es que cuando se pulsa el botón de agrupaciones sugeridas sobre una columna, solo tenga en cuenta como scope la propia columna del botón. De manera que solo aplique a las tarjetas de esa columna y solo ordene esa columna, dejando las demás como están."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Suggested grouping only analyzes the triggering column's own cards (Priority: P1)

A facilitator switches a single column to "suggested grouping" mode by pressing the button on that column's header. Today, the AI analysis behind that button considers ungrouped cards from every column on the board, not just the one the facilitator pressed — so the button's effect isn't scoped to where it was pressed. The facilitator instead wants pressing that button on one column to only ever look at, and only ever suggest groups from, that column's own cards.

**Why this priority**: This is the core correctness problem reported — the button's scope doesn't match where it was pressed. Fixing it is the entire value of this feature and is fully self-contained.

**Independent Test**: Can be fully tested by seeding a board with ungrouped cards in at least two columns, pressing the suggested-grouping button on one column, and confirming every suggestion shown in that column's panel references only cards that belong to that column.

**Acceptance Scenarios**:

1. **Given** a board with multiple columns, each holding ungrouped cards, **When** a facilitator switches Column A to suggested-grouping mode, **Then** every suggested group shown references only cards belonging to Column A.
2. **Given** Column A's suggested-grouping panel is showing proposed groups, **When** the facilitator accepts one of them, **Then** the resulting group is created in Column A and every one of its member cards belongs to Column A.
3. **Given** a facilitator has just switched Column A to suggested-grouping mode, **When** the analysis runs, **Then** cards belonging to other columns are not included as candidates in that analysis at all (not merely filtered out of the results afterward).
4. **Given** a facilitator switches Column A to suggested-grouping mode and later switches Column C to suggested-grouping mode as well, **When** each analysis runs, **Then** Column A's suggestions and Column C's suggestions are each computed independently from only their own column's cards, with neither set influenced by the other column's content.

---

### User Story 2 - Other columns are left untouched when one column enters suggested-grouping mode (Priority: P1)

A facilitator presses the suggested-grouping button on one column while other columns are showing "no grouping," "group by author," or already have accepted groups of their own. Today, triggering suggested grouping on one column can affect the display or ordering of cards in the other columns too. The facilitator instead wants the other columns to remain exactly as they were — same mode, same card order, same groups — completely unaffected by what happens on the column where the button was pressed.

**Why this priority**: Alongside User Story 1, this is the other half of the reported bug ("dejando las demás como están") and is equally required for the fix to be considered complete; both stories describe the same single change in behavior from two angles (what gets analyzed vs. what stays untouched).

**Independent Test**: Can be fully tested by setting up several columns in different grouping modes, pressing the suggested-grouping button on just one of them, and confirming the other columns' mode, card order, and groups are pixel-for-pixel unchanged before and after.

**Acceptance Scenarios**:

1. **Given** Column B is set to "no grouping" mode, **When** a facilitator switches Column A to suggested-grouping mode, **Then** Column B's cards remain in "no grouping" mode, in their existing order, unaffected.
2. **Given** Column B is set to "group by author" mode, **When** a facilitator switches Column A to suggested-grouping mode, **Then** Column B's author-based groups and card order remain unchanged.
3. **Given** Column B already has one or more accepted groups (from a prior suggestion or manual grouping), **When** a facilitator switches Column A to suggested-grouping mode, **Then** Column B's existing groups remain intact and undisturbed.
4. **Given** a facilitator switches Column A to suggested-grouping mode, **When** the analysis is in progress, **Then** no other column enters a loading state or opens a suggestions panel of its own.

---

### Edge Cases

- What happens when the triggering column has zero or only one ungrouped card (below the minimum group size)? The analysis simply produces no suggestions for that column; it MUST NOT fall back to pulling cards from other columns to form a group.
- What happens when the triggering column already has some accepted groups alongside remaining ungrouped cards? Only that column's currently-ungrouped cards are analyzed; already-grouped cards (in that column or any other) are excluded, matching existing suggestion behavior.
- What happens when two facilitators trigger suggested grouping on two different columns at nearly the same time? Each analysis runs independently, scoped to its own column, and neither run's results leak into the other's panel.
- What happens when a facilitator re-triggers suggested grouping again on the same column it's already active on? Behavior is unchanged from today — this feature only corrects which cards are considered, not the re-trigger flow itself.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a facilitator switches a column to suggested-grouping mode, the system MUST run the AI grouping analysis using only that column's own ungrouped cards as candidates.
- **FR-002**: Cards belonging to any column other than the one the button was pressed on MUST NOT be sent into the AI grouping analysis triggered by that button.
- **FR-003**: Every suggested group shown in a column's suggestions panel MUST contain only cards that belong to that same column.
- **FR-004**: When a suggested group is accepted, the resulting group's member cards MUST all belong to the column the suggestion was generated for.
- **FR-005**: Triggering suggested grouping on one column MUST NOT change the grouping mode, card order, or existing groups of any other column.
- **FR-006**: Triggering suggested grouping on one column MUST NOT cause any other column to enter a loading state or display a suggestions panel.
- **FR-007**: When suggested grouping is triggered independently on two different columns (sequentially or at overlapping times), each column's suggestion set MUST be computed independently from only that column's own ungrouped cards, with neither run's results affecting the other.

### Key Entities

- **Grouping Suggestion**: Existing entity representing a proposed cluster of ungrouped cards; scope is now explicitly constrained so every card in a given suggestion, and every suggestion shown for a given column's analysis run, originates from that same column.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of suggested groups shown after triggering suggested grouping on a column contain only cards belonging to that column.
- **SC-002**: 100% of the time a facilitator triggers suggested grouping on one column, every other column's grouping mode, card order, and existing groups remain identical to their state immediately before the trigger.
- **SC-003**: Facilitators can trigger suggested grouping independently on two different columns without either column's suggestions being influenced by the other column's cards.

## Assumptions

- This is a scope-correction fix to the existing suggested-grouping capability (spec 044, refined in 046 and 047); it does not introduce new user-facing controls, suggestion titles, or panel behavior beyond restricting the existing analysis's input and results to the column that triggered it.
- "Column" refers to the same column identifier already used throughout existing grouping state and card records — no new column concept is introduced by this change.
- The per-suggestion title generation introduced in spec 047 is unaffected by this fix and continues to operate per proposed group exactly as it does today.
- Restricting the analysis to a single column's cards is not expected to change the existing few-seconds response-time target for a column of up to 25 cards; if anything, analyzing fewer cards per run should only help that target, not put it at risk.
