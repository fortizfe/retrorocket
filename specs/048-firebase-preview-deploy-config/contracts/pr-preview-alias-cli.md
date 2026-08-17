# Contract: PR Preview Alias Slot Assignment

This fixes the mechanism that gives each pull request's preview a stable, pre-registerable sign-in address, without any application code change (research.md §1). It is the counterpart, for OAuth redirect purposes, to 008's `sync-domain.mjs` — but targets a fixed alias pool via `vercel alias`, not a per-PR-growing list, because neither OAuth provider exposes a redirect-URI management API.

## One-time manual setup (not automated, not per-PR)

1. Choose a pool size (default **5**) and reserve that many `*.vercel.app` alias hostnames, e.g. `retro-rocket-pr-slot-1.vercel.app` … `retro-rocket-pr-slot-5.vercel.app`.
2. In the Google Cloud Console (OAuth Client used for Preview) and the GitHub OAuth App used for Preview, register `https://retro-rocket-pr-slot-{1..5}.vercel.app/api/auth/callback/google` and `.../api/auth/callback/github` respectively as authorized/callback redirect URIs — all 5, once.

## Per-PR CI behavior (`.github/workflows/ci.yml`, `deploy-preview` job)

Implemented by `retro-rocket/scripts/firebase-preview-alias/assign-alias.mjs` (Vitest-tested, mirroring 008's `sync-domain.mjs` — see plan.md Technical Context), invoked twice from the workflow rather than left as inline CLI calls:

1. **Compute + inject** (between `vercel pull` and `vercel build`): `node scripts/firebase-preview-alias/assign-alias.mjs compute --pr ${{ github.event.pull_request.number }}` prints `slot = (pr_number % 5) + 1` and the corresponding `OAUTH_REDIRECT_BASE_URL=https://retro-rocket-pr-slot-<slot>.vercel.app`, which the workflow step appends to `.vercel/.env.preview.local` as a build-time override (does not touch the persistent Vercel-stored value). That file lands at the **repository root**, not inside `retro-rocket/`, even though the Vercel project's Root Directory is `retro-rocket` — `vercel pull` in this job runs from the repo root (same reason `deploy-preview`'s other steps don't use `working-directory: retro-rocket`, per the comment above this job in `ci.yml`) and writes its output there. This tripped up the first implementation attempt (fixed the same day it was written, before merge).
2. **Alias** (after `vercel deploy` returns `steps.deploy.outputs.url`): `node scripts/firebase-preview-alias/assign-alias.mjs alias --pr ${{ github.event.pull_request.number }} --url ${{ steps.deploy.outputs.url }} --token ${{ secrets.VERCEL_TOKEN }}` runs `vercel alias set <that-url> retro-rocket-pr-slot-<slot>.vercel.app` to repoint the slot at the newest deployment — passing the token via `${{ secrets.VERCEL_TOKEN }}` the same way every other step in this job already does, not a shell environment variable.

Exit code of `assign-alias.mjs alias` failing (including a failed `vercel alias set`) MUST fail the CI step (no special-case swallowing), consistent with how 008's `sync-domain.mjs` treats a failed domain sync (its README: "which is what makes FR-007 … work with no special-case handling in the workflow").

## On PR close

No explicit release step is required: the slot is simply repointed by whichever *next* PR is assigned that same slot number. (Contrast with 008's authorized-domain cleanup, which actively removes an entry — there is no equivalent "orphan" state here because the alias always points at *some* still-open PR or the last PR that held it, never a dangling deployment.)

## Known limitation

If more than 5 pull requests have active previews at once, the 6th (and beyond) reuses a slot already assigned to another open PR, and that other PR's sign-in silently starts failing until it redeploys and reclaims a slot. This is the documented boundary of the config-only approach (research.md §1, FR-010, SC-006) — not a defect to silently work around.

## Consumers of this contract

- `.github/workflows/ci.yml`'s `deploy-preview` job (new steps).
- The Google Cloud OAuth Client and GitHub OAuth App consoles used for Preview (manual, one-time).
- `retro-rocket/server/src/http/auth-wiring.ts` / `mcp-wiring.ts` — read-only consumers of the resulting `OAUTH_REDIRECT_BASE_URL` value; unchanged by this feature.

## Change policy

Changing the pool size requires updating both the CI computation (`% 5`) and the set of registered redirect URIs in both OAuth provider consoles in the same change — a mismatch between the two silently reintroduces "sign-in works on some PRs, not others" without an obvious error.
