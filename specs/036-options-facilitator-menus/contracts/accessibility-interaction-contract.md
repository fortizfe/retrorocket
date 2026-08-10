# Contract: Accessibility & Interaction

**Enforces**: FR-009, FR-011, FR-012, FR-013a, SC-002, SC-003, SC-008.
Applies to every `Board State` menu-open variant (`data-model.md`) in both
themes and both the desktop/tablet and new mobile presentations.

## Contract

### WCAG 2.1 AA (FR-011, SC-002)

- [ ] Zero WCAG 2.1 AA violations (axe-core) across every `Board State`
      variant listed in `data-model.md` — `options-closed`,
      `options-open-desktop`, `options-open-mobile`, `facilitator-closed`,
      `facilitator-open-desktop-{tab}` (all 4 tabs),
      `facilitator-open-mobile-{tab}` (all 4 tabs),
      `facilitator-absent-non-owner` — in both light and dark themes,
      verified by new mobile-viewport coverage added to
      `e2e/accessibility.spec.ts` (`research.md` §6, currently absent since
      nothing was reachable there before this feature).
- [ ] Text contrast ≥ 4.5:1 (normal text) / 3:1 (large text); non-text
      contrast ≥ 3:1 for interactive-control boundaries and focus
      indicators, per Constitution Principle VIII. Covered by the same axe
      scans (contrast is part of the `wcag2aa`/`wcag21aa` rule set used).
- [ ] No information, state, or distinction (timer running/paused/finished,
      sentiment enabled/disabled/error, tab badges, owner-only gating) is
      conveyed by color alone — a redundant text, icon, or shape cue
      accompanies it.
- [ ] Every focusable element in both menus (across both presentations) has
      a visible focus indicator.
- [ ] If any `Design Token Extension` (`data-model.md`) is introduced, its
      `contrastPairing` passes `contrast.tokens.test.ts` in both themes.

### Keyboard and touch operability (FR-009, FR-013a, SC-003, SC-008)

- [ ] 100% of the options menu's and facilitator menu's items/tabs/controls
      are reachable and operable via keyboard alone (Tab to reach, Enter/
      Space to activate, arrow keys between facilitator tabs, Escape to
      dismiss), with no mouse involved — in both the desktop/tablet and new
      mobile presentations.
- [ ] 100% of the same are reachable and operable via touch (tap), with no
      `:hover`-only gating anywhere, including the new mobile entry point
      itself (FR-013a) — the primary way these menus will actually be
      opened on the presentation it introduces.
- [ ] The new mobile entry point is dismissible via an explicit, always-
      visible close affordance (not solely a swipe/drag gesture, so it
      remains keyboard- and switch-control-operable) — Escape and
      outside-press/tap dismissal are additive, not the only path.
- [ ] All interactive components expose correct ARIA roles and accessible
      names, including the facilitator menu's existing tab structure
      (`role="tablist"`/`role="tab"`/`role="tabpanel"`, preserved from
      feature 033) in whichever presentation is active.

### Reduced motion (FR-012)

- [ ] Every new or changed animated interaction (options/facilitator
      menu open-close in both presentations, the new mobile entry point's
      own entrance/exit, any tab-switch transition introduced) has a
      `useReducedMotion()`-gated equivalent (or relies on the app-wide
      `MotionConfig reducedMotion="user"`) that completes and communicates
      its result with no animation.
- [ ] Verified against `e2e/accessibility.spec.ts`'s reduced-motion
      emulation, consistent with the pattern established in features
      028/029/031/033.
- [ ] The existing Floating-UI-positioning-transform-vs-Framer-Motion-
      transform conflict (fixed in feature 034, `research.md` §4) is not
      reintroduced by any restructuring of the desktop/tablet presentation.

## Verification procedure

1. Run `npx playwright test accessibility.spec.ts` against `/retro/:id`,
   opening each `Board State` variant, in both themes and at both a mobile
   and a desktop viewport — zero violations required.
2. Manually (or via an added Playwright check) Tab through both menus in
   both presentations — including every facilitator tab — confirming every
   interactive element receives visible focus and activates via Enter/
   Space, and every menu dismisses via Escape.
3. Using a touch-emulated viewport (or a real touch device), confirm every
   item, tab, and control in both menus — including the new mobile entry
   point trigger and its close affordance — is operable without any prior
   hover/pointer-enter event.
4. Enable `prefers-reduced-motion: reduce` and repeat: open/close the
   options menu, open/close the facilitator menu and switch all 4 tabs, and
   open/close the new mobile entry point — in both presentations — confirm
   every one still completes and communicates success/failure.

This contract is satisfied only when every checkbox above is checked with a
passing, named test or an explicit manual-verification note — not left
unchecked at feature close.
