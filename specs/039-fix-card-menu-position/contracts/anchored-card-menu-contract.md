# Phase 1 Contract: Anchored Card Menu Overlay

This project is a frontend SPA; this feature adds no external API surface (plan.md's Technical Context — no backend/Firestore change). The applicable "contract" is the observable UI/behavioral contract `CardMenu.tsx`'s floating panel must uphold — what other code and tests are entitled to assume. This is a direct extension of feature 034's **Contract 1 — Anchored menu overlay** (`specs/034-fix-retro-board-bugs/contracts/ui-behavior-contracts.md`) to its one remaining `useBoardMenuOverlay` consumer named in this feature's scope.

## Contract — Anchored card actions menu

Applies to: the convert-to-action panel in `CardMenu.tsx`.

- **Given** the card's actions-menu trigger button is rendered anywhere on the board (any card position, any column), **when** the menu opens, **then** the floating panel's on-screen bounding box MUST be adjacent to the trigger button's bounding box — never rendered with an unrelated `transform` (e.g. the entrance animation's `scale`/`translateY`) as its only active transform, and never rendered pinned to the viewport's top-left corner.
- **Given** the panel is open, **when** any Framer Motion entrance/exit animation runs on the panel, **then** the DOM node carrying Floating UI's `style={floatingStyles}` MUST NOT be the same node that receives Framer Motion's `initial`/`animate`/`exit` props. (This is the structural contract that prevents the `transform` collision diagnosed in `research.md` §1 from recurring — identical in shape to feature 034's Contract 1, second bullet.)
- **Given** the page scrolls, the window resizes, or the board layout reflows while the panel is open, **when** `autoUpdate` fires, **then** the panel MUST remain anchored to its trigger (no test may assert a fixed pixel position — only "anchored to trigger" relative positioning, since exact pixels are viewport-dependent, matching feature 034's Contract 1 third bullet).
- **Given** the trigger sits near a viewport edge, **when** the panel opens, **then** it MUST flip/shift (via the existing `flip`/`shift` middleware in `useBoardMenuOverlay`, unchanged by this feature) to remain fully visible.
- **Given** the panel is open for one card, **when** the actions-menu trigger on a different card is clicked, **then** the first panel MUST close and the new panel MUST anchor to the newly clicked trigger (existing `useBoardMenuOverlay` single-open-instance behavior, unchanged).
- **Given** the panel's ARIA wiring (`getFloatingProps()`, `aria-label`), **when** the panel is split into a positioning wrapper and an animated inner node, **then** that wiring MUST live on the positioning wrapper only — never duplicated onto the inner `motion.div` (the specific `aria-required-children` axe-violation pitfall `ColorPicker.tsx`'s own implementation comment documents hitting and fixing).

**Verification**: a component/unit test asserting the positioning wrapper and the animated wrapper are distinct nodes (mirroring `FacilitatorMenu.test.tsx`'s existing `vi.mock('framer-motion', ...)` technique), plus new Playwright coverage in `e2e/retrospective-board.spec.ts` asserting the panel's bounding box is adjacent to the trigger's bounding box after opening via the real UI (not the REST endpoint), including for a card away from the top-left of the viewport and after scrolling.

## Explicitly not covered by this contract

- `ColumnHeaderMenu.tsx` — confirmed to share the identical unfixed collision (`research.md` §1–2) but is out of this feature's scope; a future feature applying this same contract to that component should reference it directly rather than duplicating this text.
- Any change to the menu's content, the convert-to-action flow, or `useBoardMenuOverlay`'s own public shape — all explicitly unchanged (`data-model.md`).
