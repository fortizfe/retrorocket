# Phase 1 Data Model: Retrospective Board Redesign

This feature is presentational; its "entities" are design-process and
view-state constructs used to plan and verify the rebuild, not new
persisted domain records. No backend/API schema changes; `Card`, `CardGroup`,
`ActionItem`, `Retrospective`, `Participant`, `FacilitatorNote`, and
`SentimentResult` records continue to be read/written exclusively through
`backendRetrospectiveClient.ts` / `backendRealtimeClient.ts` (FR-017).

## Entity: Visual Direction

One of the 2-3 genuinely distinct candidate redesigns explored (via the
`apple-design`/`emil-design-eng` substitution for the `prototype` skill,
per `research.md` §5) before the product owner selects one to ship (FR-018).

| Field | Description |
|-------|-------------|
| `id` | Stable slug, e.g. `direction-a`, `direction-b`, `direction-c`. |
| `concept` | One-sentence description of the direction's core visual idea. |
| `distinguishingChoices` | What makes this direction genuinely different from the others explored — not a palette swap of the same layout (materials/depth use, card/column treatment, menu presentation pattern — dropdown vs. sheet, motion character). |
| `menuPresentationPattern` | How this direction presents the options/facilitator/export/card/column-header menus — e.g. "anchored dropdown popovers", "bottom sheet on narrow viewports + dropdown on wide", per `research.md` §7's Sheets/Popovers vocabulary. |
| `newDependencies` | Any library beyond framer-motion/@dnd-kit/@floating-ui/Tailwind this direction would require, with its Principle III justification — empty if none. |
| `status` | `explored`, `selected`, or `rejected`. Exactly one `Visual Direction` per feature has `status = selected`. |
| `reviewedBy` | Who reviewed it — per the constitution's design-exploration process, the product owner. |
| `rejectionReason` | Required when `status = rejected`; free text explaining why the product owner didn't choose it. |

**Validation rules**:
- Exactly 2 or 3 `Visual Direction` records exist for this feature (FR-018's "2-3").
- Exactly one has `status = selected`; the rest have `status = rejected` with a non-empty `rejectionReason`.
- Each `Visual Direction` (including rejected ones) MUST be functional enough to demonstrate the full board capability set — card CRUD/vote/like/react, drag-and-drop, grouping, facilitator menu, export — against real board data, not static mockups, per `contracts/visual-direction-review-contract.md`.
- Every `Visual Direction`'s `menuPresentationPattern` MUST keep every menu/control keyboard- and touch-operable per `research.md` §3 — no candidate that fails this may enter product-owner review.
- If `newDependencies` is non-empty for the `selected` direction, the Constitution Check's Principle III gate MUST be re-verified before implementation tasks are generated.

### Catalog (2026-08-09)

Built via `apple-design`/`emil-design-eng` (the `prototype` skill named in
FR-018 is not installed in this environment; substituted per the precedent
established in features 029/031 — see `research.md` §5 and `plan.md`'s
Constitution Check row IX). Each is a real, working route
(`/dev/retro-directions/:id`, dev-only, tab-switchable) wired to actual
board data via `usePrototypeBoardData`, with working add/vote/like/react,
real `@dnd-kit`-backed drag-and-drop reorder (`PrototypeDragColumn`), and
the real `FacilitatorMenu`/`ImprovedExportPopover` embedded for full
facilitator/export functionality. Verified against a seeded board (32+6+6
cards across 3 columns, 3 groups, 3 action items, 2 facilitator notes) with
zero console errors (`tasks.md` T008).

| `id` | `concept` | `distinguishingChoices` | `menuPresentationPattern` | `newDependencies` | `status` | `reviewedBy` |
|---|---|---|---|---|---|---|
| `direction-a` | **Focused Canvas** — deference-forward: chrome recedes, participants' own content leads | Translucent floating toolbar (`backdrop-blur-xl`) over a page-background canvas — cards have no border at rest, only a soft ring on hover/focus; quiet/low-contrast action row (vote/like/react) that firms up on interaction; generous whitespace and line-height over density; minimal label-row column headers (no background block) | Anchored floating dropdown, translucent/blurred, opens from the trigger | None — existing Tailwind tokens/utilities + framer-motion + `@dnd-kit`/`@floating-ui/react` only | `rejected` | Product owner (Fernando Ortiz) |
| `direction-b` | **Structured Clarity** — clarity-forward: unambiguous boundaries and hierarchy | Opaque, solidly-tinted column header bars (not a quiet label row); cards carry a full visible border at rest (never hover-revealed); action row and card-menu trigger always fully visible (no opacity choreography); solid non-translucent topbar and dropdown; denser type/spacing scale | Anchored dropdown, solid/opaque, bordered | None | `rejected` | Product owner (Fernando Ortiz) |
| `direction-c` | **Layered Depth** — materials/depth-forward: layered surfaces communicate order | Floating glass toolbar detached from the viewport edge (a dock, not an edge-to-edge bar); translucent tinted-gradient column panels (`backdrop-blur-sm`); elevated glass cards (`backdrop-blur-md` + shadow) whose shadow intensifies while dragging (tactile lift); glass options panel with a stronger shadow tier than Direction A's quiet menu | Anchored dropdown, glass/elevated, stronger shadow than A | None | `selected` | Product owner (Fernando Ortiz) |

**`rejectionReason`**:
- `direction-a`: Not selected — product owner chose Direction C's
  materials/depth-forward treatment over Focused Canvas's deference-forward,
  quiet/borderless approach.
- `direction-b`: Not selected — product owner chose Direction C over
  Structured Clarity's clarity-forward, always-visible/dense treatment.

**Status**: **Resolved 2026-08-09** — product owner (Fernando Ortiz) reviewed
all three via a published side-by-side comparison artifact (light/dark
screenshots of each direction against the same seeded, densely-populated
board) and selected **Direction C (Layered Depth)**. Directions A and B are
rejected. The comparison artifact disclosed the `prototype` → `apple-design`/
`emil-design-eng` skill substitution used to build all three candidates
(`plan.md`'s Constitution Check row IX, `research.md` §5) before the
decision was made; the product owner's selection, made with that disclosure
in view, serves as the acknowledgment this checkpoint requires — no
objection to the substitution itself was raised.
| _pending_ | | | | | | |

## Entity: Card View Model

The view-facing projection of a `Card` (as synced via
`useRetrospectiveRealtimeSync`/`useOptimizedCards`) rendered in this
surface. Not a new persisted shape — a rendering contract over the
existing real-time state.

| Field | Description |
|-------|-------------|
| `id` | Card identifier, used as the list `key` and drag-and-drop item id. |
| `content` | Card text — wraps within the card, preserves intentional line breaks, auto-links URLs (FR-002, existing behavior from feature 010). |
| `column` | The column this card currently belongs to; drives which `DragDropColumn` renders it. |
| `voteCount` | Current vote total (FR-003). |
| `likedByCurrentUser` | Whether the viewer has liked this card (FR-003). |
| `reactions` | Emoji reactions with per-emoji counts and whether the viewer has reacted (FR-003). |
| `groupId` | If present, the `Card Group` this card is a member of (FR-005); absent for ungrouped cards. |
| `isTyping` | Whether the card's author is currently typing an edit, sourced from `TypingProvider` (FR-008). |
| `canConvertToAction` | `true` only when the viewer is the board owner (FR-007); gates whether `CardMenu`'s convert control renders at all. |

**Validation rules**:
- `canConvertToAction` MUST be `false` (control absent, not disabled) for any non-owner viewer.
- A card with `groupId` set MUST render within its `Card Group`'s presentation, not independently in the column's ungrouped list.
- `reactions`/`voteCount`/`likedByCurrentUser` MUST update within 100ms of the underlying real-time event for every connected participant (SC-001).

## Entity: Card Group View Model

A cluster of related `Card View Model`s, formed manually or via AI
suggestion (FR-005).

| Field | Description |
|-------|-------------|
| `id` | Group identifier. |
| `memberCardIds` | Cards currently in the group. |
| `collapsed` | Whether the group is rendered collapsed (summary) or expanded (all member cards visible). |
| `origin` | `manual` \| `ai-suggested` — informs whether a review/accept step preceded creation (US2 Acceptance Scenario 3). |

**Validation rules**:
- An `ai-suggested` group MUST pass through a review step (`GroupSuggestionModal`) before its `origin` transitions from a pending suggestion to a persisted group.
- Disbanding a group MUST return every `memberCardIds` entry to its column as an independent, ungrouped `Card View Model`.

## Entity: Action Item View Model

A follow-up task, either converted from a card or created directly (FR-007).

| Field | Description |
|-------|-------------|
| `id` | Action item identifier. |
| `description` | Task text. |
| `sourceCardId` | If converted from a card, the originating card's id; absent for directly-created action items. |
| `assignedTo` / `assignedToName` | Optional participant assignment. |
| `dueDate` | Optional due date. |
| `visible` | Whether the action items column is currently toggled on (`ActionColumnToggle`, FR-007). |

**Validation rules**:
- Create/edit/delete on an `Action Item View Model` MUST be restricted to the board owner (FR-007, FR-009).
- Toggling `visible` off MUST NOT delete underlying action items — only hides the column.

## Entity: Board Layout State

The dynamic, board-configured column structure driving the grid (FR-006).

| Field | Description |
|-------|-------------|
| `columns` | Ordered list of configured columns (typically three regular columns, e.g. "What helped" / "What hindered" / "What to improve"), sourced from `useRetrospectiveColumns`. |
| `actionColumnEnabled` | Whether the fourth action-items column renders (`showActionColumn`, persisted per-viewer via `uiPreferencesStore`). |
| `columnCount` | `columns.length + (actionColumnEnabled ? 1 : 0)` — drives grid sizing; MUST render correctly for 3 or 4 without a build-time-purged dynamic class name (FR-006, existing fix from feature 010). |
| `responsiveBreakpoint` | Below the existing ~1024px (lg) breakpoint, columns stack into a single column instead of forcing horizontal scroll (FR-006, FR-016). |

**Validation rules**:
- `columnCount` MUST always match the number of columns actually rendered — no silent mismatch between configured columns and rendered grid width.
- Below `responsiveBreakpoint`, every column MUST remain reachable via vertical stacking, never via horizontal scroll of the whole board.

## Entity: Facilitator Menu State

The owner-only menu's tab and control state (FR-009).

| Field | Description |
|-------|-------------|
| `activeTab` | `controls` \| `sentiment` \| `team-mood` \| `notes`. |
| `timerState` | `running` \| `paused` \| `finished` \| `not-started`, sourced from `useCountdown`; drives the Controls tab and the badge shown on the tab trigger. |
| `sentimentEnabled` / `sentimentReady` | Whether sentiment analysis is turned on and has produced results, sourced from `useSentimentContext`; drives the Sentiment and Team Mood tabs' content and badges. |
| `visibleTo` | Always `owner-only` (FR-009) — the menu itself MUST NOT render for a non-owner viewer, not merely render disabled. |

**Validation rules**:
- `visibleTo = owner-only` MUST be enforced by absence, matching the existing `if (!isOwner) return null;` guard — the redesign MUST NOT change this to a disabled-but-visible state.
- `timerState` changes triggered by the owner MUST propagate to every participant's view within the same real-time latency bound as card updates (SC-001).

## Entity: Export State

The export popover's in-progress state (FR-010).

| Field | Description |
|-------|-------------|
| `format` | `pdf` \| `docx` \| `txt`. |
| `facilitatorOptionsAvailable` | `true` only when the viewer is the board owner (e.g. including private facilitator notes in the export). |
| `phase` | `idle` \| `exporting` \| `success` \| `error`. |
| `errorMessage` | Populated only when `phase = error`; MUST be a visible, non-silent message (constitution resilience requirement). |

**Validation rules**:
- `facilitatorOptionsAvailable` MUST be `false` for non-owner viewers, matching FR-010.
- `phase` transitions MUST be reflected with visible progress/success/error feedback — no state may complete silently.

## Entity: Board State

The mutually exclusive states the board region itself can be in (distinct
from per-card or per-menu state), each with its own required presentation.

| Field | Description |
|-------|-------------|
| `variant` | `loading` \| `populated` \| `empty-column` (a specific column has zero cards) \| `error` (board fetch/action failed). |
| `recoveryAction` | What the participant can do from this state — e.g. `empty-column` invites the first contribution; `error` surfaces a visible, non-silent message (existing resilience behavior). |
| `accessibilityRequirement` | Each variant MUST independently satisfy WCAG 2.1 AA contrast/focus/no-color-only-meaning (FR-014) — states are not exempt from the accessibility bar just because they're transient or exceptional. |

**Validation rules**:
- `empty-column` is evaluated per-column, not board-wide — a board can simultaneously have some populated columns and one `empty-column` state.
- `error` MUST never be silent — MUST be explicitly re-verified against the new `/retro/:id` coverage added to `e2e/accessibility.spec.ts` (`research.md` §6), not assumed to still hold after the rebuild.

## Entity: Design Token Extension

A new semantic color/gradient/material token added to `src/lib/theme/
tokens.ts` to support the selected direction, if the existing catalog
(introduced by features 028/029/031) is insufficient — reused verbatim from
the dashboard redesign's data model, since both features draw from the same
token system.

| Field | Description |
|-------|-------------|
| `name` | Token name, following the existing `TokenName` union convention. |
| `role` | What it's used for (e.g. "card surface material", "facilitator-only accent", "live-typing indicator"). |
| `lightValue` / `darkValue` | RGB channel values per theme, same format as existing `TOKENS`. |
| `contrastPairing` | The `CONTRAST_PAIRINGS` entry (if any) this token must satisfy — omitted only if the token is purely decorative and never rendered under/behind text. |

**Validation rules**:
- Every `Design Token Extension` used behind or under text MUST have a `contrastPairing` that passes `contrast.tokens.test.ts` in both themes before the selected direction can ship (Constitution Principle VIII).
- Token additions are additive only — no existing `TokenName` value may be removed or repurposed (would regress other surfaces already built on the 028/029/031 token system).
