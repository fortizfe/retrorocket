# Feature Specification: Mis Tableros (Dashboard) Redesign (Apple HIG-Inspired)

**Feature Branch**: `031-dashboard-redesign`

**Created**: 2026-08-08

**Status**: Draft

**Input**: User description: "Siguiendo con el rediseño de la aplicación en base a los Human Interface Guidance principles de apple, vamos a seguir con el trabajo quiero que investigues y rediseñes en base a estos principios la vista de Mis Tableros de la aplicación. Investiga y revisa todo lo descrito en https://developer.apple.com/design/human-interface-guidelines/ y aplícalo junto con las skills de apple para rediseñar la UX por completo de la vista Mis Tableros. No debe perderse ninguna funcionalidad. Pero tienes libertad con la user interface."

## Clarifications

### Session 2026-08-08

- Q: SC-001 said a user can find/open any board among a large list "in a
  few seconds," and an edge case referenced "50+ boards" without a
  performance-degradation threshold — both vague. What concrete, testable
  performance/scale target should replace this? → A: Search/filter/sort
  (client-side, over already-fetched data) apply in under 300ms, and the
  list stays smoothly scrollable/interactive at 200+ boards.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse, Search, and Open My Boards (Priority: P1)

As a signed-in user landing on "Mis Tableros", I want to see every board I created or joined, quickly find a specific one as my list grows, and open it, presented through a modern, HIG-aligned interface, so that returning to my work is fast and pleasant regardless of how many boards I have.

**Why this priority**: Viewing and opening boards is the entire reason this page exists — every other capability on it exists to get the user to this outcome. It is exercised on every single visit.

**Independent Test**: As a user with a mix of created and joined boards (including more boards than fit on one screen), load the dashboard, search for a board by title/description, filter by Created/Joined, sort by name and by date, switch between the available presentation layouts, and open a board. Every board — including ones beyond the first page or screen — must be reachable and openable.

**Acceptance Scenarios**:

1. **Given** a user with both created and joined boards, **When** the dashboard loads, **Then** all boards are listed with their title, description, creation date (rendered in the viewer's active language), participant count, and the user's role (creator vs. joined) clearly distinguished.
2. **Given** a user with more boards than fit in a single screen or page, **When** they browse the list in any presentation layout the redesign offers, **Then** every board remains reachable — none become inaccessible because of the chosen layout.
3. **Given** a user searches by text or filters by Created/Joined, **When** results are narrowed, **Then** the list updates to match and, if filtering, the count of matching boards per filter is visible.
4. **Given** a user sorts by name or by creation date, **When** they repeat the same sort selection, **Then** the sort direction toggles and is clearly indicated.
5. **Given** a user selects "Open" on a board, **When** the action completes, **Then** they are navigated into that board.
6. **Given** the board list is being fetched, **When** the fetch is in progress, **Then** a loading state is shown; **when** the fetch fails, **then** a visible error message is shown (not a silent empty list).
7. **Given** a user with zero boards, **When** the dashboard loads, **Then** an empty state explains this and offers a way to create or join a board; **given** a search or filter that matches nothing, **when** applied, **then** a distinct "no results" state is shown with a way to clear the search/filter.

---

### User Story 2 - Start or Join a Retrospective (Priority: P2)

As a signed-in user, I want to create a new board from a template or join an existing one by its ID directly from "Mis Tableros", so that I can get into a retrospective without leaving the page.

**Why this priority**: These are the two entry points that put a board into the list from User Story 1; essential, but only needed once per new board rather than on every visit.

**Independent Test**: From the dashboard, open the create flow, pick a template, provide a title, and confirm; separately, open the join flow, enter a board ID, and confirm. Both must land the user inside the resulting board and the new/joined board must subsequently appear in the list.

**Acceptance Scenarios**:

1. **Given** a user starts the create-board flow, **When** they select a template and provide a required title, **Then** the board is created and the user is navigated into it.
2. **Given** a user starts the create-board flow, **When** they attempt to confirm without a title, **Then** confirmation is blocked and the missing requirement is clearly indicated.
3. **Given** a user starts the join-board flow, **When** they enter a valid board ID and confirm, **Then** they are navigated into that board.
4. **Given** a user starts the join-board flow, **When** the provided ID is invalid or the join request fails, **Then** a clear inline error is shown and the user can retry without losing their input.

---

### User Story 3 - Manage Boards I Own (Priority: P3)

As the owner/creator of a board, I want to rename or delete it from "Mis Tableros" using controls I can reach with a mouse, keyboard, or touch, so that I can keep my board list accurate without ambiguity or accidental data loss.

**Why this priority**: Ownership management is used less frequently than browsing or opening boards, but data-loss-risk actions (delete) and the accessibility of these controls matter enough to call out on their own.

**Independent Test**: As a board owner, rename a board and confirm the new title persists after reload; delete a board through its confirmation step and confirm it disappears from the list. Repeat reaching both controls via keyboard-only and via touch (no hover), in every presentation layout the redesign offers. As a non-owner (joined-only) user, confirm neither control is offered on boards they don't own.

**Acceptance Scenarios**:

1. **Given** a board the user owns, **When** they choose to rename it and submit a non-empty title, **Then** the new title is saved and reflected in the list; **when** they submit an empty title, **then** the change is blocked with a clear message.
2. **Given** a board the user owns, **When** they choose to delete it, **Then** a confirmation step is required before the deletion is final, the action shows a loading indicator while in progress, and the outcome (success or failure) is clearly communicated.
3. **Given** a board the user only joined (does not own), **When** they view it in the list, **Then** no rename or delete control is offered.
4. **Given** a user operating by keyboard only or on a touch device, **When** they need to rename or delete a board they own, **Then** the controls are reachable and operable without requiring mouse hover, in every presentation layout the redesign offers.

---

### User Story 4 - Consistent, Accessible Experience for Every Visitor (Priority: P4)

As a user on any device, theme, language, or motion preference, I want "Mis Tableros" to remain fully legible, operable, and coherent, so that the redesigned experience works for me the same as it does for anyone else.

**Why this priority**: This is a cross-cutting quality bar rather than a distinct journey; it depends on Stories 1-3 already being implemented and is validated across all of them.

**Independent Test**: Load the dashboard on narrow mobile and ultra-wide desktop viewports, in both light and dark themes, in both supported languages, and with reduced motion enabled. All capabilities from Stories 1-3 remain available and legible in every combination.

**Acceptance Scenarios**:

1. **Given** the redesigned dashboard in either light or dark theme, **When** a user views any state (loaded, loading, empty, no-results, error), **Then** it remains legible and meets WCAG 2.1 AA contrast and focus-visibility requirements.
2. **Given** a user has enabled a reduced-motion preference, **When** they interact with the dashboard (list entrance, card actions, modals), **Then** every interaction still completes and communicates its result without relying on that motion.
3. **Given** the dashboard is viewed in either supported locale (English or Spanish), **When** it renders, **Then** all text — including board creation dates — renders in that locale, and differing text lengths do not break the layout.
4. **Given** narrow mobile or ultra-wide desktop viewports, **When** the dashboard is viewed, **Then** the layout remains legible and every capability from Stories 1-3 remains usable.

---

### Edge Cases

- What happens when a user has zero boards? A dedicated empty state explains this and offers create/join actions (distinct from the "no results" state below).
- What happens when a search or filter combination matches no boards? A distinct "no results" state is shown with a way to clear the search/filter, separate from the zero-boards empty state.
- What happens when a user has a large number of boards (200+)? Every board must remain findable and reachable, with search/filter/sort still applying in under 300ms and the list staying smoothly scrollable/interactive (sustaining at least 50fps, no dropped-frame stalls), in every presentation layout offered.
- What happens when the board list fails to load, or a create/join/rename/delete request fails? A visible, clear error is shown; failures are never silent.
- What happens when a non-owner views a board they only joined? No rename or delete affordance is offered for it.
- What happens when a user has `prefers-reduced-motion` enabled? All capabilities remain usable without relying on animation.
- What happens on very small (narrow mobile) and very large (ultra-wide desktop) viewports? The layout remains legible and usable.
- What happens when board titles or descriptions are unusually long? They are truncated gracefully without breaking the layout, with the full text available on demand (e.g. a native tooltip/`title` attribute exposing the untruncated text) rather than silently cut off.
- What happens when translated text (English vs. Spanish) varies significantly in length for the same UI element, including dates? The layout does not break or truncate meaningfully important content.
- What happens when a user tries to reach rename/delete controls without a mouse (keyboard-only or touch)? The controls are reachable and operable without hover, in every presentation layout offered.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The "Mis Tableros" dashboard view — including the board list, its controls (search, filter, sort, layout selection, and navigation through the full list), the create-board flow, the join-board flow, the rename flow, and the delete-confirmation flow — MUST present a completely redesigned visual layout and look-and-feel built on Apple Human Interface Guidelines design principles (clarity, deference, depth) as applied through the project's mandated Apple-design skill package, replacing rather than merely tweaking the current visual treatment.
- **FR-002**: The redesign MUST preserve the ability to list all boards the user created and all boards the user joined, with each board's role (creator vs. joined) clearly distinguished.
- **FR-003**: The redesign MUST preserve, per board, the display of its title, description, creation date, and participant count.
- **FR-004**: The redesign MUST preserve the create-board flow: selecting from the existing set of board templates, providing a required title, and being navigated into the newly created board on success.
- **FR-005**: The redesign MUST preserve the join-board-by-ID flow, including inline validation and error feedback on an invalid or failed join, and navigation into the board on success.
- **FR-006**: The redesign MUST preserve the ability to open any listed board and navigate into it.
- **FR-007**: The redesign MUST preserve the owner-only ability to rename a board, with required, non-empty-title validation and clear inline error feedback.
- **FR-008**: The redesign MUST preserve the owner-only ability to delete a board, including a required confirmation step before the deletion is final, a loading indicator during the operation, and success/error feedback.
- **FR-009**: The redesign MUST preserve free-text search across board title and description.
- **FR-010**: The redesign MUST preserve filtering boards by All / Created / Joined, each showing a live count of matching boards.
- **FR-011**: The redesign MUST preserve sorting boards by name and by creation date, including toggling sort direction.
- **FR-012**: In every presentation layout the redesign offers, all of a user's boards MUST remain reachable regardless of count — no board may become inaccessible due to pagination, scrolling, or layout constraints (this corrects a pre-existing defect where boards beyond the first page were unreachable in the current grid layout).
- **FR-013**: The redesign MUST preserve a distinct empty state (zero boards) and a distinct no-results state (search/filter matches nothing), each with appropriate messaging and a way to recover (create/join, or clear the search/filter).
- **FR-014**: The redesign MUST preserve a visible loading state while the board list is being fetched, and visible error feedback when fetching, creating, joining, renaming, or deleting a board fails.
- **FR-015**: Rename and delete controls for boards the user owns MUST be reachable and operable via keyboard and via touch, without depending on mouse hover, in every presentation layout the redesign offers (this corrects a pre-existing defect where these controls were hover-only in the current grid layout).
- **FR-016**: Every board's creation date MUST render using the viewer's currently active language (English or Spanish) rather than a fixed locale, consistent with the rest of the redesigned page (this corrects a pre-existing defect where dates always rendered in Spanish regardless of active language).
- **FR-017**: All visible text on the redesigned dashboard MUST continue to be sourced from the existing translation system for both currently supported locales (English, Spanish); no hardcoded user-facing strings may be introduced.
- **FR-018**: The redesigned dashboard MUST independently satisfy WCAG 2.1 AA (contrast, visible focus, no color-only meaning, full keyboard operability) in both the light and dark themes, across all states (loaded, loading, empty, no-results, error).
- **FR-019**: Any motion or animation introduced in the redesign MUST honor a visitor's reduced-motion preference and MUST be arrived at through the constitution's mandated design/motion decision process rather than ad hoc choices.
- **FR-020**: The redesigned dashboard MUST remain fully responsive and usable across mobile, tablet, and desktop viewport sizes.
- **FR-021**: Before a final visual direction is committed to, at least 2-3 genuinely distinct visual directions MUST be explored and compared, per the constitution's mandated design-exploration process, rather than proceeding directly from a single first draft. The product owner MUST review the explored directions and approve the one that ships.
- **FR-022**: Existing automated tests that assert dashboard functional behavior (unit/component tests, the no-Firestore architecture test, and WCAG 2.1 AA/Playwright E2E coverage) MUST continue to pass, updated only to the extent needed to reflect intentional structural changes, with no net loss of coverage for the behaviors protected by FR-002 through FR-018.

### Key Entities

- **Board**: A retrospective board the user either created or joined. Attributes relevant to this view: title, description, creation date, the template it was created from, participant count, and the viewer's role relative to it (creator or joined participant).
- **Board Template**: A predefined starting structure (e.g., Default, Mad/Sad/Glad, Start/Stop/Continue) selectable when creating a board; shown as read-only metadata on already-created boards.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can locate and open any specific board regardless of list size, with search/filter/sort applying in under 300ms and the list remaining smoothly scrollable/interactive (sustaining at least 50 frames per second, with no dropped-frame stalls) at 200+ boards, without any board being unreachable due to the chosen layout.
- **SC-002**: 100% of existing create, join, rename, delete, search, filter, and sort flows complete with the same outcome as before the redesign, verified through automated unit and end-to-end tests.
- **SC-003**: The redesigned dashboard achieves zero WCAG 2.1 AA violations across all states (loaded, loading, empty, no-results, error) in both light and dark themes.
- **SC-004**: 100% of rename and delete controls for owned boards are operable via keyboard and via touch, with no reliance on mouse hover, verified through automated testing.
- **SC-005**: Board creation dates render in the viewer's active language 100% of the time, verified for both supported locales.
- **SC-006**: A structured design review of the redesigned dashboard against Apple Human Interface Guidelines principles (clarity, deference, depth), conducted using the project's mandated design-skill process, closes with zero unresolved high-priority findings.
- **SC-007**: The product owner personally reviews the 2-3 explored visual directions and confirms the chosen one is perceived as modern and visually distinctive compared to the version it replaces, with no requested reversion to the prior visual treatment.

## Assumptions

- This feature covers the authenticated "Mis Tableros" dashboard view (routes `/dashboard` and `/mis-tableros`) and its embedded functional surface: the create-board flow (template selection + title), the join-by-ID flow, the rename flow, and the delete-confirmation flow. The retrospective board experience itself (feature 028) and the landing page (feature 029) are out of scope.
- Both currently supported locales (English, Spanish) continue to be supported; no new locale is introduced.
- This is primarily a presentation-layer redesign of already-functional capabilities. It additionally corrects three pre-existing defects surfaced during investigation that conflict with the project's non-negotiable accessibility and internationalization standards: boards beyond the first page being unreachable in grid layout, rename/delete controls being hover-only, and creation dates being hardcoded to Spanish regardless of active language. No other new functional capabilities (e.g., archiving, real-time presence indicators, bulk actions) are introduced, as none are currently implemented or requested.
- The specific presentation mechanism for browsing a large board list (e.g., traditional pagination, infinite scroll, or another pattern) is a UI design decision left to the design-exploration process, as long as every board remains reachable (FR-012).
- Whether the redesign preserves a Grid/List layout toggle as two distinct modes, or presents boards through a different (single, adaptive, or otherwise reorganized) layout, is a UI design decision; the constraint is that all underlying capabilities in FR-002 through FR-018 remain available, not that today's specific layout toggle be preserved as-is.
- No new backend or API capability is required beyond what already backs board listing, creation, joining, renaming, and deletion.
- Existing automated test coverage for the dashboard's functional behavior (unit, architecture, and E2E) will be preserved or updated in place rather than deleted, per FR-022.
- The prior Apple-design alignment (feature 028) and landing redesign (feature 029) established the shared design-token and motion system this feature builds on; this feature may extend that system as needed for new component treatments without regressing its use elsewhere in the app.
