<!--
Sync Impact Report
- Version change: 3.1.0 → 3.2.0
- Rationale: MINOR bump. Adds a new Core Principle (IX. Apple-Inspired Design
  & Motion Tooling) making the use of the installed Apple-design-principles
  skill package (emil-design-eng, apple-design, animate, review-animations,
  improve-animations, find-animation-opportunities, prototype,
  animation-vocabulary, pick-ui-library) mandatory for any frontend task that
  involves visual design or motion/animation decisions. This is additive
  guidance, not a backward-incompatible removal or redefinition, hence MINOR
  per this constitution's versioning policy. "Technology Stack & Additional
  Standards" gains a cross-referencing bullet, and "Development Workflow &
  Quality Gates" gains a PR documentation expectation.
- Modified principles/sections:
  - Added: "IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE)"
  - "Technology Stack & Additional Standards" → added "UI & Motion Design
    Tooling" bullet cross-referencing Principle IX
  - "Development Workflow & Quality Gates" → added a design/animation-skill
    documentation bullet
  - Core Principles I–VIII unchanged
- Added sections: none (new principle added within existing Core Principles)
- Removed sections: none
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — Constitution Check section is
    generic/dynamic ("Gates determined based on constitution file"); no
    hardcoded principle list, no changes needed
  - ✅ .specify/templates/tasks-template.md — references the constitution
    generically; no hardcoded principle enumeration, no changes needed
  - ✅ .specify/templates/spec-template.md — generic; no forced section
    added, no changes needed
  - ✅ .specify/templates/checklist-template.md — no conflicts found, no
    changes needed
- Follow-up TODOs: none
-->

# RetroRocket Constitution

## Core Principles

### I. Test-Driven Development (TDD) (NON-NEGOTIABLE)

All new feature development and bug fixes MUST follow the red-green-refactor
cycle: first write a test that fails, then write the minimal code to make it
pass, then refactor. Production code MUST NOT be approved or merged without a
preceding test that covers it. Tests are part of the feature's contract, not
an afterthought added post-implementation.

**Rationale**: Writing the test first forces the requirement to be made
explicit and verifiable before implementation exists, and prevents
untested code from ever reaching `main`.

### II. Library-First

Every new capability (card grouping, export, sentiment analysis, countdown,
etc.) MUST first be designed as an independent, decoupled module inside
`src/features` or `src/lib`, with a clear public interface, before it is
wired into the UI layer.

**Rationale**: Isolating capabilities as libraries favors reuse, enables
testing in isolation, and prevents circular dependencies from forming
between features.

### III. Prefer Proven Third-Party Libraries

Established, battle-tested libraries from the ecosystem (e.g. the ones
already in use: dnd-kit, date-fns, docx, @react-pdf/renderer, framer-motion)
MUST be preferred over reimplementing equivalent functionality. Before adding
any new dependency, the following MUST be validated: active maintenance,
bundle-size impact, license compatibility, and that it does not duplicate
capability already available in the project.

**Rationale**: Reimplementing solved problems wastes effort and introduces
untested surface area; unvetted dependencies introduce maintenance,
security, and bundle-size risk.

### IV. SOLID Principles

Domain and service code MUST respect Single Responsibility, Open/Closed,
Liskov Substitution, Interface Segregation, and Dependency Inversion.
Firebase/Firestore access in particular MUST sit behind testable
interfaces/abstractions and MUST NOT be coupled directly to UI components.

**Rationale**: Abstracting the real-time backend behind interfaces keeps
domain logic testable without a live Firestore connection and keeps UI
components free of persistence concerns.

### V. Simplicity (KISS + YAGNI)

The simplest solution that satisfies the current, confirmed requirement MUST
always be preferred. Abstraction, configuration, or flexibility MUST NOT be
added for hypothetical future needs that are not confirmed.

**Rationale**: Speculative generality adds cost (cognitive load, test
surface, maintenance) without delivering present value.

### VI. Mandatory Unit Testing & Coverage Floor (NON-NEGOTIABLE)

All business logic, hooks, and services MUST have unit tests written with
Vitest + Testing Library. The coverage thresholds already defined in
`vitest.config.ts` (80% branches, 80% functions, 80% lines, 80% statements)
MUST be maintained; no PR may lower these thresholds.

**Rationale**: A fixed coverage floor keeps regressions visible in CI rather
than relying on reviewer memory, and 80% is the bar already committed to in
this codebase.

### VII. End-to-End Testing with Playwright (NON-NEGOTIABLE)

Critical user flows — creating a board, adding/voting/grouping cards, the
facilitator countdown, exporting to PDF/DOCX, and authentication — MUST have
E2E coverage with Playwright. Playwright is adopted as a new project tool
(not yet present) and MUST run in CI before every release.

**Rationale**: Unit tests validate logic in isolation but cannot catch
integration failures across real-time sync, UI, and export pipelines;
critical flows need end-to-end verification before shipping.

### VIII. Accessibility Compliance — WCAG 2.1 AA (NON-NEGOTIABLE)

All development that produces or modifies a user-facing surface MUST conform
to the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA. At minimum
this requires:

- Text contrast of at least 4.5:1 for normal text and 3:1 for large text
  against its background.
- Non-text contrast of at least 3:1 for meaningful graphical objects,
  interactive-control boundaries, and focus indicators against adjacent
  colors.
- A visible focus indicator on every focusable element.
- No information, state, action, or distinction conveyed by color alone; a
  redundant cue (text, icon, shape, or pattern) MUST accompany it.
- Full keyboard operability of interactive components (drag & drop, voting,
  modals) with correct ARIA roles and accessible names.

Both the light and dark themes MUST independently satisfy these requirements.
No user-facing change may be approved or merged that introduces a WCAG 2.1 AA
violation.

**Rationale**: RetroRocket is a collaborative tool used daily by whole teams,
including members with low vision, color-vision deficiencies, or who rely on
the keyboard. A fixed, verifiable accessibility bar (WCAG 2.1 AA) makes
inclusion a contract rather than a best-effort afterthought, and prevents
inaccessible surfaces from reaching `main`.

### IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE)

Any task that designs, builds, reviews, or audits a user-facing frontend
surface — new UI, layout, visual polish, component behavior, or
animation/motion — MUST use the installed Apple-design-principles skill
package instead of unstructured design intuition. The applicable skill MUST
be selected by task shape:

- Implementing new motion (transitions, gestures, loading states,
  micro-interactions) MUST use the `animate` skill to make and justify each
  animation decision (whether to animate at all, purpose, tool, properties,
  curve/duration, interruption behavior, exit).
- General UI/visual design work (component structure, visual hierarchy,
  spacing, typography, materials/depth, gesture-driven interactions) MUST
  consult the `apple-design` and `emil-design-eng` skills for Apple-derived
  interface principles and polish guidance.
- Reviewing or critiquing existing animations MUST use the
  `review-animations` skill.
- Auditing animation quality across the codebase (not a single change) MUST
  use the `improve-animations` skill to produce a prioritized, self-contained
  plan.
- Deciding whether an area of the UI would benefit from motion at all MUST
  use the `find-animation-opportunities` skill before motion is added
  speculatively.
- Exploring multiple genuinely different directions for a UI piece MUST use
  the `prototype` skill to build and compare live variants rather than
  committing to a single first draft.
- Naming or communicating a desired motion effect precisely (in a PR
  description, to a teammate, or to another AI) MUST use the
  `animation-vocabulary` skill.
- Choosing a UI/component library for a new interface need MUST use the
  `pick-ui-library` skill to select from the project's trusted, in-use
  libraries rather than introducing an unvetted one.

This principle does not replace Principle VIII: any design or animation
produced through these skills MUST still independently satisfy WCAG 2.1 AA
conformance, including honoring `prefers-reduced-motion`.

**Rationale**: RetroRocket already depends on framer-motion inside a
deliberate, real-time collaborative UI; leaving animation and visual-design
choices to ad hoc judgment produces inconsistent motion and polish across
features. Standardizing on the installed Apple-design-principles skill
package gives every design or animation decision a repeatable process and a
shared vocabulary, and keeps output consistent with the interaction-quality
bar already implied by Principle VIII.

## Technology Stack & Additional Standards

- **Strict Type Safety**: TypeScript `strict` mode (already enabled) MUST
  remain on. `any` is prohibited unless justified by an explicit inline
  comment explaining why a precise type is not possible. Types are part of
  the contract documentation for the codebase.
- **Code Consistency**: ESLint MUST be a mandatory gate before merge.
  Formatting styles MUST NOT be mixed within a file or PR.
- **Real-Time Data Security**: Any change to `firestore.rules` or to
  Firestore access patterns MUST be justified and MUST NOT weaken existing
  security rules. Data validation MUST occur both on the client and in the
  server-side security rules — client-side validation alone is insufficient.
- **Internationalization**: All user-visible text MUST go through i18next;
  hardcoded strings in components are prohibited. Every new feature that
  introduces user-visible text MUST add the corresponding keys to all
  supported locales.
- **UI & Motion Design Tooling**: Frontend visual design and animation work
  is governed by Principle IX. The `emil-design-eng`/`apple-design` skill
  package (including `animate`, `review-animations`, `improve-animations`,
  `find-animation-opportunities`, `prototype`, `animation-vocabulary`, and
  `pick-ui-library`) MUST be used for the corresponding task shape instead of
  ad hoc design decisions.
- **Accessibility (a11y)**: Accessibility is governed by Principle VIII
  (WCAG 2.1 AA). Interactive components (drag & drop, voting, modals) MUST be
  operable via keyboard and MUST expose correct ARIA roles, and all
  user-facing surfaces MUST meet the WCAG 2.1 AA contrast, focus-visibility,
  and use-of-color requirements defined there, in both the light and dark
  themes.
- **Error Handling & Resilience**: Because the application depends on
  real-time synchronization, every operation against Firestore MUST
  explicitly handle loading, error, and reconnection states. Silent
  failures are prohibited.
- **Performance**: Premature optimization MUST be avoided, but any feature
  that affects the real-time card tree with multiple concurrent
  participants MUST be validated against perceptible performance
  degradation before merge.

## Development Workflow & Quality Gates

- CI MUST run automatically on every pull request targeting `main` and on
  every push to `main`, executing the full check suite (TypeScript
  type-check, ESLint, Vitest with coverage, and the Playwright E2E suite)
  on both triggers.
- CI MUST additionally run a GitHub CodeQL analysis on the same triggers
  (pull request and push to `main`), covering the languages used in the
  project's source code.
- Branch protection on `main` MUST require, as merge-blocking status
  checks: the type-check/lint/test-with-coverage job, the Playwright E2E
  job, and CodeQL code scanning results at minimum severity High. A pull
  request with a failing required check — including a High or Critical
  CodeQL finding newly introduced by that PR — MUST be blocked from
  merging automatically; Medium/Low/style-level CodeQL findings MUST be
  reported but MUST NOT block merge.
- Any pull request that adds or changes a user-facing surface MUST verify
  WCAG 2.1 AA conformance (contrast, visible focus, and use-of-color) per
  Principle VIII. Where an automated accessibility audit exists in CI, it
  MUST run as a required merge-blocking check and MUST fail the build on any
  WCAG 2.1 AA violation; until such automation exists, conformance MUST be
  verified in human code review.
- Any pull request that introduces or modifies frontend visual design or
  animation MUST note, in the PR description, which Apple-design skill(s)
  from Principle IX were used to make the design/motion decisions.
- Every PR MUST still demonstrate TDD compliance (tests precede
  implementation); this is verified through human code review in addition
  to the automated pre-merge CI gate.
- CI MUST fail the build if coverage drops below the thresholds defined in
  `vitest.config.ts`, or if the Playwright E2E suite fails on a critical
  flow; either failure blocks merge or release until resolved.
- Any exception to a core principle (TDD, minimum coverage, E2E coverage of
  critical flows, WCAG 2.1 AA accessibility conformance, or any other
  NON-NEGOTIABLE principle) MUST be documented explicitly in the PR
  description with a stated rationale.

## Governance

This constitution supersedes individual implementation preferences. Any
exception to a core principle requires explicit justification documented in
the PR that introduces the exception; silent or undocumented deviations are
not permitted.

All PRs and code reviews MUST verify compliance with this constitution.
Complexity that deviates from the Simplicity principle MUST be justified in
the relevant plan's Complexity Tracking section.

Principles are reviewed and updated only through a new run of
`/speckit-constitution`, not by direct manual edits to this generated file.
Amendment versioning follows semantic versioning: MAJOR for backward
incompatible governance/principle removals or redefinitions, MINOR for new
principles or materially expanded guidance, PATCH for clarifications and
non-semantic refinements.

**Version**: 3.2.0 | **Ratified**: 2026-07-21 | **Last Amended**: 2026-08-07
