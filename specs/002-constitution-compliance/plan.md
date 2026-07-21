# Implementation Plan: Constitution Compliance Remediation

**Branch**: `002-constitution-compliance` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-constitution-compliance/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Bring `retro-rocket` into compliance with `.specify/memory/constitution.md` by repairing the test story first (a single trustworthy `npm run test` entry point, zero failing tests, no ad-hoc scripts outside the runner), then making the lint gate actually runnable, wiring up CI to enforce lint/type-check/coverage automatically, adopting Playwright against the Firebase Emulator Suite for the five named critical flows, eliminating hardcoded UI strings in favor of i18next, and cleaning up generated artifacts committed to git. Per clarification, fixing product bugs surfaced by currently-failing tests is explicitly out of scope — those get logged as separate follow-up items.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict` mode), Node.js (project targets ES2020, local dev on Node v26)

**Primary Dependencies**: React 18, Vite 4, Firebase 10 (Auth + Firestore), react-router-dom, i18next/react-i18next, dnd-kit, framer-motion, @react-pdf/renderer, docx — plus, newly added by this effort: ESLint (`typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y` for the accessibility standard), `@playwright/test`, `firebase-tools` (Emulator Suite for Auth + Firestore)

**Storage**: Firebase Firestore (real-time), governed by `firestore.rules`; no schema/entity changes in this effort

**Testing**: Vitest + Testing Library (existing, unit/integration — being repaired to green), Playwright (new, E2E) against the Firebase Emulator Suite per clarification

**Target Platform**: Web (SPA), deployed to Vercel; CI on GitHub Actions (repo is GitHub-hosted, no other CI provider present)

**Project Type**: Web application — single frontend project (`retro-rocket/`) backed by Firebase; no separate backend service in this repo

**Performance Goals**: N/A — this effort does not target new runtime performance characteristics; existing "no perceptible degradation on the real-time card tree" standard from the constitution is preserved, not changed

**Constraints**: CI pipeline should complete in well under 10 minutes on a cached run (soft internal target, not a spec-level SC) despite the `@xenova/transformers` ML dependency's install/runtime cost (addressed in research.md); Playwright E2E must not touch production or a real cloud Firebase project (Emulator Suite only, per clarification)

**Scale/Scope**: Tooling/process remediation across the existing single-package `retro-rocket/` app — no new user-facing features, no new data entities

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This feature's entire purpose is closing constitution gaps, so each principle is a direct target rather than a constraint to design around. Status reflects the current, audited state (see spec.md) and what this plan closes:

| Principle | Current State | This Plan |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Partially followed; ad-hoc scripts bypass the discipline entirely | Retire ad-hoc scripts (US1); no new principle violation introduced — tasks generated from this plan will themselves follow red-green-refactor |
| II. Library-First | Existing `src/features`/`src/lib` split is sound; not being restructured | No change needed; verified, not touched |
| III. Prefer Proven Third-Party Libraries | New deps are all established, actively maintained (ESLint, Playwright, firebase-tools) | Satisfied — no bespoke reimplementation |
| IV. SOLID (Firestore behind interfaces) | Audit found no direct Firestore access from components | Satisfied — FR-013 makes this a checked gate, not just an assumption |
| V. Simplicity (KISS/YAGNI) | N/A | Plan intentionally excludes scope creep (e.g., no `any`-type mass rewrite of test mocks, no fixing of unrelated product bugs — see Clarifications) |
| VI. Mandatory Unit Testing & 80% Coverage Floor | Thresholds configured in `vitest.config.ts` but unenforced (no CI) and suite currently fails | Closed by US1 (green suite) + US3 (CI enforces the existing threshold) |
| VII. E2E Testing with Playwright | Entirely absent | Closed by US4 (Playwright + Emulator Suite, 5 named flows) |
| Strict Type Safety (`any` prohibited without justification) | 51 unjustified `: any` occurrences in non-test production source | Closed by FR-014 (eliminate or justify) |
| Code Consistency (ESLint mandatory gate) | `npm run lint` fails outright — no ESLint installed | Closed by US2 |
| Real-Time Data Security | `firestore.rules` present and scoped; not being weakened | No change; verified only |
| Internationalization | Confirmed hardcoded Spanish strings in 7+ components | Closed by US5 |
| Accessibility | Not previously enforced by tooling | Partially closed — ESLint config in US2 adds `eslint-plugin-jsx-a11y` as a static check; deeper manual a11y audit is out of this effort's scope (not named in the spec's user stories) |
| Error Handling & Resilience | Not audited in depth for this effort | Out of scope — not named in spec; no regression introduced |
| Performance | Not targeted | Out of scope — no change |

**Gate result**: PASS. No principle is being weakened; every gap this plan doesn't close (accessibility depth, error-handling audit) was already out of the spec's bounded scope, not silently dropped — see spec.md Assumptions/Edge Cases. No Complexity Tracking entries are needed.

**Post-Phase 1 re-check**: PASS, unchanged. Design artifacts (research.md, data-model.md, contracts/, quickstart.md) introduced no new dependency, abstraction, or structural decision beyond what the table above already accounted for — new devDependencies (ESLint, `@playwright/test`, `firebase-tools`) are all established/proven per Principle III, and the CI/E2E design in research.md §3–4 keeps Firestore access behind the existing service/hook layer (Principle IV) with no production data touched (Firebase Emulator Suite only).

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
retro-rocket/
├── src/
│   ├── features/          # auth, boards, create-board, dashboard, dev-tools (existing — untouched structurally)
│   ├── lib/                # components, contexts, hooks, services, utils (existing — untouched structurally)
│   ├── i18n/, locales/     # en.json, es.json — extended with keys for US5 (hardcoded string removal)
│   ├── pages/
│   └── test/                # existing Vitest suite (unit + integration) — repaired to green in US1
├── e2e/                    # NEW — Playwright specs for the 5 critical flows (US4)
│   └── fixtures/            # NEW — Firebase Emulator Suite bootstrap/seed helpers
├── firebase.json            # NEW — Emulator Suite config (Auth + Firestore emulators, ports)
├── eslint.config.js          # NEW — flat config: TypeScript + React + jsx-a11y rules (US2)
├── playwright.config.ts     # NEW (US4)
├── vitest.config.ts          # existing — coverage thresholds unchanged (already 80/80/80/80)
├── package.json               # scripts unchanged in meaning; npm run test/lint remain the sole entry points
└── (test-*.sh, test-*.js, test-*.mjs, verify-*.js at root)  # REMOVED — retired per US1/FR-003

.github/
└── workflows/
    └── ci.yml               # NEW — type-check, lint, test:coverage on every PR (US3); Playwright before release (US4)
```

**Structure Decision**: Single existing web app (`retro-rocket/`), no new services or packages. This effort adds two new top-level concerns inside that project — `e2e/` for Playwright specs and `.github/workflows/` for CI — and removes the ad-hoc root-level script files. No changes to the `src/features` / `src/lib` module boundaries themselves (Library-First principle already respected there).

## Complexity Tracking

*No entries — Constitution Check above reported PASS with no unjustified violations.*
