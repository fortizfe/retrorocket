# Design Review: Retrospective Board Redesign

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Purpose**: Structured review of the shipped implementation (selected
Direction C — "Layered Depth") against Apple Human Interface Guidelines
principles (clarity, deference, depth), per SC-005. Closes with zero
unresolved high-priority findings, as required to consider this feature's
design work complete.

**Reviewed**: 2026-08-09, against the implementation on branch
`033-retro-board-redesign` — `RetrospectiveBoard.tsx`, `GroupableColumn.tsx`/
`GroupCard.tsx`, `DraggableCard.tsx`/`DragDropColumn.tsx`,
`RetrospectiveTopbar.tsx`, `ImprovedExportPopover.tsx`, `CardMenu.tsx`,
`ColumnHeaderMenu.tsx`, `FacilitatorMenu.tsx`/`FacilitatorMenuTabs.tsx`,
`CountdownTimer.tsx`, `ActionItemsColumn.tsx`/`ActionItemCard.tsx`, and the
sentiment/team-mood display components.

## Clarity

Clarity asks: is the content and its hierarchy immediately legible, and does
every element earn its place?

- **Column identity is carried by a consistent accent, not a wall of color.**
  `RetrospectiveBoard.tsx`'s `COLUMN_ACCENT` map ties each column's semantic
  role (helped/hindered/improve/action) to a quiet tinted-gradient panel
  (`bg-gradient-to-b {accent} to-surface-raised/30`) — the identity is
  legible at a glance without the saturated, competing header bars a
  clarity-forward alternative (the rejected Direction B) would have used.
- **Controls are honestly shown, not hidden behind a gesture.** Every card
  action (edit, delete, convert-to-action, the drag handle) is
  unconditionally rendered — no `opacity-0 group-hover:opacity-100` gating.
  This was not the starting state: T021/T024/T048's rebuilds each found and
  fixed real hover-only controls, and one (`GroupCard`'s disband button) was
  worse than merely hidden — it was absent from the DOM entirely
  (`isHovered &&`), unreachable to keyboard or touch users no matter how
  they navigated. What ships now states plainly what's available, which is
  what clarity actually asks for — visibility isn't clutter when it removes
  ambiguity about what the interface can do.
- **The facilitator's tab bar is a real, legible structure, not a row of
  ambiguous icons.** `FacilitatorMenuTabs.tsx` was rebuilt onto a genuine
  WAI-ARIA tabs pattern (`role="tablist"`/`"tab"`/`"tabpanel"`,
  `aria-selected`, roving `tabindex`, arrow-key navigation) — the prior
  implementation had none of this, plus a dead `getCompactLabel()` lookup
  whose hardcoded keys didn't even match the real translated tab labels.
- **Owner-only surfaces are absent, not disabled.** The card's
  convert-to-action control, the facilitator menu, and action-item editing
  all render `null` for a non-owner rather than a greyed-out control with no
  explanation — a participant never wonders why something looks broken.
- **Finding (resolved)**: `RetrospectivePage.tsx`'s loading/not-found/error
  states used a hardcoded light-only gradient background with no `dark:`
  variant — in dark theme this produced light-colored text on a
  light-colored background, found only once T057 added the first-ever
  automated WCAG scan of this route's non-happy-path states. Fixed to match
  the main view's already-correct token-driven gradient. No open finding.

## Deference

Deference asks: does the interface stay out of the way of the content (the
team's cards and conversation), rather than competing with it for attention?

- **Every color used is semantic, not decorative.** A systematic audit
  across every rebuilt component found and replaced dozens of hardcoded
  Tailwind palette classes (`bg-blue-500`, `text-red-500`, `bg-amber-600`,
  manual `dark:` variant gradients) with the project's semantic token system
  (`bg-surface-raised`, `text-warning-fg`, `bg-action`, etc.) — color now
  tracks meaning (status, ownership, selection), not habit, and the app's
  light/dark handling is automatic rather than hand-maintained per
  component.
- **Motion supports comprehension, never performs for its own sake.** Every
  animated interaction was built to the `animate` skill's gate (named
  purpose, frequency-appropriate) — the drag-lift is a spring because it's a
  live gesture; menu/card entrances are short (150-250ms) `ease-out` tweens
  because they're occasional, deliberate opens, not high-frequency chrome.
  The `review-animations` pass (`tasks.md` T062) found 13 issues — mostly
  the same missing-strong-easing gap recurring across independently-built
  components — all fixed, verdict **Approve**.
- **The five menus behave as one coherent system, not five separate
  inventions.** The options, facilitator, card, and column-header menus
  (plus, by extension, the export popover they open into) were consolidated
  onto a single shared `useBoardMenuOverlay` hook — before this, each had
  independently hand-rolled `getBoundingClientRect` positioning and
  `mousedown`-only outside-click dismissal, with real, inconsistent gaps
  (no Escape-key support in at least one, `aria-haspopup` values that didn't
  match reality). A user now learns the pattern once.
- **Finding (resolved, and the most consequential one found in this
  feature)**: T066's accessibility-contract checklist run — specifically
  writing a keyboard-focus test scoped to the board itself rather than
  reusing only the pre-existing Landing-page check — surfaced that **none of
  the four menu triggers, nor the pre-existing `LikeButton`, had any
  `focus-visible` styling at all**. A sighted keyboard user tabbing through
  the board would have seen every menu trigger and every card's like button
  vanish with no visible indication of where focus was. This is exactly the
  kind of interface *failing* to defer — instead of standing back to let
  keyboard navigation work invisibly and reliably, it was silently swallowing
  the one piece of chrome a keyboard user depends on. Fixed on all five
  elements; re-verified via a real Tab-key round-trip (not just `.focus()`,
  which doesn't trigger Chromium's `:focus-visible` heuristic and would have
  produced a false pass).

## Depth

Depth asks: does the interface communicate structure and hierarchy through
layered materials, not just flat color?

- **The direction's name is its thesis, and it's carried through
  consistently.** Floating glass toolbar (`bg-surface-raised/80
  backdrop-blur-sm`, detached from the viewport edge as a dock rather than
  an edge-to-edge bar), translucent tinted column panels, and elevated glass
  menus (`bg-surface-raised/95 backdrop-blur-xl` + a stronger shadow tier
  than the rejected Direction A's quiet menu) — the same materials language
  repeats across the topbar, every menu, the export popover, and the
  columns themselves, rather than each surface inventing its own.
- **Depth follows the interaction it represents.** The dragged card's shadow
  intensifies and it lifts (`scale: 1.03, translateY: -4px`, spring physics)
  precisely while it's the thing being manipulated — depth communicates
  "this is currently elevated above the board," not decoration applied at
  rest.
- **Finding (resolved)**: closing the T013 menu consolidation surfaced that
  none of the four anchored menus set `transform-origin` at their trigger —
  they scaled from their own center regardless of where they actually
  opened from, breaking the physical illusion that the panel *emerged from*
  the button that opened it (a core part of how depth reads as spatially
  coherent rather than merely stacked). Fixed once, at the shared hook
  level, by deriving `transform-origin` from Floating UI's resolved
  placement — every consumer inherited the fix without a per-component
  patch, so it can't drift back out of sync the way four independent fixes
  would have.

## Cross-cutting

- **Accessibility**: zero WCAG 2.1 AA violations across all four `Board
  State` variants (loading, populated, empty-column, error) in both themes
  (`e2e/accessibility.spec.ts`, T057) — this route had **no** automated
  regression gate before this feature; that gap is now closed. All five
  board menus verified keyboard- and touch-operable with no hover-only
  gating (T058). Full `accessibility-interaction-contract.md` checklist run
  (T066) — see the Deference section above for its most significant catch.
- **Motion**: `review-animations` skill pass — Approve, zero unresolved
  findings (`tasks.md` T062).
- **Responsive**: dedicated viewport coverage (`e2e/board-responsive.spec.ts`,
  T059) confirmed columns stack below the `lg` breakpoint and share width
  without a forced horizontal scrollbar at both narrow-mobile and
  ultra-wide-desktop extremes. Building the touch-operability test also
  found a genuine layout defect at the `lg` breakpoint boundary itself — a
  column title collapsing to literal 0px width under a too-tight
  header-row squeeze — fixed and now pinned by a regression test.
- **Internationalization**: a full key-parity audit (T063/T064) across every
  namespace this feature touched found and fixed real drift, including a
  significant one — a copy-paste mistake in an earlier task had corrupted
  `en.json`'s team-mood statistics labels, meaning English users would have
  seen raw untranslated keys instead of real text. `retrospective.*`/
  `retrospectivePage.*`/`sentiment.*`/`groupSuggestion.*` now have exact
  key-for-key parity between `en.json` and `es.json`.
- **Consistency with prior features**: no new design tokens were needed
  (`tasks.md` T012) — Direction C draws entirely from the semantic token
  system features 028/029/031 established, keeping this surface visually
  coherent with the rest of the app.

## Outcome

**Zero unresolved high-priority findings.** Every finding surfaced during
this feature's build and its final verification passes (T057-T066) was
resolved in shipped work, not deferred. SC-005 is satisfied.
