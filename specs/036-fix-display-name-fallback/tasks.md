---

description: "Task list for feature implementation"
---

# Tasks: Fix Configured Display Name Not Used on New Boards

**Input**: Design documents from `/specs/036-fix-display-name-fallback/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/README.md, quickstart.md

**Tests**: Included and sequenced before their implementation task in every story, per Constitution Principle I (TDD, NON-NEGOTIABLE) and Principle VI (80% coverage floor). `inMemoryProfilePort` (existing fake, `server/test/application/use-cases/profile/profileFakes.ts`) and the existing route test files/test-app builders are reused rather than newly created.

**Organization**: Tasks are grouped by user story (US1–US3, per spec.md) so each of the three affected surfaces — cards, participant/join records, likes/reactions/typing status — can be fixed and verified independently, on top of one shared Foundational DI change all three depend on.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US3)
- File paths are relative to `retro-rocket/` (the project root inside the repo)

## Path Conventions

Single Vite/React client (`retro-rocket/src/**`) + Express/Firebase-admin backend (`retro-rocket/server/**`), per plan.md's Structure Decision. This fix is entirely backend: `server/src/http/routes/*.ts`, `server/src/http/*-wiring.ts`, and their tests under `server/test/**`, plus one new E2E scenario in `retro-rocket/e2e/retrospective-board.spec.ts`.

---

## Phase 1: Setup

**Purpose**: Establish the TDD "red" baseline before any change — no new tooling or dependencies are needed (plan.md confirms zero new dependencies; `ProfilePort`/`FirestoreProfileAdapter`/`inMemoryProfilePort` already exist from feature 018).

- [X] T001 From `retro-rocket/`, run `npm run test:server -- boards.test retrospectives.test` and confirm the existing suites are fully green (baseline before adding new failing cases per story below) — 82/82 passed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Thread `ProfilePort` through both routers' dependency injection so every user story's call site can resolve a user's configured profile name. No route call site is modified yet — this phase only makes the capability available.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [X] T002 [P] Add `profilePort: ProfilePort` to the `RetrospectiveRouterDeps` interface in `server/src/http/routes/retrospectives.ts` (import `ProfilePort` from `../../application/ports/profile`)
- [X] T003 [P] Add `profilePort: ProfilePort` to the `BoardsRouterDeps` interface in `server/src/http/routes/boards.ts` (import `ProfilePort` from `../../application/ports/profile`)
- [X] T004 [P] In `server/src/http/retrospective-wiring.ts`, import `FirestoreProfileAdapter` from `../adapters/firebase/FirestoreProfileAdapter` and add `profilePort: new FirestoreProfileAdapter(db)` to the object `buildRetrospectiveDeps` returns (depends on T002)
- [X] T005 [P] In `server/src/http/boards-wiring.ts`, import `FirestoreProfileAdapter` from `../adapters/firebase/FirestoreProfileAdapter` and add `profilePort: new FirestoreProfileAdapter(db)` to the object `buildBoardsDeps` returns (depends on T003)
- [X] T006 [P] In `server/test/http/routes/retrospectivesTestApp.ts`, import `inMemoryProfilePort` from `../../application/use-cases/profile/profileFakes` and add `profilePort: inMemoryProfilePort([])` to `buildRetrospectiveTestApp`'s default `deps` (before `...seed.overrides`, so tests can still override it) (depends on T002)
- [X] T007 [P] In `server/test/http/routes/boardsTestApp.ts`, import `inMemoryProfilePort` from `../../application/use-cases/profile/profileFakes` and add `profilePort: inMemoryProfilePort([])` to `buildBoardsTestApp`'s default `deps` (before `...options.overrides`) (depends on T003)
- [X] T008 [P] Add a private async `resolveDisplayName(deps: Pick<RetrospectiveRouterDeps, 'profilePort'>, session: AuthedSession)` helper to `server/src/http/routes/retrospectives.ts`, calling the existing `ensureUserProfile` use case (`../../application/use-cases/profile/EnsureUserProfile`) with `{ uid: session.sub, email: session.user?.email ?? '', displayName: session.user?.displayName ?? null, photoURL: session.user?.photoURL ?? null, providers: session.user?.providers ?? [] }` — the same input shape `GET /api/profile` already passes (`routes/profile.ts:69-79`) — and returning `.displayName`. Not yet called by any existing call site. (depends on T002 only — this helper only needs the `RetrospectiveRouterDeps` type from T002, not the concrete wiring in a different file, so it does not depend on T004)
- [X] T009 [P] Add the equivalent async `resolveDisplayName(deps: Pick<BoardsRouterDeps, 'profilePort'>, session: AuthedSession)` helper to `server/src/http/routes/boards.ts`, mirroring T008. Not yet called by any existing call site. Exported (unlike retrospectives.ts's, boards.ts's helper isn't otherwise exported anywhere, so it must be `export`ed to avoid a `noUnusedLocals` compile error while unused between now and US2). (depends on T003 only — same rationale as T008; does not depend on T005)
- [X] T010 From `retro-rocket/`, run `npm run type-check:server` and confirm it compiles cleanly (depends on T004, T005, T006, T007, T008, T009) — clean compile

**Checkpoint**: `deps.profilePort` and an async `resolveDisplayName` helper exist in both route files, unused by any call site yet — each user story below can now swap its own call site(s) independently.

---

## Phase 3: User Story 1 - Cards on a brand-new board show the author's configured name (Priority: P1) 🎯 MVP

**Goal**: A card written on a board a user has just created or joined for the first time shows their currently configured Profile display name, not the raw name from their connected Google/GitHub account.

**Independent Test**: Seed a session and a differing profile display name, create a card via the API, and confirm `createdByName` in the response matches the profile's name — verifiable without any other story's fix in place, since the participant/like/reaction/typing call sites are untouched.

### Tests for User Story 1 ⚠️

> Write these first; confirm they fail against the current implementation before making any fix.

- [X] T011 [P] [US1] In `server/test/http/routes/retrospectives.test.ts`, add a test case (near the existing "captures the caller's display name as createdByName" test at line ~148) that overrides `profilePort` to `inMemoryProfilePort([{ uid: 'u1', displayName: 'Configured Name', ... }])` while the session's `user.displayName` remains `'User u1'` (per `fakeSessionServiceWithUser`), creates a card, and asserts `res.body.createdByName === 'Configured Name'`. Confirm it fails against the current `displayNameOf(session.user)` implementation. (depends on T001, T008)

### Implementation for User Story 1

- [X] T012 [US1] In `server/src/http/routes/retrospectives.ts`, replace `createdByName: displayNameOf(session.user)` at the card-creation call site (~line 192) with `createdByName: await resolveDisplayName(deps, session)` — makes T011 pass (depends on T011)
- [X] T013 [US1] Add a new Playwright test to `retro-rocket/e2e/retrospective-board.spec.ts` reproducing the originally reported scenario end-to-end: `signInAs` a user with one name, `PATCH /api/profile` to a different configured name, create a brand-new retrospective board, write a card, and assert the card's author label shows the configured name immediately — with no reload and no rename event (the gap the existing rename-propagation test at line ~440 doesn't cover, since that one renames *after* content already exists on an *existing* board) (depends on T012)
    - **Discovered during implementation**: this E2E test initially failed even with T012 done, because the client's `resolveDisplayName` (`src/lib/utils/cardHelpers.ts`) prefers the *live participant record* over the card's own `createdByName`, and the board-creator's participant record is seeded by `POST /api/boards` (`boards.ts`), not by any call site in `retrospectives.ts`. Closing the reported symptom end-to-end required pulling forward part of US2 (T014/T016 for the retrospective-join participant record, T015/T017 for the board-creation/board-join participant records) before this test could go green — the stories are not as rendering-independent as originally scoped; see the note added to the User Story Dependencies section below. Verified green via `firebase emulators:exec --project demo-retrorocket --only auth,firestore "npx playwright test -g \"shows the author's configured Profile display name\""`.

**Checkpoint**: User Story 1 (the originally reported defect) is fixed and independently verified — 82 baseline + 2 new server unit tests + 1 new E2E test, all green.

---

## Phase 4: User Story 2 - Participant list and group headers on a brand-new board show the configured name (Priority: P2)

**Goal**: A user's entry in a board's participant list — and any "group by user" header — shows their configured display name from the moment they create or join that board for the first time.

**Independent Test**: Seed a session and a differing profile display name, create/join a board via the API, and confirm the resulting participant record's `name`/board's `createdByName` matches the profile's name.

### Tests for User Story 2 ⚠️

> Write these first; confirm they fail against the current implementation before making any fix.

- [X] T014 [P] [US2] In `server/test/http/routes/retrospectives.test.ts`, add a test case overriding `profilePort` with a differing configured name, joining a retrospective for the first time, and asserting the created participant's `userName`/`name` reflects the profile's configured name, not the session's. Confirm it fails against `displayNameOf(session.user)` at the join call site (~line 177). (depends on T001, T008) — pulled forward during US1 (T013), see note there
- [X] T015 [P] [US2] In `server/test/http/routes/boards.test.ts`, add two test cases (board creation, board join) overriding `profilePort` with a differing configured name and asserting `createdByName`/`userName` in each response reflects the profile's configured name. Confirm both fail against `displayNameOf(session.user)` at the boards.ts call sites (~lines 98, 108). (depends on T001, T009) — implemented via `vi.spyOn` on `inMemoryBoardsPort`'s `createBoard`/`joinBoard`, since neither the fake nor `serializeBoard`'s response exposes a name field to assert on directly; pulled forward during US1 (T013)

### Implementation for User Story 2

- [X] T016 [US2] In `server/src/http/routes/retrospectives.ts`, replace `userName: displayNameOf(session.user)` at the retrospective-join call site (~line 177) with `userName: await resolveDisplayName(deps, session)` — makes T014 pass (depends on T014)
- [X] T017 [US2] In `server/src/http/routes/boards.ts`, replace `createdByName: displayNameOf(session.user)` (board creation, ~line 98) and `userName: displayNameOf(session.user)` (board join, ~line 108) with `await resolveDisplayName(deps, session)` at both call sites, then remove the now-fully-unused local `displayNameOf` function from this file (both of its only call sites are gone, so it would otherwise fail `noUnusedLocals`) — makes T015 pass (depends on T015)
- [X] T018 [US2] Extend `retro-rocket/e2e/retrospective-board.spec.ts`'s new scenario from T013 (or add a sibling test) asserting the brand-new board's participant list entry and, once a second participant's card triggers a "group by user" view, the group header both show the configured name (depends on T016, T017) — extended the same test with participant-avatar-title and group-heading assertions; passed

**Checkpoint**: User Stories 1 AND 2 are both independently verified — 86 server unit tests green, E2E confirmed.

**Note on story independence (discovered during implementation)**: US1 and US2 turned out to share a *rendering* dependency not visible at the spec/plan level — the client always prefers a live participant record's name over a card's own captured name (`resolveDisplayName` in `cardHelpers.ts`), so US1's fix alone was invisible in the browser until the board-creator's own participant record (US2, both the retro-join and board-creation paths) was also fixed. Both stories' *code changes* remain in genuinely independent files/call sites as planned; only the *end-to-end visual verification* of US1 required US2's participant-record fixes to also be in place. This is documented here rather than reflected as a plan/task restructure, since the independent implementation tasks (T012 vs T016/T017) are still valid and separable — only the E2E acceptance check needed both.

---

## Phase 5: User Story 3 - Likes, reactions, and typing status on a brand-new board show the configured name (Priority: P3)

**Goal**: Likes, reactions, and the typing-status indicator, on a board a user just created or joined for the first time, show their configured display name.

**Independent Test**: Seed a session and a differing profile display name, like/react/set-typing via the API, and confirm each response's `username` matches the profile's name.

### Tests for User Story 3 ⚠️

> Write these first; confirm they fail against the current implementation before making any fix.

- [X] T019 [P] [US3] In `server/test/http/routes/retrospectives.test.ts`, add three test cases (like, reaction, typing status) overriding `profilePort` with a differing configured name and asserting each response's `username` reflects the profile's configured name, not the session's. Confirm all three fail against `displayNameOf(session.user)` at the current call sites (~lines 229, 239, 257). (depends on T001, T008) — typing status returns 204 with no body, so verified via `vi.spyOn`/an ad-hoc `TypingStatusPort` spy override instead of a response-body assertion

### Implementation for User Story 3

- [X] T020 [US3] In `server/src/http/routes/retrospectives.ts`, replace `username: displayNameOf(session.user)` at the like (~line 229), reaction (~line 239), and typing-status (~line 257) call sites with `username: await resolveDisplayName(deps, session)` — makes T019 pass. This is the last call site in this file, so also remove the now-fully-unused exported `displayNameOf` function (confirm via `grep -rn "displayNameOf" retro-rocket/` that nothing outside this file imports it) (depends on T019)
- [X] T021 [US3] Add a new Playwright test to `retro-rocket/e2e/retrospective-board.spec.ts` asserting that on a brand-new board, a user's like tooltip, reaction tooltip, and typing-status indicator all show their configured Profile display name rather than their raw connected-account name (depends on T020) — required an explicit `GET /api/profile` before the `PATCH` in the test itself (that first GET is what creates the profile doc via `ensureUserProfile` in normal UI usage; this API-only test doesn't load the UI, so it has to trigger that step explicitly)

**Checkpoint**: All three user stories are independently verified; the reported defect and its full surface are closed. All three E2E scenarios (T013, T018/extended-T013, T021) pass against the Firebase emulator.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full CI-gate parity before opening the PR.

- [X] T022 [P] From `retro-rocket/`, run `npm run type-check` and `npm run type-check:server` and confirm no new TypeScript errors (depends on T012, T016, T017, T020) — clean
- [X] T023 [P] From `retro-rocket/`, run `npm run lint` and confirm no new ESLint errors (depends on T012, T016, T017, T020) — clean
- [X] T024 From `retro-rocket/`, run `npm run test:server:coverage` and confirm the 80% branch/function/line/statement coverage floor (Constitution VI) still holds (depends on T012, T016, T017, T020) — 492/492 tests pass; coverage 84.04% branches / 69.55% functions / 76.1% lines / 76.1% statements, all above `server/vitest.config.ts`'s configured thresholds (80/68/74/74 — a documented, pre-existing baseline below the nominal 80% due to Firestore adapters intentionally excluded from unit coverage, not something this feature changes); `boards.ts`/`retrospectives.ts` themselves are at 100% statement coverage
- [X] T025 From `retro-rocket/`, run the full `quickstart.md` validation sequence and confirm every gate passes, matching the constitution's merge-blocking CI checks (depends on T013, T018, T021, T022, T023, T024). Ran: `npm run type-check` (clean), `npm run type-check:server` (clean), `npm run lint` (clean), `npm run test:coverage` (frontend: 2491 passed/3 pre-existing skips, exit 0), `npm run test:server:coverage` (492/492 passed, thresholds met — see T024). For the E2E gate, ran the three spec files exercising this change and its surrounding regression surface directly against the Firebase emulator — `e2e/retrospective-board.spec.ts` + `e2e/card-lifecycle.spec.ts` + `e2e/profile.spec.ts` — 48/48 passed, including all pre-existing display-name tests from specs 020/022 (group-by-user headers, live rename propagation, departed-author fallback) alongside the 3 new tests from this feature. The full unrelated E2E suite (accessibility, exports, dashboard, mcp-connector, concurrent-signin, board-creation/join/responsive, facilitator-countdown, team-mood) was not additionally re-run in this session, since this is a backend-only change confined to `retrospectives.ts`/`boards.ts` with no surface touching those areas; it will run automatically as part of the project's CI gate before merge per the constitution.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001) recording the green baseline — BLOCKS all user stories (no call site can resolve a profile name until `deps.profilePort` and `resolveDisplayName` exist)
- **User Stories (Phase 3-5)**: All depend on Foundational (T010) being complete
  - Can proceed in parallel once T010 lands, or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user story phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after T010 — touches only `retrospectives.ts`'s card-creation call site; no dependency on other stories
- **User Story 2 (P2)**: Can start after T010 — touches `retrospectives.ts`'s join call site and both of `boards.ts`'s call sites; independent of US1's call site (card creation), no shared files with US1 beyond the already-shared `resolveDisplayName` helper from Foundational
- **User Story 3 (P3)**: Can start after T010 — touches `retrospectives.ts`'s like/reaction/typing call sites only; independent of US1/US2's call sites. T020 additionally removes the now-dead `displayNameOf` export, which must happen after US1 (T012) and US2 (T016) have already moved their `retrospectives.ts` call sites off of it — sequence US3 last within this file if working through stories in priority order.

### Within Each Phase

- Tests MUST be written and confirmed failing before their corresponding implementation task (strict TDD order)
- Foundational: interface changes (T002/T003) unblock wiring/test-app defaults (T004-T007) and the `resolveDisplayName` helpers (T008/T009) independently and in parallel (T004-T009 each depend only on their file's own interface task, T002 or T003 — none of them depend on each other); the compile check (T010) then depends on all six
- Within a story: failing test(s) before the route-file swap before the E2E scenario

### Parallel Opportunities

- T002 and T003 (different files) can run in parallel
- T004-T009 can each run in parallel once their respective interface task (T002 or T003) lands — six independent files/edits
- Once T010 completes, US1, US2, and US3's test-writing tasks (T011, T014+T015, T019) can all be written in parallel — different test files/cases, no shared state
- T022 and T023 (type-check, lint) can run in parallel

---

## Parallel Example: Post-Foundational Test Writing

```bash
# Once T010 (compile check) passes, launch each story's failing tests together:
Task: "Add failing createdByName test in retrospectives.test.ts (US1, T011)"
Task: "Add failing join userName tests in retrospectives.test.ts + boards.test.ts (US2, T014/T015)"
Task: "Add failing like/reaction/typing username tests in retrospectives.test.ts (US3, T019)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (confirm green baseline)
2. Complete Phase 2: Foundational (DI threading + async helpers — no behavior change yet)
3. Complete Phase 3: User Story 1 (card-creation fix — the originally reported defect)
4. **STOP and VALIDATE**: run T013's E2E scenario; the reported bug is closed
5. Open a PR / merge if ready — Phases 4 and 5 close the same class of bug on the remaining surfaces but are not required to resolve the reported defect

### Incremental Delivery

1. Complete Setup + Foundational → the capability exists, no call site uses it yet
2. Fix + verify User Story 1 → the reported defect (cards) is closed (MVP)
3. Fix + verify User Story 2 → participant list / group headers closed
4. Fix + verify User Story 3 → likes / reactions / typing status closed; dead `displayNameOf` code removed
5. Polish → full CI-gate parity before merge

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Per clarification (spec.md), no backfill/migration task exists for already-affected records — out of scope by design
- Verify each story's tests fail before implementing that story's call-site swap
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
