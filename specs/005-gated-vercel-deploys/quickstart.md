# Quickstart: Validating Gated Vercel Deployments

## Prerequisites

- A Vercel access token with deploy permission on the `retro-rocket` project, added as the `VERCEL_TOKEN` GitHub Actions secret.
- `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` obtained by running `vercel link` once locally against `retro-rocket/` (writes `.vercel/project.json`, not committed), then added as GitHub Actions secrets.
  ```sh
  cd retro-rocket && vercel link
  cat .vercel/project.json   # copy orgId / projectId
  gh secret set VERCEL_TOKEN
  gh secret set VERCEL_ORG_ID
  gh secret set VERCEL_PROJECT_ID
  ```
- `retro-rocket/vercel.json` updated with `"git": { "deploymentEnabled": false }` (research.md §2) and merged to `main`, so Vercel's native auto-deploy stops firing before validating the new gate.
- `.github/workflows/deploy.yml` present (research.md §3–§4) and merged to `main`.

## Part 1 — Verify preview deployment gating (User Story 1)

1. Open a pull request with passing tests and a clean CodeQL scan.
2. Confirm the PR's checks show `Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, and `CodeQL` as pending/running, and that `deploy.yml`'s `deploy-preview` job is waiting (not yet deploying):
   ```sh
   gh pr checks <num>
   ```
3. Once all three checks report success, confirm `deploy-preview` proceeds and completes:
   ```sh
   gh run list --workflow=deploy.yml --branch <pr-branch>
   ```
4. Confirm a direct link to the preview deployment is discoverable on the PR itself (FR-010, SC-006) — either as a native Vercel bot comment/check, or (fallback per research.md §6) an explicit comment posted by the workflow:
   ```sh
   gh pr view <num> --json comments,statusCheckRollup
   ```
5. Confirm the deployment is preview-only — no production alias is affected:
   ```sh
   vercel list retro-rocket --environment=production
   ```

## Part 2 — Verify preview deployment is blocked on gate failure (User Story 1, edge cases)

1. Push a commit to the same PR that fails lint or introduces a High-severity CodeQL finding (reuse the pattern from feature 004's quickstart §Part 2 step 3 if needed).
2. Confirm `deploy-preview` does not run to completion (no new deployment created) while the failing check is visible:
   ```sh
   gh pr checks <num>
   gh run list --workflow=deploy.yml --branch <pr-branch>
   ```
3. Confirm no separate "deployment blocked" indicator exists (FR-011) — only the underlying failing check plus the absence of a `deploy.yml` success run.

## Part 3 — Verify production deployment gating (User Story 2)

1. Merge a clean PR to `main` (or push directly for testing) and confirm `deploy-production` waits for the same three checks on `github.sha`, then deploys only after they succeed:
   ```sh
   gh run list --workflow=deploy.yml --branch main
   ```
2. Confirm the deployment targets production only — no preview deployment is created for this push:
   ```sh
   vercel list retro-rocket --environment=preview
   ```
3. Repeat the negative case from Part 2 on a direct push to `main` (in a disposable test scenario) to confirm `deploy-production` does not run when a gate fails.

## Part 4 — Confirm Vercel's native auto-deploy no longer fires

1. Push a trivial commit to any branch/PR and confirm no Vercel deployment appears until `deploy.yml`'s wait step passes — i.e., no deployment exists for that commit until the corresponding `deploy-preview`/`deploy-production` job actually runs (SC-001–SC-004).

## Cleanup

- Delete any throwaway test PR(s)/branches created in Parts 2–3.
- Revoke/rotate the `VERCEL_TOKEN` used for validation if it was a temporary token.
