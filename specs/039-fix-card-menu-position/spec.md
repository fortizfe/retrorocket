# Feature Specification: Card Actions Menu Anchored Positioning

**Feature Branch**: `039-fix-card-menu-position`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "Siguiendo con el rediseño de la app aplicando las guias de diseño de apple (https://developer.apple.com/design/human-interface-guidelines/design-principles) vamos a continuar. Actualmente las cards de la vista de tableros retro, abajo a la derecha, tienen un menú de acciones. Actualmente ese menú aparece pegado a la esquina superior izquierda de la pantalla. Quiero que aparezca justo donde esté el menú contextual que se ha clickado."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Menu opens next to the card it belongs to (Priority: P1)

A participant working in a retrospective board clicks the actions menu control in the bottom-right corner of a card. The menu panel opens directly next to that control, so the participant can immediately see which card the menu applies to and continue their action (e.g. assigning an owner and due date) without losing visual context.

**Why this priority**: This is the entire scope of the reported problem. Without correct anchoring, the menu is unusable in practice — it opens far from where the user is looking, forcing them to search the screen for it and breaking their understanding of which card it belongs to. This is the MVP and the only user story required to resolve the issue.

**Independent Test**: On a board with multiple cards spread across different areas of the screen, click the actions menu control on a card located away from the top-left corner (e.g. bottom row, right column) and confirm the menu panel appears immediately adjacent to that specific card's control, not at the top-left corner of the screen.

**Acceptance Scenarios**:

1. **Given** a retrospective board with cards arranged in a multi-column layout, **When** a participant clicks the actions menu control on a card in the bottom-right area of the visible board, **Then** the menu panel appears next to that control, visually connected to the card it was opened from.
2. **Given** a board scrolled down or sideways from its initial position, **When** a participant clicks a card's actions menu control, **Then** the menu opens next to the control's current on-screen position (not its original unscrolled position).
3. **Given** the menu is already open for one card, **When** the participant closes it and opens the actions menu on a different card, **Then** the new menu appears next to the newly clicked control, not at the previous location.
4. **Given** a card's actions menu control sits near the edge of the viewport, **When** the participant opens the menu, **Then** the panel repositions itself (e.g. flips or shifts) so it stays fully visible within the screen instead of being cut off or overflowing.

### Edge Cases

- What happens when the actions menu control is close to the bottom or right edge of the viewport? The panel MUST flip to the opposite side or shift within the viewport so it remains fully visible and never appears cut off.
- What happens if the window is resized or the board content reflows (e.g. sidebar toggled) while the menu is open? The menu MUST update its position to stay anchored to its trigger control, or close if the trigger is no longer available.
- What happens on smaller viewports (tablet/mobile widths) where card layout differs? The same anchored-to-trigger behavior MUST apply regardless of viewport size.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The card actions menu MUST open visually anchored to the specific control that was clicked to open it, appearing immediately adjacent to that control.
- **FR-002**: The menu's position MUST reflect the trigger control's actual current on-screen location, including after scrolling, window resizing, or layout changes, for as long as the menu remains open.
- **FR-003**: When the anchored position would place the menu partially or fully outside the visible viewport, the system MUST adjust the menu's placement (flip to the opposite side and/or shift along the edge) so the entire menu remains visible on screen.
- **FR-004**: The menu MUST NOT render at a fixed screen position (e.g. always the top-left corner) independent of which card or control triggered it.
- **FR-005**: This anchored-positioning behavior MUST apply consistently for every card on the board, regardless of the card's position within the layout (top, bottom, left, right, or center).
- **FR-006**: Opening the actions menu on a different card while one is already open MUST close the previous menu and anchor the new one to the newly clicked control.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When a user clicks a card's actions menu control anywhere on the board, the menu panel appears within a small, fixed visual distance of that control in 100% of cases, regardless of the card's position on screen.
- **SC-002**: Users can identify which card an open actions menu belongs to without any ambiguity, verified by the menu always rendering adjacent to its trigger rather than at a shared, disconnected location.
- **SC-003**: The menu remains fully visible on screen (no clipped or off-screen content) in 100% of trigger positions, including near viewport edges.

## Assumptions

- "Menú de acciones" refers to the card's actions/options control located in the bottom-right of each card (currently the convert-to-action-item control), which is the only popover-style menu on the card footer; simple inline buttons (edit/delete) are out of scope since they have no positioned panel.
- The fix applies to the retrospective board's card view across all supported viewport sizes (desktop and tablet), consistent with the rest of the board's Apple HIG-aligned redesign.
- No new menu actions or content are being added — this is strictly a positioning/anchoring correction for the existing menu.
- Keyboard and screen-reader accessibility of the menu (focus handling, dismissal) is expected to be preserved as-is; this feature does not change what the menu contains or how it's triggered, only where it visually appears.
