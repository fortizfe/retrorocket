# Firebase preview domain automation

Scripts used by `.github/workflows/ci.yml` to keep the **staging** Firebase project's
(`retrorocket-staging`) Auth "authorized domains" list in sync with pull request preview
deployments, so preview sign-in works without any manual Firebase console step. See
`specs/008-firebase-preview-domains/` for the full spec/plan/research behind this.

These scripts only ever target `retrorocket-staging` — never the production Firebase
project. That separation is enforced structurally by the service account below only
having IAM permissions inside the staging project.

## One-time GCP provisioning

Run once (requires `gcloud` authenticated as an owner/editor of `retrorocket-staging`):

```sh
PROJECT_ID=retrorocket-staging
SA_NAME=preview-domain-sync
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# 1. Create the service account, scoped to the staging project only.
gcloud iam service-accounts create "$SA_NAME" \
  --project "$PROJECT_ID" \
  --display-name "Preview domain sync (CI)"

# 2. Grant the least-privilege role that can read/update authorizedDomains
#    (identitytoolkit.editor — not identitytoolkit.admin, which also grants
#    IAM-policy management this automation never needs).
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:${SA_EMAIL}" \
  --role "roles/identitytoolkit.editor"

# 3. Generate a JSON key.
gcloud iam service-accounts keys create preview-domain-sync-key.json \
  --iam-account "$SA_EMAIL"

# 4. Store its contents as a GitHub Actions secret, then delete the local file.
gh secret set FIREBASE_STAGING_SA_KEY < preview-domain-sync-key.json
rm preview-domain-sync-key.json
```

This is what `ci.yml`'s jobs pass to `google-github-actions/auth@v2` as `credentials_json`
to obtain a short-lived OAuth access token (`GOOGLE_ACCESS_TOKEN`) for the scripts below.

## Scripts

- **`domain-diff.mjs`** — pure logic, exports `computeNextDomains(currentDomains, { add, remove })`. No I/O. Used by both CLIs below.

- **`sync-domain.mjs`** — adds/removes one exact hostname from `retrorocket-staging`'s `authorizedDomains`. Used by the `sync-preview-domain` job (on every preview deploy, `--add <new> [--remove <previous>]`) and the `cleanup-preview-domain` job (on PR close, `--remove <hostname>` only) in `ci.yml`.

  ```sh
  GOOGLE_ACCESS_TOKEN=<token> node sync-domain.mjs \
    --project retrorocket-staging --add pr-42-abc123.vercel.app --remove pr-42-def456.vercel.app
  ```

  Exits `0` on success (including a no-op add/remove), `1` on any missing argument, missing token, or non-2xx response from Firebase — which is what makes FR-007 ("block the deploy if registration fails") work with no special-case handling in the workflow: a non-zero exit here fails the CI step exactly like any other command failure. Full contract: [`sync-domain-cli.md`](../../../specs/008-firebase-preview-domains/contracts/sync-domain-cli.md).

- **`cleanup-orphans.mjs`** — on-demand sweep (FR-008) that removes any `*.vercel.app` authorized domain not tied to a currently-open pull request; never touches non-`*.vercel.app` entries (Firebase's own defaults, any custom prod domain). Used only by the `cleanup-orphan-preview-domains` job, triggered manually via `workflow_dispatch`. Resolves each open PR's currently-legitimate hostname via `@actions/cache`'s `restoreCache()` (not `gh cache`, which only exposes cache metadata, not content).

  ```sh
  GOOGLE_ACCESS_TOKEN=<token> node cleanup-orphans.mjs \
    --project retrorocket-staging --open-pr-numbers 42,57
  ```

  Full contract: [`cleanup-orphans-cli.md`](../../../specs/008-firebase-preview-domains/contracts/cleanup-orphans-cli.md).

## Running the tests

```sh
npm run test:run -- scripts/firebase-preview-domains
```

`domain-diff.test.ts` tests the pure diff logic directly. `sync-domain.test.ts` and `cleanup-orphans.test.ts` mock global `fetch` (and, for the latter, `@actions/cache`'s `restoreCache`) so both CLIs' own argument-validation and HTTP-status-branching logic has a preceding test too — no code in this directory ships without one (Constitution Principle I).
