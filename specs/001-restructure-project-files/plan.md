# Implementation Plan: Restructure Project Files

**Branch**: `001-restructure-project-files` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-restructure-project-files/spec.md`

## Summary

Remove non-essential root-level Markdown documentation (keeping only
`README.md`, `.specify/`, and `specs/`), and reorganize `retro-rocket/src`
around the constitution's Library-First principle: retrospective-board
capabilities (clustering, countdown, facilitator, participants, retrospective,
sentiment, export) consolidate as sub-modules of `src/features/boards`; auth,
create-board, dashboard, and a new dev-tools module become their own
top-level `src/features/*`; genuinely cross-cutting code (shared UI kit,
shared hooks/services/contexts, Firebase init) consolidates under `src/lib`;
tests stay centralized under `src/test`, remapped to mirror the new layout.
No runtime behavior changes — this is a pure file-location and import-path
refactor, verified by a full build/type-check/lint/test pass and a manual
smoke walkthrough.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), React 18, targeting ES2020

**Primary Dependencies**: Vite 4, Firebase 10 (Firestore), dnd-kit, date-fns,
docx, @react-pdf/renderer, framer-motion, i18next/react-i18next, Tailwind CSS,
react-router-dom, @xenova/transformers (sentiment worker)

**Storage**: Firebase/Firestore — unaffected by this feature (no data model or
security-rule changes; only application source file locations change)

**Testing**: Vitest 3 + @testing-library/react (unit), coverage via
@vitest/coverage-v8 with an 80% branches/functions/lines/statements floor
(`vitest.config.ts`). Playwright is not yet installed in this project
(constitution Principle VII names it as pending adoption) and installing it is
out of scope for this feature.

**Target Platform**: Web (Vite-built SPA, browser runtime)

**Project Type**: Single frontend project (`retro-rocket/`) at the repository
root; no separate backend package (Firebase is a managed BaaS, not an
in-repo service)

**Performance Goals**: No perceptible change vs. current baseline — this is a
structural refactor, not a performance feature (constitution's Performance
standard: validate against perceptible degradation, not optimize further)

**Constraints**: Zero behavior change (FR-008, FR-009); 80% coverage floor
maintained (FR-011); build/type-check/lint MUST stay green (SC-004); file edit
history preserved where the tooling allows via `git mv` (FR-012)

**Scale/Scope**: ~170 TypeScript/TSX source files under `retro-rocket/src`
(components, hooks, services, contexts, utils, types, workers, templates,
examples) plus a parallel `~50`-file `src/test/` tree, reorganized into 5
feature modules (`auth`, `boards` with 7 sub-modules, `create-board`,
`dashboard`, `dev-tools`) and one shared `src/lib` layer; 14 stray root-level
Markdown files removed.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. TDD (NON-NEGOTIABLE) | No new behavior is introduced, so there is no new logic requiring a preceding failing test. The existing test suite is the compliance mechanism: every test must still pass post-move (FR-011), which is validated before this feature is considered done. **PASS** |
| II. Library-First | This feature *is* the direct application of this principle to the existing codebase — every domain capability becomes an independent module under `src/features` or `src/lib`. **PASS** |
| III. Prefer proven third-party libraries | No new dependency is added by this feature. **PASS (N/A)** |
| IV. SOLID | File relocation doesn't change internal module design, but grouping by feature directly improves cohesion (SRP at the folder level); no interfaces are altered. **PASS** |
| V. Simplicity (KISS + YAGNI) | Sub-module boundaries follow existing naming signals (research.md) rather than inventing new abstractions; no new path aliases or config layers added. **PASS** |
| VI. Mandatory unit testing & 80% coverage floor | Test tree is remapped, not rewritten; coverage mapping is preserved 1:1 (FR-011). **CONFIRMED**: post-migration test run reproduces the baseline exactly (130/132 files, 2414/2437 tests, same two pre-existing failures) — same tests exercising the same source lines, so the underlying coverage percentage is unchanged (the tool's coverage-table output is a pre-existing environment quirk that didn't work in the baseline run either; see baseline-report.md). |
| VII. E2E Testing with Playwright | Playwright is not yet part of this project; this feature does not add or remove E2E coverage, and installing Playwright is explicitly out of scope (research.md Non-goals). This is a pre-existing gap this feature neither causes nor is required to close. **N/A — no change in this feature's scope** |
| Strict type safety | Only import paths change; `tsc --noEmit` must stay clean (SC-004). **CONFIRMED: 0 errors post-migration** (one stale `tsconfig.json` exclude pattern was found and fixed along the way — see baseline-report.md). |
| Code consistency (ESLint) | Must stay clean post-move (SC-004). **N/A — pre-existing gap, unaffected**: ESLint is not actually installed in this project (`eslint: command not found`, confirmed in both the baseline and post-migration runs); ineligible to fix as part of this file-relocation feature. |
| Real-time data security | `firestore.rules` is untouched by this feature. **PASS (N/A)** |
| Internationalization | `src/i18n` and `src/locales` are unmoved (research.md); no string changes. **PASS** |
| Accessibility | No UI behavior change. **PASS** |
| Error handling & resilience | No change to Firestore operation logic, only its file location. **PASS** |
| Performance | No new perf work; SC-005 requires a manual smoke check that board interactions remain unaffected. **CONFIRMED via automated checks** (dev server boots cleanly, zero module-resolution errors, build output has identical chunk hashes for unaffected modules, full test suite matches baseline exactly); a literal browser click-through was not performed in this environment — recommend a manual pass before merging. |

No violations requiring justification — Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-restructure-project-files/
├── plan.md              # This file
├── research.md          # Phase 0 output — codebase inventory & mapping decisions
├── quickstart.md        # Phase 1 output — validation guide
└── checklists/
    └── requirements.md  # Spec quality checklist (from /speckit-specify)
```

`data-model.md` and `contracts/` are intentionally omitted: this feature has no
domain entities (it moves files, it doesn't model data) and exposes no new or
changed external interface (no API, no CLI, no public contract) — see
research.md for the reasoning behind every placement decision instead.

### Source Code (repository root)

The application lives in `retro-rocket/` (not the repository root). This is
the existing, single-project layout — no new project or package is introduced.

```text
retro-rocket/
├── src/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/       # AuthButtonGroup, AuthWrapper, LinkedProvidersCard,
│   │   │   │                     # UserProfileForm, AuthGuard
│   │   │   ├── hooks/            # useAuth, useLinkedProviders
│   │   │   └── services/         # authProvider, accountLinking, userService
│   │   │
│   │   ├── boards/               # umbrella for retrospective-board capabilities
│   │   │   ├── clustering/       # components/ (Group*, ColumnHeaderMenu),
│   │   │   │                     # hooks/ (useCardGroups, useColumnGrouping,
│   │   │   │                     # useColumnSortGroup), services/ (cardGroupService,
│   │   │   │                     # columnGroupingService, similarityService)
│   │   │   ├── countdown/        # components/, hooks/ (useCountdown),
│   │   │   │                     # services/ (countdownService)
│   │   │   ├── facilitator/      # components/, hooks/ (useFacilitatorNotes),
│   │   │   │                     # services/ (facilitatorNotesService)
│   │   │   ├── participants/     # components/, hooks/ (useParticipants,
│   │   │   │                     # useEnrichedParticipants), services/
│   │   │   │                     # (participantService, UserProfileCache)
│   │   │   ├── retrospective/    # components/ (board shell, cards, drag/drop,
│   │   │   │                     # action items, topbar), hooks/ (useCards,
│   │   │   │                     # useCardColors, useRetrospective,
│   │   │   │                     # useRetrospectiveColumns, useJoinRetrospective,
│   │   │   │                     # useOptimizedCards, useTypingStatus), services/
│   │   │   │                     # (cardService, cardInteractionService,
│   │   │   │                     # retrospectiveService, typingStatusService,
│   │   │   │                     # actionItemsService, FirestoreListenerManager,
│   │   │   │                     # OptimisticUpdatesManager,
│   │   │   │                     # OptimizedTypingStatusService), contexts/
│   │   │   │                     # (BoardDataContext, TypingProvider)
│   │   │   ├── sentiment/        # components/, hooks/ (useSentiment,
│   │   │   │                     # useSentimentCache, useSentimentResults,
│   │   │   │                     # useTeamMood, useWorkerManager), services/
│   │   │   │                     # (sentimentResultsService), workers/
│   │   │   │                     # (sentimentWorker, sentimentMapper),
│   │   │   │                     # contexts/ (SentimentContext)
│   │   │   ├── export/           # components/ (Docx/PdfExporter, Export*,
│   │   │   │                     # UnifiedExporter), hooks/ (useExportDocx,
│   │   │   │                     # useExportPdf, useExportOptions,
│   │   │   │                     # useUnifiedExport), services/
│   │   │   │                     # (docxExportService, pdfExportService,
│   │   │   │                     # txtExportService, unifiedExportService),
│   │   │   │                     # utils/ (exportColumns)
│   │   │   └── types/            # card, retrospective, participant, actionItem,
│   │   │                         # export, countdown, sentiment, teamMood,
│   │   │                         # facilitatorNotes, columnState, columnGrouping, typing
│   │   │
│   │   ├── create-board/         # components/ (BoardTemplateSelector,
│   │   │   │                     # CreateBoardFlow), createBoardFromTemplate.ts,
│   │   │   │                     # boardTemplates.ts
│   │   │
│   │   ├── dashboard/            # components/ (BoardCard, BoardControlsBar,
│   │   │   │                     # BoardListItem, EditRetrospectiveModal,
│   │   │   │                     # JoinRetrospectiveModal, Pagination)
│   │   │
│   │   └── dev-tools/            # components/ (MetricsDashboard, SortGroupTest,
│   │                             # ParticipantListDemo, ColorSystemTest,
│   │                             # RetrospectivePageWithImprovedExport),
│   │                             # MinimalApp.tsx, RouterApp.tsx, SimpleApp.tsx,
│   │                             # TestApp.tsx
│   │
│   ├── lib/                      # shared/cross-cutting (used by 2+ features)
│   │   ├── components/           # ui/, layout/, forms/, mobile/ (common UI kit)
│   │   ├── hooks/                # useCurrentUser, useLanguage, useKeyboardShortcut,
│   │   │                         # useBodyScrollLock, useFirestore, useFirebaseMetrics
│   │   ├── services/             # firebase, OptimizedRetrospectiveService,
│   │   │                         # FirebaseMetricsService
│   │   ├── contexts/             # UserContext
│   │   ├── utils/                # cardColors, cardHelpers, constants, debugKeys,
│   │   │                         # designSystem, emojiConstants, helpers,
│   │   │                         # migrateUserProviders
│   │   └── uiPreferencesStore.ts # existing, unchanged
│   │
│   ├── pages/                    # unchanged: route-level composition
│   ├── i18n/                     # unchanged: i18next bootstrap config
│   ├── locales/                  # unchanged: en.json, es.json
│   ├── styles/                   # unchanged: globals.css, datepicker.css
│   ├── test/                     # centralized, remapped to mirror the tree above
│   │   ├── setup.ts              # unchanged
│   │   ├── __mocks__/            # unchanged
│   │   ├── features/             # mirrors src/features/**
│   │   ├── lib/                  # mirrors src/lib/**
│   │   └── pages/                # unchanged
│   ├── App.tsx, main.tsx, vite-env.d.ts   # unchanged: app bootstrap
│   └── (App variants MinimalApp/RouterApp/SimpleApp/TestApp move to dev-tools)
│
├── vitest.config.ts               # unchanged (alias `@/*` still points at `src/`)
├── tsconfig.json                  # unchanged (same reason)
├── README.md                      # kept, links to removed docs cleaned up
└── (14 stray root-level *.md files removed — see research.md / spec FR-002)
```

**Structure Decision**: Single-project frontend (`retro-rocket/`), reorganized
in place. Every current top-level `src/` folder is accounted for above — see
`research.md` for the file-by-file reasoning behind every non-obvious
placement (the "Named exceptions" table) and the classification rule that
resolves every other file mechanically (single-feature consumer → that
feature; 2+ feature consumers or app-bootstrap → `src/lib`; app composition
concern → stays top-level unmoved).

## Complexity Tracking

*No entries — Constitution Check reported no violations requiring justification.*
