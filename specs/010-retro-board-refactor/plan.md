# Implementation Plan: Retrospective Board Refactor & Layout Fixes

**Branch**: `010-retro-board-refactor` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-retro-board-refactor/spec.md`

## Summary

Refactor the retrospective board to align with the constitution (Library-First,
componentization, i18n, WCAG 2.1 AA, Simplicity) while fixing three user-visible
defects: cards must wrap long text/URLs, columns must fit without horizontal
scroll, and the emoji reaction picker must appear anchored to its trigger.

Technical approach: (1) fix card wrapping in the **live** card component
(`DraggableCard`) and `LinkifyText` with `overflow-wrap`/`break-words`;
(2) replace the build-time-purged dynamic Tailwind grid class in
`RetrospectiveBoard` with a reliable responsive grid and remove hard per-column
`min-w` so columns shrink to share width above the `lg` breakpoint and stack
below it; (3) re-implement `EmojiReactions` positioning with **Floating UI**
(anchor + `flip` + `shift`, `autoUpdate` on scroll/resize); (4) delete the three
dead board components (`EnhancedRetrospectiveBoard`, `RetrospectiveCard`,
`RetrospectiveColumn`) and their tests; (5) extract oversized live components
(`DraggableCard` 346 LOC, `GroupableColumn`, `EmojiReactions`) into focused,
independently-tested sub-components; (6) remove hardcoded strings and palette
colors in the board's live components. All work follows red-green-refactor and
keeps the enforced coverage thresholds; the accessibility Playwright suite gates
WCAG conformance in both themes.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`), React 18.2

**Primary Dependencies**: Vite 4, Tailwind CSS 3.3 (semantic CSS-variable
tokens), framer-motion 10, @dnd-kit/core 6, i18next 25 / react-i18next,
lucide-react, firebase (Firestore real-time). **New**: `@floating-ui/react`
(reaction-picker anchoring).

**Storage**: Firebase Firestore (real-time). No schema/data-model change in this
feature — behavior-preserving refactor.

**Testing**: Vitest 3 + Testing Library + jsdom (unit/component); Playwright 1.61
+ `@axe-core/playwright` (E2E + automated accessibility), run against Firebase
emulators (`npm run e2e`).

**Target Platform**: Modern evergreen browsers (desktop-first responsive web app).

**Project Type**: Single-page web application (frontend only; Firestore is the
backend). Source root: `retro-rocket/src`.

**Performance Goals**: No perceptible degradation of the real-time board with
multiple concurrent participants; picker open/close and card render remain
smooth (~60fps, no layout thrash / position flash).

**Constraints**: No horizontal scroll on the board region at standard desktop
widths; WCAG 2.1 AA contrast, visible focus, and use-of-color in **both** light
and dark themes; TypeScript `strict` (no unjustified `any`); all user-visible
text via i18next in both `en` and `es` locales; enforced Vitest coverage
thresholds (branches 78 / functions 64 / lines 50 / statements 50, per
`vitest.config.ts`) MUST NOT be lowered.

**Scale/Scope**: Scoped to the retrospective board and the components it owns.
Live path: `RetrospectiveBoard → GroupableColumn` (regular) + `ActionItemsColumn`
(action) `→ GroupedCardList → DragDropColumn → SortableCard/DraggableCard →
LinkifyText / EmojiReactions`. Broader app migration is out of scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate for this feature | Status |
|---|-----------|-----------------------|--------|
| I | TDD (NON-NEGOTIABLE) | Every fix/extraction starts with a failing unit or E2E test (wrapping, grid fit, picker anchoring). | PASS (planned) |
| II | Library-First | Extracted pieces (`ReactionPicker`, `ReactionBadge`, `CardVoteControl`, `CardHeader`, `useEmojiPicker`, `useBoardGridColumns`) have clear public interfaces before UI wiring; live in `features/boards/...` / `lib`. | PASS (planned) |
| III | Prefer Proven Libraries | `@floating-ui/react` chosen for picker positioning; validated in research.md (maintenance, bundle, license, no duplicate capability). | PASS |
| IV | SOLID | No new Firestore coupling; components stay presentation-only, data via existing hooks/services. Single-responsibility extractions. | PASS |
| V | Simplicity (KISS/YAGNI) | Delete 3 dead components (~1000 LOC) + dead tests; no new abstraction beyond confirmed need. | PASS |
| VI | Unit Testing & Coverage Floor (NON-NEGOTIABLE) | New/extracted units get tests; enforced `vitest.config.ts` thresholds not lowered. Removing tested dead code is offset by tests for extractions (see Complexity Tracking risk). | PASS (planned) |
| VII | E2E Playwright (NON-NEGOTIABLE) | Card lifecycle + accessibility specs updated/extended for wrapping, no-horizontal-scroll, and picker anchoring on the critical board flow. | PASS (planned) |
| VIII | Accessibility WCAG 2.1 AA (NON-NEGOTIABLE) | Semantic theme tokens only; visible focus; keyboard-operable picker with correct ARIA roles/names; `e2e/accessibility.spec.ts` must pass in both themes. | PASS (planned) |
| — | Strict Types / ESLint | No new `any`; ESLint clean (incl. `jsx-a11y`). | PASS (planned) |
| — | i18n | All board user-visible strings via i18next; new keys added to `en` + `es`. Replace hardcoded `es-ES` date formatting and Spanish literals. | PASS (planned) |
| — | Error Handling & Resilience | Existing loading/error/reconnection states preserved (behavior-preserving). | PASS |

**Result**: No unjustified violations. One tracked risk (coverage impact of
removing well-tested dead code) is recorded in Complexity Tracking, not a
violation.

**Note on the 80% figure**: Constitution VI references "the thresholds already
defined in `vitest.config.ts`". Those are currently 78/64/50/50 with a documented
compliance note (2026-07-21) that 80% is aspirational and tracked separately.
This plan honors "MUST NOT lower the defined thresholds" — raising them is out of
scope for this feature.

## Project Structure

### Documentation (this feature)

```text
specs/010-retro-board-refactor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (component/props boundaries — no persistence change)
├── quickstart.md        # Phase 1 output (validation guide)
├── contracts/           # Phase 1 output (UI component prop contracts)
│   ├── reaction-picker.md
│   ├── board-grid.md
│   └── card-content.md
├── checklists/
│   └── requirements.md  # From /speckit-specify (all items passing)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
retro-rocket/src/
├── features/boards/
│   ├── retrospective/
│   │   └── components/
│   │       ├── RetrospectiveBoard.tsx        # KEEP — fix grid (remove dynamic class), i18n/color cleanup
│   │       ├── DraggableCard.tsx             # KEEP (live card) — fix wrapping, extract sub-components, i18n/color
│   │       ├── SortableCard.tsx              # KEEP — dnd wrapper
│   │       ├── EmojiReactions.tsx            # KEEP — reimplement with Floating UI; split into ReactionBadge + ReactionPicker
│   │       ├── ActionItemsColumn.tsx         # KEEP — remove min-w-[320px], i18n/color audit
│   │       ├── CardMenu.tsx / LikeButton.tsx / ActionItemCard.tsx  # audit only
│   │       ├── EnhancedRetrospectiveBoard.tsx # DELETE (dead)
│   │       ├── RetrospectiveCard.tsx          # DELETE (dead)
│   │       └── RetrospectiveColumn.tsx        # DELETE (dead)
│   │   └── hooks/
│   │       └── useEmojiPicker.ts             # NEW — picker open/position/dismiss logic (Library-First)
│   └── clustering/components/
│       ├── GroupableColumn.tsx               # KEEP (live regular column) — width/fit, extract header
│       ├── GroupedCardList.tsx / GroupCard.tsx # audit for wrapping/width
├── lib/
│   ├── components/ui/
│   │   ├── LinkifyText.tsx                    # FIX — break long URLs/words
│   │   └── Card.tsx                           # verify container allows children to wrap
│   ├── hooks/useBoardGridColumns.ts          # NEW (optional) — reliable column-count → grid classes
│   └── utils/ (cardColors, constants, i18n date helper)  # i18n date formatting helper
├── locales/{en,es}.json                      # NEW keys for previously hardcoded strings
└── test/features/boards/retrospective/       # add tests for new units; delete dead-component tests
e2e/
├── card-lifecycle.spec.ts                    # extend: wrapping + picker anchoring
└── accessibility.spec.ts                     # assert WCAG on board in both themes
```

**Structure Decision**: Single web-app frontend under `retro-rocket/src`,
organized by feature (`features/boards/...`) with shared primitives in `lib/`.
This feature edits the live retrospective-board render path in place, adds a small
number of focused new components/hooks alongside the components they decompose,
and removes dead siblings — consistent with the existing Library-First layout.

## Complexity Tracking

> Only risks/justifications; no unjustified constitution violations.

| Item | Why it exists / risk | Mitigation / why simpler rejected |
|------|----------------------|-----------------------------------|
| New dependency `@floating-ui/react` | Spec FR-009/FR-009a require viewport-aware anchored positioning with flip/shift and live reposition on scroll/resize; hand-rolled math is the current source of the bug. | Constitution III prefers proven libraries; Floating UI is the de-facto standard, tree-shakeable, MIT. Manual rewrite rejected: reintroduces the same edge-case maintenance burden. |
| Removing dead code may move coverage % | Deleting `RetrospectiveCard`/`RetrospectiveColumn`/`EnhancedRetrospectiveBoard` also deletes their (passing) tests, which can shift overall coverage ratios. | Add unit tests for every extracted component/hook in the same PR; verify `npm run test:coverage` stays ≥ enforced thresholds before merge. Rejected leaving dead code: violates Principle V. |
| Extending scope to 3 dead components (spec named 1) | Audit revealed `RetrospectiveCard` & `RetrospectiveColumn` are also unused. | Same YAGNI/Simplicity rationale as the clarified board removal; recorded here rather than re-running clarify. Behavior-preserving (they were never rendered). |
