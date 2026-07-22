# Implementation Plan: WCAG 2.1-Compliant Light & Dark Themes

**Branch**: `009-wcag-theme-compliance` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-wcag-theme-compliance/spec.md`

## Summary

Rebuild the light and dark themes so both independently conform to WCAG 2.1 Level AA
(4.5:1 text, 3:1 large-text/non-text, visible focus, no meaning by color alone), and enforce
it with an automated, merge-blocking accessibility audit.

Technical approach: introduce a **single semantic color-token layer** (CSS custom properties in
`globals.css` for `:root` and `.dark`, surfaced through `tailwind.config.js`), migrate the ~94
components currently using ad-hoc `bg-slate-*/dark:bg-slate-*` utilities onto those tokens,
harden the existing curated `CARD_COLORS` palette so every swatch is AA-compliant in both themes,
add a pure WCAG contrast utility with unit tests that assert every token/swatch meets threshold,
and add an `@axe-core/playwright` audit that scans the primary screens in **both themes** as part
of the existing (already merge-blocking) Playwright E2E job.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.2

**Primary Dependencies**: Vite 4, Tailwind CSS 3.3 (`darkMode: 'class'`), framer-motion,
lucide-react, @headlessui/react, i18next; testing: Vitest 3 + Testing Library + jsdom,
Playwright 1.61 (Chromium, via Firebase Emulator Suite). New: `@axe-core/playwright` (dev).

**Storage**: Theme preference in `localStorage` (`theme` key); no backend change. Firestore untouched.

**Testing**: Vitest unit/component tests; Playwright E2E. New WCAG audit runs inside the E2E job.

**Target Platform**: Modern evergreen browsers (SPA), light & dark themes via `.dark` class on `<html>`.

**Project Type**: Single-project web application (`retro-rocket/`).

**Performance Goals**: Theme toggle remains visually instant (no perceptible reflow/flash);
first paint uses the correct theme (no flash of wrong theme).

**Constraints**: WCAG 2.1 Level AA on all primary user-facing surfaces in both themes; must not
lower existing Vitest coverage thresholds (branches 78 / functions 64 / lines 50 / statements 50);
no new user-visible hardcoded strings (route through i18next); TypeScript `strict`, no `any`.

**Scale/Scope**: ~94 component files / ~1331 `dark:` utilities to migrate; ~5 primary audited
routes (`/` Landing, `/dashboard`, `/perfil` Profile, `/retrospective/:id` Board, plus its modals/
menus). `/color-test` (dev tooling) and `NotFound` chrome are out of the audit's AA gate scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against Constitution v3.1.0:

- **I. TDD (NON-NEGOTIABLE)**: PASS — the contrast utility, hardened `CARD_COLORS` configs, and the
  axe audit spec are written test-first (failing token/contrast assertions before fixing colors).
- **II. Library-First**: PASS — token definitions and the WCAG contrast utility live as decoupled
  modules under `src/lib/theme/` with clear public interfaces before UI wiring.
- **III. Prefer Proven Libraries**: PASS — `@axe-core/playwright` (industry-standard a11y engine)
  instead of a hand-rolled contrast scanner; reuses existing Tailwind/Playwright/Vitest stack.
- **IV. SOLID**: PASS — contrast utility is a pure function; token layer decouples color decisions
  from components (a color role is decided once, consumed everywhere).
- **V. Simplicity (KISS/YAGNI)**: PASS — no runtime theme editor, no new theming library; semantic
  tokens via CSS variables are the minimal mechanism. The card picker keeps its existing fixed set.
- **VI. Coverage Floor (NON-NEGOTIABLE)**: PASS — new logic (contrast util, palette) is unit-tested;
  thresholds in `vitest.config.ts` are not lowered.
- **VII. E2E Playwright (NON-NEGOTIABLE)**: PASS — audit added to the existing Playwright suite; a
  theme-toggle E2E path is covered.
- **VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE)**: PASS — this feature implements it and adds
  the merge-blocking automated gate the principle calls for.
- **Additional Standards**: i18n — ThemeToggle currently hardcodes Spanish labels; migration routes
  them through i18next (no new hardcoded strings). Strict types preserved.

No violations. **Complexity Tracking is empty.**

## Project Structure

### Documentation (this feature)

```text
specs/009-wcag-theme-compliance/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── design-tokens.md         # Semantic color-token contract (roles → AA rules)
│   └── accessibility-audit.md   # axe/Playwright gate contract (tags, scope, pass criteria)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
retro-rocket/
├── tailwind.config.js               # Map semantic tokens → rgb(var(--…)) with <alpha-value>
├── src/
│   ├── styles/
│   │   └── globals.css              # Define --color-* tokens under :root and .dark
│   ├── lib/
│   │   ├── theme/                   # NEW module (Library-First)
│   │   │   ├── tokens.ts            # Token name catalog + hex source-of-truth per theme
│   │   │   └── contrast.ts          # Pure WCAG contrast-ratio + AA-threshold helpers
│   │   ├── utils/
│   │   │   └── cardColors.ts        # Harden CARD_COLORS: AA-compliant bg/border/text per theme
│   │   └── components/
│   │       ├── ui/                  # ThemeToggle, ThemeMenuToggle, Modal, Input, etc. → tokens
│   │       └── layout/              # Header, etc. → tokens
│   ├── features/**                  # Board/card/column surfaces → tokens + non-color state cues
│   └── pages/**                     # Landing, Dashboard, Profile → tokens
├── src/test/
│   └── lib/theme/                   # NEW unit tests: contrast.test.ts, tokens.test.ts
│       └── (cardColors.test.ts extended with AA assertions)
└── e2e/
    └── accessibility.spec.ts        # NEW: axe scan of primary routes in light AND dark themes
```

**Structure Decision**: Single-project web app. New theming concerns are isolated in a decoupled
`src/lib/theme/` module (tokens + contrast utility) consumed by components via Tailwind semantic
classes. The token catalog is the single source of truth; the contrast unit tests and the axe E2E
audit form a two-layer verification (fast deterministic token checks + real-render browser audit).

## Complexity Tracking

> No constitution violations — section intentionally empty.
