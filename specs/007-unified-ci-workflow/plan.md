# Implementation Plan: Unified CI Pipeline Workflow

**Branch**: `007-unified-ci-workflow` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-unified-ci-workflow/spec.md`

## Summary

Collapse the three existing GitHub Actions workflow files (`ci.yml`, `codeql.yml`, `deploy.yml`) into a single `ci.yml` that expresses the whole release process as one job dependency graph: a parallel quality-check stage (CodeQL analysis, type-check/lint/test-with-coverage, Playwright E2E) gates a deploy stage (preview on pull request, production on push to `main`), which in turn gates the existing semantic-release versioning stage. Sequencing is expressed with native GitHub Actions `needs:` job dependencies instead of the current polling-based `wait-on-check-action` approach, since every job now lives in the same workflow run. `codeql.yml` and `deploy.yml` are deleted once their jobs are folded in. Per the resolved clarification, the CodeQL stage's gate is job-success only (the analyze job completing without error) — severity-based merge blocking (High/Critical findings) remains the sole responsibility of the existing, separate branch-protection code-scanning check and is untouched by this change.

## Technical Context

**Language/Version**: YAML workflow definitions for GitHub Actions; job steps run on Node.js 22 (matches existing `actions/setup-node@v4` config in all three current workflows)

**Primary Dependencies**: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-java@v4` (temurin 21, required by the Firestore/Auth emulators the E2E job depends on), `github/codeql-action/init@v3` + `.../analyze@v3`, Vercel CLI (`vercel pull`/`vercel build`/`vercel deploy`), `npx semantic-release` (config already in `retro-rocket/.releaserc.json`), `marocchino/sticky-pull-request-comment@v3.0.5` (preview URL PR comment). `lewagon/wait-on-check-action@v1.8.1` is removed — it becomes redundant once every job is a `needs:` dependency inside one workflow run.

**Storage**: N/A (no application data touched by this feature)

**Testing**: Vitest (`npm run test:coverage`, thresholds enforced via `retro-rocket/vitest.config.ts`) and Playwright (`npm run e2e`, run against the Firebase Auth/Firestore emulators) — both reused unchanged from the current `checks` and `e2e` jobs

**Target Platform**: GitHub Actions `ubuntu-latest` runners (unchanged)

**Project Type**: Single existing web application (Vite/React) — this feature only changes repository CI/CD configuration under `.github/workflows/`; no application source code changes

**Performance Goals**: No regression in end-to-end pipeline wall-clock time versus today; removing `wait-on-check-action` polling (which re-checks every ~15s up to a 15-minute timeout) in favor of native `needs:` job dependencies should, if anything, reduce latency between stages since GitHub schedules the dependent job immediately on completion rather than on the next poll tick

**Constraints**: Existing required-status-check job names referenced by branch-protection rules (`Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, and the CodeQL code-scanning check) MUST be preserved exactly as-is in the consolidated workflow, so branch protection keeps matching checks with zero manual reconfiguration (see Structure Decision below and FR-012 in the spec)

**Scale/Scope**: Single repository; 3 workflow files → 1; job count is preserved (analyze, checks, e2e, deploy-preview, deploy-production, version), only their trigger/dependency wiring changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TDD (NON-NEGOTIABLE)**: N/A — this feature changes CI/CD configuration, not application/business logic; there is no production code path requiring a preceding failing test. PASS (not applicable).
- **II. Library-First**: N/A — no new feature capability is added to `src/features` or `src/lib`. PASS (not applicable).
- **III. Prefer Proven Third-Party Libraries**: PASS — reuses only already-adopted, maintained GitHub Actions (`actions/checkout`, `actions/setup-node`, `actions/setup-java`, `github/codeql-action`, `marocchino/sticky-pull-request-comment`) and CLIs (Vercel CLI, semantic-release); actually *removes* a third-party dependency (`lewagon/wait-on-check-action`) rather than adding one.
- **IV. SOLID**: N/A — not application/domain code.
- **V. Simplicity (KISS + YAGNI)**: PASS, and directly advanced — consolidating 3 files/workflows with duplicated checkout/setup-node steps into 1 file with a single dependency graph is a simplification, not an addition of speculative flexibility.
- **VI. Mandatory Unit Testing & Coverage Floor**: PASS — the `checks` job's `npm run test:coverage` step and `vitest.config.ts` thresholds are carried over unchanged; this feature does not touch coverage enforcement.
- **VII. E2E Testing with Playwright**: PASS — the `e2e` job's Playwright suite (via Firebase Emulator Suite) is carried over unchanged.
- **Development Workflow & Quality Gates** (repo-specific section): PASS with one explicit constraint captured above — CI continues to run the full check suite plus CodeQL on both `pull_request` and `push to main`; branch protection's three required status checks continue to be produced by the consolidated workflow under their existing names, so no branch-protection reconfiguration is forced by this change. Severity-based CodeQL merge-blocking (High/Critical) is explicitly out of scope for this pipeline's own gating logic (per spec Clarifications) and remains branch protection's responsibility, unchanged.

No violations identified. No entries required in Complexity Tracking.

*Post-Phase-1 re-check (after research.md/data-model.md/contracts/quickstart.md were drafted)*: design artifacts introduce no new dependencies, no new application code paths, and no renamed required-status checks — the gate re-evaluation above still holds. PASS.

## Project Structure

### Documentation (this feature)

```text
specs/007-unified-ci-workflow/
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
    ├── ci.yml           # MODIFIED: becomes the single consolidated workflow
    │                    #   (jobs: analyze, checks, e2e, deploy-preview,
    │                    #    deploy-production, version — wired with `needs:`)
    ├── codeql.yml        # REMOVED — its `analyze` job folds into ci.yml
    └── deploy.yml        # REMOVED — its deploy-preview/deploy-production
                          #   jobs fold into ci.yml, `wait-on-check-action`
                          #   steps replaced by native `needs:`

retro-rocket/              # unchanged — existing app source, tests, and
                          #   `.releaserc.json` are consumed as-is by the
                          #   consolidated workflow, no app code changes
```

**Structure Decision**: This is a CI/CD-configuration-only change confined to `.github/workflows/`. There is no frontend/backend or multi-project split to choose between — the existing single-project (Vite/React app in `retro-rocket/`) structure is untouched. The only structural decision is within the workflow file itself: all six jobs (`analyze`, `checks`, `e2e`, `deploy-preview`, `deploy-production`, `version`) live in one `ci.yml`, wired together with `needs:` so GitHub Actions' own scheduler enforces "next stage only runs if the previous stage succeeded" — replacing the current cross-workflow polling (`wait-on-check-action`) with native same-workflow job dependencies. Job names are preserved verbatim from today's workflows so branch protection's required status checks keep matching without reconfiguration.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
