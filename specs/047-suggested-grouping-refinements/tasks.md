---

description: "Task list for Suggested Grouping Refinements"
---

# Tasks: Suggested Grouping Refinements

**Input**: Design documents from `/specs/047-suggested-grouping-refinements/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Per the project constitution (Principle I, TDD, NON-NEGOTIABLE), test tasks are included and MUST be written first, confirmed failing, before their corresponding implementation task.

**Organization**: Tasks are grouped by user story (US1, US2) to enable independent implementation and testing of each. All paths are relative to `retro-rocket/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on an incomplete task)
- **[Story]**: US1 or US2, per spec.md
- Exact file paths are included in every task

---

## Phase 1: Setup

**Purpose**: Nothing new to scaffold — this feature extends existing modules only (no new route, worker, or project). No setup tasks required.

---

## Phase 2: Foundational

**Purpose**: Blocking prerequisites shared by both user stories.

Both user stories are genuinely independent (spec.md's "Why this priority" for each) and touch different functions of the one file they share (`GroupableColumn.tsx`: US1 → `handleAcceptSuggestion`; US2 → the `onGroupingChange` handler). There is no shared new infrastructure to build before either can start — **this phase is empty by design**. Proceed directly to Phase 3.

---

## Phase 3: User Story 1 - AI proposes an editable title for each suggested group (Priority: P1) 🎯 MVP

**Goal**: Every AI-proposed group carries a ≤35-char suggested title, editable inline in the suggestions panel, that flows through to the created group's title on accept (edited value, unedited AI suggestion, or a "Group N" fallback when cleared to blank).

**Independent Test**: Request suggestions on a column with groupable cards; confirm each proposed group shows a ≤35-char title; edit one title inline; accept it and confirm the created `CardGroup.title` matches the edit; accept a second, unedited suggestion and confirm its title matches the AI suggestion; clear a third title to blank, accept it, and confirm it falls back to "Group N".

### Tests for User Story 1 ⚠️ write first, confirm failing before implementing

- [X] T001 [P] [US1] Unit tests for `suggestGroupTitle()` in `src/test/features/boards/clustering/groupTitleService.test.ts` — cover: shared-vocabulary phrase extraction across ≥2 member cards, word-boundary truncation to ≤35 chars (never mid-word, no ellipsis), the no-candidate-tokens medoid-snippet fallback (never empty), and determinism (same input → same output). Per `contracts/group-title-suggestion-contract.md`.
- [X] T002 [P] [US1] Extend `src/test/features/boards/clustering/semanticGroupingService.test.ts` to assert every `GroupSuggestion` returned by `findSemanticCardGroups` carries a non-empty `suggestedTitle` of ≤35 chars.
- [X] T003 [P] [US1] Extend `src/test/features/boards/clustering/GroupSuggestionModal.test.tsx` to assert: the title input is pre-filled from `suggestion.suggestedTitle`; it carries a native `maxLength={35}`; editing one suggestion's title leaves a second suggestion's title untouched (per-`suggestion.id` isolation); rejecting a suggestion after editing its title discards the edit.
- [X] T004 [P] [US1] Extend `src/test/features/boards/clustering/useCardGroups.test.ts` to assert `acceptSuggestion` passes the suggestion's title through to `createGroup` as `customTitle`.
- [X] T005 [US1] Extend `src/test/features/boards/clustering/GroupableColumn.test.tsx`'s existing "Group Suggestions" describe block with the three accept-flow branches: unedited title → group created with the AI-suggested title; edited title → group created with the edited text; title cleared to blank/whitespace → group created with the computed `"Group N"` fallback (N = `columnGroups.length + 1` at accept time).

### Implementation for User Story 1

- [X] T006 [P] [US1] Add `suggestedTitle: string` to the `GroupSuggestion` interface in `src/features/boards/types/card.ts` (per `data-model.md`).
- [X] T007 [US1] Implement `suggestGroupTitle(cards: Card[], maxLength = 35): string` in new `src/features/boards/clustering/services/groupTitleService.ts` — stopword-filtered (small built-in ES+EN list) term-frequency extraction scored by distinct-member-card document frequency, top 2–4 tokens joined and capitalized, word-boundary truncation to `maxLength`, medoid-card-snippet fallback when no candidate tokens remain. Makes T001 pass. Depends on: T006.
- [X] T008 [US1] In `src/features/boards/clustering/services/semanticGroupingService.ts`, call `suggestGroupTitle()` once per formed cluster inside `findSemanticCardGroups` and populate `suggestedTitle` on each returned `GroupSuggestion`. Makes T002 pass. Depends on: T007.
- [X] T009 [US1] In `src/features/boards/clustering/components/GroupSuggestionModal.tsx`, add a per-suggestion inline-editable title `<input>` (pre-filled from `suggestion.suggestedTitle`, `maxLength={35}`, an accessible `aria-label` per Constitution VIII) with local edit state keyed by `suggestion.id`; pass the current (edited-or-original) title value along when `onAcceptSuggestion` fires so the caller receives it. Makes T003 pass. Depends on: T006.
- [X] T010 [US1] In `src/features/boards/clustering/hooks/useCardGroups.ts`, update `acceptSuggestion` to accept the resolved title and pass it to `createGroup(...)` as `customTitle`. Makes T004 pass. Depends on: T006.
- [X] T011 [US1] In `src/features/boards/clustering/components/GroupableColumn.tsx`'s `handleAcceptSuggestion`, read the title supplied by the panel (T009); if it is empty/whitespace after trimming, compute the fallback `` `${t('groupSuggestion.group')} ${columnGroups.length + 1}` `` (per `research.md` §5); pass the resolved, non-empty title to `onGroupCreate`. Makes T005 pass. Depends on: T009, T010.
- [X] T012 [P] [US1] Add the title input's accessible-name i18n key (e.g. `groupSuggestion.titleInputLabel`) to `src/locales/en.json` and `src/locales/es.json`, alongside the existing `groupSuggestion` block. Depends on: none (can run alongside T007–T011).
- [X] T013 [US1] Extend `e2e/retrospective-board.spec.ts` with a scenario covering: request suggestions, edit a proposed group's title, accept it, and confirm the resulting `GroupCard` shows the edited title. Depends on: T007–T012.

**Checkpoint**: User Story 1 is fully functional and independently testable — proposed groups show titles, are inline-editable, and the accept flow's three branches (unedited/edited/cleared) all produce the correct `CardGroup.title`.

---

## Phase 4: User Story 2 - Switching away from suggested grouping breaks groups and re-sorts cards (Priority: P2)

**Goal**: Changing a column's grouping mode away from `'suggestions'` dissolves every group in that column formed by accepting a suggestion, discards any pending un-actioned suggestions, and lets the column's existing card-processing logic re-sort all now-ungrouped cards per the newly selected mode — visible to every participant via the board's existing realtime sync.

**Independent Test**: Accept at least one suggested group in a column; switch that column's mode to "no grouping" and confirm the group is gone and its cards render individually; repeat switching to "group by author" and confirm the cards are re-sorted by author instead.

### Tests for User Story 2 ⚠️ write first, confirm failing before implementing

- [X] T014 [P] [US2] Extend `src/test/features/boards/clustering/GroupableColumn.test.tsx` with a test asserting that switching the column's mode from `'suggestions'` (with one or more existing `columnGroups`) to `'none'` or `'user'` calls `onGroupDisband` once per existing group in that column, **and** — once the (mocked) disband resolves and the parent re-renders with those groups' cards no longer carrying a `groupId` — that the column's rendered output reflects the newly selected criteria (individually for `'none'`, author-keyed for `'user'`), per `contracts/grouping-mode-switch-teardown-contract.md`'s Verification section and spec.md FR-009.
- [X] T015 [P] [US2] Extend the same file with a test asserting that switching away from `'suggestions'` while the suggestions panel has pending (un-actioned) suggestions closes the panel and clears those pending suggestions (`group-suggestion-modal` test id no longer rendered after the switch).
- [X] T016 [P] [US2] Extend the same file with two no-op tests: (a) switching away from `'suggestions'` when the column has zero accepted groups calls `onGroupDisband` zero times; (b) switching between two non-`'suggestions'` modes (e.g. `'none'` → `'user'`) also calls `onGroupDisband` zero times.
- [X] T017 [P] [US2] Extend the same file with a test asserting that if one of several `onGroupDisband` calls during a mode-switch teardown rejects, the other calls still resolve/complete (not aborted) and a visible error (toast) is shown.

### Implementation for User Story 2

- [X] T018 [P] [US2] Add the mode-switch disband-error toast i18n key (e.g. `retrospective.grouping.disbandOnSwitchError`) to `src/locales/en.json` and `src/locales/es.json`, alongside the existing `retrospective.grouping` block. Depends on: none.
- [X] T019 [US2] In `src/features/boards/clustering/components/GroupableColumn.tsx`, extend the `onGroupingChange` callback passed to `ColumnHeaderMenu`: capture `columnState.criteria` as `previousCriteria` before calling `setGroupingCriteria`; when the new criteria is not `'suggestions'` and `previousCriteria === 'suggestions'`, close the suggestions panel (`setShowSuggestions(false)`, clear `suggestions`/`suggestionsError`) and disband every entry in `columnGroups` via `Promise.allSettled(columnGroups.map(g => onGroupDisband(g.id)))`, showing one `toast.error(t('retrospective.grouping.disbandOnSwitchError'))` if any settle as rejected. Makes T014–T017 pass. Depends on: T018.
- [X] T020 [US2] Extend `e2e/retrospective-board.spec.ts` with a scenario: accept a suggested group, switch the column's mode to "no grouping", and confirm the group card is gone and its cards render individually. Depends on: T019.

**Checkpoint**: Both User Stories 1 and 2 are independently functional. A column can generate/edit/accept titled suggestions (US1) and cleanly tear down into any other mode without leaving stale AI-formed groups behind (US2).

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T021 [P] Run `npm run test:coverage` and confirm the `vitest.config.ts` 80% thresholds still hold (Constitution VI).
- [X] T022 [P] Run `npx playwright test` (full suite, not just the new specs) to confirm no unrelated regression (quickstart.md §4). Ran against real Firebase emulators: 163/165 passed, 1 skipped (Redis-coordination test, no REDIS_URL in this environment). The one failure (`accessibility.spec.ts:1137`, color-picker keyboard test) is pre-existing flakiness unrelated to this feature — confirmed by re-running in isolation (passed on a clean `main` checkout via `git stash`, and passed 2/3 repeated runs with this feature's changes applied).
- [X] T023 Walk through `quickstart.md` §2 and §3 manual validation steps end-to-end in a running dev instance. Validated via real, automated E2E runs against live Firebase emulators + dev server instead of manual clicking (equivalent or stronger signal): the extended semantic-grouping test (title generation, inline edit, edited-title persistence) and the new mode-switch-teardown test (disband + re-sort + live persistence) both pass.
- [X] T024 [P] `grep -rn "suggestedTitle" retro-rocket/src` and confirm consistent naming/usage across the type, service, component, and tests with no stray duplicates (quickstart.md §4).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: empty — nothing to do.
- **Foundational (Phase 2)**: empty — nothing blocks either story.
- **User Story 1 (Phase 3)** and **User Story 2 (Phase 4)**: both may start immediately; no cross-story dependency. Both touch `GroupableColumn.tsx`, but in different functions (`handleAcceptSuggestion` for US1, the `onGroupingChange` handler for US2) — if worked in parallel, coordinate the merge on that one file.
- **Polish (Phase 5)**: depends on whichever of US1/US2 are complete (run after both for full coverage, or after just US1 if shipping the MVP alone).

### Within User Story 1

T001–T005 (tests) before T006–T013 (implementation). T006 (type) before T007 (service, needs the type) before T008 (wiring). T009/T010 both depend on T006 only, parallelizable with each other but not with T011 (which depends on both). T012 (i18n) is independent of the TS chain. T013 (E2E) last.

### Within User Story 2

T014–T017 (tests) before T018–T020 (implementation). T018 (i18n key) before T019 (uses the key in the toast). T020 (E2E) last.

### Parallel Opportunities

- T001–T004 (US1 tests in different files) in parallel.
- T014–T017 (US2 tests, all in the same file but independent `it` blocks) can be drafted in parallel by one author, or split across two if staffed, but land as one coordinated edit to `GroupableColumn.test.tsx`.
- T006 and T012 in parallel (different files).
- T009 and T010 in parallel once T006 lands (different files, both only need the type change).
- T018 in parallel with anything in Phase 3 (different files, no dependency).
- Phase 3 (US1) and Phase 4 (US2) can proceed in parallel by two developers, coordinating only on the shared `GroupableColumn.tsx`/`GroupableColumn.test.tsx` merge.

---

## Parallel Example: User Story 1

```bash
# Tests, launched together:
Task: "Unit tests for suggestGroupTitle() in src/test/features/boards/clustering/groupTitleService.test.ts"
Task: "Extend semanticGroupingService.test.ts to assert suggestedTitle on results"
Task: "Extend GroupSuggestionModal.test.tsx for inline-edit/maxLength/isolation/reject-discards"
Task: "Extend useCardGroups.test.ts for acceptSuggestion title pass-through"

# Once the type change (T006) lands, these two in parallel:
Task: "Add inline-editable title input to GroupSuggestionModal.tsx"
Task: "Update useCardGroups.acceptSuggestion to pass title through to createGroup"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3 (User Story 1) — T001 through T013.
2. **STOP and VALIDATE**: run `quickstart.md` §2 manually; confirm titles appear, are editable, and the three accept-flow branches work.
3. Ship/demo if ready — User Story 1 delivers value with or without User Story 2.

### Incremental Delivery

1. Ship User Story 1 (titled, editable suggestions) as the first increment.
2. Add User Story 2 (mode-switch teardown) as a second, independent increment — validate via `quickstart.md` §3.
3. Run Phase 5 polish once both are in.

---

## Notes

- [P] tasks touch different files (or independent regions with no shared edit target) and have no incomplete-task dependency.
- Every implementation task cites which test task(s) it makes pass, per Constitution Principle I (TDD, NON-NEGOTIABLE) — write and confirm-failing the test before starting the corresponding implementation task.
- Commit after each task or logical group.
- No new dependency, worker, backend endpoint, or Firestore schema change is introduced anywhere in this task list (per `plan.md`'s Constitution Check).
