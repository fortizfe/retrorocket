# Phase 0 Research: Neutral Default Card Color

No `NEEDS CLARIFICATION` markers remained in the Technical Context (see `plan.md`) or in `spec.md` after `/speckit-clarify` — the codebase investigation done during specification already resolved every open question with direct evidence from the source. This document records those findings as formal research decisions.

## Decision 1: Which utility supplies the neutral default

**Decision**: Reuse the existing `getDefaultColor()` function in `src/lib/utils/cardColors.ts` (returns `'pastelWhite'`) as the new pre-selected/reset color at all three call sites in `GroupableColumn.tsx`, replacing `getSuggestedColorForColumn(column.title, column.id)`.

**Rationale**: `getDefaultColor()` already exists and is already the canonical neutral fallback used elsewhere in the same module (`validateColor()` falls back to it for missing/invalid colors, and `getSuggestedColorForColumn()` itself falls back to `'pastelWhite'` for unrecognized columns). Reusing it means zero new colors, palette entries, or utility functions need to be introduced — the "neutral default" the spec asks for is already a first-class, already-accessible, already-styled concept in the codebase.

**Alternatives considered**:
- *Introduce a new dedicated color/token for "no default"* — rejected: would duplicate `pastelWhite`'s existing visual role and add an unnecessary palette entry (violates Simplicity/YAGNI).
- *Change `getSuggestedColorForColumn` itself to always return `pastelWhite`* — rejected: the function's per-column/per-title mapping logic is still correct, independently unit-tested, and has no other production callers to break; repurposing its body would be a larger, less honest diff than simply not calling it from the one place that used it for defaulting.

## Decision 2: Scope of the code change (call sites)

**Decision**: Change exactly three call sites in `GroupableColumn.tsx`:
1. L77 — `useState<CardColor>` initializer for `selectedColor` (the pre-selected color shown when the add-card form first mounts).
2. L138 — reset of `selectedColor` after a successful card submission (so the *next* card added in the same session also starts neutral, not carrying over the previous manual pick — this satisfies spec Edge Case 3).
3. L152 — reset of `selectedColor` on cancel.

No other files reference `getSuggestedColorForColumn` in production code (confirmed via repo-wide search — only `GroupableColumn.tsx` and the utility's own test suites reference it). No changes to `Card`/`CreateCardInput` types, Firestore access (`useOptimizedCards.ts` passes `cardInput.color` through unchanged), or any export/PDF/DOCX color-rendering path (those read `card.color` as already-persisted data and are unaffected by a change in what gets pre-selected at creation time).

**Rationale**: Matches Simplicity (KISS) — the smallest change that satisfies FR-001 through FR-004 without touching unrelated code paths.

**Alternatives considered**:
- *Add a feature flag / config toggle to switch between column-derived and neutral defaults* — rejected: spec does not ask for configurability, and the constitution's Simplicity principle prohibits speculative flexibility not tied to a confirmed requirement.

## Decision 3: Whether `getSuggestedColorForColumn` should be deleted

**Decision**: Leave `getSuggestedColorForColumn` and its dedicated unit tests (`cardColors.test.ts`, `boardTemplateIntegration.test.tsx`) in place, unmodified. It becomes unused by production code but remains a correct, independently tested pure function.

**Rationale**: Deleting it would require also deleting or rewriting two test files whose purpose is to validate the column→color mapping logic itself, which is orthogonal to this feature's ask ("eliminate the behavior of applying it as a default," not "delete the mapping table"). Removing tested code outside the minimal fix increases review surface and risk without being requested. This can be revisited later as a separate, explicit dead-code cleanup if desired.

**Alternatives considered**:
- *Delete the function and its tests now* — rejected as out of scope; would conflate a behavior fix with a code-cleanup task.

## Decision 4: Existing test impact

**Decision**: `src/test/features/boards/clustering/GroupableColumn.test.tsx` mocks `getSuggestedColorForColumn` to return `'blue'` and asserts (a) the form initially shows `'blue'` as selected and (b) a submitted card without a manual color change carries `color: 'blue'`. These assertions must be rewritten, ahead of the production change, to instead mock/assert `getDefaultColor()` → `'pastelWhite'` (per constitution Principle I — test-first).

No E2E (Playwright) test currently locks in column-derived default coloring: the only Playwright reference to `color` (`e2e/retrospective-board.spec.ts:1319`) is an unrelated hardcoded fixture (`'pastelBlue'`) seeding a pre-existing legacy card for a different scenario, not an assertion about the add-card form's default. No E2E changes are required.

**Rationale**: Confirmed via direct source inspection rather than assumption, per Principle I (tests precede implementation) and to avoid an incomplete task list in the next phase.
