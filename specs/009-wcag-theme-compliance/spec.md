# Feature Specification: WCAG 2.1-Compliant Light & Dark Themes

**Feature Branch**: `009-wcag-theme-compliance`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Quiero reconstruir los temas claro y oscuro de la aplicación para que ambos cumplan con WCAG 2.1. Añade al fichero de constitution que cualquier desarrollo debe cumplir con esta norma."

## Clarifications

### Session 2026-07-22

- Q: What WCAG 2.1 conformance level must both themes meet? → A: Level AA for everything (4.5:1 normal text, 3:1 large text and non-text). AAA is optional/welcome where achievable but never required for completion.
- Q: How is theme accessibility compliance enforced? → A: An automated accessibility audit runs in CI against both themes and is merge-blocking — any WCAG 2.1 AA violation fails the build, mirroring the constitution's existing required checks.
- Q: How are user-chosen colors (card/column colors) kept compliant? → A: Constrain the picker to a curated, pre-vetted swatch set that is guaranteed to meet contrast with its fixed foreground/border in both themes; arbitrary free-form color selection is not offered.
- Q: Should theme selection stay binary or add a persisted "follow system" mode? → A: Keep the existing binary light/dark toggle; the OS preference only seeds the first visit when no choice is saved. No persisted "follow system" state is added in this feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Readable, accessible light theme (Priority: P1)

A team member opens RetroRocket in the default light theme to run or join a retrospective. Every piece of text, every button, every card, and every status indicator is comfortably legible: text stands out clearly against its background, interactive controls are distinguishable from static content, and nothing relies on color alone to convey meaning.

**Why this priority**: The light theme is the default experience and the most-used surface. If it does not meet accessibility contrast requirements, users with low vision or those working in bright environments cannot reliably read or operate the tool, which blocks the core collaborative activity.

**Independent Test**: Load the application in light theme and audit every primary screen (landing, dashboard, board, card, modals, menus) against WCAG 2.1 AA contrast requirements using an accessibility checker; all measured text and UI-component contrast ratios meet the required thresholds.

**Acceptance Scenarios**:

1. **Given** the application is displayed in light theme, **When** a user views any body text, **Then** the text has a contrast ratio of at least 4.5:1 against its background.
2. **Given** the application is displayed in light theme, **When** a user views large text (headings, prominent labels), **Then** the text has a contrast ratio of at least 3:1 against its background.
3. **Given** the application is displayed in light theme, **When** a user views an interactive control (button, input border, toggle, icon button), **Then** the control's boundary or glyph has a contrast ratio of at least 3:1 against adjacent colors.
4. **Given** a status or feedback element (success, warning, error) is shown, **When** a user views it, **Then** its meaning is conveyed by more than color alone (icon, text, or shape) and its text/iconography meets contrast thresholds.

---

### User Story 2 - Readable, accessible dark theme (Priority: P1)

A team member switches to (or defaults into) the dark theme and runs a full retrospective in low-light conditions. The dark theme provides the same clarity guarantees as the light theme: sufficient contrast on all text and controls, visible focus indicators, and no meaning lost to color choices.

**Why this priority**: The dark theme is offered as a first-class alternative and is auto-selected for users whose system prefers dark mode. It must be held to the same accessibility bar as the light theme; otherwise a large share of users receive a non-compliant experience.

**Independent Test**: Load the application in dark theme and audit every primary screen against WCAG 2.1 AA contrast requirements; all measured text and UI-component contrast ratios meet the required thresholds, with no regression versus the light theme.

**Acceptance Scenarios**:

1. **Given** the application is displayed in dark theme, **When** a user views any body text, **Then** the text has a contrast ratio of at least 4.5:1 against its background.
2. **Given** the application is displayed in dark theme, **When** a user views large text, **Then** the text has a contrast ratio of at least 3:1 against its background.
3. **Given** the application is displayed in dark theme, **When** a user views an interactive control, **Then** the control's boundary or glyph has a contrast ratio of at least 3:1 against adjacent colors.
4. **Given** a user compares the same screen in both themes, **When** they audit contrast, **Then** both themes independently pass the same WCAG 2.1 AA thresholds.

---

### User Story 3 - Visible keyboard focus and non-color cues in both themes (Priority: P2)

A keyboard-only user tabs through a board — buttons, inputs, cards, menus, and the theme switcher. At every step the currently focused element is unmistakably highlighted, in both light and dark themes, and interactive states (hover, focus, active, disabled, selected) are distinguishable without relying on color perception.

**Why this priority**: Contrast alone does not make a theme accessible. WCAG 2.1 requires visible focus and information not conveyed by color alone. This complements P1 but is separable: the color palette can pass contrast checks while focus indicators remain too faint.

**Independent Test**: Navigate the entire application using only the keyboard in each theme; every focusable element shows a focus indicator meeting the required contrast and size, and every state change communicates through more than color.

**Acceptance Scenarios**:

1. **Given** a keyboard user is navigating in light theme, **When** an element receives focus, **Then** a focus indicator is visible with at least 3:1 contrast against the unfocused state and adjacent background.
2. **Given** a keyboard user is navigating in dark theme, **When** an element receives focus, **Then** a focus indicator is visible with at least 3:1 contrast against the unfocused state and adjacent background.
3. **Given** a control is disabled, selected, or in an error state, **When** a user views it, **Then** that state is signaled by an icon, text label, shape, or pattern in addition to any color change.

---

### Edge Cases

- **Theme switch mid-session**: When a user toggles between light and dark while a board is open, all surfaces re-render into a fully compliant palette with no leftover elements retaining the previous theme's colors.
- **System preference on first load**: When a user with no saved preference arrives, the theme auto-selected from their operating-system setting is itself compliant, so the first paint is accessible.
- **Color-coded content**: Cards, columns, votes, sentiment/clustering indicators, and charts that use color to categorize must remain distinguishable to users who cannot perceive color differences.
- **Overlays and transient UI**: Modals, dropdowns, tooltips, toasts, and date pickers must meet contrast requirements against whatever sits behind them in both themes.
- **Text over images/gradients**: Text placed over gradient backgrounds or imagery must meet contrast against the least-favorable pixels it overlaps.
- **Custom user-chosen colors**: Where users pick colors (e.g. card/column colors), selection is limited to a curated set of pre-vetted swatches, each guaranteed to meet contrast with its fixed foreground text and border in both themes. Arbitrary free-form color selection is not offered, so no user choice can produce a non-compliant surface.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Both the light theme and the dark theme MUST conform to WCAG 2.1 Level AA across all user-facing screens and components.
- **FR-002**: All body (normal-size) text in either theme MUST present a contrast ratio of at least 4.5:1 against its background.
- **FR-003**: All large-scale text in either theme MUST present a contrast ratio of at least 3:1 against its background.
- **FR-004**: All meaningful non-text elements — interactive control boundaries, icons that convey meaning, focus indicators, and graphical objects required to understand content — MUST present a contrast ratio of at least 3:1 against adjacent colors.
- **FR-005**: Every focusable element MUST display a clearly visible focus indicator in both themes.
- **FR-006**: The interface MUST NOT use color as the only means of conveying information, indicating an action, prompting a response, or distinguishing a visual element; a redundant cue (text, icon, shape, or pattern) MUST accompany it.
- **FR-007**: The theme palette MUST be rebuilt so that a single, documented set of theme color decisions (tokens) drives all surfaces, ensuring consistency and preventing one-off non-compliant color usages.
- **FR-008**: Status and feedback colors (success, warning, error, informational) MUST meet the applicable contrast thresholds and MUST be paired with a non-color indicator in both themes.
- **FR-009**: All overlay and transient surfaces (modals, menus, tooltips, toasts, date pickers, pop-overs) MUST meet the same contrast requirements against their effective background in both themes.
- **FR-010**: Switching themes at runtime MUST result in every visible surface adopting the target theme with no element retaining the prior theme's colors.
- **FR-011**: The auto-selected theme derived from the user's system preference on first visit MUST itself be compliant, so no user encounters a non-compliant first render.
- **FR-012**: The existing theme-selection behavior MUST be preserved unchanged: a binary light/dark toggle, a preference persisted between visits, and the operating-system color scheme used only to seed the first visit when no preference is saved. This feature changes the visual palette and accessibility, not the theme-selection behavior, and does NOT introduce a persisted "follow system" mode.
- **FR-013**: Compliance MUST be verified by an automated accessibility audit that runs in CI against both themes and is a merge-blocking required check: any WCAG 2.1 AA violation on an audited surface MUST fail the build and block merge, consistent with the constitution's existing required-check model.
- **FR-014**: The project constitution MUST be amended to state that all development must comply with WCAG 2.1, establishing accessibility conformance as a governing project standard. *(Governance change — see Assumptions; enacted via the constitution workflow, not this spec.)*
- **FR-015**: Any interface where users select colors (e.g. card/column color pickers) MUST offer only a curated set of pre-vetted swatches, each of which meets the WCAG 2.1 AA contrast requirements with its associated foreground text and border in both themes. Free-form/arbitrary color entry that could yield non-compliant surfaces MUST NOT be offered.

### Key Entities *(include if feature involves data)*

- **Theme**: A named, complete set of color decisions (backgrounds, surfaces, text, borders, interactive states, status colors, focus indicators) applied to the whole application. Two themes exist: light and dark. Each theme is independently required to meet WCAG 2.1 AA.
- **Color token**: A single named color decision within a theme (e.g. "primary text on surface", "focus ring", "error text") that maps to a concrete color per theme and is reused everywhere that role appears, so contrast is decided once per role rather than per component.
- **Theme preference**: The user's chosen theme (light or dark), persisted between visits, that determines which theme is active. When no preference is saved, the operating-system color-scheme setting seeds the theme for the first visit only. There is no separate persisted "follow system" state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of audited text elements meet WCAG 2.1 AA contrast (4.5:1 normal, 3:1 large) in both the light and dark themes.
- **SC-002**: 100% of audited interactive-control boundaries, meaningful icons, and focus indicators meet the 3:1 non-text contrast threshold in both themes.
- **SC-003**: An automated accessibility audit of the primary screens (landing, dashboard, board, card interactions, modals, menus) runs in CI and reports zero contrast or use-of-color violations in either theme; a non-zero violation count blocks merge.
- **SC-004**: A user can navigate the entire application using only the keyboard and can, at every step, identify which element is focused in both themes (0 elements with an invisible focus state).
- **SC-005**: No piece of information, status, or category anywhere in the product is distinguishable by color alone; each has at least one non-color cue.
- **SC-006**: The project constitution explicitly requires WCAG 2.1 compliance for all development, and this requirement is visible to contributors as a governing standard.

## Assumptions

- **Conformance target is WCAG 2.1 Level AA.** AA is the widely adopted legal and industry baseline; AAA-level enhancements (e.g. 7:1 text contrast) are welcome where achievable but are not required to consider this feature complete.
- **Scope is the visual palette and its accessibility, not a redesign.** The look-and-feel, layout, brand direction (blue/slate family), and existing theme-selection controls are retained; only color decisions, focus treatments, and non-color cues are reworked to reach compliance.
- **Two themes only.** The product ships exactly a light theme and a dark theme; no additional themes (e.g. high-contrast variant) are in scope unless separately requested.
- **The audit covers all primary user-facing surfaces.** "All screens" means the surfaces a normal user reaches: landing, authentication, dashboard, board and its cards/columns, voting, grouping/clustering indicators, countdown, exports preview, modals, menus, toasts, and date pickers. Internal dev-only tooling is out of scope for the accessibility bar.
- **The constitution amendment is a governance action.** FR-014 is fulfilled by running the constitution-update workflow (which handles versioning and template sync), not by a manual edit made as part of implementing this spec. This spec records the requirement; the amendment is enacted separately.
- **Existing accessibility guarantees (keyboard operability, ARIA roles) remain in force** and are extended, not replaced, by the contrast and use-of-color requirements added here.
