# Feature Specification: Column Grouping Menu Anchored Positioning

**Feature Branch**: `045-fix-column-grouping-dropdown-position`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "Quiero corregir un pequeño desvío visual. En la vista de board, al hacer click sobre el botón de una columna para elegir la agrupación de las tarjetas, el desplegable aparece en la esquina superior izquierda. Quiero que aparezca pegado al botón como el resto de popus de esa vista."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Grouping menu opens next to its column button (Priority: P1)

A participant working in a retrospective board clicks the grouping control on a column header to choose how that column's cards are grouped (no grouping, by author, by color, or by AI suggestions). The menu panel opens directly next to that control, so the participant can immediately see the available options and which column they apply to, without losing visual context or having to search the screen for it.

**Why this priority**: This is the entire scope of the reported problem. Without correct anchoring, the menu is confusing and effectively broken in practice — it appears far from where the user clicked, disconnected from the column it belongs to. This is the MVP and the only user story required to resolve the issue.

**Independent Test**: On a board with multiple columns, click the grouping control on a column located away from the top-left corner of the screen (e.g. a middle or right-hand column) and confirm the grouping menu appears immediately adjacent to that specific control, not at the top-left corner of the screen.

**Acceptance Scenarios**:

1. **Given** a retrospective board with several columns arranged side by side, **When** a participant clicks the grouping control on a column that is not in the top-left of the screen, **Then** the grouping menu appears next to that control, visually connected to the column it was opened from.
2. **Given** a board scrolled down or sideways from its initial position, **When** a participant clicks a column's grouping control, **Then** the menu opens next to the control's current on-screen position (not its original unscrolled position).
3. **Given** the grouping menu is already open for one column, **When** the participant closes it and opens the grouping menu on a different column, **Then** the new menu appears next to the newly clicked control, not at the previous location.
4. **Given** a column's grouping control sits near the edge of the viewport, **When** the participant opens the menu, **Then** the panel repositions itself (e.g. flips or shifts) so it stays fully visible within the screen instead of being cut off or overflowing.
5. **Given** the grouping menu is open and anchored correctly, **When** the participant selects a grouping option, **Then** the selection is applied exactly as it is today — only the menu's visual position changes, not its behavior or contents.

### Edge Cases

- What happens when the grouping control is close to the bottom or right edge of the viewport? The panel MUST flip to the opposite side or shift within the viewport so it remains fully visible and never appears cut off.
- What happens if the window is resized or the board layout reflows while the menu is open? The menu MUST update its position to stay anchored to its trigger control, or close if the trigger is no longer available.
- What happens on smaller viewports (tablet widths) where column layout differs? The same anchored-to-trigger behavior MUST apply regardless of viewport size.
- Does this affect any other popup in the board view (e.g. the AI grouping suggestions panel, card action menus, color pickers)? No — those already open correctly anchored to their triggers; only the column grouping-mode menu is affected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The column grouping menu MUST open visually anchored to the specific grouping control that was clicked to open it, appearing immediately adjacent to that control.
- **FR-002**: The menu's position MUST reflect the trigger control's actual current on-screen location, including after scrolling, window resizing, or layout changes, for as long as the menu remains open.
- **FR-003**: When the anchored position would place the menu partially or fully outside the visible viewport, the system MUST adjust the menu's placement (flip to the opposite side and/or shift along the edge) so the entire menu remains visible on screen.
- **FR-004**: The menu MUST NOT render at a fixed screen position (e.g. always the top-left corner) independent of which column's control triggered it.
- **FR-005**: This anchored-positioning behavior MUST apply consistently for every column on the board, regardless of the column's position within the layout (leftmost, rightmost, or in between).
- **FR-006**: Opening the grouping menu on a different column while one is already open MUST close the previous menu and anchor the new one to the newly clicked control.
- **FR-007**: The menu's available grouping options, their behavior, and the visual entrance/exit animation MUST remain unchanged — this is strictly a positioning correction, not a change to functionality or appearance of the menu itself.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When a user clicks a column's grouping control anywhere on the board, the menu panel appears within a small, fixed visual distance of that control in 100% of cases, regardless of the column's position on screen.
- **SC-002**: Users can identify which column an open grouping menu belongs to without any ambiguity, verified by the menu always rendering adjacent to its trigger rather than at a shared, disconnected location.
- **SC-003**: The menu remains fully visible on screen (no clipped or off-screen content) in 100% of trigger positions, including near viewport edges.

## Assumptions

- "El botón de una columna para elegir la agrupación" refers to the grouping-mode control in each column's header (options: none, by author, by color, by AI suggestions) — not the separate AI suggestions panel in the same column header, which already opens correctly anchored.
- "El resto de popups de esa vista" refers to the other anchored popovers already present in the retrospective board view (card action menus, color pickers, facilitator/options menus, and the column's own AI suggestions panel), which serve as the reference for correct behavior.
- The fix applies to the retrospective board's column headers across all supported viewport sizes (desktop and tablet), consistent with the rest of the board's existing popup behavior.
- No new grouping options or menu content are being added — this is strictly a positioning/anchoring correction for the existing menu.
- Keyboard and screen-reader accessibility of the menu (focus handling, dismissal) is expected to be preserved as-is; this feature does not change what the menu contains or how it's triggered, only where it visually appears.
