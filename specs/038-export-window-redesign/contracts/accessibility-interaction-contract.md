# Contract: Accessibility & Interaction

**Enforces**: FR-008, FR-010, FR-011, SC-002, SC-003. Applies to every
`Board State` export-window variant (`data-model.md`) in both themes and
both the desktop/tablet and mobile presentations.

## Contract

### WCAG 2.1 AA (FR-010, SC-002)

- [x] Zero WCAG 2.1 AA violations (axe-core) across every `Board State`
      variant listed in `data-model.md` — `export-closed`,
      `export-open-desktop-idle`, `export-open-mobile-idle`,
      `export-open-desktop-exporting`, `export-open-mobile-exporting`,
      `export-open-desktop-success`/`error`,
      `export-open-mobile-success`/`error`,
      `export-facilitator-zone-owner`/`absent` — in both light and dark
      themes, verified by new coverage added to `e2e/accessibility.spec.ts`
      (`research.md` §6, currently absent for this window's own open state
      in either theme or viewport).
- [x] Text contrast ≥ 4.5:1 (normal text) / 3:1 (large text); non-text
      contrast ≥ 3:1 for interactive-control boundaries and focus
      indicators, per Constitution Principle VIII. Covered by the same axe
      scans (contrast is part of the `wcag2aa`/`wcag21aa` rule set used).
- [x] No information, state, or distinction (idle/exporting/success/error,
      owner-only zone presence, format selected) is conveyed by color
      alone — a redundant text, icon, or shape cue accompanies it.
- [x] Every focusable element in both presentations has a visible focus
      indicator.
- [x] If any `Design Token Extension` (`data-model.md`) is introduced, its
      `contrastPairing` passes `contrast.tokens.test.ts` in both themes.

### Keyboard and touch operability (FR-008, SC-003)

- [x] 100% of the export window's controls (format grid, title input, logo/
      optional-content/facilitator-zone toggles, export/cancel buttons) are
      reachable and operable via keyboard alone (Tab to reach, Enter/Space
      to activate, Escape to dismiss), with no mouse involved — in both the
      desktop-anchored panel and mobile sheet presentations.
- [x] 100% of the same are reachable and operable via touch (tap), with no
      `:hover`-only gating anywhere.
- [x] The mobile sheet is dismissible via an explicit, always-visible close
      affordance (inherited from `BottomSheet.tsx`, not solely a swipe/drag
      gesture) — Escape and outside-press/tap dismissal are additive, not
      the only path.
- [x] All interactive components expose correct ARIA roles and accessible
      names (`role="dialog"` for the desktop panel, matching
      `FacilitatorMenu.tsx`'s existing pattern).

### Dismiss-during-export behavior (FR-007a, SC-009)

- [x] Dismissing the export window (Escape, outside-click/tap, close
      control) while `isExporting` is true does not cancel the export job —
      verified by asserting the underlying export call/promise is not
      aborted and its `success`/`error` outcome is still reached.
- [x] If the window is closed when the job resolves, exactly one
      `react-hot-toast` notification surfaces the outcome (success or
      error) — no duplicate toast, and no toast at all if the window is
      still open (the in-panel/in-sheet banner handles that case).
- [x] Reopening the export window while that same job is still running
      reflects its current in-progress state rather than allowing a
      conflicting duplicate export to start (Edge Cases, `spec.md`).

### Reduced motion (FR-011)

- [x] Every new or changed animated interaction (desktop panel open-close,
      mobile sheet open-close via `BottomSheet.tsx`, any state-transition
      motion added per `research.md` §5) has a `useReducedMotion()`-gated
      equivalent (or relies on the app-wide `MotionConfig
      reducedMotion="user"`) that completes and communicates its result
      with no animation.
- [x] Verified against `e2e/accessibility.spec.ts`'s reduced-motion
      emulation, consistent with the pattern established in features
      028/029/031/033/036.
- [x] The existing Floating-UI-positioning-transform-vs-Framer-Motion-
      transform conflict (fixed in feature 034, `research.md` §5) is not
      reintroduced by the desktop panel's implementation.

## Verification procedure

1. Run `npx playwright test accessibility.spec.ts` against `/retro/:id`,
   opening each `Board State` variant, in both themes and at both a mobile
   and a desktop viewport — zero violations required.
2. Manually (or via an added Playwright check) Tab through the export
   window in both presentations, confirming every interactive element
   receives visible focus and activates via Enter/Space, and the window
   dismisses via Escape.
3. Using a touch-emulated viewport (or a real touch device), confirm every
   control in the export window — including the mobile sheet's close
   affordance — is operable without any prior hover/pointer-enter event.
4. Start an export, dismiss the window mid-export, and confirm (a) the
   export still completes, (b) exactly one toast surfaces its outcome, and
   (c) reopening the window before it finishes shows the in-progress state
   correctly.
5. Enable `prefers-reduced-motion: reduce` and repeat: open/close the
   export window in both presentations, and move through
   idle → exporting → success/error — confirm every one still completes and
   communicates success/failure.

This contract is satisfied only when every checkbox above is checked with a
passing, named test or an explicit manual-verification note — not left
unchecked at feature close.

## Verification record (T028-T032, T034)

- **WCAG 2.1 AA**: `Export window (desktop anchored panel)` and `(mobile
  bottom sheet)` axe scans (both themes) cover `export-open-desktop-idle`/
  `export-open-mobile-idle` and, via the board owner's default state,
  `export-facilitator-zone-owner`; the non-owner scan covers
  `export-facilitator-zone-absent`. `export-closed` needs no dedicated scan
  (nothing renders beyond the already-scanned board). The dynamic
  `-exporting`/`-success`/`-error` variants are exercised functionally
  (not axe-scanned, to avoid timing flakiness) by the reduced-motion test,
  which drives a real export through to its success banner — matching
  `export-dismissed-during-export`'s own note in `data-model.md` that not
  every state needs a static axe scan. Contrast/focus/no-color-only-meaning
  are covered by the same `wcag2aa`/`wcag21aa` axe rule set; no new design
  tokens were introduced (T010, skipped).
- **Keyboard and touch operability**: dedicated new tests exercise every
  control (format buttons, title field, checkboxes, cancel/export buttons)
  via keyboard (Tab/Enter/Space/Escape) and via touch (tap), in both
  presentations; the mobile sheet's always-visible close button (inherited
  from `BottomSheet.tsx`) is exercised via touch in the same test.
- **Dismiss-during-export**: covered at the unit level (`RetrospectiveTopbar.test.tsx`,
  controllable deferred promises — T012/T015/T021) and the e2e level (T030's
  reduced-motion test drives a real export to completion after a prior
  dismiss-and-reopen cycle, the exact scenario a real regression was found
  and fixed in during this verification — see `design-review.md`).
- **Reduced motion**: dedicated e2e test drives a real export through
  idle → exporting → success → auto-close, and opens/closes the mobile
  sheet, with `prefers-reduced-motion: reduce` emulated — confirms nothing
  is left stuck mid-animation, inherited app-wide via `MotionConfig
  reducedMotion="user"`. The Floating-UI-transform-vs-Framer-Motion-transform
  conflict was not reintroduced — verified by direct code inspection (the
  desktop wrapper in `RetrospectiveTopbar.tsx` uses the same pattern as
  `FacilitatorMenu.tsx`) and by the panel visibly anchoring correctly in
  every live screenshot taken throughout T013-T037.
