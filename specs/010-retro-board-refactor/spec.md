# Feature Specification: Retrospective Board Refactor & Layout Fixes

**Feature Branch**: `010-retro-board-refactor`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Quiero analizar y refactorizar la app para ajustarse a library first y todos los demás requisitos de la constitución. Para no hacer toda la app de golpe, vamos a empezar por trabajar en ajustar bien el tablero de retrospectiva. Quiero que revises el estado actual y refactorices lo que sea necesario. Quiero que se componetice todo lo que pueda ser componetizado. Quiero mejorar la fluidez del diálogo que muestra los emojis, actualmente aparece desde arriba en vez de directamente en el sitio correcto. También quiero que las tarjetas hagan text wrapping. Actualmente con links con palabras largas se produce overflow. Y quiero que las columnas ocupen su espacio sin generar scroll horizontal. Siéntete libre de proponer otros cambios si tras analizarlo lo consideras oportuno."

## Overview

The retrospective board is the core surface of RetroRocket where a team creates,
organizes, votes on, and reacts to cards during a retrospective. Its current
implementation has accumulated layout defects and structural debt that reduce
both the participant experience and the maintainability of the code. This
feature is the first slice of a broader initiative to bring the application into
full alignment with the project constitution (Library-First, componentization,
internationalization, accessibility, testability), scoped deliberately to the
retrospective board only.

The work combines **user-visible fixes** (card text wrapping, columns that fit
without horizontal scroll, a reaction picker that appears anchored to its
trigger) with **structural refactoring** (breaking oversized components into
focused, independently testable pieces, removing dead code, and eliminating
hardcoded strings and colors) so the board becomes a clean foundation for the
rest of the migration.

## Clarifications

### Session 2026-07-22

- Q: How should the duplication between the active `RetrospectiveBoard` and the unused `EnhancedRetrospectiveBoard` be resolved? → A: Keep and refactor the active `RetrospectiveBoard`; delete the unused `EnhancedRetrospectiveBoard` (its mobile-paging idea may be re-added later only if explicitly wanted).
- Q: Which approach should power the reaction picker's anchored positioning and edge flip/shift? → A: Adopt a proven positioning library (Floating UI / `@floating-ui/react`) rather than hand-rolled math, per Constitution III.
- Q: While the picker is open and the user scrolls the board or resizes the window, what should it do? → A: Reposition to stay anchored to its trigger.
- Q: What sizing rule governs columns fitting without horizontal scroll and the switch to the stacked view? → A: Keep the existing ~1024px (lg) breakpoint; above it all visible columns shrink equally to share the width (drop the hard 320px per-column min); below it columns stack in a single column.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Card content never breaks the layout (Priority: P1)

A participant adds a card whose text contains a very long URL or an
unbroken long word. The card must display the full content wrapped within its
own width; it must not push its column wider, spill outside the card border, or
clip the text.

**Why this priority**: Overflowing cards are the most visible defect and can
break the entire board layout during a live session, directly harming the core
activity. It is also the lowest-risk, highest-value fix.

**Independent Test**: Create cards containing (a) a 200-character URL with no
spaces, (b) a single 80-character word, and (c) normal multi-line text with
manual line breaks. Verify each renders fully inside its card, wraps at the card
boundary, preserves intentional line breaks, and keeps links clickable.

**Acceptance Scenarios**:

1. **Given** a card whose content is a single long URL, **When** the card is
   displayed, **Then** the URL wraps within the card width and remains a
   clickable link, and the card does not grow wider than its column.
2. **Given** a card whose content is a single very long word with no spaces,
   **When** the card is displayed, **Then** the word breaks across lines so no
   text is clipped or overflows the card.
3. **Given** a card whose content includes manual line breaks, **When** the card
   is displayed, **Then** those line breaks are preserved.

---

### User Story 2 - Columns fit the viewport without horizontal scroll (Priority: P1)

A facilitator opens a board with three retrospective columns, and separately a
board that also shows the action-items column (four columns total). In both
cases the columns share the available horizontal space and the board area does
not produce a horizontal scrollbar on a standard desktop width.

**Why this priority**: A horizontal scrollbar on the primary board view forces
constant panning during a session, hides columns, and signals an unpolished
product. It affects every session regardless of card content.

**Independent Test**: Load a board at common desktop widths (e.g. 1280px and
1440px) with 3 columns, then with 4 columns (action column enabled). Confirm no
horizontal scrollbar appears on the board region and each column occupies a fair
share of the width. Repeat on a narrow/mobile width and confirm the intended
responsive behavior (stacked or paged columns) rather than horizontal overflow.

**Acceptance Scenarios**:

1. **Given** a board with three columns on a standard desktop width, **When** it
   renders, **Then** the three columns fill the available width evenly with no
   horizontal scrollbar on the board area.
2. **Given** a board with the action-items column enabled (four columns) on a
   standard desktop width, **When** it renders, **Then** all four columns fit
   the available width with no horizontal scrollbar.
3. **Given** a narrow (mobile) viewport, **When** the board renders, **Then**
   columns adapt responsively (stacked or paged) without forcing horizontal
   scroll of the whole board.

---

### User Story 3 - Reaction picker appears anchored to its trigger (Priority: P2)

A participant clicks the "add reaction" button on a card. The emoji picker
appears smoothly, positioned directly at the button, without first flashing at
the top-left/top of the screen and then jumping into place.

**Why this priority**: The current jump is a noticeable jank on a frequently
used interaction, but it does not block completing the action, so it ranks below
the layout-breaking defects.

**Independent Test**: Open the reaction picker from cards located in different
areas of the board (top, bottom, near screen edges). Verify the picker appears
already positioned at the trigger with no visible flash or repositioning jump,
stays within the viewport, and its open/close animation originates from the
trigger.

**Acceptance Scenarios**:

1. **Given** a card's reaction button, **When** the participant opens the picker,
   **Then** the picker appears already anchored to the button with no visible
   flash or reposition from another location.
2. **Given** a card near the bottom or side edge of the viewport, **When** the
   picker opens, **Then** it stays fully within the viewport (flipping/shifting
   as needed) and remains anchored to its trigger.
3. **Given** an open picker, **When** the participant selects an emoji, presses
   Escape, or clicks outside, **Then** the picker closes smoothly and page
   scroll is restored.

---

### User Story 4 - The board is componentized and constitution-compliant (Priority: P2)

A developer working on the retrospective board finds it composed of small,
focused, independently testable components and modules with clear
responsibilities, no dead/duplicated board implementations, no hardcoded
user-facing strings, and no hardcoded theme colors — so future changes are safe
and localized.

**Why this priority**: This is the strategic goal of the initiative and enables
all future board work, but it is behavior-preserving and less immediately
visible than the P1 defects, so it follows them.

**Independent Test**: Review the board module and confirm: each extracted piece
has a single clear responsibility and its own unit tests; there is exactly one
active board implementation (no unused duplicate); every user-facing string
resolves through the localization layer for all supported locales; and no
component hardcodes palette colors instead of the shared theme tokens. All
existing behavior continues to pass its tests and the coverage floor is
maintained.

**Acceptance Scenarios**:

1. **Given** the retrospective board source, **When** a developer inspects it,
   **Then** oversized multi-responsibility components have been split into
   focused components/hooks each with a single responsibility and dedicated unit
   tests.
2. **Given** the board module, **When** searched for unused implementations,
   **Then** no dead or duplicated board component remains, and the single active
   implementation is the one wired into the page.
3. **Given** the board components, **When** searched for hardcoded user-visible
   text, **Then** none exist — all text resolves through localization keys
   present in every supported locale.
4. **Given** the board components, **When** searched for hardcoded palette
   colors, **Then** none exist — colors come from the shared semantic theme
   tokens and satisfy WCAG 2.1 AA in both light and dark themes.
5. **Given** the refactored board, **When** the full test suite runs, **Then**
   all previously passing behavior still passes and coverage stays at or above
   the configured thresholds.

---

### Edge Cases

- A card that is simultaneously long text **and** contains a long URL must wrap
  both the prose and the link correctly.
- Reaction picker opened from a card at the extreme right/bottom edge must not be
  cut off by the viewport.
- Reaction picker open while the board scrolls or the window resizes must
  reposition to stay anchored to its trigger, never detaching from it.
- Switching between 3-column and 4-column layouts (toggling the action column)
  must not momentarily introduce horizontal scroll.
- Right-to-left and long-translation locales must not reintroduce overflow in
  cards, columns, or the picker.
- Very large numbers of cards in one column must scroll vertically within the
  column, never horizontally at the board level.

## Requirements *(mandatory)*

### Functional Requirements

**Card content rendering**

- **FR-001**: Card content MUST wrap within the card's width, breaking long words
  and long URLs so that no text is clipped and the card never grows wider than
  its column.
- **FR-002**: URLs within card content MUST remain detected and clickable after
  wrapping, opening safely in a new tab.
- **FR-003**: Intentional line breaks in card content MUST be preserved when
  displayed.

**Board and column layout**

- **FR-004**: On standard desktop widths, all visible columns (three columns, and
  four when the action-items column is enabled) MUST share the available
  horizontal space without producing a horizontal scrollbar on the board region.
- **FR-005**: Column width MUST be driven by reliably-applied styling (not by
  build-time-purged dynamically composed class names), so the intended column
  count always renders correctly. Above the ~1024px (lg) breakpoint, all visible
  columns MUST shrink equally to share the available width, without a hard
  per-column minimum width that would force overflow.
- **FR-006**: Below the ~1024px (lg) breakpoint, columns MUST stack into a single
  column instead of forcing horizontal scroll of the whole board (the existing
  breakpoint behavior is retained).
- **FR-007**: Card lists within a column MUST scroll vertically inside the column
  when they exceed its height, and MUST NOT cause horizontal overflow.

**Reaction picker**

- **FR-008**: The reaction picker MUST appear already positioned at its trigger
  button, with no visible flash or reposition from a different screen location.
- **FR-009**: The reaction picker MUST remain fully within the viewport,
  adjusting its placement (flip/shift) when the trigger is near an edge, while
  staying anchored to the trigger. This anchoring MUST be provided by a proven
  positioning library (Floating UI) rather than bespoke positioning math.
- **FR-009a**: While the picker is open, scrolling the board or resizing the
  window MUST reposition the picker so it stays anchored to its trigger (rather
  than detaching or closing).
- **FR-010**: The picker's open/close animation MUST originate from the trigger
  (appear "in place") rather than sliding in from the top or an unrelated origin.
- **FR-011**: The picker MUST close on emoji selection, Escape, or outside click,
  and MUST restore any locked page scroll when it closes.

**Componentization & constitution compliance (scoped to the retrospective board)**

- **FR-012**: Oversized, multi-responsibility board components MUST be decomposed
  into smaller, single-responsibility components and/or hooks, each with a clear
  public interface, following the Library-First and SOLID principles.
- **FR-013**: Every newly extracted component, hook, or module MUST have its own
  unit tests, and overall coverage MUST remain at or above the configured
  thresholds.
- **FR-014**: All retrospective-board components with zero non-test references
  MUST be removed (audit at plan time identified `EnhancedRetrospectiveBoard`,
  `RetrospectiveCard`, and `RetrospectiveColumn`), along with any tests that
  exist only to cover them, leaving the refactored active `RetrospectiveBoard`
  (and its live `GroupableColumn`/`DraggableCard` render path) as the single
  retrospective-board implementation.
- **FR-015**: All user-visible text in the retrospective board MUST resolve
  through the internationalization layer, with corresponding keys present in every
  supported locale; hardcoded display strings MUST be eliminated.
- **FR-016**: All colors in the retrospective board MUST come from the shared
  semantic theme tokens (no hardcoded palette values), and MUST satisfy WCAG 2.1
  AA contrast, focus-visibility, and use-of-color requirements in both light and
  dark themes.
- **FR-017**: The refactor MUST be behavior-preserving except for the explicitly
  specified fixes (card wrapping, column fit, picker positioning); no existing
  board capability may regress.
- **FR-018**: Interactive board elements (cards, voting, reactions, drag & drop)
  MUST remain fully keyboard-operable with correct roles and accessible names.

### Key Entities

- **Retrospective Board**: The overall surface presenting the set of columns for
  a given retrospective session.
- **Column**: A themed container (e.g. "went well", "to improve", action items)
  holding an ordered list of cards, with a header and a create-card affordance.
- **Card**: A participant-authored entry with text content (which may include
  links and line breaks), votes, and emoji reactions.
- **Reaction Picker**: The transient overlay, anchored to a card's reaction
  trigger, used to add or remove an emoji reaction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of cards containing long URLs or unbroken long words display
  their full content wrapped inside the card, with zero horizontal overflow of
  the card or its column.
- **SC-002**: On standard desktop widths, the board shows zero horizontal
  scrollbars for both the 3-column and 4-column configurations.
- **SC-003**: The reaction picker appears anchored at its trigger on 100% of
  openings with no perceptible position flash (no intermediate frame rendered at
  a location other than the trigger).
- **SC-004**: The reaction picker stays fully visible within the viewport in
  100% of openings, including from cards at screen edges.
- **SC-005**: Zero hardcoded user-visible strings and zero hardcoded palette
  colors remain in the retrospective board components (verifiable by search).
- **SC-006**: Exactly one active retrospective-board implementation exists; no
  unused duplicate remains.
- **SC-007**: All previously passing retrospective-board behavior still passes,
  and test coverage remains at or above the configured thresholds after the
  refactor.
- **SC-008**: Both light and dark themes pass an automated accessibility check
  (WCAG 2.1 AA) on the board with zero violations.

## Assumptions

- **Scope is limited to the retrospective board** and the components/modules it
  directly owns (board container, columns, cards, reaction picker, and closely
  related hooks/services). The broader application migration is explicitly out of
  scope for this feature and will follow in later slices.
- The refactor is **behavior-preserving**: aside from the three specified UX
  fixes, the board should look and behave as it does today. Visual redesign is out
  of scope.
- The currently active board implementation (`RetrospectiveBoard`, wired into the
  retrospective page) is kept and refactored; the alternate, unused
  `EnhancedRetrospectiveBoard` is treated as dead code and removed rather than
  adopted. Any mobile column-paging idea from the removed board is out of scope
  for this feature and would be a separate, explicitly-requested follow-up.
- "Standard desktop width" refers to common laptop/desktop breakpoints (roughly
  1280px and wider); the existing responsive breakpoints and mobile paging
  behavior are retained unless they cause overflow.
- The set of supported locales is the project's existing locale set; new keys are
  added to all of them.
- Existing shared UI primitives, the shared theme tokens, and the established
  drag-and-drop, animation, and localization libraries are reused rather than
  replaced (Prefer Proven Third-Party Libraries). One new dependency, a proven
  positioning library (Floating UI), is introduced specifically for the reaction
  picker's anchored/flip/shift behavior, subject to the Constitution III checks
  (active maintenance, bundle-size, license, no duplicate capability).
- Tests are written before or alongside each refactor step per the project's TDD
  requirement, and critical board flows keep their end-to-end coverage.
