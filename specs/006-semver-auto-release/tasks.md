---

description: "Task list template for feature implementation"
---

# Tasks: Automated Semantic Versioning on Main

**Input**: Design documents from `/specs/006-semver-auto-release/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/version-bump-commit.md, quickstart.md

**Tests**: This feature is CI/CD pipeline configuration work, not application code — there is no application logic to unit-test (plan.md Constitution Check: TDD is N/A). Verification happens via the concrete validation steps from `quickstart.md`, included below as tasks within each user story rather than as a separate test phase.

**Organization**: Tasks are grouped by user story (US1 = automatic version bump on clean push, US2 = 0.1.0 baseline bootstrap, US3 = never runs on PRs/other branches) to enable independent execution and verification of each. **Note on ordering**: US2's one-time bootstrap must complete before US1's live scenarios can be exercised (research.md §2), so its phase is sequenced first below even though spec.md lists US1 first — both are Priority P1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files/systems, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths / command targets in descriptions

## Path Conventions

This is the existing single-project `retro-rocket/` web app plus repository-level `.github/workflows/` config — no new `src/`/`tests/` directories are introduced (see plan.md Project Structure). Edited/created files: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `retro-rocket/.releaserc.json`, `retro-rocket/package.json`, `retro-rocket/package-lock.json`.

---

## Phase 1: Setup (Shared Preparation)

**Purpose**: Add the versioning tool itself and its configuration, before any workflow wiring depends on it.

- [X] T001 Add `semantic-release`, `@semantic-release/commit-analyzer`, `@semantic-release/npm`, and `@semantic-release/git` as devDependencies in `retro-rocket/package.json` (research.md §1). **Done**: installed via `npm install --save-dev`; confirmed `npm audit` vulnerability count is unchanged before/after (41 total, all pre-existing) — the four new packages introduce zero new vulnerabilities.
- [X] T002 [P] Create `retro-rocket/.releaserc.json` with `branches: ["main"]` and exactly three plugins in order — `@semantic-release/commit-analyzer` (default `angular`/`conventionalcommits` preset, no config overrides needed per research.md §1), `@semantic-release/npm` with `npmPublish: false`, and `@semantic-release/git` configured with `assets: ["package.json", "package-lock.json"]` and `message: "chore(release): ${nextRelease.version} [version bump]"` (research.md §4, contracts/version-bump-commit.md, FR-007, FR-008). **Done**: validated with `npx semantic-release --dry-run --no-ci` — all five plugin hooks (`verifyConditions`×2, `analyzeCommits`, `prepare`×2, `publish`/`addChannel`) load correctly, and it correctly refuses to publish from a non-`main` branch.

**Checkpoint**: `semantic-release` and its config exist in the repo; nothing invokes it yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire the shared workflow plumbing — the new job skeleton, the wait-for-CodeQL step, the `semantic-release` invocation, and the loop/redeploy-prevention skip conditions — that every user story below depends on.

**⚠️ CRITICAL**: No user story work can be verified until this phase is complete.

- [X] T003 Add a new `version` job to `.github/workflows/ci.yml`, gated `if: github.event_name == 'push' && github.ref == 'refs/heads/main' && !contains(github.event.head_commit.message, '[version bump]')`, with `needs: [checks, e2e]`, `permissions: contents: write`, and a checkout step using `actions/checkout@v4` with `fetch-depth: 0` (full history/tags, not the default shallow clone) (research.md §3, §4, §5; FR-001, FR-002, FR-009). **Done**: validated with `actionlint` (no findings).
- [X] T004 In the `version` job, add a wait step for the external `CodeQL` check against `github.sha`, using the same `lewagon/wait-on-check-action` pattern already proven in `.github/workflows/deploy.yml` (research.md §3, §6, contracts/version-bump-commit.md; FR-002) (depends on T003). **Done**: pinned to `lewagon/wait-on-check-action@v1.8.1` with `timeout-minutes: 15`, matching `deploy.yml`'s existing usage exactly.
- [X] T005 In the `version` job, add the `setup-node` step (Node 22, matching the rest of `ci.yml`), an `npm ci` step, and a final `npx semantic-release` step using the default `GITHUB_TOKEN` (already granted `contents: write` via T003) (research.md §1; FR-004, FR-005, FR-006, FR-011, FR-012) (depends on T001, T002, T003, T004). **Done, amended from planned**: also added a "Configure git identity for the release commit" step (`git config user.name/user.email` set to `github-actions[bot]`) immediately before the `semantic-release` step — `@semantic-release/git` shells out to `git commit` directly, which fails on a fresh runner with no git identity configured; this wasn't called out explicitly in research.md/tasks.md but is required for T005's own stated goal (a working release commit) to actually succeed.
- [X] T006 Add a matching skip condition to `deploy.yml`'s `deploy-production` job: `if: github.event_name == 'push' && !contains(github.event.head_commit.message, '[version bump]')` (research.md §4, contracts/version-bump-commit.md; FR-010, SC-006). **Done**: validated with `actionlint` (no findings).

**Checkpoint**: The `version` job exists, waits on all three gates, and can run `semantic-release`; both loop/redeploy skip conditions are in place — user story verification can now begin.

---

## Phase 3: User Story 2 - First release establishes the 0.1.0 baseline (Priority: P1) 🎯 Required first

**Goal**: Establish `0.1.0` as the project's baseline version exactly once, so every subsequent automated computation has a real starting point to increment from.

**Independent Test**: Run the bootstrap on a repository with no prior version tags; confirm the resulting version in `package.json`/`package-lock.json` and the created tag is exactly `0.1.0`, independent of prior commit history.

### Implementation for User Story 2

- [ ] T007 [US2] Open and merge a PR that sets `retro-rocket/package.json`'s and `retro-rocket/package-lock.json`'s `version` fields to `"0.1.0"` directly (research.md §2; FR-005) (depends on Phase 2 being merged so the three gates and the `version` job's skip-on-marker logic are already active when this PR lands).
- [ ] T008 [US2] Once T007's merge commit passes all three required quality gates, create and push the git tag `v0.1.0` pointing at that exact commit: `git tag v0.1.0 <merge-commit-sha> && git push origin v0.1.0` (research.md §2; FR-005, SC-003) (depends on T007).
- [ ] T009 [US2] Confirm the very next qualifying push after T008 computes its version strictly as an increment over `v0.1.0` — not by replaying the full project history from inception (Acceptance Scenario 2; FR-006) (depends on T008; evidence gathered jointly with Phase 4's T010).

**Checkpoint**: `v0.1.0` exists on `main`; `package.json`/`package-lock.json` read `0.1.0`. Automated bumps can now be exercised.

---

## Phase 4: User Story 1 - Automatic version bump after a clean push to main (Priority: P1) 🎯 MVP

**Goal**: Once all three quality gates pass on a `main` commit, the version is recalculated from Conventional Commits since the last tag and written to `package.json`/`package-lock.json` automatically.

**Independent Test**: Push a `feat:` commit to `main`, wait for all three gates, and confirm the version increases by MINOR — and that no change occurs until all three gates report success.

### Implementation for User Story 1

- [ ] T010 [US1] Push a commit containing a `feat:` Conventional Commit message to `main`; once all three gates pass, confirm the `version` job runs and bumps the MINOR component (quickstart.md Part 1; Acceptance Scenario 1) (depends on T008).
- [ ] T011 [US1] Push a `fix:`-only commit (no `feat`/breaking change) to `main`; confirm the PATCH component increments (quickstart.md Part 2 step 1; Acceptance Scenario 2) (depends on T010).
- [ ] T012 [US1] Push a commit with a breaking-change marker (`feat!:` subject or `BREAKING CHANGE:` footer) to `main`; confirm the MAJOR component increments **even though the version is still below `1.0.0`**, per the clarified unconditional precedence rule (quickstart.md Part 2 step 2; Acceptance Scenario 3, FR-004) (depends on T011).
- [ ] T013 [US1] Push a `feat:` commit and inspect `package.json` on `main` before the three gates finish; confirm the version is unchanged until all three report success (quickstart.md Part 3 step 1; Acceptance Scenario 4, FR-002, FR-003) (depends on T008).
- [ ] T014 [US1] Push a commit that fails a gate (lint failure or a High-severity CodeQL finding); confirm the `version` job does not run to completion and `package.json`/the tag list are unchanged (quickstart.md Part 3 step 2; Acceptance Scenario 5, FR-003) (depends on T008).
- [ ] T015 [US1] Push only `docs:`/`chore:`/`style:` commits to `main`; confirm all three gates pass but the `version` job produces no new commit and no new tag (quickstart.md Part 4; FR-011) (depends on T008).
- [ ] T016 [US1] Inspect the bump commit produced by T010 (or any prior bump task): confirm its message matches `chore(release): <version> [version bump]`, that the three required gates ran normally against it, and that both the `version` job and `deploy.yml`'s `deploy-production` job show as skipped for that specific commit (quickstart.md Part 6; FR-009, FR-010, SC-004, SC-006) (depends on T006, T010).

**Checkpoint**: MINOR/PATCH/MAJOR bumps, gate-blocking, no-op behavior, and loop/redeploy prevention are all verified live.

---

## Phase 5: User Story 3 - Versioning phase never runs on pull requests or other branches (Priority: P2)

**Goal**: The versioning phase is reserved exclusively for pushes to `main` that have already passed the three gates — never PRs, never other branches.

**Independent Test**: Open a PR with `feat:`/`fix:` commits targeting `main`; confirm no version change or tag is produced regardless of the PR's own check results, until (and unless) pushed to `main` directly.

### Implementation for User Story 3

- [ ] T017 [US3] Open a pull request with `feat:` and `fix:` commits targeting `main`; once its checks complete, confirm the `version` job does not run and `package.json` is not modified on the PR's branch (quickstart.md Part 5 step 1; Acceptance Scenario 1, FR-001).
- [ ] T018 [US3] Push a commit to a branch other than `main`; confirm no `version` job run occurs for it and no tag is created (quickstart.md Part 5 step 2; Acceptance Scenario 2, FR-001, SC-005).

**Checkpoint**: All three user stories independently verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Reconcile documentation with what was actually built, and cover the remaining edge cases that span multiple stories.

- [X] T019 [P] Update `specs/006-semver-auto-release/contracts/version-bump-commit.md` if the actual marker string, job names, or commit message template changed from planned during T003–T016 (contract change policy). **Done — no change needed**: marker (`[version bump]`), commit message template, author identity (`github-actions[bot]`), and job names (`version`, `deploy-production`) all match the contract exactly.
- [ ] T020 [P] Confirm the `npm ci` step in `checks`/`e2e` (and the `version` job itself) succeeds on the bump commit produced by T010 — i.e. `package-lock.json`'s version field was actually updated in sync with `package.json` by `@semantic-release/npm`, not just the top-level `package.json` value (data-model.md "Project Version"; FR-007) (depends on T010).
- [ ] T021 Push two rapid successive qualifying commits to `main` (second commit pushed before the first's gates finish); confirm the `version` job applies a single, cumulative bump reflecting both commits' combined effect — no duplicate bump and no dropped commit (spec.md Edge Cases; FR-013) (depends on T008).
- [ ] T022 [P] Confirm no manual/human approval step blocks the `version` job — verify it runs to completion unattended and that no GitHub Environment with required-reviewers protection is attached to it (FR-012, `gh api repos/fortizfe/retrorocket/environments`) (depends on T010).
- [ ] T023 Manually edit `retro-rocket/package.json`'s `version` field on `main` to a value that conflicts with the latest `v*.*.*` tag (without creating a matching tag), then push a qualifying commit; confirm the `version` job computes the next version strictly from the latest tag, ignoring the manually edited `package.json` value (spec.md Edge Cases; quickstart.md Part 7) (depends on T008).
- [ ] T024 Run the full `specs/006-semver-auto-release/quickstart.md` validation guide end-to-end as a final combined acceptance pass covering all three user stories (depends on T009, T016, T017, T018, T021, T023).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (the `version` job's `semantic-release` step needs T001/T002's config) — blocks all three user stories
- **User Story 2 (Phase 3)**: Depends only on Phase 2 — must complete before Phase 4's live scenarios can run (research.md §2's one-time bootstrap)
- **User Story 1 (Phase 4)**: Depends on Phase 2 and Phase 3 (needs `v0.1.0` to exist so "commits since the last version" has a real baseline) — this is why it's sequenced after US2 above despite both being P1
- **User Story 3 (Phase 5)**: Depends only on Phase 2 — does not need the `v0.1.0` baseline (it verifies *absence* of a version change), so it may run in parallel with Phase 3/4
- **Polish (Phase 6)**: T019/T022 depend on Phase 2 having landed; T020/T021 depend on at least one live bump (T010) having occurred; T023 depends on the `v0.1.0` baseline (T008) only; T024 depends on all prior phases

### Within Each User Story

- US2: T007 → T008 → T009
- US1: T010 → T011 → T012; T013 and T014 depend only on T008 (can run before or interleaved with T011/T012); T015 depends only on T008; T016 depends on T006 and T010
- US3: T017 and T018 are independent of each other and of US1/US2 (only need Phase 2)

### Parallel Opportunities

- T001 and T002 (Setup) — T002 doesn't need T001's output, but both must land before T005
- T017 and T018 (US3) can run in parallel with each other and with Phase 3/4, since US3 only needs Phase 2
- T019 and T022 (Polish, different concerns) can run in parallel; T023 can also run in parallel with T019/T020/T022 (read-only inspection tasks) but not with T021 — both T021 and T023 push live commits to the shared `main` branch, so treat them as sequential to avoid racing each other
- T003–T006 (Foundational) touch two different files (`ci.yml`, `deploy.yml`) but T003→T004→T005 are sequential edits to the same job in `ci.yml`; T006 (a different file) can be done in parallel with T003–T005

---

## Parallel Example: Phase 1

```bash
# Setup, in parallel:
Task: "Add semantic-release + plugins as devDependencies in retro-rocket/package.json"
Task: "Create retro-rocket/.releaserc.json with commit-analyzer + npm + git plugins"
```

---

## Implementation Strategy

### MVP First (User Story 2 + User Story 1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (job skeleton, CodeQL wait, semantic-release step, both skip conditions — CRITICAL, blocks all stories)
3. Complete Phase 3: User Story 2 — the one-time `0.1.0` bootstrap
4. Complete Phase 4: User Story 1 — automated bumps now happen on every qualifying push
5. **STOP and VALIDATE**: Run quickstart.md Parts 1–4 and 6
6. Proceed to Phase 5 when ready

### Incremental Delivery

1. Setup + Foundational → shared groundwork ready
2. User Story 2 → validate independently → `0.1.0` baseline live
3. User Story 1 → validate independently → automated MINOR/PATCH/MAJOR bumps live (MVP complete)
4. User Story 3 → validate independently → confirm PRs/other branches are correctly excluded
5. Phase 6 → final combined `quickstart.md` re-run as sign-off

### Parallel Team Strategy

With two people available: one completes Phase 1/2 together, then one person runs the Phase 3 bootstrap (US2) while the other prepares US3's verification (T017/T018, which don't need the bootstrap); once US2 lands, either person proceeds with US1's live verification (Phase 4).

---

## Notes

- [P] tasks touch different files/systems and have no dependency between them
- [Story] label maps each task to US1, US2, or US3 for traceability
- T007/T008 (the `0.1.0` bootstrap) is the one point of real rollback risk — if T008's tag is pushed against the wrong commit, every subsequent automated computation is based on the wrong baseline; double-check the SHA before tagging
- T003's wait step relies on the check *name* `CodeQL` (the severity-aware, GitHub Advanced Security app check), matching the same distinction called out in feature 005's tasks.md
- The `[version bump]` marker (T003, T006) is deliberately not one of GitHub's built-in skip-ci keywords — see research.md §4 for why using the built-in ones would break FR-009
- Commit `ci.yml`/`deploy.yml` changes (T003–T006) as a normal PR once ready to test against; T010 is what exercises the very first live bump
