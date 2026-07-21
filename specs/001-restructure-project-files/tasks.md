---

description: "Task list for feature implementation"
---

# Tasks: Restructure Project Files

**Input**: Design documents from `/specs/001-restructure-project-files/`

**Prerequisites**: plan.md, spec.md, research.md, quickstart.md (all present; `data-model.md` and `contracts/` intentionally omitted — see plan.md)

**Tests**: This feature introduces **no new behavior** — it relocates existing, already-tested code. Per the constitution's TDD principle, a preceding test is required before production code changes; here the "preceding test" is the **existing, already-passing test suite**, which must stay green throughout. Each phase below therefore includes explicit **Verification** tasks (baseline capture and regression checks) instead of new-behavior test-writing tasks, which would be busywork for a pure file move.

**Organization**: Tasks are grouped by user story (US1 = doc cleanup, US2 = source reorganization) per spec.md. US1 and US2 are independently testable per the spec, so US1 does not wait on US2's foundational work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Paths are relative to the repository root; the application lives in `retro-rocket/`

## Path Conventions

- Single frontend project: `retro-rocket/src/`, `retro-rocket/src/test/`
- Repository-root docs: `*.md`, `.specify/`, `specs/`

---

## Phase 1: Setup

**Purpose**: Establish a baseline to compare against and prepare empty target directories

- [X] T001 Run `npm run type-check`, `npm run lint`, `npm run build`, and `npm run test:coverage` in `retro-rocket/`; record pass/fail counts and the coverage summary in `specs/001-restructure-project-files/baseline-report.md`
- [X] T002 Create the empty target directory skeleton: `retro-rocket/src/features/{auth,boards,create-board,dashboard,dev-tools}/`, `retro-rocket/src/features/boards/{clustering,countdown,facilitator,participants,retrospective,sentiment,export,types}/`, `retro-rocket/src/lib/{components,hooks,services,contexts,utils}/`, and mirrored empty dirs under `retro-rocket/src/test/features/**` and `retro-rocket/src/test/lib/**` matching the tree in plan.md

**Checkpoint**: Baseline recorded, target skeleton exists — both user stories can now begin

---

## Phase 2: User Story 1 - Remove non-essential documentation clutter (Priority: P1) 🎯 MVP

**Goal**: Only `README.md`, `.specify/**`, and `specs/**` Markdown files remain in the repository.

**Independent Test**: List all `*.md` files in the repository and confirm only the essential ones remain; the app still builds identically since no source file is touched.

### Verification for User Story 1

- [X] T003 [US1] Confirm the current non-essential Markdown inventory matches research.md's list (`find . -iname "*.md" -not -path "*/node_modules/*" -not -path "*/.specify/*" -not -path "*/specs/*"` from the repository root) — this is the "before" state for FR-002/SC-001

### Implementation for User Story 1

- [X] T004 [P] [US1] Delete the 14 non-essential root-level Markdown files from `retro-rocket/`: `COMPARACION_DISEÑO_PDF.md`, `DOCX_PROFESSIONAL_IMPLEMENTATION_SUMMARY.md`, `EXPORT_PDF_PROFESSIONAL_DESIGN.md`, `EXPORT_SYSTEM_ANALYSIS.md`, `EXPORT_UX_IMPROVEMENTS.md`, `FIREBASE_OPTIMIZATION_PLAN.md`, `IMPLEMENTACION_COMPLETA.md`, `NEXT_STEPS_COMPLETED.md`, `PRODUCTION_MIGRATION_COMPLETED.md`, `PROFESSIONAL_TXT_EXPORT_IMPLEMENTATION.md`, `SENTIMENT_ANALYSIS.md`, `TEAM_MOOD_ANALYSIS.md`, `TEAM_MOOD_I18N_IMPLEMENTATION.md`, `ux-facilitator-menu-improvements.md` (FR-002). **Also found and deleted** `UX_UI_OPTIMIZATION_ANALYSIS.md`, a 15th stray file missed during `/speckit-specify` research that matches the same non-essential pattern. **Also confirmed**: `.claude/skills/*/SKILL.md` files matched the naive `find *.md` inventory but are explicitly excluded — they implement the `/speckit-*` commands themselves ("relativos a speckit" per the original request) and were left untouched, same protection as `.specify/` and `specs/`.
- [X] T005 [US1] Search `retro-rocket/README.md` (and any other surviving Markdown file) for links or mentions of the deleted files and remove or update those references (FR-003) — no references found, nothing to change

### Checkpoint for User Story 1

- [X] T006 [US1] Re-run the `*.md` inventory command from T003 and confirm only `README.md`, `.specify/**`, `specs/**`, and `.claude/**` remain (SC-001); confirm `retro-rocket` still builds (no source file was touched in this story)

**Checkpoint**: User Story 1 complete — the repository root is clean and this can ship independently of User Story 2.

---

## Phase 3: Foundational for User Story 2 — Shared Library Migration

**Purpose**: Move the genuinely cross-cutting code into `src/lib` first, since most feature modules in User Story 2 import from it. This is scoped to User Story 2 only — it does not block User Story 1 (see Phase 2).

**⚠️ CRITICAL**: User Story 2's feature-module moves (Phase 4) depend on this phase being complete.

- [X] T007 [P] Move `retro-rocket/src/services/firebase.ts`, `retro-rocket/src/services/optimization/OptimizedRetrospectiveService.ts`, and `retro-rocket/src/services/optimization/FirebaseMetricsService.ts` to `retro-rocket/src/lib/services/`, updating their internal relative imports; move their corresponding test files (e.g. `retro-rocket/src/test/services/**`) to `retro-rocket/src/test/lib/services/`
- [X] T008 [P] Move `retro-rocket/src/contexts/UserContext.tsx` to `retro-rocket/src/lib/contexts/` and `retro-rocket/src/hooks/{useCurrentUser,useLanguage,useKeyboardShortcut,useBodyScrollLock,useFirestore,useFirebaseMetrics}.ts` to `retro-rocket/src/lib/hooks/`, updating internal imports; move corresponding tests to `retro-rocket/src/test/lib/contexts/` and `retro-rocket/src/test/lib/hooks/`
- [X] T009 [P] Move `retro-rocket/src/components/{ui,layout,forms,mobile}/` to `retro-rocket/src/lib/components/`, updating internal imports; move corresponding tests to `retro-rocket/src/test/lib/components/`
- [X] T010 [P] Move `retro-rocket/src/utils/*.ts` to `retro-rocket/src/lib/utils/`, updating internal imports; move corresponding tests to `retro-rocket/src/test/lib/utils/`
- [X] T011 Search the full `retro-rocket/src` tree for import specifiers referencing the pre-move paths of the modules touched in T007-T010 (e.g. `contexts/UserContext`, `services/firebase`, `components/ui/*`, `utils/*`) and update every consumer to the new `src/lib/**` path (depends on T007, T008, T009, T010)
- [X] T012 Run `npm run type-check` and `npm run test:coverage` in `retro-rocket/` and confirm no new failures were introduced by the library migration (depends on T011)

**Checkpoint**: `src/lib` is fully populated and every existing consumer resolves correctly — User Story 2's feature-module moves can now begin.

---

## Phase 4: User Story 2 - Reorganize source files to match the constitution's structure (Priority: P2)

**Goal**: Every domain capability lives under a single `src/features/<capability>` module (with retrospective-board capabilities as `src/features/boards/<sub-module>`), consistent with the constitution's Library-First principle.

**Independent Test**: Confirm every capability listed in research.md's target mapping lives in its designated module, and the application builds, type-checks, and passes its full test suite unchanged.

### Implementation for User Story 2

- [X] T013 [P] [US2] Move the auth capability — `retro-rocket/src/components/{auth/*,AuthGuard.tsx}`, `retro-rocket/src/hooks/{useAuth,useLinkedProviders}.ts`, `retro-rocket/src/services/{authProvider,accountLinking,userService}.ts` — to `retro-rocket/src/features/auth/`, updating internal imports; move corresponding tests to `retro-rocket/src/test/features/auth/`
- [X] T014 [P] [US2] Move the create-board capability — `retro-rocket/src/components/create-board/*`, `retro-rocket/src/features/boards/createBoardFromTemplate.ts`, `retro-rocket/src/templates/boardTemplates.ts` — to `retro-rocket/src/features/create-board/`, updating internal imports; move corresponding tests to `retro-rocket/src/test/features/create-board/`
- [X] T015 [P] [US2] Move the dashboard capability — `retro-rocket/src/components/dashboard/*` — to `retro-rocket/src/features/dashboard/`, updating internal imports; move corresponding tests to `retro-rocket/src/test/features/dashboard/`
- [X] T016 [P] [US2] Move dev-tools scaffolding — `retro-rocket/src/components/optimization/MetricsDashboard.tsx`, `retro-rocket/src/components/{SortGroupTest,ParticipantListDemo,ColorSystemTest}.tsx`, `retro-rocket/src/examples/RetrospectivePageWithImprovedExport.tsx`, root `retro-rocket/src/{MinimalApp,RouterApp,SimpleApp,TestApp}.tsx` — to `retro-rocket/src/features/dev-tools/`, updating internal imports; move corresponding tests (including `retro-rocket/src/test/apps/*`) to `retro-rocket/src/test/features/dev-tools/`
- [X] T017 [P] [US2] Move the boards/clustering sub-module — grouping components `GroupCard`, `GroupedCardList`, `GroupSuggestionModal`, `GroupableColumn`, `ColumnHeaderMenu` (currently in `retro-rocket/src/components/retrospective/`), hooks `retro-rocket/src/hooks/{useCardGroups,useColumnGrouping,useColumnSortGroup}.ts`, services `retro-rocket/src/services/{cardGroupService,columnGroupingService,similarityService}.ts` — to `retro-rocket/src/features/boards/clustering/`, updating internal imports; move corresponding tests to `retro-rocket/src/test/features/boards/clustering/`
- [X] T018 [P] [US2] Move the boards/countdown sub-module — `retro-rocket/src/components/countdown/*`, `retro-rocket/src/hooks/useCountdown.ts`, `retro-rocket/src/services/countdownService.ts` — to `retro-rocket/src/features/boards/countdown/`, updating internal imports; move corresponding tests to `retro-rocket/src/test/features/boards/countdown/`
- [X] T019 [P] [US2] Move the boards/facilitator sub-module — `retro-rocket/src/components/facilitator/*`, `retro-rocket/src/hooks/useFacilitatorNotes.ts`, `retro-rocket/src/services/facilitatorNotesService.ts` — to `retro-rocket/src/features/boards/facilitator/`, updating internal imports; move corresponding tests to `retro-rocket/src/test/features/boards/facilitator/`
- [X] T020 [P] [US2] Move the boards/participants sub-module — `retro-rocket/src/components/participants/*`, `retro-rocket/src/hooks/{useParticipants,useEnrichedParticipants}.ts`, `retro-rocket/src/services/participantService.ts`, `retro-rocket/src/services/optimization/UserProfileCache.ts` — to `retro-rocket/src/features/boards/participants/`, updating internal imports; move corresponding tests to `retro-rocket/src/test/features/boards/participants/`
- [X] T021 [P] [US2] Move the boards/sentiment sub-module — `retro-rocket/src/components/sentiment/*`, `retro-rocket/src/hooks/{useSentiment,useSentimentCache,useSentimentResults,useTeamMood,useWorkerManager}.ts`, `retro-rocket/src/services/sentimentResultsService.ts`, `retro-rocket/src/workers/{sentimentWorker,sentimentMapper}.ts`, `retro-rocket/src/contexts/SentimentContext.tsx` — to `retro-rocket/src/features/boards/sentiment/`, updating internal imports; move corresponding tests to `retro-rocket/src/test/features/boards/sentiment/`
- [X] T022 [P] [US2] Move the boards/export sub-module — export-named components `DocxExporter`, `PdfExporter`, `ExportButton`, `ExportButtonGroup`, `ExportPopover`, `ImprovedExportPopover`, `UnifiedExporter` (currently in `retro-rocket/src/components/retrospective/`), hooks `retro-rocket/src/hooks/{useExportDocx,useExportPdf,useExportOptions,useUnifiedExport}.ts`, services `retro-rocket/src/services/{docxExportService,pdfExportService,txtExportService,unifiedExportService}.ts`, `retro-rocket/src/utils/exportColumns.ts` — to `retro-rocket/src/features/boards/export/`, updating internal imports; move corresponding tests to `retro-rocket/src/test/features/boards/export/`
- [X] T023 [US2] Move the boards/retrospective sub-module — the remaining files in `retro-rocket/src/components/retrospective/` after T017 and T022 have extracted the clustering- and export-named components, plus hooks `retro-rocket/src/hooks/{useCards,useCardColors,useRetrospective,useRetrospectiveColumns,useJoinRetrospective}.ts`, `retro-rocket/src/hooks/optimization/useOptimizedCards.ts`, `retro-rocket/src/hooks/useTypingStatus.ts`, services `retro-rocket/src/services/{cardService,cardService.test.new,cardService.test.old,cardInteractionService,retrospectiveService,typingStatusService,actionItemsService}.ts`, `retro-rocket/src/services/optimization/{FirestoreListenerManager,OptimisticUpdatesManager,OptimizedTypingStatusService}.ts`, contexts `retro-rocket/src/contexts/{BoardDataContext,TypingProvider}.tsx` — to `retro-rocket/src/features/boards/retrospective/`, updating internal imports; move corresponding tests to `retro-rocket/src/test/features/boards/retrospective/` (depends on T017, T022)
- [X] T024 [P] [US2] Move the boards-domain type files `retro-rocket/src/types/{card,retrospective,participant,actionItem,export,countdown,sentiment,teamMood,facilitatorNotes,columnState,columnGrouping,typing}.ts` to `retro-rocket/src/features/boards/types/`, and `retro-rocket/src/types/user.ts` to `retro-rocket/src/features/auth/types/`
- [X] T025 [US2] Search the full `retro-rocket/src` tree (`pages/`, `App.tsx`, and any remaining references) for import specifiers pointing at pre-move paths (`src/components/*`, `src/hooks/*`, `src/services/*`, `src/contexts/*`, `src/types/*`, `src/templates/*`, `src/examples/*`, `src/workers/*`) and update every remaining one to its new `src/features/**` or `src/lib/**` location (depends on T013-T024)
- [X] T026 [US2] Remove the now-empty leftover directories under `retro-rocket/src` (old `components/`, `hooks/`, `services/`, `contexts/`, `types/`, `templates/`, `examples/`, `workers/`, and their old `src/test/{components,hooks,services,contexts,types,templates}/` counterparts) after confirming they contain no remaining files (depends on T025)
- [X] T027 [US2] Confirm SC-002: search `retro-rocket/src` for any file outside `features/**`, `lib/**`, `pages/`, `i18n/`, `locales/`, `styles/`, `test/**`, and the root bootstrap files (`App.tsx`, `main.tsx`, `vite-env.d.ts`); every capability must resolve to exactly one `features/<capability>` or `lib/<kind>` location with nothing left stray or duplicated (depends on T026)

### Verification for User Story 2

- [X] T028 [US2] Run `npm run type-check`, `npm run lint`, `npm run build`, and `npm run test:coverage` in `retro-rocket/`; confirm zero errors and coverage at or above the pre-existing 80% thresholds (FR-011, SC-003, SC-004) (depends on T025, T026, T027) — type-check clean, build clean, tests match baseline exactly (130/132 files, 2414/2437 tests, same 2 pre-existing failures). Lint still fails to run (pre-existing, unrelated — see baseline-report.md).

**Checkpoint**: User Story 2 complete — every capability lives in its designated feature/lib module and the full test suite is green.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final end-to-end confirmation that nothing regressed across either story

- [X] T029 [P] Run the manual smoke walkthrough from `specs/001-restructure-project-files/quickstart.md` step 5 (create a board, add/vote/group cards, run the facilitator countdown, export PDF/DOCX, sign in/out) and confirm no behavioral differences (SC-005) — **partially automated**: verified the dev server boots and serves `main.tsx`/`App.tsx` with zero module-resolution errors (HTTP 200, clean transform output through the full `@/` alias chain), backed by the full test suite (2414 passing tests exercising this logic). Did **not** perform a literal browser click-through of each flow — no interactive browser session was available in this environment. Recommend a manual pass before merging to fully close SC-005.
- [X] T030 Compare the final `type-check`/`lint`/`build`/`test:coverage` results against the T001 baseline and append the comparison to `specs/001-restructure-project-files/baseline-report.md`
- [X] T031 Update `specs/001-restructure-project-files/spec.md` Status field from `Draft` to reflect completion, and confirm the "gated on verification" items in `plan.md`'s Constitution Check table are now satisfied

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **User Story 1 (Phase 2)**: Depends only on Setup (T001-T002); does **not** depend on Phase 3 or Phase 4 — it can run fully in parallel with them
- **Foundational for US2 (Phase 3)**: Depends on Setup; blocks Phase 4 only
- **User Story 2 (Phase 4)**: Depends on Phase 3 completion
- **Polish (Phase 5)**: Depends on both Phase 2 and Phase 4 being complete

### Within Phase 3 (Foundational for US2)

- T007, T008, T009, T010 are parallel (disjoint file sets)
- T011 depends on all of T007-T010 (needs every lib module in its final location before sweeping consumers)
- T012 depends on T011

### Within Phase 4 (User Story 2)

- T013-T022 are parallel (disjoint file sets, each a self-contained capability)
- T023 depends specifically on T017 and T022 (needs to know what those two tasks extracted from `components/retrospective` before moving "everything else")
- T024 is marked `[P]`: it has no file overlap with T013-T023, so it can run in parallel with them (listed after them only for readability)
- T025 depends on T013-T024 (all moves must be final before the global consumer sweep)
- T026 depends on T025
- T027 (SC-002 check) depends on T026
- T028 depends on T025, T026, and T027

### Parallel Opportunities

- T004 (US1) has no dependency on anything in Phase 3/4 and can run alongside them
- T007-T010 (Phase 3) run in parallel
- T013-T022 (Phase 4, 10 tasks) run in parallel once Phase 3 is complete, and T024 can join that same parallel batch
- T029 (Phase 5) has no dependency on T030/T031 and can run in parallel with them

---

## Parallel Example: Phase 4 (User Story 2)

```bash
# Once Phase 3 (Foundational) is complete, launch all independent capability moves together:
Task: "Move the auth capability to retro-rocket/src/features/auth/"
Task: "Move the create-board capability to retro-rocket/src/features/create-board/"
Task: "Move the dashboard capability to retro-rocket/src/features/dashboard/"
Task: "Move dev-tools scaffolding to retro-rocket/src/features/dev-tools/"
Task: "Move the boards/clustering sub-module to retro-rocket/src/features/boards/clustering/"
Task: "Move the boards/countdown sub-module to retro-rocket/src/features/boards/countdown/"
Task: "Move the boards/facilitator sub-module to retro-rocket/src/features/boards/facilitator/"
Task: "Move the boards/participants sub-module to retro-rocket/src/features/boards/participants/"
Task: "Move the boards/sentiment sub-module to retro-rocket/src/features/boards/sentiment/"
Task: "Move the boards/export sub-module to retro-rocket/src/features/boards/export/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: User Story 1 (documentation cleanup)
3. **STOP and VALIDATE**: Confirm only essential Markdown files remain and the app still builds
4. This alone is a shippable, low-risk improvement independent of the larger reorganization

### Incremental Delivery

1. Setup → Phase 2 (US1) ships immediately as the MVP
2. Phase 3 (Foundational) → Phase 4 (US2) ships the full structural reorganization
3. Phase 5 confirms both together with zero regressions

### Parallel Team Strategy

With multiple developers:

1. One developer handles Phase 2 (US1) entirely — it's small and independent
2. Another developer (or the same one afterward) drives Phase 3 (Foundational), then fans out Phase 4's ten parallel capability-move tasks across the team
3. Reconvene for Phase 5's final verification

---

## Notes

- [P] tasks touch disjoint files and carry no ordering dependency on each other
- Every "move" task includes moving that module's corresponding test file(s) in the same task, per FR-011 (test-to-source coverage mapping preserved)
- No task adds, removes, or changes behavior — every task is a location change plus the import-path edits required to keep the code compiling (FR-008, FR-009, FR-010)
- Commit after each task or logical group so `git mv` history is preserved per-module (FR-012)
- If any Verification task fails, stop and fix before proceeding — do not accumulate multiple unverified moves
