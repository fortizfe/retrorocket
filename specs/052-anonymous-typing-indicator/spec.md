# Feature Specification: Anonymous Typing Indicator

**Feature Branch**: `052-anonymous-typing-indicator`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Quiero refinar el modo anónimo un poco más. Actualmente aunque el board esté configurado en modo anónimo, el cartel de que un usuario está escribiendo, muestra el nombre del usuario que está escribiendo. eso puede ayudar a identificar a que usuario pertenece una tarjeta a los demás integrantes. Lo que quiero es que si el modo anónimo está activo, el cartel muestre "Un usuario está escribiendo" en vez del nombre del usuario. Si el modo anónimo no está activado, entonces mostrar el display name del usuario que está escribiendo como se hace ahora mismo."

## Clarifications

### Session 2026-08-18

- Q: El texto "Un usuario está escribiendo" ¿debe añadirse como claves de traducción i18n nuevas (y de paso migrar el texto existente, hoy hardcodeado, al sistema i18n ya presente en el proyecto), o debe replicar el patrón hardcodeado que usa hoy el componente? → A: Añadir claves i18n nuevas, migrando también el texto existente de "escribiendo" al sistema i18n (`typing.single/double/multiple` ya existen sin usar) — corrige la inconsistencia actual y añade soporte para el locale en inglés.
- Q: Con 2 o más usuarios escribiendo a la vez en modo anónimo, ¿el mensaje debe permanecer siempre en singular ("Un usuario está escribiendo") o distinguir "varios usuarios" sin dar un número exacto? → A: Siempre singular, sin importar cuántas personas escriban a la vez — máxima privacidad, ni siquiera revela si hay 1 o varios escribiendo.
- Q: El grupo de avatares con iniciales que hoy acompaña al texto, ¿debe quitarse por completo en modo anónimo o sustituirse por un icono/marcador genérico no identificativo? → A: Quitarlo por completo — el cartel en modo anónimo solo muestra el texto genérico y los puntos animados de "escribiendo", sin ningún elemento de avatar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Typing indicator hides identity in anonymous boards (Priority: P1)

A participant in a board that has anonymous mode enabled starts typing a new card. Other participants see a "someone is typing" indicator, but it does not reveal who is typing, preserving the anonymity that the board owner configured.

**Why this priority**: This is the core privacy gap the user reported — the typing indicator currently leaks the author's identity even when the board is explicitly configured to hide it, undermining the whole purpose of anonymous mode and potentially exposing participants to social pressure or retaliation based on their feedback.

**Independent Test**: Enable anonymous mode on a board, have one participant start typing in any column, and confirm that other participants see a generic "someone is typing" message with no name or personally identifying detail, for one typist and for multiple simultaneous typists.

**Acceptance Scenarios**:

1. **Given** a board with anonymous mode enabled and one participant typing in a column, **When** another participant views that column, **Then** they see a generic indicator stating that a user is typing, without any name.
2. **Given** a board with anonymous mode enabled and two participants typing simultaneously in the same column, **When** another participant views that column, **Then** the indicator still communicates that people are typing without naming or counting-by-name any of them (it must not reveal individual identities even indirectly, e.g. by listing distinguishable initials).
3. **Given** a board with anonymous mode enabled, **When** the typing participant stops typing, **Then** the generic indicator disappears the same way the current named indicator does today.

---

### User Story 2 - Typing indicator keeps showing names in non-anonymous boards (Priority: P2)

A participant in a board where anonymous mode is disabled starts typing a new card. Other participants continue to see the typist's display name, exactly as they do today.

**Why this priority**: This preserves existing behavior for the majority of boards that don't use anonymous mode, ensuring the fix does not regress the current, valued collaboration feature of seeing who is actively contributing.

**Independent Test**: With anonymous mode disabled (or never enabled) on a board, have a participant start typing and confirm other participants see that participant's display name in the indicator, matching current behavior.

**Acceptance Scenarios**:

1. **Given** a board with anonymous mode disabled and one participant typing, **When** another participant views that column, **Then** they see that participant's display name in the indicator, as happens today.
2. **Given** a board with anonymous mode disabled and multiple participants typing in the same column, **When** another participant views that column, **Then** the indicator lists their display names using the existing multi-typist phrasing (e.g. name + "y N más").

---

### User Story 3 - Indicator updates immediately when anonymous mode is toggled (Priority: P3)

A facilitator toggles anonymous mode on or off while participants are actively typing or about to type. The typing indicator's identity display (generic vs. named) reflects the board's current anonymous-mode setting without requiring a page reload.

**Why this priority**: Anonymous mode can already be toggled live on an existing board; without this, a facilitator could flip anonymous mode on but the typing indicator would keep leaking names until participants refresh, leaving a window where the stated privacy guarantee is not actually met.

**Independent Test**: With participants connected to a board, toggle anonymous mode on, then have a participant type; confirm the indicator is immediately generic. Toggle it back off and confirm the indicator immediately reverts to showing display names.

**Acceptance Scenarios**:

1. **Given** anonymous mode is toggled on while a participant is already shown as typing with their name, **When** the toggle takes effect, **Then** the visible indicator updates to the generic "a user is typing" message without requiring any participant to reload the page.
2. **Given** anonymous mode is toggled off while a generic indicator is displayed, **When** the toggle takes effect, **Then** the indicator updates to show the typist's display name without a page reload.

### Edge Cases

- What happens when a board has anonymous mode enabled but the current viewer is the one typing (self view)? The indicator behavior for the viewer's own typing (if shown at all) must follow the same anonymous/non-anonymous rule as it does for other viewers today — this feature does not change whether self-typing is shown, only what identity text is used.
- How does the system handle the screen-reader-only live announcement of the typing status? It must also switch to the generic phrasing under anonymous mode, since it currently mirrors the same visible text and would otherwise leak the name via assistive technology even when the visual card is hidden.
- What happens with 3+ simultaneous typists in an anonymous board? The generic message must not vary in a way that reveals the count in a way tied to identity (e.g. avoid "3 users" if that count could be cross-referenced with online participant lists to deanonymize) — see FR-004 for the exact phrasing decision.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST determine, at the moment the typing indicator is rendered, whether the board's anonymous mode is currently enabled.
- **FR-002**: When anonymous mode is enabled, the visible typing indicator MUST display a generic, localized message equivalent to "Un usuario está escribiendo" (e.g. "A user is typing" in English) regardless of how many participants are typing or who they are, and MUST NOT display any participant name, initial, avatar, or other identifying detail. The message MUST be delivered through the project's existing translation system, matching the current supported locales (Spanish and English).
- **FR-003**: When anonymous mode is disabled, the typing indicator MUST continue to display participant display names exactly as it does today (single typist by name; multiple typists using the existing "name y N más" phrasing).
- **FR-004**: When anonymous mode is enabled and more than one participant is typing simultaneously in the same column, the indicator MUST still show the single generic message ("Un usuario está escribiendo") rather than a pluralized or counted variant, so the presence of multiple typists cannot be inferred.
- **FR-005**: The screen-reader live announcement of the typing status MUST follow the same anonymous/non-anonymous rule as the visible indicator, so assistive technology never announces a name when anonymous mode is enabled.
- **FR-006**: The typing indicator's identity display MUST update immediately (without a page reload) when the board's anonymous mode setting changes, for any indicator currently visible or about to become visible.
- **FR-007**: This feature MUST NOT change any other behavior of the typing indicator (appearance/disappearance timing, animation, position, multi-column behavior) beyond the identity text it displays.

### Key Entities

- **Typing Indicator**: The transient UI element (and its screen-reader announcement) shown to board participants when one or more other participants are actively composing a card in a column. Its identity-revealing content is now conditioned on the board's anonymous mode setting.
- **Board Anonymous Mode Setting**: The existing per-board configuration (introduced in feature 051) that determines whether participant identities are hidden elsewhere in the board (e.g. on cards). This feature extends that same setting to govern the typing indicator's content.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of manual and automated checks, boards with anonymous mode enabled never display a participant's name, initial, or avatar in the typing indicator or its screen-reader announcement.
- **SC-002**: In 100% of manual and automated checks, boards with anonymous mode disabled continue to display typist display names in the indicator exactly as before this change, with zero regressions to existing typing-indicator behavior.
- **SC-003**: When a facilitator toggles anonymous mode while the board is in active use, the typing indicator's identity display reflects the new setting within the same real-time update latency the board already uses for other anonymous-mode-driven UI changes (no added delay, no reload required).

## Assumptions

- Anonymous mode is a per-board, real-time-synced setting already delivered to all connected clients (per feature 051), so this feature can read it wherever the typing indicator is rendered without introducing new data plumbing.
- The generic message is delivered through the project's existing translation system for both currently supported locales (Spanish: "Un usuario está escribiendo"; English: "A user is typing"), consistent with how all other user-visible text in the project is handled. This also brings the pre-existing named typing-indicator text (currently hardcoded in Spanish only) onto the same translation system.
- Hiding identity means omitting name, initials, and avatar from the typing indicator; it does not require hiding the fact that *someone* is typing, which remains visible in both modes.
- The number of simultaneous typists is not shown in anonymous mode, to avoid indirectly narrowing down who is typing when cross-referenced with the list of online participants.
