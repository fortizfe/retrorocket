# Implementation Plan: Retrospective Board Redesign (Apple HIG-Inspired)

**Branch**: `033-retro-board-redesign` | **Date**: 2026-08-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/033-retro-board-redesign/spec.md`

## Summary

Completely rebuild the visual layout and look-and-feel of the retrospective
board experience (`RetrospectivePage.tsx` / `RetrospectiveBoard.tsx` and
every component rendered within or for it — column grid, all card types,
drag-and-drop, the options menu, the facilitator menu and its four tabs, the
export popover, the card menu, the column header menu, the reaction picker,
the participant display/popover, the countdown timer, and typing
indicators) using Apple Human Interface Guidelines principles (clarity,
deference, depth), via the project's mandated Apple-design skill package.
Per the spec's FR-018, the redesign explores 2-3 genuinely distinct visual
directions before the product owner picks one. Every existing capability —
card add/edit/delete/vote/like/react, drag-and-drop reorder/move, manual and
AI-suggested grouping, card-to-action-item conversion, the action items
column, live presence and typing indicators, the owner-only facilitator
menu (countdown, sentiment, team mood, private notes), export (PDF/DOCX/TXT
with facilitator-only options), copy ID/share/exit — must continue to work
unchanged. This is a presentation-layer-only redesign: no change to
real-time synchronization architecture, no new backend/API capability.
Quality bars carried forward unchanged: WCAG 2.1 AA in both themes across
all states, i18next en/es, existing automated test coverage, and the
concrete performance/scale target resolved during clarification (30+ cards
per column, up to 15 concurrent participants, sub-100ms interaction
response, sustained 50fps).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.2, built with Vite 4

**Primary Dependencies**: Tailwind CSS 3.3 (semantic CSS-custom-property
token system — `src/lib/theme/tokens.ts` / `tailwind.config.cjs`),
framer-motion 10.18 (already the project's adopted motion library),
@dnd-kit/core 6.3 / @dnd-kit/sortable 10.0 / @dnd-kit/utilities 3.2 (existing
drag-and-drop foundation for card reorder/move), @floating-ui/react 0.27
(existing viewport-aware anchored positioning for the reaction picker and
menus, per feature 010's FR-009), react-i18next 15.6 / i18next 25.3,
lucide-react (icons), clsx, date-fns (action-item due dates), docx /
@react-pdf/renderer (export, unchanged), the existing shared UI primitives
(`src/lib/components/ui/*`), and the existing `useReducedMotion` hook
(`src/lib/hooks/useReducedMotion.ts`, introduced in feature 028)

**Storage**: N/A directly — board data (cards, groups, columns, action
items, timer, facilitator notes, typing status) is read/written exclusively
through the existing backend-mediated realtime/REST clients
(`src/features/boards/retrospective/services/backendRetrospectiveClient.ts`
and `backendRealtimeClient.ts`); this view has no direct Firestore access,
enforced by the existing architecture test
`src/test/architecture/retrospective-board-no-firestore.test.ts` (feature
019), which this redesign MUST NOT violate

**Testing**: Vitest + Testing Library (unit/component, coverage-gated per
`vitest.config.ts` at branches 78 / functions 64 / lines 50 / statements
50), Playwright E2E — `e2e/retrospective-board.spec.ts`,
`e2e/board-creation.spec.ts`, `e2e/board-join.spec.ts`, `e2e/export.spec.ts`,
`e2e/facilitator-countdown.spec.ts`, `e2e/concurrent-board-session.spec.ts`,
`e2e/concurrent-board-network.spec.ts`, and `e2e/accessibility.spec.ts`
(axe-core WCAG 2.1 AA audit — currently covers `/`, `/dashboard`, and
`/perfil` only; this feature MUST extend it to cover `/retro/:id` in both
themes and its loading/empty-column/error states, since no such coverage
exists today)

**Target Platform**: Web browser (responsive mobile/tablet/desktop
viewports), light and dark themes, both currently supported `i18next`
locales (English, Spanish)

**Project Type**: Existing React SPA frontend (`retro-rocket/src`); this
feature does not touch `retro-rocket/server` or the MCP backend, and
introduces no new API endpoint or change to realtime sync behavior (FR-017)

**Performance Goals**: Card interactions respond within 100ms and
drag-and-drop sustains at least 50fps with no dropped-frame stalls,
including in a column holding 30+ cards, and with up to 15 concurrent
participants generating real-time updates (SC-001, SC-007, resolved via
clarification); animation runs on compositor-friendly properties
(`transform`/`opacity`) targeting 60fps, consistent with the constraint
established in feature 028

**Constraints**: Zero functional regression to card CRUD, voting, liking,
reactions, drag-and-drop, grouping (manual + AI-suggested), action-item
conversion and the action items column, dynamic column rendering, presence/
typing indicators, the owner-only facilitator menu (timer, sentiment, team
mood, notes), export (PDF/DOCX/TXT + facilitator-only options), and copy-ID/
share/exit (FR-002 through FR-011); every menu/popover MUST remain keyboard-
and touch-operable without depending on hover, dismissible via Escape/
outside-click (FR-012); all text MUST stay in `i18next` for English and
Spanish (FR-013); WCAG 2.1 AA MUST hold in both themes across all states
(FR-014, constitution Principle VIII); every new animated interaction MUST
honor `prefers-reduced-motion` via the existing `useReducedMotion` hook
(FR-015); fully responsive across mobile/tablet/desktop (FR-016); no change
to real-time sync behavior (FR-017); at least 2-3 visual directions MUST be
explored and the product owner MUST approve the one that ships (FR-018);
existing Vitest/Playwright coverage MUST NOT drop (FR-019)

**Scale/Scope**: `src/pages/RetrospectivePage.tsx` plus every component
under `src/features/boards/{retrospective,clustering,countdown,facilitator,
export,participants,sentiment}/components/*` that renders board UI;
validated at 30+ cards per column and up to 15 concurrent participants per
the resolved SC-001/SC-007 thresholds; 2 locales (en/es); 2 themes (light/
dark)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Any behavior-preserving or behavior-correcting logic touched during the rebuild (drag-and-drop handlers, grouping logic, export option wiring, keyboard/touch affordance additions) MUST have its existing/extended test written or updated first; presentation-only markup/motion has no pre-existing behavior to protect and follows the same no-new-test convention established in features 028/029/031 unless a new reusable utility is introduced. | PASS — enforced in Phase 2 task ordering |
| II. Library-First | No new domain capability is introduced. Any board-specific composition helper extracted during the rebuild (e.g. a shared menu-positioning hook, if one doesn't already exist) MUST live in `src/lib` or the relevant `src/features/boards/*` module, not be duplicated inline. | PASS |
| III. Prefer Proven Third-Party Libraries | Per `research.md` §1, the existing @dnd-kit and @floating-ui/react foundations are reused as-is at the validated 30-card/15-participant scale; no new drag-and-drop or positioning library is needed. Any dependency proposed during prototyping MUST be justified per this principle (active maintenance, bundle-size impact, license, non-duplication) before adoption. | PASS — conditional gate re-checked in Phase 1 if a candidate direction proposes one |
| IV. SOLID | Board data continues to flow exclusively through `backendRetrospectiveClient.ts` / `backendRealtimeClient.ts`; no Firestore access or domain-service coupling is introduced into the view layer, preserving the boundary `retrospective-board-no-firestore.test.ts` enforces. | PASS |
| V. Simplicity (KISS + YAGNI) | Scope is bounded to the board's already-existing capabilities (FR-002 through FR-011); no speculative new capability (e.g. new export formats, new facilitator controls) is introduced, per the spec's Assumptions. | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | Coverage thresholds in `vitest.config.ts` (78/64/50/50) MUST NOT drop; the ~80 existing test files under `src/test/features/boards/**` MUST be updated alongside the rebuild, not deleted. | PASS — verified per task |
| VII. E2E Testing with Playwright | `retrospective-board.spec.ts`, `board-creation.spec.ts`, `board-join.spec.ts`, `export.spec.ts`, `facilitator-countdown.spec.ts`, `concurrent-board-session.spec.ts`, and `concurrent-board-network.spec.ts` MUST keep passing, updated only for intentional selector/structure changes, never weakened. | PASS — verified per task |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | Zero WCAG 2.1 AA violations across all states (loading, populated, empty column, error) in both themes (SC-003); every menu/control 100% keyboard- and touch-operable (SC-004); `e2e/accessibility.spec.ts` MUST gain `/retro/:id` coverage (currently missing) as part of this feature; if new tokens are introduced, every `CONTRAST_PAIRINGS` entry MUST keep passing per `contrast.tokens.test.ts`. | PASS — hard gate, re-verified after Phase 1 |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | `apple-design`/`emil-design-eng` govern the general visual redesign; `animate` governs each new motion decision (drag feedback, menu/popover transitions, real-time update entrances, countdown state changes); `review-animations` governs the final critique pass; `find-animation-opportunities` informs whether new micro-interactions (e.g. grouping, reaction confirmation) deserve motion; `pick-ui-library` would govern any new UI-library need (none anticipated). Skill used MUST be recorded per design decision in Phase 1 artifacts. **Note**: as in features 029 and 031, the `prototype` skill is not installed in this environment; `apple-design`/`emil-design-eng` are substituted for building the 2-3 real, interactive candidate directions (FR-018). This substitution MUST be explicitly acknowledged by the product owner alongside the direction selection, so the deviation from a NON-NEGOTIABLE principle's named tooling is documented before implementation, per the constitution's Governance clause. | PASS — condition (skill substitution) noted and gated on explicit product-owner acknowledgment |

No violations requiring justification. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: `data-model.md`, `contracts/*`, and `quickstart.md`
introduce no new dependency (the existing @dnd-kit/@floating-ui foundation
covers the validated scale per `research.md` §1), no Firestore/domain-service
change, and no reduction in test or accessibility coverage — all nine gates
above still PASS unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/033-retro-board-redesign/
├── plan.md                        # This file (/speckit-plan command output)
├── research.md                    # Phase 0 output (/speckit-plan command)
├── data-model.md                  # Phase 1 output (/speckit-plan command)
├── quickstart.md                  # Phase 1 output (/speckit-plan command)
├── contracts/                     # Phase 1 output (/speckit-plan command)
│   ├── functional-parity-contract.md
│   ├── visual-direction-review-contract.md
│   └── accessibility-interaction-contract.md
├── tasks.md                       # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
└── design-review.md               # Implementation output (SC-005 sign-off record, analogous to features 028/031's design-audit records)
```

### Source Code (repository root)

```text
retro-rocket/
├── src/
│   ├── pages/
│   │   └── RetrospectivePage.tsx                  # Route entry (/retrospective/:id, /retro/:id) — orchestrates realtime sync + BoardDataContext
│   ├── features/
│   │   └── boards/
│   │       ├── retrospective/
│   │       │   ├── components/
│   │       │   │   ├── RetrospectiveBoard.tsx      # Column grid orchestrator — rebuilt
│   │       │   │   ├── RetrospectiveTopbar.tsx     # Title, participants, countdown, options menu — rebuilt
│   │       │   │   ├── DragDropColumn.tsx          # Column drop-zone — rebuilt, @dnd-kit behavior preserved
│   │       │   │   ├── DraggableCard.tsx / SortableCard.tsx / SelectableCard.tsx  # Card shells — rebuilt
│   │       │   │   ├── CardHeader.tsx / CardContent.tsx / CardFooter.tsx / CardMenu.tsx  # Card composition — rebuilt
│   │       │   │   ├── CardVoteControl.tsx / LikeButton.tsx / ReactionPicker.tsx / ReactionBadge.tsx / EmojiReactions.tsx  # Reaction/vote affordances — rebuilt, Floating UI anchoring preserved
│   │       │   │   └── ActionItemsColumn.tsx / ActionItemCard.tsx / ActionColumnToggle.tsx  # Action items column — rebuilt
│   │       │   ├── contexts/                       # BoardDataContext, TypingProvider — unchanged (data plumbing, not presentation)
│   │       │   └── services/                        # backendRetrospectiveClient.ts, backendRealtimeClient.ts — unchanged
│   │       ├── clustering/
│   │       │   └── components/
│   │       │       ├── GroupableColumn.tsx           # Column + grouping orchestration — rebuilt
│   │       │       ├── GroupCard.tsx / GroupedCardList.tsx  # Group presentation — rebuilt
│   │       │       ├── ColumnHeaderMenu.tsx           # Column-level menu — rebuilt
│   │       │       └── GroupSuggestionModal.tsx       # AI-suggestion review — rebuilt
│   │       ├── countdown/
│   │       │   └── components/
│   │       │       ├── CountdownTimer.tsx             # Rebuilt, real-time state preserved
│   │       │       └── FacilitatorMenu.tsx            # Owner-only hamburger — rebuilt
│   │       ├── facilitator/
│   │       │   └── components/
│   │       │       ├── FacilitatorMenuTabs.tsx        # Tab shell — rebuilt
│   │       │       ├── ControlsTab.tsx / SentimentTab.tsx / TeamMoodTab.tsx / NotesTab.tsx  # Tab contents — rebuilt
│   │       ├── export/
│   │       │   └── components/
│   │       │       └── ImprovedExportPopover.tsx      # Export flow — rebuilt, format/options behavior preserved
│   │       ├── participants/
│   │       │   └── components/
│   │       │       ├── ResponsiveParticipantDisplay.tsx / CompactAvatarGroup.tsx / ParticipantPopover.tsx / UserAvatar.tsx  # Presence display — rebuilt
│   │       └── sentiment/
│   │           └── components/
│   │               ├── SentimentBadge.tsx / SentimentProgressBar.tsx / SentimentFilter.tsx / TeamMoodDashboard.tsx  # Sentiment surfaces — rebuilt (domain/hooks unchanged)
│   ├── lib/
│   │   ├── theme/
│   │   │   ├── tokens.ts                          # May gain new token values for the chosen direction
│   │   │   └── contrast.ts                        # WCAG contrast math — unchanged, re-used to validate any new token values
│   │   ├── hooks/
│   │   │   └── useReducedMotion.ts                # Reused as-is (introduced in feature 028)
│   │   └── components/ui/                         # Shared primitives reused where applicable (Button, Modal, DatePicker, …)
│   └── locales/
│       ├── en.json                                # `retrospective.*`, `retrospectivePage.*` keys added/renamed per the chosen layout, never removed without replacement
│       └── es.json                                # Kept in lockstep with en.json
├── src/test/
│   ├── pages/RetrospectivePage.test.tsx           # Updated alongside the rebuild, not deleted (FR-019)
│   ├── features/boards/**                          # ~80 existing test files updated in place per component rebuilt (FR-019)
│   └── architecture/retrospective-board-no-firestore.test.ts  # Unchanged — MUST keep passing
└── e2e/
    ├── retrospective-board.spec.ts                # Updated only for intentional selector/structure changes
    ├── board-creation.spec.ts / board-join.spec.ts  # Updated only for intentional selector/structure changes
    ├── export.spec.ts                              # Updated only for intentional selector/structure changes
    ├── facilitator-countdown.spec.ts               # Updated only for intentional selector/structure changes
    ├── concurrent-board-session.spec.ts / concurrent-board-network.spec.ts  # Updated only for intentional selector/structure changes
    └── accessibility.spec.ts                       # Gains new `/retro/:id` coverage (theme × state matrix) — this feature closes the existing gap
```

**Structure Decision**: No new top-level directories and no backend/API
changes. This feature works entirely inside the existing `retro-rocket/src`
frontend tree, following the existing `pages/` (route-level screen) vs
`features/boards/*` (domain capability, already split by sub-concern:
retrospective, clustering, countdown, facilitator, export, participants,
sentiment) vs `lib/*` (shared/reusable) split already used by features 028,
029, and 031. The one new artifact class is the set of 2-3 prototyped
visual directions produced during Phase 1/implementation (via the
`apple-design`/`emil-design-eng` substitution for `prototype`, per the
Constitution Check note above) — these are design-review artifacts (not
shipped code) and do not introduce a new source directory.

## Complexity Tracking

> Not applicable — no Constitution Check violations were identified.
