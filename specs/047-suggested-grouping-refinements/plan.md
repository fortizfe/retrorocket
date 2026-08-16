# Implementation Plan: Suggested Grouping Refinements

**Branch**: `047-suggested-grouping-refinements` | **Date**: 2026-08-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/047-suggested-grouping-refinements/spec.md`

## Summary

Refine the retrospective board's AI card-grouping-suggestions feature (spec 044) in two independent parts. First, each proposed group now carries a short (≤35 char), inline-editable suggested title — generated on-device by a new pure, deterministic term-frequency heuristic (`groupTitleService.ts`, no new model/dependency) rather than the embedding pipeline itself, kept within the feature's existing few-seconds/25-card response budget, and flowing through to the created `CardGroup.title` on accept (edited value, unedited AI suggestion, or a computed "Group N" fallback if cleared to blank). Second, switching a column's grouping mode away from `'suggestions'` now dissolves every accepted group in that column (reusing the existing `disbandGroup` operation) and discards any pending un-actioned suggestions, so cards immediately re-sort per the newly selected mode instead of leaving stale AI-formed groups behind — implemented entirely inside `GroupableColumn.tsx`'s existing mode-change handler, with no new props or persistence operation.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.2, built with Vite 4

**Primary Dependencies**: No new dependency. Reuses `@huggingface/transformers` `^3.8.1` unchanged (title generation deliberately does NOT add a second model — `research.md` §1); `framer-motion` `^10.18.0` for the (unchanged) panel animation; existing `useCardGroups.ts`/`backendRetrospectiveClient.ts` for group creation/disband, already supporting an optional `title`.

**Storage**: N/A new — `CardGroup.title` already exists and is already persisted end-to-end (`backendRetrospectiveClient.ts`); no schema/migration change (`data-model.md`).

**Testing**: Vitest + Testing Library (unit/component); Playwright (E2E) — see `contracts/*.md` and `quickstart.md` for the specific new/modified test files.

**Target Platform**: Web (responsive), evergreen browsers, light/dark theme, es/en locales — no platform-specific behavior introduced.

**Project Type**: Web application (existing Vite/React SPA `retro-rocket/` + thin Express `server/` mediation layer; unchanged — this feature touches only `retro-rocket/src`).

**Performance Goals**: Suggested titles MUST be ready together with their proposed groups, within the same few-seconds-for-up-to-25-cards budget already required for grouping suggestions to appear (spec.md FR-001a/SC-001, inherited from spec 044 SC-004) — achieved by making title generation a synchronous, in-memory string operation with no network/model round-trip (`research.md` §1).

**Constraints**: No new dependency (Constitution III). 35-character hard cap on the title enforced natively via input `maxLength` (`research.md` §2) — no bespoke truncation-while-typing logic. No new Firestore/backend schema change. Mode-switch teardown reuses the existing `disbandGroup` operation only — no new persistence path (`research.md` §3).

**Scale/Scope**: One new pure module (`groupTitleService.ts`); one existing service extended to call it (`semanticGroupingService.ts`); one type extended (`GroupSuggestion.suggestedTitle`); one component gains inline-editable title state (`GroupSuggestionModal.tsx`); one hook's accept path changed to pass a title through (`useCardGroups.ts`'s `acceptSuggestion`); one component's mode-change handler extended for teardown (`GroupableColumn.tsx`) — no new route, page, worker, or persisted entity.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Gate |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | New/changed modules (`groupTitleService`, `semanticGroupingService`'s title wiring, `GroupSuggestionModal`'s inline edit, `useCardGroups.acceptSuggestion`, `GroupableColumn`'s teardown handler) MUST have failing tests written first per `contracts/*.md`'s verification sections | PASS |
| II. Library-First | Title generation is isolated in `groupTitleService.ts` with a pure, documented public function (`contracts/group-title-suggestion-contract.md`), decoupled from both the clustering service and the UI that displays/edits the result | PASS |
| III. Prefer Proven Third-Party Libraries | No new dependency added; deliberately avoids reaching for a second `@huggingface/transformers` pipeline (summarization/text2text-generation) where a pure heuristic satisfies the requirement within the latency budget (`research.md` §1) | PASS |
| IV. SOLID | `groupTitleService.ts` has a single responsibility (title derivation) separate from `semanticGroupingService.ts` (clustering) and separate again from the mode-switch teardown logic in `GroupableColumn.tsx` (Single Responsibility); Firestore/backend access for disband stays behind `backendRetrospectiveClient.ts`, untouched | PASS |
| V. Simplicity (KISS + YAGNI) | Mode-switch teardown reuses the *existing* `disbandGroup` operation and the *existing* `processCards` re-sort path with zero new props/plumbing (`research.md` §3) rather than introducing a new orchestration layer; title generation is a plain function, not a new worker/model (`research.md` §1) | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | New/changed modules ship with unit tests per `contracts/*.md`; coverage floor in `vitest.config.ts` must not drop | PASS |
| VII. E2E Testing with Playwright | Extends the existing `e2e/retrospective-board.spec.ts` grouping-suggestions coverage (added in spec 044) with the new title-edit and mode-switch-teardown flows rather than leaving them E2E-uncovered | PASS |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | The new inline title `<input>` MUST have a visible focus indicator and an accessible name (e.g. `aria-label`), consistent with the panel's existing focus-management (`useBoardMenuOverlay`/`FloatingFocusManager`, unchanged); the "Group N" fallback and any disband-error toast MUST NOT rely on color alone | PASS |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | The title input is a small, static form control added to an existing panel — no new motion/transition is introduced; the panel's existing entrance/exit animation (already `animate`-skill-derived per spec 044) is unchanged, so no new animation decision is in scope here | PASS |

No unjustified violations. Complexity Tracking is left empty.

**Post-Phase-1 re-check**: `research.md`, `data-model.md`, `contracts/*.md`, and `quickstart.md` introduce no new dependency, no new Firestore/domain coupling, and no reduction in test or accessibility coverage — they add unit coverage for the new `groupTitleService.ts`, extend existing component/hook tests, and extend the existing E2E grouping-suggestions spec. All nine gates remain PASS after Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/047-suggested-grouping-refinements/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── group-title-suggestion-contract.md       # Phase 1 output
│   └── grouping-mode-switch-teardown-contract.md # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/src/
├── features/
│   └── boards/
│       ├── clustering/
│       │   ├── components/
│       │   │   ├── GroupSuggestionModal.tsx    # Gains: per-suggestion inline-
│       │   │   │                                # editable title <input>
│       │   │   │                                # (maxLength=35), local edit
│       │   │   │                                # state keyed by suggestion.id
│       │   │   │                                # (contracts/group-title-
│       │   │   │                                # suggestion-contract.md)
│       │   │   └── GroupableColumn.tsx         # handleAcceptSuggestion passes
│       │   │                                    # the (possibly edited or
│       │   │                                    # fallback) title through to
│       │   │                                    # onGroupCreate; onGroupingChange
│       │   │                                    # gains mode-switch teardown
│       │   │                                    # (contracts/grouping-mode-
│       │   │                                    # switch-teardown-contract.md)
│       │   ├── hooks/
│       │   │   └── useCardGroups.ts            # acceptSuggestion passes
│       │   │                                    # suggestion.suggestedTitle (or
│       │   │                                    # the caller-supplied edited/
│       │   │                                    # fallback title) as customTitle
│       │   └── services/
│       │       ├── semanticGroupingService.ts  # findSemanticCardGroups calls
│       │       │                                # suggestGroupTitle() per
│       │       │                                # cluster before returning
│       │       └── groupTitleService.ts        # NEW — suggestGroupTitle(),
│       │                                        # pure/deterministic
│       │                                        # (data-model.md)
│       └── types/
│           └── card.ts                         # GroupSuggestion gains
│                                                 # suggestedTitle: string
├── locales/
│   ├── en.json                                 # New keys: the title-input's
│   │                                            # accessible name (Constitution
│   │                                            # VIII) and the mode-switch
│   │                                            # disband-error toast
│   │                                            # (research.md §4)
│   └── es.json                                 # Same, es locale

retro-rocket/src/test/features/boards/clustering/
├── groupTitleService.test.ts                    # NEW
├── semanticGroupingService.test.ts               # MODIFIED — asserts
│                                                   # suggestedTitle on results
├── GroupSuggestionModal.test.tsx                 # MODIFIED — inline-edit,
│                                                   # maxLength, per-suggestion
│                                                   # isolation, reject discards
├── useCardGroups.test.ts                         # MODIFIED — acceptSuggestion
│                                                   # title pass-through
└── GroupableColumn.test.tsx (+ .basic/.simple)   # MODIFIED — accept-flow title
                                                    # branches; mode-switch
                                                    # teardown (disband calls,
                                                    # panel-close, re-sort,
                                                    # no-op cases, partial-
                                                    # failure toast)

retro-rocket/e2e/
└── retrospective-board.spec.ts                   # Extended — inline title
                                                    # edit + accept, and
                                                    # mode-switch dissolves an
                                                    # accepted group (builds on
                                                    # spec 044's existing
                                                    # grouping-suggestions
                                                    # coverage)
```

**Structure Decision**: Web application structure (existing `retro-rocket/` SPA + `server/`), unchanged at the top level. All changes are confined to `retro-rocket/src/features/boards/clustering/` (one new pure service, two modified components/hooks/services), the shared type file (`card.ts`), and locale files. No new top-level directory, project, route, or persisted entity. `server/` is untouched — this feature adds no new backend endpoint (it reuses `createCardGroup`'s existing optional `title` param and `disbandCardGroup` unchanged).

## Complexity Tracking

*No violations to justify.* All Constitution Check gates pass without exception; no new dependency, abstraction, or project is introduced.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_ | | |
