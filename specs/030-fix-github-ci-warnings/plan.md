# Implementation Plan: Eliminate GitHub CI/CD and Lint Warnings

**Branch**: `030-fix-github-ci-warnings` | **Date**: 2026-08-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/030-fix-github-ci-warnings/spec.md`

## Summary

Eliminate every currently-reported GitHub warning: 7 Actions deprecation annotations (Node 20 runner deprecation across `actions/checkout`, `actions/setup-node`, `actions/setup-java`; the CodeQL Action v3 deprecation) and 10 ESLint warnings across 6 source files (unused imports/variables/args, one accessibility violation, two React Hook dependency issues). The technical approach: bump the four flagged action families to their earliest non-deprecated major version everywhere they appear in `.github/workflows/ci.yml` (config-only, no job-logic change), and apply the behavior-preserving fix traced in `research.md` for each lint finding — most are mechanical dead-code removal, but two carry real regression risk if fixed by the literal auto-fix (`useLinkedProviders`'s missing effect dependency, and the `GroupCard`/`GroupableColumn` unused prop, where one of two near-identical call sites is dead and the other is not) and are called out explicitly.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) for all touched source files; YAML for the GitHub Actions workflow.

**Primary Dependencies**: React 18.2 (hooks: `useEffect`, `useMemo`, `useCallback`), `docx` 9.5 (DOCX export), ESLint 9.39.5 with `@typescript-eslint`, `react-hooks`, and `jsx-a11y` plugins (the source of every lint finding). CI-side: `actions/checkout`, `actions/setup-node`, `actions/setup-java`, `github/codeql-action` (targets in `research.md` §1).

**Storage**: N/A — no data model changes.

**Testing**: Vitest 3.2.4 + Testing Library (frontend `test:coverage`, backend `test:server:coverage`, 80% coverage floor per Constitution VI), Playwright 1.61 against the Firebase Emulator Suite (`npm run e2e`).

**Target Platform**: GitHub Actions `ubuntu-latest` runners (CI/CD); the application itself is a browser-based web app deployed to Vercel (unaffected by this change).

**Project Type**: Web application — frontend + co-located backend under `retro-rocket/`, with CI/CD configuration at the repo root (`.github/workflows/ci.yml`).

**Performance Goals**: N/A — no performance-sensitive code paths are touched.

**Constraints**: Every job's functional outcome must remain equivalent pre/post-change (spec `FR-004`); zero ESLint warnings post-fix (`FR-012`); zero regression in the 80% coverage floor (Constitution VI); the `useLinkedProviders` fix specifically must not change when the effect re-runs (see `research.md` §7 — naive fix would cause an every-render fetch loop).

**Scale/Scope**: One workflow file (9 jobs, 20 action references to re-pin per `data-model.md`) and 6 source files (10 lint findings) across 2 features (`boards/export`, `boards/clustering`, `auth`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | **PASS, with a required action** | Most fixes are dead-code removal with no behavior surface (no new test needed). The `useLinkedProviders.ts` fix (research §7) is the exception: it's a behavior-relevant change to an untested hook with a real regression risk if done naively. A failing/characterizing unit test for `useLinkedProviders` MUST be written before the fix lands (red → green), covering: refresh fires on `user.email`/`userProfile.providers` change, and does not fire on an unrelated re-render. Carried into `tasks.md`. |
| II. Library-First | PASS (N/A) | No new capability introduced. |
| III. Prefer Proven Third-Party Libraries | PASS (N/A) | No new dependency added; only version bumps to already-adopted GitHub Actions. |
| IV. SOLID | PASS (N/A) | No architectural change. |
| V. Simplicity (KISS + YAGNI) | PASS — actively reinforced | The accepted clarification (keep `GroupCard` delete scoped to "remove from group," not wire up new behavior) and the choice to fully remove rather than underscore-prefix the unused `onCardDelete`/`providerId` are direct applications of this principle. Action-version choice (earliest non-deprecated major, not latest) follows the same logic. |
| VI. Mandatory Unit Testing & Coverage Floor | **PASS, with the same required action as Principle I** | Existing suites for the other 5 touched files already cover current behavior (confirmed test files exist for `docxExportService`, `useColumnGrouping`, `GroupableColumn`, `GroupCard`, and `AuthButtonGroup`); must keep passing (`FR-013`). `useLinkedProviders` has no dedicated test today — one is added per Principle I above, which also closes this gap. |
| VII. E2E Testing (Playwright, NON-NEGOTIABLE) | PASS | `e2e` job itself is touched (action bumps) — existing Playwright suite re-run is the acceptance gate (`SC-003`, `SC-004`); no new E2E scenario required since no user-facing flow is added. |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | **PASS, with a verification step** | The `autoFocus` fix is squarely an accessibility fix. Replacement (ref-based focus gated on explicit user action, research §4) preserves the existing focus-ring styling — no new WCAG surface introduced. Per the constitution's human-review fallback (no automated a11y audit wired into this repo's CI yet), manual verification of visible focus in both themes is required before merge (see `quickstart.md` §4). |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | **N/A — not triggered** | No visual-design, layout, or motion/animation decision is being made anywhere in this change; the `autoFocus` replacement keeps the exact same visual outcome and only changes *how* focus is set (mechanical accessibility fix, not a design choice). If implementation surfaces an actual visual/motion decision not anticipated here, the `animate`/`apple-design` skills must be consulted at that point per the constitution. |

No violations requiring justification. **Complexity Tracking is not needed.**

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1 (`data-model.md`, `quickstart.md`): no new principle is implicated by the design artifacts — the data model confirmed the fix scope stays within the 20 action references and 10 lint findings already accounted for above, and `quickstart.md` operationalizes (rather than expands) the Principle I/VI test-first requirement and the Principle VIII manual a11y check. Gate re-confirmed: **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/030-fix-github-ci-warnings/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output — version targets + per-fix risk analysis
├── data-model.md        # Phase 1 output — exact action-reference and lint-finding records
├── quickstart.md        # Phase 1 output — validation commands and CI-run checklist
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify, re-validated in /speckit-clarify)
└── tasks.md              # Phase 2 output (/speckit-tasks command — not created by this command)
```

No `contracts/` directory: this feature exposes no new API, CLI, or UI contract — it is an internal CI-configuration and lint-cleanup change with no interface surface to document.

### Source Code (repository root)

```text
.github/
└── workflows/
    └── ci.yml                                          # 20 action-version bumps (data-model.md)

retro-rocket/
├── src/
│   ├── features/
│   │   ├── boards/
│   │   │   ├── export/services/
│   │   │   │   └── docxExportService.ts                # remove 4 unused imports
│   │   │   └── clustering/
│   │   │       ├── hooks/
│   │   │       │   └── useColumnGrouping.ts             # rename unused `removed` binding
│   │   │       └── components/
│   │   │           ├── GroupableColumn.tsx              # autoFocus replacement; useMemo dep cleanup;
│   │   │           │                                     # remove GroupCard onCardDelete pass-through only
│   │   │           └── GroupCard.tsx                    # remove unused onCardDelete prop
│   │   └── auth/
│   │       ├── hooks/
│   │       │   └── useLinkedProviders.ts                 # useCallback + effect dependency fix
│   │       └── components/
│   │           └── AuthButtonGroup.tsx                   # remove unused providerId parameter
│   └── test/
│       └── features/
│           ├── auth/                                     # add useLinkedProviders unit test here
│           └── boards/{export,clustering}/               # existing tests must keep passing
└── server/                                                # backend — unaffected by this feature
```

**Structure Decision**: Existing structure is unchanged — this feature only edits files already in place (per `data-model.md`); no new modules, directories, or projects are introduced. The workflow file lives at the repo root (`.github/workflows/ci.yml`, outside `retro-rocket/`, per the existing convention); all source fixes live inside `retro-rocket/src/features/`, following the codebase's established feature-module layout (Constitution Principle II).

## Complexity Tracking

*No entries — Constitution Check reported no violations requiring justification.*
