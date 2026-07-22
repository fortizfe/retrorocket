# Phase 0 Research: Retrospective Board Refactor & Layout Fixes

All Technical Context unknowns are resolved below. No open `NEEDS CLARIFICATION`
remain (the four spec-level decisions were settled in `/speckit-clarify`).

## R1. Reaction-picker positioning engine

- **Decision**: Adopt `@floating-ui/react` and drive the picker with
  `useFloating({ placement: 'bottom-start', middleware: [offset(8), flip(), shift({ padding: 8 })], whileElementsMounted: autoUpdate })`.
  Anchor = the "add reaction" trigger button; floating = the picker panel
  (rendered via `FloatingPortal`).
- **Rationale**:
  - Directly satisfies FR-008 (appears already anchored — Floating UI computes
    position before paint, eliminating the `{top:0,left:0}` flash caused by the
    current post-paint `useEffect`), FR-009 (`flip`/`shift` keep it in-viewport
    near edges), and FR-009a (`autoUpdate` repositions on scroll/resize while
    open — the clarified behavior).
  - Constitution III (Prefer Proven Libraries): Floating UI is the maintained
    successor to Popper, MIT-licensed, tree-shakeable, framework-agnostic core
    with a first-party React binding, no duplicate capability already present.
  - `FloatingFocusManager` + `useDismiss`/`useRole`/`useInteractions` give
    keyboard operability, correct `dialog` role, Escape/outside-click dismissal,
    and focus trapping/return — supporting Principle VIII and replacing the
    hand-written `mousedown`/`keydown`/scroll-lock effects.
- **Alternatives considered**:
  - *Fix the manual `getBoundingClientRect` code* (rejected in clarify): keeps
    bespoke flip/shift + scroll tracking to maintain and test.
  - *Headless UI `Popover`* (already a dependency): weaker viewport collision
    handling (no built-in `flip`/`shift`), would still need manual anchoring.
  - *Radix Popover*: capable but a heavier new dependency than Floating UI for
    this single use.
- **Integration notes**: Keep `framer-motion` for the scale/opacity animation but
  set transform origin to the trigger so it animates "in place" (FR-010).
  Preserve body-scroll behavior only if still needed; prefer `autoUpdate` +
  `shift` over locking scroll.

## R2. Card text wrapping / long-URL overflow

- **Decision**: On the live card content (`DraggableCard` content span) and inside
  `LinkifyText` (both the wrapper and each `<a>`), apply
  `overflow-wrap: anywhere` (Tailwind `[overflow-wrap:anywhere]` or `break-words`)
  together with the existing `whitespace-pre-wrap`, and ensure the card/column
  containers use `min-w-0` so flex/grid children are allowed to shrink and wrap
  rather than forcing overflow.
- **Rationale**: `whitespace-pre-wrap` alone preserves line breaks but does not
  break unbreakable tokens (long URLs, 80-char words). `overflow-wrap: anywhere`
  breaks such tokens at any point when needed while leaving normal words intact;
  it is preferred over `word-break: break-all` (which breaks every word) and over
  the legacy `break-all`. `min-w-0` on flex/grid items is the standard fix for
  "child refuses to shrink below its content width" causing overflow. Satisfies
  FR-001, FR-002 (links stay clickable), FR-003 (line breaks preserved).
- **Alternatives considered**: `word-break: break-all` (rejected — breaks
  mid-word unnecessarily, hurts readability); truncation/ellipsis (rejected —
  hides card content, unacceptable for retro cards).

## R3. Columns fit without horizontal scroll

- **Decision**: In `RetrospectiveBoard`, replace the interpolated
  `lg:grid-cols-${showActionColumn ? '4' : '3'}` with statically-analyzable
  classes selected at runtime (e.g. a small map: 3 → `lg:grid-cols-3`, 4 →
  `lg:grid-cols-4`, both present as full literal strings so Tailwind's JIT keeps
  them), or an equivalent `grid-template-columns` via `repeat(N, minmax(0,1fr))`
  inline style. Remove hard `min-w-[320px]` from the live action column
  (`ActionItemsColumn`) and ensure each column wrapper carries `min-w-0`. Below
  `lg` the grid stays `grid-cols-1` (stacked). Optionally centralize the mapping
  in a `useBoardGridColumns` hook.
- **Rationale**: Dynamic class interpolation is purged by Tailwind at build →
  the intended `grid-cols-4` may not exist in the CSS, so the layout falls back
  and, combined with `min-w-[320px]`, overflows (FR-005 root cause).
  `minmax(0, 1fr)` columns share width and are allowed to shrink to zero content
  width, eliminating horizontal scroll (FR-004). Keeping the `lg` breakpoint for
  stacking matches the clarified decision and preserves current responsive
  behavior (FR-006). Per-column vertical scrolling is unchanged (FR-007).
- **Alternatives considered**: `flex` with `flex-1 min-w-0` per column (viable
  equivalent; grid chosen to match existing structure); CSS `auto-fit`
  `minmax(260px, 1fr)` (rejected for the desktop board — could reflow column
  count unexpectedly; the clarified rule fixes the breakpoint).
- **Safelist note**: If runtime-selected literal classes are still at risk of
  purge, add `lg:grid-cols-3` and `lg:grid-cols-4` to the Tailwind `safelist`, or
  prefer the inline `grid-template-columns` approach which cannot be purged.

## R4. Dead-code removal & componentization

- **Decision**: Delete `EnhancedRetrospectiveBoard.tsx`, `RetrospectiveCard.tsx`,
  `RetrospectiveColumn.tsx` and their test files (audit confirmed zero non-test
  imports). Decompose the live oversized components:
  - `EmojiReactions` (323 LOC) → `ReactionBadge` (existing-reaction pill),
    `ReactionPicker` (Floating UI panel + category grid), and a `useEmojiPicker`
    hook (open state, selection, dismissal).
  - `DraggableCard` (346 LOC) → `CardHeader` (author + menu), `CardVoteControl`
    (vote up/down + count), `CardContent` (LinkifyText + wrapping), `CardFooter`
    (timestamp + edit/delete actions).
  - `GroupableColumn` → extract `ColumnHeader` if it reduces responsibility.
- **Rationale**: Principle II (Library-First) + IV (SRP) + V (Simplicity). Each
  extraction gets a single responsibility, a typed public prop contract, and its
  own unit tests (FR-012, FR-013). Removing dead siblings prevents future edits
  to the wrong component and reduces surface area (FR-014).
- **Verification method**: `grep` for non-test imports before deletion; run full
  `type-check`, `lint`, `test:coverage`, and Playwright suite after.

## R5. Internationalization & date formatting

- **Decision**: Route all remaining hardcoded board strings through i18next with
  new keys in `en.json` + `es.json`: e.g. `retrospective.board.loading`
  ("Cargando retrospectiva…"), `retrospective.emojiReactions.picker.hint`
  ("Haz clic en un emoji para reaccionar"), and `RetrospectiveCard`/legacy
  literals removed with their components. Replace the hardcoded
  `toLocaleDateString('es-ES', …)` in `DraggableCard` with a locale-aware
  formatter driven by the active i18next language (reuse `date-fns` locales or
  `Intl.DateTimeFormat(i18n.language)`).
- **Rationale**: Constitution i18n standard prohibits hardcoded user-visible
  strings and requires keys in all supported locales (FR-015). A fixed `es-ES`
  locale misformats dates for English users.
- **Alternatives considered**: Leaving Spanish literals (rejected — violates
  i18n gate).

## R6. Theming & WCAG 2.1 AA

- **Decision**: Replace hardcoded palette classes in the live board components
  (`border-blue-300` in `DraggableCard`; `text-red-600`, `text-gray-500` in
  `RetrospectiveBoard`'s error state; any `gray-*` in kept components) with the
  semantic CSS-variable tokens already defined in `tailwind.config.js`
  (`surface`, `surface-raised`, `text-primary/secondary/muted`,
  `border-default/strong`, `focus`, `info-fg/bg`, and error/danger tokens).
  Ensure a visible `focus` ring on every interactive element (badges, picker
  buttons, vote buttons).
- **Rationale**: Principle VIII requires ≥4.5:1 text / ≥3:1 non-text contrast,
  visible focus, and no color-only signaling, in **both** themes; semantic tokens
  are already tuned for both themes (feature 009). Hardcoded palette values
  bypass the theme and risk failing dark mode (FR-016).
- **Verification method**: `e2e/accessibility.spec.ts` runs `@axe-core/playwright`
  on the board; extend it to toggle light/dark and assert zero violations
  (SC-008).

## R7. Testing strategy (TDD + coverage + E2E)

- **Decision**: Red-green-refactor per unit: write failing tests first for
  (a) `LinkifyText` breaking a long URL, (b) `useBoardGridColumns`/grid producing
  the right column classes for 3 vs 4, (c) `useEmojiPicker`/`ReactionPicker`
  computing an anchored (non-`{0,0}`) position and dismissing correctly,
  (d) each extracted card sub-component. Extend `e2e/card-lifecycle.spec.ts`
  (long-URL card renders without horizontal overflow; picker opens anchored) and
  `e2e/accessibility.spec.ts` (board a11y in both themes).
- **Rationale**: Principles I, VI, VII. Keep enforced `vitest.config.ts`
  thresholds (78/64/50/50) — do not lower; offset removed dead-code tests with
  new extraction tests.
- **Constraint check**: Coverage is measured after dead-code + test removal; if a
  ratio dips, add targeted tests before merge (tracked in Complexity Tracking).
