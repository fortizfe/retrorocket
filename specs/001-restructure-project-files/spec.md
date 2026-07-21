# Feature Specification: Restructure Project Files

**Feature Branch**: `001-restructure-project-files`

**Created**: 2026-07-21

**Status**: Implemented (2026-07-21) — all 31 tasks complete, zero regressions vs. baseline (see `baseline-report.md`)

**Input**: User description: "Para este desarrollo quiero que trabajemos en la estructuración y reorganización de los ficheros del proyecto. Las cosas que quiero son las siguientes: 1- Eliminar todos los ficheros *.MD que no sean importantes. Es decir, que no sean relativos a speckit ni tampoco license ni readme. 2- Recolocar todos los ficheros en un sistema de carpetas más acorde con lo descrito en el fichero de constitución. IMPORTANTE, no debe modificar, añadir o perder ninguna funcionalidad. Solo queremos reestructurar los ficheros en un sistema de carpetas más acorde a la constitution."

## Clarifications

### Session 2026-07-21

- Q: How granular should the new `src/features` modules be for the retrospective-board capabilities (clustering, countdown, facilitator, participants, retrospective, sentiment)? → A: Consolidate clustering, countdown, facilitator, participants, retrospective, and sentiment as sub-modules inside the existing `src/features/boards` module; authentication, create-board, and dashboard remain their own top-level feature modules.
- Q: Should tests move alongside their source files inside each feature module, or stay in a centralized `src/test/` tree reorganized to mirror the new structure? → A: Keep the single centralized `src/test/` tree (including `setup.ts` and the Vitest coverage excludes); reorganize its subfolders to mirror the new feature-based `src/` layout.
- Q: Are the debug/demo/example folders (`src/components/debug`, `src/components/demo`, `src/examples`) in scope for this reorganization? → A: Yes — relocate them into a dedicated dev-tools feature module alongside the other reorganized capabilities.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remove non-essential documentation clutter (Priority: P1)

As a developer maintaining RetroRocket, I want the repository root free of one-off implementation notes, analysis write-ups, and status summaries so that the only Markdown files remaining are the ones that genuinely orient a newcomer or govern the project (README, license, and Spec Kit governance/spec artifacts).

**Why this priority**: This is the lowest-risk, highest-clarity win — it doesn't touch source code or behavior at all, and it immediately reduces noise for anyone browsing the repository. It can ship independently of the folder reorganization.

**Independent Test**: Can be fully verified by listing all `*.md` files in the repository and confirming only README.md, files under `.specify/`, files under `specs/`, and any genuine project license documentation remain; the app still builds and runs identically since no source file was touched.

**Acceptance Scenarios**:

1. **Given** the repository contains ad-hoc historical Markdown files (implementation summaries, design comparisons, analysis notes) at the project root, **When** the cleanup is applied, **Then** those files no longer exist in the repository.
2. **Given** README.md and the Spec Kit governance files (`.specify/**`, `specs/**`), **When** the cleanup is applied, **Then** those files remain untouched and fully intact.
3. **Given** any remaining documentation (e.g., README) contains links or references to a removed file, **When** the cleanup is applied, **Then** those references are updated or removed so no broken links remain.

---

### User Story 2 - Reorganize source files to match the constitution's structure (Priority: P2)

As a developer maintaining RetroRocket, I want the project's source files grouped into a folder structure that reflects the constitution's Library-First principle (independent, decoupled capabilities under `src/features`, and shared reusable logic under `src/lib`) so that I can locate, reuse, and test each capability without hunting across loosely related top-level folders.

**Why this priority**: This is the structural core of the request. It depends on nothing from User Story 1 but delivers the actual organizational value the user is asking for, and carries the most risk of accidentally breaking something, so it follows the cleanup.

**Independent Test**: Can be fully verified by confirming card clustering, sentiment analysis, countdown, facilitator tools, participants, and retrospective board logic all live as sub-modules of `src/features/boards`; authentication, create-board, and dashboard each live in their own top-level `src/features/<capability>` module; developer scaffolding (debug, demo, examples) lives in its own dev-tools feature module; genuinely cross-cutting/shared logic lives under `src/lib` or an equivalent shared location; and the application still builds, type-checks, and passes its full existing test suite with unchanged behavior.

**Acceptance Scenarios**:

1. **Given** a domain capability's code (components, hooks, services, tests) is currently scattered across separate top-level folders (e.g., `src/components/sentiment`, related hooks, related services), **When** the reorganization is applied, **Then** all of that capability's code lives together under one feature module and nothing about its runtime behavior changed.
2. **Given** logic that is genuinely shared across multiple features (generic UI primitives, generic hooks, cross-cutting utilities), **When** the reorganization is applied, **Then** that logic is consolidated into a clearly shared location rather than duplicated or left ambiguous about ownership.
3. **Given** the reorganization changes where files live, **When** the project is built and its automated test suite is run, **Then** the build succeeds and every previously-passing test still passes, with no reduction in coverage.
4. **Given** a test file that exercises a specific source file, **When** that source file moves, **Then** its corresponding test moves with it and continues to exercise the same code path.

---

### Edge Cases

- What happens to a Markdown file whose content might still be useful later? It is removed from the working tree; its content remains recoverable through version-control history.
- What happens if a removed Markdown file is linked from README or another surviving document? The link/reference is updated or removed so readers never hit a dead link.
- What happens if two different domain capabilities both depend on the same piece of code? That code is treated as shared and placed in the shared location rather than duplicated or arbitrarily assigned to one feature.
- What happens if a file's new location changes an import path used elsewhere in the codebase? Every affected import is updated as part of the same change so the build and runtime behavior are unaffected.
- What happens if reorganizing a folder would require guessing at a new behavior (not just moving code)? That is out of scope — only file location and import wiring may change, never behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST retain only the following Markdown files: `README.md`, files under `.specify/` (Spec Kit governance artifacts), and files under `specs/` (feature specifications, plans, tasks, checklists).
- **FR-002**: All other Markdown files present at the project root or elsewhere outside `.specify/` and `specs/` (historical implementation notes, design analyses, status summaries, etc.) MUST be removed from the repository.
- **FR-003**: Any reference (link, mention, path) to a removed Markdown file that exists in a surviving document MUST be updated or removed so no broken references remain.
- **FR-004**: Card clustering, sentiment analysis, countdown, facilitator tools, participants, and retrospective board logic MUST be consolidated as sub-modules of the existing `src/features/boards` feature module, consistent with the constitution's Library-First principle. Authentication, create-board, and dashboard MUST each remain their own top-level feature module.
- **FR-005**: Developer-only scaffolding — including the (currently empty) `src/components/debug` and `src/components/demo` directories, `src/examples/`, the standalone test/demo components directly under `src/components` (`SortGroupTest.tsx`, `ParticipantListDemo.tsx`, `ColorSystemTest.tsx`), the metrics-monitoring UI (`src/components/optimization/MetricsDashboard.tsx`), and the unused root-level app-shell variants (`MinimalApp.tsx`, `RouterApp.tsx`, `SimpleApp.tsx`, `TestApp.tsx`, each only referenced by its own dedicated test) — MUST be relocated into a dedicated dev-tools feature module rather than left scattered across their current locations.
- **FR-006**: Code that is genuinely shared and reused across multiple capabilities (generic UI primitives, generic hooks, cross-cutting utilities, app-wide contexts) MUST be consolidated into a clearly identified shared location rather than duplicated across feature modules.
- **FR-007**: Automated tests MUST remain centralized in a single `src/test/` tree rather than being co-located inside feature modules; that tree's internal subfolders MUST be reorganized to mirror the new feature-based `src/` layout.
- **FR-008**: The reorganization MUST NOT alter any existing runtime behavior, business logic, UI behavior, or public interface — only file locations, folder structure, and the import paths required to keep the code working may change.
- **FR-009**: The reorganization MUST NOT add new functionality and MUST NOT remove any existing functionality.
- **FR-010**: Every import path, path alias, and build/test configuration entry that references a moved file MUST be updated so the application builds, type-checks, and runs without errors after the reorganization.
- **FR-011**: Every existing automated test MUST continue to pass after the reorganization, and the existing test-to-source coverage mapping MUST be preserved (a test that covered a file before the move still covers that file after the move).
- **FR-012**: The reorganization SHOULD preserve each file's edit history where the tooling in use makes that feasible (i.e., moved rather than deleted-and-recreated).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Markdown files outside `README.md`, `.specify/`, and `specs/` are removed from the repository.
- **SC-002**: 100% of the repository's domain-specific capabilities are locatable under a single, unambiguous feature module rather than spread across unrelated top-level folders.
- **SC-003**: The full existing automated test suite passes at the same or higher pass rate, and coverage stays at or above the project's existing coverage thresholds, both before and after the reorganization.
- **SC-004**: The application builds, type-checks, and lints successfully with zero errors introduced by the reorganization.
- **SC-005**: Manual walkthrough of the primary user flows (create a board, add/vote/group cards, run the facilitator countdown, export a board) shows no observable behavioral difference compared to before the reorganization.

## Assumptions

- "Important" Markdown files are interpreted exactly as the user described: `README.md`, the project license file, and anything related to Spec Kit (files under `.specify/` and `specs/`). All other root-level analysis/summary/implementation-note Markdown files are considered non-essential and are removed.
- The target folder structure follows the constitution's Library-First principle already partially in place in the codebase (the existing `src/features/boards` module serves as the umbrella for tightly-coupled retrospective-board capabilities): clustering, countdown, facilitator, participants, retrospective, and sentiment logic become sub-modules of `src/features/boards`; auth, create-board, and dashboard remain their own top-level `src/features/<capability>` modules; developer scaffolding (debug, demo, examples) becomes its own dev-tools feature module; and genuinely cross-cutting logic is consolidated under a shared location (e.g., `src/lib` or an equivalent shared folder).
- This is a pure structural refactor: no new source code behavior, UI, or feature is introduced, and none is removed — only file locations and the wiring (imports, paths, config) needed to keep everything working.
- Removed Markdown files remain accessible via version-control history if their content is needed later.
- Tests remain centralized under `src/test/`, reorganized to mirror the new feature-based `src/` layout, so the existing coverage mapping and thresholds are preserved without needing new tests.
- During planning, a seventh boards sub-module, `export` (PDF/DOCX/TXT export hooks, services, and export-labeled components), was identified alongside the six named in the clarification session, using the same single-consumer/tightly-coupled-to-boards rationale. See research.md's "Boards sub-module boundaries" decision for the full reasoning.
