# Tasks: Reliable Backend-Mediated Access for Concurrent Retrospective Teams

**Input**: Design documents from `/specs/021-backend-realtime-updates/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rate-limiting-contract.md, quickstart.md (all present)

**Tests**: Included and sequenced before their corresponding implementation task in every phase, per this project's constitution (Principle I, TDD, NON-NEGOTIABLE).

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each story. All file paths are relative to `retro-rocket/` unless stated otherwise.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Establish a clean, known-good baseline before making any change.

- [X] T001 Run the existing full check suite on branch `021-backend-realtime-updates` and record the baseline result: `npm run test:run`, `npm run test:server`, `npm run type-check`, `npm run type-check:server`, `npm run lint` — retro-rocket/ (repository root)

**Checkpoint**: Baseline is green (or any pre-existing failures are noted and excluded from this feature's scope) before Phase 2 begins.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared rate-limit key-resolution mechanism that User Story 1 and User Story 3 both depend on (research.md §1). User Story 2 does not depend on this phase and may proceed in parallel.

**⚠️ CRITICAL**: US1 and US3 cannot be correctly implemented until this phase is complete.

- [X] T002 [P] Write failing unit tests for the shared rate-limit key resolver — asserts session-id-when-a-valid-`rr_session`-cookie-is-present, trust-proxy-aware IP fallback otherwise, and that two distinct identities never collide into one key — in `server/test/http/middleware/rateLimiting.test.ts` (new file)
- [X] T003 Implement the shared key resolver + limiter factory in `server/src/http/middleware/rateLimiting.ts` (new file) to make T002 pass — exports a `createRateLimiter(deps)` used by every router's limiter (data-model.md's Usage Throttling Policy shape: `windowMs`, `limit`, `keyStrategy: 'session' | 'ip'`)
- [X] T004 [P] Write a failing test asserting the Express app trusts Vercel's proxy hop so `req.ip` resolves the real client address from `X-Forwarded-For` rather than the proxy's own socket address, in `server/test/http/app.test.ts` (new file)
- [X] T005 Configure `app.set('trust proxy', ...)` in `server/src/http/app.ts` for Vercel's proxy chain to make T004 pass (research.md §1)

**Checkpoint**: Shared rate-limiting building block exists and is tested. US1 and US3 phases below wire specific routers to it; US2 can start any time (no dependency on this phase).

---

## Phase 3: User Story 1 - Sign in reliably no matter how many teammates are already online (Priority: P1) 🎯 MVP

**Goal**: A team member's sign-in never fails with "too many requests" because of other users' unrelated activity.

**Independent Test**: 8-10 people sign in within the same short window; all succeed with no 429, and a legitimate burst from one user's reconnect does not throttle anyone else.

### Tests for User Story 1

- [X] T006 [P] [US1] Write a failing integration test asserting that N distinct authenticated sessions (and, for pre-session requests, N distinct client IPs) hitting `/api/auth/*` within one window are never co-throttled, in `server/test/http/routes/authLogin.test.ts`
- [X] T007 [P] [US1] Write a failing integration test asserting a legitimately throttled `/api/auth/*` request returns the existing `ApiErrorBody` envelope (`{ error: { code: 'rate_limited', message }, correlationId }`, per `contracts/rate-limiting-contract.md`) rather than `express-rate-limit`'s default response shape, in `server/test/http/routes/authLogin.test.ts`
- [X] T008 [P] [US1] Write a failing test asserting that when the session-check (`bootstrapSession`) fetch returns a 429 `rate_limited` response, the user sees a visible error message (not a silent failure), in `src/test/lib/contexts/UserContext.test.tsx` (extend existing file, or create if it does not yet exist)

### Implementation for User Story 1

- [X] T009 [US1] Rewire `authLimiter` in `server/src/http/routes/auth.ts` to use the shared resolver from `rateLimiting.ts` (T003) with a custom 429 handler returning the `ApiErrorBody` envelope, and resize its `windowMs`/`limit` for a 10-participant-team steady state plus reconnect churn (research.md §1) — makes T006/T007 pass
- [X] T010 [US1] In `src/lib/contexts/UserContext.tsx`, call `toast.error(errorMessage)` in `bootstrapSession`'s failure path (matching this file's existing `toast.error` convention used for sign-out/profile-load failures) so a session-check failure — including a 429 — is always visibly surfaced, never silent — makes T008 pass
- [X] T011 [P] [US1] Add a Playwright E2E test simulating 8-10 concurrent authenticated browser contexts signing in within the same short window, asserting zero 429 responses across all of them, in `e2e/concurrent-signin.spec.ts` (new file, following the existing `e2e/authentication.spec.ts` fixture patterns)

**Checkpoint**: User Story 1 is fully functional and independently testable — sign-in is no longer coupled to how many other legitimate users are active.

---

## Phase 4: User Story 2 - Collaborate on a retrospective board with a full team, with no direct Firebase traffic from the browser (Priority: P1)

**Goal**: Zero direct browser-to-Firebase communication remains, for both authentication and retrospective board data, while all existing board functionality and live updates keep working.

**Independent Test**: With 10 participants on one board performing typical actions, network inspection shows zero requests to any Firebase-owned endpoint at any point, and every participant still sees every other participant's changes live.

**Note**: Independent of Phase 2 (Foundational) — may be implemented in parallel with Phase 2/3.

### Tests for User Story 2

- [X] T012 [P] [US2] Update `src/test/architecture/retrospective-board-no-firestore.test.ts` so `EXPECTED_REMAINING_OFFENDERS` and `PERMANENT_EXCEPTIONS` are both empty — this test fails immediately and stays red until the columns rework (T015), the `UserProfileCache` deletion (T019), and the `participantService.ts`/`cardService.ts`/`cardInteractionService.ts` deletions (T024, T026) have all landed
- [X] T013 [P] [US2] Rewrite `src/test/features/boards/retrospective/useRetrospectiveColumns.test.ts` to test the reworked hook's new signature — deriving `columnConfigs`/`columnOrder`/`actionColumn` synchronously from a `columns: Column[]` argument, with no Firestore mocking, no `loading`/`onSnapshot` behavior — written to fail against the current Firestore-backed implementation
- [X] T014 [P] [US2] Update `src/test/features/boards/participants/ResponsiveParticipantDisplay.test.tsx` to assert the component renders each participant's own `photoURL` directly, with no `useEnrichedParticipants` call and no Firestore/`UserProfileCache` mocking — written to fail against the current implementation
- [X] T021 [P] [US2] Write a failing test asserting `bootstrapSession()` and `src/lib/services/firebase.ts` make no direct `firebase/auth` call (`signInWithCustomToken`) in production mode, extending `src/test/features/auth/backendAuthClient.test.ts` and `src/test/lib/services/firebase.test.ts` (the existing `retrospective-board-no-firestore.test.ts` guard, T012, only scans for `firebase/firestore` imports and does not cover this call)

### Implementation for User Story 2

- [X] T015 [US2] Rework `src/features/boards/retrospective/hooks/useRetrospectiveColumns.ts`: replace the `retrospectiveId`-driven `onSnapshot` listener with a pure derivation from a `columns: Column[]` argument (same field shape as today's `RetrospectiveColumn` — `id`, `i18nKey`, `type`, `order`, `defaultColor`), keeping all existing exports (`DynamicColumnConfig`, `ColumnRole`, `getColumnRole`, `getColumnIcon`) unchanged so `GroupableColumn.tsx`/`FacilitatorMenu.tsx`/`TeamMoodTab.tsx`/`ImprovedExportPopover.tsx` (which only import types/helpers, not the hook itself) need no changes — makes T013 pass
- [X] T016 [US2] In `src/pages/RetrospectivePage.tsx`, pass `board?.columns ?? []` (already present on `useRetrospectiveRealtimeSync`'s `RetrospectiveState`, research.md §2) into `RetrospectiveBoard` as a new `columns` prop
- [X] T017 [US2] In `src/features/boards/retrospective/components/RetrospectiveBoard.tsx`, accept the new `columns` prop and call the reworked `useRetrospectiveColumns(columns)` (T015) instead of `useRetrospectiveColumns(retrospective.id)`, removing the `columnsLoading`/`columnsError` states that no longer apply (data is already synchronously available)
- [X] T018 [US2] Delete `src/features/boards/participants/hooks/useEnrichedParticipants.ts` (research.md §3 — its only output, `photoURL`, is already on every `Participant`)
- [X] T019 [US2] Delete `src/features/boards/participants/services/UserProfileCache.ts`
- [X] T020 [US2] Update `src/features/boards/participants/components/ResponsiveParticipantDisplay.tsx` to render each participant's own `photoURL` directly, removing the `useEnrichedParticipants` call and the `enrichedParticipants`/fallback logic — makes T014 pass
- [X] T022 [US2] Remove the `signInWithCustomToken(auth, result.firebaseCustomToken)` call from `bootstrapSession()` in `src/features/auth/services/backendAuthClient.ts`, and update its `UserContext.tsx` call-site comment (research.md §4) — together with T023, makes T021 pass
- [X] T023 [US2] In `src/lib/services/firebase.ts`, remove the now-unused production `Auth` initialization/export used only by the removed call in T022, while preserving the emulator-only `window.__e2eSignIn` hook (gated behind `useEmulator`) exactly as-is — together with T022, makes T021 pass
- [X] T024 [P] [US2] Delete confirmed-dead files (zero live callers, research.md §4): `src/features/boards/retrospective/hooks/useCards.ts`, `src/features/boards/retrospective/services/cardService.ts`, `src/features/boards/retrospective/services/cardInteractionService.ts`, `src/lib/components/forms/CreateCardForm.tsx`
- [X] T025 [P] [US2] Delete confirmed-dead files (zero live callers, research.md §4): `src/features/boards/participants/hooks/useParticipants.ts`, `src/features/boards/participants/services/participantService.ts`, `src/lib/components/forms/JoinPanelForm.tsx` — note: `ImprovedParticipantService.ts` does **not** exist on disk (verified directly); only its orphaned test remains (see T027), so it is not listed here
- [X] T026 [P] [US2] Delete confirmed-dead files (zero live callers, research.md §4): `src/features/boards/retrospective/services/FirestoreListenerManager.ts` (dead code, though it contains no `firebase/firestore` import itself — general hygiene, not a Firebase-compliance fix), `src/lib/services/OptimizedRetrospectiveService.ts`, `src/lib/hooks/useFirestore.ts`, `src/lib/utils/migrateUserProviders.ts`
- [X] T027 [US2] Delete the now-orphaned test files for everything removed in T024-T026, plus the pre-existing orphaned `ImprovedParticipantService.test.ts` (tests a service file that does not exist on disk — see T025's note): `src/test/features/boards/retrospective/useCards.test.ts`, `src/test/features/boards/retrospective/cardService.test.ts`, `src/test/features/boards/retrospective/cardInteractionService.test.ts`, `src/test/lib/components/forms/CreateCardForm.test.tsx`, `src/test/features/boards/participants/useParticipants.test.ts`, `src/test/features/boards/participants/ImprovedUseParticipants.test.ts`, `src/test/features/boards/participants/participantService.test.ts`, `src/test/features/boards/participants/ImprovedParticipantService.test.ts`, `src/test/lib/components/forms/JoinPanelForm.test.tsx`, `src/test/lib/services/optimizedRetrospectiveService.test.ts`, and review `src/test/features/boards/retrospective/firebaseOptimization.test.ts` / `src/test/lib/services/firebase.test.ts` for assertions tied to removed code
- [X] T028 [US2] Confirm `src/test/architecture/retrospective-board-no-firestore.test.ts` (T012) now passes with both allowlists empty, and update its precedent comment block to reflect this feature's completion of the migration `019` left unfinished
- [X] T029 [P] [US2] Add a Playwright E2E test with 10 participants on one board performing typical actions (add/edit/vote/group a card, run the timer) for an extended interaction, asserting (a) zero network requests to any Firebase-owned host throughout, and (b) no duplicate or lost cards/groups/votes when several participants act concurrently (not only under reconnects — see US3's T034 for the reconnect-specific case), in `e2e/concurrent-board-network.spec.ts` (new file)

**Checkpoint**: User Story 2 is fully functional and independently testable — no direct browser-to-Firebase communication remains, reachable or dead.

---

## Phase 5: User Story 3 - Whole-team sessions stay stable over time (Priority: P2)

**Goal**: A full 30+ minute team session, including live-connection reconnects, produces zero "too many requests" errors and ends with complete, accurate board state.

**Independent Test**: Simulate 10 participants over 30+ minutes with at least one forced live-connection reconnect per participant; confirm zero 429s and a correct final board state.

**Depends on**: Phase 2 (Foundational). Reuses the exact rate-limiter pattern established in Phase 3 for `authLimiter`, applied here to `retrospectiveLimiter` — this is pattern reuse, not an execution dependency: US3 does not require US1 to be functionally complete first (see "User Story Dependencies" below). Its E2E test (T034) exercises ordinary board actions, so it is easiest to validate once Phase 4's board functionality is in place, but does not strictly require Phase 4's Firebase-cleanup changes specifically.

### Tests for User Story 3

- [X] T030 [P] [US3] Write a failing test asserting that the WebSocket reconnect flow's REST resync (`GET /api/retrospectives/:id`) and the upgrade handshake are session-keyed and not co-throttled across different participants' simultaneous reconnects, in `server/test/http/routes/retrospectives.test.ts`
- [X] T031 [P] [US3] Write a failing test asserting `retrospectiveLimiter`'s resized `windowMs`/`limit` comfortably covers a simulated 10-participant reconnect storm without rejecting any legitimate request, in `server/test/http/routes/retrospectives.test.ts`

### Implementation for User Story 3

- [X] T032 [US3] Rewire `retrospectiveLimiter` in `server/src/http/routes/retrospectives.ts` to use the shared resolver from `rateLimiting.ts` (T003) and resize `windowMs`/`limit` for a 10-participant team plus reconnect churn (research.md §1) — makes T030/T031 pass
- [X] T033 [US3] Review `src/features/boards/retrospective/services/backendRealtimeClient.ts`'s existing reconnect-with-backoff + resync logic and adjust if needed so a reconnect burst across many participants cannot exceed the resized limiter from T032 (e.g. confirm backoff jitter is sufficient at 10 concurrent participants)
- [X] T034 [P] [US3] Add a Playwright E2E test with 10 participants running a 30+ minute simulated session (forcing at least one live-connection drop/reconnect per participant), asserting: (a) zero 429s throughout, (b) a complete and accurate final board state, and (c) live updates measured during the session reach other participants within 2 seconds (p95, per spec FR-009/SC-004) — in `e2e/concurrent-board-session.spec.ts` (new file)

**Checkpoint**: All three user stories are independently functional. The MVP (US1) plus full-team collaboration (US2) plus session stability (US3) are all verifiable end-to-end.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Apply the same rate-limiter fix consistently to the remaining routers not exercised by any specific user story's acceptance scenarios (FR-002's system-wide guarantee), and validate the complete feature.

### Tests for Polish

- [X] T035 [P] Write a failing test asserting `boardsLimiter` uses the shared session-first/trust-proxy-aware key resolver (same behavior as T006 for `authLimiter`), in `server/test/http/routes/boards.test.ts`
- [X] T036 [P] Write a failing test asserting `profileLimiter` uses the shared session-first/trust-proxy-aware key resolver, in `server/test/http/routes/profile.test.ts`
- [X] T037 [P] Write a failing test asserting `mcp.ts`'s `tokenLimiter` rejects legitimately-throttled requests with the `ApiErrorBody` envelope, and that distinct client IPs are throttled independently (trust-proxy-aware, benefiting from T005), in `server/test/http/routes/mcpToken.test.ts` — **scope correction found during implementation**: `mcp.ts`'s two limiters authenticate via MCP-client OAuth token exchange / Bearer access token, never the browser's `rr_session` cookie, so `rateLimiting.ts`'s session-first resolver has no session identity to key on here and is intentionally NOT applied; they stay IP-keyed (already fixed for free by T005's global trust-proxy change) — see the comment in `mcp.ts`

### Implementation for Polish

- [X] T038 [P] Rewire `boardsLimiter` in `server/src/http/routes/boards.ts` to use the shared resolver from `rateLimiting.ts` (T003) and resize its `windowMs`/`limit` consistently with T009/T032 — makes T035 pass
- [X] T039 [P] Rewire `profileLimiter` in `server/src/http/routes/profile.ts` to use the shared resolver from `rateLimiting.ts` (T003) and resize its `windowMs`/`limit` consistently with T009/T032 — makes T036 pass
- [X] T040 [P] Add the same `ApiErrorBody` envelope `toolLimiter` already has to `tokenLimiter` in `server/src/http/routes/mcp.ts` (previously missing — FR-004) — makes T037 pass. Key generators for both are intentionally left as default IP-based (see T037's note); no other rewiring needed here.
- [X] T041 Run all 5 validation scenarios in `quickstart.md` end-to-end and record results
- [X] T042 Run the full regression suite — `npm run test:run`, `npm run test:server`, `npm run type-check`, `npm run type-check:server`, `npm run lint`, `npm run e2e` — confirm the 80% coverage floor is maintained and there are no regressions against the T001 baseline

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS User Story 1 and User Story 3 only.
- **User Story 2 (Phase 4)**: Depends only on Setup — independent of Foundational, may run in parallel with Phase 2/3.
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2).
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2); reuses the pattern established in User Story 1 (Phase 3) but does not require it to be complete.
- **Polish (Phase 6)**: Depends on Phases 2, 3, and 5 (reuses `rateLimiting.ts` and the resized-limit convention) and on Phase 4 (full regression must include US2's changes).

### User Story Dependencies

- **User Story 1 (P1)**: Requires Foundational. No dependency on US2 or US3.
- **User Story 2 (P1)**: Requires only Setup. No dependency on US1 or US3 — fully independent.
- **User Story 3 (P2)**: Requires Foundational; reuses US1's `authLimiter` rewiring as a direct pattern for `retrospectiveLimiter`, but does not require US1 to be functionally complete first (the two limiters are independent code paths).

### Within Each User Story

- Tests are written and confirmed failing before their corresponding implementation task.
- Shared/foundational pieces before router-specific wiring.
- Deletions (US2) are sequenced after the replacement data path lands (T015-T017 before T018-T026), so nothing is ever left unreachable mid-story.
- Story complete (checkpoint) before moving to the next priority, if working sequentially.

### Parallel Opportunities

- T002 and T004 (Foundational, different files) run in parallel.
- T006, T007 (US1 tests, same file but independent assertions — treat as sequential edits to one file if a single author) can be authored together; if split across contributors, coordinate on the shared test file.
- T008 (US1, different file) runs in parallel with T006/T007.
- T012, T013, T014, T021 (US2 tests, four different files) run fully in parallel.
- T024, T025, T026 (US2 dead-file deletions, disjoint file sets) run fully in parallel, once T015-T023 have landed.
- T030, T031 (US3 tests, same file, independent assertions) — same note as T006/T007.
- T035, T036, T037 (Polish tests, three different files) run fully in parallel, and in parallel with each other's implementation counterpart (T038/T039/T040 respectively) once each one's own test has landed — the three test+implementation pairs are independent of each other (different routers).
- **User Story 2 (Phase 4) as a whole can be worked on in parallel with Phases 2/3/5** by a second contributor, since it touches an entirely disjoint set of files from the rate-limiting work.

---

## Parallel Example: Foundational + User Story 2 kickoff

```bash
# One contributor starts the shared rate-limiting foundation:
Task: "Write failing tests for the shared rate-limit key resolver in server/test/http/middleware/rateLimiting.test.ts"
Task: "Write a failing trust-proxy test in server/test/http/app.test.ts"

# A second contributor starts User Story 2 at the same time (no shared files):
Task: "Update retrospective-board-no-firestore.test.ts allowlists to empty"
Task: "Rewrite useRetrospectiveColumns.test.ts for the new columns-argument signature"
Task: "Update ResponsiveParticipantDisplay.test.tsx to expect direct photoURL usage"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (blocks US1).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Run quickstart.md scenario 1 and 5 (concurrent sign-in, abuse protection still works) independently.
5. Deploy/demo if ready — this alone resolves the most severe reported symptom (login blocked by 429).

### Incremental Delivery

1. Setup + Foundational → foundation ready for US1/US3.
2. Add User Story 1 → validate independently (quickstart scenario 1) → deploy/demo (MVP!).
3. Add User Story 2 (can have been developed in parallel from the start) → validate independently (quickstart scenario 2, 3) → deploy/demo.
4. Add User Story 3 → validate independently (quickstart scenario 4) → deploy/demo.
5. Polish → validate the full quickstart.md suite → final regression (T042) → deploy/demo.

### Parallel Team Strategy

With two contributors:

1. Contributor A: Setup → Foundational → User Story 1 → User Story 3 → half of Polish (T035, T038, part of T042).
2. Contributor B: Setup (shared) → User Story 2 (fully independent) → other half of Polish (T036, T037, T039, T040).
3. Both converge on T041/T042 (full quickstart + regression validation) before calling the feature done.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Every implementation task in this feature is a modification or deletion of an existing file, or (for `rateLimiting.ts` and the three new E2E specs) one new file created specifically to hold logic factored out of five near-duplicated inline configs — no new backend endpoint, port, or adapter is introduced anywhere in this feature (research.md, plan.md Summary).
- **Scope decision (FR-004)**: explicit test coverage for "clear message on legitimate throttling" (T007, T008, T010) targets the auth/session-check path specifically, since that is where spec.md's User Story 1 anchors it. Board-data, dashboard, profile, and MCP throttled-request messaging are expected to inherit correct behavior from the app's existing, already-established generic fetch-error handling built around the shared `ApiErrorBody` envelope (used by every route since `017`/`018`/`019`) — this is treated as an accepted assumption, not a separately-tested requirement, since it is not new behavior this feature introduces.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
