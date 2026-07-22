# Phase 0 Research: WCAG 2.1-Compliant Light & Dark Themes

All items below were decidable from the codebase and WCAG 2.1 AA best practice; no open
NEEDS CLARIFICATION remain (the four spec clarifications already resolved level, enforcement,
color-picker strategy, and theme-selection behavior).

## R1. Theming mechanism — semantic tokens via CSS variables mapped into Tailwind

- **Decision**: Define semantic color tokens as CSS custom properties in `globals.css` under
  `:root` (light) and `.dark` (dark), e.g. `--color-surface`, `--color-text`, `--color-focus`.
  Expose them in `tailwind.config.js` `theme.extend.colors` as
  `surface: 'rgb(var(--color-surface) / <alpha-value>)'`, so components use `bg-surface`,
  `text-text-primary`, `ring-focus` etc. Values stored as space-separated RGB channels to keep
  Tailwind's opacity modifiers working.
- **Rationale**: One color role is decided once per theme and reused everywhere, which is what
  makes "both themes independently AA" verifiable and prevents the current pattern of ad-hoc
  `bg-x-50 dark:bg-x-800` pairs drifting out of compliance. Keeps Tailwind ergonomics and the
  existing `darkMode: 'class'` toggle; no new runtime dependency.
- **Alternatives considered**:
  - *Keep per-utility `dark:` pairs, just fix colors* — rejected: 1331 scattered decisions,
    impossible to audit centrally, regressions inevitable (violates Principle VIII intent).
  - *A dedicated theming library (e.g. next-themes, CSS-in-JS themes)* — rejected by KISS/YAGNI;
    the existing class-based toggle already works and only the palette needs to change.
  - *Tailwind v4 `@theme`* — rejected: project is on Tailwind 3.3; upgrading is out of scope.

## R2. Automated audit tool — @axe-core/playwright inside the existing E2E job

- **Decision**: Add `@axe-core/playwright` (dev dependency) and a new `e2e/accessibility.spec.ts`
  that runs axe with tags `['wcag2a','wcag2aa','wcag21a','wcag21aa']` against each primary route,
  once per theme, asserting `results.violations` is empty. It runs in the existing `e2e` CI job
  (already a required, merge-blocking check via branch protection), satisfying FR-013/SC-003.
- **Rationale**: axe-core is the de-facto standard engine; `color-contrast` and use-of-color-
  adjacent rules require real browser layout/rendering, which Playwright's Chromium provides
  (jsdom cannot compute contrast). Reusing the already-gated E2E job means no new CI wiring or
  branch-protection change is needed — the audit is merge-blocking the moment the spec exists.
- **Alternatives considered**:
  - *jest-axe / vitest-axe in jsdom* — rejected as the gate: jsdom has no layout/computed color,
    so `color-contrast` is skipped; it would give false confidence. (May still be used for
    role/ARIA smoke checks, but contrast enforcement must be browser-based.)
  - *Lighthouse CI* — rejected: heavier, noisier, less precise per-rule control than axe.
  - *eslint-plugin-jsx-a11y alone* (already installed) — insufficient: static lint catches
    missing ARIA/alt but never contrast; kept as a complementary static check, not the gate.

## R3. Token-level fast verification — a pure WCAG contrast utility

- **Decision**: Implement `src/lib/theme/contrast.ts` with pure functions: relative luminance,
  `contrastRatio(fg, bg)`, and `meetsAA(fg, bg, { large })` (4.5:1 normal, 3:1 large/non-text).
  Unit tests assert every semantic token pair and every `CARD_COLORS` swatch meets AA in both
  themes, reading the hex source-of-truth from `src/lib/theme/tokens.ts`.
- **Rationale**: Gives deterministic, millisecond-fast, offline verification at the exact color
  values — catching regressions before the slower browser audit, and covering combinations the
  E2E audit might not exercise (e.g. status colors, disabled states). Satisfies TDD: the color
  fix is driven by a failing contrast assertion. Small, pure, fully unit-testable (Principle II/VI).
- **Alternatives considered**:
  - *Rely only on axe in E2E* — rejected: slower feedback loop and only covers rendered states
    that a test happens to reach; token-level math covers the palette exhaustively.
  - *Pull in a contrast npm package* — rejected by YAGNI; the WCAG formula is ~20 lines and
    keeping it in-repo avoids a dependency for trivial math.

## R4. Existing card palette (FR-015) — harden `CARD_COLORS`, keep the fixed set

- **Decision**: Keep the existing fixed `getAvailableColors()`/`CARD_COLORS` curated set (no
  free-form picker — already the case). Fix each config so background/border/text are AA-compliant
  in **both** themes. Current configs pair a light background (`bg-red-50`, no dark variant) with
  `dark:text-*-200` light text → fails badly in dark mode; add proper `dark:bg-*` backgrounds (or
  token-based surfaces) so each swatch's text meets 4.5:1 and its border meets 3:1 per theme.
- **Rationale**: FR-015 is already architecturally satisfied by a fixed swatch set; the work is
  correctness of the values, verified by the R3 contrast tests. Minimal, no picker redesign (KISS).
- **Alternatives considered**:
  - *Auto-compute foreground per color* — rejected in clarification (Q3=A) and by YAGNI.
  - *New swatch component* — unnecessary; the picker and `cardColors` util already exist and pass tests.

## R5. Non-color state cues & visible focus

- **Decision**: Standardize a single focus treatment token (`--color-focus`, ≥3:1 vs adjacent) as a
  `focus-visible` ring applied consistently across interactive components. For state conveyed by
  color (success/warning/error, selected, disabled, vote counts, sentiment/clustering indicators),
  ensure a redundant non-color cue exists: lucide icon, text label, shape, or pattern.
- **Rationale**: Directly implements WCAG 1.4.1 (Use of Color), 1.4.11 (Non-text Contrast), and
  2.4.7 (Focus Visible) — the parts contrast ratios alone don't cover (spec User Story 3).
- **Alternatives considered**: *Color-only states* — non-compliant by definition; rejected.

## R6. No flash of wrong theme / runtime toggle integrity (FR-010, FR-011)

- **Decision**: Keep the current `.dark`-class toggle and localStorage/`prefers-color-scheme`
  seeding. Ensure the class is applied before first paint (existing inline logic / early effect)
  and that all surfaces read from tokens so a single class flip re-themes everything with no
  element retaining prior-theme colors.
- **Rationale**: Token-driven surfaces make FR-010 (complete re-theme on toggle) structurally true
  rather than per-component. FR-011 (compliant first paint from system preference) already holds
  once both themes are compliant.
- **Alternatives considered**: *Adding a persisted "follow system" mode* — rejected in clarification
  (Q4=A); binary toggle retained.
