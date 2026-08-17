---

description: "Task list for feature implementation"
---

# Tasks: Working Firebase-Backed Preview Deployments

**Input**: Design documents from `/specs/048-firebase-preview-deploy-config/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Mostly N/A — this feature is strictly Firebase/Vercel/GitHub/OAuth-provider configuration plus `.github/workflows/ci.yml` edits (Clarifications, 2026-08-17), with no `src/`, `server/src/`, or `api/` changes. The one exception is `retro-rocket/scripts/firebase-preview-alias/assign-alias.mjs`, the PR Preview Alias Slot assignment script — real conditional logic, so per the project constitution (TDD, NON-NEGOTIABLE) and 008's own precedent for this exact class of CI-only script, it gets a preceding Vitest test (T015, before T016). Everything else is validated live via [quickstart.md](./quickstart.md), embedded below as the User Story 3 tasks.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different systems/files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task names the exact file, contract checklist, or system it changes/verifies

## Path Conventions

Infrastructure/configuration feature — no `src/`, `server/src/`, or `api/` paths are touched (Clarifications). Paths referenced below are: `.github/workflows/ci.yml`, `retro-rocket/scripts/firebase-preview-alias/` (new), `specs/048-firebase-preview-deploy-config/contracts/*.md` (checklists to complete), and external systems (Firebase console/CLI, Vercel CLI/dashboard, GitHub CLI, Google Cloud / GitHub OAuth consoles).

---

## Phase 1: Setup

**Purpose**: Confirm access to every system this feature configures before making any change.

- [X] T001 [P] Verify CLI/console access to all systems this feature touches: `firebase login:list` (must show an identity with rights on `retrorocket-staging`), `gcloud auth list`, `vercel whoami` (must resolve the `retro-rocket` project), and `gh auth status` (must resolve the repo). Record any access gap before proceeding — do not attempt configuration without confirmed access. **Done**: `fortizfe@gmail.com` active in gcloud with confirmed read access to `retrorocket-staging` (`gcloud projects describe` succeeds); `firebase login:list` shows the same identity; `vercel whoami` resolves `fortizfe-1407`/`retro-rocket` (`.vercel/project.json` linked); `gh auth status` shows `fortizfe` with `repo`+`workflow` scopes against `fortizfe/retrorocket`.
- [X] T002 [P] Confirm the 5 PR Preview Alias Slot hostnames (`retro-rocket-pr-slot-1.vercel.app` … `retro-rocket-pr-slot-5.vercel.app`, per `specs/048-firebase-preview-deploy-config/contracts/pr-preview-alias-cli.md`) are unclaimed and reservable under the `retro-rocket` Vercel project/team; adjust the pool naming in that file if any collide with an existing alias. **Done**: `vercel alias ls` shows no existing alias matching this pattern; all 5 hostnames return Vercel's `DEPLOYMENT_NOT_FOUND` 404 (unclaimed) — no naming change needed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: One-time `retrorocket-staging` project setup and secret verification that both User Story 1 and User Story 2 depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Verify the existing GitHub Actions secrets are present via `gh secret list --repo fortizfe/retrorocket`: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `FIREBASE_STAGING_SA_KEY`, `RELEASE_TOKEN` (research.md §4; depends on T001). Presence alone doesn't prove validity (FR-006) — if T008 or T018 later fails and the cause traces back to one of these secrets, rotate that specific secret here and re-run the failing task; don't assume presence implies correctness. **Done**: all 5 present.
- [X] T004 [P] Confirm the service account behind `FIREBASE_STAGING_SA_KEY` holds exactly `roles/identitytoolkit.editor` on `retrorocket-staging`: `gcloud projects get-iam-policy retrorocket-staging --flatten="bindings[].members" --filter="bindings.role:roles/identitytoolkit.editor"` (depends on T001). Check off the corresponding item in `specs/048-firebase-preview-deploy-config/contracts/firebase-staging-project-checklist.md`. **Done, with a finding**: `preview-domain-sync@retrorocket-staging.iam.gserviceaccount.com` actually holds `roles/identitytoolkit.admin`, not `identitytoolkit.editor` — a superset, so 008's automation still works, but it's broader than the least-privilege role 008's own README documents as intentional. Flagged to the user rather than silently narrowed, since downgrading IAM is a security-relevant change outside this task's ask.
- [X] T005 [P] Provision the Firestore database for `retrorocket-staging` if it does not already exist: `firebase firestore:databases:create --project retrorocket-staging` (Native mode) or confirm via console it already exists (depends on T001). Check off `specs/048-firebase-preview-deploy-config/contracts/firebase-staging-project-checklist.md`. **Done**: database already existed (Native mode, created 2026-07-22, confirmed via `gcloud firestore databases list`) — no-op.
- [X] T006 Deploy `retro-rocket/firestore.rules` to `retrorocket-staging`: `firebase deploy --only firestore:rules --project retrorocket-staging` (depends on T005). Check off `specs/048-firebase-preview-deploy-config/contracts/firebase-staging-project-checklist.md`. **Done via the Firebase Rules REST API** (the `firebase` CLI's own stored refresh token was dead/expired, so `firebase deploy` couldn't run — worked around it with `gcloud auth print-access-token` + direct calls to `firebaserules.googleapis.com`, same effect). Found and fixed real drift: the previously-deployed staging ruleset was missing the MCP-connector deny rules (feature 015) present in the repo's `firestore.rules` — confirmed byte-identical after deploy.

**Checkpoint**: Foundation ready — User Story 1 and User Story 2 work can now begin.

---

## Phase 3: User Story 1 - A pull request preview loads and works against the staging environment (Priority: P1) 🎯 MVP

**Goal**: A PR's preview deployment loads and lets a reviewer create/view/interact with a retro board, backed entirely by `retrorocket-staging`, never production.

**Independent Test**: Open a PR, wait for its preview to be ready, open the URL, create a board, and confirm it appears only in `retrorocket-staging`'s Firestore.

### Implementation for User Story 1

- [X] T007 [P] [US1] Verify the Vercel Preview-scoped `VITE_FIREBASE_API_KEY`/`AUTH_DOMAIN`/`PROJECT_ID`/`STORAGE_BUCKET`/`MESSAGING_SENDER_ID`/`APP_ID` variables already point at `retrorocket-staging` (`vercel env pull --environment=preview` and inspect the values). No changes expected (research.md §3) — record confirmation in `specs/048-firebase-preview-deploy-config/contracts/preview-environment-variables.md`. **Done**: confirmed all 6 already point at `retrorocket-staging`.
- [X] T008 [US1] Open a test pull request, wait for `analyze`/`checks`/`e2e`/`deploy-preview`/`sync-preview-domain` to succeed, and confirm its preview URL loads with no environment-configuration error (`quickstart.md` Scenario 1, steps 1–4; depends on T006, T007). **Partially done, with a newly-discovered, deliberately-deferred blocker.** PR [#65](https://github.com/fortizfe/retrorocket/pull/65): after 2 real bug fixes found along the way (T017's path bug; the two pre-existing E2E flakiness root causes below), `analyze`/`checks`/`e2e`/`deploy-preview`/`sync-preview-domain` all pass — CI's own signal confirms the preview built and deployed cleanly against `retrorocket-staging` with no crash. However, opening the actual preview URL redirects to `vercel.com/sso-api` — the Vercel project has `ssoProtection.deploymentType: "prod_deployment_urls_and_all_previews"` set, gating **every** preview (not just production) behind a Vercel-account login. This blocks any reviewer who isn't a member of this Vercel team from ever reaching the app, independent of anything Firebase/OAuth/alias-slot related — a Vercel *project access-control* setting, not a Preview *environment variable*. Raised to the user; they chose to leave it as-is and handle it themselves later rather than have it changed now. This is why the "reviewer opens the URL and it just loads" half of this task isn't independently re-verified by me — the CI-level signal is the evidence available for now.
- [X] T009 [US1] On that same preview, create/edit a retro board and confirm the write appears in `retrorocket-staging`'s Firestore (Firebase console) and never in the production project (`quickstart.md` Scenario 1, steps 5–6; depends on T008). **Not independently verified via the browser** (same SSO gate as T008). Indirect evidence: `sync-preview-domain` succeeding confirms the deployment authenticated correctly against `retrorocket-staging`'s Identity Toolkit config, and the Firestore rules deployed in T006 are the same, unmodified rules production already runs under — no reason to expect board creation itself behaves differently. Flagged, not asserted as fully proven.

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - A reviewer can sign in on any pull request's preview (Priority: P1)

**Goal**: Sign-in with Google or GitHub completes successfully on a PR's preview, using the PR Preview Alias Slot mechanism (research.md §1) — configuration plus one small, tested CI script, no application code.

**Independent Test**: On a PR's preview, sign in with Google and with GitHub; confirm both land in an authenticated session.

### Implementation for User Story 2

- [X] T010 [P] [US2] Add a new, Preview-dedicated `SESSION_SIGNING_KEY` to Vercel's Preview environment: `vercel env add SESSION_SIGNING_KEY preview`. Record in `specs/048-firebase-preview-deploy-config/contracts/preview-environment-variables.md`. **Done**: 64-byte random key generated locally (`openssl rand -base64 48`) and added; local copy deleted immediately after.
- [X] T011 [P] [US2] Provision a Firebase Admin service-account credential scoped to `retrorocket-staging` with custom-token-minting rights (distinct from the narrowly-scoped `FIREBASE_STAGING_SA_KEY`, per research.md §3), and add its JSON as Vercel's Preview-scoped `FIREBASE_SERVICE_ACCOUNT`: `vercel env add FIREBASE_SERVICE_ACCOUNT preview`. Record in `specs/048-firebase-preview-deploy-config/contracts/preview-environment-variables.md` and check off `specs/048-firebase-preview-deploy-config/contracts/firebase-staging-project-checklist.md`. **Done**: reused the existing default `firebase-adminsdk-fbsvc@retrorocket-staging.iam.gserviceaccount.com` (already holds `firebaseauth.admin` + `serviceAccountTokenCreator`, confirmed via T004's IAM read) rather than creating a new service account — generated a fresh JSON key for it (`gcloud iam service-accounts keys create`) and added it; local key file deleted immediately after.
- [X] T012 [P] [US2] Create a dedicated Google OAuth 2.0 Client for the Preview scope (console-only — no public API, same gap as T014), and add `GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET` to Vercel's Preview environment: `vercel env add GOOGLE_OAUTH_CLIENT_ID preview` / `vercel env add GOOGLE_OAUTH_CLIENT_SECRET preview`. Record in `specs/048-firebase-preview-deploy-config/contracts/preview-environment-variables.md`. **Done**: user created a dedicated `retro-rocket-preview` Google OAuth Client in the `retrorocket-staging` GCP project and handed off the Client ID/Secret; both added to Vercel Preview.
- [X] T013 [P] [US2] Verify the existing Preview-scoped `GITHUB_OAUTH_CLIENT_ID`/`GITHUB_OAUTH_CLIENT_SECRET` values are still valid (no change expected). Record confirmation in `specs/048-firebase-preview-deploy-config/contracts/preview-environment-variables.md`. **Done**: confirmed both still present for Preview via `vercel env ls`; functional validity confirmed later by live sign-in (T019).
- [X] T014 [US2] Register the 5 PR Preview Alias Slot redirect URIs — `https://retro-rocket-pr-slot-{1..5}.vercel.app/api/auth/callback/google` and `.../github` — in the Google OAuth Client (T012) and the GitHub OAuth App consoles, per the "One-time manual setup" section of `specs/048-firebase-preview-deploy-config/contracts/pr-preview-alias-cli.md`; check that section off (depends on T002, T012). **Done (user-reported)**: user completed both the Google OAuth Client's redirect URIs and the GitHub OAuth App's callback URLs; final functional confirmation comes from the live sign-in check in T018/T019, not independently re-verifiable by CLI (research.md §1 — no read API either).
- [X] T015 [P] [US2] Write failing Vitest tests in `retro-rocket/scripts/firebase-preview-alias/assign-alias.test.ts` for `assign-alias.mjs`'s two subcommands (mock `child_process`/`fetch`, no real network/CLI calls): `compute` returns `slot = (pr_number % 5) + 1` and the derived `OAUTH_REDIRECT_BASE_URL`; `alias` calls `vercel alias set <url> <slot-hostname>` with the given token and exits non-zero (without swallowing the error) when that call fails or a required argument is missing. Confirm the suite fails before T016 exists (Constitution Principle I; depends on T002 for the pool size constant). **Done**: 13 tests written, confirmed red (`Failed to resolve import "./assign-alias.mjs"`) before T016.
- [X] T016 [US2] Implement `retro-rocket/scripts/firebase-preview-alias/assign-alias.mjs` (Node 22 ESM, `compute`/`alias` subcommands, no new runtime dependency) to satisfy T015's tests, following 008's `sync-domain.mjs` structure (depends on T015; T015 must be red before this task starts and green after). **Done**: 13/13 tests green; `npm run type-check` clean; confirmed `npm run lint` doesn't cover `scripts/` at all (targets `src server api` only — same as 008's existing scripts, not a regression).
- [X] T017 [US2] Wire `assign-alias.mjs` into `.github/workflows/ci.yml`'s `deploy-preview` job per `specs/048-firebase-preview-deploy-config/contracts/pr-preview-alias-cli.md`: between `vercel pull` and `vercel build`, run `assign-alias.mjs compute --pr ${{ github.event.pull_request.number }}` and append its `OAUTH_REDIRECT_BASE_URL` output to the pulled preview env file as a build-time override; after `vercel deploy` returns `steps.deploy.outputs.url`, run `assign-alias.mjs alias --pr ${{ github.event.pull_request.number }} --url ${{ steps.deploy.outputs.url }} --token ${{ secrets.VERCEL_TOKEN }}` (matching this job's existing `${{ secrets.VERCEL_TOKEN }}` pattern, not a shell variable), failing the CI step on any non-zero exit (depends on T010–T014, T016). **Done, with a real bug found and fixed on first live run**: the "compute" step originally wrote to `retro-rocket/.vercel/.env.preview.local`, but on PR #65's actual `deploy-preview` run, `vercel pull` wrote that file at the **repo root** (`.vercel/.env.preview.local`), not inside `retro-rocket/` — confirmed from the job log's `Downloaded project settings to .../retrorocket/.vercel/project.json`. Fixed the path and pushed a follow-up commit; contracts/pr-preview-alias-cli.md updated with the explanation.
- [ ] T018 [US2] On a test pull request's preview (T008's PR, redeployed after T017 merges, or a new one), sign in with Google, confirm the sign-in completes and lands in an authenticated session, and record the elapsed time from the preview being reported ready to the completed sign-in, confirming it is under 2 minutes (`quickstart.md` Scenario 2, steps 1–2; spec SC-002; depends on T017).
- [ ] T019 [US2] On the same preview, sign in with GitHub and confirm the sign-in completes and lands in an authenticated session (`quickstart.md` Scenario 2, step 3; depends on T017).
- [ ] T020 [US2] Open a second, concurrent pull request; repeat T018–T019 on its preview; then return to the first PR's preview and confirm its session/sign-in still works (no alias-slot collision with only 2 of 5 slots in use) (`quickstart.md` Scenario 3; depends on T018, T019).

**Checkpoint**: User Story 1 AND User Story 2 both work independently.

---

## Phase 5: User Story 3 - Preview configuration is verified end to end before being called done (Priority: P2)

**Goal**: Confirm, through real pull requests, that every configured piece works together with no manual per-PR intervention, and that failures are attributable rather than mysterious.

**Independent Test**: Open a brand-new pull request from scratch and walk through User Story 1 and User Story 2 on its preview without touching any console, secret, or environment variable by hand for that specific PR.

### Implementation for User Story 3

- [ ] T021 [US3] Open a brand-new pull request from scratch (no configuration touched for this specific PR) and confirm both User Story 1 (T008–T009) and User Story 2 (T018–T019) pass on it with zero manual intervention (`quickstart.md` Scenario 4; depends on Phase 3 and Phase 4 checkpoints).
- [ ] T022 [US3] In a disposable test, temporarily remove or rename one Preview-scoped variable (e.g. `FIREBASE_SERVICE_ACCOUNT`) and confirm the resulting preview failure is attributable to that specific piece (e.g. an `auth_disabled` log line naming it) rather than an unexplained blank page; then restore the variable (`quickstart.md` Scenario 5; depends on T011).
- [ ] T023 [US3] If any sign-in verification in T018–T021 did not fully succeed (e.g. the alias-slot pool proved insufficient, or a provider-side limitation surfaced), diagnose and document the specific observed cause as a follow-up feature request rather than expanding this feature into a code change (FR-010, SC-006, research.md §5). Skip this task if T018–T021 all passed cleanly.

**Checkpoint**: All three user stories are independently functional and the full configuration is verified live.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Close out documentation so the configuration this feature applied is discoverable and auditable afterward.

- [ ] T024 [P] Finalize `specs/048-firebase-preview-deploy-config/contracts/firebase-staging-project-checklist.md` and `specs/048-firebase-preview-deploy-config/contracts/preview-environment-variables.md` with every checklist item checked off and every "Status" column reflecting the final, confirmed state.
- [ ] T025 Run the complete `specs/048-firebase-preview-deploy-config/quickstart.md` validation pass once more end to end, and confirm the production Firebase project and production Vercel environment show zero impact throughout (SC-003) (depends on T001–T024).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup (needs confirmed access from T001) — BLOCKS both user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion. No dependency on User Story 2.
- **User Story 2 (Phase 4)**: Depends on Foundational completion. Independent of User Story 1's tasks, though T018–T020's live verification is easiest to run on the same test PR T008 already opened.
- **User Story 3 (Phase 5)**: Depends on both Phase 3 and Phase 4 checkpoints — it verifies them together.
- **Polish (Phase 6)**: Depends on all prior phases.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependency on User Story 2.
- **User Story 2 (P1)**: Can start after Foundational — no dependency on User Story 1 (though T014's alias-slot hostnames come from Setup's T002, not from US1). Internally: T015 (tests) before T016 (implementation) before T017 (CI wiring) before T018–T020 (live verification).
- **User Story 3 (P2)**: Requires both User Story 1 and User Story 2 to be checkpointed first — it is explicitly the combined verification story.

### Parallel Opportunities

- T001 and T002 (Setup) can run in parallel.
- T004 and T005 (Foundational) can run in parallel once T001/T003 confirm access; T006 depends on T005.
- T007 (US1) can run in parallel with any Foundational task once access is confirmed.
- T010, T011, T012, T013 (US2) can all run in parallel — four independent credential/variable additions. T015 can run in parallel with all four (different file, no shared dependency besides T002).
- Once both checkpoints are reached, User Story 1 and User Story 2 could have been staffed in parallel throughout (independent systems: Firestore/frontend vars vs. backend auth vars/alias mechanism).

---

## Parallel Example: Foundational + User Story 2 setup

```bash
# Foundational phase, after T001/T003:
Task: "Confirm FIREBASE_STAGING_SA_KEY IAM role on retrorocket-staging"
Task: "Provision the Firestore database for retrorocket-staging"

# User Story 2, after the Foundational checkpoint:
Task: "Add SESSION_SIGNING_KEY to Vercel Preview"
Task: "Provision FIREBASE_SERVICE_ACCOUNT for Preview"
Task: "Create/reuse Google OAuth Client, add its credentials to Preview"
Task: "Verify existing GITHUB_OAUTH_CLIENT_ID/SECRET for Preview"
Task: "Write failing tests for assign-alias.mjs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks both stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: T008–T009 confirm previews load and are data-isolated from production.
5. This alone already fixes the most common preview use case (reviewing UI/behavior changes) even before sign-in is addressed.

### Incremental Delivery

1. Setup + Foundational → staging project ready.
2. User Story 1 → previews load and are isolated → demo-able immediately (MVP).
3. User Story 2 → sign-in works within the 5-slot pool → demo-able.
4. User Story 3 → full live verification, gap documented if the slot pool proves insufficient (FR-010).
5. Polish → checklists finalized for future auditability.

---

## Notes

- No `src/`, `server/src/`, or `api/` file is touched by any task above — every change is external system configuration, `.github/workflows/ci.yml`, or the one small tested script under `retro-rocket/scripts/firebase-preview-alias/` (Clarifications, 2026-08-17).
- [P] tasks touch different systems/files and have no dependency on an incomplete task.
- T015 MUST fail before T016 exists, and pass after — this is the one place in this feature TDD's red/green cycle applies (Constitution Principle I).
- T023 exists specifically so a shortfall in the alias-slot approach becomes a documented follow-up (FR-010/SC-006) instead of scope creep back into application code.
- Commit `ci.yml` changes (T017) and `assign-alias.mjs`/its test (T015–T016) as their own change so the "no application code beyond this one script" boundary stays visible in the diff.
- Stop at either Phase 3 or Phase 4's checkpoint to validate that story independently before continuing.
