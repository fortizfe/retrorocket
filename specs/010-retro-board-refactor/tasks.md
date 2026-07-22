---
description: "Task list for Retrospective Board Refactor & Layout Fixes"
---

# Tasks: Retrospective Board Refactor & Layout Fixes

**Input**: Design documents from `/specs/010-retro-board-refactor/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included and test-first per Constitution Principles I (TDD), VI (unit
coverage), VII (Playwright E2E) — all NON-NEGOTIABLE.

**Layout-measurement note**: jsdom (Vitest) has **no layout engine**, so real
overflow (`scrollWidth <= clientWidth`) is verified in **Playwright E2E** (real
browser). Vitest unit tests instead assert the presence of wrapping/grid classes,
props, and computed (non-`{0,0}`) picker positions.

**Paths**: App root is `retro-rocket/`. Source under `retro-rocket/src/`, E2E
under `retro-rocket/e2e/`. All paths below are repo-relative.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1 (card wrapping), US2 (columns fit), US3 (reaction picker), US4 (componentization & compliance)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies needed by the feature.

- [X] T001 Install `@floating-ui/react` (add to `retro-rocket/package.json` deps, run `npm install`) and confirm `npm run build` succeeds — validated against Constitution III (maintenance/bundle/license) in research.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared test scaffolding used by multiple stories. No user-facing behavior.

**⚠️ CRITICAL**: Complete before the E2E tasks in Phases 3–6.

- [X] T002 [P] Add a Playwright board fixture that seeds a retrospective and a card containing a ~200-char no-space URL, and navigates to the board view, in `retro-rocket/e2e/fixtures/board.ts` (reused by US1 and US3 E2E)
- [X] T003 [P] Add/extend a Vitest render helper wrapping i18n + theme providers for board components in `retro-rocket/src/test/utils/renderBoard.tsx` (create if absent; reused by US1/US3/US4 unit tests)

**Checkpoint**: Test scaffolding ready — user stories can proceed.

---

## Phase 3: User Story 1 - Card content never breaks the layout (Priority: P1) 🎯 MVP

**Goal**: Card text (including long URLs and unbroken long words) wraps inside the
card; links stay clickable; manual line breaks preserved; no card/column overflow.

**Independent Test**: Create cards with a 200-char URL, an 80-char word, and manual
line breaks; verify each renders fully wrapped, links work, no horizontal overflow.

### Tests for User Story 1 (write first, ensure they FAIL) ⚠️

- [X] T004 [P] [US1] Unit test: `LinkifyText` applies `overflow-wrap`/`break-words` to the wrapper span and each generated `<a>`, keeps links (`rel="noopener noreferrer"`), in `retro-rocket/src/test/lib/components/ui/LinkifyText.test.tsx`
- [X] T005 [P] [US1] Unit test: `CardContent` renders linkified text with `whitespace-pre-wrap` + `overflow-wrap:anywhere` + `min-w-0` and preserves `\n`, uses `text-primary` token, in `retro-rocket/src/test/features/boards/retrospective/CardContent.test.tsx`
- [X] T006 [US1] E2E: a card with a 200-char URL has board/card `scrollWidth <= clientWidth` and the URL is a working link, extending `retro-rocket/e2e/card-lifecycle.spec.ts`

### Implementation for User Story 1

- [X] T007 [P] [US1] Update `retro-rocket/src/lib/components/ui/LinkifyText.tsx`: add `[overflow-wrap:anywhere] break-words` to the wrapper span and each `<a>`; keep `info-fg` link color + visible focus
- [X] T008 [US1] Create `retro-rocket/src/features/boards/retrospective/components/CardContent.tsx` (props per `contracts/card-content.md`: `content`, `className`) combining `whitespace-pre-wrap` + `overflow-wrap:anywhere` + `min-w-0` + `LinkifyText`
- [X] T009 [US1] Wire `CardContent` into the content area of `retro-rocket/src/features/boards/retrospective/components/DraggableCard.tsx` and ensure card/column ancestors carry `min-w-0` (also check `GroupCard`/`GroupedCardList` wrappers in `retro-rocket/src/features/boards/clustering/components/`)

**Checkpoint**: Long-content cards wrap correctly with no overflow (SC-001).

---

## Phase 4: User Story 2 - Columns fit the viewport without horizontal scroll (Priority: P1)

**Goal**: 3- and 4-column boards share width with no horizontal scrollbar on desktop;
stack below the lg breakpoint. Remove the purged dynamic grid class and hard column
min-width.

**Independent Test**: Load 3-column then 4-column boards at 1280/1440px → no
horizontal scrollbar; shrink below 1024px → columns stack.

### Tests for User Story 2 (write first, ensure they FAIL) ⚠️

- [X] T010 [P] [US2] Unit test: `useBoardGridColumns(3)` and `(4)` return only literal, non-purgeable grid definitions (`lg:grid-cols-3` / `lg:grid-cols-4` or inline `gridTemplateColumns`), in `retro-rocket/src/test/lib/hooks/useBoardGridColumns.test.ts`
- [X] T011 [US2] E2E: board region `scrollWidth <= clientWidth` for both 3-column and 4-column (action column toggled) at desktop width, and stacked below lg, extending `retro-rocket/e2e/board-creation.spec.ts`

### Implementation for User Story 2

- [X] T012 [P] [US2] Create `retro-rocket/src/lib/hooks/useBoardGridColumns.ts` per `contracts/board-grid.md` (map `3|4` → non-purgeable grid definition)
- [X] T013 [US2] Replace the interpolated `lg:grid-cols-${...}` in `retro-rocket/src/features/boards/retrospective/components/RetrospectiveBoard.tsx` with `useBoardGridColumns` output; add `min-w-0` to each column wrapper
- [X] T014 [US2] Remove `min-w-[320px]` from `retro-rocket/src/features/boards/retrospective/components/ActionItemsColumn.tsx` so the action column shrinks to share width
- [X] T015 [US2] If runtime literal classes risk purge, add `lg:grid-cols-3` and `lg:grid-cols-4` to `safelist` in `retro-rocket/tailwind.config.js` (or confirm the inline-style approach and skip)

**Checkpoint**: No horizontal scrollbar for 3- and 4-column boards (SC-002).

---

## Phase 5: User Story 3 - Reaction picker appears anchored to its trigger (Priority: P2)

**Goal**: Emoji picker appears already anchored at its trigger (no flash), stays in
viewport via flip/shift, repositions on scroll/resize, and dismisses cleanly — built
on Floating UI. Decompose `EmojiReactions` into focused units.

**Independent Test**: Open the picker from top/bottom/edge cards → appears anchored,
stays visible; scroll/resize keeps it anchored; select/Escape/outside-click closes it
and returns focus.

### Tests for User Story 3 (write first, ensure they FAIL) ⚠️

- [X] T016 [P] [US3] Unit test: `useEmojiPicker` produces anchored `floatingStyles` (not `{top:0,left:0}`) when open and toggles remove when re-selecting the current reaction, in `retro-rocket/src/test/features/boards/retrospective/useEmojiPicker.test.tsx`
- [X] T017 [P] [US3] Unit test: `ReactionPicker` renders `role="dialog"` with accessible name, keyboard-focusable buttons with visible focus, semantic-token colors, and i18n hint (no hardcoded string), in `retro-rocket/src/test/features/boards/retrospective/ReactionPicker.test.tsx`
- [X] T018 [P] [US3] Unit test: `ReactionBadge` shows emoji + count and a non-color-only "mine" cue, with localized tooltip/`aria-label`, in `retro-rocket/src/test/features/boards/retrospective/ReactionBadge.test.tsx`
- [X] T019 [US3] E2E: opening the picker from a bottom/right-edge card keeps it fully within the viewport, anchored; scrolling the board and resizing the window while it is open keeps it anchored to its trigger (FR-009a); and it closes on Escape and outside-click, extending `retro-rocket/e2e/card-lifecycle.spec.ts`

### Implementation for User Story 3

- [X] T020 [US3] Create `retro-rocket/src/features/boards/retrospective/hooks/useEmojiPicker.ts` using Floating UI (`useFloating` with `offset(8)`, `flip()`, `shift({padding:8})`, `autoUpdate`; `useDismiss`/`useRole`/`useInteractions`) per `contracts/reaction-picker.md`
- [X] T021 [P] [US3] Create `retro-rocket/src/features/boards/retrospective/components/ReactionBadge.tsx` (existing-reaction pill; semantic tokens; localized tooltip)
- [X] T022 [US3] Create `retro-rocket/src/features/boards/retrospective/components/ReactionPicker.tsx` (`FloatingPortal` + `FloatingFocusManager`, category grid, semantic tokens, i18n) per contract
- [X] T023 [US3] Refactor `retro-rocket/src/features/boards/retrospective/components/EmojiReactions.tsx` to compose `ReactionBadge` + `ReactionPicker` + `useEmojiPicker`; delete the manual `getBoundingClientRect`/scroll-lock/`mousedown`/`keydown` logic; set framer-motion transform origin to the trigger (FR-010)
- [X] T024 [P] [US3] Add reaction-picker i18n keys (e.g. `retrospective.emojiReactions.picker.hint`) to `retro-rocket/src/locales/en.json` and `retro-rocket/src/locales/es.json`

**Checkpoint**: Picker anchored, in-viewport, and reposition-on-scroll working (SC-003, SC-004).

---

## Phase 6: User Story 4 - Componentized & constitution-compliant board (Priority: P2)

**Goal**: One live board implementation (dead code removed); oversized live components
decomposed into single-responsibility, independently tested pieces; zero hardcoded
strings/colors in board components; keyboard/ARIA and both-theme WCAG preserved.

**Independent Test**: Inspect the board module — focused components each with tests; no
dead/duplicate board; no hardcoded user text or palette colors; full suite green at or
above coverage thresholds.

### Tests for User Story 4 (write first, ensure they FAIL) ⚠️

- [X] T025 [P] [US4] Unit tests for extracted `CardHeader` and `CardVoteControl` (author render; vote up/down + count; down disabled at 0), in `retro-rocket/src/test/features/boards/retrospective/CardHeader.test.tsx` and `CardVoteControl.test.tsx`
- [X] T026 [P] [US4] Unit test for `CardFooter`: locale-aware timestamp derives from active i18next language (not hardcoded `es-ES`) and edit/delete actions fire, in `retro-rocket/src/test/features/boards/retrospective/CardFooter.test.tsx`

### Implementation for User Story 4

- [X] T027 [US4] Delete dead components and their tests after confirming zero non-test imports: `EnhancedRetrospectiveBoard.tsx`, `RetrospectiveCard.tsx`, `RetrospectiveColumn.tsx` under `retro-rocket/src/features/boards/retrospective/components/`, plus `retro-rocket/src/test/features/boards/retrospective/{RetrospectiveCard,RetrospectiveColumn}.test.tsx` and any `RetrospectiveBoard-simple`/enhanced-only tests (FR-014, SC-006)
- [X] T028 [P] [US4] Extract `CardHeader.tsx` (author + menu slot) in `retro-rocket/src/features/boards/retrospective/components/`
- [X] T029 [P] [US4] Extract `CardVoteControl.tsx` (vote up/down + count) in the same directory
- [X] T030 [US4] Extract `CardFooter.tsx` with locale-aware date (via active i18next language / `Intl.DateTimeFormat`) in the same directory
- [X] T031 [US4] Recompose `DraggableCard.tsx` from `CardHeader` + `CardVoteControl` + `CardContent` + `CardFooter`; replace hardcoded palette (`border-blue-300`, any `gray-*`) with semantic tokens (depends on T009, T028–T030)
- [X] T032 [US4] Replace hardcoded loading/error strings and colors in `RetrospectiveBoard.tsx` ("Cargando retrospectiva…", `text-red-600`, `text-gray-500`) with i18n keys + semantic tokens; add keys to `en.json`/`es.json` (depends on T013)
- [X] T033 [P] [US4] Audit and fix remaining hardcoded strings/colors in kept board components (`ActionItemsColumn`, `GroupableColumn`, `GroupedCardList`, `GroupCard`, `CardMenu`, `LikeButton`); optionally extract `ColumnHeader` from `GroupableColumn.tsx`

**Checkpoint**: Single componentized board, no hardcoded strings/colors (SC-005, SC-006).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification across all stories.

- [X] T034 [P] Extend `retro-rocket/e2e/accessibility.spec.ts` to run `@axe-core/playwright` on the board in **both** light and dark themes with zero WCAG 2.1 AA violations (SC-008)
- [X] T035 Run `npm run type-check`, `npm run lint`, `npm run test:coverage` (must stay ≥ 78/64/50/50 in `vitest.config.ts`) and `npm run e2e`; fix any regression before merge (SC-007)
- [X] T036 [P] Run the `quickstart.md` grep guards to confirm no hardcoded strings/colors and no `Enhanced/Retrospective{Card,Column}` references remain (SC-005, SC-006)
- [X] T037 [P] Confirm `@floating-ui/react` bundle-size impact is acceptable and record it in the PR description per Constitution III
- [X] T038 [P] E2E/a11y: verify board interactive elements remain keyboard-operable (FR-018) — vote buttons and reaction badge/picker reachable and operable via keyboard with visible focus, and card drag-and-drop is operable via the `@dnd-kit` `KeyboardSensor` (confirm the sensor is wired; surface it as a pre-existing gap if not), in `retro-rocket/e2e/accessibility.spec.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: none — start immediately (US3 needs it before T020).
- **Foundational (T002–T003)**: after Setup; blocks E2E/unit tasks that use the fixtures.
- **US1 (P1)**: after Foundational — independent; MVP.
- **US2 (P1)**: after Foundational — independent of US1.
- **US3 (P2)**: after Setup (needs T001) + Foundational.
- **US4 (P2)**: partially depends on other stories because it edits shared files — T031 depends on US1 (T009) + T028–T030; T032 depends on US2 (T013). T027/T028/T029/T033 are independent.
- **Polish (T034–T038)**: after all desired stories.

### Cross-story file notes (avoid conflicting edits)

- `DraggableCard.tsx`: touched by T009 (US1) then T031 (US4) — sequence US4 after US1.
- `RetrospectiveBoard.tsx`: touched by T013 (US2) then T032 (US4) — sequence US4 after US2.
- `EmojiReactions.tsx` fully handled within US3 (T023), including its i18n/colors.

### Parallel Opportunities

- Setup/Foundational: T002 and T003 in parallel.
- US1: T004, T005 in parallel; T007 parallel with test-writing.
- US2: T010 and T012 in parallel.
- US3: T016, T017, T018 in parallel; T021 and T024 parallel with T020/T022.
- US4: T025, T026 in parallel; T028, T029, T033 in parallel (different files) before T031.
- Once Foundational is done, US1 and US2 (both P1) can be built in parallel by different people; US3 in parallel too. US4's shared-file tasks (T031, T032) must wait for their dependencies.

---

## Parallel Example: User Story 1

```bash
# Write failing tests together:
Task: "Unit test LinkifyText wrapping in src/test/lib/components/ui/LinkifyText.test.tsx"   # T004
Task: "Unit test CardContent wrapping in src/test/features/boards/retrospective/CardContent.test.tsx"  # T005

# Then implement:
Task: "Update LinkifyText.tsx wrapping"   # T007  (parallel-safe: different file)
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. T001 Setup → T002–T003 Foundational.
2. US1 (T004–T009): the highest-visibility, lowest-risk fix.
3. **STOP and VALIDATE**: long-content cards wrap, no overflow. Deploy/demo.

### Incremental Delivery

1. Setup + Foundational → ready.
2. US1 (card wrapping) → validate (MVP) → ship.
3. US2 (no horizontal scroll) → validate → ship.
4. US3 (anchored picker) → validate → ship.
5. US4 (componentization + compliance sweep + dead-code removal) → validate → ship.
6. Polish (a11y both themes, full gate suite, guards) → final.

### Notes

- [P] = different files, no incomplete dependency.
- Verify every test FAILS before implementing (TDD).
- Keep enforced coverage thresholds; add tests for extractions to offset deleted dead-code tests.
- Commit after each task or logical group; keep each user story independently demoable.
