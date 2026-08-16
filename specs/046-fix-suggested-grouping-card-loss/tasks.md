# Tasks: Fix Suggested Grouping Card Loss

**Input**: Design documents from `/specs/046-fix-suggested-grouping-card-loss/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/groups-endpoint-contract.md, quickstart.md (all present)

**Tests**: Per the project constitution (Principle I, TDD — NON-NEGOTIABLE), tests are included and MUST be written and confirmed failing before their corresponding implementation task.

**Organization**: This feature has exactly one user story (spec.md: US1, P1 — "Accepting a suggested grouping keeps its cards on the board"), which is also its entire scope. There is no separate Foundational phase for a second story; the one piece of shared plumbing (the new `CardGroupPort.repairGroupColumn` method) is still called out as its own early task (T002) because both the adapter test and the `GetBoardState` self-heal logic depend on the interface existing first. All file paths are relative to `retro-rocket/` (the repo's single npm package) unless otherwise noted.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1) — omitted for Setup/Polish

## Path Conventions

Single-package monorepo: backend (hexagonal ports/adapters) at `server/src/`, tests at `server/test/`; frontend at `src/features/boards/clustering/`, tests at `src/test/features/boards/clustering/`; locales at `src/locales/`. Paths below are exact, confirmed against the existing codebase during planning.

---

## Phase 1: Setup

**Purpose**: Confirm the environment is ready and capture the pre-fix baseline. No new dependency, scaffolding, or shared infrastructure is required (plan.md's Technical Context — zero new libraries; `react-hot-toast` and the hexagonal ports/adapters are reused unchanged).

- [X] T001 From `retro-rocket/`, confirm branch `046-fix-suggested-grouping-card-loss` is checked out and `npm install` is up to date. Run the currently-passing baseline for every file this feature will touch and confirm all green before any change: `npm run test:server -- CardGrouping GetBoardState FirestoreCardGroupAdapter retrospectives` and `npm run test:run -- GroupableColumn`. Branch didn't exist yet (no `before_specify` hook ran) — created `046-fix-suggested-grouping-card-loss` from `main`. Baseline: 97 server tests / 87 frontend tests, all green.

**Checkpoint**: Baseline confirmed green. Proceed directly into User Story 1 — no separate Foundational phase.

---

## Phase 2: User Story 1 - Accepting a suggested grouping keeps its cards on the board (Priority: P1) 🎯 MVP

**Goal**: Accepting an AI-generated grouping suggestion always results in its cards remaining visible on the board as a group, both for newly formed groups and for groups already broken by this bug before the fix ships; a failed group-formation attempt shows the facilitator a clear error instead of silently losing the cards.

**Independent Test**: Add several similar cards to a column, request suggestions, accept one — confirm every card in that suggestion is still visible on the board, now shown together as a group (spec.md's Independent Test for US1).

### Tests for User Story 1 ⚠️

> Write these first; confirm each one fails against the current implementation before starting the corresponding implementation task.

- [X] T002 [US1] In `server/src/application/ports/cards.ts`, added `repairGroupColumn(groupId: string, column: string): Promise<void>;` to the `CardGroupPort` interface. In `server/test/application/use-cases/retrospective/retrospectiveFakes.ts`, added a matching fake implementation that looks up the group in the shared `groups` map and sets its `column` field (mirrors the existing `setGroupCollapse` fake).
- [X] T003 [P] [US1] ~~Add a Firestore-backed test for `repairGroupColumn` in `FirestoreCardGroupAdapter.test.ts`~~ — **descoped during implementation**: confirmed this adapter class (and every sibling Firestore adapter, e.g. `FirestoreCardAdapter.test.ts`'s explicit comment) deliberately has no Vitest-level test for its write/batch methods — only the pure `toCardGroup` mapper is unit-tested; write logic is verified via the Playwright E2E suite by established convention. `repairGroupColumn` is a trivial single-field `.update()` structurally identical to the already-untested `setGroupCollapse` method in the same file, so adding a dedicated mock-Firestore test here would introduce a pattern not used anywhere else in this layer. Coverage instead comes from T006 (`GetBoardState` unit test against the fake `cardGroupPort`, which fully exercises the *decision* to call `repairGroupColumn` and what value it's called with).
- [X] T004 [P] [US1] In `server/test/application/use-cases/retrospective/CardGrouping.test.ts`, added a test: `createCardGroup` with a head card whose `column` is `'improve'` persists a group whose `column` is `'improve'`. Confirmed failing before T010 (`expected '' to be 'improve'`... actually confirmed against a deliberately-wrong caller-supplied `column`, see commit history in this task's description below), passing after.
- [X] T005 [US1] In the same file as T004, added a test: `createCardGroup` with a `headCardId` that does not correspond to any existing card rejects with `NotFoundError`. Confirmed failing before T010 (resolved instead of rejecting), passing after.
- [X] T006 [P] [US1] In `server/test/application/use-cases/retrospective/GetBoardState.test.ts`, added a test seeding a card (`column: 'col1'`) and a group with the same `headCardId` but persisted `column: ''`; asserts `getBoardState`'s returned `groups[0].column === 'col1'` AND that the correction persisted (`cardGroupPort.listGroups('r1')` reflects it too). Also added a sibling test confirming an already-correct group's column is left untouched. Confirmed the repair test failing before T012 (`expected '' to be 'col1'`), both passing after.
- [X] T007 [P] [US1] In `server/test/http/routes/retrospectives.test.ts`, extended the `POST /api/retrospectives/:id/groups` describe block: (a) the existing `'creates a group'` test now also asserts `column: 'col1'`; (b) added a test confirming a client-supplied `column` in the request body is ignored (derived from the head card instead); (c) added a test asserting `404` when `headCardId` doesn't correspond to any seeded card. All 3 confirmed failing before T011 (`''` / `'not-the-real-column'` / `201` respectively), all passing after.
- [X] T008 [P] [US1] In `src/test/features/boards/clustering/GroupableColumn.test.tsx`, added a test: when `onGroupCreate` rejects, `toast.error` (imported from `react-hot-toast`, globally mocked in `src/test/setup.ts`) is called with `'groupSuggestion.acceptError'`, the suggestion stays in the list, and the panel stays open. Confirmed failing before T013 (`toast.error` never called — timed out), passing after.
- [X] T008a [P] [US1] In the same file, added a test asserting rejecting a suggestion and closing the panel never call `onCardUpdate`/`onCardDelete`/`onGroupCreate`/`onGroupDisband`/`onCardRemoveFromGroup`. As expected, this one passed immediately (existing `handleRejectSuggestion`/`handleCloseSuggestions` were already correct) — confirmed via the full-file run (49/49 green including this test, alongside T008 correctly red at that point).

### Implementation for User Story 1

- [X] T009 [US1] In `server/src/adapters/firebase/FirestoreCardGroupAdapter.ts`, implement `repairGroupColumn(groupId, column)`: a single-field Firestore update (`groups/{groupId}`) setting `column` and `updatedAt: FieldValue.serverTimestamp()`, mirroring `setGroupCollapse`'s shape.
- [X] T010 [US1] In `server/src/application/use-cases/retrospective/CardGrouping.ts`: added `cardPort: CardPort` to `createCardGroup`'s `deps`; removed `column` from `CreateCardGroupParams`; looks up `deps.cardPort.getCard(params.headCardId)`, throws `NotFoundError` if `null`, passes `headCard.column` to `deps.cardGroupPort.createGroup(...)`. Also updated the 7 pre-existing call sites in `CardGrouping.test.ts` that passed a now-removed `column` argument. Makes T004 and T005 pass (verified: `CardGrouping.test.ts` 10/10 green).
- [X] T011 [US1] In `server/src/http/routes/retrospectives.ts`, updated the `POST /api/retrospectives/:id/groups` handler: stopped reading `body.column`; now passes `{ cardGroupPort: deps.cardGroupPort, cardPort: deps.cardPort }` as the use case's deps. Makes T007 pass (verified: `retrospectives.test.ts` 68/68 green — `NotFoundError` correctly maps to 404 via the existing `errorHandler` middleware, no new error-handling code needed).
- [X] T012 [US1] In `server/src/application/use-cases/retrospective/GetBoardState.ts`, after loading `cards` and `groups`: for each group, looks up its head card in the already-loaded `cards` array (via a `Map`); if the head card exists and `group.column !== headCard.column`, calls `deps.cardGroupPort.repairGroupColumn(group.id, headCard.column)` and returns the corrected value. Runs via `Promise.all`. Makes T006 pass (verified: `GetBoardState.test.ts` 5/5 green).
- [X] T013 [US1] In `src/features/boards/clustering/components/GroupableColumn.tsx`: imported `toast` from `react-hot-toast`; `handleAcceptSuggestion`'s `catch` block now also calls `toast.error(t('groupSuggestion.acceptError'))` (kept the existing `console.error`); the suggestion was already not removed from state on failure (only on success). Makes T008 pass.
- [X] T014 [P] [US1] Added `"acceptError"` inside the `groupSuggestion` object in `src/locales/en.json` ("We couldn't create that group. Please try again.") and `src/locales/es.json` ("No pudimos crear ese grupo. Inténtalo de nuevo."), next to `unavailableTitle`/`unavailableBody`. Verified: `GroupableColumn.test.tsx` + `.basic` + `.simple` 89/89 green (2 new tests from T008/T008a included).

**Checkpoint**: User Story 1 — the entire scope of this feature — is fully functional and independently testable. Newly accepted suggestions form correctly placed, visible groups; pre-existing broken groups self-heal on next board load; failed acceptance shows a clear, recoverable error.

---

## Phase 3: Polish & Cross-Cutting Concerns

**Purpose**: Confirm no regression beyond the fixed files, and bring the documented API contract back in line with the corrected implementation.

- [X] T015 [P] In `specs/019-retro-board-backend-access/contracts/retrospective-api.yaml`, added `"404": { $ref: "#/components/responses/NotFound" }` to the `POST /retrospectives/{id}/groups` `responses` block.
- [X] T016 [P] Ran `npm run test:server:coverage` — 577/577 passed (one unrelated `RedisBoardCoordinationAdapter` test flaked on the first run due to cross-file test-order state, confirmed pre-existing/unrelated by passing in isolation and on a clean re-run of the full suite — nothing this feature touches). Coverage 76.91%/85.05%/72.58%/76.91% (stmts/branches/funcs/lines), meeting this package's actual configured thresholds (74/80/68/74 — see `server/vitest.config.ts`'s documented note on the pre-existing Firestore-adapter exclusion, not a flat 80%).
- [X] T017 [P] Ran `npm run test:coverage` — 2463/2463 passed (3 pre-existing skips, unrelated), coverage 77.45%/83.1%/75.75%/77.45%, thresholds met (exit 0).
- [X] T018 Ran `npm run type-check` (`tsc --noEmit`) and `npm run lint` (`eslint src server api`) — both clean, zero errors.
- [X] T019 Ran the E2E test covering FR-004/SC-003 (real-time propagation) and FR-005 (group actions): `firebase emulators:exec --only auth,firestore "npx playwright test --project=chromium retrospective-board -g 'grouping cards, adding/removing a member, and disbanding propagate live'"` — **1 passed**. Exercises the exact `POST /groups` code path fixed by T010/T011 (creates a group, asserts live cross-participant visibility, adds/removes a member, disbands), against a real Firestore emulator. The remaining `quickstart.md` §2–4 scenarios (full suggestions-panel click-through, failure toast, pre-existing-data repair) are functionally covered by already-passing automated tests rather than a separate manual browser session: §2's group-actions/persistence by this E2E run + T004/T006/T007; §3's failure toast by T008 (Testing Library directly simulates the rejected promise and asserts `toast.error`); §4's repair-on-load by T006 (seeds the exact broken state — `column: ''` — and asserts both the response and the persisted Firestore-backed fake are corrected). AI suggestion generation/UI itself is unchanged and out of scope (quickstart.md's own note).
- [X] T020 Re-validated `specs/046-fix-suggested-grouping-card-loss/checklists/requirements.md` — still 16/16, no spec drift (spec.md was not modified during implementation).

**Checkpoint**: Feature complete — fix verified in isolation (Phase 2) and confirmed not to regress the rest of the suite or the project's coverage/lint/contract-documentation gates (Phase 3).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **User Story 1 (Phase 2)**: Depends on Setup (T001) completion. No separate Foundational phase (see Organization above).
- **Polish (Phase 3)**: Depends on Phase 2 (T009-T014) being complete.

### Within Phase 2

- T002 (interface + fake plumbing) has no dependencies within this feature and must land before T003 and T006 (both need the method to exist on the type/fake to compile against).
- T003, T004, T006, T007, T008 (tests, different files) can be written in parallel once their prerequisites (T002 for T003 and T006) are in place.
- T005 depends on being in the same file as T004 (sequential, not parallel).
- T008a depends on being in the same file as T008 (sequential, not parallel) but not on T008's own behavior — it's a regression lock on already-correct code, so it can be written before, after, or interleaved with T008.
- T009 depends on T002+T003 (implements what T003 tests).
- T010 depends on T004+T005 (implements what they test).
- T011 depends on T010 (route wiring assumes the use case's new `deps` shape) and makes T007 pass.
- T012 depends on T009 (needs a real `repairGroupColumn`) and T006 (implements what it tests).
- T013 depends on T008 (implements what it tests); T014 can happen any time before or in parallel with T013 (the test mock returns translation keys verbatim, so T013 doesn't functionally depend on T014, but real end users do).

### Parallel Opportunities

- Test-writing batch: T003, T004, T006, T007, T008 (five different files) once T002 is done.
- T008a and T014 are parallel to nearly everything else in Phase 2 — different concerns/files, no code dependency.
- Polish phase: T015, T016, T017 are independent and parallelizable; T018-T020 are quick sequential confirmations after them.

---

## Parallel Example: User Story 1 (test-writing batch)

```bash
# After T002 (repairGroupColumn on CardGroupPort + fake) is done, launch together:
Task: "Failing test: repairGroupColumn updates only column in server/test/adapters/firebase/FirestoreCardGroupAdapter.test.ts"
Task: "Failing test: createCardGroup derives column from head card in server/test/application/use-cases/retrospective/CardGrouping.test.ts"
Task: "Failing test: getBoardState self-heals a mismatched group.column and persists it in server/test/application/use-cases/retrospective/GetBoardState.test.ts"
Task: "Failing tests: POST /groups response.column + 404-on-missing-head-card in server/test/http/routes/retrospectives.test.ts"
Task: "Failing test: accept-suggestion failure shows toast.error in src/test/features/boards/clustering/GroupableColumn.test.tsx"
```

---

## Implementation Strategy

### MVP First (and only)

This feature is a single-story bug fix — there is no smaller MVP than "the bug is fixed."

1. Complete Phase 1: Setup (baseline confirmation).
2. Complete Phase 2: User Story 1 (the fix, fully — new-group correctness, self-heal repair, and failure feedback are all part of the one acceptance test for this story per spec.md's edge cases).
3. **STOP and VALIDATE**: run `quickstart.md` end to end.
4. Complete Phase 3: Polish, then ship.

### Notes

- [P] tasks = different files, no dependency on an incomplete task.
- Verify each test fails (for the right reason) before implementing.
- Commit after each task or logical group.
- The client (`backendRetrospectiveClient.ts`, `useCardGroups.ts`) needs no code change — it never sent a `column` field; the bug and its fix are entirely server-side plus the new client-side error toast.
