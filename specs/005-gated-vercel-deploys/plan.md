# Implementation Plan: Gated Vercel Deployments

**Branch**: `005-gated-vercel-deploys` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-gated-vercel-deploys/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Today, Vercel's native GitHub Git integration auto-builds and auto-deploys `retro-rocket` on every pull request (preview) and every push to `main` (production), completely independent of the `checks`/`e2e`/`CodeQL` quality gates already enforced by branch-protection ruleset `main protection` (id `19373841`) — confirmed by the two pre-existing "Preview"/"Production" GitHub Environments having no protection rules and by zero GitHub Actions secrets currently existing for Vercel credentials. This feature replaces that ungated auto-deploy path with a new `.github/workflows/deploy.yml` that waits for the exact three required status checks (`Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, `CodeQL`) to report success for a commit, then deploys via the Vercel CLI — to preview only on `pull_request`, to production only on `push` to `main`. Vercel's automatic Git-triggered deployments are disabled repo-side via `retro-rocket/vercel.json`'s `git.deploymentEnabled: false`, making the new workflow the sole deployment trigger.

## Technical Context

**Language/Version**: YAML for the new/edited GitHub Actions workflow and `vercel.json` config; no TypeScript/application source code changes. Node 22 (already used by CI) is used only to install the `vercel` CLI in the new workflow.

**Primary Dependencies**: Official `vercel` CLI (npm-installed in CI, not an app dependency); a proven "wait for GitHub check" Action (e.g. `lewagon/wait-on-check-action`) to poll the three existing required checks by name rather than re-implementing check/severity polling; the existing `pull_request`/`push` triggers already used by `ci.yml`/`codeql.yml`.

**Storage**: N/A — no Firestore/data-model changes; this feature only touches CI/CD workflow and Vercel project configuration.

**Testing**: Existing Vitest (unit/coverage) and Playwright (E2E) suites are unchanged in content; they are the very quality gates this feature waits on, validated here only by confirming the deploy workflow correctly reacts to their pass/fail outcome.

**Target Platform**: GitHub Actions (`ubuntu-latest`) for the new `deploy.yml` workflow; Vercel platform for hosting (the pre-existing "Preview" and "Production" GitHub Environments/Vercel project).

**Project Type**: Web application (single project, `retro-rocket/`) — this is infrastructure/pipeline work, not a new application feature; no UI/component surface is touched.

**Performance Goals**: Once all three required checks reach a completed, passing state for a commit, the corresponding deployment MUST start promptly — the wait step should poll on the order of seconds, not minutes, so the gate itself adds negligible perceived delay beyond the checks' own runtime.

**Constraints**: MUST NOT introduce a manual/human approval step (FR-008); MUST reuse the exact severity threshold already enforced by branch-protection's `code_scanning` rule (`security_alerts_threshold: high_or_higher`) rather than re-implementing CodeQL severity logic (FR-007) — achieved by waiting on the same `CodeQL` check name branch protection already depends on, not the `codeql-action` job's own exit code; MUST fully separate preview vs. production targets per trigger (FR-003/FR-004); Vercel's existing automatic Git-triggered deployments MUST be disabled so the new workflow is the only deployment path (otherwise an ungated deployment could still occur in parallel, silently violating FR-001/FR-002).

**Scale/Scope**: Single Vercel project (`retro-rocket/`), two environments (Preview, Production), two trigger events in scope (`pull_request` → `main`, `push` → `main`); no other branches/events are affected (per spec Assumptions).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Section | Status | Notes |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | N/A | No new application logic is being written; this feature changes CI/CD workflow config and Vercel project config, not testable production code paths. |
| II. Library-First | N/A | No new feature module/capability is added to `src/features` or `src/lib`. |
| III. Prefer Proven Third-Party Libraries | PASS | Uses the official `vercel` CLI and an established, actively-maintained "wait for check" GitHub Action instead of a hand-rolled polling script or custom CodeQL-severity parser. |
| IV. SOLID | N/A | No domain/service code touched. |
| V. Simplicity (KISS/YAGNI) | PASS | Reuses the exact three check names branch protection already depends on instead of duplicating severity/pass-fail logic; adds one new workflow file following the existing per-concern pattern (`ci.yml`, `codeql.yml`, now `deploy.yml`) rather than restructuring existing workflows. |
| VI. Mandatory Unit Testing & Coverage Floor | PASS (unaffected) | Coverage thresholds and their enforcement in `ci.yml` are untouched; this feature only consumes that check's pass/fail result. |
| VII. E2E Testing with Playwright | PASS (unaffected) | The Playwright job is untouched; this feature only consumes that check's pass/fail result. |
| Development Workflow & Quality Gates | PASS | This feature does not weaken, bypass, or redefine any existing required check or severity threshold — it adds a new, additive consumer (deployment) of the same gate that already blocks merge. No reversal of the constitution's push/PR-gate model from 004 (v3.0.0) is involved. |

Initial gate result: **PASS** — no violations, no Complexity Tracking entries required. Proceeding to Phase 0.

**Post-Phase 1 re-check**: Design artifacts (research.md, data-model.md, contracts/, quickstart.md) introduce no new application code and no dependency beyond the official `vercel` CLI and one established wait-for-check Action (both justified under Principle III). No additional constitution conflicts identified. Gate result unchanged: **PASS**.

*Observational note (non-blocking)*: the constitution's "Development Workflow & Quality Gates" section currently describes required checks only in terms of merge-blocking. A future `/speckit-constitution` MINOR amendment could optionally document that the same checks now also gate deployment — this is a governance-documentation nicety, not a required companion change, since no existing rule is violated or reversed.

## Project Structure

### Documentation (this feature)

```text
specs/005-gated-vercel-deploys/
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
    ├── ci.yml              # existing, unchanged: still produces the "Type-check, lint, and test with coverage" and "Playwright E2E (Firebase Emulator Suite)" checks
    ├── codeql.yml          # existing, unchanged: still produces the severity-gated "CodeQL" check
    └── deploy.yml          # new: waits for the three checks above on the triggering commit, then deploys via the Vercel CLI — preview job on pull_request, production job on push to main

retro-rocket/
└── vercel.json          # edited: adds "git": { "deploymentEnabled": false } to disable Vercel's native auto-deploy, making deploy.yml the sole deployment trigger
```

**Structure Decision**: This feature makes no changes inside `retro-rocket/src`. It adds one new GitHub Actions workflow file (`deploy.yml`), following the repository's existing one-file-per-concern pattern, plus one edited configuration file (`retro-rocket/vercel.json`). No new `src/`, `tests/`, `backend/`, or `frontend/` directories are introduced, and `ci.yml`/`codeql.yml` are not modified — `deploy.yml` only consumes their check results by name.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations identified — this table is intentionally left empty.
