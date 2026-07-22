# Quickstart: Validating the Firebase Preview Domain Automation

## Prerequisites

- The staging Firebase project (`retrorocket-staging`) already exists and preview deployments already point at it (prior work — see spec Assumptions).
- A GCP service account exists in `retrorocket-staging` with `roles/identitytoolkit.editor`, its key stored as the `FIREBASE_STAGING_SA_KEY` GitHub Actions secret (see [research.md §2](./research.md)).
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets already configured (existing `deploy-preview` job dependency, unchanged by this feature).
- `gh` CLI authenticated locally if running the manual steps below outside of CI.

## Scenario 1 — First preview deploy on a PR authorizes sign-in (User Story 1)

1. Open a pull request with a trivial change.
2. Wait for the `deploy-preview` job and the new `sync-preview-domain` job to both finish (visible in the PR's checks list).
3. Open the preview URL from the sticky PR comment.
4. Attempt Google or GitHub sign-in.

**Expected**: sign-in completes with no "domain not authorized" error, within 2 minutes of the preview being reported ready (SC-001).

## Scenario 2 — Redeploy rotates the authorized domain (User Story 2)

1. On the same PR, push a second commit.
2. Wait for the new preview + `sync-preview-domain` run to finish.
3. Open the *new* preview URL and sign in (should work, per Scenario 1).
4. Inspect the staging project's authorized domains (Firebase Console → Authentication → Settings → Authorized domains, or `GET` via the API from research.md §1) and confirm the *previous* commit's preview hostname is no longer present, and exactly one hostname for this PR remains.

**Expected**: new URL works immediately; old URL's entry is gone; sign-in on the new URL never depended on the old entry being removed first (SC-002, FR-006).

## Scenario 3 — Closing a PR removes its domain (User Story 3)

1. Close (or merge) the pull request from Scenario 1/2.
2. Wait for the `cleanup-preview-domain` job (triggered by the `closed` PR event) to finish.
3. Inspect the staging project's authorized domains list.

**Expected**: no entry remains for this PR's last preview hostname (SC-003).

## Scenario 4 — Two PRs open at once don't interfere (FR-005, SC-005)

1. Open two pull requests concurrently (or push to both around the same time so their `sync-preview-domain` jobs overlap).
2. Wait for both to finish.
3. Sign in on both preview URLs.
4. Close one of the two PRs.

**Expected**: both previews work independently throughout; closing one PR removes only its own domain entry, leaving the other PR's preview still signed-in-able.

## Scenario 5 — Registration failure blocks the deployment (FR-007)

Hard to simulate against the real API without deliberately breaking credentials; validate at the unit-test level instead (see `scripts/firebase-preview-domains/*.test.ts`) plus one manual check:

1. Temporarily point the `sync-preview-domain` job at a non-existent project ID (e.g. via a throwaway branch, not merged).
2. Push a commit to trigger a preview deploy.

**Expected**: the `sync-preview-domain` job fails (non-zero exit from `sync-domain.mjs`), and the job is visibly red in the PR checks — it does not silently succeed while leaving sign-in broken.

## Scenario 6 — On-demand orphan cleanup (FR-008)

1. Manually trigger the `cleanup-orphan-preview-domains` job via `workflow_dispatch` (Actions tab → this workflow → "Run workflow").
2. Inspect the run's log output.

**Expected**: the log lists any hostnames removed (or explicitly states none were found); no entry for a currently-open PR is ever removed.

## Scenario 7 — Production project is never touched (SC-004)

1. Before running Scenarios 1–6, snapshot the *production* Firebase project's `authorizedDomains` (`GET` via the API from [research.md §1](./research.md), using production-scoped read-only credentials — never the staging service account from Scenario 1's prerequisites).
2. Run Scenarios 1–6.
3. Snapshot the production project's `authorizedDomains` again.

**Expected**: the two snapshots are byte-for-byte identical — nothing in this feature ever reads or writes the production project's config.
