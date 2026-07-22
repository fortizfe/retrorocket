# Quickstart: Validate WCAG 2.1-Compliant Themes

A run/validation guide proving both themes meet WCAG 2.1 AA. Implementation details live in
`tasks.md`; this file is how you confirm the feature works end-to-end.

## Prerequisites

- Repo checked out on branch `009-wcag-theme-compliance`.
- Node + project deps installed in `retro-rocket/`:
  ```bash
  cd retro-rocket
  npm install
  npm install -D @axe-core/playwright   # if not yet added by implementation
  npx playwright install --with-deps chromium
  ```

## 1. Token & swatch contrast (fast, deterministic)

Verifies every semantic token pairing and every `CARD_COLORS` swatch meets AA in both themes.

```bash
npm run test:run -- src/test/lib/theme src/test/lib/utils/cardColors.test.ts
```

**Expected**: all contrast assertions pass — each text pairing ≥4.5:1 (≥3:1 large), each
border/focus/status pairing ≥3:1, in **both** light and dark; token names have parity across
`:root`/`.dark`/Tailwind (no orphans).

## 2. Full automated accessibility audit (rendered app, both themes)

Runs the axe scan across primary routes in light and dark, inside the emulator-backed E2E run.

```bash
npm run e2e -- accessibility.spec.ts
```

**Expected**: zero axe violations for every (surface × theme) pair. A non-empty violations array
fails the test and prints rule id + selector + theme. This is the same job that gates merges in CI.

See [contracts/accessibility-audit.md](./contracts/accessibility-audit.md) for scope and config,
and [contracts/design-tokens.md](./contracts/design-tokens.md) for the token contract.

## 3. Manual keyboard & focus spot-check (User Story 3)

```bash
npm run dev
```

Then, in the browser, for **each** theme (toggle via the header control):
1. Press `Tab` through Landing → Dashboard → a Board (cards, voting, column menus, a modal, the
   date picker). Every focused element shows a clearly visible focus ring (≥3:1). **0 invisible
   focus states.**
2. Confirm status/among elements (success/warning/error, selected card, disabled control, vote
   count, sentiment/clustering indicator) each carry a non-color cue (icon/text/shape) — meaning is
   never color-only.
3. Toggle the theme mid-board: every surface re-themes with nothing left in the previous palette.

## 4. Coverage floor unaffected

```bash
npm run test:coverage
```

**Expected**: coverage stays at or above the thresholds in `vitest.config.ts`
(branches 78 / functions 64 / lines 50 / statements 50) — new theme logic ships with its own tests.

## Success mapping

| Check | Spec criteria |
|-------|---------------|
| Step 1 | SC-001, SC-002, SC-005 (palette-level), FR-002/003/004/007/008/015 |
| Step 2 | SC-003, FR-001/009/013 (merge-blocking rendered audit) |
| Step 3 | SC-004, SC-005, FR-005/006/010 |
| Step 4 | Constitution VI (coverage floor not lowered) |
