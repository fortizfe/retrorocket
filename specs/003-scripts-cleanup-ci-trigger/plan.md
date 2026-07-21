# Implementation Plan: Remove Shell Scripts & Trigger CI on Main Push

**Branch**: `003-scripts-cleanup-ci-trigger` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-scripts-cleanup-ci-trigger/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Remove all standalone `.sh` scripts from `retro-rocket/` (they duplicate or
predate what CI now does automatically), update the one npm script
(`start`) that depended on a removed script, and change
`.github/workflows/ci.yml` so the pipeline triggers on pushes to `main`
instead of on pull request events, without changing what the pipeline
checks.

## Technical Context

**Language/Version**: Bash (files being removed), YAML (GitHub Actions
workflow being edited), npm scripts (`package.json` being edited) — no
application language changes

**Primary Dependencies**: GitHub Actions (existing `actions/checkout`,
`actions/setup-node`, `actions/setup-java` steps, unchanged); no new
dependencies

**Storage**: N/A

**Testing**: Existing Vitest (`test:coverage`) and Playwright (`e2e`) suites
are unaffected in content; validation for this feature itself is manual
(file-absence checks + running the existing npm scripts + observing CI
trigger behavior) as detailed in `quickstart.md`

**Target Platform**: GitHub Actions `ubuntu-latest` runners (CI); local
developer machines (macOS/Linux/Windows via Node/npm) for the `start` script

**Project Type**: Single project (existing React/Vite SPA under
`retro-rocket/`) — this feature only touches tooling/config, not
application source

**Performance Goals**: N/A

**Constraints**: Must not break any existing, documented npm workflow
(`start`, `dev`, `lint`, `type-check`, `test:coverage`, `build`); CI must
keep running the identical check suite it ran before, just on a different
trigger

**Scale/Scope**: 10 files deleted, 1 line changed in `package.json`, 1
trigger block changed in `.github/workflows/ci.yml`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. TDD (NON-NEGOTIABLE) | N/A — no production logic is added; this feature deletes unused scripts and edits config/CI trigger only |
| II. Library-First | N/A — no new capability |
| III. Prefer Proven Third-Party Libraries | N/A — no new dependency |
| IV. SOLID | N/A — no domain/service code touched |
| V. Simplicity (KISS + YAGNI) | **PASS** — this feature directly reduces the codebase's surface area (removes 10 duplicate/unused scripts) |
| VI. Mandatory Unit Testing & Coverage Floor (NON-NEGOTIABLE) | N/A — no business logic changes; `vitest.config.ts` thresholds untouched |
| VII. E2E Testing with Playwright (NON-NEGOTIABLE) | **PASS** — the `e2e` job and its steps are unchanged; it still runs, just on a different trigger |
| Development Workflow & Quality Gates | **PASS** (as of constitution v2.0.0) — the constitution was amended to require CI on push to `main` (with human pre-merge discipline + "red main blocks further work") instead of an automated pre-merge PR gate, so this feature's FR-004/FR-005 now match the constitution's own wording rather than conflicting with it. |

**Resolved**: an earlier version of this Constitution Check flagged a
conflict between FR-005 (no CI on PRs) and the then-current constitution,
which assumed automatic pre-merge PR gating. That conflict was resolved by
amending `.specify/memory/constitution.md` to v2.0.0 (Development Workflow &
Quality Gates redefined around the push-to-`main` trigger) rather than by
carrying an unresolved exception here. The Complexity Tracking entry below is
kept for historical traceability of that decision.

**Post-Phase 1 re-check**: Design (research.md, quickstart.md) introduced no
new entities, interfaces, or dependencies. The Development Workflow item
noted above has since been resolved via a constitution amendment (v2.0.0);
no other items are open.

## Project Structure

### Documentation (this feature)

```text
specs/003-scripts-cleanup-ci-trigger/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify command output)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

(No `data-model.md` or `contracts/` — see note below.)

### Source Code (repository root)

```text
retro-rocket/
├── deploy.sh                     # DELETE
├── commands.sh                   # DELETE
├── verify-firebase.sh            # DELETE
├── check-status.sh               # DELETE
├── pre-deploy-check.sh           # DELETE
├── migrate-user-providers.sh     # DELETE
├── test.sh                       # DELETE
├── setup-firebase-auth.sh        # DELETE
├── start.sh                      # DELETE
├── track-coverage.sh             # DELETE
├── package.json                  # MODIFY — "start" script no longer points at start.sh
└── src/                          # UNCHANGED — no application code touched

.github/
└── workflows/
    └── ci.yml                    # MODIFY — trigger changes from pull_request to push (branches: [main]); jobs/steps unchanged
```

No `data-model.md` or `contracts/` are produced for this feature: it
introduces no data entities and no public interface/API — it is purely
tooling/config cleanup, matching the template's guidance to skip contracts
for "purely internal (build scripts, one-off tools, etc.)" changes.

**Structure Decision**: Single existing project (`retro-rocket/`, a
React/Vite SPA). This feature makes no structural changes — it only removes
files and edits two existing config files (`package.json`,
`.github/workflows/ci.yml`) in place.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Historical** — kept for traceability. This violation existed against
constitution v1.0.0 and was resolved by amending the constitution to v2.0.0
(see Constitution Check above), so it no longer applies against the current
constitution.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| CI no longer runs automatically on pull requests, so constitution v1.0.0's "PR MUST pass ESLint/type-check gates before merge" rule could no longer be enforced automatically pre-merge | Explicitly and repeatedly requested by the project owner — confirmed both in the original feature description and again during `/speckit-clarify` review — the pipeline must trigger on push to `main`, not on pull requests | Keeping a lightweight PR-triggered check (e.g. lint/type-check only) would have preserved v1.0.0's literal wording, but directly contradicted FR-005 as written. Instead of reinterpreting the instruction, the constitution itself was amended (v2.0.0) to match the new trigger model. |
