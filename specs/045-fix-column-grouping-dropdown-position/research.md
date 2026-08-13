# Phase 0 Research: Column Grouping Menu Anchored Positioning

No unresolved `NEEDS CLARIFICATION` items remain from the Technical Context — the root cause and fix pattern were fully determined by direct codebase inspection before this plan was written. This document records the findings and the decision they lead to.

## 1. Root cause of the mispositioned menu

**Decision**: The defect is a single-node Floating UI / Framer Motion collision in `ColumnHeaderMenu.tsx` (lines ~134-143), the grouping-mode dropdown block.

**Rationale**: The block applies `ref={refs.setFloating}` and `style={floatingStyles}` (Floating UI's computed anchor position, delivered via a CSS `transform`) to the *same* `motion.div` that also carries Framer Motion's `initial`/`animate`/`exit` props (which drive `y`/`scale` — also via CSS `transform`). Framer Motion recalculates and writes its own `transform` on every animation frame, unconditionally overwriting whatever Floating UI wrote. With no active positioning transform, the portaled node falls back to `position: fixed; top: 0; left: 0`, i.e. the viewport's top-left corner — exactly the symptom reported.

**Alternatives considered**: None — this is not a design choice but a confirmed, reproducible defect with a known root cause, already diagnosed once per feature (specs 034, 039, 044) and left unfixed only in this one remaining block. There is no alternative interpretation of the bug to evaluate.

## 2. Fix pattern

**Decision**: Apply the "split-node" pattern: move `ref={refs.setFloating}`, `style={floatingStyles}`, and `{...getFloatingProps()}` onto a plain (non-animated) outer `<div>`, and keep only `initial`/`animate`/`exit`/`transition` on a nested `motion.div` that wraps the menu content. No other prop, class, or timing value changes.

**Rationale**: This exact pattern is already implemented and working correctly three times in this codebase:
1. `FacilitatorMenu.tsx` (spec 034) — the original fix and reference implementation, with an explanatory code comment.
2. `CardMenu.tsx` (spec 039) — applied the same pattern to fix the card actions menu.
3. `ColumnHeaderMenu.tsx`'s own suggestions-panel block (lines 191-214, spec 044) — applied the same pattern in the very same file, immediately below the still-broken block.

Reusing an already-proven, already-reviewed pattern in the same file is the minimal, most consistent fix (Constitution Principle V — Simplicity/YAGNI) and requires no new dependency or abstraction (Principle III).

**Alternatives considered**:
- *Wrap `floatingStyles` merge logic differently (e.g. compose `transform` strings manually across both libraries)*: rejected — more complex than the split-node pattern, and would diverge from the pattern already standardized elsewhere in this codebase, creating inconsistency for future maintainers.
- *Replace Framer Motion's `y`/`scale` shorthand animation with explicit `transform` strings on the same node instead of splitting nodes*: rejected — spec 044's research notes this alone does not fully resolve the collision when both libraries still target the same node's `style.transform` property; splitting the node is the approach proven to work end-to-end.
- *Introduce a new shared wrapper component to eliminate the repeated split-node boilerplate across `FacilitatorMenu.tsx`, `CardMenu.tsx`, and this file*: rejected as out of scope — it would be a refactor beyond this bug's fix, not requested, and not required by any functional requirement in spec.md (Principle V).

## 3. Test strategy

**Decision**: Extend `ColumnHeaderMenu.test.tsx` with a test asserting the grouping-mode floating node structure mirrors the already-tested suggestions-panel structure — i.e., the node carrying Floating UI's `ref`/`style` is not the same node carrying Framer Motion's animation props.

**Rationale**: Constitution Principle I (TDD) requires a failing test before the fix. Spec 039 and spec 044 already established the test shape for this exact defect class in this codebase (asserting the split-node structure), so the same approach is reused here rather than inventing a new verification method.

**Alternatives considered**: A full Playwright E2E assertion of on-screen pixel position was considered but rejected as unnecessary — the existing unit-level structural test is what specs 039/044 used for the same defect class, keeping this fix consistent and avoiding new E2E surface for a presentation-structure regression that unit tests already catch.
