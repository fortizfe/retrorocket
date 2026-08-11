# Design Review: Export Window Redesign

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Purpose**: Structured review of the shipped implementation (selected
Direction C — "Two-Column Desktop") against Apple Human Interface
Guidelines principles (clarity, deference, depth), per SC-005. Closes with
zero unresolved high-priority findings, as required to consider this
feature's design work complete.

**Reviewed**: 2026-08-11, against the implementation on branch `main` —
`ImprovedExportPopover.tsx` (both `desktop` and `mobile` presentations) and
its wiring in `RetrospectiveTopbar.tsx`. Independent of, and following,
T036's motion-only `review-animations` pass.

## Clarity

Clarity asks: is the content and its hierarchy immediately legible, and
does every element earn its place?

- **Grouping & mapping holds up.** The desktop two-column split groups by a
  coherent axis — "how the document is produced" (format + document config,
  left) versus "what goes in it" (optional content, the always-included
  notice, the facilitator-only zone, right) — not an arbitrary content
  split. A participant scanning either column understands what kind of
  decision lives there without needing a label to explain the grouping
  (Principle 16.4).
- **The owner-only facilitator zone stays absent, not disabled, for a
  non-owner** — carried over correctly from the pre-redesign component and
  re-verified by T028's non-owner axe scan and unit tests. No participant
  ever sees a control they can't use.
- **Section headers read as plain hierarchy, not shouted labels** — fixed
  during T025's family-resemblance pass (all-caps letter-spaced treatment
  removed in favor of the same sentence-case `text-sm font-medium` the
  options and facilitator menus already use). Re-verified live, both
  themes.
- **Minor, disclosed, non-blocking observation — desktop column height
  asymmetry.** The left column (format + document config) is naturally
  shorter than the right (optional content + always-included notice +
  facilitator zone for an owner), leaving blank space below the left
  column's content at typical card counts. This is inherent to the
  facilitator zone being conditionally absent for non-owners (which would
  make any content reshuffle to "balance" the columns for owners actively
  *worsen* the balance for the far more common non-owner case) and reads as
  ordinary asymmetric-column layout, not a broken or careless one — no
  visible empty "box," just blank panel background. Not fixed; recorded
  here as a considered trade-off, not an oversight. **Not high-priority.**

## Deference

Deference asks: does the interface stay out of the way of the content
(the team's cards and export decisions) rather than competing for
attention?

- **Correctly inherits the app's already-committed "Adaptive Sheet"
  material language rather than introducing a fourth visual system.**
  Opaque `bg-surface-raised`, a single visible 1px border, no translucency
  — matching the options and facilitator menus exactly, per User Story 3's
  explicit requirement. Introducing glass/blur materials here (Apple's own
  *default* recommendation) would have been the actual violation, since it
  would break the family this app deliberately committed to in feature 036.
- **Semantic color stays functional, not decorative.** Info-blue for the
  always-included notice, warning-amber for the facilitator-only zone,
  error/success for outcome banners — every color carries a specific
  meaning already established elsewhere in the app, none introduced purely
  for visual interest.
- **The panel doesn't compete with the board underneath it.** No backdrop
  scrim on desktop (matching the options/facilitator panels' own choice —
  a lightweight, non-blocking anchored panel, not a modal takeover); the
  mobile sheet's dimmed backdrop (inherited unchanged from `BottomSheet.tsx`)
  correctly signals the heavier, more blocking nature of a full-width sheet
  takeover on a small screen. Right materials-weight for each context.

## Depth

Depth asks: does the interface use layering, motion, and shadow to
communicate structure and hierarchy, not just decoration?

- **A single elevation, applied consistently.** `shadow-2xl` on the desktop
  panel and the mobile sheet, matching every other floating surface in the
  app — the export window doesn't invent its own elevation language.
- **The desktop panel is spatially anchored to its trigger, not
  floating arbitrarily.** Verified live: it opens directly beneath the
  "Options" button, not centered on screen — the spatial relationship
  between the action that opened it and its position is immediately
  legible (Apple's Spatial Consistency principle).
- **State transitions (idle → exporting → success/error) read as depth
  changes in place, not new layers stacking.** The crossfade (T026) and the
  status banners animate within the same panel rather than pushing a new
  surface on top — appropriate restraint for a small utility panel, not a
  hero moment that would warrant its own layer.

## Process note: a real bug found by verification, not by this review

This review's own static reading of the code (during an earlier pass)
initially treated `T036`'s `whileTap={{ scale: 0.97 }}` → `whileTap={{
transform: 'scale(0.97)' }}` change as a correct, low-risk GPU-performance
fix per `STANDARDS.md`. Live browser verification (Playwright against the
real dev server, not the unit-test mock — the unit test's own `framer-motion`
mock silently replaced `motion.button` with a plain `<button>`, masking the
issue) showed this "fix" **broke format-button selection outright**: clicking
a format button no longer updated `aria-pressed` or the underlying state at
all in a real browser. Reverted back to the shorthand `{ scale: 0.97 }`
(matching `Button.tsx`'s own already-proven-correct pattern), re-verified
live. Recorded here, not just in `tasks.md`, because it's exactly the kind
of finding a design/motion review can get wrong from source alone —
correctness in a real browser overrides a style-guide rule when the two
conflict, and this is why T036/T037's fixes were re-verified live rather
than trusted from static analysis or a mocked test alone.

## Verdict

**Zero unresolved high-priority findings.** One minor, disclosed,
non-blocking observation (desktop column height asymmetry) is recorded
above as a considered trade-off, not fixed. SC-005 is satisfied.
