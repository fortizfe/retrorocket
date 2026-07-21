---

description: "Task list template for feature implementation"
---

# Tasks: Remove Shell Scripts & Trigger CI on Main Push

**Input**: Design documents from `/specs/003-scripts-cleanup-ci-trigger/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, quickstart.md

**Tests**: Not applicable. This feature deletes unused scripts and changes a CI trigger/config value; it introduces no production logic, so the constitution's TDD/coverage NON-NEGOTIABLE principles are N/A here (see plan.md's Constitution Check). Verification instead uses the manual validation steps in `quickstart.md`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

Single existing project: `retro-rocket/` (React/Vite SPA) plus repo-root `.github/workflows/ci.yml`. No new directories are created by this feature.

## Phase 1: Setup

**No setup tasks required.** This feature only modifies files that already exist (shell scripts to delete, `package.json`, `.github/workflows/ci.yml`); there is no new project scaffolding.

---

## Phase 2: Foundational (Blocking Prerequisites)

**No foundational tasks required.** User Story 1 (script removal) and User Story 2 (CI trigger change) touch completely disjoint files and share no common prerequisite — both can start immediately and be worked in parallel.

---

## Phase 3: User Story 1 - Remove unused shell scripts (Priority: P1) 🎯 MVP

**Goal**: Remove every standalone shell script under `retro-rocket/` so the codebase no longer carries manual scripts that duplicate or contradict what CI already does automatically.

**Independent Test**: Confirm no `.sh` files remain in `retro-rocket/` (outside third-party dependency folders) and that all documented project workflows (install, start, dev, lint, type-check, test, build) still complete successfully using only the project's package scripts.

### Implementation for User Story 1

- [X] T001 [P] [US1] Delete obsolete shell scripts from `retro-rocket/`: `deploy.sh`, `commands.sh`, `verify-firebase.sh`, `check-status.sh`, `pre-deploy-check.sh`, `migrate-user-providers.sh`, `test.sh`, `setup-firebase-auth.sh`, `start.sh`, `track-coverage.sh`
- [X] T002 [US1] Update the `"start"` script in `retro-rocket/package.json` from `"./start.sh"` to `"npm run dev"` so local startup no longer depends on the deleted script (depends on T001)
- [X] T003 [US1] Search `retro-rocket/` (excluding `node_modules/`) for any remaining documentation or config referencing a removed `.sh` file and remove/update those references (depends on T001, T002)
- [X] T004 [US1] Validate User Story 1 per `specs/003-scripts-cleanup-ci-trigger/quickstart.md` steps 1-3: confirm `find retro-rocket -maxdepth 1 -name "*.sh"` returns nothing, and that `npm install`, `npm start`, `npm run dev`, `npm run lint`, `npm run type-check`, `npm run test:coverage`, and `npm run build` all succeed from `retro-rocket/` (depends on T001, T002, T003). All commands succeeded; `test:coverage` completes with a handful of pre-existing, order-dependent flaky test failures in files unrelated to this feature (confirmed unrelated: this feature touches no `src/` or test files, and the failures don't reproduce when run in isolation).

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently — the repository has zero shell scripts and every local workflow still works.

---

## Phase 4: User Story 2 - Run the pipeline on push to main instead of on pull requests (Priority: P2)

**Goal**: Make the CI pipeline trigger on pushes to `main` instead of on pull request events, without changing what it checks.

**Independent Test**: Open/update a pull request targeting `main` and confirm the pipeline does NOT run; then push a commit to `main` (or merge a PR into it) and confirm the pipeline DOES run and executes its full set of checks.

### Implementation for User Story 2

- [X] T005 [P] [US2] Update `.github/workflows/ci.yml`: replace the `on.pull_request.branches: [main]` trigger with `on.push.branches: [main]`, leaving the `checks` and `e2e` jobs and all of their steps unchanged
- [ ] T006 [US2] Validate User Story 2 per `specs/003-scripts-cleanup-ci-trigger/quickstart.md` steps 4-6: confirm `ci.yml`'s `on:` block only specifies `push: branches: [main]`; open/update a pull request against `main` and confirm no workflow run starts; then push to `main` and confirm both the `checks` and `e2e` jobs run to completion (depends on T005)

**Checkpoint**: At this point, both User Stories 1 and 2 work independently — no shell scripts remain, and CI runs only on pushes to `main`.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final, whole-feature verification and governance documentation

- [ ] T007 [P] Run the full `specs/003-scripts-cleanup-ci-trigger/quickstart.md` validation end-to-end and confirm success criteria SC-001 through SC-004 all hold
- [ ] T008 Document the constitution exception (CI no longer gating pull requests before merge) in the pull request description, referencing `specs/003-scripts-cleanup-ci-trigger/plan.md`'s Complexity Tracking section, per the constitution's Governance requirement that exceptions be explicitly justified

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup / Foundational**: None — skipped, nothing to do before user stories can start
- **User Story 1 (Phase 3)**: No dependency on User Story 2 — can start immediately
- **User Story 2 (Phase 4)**: No dependency on User Story 1 — can start immediately
- **Polish (Phase 5)**: Depends on both User Story 1 (T004) and User Story 2 (T006) being complete

### Within Each User Story

- User Story 1: T001 → T002 → T003 → T004 (sequential; each edits/validates state left by the previous task)
- User Story 2: T005 → T006 (sequential)

### Parallel Opportunities

- T001 and T005 can start in parallel (different files: shell scripts vs. `.github/workflows/ci.yml`)
- User Story 1 (T001-T004) and User Story 2 (T005-T006) can be worked end-to-end in parallel by different people, since they never touch the same file
- T007 (full quickstart validation) can run in parallel with drafting T008 (PR description text)

---

## Parallel Example: User Stories 1 & 2

```bash
# Launch both user stories' first task together — disjoint files, no shared dependency:
Task: "Delete obsolete shell scripts from retro-rocket/ (T001)"
Task: "Update CI workflow trigger in .github/workflows/ci.yml (T005)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (T001-T004)
2. **STOP and VALIDATE**: Confirm no `.sh` files remain and all local npm workflows still work
3. This alone delivers the requested cleanup even before the CI trigger changes

### Incremental Delivery

1. User Story 1 (script removal) → validate → deliver
2. User Story 2 (CI trigger change) → validate → deliver
3. Polish: full quickstart run + document the constitution exception in the PR

### Parallel Team Strategy

With two people: one handles User Story 1 (T001-T004), the other handles User Story 2 (T005-T006) simultaneously; both converge on Phase 5 once T004 and T006 are done.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No tests are generated for this feature (see Tests note above) — verification is the manual `quickstart.md` procedure
- Commit after each task or logical group
- Stop at either checkpoint to validate a story independently before continuing
