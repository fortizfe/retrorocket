# Contract: Required Status Checks on `main`

This feature has no public API/library surface. Its externally-observable "interface" is the set of named GitHub Actions checks that branch protection on `main` depends on. This contract fixes those names so branch-protection configuration and the workflow files stay in sync.

## Required checks (pull_request → `main`)

| Check name | Source workflow | Blocks merge when |
|---|---|---|
| `Type-check, lint, and test with coverage` | `.github/workflows/ci.yml` (`checks` job) | Type-check, lint, or `test:coverage` fails, or coverage drops below the thresholds in `vitest.config.ts` |
| `Playwright E2E (Firebase Emulator Suite)` | `.github/workflows/ci.yml` (`e2e` job) | Any Playwright test against the Firebase Emulator Suite fails |
| `CodeQL` | `.github/workflows/codeql.yml` (owned by the "GitHub Advanced Security" app, not the workflow job itself) | A newly-introduced finding at High or Critical severity is present on the PR's head commit (enforced via the branch-protection `code_scanning` rule, not the workflow's own exit code) |

**Verified naming note**: the workflow job in `codeql.yml` is named `CodeQL Analysis` (a `GitHub Actions`-app check reflecting only whether the `codeql-action` steps ran successfully). GitHub separately creates a `CodeQL` check (app: `GitHub Advanced Security`) that reflects the actual alert/severity outcome — **this is the one branch protection's severity gate references**, not `CodeQL Analysis`. Confirmed live on PR #5 (2026-07-21): `CodeQL Analysis` stayed `pass` throughout, while `CodeQL` went to `fail` once a High-severity finding was introduced, with output "New alerts in code changed by this pull request: 1 high".

## Consumers of this contract

- **GitHub repository ruleset "main protection" (id `19373841`)**: extended (not replaced) with a `required_status_checks` rule listing the `checks`/`e2e` job names above plus `CodeQL`, and a `code_scanning` rule (`security_alerts_threshold: high_or_higher`) — added alongside its pre-existing `deletion` and `non_fast_forward` rules, which were left untouched.
- **`.specify/memory/constitution.md`** ("Development Workflow & Quality Gates"): describes this same set of required checks as the enforcement mechanism (amended to v3.0.0, replacing the push-to-`main`-only description).

## Change policy

Renaming any of the jobs above (or the workflow's `name:` fields they derive from) requires updating the branch-protection required-checks list in the same change — a renamed job that isn't re-registered as required silently stops gating merges.
