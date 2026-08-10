# Phase 1 Data Model: Card Color Picker Redesign

This feature introduces one genuinely new persisted-data concern — the
remapping of curated-away colors (FR-013a) — plus view/interaction-state
models for the redesign itself. Existing domain types are referenced for
completeness and marked "existing, consumed unchanged" where nothing about
their shape or persistence changes.

## Entity: Visual Direction

A candidate visual/structural treatment of the color picker, including its
own answer to `research.md` §2 (touch-trigger presentation), §3 (which
curated color set it proposes), and §5 (grouping, if any). Not persisted;
exists only as source files during the FR-014 exploration and as this
table's record of the outcome.

| Field | Type | Notes |
|---|---|---|
| `id` | `'A' \| 'B' \| 'C'` | Candidate identifier |
| `name` | string | Short descriptive name |
| `distinguishingChoices` | string | What makes this candidate genuinely different — visual language, panel density, materials/depth treatment |
| `touchTriggerPresentation` | string | How the trigger stays reachable without hover (`research.md` §2) — e.g. always-visible at rest vs. low-emphasis-then-intensifying |
| `curatedCatalog` | `CardColor[]` | The specific set of colors this candidate proposes to keep, per `research.md` §3; MUST include the neutral/default color |
| `grouping` | string \| `'none'` | How (if at all) this candidate organizes/groups the curated catalog for scannability (`research.md` §5, User Story 4) |
| `newDependencies` | string[] | Any dependency beyond the existing `@floating-ui/react`/`framer-motion`/Tailwind foundation, each with a Principle III justification if non-empty |
| `status` | `'proposed' \| 'selected' \| 'rejected'` | Outcome of the FR-014 product-owner review |
| `rejectionReason` | string (if `status: 'rejected'`) | One-line reason, recorded at review time |
| `reviewer` | string (if `status` resolved) | Expected: the product owner |

### Catalog (2026-08-10)

Built as real, working React components
(`retro-rocket/src/pages/__prototypes__/ColorPickerDirection{A,B,C}.tsx`),
mounted side by side in a dev-only scaffold
(`ColorPickerDirectionsScaffold.tsx`, route `/dev/color-picker-directions`)
against four mock cards pre-set to a spread of today's colors, and verified
interactively via `claude-in-chrome` against the running dev server (not
just read as source) — open/close, swatch selection, keyboard Escape,
both themes, and a 390px touch-width viewport all exercised live.

**Finding during build** (fixed in all three before this table was
finalized): every candidate's first pass opened its panel pinned to the
viewport's top-left corner instead of anchored to its trigger. Root cause,
confirmed via direct DOM inspection (`getComputedStyle(el).transform` read
`"none"` despite Floating UI's `floatingStyles.transform` computing a
correct `translate(...)`): Framer Motion's own `animate={{ scale: 1 }}`
overwrites Floating UI's positioning `transform` whenever both live on the
same DOM node — the exact regression class `research.md` §1/§6 and
`useBoardMenuOverlay.ts`'s own comments already warn about (traced to
feature 034, `363815a`). Fixed by splitting each candidate's floating
element into two layered nodes: an outer plain `<div>` carrying
`ref={refs.setFloating}`/`style={floatingStyles}` (position only), and an
inner `<motion.div>` carrying only the `initial`/`animate`/`exit`
scale/opacity animation. This is now the documented pattern the real T020
rebuild must follow — `CardMenu.tsx`'s existing single-element
`ref={refs.setFloating} style={floatingStyles}` + `initial/animate` pattern
should be treated as suspect and re-verified live, not assumed safe by
precedent, since this is empirical proof the single-element pattern can and
does fail silently in this exact stack.

| id | name | distinguishingChoices | touchTriggerPresentation | curatedCatalog | grouping | status |
|---|---|---|---|---|---|---|
| A | Focused Grid | Deference-forward: single flat 4×3 grid, no grouping, panel chrome matches `CardMenu.tsx`'s existing material treatment exactly (`bg-surface-raised/95 backdrop-blur-xl`) so it reads as continuous with the card's other popover. Smallest catalog of the three. | Small ring-outlined circle at rest, fills solid on hover/focus/open | pastelWhite, pastelGreen, pastelRed, pastelYellow, pastelBlue, pastelPurple, pastelOrange, pastelPink, pastelTeal, pastelGray, pastelIndigo, pastelRose (12) | none | `proposed` |
| B | Categorized Palette | Clarity-forward: 4 named groups (Neutros/Fríos/Cálidos/Vivos) behind a tab strip, adapting `ReactionPicker.tsx`'s existing category-tab precedent to swatches. Opaque, higher-contrast chrome, denser type. Largest catalog of the three — trades panel size for expressive range. | Filled circular swatch with a visible border ring, persistently visible | pastelWhite, pastelGray, pastelSlate, pastelBlue, pastelTeal, pastelCyan, pastelSky, pastelIndigo, pastelViolet, pastelRed, pastelOrange, pastelYellow, pastelAmber, pastelGreen, pastelPurple, pastelPink, pastelFuchsia, pastelLime, pastelEmerald, pastelRose (20) | 4 named groups (Neutros, Fríos, Cálidos, Vivos), tab strip, defaults to the group containing the current color | `proposed` |
| C | Swatch Strip + Detail | Materials-forward: horizontally-scrolling quick-pick strip plus a live "detail" row naming whichever swatch is hovered/focused — most structurally distinct of the three (two-tier layout, not a single grid). Deepest blur/shadow. Trigger previews the current color inline (pill + chevron) rather than being a bare circle. | Pill trigger showing current color + chevron, persistently visible | pastelWhite, pastelBlue, pastelGreen, pastelYellow, pastelRed, pastelPurple, pastelOrange, pastelPink, pastelTeal, pastelGray, pastelIndigo, pastelEmerald, pastelRose, pastelSky, pastelAmber (15) | none (linear strip; detail row surfaces the name of whichever swatch has focus) | `proposed` |

**Resolved 2026-08-10**: presented via a published comparison artifact
(light/dark desktop captures of all three, plus a light-theme closed-state
overview and two touch/390px-viewport captures proving FR-011a). Product
owner (Fernando Ortiz) selected **Direction C — Swatch Strip + Detail**,
alongside acknowledging the `prototype` → `apple-design`/`emil-design-eng`
skill substitution (Constitution Principle IX). Directions A and B
rejected:

| id | status | rejectionReason |
|---|---|---|
| A | `rejected` | Not selected in the 2026-08-10 product-owner review; Direction C chosen instead. |
| B | `rejected` | Not selected in the 2026-08-10 product-owner review; Direction C chosen instead. |
| C | `selected` | — |

`reviewer`: Fernando Ortiz (product owner), 2026-08-10. SC-007 note: not
separately flagged as a friction point during selection.
|---|---|---|---|---|---|---|
| _(populated at review time, per `research.md` §7)_ | | | | | | `proposed` |

## Entity: Color Catalog Curation Mapping

New for this feature (FR-013a): the concrete remap table produced when the
selected Visual Direction's `curatedCatalog` (above) omits or renames a
member of the current 30-color `CardColor` set. Not a new runtime data
structure necessarily persisted long-term — it is the input to a one-time
migration of existing cards' `color` field, and its content is fully
determined once a direction is selected.

| Field | Type | Notes |
|---|---|---|
| `previousColor` | `CardColor` (current, pre-curation) | A color present in today's 30-member set |
| `newColor` | `CardColor` (post-curation) | The closest equivalent in the selected direction's `curatedCatalog`; MAY equal `previousColor` if it survives unchanged |
| `rationale` | string | One-line justification for the chosen equivalent (e.g. "closest hue/lightness match retained in the curated set") |

**Invariants**:
- Every member of the pre-curation 30-color set MUST appear exactly once as
  a `previousColor` (total coverage — no card's existing value is left
  unmapped).
- Every `newColor` MUST be a member of the selected direction's
  `curatedCatalog`.
- The neutral/default color's mapping MUST be the identity (`previousColor
  === newColor === pastelWhite` or its curated equivalent) — FR-012.

**Applied to**: every existing `Card.color` value at migration time (a
one-time, non-interactive transform — not a per-card user decision), and
consulted by `docxExportService.ts`'s `getCardColorHex()` and every other
current `CardColor`-keyed lookup so nothing reads a now-removed union
member — explicitly including `GroupCard.tsx`'s direct `CARD_COLORS[...]`
indexing (today unvalidated, so it will throw on a curated-away value if
not routed through this mapping) and `cardColors.ts`'s existing
`validateColor()`, which today resets *any* unrecognized value to the
neutral/default color — a curated-away-but-otherwise-valid color must
resolve through this mapping instead of hitting that reset-to-default
fallback, so the two behaviors don't silently conflict.

### Finalized mapping (2026-08-10, against Direction C's `curatedCatalog`)

Direction C keeps 15 of the current 30 colors (T007's table). The 15
survivors map to themselves (identity); the 15 removed colors below are
remapped to their closest surviving equivalent by hue/lightness (per
`getCardColorHex()`'s hex values in `cardColors.ts`), satisfying total
coverage (30/30 accounted for) and the neutral/default identity invariant.

**Survivors (identity mapping)**: pastelWhite, pastelBlue, pastelGreen,
pastelYellow, pastelRed, pastelPurple, pastelOrange, pastelPink,
pastelTeal, pastelGray, pastelIndigo, pastelEmerald, pastelRose,
pastelSky, pastelAmber.

| previousColor | newColor | rationale |
|---|---|---|
| pastelCyan | pastelTeal | Nearest hue (blue-green family); hex `#ECFEFF` sits closest to Teal's `#F0FDFA` among survivors |
| pastelLime | pastelGreen | Yellow-green sits closer to Green than Yellow at this lightness; matches Lime's original "achievements" tooltip semantic |
| pastelSlate | pastelGray | Both neutral grays; Slate's faint blue tint is the only difference, imperceptible at this lightness |
| pastelViolet | pastelPurple | Adjacent on the purple/indigo spectrum; closer to Purple's hex `#FAF5FF` than Indigo's `#EEF2FF` |
| pastelFuchsia | pastelPink | Magenta family; reads as "vivid pink" rather than closer to Purple |
| pastelMint | pastelTeal | Hex `#F0FDF9` is nearly identical to Teal's `#F0FDFA` |
| pastelPeach | pastelOrange | Hex `#FFF8F1` is nearly identical to Orange's `#FFF7ED` |
| pastelLavender | pastelPurple | Identical hex (`#FAF5FF`) to Purple in the current catalog |
| pastelCream | pastelYellow | Pale warm-yellow tint; closer to Yellow than to neutral White |
| pastelCoral | pastelRed | Hex `#FEF7F7` is nearly identical to Red's `#FEF2F2` |
| pastelTurquoise | pastelTeal | Hex `#F0FFFE` is nearly identical to Teal's `#F0FDFA` |
| pastelGold | pastelAmber | Warm yellow-orange; Amber is the survivor already covering that family |
| pastelSilver | pastelGray | Light neutral gray, near-white; closest survivor is Gray |
| pastelBronze | pastelOrange | Warm brown-orange; closest survivor family is Orange |
| pastelIvory | pastelWhite | Near-white warm tint, paler than Cream; closest survivor is the neutral White (FR-012 identity color) |

**Coverage check**: 15 survivors (identity) + 15 remapped = 30/30 — every
pre-curation `CardColor` member accounted for exactly once. Neutral/default
(`pastelWhite`) maps to itself — FR-012 satisfied.

## Entity: Color Swatch *(catalog member, existing shape extended)*

A single selectable color, currently `CARD_COLORS[color]` in
`cardColors.ts`. This feature changes how its text fields are sourced
(`research.md` §4) but not its role.

| Field | Type | Notes |
|---|---|---|
| `value` | `CardColor` | The union member / stored identifier |
| `nameKey` | i18n key (new) | Replaces the current hardcoded `name` string; resolved via `t()` in the consuming component, reusing the dormant `colors` namespace's convention |
| `tooltipKey` | i18n key (new) | Replaces the current hardcoded `tooltip` string |
| `ariaLabelKey` | i18n key (new) | Replaces the current hardcoded `ariaLabel` string |
| `background` / `border` / `text` | Tailwind class strings | Unchanged shape; values only change if a color is added/renamed by curation |
| `preview` | Tailwind class string | Swatch fill shown in the picker itself |
| `isNeutralDefault` | boolean (new, derived) | `true` only for the FR-012 neutral/default member; lets the panel mark it distinctly from "no selection" |

## Entity: Color Picker State

The control's own interaction state (trigger + panel), redesigned but
functionally equivalent to the current implementation's `isOpen` /
`popupPosition` local state.

| Field | Type | Notes |
|---|---|---|
| `open` | boolean | Panel visibility, now owned by `useBoardMenuOverlay` rather than local `useState` |
| `selectedColor` | `CardColor` | The card's (or add-card form's) current value — prop-driven, unchanged in shape |
| `touchReachable` | boolean (conceptually always `true` post-redesign) | Recorded here to make explicit that, unlike today, there is no viewport/input-method state in which the trigger is undiscoverable (FR-011a) |
| `disabled` | boolean | Unchanged — drives whether the trigger opens the panel at all (edit-rights gating, FR-004) |

## Entity: Card *(existing, consumed unchanged in shape)*

`Card.color?: CardColor` (`src/features/boards/types/card.ts`). This
feature does not change the field's shape or its write path
(`onUpdate(card.id, { color })`), only the set of valid `CardColor` values
it may hold (via the Color Catalog Curation Mapping migration) and how a
new value is chosen.

## Entity: Board State (picker-open variants, for accessibility verification)

Scoped to just the states relevant to this control's own accessibility
contract (`contracts/accessibility-interaction-contract.md`).

| Variant | Description |
|---|---|
| `picker-closed-desktop-hover` | Trigger visible on hover/focus (existing desktop behavior, preserved) |
| `picker-closed-touch` | Trigger persistently visible without hover (new, FR-011a) |
| `picker-open` | Panel open, showing the curated catalog with the current selection marked (FR-005) |
| `picker-open-selected-hover` | A non-current swatch hovered/focused, showing its name (FR-006) |
| `picker-disabled` | Trigger present but non-interactive for a participant without edit rights — or, per FR-004, entirely absent; whichever the selected direction adopts, it must be unambiguous |
| `add-card-form-picker-open` | Same panel, opened from `GroupableColumn.tsx`'s add-card form context (User Story 3) |

## Entity: Design Token Extension *(conditional)*

Populated only if the selected Visual Direction requires a token not
already defined in `src/lib/theme/tokens.ts`. Each new token MUST record its
`contrastPairing` and pass the project's token contrast test in both themes
before use. Expected to remain empty for the picker's own chrome (the
existing semantic token system already covers surfaces/borders/text used by
`CardMenu.tsx`'s equivalent panel) — any new tokens are more likely to
originate from swatch-specific work already governed by the Color Catalog
Curation Mapping and feature 009's existing contrast system, not from this
entity.
