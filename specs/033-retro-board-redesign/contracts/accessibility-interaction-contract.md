# Contract: Accessibility & Interaction

**Enforces**: FR-012, FR-014, FR-015, SC-003, SC-004. Applies to the
redesigned retrospective board's every `Board State` variant
(`data-model.md`) in both themes.

## Contract

### WCAG 2.1 AA (FR-014, SC-003)

- [ ] Zero WCAG 2.1 AA violations (axe-core) in the `loading`, `populated`,
      `empty-column`, and `error` `Board State` variants, in both light and
      dark themes — verified by the new `/retro/:id` coverage added to
      `e2e/accessibility.spec.ts` (`research.md` §6, currently absent).
- [ ] Text contrast ≥ 4.5:1 (normal text) / 3:1 (large text); non-text
      contrast ≥ 3:1 for interactive-control boundaries and focus
      indicators, per Constitution Principle VIII. Covered by the same axe
      scans (contrast is part of the `wcag2aa`/`wcag21aa` rule set used).
- [ ] No information, state, action, or distinction (e.g. vote count vs.
      like state, sentiment badge status, timer running/paused, board-owner
      vs. participant) is conveyed by color alone — a redundant text, icon,
      or shape cue accompanies it.
- [ ] Every focusable element (card action buttons, drag handles, all
      menus/popovers and their items, countdown controls, export format
      selection, form fields in the card menu/facilitator notes) has a
      visible focus indicator.
- [ ] If any `Design Token Extension` (`data-model.md`) is introduced, its
      `contrastPairing` passes `contrast.tokens.test.ts` in both themes.

### Keyboard and touch operability (FR-012, SC-004)

- [ ] 100% of the board's menus and popovers (options menu, facilitator
      menu, card menu, column header menu, export popover, reaction picker)
      are reachable and operable via keyboard alone (Tab to reach, Enter/
      Space to activate, Escape to dismiss), with no mouse involved.
- [ ] 100% of the board's menus and popovers are reachable and operable via
      touch (tap), with no `:hover`-only gating anywhere.
- [ ] Drag-and-drop has a keyboard-operable equivalent or fallback for
      reordering/moving cards (`@dnd-kit`'s built-in keyboard sensor),
      consistent with FR-012's "no control may depend on hover" intent
      extended to drag interactions specifically.
- [ ] All interactive components expose correct ARIA roles and accessible
      names (Constitution's Technology Stack standards) — including the
      facilitator menu's tab structure (`role="tablist"`/`role="tab"`/
      `role="tabpanel"` or equivalent accessible pattern) and drag-and-drop
      items (accessible name + drag-state announcement via `@dnd-kit`'s
      built-in accessibility layer).

### Reduced motion (FR-015)

- [ ] Every new animated interaction introduced by the redesign (drag
      feedback, real-time card entrance, group collapse/expand, menu/
      popover open/close, countdown state transitions, reaction-picker
      open) has a `useReducedMotion()`-gated equivalent that completes and
      communicates its result with no animation.
- [ ] Verified against `e2e/accessibility.spec.ts`'s reduced-motion
      emulation, consistent with the pattern established in features
      028/029/031.

## Verification procedure

1. Run `npx playwright test accessibility.spec.ts` against the redesigned
   `/retro/:id` route in both themes and every `Board State` variant listed
   above — zero violations required.
2. Manually (or via an added Playwright check) Tab through a populated
   board — including a group, an action item, and every menu — confirming
   every interactive element receives visible focus and activates via
   Enter/Space, and every menu dismisses via Escape.
3. Using a touch-emulated viewport (or a real touch device), confirm every
   menu, card action, and drag-and-drop interaction is operable without any
   prior hover/pointer-enter event.
4. Enable `prefers-reduced-motion: reduce` and repeat the primary flows
   (add/vote/like/react to a card, drag-and-drop, group, open every menu,
   export, start/pause the countdown) — confirm every one still completes
   and communicates success/failure.

This contract is satisfied only when every checkbox above is checked with a
passing, named test or an explicit manual-verification note — not left
unchecked at feature close.
