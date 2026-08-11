# Phase 1 Data Model: Export Window Redesign

This feature introduces no new persisted data — every entity below is either
a view/interaction-state model (what changes with this redesign) or an
existing domain type consumed unchanged (referenced for completeness).

## Entity: Visual Direction

A candidate visual/structural treatment of the export window, including its
answer to `research.md` §2-§3 (how it realizes the desktop anchor/
transition mechanics and the mobile bottom-sheet presentation within the
constraints already resolved by clarification — the *what* is fixed, the
*how it looks* is what's being explored). Not persisted; exists only as
source files during the FR-013 exploration and as this table's record of
the outcome.

| Field | Type | Notes |
|---|---|---|
| `id` | `'A' \| 'B' \| 'C'` | Candidate identifier |
| `name` | string | Short descriptive name |
| `distinguishingChoices` | string | What makes this candidate genuinely different from the others — visual language, density, materials/depth treatment, treatment of the idle → exporting → success/error transition |
| `newDependencies` | string[] | Any dependency beyond the existing `@floating-ui/react`/`framer-motion`/`BottomSheet`/`react-hot-toast`/Tailwind foundation, each with a Principle III justification if non-empty |
| `status` | `'proposed' \| 'selected' \| 'rejected'` | Outcome of the FR-013 product-owner review |
| `rejectionReason` | string (if `status: 'rejected'`) | One-line reason, recorded at review time |
| `reviewer` | string (if `status` resolved) | Expected: the product owner (Fernando Ortiz), matching the precedent in features 029/031/033/036 |

### Catalog (2026-08-11)

Built as real, working React components
(`retro-rocket/src/pages/__prototypes__/ExportWindowDirection{A,B,C}.tsx`)
wired to the live "Export Window Direction Review" board (seeded via direct
REST calls against the dev server + Firebase emulators: 7 cards across 4
columns, 1 facilitator note) through a dev-only comparison scaffold
(`ExportWindowDirectionsScaffold.tsx`, lazy-loaded and
`import.meta.env.DEV`-gated inside `RetrospectivePageContent`, consuming the
route's own live `useBoardData`-sourced props rather than a separately
mocked dataset). Captured via a throwaway Playwright script (12 screenshots:
3 candidates × 2 presentations × 2 themes) since this sandbox has no
connected browser-extension session for live interactive review: signed in
via the emulator-only `/api/auth/test-login` endpoint, opened the scaffold,
cycled every direction/presentation/theme combination, and screenshotted
each. Published to the product owner as a single reviewable comparison
artifact (12 live captures, side by side, both themes, both presentations).

| id | name | distinguishingChoices | newDependencies | status |
|---|---|---|---|---|
| A | Sectioned Cards | Every decision area (format, document config, optional content, facilitator zone) in its own bordered sub-card with a small icon+title header — most modular/scannable, clearest boundaries between unrelated decisions. | none | `rejected` |
| B | Compact Stack | Single flowing column with hairline dividers instead of nested cards — denser, less chrome, closest in spirit to the pre-redesign layout but modernized. A thin top progress rail (not a banner) carries the idle → exporting → success/error sequence. | none | `rejected` |
| C | Two-Column Desktop | The only candidate that reflows its *content* (not just its outer chrome, already fixed by FR-002/FR-003 for all three): format + document config in a left column, optional content + facilitator zone in a right column on desktop — using the extra width an anchored panel affords over today's narrow `w-96` dialog. Collapses to one stacked column on the mobile sheet. | none | `selected` |

**Resolved 2026-08-11**: presented via the published comparison artifact
(`export-window-direction-review.html`, 12 live captures against the seeded
"Export Window Direction Review" board). Product owner (Fernando Ortiz)
selected **Direction C — Two-Column Desktop**, alongside acknowledging the
`prototype` → `apple-design`/`emil-design-eng` skill substitution (per the
same precedent as features 029/031/033/036). Directions A and B rejected —
not selected in this review; Direction C chosen instead for its clearer use
of the anchored panel's available desktop width. **SC-007 note**: the
product owner confirmed locating and starting a desktop export on the
selected candidate felt immediate, with no hesitation or repeated attempts.

| id | status | rejectionReason |
|---|---|---|
| A | `rejected` | Not selected in the 2026-08-11 product-owner review; Direction C chosen instead. |
| B | `rejected` | Not selected in the 2026-08-11 product-owner review; Direction C chosen instead. |
| C | `selected` | — |

`reviewer`: Fernando Ortiz (product owner), 2026-08-11.

## Entity: Export Window State

The export window's own interaction state — redesigned in presentation, but
functionally unchanged from the existing `exportOptions`/`isExporting`/
`progress`/`error`/`success` state already managed by `useExportOptions`
and `useUnifiedExport` (`ImprovedExportPopover.tsx`, unchanged by this
feature except for the `useUnifiedExport` call site moving per
`research.md` §4).

| Field | Type | Notes |
|---|---|---|
| `presentation` | `'desktop-anchored' \| 'mobile-sheet'` | Which entry-point form is active, driven by viewport width (FR-002/FR-003) |
| `open` | boolean | Desktop panel visibility, from the new `useBoardMenuOverlay` instance in `RetrospectiveTopbar.tsx` (`research.md` §2) |
| `sheetOpen` | boolean | Mobile sheet visibility, independent state — MUST NOT be unified with `open` (`research.md` §3) |
| `anchorElement` | DOM node | The "Options" trigger button, shared with the options panel's own `useBoardMenuOverlay` instance via a merged ref (FR-002) — not a new, dedicated export trigger |

## Entity: Export Job *(existing state, new lifecycle scope)*

The single in-flight export attempt tracked by `useUnifiedExport`
(`isExporting`/`progress`/`error`/`success`/`currentFormat`). Its shape is
unchanged by this feature; what changes is where it lives and what happens
when the window that started it closes.

| Field | Type | Notes |
|---|---|---|
| `isExporting` | boolean | Unchanged from `useUnifiedExport`'s existing state |
| `progress` | number | Unchanged |
| `error` | string \| null | Unchanged |
| `success` | boolean | Unchanged |
| `currentFormat` | `ExportFormat \| undefined` | Unchanged |
| `ownerLifecycle` | `'RetrospectiveTopbar'` | **New**: the hook call site, lifted from `ImprovedExportPopover.tsx` so the job's state survives the export window's own mount/unmount (FR-007a, `research.md` §4) |
| `completionSurface` | `'in-window' \| 'toast'` | **New**: derived at the moment `success`/`error` becomes true — `'in-window'` if the export panel/sheet is currently open (existing in-panel banners handle it), `'toast'` otherwise (a `react-hot-toast` notification fires exactly once per completed job) |

## Entity: Export Options *(existing, consumed unchanged)*

`ExportOptionsState` from `useExportOptions.ts` — `format` (`pdf`/`txt`/
`docx`), `documentConfig` (`customTitle`, `includeRetroRocketLogo`),
`basicOptions` (`includeActionItems`, `includeStatistics`),
`facilitatorOptions` (`includeFacilitatorNotes`, `includeSentimentBadges`,
`includeTeamMoodAnalysis` — only rendered when `isFacilitator`). Structure
and update handlers (`updateFormat`/`updateDocumentConfig`/
`updateBasicOptions`/`updateFacilitatorOptions`) unchanged by this feature —
only their visual presentation is redesigned (FR-004).

## Entity: Board Export Data *(existing, consumed unchanged)*

The data the export window reads to build a document: `retrospective`,
`cards`, `groups`, `participants`, `facilitatorNotes`, `actionItems`, and
`sentimentAnalysis` (feeding `useTeamMood`'s derived `teamMoodData`), all
already threaded from `RetrospectiveTopbar.tsx`'s `useBoardData()` (feature
019). Unchanged by this feature.

## Entity: Board State (export-window variants, for accessibility verification)

Scoped to just the states relevant to the export window's own accessibility
contract (`contracts/accessibility-interaction-contract.md`), following the
same pattern as feature 036's equivalent entity for the options/facilitator
menus.

| Variant | Description |
|---|---|
| `export-closed` | Options trigger visible, export panel/sheet not rendered |
| `export-open-desktop-idle` | Export panel open (anchored, desktop/tablet), no export started yet |
| `export-open-mobile-idle` | Export sheet open (mobile), no export started yet |
| `export-open-desktop-exporting` | Export panel open, an export is in progress (progress feedback visible) |
| `export-open-mobile-exporting` | Export sheet open, an export is in progress |
| `export-open-desktop-success` / `export-open-desktop-error` | Export panel open, showing a completed job's outcome |
| `export-open-mobile-success` / `export-open-mobile-error` | Export sheet open, showing a completed job's outcome |
| `export-dismissed-during-export` | Window dismissed mid-export (FR-007a) — the export job continues; this variant is verified via its *eventual* toast outcome, not a static render state |
| `export-facilitator-zone-owner` / `export-facilitator-zone-absent` | Owner vs. non-owner rendering of the facilitator-only zone (FR-006), in both presentations |

## Entity: Design Token Extension *(conditional)*

Populated only if the selected Visual Direction requires a token not
already defined in `src/lib/theme/tokens.ts`. Each new token MUST record its
`contrastPairing` and pass `contrast.tokens.test.ts` in both themes before
use. Expected to remain empty — the existing semantic token system already
covers surfaces, borders, and text roles used by the options and
facilitator menus, which the export window's redesign is expected to share.
