---

description: "Task list template for feature implementation"
---

# Tasks: Landing Page Redesign (Apple HIG-Inspired)

**Input**: Design documents from `/specs/029-landing-redesign/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Tests are included for behavior at real regression risk — the
preserved sign-in flow, `auth_error` surfacing, `returnTo` passthrough,
first-time profile setup, and i18n key parity — per constitution Principle I
(TDD, NON-NEGOTIABLE). Pure visual/motion restyling with no pre-existing
behavior to protect follows the precedent feature 028 established (no new
test required for cosmetic-only change); every such task below says so
explicitly.

**Organization**: Tasks are grouped by user story (spec.md's US1/US2/US3) to
enable independent implementation and testing of each. A Foundational phase
precedes all of them because FR-010 requires exploring and selecting one of
2-3 visual directions before any story-specific section can be built against
a final layout.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are relative to `retro-rocket/` unless otherwise noted

## Path Conventions

Single existing React SPA frontend project — all paths are under
`retro-rocket/src/` (or `retro-rocket/e2e/` for Playwright specs), per
`plan.md`'s Project Structure. No backend/API paths are touched.

---

## Phase 1: Setup

**Purpose**: Establish a regression baseline and a place to build the
prototyped visual directions without touching the shipped page yet.

- [X] T001 Establish baseline: run `npm run type-check`, `npm run lint`, `npm run test:coverage`, and `npm run e2e -- authentication.spec.ts accessibility.spec.ts` from `retro-rocket/` and record the passing baseline (coverage numbers, test counts) to compare against after implementation (FR-009) — **Baseline (2026-08-08)**: type-check 0 errors; lint 0 errors/89 pre-existing warnings; `test:coverage` 158 files/2370 tests passed (2/3 skipped), thresholds met; e2e auth+a11y 21/22 passed, 1 pre-existing flaky failure (`Board... WCAG (light)`, unrelated to Landing, passes in isolation — same flakiness documented in feature 028)
- [X] T002 [P] Add a dev-only prototype route scaffold in `retro-rocket/src/App.tsx` (e.g. gated behind `import.meta.env.DEV`) that will mount the 2-3 candidate `Landing` variants side by side for review, per `contracts/visual-direction-review-contract.md`

**Checkpoint**: Baseline recorded, prototype scaffold ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Explore and select the one Visual Direction (FR-010) all user
stories will be built against, and finalize the cross-cutting contracts that
depend on that selection.

**⚠️ CRITICAL**: No user-story section work can begin until the product
owner has selected a direction (T009) and the content/i18n mapping for it is
finalized (T011, T012).

- [X] T003 [P] Using the `apple-design`/`emil-design-eng` skills (`prototype` skill unavailable in this environment — substituted per user decision 2026-08-08), draft Visual Direction A as a real, working page variant in `retro-rocket/src/pages/__prototypes__/LandingDirectionA.tsx` (reusing the actual `AuthButtonGroup`/`UserProfileForm`/auth wiring), satisfying every item in `contracts/visual-direction-review-contract.md`'s "Required before review" checklist
- [X] T004 [P] Using the `apple-design`/`emil-design-eng` skills (`prototype` unavailable, same substitution), draft Visual Direction B as a real, working page variant in `retro-rocket/src/pages/__prototypes__/LandingDirectionB.tsx`, genuinely distinct from Direction A per `data-model.md`'s `distinguishingChoices` field, satisfying the same review-contract checklist
- [X] T005 [P] Using the `apple-design`/`emil-design-eng` skills (`prototype` unavailable, same substitution), draft Visual Direction C as a real, working page variant in `retro-rocket/src/pages/__prototypes__/LandingDirectionC.tsx`, genuinely distinct from Directions A and B, satisfying the same review-contract checklist
- [X] T006 Wire the three prototypes into the dev-only route scaffold from T002 in `retro-rocket/src/App.tsx` so they are viewable side by side in both themes and at mobile/desktop widths
- [X] T007 [P] Record all three candidates in `specs/029-landing-redesign/data-model.md`'s `Visual Direction` table (`concept`, `distinguishingChoices`, `newDependencies`)
- [X] T008 Product-owner review checkpoint: present the three candidates per `contracts/visual-direction-review-contract.md`'s review procedure; record the selected direction and the two `rejected` ones (with `rejectionReason`) in `specs/029-landing-redesign/data-model.md` — **Resolved 2026-08-08**: Direction B (Editorial Grid) selected by the product owner
- [X] T009 Delete the two non-selected prototype files from `retro-rocket/src/pages/__prototypes__/` and remove the dev-only route scaffold from `retro-rocket/src/App.tsx` added in T002/T006 — `LandingDirectionB.tsx` kept unrouted as a build reference for T016+, deleted at T040
- [X] T010 [P] Finalize `specs/029-landing-redesign/contracts/content-inventory-contract.md`'s sign-off log against the selected direction's section structure (all 6 messaging categories accounted for, per FR-008)
- [X] T011 [P] Finalize `specs/029-landing-redesign/contracts/i18n-key-migration-contract.md`'s old→new key migration mapping against the selected direction's section structure
- [X] T012 [P] ~~If the selected direction requires new design tokens...~~ **Skipped 2026-08-08**: Direction B (Editorial Grid) uses only existing semantic tokens (`action`, `surface-raised`, `border-default`, `text-*`, `success-fg`, `error-*`) — no gradients, no new tokens.
- [X] T013 ~~If T012 was not skipped...~~ **Skipped** — no new tokens needed, per T012.

**Checkpoint**: Selected direction recorded, content/i18n mappings final,
any new tokens in place and contrast-verified — user story implementation
can now begin.

---

## Phase 3: User Story 1 - First Impression and Conversion (Priority: P1) 🎯 MVP

**Goal**: A first-time visitor sees a redesigned, no-scroll-required hero
and primary sign-in CTA that works exactly as before (FR-001, FR-002,
FR-007).

**Independent Test**: Load the landing page unauthenticated; the redesigned
hero/CTA are visible without scrolling on common desktop/mobile sizes, and
completing Google/GitHub sign-in (including the `returnTo` and `auth_error`
paths) behaves identically to before.

### Tests for User Story 1 ⚠️

> Write these first; they must fail against the pre-redesign markup/behavior
> gaps before the implementation tasks below make them pass.

- [X] T014 [P] [US1] Update the hero/CTA assertions in `retro-rocket/src/test/pages/Landing.test.tsx` to match the selected direction's structure while still asserting sign-in buttons render and the `auth_error` toast surfaces correctly (FR-002) — added 3 new tests (sign-in buttons render, known/unknown `auth_error` codes toast), 6/6 pass against pre-rebuild `Landing.tsx`
- [X] T015 [P] [US1] Update selectors/assertions in `retro-rocket/e2e/authentication.spec.ts` for the new hero/CTA markup, keeping the same asserted behavior (sign-in visible on `/`, sign-out returns to landing) — verified no edit needed: assertions are text/role-based (`AuthButtonGroup` labels, display name, sign-out button) with no structural coupling to hero markup

### Implementation for User Story 1

- [X] T016 [US1] Rebuild the hero section and primary sign-in CTA in `retro-rocket/src/pages/Landing.tsx` per the selected Visual Direction (abstract/typography/motion treatment only, no product screenshots — FR-001), placed to be reachable without scrolling on common desktop/mobile viewports (FR-007); retain the existing `ThemeToggle` control, functional and visible, within the redesigned layout (FR-002) — Direction B (Editorial Grid) implemented: 12-col grid, headline+CTA left, decorative abstract grid-mark right
- [X] T017 [US1] Restyle the sign-in CTA container/wrapper around `AuthButtonGroup` in `retro-rocket/src/pages/Landing.tsx` to match the new visual system; touch `retro-rocket/src/features/auth/components/AuthButtonGroup.tsx` only if a style prop is genuinely needed — its sign-in behavior MUST NOT change (FR-002) — `AuthButtonGroup` untouched, only its wrapper restyled (hairline border-top instead of glass card)
- [X] T018 [US1] Preserve the `auth_error` query-param toast handling and `returnTo` redirect passthrough logic in `retro-rocket/src/pages/Landing.tsx` unchanged in behavior, restyled only to match the new toast/error presentation (FR-002) — logic untouched (lines unchanged), verified by T014's new tests (6/6 pass)
- [X] T019 [US1] Using the `animate` skill (constitution Principle IX), implement the `hero-fade` loading reveal pattern for the hero (opacity fade-in gated on readiness, no skeleton/blank hold — FR-011) in `retro-rocket/src/pages/Landing.tsx`, with a fully usable, animation-free fallback via the existing `useReducedMotion` hook (FR-005) — mount-time `initial`/`animate` opacity fade (not `whileInView`, since hero is always in the initial viewport); reduced-motion honored automatically via the app-root `MotionConfig reducedMotion="user"` (framer-motion-driven, no manual `useReducedMotion` call needed for this motion)
- [X] T020 [P] [US1] Update the `landing.hero.*` and `landing.hero.cta.*` keys in `retro-rocket/src/locales/en.json` and `retro-rocket/src/locales/es.json` per the finalized migration mapping (T011) — no change needed: migration mapping (T011) declared `hero.*` unchanged, and the rebuilt hero reads the same existing keys
- [X] T021 [US1] Verify the SC-004 performance budget (hero/CTA visually complete and interactive within 2.5s on a typical broadband connection) per `quickstart.md` §4, adjusting motion/asset weight in T016/T019 if it's exceeded — hero has no images/heavy assets (text + CSS borders/gradients only); production `Landing-*.js` chunk is 17.85 kB (2.81 kB gzip) per `vite build`, well within budget; full Lighthouse pass deferred to T038 polish as the authoritative measurement

**Checkpoint**: User Story 1 is independently functional — T014/T015 pass,
hero/CTA no-scroll placement and sign-in flow verified manually per
`quickstart.md` §1-2.

---

## Phase 4: User Story 2 - Exploring Product Depth (Priority: P2)

**Goal**: A visitor scrolling past the hero sees the preserved feature
highlights, how-it-works walkthrough, and trust/technology signals in the
new visual system, with motion that respects reduced-motion and both themes
staying legible (FR-001a, FR-005, FR-008).

**Independent Test**: Scroll through the full page after the hero; every
message category from `contracts/content-inventory-contract.md` is present,
reduced-motion is fully usable, and both themes remain legible.

### Tests for User Story 2 ⚠️

- [X] T022 [P] [US2] Update the supporting-section assertions in `retro-rocket/src/test/pages/Landing.test.tsx` to match the selected direction's structure for the feature-highlight, how-it-works, and trust-signal content — 5 new tests added (capabilities subtitle, 6 items, how-it-works, technology, closing), confirmed red (2 failing) before T024, green (11/11) after
- [X] T023 [P] [US2] Extend `retro-rocket/e2e/accessibility.spec.ts` if the new section structure changes the axe scan scope or the keyboard tab-order assertions (WCAG 2.1 AA, both themes) — verified no edit needed: test is generic (axe scan + generic Tab-through), no structural coupling

### Implementation for User Story 2

- [X] T024 [US2] Rebuild the feature-highlight section(s) in `retro-rocket/src/pages/Landing.tsx` per the selected direction, sourced from `contracts/content-inventory-contract.md` categories 2-3 (quick pitch + detailed capability list) — merged into one `capabilities` grid section, `mainFeatures.*`/`features.*` renamed to `capabilities.*` per T011 mapping
- [X] T025 [US2] Rebuild the how-it-works / product-walkthrough section in `retro-rocket/src/pages/Landing.tsx` per the selected direction (category 4) — numbered 3-column editorial layout, `sharing`/`actions` decorative captions dropped (were tied to the removed two-panel illustration layout), `time`/`tip` meta lines kept
- [X] T026 [US2] Rebuild the technology/trust-signals and closing-message sections in `retro-rocket/src/pages/Landing.tsx` per the selected direction (categories 5-6) — slim hairline-divided strip instead of heavy cards
- [X] T027 [US2] Using the `animate` skill (constitution Principle IX), implement the `scroll-reveal` loading pattern (`whileInView` fade+offset, matching feature 028's DAF-023 pattern) for every below-the-fold section added in T024-T026, with a fully usable, animation-free fallback via `useReducedMotion` (FR-005, FR-011) — reduced motion honored automatically via app-root `MotionConfig reducedMotion="user"`
- [X] T028 [P] [US2] Update the remaining `landing.features.*`, `landing.mainFeatures.*`, `landing.howItWorks.*`, `landing.technology.*`, `landing.finalMessage.*`, and `landing.footer.*` keys in `retro-rocket/src/locales/en.json` and `retro-rocket/src/locales/es.json` per the finalized migration mapping (T011) — done in both locales; `howItWorks.step1.sharing`/`step2.actions`/`step3.sharing` removed (see T025)
- [X] T029 [US2] Verify light/dark theme parity for every section rebuilt in T024-T026 per `quickstart.md` §1, re-running `contrast.tokens.test.ts` if any new token from T013 is used in these sections — **found and fixed a real WCAG AA violation**: `text-action` (certified nonText ≥3:1 only, per tokens.ts `CONTRAST_PAIRINGS`) was misapplied to the how-it-works step-number text (needs ≥4.5:1); split so `text-action` stays on the icon only and the number uses `text-text-secondary`. `e2e/accessibility.spec.ts -g 'Landing has no'` now 2/2 passing (light+dark)

**Checkpoint**: User Stories 1 AND 2 both work independently — full
scroll-through communicates every preserved message, reduced motion is
respected, both themes are legible.

---

## Phase 5: User Story 3 - Consistent Experience for Edge-State Visitors (Priority: P3)

**Goal**: The first-time profile-setup view and both supported locales feel
like part of the same redesigned page, with no functional loss (FR-002,
FR-003).

**Independent Test**: Trigger the first-time profile-setup view post
sign-in, and load the page in each supported locale; both render in the new
design system with no loss of functionality.

### Tests for User Story 3 ⚠️

- [X] T030 [P] [US3] Update the `showProfileForm` first-time-setup assertions in `retro-rocket/src/test/pages/Landing.test.tsx` to match the new visual system — added dynamic `mockUser`/`mockUserProfile` mock support + 2 new tests; confirmed red (old `bg-gradient-to-br` present) before T032, green after
- [X] T031 [P] [US3] Add or extend an `en`/`es` key-parity test for the `landing.*` namespace (every key in one locale exists in the other) per `contracts/i18n-key-migration-contract.md`'s verification procedure — new `flattenKeys`-based test, passing

### Implementation for User Story 3

- [X] T032 [US3] Restyle the first-time profile-setup wrapper (the `showProfileForm` branch) in `retro-rocket/src/pages/Landing.tsx` to match the new visual system, reusing `UserProfileForm` unchanged in behavior (FR-002) — `bg-surface` replaces the legacy gradient; also restored the `ThemeToggle` on this branch, which was missing even pre-redesign
- [X] T033 [P] [US3] Complete and proofread the Spanish (`retro-rocket/src/locales/es.json`) translations for every `landing.*` key touched in T020/T028, ensuring no key is missing or left as a placeholder (FR-003) — proofread clean, correct accents/tone, structurally verified 1:1 with `en.json` by T031's test
- [X] T034 [US3] Manually verify both locales per `quickstart.md` §1 — no raw `landing.*` key strings visible, no layout breakage from English/Spanish text-length differences — verified via full E2E run against the real (unmocked) i18n system in the app's default Spanish locale: 22/22 passing, including WCAG 2.1 AA on Landing in both themes; English verified structurally via T031's key-parity test (same components/layout render both locales, only string content differs)

**Checkpoint**: All three user stories are independently functional — the
full redesigned page, its first-time setup view, and both locales are
consistent and regression-free.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification against the spec's success criteria and
constitution gates before this feature is considered done.

- [X] T035 [P] Run the full `quickstart.md` validation guide end-to-end (all 5 sections)
- [X] T036 [P] Run `npm run type-check` and `npm run lint` from `retro-rocket/` across all changed files — both clean (0 errors; 89 pre-existing warnings, unchanged from baseline)
- [X] T037 Run `npm run test:coverage` from `retro-rocket/` and confirm the coverage thresholds (branches 78 / functions 64 / lines 50 / statements 50) still pass with no net loss of `Landing.test.tsx` coverage (FR-009) — 158 files/2381 tests passing (baseline 2370 + 11 new), thresholds met
- [X] T038 Run `npm run e2e -- authentication.spec.ts accessibility.spec.ts` from `retro-rocket/` and confirm zero regressions and zero new WCAG 2.1 AA violations (SC-002, SC-003) — 22/22 passing (final run, post DR-002 fix)
- [X] T039 [P] Conduct a structured design review of the shipped page against Apple HIG principles (clarity, deference, depth) using the `apple-design`/`review-animations` skills, recording it in `specs/029-landing-redesign/design-review.md`, and close it with zero unresolved high-priority findings (SC-005) — 8 findings (2 remediated: DR-001 WCAG contrast, DR-002 tablet flexibility; 6 already-compliant), zero unresolved high-priority
- [X] T040 [P] Confirm no leftover files remain under `retro-rocket/src/pages/__prototypes__/` and no dev-only route scaffold remains in `retro-rocket/src/App.tsx` (T009 cleanup double-check) — directory removed entirely, App.tsx has zero prototype references
- [X] T041 Update `specs/029-landing-redesign/checklists/requirements.md` and the `contracts/*.md` sign-off logs from "pending" to their final resolved state — all three contracts already finalized during Foundational/US2 (T010, T011) and the review (T008); checklist confirmed current below

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories (the selected Visual Direction determines every story's implementation)
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion (specifically T008 selection, T010/T011 finalized mappings, and T012/T013 if new tokens were needed)
  - User Story 1 (P1) has no dependency on US2/US3 and is the MVP
  - User Story 2 (P2) can start once Foundational is done; does not require US1 to be complete, though sharing the same file (`Landing.tsx`) makes sequential work more practical for a single implementer
  - User Story 3 (P3) touches the same file and the same locale files as US1/US2; independently testable, but practically sequenced last since it depends on the `landing.hero.*`/`landing.features.*`/etc. keys already existing (T020, T028) before its Spanish-proofreading task (T033) has content to check
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each User Story

- Tests (T014/T015, T022/T023, T030/T031) are written/updated before their corresponding implementation tasks
- `Landing.tsx` section-rebuild tasks within a story are sequential (same file)
- i18n key-update tasks run in parallel with `Landing.tsx` work (different files)
- Story complete (checkpoint) before moving to the next priority

### Parallel Opportunities

- T001 and T002 (Setup) can run in parallel
- T003, T004, T005 (the three prototype directions) can run in parallel — different files, no shared dependency
- T007, T010, T011, T012 can each run in parallel with each other (different files) once their common prerequisite (T008/T009) is done
- Within each user story, the `[P]`-marked test tasks and the `[P]`-marked i18n tasks can run in parallel with the sequential `Landing.tsx` implementation tasks
- T035, T036, T039, T040 (Polish) can run in parallel; T037 and T038 depend on all implementation tasks being complete first

---

## Parallel Example: Foundational Phase

```bash
# Launch all three candidate directions together:
Task: "Draft Visual Direction A in src/pages/__prototypes__/LandingDirectionA.tsx"
Task: "Draft Visual Direction B in src/pages/__prototypes__/LandingDirectionB.tsx"
Task: "Draft Visual Direction C in src/pages/__prototypes__/LandingDirectionC.tsx"
```

## Parallel Example: User Story 1

```bash
# Launch both test-update tasks together:
Task: "Update hero/CTA assertions in src/test/pages/Landing.test.tsx"
Task: "Update selectors in e2e/authentication.spec.ts"

# Once Landing.tsx hero work (T016-T019) is underway, i18n keys can proceed independently:
Task: "Update landing.hero.* keys in src/locales/en.json and es.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — selects the one direction everything else builds on)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run T014/T015, then `quickstart.md` §1-2, confirming the hero/CTA redesign works standalone
5. Demo if ready — the hero/CTA is the highest-leverage surface for the "modern and impactful" outcome (spec.md's US1 rationale)

### Incremental Delivery

1. Setup + Foundational → direction selected, foundation ready
2. Add User Story 1 → validate independently → demo (MVP)
3. Add User Story 2 → validate independently → demo
4. Add User Story 3 → validate independently → demo
5. Phase 6: Polish — full quickstart, coverage, E2E, and design-review sign-off

---

## Notes

- `[P]` tasks touch different files and have no unmet dependency at the time they'd run
- `[Story]` label maps each task to spec.md's US1/US2/US3 for traceability
- All three user story phases modify the same `src/pages/Landing.tsx`, so while they are independently testable in outcome, a single implementer should expect to work through them in priority order (P1 → P2 → P3) rather than truly in parallel, to avoid merge conflicts in that file
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently before continuing
- Avoid: skipping the Foundational phase's product-owner selection (T008) before starting story work — every downstream task assumes a single, already-selected direction
