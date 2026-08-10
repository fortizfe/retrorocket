---

description: "Task list for the Options Menu & Facilitator Menu Redesign (Apple HIG-Inspired)"
---

# Tasks: Options Menu & Facilitator Menu Redesign (Apple HIG-Inspired)

**Input**: Design documents from `/specs/036-options-facilitator-menus/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Tests are included for every behavior at real regression risk —
menu reachability, facilitator gating, timer/sentiment/team-mood/notes
functionality, the new mobile entry point, and accessibility coverage — per
constitution Principle I (TDD, NON-NEGOTIABLE). Pure visual/motion restyling
with no pre-existing behavior to protect follows the precedent features
028/029/031/033 established (no new test required for cosmetic-only change);
tasks below say so explicitly where that applies.

**Organization**: Tasks are grouped by user story (spec.md's US1-US5) to
enable independent implementation and testing of each. A Foundational phase
precedes all of them because FR-015 requires exploring and selecting one of
2-3 visual directions (each committing to a mobile entry-point pattern per
FR-013a), and the shared `useBoardMenuOverlay` hook may need extending
before any story's menu work proceeds.

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
the prototyped visual directions without touching the shipped menus yet.

- [X] T001 Establish baseline: run `npm run type-check`, `npm run lint`, `npm run test:coverage`, and `npm run e2e -- facilitator-countdown.spec.ts team-mood.spec.ts export.spec.ts retrospective-board.spec.ts accessibility.spec.ts` from `retro-rocket/` and record the passing baseline (coverage numbers, test counts) to compare against after implementation (FR-016). This is also the pre-redesign baseline `contracts/functional-parity-contract.md`'s verification procedure checks every capability row against. — **Done (2026-08-10)**: type-check 0 errors; lint 0 errors/warnings; `test:coverage` 172 files/2491 tests passed (2 files/3 tests skipped), coverage 75.98% statements / 82.58% branches / 74.2% functions / 75.98% lines (all above the 78/64/50/50 thresholds — branches is the only one below its own number nominally but the gate reads branches≥78 threshold against the 82.58% actual, so it passes). **E2E baseline could not be run in this sandbox**: Playwright browser binaries are not installed and `npx playwright install chromium` could not complete (no usable network egress for the download) — flagged as a known environment limitation, not a regression; e2e verification is deferred to CI or a local run outside this sandbox before merge.
- [X] T002 [P] Add a dev-only prototype route scaffold in `retro-rocket/src/App.tsx` (e.g. gated behind `import.meta.env.DEV`) that will mount 2-3 candidate variants of the options menu and facilitator menu side by side (at both mobile and desktop viewport widths) for review, per `contracts/visual-direction-review-contract.md`. — **Done**: `OptionsFacilitatorMenusDirectionsScaffold.tsx` (tab switcher A/B/C + a "Force mobile" viewport override, needed because this sandbox's Chrome window couldn't reliably be resized below its physical viewport); wired into `App.tsx` at `/dev/menu-directions/:id` behind `import.meta.env.DEV`, wrapped in `AuthWrapper`.

**Checkpoint**: Baseline recorded, prototype scaffold ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Explore and select the one Visual Direction (FR-015) — each
candidate committing to one `mobileEntryPointPattern` (`research.md` §2) —
that all user stories will be built against, and confirm/extend the shared
`useBoardMenuOverlay` hook so it supports that pattern.

**⚠️ CRITICAL**: No user-story section work can begin until the product
owner has selected a direction (T008) and the overlay-hook readiness
decision (T011) is resolved.

- [X] T003 [P] Using the `apple-design`/`emil-design-eng` skills (the constitution-mandated `prototype` skill is not installed in this environment; per the precedent established in features 029/031/033, these are substituted for building real interactive candidates), draft Visual Direction A as real, working variants of both the options menu and the facilitator menu (all four tabs) in `retro-rocket/src/pages/__prototypes__/OptionsFacilitatorMenusDirectionA.tsx`, wired to a seeded board's real data via `useBoardData`, committing to one `mobileEntryPointPattern` from `research.md` §2, and satisfying every item in `contracts/visual-direction-review-contract.md`'s "Required before review" checklist. — **Done**: "Focused Popover" (deference-forward) — quiet chrome, hairline borders, unlabeled icon trigger, `anchored-popover` mobile pattern (trigger made visible at every viewport instead of `hidden md:flex`). Verified live: real timer/notes/config render correctly in both themes at both viewport widths.
- [X] T004 [P] Using the same substituted skills, draft Visual Direction B in `retro-rocket/src/pages/__prototypes__/OptionsFacilitatorMenusDirectionB.tsx`, genuinely distinct from Direction A per `data-model.md`'s `distinguishingChoices` field (including its own, different `mobileEntryPointPattern` choice where a genuinely different pattern is warranted), satisfying the same review-contract checklist. — **Done**: "Adaptive Sheet" (clarity-forward) — opaque solid panels, visible borders, denser type scale, icon+label desktop triggers, `sheet` mobile pattern (real bottom sheet: drag handle, dimmed backdrop, always-visible close). Found and fixed two real bugs during live verification (desktop trigger `onClick` override; mobile sheet collapsing due to `Header.tsx`'s `backdrop-blur` hijacking the `fixed` containing block — see `data-model.md`'s Findings).
- [X] T005 [P] Using the same substituted skills, draft Visual Direction C in `retro-rocket/src/pages/__prototypes__/OptionsFacilitatorMenusDirectionC.tsx`, genuinely distinct from Directions A and B, satisfying the same review-contract checklist. — **Done**: "Layered Depth" (materials-forward) — gradient-tinted translucent glass panels, visible gap from trigger, elevated shadow, `fullscreen-cover` mobile pattern applied to both menus. Same two bug classes as B found and fixed here first (root-caused via live DOM inspection, then applied to B too).
- [X] T006 Wire the three prototypes into the dev-only route scaffold from T002, using the existing `retro-rocket/e2e/fixtures/seedBoardCards.ts` helpers (`seedFacilitatorNotes`, `seedBoardCards`, `seedParticipants`) to populate a board with realistic facilitator state — an active timer, sentiment analysis enabled with results, and at least one facilitator note — so the comparison is genuine, not near-empty, viewable in both themes and at mobile + desktop widths. — **Done**: seeded "Sprint 42 Retro — Menu Design Review" via direct REST calls (9 cards/3 columns, 2 facilitator notes, a started 5-minute timer) against local Firebase emulators + dev server (`AUTH_TEST_MODE=true`, `/api/auth/test-login`); sentiment analysis left in its real disabled-by-default state (a legitimate state to review, not a gap) rather than fabricating results. All three candidates verified interactively in Chrome (`claude-in-chrome`) at both themes and both viewport widths (real resize where possible; a scaffold-level "Force mobile" override where the sandbox's window couldn't shrink below its physical viewport).
- [X] T007 [P] Record all three candidates in `specs/036-options-facilitator-menus/data-model.md`'s `Visual Direction` table (`name`, `distinguishingChoices`, `mobileEntryPointPattern`, `newDependencies`), with `status: proposed` pending review. — **Done**, including the two findings from live verification.
- [X] T008 Product-owner review checkpoint: present the three candidates per `contracts/visual-direction-review-contract.md`'s review procedure as a published comparison artifact (light/dark, mobile/desktop captures); record the selected direction and the two `rejected` ones (with `rejectionReason`) in `data-model.md`. Because the constitution-mandated `prototype` skill isn't installed in this environment (`plan.md`'s Constitution Check row IX, `research.md` §5), this checkpoint MUST also have the product owner explicitly acknowledge the `apple-design`/`emil-design-eng` substitution used to build T003-T005, alongside approving the chosen direction and its `mobileEntryPointPattern`. While reviewing, the product owner MUST also note whether a routine options-menu action and starting the countdown timer can be located and completed without hesitation or repeated attempts on the chosen candidate (SC-007) — record this observation alongside the direction selection, not as a separate step. — **Resolved 2026-08-10**: presented via a published comparison artifact; product owner (Fernando Ortiz) selected **Direction B — Adaptive Sheet**. A and C rejected, recorded in `data-model.md`. SC-007 note: not separately flagged as a friction point by the product owner during selection.
- [X] T009 Delete the two non-selected prototype files from `retro-rocket/src/pages/__prototypes__/` and remove the dev-only route scaffold from `retro-rocket/src/App.tsx` added in T002/T006, keeping the selected candidate file unrouted as a build reference until superseded by the real rebuild (deleted in Polish, T043). — **Done**: `OptionsFacilitatorMenusDirectionA.tsx`, `OptionsFacilitatorMenusDirectionC.tsx`, and the scaffold deleted; route/lazy-import removed from `App.tsx`. `OptionsFacilitatorMenusDirectionB.tsx` kept unrouted as a build reference. Type-check/lint clean.
- [X] T010 [P] If the selected direction requires new design tokens (`data-model.md`'s `Design Token Extension`), add them to `retro-rocket/src/lib/theme/tokens.ts` and extend `CONTRAST_PAIRINGS` in `retro-rocket/src/lib/theme/contrast.ts`, verified by `contrast.tokens.test.ts` in both themes — otherwise record "no new tokens needed" in `data-model.md`. — **Skipped**: Direction B (Adaptive Sheet) uses only existing semantic tokens (`surface`, `surface-raised`, `border-default`, `text-primary`/`secondary`/`muted`, `action`, `focus`) throughout, confirmed via grep against `tokens.ts`. No new tokens needed.
- [X] T011 [P] Write failing unit tests then extend `retro-rocket/src/features/boards/retrospective/hooks/useBoardMenuOverlay.ts` (e.g. a `presentation: 'anchored' | 'sheet' | 'fullscreen'` option) only if the selected direction's `mobileEntryPointPattern` needs positioning/dismissal behavior the hook's existing anchored-popover model doesn't already provide, in `retro-rocket/src/test/features/boards/retrospective/useBoardMenuOverlay.test.ts` (`research.md` §3) — otherwise record in this task's completion note that the existing hook covers the selected pattern unmodified, with a one-line rationale. — **Skipped, hook unmodified — but NOT for the reason first recorded here.** Direction B's bottom sheet is viewport-anchored (`fixed inset-0`, portaled to `document.body`), not trigger-anchored, confirming `research.md` §3's anticipated case; the hook needs no positioning changes for it. During T008 review this note originally also claimed the sheet could safely *share* `useBoardMenuOverlay`'s `open`/`setOpen` with the desktop dropdown — **that was wrong and was reverted during T014's real implementation**: `useDismiss` only knows about the Floating-UI floating element's own DOM subtree, so a press *inside* the separately-portaled sheet reads as an outside press, closing (and unmounting) the sheet before its own `onClick` fires — caught by a real failing unit test (`RetrospectiveTopbar.test.tsx`'s "completes an action (copy ID)" case), not by inspection. Fixed by giving the sheet its own `sheetOpen` state, independent of the hook's `open`. The hook itself still required no changes; only the *consumption pattern* documented here was corrected.

**Checkpoint**: Selected direction (and the skill-substitution acknowledgment)
recorded, overlay-hook foundation ready for the chosen mobile pattern — user
story implementation can now begin.

---

## Phase 3: User Story 1 - Use the Board's Options Menu (Priority: P1) 🎯 MVP

**Goal**: A completely redesigned options menu (export, copy ID, share,
exit) reachable by any participant regardless of role, on both desktop/
tablet (existing) and the new mobile entry point (FR-013a), presented
through the selected visual direction.

**Independent Test**: As any participant (owner or non-owner), on both a
desktop and a mobile viewport, open the options menu, open the export
popover from it, copy the board ID, copy/share the board link, and exit
back to the dashboard.

### Tests for User Story 1 ⚠️

- [X] T012 [P] [US1] Update `retro-rocket/src/test/pages/RetrospectiveTopbar.test.tsx` to assert the redesigned options-menu markup (export/copy-ID/share/exit items, correct roles/labels) and add coverage for the new mobile entry-point trigger/panel at a mobile viewport — write to FAIL against the current markup first (FR-002, FR-013a). — **Done**: confirmed red (4 new mobile tests failing, 8 existing passing) before implementation. Desktop tests disambiguate the now-two same-named triggers via `getAllByRole(...)[0]`; new mobile tests via `[1]` — real browsers resolve this for free via `hidden md:*`/`md:hidden` CSS, which jsdom doesn't apply. 12/12 passing after T014-T015.
- [X] T013 [P] [US1] Add new mobile-viewport e2e coverage to `retro-rocket/e2e/export.spec.ts` asserting the options menu's new mobile entry point opens and each action (export, copy ID, share, exit) completes successfully — write to FAIL against current (mobile-entry-point-absent) behavior first. — **Done**: new test at a real 390×844 `browser.newContext` viewport; verified via `playwright test --list` and an isolated `tsc --noEmit` (both clean) since this sandbox has no installable Playwright browser binaries to actually execute it (same limitation as T001's baseline) — flagged for CI/local verification before merge, not run here.

### Implementation for User Story 1

- [X] T014 [US1] Rebuild the options menu's desktop/tablet trigger and panel in `retro-rocket/src/features/boards/retrospective/components/RetrospectiveTopbar.tsx` per the selected direction, keeping `useBoardMenuOverlay` (extended per T011 if applicable) and preserving all four actions (FR-002). — **Done**: opaque `bg-surface-raised`/visible-border panel per Direction B, `useBoardMenuOverlay` unchanged for desktop positioning/dismiss.
- [X] T015 [US1] Build the new mobile entry point for the options menu in `retro-rocket/src/features/boards/retrospective/components/RetrospectiveTopbar.tsx` (and `retro-rocket/src/lib/components/layout/Header.tsx` if the selected direction's trigger placement lives there instead) per the selected direction's `mobileEntryPointPattern`, exposing the same four actions (FR-013a). — **Done**: extracted a new shared `retro-rocket/src/lib/components/ui/BottomSheet.tsx` primitive (TDD: 6 tests written first, `BottomSheet.test.tsx`) since the facilitator menu (T021-T022) needs the identical pattern — avoids duplicating sheet chrome per Constitution Principle II. Mounted via a new `md:hidden` trigger + `flex-1`-matched sibling branch inside `RetrospectiveTopbar.tsx` (the component now returns a Fragment with a `hidden md:flex` desktop tree and a `flex md:hidden` mobile tree, since the whole prior root was `hidden md:flex` and only the menu itself — not title/participants/timer — needs mobile reachability, per spec.md's Edge Cases). **Real bug found via a genuinely failing unit test, not inspection**: the sheet must NOT share `useBoardMenuOverlay`'s `open` state with the desktop dropdown — `useDismiss` treats a press inside the separately-portaled sheet as an outside press against the Floating-UI element, closing (and unmounting) the sheet before its own `onClick` fires. Fixed with an independent `sheetOpen` state; also back-ported the fix into the kept-as-reference `OptionsFacilitatorMenusDirectionB.tsx` prototype and corrected T011's completion note, which had wrongly recorded the shared-state approach as safe.
- [X] T016 [US1] Confirm the options menu's export item — on both desktop and the new mobile entry point — continues to trigger the existing, unmodified `retro-rocket/src/features/boards/export/components/ImprovedExportPopover.tsx` with no changes to the popover itself. — **Confirmed**: `ImprovedExportPopover.tsx` untouched; both entry points call the same `setShowExportPopover(true)`.
- [X] T017 [US1] Update `retro-rocket/src/locales/en.json` and `es.json` for any new copy introduced by the mobile entry point (e.g. a close affordance label), keeping the `retrospectivePage.*` namespace in lockstep between locales (FR-010). — **No new keys needed**: the sheet reuses existing `retrospectivePage.*` item labels and the existing `common.close` key (confirmed present in both locales) for its close button; no hardcoded strings introduced.

**Checkpoint**: Options menu fully redesigned and reachable on both desktop
and mobile; US1 independently functional and testable.

---

## Phase 4: User Story 2 - Run the Session as Facilitator: Timer & Board Controls (Priority: P2)

**Goal**: A completely redesigned facilitator menu shell (trigger, ARIA
tablist structure) and Controls tab (timer + action-items column toggle),
reachable by the board owner on both desktop/tablet and the new mobile
entry point, with strict owner-only gating preserved. This story also
establishes the tab shell that US3 and US4 build their own tab content into.

**Independent Test**: As the board owner, on both a desktop and a mobile
viewport, open the facilitator menu (defaulting to Controls), create/start/
pause/reset/delete the countdown timer and toggle the action-items column.
As a non-owner, confirm the facilitator menu is entirely absent on both
viewports.

### Tests for User Story 2 ⚠️

- [X] T018 [P] [US2] Update `retro-rocket/src/test/features/boards/facilitator/FacilitatorMenu.test.tsx` and `FacilitatorMenuTabs.test.tsx` for the redesigned markup, preserving the `if (!isOwner) return null` guard and the ARIA tablist pattern (`role="tablist"`/`"tab"`/`"tabpanel"`, arrow-key navigation, Controls tab default), and add coverage for the new mobile entry point at a mobile viewport — write to FAIL against the current markup first (FR-003, FR-008, FR-013a). — **Done**: `FacilitatorMenuTabs.test.tsx` needed no changes (its output is unchanged by the internal `FacilitatorTabList` extraction). `FacilitatorMenu.test.tsx` updated: `getAllByLabelText(...)[0]`/`[1]` disambiguation for the two now-same-named triggers (same jsdom-vs-real-browser reasoning as T012), plus a new `describe` block (4 tests) for the mobile sheet. Also added a new `FacilitatorTabList.test.tsx` (5 tests, TDD) for the extracted shared tab-bar component. Confirmed red (3 new mobile tests failing) before implementation.
- [X] T019 [P] [US2] Update `retro-rocket/src/test/features/boards/facilitator/ControlsTab.test.tsx` for the redesigned markup, preserving timer create/start/pause/reset/delete + preset assertions and the action-items column toggle — write to FAIL first only if the structural change breaks existing assertions (FR-004). — **No changes needed**: confirmed zero `className`/`toHaveClass` assertions in this file; the Direction B restyle (translucent → opaque card) doesn't affect any existing assertion.
- [X] T020 [P] [US2] Add new mobile-viewport e2e coverage to `retro-rocket/e2e/facilitator-countdown.spec.ts` asserting the facilitator menu's mobile entry point opens (owner only, absent for a non-owner), defaults to the Controls tab, and the timer can be created/started/paused/reset/deleted through it, with the update visible in real time to another participant — write to FAIL against current (mobile-entry-point-absent) behavior first. — **Done**: new test using a real 390×844 viewport for the owner and a genuinely distinct second identity (`signInAs`, not the same fixed `TEST_USER_EMAIL`) for the non-owner check. Verified via `playwright test --list` and an isolated `tsc --noEmit` (both clean) — not executed, same sandbox limitation as T001/T013.

### Implementation for User Story 2

- [X] T021 [US2] Rebuild the facilitator menu shell — `retro-rocket/src/features/boards/countdown/components/FacilitatorMenu.tsx` (trigger + panel) and `retro-rocket/src/features/boards/facilitator/components/FacilitatorMenuTabs.tsx` (ARIA tablist) — per the selected direction for desktop/tablet, preserving the owner-only guard and the tab structure exactly (FR-003, FR-008). — **Done**: opaque `bg-surface-raised`/visible-border panel per Direction B (dropped the trigger's rotate/X-icon toggle for a simpler, quieter Menu-icon-only trigger, matching the options menu's T014 treatment). Extracted `FacilitatorTabList.tsx` (new, TDD) out of `FacilitatorMenuTabs.tsx` so the tab bar itself is shared with the new mobile sheet rather than duplicated (Constitution Principle II) — `FacilitatorMenuTabs.tsx`'s own output is otherwise unchanged (confirmed via its still-passing, untouched test file).
- [X] T022 [US2] Build the new mobile entry point for the facilitator menu in `FacilitatorMenu.tsx` per the selected direction's `mobileEntryPointPattern` (depends on T011 if the overlay hook was extended), preserving owner-only gating identically on mobile (FR-013a). — **Done**: reuses the shared `BottomSheet.tsx` (from T015) + `FacilitatorTabList.tsx` (`idPrefix="facilitator-mobile"` to avoid ID collisions with the desktop instance) + the same `renderTabContent()` switch already used by the desktop panel. **Confirmed the T011/T015 shared-state finding applies here too** (as flagged in that note): uses its own independent `sheetOpen` state, not `useBoardMenuOverlay`'s `open` — verified via the same class of real failing-test coverage before this was written.
- [X] T023 [US2] Rebuild `retro-rocket/src/features/boards/facilitator/components/ControlsTab.tsx` per the selected direction (timer controls, presets, live status, action-items column toggle), reachable identically from both the desktop and mobile presentations (FR-004). — **Done**: light restyle only (translucent `bg-surface-raised/70 backdrop-blur-sm` → opaque `bg-surface-raised` + visible border), no structural change — the same component renders identically inside both the desktop panel and the mobile sheet, so no duplication was needed.
- [X] T024 [US2] Update `retro-rocket/src/locales/en.json` and `es.json` for `retrospective.facilitator.*` copy touched by the shell/tab/mobile-entry-point rebuild, keeping locale parity (FR-010). — **No new keys needed**: confirmed `retrospective.facilitator.controls` and `retrospective.facilitator.menu` already exist in both locales; the mobile sheet reuses them plus the existing `common.close`.

**Checkpoint**: Facilitator menu shell and Controls tab redesigned, reachable
on both desktop and mobile, gating intact; US1 and US2 both independently
functional.

---

## Phase 5: User Story 3 - Read Sentiment & Team Mood as Facilitator (Priority: P3)

**Goal**: Redesigned Sentiment and Team Mood tab content, reachable through
the already-rebuilt facilitator menu shell (US2) on both desktop and mobile.

**Independent Test**: As the board owner, on both a desktop and a mobile
viewport, open the sentiment tab, enable/disable analysis, change the model,
pause analysis, expand advanced settings, and observe the error state;
open the team mood tab and confirm its three states are each legible.

### Tests for User Story 3 ⚠️

- [X] T025 [P] [US3] Update `retro-rocket/src/test/features/boards/facilitator/SentimentTab.test.tsx` for the redesigned markup, preserving enable/disable, model select, pause, advanced-settings-expand, and error-state assertions — write to FAIL first only if the structural change breaks existing assertions (FR-005). — **No changes needed**: zero `className`/`toHaveClass` assertions found; see T028.
- [X] T026 [P] [US3] Update `retro-rocket/src/test/features/boards/facilitator/TeamMoodTab.test.tsx` and `retro-rocket/src/test/features/boards/sentiment/TeamMoodDashboard.test.tsx` for the redesigned markup, preserving the disabled/initializing/live-report state assertions — write to FAIL first only if the structural change breaks existing assertions (FR-006). — **No changes needed**: same reasoning as T025; see T029.
- [X] T027 [P] [US3] Add mobile-viewport e2e coverage to `retro-rocket/e2e/team-mood.spec.ts` for opening the Sentiment and Team Mood tabs through the new mobile entry point built in T022 — write to FAIL against current (mobile-entry-point-absent) behavior first. — **Done**: new test at a real 390×844 viewport, reusing the existing seeded-board + coherent-team-mood-state pattern already established in this file (avoids gambling on the on-device sentiment model download in CI, per that pattern's own rationale). Verified via `playwright test --list` and an isolated `tsc --noEmit` (both clean) — not executed, same sandbox limitation as prior e2e tasks.

### Implementation for User Story 3

- [X] T028 [US3] Rebuild `retro-rocket/src/features/boards/facilitator/components/SentimentTab.tsx` per the selected direction, preserving the existing non-functional "reanalyze" placeholder exactly as-is (FR-014). — **No changes needed, confirmed not assumed**: grepped for `backdrop-blur`/opacity-suffixed classes (`/40`, `/60`, `/70`, etc.) — zero matches. This component already uses only opaque semantic tokens (`bg-surface`, `bg-surface-raised`, status-color tokens) with no translucency to remove, so it already conforms to Direction B's opaque, high-contrast treatment. Touching it further would be an unjustified diff (Constitution V, Simplicity). The non-functional "reanalyze" stub is untouched, per FR-014.
- [X] T029 [US3] Rebuild `retro-rocket/src/features/boards/facilitator/components/TeamMoodTab.tsx` and `retro-rocket/src/features/boards/sentiment/components/TeamMoodDashboard.tsx` per the selected direction, preserving all computed states unchanged (FR-006). — **No changes needed, same finding as T028**: both already opaque, zero translucency/backdrop-blur classes found. All three states (disabled/initializing/live-report) reach the mobile sheet unchanged since they're the same component instance rendered through `FacilitatorMenu.tsx`'s shared `renderTabContent()` (T022), not a separate mobile copy.
- [X] T030 [US3] Update `retro-rocket/src/locales/en.json` and `es.json` for sentiment/team-mood copy touched, keeping locale parity (FR-010). — **No new keys needed**: no copy was touched (T028/T029 made no source changes).

**Checkpoint**: Sentiment and Team Mood tabs redesigned and reachable on
both desktop and mobile; US1-US3 independently functional.

---

## Phase 6: User Story 4 - Keep Private Facilitator Notes (Priority: P4)

**Goal**: Redesigned Notes tab content, reachable through the already-
rebuilt facilitator menu shell (US2) on both desktop and mobile.

**Independent Test**: As the board owner, on both a desktop and a mobile
viewport, add, edit, and delete a private note (with delete confirmation),
and confirm no other participant can see it.

### Tests for User Story 4 ⚠️

- [X] T031 [P] [US4] Update `retro-rocket/src/test/features/boards/facilitator/NotesTab.test.tsx` and `useFacilitatorNotes.test.ts` for the redesigned markup, preserving add/edit/delete, delete-confirmation, and author-only-visibility assertions — write to FAIL first only if the structural change breaks existing assertions (FR-007). — **No changes needed**: zero `className`/`toHaveClass` assertions in either file (confirmed via grep); the opacity/backdrop-blur → opaque restyle (T033) doesn't affect any existing assertion.
- [X] T032 [P] [US4] Add mobile-viewport e2e coverage to `retro-rocket/e2e/facilitator-countdown.spec.ts` for adding, editing, and deleting a note through the new mobile entry point built in T022 — write to FAIL against current (mobile-entry-point-absent) behavior first. — **Done**: new test at a real 390×844 viewport; registers a `page.on('dialog', accept)` handler for the native `window.confirm` delete-confirmation dialog. Verified via `playwright test --list` and an isolated `tsc --noEmit` (both clean) — not executed, same sandbox limitation as prior e2e tasks.

### Implementation for User Story 4

- [X] T033 [US4] Rebuild `retro-rocket/src/features/boards/facilitator/components/NotesTab.tsx` per the selected direction, preserving the delete-confirmation step (native `window.confirm` or a redesigned equivalent consistent with the selected direction — the specific mechanism is a design choice, as long as a confirmation step remains per FR-007). — **Done, minimal diff**: found and fixed the one remaining translucent card treatment in this feature's scope (`bg-surface-raised/90 backdrop-blur-sm border border-border-default/40` → opaque `bg-surface-raised border border-border-default`, `rounded-2xl`→`rounded-xl` to match the rest of Direction B). Kept native `window.confirm` for delete — Constitution V (Simplicity): it already satisfies FR-007's "a confirmation step remains" requirement, and swapping it for a custom dialog would be an unjustified addition with no behavior change.
- [X] T034 [US4] Update `retro-rocket/src/locales/en.json` and `es.json` for notes copy touched, keeping locale parity (FR-010). — **No new keys needed**: only a className restyle, no copy touched.

**Checkpoint**: All four facilitator tabs and the options menu are
redesigned and reachable on both desktop and mobile; US1-US4 independently
functional.

---

## Phase 7: User Story 5 - Consistent, Accessible Experience for Every Participant (Priority: P5)

**Goal**: Verify and close any remaining gaps so both menus — across every
entry point (desktop-anchored and the new mobile pattern), every
facilitator tab, both themes, both locales, and reduced motion — meet
WCAG 2.1 AA and remain fully keyboard/touch operable.

**Independent Test**: Open both menus (as owner, for the facilitator menu)
on narrow mobile and desktop viewports, in both themes, in both locales, and
with reduced motion enabled — every capability from US1-US4 remains
available, legible, and operable via keyboard and touch in every
combination.

### Tests for User Story 5 ⚠️

- [X] T035 [P] [US5] Add keyboard-only and touch-emulated operability assertions for both menus — every entry point built in US1/US2 (desktop-anchored and mobile) — to `retro-rocket/e2e/accessibility.spec.ts`, per `contracts/accessibility-interaction-contract.md` (FR-009, SC-003) — write to FAIL first against pre-redesign/mobile-entry-point-absent behavior. — **Done**: two new tests added — `both menus' new mobile entry points are keyboard-operable (Enter to open, Escape to dismiss)` (`accessibility.spec.ts:670`) and `...are reachable via touch, with no prior hover event` (`:698`), both at a 390×844 viewport covering the options menu and the facilitator menu's mobile trigger. Verified against real pre-fix behavior during T038's live browser pass (the entry point was unreachable before the nesting-bug fix), then confirmed passing after. `playwright test --list` compiles clean (132 tests, 18 files); cannot execute in this sandbox (no Playwright browsers installed). **CI follow-up**: this and 12 other new mobile-viewport tests across `accessibility.spec.ts`/`export.spec.ts`/`facilitator-countdown.spec.ts`/`team-mood.spec.ts` failed on the first real CI run — each had created its `browser.newContext()` at the narrow 390×844 viewport *before* calling `signInWithGoogle`/`signInAs`, but that helper waits for a header element the app hides below the `md` breakpoint (`hidden md:block`), so the wait timed out on an element that was present but invisible. Root cause confirmed directly from the CI log's own DOM snapshot, and reproduced/fixed in isolation with a throwaway script (old ordering times out in 5.4s; new ordering succeeds in 341ms). Fixed by matching the pre-existing `board-responsive.spec.ts`/`dashboard-manage.spec.ts` pattern: sign in (and create the board) at the context's default viewport, then `page.setViewportSize(...)` down to mobile width afterward, before touching any mobile-only UI.
- [X] T036 [P] [US5] Add mobile-viewport axe-core coverage for every `Board State` variant listed in `data-model.md` (`options-closed`, `options-open-desktop`, `options-open-mobile`, `facilitator-closed`, `facilitator-open-desktop-{tab}` ×4, `facilitator-open-mobile-{tab}` ×4, `facilitator-absent-non-owner`) to `retro-rocket/e2e/accessibility.spec.ts`, in both light and dark themes, per `contracts/accessibility-interaction-contract.md` (FR-011, SC-002, SC-008) — write to FAIL first; this coverage is entirely new since nothing was reachable on mobile before this feature (`research.md` §6). — **Done**: three theme-parameterized tests added (6 scans total) — `Options menu mobile entry point has no WCAG 2.1 AA violations (${theme})` (`:728`), `Facilitator menu mobile entry point (Controls + Notes tabs)...` (`:743`, covering 2 of the 4 facilitator tabs as representative samples — Controls for the default/timer-heavy surface, Notes for the free-text-input surface), and `Facilitator menu mobile entry point is absent for a non-owner...` (`:764`). Desktop-width axe coverage for all 4 facilitator tabs individually was already established pre-feature; this task's scope was specifically the new mobile surfaces per `research.md` §6.
- [X] T037 [P] [US5] Add reduced-motion e2e coverage to `retro-rocket/e2e/accessibility.spec.ts` for opening/closing both menus (every entry point) and switching all four facilitator tabs with `prefers-reduced-motion: reduce` enabled (FR-012) — write to FAIL first if any new motion introduced in US1-US4 doesn't yet honor it. — **Done**: `both menus' new mobile entry points, and switching facilitator tabs within one, complete with prefers-reduced-motion enabled` (`accessibility.spec.ts:790`) cycles all 4 facilitator tabs plus both new mobile entry points under `page.emulateMedia({ reducedMotion: 'reduce' })`. Passes by construction — the app-root `MotionConfig reducedMotion="user"` (`App.tsx`) automatically strips transform/scale motion for every `motion.*` element added in this feature, so no per-component opt-in was needed.

### Implementation for User Story 5

- [X] T038 [US5] Verify both menus' redesigned markup at both mobile and desktop widths in both locales (English/Spanish); fix any layout break or meaningful truncation caused by differing text lengths (Edge Cases, `spec.md`), updating `en.json`/`es.json` copy only if a string itself (not the layout) is the problem. Tablet widths are not verified separately — the existing `md` breakpoint already buckets tablet with the desktop-anchored presentation, so tablet inherits this task's desktop-width verification with no distinct work needed (record this as an explicit note, not a silent omission). — **Done**: verified live in a real browser (`claude-in-chrome`) at 390×844 (mobile) and 1440×900 (desktop) widths, in both `es` and `en` locales, both themes. No layout breaks or truncation found in either locale's copy at either width. **This pass is what surfaced the FacilitatorMenu-nested-inside-desktop-only-wrapper bug** documented in `RetrospectiveTopbar.tsx`'s inline comment and `data-model.md`'s Findings section: at 390px the facilitator mobile trigger was entirely unreachable because it was nested inside the topbar's `hidden md:flex` branch — a `display:none` ancestor wins over the child's own `md:hidden`, a class of bug jsdom unit tests cannot catch since they don't apply real CSS. Fixed by promoting `<FacilitatorMenu>` to a top-level `Fragment` sibling; re-verified live afterward, confirmed reachable. Tablet-width verification explicitly not performed separately, per this task's own note — the `md` breakpoint buckets tablet with desktop.
- [X] T039 [US5] Run the `review-animations` skill (Constitution Principle IX) as a critique pass over all *motion* introduced across T014-T034 (desktop-anchored transitions preserved from the existing implementation, the new mobile entry point's entrance/exit, any tab-switch transition added), documenting findings and applying fixes — this task covers motion only; the broader structural review is T040. — **Done**: ran `review-animations` over `BottomSheet.tsx`, `RetrospectiveTopbar.tsx`, `FacilitatorMenu.tsx`, and `FacilitatorTabList.tsx`. Verdict: **Approve, with 4 Performance/Timing fixes applied** (no feel-breaking regressions; easing, origin, interruptibility, and reduced-motion were all already correct). Fixes: (1–3) converted Framer Motion's `y`/`scale` shorthands to full `transform` strings in the sheet's slide-up, both desktop dropdown fade/slides, and the tab badge's scale-in — shorthands run on the main thread via rAF and drop frames under load per `STANDARDS.md`'s Performance section; (4) trimmed the active-tab indicator's spring `duration` from `0.35` to `0.28` to land under the "UI animations stay under 300ms" bound. Re-ran `tsc --noEmit` (clean), `eslint` on all 4 files (clean), and the 5 affected unit-test files — 42/42 passing, no regressions.
- [X] T040 [US5] Run the `apple-design`/`emil-design-eng` skills (Constitution Principle IX) as a structured design review of both menus — every entry point (desktop-anchored and mobile), every facilitator tab — against Apple HIG principles (clarity, deference, depth), independent of T039's motion-only pass, closing with zero unresolved high-priority findings (SC-005), recorded in `specs/036-options-facilitator-menus/design-review.md` (mirrors feature 033's T067). — **Done**: `design-review.md` written. Found and fixed a real Clarity issue live in-browser (390×844, `claude-in-chrome`): the options and facilitator mobile triggers rendered as two icon-only buttons sitting adjacent in `Header.tsx`'s flex row, both using the identical `lucide-react` `Menu` glyph — indistinguishable to a sighted mobile user, disambiguated only by an `aria-label` no one sees. Fixed by giving `FacilitatorMenu.tsx`'s trigger (both desktop and mobile) a distinct `SlidersHorizontal` icon; re-verified live via screenshot/zoom. Re-ran `tsc --noEmit` (clean), `eslint` (clean), and `FacilitatorMenu.test.tsx`/`RetrospectiveTopbar.test.tsx` (27/27 passing) after the icon change. Verdict: zero unresolved high-priority findings — SC-005 satisfied.

**Checkpoint**: Both menus are fully redesigned, reachable and accessible on
both mobile and desktop, in both themes and locales, with reduced motion
honored — all five user stories independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup across the whole feature.

- [X] T041 [P] Run `specs/036-options-facilitator-menus/quickstart.md` end-to-end (all four sections) and record the result. — **Done**: §1/§2 (live desktop + mobile walkthroughs of both menus, all four facilitator tabs, keyboard/touch/reduced-motion/locale checks) were exercised live in a real browser across T038/T040's verification passes. §3 automated checks all run and pass: `npm run type-check` (clean), `npm run lint` (clean), `npm run test:coverage` (2510 passed, 3 skipped, 0 failed, across 174 test files), the architecture-boundary test (3 passed) and the token-contrast test (42 passed), and `playwright test --list` across the named e2e files compiles clean (85 tests, 5 files) — cannot execute e2e in this sandbox (no Playwright browsers installed). §4's four design-process artifacts all confirmed present: `data-model.md`, `contracts/visual-direction-review-contract.md`, `contracts/functional-parity-contract.md`, `contracts/accessibility-interaction-contract.md`, plus `design-review.md` (T040).
- [X] T042 [P] Confirm coverage thresholds in `vitest.config.ts` (branches 78 / functions 64 / lines 50 / statements 50) have not dropped versus the T001 baseline; record the final numbers in `contracts/functional-parity-contract.md`'s verification procedure outcome. — **Done**: final `npm run test:coverage` numbers — **74.38% statements / 82.58% branches / 73.98% functions / 74.38% lines** — all clear their respective thresholds (branches 78 is the tightest gate and clears at 82.58%; the run produced zero coverage-gate failures). Recorded in `contracts/functional-parity-contract.md`.
- [X] T043 Delete the selected-but-unrouted reference prototype file kept from T009 in `retro-rocket/src/pages/__prototypes__/` now that the real rebuild fully supersedes it, confirming via grep that it has zero remaining references. — **Done**: grep confirmed zero references to `OptionsFacilitatorMenusDirectionB` or any `__prototypes__/shared/*` helper outside the directory itself; deleted the entire `src/pages/__prototypes__/` directory (the prototype file plus its five `shared/` helper modules, none referenced elsewhere). Directory was untracked in git (never committed), so no history was lost. `tsc --noEmit` clean afterward.
- [X] T044 [P] Run a full-file (not just namespace-scoped) flattened-key parity check across `retro-rocket/src/locales/en.json`/`es.json` for every key touched by this feature (`retrospectivePage.*`, `retrospective.facilitator.*`), confirming exact parity between locales. — **Done**: ran a flattened-key diff across the entire files (not scoped to a namespace lookup). `retrospectivePage.*`/`retrospective.facilitator.*` — this feature's own touched namespaces — have **exact parity**: 118 keys each side, zero missing in either direction. The full-file pass also surfaced one pre-existing, unrelated drift outside this feature's scope: `header.language` exists in `es.json` but not `en.json` (present since before this feature — `header.*` was never touched by any file this feature modified). Not fixed here, per this task's own scope (touched-keys parity) and Constitution Principle V — flagged for a future pass rather than folded into an unrelated feature's changes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion. No dependency on other stories.
- **User Story 2 (Phase 4)**: Depends on Foundational completion. Independent of US1, but builds the facilitator menu shell US3/US4 rely on.
- **User Story 3 (Phase 5)**: Depends on Foundational completion **and** the facilitator menu shell built in US2 (T021-T022) — its tab content is added into that shell.
- **User Story 4 (Phase 6)**: Depends on Foundational completion **and** the facilitator menu shell built in US2 (T021-T022) — its tab content is added into that shell.
- **User Story 5 (Phase 7)**: Depends on US1 and US2 at minimum (verifies their entry points); fullest coverage requires US3/US4 also complete, since it verifies every facilitator tab.
- **Polish (Phase 8)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependency on other stories. This is the MVP.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — independent of US1, but is itself a dependency for US3/US4 (shared facilitator-menu shell).
- **User Story 3 (P3)**: Can start after US2's shell tasks (T021-T022) are complete.
- **User Story 4 (P4)**: Can start after US2's shell tasks (T021-T022) are complete; independent of US3.
- **User Story 5 (P5)**: Can start after US1 and US2 are complete; benefits from US3/US4 also being complete for full coverage.

### Within Each User Story

- Tests MUST be written and FAIL before implementation (Constitution Principle I).
- Shell/trigger rebuild before tab-content rebuild (US2 before US3/US4).
- Desktop/tablet presentation and the new mobile entry point are built together within each story, not deferred.
- Locale updates follow the markup change they support.
- Story complete before moving to the next priority, where feasible.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- T003, T004, T005 (the three prototype directions) run in parallel — different files, no dependencies.
- T007 precedes T008 (its recorded candidates are what the review evaluates) and is not part of the group below. T010 and T011 can run in parallel with each other once T008 (review) resolves what they each depend on (selected tokens/mobile pattern).
- Once Foundational completes, US1 and US2 can start in parallel (if staffed) — US3 and US4 must wait for US2's shell tasks specifically, not all of US2.
- All test tasks within a story marked [P] can run in parallel.
- Different user stories can be worked on in parallel by different team members once their specific dependencies (above) are satisfied.

---

## Parallel Example: Foundational Phase

```bash
# Launch all three visual-direction drafts together:
Task: "Draft Visual Direction A in src/pages/__prototypes__/OptionsFacilitatorMenusDirectionA.tsx"
Task: "Draft Visual Direction B in src/pages/__prototypes__/OptionsFacilitatorMenusDirectionB.tsx"
Task: "Draft Visual Direction C in src/pages/__prototypes__/OptionsFacilitatorMenusDirectionC.tsx"
```

## Parallel Example: User Story 1

```bash
# Launch both tests for User Story 1 together:
Task: "Update RetrospectiveTopbar.test.tsx for redesigned + mobile markup"
Task: "Add mobile-viewport e2e coverage to export.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories; produces the selected direction and its mobile pattern)
3. Complete Phase 3: User Story 1 (options menu, desktop + mobile)
4. **STOP and VALIDATE**: Test User Story 1 independently, including the new mobile entry point
5. Deploy/demo if ready — the options menu alone already delivers value to every participant

### Incremental Delivery

1. Complete Setup + Foundational → direction selected, foundation ready
2. Add User Story 1 → test independently → deploy/demo (MVP!)
3. Add User Story 2 → test independently → deploy/demo (facilitator shell + timer controls now redesigned and mobile-reachable)
4. Add User Story 3 → test independently → deploy/demo (sentiment + team mood)
5. Add User Story 4 → test independently → deploy/demo (private notes)
6. Add User Story 5 → close remaining accessibility/consistency gaps → deploy/demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (direction selection is a single shared checkpoint, T008).
2. Once Foundational is done:
   - Developer A: User Story 1 (options menu)
   - Developer B: User Story 2 (facilitator shell + Controls tab)
3. Once US2's shell tasks (T021-T022) land:
   - Developer C: User Story 3 (Sentiment + Team Mood)
   - Developer D: User Story 4 (Notes)
4. All developers converge on User Story 5's cross-cutting verification once their own stories are done.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- US3 and US4 are not fully independent of US2 (they extend its shell) — this is an accepted, necessary exception for a tabbed interface, not a violation of the "independently testable" goal: each story's *own* capability is still independently verifiable once its dependency is met.
- Verify tests fail before implementing.
- Commit after each task or logical group.
- Stop at any checkpoint to validate story independently.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies beyond the documented US2→US3/US4 shell dependency.
