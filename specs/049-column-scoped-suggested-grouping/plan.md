# Implementation Plan: Column-Scoped Suggested Grouping

**Branch**: `049-column-scoped-suggested-grouping` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/049-column-scoped-suggested-grouping/spec.md`

## Summary

Fix a scoping bug in the retrospective board's AI card-grouping-suggestions feature (spec 044): pressing the "suggested grouping" button on one column currently runs the embeddings-based analysis over every column's ungrouped cards, because `RetrospectiveBoard.tsx` instantiates `useCardGroups` once for the whole board and its `findSuggestions` closes over the board-wide `ungroupedCards` list instead of the clicked column's own cards. The fix threads the triggering column's id into `findSuggestions`, which filters to that column's own ungrouped cards before calling `findSemanticCardGroups` — so both the embedding work performed and the suggestions returned are scoped to exactly the column whose button was pressed, and every other column's mode, order, and groups are left untouched (they were never being read from in the first place, so no separate "leave alone" code path is needed — the fix is fully additive/restrictive on the input side).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.2, built with Vite 4

**Primary Dependencies**: No new dependency. Reuses `@huggingface/transformers` `^3.8.1` via the existing `useEmbeddingWorkerManager` singleton, unchanged; `findSemanticCardGroups` (`semanticGroupingService.ts`) unchanged in signature and internal logic — only the `Card[]` it is called with changes, from board-wide to column-scoped.

**Storage**: N/A — no Firestore/backend schema change; this is a client-side input-scoping fix to an existing in-memory analysis call.

**Testing**: Vitest + Testing Library (unit/hook); Playwright (E2E) — see `contracts/column-scoped-suggestion-generation-contract.md` and `quickstart.md` for the specific modified test files.

**Target Platform**: Web (existing responsive SPA), evergreen browsers, light/dark theme, es/en locales — no platform-specific behavior introduced.

**Project Type**: Web application (existing Vite/React SPA `retro-rocket/` + thin Express `server/` mediation layer; unchanged — this feature touches only `retro-rocket/src`, no backend/server change).

**Performance Goals**: Must remain within the existing few-seconds-for-up-to-25-cards suggestion budget (spec 044 SC-004, spec 047 FR-001a). Scoping the analysis to a single column's cards strictly reduces the number of cards embedded per trigger compared to today's board-wide call, so this fix can only help that budget, not risk it (spec.md Assumptions).

**Constraints**: No new dependency (Constitution III). No new Firestore/backend schema or endpoint. The existing per-cluster cross-column guard inside `findSemanticCardGroups` (`card2.column !== card1.column`) is left in place unchanged as a harmless defense-in-depth check, even though it becomes redundant once its input is already single-column (research.md §1).

**Scale/Scope**: One hook function's signature and implementation changed (`useCardGroups.ts`'s `findSuggestions` gains a required `columnId` parameter and filters `cards` by it before delegating to `findSemanticCardGroups`); one call site updated (`RetrospectiveBoard.tsx`'s `onSuggestionGenerate` closure, passed identically to every column today, now passes that column's own `column.id`). No new component, hook, service, route, or persisted entity; `GroupableColumn.tsx`'s own `onSuggestionGenerate` prop contract (still a no-arg thunk) is unchanged.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Gate |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | `useCardGroups.test.ts`'s existing `findSuggestions` test MUST be updated to a failing state first (asserting `findSemanticCardGroups` is called with only the target column's cards, given a required `columnId` argument) before the implementation change lands | PASS |
| II. Library-First | No new capability/library introduced; the existing `findSemanticCardGroups` clustering service in `semanticGroupingService.ts` keeps its own signature and public contract untouched — only its caller's input is corrected | PASS |
| III. Prefer Proven Third-Party Libraries | No new dependency | PASS |
| IV. SOLID | `useCardGroups.ts`'s `findSuggestions` keeps its single responsibility (orchestrating a suggestion-generation call); the fix only tightens what it selects as input, it does not blur the existing boundary between "grouping mode" state (`useColumnGrouping.ts`) and "grouping groups" persistence (`useCardGroups.ts`) | PASS |
| V. Simplicity (KISS + YAGNI) | Smallest possible fix: one new required parameter, one filter added at the top of an existing function, one call-site update — no new abstraction, prop, or plumbing layer introduced (research.md §1) | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | `useCardGroups.test.ts` updated/extended to cover the column-filtering behavior (single column, multiple columns, a column with zero/one ungrouped card); coverage floor in `vitest.config.ts` must not drop | PASS |
| VII. E2E Testing with Playwright | Extends the existing `e2e/retrospective-board.spec.ts` grouping-suggestions coverage (spec 044) with a multi-column scenario asserting suggestions in one column's panel never reference another column's cards, and other columns' state is unchanged after the trigger | PASS |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | No UI/markup change — the suggestions panel, its controls, and their accessible names are untouched by this fix | N/A (no user-facing surface change) |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | No visual design or motion/animation change — this is a data-scoping fix to an existing async call, not a UI change | N/A (no design/animation decision in scope) |

No unjustified violations. Complexity Tracking is left empty.

**Post-Phase-1 re-check**: `research.md`, `data-model.md`, `contracts/column-scoped-suggestion-generation-contract.md`, and `quickstart.md` introduce no new dependency, no new Firestore/domain coupling, no UI/markup change, and no reduction in test coverage — they add/extend unit coverage for `useCardGroups.ts`'s column-scoped `findSuggestions` and extend the existing E2E grouping-suggestions spec. All nine gates remain PASS (two N/A) after Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/049-column-scoped-suggested-grouping/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── column-scoped-suggestion-generation-contract.md  # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/src/
└── features/
    └── boards/
        ├── clustering/
        │   ├── hooks/
        │   │   └── useCardGroups.ts             # findSuggestions gains a
        │   │                                     # required columnId param;
        │   │                                     # filters `cards` to that
        │   │                                     # column's own ungrouped
        │   │                                     # cards before calling
        │   │                                     # findSemanticCardGroups
        │   │                                     # (contracts/column-scoped-
        │   │                                     # suggestion-generation-
        │   │                                     # contract.md)
        │   └── services/
        │       └── semanticGroupingService.ts    # UNCHANGED — already
        │                                          # documented as operating
        │                                          # "within the same column";
        │                                          # its own per-cluster
        │                                          # cross-column guard is
        │                                          # left in place as
        │                                          # defense-in-depth
        └── retrospective/
            └── components/
                └── RetrospectiveBoard.tsx         # onSuggestionGenerate
                                                     # closure (passed per
                                                     # column) now calls
                                                     # findSuggestions(column.id,
                                                     # config) instead of
                                                     # findSuggestions(config)

retro-rocket/src/test/features/boards/clustering/
└── useCardGroups.test.ts                          # MODIFIED — findSuggestions
                                                      # test(s) updated for the
                                                      # required columnId param;
                                                      # new cases for column
                                                      # filtering (single
                                                      # column, multiple
                                                      # columns, zero/one
                                                      # ungrouped card in the
                                                      # target column)

retro-rocket/e2e/
└── retrospective-board.spec.ts                     # Extended — multi-column
                                                      # scenario: trigger
                                                      # suggestions on one
                                                      # column, assert its
                                                      # suggestions reference
                                                      # only that column's
                                                      # cards and every other
                                                      # column's mode/order/
                                                      # groups are unchanged
                                                      # (builds on spec 044's
                                                      # existing grouping-
                                                      # suggestions coverage)
```

**Structure Decision**: Web application structure (existing `retro-rocket/` SPA + `server/`), unchanged at the top level. All changes are confined to one hook (`useCardGroups.ts`) and one call site (`RetrospectiveBoard.tsx`) inside `retro-rocket/src/features/boards/`, plus their tests. `GroupableColumn.tsx`, `semanticGroupingService.ts`, `server/`, and all type definitions are untouched — no new file, route, component, or persisted entity is introduced.

## Complexity Tracking

*No violations to justify.* All Constitution Check gates pass (two N/A for no user-facing surface change); no new dependency, abstraction, or project is introduced.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_ | | |
