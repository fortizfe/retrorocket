# Implementation Plan: Card Color Picker Redesign (Apple HIG-Inspired)

**Branch**: `037-card-color-picker-redesign` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/037-card-color-picker-redesign/spec.md`

## Summary

Completely rebuild the visual layout and look-and-feel of the per-card color
picker (`ColorPicker.tsx`, used on an existing retrospective card via
`DraggableCard.tsx` and in the add-card form via `GroupableColumn.tsx`) using
Apple Human Interface Guidelines principles (clarity, deference, depth), via
the project's mandated Apple-design skill package. Per FR-014, the redesign
explores 2-3 genuinely distinct visual directions before the product owner
picks one, presented as a reviewable artifact with light/dark captures. The
core capability — opening the picker, browsing colors, selecting one, and
having it applied to the card in real time — is preserved exactly (FR-002),
as is the picker's edit-rights gating (FR-004) and its neutral/default color
(FR-012).

Two capabilities are explicitly new, not merely re-skinned, both resolved via
clarifications recorded in `spec.md`:

- **FR-011a (touch reachability)**: today the trigger only reveals on mouse
  hover (`opacity-0 group-hover:opacity-100 focus-within:opacity-100` in
  `DraggableCard.tsx`), so it is unreachable on touch devices. Unlike feature
  036's topbar menus — which needed a wholly new mobile entry surface because
  their entire host was `hidden md:flex` — this card already has a directly
  analogous, already-solved precedent one component over: `EmojiReactions.tsx`
  renders its "add reaction" trigger as an always-visible, non-hover-gated
  button sitting inline in the card's reaction row. Research (`research.md`
  §2) treats making the color-picker trigger persistently reachable (by the
  same means, or a close variant) as the primary candidate, not a new sheet/
  full-screen surface, since the trigger itself — not a large multi-tab panel
  — is all that is missing on touch.
- **FR-013/FR-013a (catalog curation with remapping)**: the current 30-color
  catalog (`cardColors.ts`) MAY be curated/reduced/reorganized; any removed
  or renamed color MUST be remapped, for every existing card using it, to its
  closest equivalent in the new catalog — no card is left broken or orphaned.

A further, previously-unstated correctness gap surfaces from research and is
folded into this redesign rather than deferred: the picker's color names,
tooltips, and aria-labels are today hardcoded Spanish string literals inside
`cardColors.ts`, not sourced from i18next at all — despite a legacy, unused
9-color `colors` namespace already sitting in both `src/locales/en.json` and
`es.json` (never wired to any component). FR-008 ("MUST continue to be
sourced from the existing translation system") and User Story 5's locale
acceptance criteria cannot be satisfied as currently implemented; this plan
treats wiring the (curated) catalog through i18next as in-scope, required
work, reusing/extending that dormant `colors` namespace's key convention
rather than introducing a new one (`research.md` §4).

This is otherwise a presentation-and-catalog-layer-only redesign: no change
to how a color selection is persisted or synchronized in real time, no new
backend/API capability, and the already WCAG-audited per-swatch contrast
system (`globals.css`'s `.card-color-bg.*` rules, established under feature
009 and asserted by `cardColors.a11y.test.ts`) is extended for any new/
renamed swatch, not replaced or re-derived from scratch.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.2, built with Vite 4

**Primary Dependencies**: Tailwind CSS 3.3 (semantic CSS-custom-property
token system), framer-motion 10.18 (`MotionConfig reducedMotion="user"`
wraps the app in `App.tsx`), @floating-ui/react 0.27 (the project's
consolidated anchored-overlay foundation via `useBoardMenuOverlay`, already
used by the options menu, facilitator menu, and the card's own convert-to-
action `CardMenu`; `ReactionPicker`/`useEmojiPicker` predate that
consolidation and positioned independently via a near-identical but
separate Floating UI setup), react-i18next 15.6 / i18next 25.3, lucide-react
(icons), the existing `useReducedMotion` hook
(`src/lib/hooks/useReducedMotion.ts`), and the existing card-color system
(`src/lib/utils/cardColors.ts`, `src/styles/globals.css`'s `.card-color-bg.*`
rules)

**Storage**: N/A directly — a card's color is written through the existing
`onUpdate(card.id, { color })` callback chain already used for every other
card field, itself backend-mediated (no direct Firestore access from this
component tree), enforced by the existing architecture test
`src/test/architecture/retrospective-board-no-firestore.test.ts` (feature
019), which this redesign MUST NOT violate. `CardColor` is a closed TS union
type (`src/features/boards/types/card.ts`) enumerating every valid color
value; curating the catalog (FR-013) means narrowing/renaming members of
this type, which is a compile-time-checked change the type-checker will
surface everywhere a now-removed literal was referenced.

**Testing**: Vitest + Testing Library — `src/test/lib/components/ui/ColorPicker.test.tsx`
(711 lines) and `ColorPickerClean.test.tsx` (740 lines) for the control,
`src/test/lib/utils/cardColors.test.ts` (321 lines) and
`cardColors.a11y.test.ts` (125 lines, WCAG contrast assertions per swatch per
theme, feature 009) for the catalog; Playwright E2E —
`e2e/retrospective-board.spec.ts` (a dedicated color-selection scenario
around line 198-226 that clicks a specific swatch by its current Spanish
aria-label, `'Seleccionar color azul suave'` — will need updating if that
color's name/value changes under curation) and `e2e/accessibility.spec.ts`
(axe-core via `@axe-core/playwright`)

**Target Platform**: Web (responsive), evergreen browsers, light/dark theme,
en/es locales; adds genuine touch reachability for the picker trigger for
the first time (FR-011a)

**Project Type**: Web application (single Vite/React SPA + a thin Express
backend mediation layer, unaffected by this feature)

**Performance Goals**: Panel open/close and selection feel immediate,
consistent with the project's existing sub-100ms interaction response bar
(feature 033). Unlike the single global menus in feature 036, a `ColorPicker`
trigger mounts once per visible card (potentially 20-30+ simultaneously on a
busy column) — only the *trigger* has that multiplicity; the selection panel
itself is still ever open for at most one card at a time, so this is a
per-trigger render-cost consideration, not a concurrent-panel one.

**Constraints**: Presentation-and-catalog-layer only outside the two scoped
exceptions (FR-011a, FR-013a); MUST NOT alter how a color change is
persisted/synchronized; MUST extend, not replace, the existing per-swatch
WCAG-contrast system from feature 009 for any surviving or new color; MUST
NOT violate the no-direct-Firestore architecture test.

**Scale/Scope**: The `ColorPicker` control and the `cardColors.ts` catalog,
wherever the control appears — an existing card (`DraggableCard.tsx`) and the
add-card form (`GroupableColumn.tsx`). No change to the rest of either
surface (card content, voting, reactions, drag-and-drop, the card's own
"..." menu; the add-card form's textarea/emoji-picker/submit controls).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Gate |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Every behavioral change (touch entry point, catalog remapping, i18n wiring, restructured component) MUST have a preceding failing test; purely presentational changes to already-tested paths are verified via updated existing tests | PASS — enforced task-by-task in `tasks.md` |
| II. Library-First | No new business-logic capability is introduced (FR-011a is a new *presentation* entry point, FR-013a is a *data-migration* rule for an existing field, not a new domain capability); the existing `onUpdate` card-update pipeline is reused unchanged | PASS |
| III. Prefer Proven Third-Party Libraries | Reuses `@floating-ui/react` (via `useBoardMenuOverlay`, the project's consolidated pattern) and `framer-motion`; no new dependency anticipated | PASS |
| IV. SOLID | The picker and catalog stay UI/data-only; the color value continues to flow through `onUpdate`/the existing hooks, never touching Firestore directly | PASS |
| V. Simplicity (KISS + YAGNI) | Scope is deliberately the color picker control and its catalog only — no speculative extension to other card controls (drag handle, `CardMenu`, reactions), which stay exactly as prior features left them | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | Existing coverage thresholds MUST NOT drop; new touch-entry-point, remapping, and i18n-wiring code MUST carry its own unit tests | PASS — checked in `tasks.md`'s Polish phase, per `quickstart.md` |
| VII. E2E Testing with Playwright | `e2e/retrospective-board.spec.ts`'s color-selection scenario MUST keep passing (updated for any renamed/removed swatch it references) and `e2e/accessibility.spec.ts` MUST keep passing; new E2E coverage MUST be added for the touch entry point (no prior touch-viewport coverage of this control exists to extend) | PASS — new coverage required, tracked in `tasks.md` |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | The picker, including the new touch entry point, MUST independently satisfy WCAG 2.1 AA in both themes across all states; the existing per-swatch contrast suite (`cardColors.a11y.test.ts`) MUST be extended (not replaced) to cover any curated/renamed/new swatch | PASS — existing coverage extended, no gap left open |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | `apple-design`/`emil-design-eng` govern the general visual redesign of the picker and its touch entry point; `animate` governs each new motion decision (panel open/close, selection feedback, the new touch-trigger's own presentation); `review-animations` governs the final critique pass; `find-animation-opportunities` informs whether hover/selection feedback deserves motion; `pick-ui-library` would govern any new UI-library need (none anticipated, see Principle III). **Note**: as in features 029, 031, 033, and 036, the `prototype` skill is not installed in this environment; `apple-design`/`emil-design-eng` are substituted for building the 2-3 real, interactive candidate directions (FR-014), a substitution that MUST be explicitly acknowledged by the product owner alongside the direction selection, per the constitution's Governance clause | PASS — condition (skill substitution) noted and gated on explicit product-owner acknowledgment |

No unjustified violations. Complexity Tracking is left empty; no genuinely
new dependency is anticipated (the touch entry point is expected to reuse
the existing always-visible-trigger pattern already proven by
`EmojiReactions.tsx`, not a new interaction primitive).

**Post-Phase-1 re-check**: `research.md`, `data-model.md`, `contracts/*`, and
`quickstart.md` introduce no new dependency (the touch entry-point pattern
space is explicitly constrained in `research.md` §2 to the existing
always-visible-trigger precedent, per Principle III), no Firestore/domain-
service coupling (the color value continues to flow through `onUpdate`/the
existing hooks per `data-model.md`'s entities), and no reduction in test or
accessibility coverage (`contracts/functional-parity-contract.md` and
`contracts/accessibility-interaction-contract.md` both require the existing
suites to keep passing and add new touch-viewport and i18n coverage rather
than removing any). All nine gates remain PASS after Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/037-card-color-picker-redesign/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── visual-direction-review-contract.md
│   ├── functional-parity-contract.md
│   └── accessibility-interaction-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/src/
├── lib/
│   ├── components/
│   │   └── ui/
│   │       └── ColorPicker.tsx                    # The control: trigger +
│   │                                                # selection panel; hand-
│   │                                                # rolled positioning today,
│   │                                                # rebuilt on
│   │                                                # useBoardMenuOverlay
│   ├── utils/
│   │   └── cardColors.ts                          # Color catalog, per-swatch
│   │                                                # config, styling helpers;
│   │                                                # subject to curation +
│   │                                                # i18n wiring (FR-013,
│   │                                                # FR-008)
│   └── hooks/
│       └── useReducedMotion.ts                    # Existing, reused for any
│                                                    # motion honoring
│                                                    # prefers-reduced-motion
├── features/
│   └── boards/
│       ├── retrospective/
│       │   ├── components/
│       │   │   ├── DraggableCard.tsx              # Existing-card usage +
│       │   │   │                                   # hover-only reveal
│       │   │   │                                   # cluster (site of the
│       │   │   │                                   # FR-011a touch fix)
│       │   │   └── EmojiReactions.tsx              # Reference precedent for
│       │   │                                        # an always-visible,
│       │   │                                        # non-hover-gated trigger
│       │   └── hooks/
│       │       └── useBoardMenuOverlay.ts          # Shared anchored-overlay
│       │                                            # hook the picker adopts
│       ├── types/
│       │   └── card.ts                             # `CardColor` union type;
│       │                                            # narrowed/renamed by
│       │                                            # catalog curation
│       └── clustering/
│           └── components/
│               ├── GroupableColumn.tsx             # Add-card form usage
│               └── GroupCard.tsx                   # Reads a group's head
│                                                     # card color directly
│                                                     # via CARD_COLORS[...],
│                                                     # unvalidated today —
│                                                     # must route through
│                                                     # resolveCardColor
│                                                     # (analysis finding I1)
└── styles/
    └── globals.css                                 # `.card-color-bg.*`
                                                       # per-swatch light/dark
                                                       # background rules
                                                       # (feature 009); extend
                                                       # for any curated/new
                                                       # swatch, don't replace

retro-rocket/src/locales/
├── en.json                                          # Dormant `colors`
└── es.json                                          # namespace (9 keys, never
                                                       # wired) — extend/adapt
                                                       # for the curated catalog
                                                       # rather than starting a
                                                       # new key convention

retro-rocket/src/test/
├── lib/
│   ├── components/ui/
│   │   ├── ColorPicker.test.tsx
│   │   └── ColorPickerClean.test.tsx
│   └── utils/
│       ├── cardColors.test.ts
│       └── cardColors.a11y.test.ts
└── architecture/
    └── retrospective-board-no-firestore.test.ts     # MUST NOT be violated

retro-rocket/e2e/
├── retrospective-board.spec.ts                       # Color-selection
│                                                       # scenario (~line 198)
└── accessibility.spec.ts
```

**Structure Decision**: No new top-level directories. This feature modifies
existing files in place under their current locations
(`src/lib/components/ui`, `src/lib/utils`, `src/features/boards/retrospective`,
`src/features/boards/clustering`, `src/styles`, `src/locales`). The dev-only
prototype-comparison route pattern established in feature 033 and reused in
036 (`import.meta.env.DEV`-gated, deleted after the product owner's direction
review) is reused for this feature's own 2-3 candidate directions rather than
inventing a new mechanism.

## Complexity Tracking

*No violations to justify at plan time.* If Phase 0 research determines the
touch entry point cannot reasonably reuse the `EmojiReactions.tsx`-style
always-visible-trigger precedent, it will be recorded here with its
Principle III justification before Phase 1 design proceeds.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_ | | |
