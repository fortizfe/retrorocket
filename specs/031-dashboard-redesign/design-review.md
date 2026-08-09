# Design Review: Mis Tableros (Dashboard) Redesign

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Purpose**: Structured review of the shipped implementation (selected
Direction B — "Structured Table") against Apple Human Interface Guidelines
principles (clarity, deference, depth), per SC-006. Closes with zero
unresolved high-priority findings, as required to consider this feature's
design work complete.

**Reviewed**: 2026-08-09, against the implementation on branch
`031-dashboard-redesign` (Dashboard.tsx, BoardRow.tsx, BoardControlsBar.tsx,
Pagination.tsx, and the reused CreateBoardFlow/JoinRetrospectiveModal/
EditRetrospectiveModal).

## Clarity

Clarity asks: is the content and its hierarchy immediately legible, and does
every element earn its place?

- **Typography carries the hierarchy.** Page title (`text-2xl`/`text-3xl`,
  semibold, tight tracking) > board title (`text-sm`/`0.925rem`, medium) >
  metadata (`text-xs`, muted) — a clean three-tier scale, no competing
  emphasis.
- **One layout, not two competing ones.** The pre-redesign Grid/List toggle
  asked the visitor to choose a presentation before they could even see
  their boards. Direction B removes that decision entirely — one adaptive
  layout, column-aligned on desktop and reflowing to stacked rows on
  mobile via CSS (`md:contents`), same markup throughout.
- **The scope filter is a real control, not a decoration.** `role=
  "radiogroup"`/`role="radio"`, arrow-key navigable, with live counts next
  to each option — the state and its consequence (how many boards match)
  are both visible at once.
- **Column headers only render where they add information.** Hidden below
  `md`, since the mobile stacked layout already labels each field via
  icons and the role badge — no redundant chrome.
- **Finding (resolved)**: the original error-state copy used the literal
  word "error" ("Error al cargar los tableros"); the redesign replaced it
  with clearer, calmer copy ("Something went wrong" / "We couldn't load
  your boards. Please try again.") that states what happened and offers a
  next step, without technical jargon. No open finding.

## Deference

Deference asks: does the interface stay out of the way of the content
(the visitor's boards), rather than competing with it for attention?

- **Chrome recedes into muted, semantic tokens.** No decorative gradients
  survive in the board list itself — `bg-action` (flat), `border-default`,
  `text-muted` — color is reserved for meaning (role badges, focus rings,
  destructive actions), not decoration. The two remaining gradient
  treatments (`CreateBoardFlow`/`JoinRetrospectiveModal`'s header icon
  badges) are small, contained accents on entry-point modals, not the
  primary list surface.
- **The toolbar is a thin, translucent band** (`backdrop-blur-sm` over
  `bg-surface-raised/80`), not a heavy fixed bar — it reads as a functional
  layer above the content, not a wall between the visitor and their boards.
- **Motion never draws attention to itself.** Entrance/reflow uses a
  200-250ms fade+8px slide with a capped stagger and a proper `ease-out`
  curve (`review-animations` pass: Approve, no feel-breaking findings) —
  present enough to communicate a state change, quiet enough not to be the
  point.
- **Finding (resolved)**: the pre-redesign rename/delete icons were
  opacity-0-until-hover, which — beyond the FR-015 accessibility defect —
  also meant the interface was *unpredictable*: an owner couldn't tell at a
  glance whether a control existed without moving the mouse over every row.
  The redesign's always-visible, visually quiet icon cluster is more
  deferential in the HIG sense, not less: what's there is honestly shown,
  not hidden behind a gesture.

## Depth

Depth asks: does the interface communicate structure and hierarchy through
layered materials, not just flat color?

- **The toolbar's translucency signals "floating above," not "part of the
  page."** `backdrop-blur-sm` + a semi-transparent surface token creates a
  real, if restrained, material layer — appropriate for a utility surface
  where restraint (per the constitution's Simplicity principle) matters
  more than spectacle.
- **Row-level depth is interaction-driven, not decorative.** No card
  shadows at rest; `hover:shadow-medium`/`focus-within:shadow-medium`
  appear only when a row is the thing being acted on — depth follows
  attention, not the other way around.
- **Finding (low-priority, not blocking)**: the two reused entry-point
  modals (`CreateBoardFlow`, `JoinRetrospectiveModal`) still use a heavier
  `glass-strong` backdrop treatment than the board list's own materials
  language. This is a legitimate, intentionally-scoped deferral — per
  `data-model.md`'s Assumptions, these modals' visual redesign was
  deliberately out of scope for this feature (only their primary-CTA
  buttons were aligned, for functional-color consistency); a full
  materials-language unification across all dashboard surfaces is a
  reasonable follow-up, not a defect in what shipped.

## Cross-cutting

- **Accessibility**: zero WCAG 2.1 AA violations across all 5 `List State`
  variants (loaded, loading, empty, no-results, error) in both themes
  (`e2e/accessibility.spec.ts`, 10/10 passing) — clarity and depth choices
  above were verified, not assumed.
- **Motion**: `review-animations` skill pass — Approve, zero blocking
  findings (see `tasks.md` T042).
- **Consistency with prior features**: no new design tokens were needed
  (`tasks.md` T011) — the redesign draws entirely from the semantic token
  system features 028/029 established, keeping this surface visually
  coherent with the rest of the app rather than introducing a fourth visual
  language.

## Outcome

**Zero unresolved high-priority findings.** The two items noted above are
resolved-in-shipped-work or explicitly-scoped-out, not open defects. SC-006
is satisfied.
