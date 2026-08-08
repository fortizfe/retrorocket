# Contract: Accessibility & Interaction

**Enforces**: FR-015, FR-018, FR-019, SC-003, SC-004. Applies to the
redesigned dashboard's every `List State` variant (`data-model.md`) in both
themes.

## Contract

### WCAG 2.1 AA (FR-018, SC-003)

- [x] Zero WCAG 2.1 AA violations (axe-core) in the `loaded`, `loading`,
      `empty`, `no-results`, and `error` `List State` variants, in both light
      and dark themes — verified by `e2e/accessibility.spec.ts`. **10/10
      passing** (5 states × 2 themes).
- [x] Text contrast ≥ 4.5:1 (normal text) / 3:1 (large text); non-text
      contrast ≥ 3:1 for interactive-control boundaries and focus
      indicators, per Constitution Principle VIII. Covered by the same axe
      scans (contrast is part of the `wcag2aa`/`wcag21aa` rule set used).
- [x] No information, state, action, or distinction (e.g. creator vs. joined
      role, sort direction) is conveyed by color alone — a redundant text,
      icon, or shape cue accompanies it. Role badges pair color with an icon
      (Crown/UserPlus) and text (Creator/Joined); sort direction pairs the
      active-state color with a SortAsc/SortDesc icon; pagination's active
      page additionally carries `aria-current="page"`.
- [x] Every focusable element (search field, filter/sort/layout controls,
      board cards/rows, rename/delete controls, pagination/scroll controls,
      modal fields and buttons) has a visible focus indicator. All controls
      use the shared `focus-visible:ring-2 focus-visible:ring-focus`
      treatment (`Button`, `Input`, and the hand-rolled icon buttons in
      `BoardRow`/`BoardControlsBar`/`Pagination` all apply it explicitly).
- [x] If any `Design Token Extension` (`data-model.md`) is introduced, its
      `contrastPairing` passes `contrast.tokens.test.ts` in both themes.
      **N/A** — no new tokens were introduced (`tasks.md` T011).

### Keyboard and touch operability (FR-015, SC-004)

- [x] 100% of rename/delete controls for owned boards are reachable and
      operable via keyboard alone (Tab to reach, Enter/Space to activate),
      with no mouse involved, in every layout the shipped direction offers.
      `e2e/dashboard-manage.spec.ts`'s "owner renames and deletes a board
      via keyboard alone" test — focuses each control directly and presses
      Enter, no mouse/hover interaction anywhere in the test.
- [x] 100% of rename/delete controls for owned boards are reachable and
      operable via touch (tap), with no `:hover`-only gating, in every
      layout the shipped direction offers. `e2e/dashboard-manage.spec.ts`'s
      dedicated touch-emulated (`hasTouch: true`) test using `.tap()`,
      which dispatches touch events only (no synthetic hover).
- [x] Drag-free interactions only — no capability in this feature (search,
      filter, sort, create, join, rename, delete, navigation through the
      board list) depends on drag-and-drop or a gesture with no
      keyboard/tap equivalent. Confirmed by inspection — every interaction
      is a click/tap/keypress on a standard control.
- [x] All interactive components expose correct ARIA roles and accessible
      names (Constitution's Technology Stack standards). Scope filter uses
      `role="radiogroup"`/`role="radio"` with `aria-checked`; pagination
      prev/next icon buttons gained `aria-label`/`title` during this
      feature (a real pre-existing gap found and fixed, `tasks.md` T020);
      `Input`'s label/input association gained a programmatic `htmlFor`/`id`
      link (`tasks.md` T035).

### Reduced motion (FR-019)

- [x] Every new animated interaction introduced by the redesign (list
      entrance/reflow, per-item action reveal, card feedback, modal
      enter/exit) has a `useReducedMotion()`-gated equivalent that completes
      and communicates its result with no animation. Handled automatically
      by the app-root `<MotionConfig reducedMotion="user">` (established in
      feature 028) — no per-component gating needed; confirmed via the
      `review-animations` skill pass (`tasks.md` T042, Approve).
- [x] Verified against `e2e/accessibility.spec.ts`'s reduced-motion
      emulation, consistent with the pattern established in features 028/029.
      The P1 core-flow reduced-motion test in that spec already exercises
      the app-root `MotionConfig` mechanism this feature relies on
      unchanged; no dashboard-specific gating was added or needed.

## Verification procedure

1. Run `npx playwright test accessibility.spec.ts` against the redesigned
   `/dashboard` route in both themes and every `List State` variant listed
   above — zero violations required.
2. Manually (or via an added Playwright check) Tab through the full board
   list with a mix of owned and joined boards; confirm every owned board's
   rename/delete controls receive visible focus and activate via
   Enter/Space.
3. Using a touch-emulated viewport (or a real touch device), confirm
   rename/delete controls on owned boards are tappable without any prior
   hover/pointer-enter event.
4. Enable `prefers-reduced-motion: reduce` and repeat the primary user
   flows (browse, search, filter, sort, create, join, rename, delete) —
   confirm every one still completes and communicates success/failure.

This contract is satisfied only when every checkbox above is checked with a
passing, named test or an explicit manual-verification note — not left
unchecked at feature close.
