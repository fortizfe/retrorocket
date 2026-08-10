# Implementation Plan: Neutral Default Card Color

**Branch**: `035-neutral-card-default-color` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/035-neutral-card-default-color/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

New retrospective cards currently pre-select and are created with a color derived from their parent column (`getSuggestedColorForColumn`), e.g. green for a "went well" column, red for a "went wrong" column. The fix removes that column-derived default: the "add card" form must always pre-select the same neutral (`pastelWhite`) default via the already-existing `getDefaultColor()` utility, regardless of column, while leaving the manual color picker fully functional for users who want to choose a color themselves. The change is confined to the three call sites of `getSuggestedColorForColumn` inside `GroupableColumn.tsx` (initial state, post-submit reset, cancel reset); no data model, API, or persistence changes are required, and existing cards are unaffected.

## Technical Context

**Language/Version**: TypeScript (strict mode), React 18

**Primary Dependencies**: React, framer-motion, Firebase/Firestore (real-time sync), i18next — none newly introduced

**Storage**: Firestore (`Card.color` field, unchanged shape — optional `CardColor` string)

**Testing**: Vitest + Testing Library (unit/component), Playwright (E2E) — per constitution Principles I, VI, VII

**Target Platform**: Web (browser), existing RetroRocket SPA

**Project Type**: Web application (single frontend project, `retro-rocket/src`)

**Performance Goals**: N/A — no change to render cost, network calls, or data volume; this only changes which `CardColor` enum value is pre-selected in local component state

**Constraints**: Must not alter `Card`/`CreateCardInput` data shapes; must not affect previously created cards; must not remove the manual color picker

**Scale/Scope**: Isolated to `GroupableColumn.tsx` (3 call sites) plus their existing unit tests; no new files, no new dependencies

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TDD (NON-NEGOTIABLE)** — PASS. `GroupableColumn.test.tsx` already asserts the pre-selected/reset color (currently mocked to `'blue'` standing in for `getSuggestedColorForColumn`'s return). Those assertions MUST be updated to expect the neutral default color *before* the production call sites are changed, preserving red→green.
- **II. Library-First** — PASS. No new capability is introduced; the change reuses the existing `getDefaultColor()` utility already living in `src/lib/utils/cardColors.ts`. No new module is needed.
- **III. Prefer Proven Third-Party Libraries** — N/A. No new dependency involved.
- **IV. SOLID** — PASS. No Firestore access pattern changes; `useOptimizedCards.ts` already passes `cardInput.color` through unchanged.
- **V. Simplicity (KISS + YAGNI)** — PASS. Smallest possible diff: swap the argument-taking `getSuggestedColorForColumn(column.title, column.id)` calls for the existing zero-argument `getDefaultColor()` at the 3 call sites. `getSuggestedColorForColumn` itself is left in place (still exercised by its own dedicated unit tests in `cardColors.test.ts` and `boardTemplateIntegration.test.tsx`) rather than deleted, since removing a still-tested, independently-correct pure utility is out of scope for a behavior-only fix and would needlessly widen the diff.
- **VI. Mandatory Unit Testing & Coverage Floor** — PASS. Existing coverage on `GroupableColumn.tsx` is retained; no branches are removed, only the returned value asserted against changes.
- **VII. E2E Testing with Playwright** — Card creation is a critical flow already covered; no new E2E scenario is required since this is a default-value change, not a new flow, but the existing "add card" E2E (if it asserts a column-derived color) must be checked in Phase 2 tasks.
- **VIII. Accessibility — WCAG 2.1 AA** — PASS. `pastelWhite` is an existing, already-audited palette entry (used today as the fallback for unmapped columns via `validateColor`/`getDefaultColor`), so no new contrast/focus/color-only-signal risk is introduced.
- **IX. Apple-Inspired Design & Motion Tooling** — N/A. No new visual design, layout, or motion/animation decision is being made; this only changes which existing, already-designed color swatch is pre-selected by default. No new UI is introduced.

No violations. Complexity Tracking section left empty.

## Project Structure

### Documentation (this feature)

```text
specs/035-neutral-card-default-color/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory: this feature changes an internal UI default-value
decision only. It exposes no new/changed public API, CLI, or cross-service
contract — `Card`/`CreateCardInput` shapes are unchanged and Firestore access
patterns are untouched.

### Source Code (repository root)

```text
retro-rocket/
├── src/
│   ├── lib/utils/
│   │   └── cardColors.ts                          # getDefaultColor(), getSuggestedColorForColumn() — reused as-is, not modified
│   └── features/boards/clustering/components/
│       └── GroupableColumn.tsx                     # 3 call sites to change: initial state (L77), post-submit reset (L138), cancel reset (L152)
└── src/test/
    └── features/boards/clustering/
        └── GroupableColumn.test.tsx                 # existing test(s) asserting the pre-selected/reset color — update expectations first (TDD)
```

**Structure Decision**: Single existing frontend project (`retro-rocket/`, Vite + React SPA). No new directories, modules, or projects are introduced — this is a targeted edit inside the existing `boards` feature (Library-First: the reused default lives in the existing `src/lib/utils/cardColors.ts` utility module).

## Complexity Tracking

*No violations — this section is intentionally left empty.*
