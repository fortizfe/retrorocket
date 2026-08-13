# Implementation Plan: Column Grouping Menu Anchored Positioning

**Branch**: `045-fix-column-grouping-dropdown-position` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/045-fix-column-grouping-dropdown-position/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

The column grouping-mode menu in `ColumnHeaderMenu.tsx` renders pinned to the viewport's top-left corner instead of anchored next to its trigger button. Root cause (confirmed by code inspection): the menu's `motion.div` carries both Floating UI's `style={floatingStyles}` (positioning, via `transform`) and Framer Motion's `initial`/`animate`/`exit` (also writing `transform` on every frame), so Framer Motion silently overwrites Floating UI's anchor offset each render, leaving the floating node with no active positioning transform. This is a known, previously-diagnosed defect class in this codebase: it was first identified in spec 034, explicitly deferred in spec 039 (which fixed the sibling `CardMenu.tsx` with the same collision), and left unfixed again in spec 044 (which fixed only the *other* overlay in this same file — the AI suggestions panel — while leaving an explicit code comment flagging the grouping-mode dropdown as still broken). The fix is to apply the same "split-node" pattern already proven three times in this codebase (`FacilitatorMenu.tsx`, `CardMenu.tsx`, and this file's own suggestions-panel block): separate the Floating UI positioning ref/style onto a plain wrapper `div`, and keep only the Framer Motion animation props on a nested `motion.div`, with no changes to the menu's options, dismissal behavior, or animation timing/easing.

## Technical Context

**Language/Version**: TypeScript 5, React 18

**Primary Dependencies**: `@floating-ui/react` (^0.27, via the shared `useBoardMenuOverlay` hook), `framer-motion` (^10.18), `react-i18next`

**Storage**: N/A (client-side UI state only; no persistence change)

**Testing**: Vitest + React Testing Library (`src/test/features/boards/clustering/ColumnHeaderMenu.test.tsx`), project-wide coverage floor of 80% branches/functions/lines/statements enforced via `vitest.config.ts`; Playwright E2E for critical flows per Constitution Principle VII (grouping is part of the "adding/voting/grouping cards" critical flow)

**Target Platform**: Web (desktop and tablet browsers), existing retrospective board view

**Project Type**: Web application — single frontend package (`retro-rocket/`) with a Node/Express backend under `server/`; this feature touches frontend only

**Performance Goals**: No new performance goal; menu open/close must remain visually instantaneous (existing 0.15s transition), consistent with the other already-fixed board popups

**Constraints**: Must not alter the menu's grouping options, selection behavior, keyboard/focus/dismissal semantics, or animation timing — positioning-only fix (FR-007); must match the exact split-node pattern already established in `FacilitatorMenu.tsx` / `CardMenu.tsx` / this file's suggestions-panel block for codebase consistency

**Scale/Scope**: Single component (`ColumnHeaderMenu.tsx`), one JSX block (~lines 130-177); no new files, no API/data model changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TDD (NON-NEGOTIABLE)**: PASS. The existing `ColumnHeaderMenu.test.tsx` suite covers this component; a new failing test asserting the floating wrapper carries Floating UI's `ref`/`style` (and the animated node does not) MUST be added first, following the same test shape already used for the suggestions-panel fix (spec 044) and `CardMenu.tsx` (spec 039).
- **II. Library-First**: PASS (N/A) — no new capability/module is introduced; this is a bug fix inside an existing feature component under `src/features/boards/clustering`.
- **III. Prefer Proven Third-Party Libraries**: PASS. No new dependency; reuses the already-adopted `@floating-ui/react` and `framer-motion`, applying the same pattern already proven elsewhere in the codebase.
- **IV. SOLID**: PASS (N/A) — no Firestore/domain logic touched; purely a presentation-layer structural fix within one component.
- **V. Simplicity (KISS + YAGNI)**: PASS. The fix is the minimal, already-proven split-node restructuring — no new abstraction is introduced, and none is warranted since the exact pattern already exists three times in this codebase.
- **VI. Mandatory Unit Testing & Coverage Floor**: PASS, pending the new/updated test described under Principle I; coverage floor is unaffected since no new untested branches are introduced.
- **VII. E2E Testing with Playwright**: PASS (no new E2E scenario required) — grouping selection itself is already part of the "adding/voting/grouping cards" critical flow; this fix does not change that flow's behavior, only the menu's visual position, which is not independently E2E-asserted elsewhere in this codebase either (positioning is verified at the unit level, consistent with specs 039/044).
- **VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE)**: PASS. No contrast, focus-indicator, or keyboard-operability change; `FloatingFocusManager` and `getFloatingProps()`/ARIA attributes are preserved unchanged, only their host node is split per the proven pattern.
- **IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE)**: PASS, scoped narrowly. This fix does not introduce new motion (duration, easing, and enter/exit values are copied verbatim from the existing broken block per FR-007), so the `animate` skill's from-scratch decision process does not apply. Because existing animation code is being restructured, `review-animations` guidance was consulted conceptually via direct comparison against the codebase's own already-reviewed reference implementations (`FacilitatorMenu.tsx`'s split-node pattern, and this same file's suggestions-panel block, both introduced under prior specs that already went through this principle's process) rather than re-deriving new motion decisions.

No violations requiring Complexity Tracking.

**Post-Phase 1 re-check**: `research.md` and `data-model.md` confirm no new entities, dependencies, or design decisions were introduced beyond the split-node structural fix already justified above — all gates above remain PASS unchanged after design.

## Project Structure

### Documentation (this feature)

```text
specs/045-fix-column-grouping-dropdown-position/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command) — omitted, see note below
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── src/
│   └── features/
│       └── boards/
│           ├── clustering/
│           │   └── components/
│           │       └── ColumnHeaderMenu.tsx      # Fix target: grouping-mode dropdown (lines ~130-177)
│           └── retrospective/
│               ├── hooks/
│               │   └── useBoardMenuOverlay.ts    # Shared Floating UI positioning hook (unchanged)
│               └── components/
│                   ├── CardMenu.tsx              # Reference: split-node fix from spec 039
│                   └── FacilitatorMenu.tsx       # Reference: canonical split-node pattern
└── src/
    └── test/
        └── features/
            └── boards/
                └── clustering/
                    └── ColumnHeaderMenu.test.tsx  # Test target for this fix
```

**Structure Decision**: Existing single-frontend-package layout (`retro-rocket/src/features/...`) is reused as-is. No new files, directories, or projects are introduced — the fix is a localized structural change to one existing component (`ColumnHeaderMenu.tsx`) and its existing test file. No `contracts/` artifact is produced (see Phase 1 note): this is a UI-internal positioning fix with no public API, CLI, or service contract to document.

## Complexity Tracking

No Constitution Check violations — this section is not applicable.
