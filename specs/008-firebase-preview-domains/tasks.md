---

description: "Task list template for feature implementation"
---

# Tasks: Automated Firebase Preview Domain Lifecycle

**Input**: Design documents from `/specs/008-firebase-preview-domains/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Per the project constitution (TDD, NON-NEGOTIABLE), every piece of this feature's own logic gets a preceding test: the pure list-diff logic (`computeNextDomains`, Phase 2) and, per the `/speckit-analyze` finding C1, the two CLIs' own argument-validation/HTTP-status-branching logic as well (`sync-domain.test.ts` in Phase 3, `cleanup-orphans.test.ts` in Phase 6), with `fetch`/`@actions/cache` mocked. Only the actual network calls to Google's/GitHub's live services are left to manual validation via `quickstart.md`, per `plan.md`'s Testing section — there is no practical way to unit-test a third party's live API or a GitHub Actions workflow trigger.

**Organization**: Tasks are grouped by user story (from `spec.md`) to enable independent implementation and testing of each story. FR-008 (on-demand orphan cleanup) is not one of the spec's three prioritized user stories, so it gets its own un-labeled phase between User Story 3 and Polish, matching how Setup/Foundational/Polish phases are also un-labeled. FR-009 has no single dedicated task — it is satisfied compositely by T007–T013 (User Stories 1–3 together cover the ordinary open → redeploy → close lifecycle without any manual step).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task below includes an exact file path

## Path Conventions

Single project, CI-tooling-only feature (no frontend/backend split — see `plan.md` Project Structure):

- CI scripts: `retro-rocket/scripts/firebase-preview-domains/`
- Workflow config: `.github/workflows/ci.yml` (modified in place — no new workflow file, per FR-010)

---

## Phase 1: Setup

**Purpose**: Scaffolding and the account/trigger prerequisites every later phase needs.

- [X] T001 [P] Create `retro-rocket/scripts/firebase-preview-domains/README.md` documenting the exact GCP provisioning steps from `research.md` §2: create a service account inside the `retrorocket-staging` project, grant it `roles/identitytoolkit.editor` (scoped to that project only — never production), generate a JSON key, and store it as the `FIREBASE_STAGING_SA_KEY` GitHub Actions secret.
- [X] T002 In `.github/workflows/ci.yml`, extend the top-level `on.pull_request.types` list to `[opened, synchronize, reopened, closed]` (currently unset/default) and add a top-level `on.workflow_dispatch: {}` trigger — needed later by User Story 3's close-event job and by the on-demand orphan-cleanup job, added here once so later phases don't repeatedly touch the same `on:` block.
- [X] T003 In the same `.github/workflows/ci.yml` change (depends on T002 — guards against exactly the triggers T002 introduces), add guards to the pre-existing jobs so they don't misfire on the new events: `analyze`, `checks`, and `e2e` each gain `if: github.event_name != 'workflow_dispatch'`; `deploy-preview`'s `if:` changes from `github.event_name == 'pull_request'` to `github.event_name == 'pull_request' && github.event.action != 'closed'` (otherwise it would attempt to build/deploy a preview for a PR that's being closed). `deploy-production` and `version` need no change — they're already scoped to `push`. (`/speckit-analyze` finding I1.)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure domain-list-diffing logic every later script (`sync-domain.mjs`, `cleanup-orphans.mjs`) depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Write failing Vitest tests in `retro-rocket/scripts/firebase-preview-domains/domain-diff.test.ts` for a `computeNextDomains(currentDomains, { add, remove })` function, covering: adding a domain that's absent; adding a domain that's already present (idempotent, no duplicate); removing a domain that's present; removing a domain that's absent (no-op); a single call with both `add` and `remove` set (this is the case that proves FR-006's ordering guarantee holds by construction — the new domain is present in the result regardless of whether the old one existed to remove); and confirming unrelated existing entries are never reordered or dropped.
- [X] T005 Implement `computeNextDomains` in `retro-rocket/scripts/firebase-preview-domains/domain-diff.mjs` (plain ESM, no build step — see `research.md` §5) so all of T004's tests pass.

**Checkpoint**: Foundational logic ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Sign in on a fresh PR preview without manual setup (Priority: P1) 🎯 MVP

**Goal**: The first preview deployment for a pull request automatically becomes an authorized Firebase sign-in domain, with no manual console step.

**Independent Test**: Open a new pull request, wait for the preview deployment and the new domain-sync job to both finish, open the preview URL, and complete a Google or GitHub sign-in with no "domain not authorized" error.

### Tests for User Story 1

- [X] T006 [US1] Write failing Vitest tests in `retro-rocket/scripts/firebase-preview-domains/sync-domain.test.ts` for the `sync-domain.mjs` CLI, mocking global `fetch`: missing `--project`, or neither `--add` nor `--remove` given → exit `1`; missing `GOOGLE_ACCESS_TOKEN` → exit `1`; non-2xx response from the `GET` call → exit `1`; non-2xx response from the `PATCH` call → exit `1`; happy path (valid args, 2xx `GET`/`PATCH`) → exit `0` and a `PATCH` body equal to `computeNextDomains`'s result. (`/speckit-analyze` finding C1 — closes the "no preceding test for the CLI's own logic" gap.)

### Implementation for User Story 1

- [X] T007 [US1] Implement `retro-rocket/scripts/firebase-preview-domains/sync-domain.mjs` per `contracts/sync-domain-cli.md` (depends on T006, T005): parse `--project`, `--add`, `--remove`; read the `GOOGLE_ACCESS_TOKEN` env var; `GET https://identitytoolkit.googleapis.com/admin/v2/projects/{project}/config`; pass the current `authorizedDomains` plus `{ add, remove }` into `computeNextDomains` (from `domain-diff.mjs`); `PATCH` the result back with `updateMask=authorizedDomains`; exit `1` on missing args, a missing token, or any non-2xx response, exit `0` otherwise — so all of T006's tests pass.
- [X] T008 [US1] In `.github/workflows/ci.yml` (depends on T007, T003): (a) add an `outputs: { url: ${{ steps.deploy.outputs.url }} }` mapping to the existing `deploy-preview` job so its URL is readable from a separate job; (b) add a new `sync-preview-domain` job with `needs: [deploy-preview]` and `if: github.event_name == 'pull_request' && github.event.action != 'closed'`, whose steps: restore the `preview-domain-pr-${{ github.event.pull_request.number }}` cache via `actions/cache/restore@v4`; strip the `https://` scheme from `needs.deploy-preview.outputs.url` to get a bare hostname; authenticate with `google-github-actions/auth@v2` (`credentials_json: ${{ secrets.FIREBASE_STAGING_SA_KEY }}`, `token_format: access_token`); run `node scripts/firebase-preview-domains/sync-domain.mjs --project retrorocket-staging --add <hostname>`, adding ` --remove <cached-hostname>` when the cache restore produced one; save the new hostname back to the same cache key via `actions/cache/save@v4`. Set `concurrency: { group: firebase-staging-authorized-domains, cancel-in-progress: false }` on this job (per `research.md` §4).
- [ ] T009 [US1] Validate end-to-end per `quickstart.md` Scenario 1: open a real pull request and confirm sign-in succeeds on its preview URL within 2 minutes of the preview being reported ready, with zero manual Firebase console steps.

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Redeploying a PR doesn't accumulate stale domains (Priority: P2)

**Goal**: Pushing a new commit to an open PR removes the previous preview's authorized domain and authorizes the new one, with no unbounded growth of the authorized-domains list.

**Independent Test**: Push a second commit to an already-open pull request, confirm sign-in works on the new preview URL, and confirm the previous URL's authorization is gone.

### Implementation for User Story 2

- [ ] T010 [US2] Validate end-to-end per `quickstart.md` Scenario 2: push a second commit to the pull request from Phase 3, confirm the new hostname is authorized and the previous commit's hostname is no longer in the staging project's `authorizedDomains`. No new implementation is required here — the `sync-preview-domain` job from T008 already passes `--remove <cached-hostname>` whenever the cache restore finds one, which is exactly the redeploy case; this task exists to confirm that behavior against a real redeploy rather than only against T004/T006's unit tests.

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Closing a PR leaves nothing behind (Priority: P3)

**Goal**: Closing or merging a pull request removes its preview's authorized domain, so the staging project's authorized-domains list only ever reflects pull requests that are still open.

**Independent Test**: Close (or merge) a pull request that has an active preview, then confirm its preview URL's authorization is removed.

### Implementation for User Story 3

- [X] T011 [US3] Add a `cleanup-preview-domain` job to `.github/workflows/ci.yml` (depends on T007, T003) with `if: github.event_name == 'pull_request' && github.event.action == 'closed'`: restore the `preview-domain-pr-${{ github.event.pull_request.number }}` cache (read-only, using the restore action's `cache-hit` output to detect a miss); when a hostname was found, authenticate with `google-github-actions/auth@v2` and run `node scripts/firebase-preview-domains/sync-domain.mjs --project retrorocket-staging --remove <hostname>`; when no cache entry exists, skip the removal step as a no-op (spec Acceptance Scenario 2 — a PR closed without ever having a successful preview deploy). Set the same `concurrency: { group: firebase-staging-authorized-domains, cancel-in-progress: false }` as T008's job.
- [X] T012 [US3] In the same `cleanup-preview-domain` job (depends on T011), add a step that deletes the `preview-domain-pr-<N>` cache entry via `gh cache delete "preview-domain-pr-${{ github.event.pull_request.number }}"` (using `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`) once the removal step succeeds, so no stale cache entry lingers for a closed PR.
- [ ] T013 [US3] Validate end-to-end per `quickstart.md` Scenario 3: close or merge a pull request with an active preview and confirm its hostname is no longer present in the staging project's authorized domains.

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: On-Demand Orphan Domain Cleanup (FR-008)

**Purpose**: A manually-triggered safety net for domains left behind when the normal per-PR removal step never ran (canceled workflow, deleted branch, etc.). Not one of the spec's three prioritized user stories, and explicitly on-demand only per the resolved `/speckit-clarify` decision — no scheduled/cron trigger.

- [X] T014 [P] Add `@actions/cache` as a devDependency of `retro-rocket/package.json` (`npm install --save-dev @actions/cache`) — the official GitHub Actions toolkit package, needed because `gh cache`/`GH_TOKEN` only exposes cache metadata, not content (`/speckit-analyze` finding G1; see `contracts/cleanup-orphans-cli.md`).
- [X] T015 [P] Write failing Vitest tests in `retro-rocket/scripts/firebase-preview-domains/cleanup-orphans.test.ts` for the `cleanup-orphans.mjs` CLI, mocking global `fetch` and `@actions/cache`'s `restoreCache`: missing `--project`/`--open-pr-numbers` → exit `1`; a `restoreCache()` failure for one PR number → exit `1`; non-2xx `GET`/`PATCH` → exit `1`; happy path with a mix of "still legitimate" and orphaned hostnames → exit `0`, the removed hostnames printed, and a `PATCH` body containing only the legitimate entries plus Firebase's own defaults. (`/speckit-analyze` finding C1.)
- [X] T016 Implement `retro-rocket/scripts/firebase-preview-domains/cleanup-orphans.mjs` per `contracts/cleanup-orphans-cli.md` (depends on T014, T015, T005): parse `--project` and `--open-pr-numbers`; `GET` the current `authorizedDomains`; for each open PR number, call `@actions/cache`'s `restoreCache()` for its `preview-domain-pr-<N>` key to build the "still legitimate" hostname set; compute the array with every entry removed that is neither in that set nor one of Firebase's own default domains; `PATCH` the result back; print the removed hostnames; exit `1` on any API/`restoreCache()` failure, `0` otherwise (including when zero orphans are found) — so all of T015's tests pass.
- [X] T017 Add a `cleanup-orphan-preview-domains` job to `.github/workflows/ci.yml` (depends on T016, T003) with `if: github.event_name == 'workflow_dispatch'`: resolve currently-open PR numbers via `gh pr list --state open --json number`; authenticate with `google-github-actions/auth@v2`; run `node scripts/firebase-preview-domains/cleanup-orphans.mjs --project retrorocket-staging --open-pr-numbers <resolved list>`. Set the same `concurrency: { group: firebase-staging-authorized-domains, cancel-in-progress: false }` as T008/T011's jobs.
- [ ] T018 Validate end-to-end per `quickstart.md` Scenario 6: manually trigger the workflow via `workflow_dispatch` and confirm the run log reports the removed hostnames (or that none were found), and that no currently-open PR's domain is ever removed.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T019 [P] Validate per `quickstart.md` Scenario 4: with two pull requests' preview deploys overlapping in time, confirm neither PR's domain registration is dropped by the other's concurrent run (the shared `firebase-staging-authorized-domains` concurrency group from T008/T011/T017 serializes the writes).
- [ ] T020 [P] Validate per `quickstart.md` Scenario 5: point the `sync-preview-domain` job at an invalid project ID on a throwaway, unmerged branch, and confirm the job fails visibly (red check) rather than the preview being reported ready with sign-in silently broken.
- [ ] T021 [P] Validate per `quickstart.md` Scenario 7: snapshot the *production* Firebase project's `authorizedDomains` before and after running Scenarios 1–6, and confirm the two snapshots are identical (`/speckit-analyze` finding G2 — SC-004 had no verification step before this).
- [X] T022 Run `npm run test:coverage` in `retro-rocket/` and confirm the new `domain-diff.test.ts`, `sync-domain.test.ts`, and `cleanup-orphans.test.ts` suites all pass and keep the existing thresholds in `vitest.config.ts` intact.
- [X] T023 Update `retro-rocket/scripts/firebase-preview-domains/README.md` (from T001) with final usage notes for both `sync-domain.mjs` and `cleanup-orphans.mjs`, cross-referencing `contracts/sync-domain-cli.md` and `contracts/cleanup-orphans-cli.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. T003 depends on T002 (same `on:` block).
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (T007 and T016 both import `domain-diff.mjs`).
- **User Story 1 (Phase 3)**: Depends on Foundational and on T003 (the `deploy-preview` guard T008 relies on). No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on User Story 1's T008 (same job implements both). Cannot be meaningfully validated before Phase 3 is done.
- **User Story 3 (Phase 5)**: Depends on Foundational, T007 (reuses `sync-domain.mjs`), and T003 — a separate job from T008, so could be implemented in parallel with Phase 3/4 by a different person, though validating it (T013) is easiest once there's already a merged PR to close.
- **Phase 6 (FR-008 cleanup)**: Depends on Foundational (T016 imports `domain-diff.mjs`), T003, and on the cache key convention established in Phase 3 (T008) — implementable any time after Phase 2, but most meaningful to validate after Phase 3/5 exist.
- **Polish (Phase 7)**: Depends on all prior phases being complete.

### Parallel Opportunities

- T001 (Setup) has no dependency and can run in parallel with T002/T003.
- T014 and T015 (Phase 6) touch different files from each other and from Phase 3/4/5, and can run in parallel with those phases once Phase 2 is done.
- T019, T020, and T021 (Polish validations) can run in parallel.

---

## Parallel Example: Setup + Foundational

```bash
# Setup:
Task: "Create retro-rocket/scripts/firebase-preview-domains/README.md with GCP provisioning steps"
# (T002 then T003 are sequential — same on:/jobs block in ci.yml)

# Foundational (sequential — tests before implementation):
Task: "Write failing tests for computeNextDomains in domain-diff.test.ts"
Task: "Implement computeNextDomains in domain-diff.mjs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (provision the staging service account/secret; update `ci.yml` triggers and existing-job guards).
2. Complete Phase 2: Foundational (`domain-diff.mjs` + its tests).
3. Complete Phase 3: User Story 1 (`sync-domain.mjs` + its tests + the `sync-preview-domain` job).
4. **STOP and VALIDATE**: run Scenario 1 from `quickstart.md` against a real PR.
5. At this point, every PR's *first* preview already has working sign-in — the single biggest pain point from the original request — even before redeploy-rotation (US2) or close-cleanup (US3) exist.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. Add User Story 1 → validate → this alone fixes "preview sign-in doesn't work at all."
3. Add User Story 2 → validate → fixes "the domain list grows forever as commits land" (in practice, no new code — just confirms T008's existing `--remove` path against a real redeploy).
4. Add User Story 3 → validate → fixes "closed PRs leave domains behind forever."
5. Add Phase 6 (on-demand cleanup) → validate → safety net for the cases 2–4 can't reach (canceled runs, deleted branches).
6. Polish → confirm the concurrency guarantee, the failure-blocks-deploy guarantee, and the production-is-never-touched guarantee all hold, and that coverage thresholds are unaffected.
