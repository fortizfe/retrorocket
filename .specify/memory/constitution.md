<!--
Sync Impact Report
- Version change: 1.0.0 → 2.0.0
- Rationale: MAJOR bump. The "Development Workflow & Quality Gates" section is
  redefined: it previously assumed CI ran automatically on every pull request
  and gated merge on ESLint/type-check passing there. Feature
  003-scripts-cleanup-ci-trigger changed the CI pipeline to trigger on push to
  `main` instead of on pull requests, so that automated pre-merge gate no
  longer exists. This is a backward-incompatible redefinition of how quality
  gates are enforced (automated pre-merge PR gate → push-to-main gate plus
  human pre-merge discipline), not a mere clarification, hence MAJOR per this
  constitution's own versioning policy.
- Modified principles/sections:
  - "Development Workflow & Quality Gates" — rewritten (see below); no other
    Core Principles (I–VII) changed.
- Added sections: none
- Removed sections: none
- Follow-up TODOs / known residual inconsistency:
  - The "Technology Stack & Additional Standards" section still contains the
    line "ESLint MUST be a mandatory gate before merge," which carries the
    same now-inaccurate assumption (automatic pre-merge enforcement) as the
    old Development Workflow wording. It was intentionally left unchanged in
    this amendment because the user scoped this update to the Development
    Workflow & Quality Gates section only. Recommend a follow-up
    `/speckit-constitution` pass to reconcile that line with the same
    push-to-main model.
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — Constitution Check section is
    generic/dynamic; no hardcoded "before merge"/PR-gate wording found, no
    changes needed
  - ✅ .specify/templates/tasks-template.md — TDD/testing guidance references
    the constitution generically ("Per the project constitution (TDD,
    NON-NEGOTIABLE)"); Principle I is unchanged, no changes needed
  - ✅ .specify/templates/spec-template.md — no conflicts found; no changes needed
  - ✅ .specify/templates/checklist-template.md — no conflicts found; no changes needed
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
- **Accessibility (a11y)**: Interactive components (drag & drop, voting,
  modals) MUST be operable via keyboard and MUST expose correct ARIA roles,
  given that this is a collaborative tool used daily by teams.
- **Error Handling & Resilience**: Because the application depends on
  real-time synchronization, every operation against Firestore MUST
  explicitly handle loading, error, and reconnection states. Silent
  failures are prohibited.
- **Performance**: Premature optimization MUST be avoided, but any feature
  that affects the real-time card tree with multiple concurrent
  participants MUST be validated against perceptible performance
  degradation before merge.

## Development Workflow & Quality Gates

- CI MUST run automatically on every push to `main` and MUST execute the
  full check suite (TypeScript type-check, ESLint, Vitest with coverage,
  and the Playwright E2E suite) on that push.
- Because CI no longer runs automatically on pull requests, contributors
  MUST run type-check, lint, and the relevant test suite locally before
  opening or merging a PR. Reviewers MUST treat a red CI run on `main` as
  blocking: no further work may land on `main` until the failure is fixed
  or the offending commit is reverted.
- Every PR MUST still demonstrate TDD compliance (tests precede
  implementation); this is verified through human code review rather than
  an automated pre-merge CI gate.
- CI MUST fail the push-triggered build if coverage drops below the
  thresholds defined in `vitest.config.ts`, or if the Playwright E2E suite
  fails on a critical flow; either failure blocks any further merge or
  release until resolved.
- Any exception to a core principle (TDD, minimum coverage, E2E coverage of
  critical flows, or any other NON-NEGOTIABLE principle) MUST be documented
  explicitly in the PR description with a stated rationale.

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

**Version**: 2.0.0 | **Ratified**: 2026-07-21 | **Last Amended**: 2026-07-21
