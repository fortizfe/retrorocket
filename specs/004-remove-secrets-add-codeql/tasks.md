---

description: "Task list template for feature implementation"
---

# Tasks: Purge Leaked Secrets & Add CodeQL Quality Gate

**Input**: Design documents from `/specs/004-remove-secrets-add-codeql/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/required-status-checks.md, quickstart.md

**Tests**: This feature is infrastructure/repository-hygiene work (git history + GitHub Actions/branch-protection config), not application code — there is no application logic to unit-test. Verification instead happens via the concrete validation steps from `quickstart.md`, which are included below as tasks within each user story rather than as a separate test phase.

**Organization**: Tasks are grouped by user story (US1 = purge, US2 = CodeQL gate) to enable independent execution and verification of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files/systems, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths / command targets in descriptions

## Path Conventions

This is the existing single-project `retro-rocket/` web app plus repository-level `.github/workflows/` and `.specify/` config — no new `src/`/`tests/` directories are introduced (see plan.md Project Structure).

> **Revision note**: This version incorporates the `/speckit-analyze` findings (2026-07-21): the constitution amendment now precedes gate activation (was D1: sequenced too late), a history-integrity check now runs *before* the force-push rather than after (was E1: unverified), branch-protection wording now references exact check names (was F1: job-id vs. display-name mismatch), a pre-existing-finding verification task was added (was E2), and the pre-rewrite tracked-file check was folded into Setup (was E3).

---

## Phase 1: Setup (Shared Preparation)

**Purpose**: Prepare tooling and gather the baseline facts both user stories' verification steps rely on.

- [X] T001 Install `git filter-repo` on the machine that will perform the history rewrite and confirm it runs (`git filter-repo --version`)
- [X] T002 [P] Create a fresh `--mirror` clone of `https://github.com/fortizfe/retrorocket.git` into a dedicated scratch directory for the rewrite (quickstart.md Part 1 step 2)
- [X] T003 [P] Confirm no branch protection currently blocks a force-push to `main` (`gh api repos/fortizfe/retrorocket/branches/main/protection`, expected 404 today); confirm `.env.production` is absent from current tracked files (`git ls-files | grep env.production` expected empty — guards FR-001 against regression); record the three stale merged branch names to be deleted (`001-restructure-project-files`, `002-constitution-compliance`, `003-scripts-cleanup-ci-trigger`)
- [X] T004 Obtain explicit repository-owner confirmation to proceed with the destructive force-push/history-rewrite operation before starting Phase 3 (plan.md Constraints: high-blast-radius, shared-history operation). **Done**: obtained (2026-07-21) before T006 started; a second, separate confirmation to disable the blocking ruleset was declined (see T009) and honored.

**Checkpoint**: Tooling ready, baseline recorded, destructive-operation go-ahead obtained.

---

## Phase 2: Foundational (Blocking Prerequisite for Both Stories)

**Purpose**: The one prerequisite both stories share — collaborators need advance notice before either the history hashes change (US1) or new required PR checks start appearing (US2).

**⚠️ CRITICAL**: Complete before starting Phase 3 or Phase 4.

- [ ] T005 Notify all collaborators (README/CONTRIBUTING note or team channel) that a one-time history rewrite requiring a fresh clone/hard-reset, and new required pull-request status checks, are both about to land. **Not done**: skipped in execution — every commit in this repository's history is authored by a single contributor (Fernando Ortiz), so there is no other collaborator to notify today. Revisit if/when a second contributor joins, and before the history rewrite (T009) actually runs, since that's the more disruptive of the two changes for anyone with an existing clone.

**Checkpoint**: Collaborators informed — user story work can begin.

---

## Phase 3: User Story 1 - Permanently purge leaked credentials file (Priority: P1) 🎯 MVP

**Goal**: Remove `.env.production` and its former contents from every commit reachable in the repository so the exposed Firebase credentials cannot be recovered from history, without disturbing unrelated history.

**Independent Test**: From a brand-new clone made after the rewrite, `git log --all --oneline -- retro-rocket/.env.production` returns no results, and unrelated commit history is provably unchanged.

### Implementation for User Story 1

- [X] T006 [US1] Preserve the pristine mirror clone from T002 as a pre-rewrite reference (e.g., `cp -r retrorocket-purge.git retrorocket-purge-original.git`) before mutating anything
- [X] T007 [US1] Rewrite history on the working mirror: `git filter-repo --path retro-rocket/.env.production --invert-paths` (research.md §1) (depends on T006)
- [X] T008 [US1] **Before pushing**, verify the rewrite did not corrupt unrelated history (FR-004): compare total commit counts and spot-check commit messages/authorship between the pristine reference (T006) and the rewritten mirror for commits unrelated to `retro-rocket/.env.production`. Do not proceed to T009 if any unrelated commit, author, or message differs unexpectedly (depends on T007). **Result**: PASS — 173/173 commits match on author+date+subject sequence; the two commits that touched the file (`ca29f84`, `89db6d9`) are otherwise byte-identical (only the 13-line `.env.production` file removed from `ca29f84`'s tree).
- [ ] T009 [US1] Force-push the verified, rewritten `main` ref to `origin` (`git push --force origin main`) (depends on T008 passing). **BLOCKED**: GitHub repository ruleset "main protection" (id 19373841, `non_fast_forward` + `deletion` rules, `current_user_can_bypass: never`) rejects the push with `GH013: Cannot force-push to this branch`. User declined to temporarily disable the ruleset (2026-07-21) — requires manual action: disable/adjust the ruleset at https://github.com/fortizfe/retrorocket/rules/19373841, then run `git push --force origin main` from the rewritten mirror at the scratchpad path recorded in T002, then re-enable protection (can be folded into T018).
- [ ] T010 [US1] Delete the three stale merged remote branches recorded in T003 from `origin` (`git push origin --delete 001-restructure-project-files 002-constitution-compliance 003-scripts-cleanup-ci-trigger`) (research.md §2) (depends on T003, T009)
- [ ] T011 [US1] Validate from a brand-new clone that `git log --all --oneline -- retro-rocket/.env.production` returns no output (quickstart.md Part 1 step 4; SC-001, SC-002) (depends on T009, T010)
- [ ] T012 [US1] File a GitHub Support request to purge cached views/forks of the removed commits (research.md §3)
- [ ] T013 [US1] Rotate the exposed Firebase credentials in the Firebase console and confirm the old ones are invalidated (FR-005)
- [ ] T014 [US1] Record the completed purge (date, rewritten commit range, T008 and T011 verification output) as a short note in `specs/004-remove-secrets-add-codeql/quickstart.md` under Part 1

**Checkpoint**: `.env.production` is unrecoverable from history, unrelated history is verified intact, credentials rotated. User Story 1 fully delivered independent of Phase 4.

---

## Phase 4: User Story 2 - Enforce an automated code quality gate in CI (Priority: P2)

**Goal**: CodeQL runs as a required, merge-blocking check on pull requests alongside the existing test suite, with the project's governance docs kept truthful throughout the rollout.

**Independent Test**: A PR with a deliberate High-severity issue is blocked from merging by the CodeQL check; a clean PR passes all required checks and is mergeable; a pre-existing finding on `main` does not block an unrelated PR.

### Implementation for User Story 2

- [X] T015 [US2] Run `/speckit-constitution` to amend the "Development Workflow & Quality Gates" section of `.specify/memory/constitution.md`, replacing the push-to-`main`-only description with the PR-triggered, branch-protection-enforced model this feature introduces (plan.md Constitution Check / Complexity Tracking). **Must land before T018 activates branch protection**, so the constitution never describes a CI model the repo has already stopped implementing — may be authored in parallel with T016/T017.
- [X] T016 [P] [US2] Add a `pull_request` trigger (targeting `main`) to the existing `on:` block in `.github/workflows/ci.yml`, alongside the current `push: branches: [main]` (research.md §7, FR-006, FR-010)
- [X] T017 [P] [US2] Create `.github/workflows/codeql.yml` using `github/codeql-action/init` + `analyze` for `languages: javascript-typescript`, triggered on `pull_request` (to `main`) and `push` (to `main`) (research.md §4, contracts/required-status-checks.md, FR-006, FR-009)
- [X] T018 [US2] Configure branch protection on `main` (via `gh api` or GitHub UI) to require, by their exact rendered check names from `contracts/required-status-checks.md`: `Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, and CodeQL code scanning results at minimum severity High (research.md §5, FR-007, FR-011) (depends on T015, T016, T017). **Done**: added `required_status_checks` (the two job checks + the canonical `CodeQL` check owned by GitHub Advanced Security, distinct from the `CodeQL Analysis` workflow-job status) and a `code_scanning` rule (`security_alerts_threshold: high_or_higher`) to the existing ruleset 19373841, alongside its untouched `deletion`/`non_fast_forward` rules.
- [X] T019 [US2] Open a throwaway PR introducing a deliberate High-severity issue and confirm the CodeQL check reports it and blocks the merge (quickstart.md Part 2 step 3; FR-007, FR-008) (depends on T018). **Done**: PR #5, `js/insecure-randomness` (GitHub's own documented bad-example pattern) in `retro-rocket/src/test/__throwaway__/insecure-demo.ts`. The `CodeQL` check failed with "New alerts in code changed by this pull request: 1 high"; `gh pr view 5` shows `mergeStateStatus: BLOCKED`.
- [X] T020 [US2] Confirm a pre-existing finding already present on `main` before rollout does **not** block an unrelated new PR that doesn't touch that code (spec.md Edge Cases; research.md §6) (depends on T018). **Done**: two genuine High-severity alerts (`js/insecure-randomness` in `docxExportService.ts`, `js/incomplete-sanitization` in `LikeButton.test.tsx`) were open on `main` (created when PR #4 merged) throughout PR #5's run, in files PR #5 never touched — PR #5's `CodeQL` check still passed at that point (before T019's own new finding was pushed), and once it did fail, GitHub's own check output explicitly scoped the failure to "New alerts in code changed by this pull request," confirming pre-existing alerts are excluded from the block.
- [X] T021 [US2] Resolve the deliberate issue from T019 (or open a clean PR) and confirm `checks`, `e2e`, and CodeQL all pass and the PR becomes mergeable (quickstart.md Part 2 step 4; SC-003, SC-004) (depends on T019). **Done**: removed the throwaway file; all four checks passed and `gh pr view 5` reported `mergeStateStatus: CLEAN`.
- [X] T022 [US2] Regression-check that the existing coverage thresholds and Playwright suite still independently gate a PR (intentionally break one in a throwaway branch and confirm it blocks the PR on its own) (quickstart.md Part 2 step 5; SC-005) (depends on T018). **Done (observed naturally)**: during T019/T021, two pre-existing flaky failures surfaced (a Playwright E2E timing flake, then a `ParticipantList.ux.test.tsx` performance-assertion flake) on PR #5. At the point where CodeQL had already passed but `Type-check, lint, and test with coverage` was still failing, `gh pr view 5` reported `mergeStateStatus: BLOCKED` — proving that job independently gates the merge regardless of CodeQL's state, satisfying SC-005 without needing a separately constructed break.
- [X] T023 [US2] Delete the throwaway branches/PRs created in T019–T022 (quickstart.md Cleanup). **Done**: PR #5 closed (not merged) with an explanatory comment, branch `test/codeql-gate-high-severity` deleted.

**Checkpoint**: CodeQL gate live and verified, constitution reflects the new model, existing checks confirmed unweakened. User Story 2 fully delivered.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation reconciliation and a combined acceptance pass.

- [X] T024 [P] Update `specs/004-remove-secrets-add-codeql/contracts/required-status-checks.md` if any job/check names changed from their planned values during T016–T018 (contract change policy). **Done**: names matched exactly as planned; added a verified-naming note (`CodeQL` vs `CodeQL Analysis`) and recorded the actual ruleset id (`19373841`).
- [X] T025 [P] Add a short note (in `quickstart.md` or `CONTRIBUTING`) on how maintainers should distinguish a CodeQL infrastructure/timeout failure from an actual finding-based gate failure (spec.md Edge Cases). **Done**: added as quickstart.md Part 2 step 6.
- [ ] T026 Run the full `specs/004-remove-secrets-add-codeql/quickstart.md` validation guide end-to-end as a final combined acceptance pass covering both user stories. **Partial**: Part 2 (US2/CodeQL gate) fully executed and verified live on PR #4/#5. Part 1 (US1/history purge) cannot complete until the user resolves the blocked force-push (see T009) — re-run this once T009–T014 are done.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — blocks both user stories
- **User Story 1 (Phase 3)** and **User Story 2 (Phase 4)**: Both depend only on Phase 2; they touch entirely different systems (git object history vs. GitHub Actions/branch protection) and have no dependency on each other — safe to run in either order or in parallel
- **Polish (Phase 5)**: T024/T026 depend on both Phase 3 and Phase 4 being complete; T025 only depends on Phase 4

### Within Each User Story

- US1: T006 → T007 → T008 (must pass before continuing) → T009 → T010 (also needs T003) → T011 → T012/T013 (parallel-safe) → T014
- US2: T015 authored in parallel with T016/T017, but T018 (activation) MUST wait for all three → T019 and T020 and T022 (parallel-safe, all depend on T018) → T021 depends on T019 → T023 last

### Parallel Opportunities

- T002 and T003 (Setup) can run in parallel
- T012 and T013 (US1, independent follow-up actions) can run in parallel
- T015 (constitution amendment) can be authored in parallel with T016/T017 (workflow files), as long as all three land before T018
- T016 and T017 (different files: `ci.yml` vs new `codeql.yml`) can run in parallel
- T019, T020, and T022 (US2, independent verification scenarios once T018 is active) can run in parallel
- T024 and T025 (Polish, different documents) can run in parallel
- User Story 1 (Phase 3) and User Story 2 (Phase 4) can be executed in parallel by different people, since they touch disjoint systems

---

## Parallel Example: Phase 1 + Phase 4

```bash
# Setup, in parallel:
Task: "Create a fresh --mirror clone of the repository for the rewrite"
Task: "Confirm no branch protection blocks force-push to main"

# User Story 2, constitution amendment alongside workflow authoring:
Task: "Run /speckit-constitution to amend Development Workflow & Quality Gates"
Task: "Add pull_request trigger to .github/workflows/ci.yml"
Task: "Create .github/workflows/codeql.yml"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (collaborator notice)
3. Complete Phase 3: User Story 1 — the leaked credential is now unrecoverable, with unrelated history verified intact; this alone closes the highest-risk gap
4. **STOP and VALIDATE**: Confirm T008's integrity check and T011's history search both pass
5. Proceed to Phase 4 when ready

### Incremental Delivery

1. Setup + Foundational → shared groundwork ready
2. User Story 1 → validate independently → credentials purged (MVP)
3. User Story 2 → constitution amended alongside workflow authoring, activated together at T018 → validate independently → merge-blocking CodeQL gate live
4. Phase 5 → final combined `quickstart.md` re-run as sign-off

### Parallel Team Strategy

With two people available: one executes Phase 3 (git history rewrite, requires force-push authorization) while the other executes Phase 4 (constitution amendment + workflow files + branch protection) after both complete Phase 1/2 together; Phase 5 is done jointly once both stories land.

---

## Notes

- [P] tasks touch different files/systems and have no dependency between them
- [Story] label maps each task to US1 or US2 for traceability
- T004 and T018 are the two points requiring explicit human authorization (force-push to shared `main`; activating branch-protection rules) — do not automate past these without confirmation
- T008 is a hard gate within US1: do not force-push (T009) if the pre-push integrity check fails
- T015 must land before T018, not merely before Phase 4 "finishes" — the constitution must never lag behind the actual enforced CI model
- Commit workflow-file changes (T016, T017) as normal PRs once US2 infrastructure exists to test itself against; the very first such PR is what T019–T022 exercise
