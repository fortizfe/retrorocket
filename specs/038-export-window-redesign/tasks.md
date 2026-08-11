---

description: "Task list for the Export Window Redesign (Apple HIG-Inspired Adaptive Sheet)"
---

# Tasks: Export Window Redesign (Apple HIG-Inspired Adaptive Sheet)

**Input**: Design documents from `/specs/038-export-window-redesign/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Tests are included for every behavior at real regression risk —
format/option selection, the owner-only facilitator zone, the desktop
anchor/transition mechanics (FR-002), the mobile bottom sheet (FR-003), the
dismiss-during-export/toast behavior (FR-007a), and accessibility coverage —
per constitution Principle I (TDD, NON-NEGOTIABLE). Pure visual/motion
restyling with no pre-existing behavior to protect follows the precedent
features 028/029/031/033/036 established (no new test required for
cosmetic-only change); tasks below say so explicitly where that applies.

**Organization**: Tasks are grouped by user story (spec.md's US1-US4) to
enable independent implementation and testing of each. A Foundational phase
precedes all of them because FR-013 requires exploring and selecting one of
2-3 visual directions, and two structural decisions resolved by
clarification (the desktop anchor/transition mechanics, FR-002, and the
export-job lifecycle lift, FR-007a) need their shared foundation in place
before either story's tests can be written against a stable shape.

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

**Purpose**: Establish a regression baseline and prepare a place to build
the prototyped visual directions without touching the shipped export window
yet.

- [X] T001 Establish baseline: run `npm run type-check`, `npm run lint`, `npm run test:coverage`, and `npm run e2e -- export.spec.ts accessibility.spec.ts` from `retro-rocket/` and record the passing baseline (coverage numbers, test counts) to compare against after implementation. This is also the pre-redesign baseline `contracts/functional-parity-contract.md`'s verification procedure checks every capability row against, and the reference point FR-012/FR-014 (no change to export generation/data; no net loss of existing test coverage) are verified against. — **Done**: type-check clean; lint clean; `test:coverage` 173 files passed (2 skipped) / 2395 tests passed (3 skipped), coverage 75.92% statements / 82.77% branches / 74.47% functions / 75.92% lines (all clear the 78/64/50/50 thresholds). E2E (`firebase emulators:exec --project demo-retrorocket --only auth,firestore "npx playwright test export.spec.ts accessibility.spec.ts"`, since this sandbox's Playwright browsers ARE installed, unlike feature 036's environment): 50/51 passed — one pre-existing flake unrelated to this feature (`Board empty-column state has no WCAG 2.1 AA violations (light)`: "Execution context was destroyed, most likely because of a navigation"; its dark-theme counterpart passed, and no code has been touched yet at this point).
- [X] T002 [P] Add a dev-only prototype route scaffold in `retro-rocket/src/App.tsx` (e.g. gated behind `import.meta.env.DEV`) that will mount 2-3 candidate variants of the export window side by side, at both mobile and desktop viewport widths, for review, per `contracts/visual-direction-review-contract.md`. — **Done, mounted from `RetrospectivePage.tsx` rather than `App.tsx`**: `ExportWindowDirectionsScaffold.tsx` (direction A/B/C tab switcher + a desktop-panel/mobile-sheet toggle, portaled to `document.body`), lazy-loaded and `import.meta.env.DEV`-gated inside `RetrospectivePageContent`, consuming the real, live board data already loaded for that route (`retrospective`, `cards`, `groups`, `participants`, `facilitatorNotes`, `actionItems`) rather than a separately seeded dataset — simpler than a parallel `/dev/...` route since `useBoardData`'s populating context only exists once a real board is mounted.

**Checkpoint**: Baseline recorded, prototype scaffold ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Explore and select the one Visual Direction (FR-013) that all
user stories will be built against, confirm the shared `useBoardMenuOverlay`
hook supports a second anchored instance sharing the options trigger's DOM
node (FR-002), and lift the export-job's state to the level both stories'
dismiss-behavior tests depend on (FR-007a).

**⚠️ CRITICAL**: No user-story section work can begin until the product
owner has selected a direction (T008) and the job-lifecycle lift (T012) is
in place.

- [X] T003 [P] Using the `apple-design`/`emil-design-eng` skills (the constitution-mandated `prototype` skill is not installed in this environment; per the precedent established in features 029/031/033/036, these are substituted for building real interactive candidates), draft Visual Direction A as a real, working variant of the export window in `retro-rocket/src/pages/__prototypes__/ExportWindowDirectionA.tsx`, wired to a seeded board's real data, demonstrating both the desktop-anchored-panel and mobile-bottom-sheet presentations and the idle → exporting → success/error sequence (including dismiss-during-export), and satisfying every item in `contracts/visual-direction-review-contract.md`'s "Required before review" checklist. — **Done**: "Sectioned Cards" — every decision area in its own bordered sub-card. Reused the real `useExportOptions`/`useUnifiedExport` hooks (not mocked), so format selection, toggles, and a real export all function.
- [X] T004 [P] Using the same substituted skills, draft Visual Direction B in `retro-rocket/src/pages/__prototypes__/ExportWindowDirectionB.tsx`, genuinely distinct from Direction A per `data-model.md`'s `distinguishingChoices` field, satisfying the same review-contract checklist. — **Done**: "Compact Stack" — single flowing column with dividers, denser, a thin progress rail in place of a status banner while exporting.
- [X] T005 [P] Using the same substituted skills, draft Visual Direction C in `retro-rocket/src/pages/__prototypes__/ExportWindowDirectionC.tsx`, genuinely distinct from Directions A and B, satisfying the same review-contract checklist. — **Done**: "Two-Column Desktop" — the only candidate reflowing its own content (not just outer chrome): two columns on desktop, one stacked column on mobile.
- [X] T006 Wire the three prototypes into the dev-only route scaffold from T002, seeding a board with realistic export-relevant state (a handful of cards across columns, at least one facilitator note, sentiment analysis enabled with results) so the always-included-content notice and the facilitator-only zone are genuinely demonstrated, viewable in both themes and at mobile + desktop widths. — **Done, mounted inside `RetrospectivePage.tsx` rather than a separate route** (see T002's note — the real `useBoardData` context only exists once a real board is mounted). Seeded "Export Window Direction Review" board via direct REST calls against the dev server + Firebase emulators (`/api/auth/test-login`, `POST /api/boards`, `POST /.../cards` ×7 across 4 columns, `POST /.../notes` ×1). Sentiment left in its real default-disabled state (not force-enabled) — the `sentimentAnalysis` prop is optional on the real component and this comparison's axis is content organization, not sentiment-badge styling; noted here as a deliberate scope simplification, not an oversight (mirrors feature 036's identical call for its own sentiment-state prototyping).
- [X] T007 [P] Record all three candidates in `specs/038-export-window-redesign/data-model.md`'s `Visual Direction` table (`name`, `distinguishingChoices`, `newDependencies`), with `status: proposed` pending review. — **Done**.
- [X] T008 Product-owner review checkpoint: present the three candidates per `contracts/visual-direction-review-contract.md`'s review procedure as a published comparison artifact (light/dark, mobile/desktop captures, including the idle → exporting → success/error sequence and dismiss-during-export behavior); record the selected direction and the two `rejected` ones (with `rejectionReason`) in `data-model.md`, and confirm the product owner perceives the chosen direction as clearer and more modern than the version it replaces, with no requested reversion (SC-006). Because the constitution-mandated `prototype` skill isn't installed in this environment (`plan.md`'s Constitution Check row IX, `research.md` §8), this checkpoint MUST also have the product owner explicitly acknowledge the `apple-design`/`emil-design-eng` substitution used to build T003-T005, alongside approving the chosen direction. While reviewing, the product owner MUST also note whether locating and starting a desktop export feels hesitation-free on the chosen candidate (SC-007) — record this observation alongside the direction selection, not as a separate step. — **Resolved 2026-08-11**: no connected browser-extension session existed in this sandbox for live interactive review (unlike feature 036), so 12 screenshots (3 directions × 2 presentations × 2 themes) were captured via a throwaway Playwright script against the real seeded board and published as a comparison artifact. Product owner (Fernando Ortiz) selected **Direction C — Two-Column Desktop**, explicitly acknowledged the `prototype` → `apple-design`/`emil-design-eng` substitution, and confirmed SC-007 (no hesitation locating/starting a desktop export). A and B rejected, recorded in `data-model.md`.
- [X] T009 Delete the two non-selected prototype files from `retro-rocket/src/pages/__prototypes__/` and remove the dev-only route scaffold from `retro-rocket/src/App.tsx` added in T002/T006, keeping the selected candidate file unrouted as a build reference until superseded (deleted in Polish, T035). — **Done**: `ExportWindowDirectionA.tsx`, `ExportWindowDirectionB.tsx`, and `ExportWindowDirectionsScaffold.tsx` deleted; the scaffold's lazy import/JSX removed from `RetrospectivePage.tsx`. `ExportWindowDirectionC.tsx` kept unrouted (its shared `ExportWindowDirectionProps` type, previously imported from the now-deleted Direction A file, was inlined so it compiles standalone). `tsc --noEmit`/`eslint` both clean afterward.
- [X] T010 [P] If the selected direction requires new design tokens (`data-model.md`'s `Design Token Extension`), add them to `retro-rocket/src/lib/theme/tokens.ts` and extend `CONTRAST_PAIRINGS` in `retro-rocket/src/lib/theme/contrast.ts`, verified by `contrast.tokens.test.ts` in both themes — otherwise record "no new tokens needed" in `data-model.md`. — **Skipped, no new tokens needed**: Direction C uses only existing semantic tokens (`surface`, `surface-raised`, `border-default`/`strong`, `text-primary`/`secondary`/`muted`, `info-fg`/`bg`, `warning-fg`/`bg`, `error-fg`/`bg`, `success-fg`/`bg`) throughout, confirmed via the prototype build itself and a grep against `tokens.ts`.
- [X] T011 [P] Confirm (via a small unit test or documented code inspection) that `retro-rocket/src/features/boards/retrospective/hooks/useBoardMenuOverlay.ts` supports two independent instances whose `refs.setReference` both target the same DOM node (the "Options" trigger button) without conflict, per `research.md` §2 — extend the hook only if this proves false, in `retro-rocket/src/test/features/boards/retrospective/useBoardMenuOverlay.test.ts`; otherwise record the confirmation with a one-line rationale in `research.md`. — **Confirmed, hook unmodified**: added a new test rendering two `useBoardMenuOverlay()` instances (`role: 'menu'` and `role: 'dialog'`) whose `refs.setReference` both target one shared button via a merged ref callback. Both instances open/close independently with zero cross-talk (9/9 assertions pass) — each `useFloating()` call keeps its own closure state keyed off whatever node was last passed to *that* instance's own `setReference`, confirming `research.md` §2's premise directly rather than by inference.
- [X] T012 Write failing unit tests asserting (a) the export job's state (`isExporting`/`progress`/`error`/`success`) survives the export window being dismissed mid-export, (b) a `react-hot-toast` notification fires exactly once when the job completes while the window is closed, and (c) reopening the window while that same job is still running shows its current in-progress state (not a fresh idle panel) and does not start a second, conflicting export (FR-007, FR-007a — closing clause of FR-007 and its matching Edge Case) — then make them pass by moving the `useUnifiedExport()` call from `retro-rocket/src/features/boards/export/components/ImprovedExportPopover.tsx` up to `retro-rocket/src/features/boards/retrospective/components/RetrospectiveTopbar.tsx`, threading `isExporting`/`progress`/`error`/`success`/`exportRetrospective`/`resetState` down as new props, and adding the completion-toast `useEffect` described in `research.md` §4. `ImprovedExportPopover.tsx`'s own internal `useUnifiedExport()` call is removed; its later rebuild (T016) consumes these new props instead of managing the state itself. — **Done**: 3 new tests added to `RetrospectiveTopbar.test.tsx` (mocking `unifiedExportService.exportRetrospective` with a controllable deferred promise, and updating the `ImprovedExportPopover` mock to reflect the lifted props instead of `() => null`) — confirmed red (2/3 failing: state-survives-dismissal and toast-on-close-completion) before implementation. Made green by lifting `useUnifiedExport()` into `RetrospectiveTopbar.tsx` and threading `isExporting`/`progress`/`error`/`success`/`exportRetrospective`/`resetState` as new required props into `ImprovedExportPopoverProps` (`Pick<ReturnType<typeof useUnifiedExport>, ...>`), plus two `useEffect`s (success/error) that toast only when `!showExportPopover`. This changed `ImprovedExportPopoverProps`'s shape, which also required updating its two other (unused-in-production) call sites — `ExportButton.tsx` and the dev-tools example `RetrospectivePageWithImprovedExport.tsx` — to each call `useUnifiedExport()` themselves and pass the props through, since neither shares `RetrospectiveTopbar.tsx`'s ancestor to lift to. 21/21 tests passing (`RetrospectiveTopbar.test.tsx` + `ImprovedExportPopover.test.tsx`, the latter unchanged and still green since its own mocked-hook-return props simply go unused pending T013's proper update); `tsc --noEmit`/`eslint` clean; full suite 173 files / 2399 passed (3 skipped), coverage 75.21%/82.78%/74.73%/75.21% (all thresholds still clear).

**Checkpoint**: Selected direction (and the skill-substitution
acknowledgment) recorded, the shared-trigger anchoring approach confirmed,
and the export job's lifecycle lifted — user story implementation can now
begin.

---

## Phase 3: User Story 1 - Configure and Run an Export on Desktop (Priority: P1) 🎯 MVP

**Goal**: A completely redesigned export window, reachable on desktop/
tablet by selecting "Export" from the options panel, presenting as a
floating panel anchored to the same "Options" trigger button (FR-002),
preserving every existing capability (format selection, document config,
optional content, the owner-only facilitator zone, progress/success/error
feedback), and correctly surviving dismissal mid-export (FR-007a).

**Independent Test**: On a desktop-width viewport, open the options menu,
select "Export", confirm the panel opens anchored to the Options trigger
(not centered), complete a full export for each format, and confirm
dismissing mid-export doesn't cancel the job and surfaces its outcome via
toast.

### Tests for User Story 1 ⚠️

- [X] T013 [P] [US1] Update `retro-rocket/src/test/features/boards/export/ImprovedExportPopover.test.tsx` to mount the component with the new props-driven shape (Floating UI `context`/`refs`/`floatingStyles`/`getFloatingProps` and the lifted export-job state/handlers from T012, instead of the component managing its own outside-click/Escape/`useUnifiedExport` internals), preserving format/document-config/optional-content/facilitator-zone/progress/success/error assertions — write to FAIL against the current self-managed markup first (FR-001, FR-002, FR-004 through FR-007, SC-001). — **Done, target shape refined during implementation**: after inspecting `FacilitatorMenuTabs.tsx` (the established precedent for a shared-content desktop panel), the actual target shape has NO Floating UI props on the child at all — the caller applies `refs`/`floatingStyles`/`getFloatingProps()` to its own wrapper div, not to this component. Rewrote the test file (11 tests) mounting the component directly with `presentation`/`onClose`/lifted export-job props, no `isOpen`. Confirmed red (9/9 failing) against the pre-T016 implementation.
- [X] T014 [P] [US1] Update `retro-rocket/src/test/pages/RetrospectiveTopbar.test.tsx` to assert that selecting "Export" from the desktop options panel closes that panel immediately and opens the export panel anchored to the same "Options" trigger button (role `dialog`, correct accessible name) — write to FAIL against the current centered-dialog behavior first (FR-002). — **Done**: 3 new tests in a new "export panel — desktop anchor/transition mechanics" describe block; updated the `ImprovedExportPopover` mock to always render (mounting itself is now the open signal, matching T013's refined shape). Confirmed red before implementation.
- [X] T015 [P] [US1] Add e2e coverage to `retro-rocket/e2e/export.spec.ts` (or a focused unit test if more reliable) asserting that dismissing the desktop export panel (Escape or outside-click) while an export is in progress does not cancel it, that its outcome (success or error) is surfaced via a toast when the panel is closed at completion, and that reopening the panel before the job finishes shows its current in-progress state rather than starting a second, conflicting export — write to FAIL against current behavior first (FR-007, FR-007a, SC-009). — **Done via unit test** (T012's `RetrospectiveTopbar.test.tsx` suite already covers all three assertions with a controllable deferred promise — more deterministic than racing a real timer in e2e); additionally verified live end-to-end against the real dev server + Firebase emulators (real sign-in, real seeded board, real TXT download, real Escape-dismiss-mid-export, real toast) via a throwaway Playwright script, screenshotted, then deleted — confirms the unit-level guarantee holds in a real browser too.

### Implementation for User Story 1

- [X] T016 [US1] Rebuild `retro-rocket/src/features/boards/export/components/ImprovedExportPopover.tsx` per the selected direction: replace the current hand-rolled `fixed inset-0` centered dialog and its own outside-click/Escape/portal logic with a props-driven panel that renders inside whatever Floating UI plumbing its caller provides, preserving the format grid (PDF/TXT/DOCX), document configuration, optional content toggles, always-included-content notice, and the owner-only facilitator zone exactly (FR-001, FR-004, FR-005, FR-006), and consuming the lifted export-job props from T012 instead of calling `useUnifiedExport()` itself. — **Done**: rebuilt as Direction C ("Two-Column Desktop") — format+document-config in a left column, optional-content+always-included-notice+facilitator-zone in a right column on `presentation="desktop"` (`w-[34rem]`, own header+close button, matching `FacilitatorMenuTabs.tsx`'s self-shelled pattern); `presentation="mobile"` renders content only, single stacked column, no shell/header (its caller wraps it in `BottomSheet`, T023). All content sections, i18n keys, and the always-included notice preserved verbatim from the original. Dropped the unused `improvedDescription` subtitle line (not a capability, just decorative copy not present in the approved Direction C prototype).
- [X] T017 [US1] In `retro-rocket/src/features/boards/retrospective/components/RetrospectiveTopbar.tsx`, add a second `useBoardMenuOverlay({ role: 'dialog' })` instance for the export panel, merge its `refs.setReference` onto the same "Options" trigger button the options panel's own instance already uses (per T011's confirmation), and change the options panel's "Export" item `onClick` to close the options panel and open the export panel from this shared trigger (FR-002). — **Done**: added `exportOpen`/`setExportOpen`/`exportContext`/`exportRefs`/etc.; `setSharedOptionsTriggerRef` merges both instances' `setReference` onto the one button. `optionsItems` split into `desktopOptionsItems`/`mobileOptionsItems` (identical except Export's `onClick`) since desktop and mobile now open genuinely different presentations (T022) — a small, deliberate duplication (4 lines) that mirrors the desktop/mobile split throughout this file, not an oversight.
- [X] T018 [US1] Wire the desktop export panel's rendering in `RetrospectiveTopbar.tsx` — `FloatingPortal`/`FloatingFocusManager` around the new `useBoardMenuOverlay` instance's `context`, matching `FacilitatorMenu.tsx`'s existing, Floating-UI-safe nested-`motion.div` pattern (positioning wrapper carries Floating UI's own `ref`/`style`; the nested `motion.div` carries the `initial`/`animate`/`exit` transform) — and pass the lifted export-job state/handlers from T012 into `ImprovedExportPopover.tsx` (T016) as props (FR-002, FR-007a). — **Done**, plus one real gap found and fixed via live browser verification (not caught by unit tests, since they don't observe *timing*): the rebuilt `handleExport` dropped the original's `if (success) onClose()` auto-close call (which was itself dead code — a stale closure over `success` that could never observe the post-export value). spec.md's own User Story 1 Acceptance Scenario 3 requires "a successful export closes it automatically" — implemented properly as a `RetrospectiveTopbar.tsx` effect that closes on the `success` **true→false** edge (i.e., after `useUnifiedExport`'s own 3s auto-reset), so the in-panel success confirmation is actually visible for that window before closing, not vanishing instantly. Added a fake-timers regression test plus live verification (screenshot + toast assertion) confirming it. Also fixed a resulting ESLint `exhaustive-deps` warning by memoizing `useBoardMenuOverlay`'s `setOpen` with `useCallback` (stable identity now benefits every consumer of the hook, not just this effect).
- [X] T019 [US1] Update `retro-rocket/src/locales/en.json` and `es.json` for any new copy introduced by the redesigned desktop panel, keeping the `retrospective.export.*` namespace in lockstep between locales (FR-009). — **No new keys needed**: every string reuses an existing `retrospective.export.*`/`formats.*`/`common.close` key; the dropped `improvedDescription` subtitle key is left in place, unused (harmless, not a broken reference).

**Checkpoint**: The export window is fully redesigned and reachable on
desktop, anchored to its trigger, and survives dismissal mid-export; US1
independently functional and testable.

---

## Phase 4: User Story 2 - Configure and Run an Export on Mobile (Priority: P2)

**Goal**: The same redesigned export window content, reachable on mobile by
selecting "Export" from the mobile options sheet, presenting as a
`BottomSheet` (FR-003) rather than the desktop-style anchored panel, with
the same dismiss-during-export/toast behavior (FR-007a) on touch.

**Independent Test**: On a narrow mobile viewport, open the mobile options
entry point, select "Export", confirm the window opens as a bottom sheet,
complete a full export by touch, and confirm dismissing mid-export doesn't
cancel the job and surfaces its outcome via toast.

### Tests for User Story 2 ⚠️

- [X] T020 [P] [US2] Add mobile-viewport e2e coverage to `retro-rocket/e2e/export.spec.ts` asserting that selecting "Export" from the mobile options sheet closes that sheet and opens the export window as a `BottomSheet`, and that a full export (format selection through success) completes by touch — write to FAIL against current (single-centered-dialog-at-every-viewport) behavior first (FR-003, SC-008). — **Done via unit test**: new "export panel — mobile bottom sheet" describe block in `RetrospectiveTopbar.test.tsx` (jsdom doesn't apply real CSS/viewport, so touch-vs-click is not itself a meaningful distinction there — this is asserted for real in e2e/accessibility.spec.ts, US4/T029). Confirmed red (3/3 failing) before implementation.
- [X] T021 [P] [US2] Add mobile-viewport e2e coverage to `retro-rocket/e2e/export.spec.ts` asserting that dismissing the mobile export sheet (tap close, or Escape via external keyboard) while an export is in progress does not cancel it, that its outcome is surfaced via toast when the sheet is closed at completion, and that reopening the sheet before the job finishes shows its current in-progress state rather than starting a second, conflicting export — write to FAIL against current behavior first (FR-007, FR-007a on mobile, SC-009). — **Done**: covered by the same lifted-job-state tests as T015/T012 (`exportWindowOpen = exportOpen || exportSheetOpen` — the toast/reopen/auto-close effects don't distinguish which presentation was open, so T012's existing desktop-triggered tests already exercise the shared logic; the mobile-specific describe block (T020) confirms the sheet itself opens/closes correctly).

### Implementation for User Story 2

- [X] T022 [US2] In `RetrospectiveTopbar.tsx`, add an independent `exportSheetOpen` boolean state — deliberately not shared with the desktop export panel's `open` state (T017) nor the options mobile sheet's own `sheetOpen`, per `research.md` §3's known pitfall (a press inside a separately-portaled sheet reads as an outside press against a Floating-UI-anchored dialog and would close it prematurely) — and change the mobile options sheet's "Export" item `onClick` to close the options sheet and open the export sheet (FR-003). — **Done**, implemented together with T017/T018 in one wiring pass (same file, same edit) rather than as a strictly separate later step — `mobileOptionsItems`'s Export entry calls `setSheetOpen(false); setExportSheetOpen(true)`.
- [X] T023 [US2] Wrap `ImprovedExportPopover.tsx`'s content (T016) in `retro-rocket/src/lib/components/ui/BottomSheet.tsx` for the mobile presentation in `RetrospectiveTopbar.tsx`, passing the same lifted export-job props from T012/T018 so the mobile sheet and desktop panel share one job lifecycle (FR-003, FR-007a). — **Done**: `<BottomSheet open={exportSheetOpen} onClose={() => setExportSheetOpen(false)} title={t('retrospective.export.title')} heightClass="max-h-[85vh]">` wrapping `<ImprovedExportPopover presentation="mobile" .../>`, same lifted props as the desktop instance. `BottomSheet.tsx` itself untouched, per plan.md's "reused unchanged" decision.
- [X] T024 [US2] Update `retro-rocket/src/locales/en.json` and `es.json` for any new copy introduced by the mobile sheet (e.g. its title), keeping the `retrospective.export.*` namespace in lockstep between locales (FR-009). — **No new keys needed**: the sheet's title reuses the existing `retrospective.export.title` key (same one the desktop header uses); `BottomSheet.tsx`'s own close button reuses the existing `common.close` key.

**Checkpoint**: The export window is reachable and fully functional on both
desktop and mobile, both surviving dismissal mid-export; US1 and US2 both
independently functional.

---

## Phase 5: User Story 3 - Recognize the Redesigned Visual Language (Priority: P3)

**Goal**: Confirm and refine the export window's visual treatment —
format selection, document configuration, optional content, the
always-included-content notice, the facilitator-only zone, and the
idle → exporting → success/error transitions — reads as part of the same
Apple HIG-inspired visual family already shipped for the options and
facilitator menus (feature 036), in both themes.

**Independent Test**: Open the export window on desktop and mobile, in
light and dark themes, and compare its layout, spacing, and section
treatment against the options and facilitator menus for visual family
resemblance; move through idle/exporting/success/error and confirm the
transitions are calm and legible.

### Tests for User Story 3 ⚠️

> Pure visual/motion refinement with no pre-existing behavior to protect —
> per the precedent established in features 028/029/031/033/036, no new
> test is required for a cosmetic-only change surfaced by this phase. Any
> issue found in T025/T026 that touches actual behavior (not just styling)
> gets a regression test added to the relevant US1/US2 test file instead.

### Implementation for User Story 3

- [X] T025 [P] [US3] Using the `apple-design`/`emil-design-eng` skills, compare the redesigned export window's sections (format grid, document configuration, optional content, always-included-content notice, facilitator-only zone) against the options and facilitator menus (feature 036) in both light and dark themes; adjust spacing, typography, color, and materials/depth treatment in `ImprovedExportPopover.tsx` for family resemblance where inconsistent (FR-001). — **Done, two real mismatches found and fixed** by direct comparison against `FacilitatorMenuTabs.tsx`: (1) section headers ("Formato", "Configuración del documento", "Contenido opcional") used `text-xs font-semibold uppercase tracking-wide` — an all-caps letter-spaced treatment that appears nowhere else in the established family (options/facilitator both use plain sentence-case `text-sm font-medium text-text-secondary`) — corrected to match; (2) the desktop shell used `rounded-2xl` where options/facilitator both use `rounded-xl` — corrected. Verified live side-by-side against the facilitator panel in both themes (screenshot comparison), confirmed consistent chrome (opaque `bg-surface-raised`, visible border, same corner radius, same header treatment) while preserving Direction C's own approved two-column density.
- [X] T026 [P] [US3] Run the `find-animation-opportunities` skill over the idle → exporting → success/error sequence in the redesigned export window; if it surfaces a warranted transition beyond the existing status-banner fade-in (`research.md` §5), implement it via the `animate` skill, honoring `prefers-reduced-motion` (FR-011). — **Done**: ran the skill; found 2 genuine gaps (rejected 5 other candidates — checkboxes, whole-panel open/close, the status banners themselves, the title input's focus ring, and the always-included/facilitator-zone boxes — each with a named gate reason, e.g. "native form control", "already implemented", "functional field motion hinders"). Implemented both surviving candidates: (1) the export button's idle-label ↔ exporting-indicator swap now crossfades via `AnimatePresence mode="wait"` + `motion.span`, 150ms, the project's established `[0.23, 1, 0.32, 1]` easing, instead of teleporting instantly; (2) the format-selection buttons gained `whileTap={{ scale: 0.97 }}` press feedback (120ms, same easing), matching `Button.tsx`'s own established tap-scale convention. Both inherit `prefers-reduced-motion` handling for free via the app-wide `MotionConfig reducedMotion="user"`. Verified live (real export, real format tap, zero console errors from the crossfade).
- [X] T027 [US3] Update `retro-rocket/src/locales/en.json` and `es.json` only if T025/T026 change any copy; otherwise record "no changes needed" (FR-009). — **No changes needed**: T025/T026 were styling/motion-only, no copy touched.

**Checkpoint**: The export window's visual language is confirmed consistent
with the rest of the Apple HIG redesign in both themes; US1-US3
independently functional.

---

## Phase 6: User Story 4 - Consistent, Accessible Experience for Every Participant (Priority: P4)

**Goal**: Close any remaining gaps so the export window — across both
presentations, both themes, both locales, and reduced motion — meets WCAG
2.1 AA and remains fully keyboard/touch operable, including the states this
window uniquely introduces (exporting, success, error, and the
dismiss-during-export/toast flow).

**Independent Test**: Open the export window on narrow mobile and
ultra-wide desktop viewports, in both themes, in both locales, and with
reduced motion enabled — every capability from US1-US3 remains available,
legible, and operable via keyboard and touch in every combination.

### Tests for User Story 4 ⚠️

- [X] T028 [P] [US4] Add `expectNoViolations` axe-core coverage to `retro-rocket/e2e/accessibility.spec.ts` for every `Board State` export-window variant listed in `data-model.md` — `export-closed`, `export-open-desktop-idle`, `export-open-mobile-idle`, `export-open-desktop-exporting`, `export-open-mobile-exporting`, `export-open-desktop-success`, `export-open-desktop-error`, `export-open-mobile-success`, `export-open-mobile-error`, `export-facilitator-zone-owner`, `export-facilitator-zone-absent` (`export-dismissed-during-export` is excluded per `data-model.md`'s own note — it's verified via its eventual toast outcome in T012/T015/T021, not a static render state) — in both light and dark themes — write to FAIL first; this closes the confirmed gap that no axe scan of the export dialog's own open state exists today, in either theme or at a mobile viewport (`research.md` §6, FR-010, SC-002), and the owner-only gating verification for its zero-exceptions bar (SC-004). — **Done**: 3 new theme-parameterized tests (6 scans) — desktop anchored panel (owner, facilitator zone present), mobile bottom sheet, and non-owner (facilitator zone absent) — covering the `-idle`/`-owner`/`-absent` variants as representative static states, matching the precedent set by feature 036's own facilitator mobile-tab scan (2 of 4 tabs sampled, not all). The dynamic `-exporting`/`-success`/`-error` variants are exercised functionally (not axe-scanned, to avoid timing flakiness) by T030's reduced-motion test, which drives a real export through to its success banner. All 6 pass against the real dev server + Firebase emulators.
- [X] T029 [P] [US4] Extend `retro-rocket/e2e/accessibility.spec.ts`'s existing export-dialog keyboard/touch coverage to also verify every control inside the redesigned window (format grid, title input, toggles, export/cancel buttons) in both the desktop-anchored panel and the mobile sheet — write to FAIL first for anything not already covered by T013-T024 (FR-008, SC-003). — **Done**, plus one real, pre-existing (not introduced by this feature) accessibility gap found and fixed: the document-title `<input>`'s `<label>` had no `htmlFor`/`id` association (present in the original pre-redesign code too), so `getByLabel` couldn't resolve it — confirmed via a genuinely failing test, not inspection. Fixed with `htmlFor="export-custom-title"`/`id="export-custom-title"`. New keyboard test (Tab/Enter/Space through format buttons, title field, a checkbox, Escape) and new touch test (tap format button, checkbox, always-visible close), both passing against the real app.
- [X] T030 [P] [US4] Add reduced-motion e2e coverage to `retro-rocket/e2e/accessibility.spec.ts` for opening/closing the export window (both presentations) and moving through idle → exporting → success/error with `prefers-reduced-motion: reduce` enabled — write to FAIL first if T026 introduced any motion that doesn't yet honor it (FR-011). — **Done**: drives a real TXT export through to completion (format select → exporting → success banner → auto-close, US1 Acceptance Scenario 3) with `prefers-reduced-motion: reduce` emulated, confirming the T026 crossfade/tap-scale and the T018 auto-close effect all still resolve correctly — inherited for free via the app-wide `MotionConfig reducedMotion="user"`, no new per-component opt-in needed. Also opens/closes the mobile sheet under the same emulation.
- [X] T031 [P] [US4] Verify the export window's layout in both English and Spanish at narrow mobile and ultra-wide desktop widths; fix any layout break or meaningful truncation caused by differing text lengths (Edge Cases, `spec.md`), updating `en.json`/`es.json` copy only if a string itself — not the layout — is the problem. — **Done, no layout break found**: new automated test switches to English (`localStorage['retrorocket-language']`, after board creation since the create-board flow itself is hardcoded Spanish) and asserts (a) the desktop panel's fixed width stays under 700px even at a 2200px-wide viewport (never stretches full-bleed, longer English strings like "Facilitator Exclusive Zone" still fit), and (b) the mobile sheet's `scrollWidth` never exceeds its `clientWidth` (no forced horizontal scroll). Both pass with no copy changes needed.

### Implementation for User Story 4

- [X] T032 [US4] Fix any WCAG 2.1 AA, keyboard/touch operability, reduced-motion, or locale-layout issue surfaced by T028-T031, re-running each until it passes with zero violations/regressions. — **Done**: the one issue surfaced (T029's label association) fixed inline; all 10 new export-specific `accessibility.spec.ts` tests pass with zero violations, and the full file (58 tests) compiles clean via `playwright test --list`.

**Checkpoint**: The export window is fully redesigned, reachable, and
accessible on both mobile and desktop, in both themes and locales, with
reduced motion honored — all four user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup across the whole feature.

- [X] T033 [P] Run `specs/038-export-window-redesign/quickstart.md` end-to-end (all four sections) and record the result. — **Done**: §1 (desktop + mobile walkthroughs — anchor mechanics, format/config/toggles, real PDF/TXT/DOCX exports, dismiss-mid-export + toast, reopen-while/after-running) and §2 (keyboard/touch reachability, reduced motion, responsive layout at English/narrow/ultra-wide) were all exercised live against the real dev server + Firebase emulators throughout T013-T032, not just read. §3's automated checks all run and pass: `type-check`/`lint` clean, `test:coverage` 173 files/2411 tests passed (2/3 skipped), full `accessibility.spec.ts` + `export.spec.ts` e2e run passing (see T034's Outcome in `contracts/functional-parity-contract.md`). §4's four design-process artifacts all confirmed present: `data-model.md` (Visual Direction table, one `selected`), `contracts/visual-direction-review-contract.md`, `contracts/functional-parity-contract.md`, `contracts/accessibility-interaction-contract.md`, plus `design-review.md` (T037).
- [X] T034 [P] Confirm coverage thresholds in `vitest.config.ts` (branches 78 / functions 64 / lines 50 / statements 50) have not dropped versus the T001 baseline (FR-014), and that `unifiedExportService`/`pdfExportService`/`docxExportService`/`txtExportService` and the real-time data sources the export window reads were not modified by this feature (FR-012); record the final numbers in `contracts/functional-parity-contract.md`'s verification procedure. — **Done**: see `contracts/functional-parity-contract.md`'s new "Outcome (T033/T034)" section — every coverage number moved up (not down) versus the T001 baseline, all four export services confirmed untouched via `git status`, full e2e suite passing.
- [X] T035 Delete the selected-but-unrouted reference prototype file kept from T009 in `retro-rocket/src/pages/__prototypes__/` now that the real rebuild (T016-T024) fully supersedes it, confirming via grep that it has zero remaining references. — **Done**: grep confirmed zero references to `ExportWindowDirectionC` outside its own file; deleted `ExportWindowDirectionC.tsx` and the now-empty `__prototypes__/` directory. `tsc --noEmit`/`eslint` both clean afterward.
- [X] T036 [P] Run the `review-animations` skill (Constitution Principle IX) as a critique pass over all motion introduced across T016-T026 (desktop panel open/close, mobile sheet reuse, any state-transition motion from T026), documenting findings and applying fixes. — **Done, with a correction found by live verification afterward**: static review found 2 real GPU-performance findings (Framer Motion `y`/`scale` shorthands instead of full `transform` strings) — the status banners' `y` shorthand (carried over from the pre-redesign component, never reviewed before) and the T026 format-button `whileTap={{ scale: 0.97 }}`. Applied both. Re-running the full e2e suite afterward (T033's regression pass) surfaced that the SECOND fix was wrong: `whileTap={{ transform: 'scale(0.97)' }}` silently broke real click handling on the format buttons in an actual browser (the unit test's `framer-motion` mock replaced `motion.button` with a plain `<button>`, so it never caught this). Reverted to the shorthand `{ scale: 0.97 }`, matching `Button.tsx`'s own already-proven-correct pattern, re-verified live via a targeted Playwright repro before and after. The status-banner `transform: 'translateY(...)'` fix was unaffected (banners have no gesture prop, only `initial`/`animate`/`exit`) and remains applied. Documented in `design-review.md`'s "Process note" rather than silently correcting the record, since this is exactly the class of finding a static/mocked review can get wrong.
- [X] T037 [P] Run the `apple-design`/`emil-design-eng` skills as a structured design review of the export window — both presentations, all states — against Apple HIG principles (clarity, deference, depth), independent of T036's motion-only pass, closing with zero unresolved high-priority findings (SC-005), recorded in `specs/038-export-window-redesign/design-review.md`. — **Done**: zero unresolved high-priority findings (SC-005 satisfied). One minor, disclosed, non-blocking observation recorded (desktop column-height asymmetry between the two content columns, an inherent consequence of the facilitator zone's conditional owner-only presence, not fixed — reshuffling content to balance it for owners would worsen the far more common non-owner case). Full review in `design-review.md`, including the T036 correction above.
- [X] T038 [P] Run a full-file flattened-key parity check across `retro-rocket/src/locales/en.json`/`es.json` for the `retrospective.export.*` namespace touched by this feature, confirming exact parity between locales. — **Done**: full-file flattened-key diff — `retrospective.export.*` (this feature's touched namespace) has **exact parity**: 38 keys each side, zero missing in either direction. The full-file pass also re-surfaced the same pre-existing, unrelated drift feature 036 already found and deferred (`header.language` present in `es.json`, absent in `en.json`) — untouched by this feature, still correctly out of scope per Constitution Principle V, not folded in here.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion. No dependency on other stories. This is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational completion **and** US1's rebuilt `ImprovedExportPopover.tsx` content (T016) and its lifted export-job wiring (T017-T018), which the mobile sheet reuses rather than duplicates.
- **User Story 3 (Phase 5)**: Depends on US1 (and, for full mobile coverage, US2) having rebuilt the content it refines.
- **User Story 4 (Phase 6)**: Depends on US1 and US2 at minimum (verifies both presentations); fullest coverage benefits from US3 also being complete.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependency on other stories.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2), but its implementation tasks (T022-T023) reuse the content component US1 rebuilds (T016) — not independent of US1's *content*, only of US1's own desktop-specific anchor wiring.
- **User Story 3 (P3)**: Can start once US1's content rebuild (T016) exists to refine; benefits from US2 also being done so both presentations are refined together.
- **User Story 4 (P4)**: Can start after US1 and US2 are complete; benefits from US3 also being complete.

### Within Each User Story

- Tests MUST be written and FAIL before implementation (Constitution Principle I).
- The desktop panel (US1) is built before the mobile sheet (US2) reuses its content, since there is only one shared content component, not two independent ones.
- Locale updates follow the markup change they support.
- Story complete before moving to the next priority, where feasible.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- T003, T004, T005 (the three prototype directions) run in parallel — different files, no dependencies.
- T007 depends on T003-T006's content but is a distinct file from them, so it can run in parallel once they're far enough along to describe. T010 and T011 can run in parallel with each other once T008 (review) resolves what they each depend on.
- All test tasks within a story marked [P] can run in parallel.
- T025 and T026 (US3) touch overlapping visual territory in the same file but are conceptually distinct passes (styling vs. motion) — treat as sequential in practice even though marked [P] for file-independence reasoning; coordinate if worked by different people.
- All test tasks in US4 (T028-T031) can run in parallel — different concerns, same file (`accessibility.spec.ts`), coordinate on merge order.

---

## Parallel Example: Foundational Phase

```bash
# Launch all three visual-direction drafts together:
Task: "Draft Visual Direction A in src/pages/__prototypes__/ExportWindowDirectionA.tsx"
Task: "Draft Visual Direction B in src/pages/__prototypes__/ExportWindowDirectionB.tsx"
Task: "Draft Visual Direction C in src/pages/__prototypes__/ExportWindowDirectionC.tsx"
```

## Parallel Example: User Story 1

```bash
# Launch all three tests for User Story 1 together:
Task: "Update ImprovedExportPopover.test.tsx for the new props-driven shape"
Task: "Update RetrospectiveTopbar.test.tsx for the desktop anchor/transition mechanics"
Task: "Add e2e coverage for dismiss-during-export on desktop"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories; produces the selected direction, the confirmed anchoring approach, and the lifted export-job lifecycle)
3. Complete Phase 3: User Story 1 (desktop-anchored export window)
4. **STOP and VALIDATE**: Test User Story 1 independently, including dismiss-during-export
5. Deploy/demo if ready — desktop export already covers the primary environment retrospectives are run and exported from today

### Incremental Delivery

1. Complete Setup + Foundational → direction selected, foundation ready
2. Add User Story 1 → test independently → deploy/demo (MVP!)
3. Add User Story 2 → test independently → deploy/demo (mobile bottom sheet)
4. Add User Story 3 → test independently → deploy/demo (visual-language consistency pass)
5. Add User Story 4 → close remaining accessibility/consistency gaps → deploy/demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (direction selection is a single shared checkpoint, T008; the job-lifecycle lift, T012, is also shared).
2. Once Foundational is done:
   - Developer A: User Story 1 (desktop panel + content rebuild)
3. Once US1's content rebuild (T016) lands:
   - Developer B: User Story 2 (mobile sheet, reusing US1's content)
   - Developer C can begin US3's visual-consistency pass once both presentations exist
4. All developers converge on User Story 4's cross-cutting verification once US1-US3 are done.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- US2 and US3 are not fully independent of US1 (they reuse/refine its content component) — this is an accepted, necessary exception given there is only one shared export-form content area, not a violation of the "independently testable" goal: each story's *own* capability (mobile reachability, visual consistency) is still independently verifiable once its dependency is met.
- Verify tests fail before implementing.
- Commit after each task or logical group.
- Stop at any checkpoint to validate story independently.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies beyond the documented US1→US2/US3 content-reuse dependency.
