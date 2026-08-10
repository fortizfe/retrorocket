# Feature Specification: Options Menu & Facilitator Menu Redesign (Apple HIG-Inspired)

**Feature Branch**: `036-options-facilitator-menus`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "Quiero seguir con el rediseño al estilo apple que estamos haciendo para la app. Ahora quiero que nos centremos en rediseñar el menú de opciones y el menú de facilitador. Quiero que apliques los principios de diseño de apple (https://developer.apple.com/design/human-interface-guidelines/design-principles) y que uses las skills de claude basadas en apple que tenemos instaladas. El objetivo es rediseñar por completo los dos menús mencionados y todas las opciones que cuelgan de ambos. Tienes libertad total para proponer los diseños que consideres para mejorar la UX. Recuerda que debes mostrarme las opciones a elegir como un artefacto con capturas y demás."

## Clarifications

### Session 2026-08-10

- Q: Both menus (options and facilitator) are currently rendered inside `RetrospectiveTopbar`, which is entirely `hidden` below the `md` breakpoint (~768px) — there is no mobile equivalent anywhere in the codebase today, so neither menu is reachable on a phone at all. Should this redesign introduce genuine mobile reachability for the first time, or stay scoped to redesigning what already exists (desktop/tablet)? → A: Add mobile reachability. This redesign introduces a new, mobile-accessible entry point for both menus (design left to the exploration process in FR-015) as an explicit, scoped exception to the otherwise presentation-layer-only nature of this initiative (see FR-013a, FR-014).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Use the Board's Options Menu (Priority: P1)

As any participant on a retrospective board, I want a clear, easy-to-scan options menu for exporting the board, copying its ID, sharing a link, and exiting to my dashboard, presented through a modern, HIG-aligned interface, so that these end-of-session and utility actions are fast and unambiguous no matter who I am on the board.

**Why this priority**: Every participant on every board can reach this menu, and it's the most frequently opened of the two menus (used by owners and non-owners alike), making it the most broadly exercised surface in scope.

**Independent Test**: As any participant (owner or non-owner) on an open board, open the options menu, open the export popover from it, copy the board ID, copy/share the board link, and exit back to the dashboard. Confirm every action is available and produces its expected outcome (clipboard copy confirmation, export popover opening, navigation to dashboard) regardless of role.

**Acceptance Scenarios**:

1. **Given** an open board, **When** any participant opens the options menu, **Then** a clearly legible panel appears anchored to its trigger, listing export, copy ID, share, and exit, without a visible flash or reposition.
2. **Given** the options menu is open, **When** a participant selects export, **Then** the export popover opens with its existing format choices and progress/success/error feedback preserved.
3. **Given** the options menu is open, **When** a participant selects copy ID or share, **Then** the corresponding value is copied to the clipboard and a clear confirmation is shown.
4. **Given** the options menu is open, **When** a participant selects exit, **Then** they are navigated back to their dashboard.
5. **Given** the options menu is open, **When** a participant presses Escape or clicks outside it, **Then** it closes without side effects.

---

### User Story 2 - Run the Session as Facilitator: Timer & Board Controls (Priority: P2)

As the board's owner, I want the facilitator menu's controls to let me manage the countdown timer (create, start, pause, reset, delete, quick presets) and toggle the action items column, presented clearly and without ambiguity, so that I can pace and configure a live session confidently while everyone else's attention is on the board.

**Why this priority**: Timer and column controls are the facilitator capability exercised in nearly every session (session pacing is used far more often than the other facilitator tabs), and they are visible in real time to every other participant, so clarity here has the widest downstream impact.

**Independent Test**: As the board owner, open the facilitator menu (defaulting to its controls tab), create a timer with a custom duration or a quick preset, start it, pause it, reset it, and delete it, observing the live status (progress, remaining/total time, state) update correctly; toggle the action items column on and off. As a non-owner, confirm the facilitator menu is not offered at all.

**Acceptance Scenarios**:

1. **Given** the board owner opens the facilitator menu, **When** it opens, **Then** the controls tab is active by default, its tab identity is unambiguous among the other tabs, and the panel is reachable via keyboard (arrow-key tab navigation, Escape to close).
2. **Given** the controls tab, **When** the owner creates, starts, pauses, resets, or deletes the countdown timer (via custom duration or a quick preset), **Then** the timer's live status is clearly reflected in the panel and updates in real time for every other participant on the board.
3. **Given** the controls tab, **When** the owner toggles the action items column, **Then** the board reflects the toggle immediately.
4. **Given** a participant who is not the board owner, **When** they view the board, **Then** the facilitator menu trigger is not present for them at all.

---

### User Story 3 - Read Sentiment & Team Mood as Facilitator (Priority: P3)

As the board owner, I want the facilitator menu's sentiment and team mood tabs to present configuration and live analysis clearly, so that I can understand the emotional pulse of the session and adjust analysis settings without hunting through cramped or unclear controls.

**Why this priority**: Sentiment configuration and the team mood dashboard are used less continuously than timer controls (typically set up once, then glanced at occasionally), placing this after the higher-frequency Story 2 while still being a distinct, clearly bounded piece of facilitator functionality.

**Independent Test**: As the board owner, open the sentiment tab, enable/disable sentiment analysis, change the model selection, pause analysis, expand advanced settings (confidence threshold, batch size, auto-analysis toggle), and observe any error state rendered clearly; open the team mood tab and confirm its disabled/initializing/live states are each legible and distinguishable.

**Acceptance Scenarios**:

1. **Given** the sentiment tab, **When** the owner enables or disables sentiment analysis, changes the model, or pauses analysis, **Then** the current state is unambiguous at a glance, including when an error occurs.
2. **Given** the sentiment tab, **When** the owner expands advanced settings, **Then** the confidence threshold, batch size, and auto-analysis controls are presented clearly and their current values are legible.
3. **Given** the team mood tab, **When** sentiment analysis is disabled, initializing, or actively producing a report, **Then** each of those three states is presented distinctly and legibly, with no ambiguity about which state is current.

---

### User Story 4 - Keep Private Facilitator Notes (Priority: P4)

As the board owner, I want to add, edit, and delete my own private facilitator notes through a clear, focused interface, so that I can capture observations during a session with confidence that only I can see them.

**Why this priority**: Notes are the least frequently exercised facilitator tab (an optional, personal capture tool rather than a control every session depends on), making it the lowest-priority piece of functionality still fully in scope.

**Independent Test**: As the board owner, open the notes tab, add a new note, edit an existing note, and delete a note (confirming the delete). Confirm no other participant, including a co-owner scenario if applicable, can see these notes.

**Acceptance Scenarios**:

1. **Given** the notes tab, **When** the owner adds a note, **Then** it is saved and appears in their notes list, visible only to them.
2. **Given** an existing note, **When** the owner edits it, **Then** the updated content is saved and reflected.
3. **Given** an existing note, **When** the owner deletes it, **Then** they are asked to confirm, and upon confirming the note is removed.

---

### User Story 5 - Consistent, Accessible Experience for Every Participant (Priority: P5)

As a participant on any device, theme, language, or motion preference, I want the redesigned options menu and facilitator menu to remain fully legible, operable, and coherent, so that the experience works for me the same as it does for anyone else in the session.

**Why this priority**: This is a cross-cutting quality bar rather than a distinct journey; it depends on Stories 1-4 already being implemented and is validated across all of them.

**Independent Test**: Open both menus (as owner, for the facilitator menu) on narrow mobile and ultra-wide desktop viewports, in both light and dark themes, in both supported languages, and with reduced motion enabled. Every capability from Stories 1-4 remains available, legible, and operable via keyboard and touch in every combination.

**Acceptance Scenarios**:

1. **Given** either menu in light or dark theme, **When** a participant views any of its states (closed, opening, populated, empty/placeholder, error), **Then** it remains legible and meets WCAG 2.1 AA contrast and focus-visibility requirements.
2. **Given** a participant has enabled a reduced-motion preference, **When** they open, navigate within, or close either menu, **Then** every interaction still completes and communicates its result without relying on that motion.
3. **Given** either menu is viewed in either supported locale (English or Spanish), **When** it renders, **Then** all text renders in that locale, and differing text lengths do not break the layout.
4. **Given** narrow mobile or ultra-wide desktop viewports, **When** a participant looks for either menu, **Then** a way to open it is present and reachable via touch and keyboard at every viewport size (per FR-013a on mobile, where no such entry point exists today), and once opened it remains fully legible and every option/tab/control within it remains reachable.

---

### Edge Cases

- What happens when the options menu is opened while an export is already in progress? The menu and export popover reflect the in-progress state rather than allowing a conflicting duplicate action.
- What happens when the facilitator menu is opened by the owner while no countdown timer exists yet? The controls tab offers a clear way to create one, distinct from the running/paused/finished states.
- What happens when sentiment analysis is disabled? The sentiment tab's controls and the team mood tab both present an unambiguous disabled state rather than an empty or broken-looking panel.
- What happens when a facilitator note list is empty? A clear empty state invites adding the first note, distinct from a loading state.
- What happens when a non-owner participant is on the board? The facilitator menu trigger is entirely absent for them (not present-but-disabled), and no facilitator-only action becomes reachable through any other path.
- What happens when translated text (English vs. Spanish) varies significantly in length for menu labels, tab names, or status text? The layout does not break or truncate meaningfully important content.
- What happens when a participant has `prefers-reduced-motion` enabled? Opening/closing either menu and switching facilitator tabs remain fully usable without relying on animation.
- What happens on very small (narrow mobile) and very large (ultra-wide desktop) viewports? Both menus remain legible and every option/tab remains reachable without depending on mouse hover, including via the new mobile entry point introduced by FR-013a where none existed before.
- What happens to the rest of the topbar (board title, live participant display, countdown timer display) on mobile once a menu entry point is introduced there? It is out of scope to redesign those elements' own mobile presentation beyond what is needed to fit the new menu entry point(s) alongside them; the design-exploration process (FR-015) determines the minimal coherent layout.
- What happens when an underlying action is already a known non-functional placeholder in the current implementation (e.g. a stubbed "reanalyze" action)? The redesign preserves existing behavior faithfully; fixing the placeholder's underlying function is out of scope for this presentation-layer initiative.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The options menu (its trigger and panel) and the facilitator menu (its trigger, panel, and all four tabs — controls, sentiment, team mood, notes) MUST present a completely redesigned visual layout and look-and-feel built on Apple Human Interface Guidelines design principles (clarity, deference, depth) as applied through the project's mandated Apple-design skill package, replacing rather than merely tweaking the current visual treatment.
- **FR-002**: The redesign MUST preserve every options menu capability available to any participant regardless of role: opening the export popover, copying the board ID, copying/sharing a direct board link, and exiting to the dashboard.
- **FR-003**: The redesign MUST preserve the facilitator menu's strict owner-only gating: its trigger and panel MUST remain entirely absent (not present-but-disabled) for any participant who is not the board's owner.
- **FR-004**: The redesign MUST preserve the controls tab's capabilities: toggling the action items column, and creating, starting, pausing, resetting, and deleting the countdown timer (including quick-duration presets), with its live status (progress, remaining/total time, run state) clearly reflected.
- **FR-005**: The redesign MUST preserve the sentiment tab's capabilities: enabling/disabling sentiment analysis, selecting the analysis model, pausing analysis, and — via an expandable advanced-settings area — adjusting the confidence threshold, batch size, and auto-analysis toggle, including a clear error state.
- **FR-006**: The redesign MUST preserve the team mood tab's read-only dashboard, including its distinct disabled, initializing, and live-report states.
- **FR-007**: The redesign MUST preserve the notes tab's capabilities: adding, editing, and deleting a private facilitator note (with delete confirmation), visible only to the facilitator who authored it.
- **FR-008**: The facilitator menu's tab navigation MUST remain a genuine, accessible tab pattern (correct roles/names, arrow-key navigation between tabs) with the controls tab active by default.
- **FR-009**: Both menus MUST remain reachable and operable via keyboard and via touch, without depending on mouse hover, and MUST be dismissible via Escape and outside-click.
- **FR-010**: All visible text in both menus and their tabs MUST continue to be sourced from the existing translation system for both currently supported locales (English, Spanish); no hardcoded user-facing strings may be introduced.
- **FR-011**: The redesigned menus MUST independently satisfy WCAG 2.1 AA (contrast, visible focus, no color-only meaning, full keyboard operability) in both the light and dark themes, across all their states (closed, opening, populated, empty/placeholder, error).
- **FR-012**: Any motion or animation introduced in the redesign (menu open/close, tab switching, status transitions) MUST honor a visitor's reduced-motion preference and MUST be arrived at through the constitution's mandated design/motion decision process rather than ad hoc choices.
- **FR-013**: Both redesigned menus MUST remain fully responsive and usable across mobile, tablet, and desktop viewport sizes (see FR-013a for what "usable on mobile" specifically requires, since no mobile entry point exists today).
- **FR-013a**: Because neither menu has any mobile-reachable entry point today (the topbar that hosts both triggers is hidden below the `md`/~768px breakpoint), the redesign MUST introduce a new, mobile-accessible way to open each menu (options menu for any participant; facilitator menu for the owner only, subject to FR-003's gating), exercising the same underlying capabilities as FR-002 and FR-004 through FR-007. The specific mobile entry-point mechanism is a design decision left to the FR-015 exploration process.
- **FR-014**: The redesign is presentation-layer only, with one explicit exception (FR-013a's new mobile entry point): the underlying behavior of the countdown timer, sentiment analysis, team mood computation, facilitator notes storage, export, and the real-time synchronization of any of these MUST NOT be altered by this initiative, including any currently non-functional placeholder actions, which MUST be preserved as-is rather than fixed or removed.
- **FR-015**: Before a final visual direction is committed to, at least 2-3 genuinely distinct visual directions for both menus MUST be explored and compared, per the constitution's mandated design-exploration process, and presented to the product owner as a reviewable artifact (including visual captures of each direction in both themes) rather than proceeding directly from a single first draft. The product owner MUST review the explored directions and approve the one that ships.
- **FR-016**: Existing automated tests that assert functional behavior of either menu (unit/component tests and any relevant WCAG 2.1 AA/Playwright E2E coverage) MUST continue to pass, updated only to the extent needed to reflect intentional structural changes, with no net loss of coverage for the behaviors protected by FR-002 through FR-008.

### Key Entities

- **Options Menu**: The board-wide menu offering export, copy ID, share, and exit; reachable by every participant regardless of role.
- **Facilitator Menu**: The owner-only menu containing the controls, sentiment, team mood, and notes tabs; entirely absent for non-owners.
- **Countdown Timer**: The session-pacing timer configured and controlled from the controls tab, visible in real time to all participants.
- **Sentiment Configuration**: The enable/disable state, selected model, and advanced analysis settings (confidence threshold, batch size, auto-analysis) managed from the sentiment tab.
- **Team Mood Report**: The read-only, live-updating summary of session sentiment shown in the team mood tab.
- **Facilitator Note**: A private, timestamped note authored by the board owner, visible only to its author.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of existing options-menu and facilitator-menu capabilities (export, copy ID, share, exit; timer create/start/pause/reset/delete and presets; action-column toggle; sentiment enable/disable/model/pause/advanced-settings; team mood states; notes add/edit/delete) complete with the same functional outcome as before the redesign, verified through automated unit and end-to-end tests.
- **SC-002**: The redesigned menus achieve zero WCAG 2.1 AA violations across all their states (closed, opening, populated, empty/placeholder, error) in both light and dark themes.
- **SC-003**: 100% of both menus' options, tabs, and controls are operable via keyboard and via touch, with no reliance on mouse hover, verified through automated testing.
- **SC-004**: The facilitator menu's owner-only gating is verified with zero exceptions: its trigger and panel are absent for a non-owner in 100% of tested scenarios.
- **SC-005**: A structured design review of both redesigned menus against Apple Human Interface Guidelines principles (clarity, deference, depth), conducted using the project's mandated design-skill process, closes with zero unresolved high-priority findings.
- **SC-006**: The product owner personally reviews the 2-3 explored visual directions for both menus and confirms the chosen one is perceived as clearer and more modern than the version it replaces, with no requested reversion to the prior visual treatment.
- **SC-007**: Participants (owner and non-owner) can locate and complete a routine options-menu action (export, copy ID, share, or exit) without hesitation or repeated attempts, and the board owner can locate and start the countdown timer from the facilitator menu equally directly, each verified through a usability walkthrough.
- **SC-008**: On a narrow mobile viewport, where neither menu is reachable today, 100% of the capabilities in FR-002 and FR-004 through FR-007 become reachable and completable through the new mobile entry point (FR-013a), verified through automated testing at a mobile viewport size.

## Assumptions

- Scope for this initiative is exactly the two menus named and everything rendered within them: the options menu (export trigger, copy ID, share, exit) and the facilitator menu with all four of its tabs (controls — including the countdown timer and action-column toggle, sentiment, team mood, notes) — across both the light and dark themes and both currently supported locales, including each surface's closed, opening, populated, empty/placeholder, and error states.
- The export popover's own internal redesign, the retrospective board's cards/columns/drag-and-drop, the card menu, the column header menu, and the reaction picker were already redesigned under feature 033 and are out of scope here except where the options menu directly triggers the export popover's opening.
- This is a presentation-layer redesign of already-functional capabilities, with one scoped exception: a new mobile entry point for both menus (FR-013a), since none exists today. Outside that exception, no new functional capability, backend/API change, or change to real-time synchronization architecture is introduced; only the visual layout, spacing, typography, color, visual hierarchy, materials/depth, and motion/animation are in scope, per FR-014.
- Both currently supported locales (English, Spanish) and both themes (light, dark) continue to be supported; no new locale or theme is introduced.
- The existing WCAG 2.1 AA accessibility bar and the existing internationalization system remain the source of truth; where a new design direction would conflict with either, the design MUST be adjusted to keep both intact rather than the reverse.
- The specific presentation mechanism for either menu (e.g. whether it remains an anchored dropdown/panel vs. a different overlay pattern such as a sheet) is a UI design decision left to the design-exploration process, as long as every capability in FR-002 through FR-008 remains available and reachable.
- Known pre-existing non-functional placeholders within these menus (e.g. a stubbed "reanalyze" action, an unused notes-count badge slot) are preserved as-is; fixing their underlying behavior is a separate initiative, not this one.
- All design and motion decisions in this initiative are made using the project's mandated Apple-inspired design skill package, per the project constitution — this is a process requirement of how the work is carried out, not a change to the product's own capabilities.
