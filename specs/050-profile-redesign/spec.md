# Feature Specification: Mi Perfil (Profile) Redesign (Apple HIG-Inspired)

**Feature Branch**: `050-profile-redesign`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "Siguiendo con el rediseño completo de la app, vamos esta vez a trabajar en la página de perfil. Lo que quiero es que como en el resto de la app, apliquemos los principles de apple (https://developer.apple.com/design/human-interface-guidelines/design-principles) y que se usen las skills de apple que tenemos instaladas como motor del rediseño. Recuerda hacer un artefacto para la decisión sobre cual de las 3 opciones voy a escoger como PO del proyecto."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View My Profile (Priority: P1)

As a signed-in user, I want to open "Mi Perfil" and immediately see who I am on this account — my avatar, display name, email, primary sign-in method, and how long I've had the account — presented through a modern, HIG-aligned interface, so I can confirm my identity and account state at a glance.

**Why this priority**: Viewing profile information is the entire reason a user opens this page; every other capability here is secondary to confirming "this is my account."

**Independent Test**: As a signed-in user (including one signing in for the very first time), open Mi Perfil and confirm the avatar, display name, email, primary provider badge, and member-since date all render correctly; simulate a profile-load failure and confirm a clear error state is shown instead of a blank or broken page.

**Acceptance Scenarios**:

1. **Given** a signed-in user with an existing profile, **When** they open Mi Perfil, **Then** their avatar (or an appropriate fallback), display name, read-only email, primary sign-in provider, and member-since date are all shown.
2. **Given** the profile is still loading, **When** the page is opened, **Then** a loading state is shown; **given** the load fails, **when** the failure occurs, **then** a clear, visible error state is shown (not a silent blank page).
3. **Given** a user whose display name or avatar was never customized (still using OAuth defaults), **When** they view Mi Perfil, **Then** the same OAuth-derived defaults continue to display correctly.

---

### User Story 2 - Edit My Display Name (Priority: P1)

As a signed-in user, I want to change my display name from Mi Perfil and see the update confirmed, so my account reflects how I want to be identified.

**Why this priority**: This is the only field a user can actively edit on this page today; it is a core, frequently-relied-on capability that must keep working identically through the redesign.

**Independent Test**: Change the display name to a valid value and save; confirm the new name is reflected immediately and persists after reload. Attempt to save an empty/blank name and confirm it is rejected with a clear message. Simulate a save failure and confirm a clear error is shown with the previous name still displayed.

**Acceptance Scenarios**:

1. **Given** a signed-in user enters a valid new display name and saves, **When** the save succeeds, **Then** the new name is reflected immediately and persists after a page reload, with a clear success confirmation.
2. **Given** a signed-in user submits an empty or blank display name, **When** they attempt to save, **Then** the save is blocked with a clear, visible message.
3. **Given** the save request fails, **When** the failure occurs, **Then** a clear error message is shown and the previously saved display name remains unchanged and displayed.

---

### User Story 3 - Manage Account Access (Priority: P2)

As a signed-in user, I want to sign out, view and link my available sign-in providers, and view and revoke my connected AI assistants, all from Mi Perfil, so I can control how my account is accessed.

**Why this priority**: These are account-security-relevant actions used less frequently than viewing the profile or editing the display name, but they must remain fully intact and clearly presented.

**Independent Test**: Sign out and confirm the app returns to a signed-out state (and confirm a clear error is shown if sign-out fails). With an account that has one linked provider, confirm the linked provider is shown as linked and the other is shown as linkable, and confirm linking completes successfully. With at least one connected AI assistant, confirm it is listed with its connection date and that revoking it removes it from the list immediately (with a clear error if revocation fails).

**Acceptance Scenarios**:

1. **Given** a signed-in user on Mi Perfil, **When** they choose to sign out, **Then** their session ends and the app reflects the signed-out state; **when** sign-out fails, **then** a clear error message is shown and the user is left in an unambiguous state.
2. **Given** a user with one linked sign-in provider, **When** they view Mi Perfil, **Then** that provider is shown as linked and the other available provider is shown as linkable; **when** they complete linking it, **then** Mi Perfil shows the new provider as linked.
3. **Given** a user with at least one connected AI assistant, **When** they view Mi Perfil, **Then** it is listed with its connection date; **when** they revoke it, **then** it is removed from the list immediately, with a clear error shown if revocation fails.
4. **Given** the currently disabled "Exportar mis datos" and "Eliminar cuenta" placeholders, **When** a user encounters them (visually or via assistive technology), **Then** their disabled, not-yet-available state is clearly and unambiguously communicated, including to screen reader users.

---

### User Story 4 - Consistent, Accessible Experience for Every Visitor (Priority: P3)

As a user on any device, theme, language, or motion preference, I want Mi Perfil to remain fully legible, operable, and coherent, so the redesigned experience works for me the same as it does for anyone else.

**Why this priority**: This is a cross-cutting quality bar rather than a distinct journey; it depends on Stories 1-3 already being implemented and is validated across all of them.

**Independent Test**: Load Mi Perfil on narrow mobile and ultra-wide desktop viewports, in both light and dark themes, in both supported languages, and with reduced motion enabled. All capabilities from Stories 1-3 remain available and legible in every combination. Also confirm the first-time profile-setup form (the same shared component, embedded on the landing page for brand-new users) continues to render and function correctly.

**Acceptance Scenarios**:

1. **Given** the redesigned Mi Perfil in either light or dark theme, **When** a user views any state (loaded, loading, error, saving), **Then** it remains legible and meets WCAG 2.1 AA contrast and focus-visibility requirements.
2. **Given** a user has enabled a reduced-motion preference, **When** they interact with Mi Perfil (page entrance, save feedback, provider linking, app revocation), **Then** every interaction still completes and communicates its result without relying on that motion.
3. **Given** Mi Perfil is viewed in either supported locale (English or Spanish), **When** it renders, **Then** all text — including the member-since date — renders in that locale, and differing text lengths do not break the layout.
4. **Given** narrow mobile or ultra-wide desktop viewports, **When** Mi Perfil is viewed, **Then** the layout remains legible and every capability from Stories 1-3 remains usable.
5. **Given** a brand-new user completing first-time profile setup on the landing page (which reuses Mi Perfil's display-name-edit form), **When** the redesign ships, **Then** that embedded flow continues to render and function correctly, with no regression to the landing page's own already-shipped redesign.

---

### Edge Cases

- What happens when a user's session expires while on Mi Perfil and they attempt to save a display-name change or sign out? A clear "please sign in again" state is shown rather than a silent failure or a stale success indicator.
- What happens when the profile fails to load, a display-name save fails, sign-out fails, provider linking fails, or connected-app revocation fails? A visible, clear error is shown in every case; failures are never silent.
- What happens when a user attempts to link a sign-in provider that is not yet supported (e.g. Apple)? A clear "not yet available" message is shown instead of a broken or misleading action.
- What happens when a user has no connected AI assistants? A clear empty state is shown rather than an empty list with no explanation.
- What happens when a user encounters the disabled "Exportar mis datos" / "Eliminar cuenta" placeholders? Their unavailable state is clearly and unambiguously communicated, including to assistive technology, without implying the actions are functional.
- What happens when a user has `prefers-reduced-motion` enabled? All capabilities remain usable without relying on animation.
- What happens on very small (narrow mobile) and very large (ultra-wide desktop) viewports? The layout remains legible and usable.
- What happens when translated text (English vs. Spanish) varies significantly in length for the same UI element, including the member-since date? The layout does not break or truncate meaningfully important content.
- What happens to the shared display-name-edit form used for first-time profile setup on the landing page? It must continue to render and function correctly after this redesign, without regressing the landing page's own already-shipped redesign.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Mi Perfil view — including profile display, the display-name edit form, the linked-providers section, and the connected-AI-assistants section — MUST present a completely redesigned visual layout and look-and-feel built on Apple Human Interface Guidelines design principles (clarity, deference, depth) as applied through the project's mandated Apple-design skill package, replacing rather than merely tweaking the current visual treatment.
- **FR-002**: The redesign MUST preserve the display of the user's avatar (with an appropriate fallback when absent), display name, read-only email, primary sign-in provider, and member-since date.
- **FR-003**: The redesign MUST preserve the ability to edit and save the display name — the only editable profile field — including required, non-empty-value validation, a saving/loading indicator, and clear success and error feedback, with the previous value retained on failure.
- **FR-004**: The redesign MUST preserve the sign-out flow, including clear error feedback if sign-out fails.
- **FR-005**: The redesign MUST preserve the linked-sign-in-provider section: showing which providers are linked, offering linkable providers, completing the linking flow, and clearly indicating providers that are not yet available (e.g. Apple).
- **FR-006**: The redesign MUST preserve the connected-AI-assistants (MCP) section: listing connected apps with their connection date, and allowing per-app revocation with a loading indicator and clear success/error feedback.
- **FR-007**: The redesign MUST preserve the "Exportar mis datos" and "Eliminar cuenta" controls as inert, disabled placeholders (this feature MUST NOT implement their underlying functionality) while correcting their accessibility presentation so their disabled, not-yet-available state is unambiguous to assistive technology, not communicated by visual styling or color alone.
- **FR-008**: The redesign MUST NOT introduce any direct connection from the browser to Firebase, Firestore, or Firebase Auth; all profile data continues to be loaded and modified exclusively through the existing backend-mediated architecture.
- **FR-009**: The shared display-name-edit form component, which is also embedded on the landing page for first-time profile setup, MUST continue to render and function correctly there after the redesign, with no regression to that page's already-shipped look-and-feel.
- **FR-010**: The system MUST explicitly surface loading, error, and (where applicable) empty states for every Mi Perfil operation (load profile, save display name, sign out, link a provider, revoke a connected app), with no silent failures.
- **FR-011**: All visible text on the redesigned Mi Perfil MUST continue to be sourced from the existing translation system for both currently supported locales (English, Spanish); no hardcoded user-facing strings may be introduced.
- **FR-012**: The redesigned Mi Perfil MUST independently satisfy WCAG 2.1 AA (contrast, visible focus, no color-only meaning, full keyboard operability) in both the light and dark themes, across all states (loaded, loading, error, saving).
- **FR-013**: Any motion or animation introduced in the redesign MUST honor a visitor's reduced-motion preference and MUST be arrived at through the constitution's mandated design/motion decision process rather than ad hoc choices.
- **FR-014**: The redesigned Mi Perfil MUST remain fully responsive and usable across mobile, tablet, and desktop viewport sizes.
- **FR-015**: Before a final visual direction is committed to, at least 2-3 genuinely distinct visual directions MUST be explored and compared, per the constitution's mandated design-exploration process. These directions MUST be presented to the product owner as a single comparison artifact, and the product owner MUST review it and select the direction that ships.
- **FR-016**: Existing automated tests that assert Mi Perfil functional behavior (unit/component tests, the profile-no-Firestore architecture test, and Playwright E2E coverage — including the landing page's first-time-setup coverage of the shared form) MUST continue to pass, updated only to the extent needed to reflect intentional structural changes, with no net loss of coverage for the behaviors protected by FR-002 through FR-010.

### Key Entities

- **User Profile**: The signed-in user's account data shown and partly edited on Mi Perfil — avatar, display name (editable), email (read-only), primary sign-in provider, and member-since date.
- **Linked Sign-in Provider**: The association between the account and an OAuth provider (Google/GitHub linkable today; Apple shown as not yet available), viewable and extendable from this page.
- **Connected AI Assistant (MCP connection)**: An AI client authorized against the account, viewable and revocable from this page, shown with its connection date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of existing view, edit-display-name, sign-out, link-provider, and revoke-connected-app flows complete with the same outcome as before the redesign, verified through automated unit and end-to-end tests.
- **SC-002**: The redesigned Mi Perfil achieves zero WCAG 2.1 AA violations across all states (loaded, loading, error, saving) in both light and dark themes.
- **SC-003**: Zero direct network requests from the browser to any Firebase/Firestore/Firebase Auth endpoint are observed while using any Mi Perfil capability, verified by the existing architecture guard test.
- **SC-004**: A structured design review of the redesigned Mi Perfil against Apple Human Interface Guidelines principles (clarity, deference, depth), conducted using the project's mandated design-skill process, closes with zero unresolved high-priority findings.
- **SC-005**: The product owner is presented with a single artifact comparing the 2-3 explored visual directions, personally reviews it, and selects the direction that ships, with that selection recorded before implementation proceeds.
- **SC-006**: The first-time profile-setup flow embedded on the landing page continues to pass its existing end-to-end coverage with zero regression after the redesign ships.
- **SC-007**: Disabled "Exportar mis datos" and "Eliminar cuenta" controls are correctly announced as unavailable by assistive technology in 100% of automated accessibility checks, with no reliance on color alone.

## Assumptions

- Theme and language preferences are not part of this feature's scope: they are controlled from the app header's user menu (present on every authenticated page), not from Mi Perfil itself, and this redesign does not add controls for them to the page.
- "Exportar mis datos" and "Eliminar cuenta" remain disabled, unimplemented placeholders exactly as they are today; implementing their underlying functionality is out of scope for this feature — only their accessibility presentation is corrected (FR-007).
- The profile avatar remains read-only and sourced from the user's OAuth provider; no custom avatar-upload capability exists today, and this feature does not introduce one.
- No password field, email-change capability, or account-deletion capability exists today; none is introduced by this feature.
- Apple is expected to remain a "not yet available" linkable provider through this redesign; enabling it is out of scope.
- This is the first dedicated redesign of Mi Perfil — prior redesign initiatives (dashboard, retrospective board, landing) explicitly scoped it out or left it unaddressed, so no conflicting in-flight redesign exists for this surface.
