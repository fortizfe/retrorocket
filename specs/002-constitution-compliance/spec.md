# Feature Specification: Constitution Compliance Remediation

**Feature Branch**: `002-constitution-compliance`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "En esta especificación, quiero que revises el código actual de la aplicación contra las restricciones y especificaciones de constitution.md. Lo que queremos es adaptar el código actual a las obligaciones y deberes establecidos en la constitución. Por ejemplo los scripts de test no son correctos, debería lanzarse todo bajo npm run test. Propón todas las cosas que consideres que hay que adaptar para llevarlo a cabo."

## Clarifications

### Session 2026-07-21

- Q: When a currently-failing test reveals a genuine product bug rather than a stale/misaligned assertion, is fixing the underlying app behavior in scope for this compliance effort? → A: Test-repair only — align test expectations with current intended behavior (fix stale assertions, `act()` warnings, mocks); log any deeper app bug found as a separate, explicitly named follow-up item rather than fixing it here.
- Q: Should the new Playwright E2E suite run against a Firebase Emulator Suite, a dedicated cloud staging project, or with Firebase calls mocked/stubbed? → A: Firebase Emulator Suite — local, free, fast, resettable between runs, no real credentials needed in CI, and exercises real Firestore/Auth behavior (including security rules) unlike mocking.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single, Reliable Test Entry Point (Priority: P1)

A developer working on RetroRocket needs one authoritative command that runs every automated test in the project and gives a trustworthy pass/fail signal. Today, dozens of ad-hoc scripts (`test-*.sh`, `test-*.js`, `test-*.mjs`, `verify-*.js`) live at the repository root outside the Vitest runner, and the Vitest suite itself currently fails — non-deterministically: repeated runs on an unchanged checkout have produced different failing files and counts (observed: 3 files / 24 tests in one run, 2 files / 23 tests tied to a reproducible jsdom `localStorage` gap in another), which means `npm run test` cannot be trusted as the single source of truth either by its current failures or by its current flakiness.

**Why this priority**: This is the exact gap the user called out as the driving example, and it blocks enforcement of every other constitution obligation — none of the other gates matter if "run the tests" doesn't reliably mean anything.

**Independent Test**: On a clean checkout, run `npm run test:run`. The suite completes with zero failing tests, and no ad-hoc `test-*`/`verify-*` scripts remain outside `src/test`.

**Acceptance Scenarios**:

1. **Given** a clean clone of the repository, **When** a developer runs `npm run test`, **Then** every automated unit and integration test executes and the run reports zero failures.
2. **Given** the repository root currently contains ad-hoc scripts such as `test-grouping.js` or `verify-team-mood.js`, **When** this work is complete, **Then** those scripts no longer exist at the root, and any assertion in them that still verifies real product behavior has been migrated into the Vitest suite under `src/test`.
3. **Given** a developer wants to validate their branch before opening a PR, **When** they run a single documented command, **Then** they get one unambiguous pass/fail result covering all tests, with no need to run other scattered scripts.

---

### User Story 2 - Working Lint Gate (Priority: P2)

`npm run lint` currently fails immediately with `eslint: command not found` — ESLint is referenced in `package.json` but is neither installed nor configured anywhere in the project. The constitution requires ESLint as a mandatory pre-merge gate, which today is entirely unenforceable.

**Why this priority**: Without a runnable lint command, the "ESLint MUST be a mandatory gate before merge" obligation cannot be enforced at all, and it is a prerequisite for the CI gate in User Story 3.

**Independent Test**: On a clean checkout, run `npm run lint`. The command executes against `src` and reports pass or specific, actionable violations — it does not fail due to missing tooling.

**Acceptance Scenarios**:

1. **Given** a clean checkout, **When** a developer runs `npm run lint`, **Then** ESLint runs against `src` and completes (pass, or a list of specific violations) instead of failing with "command not found."
2. **Given** a source file introduces a TypeScript or React anti-pattern (e.g. an unused import, a missing hook dependency), **When** lint runs, **Then** the violation is reported.

---

### User Story 3 - CI Enforcement of Quality Gates (Priority: P3)

There is no continuous integration pipeline in the repository today (no workflow configuration exists). The constitution requires CI to fail the build when coverage drops below 80%, and to gate merges on lint and type-check. Right now, every one of these checks depends entirely on individual developer discipline.

**Why this priority**: Even once local tooling is fixed (P1, P2), the constitution mandates automatic enforcement, not just availability of the commands. Without CI, a broken gate can merge unnoticed.

**Independent Test**: Open a pull request that intentionally lowers test coverage or introduces a lint violation. The CI check fails and blocks the merge.

**Acceptance Scenarios**:

1. **Given** a pull request is opened against `main`, **When** CI runs, **Then** it executes type-check, lint, and the full test suite with coverage.
2. **Given** a pull request drops branch, function, line, or statement coverage below 80%, **When** CI runs, **Then** the build fails.
3. **Given** a pull request introduces a lint violation, **When** CI runs, **Then** the build fails.

---

### User Story 4 - Critical-Flow End-to-End Coverage (Priority: P4)

No end-to-end testing tool exists in the project. The constitution explicitly names Playwright as "adopted as a new project tool (not yet present)" and requires E2E coverage of five critical flows: creating a board, adding/voting/grouping cards, the facilitator countdown, exporting to PDF/DOCX, and authentication.

**Why this priority**: This is a named, explicit gap in the constitution itself — unit tests cannot catch integration failures across real-time sync, UI, and export pipelines the way E2E tests can.

**Independent Test**: Run the Playwright suite against a running instance of the app; it exercises each of the five named flows and reports pass/fail per flow.

**Acceptance Scenarios**:

1. **Given** the app is running, **When** the Playwright suite executes, **Then** it verifies a user can create a board, add/vote/group cards, run the facilitator countdown, export to PDF and DOCX, and authenticate.
2. **Given** a critical flow breaks, **When** the E2E suite runs in CI before a release, **Then** the release is blocked.

---

### User Story 5 - Complete Internationalization of User-Visible Text (Priority: P5)

Several components render hardcoded Spanish text directly in JSX instead of going through i18next — confirmed in, among others, `AuthWrapper.tsx`, `ParticipantList.tsx`, `CountdownFeatureDemo.tsx`, `FacilitatorMenu.tsx`, `GroupSuggestionModal.tsx`, `RetrospectiveBoard.tsx` / `EnhancedRetrospectiveBoard.tsx`, and `PdfExporter.tsx`. The constitution prohibits hardcoded strings in components.

**Why this priority**: A real, named, testable constitutional obligation, but with a narrower blast radius than the testing/CI gaps above — it affects user experience and maintainability rather than the integrity of the quality gates themselves.

**Independent Test**: Search the component tree for literal user-facing text not routed through `t()`. After remediation, none remain outside test/dev-tools code.

**Acceptance Scenarios**:

1. **Given** a component renders user-facing text, **When** this work is complete, **Then** the text is sourced via `t()` with a key present in both `en.json` and `es.json`.
2. **Given** a new translation key is added, **When** a developer checks both locale files, **Then** the key exists with a translation in each.

---

### User Story 6 - Repository Hygiene for Generated Artifacts (Priority: P6)

`coverage_report.txt` and `coverage_report_current.json` — large, stale, generated coverage snapshots — are committed to version control, despite being regenerable build output. This contradicts having CI be the source of truth for coverage (User Story 3) and clutters the repository with artifacts that inevitably go stale.

**Why this priority**: Lowest risk and effort of the set, but directly related to the user's underlying complaint that ad-hoc, out-of-band test artifacts don't belong alongside the real test suite.

**Independent Test**: After remediation, `git status` shows no coverage report artifacts as tracked files, and running `npm run test:coverage` does not reintroduce them as trackable changes.

**Acceptance Scenarios**:

1. **Given** a developer runs `npm run test:coverage`, **When** new coverage output is generated, **Then** git does not show it as a new or modified tracked file.

---

### Edge Cases

- What happens to root-level scripts that are operational/setup tooling rather than test verification (e.g. `setup-firebase-auth.sh`, `migrate-user-providers.sh`, `deploy.sh`)? These are assumed out of scope — see Assumptions.
- How does CI budget for the `@xenova/transformers` machine-learning dependency (used for sentiment analysis), which can be slow to install/run in a fresh CI environment?
- Playwright E2E tests run against the Firebase Emulator Suite rather than a real project, so no production or cloud staging Firestore data is ever touched — see Clarifications.
- When a currently-failing test reveals a genuine product bug rather than a stale assertion, the underlying app behavior is NOT fixed as part of this effort — see Clarifications; it is logged as a separate, explicitly named follow-up item instead.
- The suite's flakiness (different tests failing across repeated runs on the same checkout) is itself treated as a defect in test isolation to repair under FR-002/FR-003 — e.g. shared global state (such as an unmocked `localStorage`) leaking between test files — not merely a fixed list of tests to patch once.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST expose all automated tests (unit and integration) exclusively through the existing `npm run test` family of scripts (`test`, `test:run`, `test:coverage`); no test or verification logic MUST live outside that runner.
- **FR-002**: All tests currently failing in the Vitest suite MUST be repaired — by correcting stale or misaligned test expectations, assertions, and mocks — so that `npm run test:run` completes with zero failing tests on a clean checkout. Where a failure is traced to a genuine underlying product bug rather than a stale test, the test repair MUST NOT change app behavior to paper over it; the bug MUST instead be logged as a separate, explicitly named follow-up item outside this effort's scope.
- **FR-003**: Ad-hoc root-level scripts whose purpose duplicates automated testing (`test-*.sh`, `test-*.js`, `test-*.mjs`, `verify-*.js`) MUST be removed from the repository; any assertion in them still verifying real product behavior MUST first be migrated into the Vitest suite under `src/test`.
- **FR-004**: ESLint MUST be installed as a project dependency and configured for TypeScript and React so that `npm run lint` executes successfully against `src`.
- **FR-005**: `npm run lint` MUST report zero errors on the codebase, or any remaining violation MUST be explicitly documented with a stated rationale.
- **FR-006**: A continuous integration pipeline MUST run on every pull request and execute, at minimum: type-check (`npm run type-check`), lint (`npm run lint`), the test suite with coverage (`npm run test:coverage`), and the Playwright critical-flow suite against the Firebase Emulator Suite (see FR-008/FR-009) — so that SC-003's "blocked from merging" guarantee covers critical-flow regressions, not only lint/type/coverage regressions.
- **FR-007**: CI MUST fail the build when branch, function, line, or statement coverage drops below the thresholds defined in `vitest.config.ts`. **Amended during implementation (2026-07-21)**: the 80% thresholds in `vitest.config.ts` were discovered to be non-functional — nested under a legacy `global` key silently ignored by the installed Vitest 3.x, meaning the floor was never actually enforced and real coverage sat at ~52% statements/lines, ~66% functions, ~81% branches. The schema bug is fixed so thresholds are enforced for real, but the values are set to the true, currently-passing baseline (50/64/78/50) rather than the previously-aspirational, never-met 80% — see FR-012 and the Assumptions section for the raise-to-80%-later follow-up.
- **FR-008**: Playwright MUST be added as a project testing tool with end-to-end coverage of: board creation, adding/voting/grouping cards, the facilitator countdown, exporting to PDF and DOCX, and authentication.
- **FR-009**: The Playwright E2E suite MUST run in CI before every release against the Firebase Emulator Suite (not a production or cloud staging project), and a failing critical-flow test MUST block the release.
- **FR-010**: All user-visible text currently hardcoded in component markup MUST be replaced with i18next `t()` calls backed by keys present in every supported locale file (`en.json`, `es.json`).
- **FR-011**: Generated or derived artifacts (coverage reports, build output) MUST NOT be committed to version control; `.gitignore` MUST exclude them, and any already-tracked instance MUST be untracked.
- **FR-012**: Any exception to a NON-NEGOTIABLE constitution principle (TDD, coverage floor, critical-flow E2E coverage) that cannot be fully resolved within this effort MUST be explicitly documented with a stated rationale rather than left silently unaddressed.
- **FR-013**: The audit MUST confirm that no UI component performs direct `firebase/firestore` calls; any component found doing so MUST be refactored to go through the existing service/hook abstraction layer.
- **FR-014**: Use of the TypeScript `any` type in non-test production source MUST be eliminated, or accompanied by an inline comment justifying why a precise type is not possible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can confirm their change is ready for review by running a single command (`npm run test`) and receive a complete, accurate pass/fail signal, without running any separate manual script.
- **SC-002**: 100% of the automated test suite passes on a clean checkout (zero failures across the full suite).
- **SC-003**: A change that violates lint rules, drops coverage below 80%, or breaks a critical user flow is automatically blocked from merging without requiring a human reviewer to catch it manually.
- **SC-004**: All five critical user journeys named in the constitution (board creation; card add/vote/group; facilitator countdown; PDF/DOCX export; authentication) have automated end-to-end verification.
- **SC-005**: No user-facing text in the application is available in only one hardcoded language — every string a user sees is translatable and present in all supported locales.
- **SC-006**: The repository contains zero stray test or verification scripts living outside the standard test runner.

## Assumptions

- CI will run on GitHub Actions, since the project is hosted on GitHub and no other CI provider is currently configured or implied anywhere in the repository.
- Root-level scripts that are operational/setup tooling rather than test verification (e.g. `start.sh`, `deploy.sh`, `setup-firebase-auth.sh`, `migrate-user-providers.sh`, `check-status.sh`) are out of scope for this effort — they are not test scripts and do not conflict with "all tests run under `npm run test`."
- Repairing the tests currently failing in the Vitest suite is in scope, since a suite that doesn't pass — or that passes/fails inconsistently between runs — cannot function as the constitution's mandated pass/fail gate; but this repair is limited to correcting the tests and test infrastructure themselves (including root-causing flakiness, e.g. missing test-environment setup). Any genuine product bug a failure uncovers is out of scope here and MUST be logged as a separate follow-up item rather than fixed inline (see Clarifications, Session 2026-07-21).
- Deeper Accessibility auditing (beyond the static `eslint-plugin-jsx-a11y` checks added in User Story 2) and a dedicated Error Handling & Resilience audit of Firestore operations are both out of scope for this effort — see plan.md's Constitution Check. Neither standard is being weakened; both are simply unaudited by this specific remediation pass and remain candidates for a future, separately scoped effort.
- Existing `any` usage inside test files and mocks is lower priority than production source for this effort; it is not blocking, but new production code must not introduce untyped `any` without justification going forward.
- Playwright E2E tests will run against the Firebase Emulator Suite, not production data or a cloud staging project (see Clarifications, Session 2026-07-21).
- The existing Firestore service/hook abstraction layer (`firebase.ts`, `OptimizedRetrospectiveService`, `useFirestore`, `FirestoreListenerManager`, etc.) is assumed structurally sound already; this effort verifies it rather than rebuilding it from scratch.

## Documented Exceptions (FR-012)

Per FR-012, every NON-NEGOTIABLE gate this effort could not fully close is recorded here with its rationale, rather than left silently unaddressed:

- **Coverage floor is not 80% today.** The 80% thresholds in `vitest.config.ts` were discovered to have never been enforced (a legacy `global`-nested schema Vitest 3.x silently ignores). Real coverage was ~52% statements/lines, ~66% functions, ~81% branches. Per explicit user decision during implementation, the schema bug was fixed and thresholds recalibrated to the true, currently-passing baseline (branches 78 / functions 64 / lines 50 / statements 50) rather than left broken or set to an 80% figure that would immediately fail CI. **Follow-up**: raise branches/functions/lines/statements coverage toward the original 80% target — a separate, substantial effort (writing new tests for existing under-covered code), not part of this compliance pass.
- **One justified `@typescript-eslint/no-explicit-any` remains** in `src/features/boards/sentiment/workers/sentimentWorker.ts` (2 call sites), documented inline: `@xenova/transformers`' `pipeline()` return type is a broad cross-task union that loses its `'text-classification'` narrowing once cached in a variable for reuse across calls; resolving this precisely would require a much larger refactor of the pipeline-caching pattern than the compliance goal warrants.
- **`jsx-a11y/no-autofocus` is a warning, not an error**, documented inline in `eslint.config.js`: all 13 call sites in this codebase target the primary field of a just-opened modal or inline-edit form (a user-initiated interaction, the standard WAI-ARIA Dialog pattern), not page-load focus theft; downgrading rather than stripping working UX from 13 reviewed, legitimate call sites.
- **Partial i18n remediation on 4 unreachable components.** `CountdownFeatureDemo.tsx`, `PdfExporter.tsx`, `UnifiedExporter.tsx`, and `DocxExporter.tsx` are confirmed unreachable from any app route (dead code, only referenced by their own tests or nothing at all) and contain substantially more hardcoded Spanish copy than the specific strings originally identified in this spec's audit. Only the originally-identified strings were routed through `t()`; the remaining copy in these four files is a documented follow-up, not a silent gap — SC-005's Independent Test (and the permanent guard test) are scoped to `src/test` and `src/features/dev-tools` exclusions only, and these four files are outside that exclusion, so this is a known, bounded exception rather than a passing check.
- **Locale file structural drift, pre-existing.** Comparing all keys in `en.json` and `es.json` after this effort's changes surfaces roughly a dozen keys that exist in one locale but not the other (e.g. `header.language`, `retrospective.facilitator.tabs.*` vs `.stats.*`, `retrospective.progress`) — confirmed unrelated to this effort (all 21 keys this effort added were individually verified present in both files). Reconciling this broader, pre-existing drift is a separate follow-up.
- **CI's empirical "blocks a bad PR" proof (User Story 3, tasks T033/T034) is deferred.** Per explicit user decision, the implementing agent did not push throwaway branches or open PRs against the real GitHub remote (a visible, shared-state action). The `checks` and `e2e` CI jobs are authored and their individual steps verified locally; a human should run the actual "open a bad PR, watch it get blocked" proof once.
- **Two pre-existing broken i18n key references were found and fixed as adjacent, low-risk corrections** (not scope creep — same root cause as this effort's mandate): `ActionColumnToggle.tsx` referenced `retrospective.facilitator.hideActionItems`, which didn't exist in either locale file (users saw the raw key); `GroupSuggestionModal.tsx` referenced `retrospective.groupSuggestion.group`/`.cardsInGroup`, which don't exist at that path (the real keys live at top-level `groupSuggestion.*`). Both corrected.
- Raising coverage from the true current baseline (~52% statements/lines, ~66% functions, ~81% branches) up to the constitution's originally-intended 80% floor is explicitly out of scope for this effort — see FR-007. That gap was undiscoverable until CI/coverage enforcement was actually made to work (a chicken-and-egg problem: the tooling to reveal the gap didn't exist until this compliance pass built it), so it is logged here as a named follow-up per FR-012 rather than silently left unaddressed.
