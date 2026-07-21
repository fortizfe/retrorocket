---

description: "Task list for feature implementation"
---

# Tasks: Unified CI Pipeline Workflow

**Input**: Design documents from `/specs/007-unified-ci-workflow/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/workflow-jobs.md, quickstart.md

**Tests**: This feature changes CI/CD configuration only (no application/business logic), so the constitution's TDD requirement (Principle I) does not apply — see plan.md's Constitution Check. Verification instead happens via the manual `quickstart.md` scenarios, referenced as checkpoints below.

**Organization**: Tasks are grouped by user story. All tasks edit the same file (`.github/workflows/ci.yml`) or delete the two files it replaces, so most tasks are sequential (same-file edits cannot be parallelized); only cross-file deletions are marked `[P]`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single repository, CI-configuration-only change:
- `.github/workflows/ci.yml` — the consolidated workflow (target of most edits)
- `.github/workflows/codeql.yml`, `.github/workflows/deploy.yml` — deleted once migrated

---

## Phase 1: Setup

**Purpose**: Confirm the exact names/permissions to preserve before editing, so branch protection keeps matching checks (per research.md §3 and contracts/workflow-jobs.md)

- [X] T001 Review job `name:` values, `permissions:` blocks, and step contents in `.github/workflows/ci.yml`, `.github/workflows/codeql.yml`, and `.github/workflows/deploy.yml` against `specs/007-unified-ci-workflow/contracts/workflow-jobs.md`, confirming the exact strings to carry over verbatim (no file edits in this task)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Bring the quality-check stage's missing job into `ci.yml` so every later stage has something correct to depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Add the `analyze` job to `.github/workflows/ci.yml`, migrated verbatim from `.github/workflows/codeql.yml` (same `name: CodeQL Analysis`, `permissions: {contents: read, security-events: write}`, `actions/checkout@v4` + `github/codeql-action/init@v3` + `github/codeql-action/analyze@v3` steps with `category: "/language:javascript-typescript"`), with no `needs:` (parallel entry-stage job alongside the existing `checks` and `e2e` jobs)

**Checkpoint**: `ci.yml` now runs `analyze`, `checks`, and `e2e` in parallel on both triggers — the dependency that every later stage gates on.

---

## Phase 3: User Story 1 - Single pipeline definition (Priority: P1) 🎯 MVP

**Goal**: The entire CI/CD process is defined in exactly one workflow file; the other two are gone.

**Independent Test**: Inspect `.github/workflows/`; confirm exactly one file exists (`ci.yml`) containing `analyze`, `checks`, `e2e`, `deploy-preview`, `deploy-production`, and `version` jobs (quickstart.md Scenario 5).

### Implementation for User Story 1

- [X] T003 [US1] Add the `deploy-preview` job to `.github/workflows/ci.yml`, migrated from `.github/workflows/deploy.yml`'s `deploy-preview` job (same `name:`, `permissions:`, `env:` block, and steps: checkout, wait-steps removed, setup-node, install deps, install Vercel CLI, `vercel pull`/`vercel build`/`vercel deploy`, sticky PR comment) — leave without `needs:`/`if:` for now (added in US2)
- [X] T004 [US1] Add the `deploy-production` job to `.github/workflows/ci.yml`, migrated from `.github/workflows/deploy.yml`'s `deploy-production` job (same `name:`, `permissions:`, `env:` block, and steps: checkout, wait-steps removed, setup-node, install deps, install Vercel CLI, `vercel pull --environment=production`/`vercel build --prod`/`vercel deploy --prod`) — leave without `needs:` for now (added in US2), but keep its existing `if: github.event_name == 'push' && !contains(github.event.head_commit.message, '[version bump]')` condition
- [X] T005 [P] [US1] Delete `.github/workflows/codeql.yml` now that its `analyze` job lives in `ci.yml` (T002)
- [X] T006 [P] [US1] Delete `.github/workflows/deploy.yml` now that its `deploy-preview`/`deploy-production` jobs live in `ci.yml` (T003, T004)

**Checkpoint**: Exactly one workflow file (`ci.yml`) exists, containing all six jobs. Run quickstart.md Scenario 5 to confirm.

---

## Phase 4: User Story 2 - Deployment gated on passing quality checks (Priority: P1)

**Goal**: `deploy-preview`/`deploy-production` run only after `analyze`, `checks`, and `e2e` all succeed, split correctly by trigger event.

**Independent Test**: quickstart.md Scenarios 1 & 2 — a passing PR gets a preview deploy only after all checks are green; a failing check blocks any deployment attempt entirely.

### Implementation for User Story 2

- [X] T007 [US2] Add `needs: [analyze, checks, e2e]` and `if: github.event_name == 'pull_request'` to the `deploy-preview` job in `.github/workflows/ci.yml`
- [X] T008 [US2] Add `needs: [analyze, checks, e2e]` to the `deploy-production` job in `.github/workflows/ci.yml`, keeping its existing `if: github.event_name == 'push' && !contains(github.event.head_commit.message, '[version bump]')` condition unchanged

**Checkpoint**: Deploy stage is correctly gated on the quality-check stage. Run quickstart.md Scenarios 1 & 2 to confirm.

---

## Phase 5: User Story 3 - Versioning gated on successful deployment (Priority: P2)

**Goal**: The `version` job runs only after `deploy-production` succeeds.

**Independent Test**: quickstart.md Scenarios 3 & 4 — versioning runs after a successful production deploy on `main`, is skipped if that deploy fails, and does not loop on its own version-bump commit.

### Implementation for User Story 3

- [X] T009 [US3] In `.github/workflows/ci.yml`, replace the `version` job's `needs: [checks, e2e]` and its "Wait for CodeQL" step with `needs: [deploy-production]`, keeping its existing `if: github.event_name == 'push' && github.ref == 'refs/heads/main' && !contains(github.event.head_commit.message, '[version bump]')` condition unchanged

**Checkpoint**: Full pipeline ordering (quality checks → deploy → versioning) is enforced end-to-end. Run quickstart.md Scenarios 3 & 4 to confirm.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final end-to-end verification and operational follow-up

- [ ] T010 Run all five quickstart.md scenarios end-to-end against a real pull request and a merge to `main` to confirm the consolidated pipeline behaves as specified
- [ ] T011 Confirm branch protection on `main` still lists `Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, and the `CodeQL` code-scanning check as required status checks and that they report against the new `ci.yml`-produced jobs with no reconfiguration needed (per contracts/workflow-jobs.md); update branch protection manually only if a name mismatch is found

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on User Story 1 (deploy jobs must exist in `ci.yml` before they can be gated)
- **User Story 3 (Phase 5)**: Depends on User Story 2 (the `version` job's new `needs:` target, `deploy-production`, must already be gated correctly)
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

Unlike a typical feature where stories are independent slices, this feature's stories are **layered** because all three edit one job graph in the same file:

- **User Story 1 (P1)**: File consolidation — must land first
- **User Story 2 (P1)**: Deploy gating — builds directly on the jobs US1 added
- **User Story 3 (P2)**: Version gating — builds directly on the gate US2 wired

### Within Each Phase

- Tasks within a phase that touch the same file (`ci.yml`) are sequential
- T005/T006 (file deletions) are marked `[P]` — different files from each other and from the `ci.yml` edits they follow

### Parallel Opportunities

- T005 and T006 can run in parallel (different files)
- No other tasks in this feature are parallelizable — nearly every task edits `.github/workflows/ci.yml`

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 — **STOP and VALIDATE** with quickstart.md Scenario 5 (single file, all jobs present)
4. This alone does not yet gate deploy/version — do not merge until US2 and US3 are also complete, since an ungated `deploy-preview`/`deploy-production` would deploy unconditionally

### Incremental Delivery

1. Setup + Foundational → quality-check stage complete in `ci.yml`
2. Add User Story 1 → file consolidation verified (Scenario 5)
3. Add User Story 2 → deploy gating verified (Scenarios 1 & 2)
4. Add User Story 3 → version gating verified (Scenarios 3 & 4)
5. Polish → full end-to-end run (all scenarios) + branch protection confirmation

Given the tight coupling (one file, one job graph), this feature is best implemented and merged as a single PR covering all phases rather than shipped story-by-story to production.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This feature has no automated test suite of its own (it changes CI configuration, not application code); quickstart.md scenarios are the verification mechanism
- Commit after each task or logical group
- Preserve exact job `name:` strings throughout — branch protection matches on them (contracts/workflow-jobs.md)
