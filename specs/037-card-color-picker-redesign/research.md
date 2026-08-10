# Phase 0 Research: Card Color Picker Redesign

**Input**: `plan.md` Technical Context, `spec.md` (including the 2026-08-10
clarifications on catalog curation, touch reachability, and color remapping)

## 1. `ColorPicker.tsx` predates the project's overlay consolidation

**Finding**: `ColorPicker.tsx` (267 lines) hand-rolls its own popup: local
`isOpen` state, a manually computed `fixed` position from
`triggerRef.current.getBoundingClientRect()` (with its own viewport-overflow
math), a `mousedown` outside-click listener, its own `Escape` keydown
listener, and a raw `createPortal(popup, document.body)`. This is exactly
the class of hand-rolled positioning/dismissal logic that feature 033
consolidated four other instances of onto `useBoardMenuOverlay`
(`RetrospectiveTopbar`'s options menu, `FacilitatorMenu`, `CardMenu`, the
column header menu) — this control was missed by that consolidation
(it lives in `src/lib/components/ui/`, not `src/features/boards/*`, which is
likely why the feature-033 sweep didn't reach it).

**Decision**: Rebuild `ColorPicker.tsx` on `useBoardMenuOverlay`
(`role: 'menu'`), matching `CardMenu.tsx`'s established composition:
`FloatingPortal` + `FloatingFocusManager` (`modal={false}`) wrapping a
`motion.div` that carries the panel's own `initial`/`animate`/`exit`
transform, never the Floating-UI positioning wrapper itself (the same
regression class fixed in feature 034, `363815a`, called out explicitly in
`useBoardMenuOverlay`'s consumers — this redesign MUST NOT reintroduce it).

**Rationale**: This is now the fifth+ consumer of the same anchored-overlay
need; forking a sixth hand-rolled implementation (or leaving the existing
one as the last hand-rolled holdout) contradicts Constitution Principle V
(Simplicity/YAGNI) and the precedent feature 033 already set. Adopting the
shared hook also gives the picker `flip`/`shift`/height-capping-with-internal-scroll
for free — relevant since a larger curated grid (§5) still needs to stay
within the viewport on small screens without the ad hoc `popupWidth: 260,
popupHeight: 120` approximation the current code uses.

**Alternatives considered**: Leaving the current hand-rolled implementation
and only reskinning it — rejected; it does not meet FR-001's bar of a
"completely redesigned... look-and-feel," and CardMenu.tsx already proves
the target foundation works for a same-card popover with a very similar
shape (icon trigger, anchored panel, portal-rendered).

## 2. Touch reachability (FR-011a) — narrower than feature 036's problem, with a direct precedent

**Finding**: Feature 036 needed an entirely new mobile *surface* because its
host (`RetrospectiveTopbar`) was `hidden md:flex` — nothing in that subtree
rendered at all below `md`. The color picker's situation is different and
smaller: the trigger's *container* renders fine at every viewport; only its
*visibility* is hover-gated (`opacity-0 group-hover:opacity-100
focus-within:opacity-100` in `DraggableCard.tsx` line 215, shared with the
drag handle). A tap on a touch device produces neither `:hover` nor (without
first focusing a descendant) `:focus-within`, so the trigger is present in
the DOM and positioned correctly, just invisible and — because opacity-0
elements can still intercept clicks in this codebase's pattern — practically
undiscoverable rather than cleanly absent.

A directly analogous control on the very same card already solves this
correctly: `EmojiReactions.tsx`'s "add reaction" trigger
(`src/features/boards/retrospective/components/EmojiReactions.tsx`, ~line
102) is **not** hover-gated — it renders as a small, always-visible circular
button inline in the card's reaction row, styled at rest with a subtle
`bg-surface`/`border-border-default` treatment that firms up on
hover/press/open, discoverable and tappable at every viewport without any
special-casing.

**Decision**: Each of the 2-3 explored visual directions (FR-014) commits to
making the color-picker trigger persistently reachable by touch — most
directly by adopting the `EmojiReactions.tsx` always-visible-at-rest
pattern (dropping the `opacity-0 group-hover` gating entirely for this
trigger, keeping it for the drag handle, which has no touch equivalent to
provide and is a reasonable, precedented exception) — rather than
constructing a new sheet/full-screen surface as 036 did. A direction MAY
instead propose a different resting-state treatment (e.g., a lower-emphasis
always-visible glyph that intensifies on interaction) as long as it does not
depend on hover to be discoverable or operable.

**Rationale**: Constitution Principle V (Simplicity/YAGNI) — building a new
presentation surface (sheet/full-screen cover) for what is fundamentally a
single small trigger's visibility rule would be solving a bigger problem
than the one that exists. The `EmojiReactions.tsx` precedent is proof this
simpler fix already reads correctly in production on the same card.

**Alternatives considered**: A long-press-to-reveal gesture on the whole
card — rejected as a starting constraint; it would make the trigger's
discoverability worse than today's keyboard-focus fallback, not better, and
HIG favors direct manipulation over hidden gestures for a primary action.
Not excluded as a *direction-specific* embellishment layered on top of an
always-reachable trigger, but not the baseline fix.

## 3. Catalog curation scope and existing constraints (FR-013)

**Finding**: `CardColor` (`src/features/boards/types/card.ts`) is a closed
30-member TypeScript union type. Each member has a full config in
`CARD_COLORS` (`src/lib/utils/cardColors.ts`): `name`, `background`,
`border`, `text` (Tailwind classes), `preview` (swatch fill), `ariaLabel`,
`tooltip` — all hardcoded Spanish string literals today (see §4). Every
member also has a corresponding WCAG-AA-verified `.card-color-bg.<class>`
light/dark background rule in `src/styles/globals.css`, established and
tested under feature 009 (`cardColors.a11y.test.ts` asserts ≥4.5:1 text
contrast and the swatch border's decorative-only status, per that suite's
own documented rationale). `docxExportService.ts` also consumes
`getCardColorHex()` for export, and `e2e/retrospective-board.spec.ts`
hardcodes one specific color's current Spanish aria-label
(`'Seleccionar color azul suave'`) to drive a real color-selection scenario.

**Further finding (surfaced during `/speckit-analyze`)**: not every read of a
card's stored `color` value goes through `getColorConfig`/`getCardStyling`.
Two additional sites read a raw `CardColor` value directly: (1)
`GroupCard.tsx:55` does `CARD_COLORS[headCardColor]` with **no validation at
all** — once curation narrows the type, a group's head card still holding a
curated-away value makes this `undefined` at runtime, crashing the group's
render; `e2e/retrospective-board.spec.ts`'s "pre-existing data... loads and
renders correctly with zero data loss" test (~line 1428) seeds exactly this
scenario (`color: 'pastelBlue'` on a group head card) and asserts it
renders, so this is a proven, not theoretical, regression risk. (2)
`cardColors.ts`'s existing `validateColor()` — already called by
`DraggableCard.tsx:90` as `validateColor(card.color)` — silently resets any
value not in `CARD_COLORS` to `getDefaultColor()` (the neutral color). That
is the *rejected* clarification option (reset-to-default) applied to any
curated-away color, unless `validateColor()` itself is reconciled to consult
the remap table first. Both are folded into §"Summary of resolved unknowns"
below and into `data-model.md`'s `resolveCardColor` consumer list.

**Decision**: Curation is a real, multi-file, type-checked change, not a
purely cosmetic one. The design-exploration process (FR-014) proposes a
curated set as part of each candidate direction; the number and identity of
surviving colors is a product-owner decision made at that review (per the
spec's Assumptions), but whatever set is chosen MUST:
1. Keep `pastelWhite`/its equivalent as the neutral/default (FR-012).
2. Have every surviving member's `.card-color-bg.*` rule either already
   present in `globals.css` (if the color survives unchanged) or newly
   added and passing the existing `cardColors.a11y.test.ts` contrast
   assertions (extended, not replaced, per Principle VIII).
3. Trigger the FR-013a remapping table (§ data-model.md) for every removed
   member, and an update to the one hardcoded E2E aria-label reference if
   the color it targets is renamed or removed.

**Rationale**: Treating curation as "just picking fewer swatches" would
silently violate the feature-009 accessibility contract or leave a type
error / stale E2E reference undiscovered until CI. Naming the concrete
touch-points here means `tasks.md` can sequence them explicitly rather than
discovering them mid-implementation.

**Alternatives considered**: Deferring all curation-impact analysis to
implementation time — rejected; feature 009's investment in a fully
contrast-verified palette is exactly the kind of prior work Constitution
Principle III (prefer proven, already-vetted foundations) says to build on,
not silently bypass.

## 4. Wiring the catalog through i18next (a real, previously-unaddressed gap)

**Finding**: Despite FR-008 saying visible text "MUST continue to be sourced
from the existing translation system," it currently is not: `CARD_COLORS`'
`name`/`tooltip`/`ariaLabel` fields are hardcoded Spanish literals, and
`ColorPicker.tsx`'s own trigger `aria-label`/`title` (`` `Color selector:
${selectedConfig.name}` ``, `` `Cambiar color (actual: ${selectedConfig.name})` ``)
mix a hardcoded English label template with an interpolated Spanish color
name — visible proof no locale switch currently changes this control's text
at all. Separately, `src/locales/en.json` and `es.json` each already carry a
dormant `colors` namespace (9 keys: `blue`, `purple`, `orange`, `pink`,
`teal`, `gray`, `green`, `yellow`, `red`, each with a `_tooltip` and `_aria`
sibling, both locales fully translated) introduced years ago (`git log -S`
traces it to the original language-selector/i18n-support commit) and never
consumed by any component — confirmed by a repo-wide search for
`colors.blue`/`t('colors...`/`t("colors...` returning no hits.

**Decision**: Treat i18n wiring as required, in-scope work to make FR-008
and User Story 5's locale acceptance criteria actually true (not "continue"
existing behavior, since it never existed) — not a nice-to-have. Reuse the
dormant namespace's key convention (`<slug>`, `<slug>_tooltip`,
`<slug>_aria`, nested under a `colors` — or, if the curated palette differs
enough to warrant it, a differently-scoped but structurally identical —
namespace) rather than inventing a new shape, extending it to cover
whichever colors the selected curated direction retains and translating any
net-new ones. `CARD_COLORS`' `name`/`tooltip`/`ariaLabel` fields become
translation-key references (or the component looks them up via `t()`
directly, keeping `cardColors.ts` free of the `t` function per Constitution
Principle IV's UI/domain separation), resolved by the consuming component.

**Rationale**: Shipping a "redesigned" picker that still silently
hardcodes Spanish text would fail Principle IX's i18next mandate and User
Story 5's Acceptance Scenario 3 outright, and reusing the dormant
namespace's naming convention avoids introducing a second, inconsistent
color-i18n-key shape into the same locale files.

**Alternatives considered**: Leaving `cardColors.ts`'s hardcoded strings in
place and only translating the picker's own chrome (open/close, hints) —
rejected; the color name is the single most load-bearing piece of text in
this control (it's what User Story 4 asks a participant to scan for), so
leaving it untranslated would leave the most important text in the whole
redesign unaddressed.

## 5. Grid-of-many-small-options precedent: `ReactionPicker.tsx`

**Finding**: `ReactionPicker.tsx` (the emoji-reaction picker, opened from
the same card via `EmojiReactions.tsx`/`useEmojiPicker`) already solves a
structurally identical problem: a floating panel presenting many small,
visually-dense, selectable options (a `grid-cols-8` emoji grid), grouped
into switchable categories with a lightweight tab strip, plus a footer hint
row — all inside a `FloatingPortal`/`FloatingFocusManager` panel with an
internally-scrolling, height-capped body. It predates the
`useBoardMenuOverlay` consolidation (its own `useEmojiPicker` hook sets up
an equivalent but separate Floating UI configuration) but its *layout*
pattern — category tabs + dense responsive grid + scrollable body + hint
footer — is the closest existing precedent for presenting a large curated
color catalog scannably (User Story 4), well ahead of designing that
layout from a blank page.

**Decision**: Each explored visual direction (FR-014) may draw on this
grid+optional-grouping+scrollable-body shape as a starting structural
vocabulary for the color panel, adapted to color swatches (larger touch
targets than single-glyph emoji buttons, a visible selected-state ring/check
per FR-005, and a name label per FR-006) rather than treating the panel's
internal layout as an open question with no established local precedent.
Grouping/categorization of colors (if the curated direction still has
enough colors to warrant it) is left to each direction's own proposal, not
mandated.

**Rationale**: Reusing a proven, already-accessible internal layout pattern
(scrollable, height-capped, keyboard-navigable grid) reduces the surface
area of genuinely new interaction logic this feature must get right,
consistent with Principle V.

## 6. Motion decisions (per `animate` skill, Constitution Principle IX)

Each new or changed animated interaction is a decision, not a default:

- **Panel open/close**: Adopt `CardMenu.tsx`'s exact pattern — a Floating-UI
  positioning wrapper with a *nested* `motion.div` carrying
  `initial`/`animate`/`exit` (`opacity`/`scale`), `duration: 0.15`,
  `ease: [0.23, 1, 0.32, 1]` — not the current `animate-in fade-in-0
  zoom-in-95` Tailwind utility class approach, which does not integrate with
  `MotionConfig reducedMotion="user"` the way a `framer-motion` component
  does. This is also the fix for reduced-motion honoring (FR-010): staying
  within the `framer-motion` foundation means it is honored for free,
  exactly as it already is for every other `motion.*` component in the app.
- **New touch-trigger resting/active state**: A new decision, made via the
  `animate` skill during Phase 1/implementation, informed by
  `EmojiReactions.tsx`'s existing `whileHover`/`whileTap` scale-feedback
  pattern on its own always-visible trigger (§2) as a starting reference,
  not a first-principles blank slate.
- **Selection feedback (choosing a color)**: Whether the newly-selected
  swatch deserves its own micro-animation (beyond the panel closing) is a
  `find-animation-opportunities`-skill question, evaluated during Phase 1,
  not pre-decided here.
- **Reduced motion**: `MotionConfig reducedMotion="user"` already wraps the
  whole app (`App.tsx`); staying within that foundation (see panel
  open/close above) means this is honored for free.

## 7. Visual direction exploration process (FR-014)

**Decision**: Reuse the process established in features 033/036 rather than
inventing a new one:

1. A dev-only route scaffold (`import.meta.env.DEV`-gated) mounts 2-3
   candidate variants of the redesigned picker side by side against real
   board data, so functional completeness (including the touch-reachable
   trigger and whatever curated catalog each candidate proposes) is
   genuinely demonstrated, not mocked.
2. Each candidate is built using `apple-design`/`emil-design-eng` (see
   `plan.md`'s Constitution Check note on the `prototype`-skill
   substitution, consistent with every prior redesign in this series),
   committing to one specific answer for: the panel's visual treatment, the
   curated catalog it proposes (§3), the touch-trigger's resting/active
   presentation (§2), and — if the curated set still has enough colors to
   warrant it — whether/how colors are grouped (§5).
3. Candidates are compared in both themes, at a touch/narrow viewport and a
   desktop viewport, screenshotted, and published as a single reviewable
   comparison artifact per FR-014.
4. The product owner selects exactly one; the rest are recorded as
   `rejected` with a `rejectionReason` in `data-model.md`, matching the
   precedent in features 029/031/033/036.
5. Non-selected candidate files are deleted after selection, matching prior
   precedent.

## Summary of resolved unknowns

| Unknown | Resolution |
|---|---|
| Does the picker already use the project's consolidated overlay hook? | No — it predates that consolidation and hand-rolls its own positioning/dismissal; rebuilt on `useBoardMenuOverlay` (§1) |
| What should the touch entry point actually be? | Not a new surface (unlike feature 036) — make the existing trigger persistently reachable, following the proven `EmojiReactions.tsx` always-visible-trigger precedent (§2) |
| What concretely breaks if the catalog is curated, and what must curation account for? | The `CardColor` type, `globals.css`'s per-swatch contrast rules (feature 009), `docxExportService.ts`'s hex lookup, one hardcoded E2E aria-label reference, `GroupCard.tsx`'s unvalidated direct `CARD_COLORS` lookup, and the existing `validateColor()`'s reset-to-default behavior (which must be reconciled with the remap decision) — all enumerated (§3) |
| Is the picker's text actually already localized, as FR-008 implies? | No — confirmed hardcoded Spanish literals with a dormant, unused 9-color i18n namespace already present to extend (§4) |
| Is there an existing structural precedent for a dense, scannable grid of many small selectable options? | Yes — `ReactionPicker.tsx`'s category-tabbed emoji grid (§5) |
| How should new motion (panel open/close, touch-trigger state, selection feedback) be decided? | Panel open/close adopts `CardMenu.tsx`'s exact pattern; the rest per-decision via `animate`/`find-animation-opportunities` at Phase 1/implementation (§6) |
| What process produces and reviews the 2-3 visual directions? | The dev-route-scaffold + comparison-artifact + product-owner-approval process established in features 033/036, reused as-is (§7) |
