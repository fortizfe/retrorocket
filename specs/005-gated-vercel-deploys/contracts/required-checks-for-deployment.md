# Contract: Required Checks Consumed by the Deployment Gate

This feature has no public API/library surface. Its externally-observable "interface" is the set of named GitHub Actions/code-scanning checks that `deploy.yml` waits on before deploying. This contract fixes those names so the deploy workflow and branch-protection configuration stay in sync — it deliberately reuses, rather than duplicates, the contract already fixed by feature 004's `required-status-checks.md`.

## Checks the deploy gate waits on (per commit)

| Check name | Source | Deploy gate behavior |
|---|---|---|
| `Type-check, lint, and test with coverage` | `.github/workflows/ci.yml` (`checks` job) | `deploy.yml` waits for `conclusion: success` on the triggering commit's SHA before deploying. |
| `Playwright E2E (Firebase Emulator Suite)` | `.github/workflows/ci.yml` (`e2e` job) | `deploy.yml` waits for `conclusion: success` on the triggering commit's SHA before deploying. |
| `CodeQL` | GitHub Advanced Security app (populated via `.github/workflows/codeql.yml`'s `codeql-action` steps, severity-thresholded by branch-protection's `code_scanning` rule) | `deploy.yml` waits for `conclusion: success` on the triggering commit's SHA — this is the severity-aware result (High/Critical blocks), not the `codeql-action` job's own exit status. |

## Deployment routing per trigger

| Trigger | Waits on checks for | Deploys to | Never deploys to |
|---|---|---|---|
| `pull_request` (→ `main`) | `github.event.pull_request.head.sha` | Preview | Production |
| `push` (→ `main`) | `github.sha` | Production | Preview |

## Consumers of this contract

- **`.github/workflows/deploy.yml`** (new): its wait step(s) reference the three check names above by exact string; a rename of any job/check breaks the wait step silently (it would hang until timeout rather than fail fast), so renames MUST update this file in the same change.
- **GitHub repository ruleset "main protection" (id `19373841`)**: already the source of truth for these three names (see feature 004's `required-status-checks.md`); this feature does not modify the ruleset, it only reads the same names.
- **`retro-rocket/vercel.json`**: `git.deploymentEnabled: false` ensures no deployment can bypass the wait step above via Vercel's native auto-deploy path.

## Change policy

Renaming any of the three checks above (or the workflow `name:`/job `name:` fields they derive from) requires updating `deploy.yml`'s wait step(s) in the same change as any branch-protection update — otherwise the deploy workflow silently stops gating (waits forever on a check name that no longer exists) rather than failing loudly.
