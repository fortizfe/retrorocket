# Implementation Plan: Landing Page Redesign — Immersive Commercial Showcase (Apple Vision Pro-Inspired)

**Branch**: `042-landing-vision-pro-redesign` | **Date**: 2026-08-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/042-landing-vision-pro-redesign/spec.md`

## Summary

Rebuild the unauthenticated landing page (`Landing.tsx`) into an Apple Vision
Pro-style commercial showcase: a minimalist, single-viewport hero with one
dominant high-impact visual and minimal copy, followed by full-viewport-height
sections navigated by continuous (non-snapping) scroll, each carrying a real
screenshot or short autoplay-muted video of the actual running application —
captured from a seeded, fictional-but-realistic demo dataset, in both light
and dark theme variants — with smooth, reduced-motion-aware parallax and
transitions built on the constitution's mandated Apple-design skill package
(`apple-design`, `emil-design-eng`, `animate`, `review-animations`). Media
capture itself is a documented, repeatable Playwright-driven process reusing
the project's existing `seedBoards`/`seedBoardCards`/`seedBoardGroups` E2E
fixtures rather than a one-off manual step. This feature explicitly
supersedes feature 029's abstract-only visual-direction constraint. All
existing functional behavior (Google/GitHub sign-in as the sole conversion
mechanism, first-time display-name setup, the MCP `returnTo` passthrough,
`auth_error` toast surfacing, theme toggle, redirect-when-authenticated) and
quality bars (WCAG 2.1 AA both themes, i18next en/es, existing automated test
coverage) must continue to work unchanged. Analytics/conversion tracking is
explicitly out of scope.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.2, built with Vite 4

**Primary Dependencies**: framer-motion 10.18 (already adopted — `useScroll`
+ `useTransform` drive parallax, `MotionConfig reducedMotion="user"` in
`src/App.tsx` already gates all framer-motion animation on
`prefers-reduced-motion`), Tailwind CSS 3.3 semantic token system
(`src/lib/theme/tokens.ts`), react-i18next, lucide-react, the existing
`useReducedMotion` hook (`src/lib/hooks/useReducedMotion.ts`, for the plain
CSS/native-`<video>` motion framer-motion's wrapper doesn't cover), the
existing shared UI primitives (`src/lib/components/ui/*`). Video playback
uses the native HTML5 `<video>` element with the native
`IntersectionObserver` API for in-view autoplay/pause — no new video-player
dependency is needed or justified under Constitution Principle III.

**Storage**: N/A at runtime — this feature is presentation-only; no
Firebase/Firestore data or access pattern is touched by the shipped landing
page. Firestore IS used, but only offline/pre-build, as the target of the
demo-data seeding step in the repeatable capture process (FR-015), via the
Firebase Emulator Suite (`npm run emulators`) exactly as `e2e/` specs already
do — never a production project.

**Testing**: Vitest + Testing Library (unit/component, coverage-gated per
`vitest.config.ts`), Playwright E2E (`e2e/authentication.spec.ts`,
`e2e/accessibility.spec.ts` — axe-core WCAG 2.1 AA audit, both themes). A new
Playwright-driven **capture script** (not a `*.spec.ts` test; see
`quickstart.md`) is added to produce the Media Assets themselves,
distinct from the `e2e` correctness suite.

**Target Platform**: Web browser (responsive mobile/tablet/desktop/ultra-wide
viewports), light and dark themes, both currently supported `i18next`
locales (English, Spanish)

**Project Type**: Existing React SPA frontend (`retro-rocket/src`); this
feature does not touch `retro-rocket/server` or the MCP backend beyond
reusing its emulator-backed REST endpoints for demo-data seeding

**Performance Goals**: Hero visually complete and interactive within 2.5s on
a typical broadband connection (SC-004, Core Web Vitals "good" LCP); parallax
and transitions run on compositor-friendly properties (`transform`/`opacity`)
targeting 60fps; below-the-fold Media Assets (screenshots/videos) lazy-load
as the visitor approaches them (FR-014) so they never compete with hero LCP

**Constraints**: Zero functional regression to sign-in, first-time profile
setup, the MCP `returnTo` redirect, `auth_error` surfacing, theme toggle, and
authenticated-redirect behavior (FR-008); every section below the hero MUST
be full-viewport-height with continuous, non-intercepted scroll — no
scroll-snap/scroll-jacking (FR-002); every Media Asset MUST be a real capture
(no illustrations/mockups) sourced from fictional-but-realistic seeded demo
data, never real user data (FR-004, FR-005); every Media Asset MUST exist in
both theme variants and the correct variant MUST track the live theme
toggle, not just initial load (FR-006); video MUST autoplay muted, loop,
pause off-view, and fall back to a static frame under reduced-motion or
blocked autoplay (FR-007); parallax intensity MUST be reduced/simplified on
mobile viewports (FR-003); WCAG 2.1 AA MUST hold in both themes including for
the new scroll/parallax/video mechanics (FR-010); all user-visible text MUST
stay in `i18next` en/es (FR-009); existing Vitest coverage thresholds and
`e2e/authentication.spec.ts` / `e2e/accessibility.spec.ts` MUST NOT regress
(FR-013); the capture process MUST be documented/scripted and repeatable,
not a one-off manual step (FR-015); no new backend/API capability, and no
conversion-analytics capability, per the Clarifications

**Scale/Scope**: Single page scope — `src/pages/Landing.tsx`, its embedded
first-time profile-setup view, and a new `src/features/landing/` module for
the section components, parallax/video hooks, and the Media Asset manifest;
the current 6-section content inventory (hero, capabilities, how-it-works,
technology/trust, final message, footer) is the messaging baseline (FR-012),
not a fixed target structure; 2 locales (en/es); 2 themes (light/dark); a
bounded set of Media Assets, one screenshot-or-video pair per non-hero
section per theme

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Any behavior-preserving logic touched during the rebuild (auth handlers, `auth_error` param handling, `returnTo` passthrough, authenticated-redirect, new theme-aware Media Asset selection logic) MUST have its test written or extended first. Presentation-only markup/motion follows the same no-new-test convention established in features 028/029 unless a new reusable utility/hook is introduced (e.g. the video in-view autoplay hook, the Media Asset resolver) — those MUST be unit-tested first. | PASS — enforced in Phase 2 task ordering |
| II. Library-First | The new Media Asset resolution logic, the parallax/in-view hooks, and the section components are a new, non-trivial capability and MUST live in `src/features/landing/` (components/hooks/data), not inline in `Landing.tsx`, mirroring the existing `dashboard`/`auth` feature module structure. | PASS |
| III. Prefer Proven Third-Party Libraries | Parallax and transitions reuse the already-adopted framer-motion (`useScroll`/`useTransform`); video in-view play/pause uses the native `IntersectionObserver` API; no new runtime dependency is introduced. | PASS |
| IV. SOLID | Presentation-only rebuild; no Firestore access or domain service is touched by the shipped page. The offline capture script depends on the existing REST endpoints via Playwright's `APIRequestContext`, mirroring `e2e/fixtures/seedBoards.ts` — no new coupling introduced. | PASS |
| V. Simplicity (KISS + YAGNI) | Scope is bounded to one page plus its new `src/features/landing/` module (FR scope above); per the Clarifications, no multi-direction exploration is required this time — the target aesthetic is already specified — and no analytics/tracking capability is added. | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | Coverage thresholds in `vitest.config.ts` MUST NOT drop; `src/test/pages/Landing.test.tsx` MUST be updated alongside the rebuild; new hooks/utilities in `src/features/landing/` MUST carry their own unit tests. | PASS — verified per task |
| VII. E2E Testing with Playwright | `e2e/authentication.spec.ts` and `e2e/accessibility.spec.ts` MUST keep passing, updated only for intentional selector/structure changes, never weakened. | PASS — verified per task |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | Zero WCAG 2.1 AA violations in both themes (SC-003); the free-scroll (non-snapping) decision from Clarifications directly protects full keyboard/screen-reader scroll operability; autoplay video MUST NOT convey information unavailable from the accompanying screenshot/copy (no essential-info-via-video-alone). | PASS — hard gate, re-verified after Phase 1 |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | `apple-design`/`emil-design-eng` govern the general visual/layout redesign (hero restraint, full-screen section rhythm, depth/materials); `animate` governs each new motion decision (parallax curve/intensity, section reveal, video-in-view transition) with its interruption/exit behavior specified; `review-animations` governs the final motion critique pass before ship. `prototype` and `find-animation-opportunities` are not required this time per the Clarifications (aesthetic already specified by the requester) but remain available if a specific section's treatment proves ambiguous during implementation. Skill used MUST be recorded per design decision in Phase 1 artifacts. | PASS — this plan's data model and quickstart are structured around the mandated skill sequence |

No violations requiring justification. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: `data-model.md`, `contracts/*`, and `quickstart.md`
introduce no new runtime dependency, no Firestore/domain-service change in
the shipped page, and no reduction in test or accessibility coverage — all
nine gates above still PASS unchanged. The capture-script's use of
`e2e/fixtures/seedBoards.ts` and `seedBoardCards.ts` (which also exports
`seedBoardGroups`) is read/reuse only; those fixtures are not modified.

## Project Structure

### Documentation (this feature)

```text
specs/042-landing-vision-pro-redesign/
├── plan.md                                  # This file (/speckit-plan command output)
├── research.md                              # Phase 0 output (/speckit-plan command)
├── data-model.md                            # Phase 1 output (/speckit-plan command)
├── quickstart.md                            # Phase 1 output (/speckit-plan command)
├── contracts/                               # Phase 1 output (/speckit-plan command)
│   ├── media-asset-manifest-contract.md
│   ├── capture-script-contract.md
│   └── content-inventory-contract.md
└── tasks.md                                 # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── src/
│   ├── pages/
│   │   └── Landing.tsx                       # Composes the hero + section components; embedded first-time profile-setup view unchanged in behavior
│   ├── features/
│   │   ├── landing/                          # NEW — this feature's module (Principle II)
│   │   │   ├── components/
│   │   │   │   ├── LandingHero.tsx           # Minimalist single-viewport hero + primary CTA
│   │   │   │   ├── LandingSection.tsx        # Shared full-viewport-height section shell (media + copy layout)
│   │   │   │   ├── SectionMedia.tsx          # Theme-aware screenshot/video renderer (FR-006, FR-007)
│   │   │   │   └── ParallaxLayer.tsx         # framer-motion useScroll/useTransform wrapper (FR-003)
│   │   │   ├── hooks/
│   │   │   │   ├── useThemeVariant.ts        # Resolves 'light' | 'dark' from the `dark` class on <html> (mirrors ThemeToggle's mechanism)
│   │   │   │   └── useInViewVideo.ts         # IntersectionObserver-driven autoplay/pause (FR-007)
│   │   │   └── data/
│   │   │       └── mediaAssets.ts            # Section → { light, dark } screenshot/video path manifest (data-model.md)
│   │   └── auth/components/
│   │       ├── AuthButtonGroup.tsx           # Consumed unchanged behaviorally; restyled only
│   │       ├── UserProfileForm.tsx           # Consumed unchanged behaviorally; restyled only
│   │       └── AuthWrapper.tsx               # Unchanged — routing/guard logic only
│   ├── lib/
│   │   ├── theme/tokens.ts                   # May gain new accent token values for the hero treatment
│   │   ├── hooks/useReducedMotion.ts          # Reused as-is
│   │   └── components/ui/                    # Shared primitives reused where applicable
│   └── locales/
│       ├── en.json                           # `landing` namespace — keys updated per the chosen section structure
│       └── es.json                           # Kept in lockstep with en.json
├── public/
│   └── landing-media/                        # NEW — Media Asset output (screenshots + videos), light/dark subfolders per section
├── e2e/
│   ├── fixtures/
│   │   ├── seedBoards.ts                     # REUSED as-is by the capture script (not modified)
│   │   ├── seedBoardCards.ts                 # REUSED as-is by the capture script (not modified)
│   │   └── landing-capture.ts                # NEW — Playwright script: seeds demo data, navigates both themes, captures Media Assets (contracts/capture-script-contract.md)
│   ├── authentication.spec.ts                # Updated only for intentional selector/structure changes
│   └── accessibility.spec.ts                 # Updated only for intentional selector/structure changes; assertions not weakened
└── src/test/
    ├── pages/Landing.test.tsx                # Updated alongside the rebuild, not deleted (FR-013)
    └── features/landing/                     # NEW — unit tests for useThemeVariant, useInViewVideo, mediaAssets manifest validation
```

**Structure Decision**: No backend/API changes. The shipped feature lives
entirely inside the existing `retro-rocket/src` frontend tree, adding one new
feature module (`src/features/landing/`) that follows the same
`components/hooks/data` split already used by `dashboard`. Two new artifact
classes are introduced beyond source code: (1) `public/landing-media/`, the
first static-media directory this project has needed (previously the
codebase had none — `public/` held only `index.html` and `rocket.svg`), and
(2) `e2e/fixtures/landing-capture.ts`, a Playwright-driven capture script
(not a correctness test) that reuses the existing `seedBoards`/
`seedBoardCards`/`seedBoardGroups` E2E fixtures to produce those media files
against the Firebase Emulator Suite — never a production project, consistent
with the project's existing `e2e/` convention documented in
`playwright.config.ts`.

## Complexity Tracking

> Not applicable — no Constitution Check violations were identified.
