# Feature Specification: Retrospective Board Redesign (Apple HIG-Inspired)

**Feature Branch**: `033-retro-board-redesign`

**Created**: 2026-08-09

**Status**: Draft

**Input**: User description: "Siguiendo con el rediseño de toda la aplicación a apple like, quiero trabajar en el rediseño de la sección de retrospectiva (board). Quiero que hagas un análisis pera rediseñar la retrospectiva con diseños basados en los principios de apple (https://developer.apple.com/design/human-interface-guidelines/design-principles). Quiero que en el rediseño se aplique a todos los componentes que están en las retrospectivas. Menús, exportación, cards, etc. Tienes libertad para investigar varias posibilidades y encontrar la mejor solución para mejorar la UX de los mismos. Aplica los comandos de las skills de apple que tenemos instalados en claude."

## Clarifications

### Session 2026-08-09

- Q: SC-001 and SC-007 targeted 50+ cards per column and 20+ concurrent
  participants as the scale the redesigned board must stay smooth at — was
  that the right target scale for planning/testing, or should it match more
  typical retro session sizes? → A: Typical team scale — 30+ cards per
  column, up to 15 concurrent participants, matching realistic Scrum/agile
  retro sizes rather than over-building for scale this tool rarely sees.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Contribute and React During a Live Session (Priority: P1)

As a participant in an active retrospective, I want to add, edit, delete, vote on, like, and react to cards across the board's columns, and see who else is present and typing, presented through a modern, HIG-aligned interface, so that contributing feels immediate and effortless during the fast-moving, real-time flow of a live session.

**Why this priority**: This is the core loop exercised by every participant, every session, continuously — the entire reason the board exists. Every other capability supports or follows from it.

**Independent Test**: As a participant in a board with other active participants, add a card to a column, edit its text, vote on another participant's card, like a card, open the reaction picker and add/remove an emoji reaction, delete one of your own cards, and observe another participant's live cursor-free presence (avatar list) and typing indicator. All actions must reflect in real time for every participant.

**Acceptance Scenarios**:

1. **Given** an open board with configured columns, **When** a participant adds a card to any column, **Then** the card appears in that column for every participant in real time, with its content wrapping within the card and any URLs remaining clickable.
2. **Given** an existing card, **When** its author edits or deletes it, **Then** the change is reflected for every participant in real time.
3. **Given** a card, **When** a participant votes on it, likes it, or adds/removes an emoji reaction via the reaction picker, **Then** the updated count/state is reflected for every participant, and the reaction picker opens already anchored to its trigger without a visible flash or reposition.
4. **Given** multiple participants are present on a board, **When** the board is viewed, **Then** a live list of participants is visible (with an accessible way to see the full list when there are more than fit inline), and any participant currently typing a card is indicated to others.
5. **Given** a column has no cards yet, **When** it is viewed, **Then** a clear empty state invites the first contribution rather than showing a bare void.

---

### User Story 2 - Organize and Synthesize Cards (Priority: P2)

As a participant, I want to drag cards to reorder or move them between columns, group related cards manually or via AI-suggested grouping, and disband or collapse groups, so that scattered contributions can be turned into organized themes before discussion.

**Why this priority**: Organizing follows contribution (Story 1) — it requires cards to already exist — but is exercised in nearly every session once enough cards have accumulated, making it the second most central workflow.

**Independent Test**: On a board with several cards in a column, drag a card to reorder it within the column and to move it into another column; create a manual group from two related cards; run AI-suggested grouping and accept a suggestion; collapse and expand a group; remove a card from a group; disband a group. Every action must persist and reflect for all participants.

**Acceptance Scenarios**:

1. **Given** a column with multiple cards, **When** a participant drags a card to a new position or into a different column, **Then** the new order/column is reflected for every participant.
2. **Given** two or more related cards, **When** a participant groups them manually, **Then** a group is formed and visibly distinct from ungrouped cards.
3. **Given** a column with similar cards, **When** a participant requests AI-suggested grouping, **Then** suggested groupings are presented for review before being applied.
4. **Given** an existing group, **When** a participant collapses, expands, removes a card from, or disbands it, **Then** the resulting state is reflected for every participant.

---

### User Story 3 - Facilitate the Session (Priority: P3)

As the board's owner/facilitator, I want a dedicated facilitator menu to control the countdown timer, enable and configure sentiment analysis, view the team mood dashboard, keep private facilitator notes, and manage action items (including converting a card into one), so that I can guide the session's pace and capture follow-ups without those controls being visible or usable by non-owners.

**Why this priority**: Facilitation capabilities are used by a single role (the board owner) and typically once per session (setup, then occasional adjustment), making them essential but less frequently exercised than Stories 1-2.

**Independent Test**: As the board owner, open the facilitator menu, start/pause/reset the countdown timer (visible to all participants in real time), enable sentiment analysis and adjust its configuration, view the team mood dashboard, write a private facilitator note, convert a card into an action item with an assignee and due date, and create/edit/delete an action item directly. As a non-owner participant, confirm the facilitator menu and the "convert to action item" control are not available.

**Acceptance Scenarios**:

1. **Given** the board owner opens the facilitator menu, **When** they start, pause, or reset the countdown timer, **Then** the timer state updates in real time for every participant.
2. **Given** the board owner, **When** they enable sentiment analysis and adjust its configuration, **Then** the team mood dashboard reflects the current analysis state.
3. **Given** the board owner, **When** they write a private facilitator note, **Then** the note is saved and visible only to them, not to other participants.
4. **Given** the board owner, **When** they convert a card into an action item with an assignee and/or due date, **Then** the action item appears in the action items column with that assignment; **when** they create, edit, or delete an action item directly, **then** the change is reflected for every participant.
5. **Given** a participant who is not the board owner, **When** they view the board, **Then** the facilitator menu and the "convert card to action item" control are not offered to them.

---

### User Story 4 - Export and Wrap Up (Priority: P4)

As a participant (or the facilitator, for facilitator-only options), I want to export the retrospective's content to my preferred format, copy the board's ID, share a direct link, and exit back to my dashboard, so that I can preserve and distribute the outcome of the session and return to my other boards.

**Why this priority**: This is typically a single end-of-session action rather than a repeated interaction, making it lower priority than the continuous flows above while still being an essential capability.

**Independent Test**: From the board, open the export option, choose each available format (PDF, DOCX, TXT) and confirm a successful export with visible progress and success feedback (and a visible error if one is forced); as the facilitator, confirm facilitator-only export options are available and are not shown to a non-owner; copy the board ID; copy a shareable link; exit back to the dashboard.

**Acceptance Scenarios**:

1. **Given** a board with cards, groups, and action items, **When** a participant opens the export option and chooses a format, **Then** progress is shown while exporting and a clear success or error outcome follows.
2. **Given** the board owner, **When** they open the export option, **Then** facilitator-only export options (e.g. including private facilitator notes) are available to them and not to non-owners.
3. **Given** any participant, **When** they choose to copy the board ID or share a link, **Then** the value is copied and a confirmation is shown.
4. **Given** any participant, **When** they choose to exit the board, **Then** they are navigated back to their dashboard.

---

### User Story 5 - Consistent, Accessible Experience for Every Participant (Priority: P5)

As a participant on any device, theme, language, or motion preference, I want the redesigned board to remain fully legible, operable, and coherent, so that the experience works for me the same as it does for anyone else in the session.

**Why this priority**: This is a cross-cutting quality bar rather than a distinct journey; it depends on Stories 1-4 already being implemented and is validated across all of them.

**Independent Test**: Load the board on narrow mobile and ultra-wide desktop viewports, in both light and dark themes, in both supported languages, and with reduced motion enabled. All capabilities from Stories 1-4 remain available and legible in every combination.

**Acceptance Scenarios**:

1. **Given** the redesigned board in either light or dark theme, **When** a participant views any state (loading, populated, empty column, error), **Then** it remains legible and meets WCAG 2.1 AA contrast and focus-visibility requirements.
2. **Given** a participant has enabled a reduced-motion preference, **When** they interact with the board (drag-and-drop, menus, reaction picker, countdown updates), **Then** every interaction still completes and communicates its result without relying on that motion.
3. **Given** the board is viewed in either supported locale (English or Spanish), **When** it renders, **Then** all text renders in that locale, and differing text lengths do not break the layout.
4. **Given** narrow mobile or ultra-wide desktop viewports, **When** the board is viewed, **Then** the layout remains legible, columns/cards remain reachable (stacking on narrow viewports rather than forcing horizontal scroll), and every capability from Stories 1-4 remains usable, including via keyboard and touch for every menu and control (options menu, facilitator menu, card menu, column header menu, export, reaction picker, drag-and-drop).

---

### Edge Cases

- What happens when a column has no cards? A clear empty state invites the first contribution, distinct from a loading state.
- What happens when a column accumulates a large number of cards (30+)? The column's card list remains smoothly scrollable within the column, without causing horizontal overflow of the board, and drag-and-drop remains responsive.
- What happens when many participants (up to 15) are active on the same board simultaneously? Real-time updates (cards, votes, reactions, typing indicators, presence) continue to render without perceptible lag or dropped-frame stalls.
- What happens when two participants edit, vote on, or drag the same card at nearly the same time? The board resolves to a consistent final state for all participants without a visible crash or stuck UI (existing real-time sync behavior is preserved; this redesign does not change conflict resolution).
- What happens when a network interruption occurs mid-action (e.g., mid-vote, mid-export)? A visible error is shown rather than a silent failure, consistent with the constitution's resilience requirements.
- What happens when a non-owner attempts to reach facilitator-only controls (facilitator menu, convert-to-action, facilitator-only export options)? Those controls are not offered to them at all.
- What happens when the board owner leaves while the countdown timer is running? The timer continues to reflect its last known state for remaining participants (existing behavior is preserved).
- What happens when card, group, or column titles/content are unusually long? Text wraps within its container without breaking the layout or clipping content, consistent with existing content-wrapping requirements.
- What happens when translated text (English vs. Spanish) varies significantly in length for the same UI element? The layout does not break or truncate meaningfully important content.
- What happens when a participant has `prefers-reduced-motion` enabled? All capabilities (drag-and-drop, menus, popovers, countdown, reactions) remain usable without relying on animation.
- What happens on very small (narrow mobile) and very large (ultra-wide desktop) viewports? The layout remains legible and every menu/control remains reachable without depending on mouse hover.
- What happens when the export is requested while board data is still loading? The export option reflects the in-progress state and does not produce an incomplete or silently wrong export.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The retrospective board view — including its column grid, all card types (regular cards, card groups, action item cards), the options menu, the facilitator menu and each of its tabs (controls, sentiment, team mood, notes), the export popover, the card menu, the column header menu, the reaction picker, the participant display and popover, and the countdown timer — MUST present a completely redesigned visual layout and look-and-feel built on Apple Human Interface Guidelines design principles (clarity, deference, depth) as applied through the project's mandated Apple-design skill package, replacing rather than merely tweaking the current visual treatment.
- **FR-002**: The redesign MUST preserve adding, editing, and deleting cards within a column, including content wrapping, clickable URL detection, and preservation of intentional line breaks.
- **FR-003**: The redesign MUST preserve voting and liking cards, and adding/removing emoji reactions via the reaction picker, including the picker's viewport-aware anchored positioning to its trigger.
- **FR-004**: The redesign MUST preserve drag-and-drop reordering of cards within a column and moving cards between columns.
- **FR-005**: The redesign MUST preserve manual card grouping, AI-suggested grouping (reviewed before being applied), group collapse/expand, removing a card from a group, and disbanding a group.
- **FR-006**: The redesign MUST preserve dynamic, board-configured columns rendering correctly regardless of column count (three regular columns, plus a fourth action-items column when enabled), sharing available width without producing a horizontal scrollbar at desktop widths, and stacking into a single column below the existing responsive breakpoint.
- **FR-007**: The redesign MUST preserve the owner-only ability to convert a card into an action item with an optional assignee and due date, and the dedicated action items column with its own create/edit/delete capability and visibility toggle.
- **FR-008**: The redesign MUST preserve live participant presence display and typing indicators, updating in real time as participants join, leave, or type.
- **FR-009**: The redesign MUST preserve the owner-only facilitator menu, restricted to the board owner, offering: countdown timer controls (start/pause/reset) visible to all participants in real time, sentiment analysis enable/configuration, the team mood dashboard, and private facilitator notes visible only to their author.
- **FR-010**: The redesign MUST preserve the export capability across PDF, DOCX, and TXT formats, including facilitator-only export options (e.g. private facilitator notes) restricted to the board owner, with visible progress, success, and error feedback.
- **FR-011**: The redesign MUST preserve copying the board ID, copying/sharing a direct board link, and exiting back to the dashboard.
- **FR-012**: Every menu and popover on the board (options menu, facilitator menu, card menu, column header menu, export popover, reaction picker) MUST remain reachable and operable via keyboard and via touch, without depending on mouse hover, and MUST be dismissible via Escape and outside-click.
- **FR-013**: All visible text on the redesigned board MUST continue to be sourced from the existing translation system for both currently supported locales (English, Spanish); no hardcoded user-facing strings may be introduced.
- **FR-014**: The redesigned board MUST independently satisfy WCAG 2.1 AA (contrast, visible focus, no color-only meaning, full keyboard operability) in both the light and dark themes, across all states (loading, populated, empty column, error).
- **FR-015**: Any motion or animation introduced in the redesign (including drag-and-drop feedback, menu/popover transitions, and real-time update entrances) MUST honor a visitor's reduced-motion preference and MUST be arrived at through the constitution's mandated design/motion decision process rather than ad hoc choices.
- **FR-016**: The redesigned board MUST remain fully responsive and usable across mobile, tablet, and desktop viewport sizes, with every column, card, and control remaining reachable regardless of viewport.
- **FR-017**: The redesign is presentation-layer only: real-time synchronization behavior (how card, group, column, timer, notes, and typing updates propagate between participants) MUST NOT be altered by this initiative.
- **FR-018**: Before a final visual direction is committed to, at least 2-3 genuinely distinct visual directions MUST be explored and compared, per the constitution's mandated design-exploration process, rather than proceeding directly from a single first draft. The product owner MUST review the explored directions and approve the one that ships.
- **FR-019**: Existing automated tests that assert board functional behavior (unit/component tests, the no-Firestore-in-UI architecture test, and WCAG 2.1 AA/Playwright E2E coverage of board flows) MUST continue to pass, updated only to the extent needed to reflect intentional structural changes, with no net loss of coverage for the behaviors protected by FR-002 through FR-011.

### Key Entities

- **Card**: A single contribution within a retrospective column. Attributes relevant to this view: content text, author, column, vote count, like state, emoji reactions, and optional group membership.
- **Card Group**: A cluster of related cards, formed manually or via AI suggestion. Attributes relevant to this view: member cards, collapsed/expanded state.
- **Action Item**: A follow-up task, either converted from a card or created directly. Attributes relevant to this view: description, assignee, due date, completion state.
- **Column**: A board-configured section (e.g. "What helped", "What hindered", "What to improve", plus the optional action-items column) that groups cards by theme.
- **Retrospective (Board)**: The session itself. Attributes relevant to this view: title, owner (facilitator), configured columns, countdown timer state.
- **Participant**: A user present on the board. Attributes relevant to this view: display presence, typing status.
- **Facilitator Note**: A private note authored by the board owner, visible only to them.
- **Sentiment/Team Mood Result**: Derived analysis of card content, shown via badges, filters, and the team mood dashboard when enabled by the facilitator.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Card interactions (add, vote, like, react, drag-reorder) visually respond within 100ms of the triggering action, and drag-and-drop maintains at least 50 frames per second with no dropped-frame stalls, including in a column holding 30+ cards.
- **SC-002**: 100% of existing card, grouping, action-item, facilitator, export, and sharing flows complete with the same outcome as before the redesign, verified through automated unit and end-to-end tests.
- **SC-003**: The redesigned board achieves zero WCAG 2.1 AA violations across all states (loading, populated, empty column, error) in both light and dark themes.
- **SC-004**: 100% of the board's menus and controls (options menu, facilitator menu, card menu, column header menu, export popover, reaction picker, drag-and-drop) are operable via keyboard and via touch, with no reliance on mouse hover, verified through automated testing.
- **SC-005**: A structured design review of the redesigned board against Apple Human Interface Guidelines principles (clarity, deference, depth), conducted using the project's mandated design-skill process, closes with zero unresolved high-priority findings.
- **SC-006**: The product owner personally reviews the 2-3 explored visual directions and confirms the chosen one is perceived as modern and visually distinctive compared to the version it replaces, with no requested reversion to the prior visual treatment.
- **SC-007**: A board with a typical high-activity session load (30+ cards per column, up to 15 concurrent participants) remains smoothly scrollable and interactive — sustaining the same 50-frames-per-second, no-dropped-frame-stalls bar as SC-001 — with real-time updates (cards, votes, reactions, typing, presence) each rendering within the same 100ms response bound as SC-001.

## Assumptions

- Scope for this initiative is the retrospective board view itself and every component rendered within or for it: the column grid and all card types (regular, group, action item), drag-and-drop, the column header menu, the card menu, the options menu, the facilitator menu (all tabs: controls, sentiment, team mood, notes), the export popover, the reaction picker, the participant display/popover, the countdown timer, and typing indicators — across both the light and dark themes and both currently supported locales, and including each surface's loading, empty, and error states alongside its default presentation.
- The dashboard ("Mis Tableros", feature 031), the landing page (feature 029), authentication, and the profile/settings page are out of scope; they have already received their own dedicated redesign or remain unaddressed by this initiative.
- The earlier, broader Apple-design-alignment pass (feature 028) already applied baseline fixes to parts of the retrospective board (content wrapping, column layout, reaction-picker positioning, componentization). This feature performs the same deep, from-scratch visual redesign already given to the dashboard (031) and landing page (029), superseding feature 028's lighter touch on this specific surface.
- This is a presentation-layer redesign of already-functional capabilities. No new functional capability, backend/API change, or change to real-time synchronization architecture is introduced; only the visual layout, spacing, typography, color, visual hierarchy, materials/depth, and motion/animation are in scope, per FR-017.
- Both currently supported locales (English, Spanish) and both themes (light, dark) continue to be supported; no new locale or theme is introduced.
- The existing WCAG 2.1 AA accessibility bar and the existing internationalization system remain the source of truth; where a new design direction would conflict with either, the design MUST be adjusted to keep both intact rather than the reverse.
- The specific presentation mechanism for columns, cards, and menus (e.g. exact grid structure, whether menus remain dropdowns vs. a different overlay pattern) is a UI design decision left to the design-exploration process, as long as every capability in FR-002 through FR-011 remains available and reachable.
- Findings that would require a larger structural redesign (rethinking an entire flow, not just its presentation) or are low priority may be documented and deferred to a future initiative instead of remediated now, keeping this pass bounded.
- Existing automated test coverage for the board's functional behavior (unit, architecture, and E2E) will be preserved or updated in place rather than deleted, per FR-019.
- All design and motion decisions in this initiative are made using the project's mandated Apple-inspired design skill package, per the project constitution — this is a process requirement of how the work is carried out, not a change to the product's own capabilities.
