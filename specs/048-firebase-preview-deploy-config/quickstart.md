# Quickstart: Validating Working Preview Deployments

This is the live verification User Story 3 / FR-009 require — there is no automated test suite for this feature (research.md, Testing). Run this after applying the configuration in [contracts/](./contracts/).

## Known blocker (as of 2026-08-17, deliberately kept as-is by the user)

This project's Vercel Deployment Protection is currently set to `prod_deployment_urls_and_all_previews` — **every** preview URL redirects an unauthenticated visitor to a Vercel login before any of the scenarios below can even begin. This is a Vercel project access-control setting, not something this feature's Preview environment variables touch, and — per Vercel's own plan limits — there's no way to leave it in place for production while opening only previews; the only lever is disabling protection project-wide, which the user opted not to do (spec.md Edge Cases has the full reasoning). Until that changes, Scenarios 1–5 below can only be run by someone with access to this project's Vercel team.

## Prerequisites

- All items in [contracts/firebase-staging-project-checklist.md](./contracts/firebase-staging-project-checklist.md) are checked off.
- All Preview-scoped Vercel environment variables in [contracts/preview-environment-variables.md](./contracts/preview-environment-variables.md) are set.
- The PR Preview Alias Slot pool is registered per [contracts/pr-preview-alias-cli.md](./contracts/pr-preview-alias-cli.md), and `.github/workflows/ci.yml`'s `deploy-preview` job has the corresponding new steps.
- The GitHub Actions secrets in `data-model.md` ("Deployment Credential") are confirmed present.

## Scenario 1 — A single PR's preview loads and works (User Story 1)

1. Open a small pull request against `main` (any trivial change is fine — this is validating environment wiring, not app logic).
2. Wait for `analyze`, `checks`, `e2e`, and `deploy-preview` to succeed, then for `sync-preview-domain` to succeed.
3. Open the preview URL posted in the PR's sticky comment.
4. **Expected**: the app loads with no environment-configuration error (spec.md Acceptance Scenario 1.1).
5. Create a retro board on the preview.
6. **Expected**: the board is visible only in `retrorocket-staging`'s Firestore (spot-check the Firebase console), never in the production project (Acceptance Scenario 1.2, SC-003).

## Scenario 2 — Sign-in works on that same PR's preview (User Story 2)

1. On the same preview, sign in with Google.
2. **Expected**: the sign-in completes and lands in an authenticated session (Acceptance Scenario 2.1), within 2 minutes of the preview being reported ready (SC-002).
3. Repeat with GitHub sign-in (Acceptance Scenario 2.2).
4. If either fails: capture the exact failure (browser console error, `/api/auth/callback/*` response status, which OAuth redirect URI was sent) — this is the diagnosis FR-010/§5 of research.md calls for, not something to patch around.

## Scenario 3 — Two concurrent PRs don't interfere (SC-004, Acceptance Scenario 2.3)

1. Open a second pull request while the first is still open.
2. Repeat Scenario 2 on the second PR's preview.
3. **Expected**: both PRs' previews sign in independently; go back to the first PR's preview and confirm its session still works (no slot collision, assuming pool size 5 and only 2 PRs open).

## Scenario 4 — Full path with no manual intervention (User Story 3, Acceptance Scenario 1)

1. Open a brand-new pull request from scratch, touching nothing about this feature's own configuration.
2. Confirm Scenarios 1 and 2 both pass without anyone touching the Firebase console, a GitHub secret, or a Vercel environment variable by hand for this specific PR.

## Scenario 5 — A missing/invalid piece fails loudly, not mysteriously (SC-005, Acceptance Scenario 2)

1. Temporarily remove or corrupt one Preview-scoped variable (e.g. rename `FIREBASE_SERVICE_ACCOUNT`) in a disposable test, or review recent failed runs if one already exists.
2. **Expected**: the resulting preview failure (or degraded sign-in) is attributable to that specific piece — e.g. an `auth_disabled` log line naming the missing credential — not an unexplained blank page.
3. Restore the variable.

## What "done" looks like

Scenarios 1–4 all pass on real, freshly-opened pull requests, and production (checked via the live production app, unaffected throughout) shows zero impact from any of the above (SC-003). If Scenario 2 or 3 cannot be made to pass even after the configuration in contracts/ is fully applied, write up the specific observed gap and hand it off as a follow-up feature per FR-010/SC-006 rather than expanding this feature's scope into a code change.
