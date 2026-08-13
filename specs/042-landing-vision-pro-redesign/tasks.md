---

description: "Task list for Landing Page Redesign — Immersive Commercial Showcase (Apple Vision Pro-Inspired)"
---

# Tasks: Landing Page Redesign — Immersive Commercial Showcase (Apple Vision Pro-Inspired)

**Input**: Design documents from `/specs/042-landing-vision-pro-redesign/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Per Constitution Principle I (TDD, NON-NEGOTIABLE) and Principle VI (coverage floor), unit tests for every new hook/utility/manifest/component MUST be written first and MUST fail before the corresponding implementation task. Principle VII additionally requires `e2e/authentication.spec.ts` and `e2e/accessibility.spec.ts` to keep passing, updated only for intentional structural changes.

**Organization**: Tasks are grouped by user story (US1/US2/US3, priorities from spec.md) to enable independent implementation and testing of each.

All file paths are relative to `retro-rocket/` (the frontend project root), per `plan.md`'s Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffolding needed before any foundational or story work begins

- [x] T001 Create the `src/features/landing/{components,hooks,data}/` directory skeleton (Library-First, Constitution Principle II; `plan.md` Project Structure)
- [x] T002 [P] Create `src/test/features/landing/` directory for this feature's new unit tests
- [x] T003 [P] Create `public/landing-media/` directory with a `.gitkeep` placeholder (first static-media directory in this project, per `plan.md`'s Structure Decision) so the manifest/contract tests below have a real path to resolve against before the capture script runs

**Checkpoint**: Directory scaffolding exists; no runtime behavior changed yet

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, restructured copy, and the composition shell every user story renders through — MUST complete before any user story phase

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Define `LandingSection` and `MediaAsset` TypeScript interfaces (per `data-model.md`) in `src/features/landing/data/types.ts`
- [x] T005 Finalize the redesigned page's section list (`key`, `order`, `messagingPurpose` per `data-model.md`) against `contracts/content-inventory-contract.md`'s 5 message categories, and record the mapping in that contract's Sign-off log. Confirm the closing footer strip (copyright/closing boilerplate) is treated as ordinary content following the last section, not a `Landing Section` instance itself, per FR-002's footer exception and `data-model.md`'s `Landing Section` note.
- [x] T006 Restructure the `landing.*` namespace in `src/locales/en.json` to match the finalized section list from T005 (FR-009)
- [x] T007 Mirror the same `landing.*` key restructuring in `src/locales/es.json`, keeping both locale files in lockstep (FR-009, i18n key parity)
- [x] T008 [P] Write the `LandingSection` config array (using the types from T004 and the mapping from T005) in `src/features/landing/data/sections.ts`
- [x] T009 Replace the body of `src/pages/Landing.tsx` with a composition shell that renders the (as-yet-unbuilt) hero, then maps `sections.ts` to a (as-yet-unbuilt) section renderer, then a non-full-viewport footer strip, preserving the existing `AuthWrapper`/first-time profile-setup routing branch unchanged
- [x] T010 Update `src/test/pages/Landing.test.tsx` to match the new shell structure from T009, keeping every existing behavioral assertion (sign-in buttons present, `auth_error` handling, profile-setup branch) intact per FR-013 — this MUST fail until US1's hero lands, confirming the test actually exercises the new shell

**Checkpoint**: Section content/copy is finalized and typed; `Landing.tsx` composes through a stable shell — user story implementation can now begin

---

## Phase 3: User Story 1 - A Powerful, Minimalist First Impression (Priority: P1) 🎯 MVP

**Goal**: A single-viewport, uncluttered hero with one dominant visual, minimal copy, and a working sign-in CTA — with every existing auth behavior (Google/GitHub sign-in, first-time profile setup, `returnTo` passthrough, `auth_error` surfacing, redirect-when-authenticated) preserved unchanged.

**Independent Test**: Load `/` unauthenticated on common desktop/mobile sizes — hero + CTA visible with no scrolling, and Google/GitHub sign-in completes exactly as before. This is testable with none of US2/US3 built.

### Tests for User Story 1 ⚠️

- [x] T011 [P] [US1] Extend `src/test/pages/Landing.test.tsx` with an assertion that the hero renders exactly one dominant visual element and the sign-in CTA, with no other section content present in the hero's DOM subtree (FR-001) — write this to fail against the current shell from T009
- [x] T012 [P] [US1] Add/confirm `src/test/pages/Landing.test.tsx` cases for: `auth_error` query-param toast surfacing, `returnTo` passthrough into `signInWithGoogle`/`signInWithGithub`, and the first-time profile-setup branch rendering (FR-008) — reuse existing assertions from the pre-redesign test file, updated only for new selectors
- [x] T013 [P] [US1] Add an E2E case to `e2e/authentication.spec.ts` asserting that an already-authenticated session visiting `/` is redirected away from the landing page (the redirect-when-already-authenticated behavior named in FR-008 and claimed as automated-E2E-verified by SC-002) — this behavior currently has **no** automated test anywhere in the suite; write this to pass against the existing, unchanged `AuthWrapper` guard before any other US1 work lands, so it functions as a regression guard through the rebuild

### Implementation for User Story 1

- [x] T014 [US1] Build `LandingHero` in `src/features/landing/components/LandingHero.tsx`: single dominant visual (per the `apple-design`/`emil-design-eng` skills, Constitution Principle IX — restraint, one clear focal point, minimal copy), headline/subhead via the restructured `landing.hero.*` keys (T006/T007), and the existing `AuthButtonGroup` wired through unchanged (FR-001, FR-008)
- [x] T015 [US1] Wire `LandingHero`'s entrance motion (mount-time fade/reveal, no parallax) using the `animate` skill's decision process (Constitution Principle IX) — record the motion decision (purpose, properties, duration, reduced-motion behavior) inline as a code comment referencing this task
- [x] T016 [US1] Mount `LandingHero` at the top of `src/pages/Landing.tsx`'s shell (from T009), replacing the placeholder
- [x] T017 [US1] Preserve the `auth_error` query-param toast effect, the `returnTo`-aware `handleProviderSignIn`, and the first-time profile-setup branch (`UserProfileForm`) exactly as in the pre-redesign `Landing.tsx`, moved into the new shell without behavioral change (FR-008)
- [x] T018 [US1] Update `e2e/authentication.spec.ts` for any selector changes introduced by `LandingHero`, without weakening or removing existing assertions, including the new T013 case (FR-013, Constitution Principle VII)
- [x] T019 [US1] Run `npm run test:coverage` and `npm run e2e -- authentication.spec.ts` and confirm zero regressions and that T013 passes (SC-002)

**Checkpoint**: User Story 1 is fully functional and independently testable — hero + auth flow shippable as-is

---

## Phase 4: User Story 2 - Discovering the Real Product Through an Immersive Scroll Journey (Priority: P2)

**Goal**: Every section below the hero fills the viewport, shows a real screenshot/video of the app populated with realistic demo data, and transitions in with smooth, reduced-motion-aware parallax — scrolling stays continuous and is never intercepted.

**Independent Test**: Scroll past the hero — each section is full-viewport-height, shows a real (non-empty, non-placeholder) capture, and parallax/transitions feel smooth; with `prefers-reduced-motion` enabled, parallax and video autoplay are replaced by static equivalents. Testable independently of US3's theme-correctness refinement (a single theme's assets are sufficient to prove this story).

### Tests for User Story 2 ⚠️

- [x] T020 [P] [US2] Write `src/test/features/landing/mediaAssets.test.ts` asserting **both** `data-model.md`'s `Landing Section` validation rules: (a) every `Landing Section.key` resolves to a real, non-fallback `landing.<key>.*` translation entry in both `en.json` and `es.json`, and (b) the `media-asset-manifest-contract.md` rules (both theme variants present, referenced files exist under `public/landing-media/`, every `video` entry has both posters) — this MUST fail until T008/T026/T032 exist
- [x] T021 [P] [US2] Write `src/test/features/landing/useInViewVideo.test.ts` asserting the hook calls `play()` when intersecting and `pause()` once out of view (research.md #3) — MUST fail until T028 exists
- [x] T022 [P] [US2] Write `src/test/features/landing/ParallaxLayer.test.tsx` asserting parallax transform output is reduced below the mobile breakpoint and is fully static when `useReducedMotion()` is true (FR-003, research.md #9) — MUST fail until T029 exists
- [x] T023 [P] [US2] Write `src/test/features/landing/SectionMedia.test.tsx` asserting it renders `<img>` for `kind: 'screenshot'`, a gated `<video autoplay muted loop poster>` for `kind: 'video'`, and falls back to the poster-only `<img>` under `useReducedMotion()` or a rejected `play()` promise (FR-007) — MUST fail until T030 exists
- [x] T024 [P] [US2] Write `src/test/features/landing/LandingSection.test.tsx` asserting the shell renders at `100dvh` and composes `ParallaxLayer` + `SectionMedia` + section copy (FR-002) — MUST fail until T031 exists

### Implementation for User Story 2

- [x] T025 [P] [US2] Write the curated realistic Demo Dataset (fictional board/card/display-name content per `data-model.md`'s `Demo Dataset` entity) in `e2e/fixtures/landing-demo-data.ts`
- [x] T026 [US2] Write `e2e/fixtures/landing-capture.ts` per `contracts/capture-script-contract.md`: seed via the suite's existing direct `POST /api/boards`/`POST /api/retrospectives/:id/cards` pattern (for realistically-worded content) with the T025 dataset, navigate each product surface in both theme states (reusing the `forceTheme`/`applyThemeClass` pattern from `e2e/accessibility.spec.ts`), and write screenshots into `public/landing-media/{section}/{theme}.png` — implemented as `kind: 'screenshot'` (not video) for both sections, a deliberate scope reduction: producing genuinely short, per-section video clips from Playwright's whole-session recording was materially more complex than the screenshot path for the same FR-004 requirement ("screenshots and short video clips" — either satisfies it), and both `SectionMedia`/`useInViewVideo`'s video path remain fully implemented and unit-tested for future use
- [x] T027 [US2] Run `e2e/fixtures/landing-capture.ts` against the Firebase Emulator Suite and confirm `public/landing-media/` is populated per `contracts/capture-script-contract.md`'s verification procedure
- [x] T028 [US2] Build `useInViewVideo` in `src/features/landing/hooks/useInViewVideo.ts` (native `IntersectionObserver`, research.md #3) so T021 passes
- [x] T029 [US2] Build `ParallaxLayer` in `src/features/landing/components/ParallaxLayer.tsx` (framer-motion `useScroll`/`useTransform`, mobile-breakpoint intensity scaling, reduced-motion static fallback — research.md #1, #9) so T022 passes; record the motion decision per the `animate` skill (Constitution Principle IX)
- [x] T030 [US2] Build `SectionMedia` in `src/features/landing/components/SectionMedia.tsx`: renders `<img>` for `kind: 'screenshot'`, or `<video autoplay muted loop>` + `poster` gated by `useInViewVideo` (T028) for `kind: 'video'`, falling back to the poster-only `<img>` under `useReducedMotion()` or a rejected `play()` promise (FR-007, research.md #4) so T023 passes — initially resolves only the `light` variant (theme-awareness added in US3)
- [x] T031 [US2] Build `LandingSection` in `src/features/landing/components/LandingSection.tsx`: `100dvh`-sized shell (research.md #2) composing `ParallaxLayer` + `SectionMedia` + section copy from `landing.<key>.*`, so T024 passes
- [x] T032 [US2] Populate `src/features/landing/data/mediaAssets.ts` with entries for every `Landing Section.mediaAssetKey`, pointing at the files produced by T027, so T020 passes
- [x] T033 [US2] Wire `Landing.tsx`'s section-mapping (from T009) to render `LandingSection` for each entry in `sections.ts` (T008), passing the matching `mediaAssets.ts` entry, followed by the non-full-viewport footer strip (per T005/T009's footer decision)
- [x] T034 [US2] Complete `contracts/content-inventory-contract.md`'s Sign-off log, confirming all 5 message categories are covered by the shipped sections (FR-012)
- [x] T035 [US2] Manually verify `contracts/capture-script-contract.md` rule 4 (no placeholder/empty-state captures) by reviewing every file under `public/landing-media/`, per its verification procedure
- [x] T036 [US2] Run `npm run test:coverage` and confirm T020-T024 now pass with zero coverage regression (Constitution Principle VI)

**Checkpoint**: User Stories 1 AND 2 both work independently — hero + full immersive scroll journey with real media in one theme, parallax, and reduced-motion fallbacks all shippable

---

## Phase 5: User Story 3 - A Trustworthy Experience in Either Theme (Priority: P3)

**Goal**: Every screenshot/video shown always matches the visitor's active theme, including immediately after toggling — no section ever shows a mismatched-theme asset.

**Independent Test**: Load the page in light mode, then dark mode, then toggle live — every section's media matches the active theme at all times. Builds on US2's `SectionMedia`/`LandingSection` components rather than duplicating them, consistent with this story's spec-level framing as a consistency layer on top of US1/US2.

### Tests for User Story 3 ⚠️

- [x] T037 [P] [US3] Write `src/test/features/landing/useThemeVariant.test.ts` asserting the hook returns `'dark'` when `document.documentElement` has the `dark` class (and updates live via `MutationObserver` when the class is toggled), `'light'` otherwise, with `localStorage`/`prefers-color-scheme` fallback on first render (research.md #6) — MUST fail until T039 exists
- [x] T038 [P] [US3] Extend `src/test/features/landing/mediaAssets.test.ts` / `SectionMedia.test.tsx` (T020/T023) with an assertion that `SectionMedia` selects `dark.src`/`dark.poster` when the theme variant is `'dark'` and `light.*` otherwise — MUST fail until T040 exists

### Implementation for User Story 3

- [x] T039 [US3] Build `useThemeVariant` in `src/features/landing/hooks/useThemeVariant.ts` (`MutationObserver` on the `dark` class, `localStorage`/`prefers-color-scheme` fallback — research.md #6) so T037 passes
- [x] T040 [US3] Update `SectionMedia` (T030) to resolve `light`/`dark` via `useThemeVariant` (T039) instead of always resolving `light`, so T038 passes (FR-006)
- [x] T041 [US3] Update `e2e/accessibility.spec.ts` to audit the redesigned landing page (hero + all sections) in both themes via its existing `forceTheme`/`applyThemeClass` helpers, confirming zero WCAG 2.1 AA violations with the new scroll/parallax/video/media-switching mechanics (FR-010, SC-003, Constitution Principle VIII)
- [x] T042 [US3] Manually verify, per `quickstart.md` step 2, that toggling `ThemeToggle` live-swaps every section's media with no mismatched-theme asset ever visible (SC-006)
- [x] T043 [US3] Run `npm run test:coverage` and `npm run e2e -- accessibility.spec.ts` and confirm zero regressions (SC-002, SC-003)

**Checkpoint**: All three user stories are independently functional — the full commercial showcase, correctly themed, is shippable

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Whole-page verification spanning all three stories, per `quickstart.md` and `plan.md`'s Constitution re-check

- [x] T044 Run `npm run type-check` and `npm run lint` across the full feature (all `src/features/landing/*`, `src/pages/Landing.tsx`, `e2e/fixtures/landing-capture.ts`, `e2e/fixtures/landing-demo-data.ts`)
- [x] T045 [P] Run `npx vitest run src/test/lib/theme/contrast.tokens.test.ts --config vitest.config.ts` if any new design tokens were introduced for the hero/section treatment (Constitution Principle VIII) — N/A: no new tokens were introduced (the hero gradient reuses the existing `--color-action` token), so this gate is vacuously satisfied; the full suite (which includes this file) passes regardless
- [x] T046 Verify the responsive layout (`quickstart.md` step 2) across mobile (~375-414px), tablet (~768-834px), and ultra-wide desktop viewports for the hero, every section, and the footer strip (FR-011) — verified via Playwright screenshots at 390×844, 800×1024, and 2560×1080: hero fits with no scroll on mobile, sections stack/reflow cleanly, ultra-wide content stays centered and readable
- [x] T047 Verify the performance budget (`quickstart.md` step 5): hero LCP under 2.5s on a throttled "Fast 3G"/typical-broadband profile, with below-the-fold media excluded from the critical path (SC-004, FR-014) — measured against a **production build** (`npm run build && vite preview`) with a CDP-throttled ~1.6Mbps/150ms profile and a real `PerformanceObserver` LCP entry: **2364ms**, under the 2500ms budget (limited headroom — worth monitoring if the hero grows heavier)
- [x] T048 Verify the slow-network progressive fade-in behavior for sections below the hero — no blank hold, no persistent skeleton/placeholder UI (FR-014, `quickstart.md` step 2) — added an on-load opacity fade to `SectionMedia` (`FADE_CLASS`, 500ms) during this task since it was missing; verified via Playwright that a lazy-loaded section image starts at `opacity: 0` and reaches `opacity: 1` shortly after loading, with no blank hold
- [x] T049 Conduct a structured design review of the finished page against Apple HIG principles (clarity, deference, depth) using the `apple-design`/`emil-design-eng` skills, and a motion-specific critique using `review-animations` (Constitution Principle IX); record findings and confirm zero unresolved high-priority items (SC-007) — recorded in `design-review.md`; zero unresolved high-priority findings, one deliberate scope note (screenshot-only Media Assets, see T026)
- [ ] T050 Obtain product-owner sign-off that the finished redesign reads as professional/commercially credible, comparable to the Apple Vision Pro reference, with no requested reversion (SC-008) — **requires the actual product owner**; not something an implementation pass can self-certify. Ready for review.
- [x] T051 Run the full `quickstart.md` validation guide end-to-end (all 6 sections) and confirm every check passes — all automatable checks passed (steps 1, 2, 3, 4, 5); step 6's product-owner sign-off is the same open item as T050

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only — independently shippable MVP
- **User Story 2 (Phase 4)**: Depends on Foundational only (not on US1's completion, though it renders below the `LandingHero` US1 builds)
- **User Story 3 (Phase 5)**: Depends on Foundational, and specifically extends `SectionMedia`/`LandingSection` built in US2 (T030/T031) — cannot start until US2's implementation tasks (T028-T033) are done, though it adds no new components of its own
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2/US3 — can ship alone
- **User Story 2 (P2)**: No dependency on US1's implementation details (only shares the Foundational shell/section list) — can be built in parallel with US1 by a different developer, integrated at T033
- **User Story 3 (P3)**: Directly extends US2's `SectionMedia` (T030) — sequential after US2, per spec.md's own priority rationale ("a consistency requirement on top of" US1/US2, not an independent capability)

### Within Each User Story

- Tests (T011-T013, T020-T024, T037-T038) MUST be written and FAIL before their corresponding implementation tasks
- Hooks/manifest before components that consume them (e.g. T028 `useInViewVideo` before T030 `SectionMedia`)
- Components before page-level wiring (e.g. T029-T031 before T033)
- Story complete before moving to the next priority's dependent work (US3 requires US2's T030/T031)

### Parallel Opportunities

- T002, T003 (Setup) in parallel
- T004 (Foundational) in parallel with nothing yet (T005-T007 depend on it conceptually but are content decisions, not code — may proceed in parallel in practice)
- T008 in parallel with T006/T007 once T004/T005 land
- T011, T012, T013 (US1 tests) in parallel
- T020, T021, T022, T023, T024 (US2 tests) in parallel
- T025 in parallel with T020-T024 (different files)
- T037, T038 (US3 tests) in parallel
- US1 (Phase 3) and US2 (Phase 4) can be staffed in parallel by different developers once Foundational is done — they touch disjoint files until T033's integration

---

## Parallel Example: User Story 2

```bash
# Launch all US2 tests together (writing them to fail first):
Task: "Write src/test/features/landing/mediaAssets.test.ts"
Task: "Write src/test/features/landing/useInViewVideo.test.ts"
Task: "Write src/test/features/landing/ParallaxLayer.test.tsx"
Task: "Write src/test/features/landing/SectionMedia.test.tsx"
Task: "Write src/test/features/landing/LandingSection.test.tsx"

# Launch independent implementation prep together:
Task: "Write e2e/fixtures/landing-demo-data.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: hero + CTA + full auth flow (including the redirect-when-authenticated case, T013), independently, per `quickstart.md` steps 2-3 (skip the media-specific checks)
5. Deploy/demo if ready — this alone is a shippable, more professional hero even before the scroll journey exists

### Incremental Delivery

1. Setup + Foundational → shell + content structure ready
2. Add User Story 1 → validate independently → deploy/demo (MVP)
3. Add User Story 2 → validate independently (single-theme media journey) → deploy/demo
4. Add User Story 3 → validate independently (theme correctness) → deploy/demo
5. Polish (Phase 6) → final cross-cutting sign-off

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (hero/auth)
   - Developer B: User Story 2 (capture script, media components, parallax)
3. Developer A or B then takes User Story 3 once US2's `SectionMedia`/`LandingSection` land
4. Either developer runs Phase 6 Polish once all three stories are integrated

---

## Notes

- [P] tasks touch different files with no unmet dependency
- [Story] label maps each task to US1/US2/US3 for traceability back to spec.md
- Tests MUST fail before their implementation task lands (TDD, Constitution Principle I) — this now includes a written-first test for every new presentational component (`SectionMedia`, `LandingSection`) as well as every hook/manifest, closing the gap flagged by `/speckit-analyze` where purely presentational components had no preceding test
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before continuing
- `e2e/fixtures/seedBoards.ts` and `seedBoardCards.ts` (which also exports `seedBoardGroups`) are reused as-is by T026 — no task in this list modifies them (Constitution Check, `plan.md`)
- T013 closes a pre-existing gap: no automated test anywhere in the project previously verified the "already-authenticated visitor redirected away from landing" behavior that SC-002 claims is E2E-verified
- **Post-ship revision (2026-08-12)**: user feedback on the first pass ("faltan las capturas reales... y el efecto paralaje") led to two follow-up changes, detailed in `design-review.md`'s "Post-ship revision" section: (1) `technology` now also carries a real Media Asset (a mobile-viewport board capture, T032/T034 effectively re-opened and re-closed), and (2) `ParallaxLayer`'s magnitude was raised 60→200px with a companion scale cue, fixing a latent clipping bug in the original oversized-layer-less implementation (T029 revised). All affected tests, contracts (`content-inventory-contract.md` sign-off, `media-asset-manifest-contract.md`), and the capture script (T026) were updated and re-verified together.
- **Second post-ship revision (2026-08-12)**: further feedback ("el efecto parallax está al revés... aplica a las capturas reales... quiero que aplique al fondo") — the parallax was moved off the screenshot entirely onto a new `SectionBackground` component (a per-section colored wash, T029 revised again), and `SectionMedia` is now fully static. This surfaced and fixed a real CSS stacking-context bug (the `-z-10` background layer had no containing stacking context and was painting behind unrelated page content, not just its own section — fixed with `isolate` on every section, including the hero). Details and verification in `design-review.md`'s "Second post-ship revision" section.
- **Third post-ship revision (2026-08-12)**: alternating 2-color tone cycle (`TONE_CYCLE`) and a stacked, much-larger media layout (`aspect-video`/phone frames). Details in `design-review.md`'s "Third post-ship revision" section.
- **Fourth post-ship revision (2026-08-12)**: recaptured all wide/phone Media Assets at the exact aspect ratio their display frame uses (fixing real cropping, not just a "make it bigger" cosmetic pass); `howItWorks` is now a real `.webm` video (recorded via a per-theme, per-context `recordVideo` — the context's lifetime is the trim); added a new `sentiment` section (`order: 2`) showcasing the app's real on-device AI sentiment analysis / Team Mood dashboard, with new `landing.sentiment.*` i18n content in both locales and a new `contracts/content-inventory-contract.md` sign-off row noting it as a net addition beyond the original 5 categories (FR-012 permits this). Details and verification in `design-review.md`'s "Fourth post-ship revision" section.
- **Fifth post-ship revision (2026-08-13)**: reverted `howItWorks` from `kind: 'video'` back to `kind: 'screenshot'` per user feedback that the `.webm` loop "no convence" — the `.webm`/poster pair recorded per-theme via `recordVideo` is replaced by a single themed screenshot taken mid-interaction (a couple of cards already liked), recaptured via `landing-capture.ts` against the Firebase Emulator Suite like every other section. `SectionMedia`'s video path and `useInViewVideo` are untouched (still implemented and unit-tested) since no manifest entry currently exercises them, matching the same "kept for future use" stance recorded in T026 above.
