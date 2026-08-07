# Design Audit Log: Apple-Inspired Design Alignment

Findings recorded here follow the format defined in
`contracts/design-audit-finding-schema.md`. One `##` section per `UI Surface`
from `data-model.md`'s catalog. `Skill Used` MUST be one of the nine
mandated skills from constitution Principle IX.

## Cross-Cutting Inventory

_T007. Skill Used: find-animation-opportunities, improve-animations. Produced by
sweeping `retro-rocket/src` (recon + grep evidence, not fabricated) and vetting
each candidate against `improve-animations`' 8-category rubric. This is a
cross-cutting map for the per-surface Audit tasks to consult, not a final
verdict — each surface's own audit (using `review-animations`/`apple-design`/
`emil-design-eng`) makes the actual per-finding call._

### Motion inventory

- **54 files** import `framer-motion` (list: `App.tsx`, all `features/auth`,
  `features/boards/{clustering,countdown,export,facilitator,participants,
  retrospective,sentiment}`, `features/create-board`, `features/dashboard`,
  `lib/components/layout/Header.tsx`, `lib/components/mobile/
  MobileColumnNavigation.tsx`, `lib/components/ui/{Button,Card,EmojiPicker,
  LanguageSelector,Loading,Modal,Skeleton,ThemeToggle,TypingPreview}.tsx`,
  and the main pages). All of these are now covered by the root
  `<MotionConfig reducedMotion="user">` (T006) — `prefers-reduced-motion` is
  already honored for every one of them.
- **58 files** use plain Tailwind `transition-*`/`animate-*` utilities, with
  substantial overlap with the framer-motion set. These are **NOT** covered
  by `MotionConfig` and need their own `@media (prefers-reduced-motion:
  reduce)` handling wherever the motion is more than a color/opacity change
  — a per-surface decision, not a blanket fix.
- `tailwind.config.cjs` defines `animate-float` / `animate-pulse-soft` /
  `animate-bounce-gentle` keyframe utilities with **zero usages** anywhere in
  `src` — dead animation vocabulary (Simplicity/YAGNI candidate; low
  priority, not a design-quality issue).
- No shared easing/duration **tokens** exist anywhere in the codebase (no
  custom `cubic-bezier` values in `globals.css` or `tailwind.config.cjs`) —
  every surface currently relies on Tailwind's bare `ease-out`/`ease-in-out`
  keyword curves or ad hoc `duration={{ ... }}` values in framer-motion
  props. Any surface that introduces a deliberate curve should propose it as
  a shared token (e.g. `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`) rather
  than a one-off value.
- **Zero** uses of `transform-origin` anywhere in `src` — popovers/menus
  (`CardMenu`, `ColumnHeaderMenu`, `ParticipantPopover`,
  `GroupSuggestionModal`, `ThemeMenuToggle`, `LanguageMenuList`,
  `ReactionPicker`, `EmojiPicker`, `ColorPicker`) all animate from a fixed
  origin rather than anchoring to their trigger.
- **50 occurrences** of Tailwind's `transition-all` (`transition: all` in
  CSS) — animates unintended properties off the fast GPU path
  (`transform`/`opacity` only); a recurring pattern to watch for during
  Remediate, not something to batch-fix here.
- Framer Motion `x`/`y`/`scale` shorthand `animate={{ }}` props (not the
  hardware-accelerated full `transform` string) are the dominant pattern
  across auth, dashboard, and create-board entrance animations — worth
  attention on the highest-traffic, most performance-sensitive surface
  (`retrospective-board`, given its real-time multi-participant updates).

### Vetted findings (ordered by leverage)

| # | Severity | Category | Location | Finding | Fix summary |
|---|---|---|---|---|---|
| 1 | MEDIUM | Accessibility | 58 plain-CSS motion files (see inventory) | Not covered by root `MotionConfig`; reduced-motion handling is a per-surface gap, not yet closed anywhere | Each surface's Remediate task adds `@media (prefers-reduced-motion: reduce)` for its own plain-CSS motion, per the global Tests-policy clause already in `tasks.md` |
| 2 | MEDIUM | Physicality & origin | `CardMenu.tsx`, `ColumnHeaderMenu.tsx`, `ParticipantPopover.tsx`, `GroupSuggestionModal.tsx`, `ThemeMenuToggle.tsx`, `LanguageMenuList.tsx`, `EmojiPicker.tsx`, `ColorPicker.tsx` | Zero `transform-origin` usage anywhere — trigger-anchored popovers/menus scale from a fixed point instead of their trigger | Anchor each to its trigger element's position (`transform-origin`), during `ui-kit-overlays`/`ui-kit-pickers`/board-menu audits |
| 3 | MEDIUM | Performance | 50 `transition-all` occurrences codebase-wide | Animates layout-affecting properties off the GPU-accelerated path | Narrow to `transition-transform`/`transition-opacity`/`transition-colors` per occurrence encountered during Remediate |
| 4 | MEDIUM | Cohesion & tokens | Whole codebase | No shared easing/duration tokens exist; every surface improvises its own curve/duration | First surface to need a deliberate curve should establish it as a shared token (see `--ease-out` example above), not a one-off |
| 5 | LOW-MEDIUM | Missed opportunity (Feedback) | `src/features/dashboard/components/BoardCard.tsx:120` | `whileHover={{ y: -2 }}` exists; no `whileTap` press feedback on a clickable card | Add `whileTap={{ scale: 0.98 }}`, ~150ms — consistent with `Button.tsx`'s existing pattern |
| 6 | LOW | Simplicity/YAGNI | `tailwind.config.cjs` `animate-float`/`animate-pulse-soft`/`animate-bounce-gentle` | Defined, zero usages in `src` | Remove if confirmed unused after the full audit, or note as intentionally reserved |
| 7 | INFORM | Purpose & frequency | `src/lib/components/ui/TypingPreview.tsx` | Just had two recent bug fixes (ordering-race, flicker) | Do **not** add new decorative motion here — stability over flair, explicitly out of scope for this initiative |
| 8 | INFORM | Already correct | `Modal.tsx` (opacity+scale 0.95+y, 200ms, avoids `scale(0)`), `CountdownTimer.tsx` (properly `AnimatePresence`-wrapped entrance/exit), `Button.tsx` (`whileHover`/`whileTap` already present) | No finding — confirmed good, no change needed | — |

**Deferred to hands-on audit, not prescribed here**: `DraggableCard.tsx`
reordering is driven by `@dnd-kit`, not framer-motion springs — whether its
existing reorder transition needs adjustment is a call for the `board-core`
audit (T008), not something to prescribe from a codebase sweep.

### Verdict

This app is already closer to "right" than "wrong" — Button and Modal show
the team already knows the vocabulary (real press feedback, no `scale(0)`,
reasonable durations). The highest-leverage single fix is closing the
reduced-motion gap on the 58 plain-CSS files (#1), since it's the one
finding that's a hard constitutional/FR-006 requirement rather than polish;
the transform-origin gap (#2) is the highest-leverage *design-quality* fix
since it touches nearly every menu/popover in the product. Nothing here
should be batch-fixed in T007 itself — each row above is a lead for the
surface it names, to be confirmed or rejected in that surface's own Audit
task.

## retrospective-board (P1)

States reviewed: default, loading, empty, error

| ID | State | Category | Priority | Disposition | Skill Used | Resolution |
|----|-------|----------|----------|--------------|------------|------------|
| DAF-001 | default | interruptibility | high | remediate-now | review-animations | `DraggableCard.tsx` nested its own `AnimatePresence` around a single always-present child, one level too deep — the real parent list (`DragDropColumn.tsx`'s `sortedCards.map(...)`) had no `AnimatePresence`, so React unmounted a deleted card's whole subtree before the inner instance ever saw the removal; the declared `exit` animation was dead code. Fixed by moving `AnimatePresence` to `DragDropColumn.tsx` (directly parenting the list) and removing the now-redundant one from `DraggableCard.tsx`. Verified via a new failing-first test (`DragDropColumn.test.tsx`) asserting the card list renders inside an `AnimatePresence` marker. |
| DAF-002 | default | performance | medium | remediate-now | review-animations | `DraggableCard.tsx:189,195` used Tailwind `transition-all`, animating unintended properties off the GPU-accelerated path. Narrowed to `transition-[transform,box-shadow,border-color]` (wrapper) and `transition-[box-shadow,border-color]` (Card) — the exact properties that actually change on drag state. |
| DAF-003 | default | physicality (press feedback) | medium | remediate-now | review-animations | `CardVoteControl.tsx`'s up/down vote buttons (clicked frequently) had zero press feedback, unlike `Button.tsx`'s existing `whileHover`/`whileTap`. Added `active:scale-95 transition-[color,transform]` (subtle, ~tens-of-times/day frequency tier), gated off on the disabled down-vote state via `disabled:active:scale-100`. Verified via a new failing-first test (`CardVoteControl.test.tsx`). |
| DAF-004 | default | reduced motion | low | already-compliant | apple-design | `DraggableCard.tsx`'s entrance/exit motion (`y`-based) is fully covered by the app-root `<MotionConfig reducedMotion="user">` (T006) — no per-component change needed; confirmed rather than assumed. Priority corrected from `high` to `low` during the T053/T054 quickstart/conformance pass: per `contracts/design-audit-finding-schema.md`'s own worked example (`DAF-003`), an `already-compliant` disposition — no violation found, nothing to remediate — belongs at `low` priority; the schema's `high` → `remediate-now` MUST rule is for actual violations, not confirmatory checks. |

`functionalRegressionCheck`: `npm run test:coverage` — 155 files / 2347 tests passing (baseline 154/2341 + 6 new tests), zero regressions, coverage 59.98/82.27/72.16/59.98 (above the 50/78/64/50 floor). `npm run e2e -- board-creation.spec.ts card-lifecycle.spec.ts retrospective-board.spec.ts concurrent-board-session.spec.ts concurrent-board-network.spec.ts` — 42/42 passed on a clean run.

**Note on e2e reliability**: `retrospective-board.spec.ts:937` ("typing indicator ... introduces no new WCAG 2.1 AA violations") showed session flakiness during verification — it failed consistently (5/5) on a run of *unmodified baseline* code partway through this investigation, under what looked like sandbox resource exhaustion after many consecutive Firebase-emulator+Playwright cycles, then passed reliably again afterward on both baseline and remediated code. This was rigorously bisected (isolating each of the four changed files individually, twice) before concluding it was environmental, not a code regression — recorded here for transparency; worth an independent CI run to confirm before merging.

## clustering (P1)

States reviewed: default, loading, empty, error

| ID | State | Category | Priority | Disposition | Skill Used | Resolution |
|----|-------|----------|----------|--------------|------------|------------|
| DAF-005 | default | interruptibility | high | remediate-now | review-animations | `GroupCard.tsx`'s member-card list (`memberCards.map(...)`) had no `AnimatePresence` of its own — same bug class as DAF-001; a removed member card couldn't exit-animate. Fixed test-first (new test in `GroupCard.test.tsx` asserting a second, list-scoped `AnimatePresence` boundary exists). Also capped the per-item stagger delay at 80ms (was uncapped `index * 100ms`; now `Math.min(index * 0.06, 0.3)`), per the 30-80ms stagger guideline. |
| DAF-006 | default | interruptibility | high | remediate-now | review-animations | `GroupableColumn.tsx`'s groups list (`columnGroups.map(...)`) had no `AnimatePresence` either — same bug class; a disbanded group couldn't exit-animate. Fixed test-first (new test in `GroupableColumn.test.tsx` asserting a third `AnimatePresence` boundary, in addition to the pre-existing new-card-form and empty-state ones). |
| DAF-007 | default | interruptibility | high | remediate-now | review-animations | `GroupSuggestionModal.tsx` had `if (!isOpen) return null;` positioned *before* its own `<AnimatePresence>`, so closing the modal removed `AnimatePresence` itself in one render pass rather than just its child — the exit animation was dead code, a different manifestation of the same root bug class. Fixed test-first (new `GroupSuggestionModal.test.tsx`; restructured to `<AnimatePresence>{isOpen && (...)}</AnimatePresence>` so `AnimatePresence` stays mounted across the `isOpen` transition). |
| DAF-008 | default | performance / physicality | medium | remediate-now | review-animations | `ColumnHeaderMenu.tsx:67` used `transition-all`; narrowed to the properties that actually change (`background-color,box-shadow,color,border-color`). Its dropdown panel (`:88`) had no `transform-origin` toward its trigger (top-right anchored button) — added `origin-top-right`, consistent with the cross-cutting inventory's transform-origin gap. |
| DAF-009 | default | craft (i18n consistency) | medium | defer-backlog | apple-design | `GroupSuggestionModal.tsx` has hardcoded Spanish strings throughout (headers, labels, empty state) bypassing `i18next`, unlike the rest of the app. Deferred: fixing this is a content/i18n completeness task requiring new locale keys across all supported languages, not a presentation-only change within this initiative's scope (user confirmed deferral). |
| DAF-010 | default | familiarity (design-system consistency) | medium | defer-backlog | apple-design | `GroupSuggestionModal.tsx` implements its own modal chrome (backdrop, centering, close) instead of the shared `Modal.tsx` primitive, and has no Escape-key or focus-trap handling that `Modal.tsx` provides. Deferred: adopting the shared primitive is a moderate structural change beyond a presentation-only pass (user confirmed deferral). |
| DAF-011 | default | missed opportunity (exit) | low | defer-backlog | review-animations | `GroupCard.tsx:134-148`'s hover-reveal "ungroup" action button (`initial`/`animate`, no `exit`, no `AnimatePresence`) fades in on hover but snaps out instantly when hover ends. Low-traffic, hover-only; deferred rather than remediated now. |
| DAF-012 | default | missed opportunity | low | defer-backlog | review-animations | `GroupSuggestionModal.tsx:136-265`'s suggestion cards (`suggestions.map(...)`) have `initial`/`animate` but no `exit` and no `AnimatePresence` — a rejected suggestion vanishes instantly rather than exit-animating. Secondary surface, low frequency; deferred. |

`functionalRegressionCheck`: `npm run test:coverage` — 156 files / 2352 tests passing (prior 155/2347 + 5 new tests), zero regressions, coverage 60.76/82.01/71.69/60.76 (above the 50/78/64/50 floor). `npm run e2e -- retrospective-board.spec.ts card-lifecycle.spec.ts` — 35/35 passed on a clean run (including the previously environmentally-flaky `retrospective-board.spec.ts:937`).

## facilitator-controls-countdown (P1)

States reviewed: default, loading, empty, error

| ID | State | Category | Priority | Disposition | Skill Used | Resolution |
|----|-------|----------|----------|--------------|------------|------------|
| DAF-013 | default | interruptibility | high | remediate-now | review-animations | `FacilitatorMenu.tsx:249` — the **5th occurrence** of the `AnimatePresence`-boundary bug: `{isOpen && createPortal(<AnimatePresence>...)}` gated the whole portal (including `AnimatePresence`) on `isOpen`, removing it in one render pass before the exit animation could run. Fixed test-first (new test in `FacilitatorMenu.test.tsx`); `createPortal` now called unconditionally with `AnimatePresence` always mounted and `isOpen` gating only the `motion.div` child. |
| DAF-014 | default | physicality | high | remediate-now | review-animations | `FacilitatorMenuTabs.tsx:120` — tab badge used `initial={{ scale: 0 }}`, a direct "never scale(0)" violation. Changed to `scale: 0.9, opacity: 0`. Cosmetic-only, no new test needed. |
| DAF-015 | default | performance | medium | remediate-now | review-animations | `ControlsTab.tsx:172-177` — countdown progress bar animated `width` directly, re-triggering every second for the entire duration of an active countdown (a layout-triggering property on the highest-frequency animated element in this surface). Changed to `transform: scaleX()` with `origin-left`. Cosmetic-only (same visual result), no new test needed. |
| DAF-016 | default | purpose/frequency | medium | remediate-now | review-animations | `FacilitatorMenuTabs.tsx:81` — a decorative `animate-pulse` dot with no stated purpose, visible for the entire time the facilitator menu is open. Removed per the remedial hierarchy's first move (delete unjustified, high-visibility-duration decoration). |
| DAF-017 | default | interruptibility/cohesion | medium | remediate-now | review-animations | `ControlsTab.tsx` — four conditionally-rendered panels (timer-status, timer-creation, timer-controls, quick-presets) had `initial`/`animate` but no `exit` and no `AnimatePresence`, so switching timer states entered cleanly but exited with a hard cut. Each panel now wrapped in its own `AnimatePresence` with a matching `exit` (not a single shared `mode="wait"`, since these panels are not mutually exclusive — e.g. timer-status and timer-controls can both be visible simultaneously). Cosmetic-only, no new test needed. |

**Out of scope, noted for completeness**: `CountdownFeatureDemo.tsx` is unused dead code (not imported anywhere in `src`) — excluded from this audit as it is not a reachable user-facing surface. `FacilitatorMenuTabs.tsx`'s tab-content swap (`AnimatePresence mode="wait"` around a single re-keyed child), its `layoutId="activeTab"` spring indicator, `NotesTab.tsx` (all three `AnimatePresence` boundaries), and `TeamMoodTab.tsx`'s loading pulse/bounce were reviewed and confirmed already correct — no changes made.

`functionalRegressionCheck`: `npm run test:coverage` — 156 files / 2353 tests passing (prior 156/2352 + 1 new test), zero regressions, coverage 60.80/82.01/71.69/60.80 (above the 50/78/64/50 floor). `npm run e2e -- facilitator-countdown.spec.ts` — 1/1 passed on a clean run.

## participants (P1)

States reviewed: default, loading, empty, error

| ID | State | Category | Priority | Disposition | Skill Used | Resolution |
|----|-------|----------|----------|--------------|------------|------------|
| DAF-018 | default | interruptibility | high | remediate-now | review-animations | `ParticipantPopover.tsx:164` — the **6th occurrence** of the `AnimatePresence`-boundary bug: `{isOpen && createPortal(<AnimatePresence>...)}` gated the whole portal on `isOpen`. Fixed test-first (new test in `ParticipantPopover.test.tsx`); `createPortal` now called unconditionally with `AnimatePresence` always mounted and `isOpen` gating only the inner content. |
| DAF-019 | default | physicality | medium | remediate-now | review-animations | `ParticipantPopover.tsx:176` — the popover's scale/opacity animation had no `transform-origin` despite already computing its anchor side (`popoverPosition`: top/bottom/left/right) for positioning and its arrow direction. Added a `getOriginClass()` helper deriving the opposite-side Tailwind `origin-*` class from `popoverPosition`. Cosmetic-only, no new test needed. |
| DAF-020 | default | performance | low | remediate-now | review-animations | `CompactAvatarGroup.tsx:98` — `transition-all` on the "show all participants" trigger button; narrowed to `transition-[background-color]`, the only property that changes on hover. An existing test asserting the literal `transition-all` class was updated to match (presentational selector, per FR-010). |

**Out of scope, noted for completeness**: `CompactAvatarGroup.tsx:99`'s hardcoded Spanish title string bypassing i18next — same scope decision as clustering's DAF-009, deferred. `ParticipantList.tsx`, `UserAvatar.tsx`, and `ResponsiveParticipantDisplay.tsx` were reviewed and confirmed to need no motion/visual changes.

`functionalRegressionCheck`: `npm run test:coverage` — 156 files / 2354 tests passing (prior 156/2353 + 1 new test), zero regressions, coverage 60.83/82.05/71.73/60.83 (above the 50/78/64/50 floor). `npm run e2e -- concurrent-board-session.spec.ts concurrent-board-network.spec.ts` — 2/2 passed on a clean run.

## export (P1)

States reviewed: default, loading, error

| ID | State | Category | Priority | Disposition | Skill Used | Resolution |
|----|-------|----------|----------|--------------|------------|------------|
| DAF-021 | default | interruptibility | high | remediate-now | review-animations | `ImprovedExportPopover.tsx:198` — the **7th occurrence** of the `AnimatePresence`-boundary bug: `{isOpen && createPortal(<AnimatePresence>...)}` gated the whole portal on `isOpen`. Fixed test-first (new `ImprovedExportPopover.test.tsx`, created from scratch — no prior coverage existed); `createPortal` now called unconditionally with `AnimatePresence` always mounted and `isOpen` gating only the inner content. |
| DAF-022 | default | interruptibility/cohesion | medium | remediate-now | review-animations | `ImprovedExportPopover.tsx:452,463` — the error and success status messages had `initial`/`animate` but no `exit`, not wrapped in `AnimatePresence`, so they couldn't exit-animate when cleared/completed. Each now wrapped in its own `AnimatePresence` with a matching `exit`. Covered by the same new test file (behavior-adjacent to DAF-021's fix). |

**Out of scope, noted for completeness**: `DocxExporter.tsx` and `UnifiedExporter.tsx` are unused dead code (confirmed via import search — never referenced anywhere in `src`), excluded as unreachable surfaces, same treatment as `CountdownFeatureDemo.tsx` in facilitator-controls-countdown. `ExportButton.tsx`/`ExportButtonGroup.tsx` are thin wrappers with no motion of their own — reviewed, no changes needed. `ImprovedExportPopover.tsx`'s overlay is treated as modal-like (always horizontally centered, never computes a `triggerRect`) and is exempt from the `transform-origin` finding per the Standards' explicit modal exemption.

`functionalRegressionCheck`: `npm run test:coverage` — 157 files / 2358 tests passing (prior 156/2354 + 4 new tests), zero regressions, coverage 62.33/82.03/70.65/62.33 (above the 50/78/64/50 floor). `npm run e2e -- export.spec.ts accessibility.spec.ts` — 14/14 passed on a clean run, including the full accessibility suite (12 tests, both themes) confirming zero new WCAG 2.1 AA violations across everything User Story 1 touched — the US1 checkpoint accessibility check.

## landing (P2)

States reviewed: default, loading

| ID | State | Category | Priority | Disposition | Skill Used | Resolution |
|----|-------|----------|----------|--------------|------------|------------|
| DAF-023 | default | purpose/frequency, cohesion | medium | remediate-now | review-animations | 7 `motion.div` sections used `animate` with hardcoded mount-time delays (0 through 1.2s), so below-the-fold sections finished their entrance animation before any visitor had scrolled there. Converted all 7 to `whileInView={{opacity:1,y:0}} viewport={{once:true, margin:'-100px'}} transition={{duration:0.5}}`, dropping the shared mount-time clock in favor of each section animating independently when actually scrolled into view. Cosmetic-only, no new test needed; verified the existing `e2e/accessibility.spec.ts` CSS force-override (`[style*="opacity"] { opacity: 1 !important; }`) neutralizes both the old and new approach identically, so no test-timing update was needed there either. |
| DAF-024 | default | performance | low | remediate-now | review-animations | 9 identical `transition-all duration-300` instances on hover-shadow "glass" cards; narrowed to `transition-shadow duration-300` (the only property that changes on hover). Single `replace_all` since all 9 were the identical string in the identical context. |

**Out of scope, noted for completeness**: the `showProfileForm` state swap (sign-in view → first-time profile-setup view) has no bridging transition — a genuine missed opportunity, but fires once ever (first sign-in only); deferred rather than building new motion for it. `AuthButtonGroup.tsx`, rendered on this page, belongs to and is reviewed under the `auth-sign-in` surface per the `data-model.md` catalog, not here.

`functionalRegressionCheck`: `npm run test:coverage` — 157 files / 2358 tests passing (unchanged from export — cosmetic-only change, no new tests), zero regressions, coverage 62.35/82.06/70.65/62.35 (above the 50/78/64/50 floor). `npm run e2e -- authentication.spec.ts board-creation.spec.ts` — 10/10 passed; `accessibility.spec.ts` Landing tests (both themes) — 2/2 passed on a clean run.

## auth-sign-in (P2)

States reviewed: default, loading, error

| ID | State | Category | Priority | Disposition | Skill Used | Resolution |
|----|-------|----------|----------|--------------|------------|------------|
| DAF-025 | default | physicality | medium | remediate-now | review-animations | `UserProfileForm.tsx:52` — first-time welcome icon badge used `initial={{ scale: 0 }}`. Changed to `scale: 0.9, opacity: 0` (paired with `animate={{ scale: 1, opacity: 1 }}`). Cosmetic-only, no new test needed. |
| DAF-026 | default | cohesion (stagger) | low | remediate-now | review-animations | `AuthButtonGroup.tsx:79-83` — 2-3 sign-in provider buttons staggered at `delay: index * 0.1` (100ms/item), above the 30-80ms range. Changed to `Math.min(index * 0.06, 0.3)`. Cosmetic-only, no new test needed. |

**Out of scope, noted for completeness**: `AuthGuard.tsx`/`AuthWrapper.tsx` have no motion (pure logic/routing) — reviewed, no changes needed. `McpConsentScreen.tsx`'s single entrance animation was reviewed and confirmed already correct. `ConnectedAppsCard.tsx`/`LinkedProvidersCard.tsx` live in this directory but only render on `Profile.tsx` — deferred to the `profile` surface (US3) rather than reviewed out of context here.

`functionalRegressionCheck`: `npm run test:coverage` — 157 files / 2358 tests passing (unchanged — cosmetic-only, no new tests), zero regressions, coverage 62.35/82.04/70.65/62.35 (above the 50/78/64/50 floor). `npm run e2e -- authentication.spec.ts concurrent-signin.spec.ts` — 6/6 passed on a clean run.

## dashboard-board-list (P2)

States reviewed: default, loading, empty, error

| ID | State | Category | Priority | Disposition | Skill Used | Resolution |
|----|-------|----------|----------|--------------|------------|------------|
| DAF-027 | default | interruptibility | high | remediate-now | review-animations | `Dashboard.tsx`'s grid and list board maps had no `AnimatePresence` and no `exit` prop at all — deleting a board (a real, moderately-frequent dashboard action, on the app's highest-traffic surface) vanished it instantly. Fixed test-first (new test in `Dashboard.test.tsx`); both maps now wrapped in `AnimatePresence` with matching `exit` values. |
| DAF-028 | default | cohesion (stagger) | medium | remediate-now | review-animations | `Dashboard.tsx`'s grid stagger was `index * 0.1` (100ms/item) across up to 10 cards/page — up to 900ms before the last card started animating. Capped at `Math.min(index * 0.05, 0.3)`. The list stagger (`index * 0.05`) was already within range, left unchanged. |
| DAF-029 | default | interruptibility | high | remediate-now | review-animations | `JoinRetrospectiveModal.tsx:51` — `if (!isOpen) return null;` sat before any `AnimatePresence` existed anywhere in the file (only `motion` was imported), so the declared `exit` props (backdrop + dialog) were dead code with no mechanism to ever fire — an 8th occurrence of the same root bug, via its simplest manifestation. Fixed test-first (new test in `JoinRetrospectiveModal.test.tsx`); restructured to `<AnimatePresence>{isOpen && (...)}</AnimatePresence>`. |
| DAF-030 | default | physicality, performance | medium | remediate-now | review-animations | `BoardCard.tsx:117-123` — `whileHover={{y:-2}}` with no `whileTap` (the exact gap identified in the original T007 cross-cutting inventory, first reached here); `transition-all duration-300`. Added `whileTap={{scale:0.98}}` at the same card-level `whileHover` already lives at (for consistency); narrowed to `transition-[box-shadow,border-color] duration-300`. Cosmetic-only, no new test needed. |

**Out of scope, noted for completeness**: `BoardListItem.tsx`'s own entrance and `hover:shadow-md transition-shadow duration-200` were already correct — no changes. `BoardCard.tsx`'s delete-confirm ternary swap (two sibling `motion.div`s, no `AnimatePresence` between them) has no bridging cross-fade — a minor missed opportunity, deferred (occasional, single-card-scoped action). `BoardControlsBar.tsx`, `EditRetrospectiveModal.tsx`, `Pagination.tsx` have no motion at all.

`functionalRegressionCheck`: `npm run test:coverage` — 157 files / 2360 tests passing (prior 157/2358 + 2 new tests), zero regressions, coverage 63.25/81.53/69.84/63.25 (above the 50/78/64/50 floor). `npm run e2e -- dashboard-list.spec.ts dashboard-manage.spec.ts board-creation.spec.ts accessibility.spec.ts` — 21/21 passed on a clean run, including the full accessibility suite (12 tests, both themes) — zero new WCAG 2.1 AA violations across all of User Story 2.

## profile (P3)

States reviewed: default, loading, error

| ID | State | Category | Priority | Disposition | Skill Used | Resolution |
|----|-------|----------|----------|--------------|------------|------------|
| DAF-031 | default | interruptibility | medium | remediate-now | apple-design | `ConnectedAppsCard.tsx:72-115` (rendered on `Profile.tsx`) — the connected-app list had no `exit` and no `AnimatePresence`; revoking an app didn't animate it away. Fixed test-first (new test in `ConnectedAppsCard.test.tsx`); wrapped in `AnimatePresence` with a matching `exit`. |
| DAF-032 | default | craft (i18n consistency) | medium | defer-backlog | apple-design | `LinkedProvidersCard.tsx` (rendered on `Profile.tsx`) — the entire component's UI text (title, descriptions, both list sections, button labels, security notice) is hardcoded Spanish with no `useLanguage`/`useTranslation` at all, unlike its sibling `ConnectedAppsCard.tsx` in the same directory which is fully i18n'd. Larger than the single-string gaps deferred elsewhere (DAF-009); still out of scope for a presentation-only pass — deferred with user confirmation. |

**Out of scope, noted for completeness**: `Profile.tsx` itself was reviewed and found already correct — 4 clean entrance animations, no `AnimatePresence`/`scale(0)`/`transition-all` issues. No new test file was created for it since no changes were made (nothing to protect against regression). `ConnectedAppsCard.tsx`/`LinkedProvidersCard.tsx` live in `features/auth/components/` but only render here — reviewed under this surface per the deferral noted in `auth-sign-in`'s audit entry.

`functionalRegressionCheck`: `npm run test:coverage` — 157 files / 2361 tests passing (prior 157/2360 + 1 new test), zero regressions, coverage 63.25/81.53/69.84/63.25 (above the 50/78/64/50 floor). `npm run e2e -- profile.spec.ts` — 9/9 passed on a clean run.

## ui-kit-buttons-inputs (P3)

States reviewed: default

| ID | State | Category | Priority | Disposition | Skill Used | Resolution |
|----|-------|----------|----------|--------------|------------|------------|
| DAF-033 | default | performance | medium | remediate-now | review-animations | `Button.tsx:24` — `transition-all duration-200` on the shared `Button` primitive, the single most-used interactive component in the app (nearly every button on every surface renders through it). Narrowed to `transition-[background-color,opacity]` (the only properties that actually change: hover/active backgrounds, disabled opacity). Highest-leverage `transition-all` fix in the whole audit given its ubiquity. Cosmetic-only, no new test needed (no test asserted the literal class); full suite re-run to confirm zero regressions given the blast radius. |

**Out of scope, noted for completeness**: `Input.tsx`, `Textarea.tsx`, `TextareaWithEmoji.tsx` were reviewed and confirmed already correct — no `framer-motion`, correctly-scoped `transition-colors duration-200`, no changes needed. `Button.tsx`'s `whileHover`/`whileTap` were already correct (not `scale(0)`, disabled-aware).

`functionalRegressionCheck`: `npm run test:coverage` — 157 files / 2361 tests passing (unchanged — cosmetic-only, no new tests), zero regressions, coverage 63.25/81.53/69.84/63.25 (above the 50/78/64/50 floor). `npm run e2e -- card-lifecycle.spec.ts authentication.spec.ts board-creation.spec.ts` — a combined-batch run hit the same environmental flakiness documented under `retrospective-board` (a different board-creation template test failed on each of two batch runs); isolated re-runs of each spec file individually — 5/5 (`board-creation.spec.ts` alone) + 8/8 (`card-lifecycle.spec.ts` + `authentication.spec.ts` alone) — all 13 passed cleanly, confirming the fix is solid.

## ui-kit-overlays (P3)

States reviewed: default

| ID | State | Category | Priority | Disposition | Skill Used | Resolution |
|----|-------|----------|----------|--------------|------------|------------|
| DAF-034 | default | interruptibility | high | remediate-now | review-animations | `Modal.tsx:101` — the **10th occurrence** of the `AnimatePresence`-boundary bug, and the highest-leverage yet: this is the *shared base modal primitive* meant for composition. `if (!isOpen) return null;` skipped the whole `createPortal(<AnimatePresence>...)` tree in one step. Fixed test-first (new `Modal.test.tsx`, created from scratch — no prior coverage existed); restructured to `createPortal(<AnimatePresence>{isOpen && (...)}</AnimatePresence>, document.body)`. |
| DAF-035 | default | performance/cohesion | medium | remediate-now | review-animations | `Modal.tsx:194` — vestigial `transform transition-all` in the dialog's className, alongside `motion.dialog`'s own `initial`/`animate`/`exit` (which already drives opacity/scale/y via framer-motion inline styles, overriding any class-based transform). Removed both classes — framer-motion already owns this element's animation; the CSS transition was dead weight at best, a fighting-animation-systems risk at worst. Covered by the same `Modal.test.tsx`. |
| — | — | regression caught | — | fixed | — | Fixing DAF-034 surfaced that `BoardCard.test.tsx`'s local `framer-motion` mock never exported `AnimatePresence` (harmless before, since `Modal` used to early-return before ever reaching it via `EditRetrospectiveModal`) — the full suite re-run caught this immediately (21 failures), and the local mock was updated to export `AnimatePresence` (a passthrough, matching that file's existing style) plus `motion.dialog`. This is exactly the kind of test-infrastructure gap the full-suite-after-every-change discipline exists to catch. |

**Out of scope, noted for completeness**: `Portal.tsx` is a genuinely empty (0-byte), unused file — no consumer anywhere in `src`, excluded as unreachable. `LanguageMenuList.tsx`/`ThemeMenuToggle.tsx` reviewed and confirmed already correct — no motion, correctly-scoped `transition-colors`. `Modal.tsx`'s `popoverMode` `transform-origin` gap (deferred, see prior turn) not addressed this pass — lower priority than the interruptibility fix, and `popoverMode`'s actual positioning (`getPopoverStyle()`) turned out to be pre-existing dead code (defined but never wired to a `style` prop) — unrelated to this initiative, not touched.

`functionalRegressionCheck`: `npm run test:coverage` — 158 files / 2364 tests passing (prior 157/2361 + 3 new tests in `Modal.test.tsx`), zero regressions after fixing the `BoardCard.test.tsx` mock gap, coverage 63.56/81.58/69.98/63.56 (above the 50/78/64/50 floor). `npm run e2e -- facilitator-countdown.spec.ts dashboard-manage.spec.ts` — 3/3 passed on a clean run, including the board-rename flow which directly exercises `Modal.tsx` in a real browser.

## ui-kit-pickers (P3)

States reviewed: default

| ID | State | Category | Priority | Disposition | Skill Used | Resolution |
|----|-------|----------|----------|--------------|------------|------------|
| DAF-036 | default | interruptibility | high | remediate-now | review-animations | `EmojiPicker.tsx:141` — the **11th occurrence** of the `AnimatePresence`-boundary bug: `{isOpen && createPortal(<AnimatePresence>...)}` gated the whole portal (including `AnimatePresence` itself) on `isOpen`, so it was removed in the same render pass the exit should have played in. Fixed test-first (`EmojiPicker.test.tsx`: local `AnimatePresence` mock changed from a bare passthrough to a detectable marker, two new tests assert the marker stays mounted across the open/close transition); restructured to `createPortal(<AnimatePresence>{isOpen && (...)}</AnimatePresence>, document.body)`. |
| DAF-037 | default | performance | medium | remediate-now | review-animations | `ColorPicker.tsx:175,237` — two `transition-all duration-200` instances (color-swatch buttons and the trigger button), both only ever animating `transform` (hover/selected scale), `box-shadow`, and `border-color`. Narrowed to `transition-[transform,box-shadow,border-color] duration-200` at both call sites. Cosmetic class-only change; no new test required per the Tests policy, covered by the existing `ColorPicker.test.tsx`/`ColorPickerClean.test.tsx` regression suite. |
| DAF-038 | default | preventing-jarring-change | low | defer-backlog | review-animations | `ColorPicker.tsx:148-223` — the color-swatch popup uses no framer-motion at all, just `isOpen ? (<div>) : null` with a Tailwind entrance-only utility (`animate-in fade-in-0 zoom-in-95 duration-200`) and no exit counterpart — it disappears instantly instead of animating out. Lower priority than DAF-036/037 and structurally different from the `AnimatePresence` pattern used elsewhere; deferred per FR-009 self-governed prioritization, consistent with other structural-rebuild deferrals in this initiative (e.g. clustering's `GroupSuggestionModal`). |

**Out of scope, noted for completeness**: `DatePicker.tsx` reviewed and confirmed already correct — third-party `react-datepicker` wrapper, no framer-motion, correctly-scoped `transition-colors`, no changes needed.

`functionalRegressionCheck`: `npm run test:coverage` — 158 files / 2366 tests passing (prior 158/2364 + 2 new tests in `EmojiPicker.test.tsx`), zero regressions. `npm run e2e -- card-lifecycle.spec.ts` — 3/3 passed on a clean run, including the reaction-picker test which directly exercises `EmojiPicker.tsx` in a real browser.

## ui-kit-feedback (P3)

States reviewed: default, loading

| ID | State | Category | Priority | Disposition | Skill Used | Resolution |
|----|-------|----------|----------|--------------|------------|------------|
| DAF-039 | default | interruptibility | high | remediate-now | review-animations | `TypingPreview.tsx:41-43` — the **12th occurrence** of the `AnimatePresence`-boundary bug: `if (typingUsers.length === 0) return liveRegion;` skipped the entire `AnimatePresence` tree in one step, so the typing card's `exit` prop (opacity/y/scale) was dead code — it vanished instantly instead of animating out. Pre-existing since before feature 026, not something the recent flicker/race hotfixes (commits e9f00fb, b2631e7) relied upon — those fixed the *state layer* (`OptimizedTypingStatusService`/`useTypingStatus`), not this structural issue. Fixed test-first (`TypingPreview.test.tsx`: `AnimatePresence` mock changed from a bare passthrough to a detectable marker, 2 new tests); restructured to always render `<AnimatePresence>{typingUsers.length > 0 && (...)}</AnimatePresence>`, removing the early return. Given the file's recent fragility, verified with extra care: the full unit suite plus **all 8** typing-related e2e tests in `retrospective-board.spec.ts` (including the exact-timing flicker/disconnect/grace-period assertions from the two prior hotfixes) re-run clean. |

**Out of scope, noted for completeness**: `Loading.tsx` reviewed and confirmed already correct — all 3 variants (spinner/dots/pulse) are indeterminate loading indicators using GPU-only properties (`rotate`, `y`, `scale`+`opacity`), justified as continuous state indication, already covered by the root `MotionConfig reducedMotion="user"`. `Skeleton.tsx` reviewed and confirmed already correct — the base `Skeleton`'s Tailwind `animate-pulse` is an opacity-only animation (acceptable under reduced motion per the accessibility standard's "keep opacity/color, drop movement"); `CardSkeleton`'s entrance-only `motion.div` (no exit/`AnimatePresence`) is a minor missed-opportunity, not a violation of any of the Ten Non-Negotiable Standards — noted, not remediated, as it's a leaf component whose skeleton→content swap is governed by each consuming page (already covered by the retrospective-board/dashboard-board-list audits).

`functionalRegressionCheck`: `npm run type-check` and lint clean. `npm run test:coverage` — 158 files / 2368 tests passing (prior 158/2366 + 2 new tests in `TypingPreview.test.tsx`), zero regressions. `firebase emulators:exec --project demo-retrorocket --only auth,firestore "npx playwright test retrospective-board.spec.ts -g 'typing'"` — 8/8 passed on a clean run, covering the exact flicker/timing/grace-period/disconnect scenarios the two recent hotfixes (026, 027) were written to guard.

## ui-kit-misc (P3)

States reviewed: default

| ID | State | Category | Priority | Disposition | Skill Used | Resolution |
|----|-------|----------|----------|--------------|------------|------------|
| DAF-040 | default | performance | high | remediate-now | review-animations | `designSystem.ts:150` (`animations.default`) and `:196` (`interactiveStates.cardHover`) — two more `transition-all` escalation triggers, this time in shared design-system tokens rather than a single component's className, so the fix has a wider blast radius than usual. `animations.default` (used by `Card.tsx` and `MobileColumnNavigation.tsx`) only ever changes `background-color`/`border-color`/`box-shadow`/`transform`/`color` across its two consumers; narrowed to `transition-[background-color,border-color,box-shadow,transform,color]`. `interactiveStates.cardHover` (`Card.tsx` only) only changes `box-shadow`/`transform`; narrowed to `transition-[box-shadow,transform]`. `Card.test.tsx`'s literal `transition-all` class assertion updated to match. |
| DAF-041 | default | simplification | low | fixed | review-animations | `Card.tsx:68` — the CSS `hover:-translate-y-1` utility (applied when the `hover` prop is set) was dead code: `motionProps`'s `whileHover={{ y: -2 }}` (framer-motion) writes directly to the element's inline `style.transform`, which always wins over a stylesheet rule regardless of specificity, so the Tailwind class never actually took effect. Removed the redundant class; the framer-motion `whileHover` remains the single source of truth for the hover lift. |
| DAF-042 | default | physicality | high | remediate-now | review-animations | `ThemeToggle.tsx:56,72` — the sun/moon icon swap on theme toggle animated `scale: isDark ? 0 : 1` (and inverse) with no accompanying `opacity` — a direct instance of the hard `scale(0)` violation ("nothing appears from nothing"), made more visible here since it's the *only* channel of the transition (no fade to soften it). Fixed by capping the minimum scale at `0.5` and adding a paired `opacity: 0`/`1` on each icon, so the collapsing icon fades out as it shrinks rather than visually vanishing at a hard zero. |
| DAF-043 | default | performance | high | remediate-now | review-animations | `ThemeToggle.tsx:47` and `LanguageSelector.tsx:110` — two more `transition-all duration-200` instances. `ThemeToggle.tsx`'s trigger button only changes `background-color` (hover) and the focus-visible ring's `box-shadow`; narrowed to `transition-[background-color,box-shadow]`. `LanguageSelector.tsx`'s trigger button only changes `color` and `background-color` on hover; narrowed to `transition-[color,background-color]`. |
| DAF-044 | default | physicality/origin | medium | remediate-now | review-animations | `LanguageSelector.tsx:76` — the language dropdown had no `transform-origin`, defaulting to center despite being a trigger-anchored popover (same broad finding as the pre-existing "Physicality & origin" backlog item covering `CardMenu.tsx`/`ColumnHeaderMenu.tsx`/`ParticipantPopover.tsx`/etc.). Added a `dropdownOrigin` state (`'top right'` in the common right-aligned case, `'top left'` when position calculation falls back to left-alignment near the viewport edge) applied via `style.transformOrigin`, following the same pattern used for `ParticipantPopover.tsx`'s `getOriginClass()`. Test-first: 2 new tests in `LanguageSelector.test.tsx` (confirmed red — `transformOrigin` was `undefined` pre-fix — then green). |

**Out of scope, noted for completeness**: `ControlCard.tsx`, `SettingsRow.tsx`, and `LinkifyText.tsx` reviewed and confirmed already correct — no motion, no `transition-all`, correctly-scoped `transition-colors` on `LinkifyText.tsx`'s links. `LanguageSelector.tsx`'s `AnimatePresence`/`createPortal` structure (line 118) was already correct on inspection — `createPortal` is gated only by the SSR-safety check `typeof document !== 'undefined'` (effectively always true client-side), not by `showDropdown`, so `AnimatePresence` stays mounted and only its computed `dropdownContent` child toggles — the pattern every other fix in this initiative converges on, already present here. Discovered while extending `accessibility.spec.ts` (T052): `LanguageSelector.tsx` has zero consumers anywhere in `src` — dead code, unreachable via any route, same class of finding as `Portal.tsx` in `ui-kit-overlays`. The fixes above remain valid source-level improvements (type-checked, unit-tested), but could not be added to an e2e/axe scan since no live DOM path renders the component.

`functionalRegressionCheck`: `npm run type-check` and lint clean (one pre-existing unrelated `viewportWidth` unused-var warning in `LanguageSelector.tsx`, not introduced by this pass). `npm run test:coverage` — 158 files / 2370 tests passing (prior 158/2368 + 2 new tests in `LanguageSelector.test.tsx`), zero regressions. `firebase emulators:exec --project demo-retrorocket --only auth,firestore "npx playwright test profile.spec.ts dashboard-list.spec.ts accessibility.spec.ts"` — 23/23 passed, including the full `accessibility.spec.ts` WCAG 2.1 AA suite (light + dark) as an early incremental check ahead of the Polish-phase full run.
