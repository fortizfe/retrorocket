# Implementation Plan: Options Menu & Facilitator Menu Redesign (Apple HIG-Inspired)

**Branch**: `036-options-facilitator-menus` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/036-options-facilitator-menus/spec.md`

## Summary

Completely rebuild the visual layout and look-and-feel of the retrospective board's
options menu (`RetrospectiveTopbar.tsx`'s export/copy-ID/share/exit dropdown) and
facilitator menu (`FacilitatorMenu.tsx`/`FacilitatorMenuTabs.tsx` and its four tabs —
controls, sentiment, team mood, notes) using Apple Human Interface Guidelines
principles (clarity, deference, depth), via the project's mandated Apple-design skill
package. Per the spec's FR-015, the redesign explores 2-3 genuinely distinct visual
directions before the product owner picks one, presented as a reviewable artifact with
light/dark captures. Every existing capability of both menus — export, copy ID,
share, exit; timer create/start/pause/reset/delete and presets; the action-items
column toggle; sentiment enable/disable/model/pause/advanced settings; the team mood
dashboard; private facilitator notes add/edit/delete — must continue to work
unchanged, and the facilitator menu's strict owner-only gating (absent, not disabled,
for non-owners) must be preserved exactly.

One capability is explicitly new, not merely re-skinned (FR-013a, resolved via a
clarification recorded in `spec.md` during this planning session): today both menus
are unreachable below the `md` (~768px) breakpoint because their host,
`RetrospectiveTopbar`, is entirely `hidden md:flex` with no mobile equivalent
anywhere in the codebase. This redesign introduces a new, mobile-accessible entry
point for both menus — the specific mechanism (e.g. an always-visible compact
trigger opening a full-screen/bottom-sheet-style panel, vs. some other pattern) is a
design decision resolved through the same 2-3 direction exploration as the rest of
the visual redesign, per FR-015.

This is otherwise a presentation-layer-only redesign: no change to real-time
synchronization architecture, no new backend/API capability, and no change to the
underlying behavior of the timer, sentiment analysis, team mood computation, notes
storage, or export (including preserving currently non-functional placeholders like
the sentiment tab's no-op "reanalyze" button, per FR-014). Quality bars carried
forward unchanged from feature 033: WCAG 2.1 AA in both themes across all states,
i18next en/es, and existing automated test coverage (no net loss).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.2, built with Vite 4

**Primary Dependencies**: Tailwind CSS 3.3 (semantic CSS-custom-property token
system — `src/lib/theme/tokens.ts` / `tailwind.config.cjs`), framer-motion 10.18
(already the project's adopted motion library, `MotionConfig reducedMotion="user"`
wraps the whole app in `App.tsx`), @floating-ui/react 0.27 (existing viewport-aware
anchored positioning, via the shared `useBoardMenuOverlay` hook both menus already
use), react-i18next 15.6 / i18next 25.3, lucide-react (icons), clsx, the existing
shared UI primitives (`src/lib/components/ui/*`, including `Modal.tsx` as a possible
base for a new mobile panel pattern), and the existing `useReducedMotion` hook
(`src/lib/hooks/useReducedMotion.ts`, introduced in feature 028)

**Storage**: N/A directly — timer, sentiment configuration/results, team mood
inputs, and facilitator notes are read/written exclusively through the existing
backend-mediated realtime/REST clients
(`src/features/boards/retrospective/services/backendRetrospectiveClient.ts`,
`backendRealtimeClient.ts`) and the existing `useCountdown`/`useSentimentContext`/
`useFacilitatorNotes` hooks; this feature has no direct Firestore access, enforced
by the existing architecture test
`src/test/architecture/retrospective-board-no-firestore.test.ts` (feature 019),
which this redesign MUST NOT violate

**Testing**: Vitest + Testing Library (unit/component, coverage-gated per
`vitest.config.ts` at branches 78 / functions 64 / lines 50 / statements 50),
Playwright E2E — `e2e/facilitator-countdown.spec.ts`, `e2e/team-mood.spec.ts`,
`e2e/export.spec.ts`, `e2e/retrospective-board.spec.ts`,
`e2e/accessibility.spec.ts` (axe-core via `@axe-core/playwright`) — plus the
existing unit suites `src/test/pages/RetrospectiveTopbar.test.tsx`,
`src/test/features/boards/facilitator/FacilitatorMenu.test.tsx`,
`src/test/features/boards/facilitator/FacilitatorMenuTabs.test.tsx`, and sibling
tests for `ControlsTab`/`SentimentTab`/`NotesTab`/`TeamMoodTab`/`useFacilitatorNotes`

**Target Platform**: Web (responsive — this feature specifically adds a working
mobile breakpoint for both menus for the first time, per FR-013a), evergreen
browsers, light/dark theme, en/es locales

**Project Type**: Web application (single Vite/React SPA + a thin Express backend
mediation layer, unaffected by this feature)

**Performance Goals**: Menu open/close and tab-switch transitions feel immediate
(no janky animation, consistent with the project's existing sub-100ms interaction
response bar established in feature 033) — not a high-scale rendering concern like
the full board (these are two low-cardinality UI surfaces, not a 30+ card grid)

**Constraints**: Presentation-layer only outside the new FR-013a mobile entry
point; no change to real-time sync, backend contracts, or existing business logic;
must keep the existing `useBoardMenuOverlay` anchored-overlay foundation working
for the desktop/tablet presentation (or deliberately extend it, not fork it, if the
selected direction needs a variant for the new mobile pattern)

**Scale/Scope**: Exactly two menus and everything rendered within them — the
options menu (4 items) and the facilitator menu (4 tabs, ~1,650 lines across
`FacilitatorMenu.tsx`, `FacilitatorMenuTabs.tsx`, `ControlsTab.tsx`,
`SentimentTab.tsx`, `NotesTab.tsx`, `TeamMoodTab.tsx`) — plus the new mobile entry
point for both. No change to the board grid, cards, drag-and-drop, card menu,
column header menu, reaction picker, or the export popover's own internals
(already redesigned under feature 033); the options menu's export item continues
to trigger that existing, unmodified `ImprovedExportPopover`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Gate |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Every behavioral change (new mobile entry point, any restructured component) MUST have a preceding failing test, per the red-green-refactor cycle; purely presentational changes to already-tested components are verified via updated existing tests, not exempted from the principle | PASS — enforced task-by-task in `tasks.md` |
| II. Library-First | No new business-logic capability is introduced (FR-013a is a new *presentation* entry point, not a new domain capability) — `useCountdown`, `useSentimentContext`, `useFacilitatorNotes`, the export services, and the backend clients are reused unchanged | PASS |
| III. Prefer Proven Third-Party Libraries | Reuses `@floating-ui/react`, `framer-motion`, existing Tailwind tokens; no new dependency anticipated. If the selected mobile-entry-point direction needs a genuinely new interaction primitive (e.g. a bottom-sheet drag gesture) not already covered by these, it MUST be justified in Complexity Tracking before being added | PASS, conditional (see Complexity Tracking if triggered) |
| IV. SOLID | Menu components stay UI-only; all Firestore/backend access continues to sit behind `useBoardData`/the existing hooks, never touched directly by menu components | PASS |
| V. Simplicity (KISS + YAGNI) | Scope is deliberately the two named menus only — no speculative extension to other board menus (card menu, column header menu, reaction picker), which stay exactly as feature 033 left them | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | Existing coverage thresholds (branches 78 / functions 64 / lines 50 / statements 50) MUST NOT drop; new mobile-entry-point code MUST carry its own unit tests | PASS — checked in `tasks.md`'s Polish phase, per `quickstart.md` |
| VII. E2E Testing with Playwright | `e2e/facilitator-countdown.spec.ts`, `e2e/team-mood.spec.ts`, `e2e/export.spec.ts`, `e2e/retrospective-board.spec.ts` MUST keep passing; new E2E coverage MUST be added for the new mobile entry point (no prior mobile-viewport coverage of these menus exists to extend) | PASS — new coverage required, tracked in `tasks.md` |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | Both menus, including the new mobile entry point, MUST independently satisfy WCAG 2.1 AA in both themes across all states; `e2e/accessibility.spec.ts` MUST gain mobile-viewport coverage of both menus (currently absent, since nothing was reachable there before) | PASS — gap explicitly closed by this feature, not carried over as a known omission |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | `apple-design`/`emil-design-eng` govern the general visual redesign of both menus and the new mobile entry point; `animate` governs each new motion decision (menu open/close, tab switching, the new mobile panel's own entrance/exit); `review-animations` governs the final critique pass; `find-animation-opportunities` informs whether any additional micro-interaction (e.g. tab-switch transition) deserves motion; `pick-ui-library` would govern any new UI-library need (none anticipated, see Principle III row). Skill used MUST be recorded per design decision in Phase 1 artifacts. **Note**: as in features 029, 031, and 033, the `prototype` skill is not installed in this environment; `apple-design`/`emil-design-eng` are substituted for building the 2-3 real, interactive candidate directions (FR-015). This substitution MUST be explicitly acknowledged by the product owner alongside the direction selection, so the deviation from a NON-NEGOTIABLE principle's named tooling is documented before implementation, per the constitution's Governance clause. | PASS — condition (skill substitution) noted and gated on explicit product-owner acknowledgment |

No unjustified violations. Complexity Tracking is left empty unless Phase 0
research surfaces a genuine need for a new dependency for the mobile entry point
(e.g. a bottom-sheet gesture library) that the existing foundation cannot
reasonably provide — see Principle III's conditional gate above.

**Post-Phase-1 re-check**: `research.md`, `data-model.md`, `contracts/*`, and
`quickstart.md` introduce no new dependency (the mobile entry-point pattern
space is explicitly constrained in `research.md` §2 to what the existing
`@floating-ui/react`/`framer-motion`/`Modal.tsx` foundation can reasonably
build, per Principle III), no Firestore/domain-service coupling (every new
or touched component continues to consume `useBoardData`/the existing hooks
per `data-model.md`'s entities, all marked "existing, consumed unchanged"
except the two menus' own presentation), and no reduction in test or
accessibility coverage (`contracts/functional-parity-contract.md` and
`contracts/accessibility-interaction-contract.md` both require the existing
suites to keep passing and add new mobile-viewport coverage rather than
removing any). All nine gates remain PASS after Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/036-options-facilitator-menus/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── visual-direction-review-contract.md
│   ├── functional-parity-contract.md
│   └── accessibility-interaction-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/src/
├── lib/
│   └── components/
│       └── layout/
│           └── Header.tsx                          # Hosts RetrospectiveTopbar; likely
│                                                     # site of the new mobile entry-point
│                                                     # trigger (resolved during Foundational
│                                                     # direction selection, tasks.md T008)
├── features/
│   └── boards/
│       ├── retrospective/
│       │   ├── components/
│       │   │   └── RetrospectiveTopbar.tsx          # Options menu trigger + panel
│       │   │                                        # (currently `hidden md:flex`)
│       │   └── hooks/
│       │       └── useBoardMenuOverlay.ts            # Shared anchored-overlay hook
│       │                                              # used by both menus (extend,
│       │                                              # don't fork, if mobile needs
│       │                                              # a variant)
│       ├── countdown/
│       │   └── components/
│       │       └── FacilitatorMenu.tsx               # Facilitator menu trigger + panel
│       │                                              # (owner-only gated)
│       ├── facilitator/
│       │   ├── components/
│       │   │   ├── FacilitatorMenuTabs.tsx           # Tab shell (ARIA tablist)
│       │   │   ├── ControlsTab.tsx                   # Timer + action-column toggle
│       │   │   ├── SentimentTab.tsx                  # Sentiment enable/config
│       │   │   ├── NotesTab.tsx                      # Private facilitator notes
│       │   │   └── TeamMoodTab.tsx                   # Wraps TeamMoodDashboard
│       │   └── hooks/
│       │       └── useFacilitatorNotes.ts
│       └── sentiment/
│           └── components/
│               └── TeamMoodDashboard.tsx             # Rendered inside the team-mood tab
└── lib/
    └── components/
        └── ui/
            └── Modal.tsx                              # Existing centered-modal primitive;
                                                         # candidate base if the selected
                                                         # direction uses a full-screen/
                                                         # sheet-style mobile panel

retro-rocket/src/test/
├── pages/RetrospectiveTopbar.test.tsx
└── features/boards/facilitator/
    ├── FacilitatorMenu.test.tsx
    └── FacilitatorMenuTabs.test.tsx

retro-rocket/e2e/
├── facilitator-countdown.spec.ts
├── team-mood.spec.ts
├── export.spec.ts
├── retrospective-board.spec.ts
└── accessibility.spec.ts
```

**Structure Decision**: No new top-level directories. This feature modifies
existing components in place under their current feature-module locations
(`src/features/boards/retrospective`, `src/features/boards/countdown`,
`src/features/boards/facilitator`) and, if the selected visual direction
introduces a genuinely new shared building block (e.g. a mobile sheet
primitive), it is added under `src/lib/components/ui/` alongside `Modal.tsx`
so it is reusable rather than menu-specific — matching the project's
Library-First principle (II). The dev-only prototype-comparison route pattern
established in feature 033 (`import.meta.env.DEV`-gated, deleted after the
product owner's direction review) is reused for this feature's own 2-3
candidate directions rather than inventing a new mechanism.

## Complexity Tracking

*No violations to justify at plan time.* If Phase 0 research determines the
selected mobile-entry-point pattern requires a new dependency beyond the
existing `@floating-ui/react`/`framer-motion`/Tailwind foundation, it will be
recorded here with its Principle III justification before Phase 1 design
proceeds.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_ | | |
