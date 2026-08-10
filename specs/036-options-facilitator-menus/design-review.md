# Design Review: Options & Facilitator Menus Redesign

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Purpose**: Structured review of the shipped implementation (selected
Direction B — "Adaptive Sheet") against Apple Human Interface Guidelines
principles (clarity, deference, depth), per SC-005. Closes with zero
unresolved high-priority findings, as required to consider this feature's
design work complete.

**Reviewed**: 2026-08-10, against the implementation on branch `main` —
`RetrospectiveTopbar.tsx`, `FacilitatorMenu.tsx`/`FacilitatorMenuTabs.tsx`,
the new shared `FacilitatorTabList.tsx` and `BottomSheet.tsx`, and the
restyled `ControlsTab.tsx`/`NotesTab.tsx` cards. Independent of, and
following, T039's motion-only `review-animations` pass.

## Clarity

Clarity asks: is the content and its hierarchy immediately legible, and does
every element earn its place?

- **Finding (resolved) — two adjacent icon-only mobile triggers shared the
  identical glyph.** Both the options menu's and the facilitator menu's new
  mobile entry points (FR-013a) rendered icon-only, no text label, using the
  exact same `lucide-react` `Menu` (hamburger) icon. Because `RetrospectiveTopbar`
  renders as a `Fragment` and both triggers land as siblings inside
  `Header.tsx`'s flex row, they sit directly next to each other at mobile
  widths — two visually identical buttons distinguishable only by
  `aria-label`/`title`, which a sighted mobile user never sees. This is
  exactly the ambiguity clarity guards against: an icon must communicate its
  own meaning, not rely on a screen-reader-only string to disambiguate it
  from its neighbor. Verified live at 390×844 (`claude-in-chrome` screenshot)
  before and after. Fixed by giving the facilitator trigger a distinct
  `SlidersHorizontal` icon (both its desktop and mobile buttons), keeping
  `Menu` for the options trigger — the two are now unambiguous at a glance,
  re-verified live. Desktop was never actually ambiguous (each trigger also
  carries a visible text label there), but using the same icon there too was
  itself a missed opportunity for consistency; fixing it once at the
  component level fixed both viewports.
- **Owner-only surfaces stay absent, not disabled — carried over correctly
  from feature 033.** `FacilitatorMenu.tsx` returns `null` outright for a
  non-owner (`if (!isOwner) return null;`), on both its desktop and new
  mobile trigger — a non-facilitator participant never sees a greyed-out
  control they can't use and don't need to wonder about. Covered by
  T035/T036's e2e assertions (`toHaveCount(0)`, not just `toBeHidden()`).
- **The mobile sheet's own hierarchy is legible without extra chrome.**
  `BottomSheet.tsx` gives every instance a real, visible `<h2>` title, a
  drag-handle affordance, and a single dedicated close button — the same
  pattern for both the options sheet and the facilitator sheet, so a user
  who's learned one has learned the other.

## Deference

Deference asks: does the interface stay out of the way of the content
(the team's cards and conversation), rather than competing with it for
attention?

- **The direction's own thesis — "clarity-forward, opaque panels" — was a
  deliberate rejection of the app's usual translucent-material language, and
  it was carried through consistently rather than left half-applied.** Every
  panel restyled in this feature (`FacilitatorMenuTabs.tsx`'s outer frame,
  `ControlsTab.tsx`'s timer-status card, `NotesTab.tsx`'s note cards, both
  desktop dropdowns) dropped `backdrop-blur`/`/95`/`/40` opacity treatments
  in favor of solid `bg-surface-raised` + a visible `border-border-default`.
  Nothing was restyled halfway — the same opaque idiom repeats everywhere
  this feature touched, so the two menus read as one coherent surface rather
  than a patchwork of old and new materials.
- **Every color used remains semantic**, inherited unchanged from feature
  033's token audit — no new hardcoded palette classes were introduced by
  this feature's restyling work.
- **Notes stay actionable without hover-gating.** `NotesTab.tsx`'s per-note
  edit/delete buttons are unconditionally rendered, not
  `opacity-0 group-hover:opacity-100` — the same defect class fixed
  elsewhere in the app (feature 033) was never reintroduced here, and this
  matters more in this feature specifically because the new mobile sheet has
  no hover state at all to gate behind.
- **Finding (resolved) — a `display:none` ancestor silently made the
  facilitator menu's own mobile trigger permanently unreachable.**
  `FacilitatorMenu` was initially nested inside `RetrospectiveTopbar`'s
  desktop-only (`hidden md:flex`) wrapper; its own correctly-written
  `md:hidden` trigger never mattered because a `display:none` ancestor always
  wins over a child's own display value. This is not a defect any unit test
  could catch (jsdom applies no real CSS) — it surfaced only during T038's
  live-browser verification pass. Fixed by promoting `<FacilitatorMenu>` to a
  top-level `Fragment` sibling in `RetrospectiveTopbar.tsx`; re-verified live
  and now pinned by T035's e2e keyboard/touch-operability tests.

## Depth

Depth asks: does the interface communicate structure and hierarchy through
layered materials, not just flat color?

- **The sheet materializes as a real object entering from off-screen, not a
  flat fade.** `BottomSheet.tsx`'s backdrop and sheet animate independently
  (backdrop opacity fade, sheet slide from `translateY(100%)`) with a
  critically-damped-adjacent spring (`damping: 30, stiffness: 300`) — close
  to Apple's own drawer/sheet defaults (damping ≈0.8-1.0, response ≈0.3-0.4s)
  — so it settles cleanly with only the faintest overshoot, appropriate for
  a menu opened by a deliberate tap rather than a flicked gesture.
- **Anchored dropdowns stay correctly anchored, inheriting feature 033's
  fix rather than regressing it.** Both desktop panels
  (`RetrospectiveTopbar.tsx`, `FacilitatorMenu.tsx`) keep their Floating-UI
  positioning wrapper as a plain `div`, with the entrance/exit animation on
  a *nested* `motion.div` — preserving the earlier fix that keeps Framer
  Motion's own `transform` writes from clobbering Floating UI's anchor-offset
  transform. Neither panel scales from a fixed center; both are pinned to
  their trigger.
- **Elevation still tracks hierarchy, not habit.** The mobile sheet — the
  larger, more consequential surface — carries the heavier treatment
  (`rounded-t-2xl shadow-2xl`, full-width, a dedicated drag handle); the
  compact desktop dropdowns stay proportionally lighter
  (`rounded-xl shadow-2xl`, fixed narrow width). Depth scales with the
  surface's actual weight in the interface.

## Cross-cutting

- **Accessibility**: zero new WCAG 2.1 AA violations across every new mobile
  `Board State` variant (options-open-mobile, facilitator-open-mobile ×2
  representative tabs, facilitator-absent-non-owner) in both themes
  (T036); both new mobile entry points independently keyboard- and
  touch-operable (T035); reduced motion honored automatically via the
  app-root `MotionConfig reducedMotion="user"` (T037) — no per-component
  opt-in needed since every new `motion.*` element in this feature funnels
  through it.
- **Motion**: `review-animations` skill pass — **Approve**, 4 Performance/
  Timing findings (Framer Motion `y`/`scale` shorthand → full `transform`
  string on 4 elements; the tab indicator's spring trimmed from 350ms to
  280ms to clear the sub-300ms UI bound) — all fixed, zero unresolved
  (`tasks.md` T039).
- **Internationalization**: live-verified at both mobile and desktop widths
  in both `es`/`en` locales (T038) — no layout break or truncation found in
  either locale at either width; a full flattened-key parity audit closes
  Phase 8 (`tasks.md` T044).
- **Consistency with prior features**: no new design tokens were needed —
  Direction B's opaque idiom is a deliberate, spec-approved departure from
  the app's usual translucent-material default (feature 033's Direction C),
  scoped explicitly to these two menus per the product owner's chosen
  candidate, not an unintentional drift from the established system.

## Outcome

**Zero unresolved high-priority findings.** Three real findings surfaced
during this feature's build and its final verification pass (T038/T040) —
the shared-icon ambiguity, the `display:none`-ancestor unreachability bug,
and (in T039) four motion-performance/timing issues — all resolved in
shipped work, not deferred. SC-005 is satisfied.
