# Quickstart: Validating the Unified CI Pipeline

Prerequisites: push access to a branch on this repository (or a PR from one), and read access to the Actions tab.

## Scenario 1 — Happy path on a pull request

1. Open a pull request targeting `main` with a passing change.
2. In the PR's checks tab, confirm all of these appear as part of **one** workflow run (not three separate workflows): `Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, `CodeQL`, `deploy-preview`.
3. Confirm `deploy-preview` only starts after the three quality-check jobs show green.
4. Confirm a PR comment with the preview deployment URL appears (header `gated-vercel-preview-deployment`, per contracts/workflow-jobs.md).
5. Confirm no `deploy-production` or `version` job appears for this PR run.

**Expected outcome**: single workflow run, correct stage ordering, preview URL commented.

## Scenario 2 — Failing quality check blocks deploy

1. Push a commit to the PR that fails a unit test (or lint/type-check).
2. Confirm the failing job shows red.
3. Confirm `deploy-preview` does not run (shown as skipped, not attempted).

**Expected outcome**: no preview deployment attempted when a quality-check job fails (SC-002).

## Scenario 3 — Merge to main: production deploy then versioning

1. Merge the passing PR into `main`.
2. In the resulting workflow run on `main`, confirm the three quality-check jobs run again, then `deploy-production` runs after they succeed, then `version` runs after `deploy-production` succeeds.
3. Confirm `version` produces a new release commit/tag (message contains `[version bump]`) per `retro-rocket/.releaserc.json`.

**Expected outcome**: production deploy gated on checks, versioning gated on deploy (SC-003), single run shows full status end-to-end (SC-004).

## Scenario 4 — Version-bump commit does not loop

1. Observe the workflow run triggered by the `[version bump]` commit itself (pushed to `main` by `version` in Scenario 3).
2. Confirm the three quality-check jobs still run (per constitution: CI must run on every push to main) but `version` is skipped on this run because the commit message contains `[version bump]`.

**Expected outcome**: no infinite release loop.

## Scenario 5 — Repository file check

1. Confirm `.github/workflows/ci.yml` exists and contains all six jobs described in `contracts/workflow-jobs.md`.
2. Confirm `.github/workflows/codeql.yml` and `.github/workflows/deploy.yml` no longer exist (SC-001).

**Expected outcome**: exactly one workflow file governs the entire process.
