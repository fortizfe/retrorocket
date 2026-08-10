# Feature Specification: Card Color Picker Redesign (Apple HIG-Inspired)

**Feature Branch**: `037-card-color-picker-redesign`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "Vamos a seguir con el rediseño al estilo de apple. Ahora quiero rediseñar el control de paleta de colores que aparece en cada tarjeta y que permite seleccionar un color para la misma. Quiero que apliques los principios de diseño de apple (https://developer.apple.com/design/human-interface-guidelines/design-principles) y que uses las skills de claude para diseño basadas en apple como hasta ahora. Tienes libertad total para diseñar la UX. Ten en cuenta que para seleccionar una de las 3 opciones debes hacer un artefacto para poder verlo."

## Clarifications

### Session 2026-08-10

- Q: The picker currently offers 30 predefined pastel colors (each with its own name and value). Is reviewing/curating that color catalog in scope for this redesign, or must it stay exactly as-is (same colors, same values) with only the presentation changing? → A: Curating/reducing/reorganizing the catalog is in scope. The exact resulting set of colors (count, names, groupings) is a design decision left to the exploration process (see FR-014), as long as a clear neutral/default option is preserved.
- Q: The control today only appears on hover over the card (or on keyboard focus), with no touch equivalent — on phones/tablets there is no hover gesture, so the picker is effectively unreachable on touch devices. Should this redesign introduce genuine touch reachability, matching how mobile reachability was added for the options/facilitator menus in feature 036? → A: Yes. This redesign introduces an explicit, touch-reachable way to open the color picker, as a scoped exception to the otherwise presentation-layer-only nature of this initiative (see FR-011a).
- Q: When catalog curation (FR-013) removes or renames a color already applied to existing cards, how should those existing cards' color values be handled? → A: Remap removed/renamed colors to the closest equivalent color in the new catalog (silent migration); no legacy/orphaned color values remain in use after the redesign ships.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Change an Existing Card's Color (Priority: P1)

As a participant who can edit a card, I want to open a clear, easy-to-scan color picker from the card and pick a new color for it, presented through a modern, HIG-aligned control, so that I can categorize or highlight my card quickly without hunting through a cluttered or cramped swatch grid.

**Why this priority**: Changing a card's color is the single capability this control exists for, and it is exercised on every card a participant is allowed to edit throughout a session, making it the most fundamental and most frequently used path in scope.

**Independent Test**: As a participant with edit rights on a card, open its color picker, browse the available colors, select one, and confirm the card immediately reflects the new color and the picker closes. Repeat with a different color to confirm the previously selected color is no longer marked as selected.

**Acceptance Scenarios**:

1. **Given** a card the participant can edit, **When** they open its color picker, **Then** a clearly legible panel appears anchored to its trigger, showing the available colors without a visible flash or reposition, and the color currently applied to the card is unambiguously marked.
2. **Given** the color picker is open, **When** the participant selects a color, **Then** the card updates to that color immediately, the picker closes, and the change is visible in real time to every other participant on the board.
3. **Given** the color picker is open, **When** the participant presses Escape or clicks/taps outside it, **Then** it closes without changing the card's color.
4. **Given** a participant without edit rights on a card, **When** they view that card, **Then** no color picker trigger is offered for it.

---

### User Story 2 - Reach the Color Picker on a Touch Device (Priority: P2)

As a participant using a phone or tablet, I want a way to open a card's color picker that does not depend on hovering with a mouse, so that I can change a card's color from my device the same as anyone using a desktop can.

**Why this priority**: This closes a genuine, previously-unaddressed gap — today the trigger is only revealed on hover, making it unreachable on touch — and without it, every other improvement in this redesign remains invisible to touch users.

**Independent Test**: On a touch/narrow-viewport device (or its emulation), locate and open a card's color picker without performing a hover gesture, select a color, and confirm the same outcome as the desktop flow (User Story 1) is achieved.

**Acceptance Scenarios**:

1. **Given** a card the participant can edit, viewed on a touch device, **When** the participant looks for a way to change its color, **Then** a touch-reachable entry point to the color picker is present and discoverable, distinct from — but not required to depend on — the desktop hover-revealed trigger.
2. **Given** the color picker opened via the touch entry point, **When** the participant taps a color, **Then** the card updates to that color and the picker closes, matching the desktop behavior in User Story 1.
3. **Given** the color picker opened via the touch entry point, **When** the participant taps outside it, **Then** it closes without changing the card's color.

---

### User Story 3 - Choose a Color While Creating a New Card (Priority: P3)

As a participant adding a new card to a column, I want the same redesigned color picker available in the add-card form, so that I can set the card's color before it is even created, with the same clarity and ease as changing an existing card's color.

**Why this priority**: Creating a card is a slightly less frequent action than re-coloring existing ones over the life of a session, and it reuses the same control, but it is still a distinct, everyday entry point that must not be left inconsistent with Story 1.

**Independent Test**: As a participant with permission to add a card to a column, open the add-card form's color picker, select a color other than the default, and submit the card. Confirm the new card is created with the selected color.

**Acceptance Scenarios**:

1. **Given** the add-card form is open, **When** the participant opens its color picker, **Then** the same redesigned panel and interaction from User Story 1 is presented, with the form's current default/neutral color unambiguously marked as selected.
2. **Given** the add-card form's color picker is open, **When** the participant selects a color, **Then** the form reflects that choice, and submitting the card creates it with that color.

---

### User Story 4 - Quickly Find the Right Color in the Catalog (Priority: P4)

As a participant opening the color picker, I want the available colors organized and presented so that I can visually scan and find the one I want quickly, even though there are many options, so that picking a color never feels like a chore.

**Why this priority**: This is what most directly benefits from the catalog curation now in scope (see Clarifications); it depends on Stories 1-3 already presenting a working picker, and elevates that picker from merely functional to genuinely fast to use.

**Independent Test**: As a participant, open the color picker and, without prior familiarity, locate and select a specific named color within a few seconds, relying on the picker's organization/grouping and visual scannability rather than trial and error.

**Acceptance Scenarios**:

1. **Given** the color picker is open, **When** the participant scans it, **Then** the available colors are presented in a way that remains visually scannable and uncluttered regardless of the total number of colors in the curated catalog.
2. **Given** the color picker is open, **When** the participant hovers, focuses, or long-presses a color, **Then** enough information (at minimum its name) is available to distinguish it from visually similar neighbors.

---

### User Story 5 - Consistent, Accessible Experience for Every Participant (Priority: P5)

As a participant on any device, theme, language, or motion preference, I want the redesigned color picker to remain fully legible, operable, and coherent, so that the experience works for me the same as it does for anyone else in the session.

**Why this priority**: This is a cross-cutting quality bar rather than a distinct journey; it depends on Stories 1-4 already being implemented and is validated across all of them.

**Independent Test**: Open the color picker (from an existing card and from the add-card form) on narrow mobile and ultra-wide desktop viewports, in both light and dark themes, in both supported languages, and with reduced motion enabled. Every capability from Stories 1-4 remains available, legible, and operable via keyboard, mouse, and touch in every combination.

**Acceptance Scenarios**:

1. **Given** the color picker in light or dark theme, **When** a participant views any of its states (closed, opening, populated, selected, disabled), **Then** it remains legible and meets WCAG 2.1 AA contrast and focus-visibility requirements.
2. **Given** a participant has enabled a reduced-motion preference, **When** they open, browse, or close the color picker, **Then** every interaction still completes and communicates its result without relying on that motion.
3. **Given** the color picker is viewed in either supported locale (English or Spanish), **When** it renders, **Then** all text (including any color names) renders in that locale, and differing text lengths do not break the layout.
4. **Given** narrow mobile or ultra-wide desktop viewports, **When** a participant looks for the color picker, **Then** it remains fully legible and every color option remains reachable via keyboard, mouse, and touch at every viewport size.

---

### Edge Cases

- What happens when a card has no color explicitly chosen yet? The picker clearly marks the neutral/default color as the current selection, distinct from an "unset" or broken-looking state.
- What happens when the color picker is opened on a card that is simultaneously being re-colored by another participant in real time? The picker reflects the color that ultimately wins on the shared card without leaving a stale selection marked.
- What happens when a participant loses edit rights on a card while its color picker is open (e.g., role or ownership changes mid-session)? The picker no longer allows a color to be applied once permission is lost.
- What happens when translated color names vary significantly in length between English and Spanish? The layout does not break or truncate meaningfully important content.
- What happens when a participant has `prefers-reduced-motion` enabled? Opening/closing the picker and any hover/selection feedback remain fully usable without relying on animation.
- What happens on very small (narrow mobile) and very large (ultra-wide desktop) viewports? The picker remains legible and every color remains reachable without depending on mouse hover, including via the new touch entry point introduced by FR-011a where none existed before.
- What happens to the drag handle and other card controls that currently sit next to the color picker trigger once a touch entry point is introduced? They remain reachable and are not visually crowded out by the new touch affordance; the design-exploration process (FR-014) determines the minimal coherent layout.
- What happens if the catalog curation (per the Clarifications) changes the value or name of a color already applied to existing cards? Every such card is silently remapped to the closest equivalent color in the new catalog; no card is left showing a broken or blank swatch, and no orphaned/legacy color value remains in use as a result of the curation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The color picker control (its trigger and its color-selection panel) MUST present a completely redesigned visual layout and look-and-feel built on Apple Human Interface Guidelines design principles (clarity, deference, depth) as applied through the project's mandated Apple-design skill package, replacing rather than merely tweaking the current visual treatment.
- **FR-002**: The redesign MUST preserve the core capability of selecting a color for a card: opening the picker, browsing the available colors, and applying a chosen color, with the change reflected on the card immediately and synchronized in real time to every other participant.
- **FR-003**: The redesign MUST preserve the picker's availability in both places it appears today: on an existing card (for participants with edit rights on that card) and in the add-card form (for participants adding a new card to a column).
- **FR-004**: The redesign MUST preserve the picker's edit-rights gating: no card's color picker may be opened or used to change that card's color by a participant who lacks edit rights on it.
- **FR-005**: The redesigned panel MUST unambiguously indicate which color is currently applied (or, for the add-card form, currently chosen) whenever the picker is open.
- **FR-006**: The redesigned panel MUST provide enough information (at minimum each color's name) to distinguish visually similar colors from one another.
- **FR-007**: The picker MUST remain reachable and operable via keyboard (including arrow-key or equivalent navigation among color options and Escape to close) and via mouse, without depending on mouse hover, and MUST be dismissible via Escape and outside click.
- **FR-008**: All visible text in the picker (including color names) MUST continue to be sourced from the existing translation system for both currently supported locales (English, Spanish); no hardcoded user-facing strings may be introduced.
- **FR-009**: The redesigned picker MUST independently satisfy WCAG 2.1 AA (contrast, visible focus, no color-only meaning, full keyboard operability) in both the light and dark themes, across all its states (closed, opening, populated, selected, disabled).
- **FR-010**: Any motion or animation introduced in the redesign (panel open/close, hover/selection feedback) MUST honor a visitor's reduced-motion preference and MUST be arrived at through the constitution's mandated design/motion decision process rather than ad hoc choices.
- **FR-011**: The redesigned picker MUST remain fully responsive and usable across mobile, tablet, and desktop viewport sizes (see FR-011a for what "usable on mobile/touch" specifically requires, since no touch entry point exists today).
- **FR-011a**: Because the picker's only trigger today is revealed by mouse hover (with keyboard focus as the sole existing alternative), and no touch-usable entry point exists, the redesign MUST introduce a new, touch-reachable way to open the picker on both an existing card and the add-card form, exercising the same underlying capability as FR-002. The specific touch entry-point mechanism is a design decision left to the FR-014 exploration process.
- **FR-012**: The redesign MUST preserve a clear neutral/default color option, matching the existing behavior where a card with no color explicitly chosen is presented in that neutral state.
- **FR-013**: The redesign MAY curate, reduce, reorganize, rename, or regroup the catalog of selectable colors from its current 30 options, provided every existing card continues to render a valid, recognizable color after the change (no card is left with a broken or blank color as a result of the curation).
- **FR-013a**: Any color removed or renamed by the FR-013 curation MUST be remapped, for every card currently using it, to the closest equivalent color in the new catalog; no card may retain or fall back to an orphaned/legacy color value that is no longer part of the curated catalog.
- **FR-014**: Before a final visual direction is committed to, at least 2-3 genuinely distinct visual directions for the color picker (covering both its trigger and its selection panel, and reflecting whatever catalog organization is proposed) MUST be explored and compared, per the constitution's mandated design-exploration process, and presented to the product owner as a reviewable artifact (including visual captures of each direction in both themes) rather than proceeding directly from a single first draft. The product owner MUST review the explored directions and approve the one that ships.
- **FR-015**: The redesign is presentation-and-catalog-layer only, with one further explicit exception beyond catalog curation (FR-011a's new touch entry point): the underlying mechanism by which a color change is saved and synchronized in real time MUST NOT be altered by this initiative.
- **FR-016**: Existing automated tests that assert functional behavior of the color picker (unit/component tests and any relevant WCAG 2.1 AA/Playwright E2E coverage) MUST continue to pass, updated only to the extent needed to reflect intentional structural or catalog changes, with no net loss of coverage for the behaviors protected by FR-002 through FR-007.

### Key Entities

- **Color Picker Control**: The per-card control (trigger plus selection panel) that lets a participant with edit rights view and change a card's color; also embedded in the add-card form.
- **Color Catalog**: The full set of selectable colors offered by the picker, each with a name and a visual identity; subject to curation, reduction, or reorganization under FR-013, with any removed/renamed color remapped to its closest equivalent for existing cards under FR-013a.
- **Card Color**: The color currently applied to a specific card (or chosen in the add-card form before creation), synchronized in real time across participants.
- **Neutral/Default Color**: The color a card is presented in when no color has been explicitly chosen, preserved as a distinct, unambiguous option under FR-012.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the existing color-picker capability (open, browse, select, apply, with real-time sync to other participants, and edit-rights gating) completes with the same functional outcome as before the redesign on both an existing card and the add-card form, verified through automated unit and end-to-end tests.
- **SC-002**: The redesigned picker achieves zero WCAG 2.1 AA violations across all its states (closed, opening, populated, selected, disabled) in both light and dark themes.
- **SC-003**: 100% of the picker's color options are operable via keyboard, mouse, and touch, with no reliance on mouse hover, verified through automated testing.
- **SC-004**: On a narrow mobile/touch viewport, where the picker is unreachable today, 100% of the color-selection capability in FR-002 becomes reachable and completable through the new touch entry point (FR-011a), verified through automated testing at a mobile viewport size.
- **SC-005**: A structured design review of the redesigned picker against Apple Human Interface Guidelines principles (clarity, deference, depth), conducted using the project's mandated design-skill process, closes with zero unresolved high-priority findings.
- **SC-006**: The product owner personally reviews the 2-3 explored visual directions for the picker and confirms the chosen one is perceived as clearer and faster to scan than the version it replaces, with no requested reversion to the prior visual treatment.
- **SC-007**: Participants can locate the color picker and apply a color to a card without hesitation or repeated attempts, on both desktop and touch devices, verified through a usability walkthrough.
- **SC-008**: Every card that had a color applied before the redesign continues to render a valid, recognizable color after any catalog curation from FR-013, with zero cards left showing a broken or blank swatch and zero cards left referencing an orphaned/legacy color value, verified through automated migration testing.

## Assumptions

- Scope for this initiative is the color picker control and the color catalog it presents, wherever the control appears: on an existing retrospective card (for participants with edit rights) and in the add-card form — across both the light and dark themes and both currently supported locales, including the picker's closed, opening, populated, selected, and disabled states.
- The rest of each card (content, voting, reactions, the card's own "..." menu, drag-and-drop) and the rest of the add-card form were already covered by prior redesign work (or remain out of scope here); this initiative touches only the color picker itself.
- This is primarily a presentation-layer redesign of an already-functional capability, with two scoped exceptions: catalog curation (FR-013) and a new touch entry point (FR-011a). Outside those exceptions, no change is introduced to how a color selection is persisted or synchronized in real time.
- Both currently supported locales (English, Spanish) and both themes (light, dark) continue to be supported; no new locale or theme is introduced.
- The existing WCAG 2.1 AA accessibility bar and the existing internationalization system remain the source of truth; where a new design direction would conflict with either, the design MUST be adjusted to keep both intact rather than the reverse.
- The specific presentation mechanism for the picker (e.g., an anchored popover vs. a different overlay pattern) and the specific touch entry-point mechanism (FR-011a) are UI design decisions left to the design-exploration process, as long as every capability in FR-002 through FR-007 remains available and reachable.
- The final composition of the color catalog (how many colors, their names, and any grouping) is a design decision made during the FR-014 exploration process and confirmed with the product owner, provided a neutral/default option (FR-012) is preserved and every existing card is remapped to a valid, non-orphaned color (FR-013a) rather than left broken.
- All design and motion decisions in this initiative are made using the project's mandated Apple-inspired design skill package, per the project constitution — this is a process requirement of how the work is carried out, not a change to the product's own capabilities beyond what FR-013 and FR-011a explicitly scope in.
