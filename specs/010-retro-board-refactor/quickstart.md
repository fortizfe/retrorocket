# Quickstart / Validation Guide: Retrospective Board Refactor

How to run and validate that this feature works end-to-end. Implementation
details live in `tasks.md`; this guide proves the outcomes in `spec.md`
(SC-001…SC-008).

## Prerequisites

- Node + repo installed: from `retro-rocket/`, `npm install`.
- New dependency added: `npm install @floating-ui/react`.
- Firebase CLI available for E2E (`firebase` via devDependency).

## Commands

```bash
cd retro-rocket

# Static gates
npm run type-check          # strict TS, no new `any`
npm run lint                # ESLint incl. jsx-a11y

# Unit / component tests + coverage floor
npm run test:run
npm run test:coverage       # must stay >= thresholds in vitest.config.ts (78/64/50/50)

# End-to-end (starts Firebase emulators, runs Playwright incl. axe)
npm run e2e

# Manual visual check
npm run dev                 # open the app, join a retrospective board
```

## Validation scenarios

### SC-001 — Card wrapping (User Story 1)
1. Create a card whose content is a single ~200-char URL (no spaces).
2. Create a card with a single ~80-char word.
3. Create a card with manual line breaks.
- **Expect**: each card shows full content wrapped inside its width; no
  horizontal overflow of card or column; the URL is a clickable link; manual
  line breaks preserved.
- **Automated**: `e2e/card-lifecycle.spec.ts` asserts the card's
  `scrollWidth <= clientWidth`; unit test on `LinkifyText` asserts a long URL
  wraps.

### SC-002 — No horizontal scroll (User Story 2)
1. Open a board with 3 columns at ~1280px and ~1440px width.
2. Enable the action-items column (4 columns); repeat.
3. Shrink below ~1024px.
- **Expect**: no horizontal scrollbar on the board region in the 3- and 4-column
  cases; columns share width; below 1024px they stack.
- **Automated**: component/E2E assertion that board `scrollWidth <= clientWidth`
  for both column counts; grid helper unit test returns non-purgeable classes for
  3 and 4.

### SC-003 / SC-004 — Picker anchored & in-viewport (User Story 3)
1. Open the reaction picker from a card at the top of the board.
2. Open it from a card near the bottom / right edge.
3. While open, scroll the board and resize the window.
4. Select an emoji, then reopen and press Escape, then reopen and click outside.
- **Expect**: picker appears already at the trigger (no flash from top/corner);
  stays fully visible near edges; repositions to stay anchored during
  scroll/resize; closes on select/Escape/outside-click and returns focus.
- **Automated**: unit test asserts computed position is anchored (not
  `{top:0,left:0}`) before visible; E2E asserts the panel is within the viewport
  and dismisses correctly.

### SC-005 / SC-006 — Constitution compliance (User Story 4)
- **No hardcoded strings**: `grep -rn "Cargando\|Haz clic\|es-ES" src/features/boards/retrospective src/features/boards/clustering` returns nothing in shipped board components.
- **No hardcoded palette**: `grep -rnE "text-gray-|bg-gray-|text-red-[0-9]|border-blue-" src/features/boards/retrospective/components src/features/boards/clustering/components` returns nothing in kept files.
- **Single board impl**: `grep -rn "EnhancedRetrospectiveBoard\|RetrospectiveCard\b\|RetrospectiveColumn\b" src` returns nothing (files and dead tests deleted).

### SC-007 — No regressions
- `npm run test:run` all green; `npm run test:coverage` ≥ enforced thresholds;
  `npm run e2e` critical flows (board creation, card lifecycle, facilitator
  countdown, export, auth) pass.

### SC-008 — Accessibility in both themes
- `e2e/accessibility.spec.ts` runs `@axe-core/playwright` on the board in light
  **and** dark themes and reports zero WCAG 2.1 AA violations; every interactive
  board control shows a visible focus indicator.

## Definition of Done (this feature)

- [ ] All SC-001…SC-008 scenarios pass (manual + automated).
- [ ] Dead components + their tests removed; single live board path remains.
- [ ] New/extracted components + hooks have unit tests written test-first.
- [ ] Type-check, lint, unit+coverage, and Playwright (incl. axe) all green.
- [ ] New i18n keys present in `en.json` and `es.json`.
