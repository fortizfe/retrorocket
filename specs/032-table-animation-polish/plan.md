# Implementation Plan: Mis Tableros Table Motion Refinement

**Branch**: `032-table-animation-polish` | **Date**: 2026-08-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/032-table-animation-polish/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

The "Mis Tableros" dashboard table's row-transition motion feels crude when the user changes the scope filter, sort order, or pagination. A `review-animations` audit (Phase 0, see research.md R1) found the root cause: `BoardRow.tsx` applies a single, index-delayed `transition` object to entrance, exit, *and* layout-reflow alike, so rows leaving the table inherit an entrance-shaped delay before they even start fading, and reflowing rows cascade into place unevenly instead of moving as one coordinated update. The fix is to split that transition by purpose — true first-mount rows keep their existing fade+slide+stagger, while reflow and exit get fast, undelayed transitions — with no new dependency, since framer-motion (already in use) and the app-root `MotionConfig` (already handling `prefers-reduced-motion`) are sufficient.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict` mode, project-wide), React 18.2

**Primary Dependencies**: framer-motion ^10.18.0 (already in use on this exact screen — no new dependency, per research.md R1-R7), Tailwind CSS (existing styling layer)

**Storage**: N/A — no data model change; boards remain served by the existing `backendBoardsClient`/`useBoardListQuery` layer, untouched by this feature

**Testing**: Vitest + Testing Library for unit coverage (extends existing `src/test/features/dashboard/BoardRow.test.tsx` and `src/test/pages/Dashboard.test.tsx`, which already mock `framer-motion` to assert transition config rather than real-time visual behavior); Playwright for E2E (existing `e2e/dashboard-list.spec.ts`, `e2e/dashboard-manage.spec.ts`); manual validation via quickstart.md for perceptual/timing checks that unit tests can't assert (settle-time budget, reduced-motion behavior at runtime) — same split as spec 031's precedent (`specs/031-dashboard-redesign/quickstart.md` §3: perf validated in quickstart, not unit tests)

**Target Platform**: Web browser (existing Vite-built SPA), both light and dark themes

**Project Type**: Web application (single-frontend React SPA) — this feature is frontend-only (`src/features/dashboard/`, `src/pages/Dashboard.tsx`); no backend/server changes

**Performance Goals**: Row-transition settle time ≤300ms from the triggering action (SC-002), trivially met once the entrance-shaped delay is removed from exit/reflow transitions (research.md R3)

**Constraints**: WCAG 2.1 AA conformance maintained (FR-007); `prefers-reduced-motion` honored via the existing app-root `<MotionConfig reducedMotion="user">` (`src/App.tsx:25`) — confirmed structurally sufficient in research.md R4, verified at runtime per quickstart.md step 1; only GPU-safe animated properties (`transform`/`opacity`); no new dependency

**Scale/Scope**: A single rendered page is bounded at 50 rows by `Pagination.tsx`'s fixed items-per-page options (research.md R7) — no virtualization or additional scale handling needed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | PASS | Existing `BoardRow.test.tsx`/`Dashboard.test.tsx` already assert transition config via a `framer-motion` mock; new tests for the split transition (mount vs. reflow vs. exit) will be written before the corresponding implementation change in `/speckit-tasks`/`/speckit-implement`. |
| II. Library-First | N/A | This is a targeted refinement inside an existing feature module (`src/features/dashboard`), not a new capability requiring a new module boundary. |
| III. Prefer Proven Third-Party Libraries | PASS | No new dependency — continues using the already-vetted, already-in-use `framer-motion` (research.md R1-R7). |
| IV. SOLID | PASS | Change is confined to the presentation layer (`BoardRow.tsx`, `Dashboard.tsx`); no Firestore/backend coupling introduced or altered. |
| V. Simplicity (KISS + YAGNI) | PASS | Research explicitly rejected added complexity where existing infrastructure already covers the need: no global cross-row duration budget (R3), no per-component reduced-motion reimplementation (R4), no redundant pagination press-feedback layer (R6). |
| VI. Mandatory Unit Testing & Coverage Floor | PASS | Same test files extended, same 80% floor maintained; no reduction to thresholds in `vitest.config.ts`. |
| VII. E2E Testing with Playwright | PASS | Existing `e2e/dashboard-list.spec.ts`/`dashboard-manage.spec.ts` cover the dashboard flows this feature touches; task breakdown will confirm filter/sort/page interactions are exercised or extend coverage if a gap is found. |
| VIII. Accessibility Compliance — WCAG 2.1 AA (NON-NEGOTIABLE) | PASS | FR-007 makes this an explicit requirement; quickstart.md step 7 re-verifies contrast/focus/keyboard operability in both themes post-change. |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | PASS | `review-animations` was run against the current code in Phase 0 (verdict: Block, findings captured in research.md) — this feature exists specifically to resolve that verdict. The `animate` skill will be used during `/speckit-implement` to make and justify the actual per-transition property/curve/duration decisions when the code is written, per Principle IX's task-shape rule for "implementing new motion." The PR will document which skills were used, per the Development Workflow gate. |

No violations. Complexity Tracking table is not applicable — omitted.

**Post-Phase 1 re-check**: data-model.md and quickstart.md introduce no new dependency, no new external interface, and no data-persistence surface — the design artifacts only formalize the row-transition state model (mount/reflow/exit) already scoped in research.md. All rows in the table above hold unchanged after Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/032-table-animation-polish/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Skipped — see Structure Decision below
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

`contracts/` is intentionally not created: this feature has no external interface (no API endpoint, CLI surface, or public library contract) — it is a purely internal, presentation-layer motion refinement of an already-shipped UI. Per the workflow's own instruction ("Skip if project is purely internal"), no contracts artifact is generated.

### Source Code (repository root)

This feature lives entirely inside the existing single-frontend project at `retro-rocket/` — no new top-level directory, and no backend/server files are touched.

```text
retro-rocket/
├── src/
│   ├── pages/
│   │   └── Dashboard.tsx                          # paginatedBoards slicing, AnimatePresence wrapper — modified
│   ├── features/dashboard/
│   │   ├── components/
│   │   │   ├── BoardRow.tsx                        # split transition (mount / reflow / exit) — modified
│   │   │   ├── Pagination.tsx                      # unchanged (press feedback already adequate, research.md R6)
│   │   │   └── BoardControlsBar.tsx                # unchanged (scope filter + sort triggers, no new logic needed)
│   │   └── hooks/
│   │       └── useBoardListQuery.ts                 # unchanged (already-shared derivation, research.md R5)
│   ├── lib/
│   │   ├── components/ui/Button.tsx                 # unchanged (existing whileHover/whileTap press feedback)
│   │   └── hooks/useReducedMotion.ts                 # unchanged (not applicable — this feature is framer-motion-driven, MotionConfig already covers it)
│   ├── App.tsx                                        # unchanged (existing MotionConfig reducedMotion="user")
│   └── test/
│       ├── features/dashboard/BoardRow.test.tsx      # extended — assert split transition behavior
│       └── pages/Dashboard.test.tsx                  # extended — assert filter/sort/page transition wiring
└── e2e/
    └── dashboard-list.spec.ts                         # reviewed/extended if filter/sort/page motion gap found
```

**Structure Decision**: Single-project web application (existing React SPA at `retro-rocket/`). No new directories, no new dependency, no backend change — the fix is scoped to `BoardRow.tsx`'s transition definitions and (if needed for the mount/reflow distinction) `Dashboard.tsx`'s row-rendering wiring, per research.md R2.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — table not applicable.
