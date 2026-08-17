# Contract: PR Preview Alias Slot Assignment

This fixes the mechanism that gives each pull request's preview a stable, pre-registerable sign-in address, without any application code change (research.md §1). It is the counterpart, for OAuth redirect purposes, to 008's `sync-domain.mjs` — but targets a fixed alias pool via `vercel alias`, not a per-PR-growing list, because neither OAuth provider exposes a redirect-URI management API.

## One-time manual setup (not automated, not per-PR)

1. Choose a pool size (default **5**) and reserve that many `*.vercel.app` alias hostnames, e.g. `retro-rocket-pr-slot-1.vercel.app` … `retro-rocket-pr-slot-5.vercel.app`.
2. In the Google Cloud Console (OAuth Client used for Preview) and the GitHub OAuth App used for Preview, register `https://retro-rocket-pr-slot-{1..5}.vercel.app/api/auth/callback/google` and `.../api/auth/callback/github` respectively as authorized/callback redirect URIs — all 5, once.

## Per-PR CI behavior (`.github/workflows/ci.yml`, `deploy-preview` job)

Implemented by `retro-rocket/scripts/firebase-preview-alias/assign-alias.mjs` (Vitest-tested, mirroring 008's `sync-domain.mjs` — see plan.md Technical Context), invoked twice from the workflow rather than left as inline CLI calls:

1. **Set redirect URL** (before `vercel pull`, so the pull/build/deploy that follow see it): `node scripts/firebase-preview-alias/assign-alias.mjs set-redirect --pr ${{ github.event.pull_request.number }} --branch ${{ github.head_ref }} --token ${{ secrets.VERCEL_TOKEN }}` computes `slot = (pr_number % 5) + 1` and sets `OAUTH_REDIRECT_BASE_URL=https://retro-rocket-pr-slot-<slot>.vercel.app` as a **real, branch-scoped Vercel-stored Preview environment variable** (`vercel env rm ... preview <branch> --yes` — tolerating "nothing to remove" on a first deploy — then `vercel env add ... preview <branch>`), keyed to the PR's own branch name (`github.head_ref`). This corrects an earlier version of this contract/step that instead appended the value to the locally-pulled `.vercel/.env.preview.local` file before `vercel build` — confirmed live (2026-08-17) to have **zero effect**: a Vercel Function's runtime environment is injected by Vercel's own platform from its stored project config at deploy time, not from anything in a local build's env file (the built `.vc-config.json`'s `environment` field is empty regardless). `vercel pull`'s own subsequent call also gets `--git-branch=${{ github.head_ref }}` so any frontend-facing branch-scoped override would be picked up too, though none exists today.
2. **Link the deployment to its branch**: `vercel deploy --prebuilt ... -m githubDeployment=1 -m githubCommitRef=${{ github.head_ref }}` — without this, a CLI-triggered deployment isn't associated with any git branch server-side, and the branch-scoped override from step 1 would never resolve at runtime (confirmed live). See Vercel's own guidance: [branch-variables-and-domains-not-linked-to-cli-deployments](https://vercel.com/kb/guide/branch-variables-and-domains-not-linked-to-cli-deployments).
3. **Alias** (after `vercel deploy` returns `steps.deploy.outputs.url`): `node scripts/firebase-preview-alias/assign-alias.mjs alias --pr ${{ github.event.pull_request.number }} --url ${{ steps.deploy.outputs.url }} --token ${{ secrets.VERCEL_TOKEN }}` runs `vercel alias set <that-url> retro-rocket-pr-slot-<slot>.vercel.app` to repoint the slot at the newest deployment — passing the token via `${{ secrets.VERCEL_TOKEN }}` the same way every other step in this job already does, not a shell environment variable.

Exit code of `assign-alias.mjs set-redirect` or `assign-alias.mjs alias` failing (including a failed `vercel env add`/`vercel alias set`) MUST fail the CI step (no special-case swallowing), consistent with how 008's `sync-domain.mjs` treats a failed domain sync (its README: "which is what makes FR-007 … work with no special-case handling in the workflow").

**Verified live (2026-08-17)**: reproduced the full pull → set-redirect → deploy (with `-m` flags) → curl sequence outside CI against a real throwaway preview deployment; `GET /api/auth/login/google` correctly redirected with `redirect_uri=https://retro-rocket-pr-slot-1.vercel.app/api/auth/callback/google` and the configured Google Client ID — confirming the mechanism actually works, not just that it passes CI.

## On PR close

No explicit alias-release step is required: the `vercel alias` slot is simply repointed by whichever *next* PR is assigned that same slot number. (Contrast with 008's authorized-domain cleanup, which actively removes an entry — there is no equivalent "orphan" state for the alias itself because it always points at *some* still-open PR or the last PR that held it, never a dangling deployment.)

The branch-scoped `OAUTH_REDIRECT_BASE_URL` Vercel environment variable set in step 1 above is a different story: it's left behind, keyed to a branch name that stops matching anything once the PR's branch is deleted. This is harmless clutter (an orphaned branch-scoped override with no matching branch simply never resolves for any future deployment) rather than a functional or security issue, so — like 008's own orphan-domain cleanup — it's an accepted, on-demand-cleanable limitation rather than something torn down automatically per PR close.

## Known limitation

If more than 5 pull requests have active previews at once, the 6th (and beyond) reuses a slot already assigned to another open PR, and that other PR's sign-in silently starts failing until it redeploys and reclaims a slot. This is the documented boundary of the config-only approach (research.md §1, FR-010, SC-006) — not a defect to silently work around.

## Consumers of this contract

- `.github/workflows/ci.yml`'s `deploy-preview` job (new steps).
- The Google Cloud OAuth Client and GitHub OAuth App consoles used for Preview (manual, one-time).
- `retro-rocket/server/src/http/auth-wiring.ts` / `mcp-wiring.ts` — read-only consumers of the resulting `OAUTH_REDIRECT_BASE_URL` value; unchanged by this feature.

## Change policy

Changing the pool size requires updating both the CI computation (`% 5`) and the set of registered redirect URIs in both OAuth provider consoles in the same change — a mismatch between the two silently reintroduces "sign-in works on some PRs, not others" without an obvious error.
