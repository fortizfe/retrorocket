---

description: "Task list template for feature implementation"
---

# Tasks: Gated Vercel Deployments

**Input**: Design documents from `/specs/005-gated-vercel-deploys/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/required-checks-for-deployment.md, quickstart.md

**Tests**: This feature is CI/CD pipeline and Vercel project configuration work, not application code — there is no application logic to unit-test (plan.md Constitution Check: TDD is N/A). Verification instead happens via the concrete validation steps from `quickstart.md`, included below as tasks within each user story rather than as a separate test phase.

**Organization**: Tasks are grouped by user story (US1 = preview gating, US2 = production gating, US3 = blocked-deployment visibility) to enable independent execution and verification of each.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files/systems, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths / command targets in descriptions

## Path Conventions

This is the existing single-project `retro-rocket/` web app plus repository-level `.github/workflows/` config — no new `src/`/`tests/` directories are introduced (see plan.md Project Structure). The only edited application-tree file is `retro-rocket/vercel.json`.

---

## Phase 1: Setup (Shared Preparation)

**Purpose**: Provision the Vercel credentials the new deploy workflow needs; nothing in `.github/workflows/` can be exercised end-to-end without these.

- [ ] T001 Run `vercel link` inside `retro-rocket/` against the existing Vercel project to obtain `orgId`/`projectId` from the generated `.vercel/project.json` (quickstart.md Prerequisites). **Blocked**: requires an interactive Vercel account login (browser OAuth) that isn't available in this environment — needs to be run by someone with access to the `retro-rocket` Vercel project.
- [ ] T002 [P] Generate a Vercel access token with deploy permission on the `retro-rocket` project and store it as the `VERCEL_TOKEN` GitHub Actions secret (`gh secret set VERCEL_TOKEN`). **Blocked**: token generation requires the Vercel dashboard/account — same constraint as T001.
- [ ] T003 Store the `orgId`/`projectId` values from T001 as the `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` GitHub Actions secrets (`gh secret set VERCEL_ORG_ID`, `gh secret set VERCEL_PROJECT_ID`) (depends on T001). **Blocked**: depends on T001's output.

**Checkpoint**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` all exist as GitHub Actions secrets.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Remove the ungated deployment path and lay down the shared workflow skeleton both user stories add their job to.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — leaving Vercel's native auto-deploy enabled would let an ungated deployment happen in parallel with the new gate, defeating US1 and US2 alike.

- [X] T004 Add `"git": { "deploymentEnabled": false }` to `retro-rocket/vercel.json` to disable Vercel's native automatic Git-triggered deployments for every branch (research.md §2, plan.md Constraints). **Done**: added; validated as syntactically valid JSON.
- [X] T005 Create `.github/workflows/deploy.yml` with `on: pull_request` (targeting `main`) and `on: push` (branches: `[main]`) triggers and a `working-directory: retro-rocket` default, with no jobs yet — the skeleton both `deploy-preview` (US1) and `deploy-production` (US2) jobs are added to (research.md §7). **Done**: created directly with both jobs (T006–T008, T012–T013) already in place rather than as an empty intermediate skeleton, since all the job content was ready at once; validated with `actionlint` (no findings).

**Checkpoint**: Native auto-deploy disabled; `deploy.yml` skeleton exists — user story implementation can now begin.

---

## Phase 3: User Story 1 - Preview deployment only after gates pass on a pull request (Priority: P1) 🎯 MVP

**Goal**: A pull request's preview deployment starts only after `Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, and `CodeQL` all report success on its head commit, and never reaches production.

**Independent Test**: Open a PR with passing gates and confirm a preview deployment appears with a discoverable link, reachable only via a preview URL; push a commit that fails a gate and confirm no preview deployment is created.

### Implementation for User Story 1

- [X] T006 [US1] Add a `deploy-preview` job to `.github/workflows/deploy.yml`, gated `if: github.event_name == 'pull_request'`, with one wait step per required check (`Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, `CodeQL`) against `github.event.pull_request.head.sha` using a proven wait-for-check Action (e.g. `lewagon/wait-on-check-action`), each with a 15-minute timeout (matching the E2E job's typical runtime) so a failing or never-completing check fails the job clearly instead of hanging (research.md §3, contracts/required-checks-for-deployment.md, FR-001, FR-005, FR-006) (depends on T005). **Done**: pinned to `lewagon/wait-on-check-action@v1.8.1` (latest release, confirmed 2026-07-02) with `timeout-minutes: 15` per step (GitHub Actions' native step timeout — the action itself has no timeout input, so the native mechanism is used instead).
- [X] T007 [US1] In the same `deploy-preview` job, add steps to install the Vercel CLI and run `vercel pull --yes --environment=preview --token=$VERCEL_TOKEN`, `vercel build`, `vercel deploy --prebuilt`, using the `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` secrets from Phase 1 (research.md §4, FR-001, FR-003) (depends on T006). **Done, amended three times after live runs**: (1) `vercel build` alone did not install project dependencies (`vite: not found`); added an explicit `npm ci` step. (2) `vite` still wasn't on PATH for `vercel build`'s direct `sh -c` invocation — fixed by appending `node_modules/.bin` to `$GITHUB_PATH`. (3) Then failed with "Could not resolve entry module index.html" — the Vercel project's Root Directory (`retro-rocket`) was being applied twice because `vercel pull`/`build`/`deploy` were already running from inside `retro-rocket/`; removed the job-level `working-directory: retro-rocket` default so those three commands run from the actual repo root and apply the offset once, while only the `npm ci` step keeps an explicit `working-directory: retro-rocket`. See research.md §4 correction notes.
- [X] T008 [US1] Verify the deployment URL `vercel deploy` prints is discoverable on the pull request via Vercel's native PR comment/check; if it does not appear once native auto-deploy is disabled, add a `gh pr comment` fallback step in `deploy-preview` posting the URL (research.md §6, FR-010, SC-006) (depends on T007). **Done differently than planned**: live verification of Vercel's native comment behavior isn't possible without pushing a real PR and Vercel credentials (neither available in this environment), so rather than leaving FR-010 to chance, the deterministic `marocchino/sticky-pull-request-comment@v3.0.5` step was implemented unconditionally (idempotent via its `header` input, so re-runs update rather than spam). If Vercel's own bot also comments once secrets are live, T009 should note whether the native comment is redundant and can be removed later.
- [ ] T009 [US1] Open a pull request with passing tests and a clean CodeQL scan; confirm `deploy-preview` waits for all three checks, then deploys, and that the preview link is discoverable on the PR (quickstart.md Part 1) (depends on T008). **Blocked**: requires T001–T003's secrets to exist and a real PR run against `main` — not performed in this session (see completion report).
- [ ] T010 [US1] On the same PR, push a commit that fails lint (or introduces a High-severity CodeQL finding); confirm `deploy-preview` does not run to completion and no preview deployment is created for that commit (quickstart.md Part 2; FR-001, FR-005) (depends on T009). **Blocked**: depends on T009.
- [ ] T011 [US1] Confirm the successful preview deployment from T009 is reachable only via its preview URL and has no effect on the production environment (`vercel list retro-rocket --environment=production`) (quickstart.md Part 1 step 5; FR-003, SC-003) (depends on T009). **Blocked**: depends on T009.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Production deployment only after gates pass on push to main (Priority: P1)

**Goal**: A push to `main` deploys to production only after the same three checks report success on that commit, and never creates a preview.

**Independent Test**: Push/merge a clean commit to `main` and confirm a production deployment occurs with no preview created; push a commit that fails a gate and confirm no production deployment occurs.

### Implementation for User Story 2

- [X] T012 [US2] Add a `deploy-production` job to `.github/workflows/deploy.yml`, gated `if: github.event_name == 'push'`, with one wait step per required check (`Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, `CodeQL`) against `github.sha`, using the same wait-for-check Action and 15-minute timeouts as T006 (research.md §3, contracts/required-checks-for-deployment.md, FR-002, FR-005, FR-006) (depends on T005; independent of T006–T011). **Done**.
- [X] T013 [US2] In the same `deploy-production` job, add steps to install the Vercel CLI and run `vercel pull --yes --environment=production --token=$VERCEL_TOKEN`, `vercel build --prod`, `vercel deploy --prebuilt --prod` (research.md §4, FR-002, FR-004) (depends on T012). **Done, amended three times**: same `npm ci` + `$GITHUB_PATH` + repo-root working-directory fixes as T007 applied here for consistency (this job hasn't had a live run yet, since it only triggers on push to `main`).
- [ ] T014 [US2] Merge a clean pull request (or push directly for testing) to `main`; confirm `deploy-production` waits for all three checks, then deploys to production (quickstart.md Part 3 step 1) (depends on T013). **Blocked**: requires T001–T003's secrets and a real push to `main` — not performed in this session.
- [ ] T015 [US2] Confirm the production deployment from T014 has no corresponding preview deployment created for that push (`vercel list retro-rocket --environment=preview`) (quickstart.md Part 3 step 2; FR-004, SC-003) (depends on T014). **Blocked**: depends on T014.
- [ ] T016 [US2] In a disposable test scenario, push a commit to `main` that fails lint (or introduces a High-severity CodeQL finding, mirroring T010); confirm `deploy-production` does not run to completion and no production deployment occurs for that commit (quickstart.md Part 3 step 3; FR-002, FR-005, FR-007) (depends on T014). **Blocked**: depends on T014.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - Clear visibility when a deployment is blocked (Priority: P2)

**Goal**: A developer whose PR or push fails a gate can tell no deployment happened and which gate blocked it, using only the existing checks view — no separate "deployment blocked" indicator is required.

**Independent Test**: Trigger a failing check on a PR and on a push to `main`; confirm the failing check stays visible and no deployment check falsely reports success, with no extra indicator needed to understand what happened.

### Implementation for User Story 3

- [ ] T017 [US3] Confirm the 15-minute timeouts added in T006/T012 make `deploy-preview`/`deploy-production` fail clearly (a visible red X on the job) rather than hang indefinitely when a required check fails or never completes, so the failing check plus the job's own failure are jointly sufficient signal without a separate "deployment blocked" indicator (FR-011) (depends on T010, T016). **Blocked**: depends on T010/T016.
- [ ] T018 [US3] On the failing-check scenarios exercised in T010 (PR) and T016 (push to `main`), confirm the failing check itself remains visible (`gh pr checks`, `gh api repos/fortizfe/retrorocket/commits/{sha}/check-runs`) and that no `deploy-preview`/`deploy-production` run reports success for that commit (quickstart.md Part 2 step 3; FR-009, SC-005) (depends on T010, T016). **Blocked**: depends on T010/T016.

**Checkpoint**: All three user stories independently functional and verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Reconcile documentation with what was actually built and run a final combined acceptance pass.

- [X] T019 [P] Update `specs/005-gated-vercel-deploys/contracts/required-checks-for-deployment.md` if any job/check names or workflow structure changed from planned during T006–T016 (contract change policy). **Done — no change needed**: check names in `deploy.yml` match the contract exactly (`Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, `CodeQL`).
- [ ] T020 [P] Confirm, via a trivial push/PR, that Vercel's native Git integration no longer creates any deployment on its own — no deployment exists for a commit until the corresponding `deploy-preview`/`deploy-production` job actually runs (quickstart.md Part 4; SC-001–SC-004). **Blocked**: requires a live push/PR against the deployed project.
- [ ] T021 Run the full `specs/005-gated-vercel-deploys/quickstart.md` validation guide end-to-end as a final combined acceptance pass covering all three user stories. **Blocked**: depends on T001–T003 and all live-verification tasks above.
- [ ] T022 [P] Confirm no manual/human approval step blocks `deploy-preview` or `deploy-production` — verify the jobs run to completion unattended, and confirm the `Preview`/`Production` GitHub Environments referenced (if any) carry no required-reviewers protection rule (`gh api repos/fortizfe/retrorocket/environments/Preview`, `.../Production`) (FR-008). **Partially done**: `gh api` confirms both existing Environments currently have `"protection_rules": []` (no required reviewers) as of 2026-07-21; `deploy.yml`'s jobs don't declare an `environment:` key at all, so they can't be gated by either Environment's protection rules regardless. Full "runs to completion unattended" confirmation still needs a live run — blocked on T001–T003.
- [ ] T023 [US1] Push two rapid successive commits to an open PR (second before the first's checks finish); confirm `deploy-preview` only ever acts on the latest commit's SHA and no deployment is created against the superseded commit (spec.md Edge Cases; FR-006) (depends on T009). **Blocked**: depends on T009.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (needs the secrets to eventually exercise the workflow) — blocks all three user stories
- **User Story 1 (Phase 3)** and **User Story 2 (Phase 4)**: Both depend only on Phase 2; they add different jobs to the same `deploy.yml` file but are otherwise independent (different trigger conditions, different target environments) — safe to sequence in either order
- **User Story 3 (Phase 5)**: Depends on the failing-check scenarios already exercised in T010 (US1) and T016 (US2) — cannot be verified until both exist
- **Polish (Phase 6)**: T019–T021, T022 depend on all three user stories being complete; T023 depends only on T009 (US1) and may run as soon as US1 is validated, independent of US2/US3
- **T004 rollout note**: T004 (disabling native auto-deploy) and T006–T009 (the first working `deploy-preview` path) SHOULD be authored and merged to `main` together — merging T004 alone first would leave a window with no deployment path at all.

### Within Each User Story

- US1: T006 → T007 → T008 → T009 → T010 → T011 (T010/T011 both depend on T009's successful run existing first)
- US2: T012 → T013 → T014 → T015/T016 (T015/T016 both depend on T014)
- US3: T017 and T018 (both depend on T010 and T016 having been executed)

### Parallel Opportunities

- T001 and T002 (Setup) can run in parallel — T002 doesn't need T001's output
- T019, T020, and T022 (Polish, different concerns) can run in parallel
- T023 doesn't need US2/US3 to be done — it only depends on T009, so it can run in parallel with Phase 4/5 work
- T006–T011 (US1) and T012–T016 (US2) touch the same `deploy.yml` file, so treat as sequential within the file even though the underlying stories are logically independent — land one story's job addition before starting the other's to avoid merge conflicts

---

## Parallel Example: Phase 1

```bash
# Setup, in parallel:
Task: "Run vercel link inside retro-rocket/ to obtain orgId/projectId"
Task: "Generate a Vercel access token and store it as the VERCEL_TOKEN secret"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (disable native auto-deploy, create workflow skeleton — CRITICAL, blocks all stories)
3. Complete Phase 3: User Story 1 — preview deployments are now gated and linked on PRs
4. **STOP and VALIDATE**: Run quickstart.md Part 1–2 and confirm both the positive and negative preview scenarios
5. Proceed to Phase 4 when ready

### Incremental Delivery

1. Setup + Foundational → shared groundwork ready (secrets provisioned, native auto-deploy off)
2. User Story 1 → validate independently → gated, linked preview deployments live (MVP)
3. User Story 2 → validate independently → gated production deployments live
4. User Story 3 → validate independently → confirm blocked deployments are self-explanatory with no extra indicator needed
5. Phase 6 → final combined `quickstart.md` re-run as sign-off

### Parallel Team Strategy

With two people available: one completes Phase 1/2 together, then one person adds `deploy-preview` (US1, T006–T011) while the other waits to add `deploy-production` (US2, T012–T016) once the US1 edits have landed in `deploy.yml` (same-file, sequential); US3's verification (Phase 5) and Phase 6 are done jointly once both stories land.

---

## Notes

- [P] tasks touch different files/systems and have no dependency between them
- [Story] label maps each task to US1, US2, or US3 for traceability
- T004 is the one point with real rollback risk if `deploy.yml` isn't working yet — see the "T004 rollout note" under Phase Dependencies above
- T006/T012 rely on waiting for the check *name* `CodeQL` (the severity-aware, GitHub Advanced Security app check), not the `codeql-action` workflow job's own exit status — see research.md §3 for why this distinction matters
- Commit `deploy.yml` changes (T005, T006, T012) as normal PRs once enough of the workflow exists to test itself against; T009/T014 are what exercise the very first such PRs
