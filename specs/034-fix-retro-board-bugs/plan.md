# Implementation Plan: Retro Board Bug Fixes

**Branch**: `034-fix-retro-board-bugs` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/034-fix-retro-board-bugs/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Four independently-scoped defect fixes on the retrospective board: (1) the options and facilitator menus render pinned to the viewport's top-left instead of anchored below their trigger button, (2) column headers cram title, card count, group control, and add control into one row so titles get crowded/unreadable, (3) saving a private facilitator note can transiently show both its editable textarea and its saved read-only text at once, and (4) the "is typing" indicator can fail to clear reliably per column, sometimes leaving stale indicators visible in more than one column. Root-cause investigation (this plan's Phase 0) found: (1) is caused by Framer Motion's `animate`/`initial`/`exit` props writing their own `transform` onto the same DOM node Floating UI positions via `style={floatingStyles}.transform`, silently overwriting the computed anchor offset; (3) is caused by `AnimatePresence` freezing the exiting create-note form's last-rendered content (still showing the saved text) for the duration of its exit transition, which can outlast the realtime delivery of the newly saved note; (2) is a pure layout restructuring of an existing component; (4) is an already-mitigated but not fully eliminated per-column write-ordering race in the typing-status service. All four are fixed within existing components/hooks — no new dependencies, no data-model changes, no backend/Firestore schema changes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.2

**Primary Dependencies**: Vite 4, @floating-ui/react 0.27, framer-motion 10.18, Tailwind CSS 3.3, i18next 25.3, react-router-dom, Firebase 10 SDK (client), lucide-react icons

**Storage**: Firestore (existing `typingStatus` and `facilitatorNotes` collections/subcollections, unchanged by this feature — read via the existing realtime sync hooks, no schema or security-rule changes)

**Testing**: Vitest + Testing Library (unit/component, 80% coverage floor per Constitution Principle VI), Playwright (E2E, Constitution Principle VII) — the two flaky/failing specs in `e2e/retrospective-board.spec.ts` (facilitator-note visibility test at ~line 1102, typing-indicator test at ~line 596) are the acceptance signal for User Stories 3 and 4

**Target Platform**: Web (desktop + responsive down to the project's existing narrowest supported viewport), light and dark themes

**Project Type**: Web application (single frontend SPA + Firebase backend; this feature touches frontend only)

**Performance Goals**: No new performance targets; existing real-time responsiveness (menu open/anchor within a single frame, typing indicator latency already governed by the existing 2s update throttle / 3s inactivity timeout) must not regress

**Constraints**: Fixes MUST NOT change the public props/behavior of `useBoardMenuOverlay` in a way that breaks its other two consumers (`CardMenu.tsx`, `ColumnHeaderMenu.tsx`, both out of this feature's scope — see Assumptions in spec.md and Complexity Tracking below); MUST preserve existing i18next-driven copy (no hardcoded strings); MUST preserve WCAG 2.1 AA conformance (focus management, contrast, keyboard operability) already implemented via `FloatingFocusManager`/`useDismiss`/`useRole`

**Scale/Scope**: 4 user stories, all UI-layer fixes confined to ~6 existing component/hook files; no new routes, entities, or endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. TDD (NON-NEGOTIABLE)**: Applies. Each of the 4 fixes MUST have a failing test written first: a component/unit test (Vitest + Testing Library) reproducing the defect where feasible (column header row structure, note duplicate-visibility state, menu style-conflict), and the two named Playwright specs MUST go from failing/flaky to reliably passing. **Gate: PASS** (plan requires tests-first per fix in tasks.md).
- **II. Library-First**: N/A for new capability — no new capability is introduced; existing modules (`useBoardMenuOverlay`, `GroupableColumn`, `NotesTab`, `useTypingStatus`/`OptimizedTypingStatusService`) are corrected in place, respecting their existing module boundaries. **Gate: PASS**.
- **III. Prefer Proven Third-Party Libraries**: Applies. The menu-positioning fix MUST continue to use `@floating-ui/react` (no hand-rolled positioning reintroduced) and MUST NOT add a new animation/positioning library — the fix is to correctly compose the existing `@floating-ui/react` + `framer-motion` combination (splitting the positioning transform from the entrance/exit transform), following the same pattern `ReactionPicker.tsx` already uses successfully. **Gate: PASS**.
- **IV. SOLID**: N/A — no Firestore access pattern changes; `OptimizedTypingStatusService` remains the sole write-forwarding boundary. **Gate: PASS**.
- **V. Simplicity (KISS + YAGNI)**: Applies directly. `CardMenu.tsx` and `ColumnHeaderMenu.tsx` share the same underlying `motion.div` + `floatingStyles` transform-conflict pattern found in the two menus this spec targets, but neither was reported as broken and neither is in spec.md's scope — **this plan deliberately does not touch them**, per Simplicity/YAGNI, even though the same latent defect likely exists there. Flagged in Complexity Tracking as a documented, intentional scope boundary rather than silently expanded. **Gate: PASS**.
- **VI. Mandatory Unit Testing & Coverage Floor**: Applies. New/changed logic in `GroupableColumn.tsx`, `NotesTab.tsx`, `useBoardMenuOverlay.ts` consumers, and `useTypingStatus.ts`/`OptimizedTypingStatusService.ts` MUST keep the existing 80% coverage floor. **Gate: PASS** (no exemption needed).
- **VII. E2E Testing with Playwright (NON-NEGOTIABLE)**: Applies directly — this feature's own success criteria (SC-005) is defined by two existing Playwright specs passing reliably. **Gate: PASS**.
- **VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE)**: Applies. The column-header restructuring (US2) changes visual layout and MUST re-verify contrast and reading order in both themes; the menu-anchoring fix (US1) MUST NOT regress the existing `FloatingFocusManager` focus-trap/return-to-trigger behavior. **Gate: PASS** (verification required in tasks.md, no violation anticipated).
- **IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE)**: Applies to US1 and US3, both of which require changing *how* an existing entrance/exit animation is composed (splitting the positioning transform from the visual transform for menus; adjusting the create-note form's exit-animation timing/lifecycle so it can't outlive the incoming saved note). Implementation tasks for these two stories MUST consult the `animate` skill (for the animation-timing/composition decisions) and, since US2 is a layout/visual-hierarchy change, the `apple-design`/`emil-design-eng` skills for the three-row header restructuring. **Gate: PASS** (routed to the correct skills in tasks.md; no ad hoc motion decisions permitted).

**Overall Constitution Check: PASS.** No violations requiring justification; one intentional, documented scope boundary (see Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/034-fix-retro-board-bugs/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── ui-behavior-contracts.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── src/
│   ├── features/
│   │   ├── boards/
│   │   │   ├── retrospective/
│   │   │   │   ├── components/
│   │   │   │   │   └── RetrospectiveTopbar.tsx        # US1: options menu trigger + panel
│   │   │   │   │   └── ReactionPicker.tsx              # US1: reference pattern (already correct)
│   │   │   │   └── hooks/
│   │   │   │       └── useBoardMenuOverlay.ts           # US1: shared Floating UI overlay hook
│   │   │   ├── countdown/
│   │   │   │   └── components/
│   │   │   │       └── FacilitatorMenu.tsx              # US1: facilitator menu trigger + panel
│   │   │   ├── clustering/
│   │   │   │   └── components/
│   │   │   │       └── GroupableColumn.tsx               # US2: column header layout
│   │   │   └── facilitator/
│   │   │       └── components/
│   │   │           └── NotesTab.tsx                      # US3: private note create/save flow
│   │   └── ...
│   ├── lib/
│   │   └── components/ui/
│   │       └── TypingPreview.tsx                          # US4: per-column typing indicator render
│   └── ...
├── e2e/
│   └── retrospective-board.spec.ts                         # US3/US4 acceptance signal (SC-005)
└── src/test/
    └── features/boards/                                     # unit/component tests for all 4 stories
```

**Structure Decision**: Existing single-frontend layout (`retro-rocket/src/features/**` domain-grouped modules + `retro-rocket/src/test/**` mirroring it, plus root-level `retro-rocket/e2e/`). No new directories, packages, or projects are introduced; every change lands inside files that already exist in this structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No Constitution Check violations require justification — all gates passed. One deliberate scope boundary is recorded here for traceability rather than as a violation:

| Observation | Why Left Out of This Feature | Follow-Up |
|-------------|-------------------------------|-----------|
| `CardMenu.tsx` and `ColumnHeaderMenu.tsx` render their `motion.div` floating panel with the same `initial`/`animate`/`exit` transform props (`scale`, and in the general pattern `y`) on the same node that receives `style={floatingStyles}` — the identical root cause diagnosed for US1's two menus (see research.md §1) — so they likely misposition in the same way. | Not reported by the user, not named in spec.md's User Story 1 or FR-001/FR-002 (which scope explicitly to the options menu and facilitator menu). Fixing unreported surfaces would expand scope beyond the confirmed requirement, violating Principle V (Simplicity/YAGNI). | If confirmed broken, file as a follow-up bug/spec; the fix pattern established here (splitting the positioning wrapper from the animated inner element) will apply directly. |

## Post-Design Constitution Re-Check

*Performed after Phase 1 (data-model.md, contracts/, quickstart.md) were written.*

Re-reading all four Phase 1 artifacts against the same nine principles surfaces no new violations: the data model (data-model.md) confirms zero new persisted fields or schema changes (Principles II, IV unaffected); the behavioral contracts (contracts/ui-behavior-contracts.md) explicitly require WCAG 2.1 AA re-verification for the header restructuring and preserve `FloatingFocusManager` focus behavior for the menu fix (Principle VIII intact); the quickstart's manual and automated validation steps map 1:1 onto Principles I, VI, and VII (test-first, coverage floor, and the two named Playwright specs as the E2E gate). The one documented scope boundary (CardMenu/ColumnHeaderMenu left untouched) is unchanged by the design phase. **Constitution Check remains PASS with no new Complexity Tracking entries required.**
