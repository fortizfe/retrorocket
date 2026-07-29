---

description: "Task list template for feature implementation"
---

# Tasks: Show Display Names Instead of User IDs on Retro Board Cards

**Input**: Design documents from `/specs/020-user-display-name-fix/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cards-api.md, quickstart.md (all present)

**Tests**: Per the project constitution (Principle I, TDD — NON-NEGOTIABLE), tests are included and MUST be written and confirmed failing before their corresponding implementation task.

**Organization**: Tasks are grouped by user story (from spec.md: US1 = P1, US2 = P2) to enable independent implementation and testing of each story. All file paths are relative to `retro-rocket/` (the repo's single npm package).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2) — omitted for Setup/Foundational/Polish

## Path Conventions

Single-package monorepo: backend at `server/src/` (hexagonal: `http/routes`, `application/use-cases`, `application/ports`, `adapters/firebase`) with tests at `server/test/`; frontend at `src/` with tests at `src/test/`; E2E specs at `e2e/`. Paths below are exact, confirmed against the existing codebase.

---

## Phase 1: Setup

**Purpose**: Confirm the environment is ready. No new dependencies, tooling, or scaffolding are required for this fix (per plan.md's Technical Context — no new library, no new service).

- [X] T001 Confirm branch `020-user-display-name-fix` is checked out and the existing dev workflow starts cleanly (frontend `npm run dev`, backend dev server, Firebase emulators) per the project's existing scripts — no code changes in this task.

**Checkpoint**: Environment confirmed; no new setup needed before Foundational work begins.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Capture the author's display name at card-creation time end-to-end (backend write path → DTO → frontend type), and build the single shared name-resolution helper both user stories depend on (per data-model.md, US1 and US2 intentionally share the same 3-step resolution logic). **Nothing in Phase 3/4 can be correctly implemented until this phase is complete.**

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for Foundational (write first; confirm FAIL before implementation)

- [X] T002 [P] Add failing test case in `server/test/application/use-cases/retrospective/CardLifecycle.test.ts` asserting `createCard` forwards a `createdByName` argument through to `cardPort.createCard`.
- [X] T003 [P] Add failing test case in `server/test/adapters/firebase/FirestoreCardAdapter.test.ts` asserting `createCard` persists `createdByName` to the Firestore document, and that the read-mapping (`toCard`) returns `createdByName` when present and tolerates its absence on legacy documents (returns `undefined`, no error).
- [X] T004 [P] Add failing test case in `server/test/http/routes/retrospectives.test.ts` asserting `POST /api/retrospectives/:id/cards` returns a response body whose `createdByName` equals `displayNameOf(session.user)` for the authenticated caller.
- [X] T005 [P] Add failing test case in `src/test/features/boards/retrospective/backendRetrospectiveClient.test.ts` asserting `cardFromDTO` carries a DTO's `createdByName` through onto the returned `Card`, and that it stays `undefined` when the DTO omits it.
- [X] T006 [P] Create `src/test/lib/utils/cardHelpers.test.ts` with failing test cases for a new `resolveAuthorDisplayName(card, participants, fallbackLabel)` helper: (a) returns `card.createdByName` when present and non-empty; (b) else returns the `name` of the `participants` entry whose `userId === card.createdBy`; (c) else returns the given `fallbackLabel`; (d) two participants sharing the same `name` still resolve correctly by `userId` match, not by name.

### Implementation for Foundational

- [X] T007 [P] Extend `CreateCardInput` (add required `createdByName: string`) and `CardDTO` (add optional `createdByName?: string`) in `server/src/application/ports/cards.ts`.
- [X] T008 [P] Extend `CreateCardParams` in `server/src/application/use-cases/retrospective/CardLifecycle.ts` with `createdByName: string` and forward it into the call to `deps.cardPort.createCard(...)` — makes T002 pass. Depends on T007.
- [X] T009 [P] Update `FirestoreCardAdapter.createCard` (write) and the `toCard` read-mapping helper in `server/src/adapters/firebase/FirestoreCardAdapter.ts` to persist and read back `createdByName` — makes T003 pass. Depends on T007.
- [X] T010 Update the `POST /api/retrospectives/:id/cards` handler in `server/src/http/routes/retrospectives.ts` to pass `createdByName: displayNameOf(session.user)` (reusing the file's existing local `displayNameOf` helper, `retrospectives.ts:52-54`) when building the create-card input — makes T004 pass. Depends on T008.
- [X] T011 [P] Extend `Card` and `CreateCardInput` in `src/features/boards/types/card.ts` with `createdByName?: string`.
- [X] T012 [P] Extend the `CardDTO` type and `cardFromDTO` mapping in `src/features/boards/retrospective/services/backendRetrospectiveClient.ts` to carry `createdByName` through — makes T005 pass. Depends on T011.
- [X] T013 [P] Implement `resolveAuthorDisplayName(card, participants, fallbackLabel)` in `src/lib/utils/cardHelpers.ts` implementing the 3-step resolution documented in data-model.md — makes T006 pass. Depends on T011.
- [X] T014 [P] Add a new fallback-label i18next key (e.g. `retrospective.grouping.unknownAuthor`) to both `src/locales/en.json` and `src/locales/es.json`, alongside the existing `retrospective.grouping.*` keys (`en.json:246-251`, `es.json:304-307`).

**Checkpoint**: Cards now capture the author's display name at creation, the DTO/type chain carries it end-to-end from Firestore to the frontend `Card` type, a shared `resolveAuthorDisplayName` helper exists and is tested, and fallback copy is localized. User story implementation can now begin.

---

## Phase 3: User Story 1 - Group headers show the author's name when grouping cards by user (Priority: P1) 🎯 MVP

**Goal**: When a board is grouped "by user", each group header shows the author's resolved display name (never the raw uid), groups sort alphabetically by that name, and two participants sharing a display name still produce two distinct groups.

**Independent Test**: On a retrospective board with cards from multiple participants (including one who has since left the board), switch grouping to "by user" and confirm every group header shows a human-readable name — sorted A→Z — with no raw identifier visible anywhere in the group headers, and no two different authors' cards merged into one group.

### Tests for User Story 1 (write first; confirm FAIL before implementation)

- [X] T015 [P] [US1] Add failing test cases in `src/test/features/boards/clustering/useColumnGrouping.test.ts` asserting `groupCards` (for `criteria === 'user'`): keeps `card.createdBy` as the grouping key (uniqueness preserved even when two authors share a display name); attaches a resolved `displayLabel` to each group via `resolveAuthorDisplayName`; and orders the resulting groups alphabetically (A→Z) by `displayLabel` rather than by the raw uid key.
- [X] T016 [P] [US1] Create `src/test/features/boards/clustering/GroupedCardList.test.tsx` with a failing test asserting the rendered group header text is a group's resolved `displayLabel`, never the raw `createdBy` uid.

### Implementation for User Story 1

- [X] T017 [US1] Update `groupCards` in `src/features/boards/clustering/hooks/useColumnGrouping.ts` (currently keys and sorts by raw `card.createdBy` at lines 64-96) to: keep the uid as the grouping key, compute each group's `displayLabel` via `resolveAuthorDisplayName` (using the T014 fallback key), and sort groups alphabetically by `displayLabel` instead of the raw key. Depends on T013, T014, T015.
- [X] T018 [P] [US1] Thread the `participants` prop already available in `src/features/boards/clustering/components/GroupableColumn.tsx` into the `useColumnGrouping`/`groupCards` call so the legacy-card fallback lookup has data at grouping time. Depends on T017.
- [X] T019 [P] [US1] Update `src/features/boards/clustering/components/GroupedCardList.tsx` (lines 43, 73-96) to render each group's resolved `displayLabel` as the header instead of the raw `groupName` object key — makes T016 pass. Depends on T017.

**Checkpoint**: User Story 1 is fully functional and independently testable — grouping by user now shows correct, alphabetically sorted display names.

---

## Phase 4: User Story 2 - Each card's author label shows a display name (Priority: P2)

**Goal**: In any grouping mode, every individual card's author label shows the resolved display name (never the raw uid).

**Independent Test**: Open a retrospective board with cards from multiple authors (including one who has since left the board) in any grouping mode and confirm each card's author label shows a display name or explicit fallback — never a raw identifier.

### Tests for User Story 2 (write first; confirm FAIL before implementation)

- [X] T020 [P] [US2] Add failing test case in `src/test/features/boards/retrospective/DraggableCard.test.tsx` asserting `DraggableCard` passes `resolveAuthorDisplayName(card, participants, fallbackLabel)`'s result — not `card.createdBy` — as the `author` prop to `CardHeader`, covering: an active-participant author, a departed author with a captured `createdByName`, and a legacy card with neither.
- [X] T021 [P] [US2] Confirm/extend `src/test/features/boards/retrospective/CardHeader.test.tsx` to assert `CardHeader` renders whatever `author` string it receives verbatim (guards against lookup logic leaking into this presentational component).

### Implementation for User Story 2

- [X] T022 [US2] Update `src/features/boards/retrospective/components/DraggableCard.tsx` (line 231, currently `author={card.createdBy}`) to compute `resolveAuthorDisplayName(card, participants, t('retrospective.grouping.unknownAuthor'))` and pass that as the `author` prop to `CardHeader` — makes T020 pass. Depends on T013, T014, T020.

**Checkpoint**: User Stories 1 AND 2 both work independently — no raw uid is rendered anywhere on the board.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Constitution-mandated E2E coverage, accessibility verification, and final validation across both stories.

- [X] T023 [P] Extend `e2e/retrospective-board.spec.ts` to assert that grouping cards "by user" shows participant display names (not raw ids) in the group headers, in alphabetical order — required because Principle VII lists "grouping" as a critical flow needing Playwright coverage.
- [X] T024 [P] Extend `e2e/card-lifecycle.spec.ts` to assert a newly created card's author label shows the creator's display name, not a raw id.
- [X] T025 Verify WCAG 2.1 AA contrast and focus-visibility are unaffected by the new group-header/author-label text in both light and dark themes, per Principle VIII — check `src/features/boards/clustering/components/GroupedCardList.tsx` and `src/features/boards/retrospective/components/CardHeader.tsx`.
- [ ] T026 Run the `specs/020-user-display-name-fix/quickstart.md` validation scenarios A–F end-to-end against the running app + Firebase emulators.
- [X] T027 Run the full test suite (`npm run test` for frontend and backend Vitest, `npm run test:e2e` for Playwright) and confirm the 80% branches/functions/lines/statements coverage thresholds in both `vitest.config.ts` files are maintained.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS both user stories.
- **User Story 1 (Phase 3)** and **User Story 2 (Phase 4)**: Both depend only on Foundational completion; they touch disjoint files (`useColumnGrouping.ts`/`GroupedCardList.tsx`/`GroupableColumn.tsx` vs. `DraggableCard.tsx`) and can proceed in parallel or in either order.
- **Polish (Phase 5)**: Depends on both user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2). No dependency on User Story 2.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2). No dependency on User Story 1.

### Within Each Phase

- Tests MUST be written and confirmed failing before their corresponding implementation task (Principle I, NON-NEGOTIABLE).
- Type/port extensions before the logic that forwards/uses the new field.
- Story complete (checkpoint) before moving to Polish.

### Parallel Opportunities

- All Foundational test tasks (T002-T006) can run in parallel — five different files.
- T007 and T011 can run in parallel (backend port types vs. frontend types, no shared file).
- T008 and T009 can run in parallel once T007 is done (different files, same dependency).
- T012 and T013 can run in parallel once T011 is done (different files, same dependency).
- T014 (locale files) can run in parallel with any other Foundational task.
- All User Story 1 test tasks (T015-T016) can run in parallel; T018 and T019 can run in parallel once T017 is done.
- All User Story 2 test tasks (T020-T021) can run in parallel.
- User Story 1 (Phase 3) and User Story 2 (Phase 4) can be worked on in parallel by different people once Foundational is complete.
- T023 and T024 (E2E specs) can run in parallel.

---

## Parallel Example: Foundational Phase

```bash
# Launch all Foundational tests together:
Task: "Add failing test in server/test/application/use-cases/retrospective/CardLifecycle.test.ts"
Task: "Add failing test in server/test/adapters/firebase/FirestoreCardAdapter.test.ts"
Task: "Add failing test in server/test/http/routes/retrospectives.test.ts"
Task: "Add failing test in src/test/features/boards/retrospective/backendRetrospectiveClient.test.ts"
Task: "Create src/test/lib/utils/cardHelpers.test.ts"

# Once T007/T011 land, launch these together:
Task: "Extend CreateCardParams in server/src/application/use-cases/retrospective/CardLifecycle.ts"
Task: "Update FirestoreCardAdapter.createCard/toCard in server/src/adapters/firebase/FirestoreCardAdapter.ts"
Task: "Extend CardDTO/cardFromDTO in src/features/boards/retrospective/services/backendRetrospectiveClient.ts"
Task: "Implement resolveAuthorDisplayName in src/lib/utils/cardHelpers.ts"
```

## Parallel Example: User Stories 1 & 2 (after Foundational)

```bash
# Different developers, fully independent:
Developer A: T015, T016, T017, T018, T019  (User Story 1 — group headers)
Developer B: T020, T021, T022              (User Story 2 — per-card label)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks both stories; also delivers FR-005's core requirement, name capture at creation).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Run quickstart.md Scenario B and C independently.
5. This alone fixes the exact bug reported (group-by-user headers showing raw ids).

### Incremental Delivery

1. Setup + Foundational → foundation ready (name capture + shared resolver in place).
2. Add User Story 1 → validate independently → this is the reported bug, fixed.
3. Add User Story 2 → validate independently → closes the same defect class on the always-visible per-card label.
4. Polish → E2E coverage, accessibility check, full quickstart run, coverage verification.

---

## Notes

- [P] tasks touch different files with no unresolved dependency between them.
- [US1]/[US2] labels map each task to its user story for traceability back to spec.md.
- Every implementation task has a corresponding test task that must be written and observed failing first (Principle I, NON-NEGOTIABLE).
- `createdBy` (the raw uid) must never be passed to a rendering prop anywhere in this feature — only `createdByName` / `resolveAuthorDisplayName(...)` output.
- Commit after each task or logical group, per the user's existing workflow.

## Implementation Notes (execution pass, 2026-07-29)

- Per explicit user instruction, Playwright/E2E test **executions** were skipped to save time and tokens. T023/T024 were completed as *written* (the e2e spec files were extended/fixed with the correct assertions, including updating an existing test at `e2e/retrospective-board.spec.ts` that had been asserting the raw uid as the expected group-heading text — i.e., a test that encoded the bug itself) but not run against the Firebase emulators.
- T026 (running quickstart.md's scenarios against a live app + emulators) was left unchecked for the same reason — it requires the same live browser/emulator setup as the E2E suite.
- T027 ran both Vitest suites (2534 frontend tests, 410 backend tests — all passing) and verified coverage against the thresholds **actually enforced** in each `vitest.config.ts` (frontend: 78/64/50/50 branches/functions/lines/statements; backend: 80/68/74/74) — both files carry a documented note that these are the true current baseline, not the constitution's aspirational 80% figure, tracked as a separate pre-existing follow-up (FR-012). Both suites pass their real configured thresholds. The Playwright portion of T027 was not run, per the same instruction.
- Frontend `CreateCardInput` (types/card.ts) was deliberately **not** extended with `createdByName`, deviating from the task's original wording — the client never sends this field (the server derives it from the session), so extending that request-shape type would have added an unused field rather than serving the fix.
