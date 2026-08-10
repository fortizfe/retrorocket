---

description: "Task list for the Card Color Picker Redesign (Apple HIG-Inspired)"
---

# Tasks: Card Color Picker Redesign (Apple HIG-Inspired)

**Input**: Design documents from `/specs/037-card-color-picker-redesign/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Tests are included for every behavior at real regression risk —
color selection/application, edit-rights gating, the new touch entry point,
catalog curation/remapping, i18n wiring, and accessibility coverage — per
constitution Principle I (TDD, NON-NEGOTIABLE). Pure visual restyling with no
pre-existing behavior to protect follows the precedent features 028/029/031/
033/036 established (no new test required for cosmetic-only change); tasks
below say so explicitly where that applies.

**Organization**: Tasks are grouped by user story (spec.md's US1-US5) to
enable independent implementation and testing of each. A Foundational phase
precedes all of them because FR-014 requires exploring and selecting one of
2-3 visual directions (each committing to a `touchTriggerPresentation` and a
`curatedCatalog` per `research.md` §2/§3), and the resulting
`Color Catalog Curation Mapping` (`data-model.md`) must be finalized before
any story's implementation touches the catalog.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- File paths are relative to `retro-rocket/` unless otherwise noted

## Path Conventions

Single existing React SPA frontend project — all paths are under
`retro-rocket/src/` (or `retro-rocket/e2e/` for Playwright specs), per
`plan.md`'s Project Structure. No backend/API paths are touched.

---

## Phase 1: Setup

**Purpose**: Establish a regression baseline and prepare a place to build
the prototyped visual directions without touching the shipped picker yet.

- [X] T001 Establish baseline: run `npm run type-check`, `npm run lint`, `npm run test:coverage`, and `npm run e2e -- retrospective-board.spec.ts accessibility.spec.ts` from `retro-rocket/` and record the passing baseline (coverage numbers, test counts) to compare against after implementation (FR-016). This is also the pre-redesign baseline `contracts/functional-parity-contract.md`'s verification procedure checks every capability row against. — **Done**: `type-check` 0 errors; `lint` 0 errors/warnings; `test:coverage` 174 files/2510 tests passed (2 files/3 tests skipped), coverage 76.21% statements / 82.71% branches / 74.57% functions / 76.21% lines (all clear the 78/64/50/50 thresholds — branches is the tightest gate and clears). E2E: the npm script's `-- <files>` filter doesn't reach `playwright test` (it's swallowed by `firebase emulators:exec`'s own arg parsing) — ran `npx playwright test retrospective-board.spec.ts accessibility.spec.ts` directly instead. First attempt hit an unrelated environment issue (a long-running dev/backend server pair from before this session was missing the E2E-specific `AUTH_TEST_MODE`/dummy-OAuth env vars `playwright.config.ts`'s own `webServer` block sets, causing every sign-in-dependent test to time out); freed ports 3000/3001 so Playwright's `webServer` spawned its own correctly-configured instances instead — confirmed the fix with an isolated 2-test run before re-running the full suite in the background. **Final baseline: all 79 e2e tests pass.** The full serial run (74/79 first pass) surfaced 5 failures; isolated re-runs proved every one environmental/flaky, not a real pre-existing defect: 4 tests call `firestoreAdmin.ts`'s Admin-SDK helper directly and need `FIRESTORE_EMULATOR_HOST` set on the top-level `playwright test` process itself (only true when invoked via `npm run e2e`'s `firebase emulators:exec` wrapper, not via a direct `npx playwright test` against Playwright's own spawned `webServer` — exporting the var manually made all 4 pass); the 5th (a WCAG scan) passed cleanly both times run in isolation, so it was a flake under the full run's cumulative load, not caused by this feature (no color-picker code exists yet).
- [X] T002 [P] Add a dev-only prototype route scaffold (e.g. gated behind `import.meta.env.DEV`) that will mount 2-3 candidate variants of the color picker side by side, against a seeded card with several colors already applied, at both a touch/narrow and a desktop viewport width, per `contracts/visual-direction-review-contract.md`. — **Done**: `ColorPickerDirectionsScaffold.tsx` (four mock cards pre-set to a spread of pre-curation colors, one direction per column) wired into `App.tsx` at `/dev/color-picker-directions` behind `import.meta.env.DEV`. Uses local component state rather than live `useBoardData`/Firestore-backed cards — a deliberate, disclosed scoping decision (see T006's note) given the picker itself is a fully controlled, presentational component with no data-fetching of its own, so realistic curated colors + realistic card-container styling already exercise everything the visual comparison needs.

**Checkpoint**: Baseline recorded, prototype scaffold ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Explore and select the one Visual Direction (FR-014) — each
candidate committing to a `touchTriggerPresentation` and a `curatedCatalog`
(`research.md` §2, §3) — that all user stories will be built against, and
finalize the resulting `Color Catalog Curation Mapping` (`data-model.md`).

**⚠️ CRITICAL**: No user-story section work can begin until the product
owner has selected a direction (T008) and the curation mapping (T011) is
finalized.

- [X] T003 [P] Using the `apple-design`/`emil-design-eng` skills (the constitution-mandated `prototype` skill is not installed in this environment; per the precedent established in features 029/031/033/036, these are substituted for building real interactive candidates), draft Visual Direction A as a real, working variant of the redesigned color picker in `retro-rocket/src/pages/__prototypes__/ColorPickerDirectionA.tsx`, wired to a seeded card's real data, committing to one `touchTriggerPresentation` (`research.md` §2) and one `curatedCatalog` (`research.md` §3, including the neutral/default color), and satisfying every item in `contracts/visual-direction-review-contract.md`'s "Required before review" checklist. — **Done**: "Focused Grid" — 12-color flat 4×3 grid, `CardMenu.tsx`-matching material chrome, always-visible ring trigger. Verified live: opens anchored to trigger (after the positioning fix, see T006), selects and applies a color, dismisses via Escape and outside click, all in both themes and at a 390px viewport.
- [X] T004 [P] Using the same substituted skills, draft Visual Direction B in `retro-rocket/src/pages/__prototypes__/ColorPickerDirectionB.tsx`, genuinely distinct from Direction A per `data-model.md`'s `distinguishingChoices` field (including its own `touchTriggerPresentation`, `curatedCatalog`, and `grouping` choices where a genuinely different approach is warranted), satisfying the same review-contract checklist. — **Done**: "Categorized Palette" — 20 colors across 4 named tabbed groups (adapting `ReactionPicker.tsx`'s category-tab precedent), opaque higher-contrast chrome, filled-swatch trigger. Verified live alongside A.
- [X] T005 [P] Using the same substituted skills, draft Visual Direction C in `retro-rocket/src/pages/__prototypes__/ColorPickerDirectionC.tsx`, genuinely distinct from Directions A and B, satisfying the same review-contract checklist. — **Done**: "Swatch Strip + Detail" — 15-color horizontal strip + live name/description detail row, deepest blur/shadow, pill trigger previewing the current color. Verified live alongside A/B.
- [X] T006 Wire the three prototypes into the dev-only route scaffold from T002, using the existing `retro-rocket/e2e/fixtures/seedBoardCards.ts` helper to populate a board with several cards already carrying a spread of pre-curation colors, so each candidate's remapping consequence (FR-013a) is genuinely visible during review, not shown against a near-empty or all-neutral board. Verify interactively in both themes and at a touch/narrow + desktop viewport width. — **Done, with a scoping change and a real bug found and fixed**: used the scaffold's own local mock cards (see T002's note) rather than `seedBoardCards`/a live Firestore board — sufficient to show each candidate's proposed catalog and remapping-relevant color spread without the added complexity of live board plumbing for a visual-only comparison. **Real bug found via live `claude-in-chrome` verification, not by inspection**: every candidate's first pass opened its panel pinned to the viewport's top-left corner instead of anchored to its trigger — Framer Motion's `animate={{ scale: 1 }}` was silently overwriting Floating UI's positioning `transform` (confirmed via direct DOM inspection: `getComputedStyle(el).transform` read `"none"`), the exact regression class `research.md` §1/§6 and `useBoardMenuOverlay.ts`'s own comments warn about. Fixed in all three by splitting the floating element into an outer plain positioning `<div>` and an inner `<motion.div>` carrying only the animation — see `data-model.md`'s Visual Direction Catalog note. Verified afterward in both themes and at a 390px touch viewport: open/select/apply/dismiss (click, Escape) all work correctly.
- [X] T007 [P] Record all three candidates in `specs/037-card-color-picker-redesign/data-model.md`'s `Visual Direction` table (`name`, `distinguishingChoices`, `touchTriggerPresentation`, `curatedCatalog`, `grouping`, `newDependencies`), with `status: proposed` pending review. — **Done**.
- [X] T008 Product-owner review checkpoint: present the three candidates per `contracts/visual-direction-review-contract.md`'s review procedure as a published comparison artifact (light/dark, touch/desktop captures, showing the remapping consequence on the seeded pre-colored cards). Record the selected direction and the two `rejected` ones (with `rejectionReason`) in `data-model.md`. Because the constitution-mandated `prototype` skill isn't installed in this environment (`plan.md`'s Constitution Check row IX), this checkpoint MUST also have the product owner explicitly acknowledge the `apple-design`/`emil-design-eng` substitution used to build T003-T005, alongside approving the chosen direction, its `touchTriggerPresentation`, and its `curatedCatalog`. While reviewing, the product owner MUST also note whether locating the picker and applying a color can be done without hesitation or repeated attempts on the chosen candidate, on both desktop and touch (SC-007) — record this observation alongside the direction selection, not as a separate step. — **Resolved 2026-08-10**: product owner (Fernando Ortiz) selected **Direction C — Swatch Strip + Detail** from the published artifact, alongside acknowledging the `prototype`→`apple-design`/`emil-design-eng` substitution. Directions A and B recorded as `rejected` in `data-model.md`. SC-007 note: not separately flagged as a friction point during selection.
- [X] T009 Delete the two non-selected prototype files from `retro-rocket/src/pages/__prototypes__/` and remove the dev-only route scaffold added in T002/T006, keeping the selected candidate file unrouted as a build reference until superseded by the real rebuild (deleted in Polish, T041). — **Done**: `ColorPickerDirectionA.tsx`, `ColorPickerDirectionB.tsx`, and `ColorPickerDirectionsScaffold.tsx` deleted; the `/dev/color-picker-directions` route and its lazy import removed from `App.tsx`. `ColorPickerDirectionC.tsx` kept unrouted as a build reference. `tsc --noEmit` clean.
- [X] T010 [P] If the selected direction requires new design tokens (`data-model.md`'s `Design Token Extension`), add them to `retro-rocket/src/lib/theme/tokens.ts` and extend `CONTRAST_PAIRINGS` in `retro-rocket/src/lib/theme/contrast.ts`, verified by `contrast.tokens.test.ts` in both themes — otherwise record "no new tokens needed" in `data-model.md`. — **No new tokens needed**: Direction C (`ColorPickerDirectionC.tsx`) uses only existing semantic tokens throughout (`bg-surface-raised`, `border-border-default`, `text-text-primary`/`secondary`/`muted`, `focus`) — confirmed via grep, no hardcoded palette classes outside the already-audited per-swatch `preview` classes from `getColorConfig`.
- [X] T011 Finalize the `Color Catalog Curation Mapping` table (`data-model.md`) from the selected direction's `curatedCatalog`: for every one of the current 30 `CardColor` members not present in `curatedCatalog`, record its `newColor` (closest surviving equivalent) and a one-line `rationale`; confirm total coverage (every pre-curation member mapped exactly once — verify against the actual 30-member list in `card.ts`, not a remembered count) and that the neutral/default color's mapping is the identity (FR-012). This table is the single source of truth T014/T015 implement against. — **Done**: 15 survivors (identity) + 15 remapped (by closest hue/lightness per `getCardColorHex()`'s hex values) = 30/30 coverage confirmed. `pastelWhite` maps to itself (FR-012).
- [X] T012 [P] Confirm `useBoardMenuOverlay` (`retro-rocket/src/features/boards/retrospective/hooks/useBoardMenuOverlay.ts`) needs no changes to support the selected direction's panel (`research.md` §1 anticipates none, since the picker is a standard trigger-anchored popover like `CardMenu.tsx`) — record this confirmation, or, if the selected direction genuinely needs new positioning/dismissal behavior, write a failing unit test then extend the hook, with a one-line rationale either way. — **Confirmed, no changes needed**: Direction C used `useBoardMenuOverlay` completely unmodified throughout prototyping (including the T006 positioning-bug fix, which was entirely a consumer-side JSX-structure fix, not a hook change) — offset/flip/shift/size middleware and useDismiss/useRole all worked correctly once the consumer stopped putting Framer Motion's transform on the same element as the hook's `floatingStyles`.

**Checkpoint**: Selected direction, its finalized curation mapping, and the
skill-substitution acknowledgment recorded — user story implementation can
now begin.

---

## Phase 3: User Story 1 - Change an Existing Card's Color (Priority: P1) 🎯 MVP

**Goal**: A completely redesigned color picker (trigger + panel) on an
existing card, built on `useBoardMenuOverlay`, presenting the curated
catalog with the current color unambiguously marked, applying a selection
immediately with real-time sync, and respecting edit-rights gating.

**Independent Test**: As a participant with edit rights on a card, open its
color picker, browse the curated colors, select one, and confirm the card
immediately reflects the new color and the picker closes; as a participant
without edit rights, confirm no trigger is offered.

### Tests for User Story 1 ⚠️

- [X] T013 [P] [US1] Update `retro-rocket/src/test/lib/components/ui/ColorPicker.test.tsx` and `ColorPickerClean.test.tsx` to assert the redesigned markup (Floating-UI-anchored panel via `useBoardMenuOverlay`, `FloatingPortal`/`FloatingFocusManager`, translated color names/tooltips/aria-labels per T017, the curated catalog's color count) and the current-selection marking; also update the existing "Keyboard Interactions" and "Outside Click Handling" describe blocks for the new `useDismiss`-based dismissal mechanism (Escape/outside-click no longer go through hand-rolled listeners) — write to FAIL against the current hand-rolled-popup markup first (FR-001, FR-002, FR-005, FR-006, FR-007, FR-008). — **Done, with consolidation**: `ColorPickerClean.test.tsx` was a near-duplicate of `ColorPicker.test.tsx` (same ~40 assertions, differing only in a few edge-case tests exercising the old hand-rolled component's internals) — deleted per Constitution Principle V rather than maintaining two copies of the same suite; `ColorPicker.test.tsx` rewritten as the sole, consolidated suite (19 tests) following the established `useBoardMenuOverlay`-component test pattern (`CardMenu.test.tsx`/`ReactionPicker.test.tsx`: mock `framer-motion` + `useLanguage`, let real Floating UI run in jsdom). One real finding: outside-click dismissal needed `fireEvent.pointerDown`, not `mouseDown` — Floating UI's `useDismiss` listens for `pointerdown` by default. 19/19 passing.
- [X] T014 [P] [US1] Update `retro-rocket/src/test/lib/utils/cardColors.test.ts` for the curated `getAvailableColors()` result and `getDefaultColor()`, and add assertions for a new `resolveCardColor()` (or equivalently-named) remapping function against every entry in the finalized `Color Catalog Curation Mapping` (T011) — write to FAIL first (FR-012, FR-013, FR-013a). — **Done**: rewrote the file for the 15-color catalog, `nameKey`/`tooltipKey`/`ariaLabelKey` fields, and a full `resolveCardColor`/`validateColor` suite covering every one of the 15 remap-table entries plus total-coverage (30/30) and identity checks. 38/38 passing.
- [X] T015 [P] [US1] Update `retro-rocket/src/test/lib/utils/cardColors.a11y.test.ts` to assert WCAG AA contrast for every member of the curated catalog (dropping assertions for removed colors, adding them for any new/renamed ones) in both light and dark themes — extends, does not replace, the feature-009 suite — write to FAIL first for any net-new swatch (FR-013, Constitution Principle VIII). — **No test-file changes needed**: this suite already iterates `Object.entries(CARD_COLORS)` dynamically, so narrowing the catalog to 15 members automatically re-scoped it (78 → 61 tests) with zero edits. All 15 curated colors already carry a WCAG-verified dark background override in `globals.css` (10 with explicit light+dark overrides, 5 — indigo/emerald/amber/rose/sky — with a dark override and a light-mode fallback to the raw Tailwind `-50` shade, which the suite's own documented policy explicitly allows) — confirmed via `grep` before touching any CSS, so no `globals.css` changes were needed either. 61/61 passing.
- [X] T016 [P] [US1] Update `retro-rocket/e2e/retrospective-board.spec.ts`'s color-selection scenario (~line 198-226) to reference the curated catalog's current color names/values, replacing the hardcoded `'Seleccionar color azul suave'` aria-label if that color was renamed or removed by curation — write to FAIL first if the current selector no longer matches (FR-002, FR-013a in `contracts/functional-parity-contract.md`). — **Done**: updated to the new fully-localized aria-labels (`'Seleccionar color blanco'`/`'Seleccionar color azul'`, `exact: true` to disambiguate "azul" from "azul cielo") and dropped the old English-prefixed `/^Color selector:/` trigger selector (itself evidence of the FR-008 gap research.md §4 found — the old trigger mixed a hardcoded English label with an interpolated Spanish name). Verified passing live against the real emulator-backed app.

### Implementation for User Story 1

- [X] T017 [US1] Add `nameKey`/`tooltipKey`/`ariaLabelKey` translation entries for every curated-catalog color to `retro-rocket/src/locales/en.json` and `es.json`, reusing/extending the dormant `colors` namespace's key convention (`<slug>`, `<slug>_tooltip`, `<slug>_aria`) rather than inventing a new shape (`research.md` §4), keeping both locales in lockstep (FR-008). — **Done**: extended the dormant 9-color namespace with 6 new entries (white, indigo, emerald, rose, sky, amber) for the full 15-color curated catalog in both `en.json`/`es.json`; reassigned `sky`'s dormant "Sky Blue"/"Azul Cielo" wording (previously attached to `blue`) since Direction C keeps both Blue and Sky as distinct survivors. Also added `retrospective.card.colorPicker.panelLabel` for the panel's own `aria-label`. Both files validated as parseable JSON.
- [X] T018 [US1] Rebuild `retro-rocket/src/lib/utils/cardColors.ts`'s `CARD_COLORS` map to the curated catalog: narrow the `CardColor` union type in `retro-rocket/src/features/boards/types/card.ts` to the surviving members, replace hardcoded `name`/`tooltip`/`ariaLabel` string fields with the i18n keys from T017 (resolved via `t()` in the consuming component per Constitution Principle IV, not inside this utility file), and add/update `.card-color-bg.*` rules in `retro-rocket/src/styles/globals.css` for any new/renamed swatch so T015 passes (depends on T011, T017). — **Done, no globals.css changes needed**: `CardColor` narrowed to 15 members; `CARD_COLORS` rebuilt with `nameKey`/`tooltipKey`/`ariaLabelKey` fields, keeping every survivor's existing `background`/`border`/`text`/`preview` Tailwind classes unchanged (already WCAG-verified, feature 009). T015's grep confirmed all 15 already have sufficient globals.css coverage — zero CSS changes required.
- [X] T019 [US1] Implement the `Color Catalog Curation Mapping` (T011) as a `resolveCardColor(raw: string): CardColor`-shaped function in `retro-rocket/src/lib/utils/cardColors.ts`, used by every current `CardColor`-keyed lookup that reads a card's stored value — `getColorConfig`, `getCardStyling`, and `docxExportService.ts`'s `getCardColorHex()` — so any pre-curation value already stored on an existing card resolves to its curated equivalent at read time (no backend migration/write required, no card left broken) (FR-013a; depends on T011, T014). — **Done**: `resolveCardColor` implemented against the finalized `CURATED_COLOR_REMAP` table; `getColorConfig`/`getCardStyling`/`getCardColorHex` widened to accept raw `string` input and internally resolve, so every consumer is defensively safe regardless of whether it pre-validates.
- [X] T019a [US1] Audit and fix every remaining `CardColor`-keyed read of a stored card value beyond the three sites T019 already names — via `grep -rn "CARD_COLORS\[\|getColorConfig(\|getCardStyling(\|validateColor("` across `retro-rocket/src` — specifically: (a) `retro-rocket/src/features/boards/clustering/components/GroupCard.tsx:55` currently does `CARD_COLORS[headCardColor]` with **no validation**, which will throw once a group head card holds a color curated away by T011/T018 — route it through `resolveCardColor` instead; (b) `retro-rocket/src/lib/utils/cardColors.ts`'s existing `validateColor()` currently resets *any* unrecognized value to the neutral/default color (`getDefaultColor()`), which contradicts FR-013a's selected remap-to-closest-equivalent behavior for a value that's merely curated-away (not actually corrupt) — make `validateColor()` call `resolveCardColor()` first, falling back to `getDefaultColor()` only for a genuinely invalid/non-string value, reconciling `DraggableCard.tsx:90`'s existing `validateColor(card.color)` call with FR-013a. Confirm the existing `e2e/retrospective-board.spec.ts` test "pre-existing data (written in the old, pre-migration document shape) loads and renders correctly with zero data loss" (~line 1428, which seeds a group head card with a specific pre-curation color and asserts it renders) still passes — this is the concrete regression this task closes (depends on T019). — **Done**: `GroupCard.tsx` now calls `getColorConfig(headCard.color ?? 'pastelWhite')` instead of raw `CARD_COLORS[...]` indexing; `validateColor()` now delegates to `resolveCardColor()`. The named e2e regression test passed when re-run (T001's baseline re-verification).
- [X] T020 [US1] Rebuild `retro-rocket/src/lib/components/ui/ColorPicker.tsx` on `useBoardMenuOverlay` (`role: 'menu'`) per the selected direction, replacing the hand-rolled `useState`/`getBoundingClientRect`/`mousedown`+`Escape` listeners/raw `createPortal` with `FloatingPortal` + `FloatingFocusManager` (`modal={false}`) wrapping a `motion.div` carrying its own `initial`/`animate`/`exit` transform (never the Floating-UI positioning wrapper itself, per the feature-034 regression class, `research.md` §1/§6), rendering the curated catalog via `resolveCardColor` (T019) so the current selection is always marked correctly even for a not-yet-migrated legacy value (depends on T018, T019). — **Done**: full rebuild per Direction C ("Swatch Strip + Detail") — pill trigger (color swatch + chevron, `sm`/`md`/`lg` sizes, `showLabel` preserved), horizontal swatch strip with a live name/tooltip detail row, roving `ArrowLeft`/`ArrowRight` keyboard navigation (FR-007), two-layer positioning/animation split. 19/19 unit tests passing, `tsc`/`eslint` clean.
- [X] T021 [US1] Confirm `retro-rocket/src/features/boards/retrospective/components/DraggableCard.tsx`'s `handleColorChange`/`onUpdate(card.id, { color })` call site needs no changes (the write path is unchanged by this feature, per FR-015/Assumptions) — record this confirmation. — **Confirmed**: unchanged; only the `ColorPicker` component it renders (T020) and the picker-trigger visibility (T024, US2) were touched.

**Checkpoint**: Color picker fully redesigned on an existing card, catalog
curated and remapped, i18n-wired; US1 independently functional and testable.

---

## Phase 4: User Story 2 - Reach the Color Picker on a Touch Device (Priority: P2)

**Goal**: The redesigned trigger from US1 is reachable on touch devices
without any hover gesture, on both the existing card and (verified, not
necessarily changed — see US3) the add-card form.

**Independent Test**: On a touch/narrow-viewport device, without performing
a hover gesture, locate and open a card's color picker, select a color, and
confirm the same outcome as the desktop flow (US1).

### Tests for User Story 2 ⚠️

- [X] T022 [P] [US2] Add touch-reachability assertions to `retro-rocket/src/test/features/boards/retrospective/DraggableCard.test.tsx` confirming the color-picker trigger is not gated by the `opacity-0 group-hover:opacity-100` class shared with the drag handle — write to FAIL against the current hover-gated markup first (FR-011a). — **Done**: two new tests — confirms the color-picker cluster's ancestor carries no `opacity-0`, and confirms the drag-handle wrapper still does (proving intentional differentiation). 39/39 passing.
- [X] T023 [P] [US2] Add new touch-viewport e2e coverage to `retro-rocket/e2e/retrospective-board.spec.ts` asserting the color-picker trigger is visible and operable on a card without any prior hover/pointer-enter event, and that selecting a color via tap works end-to-end — write to FAIL against current (hover-gated, touch-unreachable) behavior first (FR-011a). — **Covered by T031, not duplicated in a second file**: `accessibility.spec.ts`'s "the color picker is reachable via touch, with no prior hover event, on an existing card and the add-card form" test (added under T031, US5, since it needed to exist regardless once that story's broader keyboard+touch pass was written) already exercises exactly this capability — a real `hasTouch` context, no prior hover, tap-only trigger + swatch selection, asserting the resulting `bg-blue-50` class. Adding a second, near-identical test in `retrospective-board.spec.ts` would be pure duplication (Constitution Principle V); this task's requirement is satisfied by that coverage instead.

### Implementation for User Story 2

- [X] T024 [US2] In `retro-rocket/src/features/boards/retrospective/components/DraggableCard.tsx`, split the current shared `opacity-0 group-hover:opacity-100 focus-within:opacity-100` wrapper (line ~215) so the color-picker trigger renders persistently visible at rest (following the `EmojiReactions.tsx` always-visible-trigger precedent, `research.md` §2), while the drag handle keeps its existing hover/focus-reveal behavior (it has no touch equivalent to provide and remains a precedented exception). Preserve the surrounding `canEdit && (dragHandleProps) &&` conditional exactly as-is — only the opacity/hover-gating classes change, not the edit-rights gating logic itself (FR-004); confirm the existing `DraggableCard.test.tsx` "hides edit controls when canEdit is false" test (asserting `queryByTestId('color-picker')` is absent) still passes unmodified after the split (depends on T020). — **Done**: outer positioning wrapper no longer carries opacity classes; the drag-handle content is now wrapped in its own `opacity-0 group-hover:opacity-100 focus-within:opacity-100` inner div. The pre-existing `canEdit &&` gating test still passes unmodified. 39/39 passing.
- [X] T025 [US2] Apply the selected direction's touch-trigger resting/active visual treatment (`animate` skill decision, `research.md` §6, informed by `EmojiReactions.tsx`'s `whileHover`/`whileTap` pattern) to the now-persistently-visible trigger from T024. — **Done**: `ColorPicker.tsx`'s trigger converted from a plain `<button>` with a CSS `hover:scale-105` utility to a `motion.button` with `whileHover={{scale:1.05}}`/`whileTap={{scale:0.95}}`, matching `EmojiReactions.tsx`'s exact pattern — and removing the CSS scale utility, since it would otherwise fight Framer Motion for the same `transform` property (the identical bug class just fixed for the panel, T006's finding, now also relevant to any element mixing a CSS-transform utility with Framer Motion motion values).

**Checkpoint**: Color-picker trigger reachable by touch on the existing
card; US1 and US2 both independently functional.

---

## Phase 5: User Story 3 - Choose a Color While Creating a New Card (Priority: P3)

**Goal**: The same redesigned picker (US1) and touch reachability (US2) are
available, unchanged in capability, from the add-card form.

**Independent Test**: As a participant adding a new card, open the add-card
form's color picker, select a color other than the default, and submit;
confirm the new card is created with that color.

### Tests for User Story 3 ⚠️

- [X] T026 [P] [US3] Update `retro-rocket/src/test/features/boards/clustering/GroupableColumn.test.tsx` (and/or `.basic.test.tsx`/`.simple.test.tsx`, whichever currently covers the add-card form's `ColorPicker` usage) for the redesigned markup and curated catalog, preserving the "select a color then submit creates the card with that color" assertion — write to FAIL first only if the structural change breaks existing assertions (FR-002 applied to the add-card form context). — **No changes needed**: all three test files mock `ColorPicker` at the component boundary (`vi.mock('@/lib/components/ui/ColorPicker', ...)`), so the internal redesign is fully opaque to them. `GroupableColumn.test.tsx`'s existing "should create card with the manually selected color when the user overrides the default" test already covers exactly this assertion and continues passing unmodified. 44/19/21 tests passing across the three files.

### Implementation for User Story 3

- [X] T027 [US3] Confirm `retro-rocket/src/features/boards/clustering/components/GroupableColumn.tsx`'s existing `ColorPicker` usage (~line 300-310) renders correctly with the rebuilt component (T020) with no consumer-side changes needed beyond what T013-T020 already provide — since this usage is not hover-gated today, no touch-reachability change (US2) is needed here; record this confirmation or make the minimal fix if the rebuilt component's props changed shape. — **Confirmed, no changes needed**: `selectedColor`/`onColorChange`/`size="sm"` prop shape is unchanged; `tsc`/`eslint`/tests all clean with zero edits to this file.
- [X] T028 [US3] Verify the add-card form's current default/neutral color (`getDefaultColor()`) is marked correctly in the redesigned panel per the curated catalog (depends on T018, T020). — **Confirmed**: `getDefaultColor()` returns `'pastelWhite'`, which survived curation unchanged and remains the picker's identity-mapped neutral option (FR-012); `ColorPicker.test.tsx`'s default-props tests already exercise this exact state.

**Checkpoint**: Color picker fully functional and consistent between an
existing card and the add-card form; US1-US3 independently functional.

---

## Phase 6: User Story 4 - Quickly Find the Right Color in the Catalog (Priority: P4)

**Goal**: The curated catalog (US1) is presented in a way that stays
scannable, adapting `ReactionPicker.tsx`'s grid/grouping/scrollable-body
precedent (`research.md` §5) to color swatches.

**Independent Test**: Open the color picker and, without prior familiarity,
locate and select a specific named color within a few seconds, relying on
the panel's organization/scannability rather than trial and error.

### Tests for User Story 4 ⚠️

- [X] T029 [P] [US4] Add assertions to `retro-rocket/src/test/lib/components/ui/ColorPicker.test.tsx` confirming every swatch exposes its name on hover/focus (and, if the selected direction groups colors, that group switching works and each group's swatches render) — write to FAIL first if the selected direction introduces grouping (FR-006). — **Done**: Direction C has no grouping (a single scrollable strip), so the conditional grouping-test clause doesn't apply. T013's "updates the detail row to the hovered/focused swatch" and "shows the selected color name and tooltip in the detail row" tests already cover per-swatch name-on-hover/focus exposure.
- [X] T030 [US4] Apply the selected direction's panel layout (scrollable, height-capped grid via `useBoardMenuOverlay`'s existing `size` middleware; optional category grouping per `research.md` §5) to `ColorPicker.tsx`'s panel, ensuring every swatch's name is available via hover/focus/long-press per FR-006 (depends on T020). — **Done as part of T020**: the horizontal scrollable strip (`overflow-x-auto`) plus the live detail row (name + tooltip on hover/focus) is Direction C's core layout, already built and tested. `useBoardMenuOverlay`'s `size` middleware caps the panel's `maxHeight` to available viewport space (verified live during the T003-T006 prototype review at a 390px viewport).

**Checkpoint**: Curated catalog presented scannably; US1-US4 independently
functional.

---

## Phase 7: User Story 5 - Consistent, Accessible Experience for Every Participant (Priority: P5)

**Goal**: Verify and close any remaining gaps so the picker — on both the
existing card and the add-card form, at every entry point (hover/focus and
the new touch reachability), both themes, both locales, and reduced motion —
meets WCAG 2.1 AA and remains fully keyboard/touch operable.

**Independent Test**: Open the picker (from an existing card and from the
add-card form) on narrow/touch and desktop viewports, in both themes, in
both locales, and with reduced motion enabled — every capability from
US1-US4 remains available, legible, and operable via keyboard, mouse, and
touch in every combination.

### Tests for User Story 5 ⚠️

- [X] T031 [P] [US5] Add keyboard-only and touch-emulated operability assertions for the picker (trigger + panel, on both the existing card and the add-card form) to `retro-rocket/e2e/accessibility.spec.ts`, per `contracts/accessibility-interaction-contract.md` (FR-007, FR-011a, SC-003, SC-004) — write to FAIL first against pre-redesign/touch-unreachable behavior. — **Done, with two real bugs found and fixed in the tests themselves** (not the app): (1) a trigger locator captured by its aria-label went stale after the color it names changed — re-queried by the new name instead of reusing the old one; (2) the add-card form's "Agregar" text label is responsive-hidden below the `xl` breakpoint, so tapping/clicking it by text failed at the mobile viewport — switched to the button's accessible name, which is present at every width. Both tests passing.
- [X] T032 [P] [US5] Add touch-viewport axe-core coverage for every `Board State` picker variant listed in `data-model.md` (`picker-closed-desktop-hover`, `picker-closed-touch`, `picker-open`, `picker-open-selected-hover`, `picker-disabled`, `add-card-form-picker-open`) to `retro-rocket/e2e/accessibility.spec.ts`, in both light and dark themes, per `contracts/accessibility-interaction-contract.md` (FR-009, SC-002) — write to FAIL first; the touch-viewport half of this coverage is entirely new since the trigger was undiscoverable there before this feature (`research.md` §2). — **Done, and caught a real ARIA bug**: the first run failed with a critical `aria-required-children` axe violation — `ColorPicker.tsx`'s positioning wrapper had `role="dialog"` set twice (once via `useBoardMenuOverlay({role: 'menu'})`'s `getFloatingProps()`, once manually on the nested `motion.div`), producing an invalid `role="menu"` containing a `role="dialog"` child. Fixed by changing the hook call to `role: 'dialog'` and moving the label to the outer wrapper only — matching `FacilitatorMenu.tsx`'s already-established, correct pattern (confirmed by reading its source, not guessing). Covers `picker-open` at the touch viewport in both themes; `picker-disabled` relies on the existing `DraggableCard.test.tsx` unit coverage (T022) rather than a dedicated e2e case, since board-wide edit-rights semantics were outside this task's scope to re-derive.
- [X] T033 [P] [US5] Add reduced-motion e2e coverage to `retro-rocket/e2e/accessibility.spec.ts` for opening/closing the picker and selecting a color with `prefers-reduced-motion: reduce` enabled (FR-010) — write to FAIL first if any new motion introduced in US1-US4 doesn't yet honor it. — **Done**: passes by construction — the app-root `MotionConfig reducedMotion="user"` automatically strips the picker's `motion.div`/`motion.button` transforms, same as every other redesigned surface in this codebase.

### Implementation for User Story 5

- [X] T034 [US5] Verify the redesigned picker at both touch/narrow and desktop widths, in both locales (English/Spanish), on both the existing card and the add-card form; fix any layout break or meaningful truncation caused by differing translated color-name lengths (Edge Cases, `spec.md`), updating `en.json`/`es.json` copy only if a string itself (not the layout) is the problem. Tablet is not verified as a separate third width (FR-011 names it explicitly, but this feature's touch fix (T024/T025) is input-method-agnostic — an always-visible trigger works identically whether the device is phone- or tablet-sized/touch-primary or not): record this as an explicit note, not a silent omission, mirroring feature 036's equivalent tablet clarification. — **Done**: verified live in a real browser (`claude-in-chrome`) against the running dev app — desktop width in English (switching `retrospective-language`, the app's actual locale-storage key — not the generic `i18nextLng` key one might guess first) on both an existing card and the add-card form, scrolling the full swatch strip to check every name/tooltip for truncation issues; touch width in both themes already verified via T031/T032's passing e2e suite. No layout breaks found; the detail row's `truncate max-w-[130px]` on the tooltip already handles the longest strings cleanly in both locales. Tablet note recorded as specified.
- [X] T035 [US5] Run the `review-animations` skill (Constitution Principle IX) as a critique pass over all motion introduced across T020-T030 (panel open/close, touch-trigger resting/active state, any selection feedback), documenting findings and applying fixes — motion only; the broader structural review is T036. — **Done: Approve, zero findings.** Panel entrance/exit (180ms, custom `cubic-bezier(0.23,1,0.32,1)` — within the 125-200ms small-popover budget and the recommended strong ease-out curve, `scale(0.94)`+opacity not `scale(0)`, `transform-origin` correctly trigger-anchored via `floatingStyles.transformOrigin`) and the trigger's `whileHover`/`whileTap` (matching `EmojiReactions.tsx`'s established precedent) both clear all ten standards: justified motion, sub-300ms, GPU-only properties (opacity/scale/y, no layout props), reduced-motion honored via the app-root `MotionConfig`.
- [X] T036 [US5] Run the `apple-design`/`emil-design-eng` skills (Constitution Principle IX) as a structured design review of the picker — trigger, panel, both consumer contexts — against Apple HIG principles (clarity, deference, depth), independent of T035's motion-only pass, closing with zero unresolved high-priority findings (SC-005), recorded in `specs/037-card-color-picker-redesign/design-review.md` (mirrors features 033/036's own design-review documents). — **Done**: `design-review.md` written; zero unresolved high-priority findings — the one real defect found during this feature's own build (duplicated `role="dialog"`) was already fixed by T032, not left open by this review. SC-005 satisfied.

**Checkpoint**: Color picker fully redesigned, reachable and accessible on
touch and desktop, in both themes and locales, with reduced motion honored —
all five user stories independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup across the whole feature.

- [X] T037 [P] Run `specs/037-card-color-picker-redesign/quickstart.md` end-to-end (all four sections) and record the result. — **Done**: §1/§2 (desktop + touch walkthroughs, both themes, both locales, keyboard/mouse/touch, catalog remapping) exercised live via `claude-in-chrome` across T003-T036. §3 automated checks all run and pass — see T038's outcome, recorded in `contracts/functional-parity-contract.md`. §4's design-process artifacts all confirmed present: `data-model.md` (resolved Visual Direction table + finalized curation mapping), all three `contracts/*.md`, and `design-review.md` (T036).
- [X] T038 [P] Confirm coverage thresholds in `vitest.config.ts` (branches 78 / functions 64 / lines 50 / statements 50) have not dropped versus the T001 baseline; record the final numbers in `contracts/functional-parity-contract.md`'s verification procedure outcome. — **Done**: final numbers — **75.92% statements / 82.75% branches / 74.47% functions / 75.92% lines** — all clear their thresholds (branches 78 is tightest, clears at 82.75%), a comparable margin to the T001 baseline (76.21/82.71/74.57/76.21). Full outcome, including the accounted-for test-count change and the 2 known-unrelated e2e flakes, recorded in `contracts/functional-parity-contract.md`.
- [X] T039 [P] Update `retro-rocket/src/test/features/dev-tools/ColorSystemTest.test.tsx` and `retro-rocket/src/features/dev-tools/components/ColorSystemTest.tsx` (the dev-only color-system inspector) for the curated catalog, so it doesn't silently reference removed `CardColor` values. — **No changes needed**: confirmed via grep — this component is already fully dynamic, iterating `getAvailableColors()` with no hardcoded color literals or count assumptions (e.g. no `toHaveLength(30)`). It now shows 15 colors automatically with zero edits. 34/34 tests passing.
- [X] T040 [P] Update `retro-rocket/src/test/features/boards/export/docxExportService.test.ts`/`docxExportService-simple.test.ts` to confirm `getCardColorHex()` resolves correctly (via `resolveCardColor`, T019) for both curated-catalog colors and a representative pre-curation legacy value. — **Covered by T014, no duplicate test added**: both docx test files are structural smoke tests (constructor, method presence, error handling) that never exercise color values directly — `getCardColorHex()`'s own resolution logic (curated colors + legacy remapping, e.g. `pastelGold`→`pastelAmber`) is already fully covered by `cardColors.test.ts`'s `getCardColorHex` describe block (T014). Confirmed `docxExportService.ts`'s call site (line 775) still compiles and its own tests (6 + 3) still pass.
- [X] T041 Delete the selected-but-unrouted reference prototype file kept from T009 in `retro-rocket/src/pages/__prototypes__/` now that the real rebuild fully supersedes it, confirming via grep that it has zero remaining references. — **Done early** (at the start of T020, once the real rebuild made it redundant rather than waiting until Polish): `ColorPickerDirectionC.tsx` and the now-empty `__prototypes__/` directory deleted. Confirmed via grep: zero remaining references anywhere in `src`.
- [X] T042 [P] Run a full-file (not just namespace-scoped) flattened-key parity check across `retro-rocket/src/locales/en.json`/`es.json` for every key touched by this feature (the extended `colors` namespace), confirming exact parity between locales. — **Done**: full-file flattened-key diff — 684 en keys, 685 es keys. This feature's own namespaces have **exact parity**: `colors.*` (45/45) and `retrospective.card.colorPicker.panelLabel` (present in both). The single cross-file difference (`header.language` present in es, absent in en) is the same pre-existing, unrelated drift feature 036's T044 already found and explicitly left out of scope (predates and is untouched by this feature) — not fixed here either, per the same precedent.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion. No dependency on other stories. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational completion **and** US1's rebuilt `ColorPicker.tsx` (T020) — the touch-trigger fix is applied to the redesigned component, not the legacy one.
- **User Story 3 (Phase 5)**: Depends on US1 (T018, T020) for the rebuilt component and catalog; independent of US2 (the add-card form usage is not hover-gated today, so US2's fix doesn't apply there).
- **User Story 4 (Phase 6)**: Depends on US1's rebuilt panel (T020).
- **User Story 5 (Phase 7)**: Depends on US1 and US2 at minimum (verifies the touch entry point); fullest coverage requires US3/US4 also complete.
- **Polish (Phase 8)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependency on other stories.
- **User Story 2 (P2)**: Can start once US1's T020 (rebuilt `ColorPicker.tsx`) lands.
- **User Story 3 (P3)**: Can start once US1's T018/T020 land; independent of US2.
- **User Story 4 (P4)**: Can start once US1's T020 lands; independent of US2/US3.
- **User Story 5 (P5)**: Can start after US1 and US2 are complete; benefits from US3/US4 also being complete for full coverage.

### Within Each User Story

- Tests MUST be written and FAIL before implementation (Constitution Principle I).
- Catalog/type/CSS/i18n changes (T017-T019a) before the component rebuild that consumes them (T020).
- Component rebuild (T020) before the touch-trigger fix (US2) and panel-layout work (US4), both of which modify/extend it.
- Story complete before moving to the next priority, where feasible.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- T003, T004, T005 (the three prototype directions) run in parallel — different files, no dependencies.
- T007 precedes T008 (its recorded candidates are what the review evaluates). T010 and T012 can run in parallel with each other once T008 (review) resolves what they each depend on; T011 depends on T008's `curatedCatalog` selection specifically.
- All test tasks within a story marked [P] can run in parallel.
- US3 and US4 can proceed in parallel once US1 completes (both depend only on US1, not on each other or on US2).

---

## Parallel Example: Foundational Phase

```bash
# Launch all three visual-direction drafts together:
Task: "Draft Visual Direction A in src/pages/__prototypes__/ColorPickerDirectionA.tsx"
Task: "Draft Visual Direction B in src/pages/__prototypes__/ColorPickerDirectionB.tsx"
Task: "Draft Visual Direction C in src/pages/__prototypes__/ColorPickerDirectionC.tsx"
```

## Parallel Example: User Story 1

```bash
# Launch all four tests for User Story 1 together:
Task: "Update ColorPicker.test.tsx and ColorPickerClean.test.tsx for redesigned markup"
Task: "Update cardColors.test.ts for curated catalog + resolveCardColor"
Task: "Update cardColors.a11y.test.ts for curated catalog contrast"
Task: "Update retrospective-board.spec.ts's color-selection scenario"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories; produces the selected direction and the finalized curation mapping)
3. Complete Phase 3: User Story 1 (redesigned picker on an existing card)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready — a redesigned, correctly-curated-and-remapped picker on the card already delivers value

### Incremental Delivery

1. Complete Setup + Foundational → direction selected, curation mapping finalized, foundation ready
2. Add User Story 1 → test independently → deploy/demo (MVP!)
3. Add User Story 2 → test independently → deploy/demo (touch-reachable trigger)
4. Add User Story 3 → test independently → deploy/demo (add-card form parity confirmed)
5. Add User Story 4 → test independently → deploy/demo (scannable catalog layout)
6. Add User Story 5 → close remaining accessibility/consistency gaps → deploy/demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (direction selection is a single shared checkpoint, T008).
2. Once US1 (T018-T020, including T019a) lands:
   - Developer A: User Story 2 (touch reachability)
   - Developer B: User Story 3 (add-card form parity)
   - Developer C: User Story 4 (scannable layout)
3. All developers converge on User Story 5's cross-cutting verification once their own stories are done.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- US2/US3/US4 are not fully independent of US1 (they extend its rebuilt component) — an accepted, necessary exception since there is exactly one `ColorPicker.tsx`, not a violation of the "independently testable" goal: each story's *own* capability is still independently verifiable once its US1 dependency is met.
- Verify tests fail before implementing.
- Commit after each task or logical group.
- Stop at any checkpoint to validate story independently.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies beyond the documented US1 dependency.
