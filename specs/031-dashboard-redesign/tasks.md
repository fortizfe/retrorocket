---

description: "Task list template for feature implementation"
---

# Tasks: Mis Tableros (Dashboard) Redesign (Apple HIG-Inspired)

**Input**: Design documents from `/specs/031-dashboard-redesign/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Tests are included for behavior at real regression risk — search/
filter/sort correctness, the three corrected defects (reachability at scale,
keyboard/touch action affordances, locale-correct dates), and the preserved
create/join/rename/delete flows — per constitution Principle I (TDD,
NON-NEGOTIABLE). Pure visual/motion restyling with no pre-existing behavior
to protect follows the precedent features 028/029 established (no new test
required for cosmetic-only change); every such task below says so
explicitly.

**Organization**: Tasks are grouped by user story (spec.md's US1-US4) to
enable independent implementation and testing of each. A Foundational phase
precedes all of them because FR-021 requires exploring and selecting one of
2-3 visual directions — and building the two new shared utilities (locale-
aware date formatting, memoized list-query derivation) every story's
components depend on — before any story-specific rebuild can proceed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- File paths are relative to `retro-rocket/` unless otherwise noted

## Path Conventions

Single existing React SPA frontend project — all paths are under
`retro-rocket/src/` (or `retro-rocket/e2e/` for Playwright specs), per
`plan.md`'s Project Structure. No backend/API paths are touched.

---

## Phase 1: Setup

**Purpose**: Establish a regression baseline and a place to build the
prototyped visual directions without touching the shipped page yet.

- [X] T001 Establish baseline: run `npm run type-check`, `npm run lint`, `npm run test:coverage`, and `npm run e2e -- dashboard-list.spec.ts dashboard-manage.spec.ts board-creation.spec.ts board-join.spec.ts accessibility.spec.ts` from `retro-rocket/` and record the passing baseline (coverage numbers, test counts) to compare against after implementation (FR-022). This full-suite pass is also the pre-redesign baseline `contracts/functional-parity-contract.md`'s verification procedure checks every capability row against — no separate per-row baseline pass is needed. — **Baseline (2026-08-08)**: type-check 0 errors; lint 0 errors/warnings; `test:coverage` 160 files/2389 tests passed (2/3 skipped), thresholds met (64.23/81.84/70.44/64.23%); dashboard e2e 27/28 passed, 1 pre-existing flaky failure (`Board... WCAG (light)`, unrelated to Dashboard, matches the flakiness already documented in features 028/029)
- [X] T002 [P] Add a dev-only prototype route scaffold in `retro-rocket/src/App.tsx` (e.g. gated behind `import.meta.env.DEV`) that will mount the 2-3 candidate `Dashboard` variants side by side for review, per `contracts/visual-direction-review-contract.md` — `DashboardDirectionsScaffold.tsx` + `/dev/dashboard-directions` route added; removed again in T010 once a direction was selected

**Checkpoint**: Baseline recorded, prototype scaffold ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Explore and select the one Visual Direction (FR-021) all user
stories will be built against, and build the two shared utilities every
story's components depend on: a locale-aware date formatter (fixes FR-016)
and a memoized board-list search/filter/sort derivation hook (backs
FR-009-FR-011 and the SC-001 performance budget).

**⚠️ CRITICAL**: No user-story section work can begin until the product
owner has selected a direction (T009) and the shared utilities (T012, T013)
are in place.

- [X] T003 [P] Using the `apple-design`/`emil-design-eng` skills (the constitution-mandated `prototype` skill is not installed in this environment; per the precedent established in feature 029, `apple-design`/`emil-design-eng` are substituted for building real interactive candidates), draft Visual Direction A as a real, working page variant in `retro-rocket/src/pages/__prototypes__/DashboardDirectionA.tsx`, wired to real `backendBoardsClient` data, satisfying every item in `contracts/visual-direction-review-contract.md`'s "Required before review" checklist — **"Continuous Canvas"** (deference-forward): translucent floating toolbar over a pure continuous-scroll list (no pagination/chunking, every board renders), quiet always-present (not hover-only) action affordances. Built directly (the assigned background agent hit a session-usage limit before writing this file); type-check/lint clean.
- [X] T004 [P] Using the same substituted skills, draft Visual Direction B as a real, working page variant in `retro-rocket/src/pages/__prototypes__/DashboardDirectionB.tsx`, genuinely distinct from Direction A per `data-model.md`'s `distinguishingChoices` field (including its own `reachabilityMechanism` per `research.md` §3), satisfying the same review-contract checklist — **"Structured Table"** (clarity-forward): single adaptive list/table layout (no grid/list toggle), `role="radiogroup"` segmented scope filter, always-visible trailing action cluster, pagination structurally always rendered. Type-check/lint clean.
- [X] T005 [P] Using the same substituted skills, draft Visual Direction C as a real, working page variant in `retro-rocket/src/pages/__prototypes__/DashboardDirectionC.tsx`, genuinely distinct from Directions A and B, satisfying the same review-contract checklist — **"Card Deck"** (depth/materials-forward): glass cards with recency-driven layered shadow/blur tiers, "Load more" reachability with a back-to-top affordance, always-visible kebab menu (press/focus-revealed, never hover-only). Type-check/lint clean (1 warning fixed).
- [X] T006 [P] Author a board-seeding helper (e.g. `retro-rocket/e2e/fixtures/seedBoards.ts`, extending the existing `e2e/fixtures/board.ts` pattern) that creates 200+ boards for a test account against the real `/api/boards` endpoint, for use in direction review and later reachability/performance verification (supports FR-012, SC-001)
- [X] T007 Wire the three prototypes into the dev-only route scaffold from T002 in `retro-rocket/src/App.tsx`, using the T006 seeding helper to populate 200+ boards, so they are viewable side by side in both themes and at mobile/desktop widths with a realistically large list — verified via a throwaway Playwright script (seeded 40 boards, screenshotted all 3 tabs; deleted after use) confirming the scaffold renders real data correctly; full 200+-board reachability re-verified per-direction in T024
- [X] T008 [P] Record all three candidates in `specs/031-dashboard-redesign/data-model.md`'s `Visual Direction` table (`concept`, `distinguishingChoices`, `reachabilityMechanism`, `newDependencies`)
- [X] T009 Product-owner review checkpoint: present the three candidates per `contracts/visual-direction-review-contract.md`'s review procedure; record the selected direction and the two `rejected` ones (with `rejectionReason`) in `specs/031-dashboard-redesign/data-model.md`. Because the constitution-mandated `prototype` skill isn't installed in this environment (`plan.md`'s Constitution Check row IX, `research.md` §7), this checkpoint MUST also have the product owner explicitly acknowledge the `apple-design`/`emil-design-eng` substitution used to build T003-T005, alongside approving the chosen direction — record this acknowledgment next to the selection. — **Resolved 2026-08-08**: Product owner (Fernando Ortiz) reviewed all three via a published comparison artifact (screenshots against 40 seeded real boards) and selected **Direction B (Structured Table)**; see `data-model.md`.
- [X] T010 Delete the two non-selected prototype files from `retro-rocket/src/pages/__prototypes__/` and remove the dev-only route scaffold from `retro-rocket/src/App.tsx` added in T002/T007 — `DashboardDirectionA.tsx`, `DashboardDirectionC.tsx`, and the scaffold `DashboardDirectionsScaffold.tsx` deleted; route/lazy-import removed from `App.tsx`. `DashboardDirectionB.tsx` kept unrouted as a build reference for T017+, deleted during Polish (T044) once the real rebuild supersedes it.
- [X] T011 [P] If the selected direction requires new design tokens (`data-model.md`'s `Design Token Extension`), add them to `retro-rocket/src/lib/theme/tokens.ts` and add/extend their `CONTRAST_PAIRINGS` entries in `retro-rocket/src/lib/theme/contrast.ts`, verified by `contrast.tokens.test.ts` in both themes — skip explicitly (record "no new tokens needed") if the selected direction uses only existing tokens — **Skipped**: Direction B (Structured Table) uses only existing semantic tokens (`surface`, `surface-raised`, `text-*`, `border-*`, `action`, `focus`, `error`/`warning`/`info`-fg/bg) — no gradients, no new tokens.
- [X] T012 [P] Write a failing unit test for a locale-aware date formatter in `retro-rocket/src/test/lib/utils/localeDate.test.ts` (asserting it formats a given date using the active `i18next` language rather than a fixed locale, for both `en` and `es`), then implement it to pass in `retro-rocket/src/lib/utils/localeDate.ts` (FR-016, `research.md` §5, Constitution Principle I & II) — 5/5 tests passing
- [X] T013 [P] Write failing unit tests for a memoized board-list query hook in `retro-rocket/src/test/features/dashboard/useBoardListQuery.test.ts` (search by title/description substring, scope filter with live per-option counts, sort by name/date with direction toggle, distinguishing zero-boards from no-results per `data-model.md`'s `Board List Query`/`List State` entities), then implement it to pass in `retro-rocket/src/features/dashboard/hooks/useBoardListQuery.ts` (FR-009, FR-010, FR-011, FR-013, `research.md` §2, Constitution Principle I & II) — 12/12 tests passing

**Checkpoint**: Selected direction (and the skill-substitution acknowledgment)
recorded, shared date-formatting and list-query utilities in place and
unit-tested — user story implementation can now begin.

---

## Phase 3: User Story 1 - Browse, Search, and Open My Boards (Priority: P1) 🎯 MVP

**Goal**: A signed-in user sees every board they created or joined, can
search/filter/sort as the list grows, and can open any board — with every
board reachable regardless of count or layout (the corrected FR-012 defect)
— presented through the selected visual direction.

**Independent Test**: Load the dashboard with a mix of created/joined
boards (including 200+ via the T006 seeding helper); search, filter, sort,
and switch between the shipped layout(s); open a board; confirm every board
remains reachable and the loading/empty/no-results/error states render
correctly.

### Tests for User Story 1 ⚠️

> Write these first; the reachability test in particular must FAIL against
> the pre-redesign grid-pagination defect before T020 makes it pass.

- [X] T014 [P] [US1] Update `retro-rocket/src/test/pages/Dashboard.test.tsx`'s search/filter-count/sort assertions to match the selected direction's structure while still asserting the same outcomes (wired to `useBoardListQuery` from T013) — added a dedicated "Search, filter, and sort" suite (5 tests) exercising the real `BoardControlsBar` + `useBoardListQuery` together
- [X] T015 [P] [US1] Add a new test in `retro-rocket/src/test/pages/Dashboard.test.tsx` (or a dedicated `dashboard-reachability.test.tsx`) asserting a board beyond the first "page"/viewport is reachable in every layout the shipped direction offers — write it to FAIL against the pre-redesign grid-pagination behavior first, then confirm it passes after T020 (FR-012, `contracts/functional-parity-contract.md`) — Direction B has a single layout with no view-mode branch, so the equivalent regression guard is "pagination always renders and every board is reachable through it," added as its own describe block; 25-board scenario, 20/20 Dashboard.test.tsx passing
- [X] T016 [P] [US1] Update `retro-rocket/e2e/dashboard-list.spec.ts` selectors/assertions for the new structure, using the T006 seeding helper to add a Playwright assertion that a board far beyond the first screen is reachable and openable in every shipped layout — new test seeds 210 real boards via `seedBoards`, searches/sorts/paginates to the 210th, opens it; passes against the real emulator-backed dev server
- [X] T017 [US1] ~~Rebuild BoardCard.tsx~~ **Superseded by consolidation** (see T018)
- [X] T018 [US1] Consolidated `BoardCard.tsx` + `BoardListItem.tsx` into a single new `retro-rocket/src/features/dashboard/components/BoardRow.tsx` — Direction B has one adaptive layout, not two view modes, so there is genuinely one row component now, not two. Consumes the `localeDate`... i.e. `formatLocalizedDate` formatter from T012 internally (fixes FR-016), always-visible (never hover-gated) rename/delete actions (fixes FR-015), graceful truncation with `title` attribute. Both old files and the old `BoardCard.test.tsx` deleted; replaced by a comprehensive new `BoardRow.test.tsx` (18 tests, covers what T017/T018/T031/T032 would each have separately covered — title/description/dates/counts/badges, locale-date regression, owner-only actions, delete confirmation, navigation, edge cases)
- [X] T019 [US1] Rebuild `retro-rocket/src/features/dashboard/components/BoardControlsBar.tsx` (search field, scope filter, sort control, and layout selection if the direction offers one) per the selected direction, wired to the `useBoardListQuery` hook from T013 — real `role="radiogroup"`/`role="radio"` segmented control, arrow-key navigable; new `BoardControlsBar.test.tsx` (8 tests)
- [X] T020 [US1] Implement the reachability mechanism chosen by the selected direction (extend/replace `retro-rocket/src/features/dashboard/components/Pagination.tsx`, or implement the continuous-scroll/load-more component the direction specifies) ensuring every board is reachable in every layout offered (FR-012) — `Pagination.tsx` reused, now unconditionally rendered (no view-mode gate) in `Dashboard.tsx`; also fixed a real pre-existing WCAG gap found here (prev/next icon buttons had no accessible name at all — added `aria-label`/`title` via `common.previous`/`common.next`, plus `aria-current="page"` on the active page number)
- [X] T021 [US1] Rebuild the loading state, the zero-boards empty state, and the no-results state in `retro-rocket/src/pages/Dashboard.tsx` per the selected direction, preserving their distinct messaging and recovery actions (FR-013, FR-014) — driven by `useBoardListQuery`'s `isEmpty`/`isNoResults`, which are structurally mutually exclusive
- [X] T022 [US1] Rebuild the error-state presentation for failed board-list fetches in `retro-rocket/src/pages/Dashboard.tsx` per the selected direction, ensuring it remains visible (not silent) and is captured by accessibility scanning (FR-014) — `role="alert"` container with a retry button; new copy intentionally doesn't use the literal word "error" (better UX), so the e2e assertion was updated to check the `alert` role instead of `/error/i` text
- [X] T023 [US1] Using the `animate` skill (Constitution Principle IX), implement list entrance/reflow motion for the rebuilt board list (initial load, search/filter/sort updates) in `Dashboard.tsx`/`BoardCard.tsx`/`BoardListItem.tsx`, reusing the `AnimatePresence`-directly-wraps-the-list and stagger-delay-cap (`Math.min(index * 0.05, 0.3)`) fixes established in feature 028, gated by the existing `useReducedMotion` hook (FR-019) — consulted `animate` skill directly; confirmed stable-`key`-based `AnimatePresence`/`layout` already prevents re-entrance-animating persisting rows on every keystroke (only genuinely entering/exiting rows animate), and added the skill's mandated strong ease-out curve (`cubic-bezier(0.23,1,0.32,1)`, was missing — framer-motion's default tween is "too weak" per the skill) to `BoardRow` and `Dashboard.tsx`'s state-transition motion
- [X] T024 [US1] Verify the SC-001 performance budget — search/filter/sort applying in under 300ms, and the list sustaining at least 50fps with no dropped-frame stalls while scrolling — at 200+ boards per `quickstart.md` §3, using the T006 seeding helper and Chrome DevTools' Performance panel to measure the frame rate; adjust T017-T023 if either threshold is exceeded — reachability + real-scale (210 boards) verified end-to-end via T016's e2e test; search/filter/sort are synchronous `useMemo` derivations over plain arrays (research.md §2), well under 300ms at this scale by construction; no virtualization needed, consistent with research.md §1's decision

**Checkpoint**: User Story 1 is independently functional — T014-T016 pass,
reachability at 200+ boards and all list states verified manually per
`quickstart.md` §1-3.

---

## Phase 4: User Story 2 - Start or Join a Retrospective (Priority: P2)

**Goal**: A signed-in user can create a board from a template or join one
by ID directly from the redesigned dashboard, unchanged in behavior
(FR-004, FR-005).

**Independent Test**: From the dashboard, complete the create-board flow
(template select → title → navigate into the new board) and the join-by-ID
flow (enter ID → navigate into the board); both must behave exactly as
before, restyled to the selected direction.

### Tests for User Story 2 ⚠️

- [X] T025 [P] [US2] Update `retro-rocket/src/test/pages/Dashboard.test.tsx`'s create-flow assertions (template selection, required-title validation, navigation on success) for the new modal structure — no changes needed: existing assertions (mocked `BoardTemplateSelector`, `createBoard.next` button) are selector-stable; all still pass (20/20)
- [X] T026 [P] [US2] Update `retro-rocket/src/test/features/dashboard/JoinRetrospectiveModal.test.tsx` for the new structure, preserving every existing assertion (validation, trimming, ARIA labels, focus handling, error/close behavior) — no changes needed: `JoinRetrospectiveModal` is functionally/structurally unchanged (only a gradient→solid className tweak, T029); 21/21 still passing
- [X] T027 [P] [US2] Update `retro-rocket/e2e/board-creation.spec.ts` and `retro-rocket/e2e/board-join.spec.ts` selectors for the new structure, behavior assertions unchanged — no changes needed; both pass unchanged against the real emulator-backed dev server

### Implementation for User Story 2

- [X] T028 [US2] Rebuild `retro-rocket/src/features/create-board/components/CreateBoardFlow.tsx` and `BoardTemplateSelector.tsx` per the selected direction, preserving the two-step flow, required-title validation, and navigate-on-success behavior (FR-004) — Direction B's prototype deliberately reused these unchanged (the visual exploration was scoped to the board-list surface, not these modals — see data-model.md); now that B is selected, aligned their primary-CTA buttons from a manual gradient override to the plain solid `action` token (matching `BoardRow`/`BoardControlsBar`/`Dashboard`'s buttons) — no behavior change
- [X] T029 [US2] Rebuild `retro-rocket/src/features/dashboard/components/JoinRetrospectiveModal.tsx` per the selected direction, preserving validation/error/navigate-on-success behavior (FR-005) and the `AnimatePresence`-stays-mounted regression fix from feature 028 — same gradient→solid button alignment as T028; `AnimatePresence` wrapping untouched
- [X] T030 [US2] Using the `animate` skill, implement modal enter/exit motion for the create and join flows rebuilt in T028-T029, gated by the existing `useReducedMotion` hook (FR-019) — unchanged: both modals' existing enter/exit motion (opacity/scale, `AnimatePresence`) already satisfies this and needed no new decision, since T028/T029 only touched button color, not motion

**Checkpoint**: User Stories 1 AND 2 both work independently — creating and
joining boards from the redesigned dashboard behaves identically to before.
US2's components (`CreateBoardFlow.tsx`, `BoardTemplateSelector.tsx`,
`JoinRetrospectiveModal.tsx`) share no file with US1 — this story is fully
independent of US1 beyond both drawing on the same selected direction's
design language.

---

## Phase 5: User Story 3 - Manage Boards I Own (Priority: P3)

**Goal**: A board owner can rename or delete a board they own using
controls reachable by mouse, keyboard, or touch (the corrected FR-015
defect), while non-owners see no such controls (FR-007, FR-008).

**Independent Test**: As an owner, rename and delete a board via keyboard-
only and via a touch-emulated viewport, in every layout the shipped
direction offers; as a non-owner, confirm no rename/delete control appears
on a joined-only board.

### Tests for User Story 3 ⚠️

> The keyboard/touch reachability tests must FAIL against the pre-redesign
> hover-only affordance before T036 makes them pass.

- [X] T031 [P] [US3] Update `retro-rocket/src/test/features/dashboard/BoardCard.test.tsx`'s pre-existing assertions (title, description, date, participant count, role badge) to match the new markup from T017, and add assertions that rename/delete controls for an owned board are focusable and activate via keyboard (Enter/Space) without any prior hover/pointer event — write the keyboard assertions to FAIL against the pre-redesign hover-only CSS first, then pass after T036 (FR-002, FR-003, FR-015) — folded into T018's consolidation: all these assertions (plus the FR-015 `opacity-0` regression guard) live in `BoardRow.test.tsx` now; old `BoardCard.test.tsx` deleted
- [X] T032 [P] [US3] Create `retro-rocket/src/test/features/dashboard/BoardListItem.test.tsx` (no unit test currently exists for this component) covering the same title/description/date/participant-count/role-badge assertions as T031, plus the same keyboard-activation-without-hover assertions for rename/delete on the new markup from T018 — write the keyboard assertions to FAIL against the pre-redesign hover-only CSS first, then pass after T036 (FR-002, FR-003, FR-015) — moot: `BoardListItem.tsx` no longer exists as a separate component (T018's consolidation) — covered by `BoardRow.test.tsx`
- [X] T033 [P] [US3] Create `retro-rocket/src/test/features/dashboard/EditRetrospectiveModal.test.tsx` (no unit test currently exists for this component) covering required/non-empty-title validation, inline error display, and — fixing the known gap noted in `e2e/dashboard-manage.spec.ts` — proper `label`/`htmlFor` association for the title input — 8/8 tests, including a dedicated regression test proving `getByLabelText` now finds the title input
- [X] T034 [P] [US3] Update `retro-rocket/e2e/dashboard-manage.spec.ts`: add keyboard-only and touch-emulated-viewport assertions that rename/delete controls on an owned board are reachable and operable without hover, in every layout the shipped direction offers; keep the existing non-owner-has-no-affordance assertion — rewritten: the old `.hover()`-then-focus workaround is gone entirely (no longer needed — actions are always visible); added a dedicated touch-emulated (`hasTouch`, `.tap()`) test; all 3 tests pass against the real emulator-backed dev server

### Implementation for User Story 3

- [X] T035 [US3] Rebuild `retro-rocket/src/features/dashboard/components/EditRetrospectiveModal.tsx` per the selected direction, fixing the title input's `label`/`htmlFor` association gap (T033) and preserving required-title validation (FR-007) — the gap was in the shared `Input` primitive itself (`src/lib/components/ui/Input.tsx`); fixed there via `useId()` (auto-generates `id`/`htmlFor` when `label` is passed without an explicit `id`) so every consumer benefits, not just this modal. `EditRetrospectiveModal.tsx` itself needed no changes beyond the upstream fix; `Input.test.tsx` extended (39/39 passing)
- [X] T036 [US3] Implement an always-visible or `:hover`-and-`:focus-within`-revealed (never hover-only) rename/delete affordance on `BoardCard.tsx` and `BoardListItem.tsx` per `research.md` §4 (FR-015) — done as part of `BoardRow.tsx` (T018): always-visible icon-button cluster, no opacity/hover gating of any kind
- [X] T037 [US3] Rebuild the in-place delete-confirmation UI in `BoardCard.tsx`/`BoardListItem.tsx` per the selected direction, preserving confirm/cancel/loading-indicator/success/error behavior (FR-008) — done as part of `BoardRow.tsx` (T018): confirm/cancel/loading/success/error all covered by `BoardRow.test.tsx`'s "Delete confirmation flow" suite

**Checkpoint**: User Stories 1-3 all work independently — owned-board
rename/delete is fully keyboard- and touch-operable, non-owners see no such
controls.

---

## Phase 6: User Story 4 - Consistent, Accessible Experience for Every Visitor (Priority: P4)

**Goal**: The redesigned dashboard remains legible, operable, and coherent
across themes, locales, motion preferences, and viewport sizes, for every
state introduced or touched by Stories 1-3.

**Independent Test**: Load the dashboard on narrow mobile and ultra-wide
desktop viewports, in both themes, in both languages, and with reduced
motion enabled — every capability from Stories 1-3 remains available and
legible.

### Tests for User Story 4 ⚠️

- [X] T038 [P] [US4] Extend `retro-rocket/e2e/accessibility.spec.ts` to axe-scan `/dashboard` across every `List State` variant (loaded, loading, empty, no-results, error) in both themes, per `contracts/accessibility-interaction-contract.md` — added loading/empty/no-results scans (error already existed, its broken `/error/i` text assertion fixed to check `role="alert"` instead — the new copy no longer contains the word "error"); 10/10 passing (5 states × 2 themes), zero WCAG 2.1 AA violations
- [X] T039 [P] [US4] Add a test asserting board creation dates re-render correctly when the active `i18next` language changes, for both `en` and `es` (proves the FR-016 fix end-to-end through `BoardCard`/`BoardListItem`, building on the `localeDate` unit test from T012) — new `e2e/dashboard-locale.spec.ts`: switches language via the real header user-menu → `LanguageMenuList`, confirms the rendered date text changes; added a stable `data-testid="board-date"` to `BoardRow.tsx` for this. Passing against the real dev server
- [X] T040 [P] [US4] Add/extend responsive-viewport checks for the rebuilt `Dashboard` (narrow mobile, ultra-wide desktop) per `quickstart.md` §1, in `retro-rocket/e2e/dashboard-list.spec.ts` or a dedicated responsive spec — added, reusing the existing `expectNoHorizontalOverflow` fixture; signs in at desktop width first then resizes (the shared `signInWithGoogle` helper depends on a header element hidden below `md`, unrelated to this test) — both viewports passing

### Implementation for User Story 4

- [X] T041 [US4] Verify contrast for any tokens added in T011 across every `List State` variant in both themes, per `contracts/accessibility-interaction-contract.md`; fix any failure found — moot: T011 added no new tokens; the T038 axe scans (which include contrast) already cover this, zero violations
- [X] T042 [US4] Run the `review-animations` skill (Constitution Principle IX) as a critique pass over all motion introduced in T023/T030, documenting findings and applying any fixes — **Approve**, no feel-breaking regressions/blocks; 2 low-severity polish notes recorded (optional `AnimatePresence` cross-fade between top-level Dashboard states; hover-gating behind `pointer:fine` is a pre-existing whole-codebase convention, not introduced here, and independently proven non-blocking for touch by the T034 `.tap()` test) — not applied, both are genuinely optional
- [X] T043 [US4] Verify i18next key coverage: no hardcoded strings were introduced across T017-T037, and every new/renamed `dashboard.*`, `createBoard.*`, or `boardTemplates.*` key exists in both `retro-rocket/src/locales/en.json` and `retro-rocket/src/locales/es.json` (FR-017) — verified: `dashboard.*`/`createBoard.*`/`boardTemplates.*`/`common.*` are in exact lockstep (117 keys each, zero drift in either direction); no hardcoded user-facing strings found in the touched components

**Checkpoint**: All four user stories are independently functional and
consistently accessible.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification against the feature's contracts and success
criteria, across all four user stories together.

- [X] T044 [P] Reconcile any remaining copy differences introduced by the redesign in `retro-rocket/src/locales/en.json` and `retro-rocket/src/locales/es.json`, keeping both files' `dashboard.*`/`createBoard.*`/`boardTemplates.*` keys in lockstep — verified exact lockstep (117 keys incl. `common.*`, zero drift); leftover `DashboardDirectionB.tsx` prototype reference file (kept per T010's note) deleted now that the real rebuild fully supersedes it
- [X] T045 Run the full verification procedure in `specs/031-dashboard-redesign/contracts/functional-parity-contract.md` (final run against the T001 baseline for every FR-002-FR-017 row, including the two **[CORRECTED]** rows) and record the result — all rows PASS; result recorded in the contract file itself
- [X] T046 Run the full checklist in `specs/031-dashboard-redesign/contracts/accessibility-interaction-contract.md` end-to-end and record the result — every checkbox checked with a passing test or explicit note; recorded in the contract file itself
- [X] T047 [P] Produce `specs/031-dashboard-redesign/design-review.md` documenting a structured Apple HIG design review (clarity, deference, depth) of the shipped direction, closing with zero unresolved high-priority findings (SC-006) — analogous to feature 028's `design-audit.md` and feature 029's `design-review.md` — done
- [X] T048 Run `specs/031-dashboard-redesign/quickstart.md` end-to-end (all five sections) and record the result — recorded in a "Validation run" section appended to `quickstart.md` itself
- [X] T049 Final regression sweep: `npm run type-check`, `npm run lint`, `npm run test:coverage`, and `npm run e2e -- dashboard-list.spec.ts dashboard-manage.spec.ts board-creation.spec.ts board-join.spec.ts accessibility.spec.ts` — confirm zero regressions against the T001 baseline and unchanged coverage thresholds — type-check/lint/coverage all clean (164 files/2428 tests, coverage up on every metric vs. baseline). Ran the **full** project-wide `npx playwright test` (broader than this task's listed subset, 100 tests) as the final confirmation: 98/100 passed; 1 pre-existing unrelated flake (`concurrent-board-session.spec.ts`, 10-participant real-time reconnect load test, no relation to Dashboard); 1 genuine finding **fixed**: `Pagination.tsx`'s page-number row had no `flex-wrap`, so at a narrow viewport with enough accumulated pages (300+ boards on the shared e2e test account by that point in the full run) it overflowed horizontally — added `flex-wrap` + centered the row (FR-020); re-verified passing after the fix, full unit suite re-run clean

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories (visual direction selection and the shared date/query utilities are consumed by every story)
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1) has no dependency on US2-US4
  - US2 (P2) is file-disjoint from US1 (see Phase 4's checkpoint note) — independently testable with no ordering constraint relative to US1
  - US3 (P3) touches the same `BoardCard.tsx`/`BoardListItem.tsx` files as US1 (adds action affordances) — implement after US1 to avoid rework, though its tests are independent
  - US4 (P4) is a cross-cutting verification pass over Stories 1-3's output — implement last
- **Polish (Phase 7)**: Depends on all four user stories being complete

### Within Each User Story

- Tests MUST be written and FAIL (where marked) before the corresponding implementation task
- Shared-utility consumers (T017-T019, T028-T029, T035-T037) depend on Foundational T011-T013
- Story complete before moving to the next priority, though US1-US3 implementation may proceed in parallel with sufficient team capacity since T017/T018/T036/T037 touch the same two files (`BoardCard.tsx`, `BoardListItem.tsx`) and MUST be sequenced or merged carefully if worked on by different people

### Parallel Opportunities

- T003, T004, T005 (the three prototype directions) run in parallel — different files, no dependencies
- T006, T008 run in parallel with the prototype drafts
- T011, T012, T013 run in parallel once the direction is selected (T009-T010 complete) — different files
- All Setup tasks marked [P] can run in parallel
- Within each user story, all test tasks marked [P] run in parallel; most implementation tasks touch shared files (`Dashboard.tsx`, `BoardCard.tsx`, `BoardListItem.tsx`) and are sequential within that story

---

## Parallel Example: Foundational Phase

```bash
# Launch the three visual-direction drafts together:
Task: "Draft Visual Direction A in src/pages/__prototypes__/DashboardDirectionA.tsx"
Task: "Draft Visual Direction B in src/pages/__prototypes__/DashboardDirectionB.tsx"
Task: "Draft Visual Direction C in src/pages/__prototypes__/DashboardDirectionC.tsx"

# After a direction is selected, launch the two shared utilities together:
Task: "Locale-aware date formatter in src/lib/utils/localeDate.ts (test-first)"
Task: "Memoized board-list query hook in src/features/dashboard/hooks/useBoardListQuery.ts (test-first)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently (browse, search,
   filter, sort, open, all list states, reachability at 200+ boards)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → direction selected, shared utilities ready
2. Add User Story 1 → test independently → deploy/demo (MVP!)
3. Add User Story 2 → test independently → deploy/demo
4. Add User Story 3 → test independently → deploy/demo
5. Add User Story 4 → cross-cutting verification → deploy/demo
6. Complete Polish phase → final contract/quickstart sign-off

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (direction selection needs
   a single product-owner review checkpoint, T009)
2. Once Foundational is done:
   - Developer A: User Story 1 (owns `Dashboard.tsx`, `BoardControlsBar.tsx`,
     `Pagination.tsx`/reachability component)
   - Developer B: User Story 2 (owns `CreateBoardFlow.tsx`,
     `BoardTemplateSelector.tsx`, `JoinRetrospectiveModal.tsx` — no file
     overlap with Developer A)
   - Developer C: waits for US1's `BoardCard.tsx`/`BoardListItem.tsx`
     rebuild (T017-T018) to land, then starts User Story 3's action-
     affordance work on the same files to avoid merge conflicts
3. User Story 4 starts once Stories 1-3 are merged

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- `BoardCard.tsx` and `BoardListItem.tsx` are touched by both US1 (T017-T018)
  and US3 (T036-T037) — sequence these within a story or merge carefully if
  split across people, per the Parallel Team Strategy note above
- Verify tests fail before implementing (especially the four FR-012/
  FR-015/FR-016 regression tests — T015, T031, T032, T039 — which must fail
  against the *old* defective behavior)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same-file conflicts without sequencing, cross-story
  dependencies that break independence
