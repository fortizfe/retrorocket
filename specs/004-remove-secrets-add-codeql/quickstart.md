# Quickstart: Validating the Purge & CodeQL Gate

## Prerequisites

- `git filter-repo` installed locally (`brew install git-filter-repo` or `pipx install git-filter-repo`)
- `gh` CLI authenticated against this repository
- A fresh local clone/mirror of the repository, separate from any working clone with in-progress changes
- Explicit go-ahead from the repository owner before force-pushing rewritten history to `main` (destructive, shared-history operation — see plan.md Constraints)

## Part 1 — Verify the history purge (User Story 1)

1. Confirm the file currently exists in history before the fix, as a baseline:
   ```sh
   git log --all --oneline -- retro-rocket/.env.production
   ```
   Expected (pre-fix): shows `ca29f84` (the commit that originally added it).

2. Perform the rewrite on a fresh mirror clone (per research.md §1–§2):
   ```sh
   git clone --mirror https://github.com/fortizfe/retrorocket.git retrorocket-purge.git
   cd retrorocket-purge.git
   git filter-repo --path retro-rocket/.env.production --invert-paths
   ```

3. Push the rewritten history and remove the stale merged branches:
   ```sh
   git push --force origin main
   git push origin --delete 001-restructure-project-files 002-constitution-compliance 003-scripts-cleanup-ci-trigger
   ```

4. Validate — from a brand-new clone (not the mirror used to rewrite):
   ```sh
   git clone https://github.com/fortizfe/retrorocket.git retrorocket-verify
   cd retrorocket-verify
   git log --all --oneline -- retro-rocket/.env.production
   ```
   **Expected**: no output (SC-001, SC-002).

5. File a GitHub Support request to purge cached views of the removed commits (research.md §3), and rotate the exposed Firebase credentials in the Firebase console (spec Assumptions) — both tracked as follow-up actions outside git itself.

## Part 2 — Verify the CodeQL quality gate (User Story 2)

1. Confirm `.github/workflows/codeql.yml` exists with `on: pull_request` (to `main`) and `on: push` (to `main`), and that `.github/workflows/ci.yml`'s `checks`/`e2e` jobs now also trigger on `pull_request`.

2. Confirm branch protection on `main` requires: the `checks` job, the `e2e` job, and CodeQL code scanning results at High severity (contracts/required-status-checks.md):
   ```sh
   gh api repos/fortizfe/retrorocket/branches/main/protection
   ```

3. Negative test — open a PR introducing a deliberate High-severity issue (e.g., a trivially-detectable command-injection or hardcoded-credential pattern in a throwaway file), and confirm:
   - The CodeQL check appears on the PR and reports the finding.
   - The PR is blocked from merging (merge button disabled / required check failing).

4. Positive test — remove the deliberate issue (or open a clean PR) and confirm:
   - `checks`, `e2e`, and the CodeQL check all pass.
   - The PR becomes mergeable (SC-003, SC-004).

5. Regression check — confirm the existing coverage thresholds and Playwright suite still gate the PR exactly as they did on push-to-`main` before this change (SC-005): intentionally drop unit test coverage or break an E2E flow in a throwaway branch and confirm the PR is blocked by that existing check, not just by CodeQL.

## Cleanup

- Delete the throwaway test PR(s)/branches created in steps 3–5 of Part 2.
- Delete the local mirror clone (`retrorocket-purge.git`) used for the rewrite once verified.
