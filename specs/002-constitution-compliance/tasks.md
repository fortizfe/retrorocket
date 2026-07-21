---

description: "Task list for Constitution Compliance Remediation"
---

# Tasks: Constitution Compliance Remediation

**Input**: Design documents from `/specs/002-constitution-compliance/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/quality-gates.md, quickstart.md

**Tests**: Per the project constitution (TDD, NON-NEGOTIABLE), test/verification work is written or repaired before the corresponding cleanup/implementation task where applicable (see User Story 1, which repairs the test suite itself before scripts are retired, and User Story 5, which adds a guard check before remediating each file).

**Organization**: Tasks are grouped by user story (P1–P6, from spec.md) to enable independent implementation and testing of each story. All file paths are relative to the repository root unless already prefixed with `retro-rocket/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Path Conventions

Single project. The application lives at `retro-rocket/` in the repository root; all source paths below are under `retro-rocket/src/` unless otherwise noted.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install the new tooling this effort depends on.

- [X] T001 Install ESLint 9, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, and `eslint-plugin-jsx-a11y` as devDependencies in `retro-rocket/package.json`
- [X] T002 [P] Install `@playwright/test` as a devDependency in `retro-rocket/package.json`
- [X] T003 [P] Install `firebase-tools` as a devDependency in `retro-rocket/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the starting baseline every story's Independent Test diffs against.

**⚠️ CRITICAL**: Capture this baseline before any remediation task below, so FR-002/FR-005/SC-002 completion can be verified against real before/after numbers.

- [X] T004 Run `npm run test:run`, `npm run lint`, and `npm run type-check` in `retro-rocket/` and record the current pass/fail counts and error output — baseline confirmed: `type-check` clean; `lint` now fails with "No ESLint configuration found" (ESLint 9 installed but no config yet, per T001); `test:run` fails 2 files / 23 tests, both via `TypeError: Cannot read properties of undefined (reading 'clear')` at `localStorage.clear()` in `RetrospectivePage.test.tsx` and `useJoinRetrospective.test.ts`

**Checkpoint**: Baseline recorded — user story implementation can now begin in priority order (or in parallel, if staffed).

---

## Phase 3: User Story 1 - Single, Reliable Test Entry Point (Priority: P1) 🎯 MVP

**Goal**: `npm run test` becomes the single, trustworthy source of truth for all automated tests — zero failing tests, zero ad-hoc scripts outside the runner.

**Independent Test**: Run `npm run test:run` on a clean checkout three times consecutively; each run exits 0 with zero failures, and no `test-*`/`verify-*` files remain at the `retro-rocket/` root.

### Repair currently-failing/flaky tests (test-repair only, per Clarification 2026-07-21 — do not fix unrelated product bugs)

- [X] T005 [US1] Fix jsdom `localStorage` unavailability in `retro-rocket/src/test/setup.ts` (add a `localStorage`/`sessionStorage` polyfill or jsdom environment option) — root cause of the `TypeError: Cannot read properties of undefined (reading 'clear')` failures in `src/test/pages/RetrospectivePage.test.tsx` and `src/test/features/boards/retrospective/useJoinRetrospective.test.ts` (23 tests). Root cause: Node v26's own experimental `localStorage` global pre-exists on `globalThis`, so Vitest's jsdom bridge treats it as "already present" and skips copying over jsdom's real implementation. Fixed by explicitly rebinding `globalThis.localStorage`/`sessionStorage` to `globalThis.jsdom.window`'s real storage in setup.ts.
- [X] T006 [US1] Investigate and fix the failure in `retro-rocket/src/test/features/auth/LinkedProvidersCard.test.tsx` ("Unable to find an element with the text: Cuentas Vinculadas") — confirmed this was a downstream symptom of the same T005 root cause (uncaught `localStorage` errors in unrelated `beforeEach` hooks corrupted shared test-run state); passes reliably in isolation and as part of the full suite after T005, no test or component change needed
- [X] T007 [US1] Fix the `act()`-related unhandled rejection surfaced by `retro-rocket/src/test/features/dashboard/BoardCard.test.tsx` during `handleDelete` (state update after unmount) — confirmed this was also a downstream symptom of the T005 root cause; the full suite (including this file) now passes cleanly across 3 consecutive runs with no test or component change needed

### Retire ad-hoc root-level scripts (FR-001, FR-003) — triage each, port real assertions into `src/test/**`, then delete

- [X] T008 [P] [US1] Delete the empty no-op scripts `retro-rocket/test-sorting-grouping.sh`, `retro-rocket/test-sorting-manual.sh`, `retro-rocket/test-ui-functionality.js` (0 bytes — nothing to migrate)
- [X] T009 [P] [US1] Triage `retro-rocket/test-account-linking.sh`: manual-testing checklist printed to console for a human to follow in a browser (no assertions, stale). Deleted, nothing to port.
- [X] T010 [P] [US1] Triage `retro-rocket/test-auth-setup.sh`: file-existence check against pre-refactor paths (`src/contexts/`, `src/components/`, `src/services/`) that no longer exist. Deleted, nothing to port.
- [X] T011 [P] [US1] Triage `retro-rocket/test-countdown-implementation.sh`: file-existence/grep check against pre-refactor paths. Deleted, nothing to port.
- [X] T012 [P] [US1] Triage `retro-rocket/test-facilitator-notes.js`: console.log demo over hardcoded mock data, never calls real code; ownership logic it demonstrates is already covered by the real `facilitatorNotesService.test.ts` suite. Deleted, nothing to port.
- [X] T013 [P] [US1] Triage `retro-rocket/test-github-auth.sh`: grep-based check against pre-refactor paths (`src/services/firebase.ts`, `src/contexts/UserContext.tsx`, `src/pages/Landing.tsx`) that no longer exist. Deleted, nothing to port.
- [X] T014 [P] [US1] Triage `retro-rocket/test-grouping.js`: **contained hardcoded real Firebase production credentials and wrote directly to the live `retrorocket-3284d` Firestore project** with no cleanup — exactly the kind of risk this compliance effort exists to eliminate. No real assertions; superseded by `cardGroupService.test.ts`/`columnGroupingService.test.ts`. Deleted, nothing to port.
- [X] T015 [P] [US1] Triage `retro-rocket/test-improved-grouping.sh`: manual browser-testing checklist, no assertions. Deleted, nothing to port.
- [X] T016 [P] [US1] Triage `retro-rocket/test-linking-fix.sh`: manual browser-testing checklist, no assertions. Deleted, nothing to port.
- [X] T017 [P] [US1] Triage `retro-rocket/test-metrics-panel.sh`: manual browser-testing checklist, no assertions. Deleted, nothing to port.
- [X] T018 [P] [US1] Triage `retro-rocket/test-ownership.js`: console.log demo over hardcoded mock data, never calls real code. Deleted, nothing to port.
- [X] T019 [P] [US1] Triage `retro-rocket/test-professional-docx.js`: 400-line "conceptual" console.log narration that never invokes the real DOCX export service; real coverage already exists in `docxExportService.test.ts`/`docxExportService-simple.test.ts`. Deleted, nothing to port.
- [X] T020 [P] [US1] Triage `retro-rocket/test-sentiment-integration.js`: file-existence/grep check against pre-refactor paths (`src/workers/`, `src/hooks/useSentiment.ts`, `src/components/sentiment/`). Deleted, nothing to port.
- [X] T021 [P] [US1] Triage `retro-rocket/test-template-creation.js`: console.log narration with no real assertions. Deleted, nothing to port.
- [X] T022 [P] [US1] Triage `retro-rocket/verify-column-translation.js`: reimplements translation logic inline (doesn't call the real function) and checks a stale pre-refactor path. Deleted, nothing to port.
- [X] T023 [P] [US1] Triage `retro-rocket/verify-i18n-teamMood.js`: genuine i18n-completeness check (translation keys present in both locales, components use `t()`, no hardcoded strings) but scoped to stale pre-refactor Team Mood paths. Its *pattern* is superseded by the new general guard check in US5 (T046), which covers all components, not just Team Mood. Deleted, nothing to port beyond what T046 already does.
- [X] T024 [P] [US1] Triage `retro-rocket/verify-team-mood.js`: file-existence/grep check against pre-refactor paths, including a since-removed `TEAM_MOOD_ANALYSIS.md`. Deleted, nothing to port.
- [X] T024b [US1] Also removed two untracked-in-analysis-but-actually-tracked leftover scripts discovered during cleanup: `retro-rocket/test-professional-txt-export.mjs` and `retro-rocket/test-txt-export.mjs` (same pattern: console.log demos over hardcoded mock data, no real assertions)

### Verification

- [X] T025 [US1] Confirm `git ls-files 'test-*.sh' 'test-*.js' 'test-*.mjs' 'verify-*.js'` in `retro-rocket/` returns empty, then run `npm run test:run` three consecutive times confirming exit 0 with zero failures each time (validates SC-001, SC-002, SC-006) — confirmed empty; suite passed 132/132 files, 2437/2437 tests across 3 consecutive runs after the T005 localStorage fix

**Checkpoint**: `npm run test` is now the single, trustworthy source of truth — MVP complete.

---

## Phase 4: User Story 2 - Working Lint Gate (Priority: P2)

**Goal**: `npm run lint` runs successfully and enforces the project's TypeScript/React/accessibility conventions.

**Independent Test**: Run `npm run lint` on a clean checkout; it exits 0 (or reports specific, actionable violations) instead of failing with "command not found."

- [X] T026 [US2] Create `retro-rocket/eslint.config.js` (flat config) per research.md §1: `typescript-eslint` recommended + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` + `eslint-plugin-jsx-a11y`, with `@typescript-eslint/no-explicit-any: 'error'`. Deviated from research.md in one respect: `eslint-plugin-react-hooks` v7's `recommended` config now bundles the full React Compiler readiness ruleset (purity/immutability/set-state-in-effect/etc.), which this project does not target — kept only `rules-of-hooks` (error) and `exhaustive-deps` (warn), documented inline in the config.
- [X] T027 [US2] Run `npm run lint` and sort the reported violations into auto-fixable vs. needs-manual-fix — initial baseline: 291 problems (182 errors, 109 warnings) across ~40 files
- [X] T028 [US2] Run `eslint --fix` across `retro-rocket/src` to resolve all auto-fixable violations (only 1 was auto-fixable; the rest required manual typing)
- [X] T029 [US2] Manually resolve remaining ESLint violations in `retro-rocket/src` file by file until `npm run lint` reports zero errors. Fixed ~120 `no-explicit-any` errors with precise domain types (`DynamicColumnConfig`, `Participant`, `ProviderCredentialError extends AuthError`, `UpdateData<Card>`, `LucideIcon`, etc.), a genuine `rules-of-hooks` bug in `UnifiedExporter.tsx` (hook called conditionally), and removed 4 stale `eslint-disable-next-line react/forbid-dom-props` comments referencing a plugin that was never installed. Documented exceptions per FR-005: `jsx-a11y/no-autofocus` downgraded to warn (13 legitimate modal/inline-edit-form autofocus call sites, not page-load focus theft); one `@typescript-eslint/no-explicit-any` kept with a justified inline comment in `sentimentWorker.ts` (third-party `@xenova/transformers` pipeline type erasure). Result: 0 errors, 123 warnings (all non-blocking: `no-unused-vars`, `exhaustive-deps`, `no-autofocus`).
- [X] T030 [US2] Confirm `npm run lint` exits 0 on a clean checkout — confirmed, 0 errors

**Checkpoint**: Lint gate is runnable and enforced — Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - CI Enforcement of Quality Gates (Priority: P3)

**Goal**: Every PR automatically runs type-check, lint, and coverage-gated tests, and a violation blocks merge.

**Independent Test**: Open a PR that intentionally lowers coverage or introduces a lint violation; the CI check fails and blocks merge.

- [X] T031 [US3] Create `.github/workflows/ci.yml` with a `checks` job (checkout, `actions/setup-node` with `cache: npm`, `npm ci`, `npm run type-check`, `npm run lint`, `npm run test:coverage`) triggered on `pull_request` to `main`, per contracts/quality-gates.md — created with `checks` and `e2e` jobs, Node 22, `working-directory: retro-rocket`
- [X] T032 [US3] Confirm `retro-rocket/vitest.config.ts`'s thresholds actually reach `test:coverage`'s exit code — **found they did not**: `thresholds.global.{branches,functions,lines,statements}` is a pre-Vitest-3 schema silently ignored by the installed Vitest 3.2.4, so the 80% floor was never enforced. Real coverage was ~52% statements/lines, ~66% functions, ~81% branches. Per user decision, fixed the schema (flat `thresholds.{branches,functions,lines,statements}`) and recalibrated to the true passing baseline (78/64/50/50) rather than the never-actually-met 80%, documented inline in vitest.config.ts and in spec.md FR-007/Assumptions. `npm run test:coverage` now exits 0 at the real baseline, confirmed stable across 3 runs. Also found and removed a 20th stray dead demo file discovered via this pass, `LinkifyTextTests.tsx` (root-level, referenced a pre-refactor import path that no longer resolves — same class of cleanup as US1's T009–T024).
- [ ] T033 [US3] Push a throwaway branch that intentionally introduces a lint violation and open a PR; confirm the `checks` job fails and blocks merge, then close the PR and delete the branch — **deferred**: user opted not to have this agent push branches/open PRs against the real GitHub remote; workflow file is authored and locally validated (job steps run clean against the current branch state) but this empirical proof is left for the user to run
- [ ] T034 [US3] Push a throwaway branch that intentionally drops coverage below 80% and open a PR; confirm the `checks` job fails and blocks merge, then close the PR and delete the branch — **deferred**, same reason as T033

**Checkpoint**: CI automatically enforces lint/type-check/coverage on every PR — Stories 1–3 all work independently.

---

## Phase 6: User Story 4 - Critical-Flow End-to-End Coverage (Priority: P4)

**Goal**: Playwright, running against the Firebase Emulator Suite (per Clarification 2026-07-21), covers the five named critical flows and gates releases.

**Independent Test**: Run the Playwright suite against a running instance of the app; it exercises each of the five named flows and reports pass/fail per flow.

- [X] T035 [US4] Create `retro-rocket/firebase.json` configuring the Auth and Firestore emulators (ports) per research.md §3
- [X] T036 [US4] Create `retro-rocket/playwright.config.ts` targeting the local dev server and starting the Firebase Emulator Suite via `webServer`/global-setup — implemented with `webServer` (spawns `npm run dev` with `VITE_USE_FIREBASE_EMULATOR=true`); also added real emulator-connection logic to `src/lib/services/firebase.ts` (`connectFirestoreEmulator`/`connectAuthEmulator`), which didn't exist before and was required for the app to be able to talk to the emulator at all
- [X] T037 [US4] **Design changed during implementation**: the planned custom-token bypass (`e2e/fixtures/emulator-auth.ts` + `firebase-admin`) was built and live-tested, but the Auth Emulator does not populate `email` on the resulting user immediately after `signInWithCustomToken`, which the app's profile-setup code requires — surfaced as a real, reproducible "Email is required" error. Rather than work around an emulator quirk, standardized on the already-proven real-popup flow (see T042) for every spec via a shared `e2e/fixtures/auth-helpers.ts` helper; removed the custom-token fixture and the `firebase-admin` dependency (uninstalled — no longer needed, keeping to Simplicity/YAGNI).
- [X] T038 [P] [US4] Write Playwright spec `retro-rocket/e2e/board-creation.spec.ts` — verified against the real running app: creates board, confirms default template columns render
- [X] T039 [P] [US4] Write Playwright spec `retro-rocket/e2e/card-lifecycle.spec.ts` — verified against the real running app: adds 2 cards, likes a card (the modern replacement for the deprecated `votes` counter — confirmed via source and live UI), groups by creator
- [X] T040 [P] [US4] Write Playwright spec `retro-rocket/e2e/facilitator-countdown.spec.ts` — verified against the real running app: quick 5-min preset → create timer → start → pause → stop (delete)
- [X] T041 [P] [US4] Write Playwright spec `retro-rocket/e2e/export.spec.ts` — verified against the real running app: PDF export triggers a real `.pdf` download, then DOCX export (after closing the success overlay) triggers a real `.docx` download
- [X] T042 [P] [US4] Write Playwright spec `retro-rocket/e2e/authentication.spec.ts` driving the app's real `signInWithPopup(GoogleAuthProvider)` button against the Auth Emulator's fake-IDP consent popup — live-explored the actual emulator popup DOM (`#email-input`, `#display-name-input`, "Add new account", "Sign in with Google.com") to get real, verified selectors rather than guessed ones; confirms landing on `/mis-tableros` with the display name visible
- [X] T043 [US4] Add `e2e` and `emulators` npm scripts to `retro-rocket/package.json` — `e2e` wraps `playwright test` in `firebase emulators:exec --only auth,firestore` (auto start/wait/teardown); `emulators` is the standalone `firebase emulators:start --only auth,firestore` for manual use
- [X] T044 [US4] Add an `e2e` job to `.github/workflows/ci.yml` that starts the Firebase Emulator Suite and runs `npx playwright test`, triggered on `pull_request` to `main` and before release, per contracts/quality-gates.md — done as part of T031
- [X] T045 [US4] Run `npm run e2e` locally against the emulator and confirm all 5 critical-flow specs pass (validates SC-004) — confirmed: 5/5 passing across 2 consecutive runs (~28s each). Note: switched `playwright.config.ts` to `workers: 1`/`fullyParallel: false` — the 5 specs share one dev server and one Firestore/Auth Emulator instance with no per-worker isolation, and full parallelism caused real cross-test contention (flaky failures) against that shared local state.

**Checkpoint**: All 5 critical flows have automated E2E coverage — Stories 1–4 all work independently.

---

## Phase 7: User Story 5 - Complete Internationalization of User-Visible Text (Priority: P5)

**Goal**: No user-facing text is hardcoded in component markup; everything routes through i18next with keys present in both locales.

**Independent Test**: Search the component tree for literal user-facing text not routed through `t()`; after remediation, none remain outside test/dev-tools code.

- [X] T046 [US5] Add a guard check as a Vitest test at `retro-rocket/src/test/i18n/no-hardcoded-text.test.ts` that scans all `.tsx` files under `src/` for literal JSX text content outside `t()` calls, excluding `src/test` and `src/features/dev-tools`, and fails when any is found — confirmed it initially failed against the pre-remediation codebase, now passes
- [X] T047 [P] [US5] Replace hardcoded Spanish text in `src/features/auth/components/AuthWrapper.tsx` with `t()` calls (`auth.wrapper.verifying`); added to both locale files
- [X] T048 [P] [US5] Replace hardcoded Spanish text in `src/features/boards/participants/components/ParticipantList.tsx` with `t()` calls (`participants.emptyTitle`, `participants.emptySubtitle`); added to both locale files
- [X] T049 [P] [US5] Replace hardcoded Spanish text in `src/features/boards/countdown/components/CountdownFeatureDemo.tsx` with `t()` calls — reused the pre-existing but previously-unused `countdown.demo.states.{running,paused,finished}` keys and added the missing `.stopped`. Note: this component is unreachable from any app route (only its own test imports it) and contains substantially more hardcoded copy beyond the 4 status labels originally identified; only those 4 were remediated per the original audit scope, the rest is a documented follow-up, not silently dropped.
- [X] T050 [P] [US5] Replace hardcoded Spanish text in `src/features/boards/countdown/components/FacilitatorMenu.tsx` with `t()` calls (`retrospective.facilitator.sentiment.notAvailable`); added to both locale files. Also found and fixed an adjacent pre-existing bug while in this area: `ActionColumnToggle.tsx` called `t('retrospective.facilitator.hideActionItems')` for a key that was never defined in either locale file (rendered the raw key to users) — added it.
- [X] T051 [P] [US5] Replace hardcoded Spanish text in `src/features/boards/clustering/components/GroupSuggestionModal.tsx` with `t()` calls, reusing the existing top-level `groupSuggestion.*` namespace and adding `analyzing`/`suggestedHeadCard`/`createGroup`. Also found and fixed two pre-existing broken key references in this same file (`t('retrospective.groupSuggestion.group')` / `.cardsInGroup` pointed at a path that doesn't exist — the real keys live at top-level `groupSuggestion.*` — corrected to match).
- [X] T052 [P] [US5] Replace hardcoded Spanish text in `src/features/boards/retrospective/components/RetrospectiveBoard.tsx` and `EnhancedRetrospectiveBoard.tsx` with `t()` calls (`retrospective.errors.loadCards`); both files were calling `useLanguage()` for its reactivity side-effect only, without capturing `t` — fixed that too. Added key to both locale files.
- [X] T053 [P] [US5] Replace hardcoded Spanish text in `src/features/boards/export/components/PdfExporter.tsx` with `t()` calls (`retrospective.export.pdfExporter.*`, 7 new keys); also fixed the same class of hardcoded text in two more dead-but-tracked export components found during the audit, `UnifiedExporter.tsx` and `DocxExporter.tsx` (reusing the existing `retrospective.export.documentConfig`/`.progress` keys, adding `.contentToInclude`). All three are confirmed unreachable from any app route; only the originally-identified strings were remediated, deeper copy in these files is a documented follow-up.
- [X] T054 [US5] Re-run the guard check from T046 plus `npm run test:run`; confirm zero hardcoded-text violations and both locale files stay in sync (validates SC-005) — confirmed: 133/133 test files, 2438/2438 tests passing, including the new guard check. Also fixed a test-discovery collision this work surfaced: Vitest's default glob was picking up Playwright's `e2e/*.spec.ts` files (added `e2e/**` to `vitest.config.ts`'s `test.exclude`), and updated 5 unit tests whose mocked `t()` dictionaries didn't yet know the new keys (`ParticipantList.test.tsx`, `ImprovedParticipantList.test.tsx`, `ParticipantList.ux.test.tsx`, `CountdownFeatureDemo.test.tsx`, `App.test.tsx`).

**Checkpoint**: All user-visible text is translatable — Stories 1–5 all work independently.

---

## Phase 8: User Story 6 - Repository Hygiene for Generated Artifacts (Priority: P6)

**Goal**: Generated coverage snapshots are no longer committed to version control.

**Independent Test**: After remediation, `git status` shows no coverage report artifacts, and `npm run test:coverage` doesn't reintroduce them as trackable changes.

- [X] T055 [US6] Add `coverage_report.txt` and `coverage_report_current.json` to `retro-rocket/.gitignore` — added to the repo-root `.gitignore` (the only `.gitignore` in this repo; `retro-rocket/` has no separate one)
- [X] T056 [US6] Run `git rm --cached retro-rocket/coverage_report.txt retro-rocket/coverage_report_current.json` to untrack the already-committed artifacts (local files are kept, just removed from git)
- [X] T057 [US6] Run `npm run test:coverage` and confirm `git status --short` shows no new/modified tracked coverage-report files — confirmed clean

**Checkpoint**: All 6 user stories are independently functional — repository fully aligned with the constitution's tooling obligations.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Close the remaining constitution gaps that span multiple stories.

- [X] T058 [P] Eliminate or justify the ~51 `: any` occurrences found in non-test production source under `retro-rocket/src` per FR-014 — completed as part of T029 (same work, since `@typescript-eslint/no-explicit-any: 'error'` in the new lint config is what surfaced them; the actual count found once ESLint could run was 120, not 51 — the earlier grep-based estimate undercounted `Record<string, any>`, `ReadonlyMap<string, any>`, and `React.ComponentType<any>` forms). All but one eliminated with precise types; the one exception (`sentimentWorker.ts`) is documented inline per FR-014's own escape hatch.
- [X] T059 [P] Audit `retro-rocket/src` for any direct `firebase/firestore` imports inside component files (outside `src/lib/services` and `src/lib/hooks`) and refactor through the existing service/hook layer if found (validates FR-013) — audited via `grep -rl "from 'firebase/firestore'" src --include="*.tsx"` (excluding tests): zero matches. No component performs direct Firestore access; the existing service/hook abstraction layer is intact.
- [X] T060 If any NON-NEGOTIABLE constitution gate remains unresolved after Phases 3–8, document the exception and its rationale per FR-012 — since this implementation was done directly by an agent rather than via a submitted PR, documented in spec.md's new "Documented Exceptions (FR-012)" section instead of a PR description: coverage floor recalibrated to true baseline (not 80%) with a raise-coverage follow-up noted, one justified `any` in `sentimentWorker.ts`, `jsx-a11y/no-autofocus` downgraded to warn, partial i18n remediation on 4 unreachable dead-code components, pre-existing locale structural drift (~12 keys) left unfixed, and T033/T034's CI empirical proof deferred per user decision
- [X] T061 Run every step in `specs/002-constitution-compliance/quickstart.md` end-to-end and confirm each step's expected output holds — all 6 steps run: (1) test:run 0 failures + no ad-hoc scripts ✓, (2) lint 0 errors ✓, (3) deferred per user decision, (4) `npm run e2e` 5/5 passing ✓, (5) 0 hardcoded text outside test/dev-tools ✓ (found and documented pre-existing unrelated locale drift), (6) coverage artifacts stay untracked ✓. quickstart.md updated to match final implementation (`npm run e2e` command, deferred-step note, locale-drift caveat).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — establishes the baseline all stories verify against
- **User Stories (Phase 3–8)**: All depend on Foundational phase completion
  - Stories are independent of each other by design and can proceed in parallel if staffed, or sequentially in priority order (P1 → P2 → P3 → P4 → P5 → P6) if not
  - Note: User Story 3's CI `checks` job (T031) will only be *green* once User Story 1 (tests) and User Story 2 (lint) are complete — the workflow file itself can be authored earlier, but full validation (T033/T034) assumes T001–T030 are done
  - Note: User Story 4's `e2e` CI job (T044) depends on the `ci.yml` file created in User Story 3 (T031) already existing
- **Polish (Phase 9)**: Depends on all six user stories being complete

### Within Each User Story

- Root-cause test repairs (US1: T005–T007) before script retirement (T008–T024), since retiring scripts is easier to validate against a known-green baseline
- Config creation before remediation tasks that depend on it (e.g., US2: eslint.config.js before running/fixing lint; US4: firebase.json + playwright.config.ts before writing specs; US5: guard check before per-file remediation)
- Story complete (checkpoint) before moving to next priority, if working sequentially

### Parallel Opportunities

- All Setup tasks marked [P] (T002, T003) can run in parallel with each other and with T001
- All 16 individual script-triage tasks in US1 (T009–T024) are [P] — different files, no dependencies between them
- All 5 Playwright spec-writing tasks in US4 (T038–T042) are [P] — different spec files
- All 7 hardcoded-string remediation tasks in US5 (T047–T053) are [P] — different component files
- Once Foundational (Phase 2) completes, all six user stories can be staffed and worked in parallel by different developers, keeping in mind the CI cross-story notes above

---

## Parallel Example: User Story 1 script retirement

```bash
# Launch all independent script-triage tasks together:
Task: "Triage retro-rocket/test-account-linking.sh: port any still-relevant assertion into src/test/features/auth/, then delete the script"
Task: "Triage retro-rocket/test-grouping.js: port any still-relevant assertion into src/test/features/boards/clustering/, then delete the script"
Task: "Triage retro-rocket/test-professional-docx.js: port any still-relevant assertion into src/test/features/boards/export/, then delete the script"
# ...and so on for the remaining triage tasks (T009-T024)
```

## Parallel Example: User Story 5 string remediation

```bash
# Launch all independent component remediation tasks together:
Task: "Replace hardcoded Spanish text in src/features/auth/components/AuthWrapper.tsx with t() calls"
Task: "Replace hardcoded Spanish text in src/features/boards/participants/components/ParticipantList.tsx with t() calls"
Task: "Replace hardcoded Spanish text in src/features/boards/export/components/PdfExporter.tsx with t() calls"
# ...and so on for the remaining remediation tasks (T047-T053)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (captures the baseline)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `npm run test:run` passes 3 consecutive times with zero failures, no ad-hoc scripts remain
5. This alone resolves the exact gap called out in the original request ("los scripts de test no son correctos, debería lanzarse todo bajo npm run test")

### Incremental Delivery

1. Complete Setup + Foundational → baseline captured
2. Add User Story 1 → validate independently → single trustworthy test entry point (MVP!)
3. Add User Story 2 → validate independently → lint gate works
4. Add User Story 3 → validate independently → CI enforces both automatically
5. Add User Story 4 → validate independently → critical flows have E2E coverage
6. Add User Story 5 → validate independently → no hardcoded UI text
7. Add User Story 6 → validate independently → no stale generated artifacts in git
8. Finish with Phase 9 Polish (`any`-type cleanup, Firestore-access audit, full quickstart run)

### Parallel Team Strategy

With multiple developers, once Foundational (Phase 2) is done:

- Developer A: User Story 1 (test repair + script retirement)
- Developer B: User Story 2 (lint), then User Story 3 (CI) once US1/US2 land
- Developer C: User Story 4 (Playwright/Emulator)
- Developer D: User Story 5 (i18n) and User Story 6 (repo hygiene) in parallel — both are low-coupling with the rest

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Per Clarification (2026-07-21): if a test repair in US1 (T005–T007) reveals a genuine product bug rather than a stale assertion, do **not** fix the app behavior as part of this task — log it as a separate, explicitly named follow-up item instead
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
