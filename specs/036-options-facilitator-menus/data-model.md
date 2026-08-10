# Phase 1 Data Model: Options Menu & Facilitator Menu Redesign

This feature introduces no new persisted data — every entity below is either
a view/interaction-state model (what changes with this redesign) or an
existing domain type consumed unchanged (referenced for completeness).

## Entity: Visual Direction

A candidate visual/structural treatment of both menus, including its answer
to `research.md` §2 (which mobile entry-point pattern it commits to). Not
persisted; exists only as source files during the FR-015 exploration and as
this table's record of the outcome.

| Field | Type | Notes |
|---|---|---|
| `id` | `'A' \| 'B' \| 'C'` | Candidate identifier |
| `name` | string | Short descriptive name (e.g. "Focused Popover", "Adaptive Sheet") |
| `distinguishingChoices` | string | What makes this candidate genuinely different from the others — visual language, density, materials/depth treatment |
| `mobileEntryPointPattern` | `'anchored-popover' \| 'sheet' \| 'fullscreen-cover'` | Which `research.md` §2 pattern this candidate commits to for the new mobile reachability (FR-013a) |
| `newDependencies` | string[] | Any dependency beyond the existing `@floating-ui/react`/`framer-motion`/Tailwind foundation, each with a Principle III justification if non-empty |
| `status` | `'proposed' \| 'selected' \| 'rejected'` | Outcome of the FR-015 product-owner review |
| `rejectionReason` | string (if `status: 'rejected'`) | One-line reason, recorded at review time |
| `reviewer` | string (if `status` resolved) | Expected: the product owner (Fernando Ortiz), matching the precedent in features 029/031/033 |

### Catalog (2026-08-10)

Built as real, working React components (`retro-rocket/src/pages/__prototypes__/OptionsFacilitatorMenusDirection{A,B,C}.tsx`) wired to the live "Sprint 42 Retro — Menu Design Review" board (seeded via direct REST calls: 9 cards across 3 columns, 2 facilitator notes, a running 5-minute countdown timer) through `usePrototypeMenusData.ts`, and verified interactively via `claude-in-chrome` against the running dev server + Firebase emulators — not just read as source. Presented to the product owner as a published comparison artifact (light/dark, desktop/mobile screenshots).

| id | name | distinguishingChoices | mobileEntryPointPattern | newDependencies | status |
|---|---|---|---|---|---|
| A | Focused Popover | Deference-forward: hairline borders, restrained translucency, unlabeled icon trigger that firms up only on hover/focus/open. Smallest structural diff from today — same anchored-popover component made visible at every viewport instead of `hidden md:flex`, with a responsive width clamp. | `anchored-popover` | none | `proposed` |
| B | Adaptive Sheet | Clarity-forward: opaque solid panels, visible 1px borders, denser type scale, icon+label desktop triggers. Mobile uses a structurally distinct bottom sheet (drag handle, dimmed backdrop, always-visible close button) rather than a resized popover. | `sheet` | none | `proposed` |
| C | Layered Depth | Materials-forward: gradient-tinted translucent glass panels detached from their trigger with a visible gap and elevated shadow. Mobile uses a full-screen cover (translucent header + close) applied to both menus for one coherent pattern. | `fullscreen-cover` | none | `proposed` |

**Findings during build** (both fixed, verified live before this table was finalized):
1. Directions B and C's desktop trigger `onClick` was overriding Floating UI's own click handler (from `getReferenceProps()`), so the desktop panel silently never opened. Fixed by composing handlers (`getReferenceProps({ onClick: ... })` for C's shared trigger; removing the redundant handler from B's dedicated desktop trigger).
2. Directions B and C's new mobile sheet/full-screen cover collapsed to a small box instead of covering the viewport, because the real `Header.tsx` already applies `backdrop-blur-md`, which — like `transform`/`filter` — establishes a new CSS containing block for `position: fixed` descendants. Fixed by portaling both to `document.body` via `createPortal`, matching `Modal.tsx`'s existing pattern. This finding applies to the real implementation too (T015/T022), not just the prototypes.
3. Found during T014-T017's real implementation (not present in the prototype at review time, since it only surfaced under `useBoardMenuOverlay`'s real dismiss behavior when actually clicking an item inside the sheet, not just opening/closing it): Direction B's mobile sheet must NOT share `useBoardMenuOverlay`'s `open`/`setOpen` state with the desktop dropdown. `useDismiss` treats any press outside the Floating-UI floating element's own DOM subtree as an outside press — including a press *inside* the separately-portaled sheet — closing (and unmounting) the sheet before its own `onClick` handler fires. A real failing unit test caught this (clicking "copy ID" in the mobile sheet never called the clipboard API). Fixed by giving the sheet its own independent `sheetOpen` state in both `RetrospectiveTopbar.tsx` and the kept-as-reference `OptionsFacilitatorMenusDirectionB.tsx` prototype. This applies directly to T022 (facilitator menu's mobile entry point) too — do not reuse `useBoardMenuOverlay`'s `open` for its sheet either.

**Resolved 2026-08-10**: presented via a published comparison artifact (light/dark, desktop/mobile screenshots against the live "Sprint 42 Retro" board). Product owner (Fernando Ortiz) selected **Direction B — Adaptive Sheet**, alongside acknowledging the `prototype` → `apple-design`/`emil-design-eng` skill substitution. Directions A and C rejected:

| id | status | rejectionReason |
|---|---|---|
| A | `rejected` | Not selected in the 2026-08-10 product-owner review; Direction B chosen instead. |
| B | `selected` | — |
| C | `rejected` | Not selected in the 2026-08-10 product-owner review; Direction B chosen instead. |

`reviewer`: Fernando Ortiz (product owner), 2026-08-10.

## Entity: Options Menu State

The options menu's own interaction states, redesigned but functionally
unchanged from the existing implementation (`RetrospectiveTopbar.tsx`).

| Field | Type | Notes |
|---|---|---|
| `presentation` | `'desktop-anchored' \| 'mobile'` | Which entry-point form is active, driven by viewport width — both MUST expose the same four actions |
| `open` | boolean | Panel visibility |
| `items` | `('export' \| 'copyId' \| 'share' \| 'exit')[]` | Fixed set, order preserved from the current implementation (FR-002) |
| `exportPopoverOpen` | boolean | Delegates to the existing, unmodified `ImprovedExportPopover` (feature 033) — this feature only changes how it is triggered, not its own internals |

## Entity: Facilitator Menu State

The facilitator menu's own interaction/gating states.

| Field | Type | Notes |
|---|---|---|
| `presentation` | `'desktop-anchored' \| 'mobile'` | Per-viewport entry-point form, per FR-013a |
| `isOwner` | boolean | Gates existence, not just visibility — absent entirely (not disabled) when `false` (FR-003) |
| `open` | boolean | Panel visibility, `false` unconditionally when `!isOwner` |
| `activeTab` | `'controls' \| 'sentiment' \| 'team-mood' \| 'notes'` | Defaults to `'controls'` on open (FR-008) |
| `tabBadges` | `{ controls?: string; sentiment?: string; teamMood?: string; notes?: string }` | Status glyphs already computed by `FacilitatorMenu.tsx` (`getTimerBadge`/`getSentimentBadge`/`getTeamMoodBadge`); `notes` badge remains an unpopulated placeholder (existing behavior preserved per FR-014, not a defect this feature fixes) |

## Entity: Countdown Timer *(existing, consumed unchanged)*

`CountdownTimerData` from
`src/features/boards/retrospective/services/backendRetrospectiveClient.ts`,
surfaced through the Controls tab (FR-004). Fields (`duration`, remaining
time, run state, etc.) and the `useCountdown` hook's derived
`countdownState` (`isRunning`/`isPaused`/`isFinished`) are unchanged by this
feature — only their visual presentation is redesigned.

## Entity: Sentiment Configuration *(existing, consumed unchanged)*

Sourced from `useSentimentContext()` (`enabled`, `loading`, `error`,
`ready`, `config` — confidence threshold, batch size, auto-analysis,
selected model). Surfaced through the Sentiment tab (FR-005), including its
existing non-functional "reanalyze" placeholder, preserved as-is per FR-014.

## Entity: Team Mood Report *(existing, consumed unchanged)*

Derived by `TeamMoodDashboard.tsx` from `sentimentAnalysis.results` +
`getSentimentCounts()`. Read-only in the Team Mood tab (FR-006); its three
states (disabled / initializing / live report) are redesigned visually but
computed identically.

## Entity: Facilitator Note *(existing, consumed unchanged)*

`FacilitatorNote` from `backendRetrospectiveClient.ts`, scoped to
`myFacilitatorNotes` (never another facilitator's, per the existing
`FacilitatorMenu.tsx` doc comment). CRUD via `useFacilitatorNotes.ts`,
surfaced through the Notes tab (FR-007) with its existing delete
confirmation behavior preserved.

## Entity: Board State (menu-open variants, for accessibility verification)

Mirrors feature 033's `Board State` entity, scoped to just the states
relevant to these two menus' own accessibility contract
(`contracts/accessibility-interaction-contract.md`):

| Variant | Description |
|---|---|
| `options-closed` | Options menu trigger visible, panel not rendered |
| `options-open-desktop` | Options menu panel open via the existing anchored-popover pattern |
| `options-open-mobile` | Options menu open via the new FR-013a mobile entry point |
| `facilitator-closed` | Facilitator menu trigger visible (owner only) |
| `facilitator-open-desktop-{tab}` | One variant per tab (`controls`/`sentiment`/`team-mood`/`notes`), desktop presentation |
| `facilitator-open-mobile-{tab}` | One variant per tab, new mobile presentation |
| `facilitator-absent-non-owner` | Non-owner viewport: trigger entirely absent (FR-003) — a negative-space state, not a "closed" state |

## Entity: Design Token Extension *(conditional)*

Populated only if the selected Visual Direction requires a token not
already defined in `src/lib/theme/tokens.ts`. Each new token MUST record its
`contrastPairing` and pass `contrast.tokens.test.ts` in both themes before
use (mirrors feature 033's same-named entity). Expected to remain empty —
the existing semantic token system already covers surfaces, borders, and
text roles used by both menus today.
