# Contract: Required Status Checks on `main`

This feature has no public API/library surface. Its externally-observable "interface" is the set of named GitHub Actions checks that branch protection on `main` depends on. This contract fixes those names so branch-protection configuration and the workflow files stay in sync.

## Required checks (pull_request → `main`)

| Check name | Source workflow | Blocks merge when |
|---|---|---|
| `Type-check, lint, and test with coverage` | `.github/workflows/ci.yml` (`checks` job) | Type-check, lint, or `test:coverage` fails, or coverage drops below the thresholds in `vitest.config.ts` |
| `Playwright E2E (Firebase Emulator Suite)` | `.github/workflows/ci.yml` (`e2e` job) | Any Playwright test against the Firebase Emulator Suite fails |
| CodeQL code scanning result (`javascript-typescript`) | `.github/workflows/codeql.yml` | A newly-introduced finding at High or Critical severity is present on the PR's head commit (enforced via the branch-protection "Require code scanning results" rule, not the workflow's own exit code) |

## Consumers of this contract

- **GitHub branch protection settings for `main`**: must list the `checks` and `e2e` job names above as required status checks, and must enable "Require code scanning results" scoped to the CodeQL tool at minimum severity High.
- **`.specify/memory/constitution.md`** ("Development Workflow & Quality Gates"): must describe this same set of required checks as the enforcement mechanism, replacing the current push-to-`main`-only description.

## Change policy

Renaming any of the jobs above (or the workflow's `name:` fields they derive from) requires updating the branch-protection required-checks list in the same change — a renamed job that isn't re-registered as required silently stops gating merges.
