# Implementation Plan: Purge Leaked Secrets & Add CodeQL Quality Gate

**Branch**: `004-remove-secrets-add-codeql` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-remove-secrets-add-codeql/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Two independent hardening changes to the `retrorocket` repository: (1) permanently purge the `.env.production` file (leaked Firebase credentials) from every commit reachable in the repository's history — not just from current tracking — by rewriting history with `git filter-repo`, force-pushing the result, removing now-orphaned stale remote branches, and requesting GitHub purge the residual cached views; and (2) reintroduce a pull-request-triggered CI gate (currently push-to-`main`-only per constitution v2.0.0) that adds a GitHub CodeQL static analysis job alongside the existing type-check/lint/test/e2e jobs, enforced via branch protection's native "Require code scanning results" rule at High/Critical severity, with only newly-introduced findings in a PR's diff counting toward the block.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 22 (existing `retro-rocket` app); YAML for GitHub Actions workflow changes; shell for the one-time history-rewrite operation

**Primary Dependencies**: `git filter-repo` (one-time history rewrite tool, dev-machine only, not a project dependency); `github/codeql-action` (GitHub Actions CodeQL init/analyze steps); GitHub repository/branch-protection settings (via `gh api` or GitHub UI) — no new application-level (npm) dependency is introduced

**Storage**: N/A — no Firestore/data-model changes; this feature only touches git history and CI/repository configuration

**Testing**: Existing Vitest (unit, 78/64/50%+ coverage thresholds per `vitest.config.ts`) and Playwright (E2E via Firebase Emulator Suite) suites are unchanged in content; validated here only by confirming they still run and still gate merges once moved onto the `pull_request` trigger

**Target Platform**: GitHub Actions (`ubuntu-latest` runners) for CI; GitHub.com repository settings for branch protection and code scanning; local git for the history rewrite

**Project Type**: Web application (single project, `retro-rocket/`) — this feature is infrastructure/repository-hygiene work, not a new application feature, so it has no UI/component surface

**Performance Goals**: Adding the CodeQL job MUST NOT materially slow down the perceived PR feedback loop; CodeQL for a JS/TS codebase of this size is expected to complete in the same order of magnitude as the existing Playwright E2E job (single-digit minutes), running in parallel with the other jobs rather than blocking them serially

**Constraints**: History rewrite MUST NOT alter or drop unrelated commits/authorship (FR-004); the purge is a one-time, high-blast-radius operation (force-push to shared `main`) requiring explicit user confirmation before execution; the new PR-triggered gate MUST NOT lower the existing coverage thresholds or drop the E2E suite (FR-010); severity gating MUST only block High/Critical, newly-introduced findings (FR-011)

**Scale/Scope**: Single repository, one long-lived branch (`main`), 3 stale already-merged remote feature branches (`001-…`, `002-…`, `003-…`) that also carry the leaked-secret commit in their history and are candidates for deletion rather than rewrite, no tags, no open PRs at plan time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Section | Status | Notes |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | N/A | No new application logic is being written; this feature changes CI workflow config and git history, not testable production code paths. |
| II. Library-First | N/A | No new feature module/capability is added to `src/features` or `src/lib`. |
| III. Prefer Proven Third-Party Libraries | PASS | Uses `git filter-repo` (the tool GitHub itself recommends over `filter-branch`/BFG for this exact purge use case) and GitHub's own first-party `github/codeql-action`, rather than a custom scanner or hand-rolled history rewrite. |
| IV. SOLID | N/A | No domain/service code touched. |
| V. Simplicity (KISS/YAGNI) | PASS | Deletes stale merged branches instead of rewriting them too; relies on GitHub's native "Require code scanning results" branch-protection rule for severity gating instead of a custom SARIF-parsing script. |
| VI. Mandatory Unit Testing & Coverage Floor | PASS (unaffected) | FR-010 requires existing coverage thresholds keep gating merges; no application code changes to cover. |
| VII. E2E Testing with Playwright | PASS (unaffected) | FR-010 requires the existing Playwright job keep gating merges, just on an additional trigger. |
| Development Workflow & Quality Gates | **VIOLATION (justified)** | This section currently mandates a push-to-`main`-only CI trigger with *no* automated pre-merge PR gate (a deliberate v2.0.0 change). This feature's clarified requirement (FR-006/FR-007/FR-010) reintroduces a `pull_request`-triggered, branch-protection-enforced gate, directly reversing that section. See Complexity Tracking below; a `/speckit-constitution` amendment is a required companion task, not optional cleanup. |

Initial gate result: **CONDITIONAL PASS** — one documented, user-approved violation (see Complexity Tracking), no other gate failures. Proceeding to Phase 0.

**Post-Phase 1 re-check**: Design artifacts (research.md, data-model.md, contracts/, quickstart.md) introduced no new application code, no new dependency beyond `git filter-repo` (dev-machine tool, already justified under Principle III) and GitHub's own `codeql-action`, and no additional constitution conflicts beyond the single documented one. Gate result unchanged: **CONDITIONAL PASS**, contingent on the companion `/speckit-constitution` amendment being carried out (tracked as a task, not a blocker to writing the plan itself).

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
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
    ├── ci.yml              # existing: type-check, lint, test:coverage, e2e — trigger extended to pull_request
    └── codeql.yml           # new: CodeQL init/analyze for javascript-typescript, on pull_request + push to main

.specify/
└── memory/
    └── constitution.md      # amended (companion change): Development Workflow & Quality Gates section

retro-rocket/                # existing app — no source code changes required by this feature
└── .env.production           # already untracked/gitignored; historical copies removed via history rewrite (outside repo tree, at git-object level)
```

**Structure Decision**: This feature makes no changes inside `retro-rocket/src`. Its two units of work are (a) a one-time git-history rewrite operating at the git-object level (no persistent file-tree footprint beyond what's already true today) and (b) additions/edits to `.github/workflows/` plus a companion constitution amendment. No new `src/`, `tests/`, `backend/`, or `frontend/` directories are introduced.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Reintroducing a `pull_request`-triggered, branch-protection-enforced CI gate, reversing the "Development Workflow & Quality Gates" section of constitution v2.0.0 (push-to-`main`-only, no automated pre-merge gate) | The user's explicit requirement is a quality gate that must be *passed* before code proceeds — that only has teeth as a genuine pre-merge block, confirmed via clarification (Session 2026-07-21, Q1) | Keeping the push-only model (Option B from clarification) was rejected: CodeQL findings would only surface *after* landing on `main`, i.e., informational rather than a gate — it would not satisfy "debe superarse" (must be passed) from the original request |
