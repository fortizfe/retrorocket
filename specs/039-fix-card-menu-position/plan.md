# Implementation Plan: Card Actions Menu Anchored Positioning

**Branch**: `039-fix-card-menu-position` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/039-fix-card-menu-position/spec.md`

## Summary

Fix `CardMenu.tsx` (the card's bottom-right convert-to-action popover) so it opens anchored to its trigger button instead of pinned to the viewport's top-left corner. Research (§1) identified the exact, already-diagnosed root cause: `CardMenu.tsx`'s floating panel applies both Floating UI's `style={floatingStyles}` (a `transform` encoding the anchor offset) and Framer Motion's `initial`/`animate`/`exit` (including `scale`, which writes its own competing `transform`) to the *same* DOM node — the identical defect feature 034 found and fixed in `RetrospectiveTopbar.tsx`'s options menu and `FacilitatorMenu.tsx`, and which feature 037 avoided from the start in `ColorPicker.tsx`. Feature 034's own research explicitly flagged `CardMenu.tsx` as "very likely affected the same way" but left it unfixed as out of that feature's reported scope. This feature closes that gap by applying the identical, already-proven split-node pattern (a non-animated positioning wrapper + a nested `motion.div` that owns only the animation) to `CardMenu.tsx`, and adds the regression-test coverage (structural unit test + real UI-driven E2E anchoring assertion) that would have caught this the first time.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.2, built with Vite

**Primary Dependencies**: `@floating-ui/react` (via the shared `useBoardMenuOverlay` hook — `offset`/`flip`/`shift`/`size`/`autoUpdate`, already correct and unchanged by this feature) and `framer-motion` (`AnimatePresence` + `motion.div` for the panel's entrance/exit animation). No new dependency — this feature reuses the exact split-node fix pattern already shipped in `RetrospectiveTopbar.tsx` and `FacilitatorMenu.tsx` (feature 034) and `ColorPicker.tsx` (feature 037), including that pattern's later refinement of using full `transform` strings in `animate` props instead of the `scale`/`y` shorthand (feature 036 T039's dropped-frames finding, reused by `ColorPicker.tsx`).

**Storage**: N/A — no data model change; the menu's content and the `onConvertToAction` callback chain are untouched.

**Testing**: Vitest + Testing Library (`src/test/features/boards/retrospective/CardMenu.test.tsx` — today has no structural or positioning assertion at all, the exact gap that let this regression ship unnoticed); Playwright E2E (`e2e/retrospective-board.spec.ts`'s existing convert-to-action-item coverage around line 1263 only calls the `/api/cards/:id/convert-to-action-item` REST endpoint directly — it never opens `CardMenu` through the UI, so no existing E2E test could have caught a pure rendering/positioning defect).

**Target Platform**: Web (responsive), evergreen browsers, light/dark theme, en/es locales — no platform-specific behavior introduced.

**Project Type**: Web application (single Vite/React SPA + a thin Express backend mediation layer, unaffected by this feature).

**Performance Goals**: Menu open/positioning must be correct within the same frame the panel becomes visible, with no dropped frames from the entrance animation — use full `transform` strings in `animate`/`initial`/`exit`, not the `scale`/`y` shorthand (consistent with `ColorPicker.tsx`'s established practice, feature 036 T039).

**Constraints**: Fix is confined to `CardMenu.tsx`'s floating-panel JSX structure — MUST NOT change `useBoardMenuOverlay`'s public shape or behavior, since it is shared by four other already-correct or independently-scoped consumers (`RetrospectiveTopbar.tsx`'s options menu, `FacilitatorMenu.tsx`, `ColorPicker.tsx`, `ColumnHeaderMenu.tsx`). `ColumnHeaderMenu.tsx` has the identical unfixed collision (confirmed by direct code inspection, §1) but is explicitly out of this feature's scope per spec.md's Assumptions, mirroring how feature 034 itself scoped its fix to only the components named in its bug report.

**Scale/Scope**: `CardMenu.tsx`'s floating panel only (~160 lines). One trigger mounts per visible card where `canConvertToAction` is true; the panel itself is open for at most one card at a time.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Gate |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | A structural unit test (positioning wrapper and animated wrapper are distinct nodes) and a Playwright bounding-box anchoring test MUST be written first, confirmed failing against the current single-node `CardMenu.tsx`, then made to pass by the fix — mirroring feature 034's T002/T004 | PASS |
| II. Library-First | No new capability — an existing control's rendering structure is corrected in place | PASS |
| III. Prefer Proven Third-Party Libraries | Reuses `@floating-ui/react` + `framer-motion`, zero new dependencies, applying a pattern already proven correct in three sibling components in this exact codebase | PASS |
| IV. SOLID | No Firestore/domain coupling touched; `onConvertToAction` callback chain unchanged | PASS |
| V. Simplicity (KISS + YAGNI) | Scope confined to `CardMenu.tsx`; `ColumnHeaderMenu.tsx`'s identical bug is explicitly deferred, not fixed opportunistically, consistent with spec.md's Assumptions and feature 034's own precedent for scoping this exact defect class | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | `CardMenu.test.tsx` gains the missing structural/positioning assertion; coverage floor must not drop | PASS |
| VII. E2E Testing with Playwright | New UI-driven E2E coverage added — today's convert-to-action-item E2E test bypasses the UI entirely via direct REST calls | PASS |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | `FloatingFocusManager`/`useDismiss`/`useRole` and existing `aria-label` placement are unchanged by the split; must avoid the known pitfall `ColorPicker.tsx`'s own comment documents (an `aria-required-children` axe violation from duplicating role/label onto both the wrapper and the nested `motion.div`) — the fix keeps `getFloatingProps()`/`aria-label` on the outer positioning wrapper only, never duplicated onto the inner `motion.div` | PASS |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | No new visual design decision — this reuses the exact entrance/exit motion CardMenu already has (opacity + scale), just re-expressed as a full `transform` string on the correctly-split inner node, consistent with the already-`animate`-skill-derived pattern in `FacilitatorMenu.tsx`/`ColorPicker.tsx`. Re-deriving the transition from scratch via the `animate` skill would be unjustified scope expansion (Principle V) for a structural bug fix that preserves the existing look | PASS |

No unjustified violations. Complexity Tracking is left empty.

**Post-Phase-1 re-check**: `research.md`, `data-model.md`, `contracts/anchored-card-menu-contract.md`, and `quickstart.md` introduce no new dependency, no Firestore/domain coupling, and no reduction in test or accessibility coverage — they add the missing structural unit test and UI-driven E2E coverage `research.md` identified as absent. All nine gates remain PASS after Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/039-fix-card-menu-position/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── anchored-card-menu-contract.md   # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/src/
├── features/
│   └── boards/
│       └── retrospective/
│           ├── components/
│           │   ├── CardMenu.tsx            # The fix: split the floating panel
│           │   │                            # into a non-animated positioning
│           │   │                            # wrapper (refs.setFloating +
│           │   │                            # floatingStyles) and a nested
│           │   │                            # motion.div (animation only)
│           │   ├── DraggableCard.tsx       # Existing-card usage of CardMenu
│           │   │                            # via CardFooter's actions slot —
│           │   │                            # unchanged
│           │   ├── CardFooter.tsx          # Unchanged; renders CardMenu in
│           │   │                            # its actions slot
│           │   └── ReactionPicker.tsx      # Reference precedent: already
│           │                                # uses a plain div + floatingStyles
│           │                                # with no competing animate prop
│           └── hooks/
│               └── useBoardMenuOverlay.ts  # Shared anchored-overlay hook —
│                                            # unchanged; already correct
├── features/boards/countdown/components/
│   └── FacilitatorMenu.tsx                 # Reference precedent: same
│                                            # split-node fix, feature 034
├── lib/components/ui/
│   └── ColorPicker.tsx                     # Reference precedent: same
│                                            # split-node pattern plus the
│                                            # full-transform-string refinement,
│                                            # feature 037
└── features/boards/clustering/components/
    └── ColumnHeaderMenu.tsx                # Identical unfixed defect,
                                             # confirmed but explicitly out of
                                             # this feature's scope (see
                                             # Constraints above)

retro-rocket/src/test/features/boards/retrospective/
└── CardMenu.test.tsx                       # Gains the structural regression
                                             # test (positioning wrapper vs.
                                             # animated wrapper are distinct
                                             # nodes), mirroring the pattern in
                                             # facilitator/FacilitatorMenu.test.tsx

retro-rocket/e2e/
└── retrospective-board.spec.ts             # Gains new UI-driven coverage:
                                             # open CardMenu via the trigger
                                             # button and assert its bounding
                                             # box is anchored to the trigger's,
                                             # including after scroll/near a
                                             # viewport edge — today's
                                             # convert-to-action-item test
                                             # (~line 1263) only exercises the
                                             # REST endpoint directly
```

**Structure Decision**: No new files or directories. This feature modifies
`CardMenu.tsx` in place and adds test coverage to its existing test files
(`src/test/features/boards/retrospective/CardMenu.test.tsx`,
`e2e/retrospective-board.spec.ts`). `useBoardMenuOverlay.ts` and every other
consumer of it are read for reference only, not modified.

## Complexity Tracking

*No violations to justify.* All Constitution Check gates pass without
exception; no new dependency, abstraction, or project is introduced.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_ | | |
