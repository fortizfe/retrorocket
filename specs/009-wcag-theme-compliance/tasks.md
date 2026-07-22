---

description: "Task list for WCAG 2.1-Compliant Light & Dark Themes"
---

# Tasks: WCAG 2.1-Compliant Light & Dark Themes

**Input**: Design documents from `/specs/009-wcag-theme-compliance/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/design-tokens.md, contracts/accessibility-audit.md, quickstart.md

**Tests**: REQUIRED. Per Constitution v3.1.0 Principle I (TDD, NON-NEGOTIABLE) and the plan, every implementation task is preceded by a failing test.

**Organization**: Grouped by user story. The semantic-token mechanism and component migration are **Foundational** (both P1 theme stories depend on them); US1 fills compliant *light* values, US2 fills compliant *dark* values, US3 adds focus visibility + non-color cues.

**App root**: all source paths are under `retro-rocket/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 (Setup, Foundational, Polish carry no story label)

## Path Conventions

- Source: `retro-rocket/src/`, styles `retro-rocket/src/styles/`, config `retro-rocket/`
- Unit tests: `retro-rocket/src/test/`, E2E: `retro-rocket/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tooling and module scaffolding

- [X] T001 Add `@axe-core/playwright` as a dev dependency in `retro-rocket/package.json` and install
- [X] T002 [P] Create theme module scaffolding: `retro-rocket/src/lib/theme/tokens.ts` and `retro-rocket/src/lib/theme/contrast.ts` with exported public signatures (no logic yet)
- [X] T003 [P] Create test folders `retro-rocket/src/test/lib/theme/` and confirm `@axe-core/playwright` types resolve in `retro-rocket/e2e/`

**Checkpoint**: Dependencies installed, empty theme module + test locations exist

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The semantic-token engine, the contrast utility, the audit harness, and the migration of all components onto tokens — required before either theme can be made or verified compliant.

**⚠️ CRITICAL**: No user story (theme) work can begin until this phase is complete

### Contrast utility (TDD)

- [X] T004 [P] Write failing unit tests in `retro-rocket/src/test/lib/theme/contrast.test.ts` for relative luminance, `contrastRatio(fg, bg)`, and `meetsAA(fg, bg, { large })` against known WCAG reference pairs (e.g. #000/#FFF = 21:1, 4.5:1 / 3:1 boundaries)
- [X] T005 Implement pure functions in `retro-rocket/src/lib/theme/contrast.ts` to make T004 pass (no dependencies added)

### Token catalog & mechanism

- [X] T006 Define the token name catalog and TypeScript types in `retro-rocket/src/lib/theme/tokens.ts` per contracts/design-tokens.md (surface, surface-raised, surface-overlay, text-primary/secondary/muted/inverse, border-default/strong, focus, action/action-hover/action-active, success/warning/error/info ×fg/bg), each with `{ light, dark }` RGB-channel fields (placeholder values allowed; real values set per story)
- [X] T007 Map every token to a Tailwind color using `rgb(var(--color-*) / <alpha-value>)` in `retro-rocket/tailwind.config.js`
- [X] T008 Declare all `--color-*` custom properties for both `:root` and `.dark` in `retro-rocket/src/styles/globals.css` (structural parity; placeholder values)
- [X] T009 [P] Write token-parity test `retro-rocket/src/test/lib/theme/tokens.test.ts` asserting every token name exists in both themes and in the Tailwind map with no orphans (this test stays green through value changes)

### Audit harness

- [X] T010 Create the reusable axe scan harness in `retro-rocket/e2e/accessibility.spec.ts`: a helper that loads a route, forces a given theme (set `localStorage.theme` + `.dark` class before paint), runs axe with tags `['wcag2a','wcag2aa','wcag21a','wcag21aa']`, and asserts `violations` is empty (per-route/per-theme cases added by US1/US2/US3)

### Migrate components onto semantic tokens (both themes; different files ⇒ parallel)

- [X] T011 [P] Migrate UI primitives to semantic token classes in `retro-rocket/src/lib/components/ui/` (Button, Input, Textarea, Modal, ThemeToggle, ThemeMenuToggle, ColorPicker chrome) — replace ad-hoc `bg-slate-*/dark:*` with `bg-surface`, `text-text-primary`, `border-border-default`, etc.
- [X] T012 [P] Migrate layout components in `retro-rocket/src/lib/components/layout/` (Header and nav/footer) to semantic token classes
- [X] T013 [P] Migrate pages in `retro-rocket/src/pages/` (Landing, Dashboard, Profile, NotFound) to semantic token classes
- [X] T014 [P] Migrate board/card/column feature surfaces in `retro-rocket/src/features/boards/**` (columns, draggable cards, voting, grouping/clustering indicators) to semantic token classes
- [ ] T015 [P] Migrate auth, dashboard, and create-board feature surfaces in `retro-rocket/src/features/auth/`, `retro-rocket/src/features/dashboard/`, `retro-rocket/src/features/create-board/`
- [ ] T016 [P] Migrate overlay/transient styling: `react-hot-toast` toasts, tooltips/popovers, and the date picker in `retro-rocket/src/styles/datepicker.css` to token-based colors
- [X] T017 Migrate the base layer (body gradient, headings, scrollbar, `.glass`, `.btn`, `.input-focus`) in `retro-rocket/src/styles/globals.css` to token references
- [ ] T018 Refactor `retro-rocket/src/lib/utils/cardColors.ts` structure so each swatch's `background`/`border`/`text` expose explicit per-theme (light + `dark:`) classes wired to tokens/palette (values corrected in US1/US2)
- [X] T019 Route ThemeToggle/ThemeMenuToggle hardcoded Spanish labels through i18next: add keys to `retro-rocket/src/locales/es.json` and `retro-rocket/src/locales/en.json` and consume via `useTranslation` (satisfies i18n standard; no new hardcoded strings)
- [X] T019a Update existing theme tests for the i18n label change in `retro-rocket/src/test/lib/components/ui/ThemeToggle.test.tsx` and `retro-rocket/src/test/lib/components/layout/Header.test.tsx`: assert i18n-driven `aria-label`s and confirm the preserved binary toggle behavior (localStorage `theme` persistence + `prefers-color-scheme` first-visit seed) per FR-012 (depends on T019)

**Checkpoint**: App renders entirely from tokens; contrast utility + token-parity tests green. Themes not yet guaranteed AA (values still placeholder) — that is US1/US2.

---

## Phase 3: User Story 1 - Readable, accessible light theme (Priority: P1) 🎯 MVP

**Goal**: The default light theme meets WCAG 2.1 AA on every primary surface.

**Independent Test**: Load the app in light theme; run the light-theme axe scans and the light token/swatch contrast tests — all pass with zero violations.

### Tests for User Story 1 (write first, must FAIL)

- [X] T020 [P] [US1] Add failing test `retro-rocket/src/test/lib/theme/contrast.tokens.light.test.ts` asserting every text/border/focus/status token pairing meets its AA threshold using `light` values from `tokens.ts`
- [ ] T021 [P] [US1] Extend `retro-rocket/src/test/lib/utils/cardColors.test.ts` with failing assertions that every swatch's `text` ≥4.5:1 vs `background` and `border` ≥3:1 in the **light** theme
- [ ] T022 [P] [US1] Add light-theme axe cases to `retro-rocket/e2e/accessibility.spec.ts` covering `/`, `/dashboard`, `/perfil`, `/retrospective/:id`, plus an open modal, the theme menu, a toast, and the date picker

### Implementation for User Story 1

- [ ] T023 [US1] Set compliant **light** values for all `--color-*` tokens in `retro-rocket/src/lib/theme/tokens.ts` (`light`) and `retro-rocket/src/styles/globals.css` (`:root`) until T020 passes; confirm the theme class is applied before first paint so the initial light render is already compliant (no flash of wrong theme, FR-011)
- [ ] T024 [US1] Set compliant **light** swatch values (background/border/text) in `retro-rocket/src/lib/utils/cardColors.ts` until T021 passes
- [ ] T025 [US1] Fix any light-theme surface violations surfaced by T022 in the migrated components under `retro-rocket/src/lib/components/`, `retro-rocket/src/pages/`, and `retro-rocket/src/features/**` until all light axe scans in `retro-rocket/e2e/accessibility.spec.ts` pass

**Checkpoint**: Light theme is fully AA-compliant and independently verifiable — MVP deliverable.

---

## Phase 4: User Story 2 - Readable, accessible dark theme (Priority: P1)

**Goal**: The dark theme meets WCAG 2.1 AA on every primary surface, with no regression vs light.

**Independent Test**: Load the app in dark theme; run the dark-theme axe scans and dark token/swatch contrast tests — all pass with zero violations.

**Depends on**: Foundational migration (Phase 2). Token/swatch structure and component consumption are shared with US1; this story sets dark values and verifies dark rendering.

### Tests for User Story 2 (write first, must FAIL)

- [X] T026 [P] [US2] Add failing test `retro-rocket/src/test/lib/theme/contrast.tokens.dark.test.ts` asserting every token pairing meets its AA threshold using `dark` values from `tokens.ts`
- [ ] T027 [P] [US2] Extend `retro-rocket/src/test/lib/utils/cardColors.test.ts` with failing assertions that every swatch meets AA text/border contrast in the **dark** theme (fixes the current light-bg + light-text defect)
- [ ] T028 [P] [US2] Add dark-theme axe cases to `retro-rocket/e2e/accessibility.spec.ts` covering the same routes/overlays as T022
- [ ] T028a [US2] Add a runtime theme-switch E2E in `retro-rocket/e2e/accessibility.spec.ts`: open a board, toggle theme mid-session, and re-run the axe scan in the switched theme asserting zero violations and that no surface retains prior-theme colors (FR-010) (same file as T028 — run after it)

### Implementation for User Story 2

- [ ] T029 [US2] Set compliant **dark** values for all `--color-*` tokens in `retro-rocket/src/lib/theme/tokens.ts` (`dark`) and `retro-rocket/src/styles/globals.css` (`.dark`) until T026 passes; confirm the theme class is applied before first paint so the initial dark render is already compliant (no flash of wrong theme, FR-011)
- [ ] T030 [US2] Set compliant **dark** swatch values (add proper `dark:` backgrounds/borders/text) in `retro-rocket/src/lib/utils/cardColors.ts` until T027 passes
- [ ] T031 [US2] Fix any dark-theme surface violations surfaced by T028 in the migrated components under `retro-rocket/src/lib/components/`, `retro-rocket/src/pages/`, and `retro-rocket/src/features/**` until all dark axe scans in `retro-rocket/e2e/accessibility.spec.ts` pass

**Checkpoint**: Both themes independently pass the same WCAG 2.1 AA thresholds.

---

## Phase 5: User Story 3 - Visible focus & non-color cues in both themes (Priority: P2)

**Goal**: Every focusable element shows a visible focus indicator, and no meaning is conveyed by color alone, in both themes.

**Independent Test**: Keyboard-navigate the whole app in each theme (every focused element clearly indicated); axe use-of-color/focus rules report zero violations; each status/state carries a non-color cue.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T032 [P] [US3] Add failing test `retro-rocket/src/test/lib/theme/contrast.focus.test.ts` asserting the `focus` token ≥3:1 vs adjacent surface in **both** themes
- [ ] T033 [P] [US3] Add a keyboard-navigation E2E in `retro-rocket/e2e/accessibility.spec.ts` (or a sibling spec) that tabs through Landing → Dashboard → Board and asserts a visible focus indicator on each focusable element in both themes
- [ ] T034 [P] [US3] Add assertions that axe use-of-color-adjacent rules pass on the board (votes, sentiment/clustering indicators, status chips) in both themes

### Implementation for User Story 3

- [ ] T035 [US3] Standardize a single `focus-visible:ring-focus` treatment across interactive components in `retro-rocket/src/lib/components/ui/` and shared `.btn`/`.input-focus` layers in `retro-rocket/src/styles/globals.css` until T032/T033 pass
- [ ] T036 [P] [US3] Add non-color cues (lucide icon / text label / shape) to status and feedback elements (success/warning/error, informational) in `retro-rocket/src/lib/components/ui/` and toast usages; route any new visible text through i18next, adding keys to `retro-rocket/src/locales/es.json` and `retro-rocket/src/locales/en.json`
- [ ] T037 [P] [US3] Add non-color cues to board state indicators — selected card, disabled controls, vote counts, sentiment/clustering categories — in `retro-rocket/src/features/boards/**` until T034 passes; add i18next keys to `retro-rocket/src/locales/es.json` and `en.json` for any new visible label, no hardcoded strings

**Checkpoint**: All three user stories independently functional; keyboard + use-of-color compliant in both themes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and end-to-end validation

- [ ] T038 [P] Remove now-dead ad-hoc color utilities and any leftover raw `dark:` color pairs flagged by grep across `retro-rocket/src/**` (no behavior change)
- [ ] T039 [P] Update contributor docs/CLAUDE.md note pointing to the semantic-token contract (`contracts/design-tokens.md`) as the required way to add colors
- [ ] T040 Run `npm run test:coverage` and confirm coverage stays ≥ thresholds in `retro-rocket/vitest.config.ts` (branches 78 / functions 64 / lines 50 / statements 50); add unit tests if any new logic dropped it
- [ ] T041 Execute `specs/009-wcag-theme-compliance/quickstart.md` end-to-end (steps 1–4) and confirm all expected outcomes, including the merge-blocking `e2e` audit green in both themes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Setup — **BLOCKS all user stories**
- **US1 (Phase 3)**: depends on Foundational — MVP
- **US2 (Phase 4)**: depends on Foundational (shares migration with US1); can run in parallel with US1 if a second dev owns dark values
- **US3 (Phase 5)**: depends on Foundational; best after US1/US2 so focus/cues are tuned against final palettes, but can proceed in parallel
- **Polish (Phase 6)**: depends on all desired stories complete

### Within Each User Story

- Tests (T020–T022 / T026–T028 / T032–T034) MUST be written and FAIL before their implementation tasks
- Token/swatch value tasks before "fix remaining audit violations" tasks
- **T019a** depends on **T019** (updates the tests broken by the i18n label change); same-file, sequential
- **T028a** depends on **T028/T029** (needs both themes to exist to test a mid-session switch); same file as T028, run after it

### Parallel Opportunities

- Setup: T002, T003 in parallel
- Foundational: T004 & T009 parallel; the migration batch T011–T016 all parallel (distinct files) once T006–T008 exist
- US1 tests T020–T022 parallel; US2 tests T026–T028 parallel; US3 tests T032–T034 parallel
- US1 and US2 can be staffed in parallel after Foundational (light vs dark values are different fields/files)

---

## Parallel Example: Foundational migration

```bash
# After T006–T008 (token names + tailwind map + css skeleton) exist, migrate in parallel:
Task: "Migrate UI primitives in retro-rocket/src/lib/components/ui/"
Task: "Migrate layout in retro-rocket/src/lib/components/layout/"
Task: "Migrate pages in retro-rocket/src/pages/"
Task: "Migrate board features in retro-rocket/src/features/boards/**"
Task: "Migrate auth/dashboard/create-board features"
Task: "Migrate overlays + datepicker.css"
```

## Parallel Example: User Story 1 tests

```bash
Task: "Light token contrast test in src/test/lib/theme/contrast.tokens.light.test.ts"
Task: "Light swatch AA assertions in src/test/lib/utils/cardColors.test.ts"
Task: "Light-theme axe cases in e2e/accessibility.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup
2. Phase 2: Foundational (CRITICAL — token engine + migration; blocks everything)
3. Phase 3: US1 — compliant light theme
4. **STOP and VALIDATE**: light axe scans + light contrast tests green
5. Demo the compliant light theme

### Incremental Delivery

1. Setup + Foundational → app runs on tokens
2. US1 → light theme AA → demo (MVP)
3. US2 → dark theme AA → demo
4. US3 → focus + non-color cues → demo
5. Polish → cleanup + full quickstart + coverage

### Parallel Team Strategy

After Foundational: Dev A owns US1 (light values), Dev B owns US2 (dark values), Dev C prepares US3 (focus/cues). Stories integrate through the shared token layer.

---

## Notes

- [P] = different files, no dependencies
- The migration batch (T011–T016) is the largest effort (~94 files / ~1331 `dark:` utilities); split by directory as shown
- The `e2e` accessibility audit is merge-blocking via existing branch protection — do not disable axe rules to pass (Principle VIII); narrowly-scoped third-party exclusions must be justified inline
- Do not lower `vitest.config.ts` coverage thresholds (Principle VI)
- Verify each test fails before implementing; commit after each task or logical group
