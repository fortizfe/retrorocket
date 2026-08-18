# Implementation Plan: Anonymous Typing Indicator

**Branch**: `052-anonymous-typing-indicator` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/052-anonymous-typing-indicator/spec.md`

## Summary

When a board has anonymous mode enabled, the typing indicator (`TypingPreview`)
must stop revealing who is typing. It currently always renders the typist's
display name and initials-avatar, which lets other participants infer card
authorship even though feature 051 already hides authorship everywhere else.
Per research.md, `GroupableColumn.tsx` — the indicator's single call site —
already computes `isAnonymousBoard` from the same `BoardDataContext` feature
051 established, so the fix is additive and localized: thread that boolean
into `TypingPreview` as a new `isAnonymous` prop, branch its text-formatting
function on it (always the single generic, localized message, regardless of
typist count, per the 2026-08-18 clarification), suppress the avatar cluster
entirely when anonymous, and migrate the component's currently-hardcoded
Spanish-only text onto the project's existing (already-defined-but-unused)
`typing.*` i18next keys — adding one new `typing.anonymous` key for both
locales. No backend change, no new realtime data, no new entity: `isAnonymous`
is already synced to every client today.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) — React 18.2 frontend (Vite 4)

**Primary Dependencies**: No new dependency. `react-i18next` (via the existing `useLanguage` hook — not currently used by `TypingPreview.tsx`, which is the one thing this feature adds to it), `framer-motion` (existing card animation, unchanged), the existing `src/lib/components/ui/*` primitives.

**Storage**: N/A — no data model change. `Retrospective.isAnonymous` already exists (feature 051) and is already synced to the frontend via `useRetrospectiveRealtimeSync`; this feature only reads it where it is already read (`GroupableColumn.tsx`) and threads it one level deeper.

**Testing**: Vitest (`src/test/lib/components/ui/TypingPreview.test.tsx`, `src/test/features/boards/clustering/GroupableColumn*.test.tsx`) — coverage-gated at 80% branches/functions/lines/statements per constitution Principle VI; Playwright E2E (`retro-rocket/e2e/retrospective-board.spec.ts`), which already has two typing-indicator scenarios asserting the exact visible/live-region text and must gain an anonymous-board counterpart.

**Target Platform**: Same Vercel-hosted web app; both currently supported `i18next` locales (English, Spanish); light and dark themes; responsive mobile/tablet/desktop. No backend/API surface touched.

**Project Type**: Existing web application — this feature is frontend-only (`retro-rocket/src`), touching one shared UI component, its single call site, and the two locale files. No new top-level directory, no new route, no new context/provider.

**Performance Goals**: No new performance target — the indicator's existing real-time update latency (already driven by the typing-status realtime channel and by `BoardDataContext`'s propagation of `isAnonymous`, both pre-existing) is what SC-003 relies on; nothing new to engineer.

**Constraints**: The indicator's identity text MUST be derivable purely from data already present at its call site (`isAnonymousBoard`, `typingUsers`) — no new prop drilling beyond one level, no new context. MUST NOT change any behavior other than the identity text (FR-007): timing, animation, position, and per-column independence stay exactly as implemented today. All new/changed user-visible text MUST go through `i18next` for both locales (constitution; also the 2026-08-18 clarification), including migrating the pre-existing hardcoded named-typist text so both variants live in the same system. WCAG 2.1 AA MUST hold — the screen-reader live region must mirror the visible text's anonymity rule (FR-005), and removing the avatar cluster in anonymous mode must not remove any accessible information the generic text doesn't already convey.

**Scale/Scope**: One component gains one new required prop (`TypingPreview`'s `isAnonymous: boolean`); one call site passes it (`GroupableColumn.tsx`, reusing its existing `isAnonymousBoard` value — zero new state); two locale files gain one new key and have three existing (currently unused) keys wired up. No new files except tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | `TypingPreview`'s new `isAnonymous` branch and `GroupableColumn`'s prop-passing get failing tests first, per `tasks.md`'s ordering — direct extension of the existing `TypingPreview.test.tsx`/`GroupableColumn*.test.tsx` suites. | PASS — enforced in Phase 2 task ordering |
| II. Library-First | No new module; extends the existing decoupled `src/lib/components/ui/TypingPreview.tsx` component, which already has a clean, isolated prop-driven interface. | PASS |
| III. Prefer Proven Third-Party Libraries | Zero new dependencies — reuses `react-i18next` (via `useLanguage`, already the project-standard hook, used by sibling `lib/components/ui/*` components) and the existing `framer-motion` usage unchanged. | PASS |
| IV. SOLID | `TypingPreview` stays a pure, presentation-only component (Single Responsibility): it receives `isAnonymous` as a prop rather than reaching into `BoardDataContext` itself, keeping it decoupled from the board-anonymity concept it doesn't own. `GroupableColumn.tsx` remains the sole place that resolves `isAnonymousBoard` from context, unchanged. | PASS |
| V. Simplicity (KISS + YAGNI) | No new context, no new realtime message, no per-typist partial-anonymity option (out of scope), no configurable "show count" toggle — the clarification session deliberately picked the simplest, most private option (always-singular, no avatar) over richer alternatives. | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | `TypingPreview.test.tsx` and `GroupableColumn*.test.tsx` gain cases for the anonymous branch (single/multi typist, live-region text, avatar cluster absence); existing coverage for both files must not drop below the `vitest.config.ts` floor. | PASS — verified per task |
| VII. E2E Testing with Playwright | `retrospective-board.spec.ts` gains an anonymous-board typing scenario alongside its two existing named-typist scenarios (data-model.md/quickstart.md §3). | PASS — verified per task |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | The live region (`role="status"`, `aria-live="polite"`) is untouched structurally — only the text it mirrors changes — so its existing accessible pattern (feature 026, FR-009) is preserved. Removing the avatar cluster in anonymous mode removes no accessible information: avatars carry `title={user.username}` today, which is itself the identity leak being fixed, so removing them is required by, not in tension with, WCAG compliance. | PASS — hard gate, re-verified after Phase 1 |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | This feature changes text/visibility of an existing small UI element; it does not add new motion or redesign the card. No new animation direction is introduced, so no `animate`/`prototype` exploration is warranted; `apple-design` restraint principles are already satisfied by simply omitting the avatar row rather than adding a substitute visual (per the 2026-08-18 clarification), which is the more restrained choice. | PASS |

No violations requiring justification. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: `data-model.md` introduces no new entity or field —
it documents the one-prop extension to `TypingPreview` and the two-locale key
addition/migration. `contracts/typing-indicator-anonymity-contract.md` and
`contracts/typing-i18n-keys-contract.md` specify exact, testable
input→output pairs for every acceptance scenario in spec.md, reusing the
existing live-region and card DOM structure verbatim. `quickstart.md`'s
validation scenarios exercise both the anonymous and non-anonymous paths for
single and multi-typist cases, plus the live-toggle scenario (US3), without
requiring any new test infrastructure beyond what `retrospective-board.spec.ts`
already established for typing indicators. All nine gates above still PASS
unchanged — no new dependency, no new realtime message, no schema change,
and no reduction in test or accessibility coverage was introduced during
Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/052-anonymous-typing-indicator/
├── plan.md                                     # This file (/speckit-plan command output)
├── research.md                                 # Phase 0 output (/speckit-plan command)
├── data-model.md                               # Phase 1 output (/speckit-plan command)
├── quickstart.md                               # Phase 1 output (/speckit-plan command)
├── contracts/                                  # Phase 1 output (/speckit-plan command)
│   ├── typing-indicator-anonymity-contract.md
│   └── typing-i18n-keys-contract.md
├── checklists/
│   └── requirements.md                         # Spec quality checklist (/speckit-specify command output)
└── tasks.md                                    # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── src/
│   ├── lib/components/ui/
│   │   └── TypingPreview.tsx                 # Gains `isAnonymous` prop; formatTypingText() branches on it;
│   │                                          # migrates hardcoded Spanish text to useLanguage()/t('typing.*')
│   ├── features/boards/clustering/components/
│   │   └── GroupableColumn.tsx               # Passes its existing `isAnonymousBoard` value to <TypingPreview isAnonymous={...} />
│   └── locales/
│       ├── en.json                           # typing.single/double/multiple wired up (were unused); + typing.anonymous
│       └── es.json                           # Same three keys wired up; + typing.anonymous (kept in lockstep with en.json)
├── src/test/
│   ├── lib/components/ui/
│   │   └── TypingPreview.test.tsx            # Extended: isAnonymous cases (visible text, live region, avatar absence)
│   └── features/boards/clustering/
│       └── GroupableColumn*.test.tsx         # Extended: isAnonymousBoard threaded into TypingPreview
└── e2e/
    └── retrospective-board.spec.ts           # Extended: anonymous-board typing scenario alongside the two existing named-typist scenarios
```

**Structure Decision**: No new directory, file, page, route, or
context/provider. This feature is a two-file production change
(`TypingPreview.tsx` gains a prop and an i18n migration; `GroupableColumn.tsx`
passes one existing value one level deeper) plus locale-key additions,
following the same "read `isAnonymousBoard` from the existing
`BoardDataContext`-derived value" pattern feature 051 already established for
`DraggableCard.tsx`'s card-author gating (research.md §1). Tests extend the
existing unit and E2E suites in place; no new test file or directory.

## Complexity Tracking

Not applicable — no Constitution Check violations were identified.
