# Implementation Plan: Export Window Redesign (Apple HIG-Inspired Adaptive Sheet)

**Branch**: `038-export-window-redesign` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/038-export-window-redesign/spec.md`

## Summary

Completely rebuild the visual layout and look-and-feel of the retrospective
board's export window (`ImprovedExportPopover.tsx`) using Apple Human
Interface Guidelines principles (clarity, deference, depth), via the
project's mandated Apple-design skill package, and — the concrete structural
change beyond a re-skin — give it the same viewport-adaptive presentation
already shipped for the options menu and facilitator menu in feature 036
("Adaptive Sheet"): a Floating-UI-anchored panel on desktop/tablet, and a
`BottomSheet` on mobile, replacing today's single screen-centered fixed
dialog used identically at every viewport size.

Per the spec's two clarifications, this redesign also commits to two
concrete interaction decisions beyond "adopt the adaptive-sheet pattern":

1. **Anchor/transition mechanics (FR-002)**: selecting "Export" from the
   open options panel closes that panel immediately and opens the export
   panel anchored to the *same* "Options" trigger button — no new
   always-visible export trigger is introduced anywhere in the app.
2. **Background export continuation (FR-007a)**: dismissing the export
   window (Escape, outside-click/tap, close control) while an export is in
   progress does not cancel it — the export job keeps running independently
   of the window's own mount state, surfacing its outcome via the window
   (if reopened before it finishes) or a toast/notification otherwise. This
   is an explicit, narrow exception to this feature's otherwise
   presentation-layer-only scope (FR-012), mirroring how feature 036's
   FR-013a carved out its own scoped exception for the new mobile entry
   point.

Per FR-013, at least 2-3 genuinely distinct visual directions for the export
window (covering both its desktop-anchored-panel and mobile-bottom-sheet
presentations) must be explored and compared before a direction is committed
to, following the same process feature 036 used for the options and
facilitator menus. Every existing export capability — format selection
(PDF/TXT/DOCX), custom title, logo toggle, optional content toggles, the
owner-only facilitator zone, and the always-included-content notice — must
continue to work unchanged; only its presentation, and the two behaviors
above, are in scope.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.2, built with Vite 4

**Primary Dependencies**: Tailwind CSS 3.3 (semantic CSS-custom-property
token system — `src/lib/theme/tokens.ts` / `tailwind.config.cjs`),
framer-motion 10.18 (`MotionConfig reducedMotion="user"` wraps the whole app
in `App.tsx`), @floating-ui/react 0.27 (the existing `useBoardMenuOverlay`
hook, already used by the options menu and facilitator menu — this feature
reuses it for the export panel's desktop/tablet anchoring rather than
introducing new positioning logic), the existing `BottomSheet.tsx` primitive
(`src/lib/components/ui/BottomSheet.tsx`, introduced in feature 036 and
already shared by the options and facilitator menus' own mobile
presentations — reused unchanged for the export window's mobile
presentation, not forked), react-i18next 15.6 / i18next 25.3,
`react-hot-toast` 2.5 (already a dependency, already used by
`RetrospectiveTopbar.tsx` for its copy-ID/share/exit confirmations — reused
for FR-007a's background-export-completion notification rather than
introducing a new notification mechanism), lucide-react (icons), and the
existing `useReducedMotion` hook (`src/lib/hooks/useReducedMotion.ts`)

**Storage**: N/A directly — the export window reads board data
(`retrospective`, `cards`, `groups`, `participants`, `facilitatorNotes`,
`actionItems`, `sentimentAnalysis`) exclusively via props already threaded
from `RetrospectiveTopbar.tsx`'s `useBoardData()` (feature 019), and invokes
export generation through the existing, unmodified `useUnifiedExport` hook
and `unifiedExportService`/`pdfExportService`/`docxExportService`/
`txtExportService`. This feature has no direct Firestore access and MUST
NOT violate the existing architecture test
`src/test/architecture/retrospective-board-no-firestore.test.ts`

**Testing**: Vitest + Testing Library (unit/component, coverage-gated per
`vitest.config.ts` at branches 78 / functions 64 / lines 50 / statements
50), Playwright E2E — `e2e/export.spec.ts` (the critical PDF/DOCX export
flow), `e2e/accessibility.spec.ts` (axe-core via `@axe-core/playwright`,
including its existing keyboard/touch board-menu coverage that opens the
export dialog) — plus the existing unit suite
`src/test/features/boards/export/ImprovedExportPopover.test.tsx` and
`src/test/pages/RetrospectiveTopbar.test.tsx` (which mounts the export
trigger flow)

**Target Platform**: Web (responsive — desktop/tablet anchored panel, mobile
bottom sheet), evergreen browsers, light/dark theme, en/es locales

**Project Type**: Web application (single Vite/React SPA + a thin Express
backend mediation layer, unaffected by this feature)

**Performance Goals**: Export panel/sheet open-close and idle/exporting/
success/error state transitions feel immediate (no janky animation,
consistent with the project's existing sub-100ms interaction response bar
established in feature 033) — this is a low-cardinality UI surface (one
format grid, a handful of toggles), not a high-scale rendering concern

**Constraints**: Presentation-layer only, with the one explicit, narrow
exception at FR-007a (export job lifecycle decoupled from the window's own
mount state, plus a completion toast) — no other change to export
generation, progress reporting, or the real-time data the window reads;
must reuse the existing `useBoardMenuOverlay` (desktop/tablet) and
`BottomSheet` (mobile) foundations rather than forking new positioning/sheet
primitives

**Scale/Scope**: Exactly one surface — the export window
(`ImprovedExportPopover.tsx`, ~500 lines) and its two entry points (the
desktop options-panel "Export" item and the mobile options-sheet "Export"
item in `RetrospectiveTopbar.tsx`), plus lifting the export-job state
(`useUnifiedExport`) to a level that outlives the window's own mount state
per FR-007a. No change to the options menu's or facilitator menu's own
presentation (already redesigned under feature 036), the board grid, cards,
drag-and-drop, card menu, column header menu, or reaction picker.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Gate |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Every behavioral change (desktop anchor/transition mechanics, mobile bottom-sheet presentation, FR-007a's background-continuation + toast) MUST have a preceding failing test; purely presentational changes to already-tested content are verified via updated existing tests, not exempted | PASS — enforced task-by-task in `tasks.md` |
| II. Library-First | No new business-logic capability beyond FR-007a's job-lifecycle decoupling, which itself reuses the existing `useUnifiedExport` hook and `react-hot-toast` rather than introducing a new one; export generation services (`unifiedExportService`, `pdfExportService`, `docxExportService`, `txtExportService`) are consumed unchanged | PASS |
| III. Prefer Proven Third-Party Libraries | Reuses `@floating-ui/react` (via `useBoardMenuOverlay`), `framer-motion`, `BottomSheet.tsx`, `react-hot-toast` — all already in use for this exact purpose elsewhere in the same file family (`RetrospectiveTopbar.tsx`, `FacilitatorMenu.tsx`). No new dependency anticipated | PASS |
| IV. SOLID | The export window stays UI-only; all Firestore/backend access continues to sit behind `useBoardData`/`useUnifiedExport`, never touched directly by the redesigned component | PASS |
| V. Simplicity (KISS + YAGNI) | Scope is deliberately the export window only — no speculative extension to other export entry points (the orphaned, unused `ExportButton.tsx` standalone component is not wired into any route today and is out of scope; see `research.md` §1) | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | Existing coverage thresholds (branches 78 / functions 64 / lines 50 / statements 50) MUST NOT drop; new anchor/transition, mobile-sheet, and background-continuation code MUST carry its own unit tests | PASS — checked in `tasks.md`'s Polish phase, per `quickstart.md` |
| VII. E2E Testing with Playwright | `e2e/export.spec.ts` (the critical PDF/DOCX export flow) MUST keep passing; `e2e/accessibility.spec.ts`'s existing export-dialog keyboard/touch coverage MUST keep passing; new E2E coverage MUST be added for the mobile bottom-sheet presentation and for FR-007a's dismiss-during-export behavior (neither has any prior coverage — see `research.md` §6) | PASS — new coverage required, tracked in `tasks.md` |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | The export window, in both presentations, MUST independently satisfy WCAG 2.1 AA in both themes across all states (closed, opening, populated, exporting, success, error); `e2e/accessibility.spec.ts` currently has no axe scan of the export dialog's own open state in either theme or viewport — this gap is explicitly closed by this feature, not carried over (`research.md` §6) | PASS — gap explicitly closed by this feature |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | `apple-design`/`emil-design-eng` govern the general visual redesign; `animate` governs each new motion decision (desktop panel open/close reusing the Floating-UI-safe nested-`motion.div` pattern, state transitions between idle/exporting/success/error); `review-animations` governs the final critique pass; `find-animation-opportunities` informs whether the idle→exporting→success/error transitions deserve dedicated motion beyond what's already there. Skill used MUST be recorded per design decision in Phase 1 artifacts. **Note**: as in features 029, 031, 033, and 036, the `prototype` skill is not installed in this environment; `apple-design`/`emil-design-eng` are substituted for building the 2-3 real, interactive candidate directions (FR-013). This substitution MUST be explicitly acknowledged by the product owner alongside the direction selection | PASS — condition (skill substitution) noted and gated on explicit product-owner acknowledgment |

No unjustified violations. Complexity Tracking is left empty — no new
dependency is anticipated; every building block this feature needs
(`useBoardMenuOverlay`, `BottomSheet`, `react-hot-toast`, `framer-motion`)
already exists and is already proven for this exact purpose elsewhere in the
same component family.

**Post-Phase-1 re-check**: `research.md`, `data-model.md`, `contracts/*`, and
`quickstart.md` introduce no new dependency (the anchor/transition and
mobile-sheet mechanics are explicitly constrained in `research.md` §2-§3 to
what `useBoardMenuOverlay`/`BottomSheet` already provide, per Principle
III), no Firestore/domain-service coupling (the export window continues to
consume `useBoardData`/`useUnifiedExport` per `data-model.md`'s entities,
all marked "existing, consumed unchanged" except the window's own
presentation and the FR-007a job-lifecycle lift), and no reduction in test
or accessibility coverage (`contracts/functional-parity-contract.md` and
`contracts/accessibility-interaction-contract.md` both require the existing
suites to keep passing and add new mobile-viewport and background-export
coverage rather than removing any). All nine gates remain PASS after Phase 1
design.

## Project Structure

### Documentation (this feature)

```text
specs/038-export-window-redesign/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── visual-direction-review-contract.md
│   ├── functional-parity-contract.md
│   └── accessibility-interaction-contract.md
├── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
└── design-review.md     # Produced during implementation (tasks.md T037) — the
                          # structured Apple HIG design-review sign-off (SC-005),
                          # not a /speckit-plan output
```

### Source Code (repository root)

```text
retro-rocket/src/
├── features/
│   └── boards/
│       ├── export/
│       │   ├── components/
│       │   │   ├── ImprovedExportPopover.tsx        # The export window itself —
│       │   │   │                                     # rebuilt to present as an
│       │   │   │                                     # anchored panel (desktop/
│       │   │   │                                     # tablet) or a BottomSheet
│       │   │   │                                     # (mobile) instead of one
│       │   │   │                                     # fixed centered dialog
│       │   │   └── ExportButton.tsx                  # Orphaned/unused standalone
│       │   │                                          # trigger — out of scope
│       │   │                                          # (research.md §1)
│       │   └── hooks/
│       │       └── useUnifiedExport.ts                # Export-job state — its call
│       │                                               # site moves up to
│       │                                               # RetrospectiveTopbar.tsx so
│       │                                               # it survives the window's
│       │                                               # own unmount (FR-007a)
│       └── retrospective/
│           ├── components/
│           │   └── RetrospectiveTopbar.tsx            # Hosts the options panel
│           │                                          # ("Export" item), the second
│           │                                          # useBoardMenuOverlay instance
│           │                                          # for the export panel's
│           │                                          # anchor (sharing the Options
│           │                                          # trigger button per FR-002),
│           │                                          # the export mobile sheetOpen
│           │                                          # state, and (per FR-007a) the
│           │                                          # lifted useUnifiedExport call
│           │                                          # + its completion toast
│           └── hooks/
│               └── useBoardMenuOverlay.ts              # Shared anchored-overlay hook,
│                                                        # reused unchanged for the
│                                                        # export panel's desktop/
│                                                        # tablet anchoring
└── lib/
    └── components/
        └── ui/
            └── BottomSheet.tsx                          # Existing mobile sheet
                                                           # primitive, reused
                                                           # unchanged for the export
                                                           # window's mobile
                                                           # presentation

retro-rocket/src/test/
├── features/boards/export/ImprovedExportPopover.test.tsx
└── pages/RetrospectiveTopbar.test.tsx

retro-rocket/e2e/
├── export.spec.ts
└── accessibility.spec.ts
```

**Structure Decision**: No new top-level directories and no new shared
component. This feature modifies `ImprovedExportPopover.tsx` and
`RetrospectiveTopbar.tsx` in place, reusing `useBoardMenuOverlay.ts` and
`BottomSheet.tsx` exactly as the options and facilitator menus already do —
matching the project's Library-First principle (II) by not duplicating
positioning/sheet logic for a third time. The dev-only prototype-comparison
route pattern established in features 033/036
(`import.meta.env.DEV`-gated, deleted after the product owner's direction
review) is reused for this feature's own 2-3 candidate directions rather
than inventing a new mechanism.

## Complexity Tracking

*No violations to justify at plan time.* Every building block this feature
needs (`useBoardMenuOverlay`, `BottomSheet`, `react-hot-toast`,
`framer-motion`) already exists in the codebase and is already proven for
this exact purpose. If Phase 0 research determines otherwise, it will be
recorded here with its Principle III justification before Phase 1 design
proceeds.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_ | | |
