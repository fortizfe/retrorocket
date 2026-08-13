# Feature Specification: Landing Page Redesign — Immersive Commercial Showcase (Apple Vision Pro-Inspired)

**Feature Branch**: `042-landing-vision-pro-redesign`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "Vale, la app ha cogido mucha envergadura. Me parece que puede tener tirón comercial así que quiero profesionalizar la landing para que sea un punto de captura. Quiero que rediseñes la landing de nuevo bajo el enfoque que acabamos de hacer. Imprescindible seguir los principios de diseño de apple (https://developer.apple.com/design/human-interface-guidelines/design-principles) y usar las skills de apple para los diseños. Tienes libertad total. Lo que quiero es algo como la web de apple vision pro (https://www.apple.com/apple-vision-pro/). Una primera página minimalista y poco sobrecargada con una imagen potente que genere impacto. Luego el resto de secciones que se navegen haciendo scroll y que ocupen la pantalla cada una. Efecto parallax y animaciones suaves. También quiero que se obtengan campturas de pantalla y videos de la aplicación reales, con datos de demo pero realistas. En modo oscuro y en modo claro."

## Clarifications

### Session 2026-08-12

- Q: Does "punto de captura" (capture point) mean the existing Google/GitHub sign-in CTA is the sole conversion mechanism, just made more compelling, or does this redesign need a new lead-capture path (e.g. a work-email opt-in / "request access" form) for visitors not ready to authenticate? → A: New lead-capture path (email opt-in form) is out of scope — reuse and elevate the existing OAuth sign-in CTA as the sole conversion mechanism.
- Q: Should the full-screen sections use strict scroll-snap (each scroll gesture locks the viewport onto exactly one section, like the Apple Vision Pro page) or free-flowing scroll (sections are simply sized to fill the viewport height, but scrolling is continuous and not intercepted)? → A: Free-flowing scroll — sections fill the viewport height but scrolling remains continuous, never intercepted or locked.
- Q: Should the real product video clips autoplay muted and loop in the background (as on the Apple Vision Pro page), or be user-initiated with visible playback controls? → A: Autoplay muted and loop, matching the Apple Vision Pro reference, but pause automatically once out of view and honor reduced-motion by showing a static frame instead.
- Q: Should this feature include conversion analytics/tracking (e.g. scroll depth, CTA click-through) to measure the "capture point" effectiveness? → A: Out of scope — this feature covers only the visual/UX redesign; conversion measurement is a separate future concern.
- Q: Should the parallax effect run at the same intensity on mobile as on desktop, or be reduced/disabled on mobile for performance? → A: Reduced/disabled on mobile — parallax intensity is scaled down or replaced with simpler transitions on mobile viewports; full parallax remains on desktop/tablet.
- Q: Should producing the screenshots/videos be a repeatable, documented process, or is a one-time manual capture sufficient? → A: Repeatable process — a documented/scripted way to regenerate the demo dataset and re-capture assets must exist, so they don't silently go stale as the UI evolves.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A Powerful, Minimalist First Impression (Priority: P1)

As a first-time visitor arriving at the unauthenticated landing page, I want to be greeted by an uncluttered, high-impact first screen — a single powerful visual, minimal copy, and a clear way to get started — so that I immediately understand this is a serious, professional product and feel compelled to keep exploring or sign in right away.

**Why this priority**: The opening screen is what every visitor sees before anything else and is the single highest-leverage surface for the "professional, commercially credible" outcome this redesign exists to deliver. It is also where the only functional capability on the page — sign-in — lives.

**Independent Test**: Load the landing page unauthenticated on common desktop and mobile viewport sizes. Within the first viewport (no scrolling required), a single dominant visual, minimal supporting copy, and a working sign-in call-to-action are visible. Completing sign-in via Google or GitHub succeeds exactly as it does today.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor loads the landing page for the first time, **When** the page finishes rendering, **Then** the first viewport shows one dominant, high-impact visual with minimal text and a visible primary call-to-action, with no scrolling required on common desktop and mobile viewport sizes.
2. **Given** the redesigned landing page, **When** the visitor selects "Sign in with Google" or "Sign in with GitHub", **Then** the existing authentication flow completes successfully and behaves identically to the current implementation (including first-time display-name setup and the `returnTo` redirect used by the MCP connector flow).
3. **Given** the visitor is redirected back to the landing page with an authentication error, **When** the page loads, **Then** the corresponding error message is still surfaced to the visitor, styled consistently with the new design.

---

### User Story 2 - Discovering the Real Product Through an Immersive Scroll Journey (Priority: P2)

As a visitor who is not yet ready to sign in, I want to scroll through a sequence of full-screen sections — each showing real screenshots and short video clips of the actual product in use, populated with realistic-looking demo content, accompanied by smooth parallax and motion — so that I can see exactly what the product looks and feels like before I commit to signing in.

**Why this priority**: Once the hero has made its impact, these sections are what turn a curious visitor into a signed-in user by proving the product is real, polished, and does what it claims. This is the core of the "commercial showcase" outcome, secondary only to the immediate hero/CTA impact of User Story 1.

**Independent Test**: Scroll through the full landing page after the hero. Every remaining section fills the viewport height, presents real captures (screenshots and/or short video) of the running application populated with realistic demo data (not empty states, not illustrations), and transitions in with smooth parallax/motion. Every existing informational message (feature highlights, how-it-works walkthrough, and trust/technology signals) is still communicated.

**Acceptance Scenarios**:

1. **Given** the redesigned landing page, **When** a visitor scrolls past the hero, **Then** each subsequent section occupies the full viewport height and shows a real screenshot or short video capture of the application populated with realistic, non-empty demo data.
2. **Given** the redesigned landing page, **When** a visitor scrolls through it, **Then** section transitions and any parallax movement feel smooth and purposeful rather than abrupt or distracting.
3. **Given** a visitor has enabled a reduced-motion preference, **When** they scroll through the page, **Then** parallax and video autoplay are disabled in favor of static equivalents, and all content remains fully readable and functional.
4. **Given** the redesigned page, **When** a visitor scrolls past a section containing a video, **Then** the video autoplays muted and loops while in view and pauses once it scrolls out of view.

---

### User Story 3 - A Trustworthy Experience in Either Theme (Priority: P3)

As a visitor browsing in either light or dark mode, I want the entire landing page — including every real screenshot and video of the product — to look intentional and polished in my active theme, so that the product feels finished and trustworthy regardless of my system preference.

**Why this priority**: Theme support is already a baseline expectation of the product, but the new real-media sections introduce a new risk: a screenshot or video captured in the "wrong" theme would look broken or mismatched. This is lower priority than the hero and scroll-journey experiences because it is a consistency requirement on top of them, not a new independent capability.

**Independent Test**: Load the redesigned landing page in both light and dark themes (and switch between them via the existing theme toggle). In both themes, every section — including all screenshot and video assets — is legible, coherent, and shows the correctly themed capture (a dark-mode screenshot never appears while the page is in light mode, and vice versa).

**Acceptance Scenarios**:

1. **Given** the redesigned landing page in light mode, **When** a visitor views any section containing a real screenshot or video, **Then** the asset shown reflects the application's light theme.
2. **Given** the redesigned landing page in dark mode, **When** a visitor views any section containing a real screenshot or video, **Then** the asset shown reflects the application's dark theme.
3. **Given** the redesigned landing page, **When** a visitor toggles between light and dark theme, **Then** every section — text, layout, and media — remains legible and visually coherent in the newly selected theme.

---

### Edge Cases

- What happens when a visitor has `prefers-reduced-motion` enabled? Parallax and video autoplay must be replaced with static equivalents; all content remains fully readable and usable without relying on motion.
- What happens on very small (narrow mobile) and very large (ultra-wide desktop) viewports? Full-screen sections and their media must remain legible and usable, not just "not broken" or awkwardly cropped.
- What happens when a mobile browser blocks video autoplay (a common platform restriction)? The section must still communicate its message via the underlying screenshot/poster frame without appearing broken or empty.
- What happens when a visitor arrives already authenticated? The existing redirect-away-from-landing behavior must be preserved unchanged.
- What happens when the `auth_error` query parameter is present on load? The existing error-surfacing behavior must be preserved, restyled to match the new design.
- What happens when translated text (English vs. Spanish) varies significantly in length for the same UI element inside a full-screen section? The layout must not break, truncate meaningfully important content, or force unwanted scrolling within a section.
- What happens on a slow network connection? The hero must still become visually complete and interactive quickly; heavier media (screenshots, video) in sections further down the page may lazy-load as the visitor approaches them, fading in smoothly once ready rather than showing a blank hold or a persistent skeleton/placeholder.
- What happens if a demo screenshot or video accidentally contains real user or customer data? This must never occur — all captures are sourced from a seeded/synthetic demo environment (see Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The landing page's first viewport (hero) MUST present a minimalist, uncluttered layout dominated by a single high-impact visual, minimal supporting copy, and a clear primary call-to-action — no scrolling required to see it, on common desktop and mobile viewport sizes.
- **FR-002**: All content below the hero MUST be organized into sections that each fill the full viewport height, navigated by continuous, uninterrupted scrolling (no scroll-snapping or scroll-locking that intercepts the visitor's scroll gesture). A final footer strip (copyright/closing boilerplate) MAY follow the last full-viewport section without itself being full-viewport-height.
- **FR-003**: Smooth parallax movement and motion transitions MUST be applied across and within sections as the visitor scrolls, arrived at through the constitution's mandated Apple-design/motion decision process rather than ad hoc choices, and MUST be replaced with static, non-parallax equivalents when the visitor has a reduced-motion preference. On mobile viewports, parallax intensity MUST be reduced or replaced with simpler transitions (e.g. fade/slide) to protect scroll smoothness and battery life; full parallax intensity is reserved for tablet and desktop viewports.
- **FR-004**: Sections MUST feature real captures — screenshots and short video clips — of the actual running application (e.g. real-time board collaboration, card creation/voting/grouping, the dashboard, exporting a retrospective) rather than illustrations, abstract graphics, or mockups standing in for the product.
- **FR-005**: All demo data visible in screenshots and videos MUST be fictional/synthetic and realistic-looking (natural team names, board names, and card text) and MUST NOT include any real user, customer, or production data.
- **FR-006**: Every screenshot and video asset MUST exist in both a light-theme and a dark-theme variant, and the landing page MUST display the variant matching the application's currently active theme at all times, including immediately after the visitor toggles the theme.
- **FR-007**: Video assets MUST autoplay muted and loop while in view, MUST pause once scrolled out of view, and MUST be replaced by a static representative frame when the visitor has a reduced-motion preference or when autoplay is blocked by the browser/platform.
- **FR-008**: The redesign MUST preserve every existing functional capability of the landing page unchanged in behavior: Google and GitHub sign-in as the sole conversion call-to-action, first-time display-name setup, the `returnTo` redirect passthrough used by the MCP connector flow, `auth_error` toast surfacing, the light/dark theme toggle, and the redirect-when-already-authenticated behavior.
- **FR-009**: All visible text on the redesigned landing page MUST continue to be sourced from the existing translation system for both currently supported locales (English, Spanish); no hardcoded user-facing strings may be introduced.
- **FR-010**: The redesigned landing page MUST independently satisfy WCAG 2.1 AA (contrast, visible focus, no color-only meaning, full keyboard operability) in both the light and dark themes, including for the new scroll, parallax, and video mechanics.
- **FR-011**: The redesigned landing page MUST remain fully responsive and usable across mobile, tablet, desktop, and ultra-wide viewport sizes, including the sizing and legibility of full-screen sections and their media.
- **FR-012**: The redesign MUST NOT reduce the informational content currently communicated to visitors — the value proposition, key product capabilities, the how-it-works walkthrough, and technology/trust signals — though it may freely restructure, re-prioritize, add, remove, or reorder sections to fit the new full-screen scroll format.
- **FR-013**: Existing automated tests that assert landing-page functional behavior (authentication flow, WCAG 2.1 AA conformance) MUST continue to pass, updated only to the extent needed to reflect intentional structural changes, with no net loss of coverage for the behaviors protected by FR-008 and FR-010.
- **FR-014**: While page content is still becoming ready (e.g. on a slow connection), the hero MUST become interactive quickly, and media-heavy sections further down the page MAY lazy-load and fade in smoothly as the visitor approaches them, rather than presenting a blank hold or a persistent skeleton/placeholder UI.
- **FR-015**: Producing the Media Assets MUST follow a documented, repeatable process — seeding the Demo Dataset into the demo environment and re-capturing screenshots/videos from it — so assets can be regenerated when the product's UI changes, rather than relying on a one-off manual capture that silently goes stale.

### Key Entities

- **Landing Section**: A full-viewport-height section of the landing page below the hero (the hero itself is a distinct, non-repeating layout and is not an instance of this entity) with an ordering, a messaging purpose (e.g. capability highlight, how-it-works step, trust signal), and optionally one associated Media Asset. The closing footer strip is likewise not an instance of this entity — it is ordinary boilerplate following the last section, per FR-002.
- **Media Asset**: A real screenshot or short video capture of the running application, tagged with the theme it was captured in (light or dark) and the product area/flow it depicts, sourced from a seeded demo environment rather than production data.
- **Demo Dataset**: The fictional-but-realistic set of retrospective boards, cards, and user display names populated into the demo environment specifically to produce presentable, non-empty captures for Media Assets. Seeding it is a repeatable, documented step (per FR-015), not a one-off manual setup.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can identify what the product does and locate the sign-in call-to-action within the first viewport, with no scrolling required, on common desktop and mobile screen sizes.
- **SC-002**: 100% of existing sign-in, first-time profile-setup, and redirect-when-authenticated flows complete with the same outcome as before the redesign, verified through automated end-to-end tests.
- **SC-003**: The redesigned landing page achieves zero WCAG 2.1 AA violations in both light and dark themes.
- **SC-004**: The redesigned landing page's hero content becomes visually complete and interactive within 2.5 seconds on a typical broadband connection (the Core Web Vitals "good" Largest Contentful Paint threshold).
- **SC-005**: Every section that showcases the product does so with a real screenshot or video capture populated with realistic, non-empty demo data — zero instances of placeholder, lorem-ipsum, or empty-state imagery remain in the shipped page.
- **SC-006**: 100% of screenshot and video assets shown match the visitor's currently active theme; zero instances of a mismatched-theme asset are observed across a full light/dark toggle pass on every section.
- **SC-007**: A structured design review of the redesigned landing page against Apple Human Interface Guidelines principles (clarity, deference, depth), conducted using the project's mandated design-skill process, closes with zero unresolved high-priority findings.
- **SC-008**: The product owner reviews the finished redesign and confirms it reads as professional and commercially credible, comparable in polish and impact to the referenced Apple Vision Pro page, with no requested reversion to the prior visual treatment.

## Assumptions

- This feature supersedes the visual-direction constraint set by the prior landing redesign (feature 029), which deliberately avoided literal product screenshots; real application captures are now a requirement rather than a prohibition.
- This feature covers only the unauthenticated marketing/landing page and its embedded first-time profile-setup view; authenticated app surfaces (dashboard, retrospective board, profile) are themselves unchanged — they are only the source material photographed/recorded for Media Assets.
- Because the target aesthetic (Apple Vision Pro-style, full-screen scroll, parallax, real product media) is already specified by the requester, this feature does not require exploring multiple candidate visual directions as feature 029 did; the mandated Apple-design skill package is used to execute the specified direction with fidelity to Apple HIG, and the product owner performs a single end-of-build review rather than choosing among candidates.
- Screenshots and videos are captured from a seeded/synthetic demo environment populated with fictional-but-realistic team, board, and card data (per FR-005); no real customer or user data is ever captured or displayed.
- Both currently supported locales (English, Spanish) continue to be supported; no new locale is introduced as part of this redesign.
- The existing i18next translation system, theme system, and authentication system continue to be reused as-is; no new backend or API capability is required beyond what already exists. Conversion analytics/tracking (scroll depth, CTA click-through, etc.) is explicitly out of scope for this feature.
- "Video" refers to short, silent, autoplay-and-loop product-demonstration clips consistent with the Apple Vision Pro reference site, not narrated or user-controlled video content.
- Existing automated test coverage for the landing page's functional behavior will be preserved or updated in place rather than deleted, per FR-013.
