# Implementation Plan: Update README to Reflect Current Product State

**Branch**: `053-update-readme` | **Date**: 2026-08-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/053-update-readme/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Update the root [`README.md`](../../README.md) so it accurately reflects the
product as it exists today. A prior codebase audit (recorded in
[research.md](research.md)) found real, shipped, user-facing capabilities with
zero README mention — Anonymous Board Mode (specs 051/052), TXT export,
AI-generated editable group titles, and the live typing indicator — plus a
broken Getting Started flow (the backend dev server and non-`VITE_` env vars
are undocumented, so a newcomer following the README today gets broken
sign-in) and a stale Project Architecture / Testing & CI picture (missing
`server/`, `api/`, `scripts/`, `features/landing/`, and the backend-specific
npm scripts and CI steps). The technical approach is a single, evidence-backed
edit pass over `README.md`: no code, no new dependencies, no new directories —
every change traces to a row in [data-model.md](data-model.md) and is verified
per [quickstart.md](quickstart.md).

## Technical Context

**Language/Version**: N/A — the deliverable is Markdown prose in `README.md`, not source code.

**Primary Dependencies**: N/A — no new dependency; editing an existing file only.

**Storage**: N/A

**Testing**: No automated test suite applies to prose. Verification is the manual cross-check and live walkthrough defined in [quickstart.md](quickstart.md) (content cross-check against the repository's actual state, plus an end-to-end Getting Started run).

**Target Platform**: GitHub-rendered Markdown at the repository root; read by developers, contributors, and evaluators, not served to end users of the deployed app.

**Project Type**: Documentation (single file edit) — not a software feature; no frontend/backend/mobile split applies.

**Performance Goals**: N/A

**Constraints**: Every fact stated (version numbers, npm script names, file paths, CI step names) must match the current repository state (spec FR-012); existing accurate content, structure, section order, and tone must be preserved (spec FR-013); no real secret values may be printed when documenting env vars (spec FR-007).

**Scale/Scope**: One file (~410 lines today), ~10 sections touched per [data-model.md](data-model.md), no new top-level sections beyond bullet additions to existing ones.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This feature changes no application source code, so the constitution's
code-focused NON-NEGOTIABLE principles do not apply to it. Each principle was
checked explicitly rather than silently skipped:

| Principle | Applicability | Status |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | N/A — no production code is added or modified. The analogous discipline (verify before/after) is satisfied by [quickstart.md](quickstart.md)'s cross-check, performed against the finished edit. | PASS |
| II. Library-First | N/A — no new capability/module. | PASS |
| III. Prefer Proven Third-Party Libraries | N/A — no dependency added. | PASS |
| IV. SOLID | N/A — no code. | PASS |
| V. Simplicity (KISS + YAGNI) | Applies in spirit: spec FR-013 requires minimal, targeted diffs — no restructuring beyond what's needed. | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | N/A — no code, no coverage impact; CI's Vitest thresholds are untouched by a Markdown-only change. | PASS |
| VII. E2E Testing (Playwright) | N/A — no user flow is added or changed. | PASS |
| VIII. WCAG 2.1 AA | N/A — `README.md` is repository documentation, not a rendered surface of the deployed application; the principle scopes to "user-facing surface" of the product itself. | PASS |
| IX. Apple-Inspired Design & Motion Tooling | N/A — no UI, visual design, or motion work. | PASS |
| Technology Stack: Real-Time Data Security | N/A — no change to `firestore.rules` or Firestore access patterns; the README's existing rules description and code snippet are left factually intact (only a clarifying sentence is added per FR-010). | PASS |
| Technology Stack: Internationalization | N/A — repository documentation is not routed through `react-i18next`; that requirement scopes to in-app user-visible text. | PASS |
| Workflow: CI must run on every PR | Applies unchanged — this change ships as a normal PR; CI (type-check/lint/test/E2E/CodeQL) runs and will pass trivially since no source file changes. | PASS |

**Result**: No violations. No entries needed in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/053-update-readme/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output — audit decisions per content area
├── data-model.md         # Phase 1 output — README section → required change map
├── quickstart.md         # Phase 1 output — validation guide (content cross-check + live walkthrough)
├── checklists/
│   └── requirements.md   # Spec quality checklist (from /speckit-specify)
└── tasks.md              # Phase 2 output (/speckit-tasks command — not created by /speckit-plan)
```

No `contracts/` directory is produced: this feature exposes no API, CLI
surface, or other external interface — it edits one Markdown file consumed by
human readers, so Phase 1's "interface contracts" step does not apply
(purely internal documentation change, per the phase's own skip condition).

### Source Code (repository root)

```text
README.md                        # The only file this feature modifies
retro-rocket/                    # Referenced (read-only) as the source of truth
├── package.json                 #   for npm script names (FR-006, FR-009)
├── .env.example                 #   for env var documentation (FR-007)
├── vite.config.ts                #   for the /api proxy → backend dev server fact (FR-006)
├── firestore.rules               #   for the security rules clarifying note (FR-010)
├── src/features/                #   for feature-tree accuracy (FR-008) and feature bullets (FR-001, FR-004, FR-005)
│   ├── boards/retrospective/     #   AnonymityToggle, ColumnHeaderMenu, DraggableCard
│   ├── boards/export/            #   txtExportService, unifiedExportService
│   ├── boards/clustering/        #   GroupSuggestionModal (suggestedTitle)
│   └── landing/                  #   missing from today's README tree
├── server/                       #   missing from today's README tree
├── api/                          #   missing from today's README tree
└── scripts/                      #   missing from today's README tree
.github/workflows/ci.yml          # Source of truth for CI step names (FR-009)
specs/051-anonymous-board-mode/   # Source of truth for Anonymous Board Mode behavior (FR-001, FR-002, FR-010)
specs/052-anonymous-typing-indicator/  # Source of truth for typing-indicator anonymization (FR-005)
```

**Structure Decision**: This is a documentation-only change scoped to the
single root-level `README.md`. None of the template's standard source-code
layouts (single project, web application split, mobile+API) apply — there is
no new or modified application code, so no `src/`, `backend/`, `frontend/`,
`tests/`, `ios/`, or `android/` structure is created. The directories listed
above under `retro-rocket/` and `.github/` are referenced read-only, as
evidence sources for the prose being written, not modified by this feature.

## Complexity Tracking

*No entries — Constitution Check reported no violations.*
