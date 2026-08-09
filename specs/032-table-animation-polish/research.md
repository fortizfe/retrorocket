# Research: Mis Tableros Table Motion Refinement

**Input**: [spec.md](./spec.md) · Constitution Principle IX (Apple-Inspired Design & Motion Tooling)

This feature has no unresolved `NEEDS CLARIFICATION` items in Technical Context — the stack (React 18 + TypeScript + Vite + framer-motion, already in use on this exact screen) is fixed by the existing codebase, and all product-level ambiguity was already resolved during `/speckit-clarify` (300ms settle ceiling, opacity-only reduced-motion, sort in scope). What remained unresolved going into planning was *why* the current motion feels crude and what the concrete fix direction is — which is exactly what Principle IX requires be answered via the `review-animations` skill rather than ad hoc judgment. That review was run against the live code (`src/pages/Dashboard.tsx`, `src/features/dashboard/components/BoardRow.tsx`, `Pagination.tsx`, `BoardControlsBar.tsx`) and its findings are the basis for every decision below.

## R1: Root cause of the "crude" feel

**Decision**: The row list's single shared `transition` prop (`BoardRow.tsx:71`, `{ delay: Math.min(index * 0.05, 0.3), duration: 0.2, ease: [0.23,1,0.32,1] }`) is applied uniformly to first-mount entrance, exit, and `layout` reflow. Because the delay is derived from each row's *current* index and recomputed on every re-render, it fires identically whether the row is a true first-time reveal (page load), a row simply reflowing to a new slot (filter/sort/page changed which rows are visible), or a row leaving entirely (no longer matches a filter). Exits and reflows inherit an entrance-shaped delay that has no reason to apply to them.

**Rationale**: Confirmed directly in the review — this is what causes rows leaving the table to visibly sit still for up to 300ms before starting to fade, and reflowing rows to cascade into place unevenly instead of moving together as one coordinated update, rather than any issue with the easing curve or animated properties themselves (both already meet the project's motion standards).

**Alternatives considered**: Tuning the existing single `transition` object's numbers (e.g. lowering the delay cap) was considered and rejected — it would reduce the symptom's severity but not remove the structural issue of exits/reflows inheriting an entrance-only delay, and would still replay some stagger on every direct-manipulation action, which the frequency-appropriateness standard (tens-of-times/day → reduce or remove) argues against.

## R2: Fix direction — split motion by purpose, scope stagger to true mounts only

**Decision**: Split `BoardRow`'s single `transition` into purpose-specific transitions:
- **True first-mount** (row entering the DOM for the first time, e.g. initial page load): keep the existing fade + 8px slide with the index-based stagger, capped as today.
- **Layout reflow** (row already present, just moving to a new position because other rows left/entered): a fast, undelayed tween — no stagger, since this is one coordinated update, not a sequence of individual reveals.
- **Exit** (row leaving because it no longer matches the current filter/sort/page slice): its own fast, undelayed transition — must not inherit any entrance delay.

Distinguishing "true first mount" from "re-render due to filter/sort/page" requires the row to know whether it is appearing for the first time ever, versus being re-evaluated as part of an existing list. Framer Motion's `AnimatePresence`+`initial={false}` pattern (applied at the list level, not per-row) is the established way to suppress entrance animation on a list's *initial* population while still animating individual add/remove/reorder — the existing code already sets `initial={false}` on `AnimatePresence` in `Dashboard.tsx:254`, which addresses mount-vs-remount at the list level; the remaining work is ensuring the per-row `layout`/`exit` transitions no longer borrow the entrance delay.

**Rationale**: This directly targets the mechanism identified in R1 without discarding any part of the motion that already passes the project's standards (curve, duration bounds, GPU-safe properties). It keeps the visible personality of the table (fade + slight rise on real entrance) while making the tens-of-times/day interactions (filter, sort, page) read as one crisp update — matching the "professional dashboard should be crisp and fast" cohesion guidance and the ≤300ms settle ceiling from `/speckit-clarify`.

**Alternatives considered**:
- *Remove row-list motion entirely for filter/sort/page changes* (frequency table's "no animation" tier) — rejected: that tier is reserved for 100+/day keyboard-repeated actions; filter/sort/page changes are the "tens of times/day" tier, which the standard says to *reduce*, not eliminate — some transition still meaningfully prevents a jarring instant swap of table contents.
- *Keep one shared transition but shorten its duration/delay* — rejected per R1; doesn't fix exits inheriting an entrance-shaped delay, only shrinks it.

## R3: Settle-time budget (≤300ms, per `/speckit-clarify`)

**Decision**: Layout reflow and exit transitions get short, undelayed durations (within the project's documented UI duration bounds, sub-300ms) so that even the last row in a full re-render settles well inside the 300ms ceiling set in SC-002. True first-mount stagger keeps its existing cap so initial page load is unaffected (out of scope — spec's Assumptions section treats initial entrance as acceptable as-is).

**Rationale**: With the delay removed from exit/reflow paths (R2), the remaining animated duration is the limiting factor, not an artificial per-row delay — trivially satisfies the 300ms ceiling since no row will wait through an index-scaled delay before starting to move.

**Alternatives considered**: A single global duration budget divided across all animating rows (so N rows always finish within 300ms regardless of count) was considered; rejected as unnecessary complexity — removing the delay already yields well under budget, and `itemsPerPage` caps a single page at 50 rows (see R5), so no data-volume scenario risks breaching it.

## R4: Reduced motion (opacity-only crossfade, per `/speckit-clarify`)

**Decision**: No new reduced-motion implementation is required. `App.tsx:25` already wraps the whole app in `<MotionConfig reducedMotion="user">`, which causes framer-motion to snap `layout`/transform-driven values (the row's `y` shift, the FLIP reflow) to their end state instantly for users with `prefers-reduced-motion` enabled, while continuing to animate `opacity` normally — structurally equivalent to the "quick opacity-only crossfade, no positional movement" behavior decided in clarification.

**Rationale**: Confirmed present and already correctly scoped (app-root, not per-component) in the review. Re-implementing this per-component would duplicate existing, working infrastructure — against the project's Simplicity (KISS/YAGNI) principle.

**Alternatives considered**: A dedicated `useReducedMotion()`-gated branch inside `BoardRow`/`Dashboard` — rejected as redundant; that hook's own documentation (`useReducedMotion.ts:6-9`) states it exists specifically for *plain-CSS* motion not covered by `MotionConfig`, and this feature's motion is entirely framer-motion-driven.

**Verification note for Phase 1**: This is a "confirm, don't re-solve" item — quickstart.md includes a manual check that toggling `prefers-reduced-motion` actually produces the expected opacity-only behavior for row transitions specifically (not just a general assumption from reading `App.tsx`), since Phase 0 research is code-reading, not runtime verification.

## R5: Sort-triggered reordering shares the same mechanism (FR-010)

**Decision**: No separate mechanism is needed for sort. `useBoardListQuery.ts` confirms scope-filter, search, and sort all funnel into the same `sortedBoards` → `paginatedBoards` derivation that already drives `BoardRow`'s `AnimatePresence`/`layout` rendering in `Dashboard.tsx`. The R2 fix (split transition by purpose) applies uniformly regardless of which control (scope filter, sort button, page control) triggered the list to change — there is no sort-specific code path to alter.

**Rationale**: Matches the clarification's stated reason for bringing sort into scope — it is provably the same render path, so the fix is inherited "for free," at no extra implementation cost, exactly as anticipated in `/speckit-clarify`.

**Alternatives considered**: N/A — this was a scope confirmation, not a design choice with real alternatives.

## R6: Pagination control press feedback (FR-009)

**Decision**: No change needed. `Pagination.tsx`'s page/prev/next/items-per-page controls already render through the shared `Button` component (`src/lib/components/ui/Button.tsx:47-49`), which gives every button `whileHover={{ scale: 1.02 }}` / `whileTap={{ scale: 0.98 }}` — within the project's documented press-feedback range (subtle 0.95–0.98 scale). FR-009 is already structurally satisfied.

**Rationale**: Confirmed by the review; adding a second, component-specific feedback layer on top would be a redundant animation on the same interaction, which the review's remedial hierarchy treats as a "delete/reduce" candidate, not something to add to.

**Alternatives considered**: A custom press animation scoped to `Pagination.tsx` — rejected, duplicates existing shared behavior and would need to be kept in sync with `Button`'s values indefinitely.

## R7: Data volume / scale assumption for "very long list" (spec Edge Cases)

**Decision**: A single rendered page is bounded at 50 rows — `Pagination.tsx`'s items-per-page options are fixed at `5 | 10 | 20 | 50`, and `Dashboard.tsx`'s `paginatedBoards` is always a `.slice()` of at most `itemsPerPage` boards. The "very long list where many rows change position/identity at once" edge case is therefore bounded by this existing UI constraint regardless of how many total boards a user has — no virtualization or additional scale handling is needed for this feature.

**Rationale**: Directly derived from reading `Pagination.tsx` and `Dashboard.tsx` — no assumption or external research needed; the constraint already exists in shipped code.

**Alternatives considered**: N/A — this is an existing, already-enforced bound, not a new design decision.

## Summary of decisions carried into Phase 1

| # | Area | Decision |
|---|------|----------|
| R1 | Root cause | Shared entrance-shaped `transition` on `BoardRow` wrongly applied to exit/reflow |
| R2 | Fix direction | Split into mount-only stagger vs. undelayed reflow/exit transitions |
| R3 | Performance budget | ≤300ms trivially met once delay is removed from exit/reflow |
| R4 | Reduced motion | Already solved app-wide via `MotionConfig`; verify at runtime in Phase 1 |
| R5 | Sort scope | Shares R2's fix automatically — same render path |
| R6 | Pagination press feedback | Already solved via shared `Button` component |
| R7 | Scale bound | Page size capped at 50 rows by existing `Pagination` options |

No `NEEDS CLARIFICATION` markers remain.
