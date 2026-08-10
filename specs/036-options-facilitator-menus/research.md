# Phase 0 Research: Options Menu & Facilitator Menu Redesign

**Input**: `plan.md` Technical Context, `spec.md` (including the 2026-08-10
clarification on mobile reachability)

## 1. The mobile-reachability gap (FR-013a) — confirmed, not assumed

**Finding**: `RetrospectiveTopbar.tsx` (which hosts both the options menu
trigger/panel and mounts `FacilitatorMenu`) opens its root `<div>` with
`className="hidden md:flex ..."` (line 81) and its "no retrospective data
yet" placeholder branch does the same (line 67). `Header.tsx` renders
`RetrospectiveTopbar` unconditionally for any `/retro/:id` or
`/retrospective/:id` route (lines 101-102) with no alternate mobile branch.
A repo-wide search for a mobile counterpart (`md:hidden`, "mobile") anywhere
under `src/features/boards/retrospective`, `src/features/boards/countdown`,
`src/features/boards/facilitator`, `src/pages/RetrospectivePage.tsx`, or
`Header.tsx` returns nothing. `RetrospectiveBoard.tsx` even carries a comment
("Controls row: facilitator-only controls moved to FacilitatorMenu") noting
those controls now live exclusively inside a component that is itself
unreachable below `md`. This confirms FR-013a's premise directly from source,
not by inference.

**Decision**: Treat this as in-scope new work per the clarification, not a
pre-existing condition to merely preserve.

**Tablet clarification**: FR-013 names three target viewport classes —
mobile, tablet, and desktop. Tablet is not treated as a third, distinct
presentation in this feature: the existing `md` (~768px) breakpoint already
buckets tablet widths together with desktop for this topbar, so a tablet
viewport receives the same (redesigned) desktop-anchored menu presentation
as desktop, not the new mobile entry point from §2. No separate
tablet-specific task or test is needed as a result — `tasks.md`'s
mobile-width and desktop-width coverage together already exercise both
sides of the one breakpoint tablet falls on.

## 2. Mobile entry-point interaction pattern

**Decision**: Defer the *specific* mechanism to the FR-015 visual-direction
exploration (each of the 2-3 candidates proposes its own mobile pattern,
compared side by side), but constrain the option space up front to
Apple HIG's own vocabulary for exactly this situation — presenting a set of
actions or a multi-section control surface on a compact width — so the
directions explored are genuinely HIG-grounded rather than arbitrary:

- **Popover/menu, scaled down**: keep the existing `useBoardMenuOverlay`
  anchored-panel pattern, but let Floating UI's already-present `flip`/
  `shift`/`size` middleware (see `useBoardMenuOverlay.ts` lines 99-111)
  reflow it to fit a narrow viewport — no new component, only new trigger
  placement/visibility.
- **Sheet**: a panel that slides up from the bottom edge and can be
  dismissed by drag or a close affordance — HIG's standard mobile pattern
  for presenting a bounded set of options or a multi-section control
  surface without leaving the current context. Best fit for the
  facilitator menu's 4-tab structure, which is too content-dense for a
  compact popover on a narrow screen.
- **Full-screen cover**: for the facilitator menu specifically, if a
  candidate direction judges the 4-tab content too dense even for a sheet,
  a full-screen presentation (dismissible via an explicit close action) is
  the HIG fallback for genuinely complex, multi-section content on compact
  width.

**Rationale**: All three are legitimate, named HIG presentation patterns
(not implementation-detail freelancing), so constraining candidates to
choosing among them keeps FR-015's exploration meaningfully bounded while
leaving real room for genuine visual/structural distinction between
candidates (a requirement of the visual-direction contract, see
`contracts/visual-direction-review-contract.md`).

**Alternatives considered**: A native `<dialog>`-based approach was
considered but rejected as a starting constraint — `Modal.tsx` already
demonstrates the project's established pattern of `motion.dialog` + Framer
Motion entrance/exit + `createPortal`, which any of the three options above
can still build on for the mobile panel's own presentation; native
`<dialog>` semantics are not a differentiator worth constraining candidates
around.

## 3. Extending vs. forking `useBoardMenuOverlay`

**Decision**: Extend `useBoardMenuOverlay` (e.g. a new `presentation:
'anchored' | 'sheet' | 'fullscreen'` option, or a viewport-aware internal
switch) rather than forking a separate hook for the mobile case, if the
selected direction needs materially different positioning/dismissal
behavior on mobile than the existing anchored-popover behavior already
provides.

**Rationale**: The hook already centralizes outside-press/Escape dismissal
(`useDismiss`) and ARIA role assignment (`useRole`) for both existing menus
plus the card menu and column header menu (per its own doc comment,
`useBoardMenuOverlay.ts` lines 60-64). Forking would duplicate that
dismissal/ARIA logic for a third time, which Constitution Principle V
(Simplicity/YAGNI) and the precedent set by feature 033 (which *consolidated*
four ad hoc positioning implementations onto this one hook) both argue
against. If the selected mobile pattern's positioning genuinely doesn't fit
Floating UI's anchored-placement model (e.g. a true bottom sheet has no
"trigger-relative placement" — it's viewport-relative), the hook's
`floatingStyles`/`context` can be bypassed for that specific presentation
mode while still reusing its `open`/`setOpen`/dismiss/ARIA plumbing.

**Alternatives considered**: A wholly separate `useMobileMenuOverlay` hook —
rejected per the rationale above unless Phase 1 prototyping proves the
anchored-positioning internals are actively harmful (not just unused) for
the sheet/full-screen cases, in which case this decision is revisited and
the reason recorded in `data-model.md`.

## 4. Motion decisions (per `animate` skill, Constitution Principle IX)

Each new or changed animated interaction is a decision, not a default:

- **Options menu / facilitator menu open-close (desktop/tablet, existing)**:
  Preserve the current pattern exactly — a positioning wrapper (Floating
  UI's `ref`/`style`) with a *nested* `motion.div` carrying the
  `initial`/`animate`/`exit` transform (opacity/y/scale), never the
  positioning wrapper itself. Both `RetrospectiveTopbar.tsx` (lines
  120-128) and `FacilitatorMenu.tsx` (lines 180-187) carry explicit
  in-code warnings against re-merging these, since feature 034 shipped a
  real bug fix (`363815a`) for exactly this class of mistake (Framer
  Motion's own `transform` silently overwriting Floating UI's positioning
  transform, pinning the panel to the viewport's top-left corner). This
  redesign MUST NOT reintroduce that regression.
- **New mobile entry-point open/close**: A new decision, made via the
  `animate` skill during Phase 1/implementation — sheet-slide-up or
  full-screen-cover transitions have their own established motion
  vocabulary (see `animation-vocabulary` skill if precise naming is needed
  when documenting the choice), distinct from the existing anchored-popover
  fade/scale.
- **Facilitator tab switching**: Currently instant (no transition on
  `activeTab` change in `FacilitatorMenuTabs.tsx`). Whether tab-switch
  content deserves a transition is a `find-animation-opportunities`-skill
  question, not an assumed yes — evaluated during Phase 1, not pre-decided
  here.
- **Reduced motion**: `MotionConfig reducedMotion="user"` already wraps the
  whole app (`App.tsx`), so any `motion.*` component built via the same
  pattern already honors `prefers-reduced-motion` for free; this remains
  true for whatever the new mobile entry point uses, provided it stays
  within the `framer-motion` foundation rather than introducing a
  motion library that doesn't respect that global config.

## 5. Visual direction exploration process (FR-015)

**Decision**: Reuse feature 033's established process rather than inventing
a new one:

1. A dev-only route scaffold (`import.meta.env.DEV`-gated, per
   `contracts/visual-direction-review-contract.md`) mounts 2-3 candidate
   variants of both menus side by side against real board data via
   `useBoardData`, so functional completeness is genuinely demonstrated,
   not mocked.
2. Each candidate is built using `apple-design`/`emil-design-eng` (see
   Constitution Check note below on tooling substitution), covering both
   the desktop/tablet redesign and its own answer to §2's mobile
   entry-point pattern choice — a candidate is not "done" until it commits
   to one specific choice for mobile.
3. Candidates are compared in both themes and at mobile + desktop viewport
   widths, screenshotted, and published as a single reviewable comparison
   artifact.
4. The product owner selects exactly one; the rest are recorded as
   `rejected` with a `rejectionReason` in `data-model.md`, matching the
   precedent in features 029/031/033.
5. Non-selected candidate files are deleted after selection (keeping the
   selected one unrouted as a build reference until superseded), matching
   033's T011 precedent.

**Tooling note**: as recorded in `plan.md`'s Constitution Check, the
`prototype` skill named by Constitution Principle IX / FR-015 is not
installed in this environment. Per the precedent established in features
029, 031, and 033, `apple-design`/`emil-design-eng` are substituted for
building the real, interactive candidate directions. This substitution MUST
be explicitly acknowledged by the product owner alongside their direction
selection (same as every prior redesign in this series).

## 6. Closing the mobile-viewport accessibility-coverage gap

**Finding**: `e2e/accessibility.spec.ts` has no existing mobile-viewport
coverage of `RetrospectiveTopbar`/`FacilitatorMenu` — because nothing was
reachable there to cover. This is a genuine, new coverage gap this feature
must close (not an omission carried over silently), since FR-013a makes
both menus reachable on mobile for the first time and SC-002/SC-008 require
WCAG 2.1 AA conformance and full capability reachability there.

**Decision**: Add mobile-viewport (e.g. Playwright's built-in mobile device
emulation, consistent with how `e2e/accessibility.spec.ts` already emulates
`prefers-reduced-motion` and viewport sizes elsewhere in the suite) coverage
of: opening the new mobile entry point for both menus, running an axe-core
scan against each open state, and confirming every FR-002/FR-004 through
FR-007 capability is reachable and completable through it.

## 7. Apple HIG component vocabulary relevant to this feature (reference inventory)

For grounding the `apple-design`/`emil-design-eng` skill work, the directly
relevant HIG concepts for this feature are: **Menus** (the options menu's
existing desktop/tablet dropdown), **Popovers** (the facilitator menu's
existing anchored panel), **Sheets** and **Action Sheets** (candidate mobile
patterns, §2), **Tab Bars** (the facilitator menu's internal 4-tab
structure, already rebuilt onto a real ARIA tablist under feature 033 and
preserved here), and **Toolbars** (the topbar hosting both triggers).
Clarity/deference/depth remain the three guiding principles carried forward
unchanged from feature 033's research.

## Summary of resolved unknowns

| Unknown | Resolution |
|---|---|
| Does a mobile entry point for these menus already exist anywhere to extend? | No — confirmed absent by direct source inspection (§1) |
| What interaction pattern(s) should the FR-015 candidates explore for the new mobile entry point? | Constrained to HIG's popover/menu, sheet, and full-screen-cover vocabulary (§2) |
| Should the mobile case fork a new overlay hook or extend the existing one? | Extend `useBoardMenuOverlay`, forking only if prototyping proves the anchored-positioning internals are actively harmful for the chosen pattern (§3) |
| How should new motion (mobile entry/exit, possible tab-switch transition) be decided? | Per-decision via the `animate`/`find-animation-opportunities` skills at Phase 1/implementation time, not pre-decided here (§4) |
| What process produces and reviews the 2-3 visual directions? | Feature 033's established dev-route-scaffold + comparison-artifact + product-owner-approval process, reused as-is (§5) |
| Is there an accessibility test-coverage gap for the new mobile reachability? | Yes, genuinely new (nothing existed to cover before) — closed via new mobile-viewport `accessibility.spec.ts` coverage (§6) |
