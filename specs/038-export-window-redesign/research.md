# Phase 0 Research: Export Window Redesign

**Input**: `plan.md` Technical Context, `spec.md` (including the 2026-08-11
clarifications on desktop anchor/transition mechanics and dismiss-during-
export behavior)

## 1. The non-adaptive gap — confirmed, not assumed

**Finding**: `ImprovedExportPopover.tsx` renders unconditionally as a
`fixed inset-0` overlay with a `motion.div` panel styled `w-96 max-w-[95vw]`
positioned via `items-start justify-center pt-20` (lines 207-229) — the same
markup at every viewport width, with no `md:`-scoped alternative anywhere in
the file. Its only two call sites are `RetrospectiveTopbar.tsx` (both the
desktop options-dropdown "Export" item and the mobile options-sheet "Export"
item call the same `setShowExportPopover(true)`, lines 79/234-244) and the
orphaned `ExportButton.tsx`, which is not imported by any route or component
in the app (`grep` for its import outside its own file and tests returns
nothing). This confirms the spec's premise directly from source: unlike the
options and facilitator menus (feature 036), which already split into a
desktop-anchored panel and a mobile `BottomSheet`, the export window they
both open into has never had that split.

**Decision**: `ExportButton.tsx` is out of scope for this feature (Principle
V/Simplicity — no confirmed requirement touches it, since nothing renders
it). It is left as-is; if it is ever wired up, its own trigger button will
need a `useBoardMenuOverlay` reference matching whatever anchors it, but
that is a future feature's concern, not this one's.

## 2. Desktop anchor/transition mechanics (FR-002, resolved by clarification)

**Finding**: `RetrospectiveTopbar.tsx` already calls `useBoardMenuOverlay()`
once for the options panel, whose returned `refs.setReference` is attached
to the "Options" trigger button (line 123). `useBoardMenuOverlay` accepts no
external-reference option today — each call creates its own internal
`useFloating()` instance with its own `refs` object. Floating UI supports
multiple independent `useFloating` instances each calling `setReference` on
the *same* DOM node without conflict — each instance tracks its own
`floatingStyles`/`context` keyed off whatever node was last passed to that
instance's own `setReference`, so there is no shared mutable state to
collide.

**Decision**: `RetrospectiveTopbar.tsx` gains a second `useBoardMenuOverlay`
call (`role: 'dialog'`, matching `FacilitatorMenu.tsx`'s own panel role) for
the export panel, whose `refs.setReference` is attached to the *same*
"Options" trigger button via a merged ref callback (both
`optionsRefs.setReference` and `exportRefs.setReference` invoked from one
`ref={...}` prop on the single button element). The options item's
`onClick` becomes `() => { setOptionsOpen(false); setExportOpen(true); }`
instead of the current `setShowExportPopover(true)` — closing the options
panel and opening the export panel from the same trigger, per the
clarification. `ImprovedExportPopover.tsx` itself stops managing its own
click-outside/Escape/portal logic (currently hand-rolled, lines 98-153) and
instead receives its open state and Floating UI plumbing (`context`, `refs`,
`floatingStyles`, `getFloatingProps`) as props from `RetrospectiveTopbar.tsx`,
matching how `FacilitatorMenuTabs.tsx` is a pure content component driven by
`FacilitatorMenu.tsx`'s own hook call.

**Rationale**: This is the smallest change that satisfies the clarification
exactly as recorded — no new always-visible export trigger, one hook
instance per rendered panel (avoiding `useBoardMenuOverlay`'s single-`open`-
state model from having to represent two mutually-exclusive-but-distinct
panels as one boolean), and it deletes rather than duplicates the ad hoc
outside-click/Escape logic `ImprovedExportPopover.tsx` currently hand-rolls,
which predates `useBoardMenuOverlay`'s introduction in feature 034.

**Alternatives considered**: Keeping `ImprovedExportPopover.tsx`'s own
hand-rolled outside-click/Escape/portal logic and merely repositioning it
near the trigger with manual coordinate math — rejected: it would duplicate
logic `useBoardMenuOverlay` already centralizes (dismissal, ARIA role,
viewport-aware `flip`/`shift`/`size` middleware), the exact anti-pattern
feature 033/036 already consolidated away for the other four board menus/
popovers (per `useBoardMenuOverlay.ts`'s own doc comment).

## 3. Mobile presentation (FR-003) — reuse `BottomSheet` unchanged

**Finding**: `BottomSheet.tsx` (introduced in feature 036) is already a
generic, reusable primitive — `open`/`onClose`/`title`/`heightClass`/
`children` — with no menu-specific logic baked in. It already handles
portaling to `document.body` (required because `Header.tsx`, which hosts
`RetrospectiveTopbar`, applies `backdrop-blur-md`, and `backdrop-filter`
establishes a new containing block for `position: fixed` descendants — the
exact bug feature 036 found and fixed for the options/facilitator mobile
sheets), Escape dismissal, body-scroll lock, and an always-visible close
button (not swipe-only, so it stays keyboard/switch-control-operable).

**Decision**: Reuse `BottomSheet.tsx` directly for the export window's
mobile presentation — no new component, no fork. `RetrospectiveTopbar.tsx`
gains its own `exportSheetOpen` boolean (independent from the options
sheet's `sheetOpen`, and independent from the desktop `exportOpen` from §2),
wrapping the same export-form content component both presentations share.

**Critical constraint carried forward from feature 036** (found there via a
real failing test, re-confirmed applicable here by inspection before this
file was written): the mobile sheet's open state MUST NOT be shared with
the desktop panel's `useBoardMenuOverlay`-driven `open` state. `useDismiss`
(used internally by `useBoardMenuOverlay`) treats any press outside the
Floating UI floating element's own DOM subtree as an outside press —
including a press *inside* the separately-portaled `BottomSheet` — which
would close (and unmount) the sheet before its own `onClick` handler fires.
`RetrospectiveTopbar.tsx` already carries this exact lesson in its own doc
comment for the options menu (lines 43-51); the export panel's own
`exportOpen`/`exportSheetOpen` pair MUST follow the same independent-state
pattern.

## 4. Export-job lifecycle decoupling (FR-007a, resolved by clarification)

**Finding**: `useUnifiedExport()` is currently called *inside*
`ImprovedExportPopover.tsx` itself (line 58) — its `isExporting`/`progress`/
`error`/`success` state is local to that component instance. If the export
window's mount state (desktop panel open/closed, or mobile sheet open/
closed) is what determines whether this component exists, dismissing the
window during an export would unmount the very state holder tracking that
export's progress, silently losing it — the opposite of what FR-007a
requires.

**Decision**: Move the `useUnifiedExport()` call up to
`RetrospectiveTopbar.tsx`, which already owns the export window's open
state today (`showExportPopover`) and does not itself unmount when the
window closes (it persists for the lifetime of the retrospective route).
The export-form content component (desktop panel and mobile sheet both)
receives `isExporting`/`progress`/`error`/`success` and the `exportRetrospective`
handler as props, exactly as it already receives `retrospective`/`cards`/
`groups`/etc. A `useEffect` in `RetrospectiveTopbar.tsx` watches the
`success`/`error` transitions from this lifted hook: if the export panel/
sheet is not open when a transition to `success` or `error` occurs, a
`toast.success`/`toast.error` (via `react-hot-toast`, already imported and
used in this exact file for copy-ID/share/exit confirmations) surfaces the
outcome; if the panel/sheet *is* open, the existing in-panel success/error
UI handles it as today, and no duplicate toast fires.

**Rationale**: No new dependency, no new state-management pattern — this is
the same "lift state to the nearest already-persistent ancestor" move
`RetrospectiveTopbar.tsx` already applies to `showExportPopover` itself, and
`react-hot-toast` is already the project's established mechanism for
transient one-off confirmations in this exact component.

**Alternatives considered**: A dedicated export-job context/provider
spanning the whole app — rejected as unnecessary generality (Principle
V/YAGNI): `RetrospectiveTopbar.tsx` is already the closest common ancestor
of both the desktop and mobile export entry points and already outlives the
window's own mount state for the entire retrospective session, so no
broader mechanism is needed to satisfy FR-007a as scoped.

## 5. Motion decisions (per `animate` skill, Constitution Principle IX)

- **Desktop panel open/close**: Match `FacilitatorMenu.tsx`'s existing,
  proven-correct pattern exactly — a positioning wrapper carrying Floating
  UI's `ref`/`style` (never a `motion.div`, since Framer Motion's own
  `animate`/`exit` writes its own `transform` and would silently overwrite
  Floating UI's positioning transform, pinning the panel to the viewport's
  top-left corner — the exact regression class fixed in feature 034,
  `363815a`), with a *nested* `motion.div` carrying `initial`/`animate`/
  `exit` (opacity/y). This redesign MUST NOT reintroduce that bug.
- **Mobile sheet open/close**: Already implemented, unchanged, by
  `BottomSheet.tsx` — no new motion decision needed here.
- **State transitions (idle → exporting → success/error)**: Currently
  hard-cut (conditional rendering with no transition) inside
  `ImprovedExportPopover.tsx`'s status-message blocks, which already use
  `AnimatePresence` + `motion.div` for the error/success banners (lines
  460-492, added in feature 028's design audit). Whether the format-grid →
  progress → outcome transition itself deserves additional motion beyond
  the existing banner fade-in is a `find-animation-opportunities`-skill
  question, evaluated during Phase 1/implementation, not pre-decided here.
- **Reduced motion**: `MotionConfig reducedMotion="user"` already wraps the
  whole app (`App.tsx`); any `motion.*` component built via the same
  pattern already honors `prefers-reduced-motion` for free.

## 6. Closing the export-window accessibility-coverage gap

**Finding**: `e2e/accessibility.spec.ts` opens the export dialog in two
existing tests (`page.getByRole('dialog')` after clicking the "Exportar"
menu item, both desktop-keyboard and touch variants) but never runs
`expectNoViolations` against its open state, in either theme or at a mobile
viewport width — unlike the options/facilitator mobile sheets, which
already have dedicated `expectNoViolations` coverage (`options menu mobile
sheet`, `facilitator menu mobile sheet, Controls/Notes tab`, lines
748/766/770). This is a genuine, pre-existing gap this feature must close,
not an omission this feature is merely preserving.

**Decision**: Add `expectNoViolations` coverage for the export window's
populated state in both themes, at both a desktop and a mobile viewport
width (the latter has no coverage at all today, since the window itself had
no mobile-specific presentation to test), plus a scan of its exporting/
success/error states where feasible without flaking on real network/file
I/O timing.

## 7. Existing test surfaces this feature touches (impact scan)

- `e2e/export.spec.ts`: drives the flow via `page.getByRole('button', {
  name: 'Exportar PDF' })` / role-based selectors and a `button[title="Cerrar"]`
  close button — none of these depend on the dialog's screen position, so
  they should keep passing once the panel is anchored instead of centered;
  verified structurally compatible, re-run required once implemented.
- `src/test/features/boards/export/ImprovedExportPopover.test.tsx`: mounts
  the component directly with `isOpen`/`onClose` props — will need updating
  to reflect the component's new prop shape (Floating UI plumbing passed in
  rather than self-managed) per §2/§4 above; this is an intentional
  structural change, not a coverage loss (FR-014).
- `src/test/pages/RetrospectiveTopbar.test.tsx`: exercises the "Export"
  options-item click flow; needs a new assertion path for the
  close-options-then-open-export-panel transition (§2) and, if reasonable
  to unit-test, the dismiss-during-export-doesn't-cancel behavior (§4) —
  the rest is covered end-to-end instead per Constitution Principle VII.

## 8. Visual direction exploration process (FR-013)

**Decision**: Reuse features 033/036's established process rather than
inventing a new one — a dev-only route scaffold
(`import.meta.env.DEV`-gated) mounts 2-3 candidate export-window variants
side by side against real board data, each committing to both its
desktop-anchored-panel and mobile-bottom-sheet presentation (a candidate
that only addresses one is incomplete), built via `apple-design`/
`emil-design-eng` (the `prototype` skill named by Constitution Principle IX
is not installed in this environment, substituted per the precedent in
features 029/031/033/036), compared in both themes at both viewport
classes, and presented to the product owner as a single reviewable
comparison artifact with captures. Exactly one is selected; the rest are
recorded `rejected` with a `rejectionReason` in `data-model.md`.

## Summary of resolved unknowns

| Unknown | Resolution |
|---|---|
| Does the export window already have any viewport-adaptive presentation to extend? | No — confirmed absent by direct source inspection (§1); `ExportButton.tsx`, its only other call site, is unused and out of scope |
| How does the export panel anchor to a trigger it doesn't own? | A second `useBoardMenuOverlay` instance in `RetrospectiveTopbar.tsx`, its `refs.setReference` merged onto the same "Options" button (§2) |
| Does the mobile presentation need a new component? | No — reuse `BottomSheet.tsx` unchanged, with its own independent open state per the feature-036-established constraint against sharing state with the desktop `useBoardMenuOverlay` instance (§3) |
| Where does the export job's state need to live to survive window dismissal (FR-007a)? | Lifted from `ImprovedExportPopover.tsx` to `RetrospectiveTopbar.tsx`, with completion surfaced via the window (if open) or a `react-hot-toast` notification (if not) (§4) |
| How should new/changed motion be decided? | Desktop panel reuses `FacilitatorMenu.tsx`'s proven-correct nested-`motion.div` pattern; mobile sheet motion is already handled by `BottomSheet.tsx`; state-transition motion is a `find-animation-opportunities` question at Phase 1 (§5) |
| Is there an accessibility test-coverage gap for the export window's own states/viewports? | Yes, confirmed — no axe scan of its open state exists today, in either theme or at a mobile viewport (§6) |
| What existing tests does this feature touch, and how? | `e2e/export.spec.ts` (should keep passing as-is), `ImprovedExportPopover.test.tsx` and `RetrospectiveTopbar.test.tsx` (intentional structural updates, no coverage loss) (§7) |
| What process produces and reviews the 2-3 visual directions? | Features 033/036's established dev-route-scaffold + comparison-artifact + product-owner-approval process, reused as-is (§8) |
