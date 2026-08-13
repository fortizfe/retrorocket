# Design Review: Landing Page Redesign — Immersive Commercial Showcase

**Reviewed against**: Apple Human Interface Guidelines design principles (clarity, deference, depth), via the `apple-design`/`emil-design-eng` skills (Constitution Principle IX). Motion reviewed via the `animate` skill's decision framework (each motion's purpose, properties, curve/duration, interruption/exit behavior — see inline comments in `LandingHero.tsx` and `ParallaxLayer.tsx`).

**Scope**: `src/pages/Landing.tsx` and `src/features/landing/*`, as implemented (SC-007).

## Clarity

- **Hero**: a single headline, one supporting line, and one CTA panel — no competing elements. Typography carries the hierarchy (5xl→7xl bold headline, secondary-colored subhead, no more than two font weights on screen at once).
- **Sections**: each section states its purpose in a title + one-line subtitle before any supporting detail (capability grid, numbered steps, tech list). No section requires the visitor to infer what it's about.
- **Real product media** (capabilities, howItWorks) replaces the abstract icon-grid pattern feature 029 used — a visitor can now see the literal product rather than inferring it from iconography, which is a direct clarity improvement for the specific goal of this feature (commercial credibility).

## Deference

- Content and the product itself (via real screenshots) are the visual subject; UI chrome is minimal — no persistent top nav/logo bar (a deliberate departure from the pre-redesign header), just the existing `ThemeToggle` in a fixed corner.
- The hero's ambient gradient is restrained (a soft two-layer radial glow, not a graphic or illustration) so it reads as atmosphere behind the typography, not competing content — verified against WCAG contrast (see Accessibility below) to confirm it stays deferential rather than degrading legibility.
- Section media uses `object-cover` inside a simple rounded frame with a shadow — no ornamental chrome (browser-mockup frames, drop shadows stacked with borders, etc.) that would compete with the real product UI already visible inside the screenshot.

## Depth

- `ParallaxLayer` gives scrolling sections a sense of spatial layering (media moves at a different rate than the viewport) without resorting to 3D transforms or heavy shadows — the same restrained-depth approach the constitution's Principle IX favors.
- The two-column (copy / media) layout on desktop, collapsing to a stacked single column on mobile, preserves a implied "layer" relationship (text in front, product behind/beside) across breakpoints rather than losing it on small screens.
- Depth intensity is itself context-aware: reduced on mobile viewports (`research.md` #9) and removed entirely under `prefers-reduced-motion` — depth is an enhancement, never a requirement to perceive content.

## Motion (via `animate`)

- Hero entrance: single mount-time fade + 12px upward drift, ~400ms, CTA panel offset by 120ms — a "calm arrival," not an attention-grabbing flourish. No interruption case (runs once); no exit (hero persists).
- Parallax: continuous, scroll-position-driven (not time-based), so it can never desync from the visitor's own scroll input; reduces to a static `[0, 0]` range under reduced motion rather than being disabled via a separate code path (one mechanism, not two).
- Section media fade-in on load (added during Polish, FR-014): 500ms opacity transition from the same design-token timing scale used elsewhere in the app, avoiding a jarring pop-in as lazy-loaded images resolve.

## Accessibility cross-check (Constitution Principle VIII, not superseded by Principle IX)

- `npx playwright test accessibility.spec.ts -g "Landing has no WCAG"` — **0 violations, light and dark** (axe-core, WCAG 2.1 AA tags), including with the stronger hero gradient.
- Keyboard operability: no custom scroll-jacking was introduced (FR-002's free-scroll decision), so native keyboard/screen-reader scroll behavior is unaffected by this redesign.
- Reduced motion: parallax and video autoplay both degrade to static equivalents; verified via `computeParallaxRange` unit tests and `SectionMedia`'s reduced-motion fallback test.

## Findings

No unresolved high-priority findings. One deliberate scope reduction is on record (T026's note in `tasks.md`): all three Media Assets shipped as `kind: 'screenshot'` rather than screenshot + video, since producing genuinely short per-section video from Playwright's session recording was materially more complex than the equivalent screenshot capture for the same FR-004 requirement, and the `video` code path (`useInViewVideo`, `SectionMedia`'s video branch) remains fully implemented and unit-tested for a future capture-script enhancement.

**Result**: SC-007 satisfied — zero unresolved high-priority findings.

## Post-ship revision (2026-08-12, user feedback)

Initial ship under-delivered on two fronts the user called out directly: the parallax effect was real but imperceptible (±60px against a ~900px section — confirmed via direct transform measurement, not just "too subtle" guesswork), and only 2 of 4 sections carried real captures.

- **Parallax**: `BASE_RANGE_PX` raised 60→200px, plus a new "breathing" scale cue (0.9→1→0.9 as the section centers) layered on the outer frame. This also surfaced a real architectural bug in the first pass — the clipping frame was sized exactly to the image, so a larger translation range would have clipped it / shown empty gaps. Fixed by making the moving layer intentionally oversized (inset by the parallax magnitude on each side) inside a fixed-aspect-ratio clipping frame, the standard technique for this effect. Verified via direct scroll-position screenshots (no gaps, smooth reveal) and computed-transform inspection, not just a visual "looks fine" pass.
- **More real captures**: added a third Media Asset for the `technology` section (previously purely typographic) — a mobile-viewport (390×844) capture of the retrospective board, chosen because it's tangible *proof* of the section's own "Mobile First" / "Tailwind CSS responsive design" claims rather than a screenshot bolted on for its own sake (deference principle: the capture serves the section's existing message, it doesn't invent a new one).

Re-verified after these changes: full Vitest suite (2443 tests), lint, type-check, E2E authentication + accessibility (0 WCAG 2.1 AA violations, both themes) all still pass.

## Second post-ship revision (2026-08-12, user feedback round 2)

User feedback: "the parallax is backwards — it applies to the real screenshots. What I want is more of a background, for the parallax effect to apply to the background. For example one screen in one color and another in another." Two distinct problems, both fixed:

1. **Parallaxing the screenshot itself was the wrong target.** Moving a real product screenshot (UI content people read, not photography) reads as unnatural. Redesigned: `ParallaxLayer` was stripped back to a pure oversized-mover/clip primitive (dropped the media-specific scale cue) and repointed at a new `SectionBackground` component — a full-bleed, scroll-parallaxed color wash per section, one distinct decorative tone each (`blue`/`emerald`/`violet`/`rose` — deliberately not reusing the app's functional status tokens, so a colorful wash is never mistaken for a status signal). `SectionMedia` now renders as a fully static, sharp screenshot — confirmed via bounding-box measurement across scroll positions (moves at exactly 1:1 with scroll, i.e. genuinely static).
2. **The color wash was itself invisible** even after the redesign — found via direct pixel-region screenshots (not just "looks subtle," an actual empty-looking crop) and traced to a real CSS bug: the `-z-10` background layer had no stacking-context-creating ancestor, so it escaped the section entirely and painted behind unrelated page-level content instead of just its own section. Fixed with `isolate` (`isolation: isolate`) on each section (and the hero, which had the same latent bug in its own gradient). Re-verified via a zoomed background-only crop showing the color clearly, then dialed opacity back down from an intentionally-oversaturated debug value to a tasteful `0.22→0.09` gradient once confirmed working.

Re-verified after this round: full Vitest suite (2444 tests, including new `SectionBackground.test.tsx`), lint, type-check, E2E authentication (8/8) + accessibility (0 WCAG 2.1 AA violations, both themes, with the now-actually-visible backgrounds) all pass.

## Third post-ship revision (2026-08-12, user feedback round 3)

User feedback: alternate the background tone between only the first two colors (1st, 2nd, 1st, 2nd, ...) rather than a distinct color per section, and make the real product captures much larger — "deben ocupar mucha porción de pantalla."

- **Alternating tones**: `SectionTone` narrowed to exactly `'blue' | 'emerald'` (dropped the unused `violet`/`rose` — YAGNI, Constitution Principle V); `Landing.tsx` now derives the tone from `TONE_CYCLE[section.order % 2]` instead of a fixed per-key map, so a 5th section would automatically continue the alternation rather than needing a new color assigned.
- **Larger captures**: `LandingSection`'s layout changed from a 50/50 side-by-side grid (copy | media) to a stacked layout — compact centered copy on top, then the screenshot below at a large, viewport-relative size (`h-[42vh]` → `h-[64vh]` at desktop widths, full container width). This surfaced a real regression risk caught before ship: the `technology` section's capture is a *portrait* mobile screenshot, and forcing it into the same wide landscape frame via `object-cover` cropped it into an illegible zoomed sliver. Fixed with a second `mediaLayout="phone"` mode (a tall, phone-proportioned frame) rather than a one-size-fits-all box, so the mobile capture stays a full, readable, phone-shaped mockup instead of the same box as the desktop captures.

Re-verified after this round: full Vitest suite (2444 tests), lint, type-check, E2E authentication (8/8) + accessibility (0 WCAG 2.1 AA violations, both themes) all pass. Visually confirmed in both themes: colors alternate 1-2-1-2 across the four sections, all three captures read as large and legible (including the corrected phone-shaped mobile one).

## Fourth post-ship revision (2026-08-12, user feedback round 4)

User feedback: the captures looked bad (cropped) at the new large size, requested at least one real video, and asked for a new section highlighting AI-powered sentiment analysis.

1. **Recaptured at the correct, deterministic size.** The "wide" media frame's previous `h-[42vh]→h-[64vh]` sizing was viewport-height-relative, so its rendered aspect ratio was never guaranteed to match the 1280×800 screenshots captured for it — `object-cover` was silently cropping real content. Changed the frame to a fixed `aspect-video` (16:9) and recaptured at exactly `1600×900` (also 16:9), so the display frame and the capture agree by construction, not by coincidence. Same principle already applied to the phone frame (`aspect-[390/844]`, captured at exactly `390×844`).
2. **Added a real video.** `howItWorks` is now `kind: 'video'` instead of a screenshot: a short, silent, muted-autoplay `.webm` loop of live card-voting, recorded via a dedicated Playwright browser context per theme with `recordVideo` enabled — the context's lifetime (creation → `close()`) *is* the trim, no video-editing tool needed (none was available). Output is `.webm` (Playwright's native format); `SectionMedia` now infers the MIME type from the file extension instead of hardcoding `video/mp4`. Verified the video actually autoplays and loops in a live page (`!paused && !ended && currentTime > 0`), not just that the file exists.
3. **Added the `sentiment` section** (AI-powered sentiment analysis) — a genuinely real, previously-unshowcased product capability (on-device per-card classification + a live team mood score with insights, `src/features/boards/sentiment/`). Content added to both locales (`landing.sentiment.*`); section inserted at `order: 2` (between `howItWorks` and `technology`), so the alternating tone cycle continues automatically. The capture is the actual Team Mood dashboard, reached via Facilitador → "Estado del Equipo", waited until the on-device model had *genuinely finished* analyzing all cards (polled for "Basado en el análisis de N tarjetas", not just the initial zeroed placeholder state that appears within the first second) — confirmed the model completes in ~5-8s locally, well within a 60s capture budget. The demo dataset's `improve`-column card text was also reworded (still realistic, still genuine forward-looking suggestions) to read more like an engaged team's actual retro notes, since the literal wording is what the model scores — the capture now shows a genuine 7.6/10 "Muy Bueno" result rather than a flatter, less compelling one.

Re-verified after this round: full Vitest suite (2447 tests, including expanded `mediaAssets.test.ts` coverage for the video + new section), lint, type-check, E2E authentication (8/8) + accessibility (0 WCAG 2.1 AA violations, both themes) all pass. Visually confirmed in both themes: no cropping on any capture, the video autoplays/loops, and the sentiment section reads as a compelling, genuine result.

## Fifth post-ship revision (2026-08-13, user feedback round 5)

User feedback: the `howItWorks` video "no convence" (isn't landing well) — replace it with an image, like every other section.

1. **`howItWorks` reverted to `kind: 'screenshot'`.** `mediaAssets.ts`'s entry now points at `public/landing-media/howItWorks/{light,dark}.png` instead of the `.webm`/poster pair; the stale `.webm` and `*-poster.png` files were deleted.
2. **`landing-capture.ts` simplified back to a single-screenshot capture.** The dedicated per-theme `browser.newContext({ recordVideo })` block (and its now-unused `VIDEO_VIEWPORT` constant) is gone; `howItWorks` is captured in the same per-theme loop as `capabilities`/`sentiment`/`technology`, at `WIDE_VIEWPORT` (1600×900, still the exact `aspect-video` ratio), taken mid-interaction (a couple of cards already liked) so it still reads as a live collaboration moment rather than a static idle board.
3. **No component change.** `SectionMedia`'s video-rendering branch and `useInViewVideo` are untouched — both remain implemented and unit-tested (T026's original "kept for future use" note in `tasks.md`) even though no manifest entry currently exercises them.
4. Recaptured both theme variants via `firebase emulators:exec --only auth,firestore "npx playwright test --project=landing-capture --config playwright.config.ts"` against a freshly-started local Emulator Suite (capture-script-contract.md's verification procedure).

Re-verified after this round: full Vitest suite (2446 tests), lint, and type-check all pass. Visually confirmed in both themes: the new `howItWorks` screenshot fills the same `aspect-video` frame with no cropping.
