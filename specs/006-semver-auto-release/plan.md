# Implementation Plan: Automated Semantic Versioning on Main

**Branch**: `006-semver-auto-release` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-semver-auto-release/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a fourth, final job (`version`) to the existing `.github/workflows/ci.yml`, scoped strictly to `push` events on `main` and gated on all three required quality gates (`checks`, `e2e` via `needs:`, `CodeQL` via the same `wait-on-check-action` pattern `deploy.yml` already uses for that external workflow). The job runs `semantic-release` (commit-analyzer + npm + git plugins only, no changelog/GitHub-release plugins) to compute the next SemVer bump from Conventional Commits since the last `v*.*.*` tag, write the result into both `retro-rocket/package.json` and `retro-rocket/package-lock.json`, and commit + tag it back to `main` with a `[version bump]`-marked commit message. That marker is used by two targeted `if:` skip conditions — on the `version` job itself and on `deploy.yml`'s `deploy-production` job — so the bump commit doesn't re-trigger versioning or cause a redundant production redeploy, while the three quality gates still run normally against it. The `0.1.0` baseline is established once via a manual bootstrap (edit `package.json`/`package-lock.json` to `0.1.0`, merge, then tag that commit `v0.1.0`) rather than via runtime "is this the first run?" branching in the workflow.

## Technical Context

**Language/Version**: YAML for the edited `.github/workflows/ci.yml` and `.github/workflows/deploy.yml`, plus a small `semantic-release` config file (`retro-rocket/.releaserc.json` or equivalent); Node 22 (already used by `ci.yml`) runs `npx semantic-release` in the new job. No application TypeScript/React source code changes.

**Primary Dependencies**: `semantic-release` (core) with `@semantic-release/commit-analyzer`, `@semantic-release/npm`, and `@semantic-release/git` only — installed as a CI-only devDependency or via `npx` in the workflow, not shipped in the application bundle; the existing `lewagon/wait-on-check-action` (already used by `deploy.yml`) for waiting on the external `CodeQL` check.

**Storage**: N/A — no Firestore/data-model changes; this feature only touches CI workflow files, `retro-rocket/package.json`, and `retro-rocket/package-lock.json`.

**Testing**: Existing Vitest (unit/coverage) and Playwright (E2E) suites are unchanged; they are two of the three gates this feature waits on. Validated here via the manual `quickstart.md` scenarios (push commits of each Conventional Commit type and inspect the resulting version/tag/commit), not new automated test suites — this is infrastructure/pipeline work, consistent with how feature 005 validated `deploy.yml`.

**Target Platform**: GitHub Actions (`ubuntu-latest`), extending the existing `ci.yml` and `deploy.yml` workflows.

**Project Type**: Web application (single project, `retro-rocket/`) — infrastructure/pipeline work, no UI/component surface touched.

**Performance Goals**: The `version` job should add negligible wall-clock time beyond the three gates' own runtime — `semantic-release`'s dry computation and a single commit+tag push are sub-second to low-seconds operations once the gates have already completed.

**Constraints**: MUST NOT introduce a manual/human approval step (FR-011); MUST NOT run for pull requests or non-`main` branches (FR-001, SC-005); MUST NOT recompute or re-tag on its own bump commit (FR-009) and MUST NOT let that commit trigger a new production deployment (FR-010) — both via the `[version bump]` marker (research.md §4), explicitly *not* GitHub's built-in `[skip ci]` keywords, since those would also suppress the three required gates on that commit; the `version` job needs `permissions: contents: write` (repo default is `read` — confirmed via `gh api .../actions/permissions/workflow`) and a full-history checkout (`fetch-depth: 0`) since `semantic-release` must see all prior tags/commits (FR-006, FR-012); `main` currently has no branch-protection rule (confirmed via `gh api .../branches/main/protection` → 404), so a direct push from the workflow's token is possible today — if branch protection requiring PR review is added later, this mechanism would need revisiting.

**Scale/Scope**: Single repository, one existing CI workflow gains one new job, one existing deploy workflow gains one new skip condition; no other branches/events affected (per spec Assumptions).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Section | Status | Notes |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | N/A | No new application logic; this feature changes CI/CD workflow config and adds a config-driven third-party tool (`semantic-release`), not testable production code paths. |
| II. Library-First | N/A | No new feature module/capability is added to `src/features` or `src/lib`. |
| III. Prefer Proven Third-Party Libraries | PASS | Uses the established `semantic-release` tool (with only its `commit-analyzer`/`npm`/`git` plugins) instead of a hand-rolled Conventional-Commits parser and version-bump script (research.md §1). |
| IV. SOLID | N/A | No domain/service code touched. |
| V. Simplicity (KISS/YAGNI) | PASS | Reuses `ci.yml`'s existing `needs:` job dependencies for two of the three gates and the exact `wait-on-check-action` pattern already proven in `deploy.yml` for the third, rather than inventing a new waiting mechanism; the `0.1.0` baseline is a one-time manual bootstrap instead of permanent "first run" branching logic that would become dead code (research.md §2). |
| VI. Mandatory Unit Testing & Coverage Floor | PASS (unaffected) | Coverage thresholds and their enforcement in `ci.yml`'s `checks` job are untouched; the new `version` job only consumes that job's success via `needs:`. |
| VII. E2E Testing with Playwright | PASS (unaffected) | The Playwright job is untouched; the new `version` job only consumes its success via `needs:`. |
| Development Workflow & Quality Gates | PASS | Does not weaken, bypass, or redefine any existing required check or severity threshold — it adds a new, additive consumer (versioning) of the same three gates that already block merge/deployment, matching the pattern feature 005 already established for deployment. |

Initial gate result: **PASS** — no violations, no Complexity Tracking entries required. Proceeding to Phase 0.

**Post-Phase 1 re-check**: Design artifacts (research.md, data-model.md, contracts/, quickstart.md) introduce no new application code and exactly one new dependency family (`semantic-release` + its three named plugins), justified under Principle III. No additional constitution conflicts identified. Gate result unchanged: **PASS**.

*Observational note (non-blocking)*: the constitution's "Development Workflow & Quality Gates" section describes the three required checks only in terms of merge-blocking (and, since feature 005, deployment-gating). A future `/speckit-constitution` MINOR amendment could optionally document that the same checks now also gate the version-bump phase — a governance-documentation nicety, not a required companion change, since no existing rule is violated or reversed.

## Project Structure

### Documentation (this feature)

```text
specs/006-semver-auto-release/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    ├── ci.yml              # edited: adds the new `version` job (needs: [checks, e2e] + wait for CodeQL),
    │                       # gated to push-to-main only, running semantic-release
    ├── codeql.yml          # existing, unchanged: still produces the "CodeQL" check the version job waits on
    └── deploy.yml          # edited: `deploy-production` job gains a `[version bump]` skip condition

retro-rocket/
├── package.json          # bootstrapped to 0.1.0 once, then updated by the automated bump commit thereafter
├── package-lock.json      # same
└── .releaserc.json        # new: semantic-release config (commit-analyzer + npm + git plugins only)
```

**Structure Decision**: This feature makes no changes inside `retro-rocket/src`. It adds one new job to the existing `ci.yml` (following the one-job-per-concern pattern already used there) rather than a new sibling workflow file, adds one new config file (`retro-rocket/.releaserc.json`) for `semantic-release`, and adds one small skip condition to the existing `deploy.yml`. `codeql.yml` is not modified — the new job only consumes its check result by name, matching feature 005's precedent.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations identified — this table is intentionally left empty.
