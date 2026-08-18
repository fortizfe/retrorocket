# Design Review: Mi Perfil (Profile) Redesign

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Purpose**: Structured review of the shipped implementation (selected
Direction B — "Structured Account Pane") against Apple Human Interface
Guidelines principles (clarity, deference, depth), per SC-004. Closes with
zero unresolved high-priority findings, as required to consider this
feature's design work complete.

**Reviewed**: 2026-08-18, against the implementation on branch
`050-profile-redesign` (`src/pages/Profile.tsx`,
`src/features/auth/components/UserProfileForm.tsx`,
`src/features/auth/components/LinkedProvidersCard.tsx`,
`src/features/auth/components/ConnectedAppsCard.tsx`).

## Clarity

Clarity asks: is the content and its hierarchy immediately legible, and does
every element earn its place?

- **Real section structure, not whitespace alone.** Per Direction B's own
  distinguishing choice, the page is organized into explicitly bordered
  sections — Identity, Access & Security (sign out, linked providers,
  connected AI assistants), Edit Profile Form, Account Actions — each with
  its own heading (`aria-labelledby`), closer to an OS Settings pane than a
  marketing card. There is no ambiguity about where a given capability
  lives.
- **One consistent Settings-row vocabulary.** Leading icon, primary/
  secondary text, trailing action — applied uniformly to the sign-out row
  (`Profile.tsx`), every linked-provider row (`LinkedProvidersCard.tsx`),
  every connected-app row (`ConnectedAppsCard.tsx`), and both account-action
  placeholders (`ActionPlaceholderRow`). A visitor who learns the pattern
  once in one section can read every other section without relearning it.
- **State is always named in visible text, never color-only.** "Vinculado"/
  "No vinculado"/"No disponible todavía" for providers,
  "Guardando…"/"Nombre guardado"/error copy for the save flow, and the
  persistently visible "not yet available" caption for the two disabled
  placeholders all pair an icon and/or text with any color coding — directly
  satisfying FR-007's corrected accessibility requirement and the
  no-color-only-meaning bar from Principle VIII.
- **Finding (resolved during implementation, not open)**: the pre-redesign
  page rendered nothing at all for a missing avatar and no explicit
  loading/error states for the profile fetch — a silent, ambiguous gap
  against FR-002/FR-010. `Profile.tsx`'s rebuild adds a real initials-based
  avatar fallback (`ProfileAvatar`, `role="img"` with an accessible name) and
  explicit `loading`/`error` branches with a retry action. Verified by
  `Profile.test.tsx` and the accessibility scans over all three variants.
- **Finding (low-priority, not blocking)**: the user's email address is
  visible in two places on Mi Perfil at once — once as a read-only summary
  row in the Identity panel (`Profile.tsx`), and again as a disabled input
  inside the Edit Profile Form (`UserProfileForm.tsx`). This is a deliberate
  consequence of each column being self-contained (the Identity panel is a
  full account summary; the edit-form card is a complete, standalone "edit
  your profile" surface that also carries this non-editable context field
  forward from its pre-redesign form, and is shared verbatim with the
  landing page's first-time-setup flow, where no separate identity summary
  exists to make it redundant there). Both instances state the exact same
  fact with the same "not editable" caption, so there is no conflicting or
  confusing information — a minor repetition, not a clarity defect. Left
  as-is; a follow-up could hide the Edit Profile Form's own email row
  specifically on Mi Perfil (`isFirstTime=false`) if this is ever
  revisited, but doing so is out of this feature's scope (no functional or
  accessibility consequence either way).

## Deference

Deference asks: does the interface stay out of the way of the content (the
visitor's own account data), rather than competing with it for attention?

- **Chrome is quiet and semantic.** Every surface uses the existing
  semantic token system (`bg-surface-raised`, `border-border-default`,
  `text-text-secondary`/`text-text-muted`) — no new decorative color
  vocabulary was introduced (`tasks.md` T011: no new design tokens needed
  beyond four missing `CONTRAST_PAIRINGS` entries the existing catalog was
  already supposed to cover). Danger-toned elements (sign-out, delete
  account) use the existing `error-fg`/`error-bg` pair, not a bespoke red.
- **Motion never announces itself.** Every entrance is a single quiet
  opacity+8px (or +20px for the wider edit-form column) fade, 0.24s, a
  shared strong ease-out curve, fully skipped under `useReducedMotion()`
  (`review-animations` skill pass, `tasks.md` T038: Approve for all three
  motion decisions, zero blocking findings). The save-feedback and
  connected-app-revoke transitions are equally restrained (0.16-0.18s,
  transform/opacity only).
- **Motion is applied, not decorative.** `tasks.md` T032 explicitly chose
  *not* to add per-row entrance motion to `LinkedProvidersCard`'s three
  static rows (nothing state-changes on them at mount) and reused `Button`'s
  existing `loading` affordance for the provider-linking-in-progress
  indicator instead of inventing new motion — the correct "cheapest tool
  that works" call for a deference-respecting interface.
- **Finding (resolved)**: the pre-redesign page carried the sign-out control
  as a header-level button, competing with the page title for top-of-page
  attention. It now lives inside the Access & Security section as a regular
  Settings-row, at the same visual weight as every other access-control
  action — appropriately deferential to the identity content above it, not
  elevated above it.

## Depth

Depth asks: does the interface communicate structure through layered
materials, not just flat color?

- **Restrained translucency, consistent with the clarity-forward
  direction.** Every section (`Card`-backed and the page's own bordered
  `<section>`s alike) uses the shared `.glass` utility
  (`bg-surface-raised/80` + `backdrop-blur-sm` + a soft border) — a modest
  material layer that reads as "a distinct settings panel," not a flat
  color block, without the stronger elevation/shadow-stack treatment
  Direction C ("Layered Materials") explored and the product owner
  didn't select. This is the appropriate amount of depth for a
  clarity-forward direction, not a missing one.
- **Depth follows real state, not decoration.** The avatar carries a
  `shadow-soft` + border ring (a legitimately elevated, physical object —
  the one piece of "you" on the page); flat bordered rows carry no
  shadow at rest. Nothing on this page uses depth as pure ornamentation.
- **No finding.** The selected direction's own explicit choice was to lead
  with clarity over depth (`data-model.md`'s `distinguishingChoices`); the
  shipped implementation matches that choice faithfully rather than drifting
  toward either flatness or over-elevation.

## Cross-cutting

- **Accessibility**: zero WCAG 2.1 AA violations across the `loaded`,
  `loading`, `error`, `saving`, and `save-error` `Profile View State`/
  `Editable Field Operation State` variants, in both themes
  (`e2e/accessibility.spec.ts`, 12/12 scans passing as of this review); the
  FR-007/SC-007 disabled-placeholder correction is independently verified,
  not just visually inspected. See `contracts/accessibility-interaction-contract.md`
  for the full checklist.
- **Motion**: `review-animations` skill pass — Approve, zero blocking
  findings, one real bug found and fixed along the way (`UserProfileForm.tsx`'s
  untuned/double-animating transition, `tasks.md` T038).
- **Consistency with prior features**: no new design tokens were needed
  beyond four pre-existing gaps in `CONTRAST_PAIRINGS` (`tasks.md` T011) —
  the redesign draws entirely from the semantic token system features
  028/029/031 established, keeping Mi Perfil visually coherent with the
  rest of the app rather than introducing a fourth visual language.
- **Functional parity**: every FR-002 through FR-011 capability verified
  against the shipped implementation and its tests — see
  `contracts/functional-parity-contract.md`'s Result section.

## Outcome

**Zero unresolved high-priority findings.** The two items noted above are
resolved-in-shipped-work (missing avatar/loading/error states, header-level
sign-out) or an intentionally-scoped, non-blocking low-priority observation
(duplicate read-only email display) with no functional or accessibility
consequence. SC-004 is satisfied.
