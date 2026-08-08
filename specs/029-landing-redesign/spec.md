# Feature Specification: Landing Page Redesign (Apple HIG-Inspired)

**Feature Branch**: `029-landing-redesign`

**Created**: 2026-08-08

**Status**: Draft

**Input**: User description: "Quiero rediseñar por completo la interfaz y el look and feel de la aplicación. Para este desarrollo vamos a empezar con la landing. Quiero reconstruirlo todo y rediseñarlo todo basado en los principios de construcción de human interface de apple. Quiero algo moderno e impactante visualmente, que siga todos los principios de diseño de apple. Enlaces de referencia: Design Principles (https://developer.apple.com/design/human-interface-guidelines/design-principles) e Información completa (https://developer.apple.com/design/human-interface-guidelines/)."

## Clarifications

### Session 2026-08-08

- Q: What visual-asset strategy should the redesign rely on to feel "modern and visually striking"? → A: An abstract/typography-and-motion-led treatment (gradients, shape, typographic depth, animation) — no literal screenshots or mockups of the app itself.
- Q: How much latitude does the redesign have to restructure content, beyond restyling the existing sections? → A: Full latitude — sections may be added, removed, or reordered (e.g. testimonials, a screenshot carousel, pricing) as long as the underlying messaging in FR-008 is preserved or improved.
- Q: Should the redesign commit to a single visual direction, or explore multiple candidate directions before choosing one? → A: Explore 2-3 genuinely distinct visual directions using the constitution-mandated `prototype` skill, then commit to one.
- Q: What is the concrete load-time budget for the hero/CTA to become visually complete and interactive (SC-004)? → A: Under 2.5 seconds on a typical broadband connection, matching the Core Web Vitals "good" Largest Contentful Paint threshold.
- Q: Who reviews and signs off on which of the 2-3 explored visual directions ships, and confirms the "modern and visually distinctive" bar (SC-006)? → A: The product owner personally reviews and approves the chosen direction.
- Q: What should a visitor see in the moments before the hero/CTA is ready (e.g. on a slow connection)? → A: A progressive fade/reveal as content becomes ready — no blank hold and no distinct skeleton/placeholder UI.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First Impression and Conversion (Priority: P1)

As a first-time visitor arriving at the unauthenticated landing page, I want to immediately understand what the product does and be able to start signing in, presented through a modern, visually striking interface, so that I trust the product and take the first step (sign in) without friction or confusion.

**Why this priority**: The hero and primary call-to-action are what every single visitor sees first, before anything else. This is the highest-leverage surface for the "modern and impactful" outcome the redesign exists to deliver, and it is also where the sign-in flow — the only functional capability on this page — lives.

**Independent Test**: Load the landing page unauthenticated. Within the first viewport (no scrolling required on common desktop and mobile sizes), the value proposition is clear and a working sign-in call-to-action is visible. Completing sign-in via Google or GitHub succeeds exactly as it does today.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor loads the landing page for the first time, **When** the page finishes rendering, **Then** the redesigned hero and primary call-to-action are visible without scrolling on common desktop and mobile viewport sizes.
2. **Given** the redesigned landing page, **When** the visitor selects "Sign in with Google" or "Sign in with GitHub", **Then** the existing authentication flow completes successfully and behaves identically to the current implementation (including first-time display-name setup and the `returnTo` redirect used by the MCP connector flow).
3. **Given** the visitor is redirected back to the landing page with an authentication error, **When** the page loads, **Then** the corresponding error message is still surfaced to the visitor, styled consistently with the new design.

---

### User Story 2 - Exploring Product Depth (Priority: P2)

As a visitor who is not yet ready to sign in, I want to scroll through a coherent, visually polished narrative of what the product offers (capabilities, how it works, and why it's trustworthy), so that I can evaluate the product at my own pace before committing.

**Why this priority**: Once the first-impression hero has done its job, the supporting sections are what convert a curious visitor into a signed-in user. They carry real informational value but are secondary to the immediate hero/CTA impact of User Story 1.

**Independent Test**: Scroll through the full landing page after the hero. Every existing informational message (feature highlights, how-it-works walkthrough, and trust/technology signals) is still communicated, now presented with a consistent, modern visual system and smooth, purposeful motion between sections.

**Acceptance Scenarios**:

1. **Given** the redesigned landing page, **When** a visitor scrolls past the hero, **Then** the feature highlights, how-it-works walkthrough, and trust/technology signals are all still present in some form, visually consistent with the hero.
2. **Given** a visitor has enabled a reduced-motion preference, **When** they scroll through the page, **Then** all content is still fully readable and functional without relying on motion to convey information.
3. **Given** the redesigned page in both light and dark themes, **When** a visitor switches themes via the existing theme toggle, **Then** every section remains legible and visually coherent in both themes.

---

### User Story 3 - Consistent Experience for Edge-State Visitors (Priority: P3)

As a visitor in a secondary flow state — completing first-time profile setup right after signing in, or landing with a locale other than the default — I want that experience to feel like part of the same redesigned product, not a leftover from the old design.

**Why this priority**: These states are reached by every new user at least once (profile setup) or by a subset of visitors (non-default locale), but only after the primary hero/CTA and supporting-content experiences already succeeded, making this lower priority than User Stories 1 and 2.

**Independent Test**: Trigger the first-time profile-setup view (post sign-in) and load the page in each supported locale (English, Spanish). Both render using the new design system with no visual regression to the old look-and-feel and no loss of functionality.

**Acceptance Scenarios**:

1. **Given** a user signs in for the first time, **When** they are shown the display-name setup step, **Then** it is presented using the same redesigned visual system as the rest of the landing experience.
2. **Given** the redesigned landing page, **When** viewed in either supported locale (English or Spanish), **Then** all text renders correctly through the existing translation system with no layout breakage from differing text lengths.

---

### Edge Cases

- What happens when a visitor has `prefers-reduced-motion` enabled? All content and the primary call-to-action must remain fully usable without relying on animation.
- What happens on very small (narrow mobile) and very large (ultra-wide desktop) viewports? The layout must remain legible and usable, not just "not broken."
- What happens when a visitor arrives already authenticated? The existing redirect-away-from-landing behavior must be preserved unchanged.
- What happens when the `auth_error` query parameter is present on load? The existing error-surfacing behavior must be preserved, restyled to match the new design.
- What happens when translated text (English vs. Spanish) varies significantly in length for the same UI element? The layout must not break or truncate meaningfully important content.
- What happens on a slow network connection? Above-the-fold content (hero and primary call-to-action) progressively fades/reveals in as it becomes ready — no blank hold and no distinct skeleton/placeholder UI — and becomes usable quickly even if secondary sections are still loading in.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The landing page MUST present a completely redesigned visual layout and look-and-feel — replacing, not merely tweaking, the current hero, primary call-to-action, feature highlights, product walkthrough, technology/trust signals, closing message, and footer — built on Apple Human Interface Guidelines design principles (clarity, deference, depth) as applied through the project's mandated Apple-design skill package. The visual treatment MUST be abstract and typography-/motion-led (gradients, shape, typographic depth, animation) and MUST NOT depict the product itself via literal screenshots or UI mockups.
- **FR-001a**: The set, order, and boundaries of content sections MAY be freely added to, removed, or rearranged relative to the current page (e.g. introducing testimonials, a screenshot-free feature showcase, or a pricing/trust section) — the current section structure is not a constraint, only the messaging preserved by FR-008 is.
- **FR-002**: The redesign MUST preserve every existing functional capability of the landing page unchanged in behavior: Google and GitHub sign-in, first-time display-name setup, the `returnTo` redirect passthrough used by the MCP connector flow, `auth_error` toast surfacing, the light/dark theme toggle, and the redirect-when-already-authenticated behavior.
- **FR-003**: All visible text on the redesigned landing page MUST continue to be sourced from the existing translation system for both currently supported locales (English, Spanish); no hardcoded user-facing strings may be introduced.
- **FR-004**: The redesigned landing page MUST independently satisfy WCAG 2.1 AA (contrast, visible focus, no color-only meaning, full keyboard operability) in both the light and dark themes.
- **FR-005**: Any motion or animation introduced in the redesign MUST honor a visitor's reduced-motion preference and MUST be arrived at through the constitution's mandated design/motion decision process rather than ad hoc choices.
- **FR-006**: The redesigned landing page MUST remain fully responsive and usable across mobile, tablet, and desktop viewport sizes.
- **FR-007**: The primary call-to-action (sign in) MUST be visible or reachable within the first viewport on common desktop and mobile screen sizes without requiring the visitor to scroll.
- **FR-008**: The redesign MUST NOT reduce the informational content currently communicated to visitors — the value proposition, key product capabilities, the how-it-works walkthrough, and technology/trust signals — though it may restructure, re-prioritize, or change how that messaging is visually presented.
- **FR-009**: Existing automated tests that assert landing-page functional behavior (authentication flow, WCAG 2.1 AA conformance) MUST continue to pass, updated only to the extent needed to reflect intentional structural changes, with no net loss of coverage for the behaviors protected by FR-002 and FR-004.
- **FR-010**: Before a final visual direction is committed to, at least 2-3 genuinely distinct visual directions MUST be explored and compared, per the constitution's mandated design-exploration process, rather than proceeding directly from a single first draft. The product owner MUST review the explored directions and approve the one that ships.
- **FR-011**: While page content is still becoming ready (e.g. on a slow connection), the landing page MUST present a progressive fade/reveal as each part becomes ready, rather than a blank hold or a distinct skeleton/placeholder UI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can identify what the product does and locate the sign-in call-to-action within the first viewport, with no scrolling required, on common desktop and mobile screen sizes.
- **SC-002**: 100% of existing sign-in and first-time profile-setup flows complete with the same outcome as before the redesign, verified through automated end-to-end tests.
- **SC-003**: The redesigned landing page achieves zero WCAG 2.1 AA violations in both light and dark themes.
- **SC-004**: The redesigned landing page's primary content (hero and call-to-action) becomes visually complete and interactive within 2.5 seconds on a typical broadband connection (the Core Web Vitals "good" Largest Contentful Paint threshold).
- **SC-005**: A structured design review of the redesigned landing page against Apple Human Interface Guidelines principles (clarity, deference, depth), conducted using the project's mandated design-skill process, closes with zero unresolved high-priority findings.
- **SC-006**: The product owner personally reviews the 2-3 explored visual directions and confirms the chosen one is perceived as modern and visually distinctive compared to the version it replaces, with no requested reversion to the prior visual treatment.

## Assumptions

- This feature covers only the unauthenticated marketing/landing page and its embedded first-time profile-setup view; authenticated app surfaces (dashboard, retrospective board, profile) are out of scope for this feature.
- No new visual assets depicting the product itself (screenshots, device mockups) are required; the redesign communicates value through abstract/typographic/motion design rather than product imagery, per the Clarifications.
- Content sections may be freely restructured (added, removed, reordered) as long as the messaging preserved by FR-008 survives; the current seven-section layout is a starting inventory, not a fixed target structure.
- Both currently supported locales (English, Spanish) continue to be supported; no new locale is introduced as part of this redesign.
- No new backend or API capability is required — this is a presentation-layer redesign of an already fully functional page.
- The prior Apple-design alignment pass (feature 028) established lightweight motion/perf fixes on the current landing layout; this feature supersedes those landing-specific applications where a deeper structural redesign requires it, without regressing the design-token system it introduced for the rest of the app.
- Existing automated test coverage for the landing page's functional behavior will be preserved or updated in place rather than deleted, per FR-009.
