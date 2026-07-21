# Research: Restructure Project Files

This feature reorganizes an existing, working codebase rather than building new
functionality, so "research" here means: inventory the current `retro-rocket/src`
tree, resolve the placement questions the spec's clarification session didn't
already answer, and produce a concrete target mapping that `/speckit-tasks` can
turn into file-move tasks without further guesswork.

## Decision: Where does genuinely shared/cross-cutting code live?

**Decision**: `src/lib`, organized by kind (`src/lib/components`, `src/lib/hooks`,
`src/lib/services`, `src/lib/contexts`, `src/lib/utils`), alongside the existing
`src/lib/uiPreferencesStore.ts`.

**Rationale**: The constitution's Library-First principle names exactly two
accepted homes — `src/features` and `src/lib` — and `src/lib` already has a
precedent (`uiPreferencesStore.ts`). Consolidating shared code into a real,
single physical location under `src/lib` (rather than leaving it spread across
ambiguous top-level `src/hooks`, `src/services`, `src/contexts`, `src/utils`
folders that mix feature-specific and shared code) is the entire point of the
requested reorganization. A file is classified as shared if it is imported by
two or more unrelated features, or if it is app-bootstrap infrastructure
(initialized once at the root, e.g. Firebase init).

**Alternatives considered**:
- Keep `src/hooks`, `src/services`, `src/contexts`, `src/utils` as the de facto
  shared layer (unchanged names, just pruned of feature-specific files) —
  rejected because it leaves three sibling top-level buckets (`components`,
  `features`, and the old kind-based folders) instead of the two the
  constitution names, reintroducing the ambiguity this feature exists to remove.
- Introduce a new `src/shared` folder distinct from `src/lib` — rejected as an
  unnecessary third bucket; `src/lib` already exists and is constitution-named.

## Decision: Where does the shared UI kit live?

**Decision**: `src/lib/components`, containing today's `components/ui`,
`components/common`, `components/layout`, `components/forms`,
`components/mobile` (note: `components/common` and `components/debug` and
`components/demo` are currently empty — nothing to move for those).

**Rationale**: These are generic, presentation-only building blocks used by
every feature (buttons, modals, inputs, layout shell, generic forms); they are
reused logic in the sense the constitution means, just with a UI surface. Same
classification rule as above: used by 2+ features → `src/lib`.

**Alternatives considered**: Leaving them at top-level `src/components` — this
was rejected because after feature-specific subfolders move out, `src/components`
would become an unlabeled duplicate of what `src/lib/components` already means,
i.e. a third ambiguous bucket alongside `features` and `lib`.

## Decision: Boards sub-module boundaries (per clarification session)

**Decision**: `src/features/boards` becomes the umbrella for six sub-modules —
`clustering`, `countdown`, `facilitator`, `participants`, `retrospective`,
`sentiment` — plus a seventh, `export`, which the clarification session didn't
name individually but which the same "tightly-coupled board capability" logic
applies to (PDF/DOCX/TXT export only makes sense in the context of a board).
Each sub-module gets its own `components/`, `hooks/`, `services/` as needed.

**Rationale**: Confirmed directly by the clarification session (2026-07-21) for
clustering/countdown/facilitator/participants/retrospective/sentiment. `export`
is added by the same rationale (single-consumer, board-specific capability) to
avoid leaving five export hooks/services (`useExportDocx`, `useExportPdf`,
`useExportOptions`, `useUnifiedExport`, `docxExportService`, `pdfExportService`,
`txtExportService`, `unifiedExportService`, `exportColumns` util) homeless.

**Alternatives considered**: Folding `export` into `boards/retrospective` —
rejected because export has a clean, self-contained boundary (its own hooks,
services, and a util) and treating it as a sibling sub-module keeps
`retrospective` from becoming a catch-all, consistent with Simplicity (KISS).

## Decision: `components/retrospective` internal split

**Finding**: `components/clustering` is currently an **empty** directory —
grouping/clustering UI (e.g. `GroupCard`, `GroupedCardList`,
`GroupSuggestionModal`, `GroupableColumn`, `ColumnHeaderMenu`) actually lives
inside `components/retrospective` today, while the clustering *logic*
(`cardGroupService`, `columnGroupingService`, `similarityService`,
`useCardGroups`, `useColumnGrouping`, `useColumnSortGroup`) is already cleanly
separated by naming.

**Decision**: Split `components/retrospective`'s 26 files by clear naming
signal rather than moving the whole folder as one block:
- Grouping-named components (`GroupCard`, `GroupedCardList`,
  `GroupSuggestionModal`, `GroupableColumn`, `ColumnHeaderMenu`) →
  `boards/clustering/components/`
- Export-named components (`DocxExporter`, `PdfExporter`, `ExportButton`,
  `ExportButtonGroup`, `ExportPopover`, `ImprovedExportPopover`,
  `UnifiedExporter`) → `boards/export/components/`
- Everything else (board shell, cards, drag/drop, action items, topbar,
  reactions) → `boards/retrospective/components/`

**Rationale**: This mirrors how the hooks/services are already split by name,
keeps each sub-module's public surface coherent, and avoids inventing new
component boundaries not implied by the existing code — a direct application
of KISS/YAGNI (don't restructure further than the reorganization requires).

**Alternatives considered**: Moving all 26 files into `boards/retrospective/`
unsplit — rejected because it would leave clustering and export sub-modules
with logic but no UI, undermining the "independently testable" intent of
Library-First for those two sub-modules.

## Decision: Named exceptions found during codebase inventory

The following files don't fit their folder's default classification and were
individually traced (via import search) to their actual consumers:

| File | Found via | Target |
|---|---|---|
| `services/optimization/OptimizedRetrospectiveService.ts` | Used by both `components/dashboard/*` and `pages/RetrospectivePage.tsx`/boards | `src/lib/services/` (genuinely cross-feature) |
| `services/optimization/FirestoreListenerManager.ts`, `OptimisticUpdatesManager.ts`, `hooks/optimization/useOptimizedCards.ts` | Only consumed by `RetrospectiveBoard.tsx` / `EnhancedRetrospectiveBoard.tsx` | `boards/retrospective/` |
| `services/optimization/UserProfileCache.ts` | Only consumed by `hooks/useEnrichedParticipants.ts` | `boards/participants/` |
| `services/optimization/OptimizedTypingStatusService.ts` | Only consumed by `hooks/useTypingStatus.ts` | `boards/retrospective/` (typing presence is part of the live board) |
| `services/optimization/FirebaseMetricsService.ts`, `hooks/useFirebaseMetrics.ts` | Consumed by `main.tsx` (app bootstrap) and the metrics dashboard | `src/lib/services/` and `src/lib/hooks/` |
| `components/optimization/MetricsDashboard.tsx` | Rendered from root `App.tsx` as a debug/monitoring overlay | `features/dev-tools/` |
| `contexts/UserContext.tsx`, `hooks/useCurrentUser.ts` | Consumed by auth, layout, create-board, dashboard, profile, landing, and boards components | `src/lib/contexts/` and `src/lib/hooks/` |
| `contexts/BoardDataContext.tsx`, `contexts/SentimentContext.tsx`, `contexts/TypingProvider.tsx` | Only consumed within boards components | `boards/` (context per relevant sub-module) |
| `services/firebase.ts` | Imported by nearly every service in the codebase | `src/lib/services/` (app-wide Firestore/Firebase init) |
| `features/boards/createBoardFromTemplate.ts`, `templates/boardTemplates.ts` | Only consumed by `components/create-board/*` | `features/create-board/` (moved **out of** boards — this is board-creation flow, not the live board; create-board stays its own top-level feature per the clarification session) |
| `components/AuthGuard.tsx` | Route guard checking `UserContext` | `features/auth/` |
| `components/SortGroupTest.tsx`, `ParticipantListDemo.tsx`, `ColorSystemTest.tsx`, `examples/RetrospectivePageWithImprovedExport.tsx` | Not imported by any production entry point; named as test/demo scaffolding | `features/dev-tools/` |
| Root `MinimalApp.tsx`, `RouterApp.tsx`, `SimpleApp.tsx`, `TestApp.tsx` | Only imported by their own dedicated test files under `test/apps/`; `main.tsx` renders only `App.tsx` | `features/dev-tools/` (extends the clarification session's debug/demo/examples decision to this equivalent pattern) |
| `services/cardService.test.new.ts`, `cardService.test.old.ts` | Two test files for the same service, unclear which is current | Both move together with `cardService.ts` into `boards/retrospective/`, unmodified — FR-009 forbids removing anything, including apparently-stale duplicates |

## Decision: App-shell folders that are neither a feature nor shared lib

**Decision**: `src/pages`, `src/i18n`, `src/locales`, `src/styles`, and the root
bootstrap files (`App.tsx`, `main.tsx`, `vite-env.d.ts`) stay at their current
top level, unmoved.

**Rationale**: These are app composition/bootstrap concerns (routing entry
points, i18n initialization, global stylesheet, app entry), not reusable
capabilities or libraries — the two categories the constitution's Library-First
principle addresses. Moving them into `features` or `lib` would stretch both
terms past their meaning and add churn with no organizational benefit.

**Alternatives considered**: Nesting `pages` under each owning feature (e.g.
`RetrospectivePage.tsx` inside `boards/`) — rejected because pages compose
*multiple* features (e.g. `Dashboard.tsx` uses both the dashboard feature and
shared UI) and React Router route definitions are conventionally kept together
for discoverability.

## Decision: Test tree remapping (per clarification session)

**Decision**: `src/test/` stays centralized (already confirmed by
clarification) with its subfolders renamed to mirror the new `src/` layout:
`test/features/boards/{clustering,countdown,facilitator,participants,
retrospective,sentiment,export}`, `test/features/auth`,
`test/features/create-board`, `test/features/dashboard`,
`test/features/dev-tools`, `test/lib/{components,hooks,services,contexts,
utils}`, plus `test/pages` unchanged. `test/setup.ts` and `test/__mocks__` stay
in place since they're test-infrastructure, not feature-mapped.

**Rationale**: Direct application of the clarification answer; renaming
subfolders to match `src/` keeps the existing `vitest.config.ts` `setupFiles`
and `coverage.exclude: ['src/test/**']` entries valid with zero config changes.

## Decision: Path aliases and build config touch points

**Decision**: No new path aliases are introduced. The existing `@/*` →
`./src/*` alias in `vitest.config.ts` and `tsconfig.json` continues to resolve
correctly since it points at `src/` as a whole, not at specific subfolders;
only the import specifiers inside moved files change, not the alias
configuration itself.

**Rationale**: Simplicity — introducing per-feature aliases (`@boards/*`,
`@lib/*`) was considered but adds configuration surface with no functional
requirement asking for it (YAGNI).

**Alternatives considered**: Per-feature path aliases — rejected as
speculative convenience not requested by the spec.

## Non-goals confirmed out of scope

- Installing or configuring Playwright (constitution Principle VII names it as
  "not yet present"; this feature is a pure file/folder reorganization and does
  not touch tooling adoption).
- Deleting or consolidating the apparently-stale `cardService.test.new.ts` /
  `cardService.test.old.ts` duplicate, or any other seemingly dead code —
  FR-009 explicitly forbids removing functionality, and distinguishing "dead"
  from "used in a way this research didn't trace" is out of scope for a
  behavior-preserving move.
- Any change to `firestore.rules` or Firebase security configuration.
