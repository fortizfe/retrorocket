# Phase 1 Contract: Anchored Grouping-Suggestions Panel

This project is a frontend SPA; this feature adds no external API surface. The applicable "contract" is the observable UI/behavioral contract the grouping-suggestions panel must uphold — what other code and tests are entitled to assume. This extends the same anchored-overlay contract already established for `ColumnHeaderMenu.tsx`'s own dropdown and formalized for `CardMenu.tsx` in feature 039 (`specs/039-fix-card-menu-position/contracts/anchored-card-menu-contract.md`) to the grouping-suggestions surface.

## Contract — Anchored suggestions panel

Applies to: the panel that opens when a user selects "Suggestions" from a column's grouping-mode menu (`ColumnHeaderMenu.tsx`, `research.md` §2).

- **Given** the column's grouping-mode trigger button is rendered anywhere on the board (any column position, any scroll offset), **when** "Suggestions" is selected and the resulting panel opens, **then** the panel's on-screen bounding box MUST be adjacent to that same trigger button's bounding box — never rendered pinned to the viewport's top-left corner, and never dependent on the triggering column's position on the board (spec.md FR-001, SC-001).
- **Given** the panel would render partly or fully outside the viewport at its default placement, **when** it opens, **then** it MUST flip or shift (via `useBoardMenuOverlay`'s existing `flip`/`shift` middleware) to remain fully visible, matching every other popup in the app (FR-002).
- **Given** the trigger button carries Floating UI's `style={floatingStyles}`, **when** the panel's entrance/exit animation runs, **then** the DOM node carrying `floatingStyles` MUST NOT be the same node that receives Framer Motion's `initial`/`animate`/`exit` props — the identical structural rule established in feature 039's Contract 1, preventing the ancestor-`transform` collision this feature's root cause is an instance of (`research.md` §1).
- **Given** the page scrolls, the window resizes, or the board reflows while the panel is open, **when** `autoUpdate` fires, **then** the panel MUST remain anchored to its trigger (tests may assert "anchored to trigger," never a fixed pixel position, since exact pixels are viewport-dependent).
- **Given** the panel is open, **when** the user presses Escape or clicks outside the panel, **then** it MUST close (existing `useDismiss` behavior via `useBoardMenuOverlay`, unchanged) — and, per the existing `handleCloseSuggestions` behavior, any grouping-mode change made only to trigger the suggestions view is rolled back.
- **Given** the panel is showing AI analysis in progress, **when** it renders, **then** it MUST show a loading/in-progress state distinct from the "no suggestions found" empty state (FR-007, FR-008) — the two MUST NOT be visually indistinguishable.
- **Given** the on-device AI analysis cannot run (model failed to load, unsupported environment), **when** the user requests suggestions, **then** the panel MUST show a clear, non-technical unavailable message and MUST NOT silently fall back to a different computation (FR-008; no fallback per spec.md Assumptions).

**Verification**: a component/unit test asserting the positioning wrapper and the animated wrapper are distinct nodes (mirroring `FacilitatorMenu.test.tsx`'s `vi.mock('framer-motion', ...)` technique); new Playwright coverage (there is currently none — `research.md` §9) opening the panel via the real trigger button and asserting its bounding box is anchored to the trigger's, including for a column away from the top-left of the board and after scrolling; and a test asserting the loading, empty, and unavailable states render distinct, non-overlapping UI.

## Explicitly not covered by this contract

- The content/computation of the suggestions themselves — see `ai-grouping-service-contract.md`.
- Any change to `useBoardMenuOverlay`'s own public shape — reused as-is.
