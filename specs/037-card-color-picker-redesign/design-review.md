# Design Review: Card Color Picker Redesign (Apple HIG-Inspired)

**Feature**: [spec.md](./spec.md) | **Task**: T036 (SC-005)

Structured review of the shipped implementation (`ColorPicker.tsx`, Direction
C — "Swatch Strip + Detail") against Apple Human Interface Guidelines'
three governing principles — clarity, deference, depth — per Constitution
Principle IX, using the `apple-design`/`emil-design-eng` skills. Performed
after T035's motion-only pass, against the real component running live
against the dev app (`claude-in-chrome`), not static mockups.

## Clarity

- **Legible at every size.** The trigger (a filled swatch + chevron pill)
  reads clearly at all three `size` variants; the panel's swatch strip uses
  36px (md) touch targets, comfortably above the ~24px minimum HIG
  recommends for touch.
- **The current state is never ambiguous.** The selected swatch carries both
  a redundant cue beyond color alone (a checkmark icon, a heavier border,
  and a slight scale increase) — satisfying Constitution Principle VIII's
  "no information conveyed by color alone" as a matter of course, not an
  afterthought.
- **Text serves understanding, not decoration.** The detail row's name +
  tooltip pairing answers "what will I get if I click this?" before the
  user commits — a deliberate clarity choice distinguishing this design from
  a bare grid of unlabeled swatches (Direction A) or a labeled-only-on-select
  grouped grid (Direction B). This was also the product owner's own
  articulated preference during the T008 review.
- **One finding, addressed**: the panel's `role="dialog"` was briefly
  duplicated on two nested elements (an invalid ARIA structure a sighted
  user would never notice, but a screen-reader user would hit as broken/
  unpredictable structure) — caught and fixed during T032's accessibility
  pass, not left for this review to discover cold.

## Deference

- **The picker recedes when not needed.** At rest, the trigger is a small,
  quiet pill — it does not compete visually with the card's content, which
  remains the primary focus. Opening the panel is the only moment color
  becomes the foreground concern.
- **Material choice signals "temporary, dismissible."** `bg-surface-raised/90
  backdrop-blur-2xl` plus a soft shadow reads as a floating, transient layer
  above the card — consistent with HIG's popover material guidance, and
  visually continuous with `CardMenu.tsx`'s own popover (the card's other
  "⋮" menu), so the two don't feel like different design systems on the same
  card.
- **No unearned ornamentation.** No gradient, no decorative icon beyond the
  functional checkmark/chevron — restraint was a deliberate choice, not an
  omission (this was Direction A's whole thesis; Direction C borrows that
  discipline for its own chrome even though its layout is more structurally
  distinct).

## Depth

- **Origin-aware presentation.** The panel scales in from the trigger's own
  corner (`transform-origin` derived from Floating UI's resolved placement),
  not from its own center — the spatial relationship between "the button I
  pressed" and "the panel that appeared" stays legible, per HIG's
  spatial-consistency guidance.
- **Layered, not flat.** The two-tier structure (quick-pick strip above, a
  distinct detail band below, separated by a hairline border) gives the
  panel its own internal hierarchy rather than presenting every element at
  the same visual weight — the most structurally distinctive choice among
  the three explored directions, and the reason the product owner selected
  it (T008).
- **Motion reinforces depth, not just presence.** The panel's entrance
  combines opacity, a subtle scale-up from 0.94, and a small upward
  translate — it arrives as a physical object settling into place, not a
  flat crossfade (T035's motion review: zero findings on this).

## Cross-cutting

- **Consistency with the rest of the board.** The picker now shares its
  positioning/dismissal foundation (`useBoardMenuOverlay`), its material
  language, and its motion vocabulary with every other popover on the
  board (options menu, facilitator menu, `CardMenu`) — closing a gap this
  control had carried since before the Apple HIG redesign series began
  (`research.md` §1).
- **Touch parity is now a first-class citizen**, not a compatibility
  after-thought — the trigger's resting state is the *same* element touch
  and pointer users see, not a separate mobile-only affordance bolted on.

## Verdict

**Zero unresolved high-priority findings.** The one real defect surfaced
during this feature's own build (the duplicated `role="dialog"`) was fixed
before this review, not left open by it. SC-005 is satisfied.
