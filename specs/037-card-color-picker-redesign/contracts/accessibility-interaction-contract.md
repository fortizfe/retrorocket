# Contract: Accessibility & Interaction

**Enforces**: FR-007, FR-009, FR-010, FR-011a, SC-002, SC-003, SC-004.
Applies to every `Board State` picker-open variant (`data-model.md`) in both
themes and both the existing-card and add-card-form contexts.

## Contract

### WCAG 2.1 AA (FR-009, SC-002)

- [ ] Zero WCAG 2.1 AA violations (axe-core) across every `Board State`
      variant listed in `data-model.md` — `picker-closed-desktop-hover`,
      `picker-closed-touch`, `picker-open`, `picker-open-selected-hover`,
      `picker-disabled`, `add-card-form-picker-open` — in both light and
      dark themes, verified by new touch-viewport coverage added to
      `e2e/accessibility.spec.ts` (currently absent, since the trigger is
      undiscoverable there today per `research.md` §2).
- [ ] Text contrast ≥ 4.5:1 (normal text) / 3:1 (large text) for the
      panel's own chrome (color names, hint text); non-text contrast ≥ 3:1
      for the trigger and every swatch's interactive boundary and focus
      indicator, per Constitution Principle VIII.
- [ ] Every swatch's own background/text contrast continues to satisfy the
      existing feature-009 assertions in `cardColors.a11y.test.ts`
      (extended for any curated/renamed/new swatch, not replaced).
- [ ] No information (which color is selected, which swatch is hovered/
      focused) is conveyed by color alone — the selected-state ring/check
      (FR-005) and the name label (FR-006) are the required redundant cues.
- [ ] Every focusable element (trigger, each swatch) has a visible focus
      indicator.
- [ ] If any `Design Token Extension` (`data-model.md`) is introduced, its
      `contrastPairing` passes the project's token contrast test in both
      themes.

### Keyboard and touch operability (FR-007, FR-011a, SC-003, SC-004)

- [ ] 100% of the picker — trigger and every swatch — is reachable and
      operable via keyboard alone (Tab to reach, Enter/Space to activate,
      arrow-key or equivalent navigation among swatches per FR-007, Escape
      to dismiss), with no mouse involved.
- [ ] 100% of the same is reachable and operable via touch (tap), with no
      `:hover`-only gating anywhere, including the new touch entry point
      itself (FR-011a) — the primary way the trigger becomes discoverable
      on the viewport class this feature newly supports.
- [ ] The panel is dismissible via Escape and outside click/tap, without
      changing the card's color, in both the existing-card and add-card-
      form contexts.
- [ ] The trigger and every swatch expose correct ARIA roles and accessible
      names (dynamic `aria-label` reflecting the current/hovered color's
      translated name, per `research.md` §4).

### Reduced motion (FR-010)

- [ ] Every new or changed animated interaction (panel open/close,
      hover/selection feedback, the touch trigger's own resting/active
      presentation) has a `useReducedMotion()`-gated equivalent (or relies
      on the app-wide `MotionConfig reducedMotion="user"`) that completes
      and communicates its result with no animation.
- [ ] Verified against `e2e/accessibility.spec.ts`'s reduced-motion
      emulation, consistent with the pattern established in features
      028/029/031/033/036.
- [ ] The panel's Floating-UI positioning wrapper and its nested
      `motion.div`'s own transform remain separate (`research.md` §1, §6) —
      the feature-034 regression class (`363815a`) is not reintroduced.

## Verification procedure

1. Run `npx playwright test accessibility.spec.ts` covering a retrospective
   board, opening each `Board State` variant, in both themes and at both a
   touch/narrow and a desktop viewport — zero violations required.
2. Manually (or via an added Playwright check) Tab through the picker
   (trigger → open → each swatch → selection), confirming every interactive
   element receives visible focus and activates via Enter/Space, and the
   panel dismisses via Escape.
3. Using a touch-emulated viewport (or a real touch device), confirm the
   trigger is visible without any prior hover/pointer-enter event, and that
   opening the panel and selecting a swatch both work via tap alone, on
   both the existing card and the add-card form.
4. Enable `prefers-reduced-motion: reduce` and repeat: open/close the
   picker and select a color — confirm it still completes and communicates
   success with no animation.

This contract is satisfied only when every checkbox above is checked with a
passing, named test or an explicit manual-verification note — not left
unchecked at feature close.
