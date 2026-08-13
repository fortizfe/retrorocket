# Phase 0 Research: Landing Page Redesign — Immersive Commercial Showcase

All items below were resolved from the existing codebase and the resolved
spec Clarifications; no unresolved `NEEDS CLARIFICATION` markers remain in
`plan.md`'s Technical Context.

## 1. Parallax & scroll-driven motion implementation

- **Decision**: Use framer-motion's `useScroll` (with `target`/`offset` bound
  to each section) + `useTransform` to derive parallax offsets, wrapped in a
  reusable `ParallaxLayer` component in `src/features/landing/components/`.
- **Rationale**: framer-motion is already the project's adopted motion
  library (Constitution Principle III) and its `MotionConfig
  reducedMotion="user"` wrapper in `src/App.tsx` already globally disables
  its own animations under `prefers-reduced-motion` — reusing it means the
  reduced-motion fallback for parallax is close to free, rather than a
  second mechanism to build and test.
- **Alternatives considered**: Native CSS `scroll-timeline`/`animation-timeline`
  (rejected: browser support is still inconsistent enough — notably Safari —
  to risk visible breakage on a commercial-facing page; framer-motion's
  scroll hooks work uniformly across the project's supported browsers today).
  A dedicated parallax library (e.g. `react-scroll-parallax`) was rejected
  under Principle III: it would duplicate capability framer-motion already
  provides and adds bundle weight for a single-page feature.

## 2. Full-viewport section sizing (continuous, non-snapping scroll)

- **Decision**: Size each `LandingSection` to `100dvh` (dynamic viewport
  height unit), not `100vh`.
- **Rationale**: Per the Clarifications, scrolling must remain continuous
  and never intercepted — but on mobile Safari/Chrome, `100vh` includes the
  browser chrome (address bar) even after it collapses on scroll, causing
  sections to visibly overflow or leave a gap. `100dvh` tracks the actual
  visible viewport and is supported by all browsers this project already
  targets (WCAG/E2E suite runs Chromium; the app itself targets evergreen
  mobile/desktop browsers).
- **Alternatives considered**: JavaScript-measured viewport height (e.g. a
  `window.innerHeight` resize listener setting a CSS custom property) —
  rejected as unnecessary complexity now that `100dvh` has broad support;
  kept as a documented fallback path only if a real device QA pass in
  Phase 2/implementation surfaces a gap.

## 3. Video in-view autoplay/pause

- **Decision**: A small `useInViewVideo` hook wrapping the native
  `IntersectionObserver` API, toggling `video.play()`/`video.pause()` as the
  element's visibility crosses a threshold (~50% in viewport), returned
  alongside a `ref` and `isInView` boolean for the calling `SectionMedia`
  component.
- **Rationale**: `IntersectionObserver` is a native browser API, so it
  satisfies Constitution Principle III (no new dependency) while giving
  precise control over the "pause once out of view" requirement (FR-007).
  framer-motion's own `useInView` hook is a thin wrapper over the same
  browser API and was considered but a hand-rolled hook was chosen so
  playback control is decoupled from framer-motion's animation/reduced-motion
  semantics — video playback and parallax motion are governed by the same
  `prefers-reduced-motion` signal but are conceptually different concerns
  (one is "should this element move," the other is "should this element
  play sound/motion content").
- **Alternatives considered**: `autoplay`/`loop` HTML attributes alone with
  no visibility gating (rejected — wastes bandwidth/CPU on off-screen video
  and does not satisfy the "pause once out of view" requirement).

## 4. Reduced-motion / blocked-autoplay static fallback

- **Decision**: Every video Media Asset has a paired static poster-frame
  image (the `video` element's native `poster` attribute), and
  `SectionMedia` renders the poster-only `<img>` instead of `<video>`
  entirely when `useReducedMotion()` is true or when the browser's
  `HTMLMediaElement.play()` promise rejects (autoplay blocked).
- **Rationale**: Directly satisfies FR-007 and the reduced-motion edge case
  without a second video encode; the poster frame is a byproduct of the
  same capture pass (first frame of the recorded clip) rather than a
  separately designed asset.
- **Alternatives considered**: A CSS-only "freeze via `animation-play-state`"
  approach (rejected — still downloads and decodes video even though it
  never plays, which is wasted bandwidth exactly in the scenario, slow
  connections/reduced-motion users, where it matters most).

## 5. Media Asset storage & theme-variant delivery

- **Decision**: Static files under `public/landing-media/{section-key}/{light|dark}.{webp|mp4}`,
  referenced by a typed manifest (`src/features/landing/data/mediaAssets.ts`)
  rather than dynamic `import()` — resolved to a URL at build time via
  Vite's standard `public/` passthrough.
- **Rationale**: This is the project's first static-media requirement
  (`public/` currently holds only `index.html` and `rocket.svg`); using
  Vite's `public/` convention needs no new tooling. A typed manifest keyed
  by section gives the `Landing Section` and `Media Asset` entities
  (`data-model.md`) a single source of truth that both the app and the
  capture script agree on.
- **Alternatives considered**: Importing images/video as ES modules through
  `src/assets/` (rejected — video files are large enough that bundler
  content-hashing/inlining behavior adds no value here and complicates the
  capture script's job of writing output files to a predictable path).

## 6. Theme-variant selection at render time

- **Decision**: `useThemeVariant()` hook reads the same signal
  `ThemeToggle.tsx` already writes — the `dark` class on
  `document.documentElement` — via a `MutationObserver` on `class`, falling
  back to `localStorage.getItem('theme')` / `prefers-color-scheme` on first
  render (mirroring `ThemeToggle`'s own initialization logic) so the correct
  variant is picked even before the toggle has been interacted with in the
  current session.
- **Rationale**: Reuses the existing, already-shipped theme mechanism
  instead of introducing a new theme-context/provider; guarantees Media
  Assets update immediately when the visitor flips `ThemeToggle` (FR-006),
  since both components observe the same DOM signal.
- **Alternatives considered**: A new React Context for theme (rejected —
  duplicates state the DOM/`localStorage` already own via `ThemeToggle`, and
  the constitution favors the simplest solution that satisfies the
  requirement — Principle V).

## 7. Media capture process (repeatable, per FR-015)

- **Decision**: A new Playwright-driven script,
  `e2e/fixtures/landing-capture.ts`, run on demand (not part of the
  merge-blocking `e2e` job) that: (a) starts against the Firebase Emulator
  Suite exactly as the existing `e2e` suite does, (b) seeds one demo user
  and a small set of realistic boards/cards/groups by calling the existing
  `seedBoards`/`seedBoardCards`/`seedBoardGroups` fixtures with a curated
  realistic dataset (see `contracts/capture-script-contract.md`), (c)
  navigates to each product surface referenced by a `Landing Section`, in
  both theme states (`forceTheme` pattern already used by
  `e2e/accessibility.spec.ts`), and (d) uses Playwright's built-in
  `page.screenshot()` and per-context `video` recording (`recordVideo` on
  the browser context) to emit files directly into
  `public/landing-media/{section}/{theme}.{ext}`.
- **Rationale**: Directly reuses proven, already-tested fixtures
  (`seedBoards.ts`/`seedBoardCards.ts`, previously built for feature 031's
  own "realistic densely-populated board" visual-review need) instead of a
  new seeding mechanism; Playwright's native screenshot/video capture means
  no new capture tooling/dependency is required (Principle III); running it
  against the Emulator Suite guarantees no real user/production data can
  ever appear in a capture (FR-005), satisfying the privacy requirement
  structurally rather than by convention alone.
- **Alternatives considered**: A manual, ad hoc screen-recording workflow
  (rejected outright by FR-015/Clarifications — explicitly required to be
  repeatable/documented, not manual). A separate headless-browser tool
  (e.g. Puppeteer) outside the existing Playwright investment (rejected —
  would duplicate an already-adopted, already-configured E2E toolchain for
  no added capability).

## 8. Demo dataset realism (fictional but realistic)

- **Decision**: A small, hand-curated fixture data file (referenced from
  `landing-capture.ts`) with fictional team/board names (e.g. "Product
  Design Weekly", "Platform Squad") and natural-language card text spanning
  the app's existing column types, seeded via the existing
  `seedBoardCards`/`seedBoardGroups` fixtures (which already support
  grouping) rather than the generic `"Seed card 0001"` placeholder strings
  those fixtures default to for scale-testing purposes.
- **Rationale**: FR-005 requires realistic-looking, non-empty, fictional
  content; the existing fixtures already parameterize `contentPrefix`/
  `titlePrefix`, so realistic strings can be supplied without modifying the
  fixtures themselves (Constitution Check: fixtures remain read/reuse only).
- **Alternatives considered**: Reusing the default `"Seed Board 0001"` /
  `"Seed card 0001"` strings as-is (rejected — explicitly fails FR-005/SC-005,
  which prohibit placeholder-looking content in shipped Media Assets).

## 9. Mobile parallax intensity reduction (per Clarifications)

- **Decision**: `ParallaxLayer` accepts an `intensity` prop; a shared
  breakpoint check (reusing the project's existing Tailwind `md:` breakpoint
  convention, read via `window.matchMedia`) scales the `useTransform` output
  range down (e.g. to ~25% of desktop displacement) below that breakpoint,
  rather than disabling parallax outright — preserving a sense of depth on
  mobile without the desktop-scale displacement that risks scroll jank.
- **Rationale**: Directly implements the resolved Clarification ("reduced,
  not disabled, on mobile"); reusing `matchMedia` and the existing Tailwind
  breakpoint keeps this consistent with how `useReducedMotion` and
  `ThemeToggle` already read platform signals, rather than inventing a new
  viewport-detection utility.
- **Alternatives considered**: Fully disabling parallax on mobile (rejected
  — the resolved Clarification specifically chose "reduced," not
  "disabled," to preserve some of the depth effect within a performance
  budget).
