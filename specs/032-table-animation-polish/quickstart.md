# Quickstart: Validating the Mis Tableros Table Motion Refinement

Validates the refined row-transition motion against [spec.md](./spec.md)'s acceptance scenarios and success criteria, using the fix direction from [research.md](./research.md) (R1-R2) and the row states in [data-model.md](./data-model.md).

## Prerequisites

- A signed-in test account with enough boards to exercise all scenarios:
  - At least 2 boards the account created and at least 1 board it only joined (to see scope-filter membership actually change).
  - At least 25 boards total (so the default 10-per-page view spans 3 pages, per User Story 2's independent test).
- Local dev server running: `npm run dev` (from `retro-rocket/`), or `npm run dev:all` if backend-dependent board data is needed.
- Browser DevTools open with the Performance/Animations panel available (Chrome recommended) for the timing checks.

## 1. Scope filter transition (User Story 1, FR-001, FR-004, FR-010)

1. Navigate to "Mis Tableros" (`/dashboard`) and confirm you're on the "All" scope.
2. Click "Created by me", then "Joined", then back to "All".
3. **Expected**: Rows that leave the filtered set fade out immediately (no visible pause before they start disappearing — this is the R1/R2 exit-delay defect check). Rows that remain remaining/entering settle into position as one coordinated update, not a cascade of individually-delayed pops. No layout jump in the surrounding page (header, controls bar, pagination footer) — FR-004.
4. Repeat step 2 while `prefers-reduced-motion` is enabled (e.g. macOS: System Settings → Accessibility → Display → Reduce motion; or Chrome DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce").
5. **Expected**: Row changes still communicate clearly (opacity crossfade), with no translate/position movement — FR-006, research.md R4. This is the one item research.md flags as "confirm at runtime, not just by reading code."

## 2. Pagination transition (User Story 2, FR-002, FR-004, FR-009)

1. With 25+ boards loaded (default 10/page), click page "2".
2. **Expected**: Row set transitions smoothly to page 2's boards; no jarring cut, no layout jump in the pagination footer itself.
3. Click "Previous", then "Next" again; then change "items per page" to 20 and back to 10.
4. **Expected**: Same transition quality as a page-number change (not a separate/clashing behavior) — FR-002.
5. Click a pagination number button and observe its own press feedback (scale-down on tap, scale-up on hover) — should already be present via the shared `Button` component (research.md R6); this is a "did we regress it" check, not new behavior to build.
6. Navigate to the last page and attempt to click "Next" (disabled).
7. **Expected**: No stray animation fires from the disabled control — FR-002 acceptance scenario 3.

## 3. Sort transition (FR-010, spec Clarification session 2026-08-09)

1. Click the "Sort by date" control, then "Sort by name", then re-click either to reverse direction.
2. **Expected**: Rows reorder with the same smooth, undelayed-reflow motion quality as the scope-filter transition in step 1 — no separate/lesser treatment for sort.

## 4. Interruption handling (FR-005, edge case: rapid filter-then-page)

1. Click a scope-filter segment, then — before the transition visibly settles — immediately click a different scope segment.
2. **Expected**: No visual glitch, no leftover "ghost" row, no jarring restart-from-scratch — the in-progress transition responds to the new state immediately (research.md R2's undelayed-reflow/exit design should make this trivially satisfied, since there's no pending delay to collide with a new one).
3. Repeat, this time filtering and then immediately changing page before the first transition settles.
4. **Expected**: Same — table never lands in a visually broken or inconsistent intermediate state (SC-003).

## 5. Settle-time budget (SC-002: ≤300ms)

1. Open Chrome DevTools → Performance panel, start a recording.
2. Click a scope-filter segment (or a page-number button).
3. Stop the recording; inspect the Animations track for the row list.
4. **Expected**: All row animations (exit, reflow, and any true entrance) complete within 300ms of the click event. Cross-check research.md R3's reasoning: once the entrance-shaped delay no longer applies to exit/reflow, this should hold well under budget without needing per-run measurement tuning.

## 6. Empty/no-results transition (spec Edge Cases)

1. Filter or search to a combination that matches zero boards.
2. **Expected**: Transition into the "no results" state is smooth, with no stray row remnants left behind from the previous set — FR-004.

## 7. Accessibility regression check (FR-007)

1. Re-run the project's standard WCAG 2.1 AA verification pass (contrast, visible focus, no color-only signaling) against the dashboard table and pagination controls in both light and dark themes, per Principle VIII — this feature must not introduce a new violation.
2. Confirm keyboard operability is unaffected: Tab through scope-filter segments (arrow-key navigable per existing `role="radiogroup"`), sort buttons, and pagination controls; confirm focus rings remain visible throughout any transition.

## 8. Before/after motion-quality comparison (SC-001, SC-005)

1. Re-run the `review-animations` skill against the refined code (same scope as the Phase 0 review: `Dashboard.tsx`, `BoardRow.tsx`, `Pagination.tsx`, `BoardControlsBar.tsx`).
2. **Expected**: The review's verdict is **Approve** — no feel-breaking regressions, no exit/reflow inheriting an entrance delay — closing out the "Block" verdict from the Phase 0 review referenced in research.md.
