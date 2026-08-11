# Feature Specification: Export Window Redesign (Apple HIG-Inspired Adaptive Sheet)

**Feature Branch**: `038-export-window-redesign`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "Quiero seguir con el rediseño de la aplicación basado en los principios de apple (https://developer.apple.com/design/human-interface-guidelines/design-principles). Ahora quiero que nos centremos en la ventana flotante de exportación. Quiero que se rediseñe su UX por completo usando las skills de claude para apple que tenemos instaladas. Quiero que la diseñes con el mismo comportamiento que los botones de exportar y facilitador, que tienen un comportamiento específico para desktop y mobile y es bastante bueno."

## Clarifications

### Session 2026-08-11

- Q: The export window is opened exclusively from the board's options menu (redesigned in feature 036 as an "Adaptive Sheet": a desktop anchored dropdown panel plus a mobile `BottomSheet`, both listing "Export" among their actions). Today, selecting "Export" from either surface opens the *same* generic, centered, fixed-position dialog regardless of viewport — it does not adapt the way its own trigger does. Should the export window itself now adopt that same desktop-anchored-panel / mobile-bottom-sheet split, or should it keep a single presentation for both? → A: Give the export window its own Adaptive Sheet split — an anchored floating panel on desktop/tablet and a bottom sheet on mobile — matching the pattern already shipped for the options and facilitator menus.
- Q: On desktop/tablet, when a participant selects "Export" from the open options dropdown, how should the transition from the options panel to the export panel work, and what does the export panel visually anchor to? → A: The options panel closes immediately, then the export panel opens anchored to the same "Options" trigger button that opened the options menu (no new always-visible export trigger is introduced; the export panel reuses the options trigger as its anchor, matching the one-trigger-per-panel precedent already set by `FacilitatorMenu`).
- Q: While an export is actively in progress, can the participant dismiss the export window (Escape / outside click / close control), and if so what happens to the export itself? → A: Yes — dismissing the window never cancels an in-progress export. The export job keeps running independently of the window's own open/closed state, and its outcome (success or error) is surfaced via a toast/notification if the window is not open when it completes. Reopening the export window while that job is still running reflects its current in-progress state rather than starting a conflicting duplicate export.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
-->

### User Story 1 - Configure and Run an Export on Desktop (Priority: P1)

As a participant on a retrospective board using a desktop or tablet browser, I want the export window to open as a clearly anchored, modern panel near where I triggered it, so that choosing a format, adjusting document options, and starting the export feels like a natural continuation of the action I just took rather than an unrelated dialog appearing in the middle of my screen.

**Why this priority**: Export is a core, frequently used capability of every session, and desktop/tablet is the primary environment retrospectives are run and exported from today, making a correct and polished desktop experience the foundation the rest of this redesign builds on.

**Independent Test**: On a desktop-width viewport, open the options menu, select "Export", and confirm the export panel opens anchored near its trigger rather than centered on the screen; choose each format (PDF, TXT, DOCX), edit the custom title, toggle the logo and optional-content checkboxes, and start an export, confirming progress, success, and error feedback all render clearly inside the panel.

**Acceptance Scenarios**:

1. **Given** a participant on a desktop/tablet viewport opens the options menu and selects "Export", **When** the export window opens, **Then** the options panel closes immediately and the export panel opens anchored to the same "Options" trigger button that opened the options menu (not a generic screen-centered dialog), without a visible flash or reposition.
2. **Given** the export panel is open, **When** the participant selects a format, edits the custom title, toggles the logo/statistics/action-items options, or (if they are the board owner) toggles a facilitator-only option, **Then** each change is reflected immediately and legibly within the panel.
3. **Given** the export panel is open with valid options selected, **When** the participant starts the export, **Then** in-progress, success, and error states are each shown clearly within the panel, and a successful export closes it automatically.
4. **Given** the export panel is open and idle (no export started yet), **When** the participant presses Escape or clicks outside it, **Then** it closes without starting an export, and reopening it presents fresh defaults.
5. **Given** an export is in progress in the panel, **When** the participant presses Escape or clicks outside it, **Then** the panel closes but the export keeps running in the background, and its outcome (success or error) is later surfaced via a toast/notification.

---

### User Story 2 - Configure and Run an Export on Mobile (Priority: P2)

As a participant on a retrospective board using a phone, I want the export window to open as a bottom sheet that comfortably fits my screen, so that I can pick a format, review options, and start an export with the same ease as I already have when opening the options or facilitator menu on my phone.

**Why this priority**: Mobile export was previously reachable only through the same oversized, non-adaptive dialog used on desktop; giving it the same bottom-sheet treatment already proven for the two menus is the concrete, testable improvement this feature adds beyond User Story 1's desktop polish.

**Independent Test**: On a narrow mobile viewport, open the options menu's mobile entry point, select "Export", and confirm the export window opens as a bottom sheet sliding up from the screen edge; complete the same format selection, option toggles, and export start/finish flow as in User Story 1, entirely by touch.

**Acceptance Scenarios**:

1. **Given** a participant on a narrow mobile viewport selects "Export" from the mobile options entry point, **When** the export window opens, **Then** it appears as a bottom sheet (matching the presentation already used for the options and facilitator menus on mobile), not the desktop-style anchored panel.
2. **Given** the export bottom sheet is open, **When** the participant scrolls, selects a format, toggles options, or starts the export, **Then** every control remains reachable and operable by touch without any content being clipped or requiring horizontal scrolling.
3. **Given** the export bottom sheet is open, **When** the participant taps its close control, swipes it down (if supported), or presses Escape (external keyboard), **Then** it closes without side effects.
4. **Given** an export is in progress on mobile, **When** the participant dismisses the sheet (tap close, swipe down, or Escape via external keyboard), **Then** the sheet closes but the export keeps running in the background, with its outcome later surfaced via a toast/notification, consistent with the desktop behavior in User Story 1.

---

### User Story 3 - Recognize the Redesigned Visual Language (Priority: P3)

As any participant, I want the export window's internal layout, typography, spacing, and use of color to reflect the same Apple HIG-inspired visual language already applied to the options menu, facilitator menu, and card/board redesigns, so that the export experience feels like part of one coherent, modern product rather than an older, unrefined screen left behind by the rest of the redesign.

**Why this priority**: This is the qualitative "look and feel" layer that depends on Stories 1-2 already delivering the correct structural (desktop/mobile) behavior; it's the layer product ownership will judge for polish and consistency, but it does not block the export window from functioning.

**Independent Test**: Open the export window on desktop and mobile, in light and dark themes, and compare its layout, spacing, and treatment of the format choices, document options, always-included-content notice, and facilitator-only zone against the already-redesigned options and facilitator menus for visual family resemblance (clarity, restraint, depth) rather than a literal one-to-one match.

**Acceptance Scenarios**:

1. **Given** the export window in either light or dark theme, **When** a participant views its format selection, document configuration, optional content, and (for the owner) facilitator-only sections, **Then** each section is clearly delineated and legible, consistent with the visual language already shipped for the options and facilitator menus.
2. **Given** the export window's various states (idle, exporting, success, error), **When** a participant moves between them, **Then** transitions communicate what changed without relying on color alone and remain calm and unobtrusive rather than jarring.

---

### User Story 4 - Consistent, Accessible Experience for Every Participant (Priority: P4)

As a participant on any device, theme, language, or motion preference, I want the redesigned export window to remain fully legible, operable, and coherent, so that exporting a retrospective works for me the same way it does for anyone else.

**Why this priority**: This is a cross-cutting quality bar rather than a distinct journey; it depends on Stories 1-3 already being implemented and is validated across all of them.

**Independent Test**: Open the export window on narrow mobile and ultra-wide desktop viewports, in both light and dark themes, in both supported languages, and with reduced motion enabled. Every capability from Stories 1-3 remains available, legible, and operable via keyboard and touch in every combination.

**Acceptance Scenarios**:

1. **Given** the export window in light or dark theme, **When** a participant views any of its states (closed, opening, populated, exporting, success, error), **Then** it remains legible and meets WCAG 2.1 AA contrast and focus-visibility requirements.
2. **Given** a participant has enabled a reduced-motion preference, **When** they open, interact with, or close the export window (desktop panel or mobile sheet), **Then** every interaction still completes and communicates its result without relying on that motion.
3. **Given** the export window is viewed in either supported locale (English or Spanish), **When** it renders, **Then** all text renders in that locale, and differing text lengths do not break either the desktop panel or mobile sheet layout.
4. **Given** the export window is opened by the board owner versus a non-owner participant, **When** it renders, **Then** the facilitator-only zone appears only for the owner, in both the desktop and mobile presentations.

---

### Edge Cases

- What happens when the export window is opened — including reopened after being dismissed — while an export job from this session is still in progress? The window reflects that job's current in-progress state rather than allowing a conflicting duplicate export to start.
- What happens when a participant dismisses the export window while an export is in progress? The export continues running in the background rather than being cancelled; its outcome (success or error) is surfaced via a toast/notification since the panel that would otherwise show it is no longer open.
- What happens when the participant resizes the browser window, or rotates a mobile device, while the export window is open? The window either adapts to the presentation appropriate for the new viewport size or closes cleanly, without leaving a broken or mismatched layout on screen.
- What happens when the export window is opened by a non-owner participant? The facilitator-only zone is absent entirely (not present-but-disabled), matching its current gating behavior.
- What happens when an export fails? The error state is clearly presented within whichever presentation (panel or sheet) is currently active, and the participant can retry without reopening the window from scratch.
- What happens when translated text (English vs. Spanish) for format names, option labels, or status messages varies significantly in length? Neither the desktop panel nor the mobile sheet breaks its layout or truncates meaningfully important content.
- What happens when a participant has `prefers-reduced-motion` enabled? Opening/closing the export window in either presentation, and switching between its idle/exporting/success/error states, remain fully usable without relying on animation.
- What happens on very small (narrow mobile) and very large (ultra-wide desktop) viewports? The export window remains legible and every option/control remains reachable without depending on mouse hover.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The export window MUST present a completely redesigned visual layout and look-and-feel built on Apple Human Interface Guidelines design principles (clarity, deference, depth) as applied through the project's mandated Apple-design skill package, replacing rather than merely tweaking the current visual treatment.
- **FR-002**: On desktop and tablet viewports, selecting "Export" from the options panel MUST close that options panel immediately and open the export window as a floating panel anchored to the same "Options" trigger button that opened the options menu (no new always-visible export trigger is introduced), matching the anchored-panel presentation already used by the facilitator menu on those viewport sizes, rather than the current screen-centered fixed dialog.
- **FR-003**: On mobile viewports, the export window MUST present as a bottom sheet sliding up from the screen edge, matching the mobile presentation already used by the options menu and facilitator menu, rather than the current same-on-every-size dialog.
- **FR-004**: The redesign MUST preserve every existing export capability: selecting a format (PDF, TXT, DOCX), editing the custom document title, toggling the RetroRocket logo, toggling optional content (action items, statistics), and — for the board owner only — toggling the facilitator-only options (facilitator notes, sentiment badges, team mood analysis).
- **FR-005**: The redesign MUST preserve the informational notice listing content that is always included in an export (participants, card authors, reactions, group details, current order).
- **FR-006**: The redesign MUST preserve the export window's owner-only gating for its facilitator-only zone: this zone MUST remain entirely absent (not present-but-disabled) for any participant who is not the board's owner, in both the desktop and mobile presentations.
- **FR-007**: The redesign MUST preserve the export window's in-progress, success, and error feedback (including export progress percentage where available), presented clearly within whichever presentation (desktop panel or mobile sheet) is active, and re-presented correctly if the window is reopened while that same export job is still running.
- **FR-007a**: As an explicit, scoped exception to FR-012's presentation-layer-only scope, dismissing the export window (Escape, outside-click/tap, or close control) while an export is in progress MUST NOT cancel that export: the export job MUST continue running independently of the window's own open/closed state, and its completion (success or error) MUST be surfaced to the participant who started it via a toast/notification if the window is not open at that time.
- **FR-008**: The export window MUST remain reachable and operable via keyboard and via touch, without depending on mouse hover, and MUST be dismissible via Escape and outside-click/tap, in both the desktop and mobile presentations.
- **FR-009**: All visible text in the export window MUST continue to be sourced from the existing translation system for both currently supported locales (English, Spanish); no hardcoded user-facing strings may be introduced.
- **FR-010**: The redesigned export window MUST independently satisfy WCAG 2.1 AA (contrast, visible focus, no color-only meaning, full keyboard operability) in both the light and dark themes, across all its states (closed, opening, populated, exporting, success, error).
- **FR-011**: Any motion or animation introduced in the redesign (window open/close in either presentation, state transitions between idle/exporting/success/error) MUST honor a visitor's reduced-motion preference and MUST be arrived at through the constitution's mandated design/motion decision process rather than ad hoc choices.
- **FR-012**: The redesign is presentation-layer only, with one explicit exception (FR-007a's background-continuing export job and its completion toast/notification): the underlying behavior of export generation (PDF/TXT/DOCX rendering, progress reporting, success/error outcomes) and any real-time data it reads (cards, groups, participants, facilitator notes, sentiment, team mood) MUST NOT be altered by this initiative.
- **FR-013**: Before a final visual direction is committed to, at least 2-3 genuinely distinct visual directions for the export window (covering both its desktop-anchored-panel and mobile-bottom-sheet presentations) MUST be explored and compared, per the constitution's mandated design-exploration process, and presented to the product owner as a reviewable artifact (including visual captures of each direction in both themes) rather than proceeding directly from a single first draft. The product owner MUST review the explored directions and approve the one that ships.
- **FR-014**: Existing automated tests that assert functional behavior of the export window (unit/component tests and any relevant WCAG 2.1 AA/Playwright E2E coverage) MUST continue to pass, updated only to the extent needed to reflect intentional structural changes, with no net loss of coverage for the behaviors protected by FR-004 through FR-008.

### Key Entities

- **Export Window**: The floating surface offering export format selection, document configuration, optional content toggles, the always-included-content notice, and (for the owner) the facilitator-only zone; presented as a desktop-anchored panel or a mobile bottom sheet depending on viewport.
- **Export Options**: The participant's current selections — format, custom title, logo inclusion, optional content flags, and facilitator-only flags — that determine what an export contains.
- **Export Job**: A single in-flight export attempt, with an idle/exporting/success/error state and, while exporting, a progress value. Its lifecycle is independent of the export window's own open/closed state: it continues running and reaches a final success/error outcome even if the window that started it is dismissed, surfacing that outcome via the window (if reopened in time) or a toast/notification (if not).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of existing export-window capabilities (format selection, custom title, logo toggle, optional-content toggles, facilitator-only toggles, always-included notice, progress/success/error feedback) complete with the same functional outcome as before the redesign, verified through automated unit and end-to-end tests.
- **SC-002**: The redesigned export window achieves zero WCAG 2.1 AA violations across all its states (closed, opening, populated, exporting, success, error) in both light and dark themes.
- **SC-003**: 100% of the export window's controls are operable via keyboard and via touch, with no reliance on mouse hover, verified through automated testing.
- **SC-004**: The export window's owner-only facilitator zone gating is verified with zero exceptions: the zone is absent for a non-owner in 100% of tested scenarios, on both desktop and mobile presentations.
- **SC-005**: A structured design review of the redesigned export window against Apple Human Interface Guidelines principles (clarity, deference, depth), conducted using the project's mandated design-skill process, closes with zero unresolved high-priority findings.
- **SC-006**: The product owner personally reviews the 2-3 explored visual directions for the export window and confirms the chosen one is perceived as clearer and more modern than the version it replaces, with no requested reversion to the prior visual treatment.
- **SC-007**: On a desktop/tablet viewport, participants can locate and start an export without hesitation or repeated attempts, verified through a usability walkthrough; the export window is visibly anchored to its trigger rather than appearing as an unrelated centered dialog, verified through automated viewport testing.
- **SC-008**: On a narrow mobile viewport, 100% of export capabilities in FR-004 through FR-007 remain reachable and completable through the bottom-sheet presentation, verified through automated testing at a mobile viewport size.
- **SC-009**: Dismissing the export window while an export is in progress never cancels that export: 100% of exports started before dismissal reach a surfaced success or error outcome — shown in-panel if the window is reopened in time, or via a toast/notification otherwise — verified through automated testing.

## Assumptions

- Scope for this initiative is exactly the export window (its desktop-anchored-panel presentation and its new mobile-bottom-sheet presentation) and everything rendered within it: format selection, document configuration, optional content, the always-included-content notice, the facilitator-only zone, and the idle/exporting/success/error states — across both the light and dark themes and both currently supported locales.
- The export window's only entry point today is the board's options menu (redesigned under feature 036), on both its desktop dropdown and mobile bottom-sheet triggers; this initiative does not introduce any new entry point beyond adapting the window itself to the viewport it's opened on.
- The desktop-anchored-panel and mobile-bottom-sheet presentation patterns themselves (Floating UI-anchored dropdown; portal-rendered bottom sheet with a drag-handle affordance and always-visible close control) were already established and validated under feature 036 for the options and facilitator menus; this initiative reuses that established pattern for the export window rather than inventing a new one, per the user's explicit request to match "the same behavior as the export and facilitator buttons."
- This is a presentation-layer redesign of an already-functional capability: no new export format, no change to what data an export contains beyond what's already configurable today, and no change to the underlying export generation, progress reporting, or real-time data sources is introduced.
- Both currently supported locales (English, Spanish) and both themes (light, dark) continue to be supported; no new locale or theme is introduced.
- The existing WCAG 2.1 AA accessibility bar and the existing internationalization system remain the source of truth; where a new design direction would conflict with either, the design MUST be adjusted to keep both intact rather than the reverse.
- All design and motion decisions in this initiative are made using the project's mandated Apple-inspired design skill package, per the project constitution — this is a process requirement of how the work is carried out, not a change to the product's own capabilities.
