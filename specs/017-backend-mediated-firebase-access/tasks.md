---

description: "Task list for Backend-Mediated Firebase Access"
---

# Tasks: Backend-Mediated Firebase Access

**Input**: Design documents from `/specs/017-backend-mediated-firebase-access/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (all present)

**Tests**: Included and ordered before their corresponding implementation tasks — Constitution Principle I (TDD, NON-NEGOTIABLE) and Principle VI (80% coverage floor, both `vitest.config.ts` files) apply to every task below, backend and frontend alike.

**Organization**: Tasks are grouped by user story (US1–US5, per spec.md) to enable independent implementation and testing. All file paths are relative to `retro-rocket/` unless stated otherwise.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US5 per spec.md; Setup/Foundational/Polish tasks carry no story label

---

## Phase 1: Setup

**Purpose**: Shared groundwork with no story-specific logic.

- [X] T001 [P] Create canonical Firestore collection-name constants in `server/src/adapters/firebase/collections.ts` (retrospectives, columns, cards, groups, participants, countdown_timers, facilitatorNotes, actionItems, sentimentResults, typingStatus, users, userBoardHistory — data-model.md), replacing the two divergent frontend `FIRESTORE_COLLECTIONS` constants (research.md cross-cutting observation #1) as the one server-side source of truth.
- [X] T002 [P] Add `ForbiddenError` (403, code `forbidden`) and `ConflictError` (409, code `conflict`) classes extending `AppError` in `server/src/domain/errors.ts`, following the existing `NotFoundError`/`ConfigError` pattern.
- [X] T003 Confirm `npm run lint` (`retro-rocket/package.json`) and both `tsconfig`s already glob any new `server/src/**` and `src/**` files with no config change needed; adjust `eslint --ext ts,tsx` scope or `tsconfig.json`/`server/tsconfig.json` `include` only if a gap is found.

**Checkpoint**: No story work depends on this phase beyond T001/T002 being importable.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The minimal board+participant+real-time-channel slice every user story needs to be independently testable, plus shared test/API-client infrastructure. **No user story work can begin until this phase is complete.**

### Tests for Foundational (write first, must fail before implementation below)

- [X] T004 [P] Use-case tests for `CreateBoard`/`GetBoard`/`JoinBoard` in `server/test/application/use-cases/boards/CreateBoard.test.ts`, `GetBoard.test.ts`, `JoinBoard.test.ts`, using in-memory fakes (see T010).
- [X] T005 [P] Route tests for `POST /api/boards`, `GET /api/boards/:id`, `POST /api/boards/:id/join` in `server/test/http/routes/boards.test.ts`, using a test-app helper (see T011).
- [X] T006 [P] Relay unit test in `server/test/adapters/firebase/FirestoreRealtimeRelay.test.ts`: verifies the `snapshot` event shape, heartbeat cadence, and that a raw Firestore change is translated into the `event:`/`data:` envelope documented in `contracts/realtime-events.md`.

### Implementation for Foundational

- [X] T007 [P] `server/src/domain/boards/BoardAccess.ts`: pure function `isParticipantOrCreator(board, participants, uid): boolean` (FR-004).
- [X] T008 [P] `server/src/domain/boards/FacilitatorAccess.ts`: pure function `isFacilitator(board, uid): boolean` (`uid === board.createdBy`), mirroring `server/src/domain/mcp/FacilitatorAccess.ts`'s pattern.
- [X] T009 `server/src/application/ports/boards.ts`: `BoardReadPort`, `BoardWritePort`, `ParticipantPort`, `RealtimeRelayPort` interfaces covering the minimal create/get/join/subscribe surface (data-model.md Board + Participant).
- [X] T010 [P] `server/test/application/use-cases/boards/fakes.ts`: in-memory fake implementations of the T009 ports, following `server/test/application/use-cases/mcp/fakes.ts`'s convention.
- [X] T011 [P] `server/test/http/boardsTestApp.ts`: test-app helper building a fully-wired Express app from in-memory fakes, mirroring `server/test/http/mcpTestApp.ts`.
- [X] T012 [P] `server/src/adapters/firebase/FirestoreBoardAdapter.ts`: implements `BoardReadPort`/`BoardWritePort` for create/get (Admin SDK; board doc + `columns` subcollection).
- [X] T013 [P] `server/src/adapters/firebase/FirestoreParticipantAdapter.ts`: implements `ParticipantPort` for create/list participants (idempotent create, data-model.md's connection-derived-presence field left for US2).
- [X] T014 `server/src/adapters/firebase/FirestoreRealtimeRelay.ts`: shared per-connection SSE relay — accepts a set of Firestore refs/queries plus an event-name mapping, forwards each change as a named SSE event, sends the initial `snapshot` event, sends periodic heartbeat comment lines; exposes a registration hook so each later story can contribute its own collections/event-name mapping without modifying this file's core loop.
- [X] T015 [P] `server/src/application/use-cases/boards/CreateBoard.ts`: template → board + columns (contracts/boards-api.md `POST /api/boards`).
- [X] T016 [P] `server/src/application/use-cases/boards/GetBoard.ts`: fetch board + columns, 404 if missing or requester not a participant/creator (FR-004).
- [X] T017 [P] `server/src/application/use-cases/boards/JoinBoard.ts`: idempotent participant creation (contracts/boards-api.md `POST /api/boards/:id/join`, minimal version — history/joinedBoards bookkeeping deferred to US4).
- [X] T018 `server/src/http/middleware/requireSession.ts`: resolves the authenticated uid from the existing session cookie for board routes, reusing the existing `SessionServicePort`, mirroring `server/src/http/middleware/mcpAuth.ts`'s pattern.
- [X] T019 `server/src/http/board-wiring.ts`: `buildBoardsDeps()` wiring Firestore Admin SDK + T009–T017 into `BoardsRouterDeps`, returning `null` (503 `config_error`) if misconfigured, mirroring `auth-wiring.ts`/`mcp-wiring.ts`.
- [X] T020 `server/src/http/routes/boards.ts`: router with `POST /api/boards`, `GET /api/boards/:id`, `POST /api/boards/:id/join`, `GET /api/boards/:id/events` (base snapshot: board + participants only; cards/groups/etc. event types added by later stories via T014's registration hook).
- [X] T021 Wire `boardsRouter`/`buildBoardsDeps` into `server/src/http/app.ts` and `server/src/http/composition-root.ts`, following the existing `authDeps`/`mcpDeps` conditional-mount pattern exactly.
- [X] T022 [P] `src/lib/services/backendApiClient.ts`: shared `fetch` wrapper (`credentials: 'include'`, JSON body, parses the `{error:{code,message},correlationId}` envelope into a typed error) — base for every rewritten frontend service file.
- [X] T023 [P] `src/lib/hooks/useBoardEvents.ts`: wraps `EventSource` against `/api/boards/:id/events`, dispatches the `snapshot` event and each incremental event type to registered handlers, exposes connection state (`connected` / `reconnecting`) for FR-009/FR-011 UI.

**Checkpoint**: Foundation ready — a board can be created, fetched, and joined entirely through the backend, and a base real-time channel exists. All user stories can now proceed.

---

## Phase 3: User Story 1 - Sign in and manage my session without the browser touching Firebase (Priority: P1)

**Goal**: Google/GitHub sign-in, session persistence, and profile management work entirely through the backend session — no Firebase custom token, no frontend Firestore profile writes.

**Independent Test**: Sign in with Google and GitHub in a fresh session; reload; confirm the Profile page still lists linked providers; confirm via network inspection that no Firebase/Firestore/Google Identity request is ever made by the browser.

**Implementation note (deviation from the original plan below, discovered mid-implementation)**: rather than adding a new Firestore `users` collection/`UserProfilePort`/`FirestoreUserProfileAdapter`, investigation showed the backend's existing `FirebaseIdentityAdapter` already owns providers via Firebase Auth custom claims — duplicating that into Firestore would be two sources of truth for the same data. Instead: `PublicUser`/`UserIdentity` gained `primaryProvider` (set once at account creation, preserved on linking) and `createdAt` (from Firebase Auth's native `metadata.creationTime`) as custom claims/Auth-record fields; `IdentityStorePort` gained `updateDisplayName` (persists via Firebase Auth's `updateUser`, replacing the Firestore-backed edit) instead of `mintCustomToken` (removed — nothing consumes it anymore); a new `UpdateDisplayName.ts` use-case + `PATCH /api/auth/profile` route replaces the frontend's direct Firestore write. `joinedBoards`/`userBoardHistory` were found to be write-only dead code (never read back for display) and are dropped entirely rather than ported — User Story 4's board list uses the `participants` collection directly (mirroring the existing MCP precedent), needing no `joinedBoards` array at all. `userService.ts` is NOT deleted in this story (only `UserContext.tsx` stops calling its identity methods) since `useJoinRetrospective.ts`/`Dashboard.tsx` (User Story 4 scope) still depend on it until that story replaces them — full removal happens in User Story 4.

### Tests for User Story 1

- [X] T024 [P] [US1] Use-case test for `CompleteOAuthLogin` (updated: no `customToken` field) in `server/test/application/use-cases/CompleteOAuthLogin.test.ts`; new `server/test/application/use-cases/UpdateDisplayName.test.ts` for the display-name-update use-case.
- [X] T025 [P] [US1] Route tests for the new `GET /api/auth/session` response shape (no `firebaseCustomToken`) in `server/test/http/routes/authSession.test.ts`, and the new `PATCH /api/auth/profile` route in `server/test/http/routes/authProfile.test.ts`.
- [X] T026 [P] [US1] Frontend test updates in `src/test/lib/contexts/UserContext.test.tsx` and `src/test/features/auth/backendAuthClient.test.ts` asserting no `userService`/custom-token call occurs during bootstrap, and covering the new `updateDisplayName` flow.

### Implementation for User Story 1

- [X] T027 [P] [US1] Extended `server/src/domain/auth/types.ts` (`PublicUser.primaryProvider`/`.createdAt`) and `server/src/domain/auth/UserIdentity.ts` accordingly (see deviation note above — supersedes the originally planned `ports/users.ts`).
- [X] T028 [US1] Extended `server/src/adapters/firebase/FirebaseIdentityAdapter.ts`: `primaryProvider` custom claim (set once, preserved on linking), `createdAt` from `metadata.creationTime`, new `updateDisplayName()` method via `auth.updateUser()`, removed `mintCustomToken`/`createCustomToken` (supersedes the originally planned `FirestoreUserProfileAdapter.ts`).
- [X] T029 [US1] `server/src/application/use-cases/CompleteOAuthLogin.ts`: removed `customToken` from the result (profile/provider sync already happens via `FirebaseIdentityAdapter.resolveUser`, not a separate bootstrap step).
- [X] T030 [US1] `server/src/application/use-cases/session.ts`: dropped `firebaseCustomToken`/`identityStore` entirely from `getCurrentSession`/`refreshSession`; `server/src/http/routes/auth.ts` session/test-login responses updated to match (contracts/auth-session-change.md).
- [X] T031 [US1] New `server/src/application/use-cases/UpdateDisplayName.ts` + `PATCH /api/auth/profile` route in `routes/auth.ts` (re-issues the session cookie since it embeds the user).
- [X] T032 [US1] Modified `src/features/auth/services/backendAuthClient.ts`: removed `firebaseCustomToken`/`signInWithCustomToken`, added `primaryProvider`/`createdAt` to `BackendUser`, added `updateDisplayName()`.
- [X] T033 [US1] Modified `src/lib/contexts/UserContext.tsx`: removed all `userService` calls; `user`/`userProfile` built directly from the session's `BackendUser` (`joinedBoards: []` placeholder pending User Story 4).
- [X] T034 [US1→US4] `userService.ts` deletion was deferred to User Story 4 as documented here — and completed there: T102 deleted `src/features/auth/services/userService.ts` entirely once `useJoinRetrospective.ts`/`Dashboard.tsx` (its last two callers) were migrated to `participantsApiClient.joinBoard`/`boardsApiClient.listBoards`.
- [X] T035 [P] [US1] Deleted `src/lib/utils/migrateUserProviders.ts` (confirmed zero live callers — a one-off manual migration script, moot now that no `users` Firestore collection is introduced).
- [X] T036 [US1] Removed the `window.__e2eSignIn`/custom-token hook from `src/lib/services/firebase.ts`.
- [X] T037 [US1] `e2e/fixtures/auth-helpers.ts` required no code change — it never referenced the custom token directly (confirmed by inspection); its behavior is now accurate without edits.
- [X] T038 [US1] Updated `e2e/authentication.spec.ts`: refreshed the stale doc comment and added a network-interception assertion (zero `googleapis.com`/`firebaseio.com`/`identitytoolkit` requests during sign-in). **Not run in this session** (no Playwright/emulator available here) — needs a CI/local run to confirm.

**Checkpoint**: User Story 1 is independently functional — sign-in, session persistence, and profile display work with zero frontend Firebase involvement.

---

## Phase 4: User Story 2 - Collaborate on a retrospective board in real time (Priority: P1)

**Goal**: Card CRUD, likes/reactions, grouping, typing indicators, and participant presence all flow through the backend and the SSE channel, matching current real-time behavior.

**Independent Test**: Two sessions on the same board (created/joined via the Foundational endpoints, either through the UI once US4 lands or directly via `POST /api/boards` + `POST /api/boards/:id/join` for test setup): create/edit/delete/like/react/group cards in one session and verify propagation in the other within 2 seconds, with no direct Firebase network calls in either session.

### Tests for User Story 2

- [X] T039 [P] [US2] Use-case tests for `CreateCard`/`UpdateCard`/`DeleteCard`/`ToggleLike`/`SetReaction`/`RemoveReaction`/`ReorderCards` in `server/test/application/use-cases/boards/*.test.ts`, including a non-owner edit/delete rejection case (FR-004) and a concurrent-edit last-write-wins case (FR-014).
- [X] T040 [P] [US2] Use-case tests for `CreateCardGroup`/`DisbandCardGroup`/`AddCardToGroup`/`RemoveCardFromGroup`/`SetGroupCollapseState`/`SetColumnGroupingState` in `server/test/application/use-cases/boards/*Group*.test.ts`, including head-removal promotion, empty-group disband, and a concurrent-update last-write-wins case (FR-014).
- [X] T041 [P] [US2] Use-case test for `SetTypingStatus` in `server/test/application/use-cases/boards/SetTypingStatus.test.ts`, covering TTL expiry behavior generalized to arbitrary column ids (research.md §4 — replacing the hardcoded 3-column bug).
- [X] T042 [P] [US2] Route/contract tests for every endpoint in `contracts/cards-and-groups-api.md` in `server/test/http/routes/cards.test.ts` and `groups.test.ts`.
- [X] T043 [US2] Relay test proving `card.*`/`group.*`/`typing.*`/`participant.presence` events reach connected clients and that presence flips to inactive after an SSE connection closes (data-model.md).

### Implementation for User Story 2

- [X] T044 [P] [US2] `server/src/application/ports/cards.ts`: `CardPort`, `CardGroupPort`, `TypingPort` interfaces (contracts/cards-and-groups-api.md).
- [X] T045 [P] [US2] `server/src/domain/boards/CardAccess.ts`: pure function `isCardOwner(card, uid): boolean` (FR-004).
- [X] T046 [US2] `server/src/adapters/firebase/FirestoreCardAdapter.ts`: CRUD + like/reaction/reorder, using Firestore transactions/batches so `toggleLike`/`setReaction`/`reorderCards` are atomic (research.md §5, fixing the current non-atomic race conditions).
- [X] T047 [US2] `server/src/adapters/firebase/FirestoreCardGroupAdapter.ts`: create/disband/add/remove/collapse, using `writeBatch` (matches today's already-correct implementation, ported to Admin SDK).
- [X] T048 [P] [US2] `server/src/adapters/firebase/FirestoreTypingAdapter.ts`: set-with-TTL, keyed by `${retrospectiveId}_${userId}_${column}`, no hardcoded column list.
- [X] T049 [P] [US2] `server/src/application/use-cases/boards/CreateCard.ts`, `UpdateCard.ts`, `DeleteCard.ts`, `ToggleLike.ts`, `SetReaction.ts`, `RemoveReaction.ts`, `ReorderCards.ts` (after T044 — depends on `CardPort`).
- [X] T050 [P] [US2] `server/src/application/use-cases/boards/CreateCardGroup.ts`, `DisbandCardGroup.ts`, `AddCardToGroup.ts`, `RemoveCardFromGroup.ts`, `SetGroupCollapseState.ts`, `SetColumnGroupingState.ts` (after T044 — depends on `CardGroupPort`).
- [X] T051 [P] [US2] `server/src/application/use-cases/boards/SetTypingStatus.ts` (after T044 — depends on `TypingPort`).
- [X] T052 [US2] Extend `server/src/http/routes/boards.ts` (or a new `server/src/http/routes/cards.ts` mounted under the boards router) with every endpoint from `contracts/cards-and-groups-api.md`.
- [X] T053 [US2] Extend `FirestoreRealtimeRelay` (via its T014 registration hook) with `card.*`, `group.*`, `typing.updated`, and connection-lifecycle-derived `participant.presence` events (data-model.md).
- [X] T054 [US2] Update `server/src/http/board-wiring.ts` to wire `CardPort`/`CardGroupPort`/`TypingPort` and register the new use-cases/routes.
- [X] T055 [P] [US2] Replace `src/features/boards/retrospective/services/cardService.ts` and `cardInteractionService.ts` with `src/features/boards/retrospective/services/cardsApiClient.ts`, built on `backendApiClient`/the shared `BoardEventsProvider` (T022/T023).
- [X] T056 [P] [US2] Replace `src/features/boards/clustering/services/cardGroupService.ts` and `columnGroupingService.ts` with `src/features/boards/clustering/services/cardGroupsApiClient.ts`.
- [X] T057 [P] [US2] Consolidated `src/features/boards/retrospective/services/typingStatusService.ts` and `OptimizedTypingStatusService.ts` into `src/features/boards/retrospective/services/typingApiClient.ts`, deleting both duplicates.
- [X] T058 [US2] Rewrote `src/features/boards/retrospective/hooks/useRetrospectiveColumns.ts`, `useOptimizedCards.ts`, and `useCardGroups.ts` to consume the new `BoardEventsProvider` snapshot instead of `onSnapshot`; introduced `BoardEventsProvider.tsx` as the single shared SSE connection per board, requiring `RetrospectiveBoard.tsx` to split into an outer component (mounts the provider) wrapping the original inner component (all prior hook calls).
- [X] T059 [US2] Migrated `src/features/boards/participants/hooks/useParticipants.ts`'s read path off the Firestore `onSnapshot` listener onto the board's SSE channel (own `useBoardEvents` connection, since this hook is also used outside `RetrospectiveBoard`'s tree — topbar/join-panel — so it can't reach the shared `BoardEventsProvider` context) via the new `src/features/boards/participants/services/participantsApiClient.ts`. Also migrated the join/write path: `addParticipant()` now calls the existing `POST /api/boards/:id/join` endpoint (extended to return the created/existing `participant` in its response — `JoinBoard.ts`/`routes/boards.ts`) instead of a direct Firestore `addDoc`, and the caller-side `OptimizedRetrospectiveService.incrementParticipantCount` call was removed from `RetrospectivePage.tsx` since the backend now increments atomically (was a latent double-count bug once both paths would have been backend-mediated). **Deviation**: `removeParticipant` still calls the Firestore-backed `participantService.removeParticipant` — no backend delete-participant endpoint exists yet (none was ever planned in contracts/boards-api.md; participants are documented as permanent-once-added) and it has zero live callers today (only test coverage), so a new endpoint wasn't built speculatively; flagged as a gap to close before `firestore.rules` is locked to deny-all in T112. `ParticipantList`/`CompactAvatarGroup`/`ResponsiveParticipantDisplay` needed no changes — they don't render `isActive` today.
- [X] T060 [US2] Deleted the old service files (T055–T057 replacements) and their now-superseded tests: `cardService.ts`, `cardInteractionService.ts`, `typingStatusService.ts`, `OptimizedTypingStatusService.ts`, `cardGroupService.ts`, `columnGroupingService.ts`, `FirestoreListenerManager.ts`, `OptimisticUpdatesManager.ts`, `useCards.ts`, plus their test files and `firebaseOptimization.test.ts` (UserProfileCache tests moved to `src/test/features/boards/participants/UserProfileCache.test.ts`). Also deleted `ImprovedUseParticipants.test.ts`, a duplicate of `useParticipants.test.ts` that only exercised the now-removed Firestore-subscription code path.
- [ ] T061 [US2] Update card/grouping/typing E2E specs (Playwright) to run two browser contexts on the same board and assert real-time propagation plus zero direct Firebase network calls (quickstart.md §2–§3). **Not run in this session** (no Playwright/emulator available here, same constraint as T038) — needs a CI/local run to author and confirm.

**Checkpoint**: User Stories 1 AND 2 both work independently — core real-time collaboration is fully backend-mediated.

---

## Phase 5: User Story 3 - Run and experience facilitator-only tools without frontend-Firebase calls (Priority: P2)

**Goal**: Countdown timer, private facilitator notes, action items, and sentiment persistence are backend-mediated, with notes strictly scoped to the facilitator's own SSE connection.

**Independent Test**: As facilitator, start a countdown (all participants see it live), write a private note (persists, invisible to non-facilitators), and confirm the team-mood dashboard reflects sentiment — all with zero direct Firebase calls.

### Tests for User Story 3

- [X] T062 [P] [US3] Use-case tests for `CreateOrUpdateCountdown`/`StartCountdown`/`PauseCountdown`/`ResetCountdown`/`DeleteCountdown` in `server/test/application/use-cases/boards/CountdownUseCases.test.ts`, including a non-facilitator rejection case (FR-004) and a start→pause elapsed-time last-write-wins case (FR-014).
- [X] T063 [P] [US3] Use-case tests for `CreateNote`/`UpdateNote`/`DeleteNote` in `server/test/application/use-cases/boards/NoteUseCases.test.ts`, including a non-facilitator read/write rejection case (this is the test that proves research.md §2's finding is actually closed) and a wrong-board rejection case.
- [X] T064 [P] [US3] Use-case tests for `CreateActionItem`/`ConvertCardToActionItem`/`UpdateActionItem`/`DeleteActionItem` in `server/test/application/use-cases/boards/ActionItemUseCases.test.ts`.
- [X] T065 [P] [US3] Use-case tests for `SaveSentimentResult`/`OverrideSentimentResult`/`DeleteSentimentResult` in `server/test/application/use-cases/boards/SentimentUseCases.test.ts`, including the "auto-analysis never overwrites a manual override" case (FR-014).
- [X] T066 [US3] Relay tests in `server/test/http/routes/boardsEvents.test.ts` proving `notes` is present in the snapshot only for the facilitator's own connection and omitted entirely (not empty) for a non-facilitator's connection (contracts/realtime-events.md).
- [X] T067 [P] [US3] Route/contract tests for every endpoint in `contracts/facilitator-tools-api.md` in `server/test/http/routes/countdown.test.ts`, `notes.test.ts`, `action-items.test.ts`, `sentiment.test.ts`.

### Implementation for User Story 3

- [X] T068 [P] [US3] `server/src/application/ports/facilitator.ts`: `CountdownPort`, `FacilitatorNotesPort`, `ActionItemPort`, `SentimentPort` interfaces.
- [X] T069 [P] [US3] `server/src/adapters/firebase/FirestoreCountdownAdapter.ts` — server-side elapsed-time math via an injected `ClockPort` (deterministic in tests), replacing countdownService.ts's client-side `Date.now()` math.
- [X] T070 [P] [US3] `server/src/adapters/firebase/FirestoreFacilitatorNotesAdapter.ts`.
- [X] T071 [P] [US3] `server/src/adapters/firebase/FirestoreActionItemAdapter.ts`.
- [X] T072 [P] [US3] `server/src/adapters/firebase/FirestoreSentimentAdapter.ts`.
- [X] T073 [P] [US3] `server/src/application/use-cases/boards/{CreateOrUpdateCountdown,StartCountdown,PauseCountdown,ResetCountdown,DeleteCountdown}.ts` (after T068 — depends on `CountdownPort`).
- [X] T074 [P] [US3] `server/src/application/use-cases/boards/{CreateNote,UpdateNote,DeleteNote}.ts`, each enforcing `FacilitatorAccess.isFacilitator` (T008) (after T068 — depends on `FacilitatorNotesPort`).
- [X] T075 [P] [US3] `server/src/application/use-cases/boards/{CreateActionItem,ConvertCardToActionItem,UpdateActionItem,DeleteActionItem}.ts` (after T068 — depends on `ActionItemPort`).
- [X] T076 [P] [US3] `server/src/application/use-cases/boards/{SaveSentimentResult,OverrideSentimentResult,DeleteSentimentResult}.ts` (after T068 — depends on `SentimentPort`).
- [X] T077 [US3] Extended `server/src/http/routes/boards.ts` with every endpoint from `contracts/facilitator-tools-api.md` (countdown/notes/action-items/sentiment), added alongside the existing boards/cards/groups/typing routes rather than in separate route files, matching this file's established convention.
- [X] T078 [US3] Extended `FirestoreRealtimeRelay`'s per-connection source list (via `handleBoardEvents`, not the relay class itself — its registration hook already supported this) with `countdown`, `actionItems`, `sentiment` events for every connection, and a `notes` event/snapshot-key gated per-connection by `FacilitatorAccess.isFacilitator` (T008) — the concrete fix for research.md §2's dead-rule finding. **Deviation from the original per-item-event design** (`card.created`/`.updated`/`.deleted` etc. in realtime-events.md): matching the precedent already set by US2's `cards`/`groups`/`typing` events, each event carries the *entire* current collection rather than a single changed item — simpler and consistent with what the frontend hooks already consume.
- [X] T079 [US3] Updated `server/src/http/board-wiring.ts` to wire the new ports/use-cases/routes.
- [X] T080 [P] [US3] Replaced `src/features/boards/countdown/services/countdownService.ts` with `src/features/boards/countdown/services/countdownApiClient.ts`.
- [X] T081 [P] [US3] Replaced `src/features/boards/facilitator/services/facilitatorNotesService.ts` with `src/features/boards/facilitator/services/facilitatorNotesApiClient.ts`.
- [X] T082 [P] [US3] Replaced `src/features/boards/retrospective/services/actionItemsService.ts` with `src/features/boards/retrospective/services/actionItemsApiClient.ts`.
- [X] T083 [P] [US3] Replaced `src/features/boards/sentiment/services/sentimentResultsService.ts` with `src/features/boards/sentiment/services/sentimentResultsApiClient.ts`; confirmed `useSentimentResults.ts` still only ever *sends* on-device-computed results to the backend (FR-007) — the on-device worker/inference pipeline (`useWorkerManager.ts` etc.) is untouched.
- [X] T084 [US3] No UI component edits were needed: `useCountdown`/`useFacilitatorNotes`/`useActionItems`/`useSentimentResults` kept their exact external hook signatures (now-server-inferred params like `createdBy`/`facilitatorId` are accepted but ignored, prefixed `_`, matching the precedent set by `useOptimizedCards.ts`'s `addReaction` in US2) — `CountdownTimer`/`FacilitatorControls`/`NotesTab`/`TimerTab`/`TeamMoodTab`/`SentimentTab`/`ControlsTab` call these hooks exactly as before and needed no changes. Internally, `useActionItems`/`useSentimentResults` consume the shared `BoardEventsProvider` context (called from within `RetrospectiveBoard`'s tree, alongside `useOptimizedCards`/`useCardGroups`/`useTypingStatus`); `useCountdown`/`useFacilitatorNotes` open their own standalone SSE connection like `useParticipants` (T059), since they're reachable via the facilitator menu in `RetrospectiveTopbar`, rendered in `Header.tsx` outside that tree.
- [X] T085 [US3] Deleted the 4 old service files and their superseded direct-service tests (`countdownService.test.ts`, `facilitatorNotesService.test.ts`, `actionItemsService.test.ts`, `sentimentResultsService.test.ts`); rewrote the 4 hook test files plus `useSentiment.test.ts` (which mocked the now-deleted `sentimentResultsService.ts`) to mock the SSE snapshot/API-client layer instead.
- [ ] T086 [US3] Update facilitator-mode E2E specs (countdown, notes, team-mood) plus add the facilitator-notes-privacy assertion (quickstart.md §4) as an explicit E2E case. **Not run in this session** (no Playwright/emulator available here, same constraint as T038/T061) — needs a CI/local run to author and confirm.

**Checkpoint**: User Stories 1–3 all independently functional.

---

## Phase 6: User Story 4 - Manage boards from the dashboard and export results without frontend-Firebase calls (Priority: P2)

**Goal**: Dashboard board listing, rename, full-cascade delete, join bookkeeping, and PDF/DOCX export are backend-mediated, replacing three duplicated/divergent current implementations with one canonical set.

**Independent Test**: Create a board from each template; confirm the Dashboard lists it; rename and delete a board; join a board via shared link/ID; export to PDF/DOCX with each option combination — all with zero direct Firebase calls.

**Note**: `DeleteBoardCascade` depends on the Card/Group/Countdown/Notes/ActionItem/Sentiment/Typing adapters built in US2/US3 (it must clean up all of them) — this is the one deliberate cross-story dependency in this plan; it does not block US4's other tasks (create/list/rename/join/export) from proceeding in parallel with US2/US3.

### Tests for User Story 4

- [X] T087 [P] [US4] Use-case test for `ListBoards` (owned + joined merge/sort, replacing the three divergent implementations per research.md §3) in `server/test/application/use-cases/boards/ListBoards.test.ts`.
- [X] T088 [P] [US4] Use-case test for `RenameBoard` (owner-only) in `server/test/application/use-cases/boards/RenameBoard.test.ts`.
- [X] T089 [US4] Use-case test for `DeleteBoardCascade` (authorization only, in `server/test/application/use-cases/boards/DeleteBoardCascade.test.ts`) plus an adapter-level test verifying every referencing document across all collections + the `columns` subcollection is actually removed (research.md §3 completeness fix), seeding fixtures directly against `FakeFirestore` in `server/test/adapters/firebase/FirestoreBoardAdapter.cascade.test.ts` — the cross-collection cascade is an adapter concern, not a use-case one (see T096's deviation note).
- [X] T090 [P] [US4] **Deviation**: no changes to `JoinBoard.ts` were needed. The original design's `userBoardHistory`/`joinedBoards` bookkeeping is superseded by deriving "joined boards" from the `participants` collection directly (see T093/T098's deviation note) — the existing `participants` doc created by `JoinBoard.ts` already IS the record of having joined. `JoinBoard.test.ts` (T017/US1) was left unchanged since nothing about its behavior needed to change.
- [X] T091 [P] [US4] Route/contract tests for `GET /api/boards`, `PATCH /api/boards/:id`, `DELETE /api/boards/:id` in `server/test/http/routes/boards.test.ts`.
- [X] T092 [P] [US4] Frontend test coverage for the create/list/rename/delete/join dashboard flows: rewrote `src/test/features/dashboard/BoardCard.test.tsx` (onDelete now required, no soft-delete fallback), `src/test/pages/Dashboard.test.tsx` (mocks `boardsApiClient` instead of `userService`), `src/test/features/boards/retrospective/useRetrospective.test.ts` and `useJoinRetrospective.test.ts` (full rewrites); deleted `BoardCard.essential.test.tsx`/`BoardCard.migration.test.tsx` (existed solely to test the now-removed soft-delete fallback) and `createBoardFromTemplate.test.ts`/`retrospectiveService.test.ts`/`userService.test.ts`/`optimizedRetrospectiveService.test.ts` (services deleted).

### Implementation for User Story 4

- [X] T093 [US4] Extended `server/src/application/ports/boards.ts` with `listBoardsCreatedBy`/`renameBoard`/`deleteBoardCascade` on `BoardReadPort`/`BoardWritePort`, and `listParticipantRecordsForUser` on `ParticipantPort`. **Deviation**: no `joinedBoards`/`userBoardHistory` bookkeeping was added — see `listParticipantRecordsForUser`'s doc comment: the `participants` collection is already the single source of truth for board membership, so a redundant array on a `users` doc would only drift out of sync with it (and `userBoardHistory`/`getUserBoardHistory` had zero live frontend callers before this refactor — confirmed dead).
- [X] T094 [US4] `server/src/application/use-cases/boards/ListBoards.ts`: the single canonical owned+joined board list, superseding `retrospectiveService.ts`, `OptimizedRetrospectiveService.ts`, and `userService.getUserBoards` (research.md §3) — "joined" boards derived from `listParticipantRecordsForUser` rather than a `joinedBoards` array (see T093).
- [X] T095 [US4] `server/src/application/use-cases/boards/RenameBoard.ts`: owner-only title/description update.
- [X] T096 [US4] `server/src/application/use-cases/boards/DeleteBoardCascade.ts`: owner-only authorization gate delegating to `boardWritePort.deleteBoardCascade`, which lives in `FirestoreBoardAdapter.ts` (T098) since the cross-collection cleanup needs direct Firestore access, not another use-case dependency — full cascade across `columns`, `cards`, `groups`, `participants`, `countdown_timers`, `facilitatorNotes`, `actionItems`, `sentimentResults`, `typingStatus` (research.md §3), batched at Firestore's 500-write limit.
- [X] T097 [US4] **No changes to `JoinBoard.ts`** — see the deviation note on T090/T093. The current minimal (US1) implementation already does everything this refactor still needs.
- [X] T098 [US4] Extended `server/src/adapters/firebase/FirestoreBoardAdapter.ts` with `listBoardsCreatedBy`/`renameBoard`/`deleteBoardCascade`, and `FirestoreParticipantAdapter.ts` with `listParticipantRecordsForUser`. **No `FirestoreUserProfileAdapter.ts`** — never existed and isn't needed (T093's deviation: no users-collection bookkeeping to write).
- [X] T099 [US4] Extended `server/src/http/routes/boards.ts` with `GET /api/boards`, `PATCH /api/boards/:id`, `DELETE /api/boards/:id` (contracts/boards-api.md).
- [X] T100 [P] [US4] Replaced `src/features/create-board/createBoardFromTemplate.ts` with `boardsApiClient.createBoard()`, calling the Foundational `POST /api/boards` endpoint via `backendApiClient`.
- [X] T101 [P] [US4] Replaced `src/features/boards/retrospective/services/retrospectiveService.ts` with `src/features/boards/retrospective/services/boardsApiClient.ts`, covering create/get/list/rename/delete (join lives in `participantsApiClient.ts`, T055/US2 — one join implementation, not a duplicate).
- [X] T102 [US4] Deleted `src/lib/services/OptimizedRetrospectiveService.ts` entirely (superseded/dead code per research.md §3) and its test `src/test/lib/services/optimizedRetrospectiveService.test.ts`. Also deleted `src/features/auth/services/userService.ts` and its test (superseded by `boardsApiClient.listBoards`/`participantsApiClient.joinBoard`; `types/user.ts`'s `UserProfile`/`AuthProviderType`/`UserBoardHistory` types are kept — still used elsewhere for the auth-provider-linking UI, unrelated to this refactor).
- [X] T103 [US4] Updated `src/features/dashboard/components/BoardListItem.tsx` and `BoardCard.tsx` to call the new delete endpoint. The soft-delete fallback into `OptimizedRetrospectiveService` was removed entirely (not just made unreachable) — `onDelete` is now a required prop, since Dashboard.tsx (the only real caller) always supplied it anyway; two test files that existed solely to cover that fallback (`BoardCard.essential.test.tsx`/`BoardCard.migration.test.tsx`) were deleted accordingly.
- [X] T104 [US4] Updated `src/features/dashboard/components/EditRetrospectiveModal.tsx` to call `boardsApiClient.renameBoard`.
- [X] T105 [US4] Updated `src/features/boards/retrospective/hooks/useJoinRetrospective.ts` to call the single consolidated `participantsApiClient.joinBoard` endpoint, removing the 4-step client orchestration entirely; `JoinRetrospectiveModal.tsx` needed no changes (it only ever consumed the hook). Extended the join endpoint's response (`JoinBoard.ts`/`routes/boards.ts`, already touched in US2) to include the board's title, since this hook needs it for its success toast and the join response already has the full board.
- [X] T106 [US4] Audited `src/features/boards/export/**` (PdfExporter, ExportPopover, ImprovedExportPopover, and the unified/docx/txt export services) — zero direct Firebase imports found; their only prior Firebase touchpoint was via `useFacilitatorNotes`, already migrated in US3.
- [ ] T107 [US4] Update dashboard/create-board/join/export E2E specs, including one exercising `DELETE /api/boards/:id` and asserting every related collection's documents are actually gone (quickstart.md §5-adjacent check). **Not run in this session** (no Playwright/emulator available here, same constraint as T038/T061/T086) — needs a CI/local run to author and confirm.

**Checkpoint**: User Stories 1–4 all independently functional — full parity with today's dashboard/board-management/export behavior, plus the research.md §3 data-hygiene fixes.

---

## Phase 7: User Story 5 - Verify nothing regresses for AI assistants and diagnostics (Priority: P3)

**Goal**: Confirm the MCP connector is unaffected, and retire the developer-only Firebase metrics diagnostics panel (FR-012).

**Independent Test**: Connect an AI assistant via MCP and confirm list/detail/summary behavior (incl. facilitator-notes privacy) is unchanged; confirm the dev-tools Firebase metrics panel no longer exists.

### Tests for User Story 5

- [X] T108 [US5] Re-ran the existing MCP unit suite (`server/test/**/mcp/**`, 56 tests across 12 files) unchanged — all still pass with the boards bounded context wired alongside it, confirmed at every checkpoint this session via the full `npm run test:server` run (no code change was needed or made).
- [X] T109 [P] [US5] Deleted `src/test/lib/hooks/useFirebaseMetrics.test.ts`, `src/test/features/boards/participants/UserProfileCache.test.ts`, `src/test/integration/MetricsDashboard.integration.test.tsx`, and `src/test/features/dev-tools/MetricsDashboard.refactored.test.tsx`(`.backup`) — confirmed no other suite depended on any of them.

### Implementation for User Story 5

- [X] T110 [P] [US5] Deleted `src/lib/hooks/useFirebaseMetrics.ts` and `src/lib/services/FirebaseMetricsService.ts` (FR-012), plus their last two call sites: `src/main.tsx`'s `setupAlerts()` bootstrap calls, and `src/features/boards/participants/hooks/useEnrichedParticipants.ts`'s `recordCacheHit`/`recordError` calls.
- [X] T111 [US5] Removed the Firebase metrics panel (`MetricsDashboard.tsx`) and its lazy import/route mount from `src/App.tsx`. **Also found and fixed during this pass** (not originally called out as its own task, but squarely within FR-001's scope): `useEnrichedParticipants.ts` and `UserProfileCache.ts` — a still-live frontend hook that queried the Firestore `users` collection directly to enrich participant avatars with `photoURL`. Deleted both entirely: the `participants` collection already carries each participant's own `photoURL` (captured at join time), making the enrichment redundant — and doubly so since no backend code writes a `users` Firestore collection anymore (superseded by Firebase Auth custom claims, US1). `ResponsiveParticipantDisplay.tsx` now renders `participants` directly.

**Checkpoint**: All five user stories independently functional. MVP (US1+US2) plus the full P2/P3 surface are complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final lock-down and cleanup that only makes sense once every collection has been fully migrated off direct frontend access.

- [X] T112 Tightened `firestore.rules`: replaced the global catch-all and every per-collection grant with `allow read, write: if false` for every migrated collection (`retrospectives` + its `columns` subcollection, `cards`, `groups`, `participants`, `countdown_timers`, `facilitatorNotes`, `actionItems`, `sentimentResults`, `typingStatus`, `users`, `userBoardHistory`), mirroring the existing `mcpClients`/`mcpAuthorizationCodes`/`mcpConnections` deny-all pattern (research.md §2). `groups`/`users`/`userBoardHistory` had no rules at all before (relying solely on the catch-all) — now explicitly denied too.
- [X] T113 Removed the `firebase` client package from `retro-rocket/package.json`; deleted `src/lib/services/firebase.ts`, `src/lib/hooks/useFirestore.ts`, and `.env.example`'s `VITE_FIREBASE_*` entries. **Also found and fixed while closing out this task** (not itself a listed task, but required for a working build): `vite.config.ts` still referenced the now-deleted `firebase` package in `manualChunks`/`optimizeDeps.include` — left in place, this would have broken every production build. Also deleted `src/features/boards/participants/services/participantService.ts` in its entirety: once T112 denies the `participants` collection, its one remaining live caller (`removeParticipant`, itself already dead — zero UI entry points, confirmed twice this session) would only ever throw permission-denied; kept it working via a real backend endpoint would have been speculative engineering for a feature nothing exposes, so it and its test coverage were removed instead (see `useParticipants.ts`).
- [X] T114 [P] Updated `README.md`'s "Persistence & Resilience," "Tech Stack," "Backend Architecture," "Getting Started," "Firestore Security Rules," and "Deployment" sections (more than the three named sections — the env-var setup instructions and the security-rules snippet were equally stale and actively misleading otherwise) to state Firestore is now accessed exclusively by the backend. Also fixed two now-false claims in `server/README.md` (custom-token minting, "Firestore stays client-side") left over from feature-014, predating this refactor.
- [X] T115 Investigated dropping `auth` from the emulator command (`firebase emulators:start --only auth,firestore`) per research.md §7's original assumption — **kept as `--only auth,firestore`, not dropped**: `routes/auth.ts`'s `/api/auth/test-login` (used by every E2E spec to authenticate) calls `identityStore.resolveUser`, which needs a real Firebase Auth user store to write custom claims to, independent of whether the frontend talks to Firebase Auth directly. Fixed the stale comments in `playwright.config.ts` that described this backwards, and removed the now-dead `VITE_USE_FIREBASE_EMULATOR` env var passed to the Vite dev server (nothing reads it anymore).
- [X] T116 Ran the full regression suite (`test:run`, `test:server`, `type-check`, `type-check:server`, `lint`, plus `npm run build` to directly verify the vite.config.ts fix) — all pass. `npm run e2e` (Playwright) **not run in this session** — no Playwright/emulator available here, consistent with every other E2E-dependent task this session (T038/T061/T086/T107).
- [ ] T117 Manually execute `quickstart.md` §2–§5 (zero-Firebase-calls check, real-time sync check, facilitator-privacy check, pre-migration-data-survival check) and record results. **Not run in this session**: §2/§3/§4 need a running app + real browser to observe network calls and multi-client real-time sync, which this environment doesn't have; §5's data-survival concern is instead covered by the automated `legacyDataMigration.test.ts` (T120).
- [X] T118 Confirmed `server/test/architecture/domain-isolation.test.ts` passes with the new `server/src/domain/boards/**` tree — verified explicitly and continuously via every full backend suite run this session (85 files/412 tests, zero failures).
- [X] T119 Added the version-mismatch check: `GET /api/health` already echoed a `version` field (from `BACKEND_VERSION`, built in a prior session); added the frontend half — `vite.config.ts` now defines a build-time `__APP_VERSION__` constant (from `package.json`'s version), `useBackendVersion.ts` polls `/api/health` (on mount, on tab-visibility, and every 5 minutes) and compares, and `VersionBanner.tsx` shows an explicit reload prompt on mismatch (mounted in `App.tsx`). **Also built while auditing this area**: FR-011 required a visible disconnected/reconnecting indicator for the SSE channel, but no component actually rendered `connectionState` anywhere — added `ConnectionStatusIndicator.tsx` inside `RetrospectiveBoard.tsx`'s tree (the only place `BoardEventsProvider`'s `connectionState` is reachable).
- [X] T120 [P] Added `server/test/integration/legacyDataMigration.test.ts`, seeding pre-migration-shaped fixture documents (a participant doc missing `isActive`, a retrospective doc relying only on its original fields, a card doc missing `likes`/`reactions`) directly into `FakeFirestore`'s collections — bypassing every adapter's own write path — then exercising the real `ListBoards`/`GetBoard`/`DeleteBoardCascade` use-cases and adapters against them. **Deviation**: uses `FakeFirestore`, not a live Firestore emulator — no test anywhere in this backend suite depends on a live emulator connection (`boardsTestApp.ts`'s own docstring states this explicitly), and this environment can't run one anyway. PDF/DOCX export is out of scope for this test: it consumes already-normalized API responses, not raw Firestore documents, so "legacy shape" doesn't apply at that layer.
- [X] T121 [P] Verified WCAG 2.1 AA for the two new UI surfaces built this session: `ConnectionStatusIndicator.tsx` and `VersionBanner.tsx` both use the existing `warning-fg`/`warning-bg` semantic token pair (already covered by `contrast.tokens.test.ts`'s 42 assertions across both themes — reusing it rather than introducing new colors was a deliberate compliance-by-construction choice), pair the color with an icon *and* text (never color alone), and the banner's reload button uses the documented `focus-visible:ring-focus` pattern. The third surface named in this task, "the participant-presence indicator (T059)," **does not exist as a UI element** — confirmed (again) that `isActive`/presence has never been visually rendered anywhere in this codebase, before or after this refactor; T059 only migrated the underlying data source. Nothing to review there because there is nothing rendered.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories.**
- **User Stories (Phase 3–7)**: All depend on Foundational. US1 and US2 (both P1) have no dependency on each other and can proceed in parallel. US3 and US4 (both P2) depend only on Foundational, not on each other — except that US4's `DeleteBoardCascade` (T096) depends on adapters built in US2 (T046–T048) and US3 (T069–T072), so that one task should land after those, even though the rest of US4 can proceed in parallel. US5 depends on nothing beyond Foundational (it's a regression check + cleanup).
- **Polish (Phase 8)**: Depends on all of US1–US5 being complete (in particular, T112's rules tightening must not run before every collection's backend path is verified working).

### Parallel Opportunities

- All `[P]`-marked Setup and Foundational tasks.
- Once Foundational is complete: US1 and US2 can be staffed in parallel (both P1); once those land, US3 and US4 can be staffed in parallel (both P2), with the single T096 cross-dependency noted above; US5 can start any time after Foundational.
- Within any story, all `[P]`-marked test tasks run in parallel; all `[P]`-marked adapter/use-case files run in parallel (distinct files, same port interface).

---

## Parallel Example: User Story 2

```bash
# Tests (after Foundational, before implementation):
Task: "Use-case tests for CreateCard/UpdateCard/DeleteCard/... in server/test/application/use-cases/boards/*.test.ts"
Task: "Use-case tests for CreateCardGroup/DisbandCardGroup/... in server/test/application/use-cases/boards/*Group*.test.ts"
Task: "Use-case test for SetTypingStatus in server/test/application/use-cases/boards/SetTypingStatus.test.ts"

# Adapters/use-cases (distinct files):
Task: "FirestoreCardAdapter.ts"
Task: "FirestoreCardGroupAdapter.ts"
Task: "FirestoreTypingAdapter.ts"

# Frontend replacements (distinct files):
Task: "Replace cardService.ts and cardInteractionService.ts"
Task: "Replace cardGroupService.ts and columnGroupingService.ts"
Task: "Consolidate typingStatusService.ts + OptimizedTypingStatusService.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational) — CRITICAL, blocks everything.
2. Complete Phase 3 (US1) and Phase 4 (US2) — together these are the MVP: authentication and core real-time board collaboration with zero frontend Firebase calls.
3. **STOP and VALIDATE**: run quickstart.md §2 (zero-Firebase-calls check) and §3 (real-time sync check) against just US1+US2.
4. Deploy/demo if ready — note that board *creation/listing/rename/delete* (US4) and *facilitator tools* (US3) are not yet migrated at this checkpoint, so this MVP slice is a backend/architecture milestone, not a shippable partial product on its own (this refactor's constitution mandate is "no functionality lost" for the *whole* app — the atomic-cutover decision, FR-010, means the real production cutover only happens once every story is done, per Polish Phase 8).

### Incremental Delivery (internal validation checkpoints, not partial production releases)

1. Setup + Foundational → foundation ready.
2. US1 + US2 → validate independently (auth + core collaboration).
3. US3 + US4 → validate independently (facilitator tools + board management/export).
4. US5 → regression check + cleanup.
5. Polish (Phase 8) → firestore.rules lock-down, dependency removal, full regression, atomic cutover to production per FR-010.

### Parallel Team Strategy

This is a priority-driven staffing *suggestion* for a small (2-developer) team, not a technical blocking dependency — per the Dependencies section above, US3 and US4 depend only on Foundational and could start immediately alongside US1/US2 if enough developers are available; the sequencing below simply reflects tackling P1 stories before P2/P3 ones when staffing is limited.

1. Team completes Setup + Foundational together.
2. Once Foundational is done: Developer A takes US1, Developer B takes US2 (both P1, no shared files beyond the Foundational ports/relay).
3. With only 2 developers, US3/US4 are picked up next once US1/US2 land (Developer A takes US3, Developer B takes US4, mindful of the single T096 cross-dependency on US2/US3 adapters) — a 3rd+ developer could instead start US3/US4 immediately in step 2, in parallel with US1/US2.
4. Any developer takes US5 in parallel with the above once Foundational is done.
5. One developer/reviewer owns Phase 8 (Polish) as the final integration + cutover pass.

---

## Notes

- `[P]` tasks touch different files with no unfinished dependency between them.
- Every test task must be written and observed to **fail** before its corresponding implementation task is started (Constitution Principle I, NON-NEGOTIABLE).
- The atomic-cutover requirement (spec FR-010) means old Firestore-direct frontend code is deleted in the *same* story/task that replaces it (see each story's "delete old service files" task), not left behind a flag.
- Commit after each task or logical group; stop at any Checkpoint to validate a story independently before continuing.
- Avoid: reintroducing a soft-delete/restore path (research.md §3 explicitly decided against it), reintroducing a second typing-status implementation (research.md §4), or leaving `firestore.rules` untightened after Phase 8 (research.md §2).
