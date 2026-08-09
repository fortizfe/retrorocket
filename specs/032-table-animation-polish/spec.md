# Feature Specification: Mis Tableros Table Motion Refinement

**Feature Branch**: `032-table-animation-polish`

**Created**: 2026-08-09

**Status**: Draft

**Input**: User description: "Quiero revisar las animaciones de la tabla de Mis Tableros. Actualmente al seleccionar algun filtro o cambiar de página, la animación se sientre burda y poco refinada. Quiero que investigues con review animation, animation y los demás comandos de las skills de apple que tenemos como hacer que esa animación funciona lo más fluida posible."

## Clarifications

### Session 2026-08-09

- Q: What's the target settle-time ceiling for the row-transition when a filter or page changes (the vague "brief, consistent interval" in SC-002)? → A: ≤300ms end-to-end, matching spec 031's existing search perf budget precedent (quickstart.md §3).
- Q: What should the `prefers-reduced-motion` behavior concretely be for these row-set transitions (FR-006's "minimal or no motion")? → A: A quick opacity-only crossfade — no translate/scale/position movement, no stagger — still signals the change without triggering motion discomfort.
- Q: Sort-key/sort-direction changes drive the row list through the identical rendering path (same `paginatedBoards` list, same `AnimatePresence` mechanism) as filter and pagination changes — should sort-triggered reordering be explicitly in scope, with its own acceptance criteria? → A: Yes, explicit in-scope — sort transitions get the same quality bar and dedicated acceptance criteria as filter and pagination.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switching the scope filter feels smooth (Priority: P1)

A user on the "Mis Tableros" dashboard clicks a scope filter segment ("All" / "Created by me" / "Joined") to narrow the board list. The rows update to reflect the new filter with motion that reads as one continuous, controlled transition rather than the current abrupt flash-and-cascade.

**Why this priority**: Filtering is the most frequently used interaction on this screen and the one explicitly called out as feeling crude — it is the first impression of the table's quality on nearly every visit.

**Independent Test**: Load a board list with boards in more than one scope, click through each filter segment, and confirm the row transition reads as smooth and immediate rather than janky or delayed, independent of any pagination change.

**Acceptance Scenarios**:

1. **Given** the board table is showing boards under the "All" scope, **When** the user selects "Created by me", **Then** rows that no longer belong to the filtered set leave the table and the remaining/new rows settle into their final position with a single smooth, continuous-feeling motion (no visible flash, stutter, or layout jump).
2. **Given** the user has just changed the scope filter, **When** the transition is in progress and the user immediately selects a different scope, **Then** the in-progress transition responds immediately to the new selection without visual glitches, leftover ghost rows, or restarting from a jarring reset state.
3. **Given** a user has `prefers-reduced-motion` enabled at the OS/browser level, **When** they change the scope filter, **Then** the row set updates with minimal or no motion while remaining clearly legible.
4. **Given** the board table is showing boards in a given order, **When** the user changes the sort key (name/date) or reverses the sort direction, **Then** the rows reorder with the same smooth, continuous-feeling motion quality as a scope filter change (FR-010), with no visible flash, stutter, or layout jump.

---

### User Story 2 - Changing page feels smooth (Priority: P1)

A user with more boards than fit on one page clicks a pagination control (page number, previous/next, or changes items-per-page) to view a different slice of their boards. The outgoing and incoming rows transition smoothly, and the pagination control itself gives immediate, polished feedback for the click.

**Why this priority**: Equal in priority to filtering — it is the other interaction explicitly named as feeling unrefined, and is the only way to reach boards beyond the first page.

**Independent Test**: Load a board list with enough boards to span at least 3 pages, click through page numbers, previous/next, and change items-per-page, and confirm each change transitions smoothly with no layout jump or unresponsive-feeling delay.

**Acceptance Scenarios**:

1. **Given** the board table is on page 1 of several pages, **When** the user clicks page 2 (or "Next"), **Then** the table's row set transitions to the new page's boards smoothly, without a jarring cut, and without the surrounding page layout (headers, controls, page footer) jumping or reflowing abruptly.
2. **Given** the user changes the "items per page" value, **When** the row count and set change accordingly, **Then** the table transitions to the new set with the same smooth motion quality as a page-number change, not a fully separate or clashing behavior.
3. **Given** the user is on the last page and clicks "Next" is disabled (or an equivalent boundary), **When** they attempt the disabled action, **Then** the control clearly communicates it is inactive without producing a stray or broken animation.

---

### User Story 3 - Motion feels consistent with the rest of the product (Priority: P2)

A user who has already used other parts of the product (e.g. board creation, other list views) perceives the "Mis Tableros" table's filter/pagination motion as belonging to the same, cohesive interface — not a visibly different, lower-quality style of motion bolted onto this one screen.

**Why this priority**: Important for overall polish and brand consistency, but secondary to first fixing the two concretely reported rough interactions (filtering, pagination).

**Independent Test**: Compare the timing/easing "feel" of the filter and pagination transitions against another already-polished animated interaction in the product (e.g. board row entrance on initial load, or another reviewed surface) and confirm they read as part of the same motion language.

**Acceptance Scenarios**:

1. **Given** the table's initial-load row entrance animation and its filter/pagination update animation, **When** a user experiences both in the same session, **Then** the two feel like they belong to the same motion language (comparable pacing and character) rather than two unrelated animation styles, while still being appropriately distinct for their different triggers (passive load vs. direct user action).

---

### Edge Cases

- What happens when a filter or page change results in an empty result set (no boards match)? The transition into the "no results" state must remain smooth and must not leave stray row remnants behind.
- What happens when a user changes the filter and the page in rapid succession (e.g. filters, then immediately pages) before the first transition finishes? The table must not end up in a visually broken or inconsistent intermediate state.
- What happens on a very long list where many rows change position/identity at once (e.g. sorting immediately before paging)? The motion must not degrade into a distracting cascade of individually-delayed row animations.
- What happens on a low-powered device or a slow frame rate? The transition must not visibly stutter or drop to a noticeably lower quality than on a typical device.
- What happens when `prefers-reduced-motion` is enabled? Interactions must still give clear, immediate feedback that the update occurred, without relying on movement to communicate it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST transition the visible set of board rows smoothly whenever the scope filter changes, replacing the current abrupt/uneven update with motion that reads as continuous and controlled.
- **FR-002**: The system MUST transition the visible set of board rows smoothly whenever the current page or items-per-page changes, matching the quality bar set for filter changes (FR-001).
- **FR-003**: The row-update motion triggered by a direct user action (filtering, paging) MUST be distinguishable in character from the passive, one-time entrance motion used when the table first loads — direct-manipulation feedback must feel immediate rather than reusing a "reveal" pacing designed for first impressions.
- **FR-004**: The system MUST NOT produce a visible layout jump, flash, or stray leftover row when the row set changes for any reason described in FR-001/FR-002/FR-010.
- **FR-005**: The system MUST remain visually correct and non-broken when a user triggers a new filter, sort, or page change while a prior transition is still in progress (interruption handling).
- **FR-006**: The system MUST honor `prefers-reduced-motion` by replacing translate/scale/stagger movement with a quick opacity-only crossfade for these transitions — no positional motion — while still clearly communicating that the content changed.
- **FR-007**: The system MUST continue to meet WCAG 2.1 AA requirements for the affected surfaces (including visible focus and no information conveyed by motion/color alone) after the motion is refined.
- **FR-008**: The refined motion MUST be produced using the project's established Apple-design motion review/decision process (i.e., an explicit review of the current animation followed by a deliberate re-design), rather than ad hoc adjustment, and the rationale for the chosen motion MUST be documented for reviewers.
- **FR-009**: The pagination controls MUST provide immediate, polished interactive feedback (e.g., pressed/active state) consistent with the rest of the product's control styling, independent of the row-transition motion itself.
- **FR-010**: The system MUST transition the visible set of board rows smoothly whenever the sort key or sort direction changes, matching the quality bar set for filter and pagination changes (FR-001, FR-002) — sort reordering is in scope because it drives the row list through the same rendering mechanism as filtering and pagination.

### Key Entities

- **Board row list**: The ordered, filtered, and paginated set of board summaries currently displayed in the table; its membership and order change in response to filter, sort, and pagination actions.
- **Filter/sort/pagination interaction event**: A discrete user action (selecting a scope, changing sort key/direction, clicking a page control, changing items-per-page) that triggers a change in which board rows are visible or their order.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a review of the filter, sort, and pagination interactions against the product's motion quality bar, all three pass with no flagged issues (previously, filtering and pagination were flagged as feeling crude/unrefined).
- **SC-002**: Users changing a filter, sort, or page see the new row set fully settled within 300ms of the triggering action, reading as immediate rather than sluggish, with zero observed layout jumps or leftover visual artifacts across at least 20 manual interaction trials.
- **SC-003**: Rapidly triggering multiple filter/sort/page changes in succession (stress case) never leaves the table in a visually broken or inconsistent state, verified across at least 10 rapid-succession trials.
- **SC-004**: The refined motion maintains full WCAG 2.1 AA conformance and correctly reduces motion under `prefers-reduced-motion`, verified for both light and dark themes.
- **SC-005**: When shown the before/after side by side, reviewers identify the after version as visibly more fluid and consistent with the rest of the product's motion.

## Assumptions

- Scope is limited to the "Mis Tableros" dashboard table's row-set transitions on filter change, sort change (key or direction), and pagination change (including items-per-page change), plus the pagination controls' own interactive feedback — sort is explicitly included because it shares the same row-list rendering mechanism as filter and pagination (FR-010). Other dashboard elements (header, search box, modals) remain out of scope unless directly implicated by the row-transition fix.
- "Investigate with review animation, animation, and the other Apple skill commands" is interpreted as a mandatory process requirement (FR-008): the refined motion must be arrived at through the project's established animation-review/design skill process, not as a request for a specific named tool integration.
- No new dependency is assumed to be required; the product's existing motion library/approach is assumed sufficient to achieve a fluid result unless investigation during planning determines otherwise.
- "As fluid as possible" is interpreted per SC-001/SC-002/SC-005 as: passes the project's motion quality review, settles within the 300ms ceiling set in SC-002, and is judged by reviewers as a clear improvement — not a specific numeric frame-rate target, since this is a business-level (not implementation-level) specification.
- The existing initial page-load row entrance animation is assumed acceptable as-is and is not itself being replaced, only used as a reference point for consistency (User Story 3); if the review process determines it also needs rework, that finding will be captured during planning.
