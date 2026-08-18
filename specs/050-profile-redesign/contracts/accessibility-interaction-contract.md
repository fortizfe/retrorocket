# Contract: Accessibility & Interaction

**Enforces**: FR-007, FR-012, FR-013, SC-002, SC-007. Applies to the
redesigned Mi Perfil's every `Profile View State` variant (`data-model.md`)
in both themes.

## Contract

### WCAG 2.1 AA (FR-012, SC-002)

- [x] Zero WCAG 2.1 AA violations (axe-core) in the `loaded`, `loading`, and
      `error` `Profile View State` variants, and in the display-name
      `saving`/`save-error` states, in both light and dark themes —
      verified by `e2e/accessibility.spec.ts`'s Mi Perfil scan (6 scans:
      loading×2, saving×2, save-error×2; loaded/error pre-dated this
      feature). All passing. The "loading" scan verifies what a visitor
      actually sees on this navigation path — `AuthWrapper.tsx`'s own
      loading UI, per the T033 finding recorded in `tasks.md`.
- [x] Text contrast ≥ 4.5:1 (normal text) / 3:1 (large text); non-text
      contrast ≥ 3:1 for interactive-control boundaries and focus
      indicators, per Constitution Principle VIII. Covered by the same axe
      scans (contrast is part of the `wcag2aa`/`wcag21aa` rule set used).
      Passing.
- [x] No information, state, action, or distinction (e.g. linked vs.
      linkable vs. not-yet-available provider status, revoke-in-progress
      state) is conveyed by color alone — a redundant text or icon cue
      accompanies it. Verified in code (`LinkedProvidersCard.tsx`'s
      "Vinculado"/"No vinculado"/"No disponible todavía" captions,
      `ConnectedAppsCard.tsx`'s revoke feedback) and by `design-review.md`'s
      Clarity section.
- [x] Every focusable element (display-name field and save button,
      sign-out button, link-provider buttons, revoke-app buttons) has a
      visible focus indicator, using the shared
      `focus-visible:ring-2 focus-visible:ring-focus` treatment already
      used elsewhere in the app. Verified in code and exercised directly by
      the T036 keyboard-only tests (each asserts `toBeFocused()`).
- [x] If any `Design Token Extension` (`data-model.md`) is introduced, its
      `contrastPairing` passes `contrast.tokens.test.ts` in both themes.
      No new tokens were introduced (T011 added 4 new `CONTRAST_PAIRINGS`
      entries for *existing* tokens, not a new token) — `contrast.tokens.test.ts`
      50/50 passing in both themes (re-verified T037).

### Disabled account-action placeholders (FR-007, SC-007)

- [x] "Exportar mis datos" and "Eliminar cuenta" carry the native `disabled`
      attribute (removed from tab order, matching current behavior).
      Verified by `Profile.test.tsx` and `e2e/accessibility.spec.ts`.
- [x] Each has a persistently visible "not yet available" label (not
      tooltip-only). Verified — same tests.
- [x] Each control's accessible description (`aria-describedby`) resolves
      to that visible label, so assistive technology announces both the
      control's name and its unavailable status together. Verified — same
      tests; this was a real, previously-missing gap (T026/T031), now
      closed.
- [x] Automated accessibility check confirms both controls are announced
      as unavailable, not merely visually muted, in 100% of runs
      (`e2e/accessibility.spec.ts`). Dedicated SC-007 test passing across
      every full-suite run in this feature, including the final T045
      regression sweep (88/88).

### Reduced motion and keyboard operability (FR-013)

- [x] With `useReducedMotion()` true (or OS-level
      `prefers-reduced-motion: reduce`), every interaction on the page
      (page entrance, display-name save feedback, provider-link
      transition, connected-app revoke feedback) still completes and
      communicates its result without relying on animation. Verified in
      code for every motion decision (T017/T022/T032) and confirmed by the
      T038 `review-animations` pass (Approve, zero blocking findings; one
      real bug found and fixed — an untuned/double-animating transition on
      `UserProfileForm.tsx`'s outer card, unrelated to reduced-motion
      gating itself, which was already correct).
- [x] Every interaction (edit/save display name, sign out, link a
      provider, revoke a connected app) is reachable and operable via
      keyboard alone — Tab to reach, Enter/Space to activate — with no
      mouse involved. No capability on this page depends on drag-and-drop
      or a gesture with no keyboard equivalent. Verified by T036's 4
      dedicated keyboard-only E2E tests, all passing.
- [x] All interactive components expose correct ARIA roles and accessible
      names (Constitution's Technology Stack standards). Verified — axe
      scans include ARIA-validity rules, and the T036 keyboard tests locate
      every control by role/accessible name (which only succeeds if the
      ARIA is correct).

## Verification procedure

1. Run `e2e/accessibility.spec.ts`'s Mi Perfil scan across every listed
   state, in both themes, against the shipped direction.
2. Manually (or via a Playwright keyboard-only test) Tab through every
   interactive control on the page and confirm each is reachable and
   operable without a mouse.
3. Toggle `prefers-reduced-motion` and repeat every capability's primary
   interaction, confirming no functionality is lost.
4. Record the resulting pass/fail state for every checkbox above in this
   file once implementation is complete (checkboxes above stay unchecked
   until then).
