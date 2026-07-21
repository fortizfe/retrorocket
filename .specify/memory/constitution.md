<!--
Sync Impact Report
- Version change: 2.0.0 → 3.0.0
- Rationale: MAJOR bump. The "Development Workflow & Quality Gates" section is
  redefined again, reversing the 2.0.0 change: feature
  004-remove-secrets-add-codeql reintroduces an automated pre-merge PR gate
  (CI now runs on `pull_request` as well as on push to `main`) and adds a
  required GitHub CodeQL code-scanning check enforced via branch protection.
  This restores automatic pre-merge enforcement in place of the "push-to-main
  gate plus human pre-merge discipline" model from 2.0.0 — a backward
  incompatible redefinition of the enforcement mechanism, hence MAJOR per
  this constitution's own versioning policy.
- Modified principles/sections:
  - "Development Workflow & Quality Gates" — rewritten (see below); no other
    Core Principles (I–VII) changed.
- Added sections: none
- Removed sections: none
- Resolved residual inconsistency: The 2.0.0 Sync Impact Report flagged that
  "Technology Stack & Additional Standards" still said "ESLint MUST be a
  mandatory gate before merge," which no longer matched the push-only model.
  That line is accurate again as of this amendment (ESLint runs in the
  `checks` job, which is a required PR status check once more) — left
  unchanged, no further action needed.
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
- Every PR MUST still demonstrate TDD compliance (tests precede
  implementation); this is verified through human code review in addition
  to the automated pre-merge CI gate.
- CI MUST fail the build if coverage drops below the thresholds defined in
  `vitest.config.ts`, or if the Playwright E2E suite fails on a critical
  flow; either failure blocks merge or release until resolved.
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

**Version**: 3.0.0 | **Ratified**: 2026-07-21 | **Last Amended**: 2026-07-21
