# Feature Specification: Retro Board Bug Fixes

**Feature Branch**: `034-fix-retro-board-bugs`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "Actualmente tenemos 3 bugs que quiero corregir: (1) el menú de opciones y el menú de facilitador se abren siempre en la esquina superior izquierda de la pantalla en lugar de anclarse justo debajo de su botón; (2) los títulos de las columnas del tablero no se pueden leer porque comparten fila con el botón de agrupar y el de añadir — se pide reorganizar en tres filas: título+número de tarjetas, subtítulo, y botones de agrupar/añadir; (3) la suite de e2e de Playwright falla de forma intermitente: una nota privada del facilitador aparece duplicada (a la vez en el textarea de edición y como párrafo guardado) tras guardarla, y el indicador de 'está escribiendo' de un participante a veces no desaparece y queda duplicado entre columnas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Menus open anchored to their trigger button (Priority: P1)

A facilitator or participant clicks the options menu button or the facilitator menu button in the board's top bar. The menu panel must appear directly below (or, if there isn't room, flipped above but still touching) the button that was clicked, instead of jumping to the top-left corner of the screen.

**Why this priority**: When a menu opens in the wrong place, users can't tell what it belongs to, may miss it entirely, or may click something unrelated underneath it. This breaks a core, frequently-used interaction (every board session involves opening these menus) and makes the app feel broken.

**Independent Test**: Can be fully tested by opening the options menu and the facilitator menu from multiple button positions (top bar at default scroll, after scrolling the page, at different viewport widths) and confirming each menu is visually anchored to its own trigger button every time, delivering a working, trustworthy menu interaction on its own.

**Acceptance Scenarios**:

1. **Given** a board is open and the top bar is visible at the top of the viewport, **When** the user clicks the options menu button, **Then** the options menu panel appears immediately below that button, touching its bottom edge.
2. **Given** a board is open, **When** the user clicks the facilitator menu button, **Then** the facilitator menu panel appears immediately below that button, touching its bottom edge.
3. **Given** the page has been scrolled or the browser window resized before opening either menu, **When** the user clicks the trigger button, **Then** the menu still opens anchored to the button's current on-screen position, not to the top-left corner or a stale position.
4. **Given** the trigger button is close enough to the bottom of the viewport that the menu would not fully fit below it, **When** the user opens the menu, **Then** the menu appears above the button instead, fully visible on screen.
5. **Given** a menu is already open and anchored to its button, **When** the user scrolls or resizes the window without closing the menu, **Then** the menu panel moves to stay anchored to its button rather than becoming detached or reverting to the top-left corner.

---

### User Story 2 - Column titles are always readable (Priority: P1)

A user viewing the retrospective board looks at any column and can clearly read its full title at a glance, without it being visually crowded out by the group and add buttons.

**Why this priority**: The column title tells users what kind of feedback belongs there. If it can't be read, the board loses its basic meaning and users won't know where to add their cards — this is the most fundamental requirement of the redesign the user is asking for ("imprescindible").

**Independent Test**: Can be fully tested by opening a board with several columns of varying title lengths and card counts, and visually confirming each column header shows the title clearly on its own row across desktop and narrow viewport widths, independent of any other fix in this feature.

**Acceptance Scenarios**:

1. **Given** a board with multiple columns, **When** the board is displayed, **Then** each column header shows the column title together with its current card count on the first row.
2. **Given** a column that has a subtitle/description configured, **When** the column header is displayed, **Then** the subtitle appears on a second row, below the title row.
3. **Given** any column, **When** the column header is displayed, **Then** the group button and the add button appear together on a third row, separate from the title row.
4. **Given** a column with a long title and a high card count, **When** the header is rendered at typical column widths (including the narrowest supported viewport), **Then** the full title remains legible and is not truncated, overlapped, or hidden behind the group/add buttons.
5. **Given** a column with no subtitle configured, **When** the header is rendered, **Then** no empty or awkward gap is shown where the subtitle row would have been.

---

### User Story 3 - Saving a private note never shows duplicated content (Priority: P2)

A facilitator writes a private note, clicks "Guardar" (Save), and sees their note settle into its final saved state without the editable text box and the saved note text ever appearing on screen at the same time.

**Why this priority**: This causes visible, confusing flicker every time a note is saved and is the direct cause of an automated test failure; it doesn't block core usage the way Stories 1–2 do, but it undermines trust in the notes feature.

**Independent Test**: Can be fully tested by creating and saving a private facilitator note repeatedly (including saving multiple notes in quick succession) and confirming only one representation of the note's text (either the edit field or the saved text, never both) is visible at any point in time.

**Acceptance Scenarios**:

1. **Given** a facilitator is typing a new private note, **When** they click "Guardar", **Then** the note transitions to its saved, read-only display without a moment where both the edit field and the saved text are simultaneously visible.
2. **Given** a facilitator has just saved a note, **When** the save is confirmed (including when confirmation arrives after a brief delay), **Then** exactly one visible element shows that note's text at any given time.
3. **Given** a facilitator saves several notes back-to-back, **When** each save completes, **Then** no duplicate or stale copy of previously saved note text remains visible.

---

### User Story 4 - Typing indicator always clears reliably (Priority: P3)

A participant sees a "user is typing" indicator while someone else is actively writing a card, and that indicator disappears promptly and completely once that person stops typing — in every column, every time.

**Why this priority**: This is a minor, transient visual glitch (a stale indicator lingering a bit longer than expected) rather than something that blocks a core task, but it causes visible confusion about who's active and causes automated test flakiness.

**Independent Test**: Can be fully tested by having a participant type briefly in one column, then another, and confirming each column's typing indicator clears within the expected time after that participant stops typing there, independent of the other fixes in this feature.

**Acceptance Scenarios**:

1. **Given** a participant is typing a card in a column, **When** they stop typing, **Then** the "is typing" indicator for that participant in that column disappears within a short, bounded time.
2. **Given** a participant types briefly in one column and then quickly switches to typing in a different column, **When** they stop typing in each column, **Then** each column's indicator clears independently and does not leave a stale indicator behind in either column.
3. **Given** the underlying status update that clears an indicator fails to send, **When** the participant has stopped typing, **Then** the indicator still clears for other users within the expected bounded time (it does not depend solely on that single update succeeding).

---

### Edge Cases

- What happens when a menu's trigger button sits near the right or bottom edge of the viewport? The menu must shift/flip to stay fully on-screen rather than being clipped or falling back to the top-left corner.
- What happens when a column has an extremely long title, zero cards, or is at its narrowest supported width? The title must still be fully readable and the layout must not break.
- What happens when a facilitator rapidly opens, edits, saves, and reopens the note editor multiple times in a row? No duplicate or stale note text should ever be visible.
- What happens when a participant types in two different columns within a few seconds of each other? Both columns' indicators must resolve correctly and independently, with no indicator left behind in the wrong state.
- What happens when the app is used with an intermittent or briefly failing network connection? Menu positioning, note saving, and typing-indicator clearing must all still behave correctly once connectivity is restored, without leaving the UI in a duplicated or stuck state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST open the options menu anchored immediately below its trigger button, regardless of the button's position on the screen.
- **FR-002**: System MUST open the facilitator menu anchored immediately below its trigger button, regardless of the button's position on the screen.
- **FR-003**: System MUST keep an open menu correctly anchored to its trigger button when the page is scrolled or the window is resized while the menu remains open.
- **FR-004**: System MUST reposition a menu (e.g., flipping it above its trigger button) when there is insufficient space below the button, so the full menu stays visible within the viewport.
- **FR-005**: System MUST display the column title and the current card count together on the first row of each column header.
- **FR-006**: System MUST display a column's subtitle/description, when present, on a second row below the title row, and MUST NOT reserve an empty row when no subtitle is configured.
- **FR-007**: System MUST display the group button and the add button together on a third row of the column header, separate from the title row.
- **FR-008**: System MUST keep the column title fully readable (not truncated, overlapped, or visually crowded by other controls) at any supported column width and card count.
- **FR-009**: System MUST NOT simultaneously show a private note's editable field and its saved, read-only text after the note is saved.
- **FR-010**: System MUST ensure that saving a private note results in exactly one visible representation of that note's text at any point in time, including when the saved-note confirmation arrives with a delay.
- **FR-011**: System MUST clear a "user is typing" indicator for a given participant and column within a short, bounded time after that participant stops typing there.
- **FR-012**: System MUST clear each column's typing indicator independently, so activity in one column does not leave a stale indicator in another column.
- **FR-013**: System MUST guarantee the typing indicator eventually clears even if an individual status update used to clear it fails to send, rather than requiring that single update to succeed.
- **FR-014**: System's automated end-to-end test suite for the retrospective board MUST pass consistently, with no failing or flaky tests, across repeated runs.

### Key Entities

- **Menu Panel**: A transient UI overlay (options menu, facilitator menu) opened from a trigger button; must track that button's on-screen position for as long as it is open.
- **Column Header**: The title, card count, optional subtitle, group control, and add control associated with a single board column.
- **Private Note**: A facilitator-only note with an editable state (in progress) and a saved, read-only state; exactly one of these states should ever be visible at a time for a given note.
- **Typing Indicator**: A per-participant, per-column signal shown to other users while that participant is actively composing a card; must reliably appear while typing continues and clear once it stops.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of manual and automated checks across different trigger-button positions, scroll states, and viewport sizes, the options and facilitator menus appear anchored to (touching) their trigger button rather than at the top-left corner of the screen.
- **SC-002**: Users can read the full title of every board column at a glance — at any card count and at the narrowest supported viewport width — without needing to resize the window or scroll within the header.
- **SC-003**: Across repeated save actions (manual and automated testing), zero instances occur where a private note's edit field and saved text are both visible at the same time.
- **SC-004**: The "is typing" indicator disappears within 5 seconds of a participant stopping typing, in 100% of trials, including scenarios involving multiple columns and simulated network hiccups.
- **SC-005**: The project's automated end-to-end test suite for the retrospective board passes with zero failures and zero flaky retries across at least 5 consecutive runs.

## Assumptions

- A recent redesign already introduced trigger-anchored positioning logic for the options and facilitator menus, but the reported top-left placement still occurs in practice; the exact underlying cause (e.g., timing, styling conflict, or another factor) is left for the planning phase to diagnose — this spec defines the required end-user behavior, not the fix mechanism.
- Column subtitles/descriptions are optional per column; the three-row header layout must look correct both with and without a subtitle present.
- The "short, bounded time" for the typing indicator to clear is expected to match the app's existing typing-inactivity behavior (currently a few seconds); no change to how long a user is considered "still typing" while actively composing is implied by this fix.
- This spec addresses the underlying product behavior behind the two flaky/failing automated tests described (private note duplication, typing indicator clearing); it does not require rewriting the tests themselves beyond what's needed for them to reliably pass once the underlying behavior is fixed.
- No new user-facing features, columns, or menu items are introduced — this feature is scoped strictly to fixing the three reported defects.
