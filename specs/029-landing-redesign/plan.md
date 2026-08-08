# Implementation Plan: Landing Page Redesign (Apple HIG-Inspired)

**Branch**: `029-landing-redesign` | **Date**: 2026-08-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/029-landing-redesign/spec.md`

## Summary

Completely rebuild the visual layout and look-and-feel of the unauthenticated
landing page (`Landing.tsx`, including its embedded first-time profile-setup
view) using an abstract, typography-/motion-led design language built on
Apple Human Interface Guidelines principles (clarity, deference, depth), via
the project's mandated Apple-design skill package. Per the resolved
clarifications, the redesign explores 2-3 genuinely distinct visual
directions (`prototype` skill) before the product owner picks one, may
freely restructure content sections as long as existing messaging is
preserved, targets a sub-2.5s hero LCP with a progressive fade-in (no
skeleton/blank hold), and must not touch product screenshots/mockups —
motion, type, and abstract graphics only. All existing functional behavior
(Google/GitHub sign-in, first-time display-name setup, the MCP `returnTo`
passthrough, `auth_error` toast surfacing, theme toggle, redirect-when-
authenticated) and quality bars (WCAG 2.1 AA both themes, i18next en/es,
existing automated test coverage) must continue to work unchanged.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.2, built with Vite 4

**Primary Dependencies**: Tailwind CSS 3.3 (semantic CSS-custom-property
token system — `src/lib/theme/tokens.ts` / `tailwind.config.cjs`),
framer-motion 10.18 (already the project's adopted motion library),
react-i18next, lucide-react (icons), clsx, the existing shared UI primitives
(`src/lib/components/ui/*` — Button, Card, Skeleton, ThemeToggle, …) and the
existing `useReducedMotion` hook (`src/lib/hooks/useReducedMotion.ts`,
introduced in feature 028)

**Storage**: N/A — this feature is presentation-only; no Firebase/Firestore
data or access pattern is touched

**Testing**: Vitest + Testing Library (unit/component, coverage-gated per
`vitest.config.ts` at branches 78 / functions 64 / lines 50 / statements 50),
Playwright E2E — `e2e/authentication.spec.ts` (sign-in buttons, sign-out
returns to landing) and `e2e/accessibility.spec.ts` (axe-core WCAG 2.1 AA
audit for Landing in both themes, plus keyboard tab-order check)

**Target Platform**: Web browser (responsive mobile/tablet/desktop
viewports), light and dark themes, both currently supported `i18next`
locales (English, Spanish)

**Project Type**: Existing React SPA frontend (`retro-rocket/src`); this
feature does not touch `retro-rocket/server` or the MCP backend

**Performance Goals**: Hero/CTA visually complete and interactive within 2.5s
on a typical broadband connection (SC-004, Core Web Vitals "good" LCP);
animation runs on compositor-friendly properties (`transform`/`opacity`)
targeting 60fps, consistent with the constraint established in feature 028

**Constraints**: Zero functional regression to sign-in, first-time profile
setup, the MCP `returnTo` redirect, `auth_error` surfacing, theme toggle, and
authenticated-redirect behavior (FR-002, FR-009); visual treatment MUST stay
abstract/typographic/motion-led with no literal product screenshots or
mockups (FR-001); content sections MAY be freely restructured but existing
messaging MUST be preserved (FR-001a, FR-008); WCAG 2.1 AA MUST hold in both
themes (FR-004, constitution Principle VIII), enforced by
`contrast.tokens.test.ts` (if tokens change) and `e2e/accessibility.spec.ts`;
every animated interaction MUST honor `prefers-reduced-motion` via the
existing `useReducedMotion` hook (FR-005); all user-visible text MUST stay in
`i18next` for English and Spanish (FR-003); loading state MUST be a
progressive fade/reveal, never a blank hold or skeleton UI (FR-011); at least
2-3 visual directions MUST be explored via the `prototype` skill and the
product owner MUST approve the one that ships before implementation proceeds
(FR-010); existing Vitest coverage thresholds MUST NOT drop

**Scale/Scope**: Single page scope — `src/pages/Landing.tsx` and its embedded
first-time profile-setup view only; the current 7-section layout (hero, auth
CTA, quick features, main features, how-it-works, technology stack, final
message + footer) is a content inventory baseline, not a fixed target
structure (FR-001a); 2 locales (en/es); 2 themes (light/dark)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Any behavior-preserving logic touched during the rebuild (auth handlers, `auth_error` param handling, `returnTo` passthrough, authenticated-redirect) MUST have its existing/extended test written or updated first; presentation-only markup/motion has no pre-existing behavior to protect and follows the same no-new-test convention established in feature 028 unless a new reusable utility is introduced. | PASS — enforced in Phase 2 task ordering |
| II. Library-First | No new domain capability is introduced. If a landing-specific composition helper (e.g. a section-reveal wrapper) is needed and reusable, it MUST live in `src/lib`, not be duplicated inline. | PASS |
| III. Prefer Proven Third-Party Libraries | Motion stays on the already-adopted framer-motion; abstract visuals (gradients, shapes) use native CSS — no new dependency is anticipated. Any dependency proposed during prototyping (e.g. a canvas/WebGL library for a candidate direction) MUST be justified per this principle — active maintenance, bundle-size impact, license, non-duplication — before adoption. | PASS — conditional gate re-checked in Phase 1 if a candidate direction proposes one |
| IV. SOLID | Presentation-only rebuild; no Firestore access or domain service is touched. | PASS |
| V. Simplicity (KISS + YAGNI) | Scope is bounded to one page (FR scope above); the prototype phase explores exactly 2-3 directions (not open-ended exploration) before converging on one. | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | Coverage thresholds in `vitest.config.ts` (78/64/50/50) MUST NOT drop; `src/test/pages/Landing.test.tsx` MUST be updated alongside the rebuild, not deleted. | PASS — verified per task |
| VII. E2E Testing with Playwright | `e2e/authentication.spec.ts` and `e2e/accessibility.spec.ts` MUST keep passing, updated only for intentional structural/selector changes, never weakened. | PASS — verified per task |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | Zero WCAG 2.1 AA violations in both themes (SC-003); if new tokens are introduced for the chosen direction's gradients/typography, every `CONTRAST_PAIRINGS` entry MUST keep passing per `contrast.tokens.test.ts`. | PASS — hard gate, re-verified after Phase 1 |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | `apple-design`/`emil-design-eng` govern the general visual redesign; `prototype` is mandatory for the 2-3 candidate directions (FR-010); `animate` governs each new motion decision; `review-animations` governs the final critique pass; `pick-ui-library` governs any new UI-library need. Skill used MUST be recorded per design decision in Phase 1 artifacts. | PASS — this plan's data model and quickstart are structured around the mandated skill sequence |

No violations requiring justification. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: `data-model.md`, `contracts/*`, and `quickstart.md`
introduce no new dependency (the `Visual Direction.newDependencies` field
stays conditional/empty unless a candidate direction requires one, in which
case Principle III must be re-justified before that direction can be
`selected`), no Firestore/domain-service change, and no reduction in test or
accessibility coverage — all nine gates above still PASS unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/029-landing-redesign/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/             # Phase 1 output (/speckit-plan command)
│   ├── content-inventory-contract.md
│   ├── visual-direction-review-contract.md
│   └── i18n-key-migration-contract.md
├── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
└── design-review.md      # Implementation output (T039, SC-005 sign-off record)
```

### Source Code (repository root)

```text
retro-rocket/
├── src/
│   ├── pages/
│   │   └── Landing.tsx                    # Primary rebuild target (hero, CTA, all sections, footer, first-time profile-setup view)
│   ├── features/
│   │   └── auth/components/
│   │       ├── AuthButtonGroup.tsx        # Consumed unchanged behaviorally; restyled only to match new visual system
│   │       ├── UserProfileForm.tsx        # Consumed unchanged behaviorally; restyled only to match new visual system
│   │       └── AuthWrapper.tsx            # Unchanged — routing/guard logic only
│   ├── lib/
│   │   ├── theme/
│   │   │   ├── tokens.ts                  # May gain new gradient/accent token values for the chosen direction
│   │   │   └── contrast.ts                # WCAG contrast math — unchanged, re-used to validate any new token values
│   │   ├── hooks/
│   │   │   └── useReducedMotion.ts        # Reused as-is (introduced in feature 028)
│   │   └── components/ui/                 # Shared primitives reused where applicable (Button, ThemeToggle, Skeleton, …)
│   └── locales/
│       ├── en.json                        # `landing` namespace — keys added/removed/renamed per the chosen section structure
│       └── es.json                        # Kept in lockstep with en.json
├── src/test/pages/Landing.test.tsx        # Updated alongside the rebuild, not deleted (FR-009)
└── e2e/
    ├── authentication.spec.ts             # Updated only for intentional selector/structure changes
    └── accessibility.spec.ts              # Updated only for intentional selector/structure changes; assertions not weakened
```

**Structure Decision**: No new top-level directories and no backend/API
changes. This feature works entirely inside the existing
`retro-rocket/src` frontend tree, following the existing `pages/` (route-level
screens) vs `features/*` (domain capability) vs `lib/*` (shared/reusable)
split already used by feature 028. The one new artifact class is the set of
2-3 prototyped visual directions produced during Phase 1/implementation via
the `prototype` skill — these are design-review artifacts (not shipped code)
and do not introduce a new source directory.

## Complexity Tracking

> Not applicable — no Constitution Check violations were identified.
