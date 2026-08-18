# Feature Specification: Anonymous Board Mode

**Feature Branch**: `051-anonymous-board-mode`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Quiero desarrollar el modo anónimo para todas los tipos de boards que tenemos. La idea es que al crear una retro, aparezca en algun punto de la interfaz si se desea que sea anónima o no. Por defecto que no lo sea. El comportamiento de una retro anónima debe ser exactamente igual que una no anónima, solamente que no debe mostrarse en las vistas front nada que identifique una tarjeta con un usuario. en lo relativo al backend todo debe funcionar exactamente igual. La anonimización debe hacerse solo a nivel de vista. Si se elecciona una retro anónima no debe mostrarse ningun título de usuario en la tarjeta. La agrupación por usuarios debe ocultarse. El facilitador debe tener una opción en el menú de facilitador para convertir la retro entre anónima o no anónima a volutad durante la propia retrospectiva."

## Clarifications

### Session 2026-08-18

- Q: Los boards ya existentes (creados antes de este feature) no tendrán el campo de anonimato en sus datos. ¿Cómo deben tratarse? → A: Tratar como no anónimos por defecto — ausencia del campo se interpreta como "no anónimo," sin migración de datos.
- Q: Al desactivar el modo anónimo, ¿una columna que tenía "agrupar por usuario" y fue forzada a "sin agrupar" mientras estaba activo el modo anónimo recupera automáticamente "agrupar por usuario"? → A: Sí, se restaura automáticamente — el fallback a "sin agrupar" es solo un efecto de la vista mientras el board es anónimo y nunca sobrescribe el criterio de agrupación guardado de la columna.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a Board as Anonymous or Named (Priority: P1)

As a user creating a new retrospective board (of any template/type), I want to choose whether the board will be anonymous or not, with "not anonymous" pre-selected, so that I control from the start whether card authorship is visible to participants.

**Why this priority**: This is the entry point for the whole feature — without a way to set the mode at creation time, no board can ever be anonymous, and every other story depends on a board having a mode.

**Independent Test**: Can be fully tested by opening the create-board flow, confirming the anonymity choice defaults to "not anonymous," creating one board with it left at the default and another with it switched to anonymous, and confirming each board opens in the corresponding mode.

**Acceptance Scenarios**:

1. **Given** a user is creating a new board of any template type, **When** they reach the board-creation form, **Then** they see a clearly labeled control to mark the board as anonymous, defaulted to off (not anonymous).
2. **Given** a user leaves the anonymity control at its default and creates the board, **When** the board opens, **Then** card author names are shown as they are today.
3. **Given** a user switches the anonymity control on before creating the board, **When** the board opens, **Then** it opens in anonymous mode (no card author names visible, per User Story 2).

---

### User Story 2 - Participate in an Anonymous Board (Priority: P1)

As a participant (including the facilitator) in a board marked anonymous, I want cards to show no information that reveals who created them, so that feedback is contributed and discussed without attribution bias.

**Why this priority**: This is the core value of the feature — the visible anonymization behavior participants actually experience. Without it, the creation toggle from Story 1 would have no effect.

**Independent Test**: Can be fully tested by opening an anonymous board with several cards from different participants and confirming no card shows an author name, while confirming voting, editing, dragging, commenting, and every other board interaction behaves exactly as on a non-anonymous board.

**Acceptance Scenarios**:

1. **Given** an anonymous board with cards from multiple participants, **When** any participant — including the facilitator — views a column, **Then** no card displays an author name or any other label identifying who created it.
2. **Given** an anonymous board, **When** a participant opens the "group by user" view option for a column, **Then** that option is not available (hidden), leaving only the other grouping choices (e.g. no grouping, suggested groupings).
3. **Given** an anonymous board, **When** a participant creates, edits, votes on, likes, comments on, drags, or deletes a card, **Then** the action behaves exactly as it would on a non-anonymous board (only the visible author label and user-grouping option differ).
4. **Given** a non-anonymous board, **When** any participant views it, **Then** card author names and the "group by user" option continue to display exactly as they do today.
5. **Given** an anonymous board, **When** any participant looks at the board, **Then** a clearly visible indicator confirms the board is currently in anonymous mode, so the mode is never left to be inferred only from the absence of names.
6. **Given** a facilitator exports an anonymous board to PDF, DOCX, or TXT, **When** the export is generated, **Then** the exported file omits card author names exactly as the live view does; exports from a non-anonymous board continue to include author names.

---

### User Story 3 - Facilitator Toggles Anonymity Mid-Retrospective (Priority: P2)

As the facilitator running a live retrospective, I want an option in the facilitator menu to switch the board between anonymous and non-anonymous at any point during the session, so that I can adapt the format to the room even after the board was created.

**Why this priority**: This is a valuable enhancement for facilitators but the feature already delivers its core value (Stories 1 and 2) without it; it depends on a board already having a mode to toggle.

**Independent Test**: Can be fully tested by opening the facilitator menu on a live board, toggling the anonymity setting, and confirming every connected participant's view updates to match (author names appear/disappear, "group by user" appears/disappears) without needing to reload or rejoin the board.

**Acceptance Scenarios**:

1. **Given** the facilitator has a board open, **When** they open the facilitator menu, **Then** they see a control showing the board's current anonymity state and letting them switch it.
2. **Given** the facilitator switches a non-anonymous board to anonymous, **When** the change is applied, **Then** all currently connected participants' views — including the facilitator's own — update to hide card author names, show the anonymous-mode indicator, and hide the "group by user" option, without a page reload.
3. **Given** the facilitator switches an anonymous board back to non-anonymous, **When** the change is applied, **Then** all currently connected participants' views update to show card author names, remove the anonymous-mode indicator, and restore the "group by user" option — and any column that had "group by user" active before the board went anonymous automatically shows it grouped by user again, with no participant needing to reselect it — all without a page reload.
4. **Given** a participant who is not the facilitator, **When** they view the facilitator menu, **Then** they cannot see or use the anonymity toggle (facilitator-only control), consistent with other facilitator-only controls.

---

### Edge Cases

- A column is actively grouped "by user" when the facilitator switches the board to anonymous: the grouped-by-user view MUST no longer be available and MUST fall back to the default (non-grouped) view for all participants, since it would otherwise still expose author identity through the grouping itself. This fallback is a display-time override only — the column's saved "group by user" choice is preserved untouched, so it reappears automatically for all participants the moment the board is switched back to non-anonymous.
- A participant joins an anonymous board after it was created: they see it as anonymous from the start, with no way to discover prior authorship of existing cards.
- A brand-new board of any template (Start/Stop/Continue, Mad/Sad/Glad, custom, etc.) supports the anonymity setting identically — the setting is not limited to a subset of board templates.
- Toggling anonymity does not alter, delete, or reassign any stored data (cards, authorship, votes, etc.) — it only changes what the interface reveals.
- A facilitator toggles anonymity repeatedly in quick succession: the board's displayed state always reflects the most recent toggle, with no stale or inconsistent view among connected participants.
- A facilitator generates an export while the board is anonymous: the export omits author names even if the same board was previously exported (non-anonymously) before the mode was switched — each export reflects the mode active at generation time, not a cached prior export.
- The facilitator is a participant too: because anonymity has no role-based exception, the facilitator's own view of card authorship and the anonymous-mode indicator update exactly like everyone else's when the setting changes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The board-creation flow MUST let the user creating a board choose whether the board is anonymous, for every board template/type the application offers.
- **FR-002**: The anonymity choice MUST default to "not anonymous" when creating a new board. Boards that existed before this capability was introduced MUST also be treated as "not anonymous" by default, with no separate migration step required.
- **FR-003**: When a board is anonymous, no card in any column MUST display an author name or any other label that identifies which user created it, for any participant — including the facilitator. Anonymity applies uniformly; there is no role-based exception.
- **FR-004**: When a board is anonymous, the "group by user" option MUST be hidden from the grouping choices offered for a column; other grouping choices (no grouping, suggested groupings) MUST remain available.
- **FR-005**: When a board is not anonymous, all card authorship display and the "group by user" grouping option MUST behave exactly as they do today.
- **FR-006**: Anonymity MUST be a purely presentational (view-layer) concern: underlying stored data — including which user authored each card — MUST NOT change, be removed, or be recomputed based on the anonymity setting.
- **FR-007**: Every other board behavior (creating, editing, voting, liking, commenting, dragging/reordering, deleting cards; timers; action items; sentiment; etc.) MUST work identically regardless of the anonymity setting.
- **FR-008**: The facilitator menu MUST offer a control, visible only to the board's facilitator, to switch a board between anonymous and non-anonymous at any time during an active retrospective.
- **FR-009**: When the facilitator changes the anonymity setting, the change MUST apply immediately to all currently connected participants' views, without requiring a page reload or reconnect.
- **FR-010**: If a column is displayed grouped "by user" at the moment the board is switched to anonymous, that column MUST automatically fall back to a grouping mode that does not reveal authorship (e.g. no grouping) for all connected participants. This fallback MUST be a display-time override only: the column's saved "group by user" grouping choice MUST NOT be overwritten, so that switching the board back to non-anonymous automatically restores the "group by user" view without any participant having to reselect it.
- **FR-011**: A participant who is not the facilitator MUST NOT be able to see or trigger the anonymity toggle control.
- **FR-012**: Exported board files (PDF/DOCX/TXT) generated from an anonymous board MUST omit card author names, matching the live anonymous view; exports generated from a non-anonymous board MUST continue to include author names as they do today. An export MUST reflect the board's anonymity setting at the time the export is generated.
- **FR-013**: The board view MUST show a persistent, clearly visible indicator of the board's current anonymity state (anonymous / not anonymous) to every participant, not only the facilitator, so the mode is never ambiguous even before any cards are visible.

### Key Entities

- **Board / Retrospective**: Gains an anonymity setting (on/off) that is set at creation (default: off) and can be changed later by the facilitator; this setting governs only what the view layer reveals about card authorship, not the underlying stored authorship data.
- **Card**: Continues to store its author exactly as before; only its *displayed* author label is conditionally shown or hidden based on the board's current anonymity setting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can set a new board's anonymity choice during creation, for any board template, in the same flow used today to create a board, with zero additional required steps beyond selecting the option.
- **SC-002**: In an anonymous board, 100% of visible cards, across all columns and all grouping views, show no author-identifying label.
- **SC-003**: In an anonymous board, the "group by user" option is absent from 100% of column grouping menus.
- **SC-004**: A facilitator can switch a live board's anonymity mode in two interactions or fewer (open facilitator menu, toggle control), with the change visible to all connected participants in under 2 seconds.
- **SC-005**: Every board interaction other than author-name display and user-grouping availability (creating, voting, editing, exporting counts, etc.) produces identical outcomes whether the board is anonymous or not, with zero behavioral regressions observed in existing functionality.
- **SC-006**: 100% of exported files (PDF, DOCX, TXT) generated from an anonymous board omit card author names; 100% of exports from a non-anonymous board include them, matching the live view at export time.
- **SC-007**: Any participant, including the facilitator, can determine the board's current anonymity state at a glance, without opening a menu or inspecting a card, in 100% of anonymous and non-anonymous boards.

## Assumptions

- "All board types" refers to every board template/type currently offered in the creation flow (e.g. Start/Stop/Continue, Mad/Sad/Glad, and any others); no template is exempt from supporting the anonymity setting.
- The anonymity setting is a single per-board flag; there is no per-column or per-card partial anonymity.
- Presence/participant indicators that show who is currently connected to the board (e.g. an avatar list of active participants) are a distinct concept from card authorship and are not affected by this feature, since they do not link any individual card to a user.
- The facilitator is identified the same way facilitator-only controls are identified elsewhere in the product today (i.e. the board's creator/owner); this feature does not change who qualifies as facilitator.
- Anonymizing a board does not affect vote counts, like counts, or any other aggregate card data — only the author-identifying label and the user-grouping option are hidden.
- Anonymity applies uniformly to every participant, including the facilitator; there is no role-based exception that keeps authorship visible to the facilitator while hiding it from others.
- The anonymity indicator (FR-013) is a simple, always-visible status cue (e.g. a label/badge on the board) — it does not require its own settings or configuration beyond reflecting the board's current anonymity state.
- Exported files (PDF/DOCX/TXT) are generated on demand and reflect whatever anonymity state the board is in at the moment of export; previously generated/downloaded export files are not retroactively altered if the board's mode changes afterward.
- Boards created before this feature shipped are read as "not anonymous" when their stored data has no anonymity value, matching the pre-existing (non-anonymous) visible behavior with no backfill/migration task required.
