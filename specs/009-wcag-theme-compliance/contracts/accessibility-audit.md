# Contract: Automated WCAG 2.1 AA Audit Gate

Defines the merge-blocking accessibility audit that enforces FR-013 / SC-003. It runs inside the
existing Playwright `e2e` CI job, which is already a required status check under branch protection —
so this audit is merge-blocking without any new CI/branch-protection wiring.

## Tooling

- `@axe-core/playwright` (new dev dependency), driving axe-core in Playwright's Chromium.
- New spec: `e2e/accessibility.spec.ts`.

## Scope — audited surfaces

Primary user-facing routes (per Assumptions; dev-only `/color-test` and NotFound chrome excluded):
- `/` — Landing
- `/dashboard` — Dashboard (board list)
- `/perfil` — Profile
- `/retrospective/:id` — Board, including its cards/columns, voting, grouping indicators
- Transient surfaces reachable from the board: at least one modal, the theme menu, a toast, and the
  date picker, scanned while open.

## Matrix — every surface × both themes

Each audited surface MUST be scanned twice: once in **light** theme, once in **dark** theme
(toggle by setting `localStorage.theme` / applying the `.dark` class before the scan).

## axe configuration

- Tags: `['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']`.
- Rules of particular interest (must not be disabled): `color-contrast`, `link-in-text-block`,
  `focus-order-semantics`, and use-of-color-adjacent checks.
- Disabling or excluding a rule to make the suite pass is prohibited (would violate Principle VIII);
  narrowly scoped, documented exclusions for known third-party widgets are the only exception and
  MUST be justified inline.

## Pass / fail criteria (MUST)

- For every (surface × theme) scan, `accessibilityScanResults.violations` MUST be empty.
- Any non-empty violations array fails the Playwright test → fails the `e2e` job → blocks merge.
- The failure output MUST identify the rule id, the offending selector, and the theme, so the fix
  is actionable.

## Relationship to unit-level checks

- `contrast.ts` unit tests verify the token/swatch **palette** exhaustively and fast (pre-commit/CI
  unit stage). The axe audit verifies the **rendered application** (catches surfaces that bypassed
  tokens, dynamic states, and real computed contrast). Both must pass; they are complementary, not
  redundant.
