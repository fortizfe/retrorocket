# Tasks: Apple-Inspired Design Alignment

**Input**: Design documents from `/specs/028-apple-design-alignment/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Per the project constitution (Principle I, TDD, NON-NEGOTIABLE), every task that introduces new observable behavior (a hook, a wiring change, a token/contrast value, an ARIA/keyboard behavior) has a failing test written first. Purely cosmetic changes (color/spacing/typography swapped within existing markup, no new behavior) have no new logic to pre-test — for those, the existing automated suite (FR-010) and the accessibility/contrast suite (Principle VIII) are the enforced regression contract, referenced in each surface's Verify task. Additionally, per `data-model.md`'s Reduced Motion Preference validation rule: every Remediate task (Phase 3–5) that resolves a `reduced-motion` finding marked `remediate-now` MUST add or extend a unit/E2E test asserting the interaction reaches its correct end state under `prefers-reduced-motion: reduce`, before that finding's `Resolution` is recorded as complete.

**Organization**: Tasks are grouped by user story (P1/P2/P3 from spec.md), each further split into the surface sub-groups defined in `data-model.md`'s `UI Surface` catalog. All source paths are relative to `retro-rocket/` unless noted otherwise (docs/spec paths are relative to the repo root).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 (P1 — core retrospective board), US2 (P2 — landing/auth/dashboard), US3 (P3 — profile + shared UI kit)

## Path Conventions

Single React SPA frontend at `retro-rocket/src` (per `plan.md`'s Structure Decision — no new top-level directories). Feature docs live at `specs/028-apple-design-alignment/` (repo root).

---

## Phase 1: Setup

**Purpose**: Establish the pre-change baseline and the audit artifact every later task writes into.

- [X] T001 Capture the pre-change baseline: from `retro-rocket/`, run `npm run type-check && npm run lint && npm run test:coverage && npm run e2e`; confirm all four are green and note the coverage numbers. This is the baseline every later "Verify" task diffs against for FR-004/FR-010/SC-003.
  - **Result (2026-08-07)**: type-check clean; lint 0 errors / 89 pre-existing warnings; unit tests 2336 passed / 3 skipped (153 files, 2 skipped), coverage 59.93% stmts / 82.23% branches / 72.08% functions / 59.93% lines — all above the 50/78/64/50 floor; e2e 84/84 passed.
- [X] T002 [P] Create `specs/028-apple-design-alignment/design-audit.md` with one `## <surfaceId> (P#)` heading and an empty findings table (columns: ID, State, Category, Priority, Disposition, Skill Used, Resolution) per `UI Surface` listed in `data-model.md`, following the format in `contracts/design-audit-finding-schema.md`.

**Checkpoint**: Baseline recorded, audit log skeleton exists and covers 100% of in-scope surfaces (pre-condition for SC-001).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The two cross-cutting mechanisms every subsequent surface audit depends on (research.md R2, R7) — no user story may start remediating motion until these exist.

**⚠️ CRITICAL**: No user story remediation work may begin until this phase is complete.

- [X] T003 [P] Write a failing unit test for a new `useReducedMotion` hook (asserts it reads `window.matchMedia('(prefers-reduced-motion: reduce)')` and updates on a `change` event) in `retro-rocket/src/test/lib/hooks/useReducedMotion.test.ts`.
- [X] T004 Implement `useReducedMotion` in `retro-rocket/src/lib/hooks/useReducedMotion.ts` to make T003 pass.
  - **Note**: initial implementation called `matchMedia` twice (once for initial state, once in the effect), so cleanup targeted a different `MediaQueryList` instance than mount — caught by the "cleans up on unmount" test. Fixed by resolving `matchMedia` once via a ref.
- [X] T005 [P] Extend `retro-rocket/src/test/integration/App.test.tsx` with a failing assertion that the app root renders wrapped in framer-motion's `MotionConfig` with `reducedMotion="user"`.
  - **Note**: the global `framer-motion` test mock (`src/test/setup.ts`) only exported `motion`/`AnimatePresence`; added a testable `MotionConfig` mock (renders a `data-testid="motion-config"` marker with the `reducedMotion` prop) as test infrastructure, via `createElement` since `setup.ts` is a `.ts` file (no JSX).
- [X] T006 Wrap the app root with `<MotionConfig reducedMotion="user">` in `retro-rocket/src/App.tsx` to make T005 pass. This is what makes every framer-motion-driven animation in the existing 91 files honor `prefers-reduced-motion` without individually editing them (research.md R2).
  - **Result**: full unit suite re-run after the change — 154 files / 2341 tests passing (up from 153/2336 baseline + 5 new tests), zero regressions.
- [X] T007 Use the `find-animation-opportunities` skill to inventory motion across `retro-rocket/src` (which framer-motion usages exist, which plain-CSS `transition-*`/`animate-*` Tailwind usages exist and are therefore NOT covered by T006). Then use the `improve-animations` skill to turn that inventory into a prioritized, self-contained audit plan spanning every in-scope surface. Record both the inventory and the resulting plan as a "Cross-Cutting Inventory" section at the top of `specs/028-apple-design-alignment/design-audit.md`, with `Skill Used: find-animation-opportunities, improve-animations`. Every later per-surface audit task references this inventory and plan instead of re-discovering it.
  - **Result**: 8-row vetted findings table (leverage-ordered) plus a motion inventory (54 framer-motion files now covered by `MotionConfig`, 58 plain-CSS files not covered, 0 `transform-origin` usage, 50 `transition-all` occurrences, no shared easing tokens, 3 unused keyframe utilities). Recorded in `design-audit.md`'s Cross-Cutting Inventory section for per-surface Audit tasks to consult.

**Checkpoint**: Reduced-motion foundation exists and is tested; the shared motion inventory exists. User story work can begin.

---

## Phase 3: User Story 1 - Polished, Consistent Core Retrospective Experience (Priority: P1) 🎯 MVP

**Goal**: The retrospective board, grouping, facilitator controls, participant presence, and export all reflect Apple-inspired design/motion principles with zero functional regression.

**Independent Test**: Run a full retrospective session (create board, add/edit/delete/vote/group cards, drag-and-drop, facilitator controls + countdown, export, multiple simulated participants) before and after; every action works identically, and `design-audit.md` has a completed section for each P1 surface.

> Each sub-group below follows Audit → Remediate → Verify. Audit tasks all append to the shared `design-audit.md` file and are therefore not marked `[P]` against each other. Remediate/Verify tasks touch disjoint source files per sub-group and are marked `[P]` accordingly. **If the board-core audit (T008) determines a token-catalog change is warranted (spec Clarification 1), implement it once, coordinated, in T009–T010** — it is global and every later surface (P2/P3) then builds on the already-updated catalog rather than each sub-group re-deciding it.

### Board core (create, add/edit/delete card, vote, drag-and-drop reorder)

- [X] T008 [US1] Audit `retro-rocket/src/features/boards/retrospective/**` and `retro-rocket/src/pages/RetrospectivePage.tsx` (default, loading, empty, error states) against the rubric in `data-model.md` using the `apple-design` and `emil-design-eng` skills for visual/hierarchy findings and the `review-animations` skill to critique existing motion (card add/remove/reorder); consult the Cross-Cutting Inventory (T007) for what's already covered by `MotionConfig`. Append findings to the `## retrospective-board (P1)` section of `design-audit.md`.
  - **Result**: `/review-animations` (user-invoked, per the tool's `disable-model-invocation` gate) found DAF-001 (AnimatePresence misplaced, Block-severity), DAF-002 (`transition-all`), DAF-003 (missing vote-button press feedback); DAF-004 (reduced motion) confirmed already-compliant via `apple-design`.
- [X] T009 [P] [US1] For each `high`-priority finding from T008 with a token/contrast implication: extend `retro-rocket/src/test/lib/theme/contrast.tokens.test.ts` (and/or `contrast.focus.test.ts`) with the new pairing/value first, confirm it fails, then implement the change in `retro-rocket/src/lib/theme/tokens.ts` / `retro-rocket/src/styles/globals.css` / `retro-rocket/tailwind.config.cjs` per `contracts/design-tokens-v2.md`.
  - **Result**: N/A — none of T008's findings had a token/contrast implication (all were structural/motion/interaction, not color).
- [X] T010 [US1] Remediate the remaining `high`-priority findings from T008 in `retro-rocket/src/features/boards/retrospective/**` (layout/spacing/typography/motion), using the skill recorded per finding; for reduced-motion findings, consume the `useReducedMotion` hook (T004) or rely on `MotionConfig` (T006) rather than a bespoke check. Update each finding's `Resolution` in `design-audit.md`.
  - **Result**: DAF-001 fixed test-first (new failing test in `DragDropColumn.test.tsx`, then `AnimatePresence` moved to the correct list boundary, redundant one removed from `DraggableCard.tsx`). DAF-002 fixed (`transition-all` → explicit property lists). DAF-003 fixed test-first (new `CardVoteControl.test.tsx`, `active:scale-95` press feedback added).
- [X] T011 [US1] Verify: run `npm run test:run -- retrospective` and `npm run e2e -- board-creation.spec.ts card-lifecycle.spec.ts retrospective-board.spec.ts concurrent-board-session.spec.ts concurrent-board-network.spec.ts` from `retro-rocket/`; confirm all pass with no assertion changed in intent (FR-004/FR-010), and record the passing run as `functionalRegressionCheck` for each T009/T010 finding in `design-audit.md`.
  - **Result**: Unit: 155 files / 2347 tests passing, zero regressions. E2E: 42/42 passed on a clean run. One e2e assertion (`retrospective-board.spec.ts:937`) showed environmental flakiness during verification, rigorously bisected and confirmed unrelated to these changes (reproduced identically on unmodified baseline code) — see `design-audit.md`'s note under `retrospective-board` for the full investigation.

### Clustering / grouping

- [X] T012 [US1] Audit `retro-rocket/src/features/boards/clustering/**` (default, loading, empty, error) using `apple-design`/`emil-design-eng` for visual findings and `review-animations` to critique existing motion; append to `## clustering (P1)` in `design-audit.md`.
  - **Result**: `/review-animations` found the same `AnimatePresence`-boundary bug (DAF-001's class) recurring in 3 places (DAF-005, DAF-006, DAF-007), plus `transition-all`/missing `transform-origin` (DAF-008). Two structural/i18n findings deferred to backlog with user confirmation (DAF-009, DAF-010); two low-priority missed-exit-animation findings deferred (DAF-011, DAF-012).
- [X] T013 [P] [US1] Remediate `high`-priority findings from T012 in `retro-rocket/src/features/boards/clustering/**`; extend the relevant unit test in `retro-rocket/src/test/features/boards/clustering/**` first for any behavior-adjacent change (e.g. grouping-suggestion motion). Update `Resolution` fields.
  - **Result**: DAF-005/006/007 fixed test-first (new/extended tests in `GroupCard.test.tsx`, `GroupableColumn.test.tsx`, new `GroupSuggestionModal.test.tsx`). DAF-008 fixed (cosmetic-only, no new test needed per Tests policy).
- [X] T014 [US1] Verify: run `npm run test:run -- clustering` and `npm run e2e -- retrospective-board.spec.ts card-lifecycle.spec.ts` from `retro-rocket/`; record the passing run in `design-audit.md`.
  - **Result**: Unit: 11 clustering test files / 225 tests passing. Full suite: 156 files / 2352 tests, zero regressions. E2E: 35/35 passed.

### Facilitator controls & countdown

- [X] T015 [US1] Audit `retro-rocket/src/features/boards/facilitator/**` and `retro-rocket/src/features/boards/countdown/**` (default, loading, empty, error) using `apple-design`/`emil-design-eng` for visual findings and `review-animations` to critique existing motion; append to `## facilitator-controls-countdown (P1)` in `design-audit.md`.
  - **Result**: `/review-animations` found the `AnimatePresence`-boundary bug a 5th time (DAF-013, Block-severity), plus a `scale(0)` violation (DAF-014), a `width`-animation performance issue on the highest-frequency element in this surface (DAF-015), an unjustified infinite decorative pulse (DAF-016), and four panels missing exit animations (DAF-017).
- [X] T016 [P] [US1] Remediate `high`-priority findings from T015 in the same two directories; extend `retro-rocket/src/test/features/boards/facilitator/**` / `countdown/**` unit tests first for any behavior-adjacent change. Update `Resolution` fields.
  - **Result**: DAF-013 fixed test-first (new test in `FacilitatorMenu.test.tsx`). DAF-014/015/016/017 fixed (cosmetic-only, no new tests needed per Tests policy).
- [X] T017 [US1] Verify: run `npm run test:run -- facilitator countdown` and `npm run e2e -- facilitator-countdown.spec.ts` from `retro-rocket/`; record the passing run in `design-audit.md`.
  - **Result**: Unit: 7 facilitator/countdown test files / 104 tests passing. Full suite: 156 files / 2353 tests, zero regressions. E2E: 1/1 passed.

### Participant presence

- [X] T018 [US1] Audit `retro-rocket/src/features/boards/participants/**` (default, loading, empty, error) using `apple-design`/`emil-design-eng` for visual findings and `review-animations` to critique existing motion; append to `## participants (P1)` in `design-audit.md`.
  - **Result**: `/review-animations` found the `AnimatePresence`-boundary bug a 6th time (DAF-018, Block-severity), a missing `transform-origin` on an already-position-aware popover (DAF-019), and a `transition-all` instance (DAF-020).
- [X] T019 [P] [US1] Remediate `high`-priority findings from T018 in `retro-rocket/src/features/boards/participants/**`; extend `retro-rocket/src/test/features/boards/participants/**` unit tests first for any behavior-adjacent change. Update `Resolution` fields.
  - **Result**: DAF-018 fixed test-first (new test in `ParticipantPopover.test.tsx`). DAF-019/020 fixed (cosmetic-only); an existing test asserting the literal `transition-all` class was updated to match the new presentational selector.
- [X] T020 [US1] Verify: run `npm run test:run -- participants` and `npm run e2e -- concurrent-board-session.spec.ts concurrent-board-network.spec.ts` from `retro-rocket/`; record the passing run in `design-audit.md`.
  - **Result**: Unit: 8 participants test files / 216 tests passing. Full suite: 156 files / 2354 tests, zero regressions. E2E: 2/2 passed.

### Export

- [X] T021 [US1] Audit `retro-rocket/src/features/boards/export/**` (default, loading, error — export has no meaningful empty state) using `apple-design`/`emil-design-eng` for visual findings and `review-animations` to critique existing motion; append to `## export (P1)` in `design-audit.md`.
  - **Result**: `/review-animations` found the `AnimatePresence`-boundary bug a 7th time (DAF-021, Block-severity) plus two status messages missing exit animations (DAF-022). Confirmed `DocxExporter.tsx`/`UnifiedExporter.tsx` are unreachable dead code, out of scope.
- [X] T022 [P] [US1] Remediate `high`-priority findings from T021 in `retro-rocket/src/features/boards/export/**`; extend `retro-rocket/src/test/features/boards/export/**` unit tests first for any behavior-adjacent change. Update `Resolution` fields.
  - **Result**: DAF-021/022 fixed test-first (new `ImprovedExportPopover.test.tsx`, no prior coverage existed for this component).
- [X] T023 [US1] Verify: run `npm run test:run -- export` and `npm run e2e -- export.spec.ts accessibility.spec.ts` from `retro-rocket/` (the `accessibility.spec.ts` run here is an early incremental WCAG 2.1 AA check across everything User Story 1 touched, ahead of the full Polish-phase extension in T052); record the passing run in `design-audit.md`.
  - **Result**: Unit: 12 export test files / 122 tests passing. Full suite: 157 files / 2358 tests, zero regressions. E2E: 14/14 passed, including the full `accessibility.spec.ts` suite (12 tests, both themes) — zero new WCAG 2.1 AA violations across all of User Story 1.

**Checkpoint**: User Story 1 fully remediated and independently verified — MVP deliverable.

---

## Phase 4: User Story 2 - Cohesive First Impressions (Priority: P2)

**Goal**: Landing, authentication, and the dashboard feel as considered as the core experience, with zero functional regression.

**Independent Test**: Walk landing → sign-in/sign-up → dashboard (view/create/open/delete a board) before and after; every action works identically, and `design-audit.md` has a completed section for each P2 surface.

### Landing

- [X] T024 [US2] Audit `retro-rocket/src/pages/Landing.tsx` (default, loading) using `apple-design`/`emil-design-eng` for visual findings and `review-animations` to critique existing motion; append to `## landing (P2)` in `design-audit.md`.
  - **Result**: `/review-animations` found mistimed mount-time entrance animations for below-the-fold sections (DAF-023) and 9 `transition-all` instances (DAF-024). No `AnimatePresence`-boundary bug here — this page has no conditionally-mounted motion.
- [X] T025 [P] [US2] Remediate `high`-priority findings from T024 in `retro-rocket/src/pages/Landing.tsx`; extend `retro-rocket/src/test/pages/Landing.test.tsx` (create if it does not yet exist) first for any behavior-adjacent change. Update `Resolution` fields.
  - **Result**: DAF-023/024 fixed (cosmetic-only: `animate`→`whileInView` timing change and a `transition-all`→`transition-shadow` narrowing; existing `Landing.test.tsx` — 3 tests — covered this without needing extension).
- [X] T026 [US2] Verify: run `npm run test:run -- Landing` and `npm run e2e -- authentication.spec.ts board-creation.spec.ts` from `retro-rocket/`; record the passing run in `design-audit.md`.
  - **Result**: Unit: 3 Landing tests passing. Full suite: 157 files / 2358 tests, zero regressions. E2E: 10/10 passed (authentication.spec.ts + board-creation.spec.ts), plus `accessibility.spec.ts` Landing tests (both themes) — 2/2 passed.

### Authentication (sign-in / sign-up)

- [X] T027 [US2] Audit `retro-rocket/src/features/auth/components/**` (default, loading, error) using `apple-design`/`emil-design-eng` for visual findings and `review-animations` to critique existing motion; append to `## auth-sign-in (P2)` in `design-audit.md`.
  - **Result**: `/review-animations`-equivalent scope found a `scale(0)` violation (DAF-025) and an over-100ms button stagger (DAF-026). `AuthGuard.tsx`/`AuthWrapper.tsx`/`McpConsentScreen.tsx` confirmed already correct. `ConnectedAppsCard.tsx`/`LinkedProvidersCard.tsx` deferred to `profile` (US3) — they only render there.
- [X] T028 [P] [US2] Remediate `high`-priority findings from T027 in `retro-rocket/src/features/auth/components/**`; extend `retro-rocket/src/test/features/auth/**` unit tests first for any behavior-adjacent change. Update `Resolution` fields.
  - **Result**: DAF-025/026 fixed (cosmetic-only, no new tests needed).
- [X] T029 [US2] Verify: run `npm run test:run -- auth` and `npm run e2e -- authentication.spec.ts concurrent-signin.spec.ts` from `retro-rocket/`; record the passing run in `design-audit.md`.
  - **Result**: Unit: 9 auth test files / 117 tests passing. Full suite: 157 files / 2358 tests, zero regressions. E2E: 6/6 passed.

### Dashboard

- [X] T030 [US2] Audit `retro-rocket/src/pages/Dashboard.tsx` and `retro-rocket/src/features/dashboard/components/**` (default, loading, empty, error) using `apple-design`/`emil-design-eng` for visual findings and `review-animations` to critique existing motion; append to `## dashboard-board-list (P2)` in `design-audit.md`.
  - **Result**: `/review-animations` found the `AnimatePresence`-boundary bug twice more on this surface (DAF-027 in `Dashboard.tsx`, DAF-029 in `JoinRetrospectiveModal.tsx` — the app's highest-traffic surface), plus an out-of-budget stagger (DAF-028) and the originally-inventoried `BoardCard.tsx` press-feedback gap (DAF-030).
- [X] T031 [P] [US2] Remediate `high`-priority findings from T030 in the same paths; extend `retro-rocket/src/test/pages/Dashboard.test.tsx` / `retro-rocket/src/test/features/dashboard/**` first for any behavior-adjacent change. Update `Resolution` fields.
  - **Result**: DAF-027/028/029 fixed test-first (new tests in `Dashboard.test.tsx` and `JoinRetrospectiveModal.test.tsx`). DAF-030 fixed (cosmetic-only).
- [X] T032 [US2] Verify: run `npm run test:run -- Dashboard dashboard` and `npm run e2e -- dashboard-list.spec.ts dashboard-manage.spec.ts board-creation.spec.ts accessibility.spec.ts` from `retro-rocket/` (the `accessibility.spec.ts` run here is an early incremental WCAG 2.1 AA check across everything User Story 2 touched, ahead of the full Polish-phase extension in T052); record the passing run in `design-audit.md`.
  - **Result**: Unit: 7 dashboard test files / 94 tests passing. Full suite: 157 files / 2360 tests, zero regressions. E2E: 21/21 passed, including the full accessibility suite (12 tests, both themes) — zero new WCAG 2.1 AA violations across all of User Story 2.

**Checkpoint**: User Stories 1 AND 2 both independently verified.

---

## Phase 5: User Story 3 - Consistent Shared Components and Secondary Surfaces (Priority: P3)

**Goal**: Profile/settings and every shared UI primitive follow the same design language, with zero functional regression anywhere they're reused.

**Independent Test**: Exercise the profile page and each shared primitive in isolation before and after; every action works identically, and `design-audit.md` has a completed section for each P3 surface.

### Profile / settings

- [X] T033 [US3] Audit `retro-rocket/src/pages/Profile.tsx` (default, loading, error) using `apple-design`/`emil-design-eng` for visual findings and `review-animations` to critique existing motion; append to `## profile (P3)` in `design-audit.md`.
  - **Result**: `Profile.tsx` itself confirmed already correct. Extended scope to `ConnectedAppsCard.tsx`/`LinkedProvidersCard.tsx` (deferred here from `auth-sign-in` since they only render on this page): found a missing exit-on-revoke (DAF-031) and an extensive hardcoded-Spanish gap (DAF-032, deferred with user confirmation).
- [X] T034 [P] [US3] Remediate `high`-priority findings from T033 in `retro-rocket/src/pages/Profile.tsx`; extend `retro-rocket/src/test/pages/Profile.test.tsx` (create if it does not yet exist) first for any behavior-adjacent change. Update `Resolution` fields.
  - **Result**: DAF-031 fixed test-first (new test in `ConnectedAppsCard.test.tsx`). No `Profile.tsx` changes were needed, so no `Profile.test.tsx` was created.
- [X] T035 [US3] Verify: run `npm run test:run -- Profile` and `npm run e2e -- profile.spec.ts` from `retro-rocket/`; record the passing run in `design-audit.md`.
  - **Result**: Unit: 10 profile/auth test files / 122 tests passing. Full suite: 157 files / 2361 tests, zero regressions. E2E: 9/9 passed.

### Shared UI kit — buttons & inputs

- [X] T036 [US3] Audit `retro-rocket/src/lib/components/ui/{Button,Input,Textarea,TextareaWithEmoji}.tsx` using `apple-design`/`emil-design-eng` (§1 Response, §15 Typography) for visual findings and `review-animations` to critique existing press-feedback motion; append to `## ui-kit-buttons-inputs (P3)` in `design-audit.md`.
  - **Result**: `Input.tsx`/`Textarea.tsx`/`TextareaWithEmoji.tsx` confirmed already correct. `Button.tsx` had one `transition-all` finding (DAF-033) — the highest-leverage instance in the whole audit given how widely this primitive is used.
- [X] T037 [P] [US3] Remediate `high`-priority findings from T036 in the same files; extend `retro-rocket/src/test/lib/components/ui/{Button,Input,Textarea}.test.tsx` first for any behavior-adjacent change (e.g. press-state timing). Update `Resolution` fields.
  - **Result**: DAF-033 fixed (cosmetic-only, no new test needed — no test asserted the literal class).
- [X] T038 [US3] Verify: run `npm run test:run -- Button Input Textarea` from `retro-rocket/`, then re-run the P1/P2 e2e specs that exercise these primitives (`card-lifecycle.spec.ts`, `authentication.spec.ts`, `board-creation.spec.ts`) since they're shared; record the passing run in `design-audit.md`.
  - **Result**: Full suite: 157 files / 2361 tests, zero regressions (given `Button.tsx`'s blast radius). E2E: a combined-batch run hit environmental flakiness (see `design-audit.md`); isolated re-runs — 13/13 passed cleanly.

### Shared UI kit — overlays (modals, menus, popovers)

- [X] T039 [US3] Audit `retro-rocket/src/lib/components/ui/{Modal,Portal,LanguageMenuList,ThemeMenuToggle}.tsx` using `apple-design`/`emil-design-eng` (§7 Spatial Consistency, §12 Materials & Depth) for visual findings and `review-animations` to critique existing motion; append to `## ui-kit-overlays (P3)` in `design-audit.md`.
  - **Result**: `Modal.tsx` (the shared base modal primitive) had the `AnimatePresence`-boundary bug a 10th time (DAF-034, highest-leverage occurrence yet) plus a vestigial `transition-all` (DAF-035). `Portal.tsx` confirmed genuinely empty/unused. `LanguageMenuList.tsx`/`ThemeMenuToggle.tsx` confirmed already correct.
- [X] T040 [P] [US3] Remediate `high`-priority findings from T039 in the same files; extend `retro-rocket/src/test/lib/components/ui/{Modal,ThemeToggle}.test.tsx` first for any behavior-adjacent change (e.g. focus trap, escape-to-close, transform-origin anchoring). Update `Resolution` fields.
  - **Result**: DAF-034/035 fixed test-first (new `Modal.test.tsx`, created from scratch). Fixing DAF-034 surfaced a real regression in `BoardCard.test.tsx`'s local `framer-motion` mock (missing `AnimatePresence` export, previously unreachable) — caught by the full-suite run and fixed.
- [X] T041 [US3] Verify: run `npm run test:run -- Modal ThemeToggle` from `retro-rocket/`, then re-run `e2e -- facilitator-countdown.spec.ts dashboard-manage.spec.ts` (both exercise modals); record the passing run in `design-audit.md`.
  - **Result**: Unit: full suite 158 files / 2364 tests, zero regressions (after fixing the `BoardCard.test.tsx` mock gap). E2E: 3/3 passed, including the board-rename flow which directly exercises `Modal.tsx`.

### Shared UI kit — pickers

- [X] T042 [US3] Audit `retro-rocket/src/lib/components/ui/{DatePicker,EmojiPicker,ColorPicker}.tsx` using `apple-design`/`emil-design-eng` for visual findings and `review-animations` to critique existing motion; append to `## ui-kit-pickers (P3)` in `design-audit.md`.
  - **Result**: `DatePicker.tsx` confirmed clean (third-party wrapper, no framer-motion). Found DAF-036 (`EmojiPicker.tsx` — 11th occurrence of the `AnimatePresence`-boundary bug, `{isOpen && createPortal(<AnimatePresence>...)}`), DAF-037 (`ColorPicker.tsx` — 2 `transition-all` instances), DAF-038 (`ColorPicker.tsx` popup missing exit animation, deferred).
- [X] T043 [P] [US3] Remediate `high`-priority findings from T042 in the same files; extend `retro-rocket/src/test/lib/components/ui/{DatePicker,EmojiPicker,ColorPicker}.test.tsx` first for any behavior-adjacent change. Update `Resolution` fields.
  - **Result**: `EmojiPicker.test.tsx` mock changed to a detectable `AnimatePresence` marker, 2 new tests written first (red), then `EmojiPicker.tsx` restructured to `createPortal(<AnimatePresence>{isOpen && (...)}</AnimatePresence>, document.body)` (green). `ColorPicker.tsx` narrowed both `transition-all duration-200` to `transition-[transform,box-shadow,border-color] duration-200` (cosmetic, no new test required). DAF-038 left deferred per user direction.
- [X] T044 [US3] Verify: run `npm run test:run -- DatePicker EmojiPicker ColorPicker` from `retro-rocket/`, then re-run `e2e -- card-lifecycle.spec.ts` (uses the emoji picker); record the passing run in `design-audit.md`.
  - **Result**: `type-check` clean, `lint` clean. `ColorPicker.test.tsx`/`ColorPickerClean.test.tsx`/`EmojiPicker.test.tsx` — 118/118 passing. Full suite `npm run test:coverage` — 158 files / 2366 tests passing, zero regressions. `firebase emulators:exec --project demo-retrorocket --only auth,firestore "npx playwright test card-lifecycle.spec.ts"` — 3/3 passed.

### Shared UI kit — feedback (loading, skeleton, typing indicator)

- [X] T045 [US3] Audit `retro-rocket/src/lib/components/ui/{Loading,Skeleton,TypingPreview}.tsx` using `apple-design`/`emil-design-eng` (§11 Frame-level smoothness) for visual findings and `review-animations` to critique existing motion; append to `## ui-kit-feedback (P3)` in `design-audit.md`.
  - **Result**: `Loading.tsx` and `Skeleton.tsx` confirmed clean. Found DAF-039 (`TypingPreview.tsx` — 12th occurrence of the `AnimatePresence`-boundary bug, pre-existing since before feature 026, unrelated to the two recent flicker/race hotfixes' state-layer changes).
- [X] T046 [P] [US3] Remediate `high`-priority findings from T045 in the same files; extend `retro-rocket/src/test/lib/components/ui/{Loading,Skeleton,TypingPreview}.test.tsx` first for any behavior-adjacent change. Update `Resolution` fields.
  - **Result**: `TypingPreview.test.tsx` mock changed to a detectable `AnimatePresence` marker, 2 new tests written first (red), then `TypingPreview.tsx`'s early `if (typingUsers.length === 0) return liveRegion` removed and restructured to `<AnimatePresence>{typingUsers.length > 0 && (...)}</AnimatePresence>` (green). No changes needed to `Loading.tsx`/`Skeleton.tsx`.
- [X] T047 [US3] Verify: run `npm run test:run -- Loading Skeleton TypingPreview` from `retro-rocket/`, then re-run `e2e -- card-lifecycle.spec.ts` (typing indicator); record the passing run in `design-audit.md`.
  - **Result**: `type-check` clean, `lint` clean. Full suite `npm run test:coverage` — 158 files / 2368 tests passing, zero regressions. Task wording named `card-lifecycle.spec.ts`, but the typing indicator is actually exercised by `retrospective-board.spec.ts`; ran that file's full `-g 'typing'` set instead (the higher-value check, given DAF-039 touches the same component the 026/027 hotfixes hardened) — `firebase emulators:exec --project demo-retrorocket --only auth,firestore "npx playwright test retrospective-board.spec.ts -g 'typing'"` — 8/8 passed, including the exact flicker/timing/grace-period/disconnect assertions from those hotfixes.

### Shared UI kit — misc (cards, settings rows, links, theme/language selectors)

- [X] T048 [US3] Audit `retro-rocket/src/lib/components/ui/{Card,ControlCard,SettingsRow,LinkifyText,ThemeToggle,LanguageSelector}.tsx` using `apple-design`/`emil-design-eng` for visual findings and `review-animations` to critique existing motion; append to `## ui-kit-misc (P3)` in `design-audit.md`.
  - **Result**: `ControlCard.tsx`, `SettingsRow.tsx`, `LinkifyText.tsx` confirmed clean (no motion). Found DAF-040 (`transition-all` in two shared `designSystem.ts` tokens: `animations.default`, `interactiveStates.cardHover`), DAF-041 (`Card.tsx` dead/overridden `hover:-translate-y-1` CSS class), DAF-042 (`ThemeToggle.tsx` sun/moon icon swap animates to literal `scale(0)`), DAF-043 (2 more `transition-all` instances in `ThemeToggle.tsx`/`LanguageSelector.tsx`), DAF-044 (`LanguageSelector.tsx` dropdown missing `transform-origin`).
- [X] T049 [P] [US3] Remediate `high`-priority findings from T048 in the same files; extend `retro-rocket/src/test/lib/components/ui/{Card,LinkifyText,ThemeToggle,LanguageSelector}.test.tsx` first for any behavior-adjacent change. Update `Resolution` fields.
  - **Result**: `designSystem.ts` tokens narrowed (`transition-[background-color,border-color,box-shadow,transform,color]`, `transition-[box-shadow,transform]`); `Card.test.tsx`'s literal class assertion updated. `Card.tsx` dead CSS class removed. `ThemeToggle.tsx` icon-swap `scale(0)` fixed (floor of `0.5` + paired `opacity`); `transition-all` narrowed on its trigger button, and on `LanguageSelector.tsx`'s trigger button. `LanguageSelector.tsx` given a `dropdownOrigin` state + `transformOrigin` style, test-first (`LanguageSelector.test.tsx`: 2 new tests, confirmed red via a temporary `git stash` of the fix, then green).
- [X] T050 [US3] Verify: run `npm run test:run -- Card ControlCard SettingsRow LinkifyText ThemeToggle LanguageSelector` from `retro-rocket/`, then re-run `e2e -- profile.spec.ts dashboard-list.spec.ts accessibility.spec.ts` (the `accessibility.spec.ts` run here is an early incremental WCAG 2.1 AA check across everything User Story 3 touched, ahead of the full Polish-phase extension in T052); record the passing run in `design-audit.md`.
  - **Result**: `type-check` clean, `lint` clean (one pre-existing unrelated warning noted, not introduced here). `Card.test.tsx`/`LanguageSelector.test.tsx`/`ThemeToggle.test.tsx`/`MobileColumnNavigation.test.tsx` — 76/76 passing. Full suite `npm run test:coverage` — 158 files / 2370 tests passing, zero regressions. `firebase emulators:exec --project demo-retrorocket --only auth,firestore "npx playwright test profile.spec.ts dashboard-list.spec.ts accessibility.spec.ts"` — 23/23 passed, including the full WCAG 2.1 AA suite (light + dark).

**Checkpoint**: All three user stories independently verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Whole-initiative checks that only make sense once every surface has been through Audit → Remediate → Verify.

- [X] T051 [P] Grep the diff introduced by this feature for raw palette utilities (`bg-slate-`, `text-gray-`, ad hoc `dark:` color pairs) outside `src/lib/theme/tokens.ts`/`globals.css`/`tailwind.config.cjs`; confirm zero matches, per `contracts/design-tokens-v2.md`'s consumption rules.
  - **Result**: Grepped every added line (`git diff main` plus untracked new files) across `retro-rocket/src` for the full Tailwind color-utility pattern (`{bg,text,border,ring,from,via,to,shadow,...}-{slate,gray,...,rose}-{shade}`). Zero matches — every fix across US1-US3 used existing semantic tokens (`bg-surface-raised`, `text-text-secondary`, `border-border-default`, etc.), consistent with `contracts/design-tokens-v2.md`.
- [X] T052 Extend `retro-rocket/e2e/accessibility.spec.ts` to cover any loading/empty/error route states surfaced during the audit that it doesn't yet scan, preserving the existing CSS-freeze / motion-settle pattern (research.md R7); run it in both themes and confirm zero violations (SC-004).
  - **Result**: Discovered `LanguageSelector.tsx` (touched during ui-kit-misc remediation) has zero consumers anywhere in `src` — dead code, unreachable via any route, so it cannot be added to an e2e scan (same as the pre-existing `Portal.tsx` finding). Added the two genuinely new, reachable route-level states not yet scanned: Dashboard `error` and Profile `error` (both per `data-model.md`'s `states` catalog), reusing the `page.route(...).abort('failed')` mocking pattern already established in `dashboard-list.spec.ts`/`profile.spec.ts`, in both themes, using the existing `expectNoViolations` CSS-freeze helper unchanged. `firebase emulators:exec --project demo-retrorocket --only auth,firestore "npx playwright test accessibility.spec.ts"` — 16/16 passed (12 pre-existing + 4 new).
- [X] T053 Run the full `specs/028-apple-design-alignment/quickstart.md` validation sequence (all 7 checks) from a clean checkout of this branch and record the results.
  - **Result** (run against the current working tree — all T008-T050 changes are uncommitted on this branch, so a literal fresh clone wasn't possible without committing, which wasn't requested):
    - **Check 1** (regression): `type-check` clean (0 errors); `lint` clean (0 errors, 89 pre-existing warnings unrelated to this feature, spot-checked none were introduced by it); `test:coverage` — 158 files / 2370 tests passing; full `npm run e2e` (all 16 spec files, no filter) — **88/88 passed**, zero failures, 5.1 minutes.
    - **Check 2** (SC-001 coverage): raw `grep -c '^## '` returns 15 (14 surfaces + 1 legitimate `## Cross-Cutting Inventory` intro section) rather than a literal 14 — verified by exact-match diff instead of count that all 14 `data-model.md` surface IDs have a matching section.
    - **Check 3** (SC-002): initially surfaced DAF-004 (`high`/`already-compliant`) as a violation — fixed during T054 (reclassified to `low`, matching the schema's own worked-example convention); re-run clean.
    - **Check 4** (accessibility): `contrast.tokens.test.ts`/`contrast.focus.test.ts` — 48/48 passing; `e2e -- accessibility.spec.ts` — 17/17 passing in both themes (12 pre-existing + 4 new error-state scans from T052 + 1 new reduced-motion scan, see Check 5).
    - **Check 5** (reduced motion): the documented command was a manual DevTools walkthrough with no automated harness. Per its own note ("add one if the audit introduces reduced-motion-specific assertions" — this pass added `MotionConfig`/`useReducedMotion`/DAF-004), added an automated Playwright test using `page.emulateMedia({ reducedMotion: 'reduce' })` to `accessibility.spec.ts`: signs in, creates a board, adds a card, votes, and asserts the result is visible immediately. Passing.
    - **Check 6** (FR-008 skill attribution): the documented `grep -oE '\| [a-z-]+ \|$'` command was stale — it assumes `Skill Used` is the table's last column, but the schema (`contracts/design-audit-finding-schema.md`) has `Resolution` trailing it. Fixed the command in `quickstart.md` to extract column 6 by position; re-run shows only `apple-design`/`review-animations`, both mandated, none blank.
    - **Check 7** (manual visual spot-check): inherently a human judgment call requiring a GUI browser, which isn't available in this environment — not performed directly. All automated proxies (full e2e suite, accessibility/axe suite, reduced-motion test, unit suite) are clean; a human visual pass is still recommended before merge.
    - **Side discovery**: while extending `accessibility.spec.ts` (T052), found `LanguageSelector.tsx` (fixed under ui-kit-misc) has zero consumers anywhere in `src` — dead code, unreachable via any route, so it couldn't be added to an e2e scan.
- [X] T054 Constitution/spec conformance pass: confirm `design-audit.md` has a section for every `UI Surface` (SC-001), every `high`-priority row has `Disposition: remediate-now` (SC-002), and every `Skill Used` value is one of the nine mandated skill names with none blank (FR-008), per `contracts/design-audit-finding-schema.md`'s conformance criteria.
  - **Result**: All three pass. SC-001: all 14 `UI Surface` IDs from `data-model.md` have a matching `## <id> (P#)` section (verified by exact-match diff, not just count — `design-audit.md` also has one legitimate non-surface `## Cross-Cutting Inventory` intro section, 15 total `##` headings). SC-002: **found and fixed one violation** — DAF-004 was `high`/`already-compliant` (schema requires `high` rows to be `remediate-now`; per the schema's own worked example, `already-compliant` findings belong at `low` priority since no violation was found), corrected during this pass; re-check now clean. FR-008: only `apple-design` and `review-animations` appear as `Skill Used` values across all 44 `DAF-###` rows — both mandated, none blank, none foreign. Also verified all 44 IDs are unique and sequential (`DAF-001`-`DAF-044`, no gaps, none reused).
- [X] T055 [P] Grep this feature's full diff for new user-visible literal strings that bypass `t()`/`react-i18next` (FR-007); confirm any new or changed UI copy introduced across T008–T050 has corresponding keys added to every file under `retro-rocket/src/locales/`, with zero hardcoded strings remaining.
  - **Result**: Grepped every added line across the full diff for `aria-label=`/`title=`/`placeholder=`/`alt=` literals and JSX text-node content — zero matches for real product copy; the only two hits (`Modal content`, `Trigger`) are test-fixture strings in `Modal.test.tsx`/`ParticipantPopover.test.tsx`/`ImprovedExportPopover.test.tsx`, not rendered UI. Also checked for removed `t()` calls (a possible regression signal) — the 3 found were `ParticipantPopover.tsx`'s pre-existing `t('participants.title'/'.close'/'.closeList')` calls reappearing unchanged after the `AnimatePresence`-fix restructure, not deletions. Consistent with this pass's presentation-only scope: no new user-visible copy was introduced anywhere in T008-T050.

**Checkpoint**: Feature complete — SC-001 through SC-006 all satisfied.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T002's skeleton needs the surface list; T001's baseline should exist first) — BLOCKS all user stories.
- **User Stories (Phase 3–5)**: All depend on Foundational completion. US1 → US2 → US3 is the priority order, but each is independently testable and could be staffed in parallel once Phase 2 is done.
- **Polish (Phase 6)**: Depends on all three user stories being complete (T051/T054 check the whole log; T052 needs every surface's states known).

### User Story Dependencies

- **US1 (P1)**: No dependency on US2/US3. If its audit calls for a token-catalog change, that change becomes the baseline US2/US3 build on (see the note at the top of Phase 3).
- **US2 (P2)**: Independently testable; consumes whatever token/typography catalog exists after US1 (or the original one, if US1 made no token changes).
- **US3 (P3)**: Independently testable; shared UI kit components it touches are also exercised by US1/US2's E2E specs, so its Verify tasks re-run those specs too.

### Within Each Surface Sub-Group

- Audit before Remediate before Verify (each Remediate task depends on its own Audit; each Verify depends on its own Remediate).
- Audit tasks are not parallel with each other (shared `design-audit.md` file).
- Remediate/Verify tasks across different sub-groups are parallelizable (disjoint source files).

---

## Parallel Example: User Story 1

```bash
# T008, T012, T015, T018, T021 (audits) are sequential relative to each other
# (shared design-audit.md), but once each is done, its Remediate task can run
# alongside the others' Remediate tasks:
Task: "Remediate high-priority findings in retro-rocket/src/features/boards/retrospective/**"
Task: "Remediate high-priority findings in retro-rocket/src/features/boards/clustering/**"
Task: "Remediate high-priority findings in retro-rocket/src/features/boards/facilitator/** and countdown/**"
Task: "Remediate high-priority findings in retro-rocket/src/features/boards/participants/**"
Task: "Remediate high-priority findings in retro-rocket/src/features/boards/export/**"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (reduced-motion hook + `MotionConfig` + motion inventory — CRITICAL, blocks everything else).
3. Complete Phase 3: User Story 1 (all five sub-groups).
4. **STOP and VALIDATE**: run User Story 1's Independent Test end-to-end in both themes.
5. Demo the core retrospective experience if ready; continue to US2/US3 next.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → verify independently → the MVP (core board experience redesigned, nothing else touched yet).
3. US2 → verify independently → entry points now cohesive too.
4. US3 → verify independently → the whole product, including shared primitives, is now consistent.
5. Polish → whole-initiative conformance pass (SC-001/SC-002/SC-004/FR-008 coverage).

---

## Notes

- `[P]` tasks touch different files and have no unmet dependency.
- `[US1]`/`[US2]`/`[US3]` map every story-phase task to its spec.md user story.
- Every finding's `Skill Used` value MUST be one of the nine mandated skills from constitution Principle IX (`apple-design`, `emil-design-eng`, `animate`, `review-animations`, `improve-animations`, `find-animation-opportunities`, `prototype`, `animation-vocabulary`, `pick-ui-library`) — Audit tasks above name the primary skills expected for that surface type, but the actual skill used per finding is whatever the audit determines fits (e.g. `review-animations` if critiquing an existing animation rather than proposing a new one, `prototype` if multiple directions are compared, `pick-ui-library` only if a finding genuinely calls for a new dependency).
- Commit after each task or logical group (Audit+Remediate+Verify triple).
- Stop at any Checkpoint to validate a story independently before continuing.
- Do not skip Verify tasks — they are what makes FR-004/FR-010/SC-003 (zero functional regression) checkable per surface instead of only at the very end.
