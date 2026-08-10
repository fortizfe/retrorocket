# Phase 1 Contracts: UI Behavior Contracts

This project is a frontend SPA with no new external API surface in this feature (see plan.md's Technical Context — no backend/Firestore changes). The applicable "contract" per the plan-template's guidance is the **observable UI/behavioral contract** each fixed component must uphold — what other code and tests are entitled to assume. These are not wire formats; they are the acceptance boundary for each user story, expressed so tasks.md can generate concrete, verifiable tasks against them.

## Contract 1 — Anchored menu overlay (User Story 1)

Applies to: the options-menu panel in `RetrospectiveTopbar.tsx`, the panel in `FacilitatorMenu.tsx`.

- **Given** the trigger button is rendered anywhere in the viewport, **when** the menu opens, **then** the floating panel's on-screen bounding box MUST touch the trigger button's bottom edge (or top edge, if flipped) — never rendered with an unrelated `transform` (e.g. `translateY`/`scale` from an entrance animation) as its only active transform.
- **Given** the panel is open, **when** any Framer Motion entrance/exit/hover animation runs on the panel or its children, **then** the DOM node carrying Floating UI's `style={floatingStyles}` MUST NOT be the same node that receives Framer Motion's `initial`/`animate`/`exit` props. (This is the structural contract that prevents the `transform` collision diagnosed in research.md §1 from recurring.)
- **Given** the page scrolls or the viewport resizes while the panel is open, **when** `autoUpdate` fires, **then** the panel MUST remain anchored (no test may assert a fixed pixel position — only "anchored to trigger" relative positioning, since exact pixels are viewport-dependent).

**Verification**: component/unit test asserting the positioning wrapper and the animated wrapper are distinct nodes (e.g. via `data-testid` or class), plus existing/new Playwright coverage asserting the panel's bounding box is adjacent to the trigger's bounding box after open, after scroll, and after resize.

## Contract 2 — Three-row column header (User Story 2)

Applies to: `GroupableColumn.tsx`'s header block.

- **Given** any column, **when** the header renders, **then** row 1 contains exactly the icon, title, and count-related badges (title MUST be present and non-empty in the accessible text of row 1).
- **Given** `column.description` is present, **when** the header renders, **then** row 2 contains exactly that description and no other element; **given** it is absent, **then** row 2 MUST NOT be present in the DOM at all (not merely visually hidden).
- **Given** any column, **when** the header renders, **then** row 3 contains exactly the group control and the add control, and neither control shares a row with the title.
- **Given** a column title longer than the column's rendered width, **when** the header renders, **then** the title MUST still be the visually dominant, readable element on row 1 (title text MUST NOT be clipped below a legible width by sibling badges — badges remain `shrink-0`, title remains the flexible element with no competing `shrink-0` siblings on its row).

**Verification**: component/unit test asserting DOM row structure (three distinct row containers, correct children in each, row 2 absent when no description) plus a contrast/legibility check consistent with WCAG 2.1 AA (Constitution Principle VIII) in both themes.

## Contract 3 — Single visible representation of a saved note (User Story 3)

Applies to: `NotesTab.tsx`'s create-note flow.

- **Given** a facilitator has content in the create-note textarea, **when** they click "Guardar", **then** at every point in time thereafter, the set of DOM elements whose visible text equals that note's content MUST have size ≤ 1 (never both the exiting textarea and the incoming read-only paragraph).
- **Given** the realtime channel delivers the saved note before the exit transition would otherwise have completed, **when** that delivery happens, **then** the create-form's exiting representation MUST already be gone or must not display the saved text — the fix MUST NOT rely on winning a timing race against network latency.
- **Given** the facilitator instead clicks "Cancelar", **when** the form closes, **then** the existing exit animation MUST still play (this contract only tightens the *save* path, not cancel).

**Verification**: the existing Playwright assertion at `e2e/retrospective-board.spec.ts:1102` (`getByText("A's private note")` resolving to exactly one element) passing reliably across ≥5 consecutive runs, plus a component-level test that saves a note and asserts no duplicate text node exists at any sampled point during the transition (e.g. via fake timers advancing through the animation duration).

## Contract 4 — Bounded typing-indicator clearing (User Story 4)

Applies to: `useTypingStatus.ts`, `OptimizedTypingStatusService.ts`, `TypingPreview.tsx` (render-only, no contract change).

- **Given** a participant stops typing in a column (no further keystrokes for `INACTIVITY_TIMEOUT_MS`), **when** the resulting clear-write is attempted, **then** the indicator visible to other participants for that `(userId, column)` pair MUST stop being visible within `INACTIVITY_TIMEOUT_MS + 5s` (SC-004's bound) of the last keystroke, **regardless of whether that specific write attempt succeeded**.
- **Given** a participant is active in two columns within a short window, **when** each column's own inactivity timer fires independently, **then** each column's indicator MUST clear independently — a failure or delay in one column's clear path MUST NOT affect another column's.
- **Given** a write to clear an indicator fails, **when** the bounded window in the first bullet elapses, **then** the system MUST have applied some bounded corrective action (retry and/or local fallback) rather than depending solely on the server-side TTL sweep, whose timing this feature does not control.

**Verification**: the existing Playwright assertion at `e2e/retrospective-board.spec.ts:692` (`visibleTypingText(pageB)` not visible within 4.5s after typing stops, across the rapid multi-column-switch scenario) passing reliably across ≥5 consecutive runs, plus a unit test on `OptimizedTypingStatusService`/`useTypingStatus` simulating a failed write and asserting the bounded fallback still clears client-visible state.
