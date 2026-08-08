# Implementation Plan: Mis Tableros (Dashboard) Redesign (Apple HIG-Inspired)

**Branch**: `031-dashboard-redesign` | **Date**: 2026-08-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/031-dashboard-redesign/spec.md`

## Summary

Completely rebuild the visual layout and look-and-feel of the authenticated
"Mis Tableros" dashboard (`Dashboard.tsx` and its embedded create-board,
join-by-ID, rename, and delete-confirmation flows) using Apple Human
Interface Guidelines principles (clarity, deference, depth), via the
project's mandated Apple-design skill package. Per the resolved
clarification, the redesign explores 2-3 genuinely distinct visual
directions (`prototype` skill) before the product owner picks one. Every
existing capability (list created/joined boards, create from a template,
join by ID, rename/delete owned boards, search, filter by role with counts,
sort by name/date, and every loading/empty/no-results/error state) must
continue to work unchanged, and three pre-existing defects surfaced during
specification — boards unreachable beyond page 1 in grid layout, hover-only
rename/delete controls, and dates hardcoded to Spanish — must be corrected
as part of this redesign, since they conflict with the constitution's
non-negotiable accessibility and internationalization standards. Quality
bars carried forward unchanged: WCAG 2.1 AA in both themes across all
states, i18next en/es, existing automated test coverage, and a concrete
performance target (sub-300ms search/filter/sort, smooth scrolling at 200+
boards) resolved during clarification.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.2, built with Vite 4

**Primary Dependencies**: Tailwind CSS 3.3 (semantic CSS-custom-property
token system — `src/lib/theme/tokens.ts` / `tailwind.config.cjs`),
framer-motion 10.18 (already the project's adopted motion library),
react-i18next 15.6 / i18next 25.3, lucide-react (icons), clsx, the existing
shared UI primitives (`src/lib/components/ui/*` — Button, Card, Modal,
Input, …), and the existing `useReducedMotion` hook
(`src/lib/hooks/useReducedMotion.ts`, introduced in feature 028)

**Storage**: N/A directly — board data is read/written exclusively through
the existing backend-mediated REST client (`src/features/dashboard/services/
backendBoardsClient.ts`, calling `/api/boards*`); this view has no direct
Firestore access, enforced by the existing architecture test
`src/test/architecture/dashboard-no-firestore.test.ts` (feature 017), which
this redesign MUST NOT violate

**Testing**: Vitest + Testing Library (unit/component, coverage-gated per
`vitest.config.ts` at branches 78 / functions 64 / lines 50 / statements 50),
Playwright E2E — `e2e/dashboard-list.spec.ts`, `e2e/dashboard-manage.spec.ts`,
`e2e/board-creation.spec.ts`, `e2e/board-join.spec.ts`, and
`e2e/accessibility.spec.ts` (axe-core WCAG 2.1 AA audit of `/dashboard` in
both themes and its error state)

**Target Platform**: Web browser (responsive mobile/tablet/desktop
viewports), light and dark themes, both currently supported `i18next`
locales (English, Spanish)

**Project Type**: Existing React SPA frontend (`retro-rocket/src`); this
feature does not touch `retro-rocket/server` or the MCP backend, and
introduces no new API endpoint

**Performance Goals**: Search/filter/sort apply in under 300ms and the list
stays smoothly scrollable/interactive — sustaining at least 50fps with no
dropped-frame stalls — at 200+ boards (SC-001, resolved via clarification);
animation runs on compositor-friendly properties (`transform`/`opacity`)
targeting 60fps, consistent with the constraint established in feature 028

**Constraints**: Zero functional regression to listing (created + joined,
role-distinguished), per-board metadata display, create-from-template,
join-by-ID, owner-only rename/delete with confirmation, search, filter with
live counts, sort with direction toggle, and every loading/empty/no-results/
error state (FR-002 through FR-014); every board MUST remain reachable
regardless of count or chosen layout (FR-012, corrects the current
grid-pagination defect); rename/delete controls MUST be keyboard- and
touch-operable without depending on hover (FR-015, corrects the current
hover-only defect); board dates MUST render in the viewer's active language
(FR-016, corrects the current hardcoded `es-ES` defect); all text MUST stay
in `i18next` for English and Spanish (FR-017); WCAG 2.1 AA MUST hold in both
themes across all states (FR-018, constitution Principle VIII); every new
animated interaction MUST honor `prefers-reduced-motion` via the existing
`useReducedMotion` hook (FR-019); fully responsive across mobile/tablet/
desktop (FR-020); at least 2-3 visual directions MUST be explored via the
`prototype` skill and the product owner MUST approve the one that ships
(FR-021); existing Vitest/Playwright coverage MUST NOT drop (FR-022)

**Scale/Scope**: `src/pages/Dashboard.tsx` plus its embedded
`src/features/dashboard/*` and `src/features/create-board/*` components
only; validated at up to 200+ boards per the resolved SC-001 threshold; 2
locales (en/es); 2 themes (light/dark)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Any behavior-preserving or behavior-correcting logic touched during the rebuild (search/filter/sort derivation, the reachability fix, the locale-date fix, the keyboard/touch action-affordance fix) MUST have its existing/extended test written or updated first; presentation-only markup/motion has no pre-existing behavior to protect and follows the same no-new-test convention established in features 028/029 unless a new reusable utility is introduced. | PASS — enforced in Phase 2 task ordering |
| II. Library-First | No new domain capability is introduced. If a dashboard-specific composition helper (e.g. a locale-aware date formatter, a list-reachability utility) is needed and reusable, it MUST live in `src/lib`, not be duplicated inline. | PASS |
| III. Prefer Proven Third-Party Libraries | Per `research.md` §1, no virtualization or new list-rendering library is needed at the validated 200-board scale — motion stays on the already-adopted framer-motion. Any dependency proposed during prototyping (e.g. a virtualization library, should a candidate direction want one) MUST be justified per this principle — active maintenance, bundle-size impact, license, non-duplication — before adoption, via the `pick-ui-library` skill. | PASS — conditional gate re-checked in Phase 1 if a candidate direction proposes one |
| IV. SOLID | Board data continues to flow exclusively through `backendBoardsClient.ts`; no Firestore access or domain-service coupling is introduced into the view layer, preserving the boundary `dashboard-no-firestore.test.ts` enforces. | PASS |
| V. Simplicity (KISS + YAGNI) | Scope is bounded to the dashboard view's already-existing capabilities plus the three documented defect corrections (FR-012, FR-015, FR-016); no speculative new capability (archiving, real-time presence, bulk actions) is introduced, per the spec's Assumptions. | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | Coverage thresholds in `vitest.config.ts` (78/64/50/50) MUST NOT drop; `Dashboard.test.tsx`, `BoardCard.test.tsx`, `JoinRetrospectiveModal.test.tsx`, `backendBoardsClient.test.ts`, and `dashboard-no-firestore.test.ts` MUST be updated alongside the rebuild, not deleted. | PASS — verified per task |
| VII. E2E Testing with Playwright | `dashboard-list.spec.ts`, `dashboard-manage.spec.ts`, `board-creation.spec.ts`, `board-join.spec.ts`, and `accessibility.spec.ts` MUST keep passing, updated only for intentional selector/structure changes, never weakened. | PASS — verified per task |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | Zero WCAG 2.1 AA violations across all states (loaded, loading, empty, no-results, error) in both themes (SC-003); rename/delete controls 100% keyboard- and touch-operable (SC-004); if new tokens are introduced, every `CONTRAST_PAIRINGS` entry MUST keep passing per `contrast.tokens.test.ts`. | PASS — hard gate, re-verified after Phase 1 |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | `apple-design`/`emil-design-eng` govern the general visual redesign; `prototype` is mandatory for the 2-3 candidate directions (FR-021); `animate` governs each new motion decision (list entrance/reflow, per-item action reveal, card feedback, modal transitions); `review-animations` governs the final critique pass; `find-animation-opportunities` informs whether new micro-interactions deserve motion; `pick-ui-library` governs any new UI-library need. Skill used MUST be recorded per design decision in Phase 1 artifacts. **Note**: the `prototype` skill is not installed in this environment; per the precedent established in feature 029, `apple-design`/`emil-design-eng` are substituted for building the real, interactive candidate directions (`tasks.md` T003-T005). This substitution MUST be explicitly acknowledged by the product owner alongside the direction selection (`tasks.md` T009), so the deviation from a NON-NEGOTIABLE principle's named tooling is documented before implementation, per the constitution's Governance clause. | PASS — condition (skill substitution) noted and gated on explicit product-owner acknowledgment at T009 |

No violations requiring justification. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: `data-model.md`, `contracts/*`, and `quickstart.md`
introduce no new dependency (virtualization/list-rendering libraries are
explicitly ruled out at the validated scale per `research.md` §1; the
`Visual Direction.newDependencies` field stays conditional/empty unless a
candidate direction requires one, in which case Principle III must be
re-justified before that direction can be `selected`), no Firestore/
domain-service change, and no reduction in test or accessibility coverage —
all nine gates above still PASS unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/031-dashboard-redesign/
├── plan.md                        # This file (/speckit-plan command output)
├── research.md                    # Phase 0 output (/speckit-plan command)
├── data-model.md                  # Phase 1 output (/speckit-plan command)
├── quickstart.md                  # Phase 1 output (/speckit-plan command)
├── contracts/                     # Phase 1 output (/speckit-plan command)
│   ├── functional-parity-contract.md
│   ├── visual-direction-review-contract.md
│   └── accessibility-interaction-contract.md
├── tasks.md                       # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
└── design-review.md               # Implementation output (SC-006 sign-off record, analogous to feature 028's design-audit.md)
```

### Source Code (repository root)

```text
retro-rocket/
├── src/
│   ├── pages/
│   │   └── Dashboard.tsx                          # Primary rebuild target (list, controls bar, all states)
│   ├── features/
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── BoardCard.tsx                  # Grid/card presentation — rebuilt; owner actions fixed to be non-hover-only
│   │   │   │   ├── BoardListItem.tsx              # Row/list presentation — rebuilt; date-locale fix applied
│   │   │   │   ├── BoardControlsBar.tsx           # Search / filter / sort / layout controls — rebuilt
│   │   │   │   ├── EditRetrospectiveModal.tsx     # Rename flow — restyled, label/input association fixed
│   │   │   │   ├── JoinRetrospectiveModal.tsx     # Join-by-ID flow — restyled, behavior preserved
│   │   │   │   └── Pagination.tsx                 # Reachability mechanism — kept, replaced, or extended per the selected visual direction (FR-012)
│   │   │   └── services/
│   │   │       └── backendBoardsClient.ts         # Unchanged — REST contract to /api/boards*
│   │   └── create-board/
│   │       ├── components/
│   │       │   ├── CreateBoardFlow.tsx            # Restyled, behavior preserved
│   │       │   └── BoardTemplateSelector.tsx      # Restyled, behavior preserved
│   │       └── boardTemplates.ts                  # Unchanged — template catalog
│   ├── lib/
│   │   ├── theme/
│   │   │   ├── tokens.ts                          # May gain new token values for the chosen direction
│   │   │   └── contrast.ts                        # WCAG contrast math — unchanged, re-used to validate any new token values
│   │   ├── hooks/
│   │   │   └── useReducedMotion.ts                # Reused as-is (introduced in feature 028)
│   │   └── components/ui/                         # Shared primitives reused where applicable (Button, Card, Modal, Input, …)
│   └── locales/
│       ├── en.json                                # `dashboard.*`, `boardTemplates.*`, `createBoard.*` — keys added/renamed per the chosen layout, never removed without replacement
│       └── es.json                                # Kept in lockstep with en.json
├── src/test/
│   ├── pages/Dashboard.test.tsx                   # Updated alongside the rebuild, not deleted (FR-022)
│   ├── features/dashboard/
│   │   ├── BoardCard.test.tsx                     # Updated; gains keyboard/touch-affordance assertions (FR-015)
│   │   ├── JoinRetrospectiveModal.test.tsx         # Updated
│   │   └── backendBoardsClient.test.ts            # Unchanged — no API contract change
│   └── architecture/dashboard-no-firestore.test.ts # Unchanged — MUST keep passing
└── e2e/
    ├── dashboard-list.spec.ts                     # Updated only for intentional selector/structure changes
    ├── dashboard-manage.spec.ts                    # Updated; gains keyboard/touch rename-delete assertions
    ├── board-creation.spec.ts                      # Updated only for intentional selector/structure changes
    ├── board-join.spec.ts                          # Updated only for intentional selector/structure changes
    └── accessibility.spec.ts                       # Updated only for intentional selector/structure changes; assertions not weakened
```

**Structure Decision**: No new top-level directories and no backend/API
changes. This feature works entirely inside the existing `retro-rocket/src`
frontend tree, following the existing `pages/` (route-level screens) vs
`features/*` (domain capability) vs `lib/*` (shared/reusable) split already
used by features 028 and 029. The one new artifact class is the set of 2-3
prototyped visual directions produced during Phase 1/implementation via the
`prototype` skill — these are design-review artifacts (not shipped code) and
do not introduce a new source directory.

## Complexity Tracking

> Not applicable — no Constitution Check violations were identified.
