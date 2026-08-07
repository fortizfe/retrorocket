# Implementation Plan: Apple-Inspired Design Alignment

**Branch**: `028-apple-design-alignment` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/028-apple-design-alignment/spec.md`

## Summary

Audit every current production frontend surface (landing/auth, dashboard, the
retrospective board experience, profile/settings, and the shared UI
component library — including each surface's loading/empty/error states)
against Apple-inspired design and motion principles, using the project's
mandated design skill package (constitution Principle IX) to make and record
every decision. Remediate all high-priority findings with presentation-only
changes — layout, spacing, typography, color (including the underlying
design tokens themselves), materials/depth, and motion — while every
existing feature capability, the WCAG 2.1 AA accessibility bar, the
internationalization system, and all pre-existing automated tests continue
to work unchanged. Findings that are low-priority or require structural
(non-presentational) change are documented and deferred to a follow-up
backlog rather than block this pass.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.2, built with Vite 4

**Primary Dependencies**: Tailwind CSS 3.3 (semantic CSS-custom-property token
system — `src/lib/theme/tokens.ts` / `globals.css` / `tailwind.config.js`),
framer-motion 10.18 (already used in 91 files), @dnd-kit (drag-and-drop),
@headlessui/react + @floating-ui/react (menus/popovers/positioning),
react-i18next, lucide-react (icons), clsx

**Storage**: N/A — this feature is presentation-only; Firebase/Firestore data
and access patterns are untouched

**Testing**: Vitest + Testing Library (unit/component, coverage-gated per
`vitest.config.ts`), Playwright E2E including the existing merge-blocking
`e2e/accessibility.spec.ts` (axe-core WCAG 2.1 AA audit across both themes)

**Target Platform**: Web browser (responsive desktop + mobile viewport),
light and dark themes, all currently supported `i18next` locales

**Project Type**: Existing React SPA frontend (`retro-rocket/src`); this
feature does not touch `retro-rocket/server` or the MCP backend

**Performance Goals**: Animations run only on compositor-friendly properties
(`transform`/`opacity`) targeting 60fps; interactive feedback starts on
pointer-down with no perceptible input latency; motion changes must not
degrade the perceived responsiveness of real-time multi-participant updates

**Constraints**: Zero functional regression (FR-004, FR-010); WCAG 2.1 AA
must hold in both themes after any token or component change (FR-005,
constitution Principle VIII), verified by the existing
`contrast.tokens.test.ts` unit gate and `e2e/accessibility.spec.ts` axe gate;
every animated interaction must honor `prefers-reduced-motion` (FR-006); all
user-visible text stays in `i18next` (FR-007); every design/motion decision
must be produced via the constitution's mandated skill package with a
recorded skill-per-surface (FR-008); existing Vitest coverage thresholds
(`branches 78 / functions 64 / lines 50 / statements 50`) must not drop

**Scale/Scope**: ~182 `.tsx` files; 19 shared UI primitives
(`src/lib/components/ui`); 3 scoped surface groups per the spec's user
stories (P1: retrospective board + facilitator/clustering/countdown/
participants; P2: landing/auth/dashboard; P3: profile/settings + shared
component library); 20 semantic color tokens × 2 themes; each in-scope
surface reviewed across its default, loading, empty, and error states

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Any new/changed token value, reduced-motion behavior, or shared-component presentation MUST have a failing test written first (e.g. extend `contrast.tokens.test.ts` before changing a token value; a reduced-motion unit test before adding the reduced-motion utility). | PASS — enforced in Phase 2 task ordering |
| II. Library-First | No new domain capability is introduced; presentation logic that is reused (e.g. a reduced-motion utility) MUST live in `src/lib` with a clear interface, not be duplicated per component. | PASS |
| III. Prefer Proven Third-Party Libraries | Motion continues on the already-adopted framer-motion; materials/depth use native CSS `backdrop-filter` (already in use in `Card`, `Modal`, `Header`) — no new dependency is anticipated. Any dependency proposed during the audit MUST be justified per this principle before adoption. | PASS |
| IV. SOLID | Presentation-only changes do not touch Firestore access or domain services; no principle is at risk. | PASS |
| V. Simplicity (KISS + YAGNI) | Findings are prioritized and low-priority/structural items are deferred to a backlog (FR-009) instead of expanding scope speculatively. | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | Coverage thresholds in `vitest.config.ts` (78/64/50/50) MUST NOT drop; any new shared utility (e.g. reduced-motion hook) MUST ship with unit tests. | PASS — verified per task |
| VII. E2E Testing with Playwright | All existing `e2e/*.spec.ts` MUST keep passing; `e2e/accessibility.spec.ts` MUST be extended to cover any newly reviewed states (loading/empty/error) without weakening its assertions. | PASS — verified per task |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | Any token redesign (per spec Clarification 1) MUST keep every `CONTRAST_PAIRINGS` entry passing in both themes; `contrast.tokens.test.ts` and `e2e/accessibility.spec.ts` are the enforcing gates and MUST NOT be weakened. | PASS — hard gate, re-verified after Phase 1 |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | Every design/motion decision for every surface MUST be produced via the mandated skill package (`apple-design`, `emil-design-eng`, `animate`, `review-animations`, `improve-animations`, `find-animation-opportunities`, `prototype`, `animation-vocabulary`, `pick-ui-library`), with the applicable skill recorded per Design Audit Finding (FR-008). | PASS — this plan's audit rubric (data-model.md) is built directly from the `apple-design` skill's 8 design principles and 17 technique sections |

No violations requiring justification. Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/028-apple-design-alignment/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/             # Phase 1 output (/speckit-plan command)
│   ├── design-audit-finding-schema.md
│   └── design-tokens-v2.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── src/
│   ├── lib/
│   │   ├── theme/
│   │   │   ├── tokens.ts              # Semantic color token catalog — may gain new values (Clarification 1)
│   │   │   └── contrast.ts            # WCAG contrast math — unchanged, re-used to validate any new token values
│   │   ├── components/ui/             # Shared primitives (Button, Card, Modal, Input, …) — P3 scope
│   │   └── hooks/                     # New: reduced-motion utility hook lives here (no equivalent exists today)
│   ├── styles/
│   │   └── globals.css                # CSS custom properties mirroring tokens.ts per theme
│   ├── pages/                         # Landing, Home, Dashboard, Profile, RetrospectivePage — P2/P3 scope
│   └── features/
│       ├── boards/                    # clustering, countdown, facilitator, participants, retrospective — P1 scope
│       ├── dashboard/                 # P2 scope
│       ├── create-board/              # P1/P2 scope
│       └── auth/                      # P2 scope
├── src/test/                          # Vitest unit/component tests — extended alongside each changed surface
└── e2e/                               # Playwright specs, incl. accessibility.spec.ts — extended, not replaced
```

**Structure Decision**: No new top-level directories. This feature works
entirely inside the existing `retro-rocket/src` frontend tree, following the
existing `features/*` (domain capability) vs `lib/*` (shared/reusable)
split. The one net-new file class is a shared reduced-motion utility under
`src/lib/hooks/` — introduced once, consumed by every subsequently redesigned
animated surface, per Principle II (Library-First).

## Complexity Tracking

> Not applicable — no Constitution Check violations were identified.
