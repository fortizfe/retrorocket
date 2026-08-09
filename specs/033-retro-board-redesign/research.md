# Phase 0 Research: Retrospective Board Redesign

All Technical Context fields in `plan.md` are resolved from the existing
codebase (features 010/019/021/028/029/031 established the tooling and
architecture this feature reuses); no `NEEDS CLARIFICATION` markers remain.
This document instead resolves the open *design/engineering* decisions the
spec's Assumptions deliberately left open, so Phase 1 has a concrete,
justified basis to design against.

## 1. Rendering approach at validated scale (no virtualization dependency)

**Decision**: Render all cards within a column directly (no list-
virtualization library) up to the validated 30+ cards/column, 15 concurrent
participants scale from SC-001/SC-007. Continue relying on `React.memo` on
card-level components, stable `key`s, and the existing `useOptimizedCards`
memoized derivation (`cardsByColumn`) to avoid unnecessary re-renders under
real-time updates.

**Rationale**: A few dozen card DOM nodes per column, times up to four
columns, is well within a modern browser's comfortable render budget —
virtualization typically starts paying off in the low thousands of items,
and it structurally conflicts with `@dnd-kit`'s sortable-context model
(which needs all draggable items mounted to compute drop targets), so
adding it here would break drag-and-drop, not just add unneeded complexity.
Constitution V (Simplicity/YAGNI) and Principle III (new-dependency
justification) both weigh against introducing it at this scale.

**Alternatives considered**: `react-window` / `@tanstack/virtual` (rejected
— incompatible with `@dnd-kit`'s mount-everything sortable model, and
unneeded at this scale). If real-world usage later exceeds 30+ cards/column
by a wide margin, this can be reconsidered via the `pick-ui-library` skill
as a separate, measured decision — likely trading `@dnd-kit` for a
virtualization-compatible alternative rather than bolting virtualization on.

## 2. Drag-and-drop and menu-positioning foundation (reused, not replaced)

**Decision**: Continue using `@dnd-kit/core` + `@dnd-kit/sortable` +
`@dnd-kit/utilities` for card reorder/move (FR-004) and
`@floating-ui/react` for the reaction picker's and menus' viewport-aware
anchored positioning (FR-003, FR-012) — both already adopted in feature 010
specifically to fix positioning defects this feature must not regress.

**Rationale**: These are the project's already-proven, already-justified
(Principle III) solutions to exactly the interaction problems this redesign
touches. Re-litigating drag-and-drop or positioning libraries would violate
Simplicity (V) with no stated user-facing benefit — the spec's FR-004 and
FR-003 explicitly call for *preserving* this behavior, not replacing its
mechanism, only its visual presentation.

**Alternatives considered**: None seriously — swapping either library
during a presentation-only redesign would be scope creep against FR-017
(no change to underlying behavior/architecture) for no requirement-driven
reason.

## 3. Menu/control reveal pattern (touch- and keyboard-operable, never hover-only)

**Decision**: Every board menu and control (card menu's "convert to
action" trigger, the column header menu, the options menu, the facilitator
menu, the reaction-picker trigger) MUST render as an always-visible icon
button (not a hover-reveal affordance), consistent with how `CardMenu.tsx`,
`FacilitatorMenu.tsx`, and `RetrospectiveTopbar.tsx`'s options button
already behave today. The redesign MUST NOT introduce hover-only reveal for
any of these controls in any candidate direction.

**Rationale**: This board is used live, in-meeting, frequently on shared
screens or tablets with no hover input at all — a hover-reveal pattern
would be actively hostile to the board's primary real-world usage context,
beyond even the general WCAG operability requirement (Constitution VIII)
and the `apple-design` skill's Flexibility principle. The current
implementation already gets this right (always-visible trigger buttons);
the redesign's job is to keep that true while changing the visual
treatment, matching FR-012 and the touch/keyboard requirement already fixed
for the dashboard in feature 031 (§4 of that feature's research.md).

**Alternatives considered**: Hover-reveal-on-card-hover for the card menu
(rejected — regresses touch/keyboard operability with no stated benefit).

## 4. Motion decisions

**Decision**: Continue using framer-motion (Constitution III — already
adopted) for entrance/exit, drag-feedback, and menu/popover transitions,
reusing the `AnimatePresence`-must-directly-wrap-the-animated-content fix
established in feature 028 (and re-applied to `FacilitatorMenu.tsx`'s
portal), and the existing `useReducedMotion` hook for every new animated
interaction: card entrance when another participant adds one in real time,
drag-lift/drop feedback, group collapse/expand, menu/popover open/close,
countdown state transitions, and reaction-picker open. Each new motion
decision MUST be made via the `animate` skill (Constitution IX), not ad
hoc; the final result MUST pass a `review-animations` critique pass before
this feature closes.

**Rationale**: Consistency with the app's already-adopted motion system and
the exit-animation-mounting fix already proven necessary for this exact
board (feature 028 applied it to `FacilitatorMenu.tsx` specifically).
Real-time card entrance is a board-specific motion case not present on the
dashboard: another participant's card appearing must read as an addition,
not a jarring pop-in or a distracting animation that competes with the
participant's own in-progress typing — this is exactly the kind of
decision the `animate` skill's process (whether to animate, purpose,
curve/duration, interruption behavior) exists to make deliberately rather
than by default.

**Alternatives considered**: No entrance animation for remotely-added cards
(a legitimate candidate the `animate` skill should evaluate against a
subtle one, not assumed here).

## 5. Visual direction exploration process

**Decision**: Explore 2-3 genuinely distinct visual directions before
committing to one, with the product owner personally reviewing and
approving the shipped direction (FR-018, SC-006) — the same process
established in feature 029 and reused in feature 031.

**Rationale**: Constitution-mandated for this task shape; precedent already
exercised and signed off on by the product owner twice, so the same
procedure (built as real, interactive candidates; functional not static;
reviewed side-by-side; one selected with the rest recorded as rejected with
a reason) is reused rather than re-invented.

**Note on tooling**: the constitution names the `prototype` skill
specifically for this step, but it is not installed in this environment.
Per the same precedent set in features 029 and 031, `apple-design`/
`emil-design-eng` are substituted for building the 2-3 real, interactive
candidates. This is recorded here explicitly — rather than only in
`tasks.md` — so the substitution is visible before implementation starts,
and the product-owner review checkpoint is scoped to acknowledge it
alongside the direction selection.

## 6. Closing the `/retro/:id` accessibility-coverage gap

**Decision**: Extend `e2e/accessibility.spec.ts` with a new theme × state
matrix for `/retro/:id` (loading, populated board, empty column, error),
following the same `expectNoViolations` pattern already used for `/`,
`/dashboard`, and `/perfil`. This is net-new coverage, not a rewrite of an
existing case.

**Rationale**: Investigation during planning found `accessibility.spec.ts`
currently has zero coverage of the retrospective board route — the surface
this entire feature redesigns has no automated WCAG 2.1 AA regression gate
today. SC-003 requires zero WCAG 2.1 AA violations across all of this
view's states; without this addition there is no automated way to verify
that claim, and Constitution VIII requires this bar to be verified in CI
where automation exists.

**Alternatives considered**: Relying on manual/human review alone
(rejected — the constitution requires automated verification once such
automation exists in the project, and it already exists as a reusable
pattern here, just not applied to this route).

## 7. Apple HIG component vocabulary relevant to this feature (reference inventory)

Non-binding reference for Phase 1 / prototyping, drawn from the
constitution-mandated `apple-design` skill and general HIG component
vocabulary — this does not fix any candidate direction's choices, it only
inventories which Apple interface concepts are relevant to a live,
collaborative editing surface like this one:

- **Collections** — the card grid within each column is fundamentally a
  collection of user-generated content items, the same vocabulary anchor
  used for the dashboard's board list (031) but applied to a denser,
  real-time-mutating collection here.
- **Popovers & Menus** — the options menu, facilitator menu, card menu, and
  column header menu are all HIG popover/menu surfaces; the skill's
  guidance on anchored positioning, dismissal, and content depth applies
  directly (already technically satisfied via `@floating-ui/react`, per §2
  above — this is about visual/motion treatment, not repositioning logic).
- **Segmented Controls / Tab Bars** — the facilitator menu's four tabs
  (Controls, Sentiment, Team Mood, Notes) map to this HIG concept; current
  badge-driven tab indicators (timer state, sentiment status) are a
  candidate for a more restrained, HIG-aligned badge/indicator treatment.
- **Sheets** — on narrow viewports, full-screen or bottom-sheet
  presentation is a HIG-native alternative to a cramped dropdown for the
  facilitator menu and export popover; a candidate direction may explore
  this for mobile without changing the underlying open/close/tab-state
  logic.
- **Materials** — translucent card/toolbar treatment and material-weight
  hierarchy (skill's Materials & depth guidance) are candidates for
  differentiating the visual directions explored in Phase 1, consistent
  with the treatment already applied to the dashboard (031).
- **Live/Activity indicators** — the countdown timer and typing indicators
  are the board-specific analogue of HIG's live-activity/status
  vocabulary: they must stay legible and unobtrusive while updating
  continuously in real time, distinct from a one-shot notification.

## Summary of resolved unknowns

| Topic | Resolution |
|---|---|
| Virtualization dependency | Not needed at validated scale; would break `@dnd-kit` sortable model (§1) |
| Drag-and-drop / positioning libraries | Reused as-is (`@dnd-kit`, `@floating-ui/react`) — not replaced (§2) |
| Menu/control reveal pattern | Always-visible trigger buttons, never hover-only, in every candidate direction (§3) |
| Motion system | framer-motion + `useReducedMotion`, via `animate`/`review-animations` skills; real-time card entrance is a new board-specific motion decision (§4) |
| Visual direction process | 2-3 directions via `apple-design`/`emil-design-eng` (prototype-skill substitution), product-owner approval (§5) |
| Accessibility E2E gap | `accessibility.spec.ts` gains `/retro/:id` coverage — currently absent (§6) |
| Relevant HIG vocabulary | Collections, Popovers & Menus, Segmented Controls/Tab Bars, Sheets, Materials, Live/Activity indicators (§7) |
