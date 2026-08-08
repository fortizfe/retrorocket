# Phase 0 Research: Landing Page Redesign (Apple HIG-Inspired)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

No `NEEDS CLARIFICATION` markers remain in the Technical Context — all
technical unknowns were resolvable directly from the existing codebase
(package.json, tailwind config, token catalog, test suites) or were already
settled during `/speckit-clarify`. This document records the resulting
implementation-approach decisions and the alternatives considered for each.

## 1. Motion & rendering approach for the abstract visual treatment

**Decision**: Build the abstract/typography-/motion-led hero and section
treatments using framer-motion (already adopted, 91+ files) plus native CSS
(gradients, `backdrop-filter`, CSS custom properties for the token system) —
the same toolset feature 028 confirmed as sufficient for the rest of the
app's Apple-inspired motion work.

**Rationale**: Constitution Principle III (Prefer Proven Third-Party
Libraries) requires justifying any new dependency; framer-motion + CSS
already cover everything an abstract, motion-led design needs (staggered
reveals, parallax-style depth via transform/opacity, animated gradients) at
zero new bundle cost. Compositor-friendly properties (`transform`/`opacity`)
keep the page within the 60fps / 2.5s LCP budget (SC-004).

**Alternatives considered**:
- **Canvas/WebGL library (e.g. three.js, OGL)** — rejected as a default:
  materially larger bundle and a new dependency to justify per Principle III,
  and risks the LCP budget on lower-end devices/connections. Not ruled out
  forever — if one of the 2-3 prototyped directions genuinely requires it,
  that direction's `prototype`-skill writeup must include the bundle-size and
  Principle III justification before it can be selected.
- **Lottie/After Effects-exported animation** — rejected: adds a build
  dependency and asset pipeline for a single page, disproportionate to scope
  (Principle V, Simplicity).

## 2. Prototyping mechanics for the 2-3 candidate directions (FR-010)

**Decision**: Each candidate direction is built as an isolated, fully
functional variant of `Landing.tsx` (reusing the real `AuthButtonGroup`,
`UserProfileForm`, and auth/theme/i18n wiring so sign-in actually works in
every candidate) via the `prototype` skill, viewable side-by-side for
product-owner review before one is selected and the other(s) discarded.

**Rationale**: FR-010 requires genuinely distinct, comparable directions,
and SC-006 requires the product owner to review real candidates, not static
mockups — a non-functional mockup can't be evaluated against FR-002's
"zero functional regression" bar. Building each as a real, working page
variant means the winning direction is already integration-ready once
chosen, avoiding a second "now make it real" pass.

**Alternatives considered**:
- **Static image/Figma mockups** — rejected: can't validate motion,
  reduced-motion behavior, responsive behavior, or that sign-in still works;
  would require a second build phase after selection, doubling effort.
- **Single direction, no prototyping** — rejected: explicitly against the
  resolved clarification for FR-010.

## 3. Design-token strategy for the new visual language

**Decision**: Start from the existing semantic token catalog
(`src/lib/theme/tokens.ts`) and extend it only if the selected direction
needs values the current catalog doesn't provide (e.g. a new gradient-stop
accent pair). Any new token MUST be added to `CONTRAST_PAIRINGS` and pass
`contrast.tokens.test.ts` in both themes before use.

**Rationale**: The token system is the established single source of truth
(feature 028) and already guarantees WCAG 2.1 AA math; reusing it keeps
FR-004/SC-003 enforcement automatic rather than manually re-verified per new
color. Extending rather than replacing avoids destabilizing every other
surface that consumes the same tokens.

**Alternatives considered**:
- **Fully separate landing-only palette outside the token system** —
  rejected: bypasses the automated contrast gate (Principle VIII risk) and
  fragments the design system the rest of the app just aligned to (028).

## 4. Content restructuring & i18n key strategy (FR-001a, FR-008)

**Decision**: The `landing` i18next namespace (`en.json`/`es.json`) is
restructured in lockstep with whatever section layout the selected direction
uses. Every existing message (value proposition, feature highlights,
how-it-works, trust/technology signals) is carried over — reworded or
regrouped as needed for the new narrative — never silently dropped. A
before/after key mapping is produced as part of implementation (see
`contracts/i18n-key-migration-contract.md`) so both locale files stay in
lockstep and no key is orphaned in one locale but not the other.

**Rationale**: FR-001a grants full restructuring freedom but FR-008
prohibits losing informational content; the only way to guarantee both is an
explicit mapping step reviewed before the old keys are removed.

**Alternatives considered**:
- **Keep all 7 existing section keys verbatim, only restyle** — rejected:
  contradicts the resolved clarification granting full restructuring
  latitude, and would constrain the prototyped directions artificially.

## 5. Loading-state implementation (FR-011)

**Decision**: Use framer-motion's `whileInView`/mount-time `initial`→
`animate` fade+offset pattern already established in feature 028 (DAF-023)
for below-the-fold content, and a straightforward opacity fade-in gated on
asset/font readiness for the hero itself — no skeleton component, no
blank-until-ready gate.

**Rationale**: Matches the resolved clarification (progressive fade/reveal,
no skeleton/blank hold) and reuses the exact pattern feature 028 already
validated against the accessibility E2E suite's motion-neutralizing CSS
override, minimizing new test-timing risk.

**Alternatives considered**:
- **`Skeleton.tsx` shared primitive** — available in the codebase but
  rejected for this surface per the resolved clarification (Q3): a landing
  page's hero is small enough to fade in directly rather than warranting
  placeholder geometry.

## 6. Test strategy for behavior preservation

**Decision**: Extend, not replace, `src/test/pages/Landing.test.tsx`,
`e2e/authentication.spec.ts`, and `e2e/accessibility.spec.ts`. Where the
rebuild changes DOM structure/selectors, update the affected assertions in
place (same behavior, new markup); add new assertions only for genuinely new
UI surface (e.g. a new section). No existing assertion is deleted without a
like-for-like replacement.

**Rationale**: FR-009 requires no net loss of coverage for FR-002/FR-004
behaviors; Principle I (TDD) requires any behavior-preserving logic change to
be covered by a test that existed or was updated before the implementation
change ships.

**Alternatives considered**:
- **Delete and rewrite test files from scratch** — rejected: higher risk of
  silently losing coverage for an edge case (e.g. the `auth_error` toast
  path) that isn't top-of-mind during a visual rebuild.
