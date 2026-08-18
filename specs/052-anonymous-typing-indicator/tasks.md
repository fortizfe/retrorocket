# Tasks: Anonymous Typing Indicator

**Input**: Design documents from `/specs/052-anonymous-typing-indicator/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Per the project constitution (Principle I, TDD, NON-NEGOTIABLE), every implementation task below is preceded by a failing-test task covering the same unit. Write the test, confirm it fails, then implement.

**Organization**: Tasks are grouped by user story (spec.md priorities: US1 = P1, US2 = P2, US3 = P3). All three stories touch the same two production files (`TypingPreview.tsx`, `GroupableColumn.tsx`) because this is a small, tightly-scoped fix — US1 carries the entire production-code change; US2 and US3 add the regression/verification coverage that locks in their respective acceptance scenarios, which US1's implementation already satisfies structurally (research.md §1, §3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1, US2, or US3 — omitted for Setup/Foundational/Polish tasks
- All paths are relative to `retro-rocket/`

## Path Conventions

Existing frontend-only web app structure: `retro-rocket/src/**`. No backend change (plan.md's Structure Decision) — no new top-level directory.

---

## Phase 1: Setup

**Purpose**: Confirm the environment this feature is built and validated against; no new dependency or scaffolding is needed (research.md — zero new dependencies).

- [X] T001 Confirm `npm test -- TypingPreview` and `npm test -- GroupableColumn` run cleanly from `retro-rocket/` on the current `main` baseline per [quickstart.md](./quickstart.md) §1 (no code change — environment check only)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migrate `TypingPreview`'s currently-hardcoded, Spanish-only text onto the project's existing (already-defined-but-unused) `typing.single`/`typing.double`/`typing.multiple` i18n keys, with **zero behavior change** (research.md §5). This must land before either the anonymous branch (US1) or the non-anonymous regression lock (US2) is built, since both read through the same `formatTypingText` function.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Add a local `vi.mock('@/lib/hooks/useLanguage', ...)` to `src/test/lib/components/ui/TypingPreview.test.tsx` whose `t(key, options)` interpolates `{{var}}` tokens against the real `es.json` values for `typing.single`/`typing.double`/`typing.multiple` (so existing Spanish-text assertions in the file keep asserting the same strings unchanged), and add a failing test asserting `TypingPreview` calls `t('typing.single', { username })` / `t('typing.double', { username1, username2 })` / `t('typing.multiple', { username, count })` for the corresponding typist counts, in `src/test/lib/components/ui/TypingPreview.test.tsx`
- [X] T003 In `src/lib/components/ui/TypingPreview.tsx`, import and call `useLanguage()` from `@/lib/hooks/useLanguage` inside the component body, and rewrite `formatTypingText` to accept `t` as a parameter and call `t('typing.single'|'typing.double'|'typing.multiple', {...})` instead of its current inline Spanish template literals — pass the same `t` to both the visible-card call and the screen-reader live-region call (depends on: T002)

**Checkpoint**: `TypingPreview`'s existing (non-anonymous) text now flows through i18next with no visible change. All three user stories can now be built.

---

## Phase 3: User Story 1 - Typing indicator hides identity in anonymous boards (Priority: P1) 🎯 MVP

**Goal**: When a board's anonymous mode is enabled, the typing indicator shows only a generic, localized "a user is typing" message — no name, initials, or avatar — for one or several simultaneous typists.

**Independent Test**: Enable anonymous mode on a board, have one (then two) participants type in a column, and confirm other participants see the generic message with no identifying detail ([quickstart.md](./quickstart.md) §2).

### Tests for User Story 1

- [X] T004 [P] [US1] Add failing tests in `src/test/lib/components/ui/TypingPreview.test.tsx` asserting: (a) with `isAnonymous={true}` and one typist, the visible card and the live region both show `t('typing.anonymous')`'s value; (b) with `isAnonymous={true}` and two or more typists, the text is still the single generic message (not doubled, not counted); (c) with `isAnonymous={true}`, the avatar/initials cluster and its `+N` overflow badge are entirely absent from the DOM. Also update every existing `render(<TypingPreview typingUsers={...} />)` call already in this file to pass `isAnonymous={false}` explicitly, since the prop will become required (depends on: T002)
- [X] T005 [P] [US1] In `src/test/features/boards/clustering/GroupableColumn.test.tsx`, extend the existing `vi.mock('@/lib/components/ui/TypingPreview', ...)` (around line 76) to also capture and render the `isAnonymous` prop it receives (e.g. `data-anonymous={String(isAnonymous)}` on the existing `data-testid="typing-preview"` node), and add a failing test asserting that prop equals `true` when `mockUseBoardData` returns a retrospective with `isAnonymous: true`, and `false` otherwise
- [X] T006 [P] [US1] Add the new `typing.anonymous` key to the existing `typing` namespace in `src/locales/en.json` (`"A user is typing"`) and `src/locales/es.json` (`"Un usuario está escribiendo"`), per [contracts/typing-i18n-keys-contract.md](./contracts/typing-i18n-keys-contract.md)

### Implementation for User Story 1

- [X] T007 [US1] In `src/lib/components/ui/TypingPreview.tsx`, add `isAnonymous: boolean` (required) to `TypingPreviewProps`; in `formatTypingText`, return `t('typing.anonymous')` whenever `isAnonymous` is `true` and `typingUsers.length > 0` (checked before the existing length-based branches); conditionally render the avatar cluster (`displayedUsers.slice(0, 3).map(...)` block and its `+N` badge) only when `!isAnonymous` (depends on: T003, T004, T006)
- [X] T008 [US1] In `src/features/boards/clustering/components/GroupableColumn.tsx`, pass `isAnonymous={isAnonymousBoard}` to the existing `<TypingPreview typingUsers={typingUsers} className="mb-3" />` call (depends on: T005, T007)
- [X] T009 [P] [US1] Add a new Playwright scenario to `retro-rocket/e2e/retrospective-board.spec.ts`, alongside the existing typing-indicator scenarios (~line 809), that creates a board with anonymous mode enabled, has participant A start typing without submitting, and asserts participant B's `visibleTypingText`/`typingLiveRegion` shows exactly the generic message text (reusing the file's existing helpers) with no participant name present (depends on: T007, T008)

**Checkpoint**: User Story 1 is independently functional and testable — verified via [quickstart.md](./quickstart.md) §2. This is the MVP.

---

## Phase 4: User Story 2 - Typing indicator keeps showing names in non-anonymous boards (Priority: P2)

**Goal**: Confirm boards without anonymous mode enabled render the typing indicator exactly as before this feature — display names, avatars, and existing multi-typist phrasing, with zero regression.

**Independent Test**: With anonymous mode disabled, have one (then several) participants type and confirm names/avatars still show exactly as today ([quickstart.md](./quickstart.md) §3).

**Note**: Phase 2 and Phase 3's implementation already makes this pass structurally (the `!isAnonymous` branch is untouched behavior). This story's tasks add the explicit acceptance-scenario coverage and regression check that prove it, per Constitution Principle VI/VII.

### Tests for User Story 2

- [X] T010 [P] [US2] Add a test in `src/test/lib/components/ui/TypingPreview.test.tsx` explicitly asserting that with `isAnonymous={false}`, the avatar/initials cluster (and its `+N` badge for 3+ typists) **is** rendered, closing the FR-003 acceptance scenario that Phase 3's tests didn't need to cover (depends on: T007)

### Verification for User Story 2

- [X] T011 [US2] Run `npm run e2e -- --grep "typing indicator"` from `retro-rocket/` and confirm the two pre-existing named-typist scenarios in `retro-rocket/e2e/retrospective-board.spec.ts` (~line 617 and ~line 809) still pass unchanged after the Phase 2/3 changes ([quickstart.md](./quickstart.md) §3, §5); if either fails, fix the regression in `src/lib/components/ui/TypingPreview.tsx` (depends on: T009, T010)

**Checkpoint**: User Stories 1 AND 2 both verified independently — non-anonymous behavior is a proven zero-regression (SC-002).

---

## Phase 5: User Story 3 - Indicator updates immediately when anonymous mode is toggled (Priority: P3)

**Goal**: Confirm the indicator's identity display switches between generic and named the moment the board's anonymous-mode setting changes, with no page reload.

**Independent Test**: Toggle anonymous mode on/off while a participant is typing and confirm the indicator updates live in both directions ([quickstart.md](./quickstart.md) §4).

**Note**: Per research.md §1, this is a structural consequence of `TypingPreview` being a pure function of its props re-rendered by React when `isAnonymousBoard` changes — no new subscription, timer, or effect is expected. This story's tasks prove that expectation holds.

### Tests for User Story 3

- [X] T012 [P] [US3] Add a failing test in `src/test/features/boards/clustering/GroupableColumn.test.tsx` asserting that re-rendering the component after `mockUseBoardData` flips `retrospective.isAnonymous` from `false` to `true` (and back) updates the `isAnonymous` prop received by the mocked `TypingPreview` accordingly, with no unmount/remount of the typing-preview node between renders (depends on: T005)

### Implementation for User Story 3

- [X] T013 [US3] Run T012 against the code already delivered by T007/T008; if it fails, adjust `src/features/boards/clustering/components/GroupableColumn.tsx` so `isAnonymousBoard` is recomputed on every render from `retrospective` (no stale memoization) (depends on: T012) — T012 passed GREEN on first run, confirming research.md §1's prediction; no production fix was needed
- [X] T014 [P] [US3] Add a two-browser-context Playwright scenario to `retro-rocket/e2e/retrospective-board.spec.ts` — facilitator toggles anonymous mode on while a participant is shown typing with their name, confirm the facilitator's indicator updates to the generic message with no reload, then toggle off and confirm it reverts to the named text (quickstart.md §4) (depends on: T009, T013)

**Checkpoint**: All three user stories are independently functional and verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final full-suite validation across everything touched by this feature.

- [X] T015 Run `npm run test -- TypingPreview GroupableColumn && npm run type-check && npm run lint && npm run e2e -- --grep "typing"` from `retro-rocket/` and confirm the 80% branches/functions/lines/statements coverage floor holds for `TypingPreview.tsx` and `GroupableColumn.tsx` (Constitution Principles I, VI, VII)
- [X] T016 [P] Run the accessibility spot-check from [quickstart.md](./quickstart.md) §6 in both light and dark themes (live-region role/aria unchanged; no contrast regression on the generic-message card)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — delivers the MVP
- **User Story 2 (Phase 4)**: Depends on Foundational AND on Phase 3's implementation (T007) existing, since it verifies the branch Phase 3 adds — not independent of US1 in this feature, unlike the general template's assumption, because both stories share the same two production files
- **User Story 3 (Phase 5)**: Depends on Foundational AND on Phase 3's implementation (T007/T008) for the same reason
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- `TypingPreview.tsx` changes before `GroupableColumn.tsx` changes (the consumer depends on the prop existing)
- Unit tests before E2E tests
- Story complete before moving to next priority

### Parallel Opportunities

- T002 has no code dependency on Setup's T001 beyond ordering convention; T004, T005, T006 (all within US1's test phase) touch different files and can run in parallel
- T010 (US2) and T012 (US3) touch different test files from each other and can be written in parallel once Phase 3 is complete
- T009, T014 (E2E additions) touch the same file (`retrospective-board.spec.ts`) sequentially, not in parallel with each other, but can be drafted independently and merged

---

## Parallel Example: User Story 1

```bash
# Launch all three test/config tasks for User Story 1 together (different files):
Task: "Add isAnonymous=true tests in src/test/lib/components/ui/TypingPreview.test.tsx"
Task: "Extend TypingPreview mock + add isAnonymous-prop test in src/test/features/boards/clustering/GroupableColumn.test.tsx"
Task: "Add typing.anonymous key to src/locales/en.json and src/locales/es.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — migrates existing text to i18n with no behavior change)
3. Complete Phase 3: User Story 1 — the anonymous-mode fix itself
4. **STOP and VALIDATE**: Run quickstart.md §2, confirm no name/avatar leaks in an anonymous board
5. Deploy/demo if ready — this alone closes the privacy gap the user reported

### Incremental Delivery

1. Complete Setup + Foundational → i18n migration verified, no behavior change
2. Add User Story 1 → Test independently → Deploy/Demo (MVP — closes the reported privacy gap)
3. Add User Story 2 → Regression-lock the non-anonymous path → Deploy/Demo
4. Add User Story 3 → Prove the live-toggle path → Deploy/Demo
5. Polish → full-suite + accessibility confirmation

---

## Notes

- [P] tasks = different files, no dependency
- [Story] label maps task to specific user story for traceability
- This feature's small, two-file scope means US2 and US3 are verification-heavy rather than new-implementation-heavy — see each phase's Note
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
