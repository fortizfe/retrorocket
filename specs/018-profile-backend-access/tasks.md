---

description: "Task list template for feature implementation"
---

# Tasks: Mi Perfil Backend-Mediated Firebase Access

**Input**: Design documents from `/specs/018-profile-backend-access/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/profile-api.yaml, quickstart.md

**Tests**: Included and sequenced before their corresponding implementation task per constitution Principle I (TDD, NON-NEGOTIABLE) and Principle VII (Playwright E2E on critical flows). US3 and US4 require **no new production code** (research.md §5, §6) — their tasks are regression E2E coverage only, since none exists today for Mi Perfil.

**Organization**: Tasks are grouped by user story (US1–US4, from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Web app split per plan.md: `retro-rocket/server/src/` (+ `retro-rocket/server/test/`) for the backend, `retro-rocket/src/` (+ `retro-rocket/src/test/`) for the frontend, `retro-rocket/e2e/` for Playwright. All paths below are relative to `retro-rocket/`.

**Shared-file note**: `server/src/adapters/firebase/FirestoreProfileAdapter.ts`, `server/test/adapters/firebase/FirestoreProfileAdapter.test.ts`, `server/src/http/routes/profile.ts`, `server/test/http/routes/profile.test.ts`, `src/features/auth/services/backendProfileClient.ts`, `src/test/features/auth/backendProfileClient.test.ts`, and `src/lib/contexts/UserContext.tsx` are each appended to by both US1 and US2. Each story's task against one of these files is additive (a new method/route/describe-block), so stories remain independently *testable*, but true concurrent editing across developers would create merge conflicts. **Implement stories sequentially in priority order (US1 → US2 → US3 → US4).** `[P]` markers below apply only to tasks *within* the same phase that touch distinct files.

<!--
  Tasks are organized by user story from spec.md:
  US1 (P1) View my profile · US2 (P1) Update my display name ·
  US3 (P1) Sign out · US4 (P2) Manage linked sign-in methods and connected AI assistants without regression
-->

## Phase 1: Setup

**Purpose**: Confirm no new dependencies are needed and the vertical-slice directories exist.

- [X] T001 Create the backend `profile` vertical-slice directories: `server/src/application/use-cases/profile/`, `server/test/application/use-cases/profile/`; confirm `express-rate-limit` and `firebase-admin` are already in `package.json` (research.md — no new dependency required)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared contract (port, wiring, router mount, adapter/client skeletons) both P1 stories build on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Define the `ProfilePort` interface and `ProfileRecord`/`EnsureProfileInput` DTOs in `server/src/application/ports/profile.ts`, per data-model.md's `ProfilePort` shape
- [X] T003 Create the `FirestoreProfileAdapter` class skeleton in `server/src/adapters/firebase/FirestoreProfileAdapter.ts` — constructor taking a `Firestore` instance and the `users` collection constant, `implements ProfilePort` with both methods stubbed as `async ...(): Promise<never> { throw new Error('Not implemented'); }` so the class type-checks immediately; each story (T012, T022) replaces its own stub with a real implementation (depends on T002)
- [X] T004 Create the `/api/profile` router skeleton in `server/src/http/routes/profile.ts`: exported `profileRouter(deps: ProfileRouterDeps): Router`, a `profileLimiter` (`express-rate-limit`, mirrors `boards.ts`'s `boardsLimiter`), and a local `requireSession(req, deps)` helper (mirrors `boards.ts:28-32`) — no routes registered yet (depends on T002)
- [X] T005 Create `buildProfileDeps(source, config, logger, sessionService)` composition wiring in `server/src/http/profile-wiring.ts`, mirroring `boards-wiring.ts` (resolves `getFirestore()`, injects `FirestoreProfileAdapter`, `SystemClock`) (depends on T003, T004)
- [X] T006 Mount `profileRouter` in `server/src/http/app.ts` behind an optional `deps.profileDeps`, with the same `503 config_error` fallback used for `authDeps`/`boardsDeps`/`mcpDeps` (depends on T005)
- [X] T007 Wire `buildProfileDeps` into `server/src/http/composition-root.ts` alongside `authDeps`/`boardsDeps`, passing `authDeps?.sessionService` (depends on T005)
- [X] T008 [P] Create the `backendProfileClient.ts` skeleton in `src/features/auth/services/backendProfileClient.ts`: `const API = '/api/profile'`, exported `UserProfile`-shaped response type (mirrors `contracts/profile-api.yaml`'s `Profile` schema) — functions added per story below

**Checkpoint**: Foundation ready — user story implementation can now begin (sequentially, per the shared-file note above).

---

## Phase 3: User Story 1 - View my profile (Priority: P1) 🎯 MVP

**Goal**: `GET /api/profile` returns the requesting user's profile, creating it with the existing OAuth-derived defaults on first sign-in and reconciling providers on every call; Mi Perfil renders display name, email, avatar, primary provider, and member-since date exactly as before, with zero direct Firebase calls, and a clear error state on failure.

**Independent Test**: Sign in (including as a brand-new user with no prior profile), open Mi Perfil, confirm the same fields render as before; network inspection shows only `/api/profile` (and `/api/auth/session`) requests. Simulate a backend failure and confirm a visible error state, not a blank page or crash.

### Tests for User Story 1 ⚠️

> Write these tests FIRST; confirm they FAIL before implementing.

- [X] T009 [P] [US1] Unit test for the `ensureUserProfile` use-case (creates with OAuth defaults when absent — `displayName` from identity or email prefix, `photoURL`, `primaryProvider`, `createdAt`; unions missing providers into an existing profile without overwriting `displayName`/`photoURL`) in `server/test/application/use-cases/profile/EnsureUserProfile.test.ts`
- [X] T010 [P] [US1] Unit test for `FirestoreProfileAdapter.ensureProfile` — DEVIATION: no Vitest-level Firestore-emulator connection exists anywhere in this codebase (confirmed by inspection: `server/vitest.config.ts` sets no `FIRESTORE_EMULATOR_HOST` and explicitly excludes wiring files as "exercised by E2E against the emulator, not unit tests"; `FirestoreBoardsAdapter.test.ts` documents the same choice for its own adapter). Following that established, explicit precedent: unit-tests `toDate`/`toProfileRecord`/`unionMissingProviders` (pure mapping/union helpers, incl. legacy-field tolerance) in `server/test/adapters/firebase/FirestoreProfileAdapter.test.ts`; the full get-or-create + provider-union + "other fields including legacy `joinedBoards` untouched" write-path guarantee (FR-009/SC-004) is asserted at the E2E level in T020/T031 instead
- [X] T011 [P] [US1] Contract test for `GET /api/profile` (200 with freshly-created defaults for a new uid, 200 with an existing profile plus unioned providers, 401 without a valid session); include a case confirming an unexpected `uid`/`id` field in the request body/query has no effect — the response always reflects the session's own profile (FR-011/SC-005, secure by construction per research.md §3) — in `server/test/http/routes/profile.test.ts`
- [X] T012 [P] [US1] Unit test for `backendProfileClient.fetchProfile()` (success + non-OK throws) in `src/test/features/auth/backendProfileClient.test.ts`
- [X] T013 [P] [US1] Update `src/test/lib/contexts/UserContext.test.tsx`'s bootstrap tests to mock `backendProfileClient.fetchProfile` instead of `userService.getUserProfile`/`createUserProfile`/`addProviderToUser`, confirming `userProfile` in context ends up with the same shape/values as today

### Implementation for User Story 1

- [X] T014 [US1] Implement the `ensureUserProfile` use-case in `server/src/application/use-cases/profile/EnsureUserProfile.ts` — port of `UserContext.tsx`'s `createOrUpdateUserProfile` union/create logic (research.md §4) (depends on T009)
- [X] T015 [US1] Implement `FirestoreProfileAdapter.ensureProfile` in `FirestoreProfileAdapter.ts` — get via `users/{uid}`, union `providers`, or create with `FieldValue.serverTimestamp()` for `createdAt`/`updatedAt` (depends on T010)
- [X] T016 [US1] Implement the `GET /api/profile` route handler in `profile.ts`, passing the session's `PublicUser` (`session.user`) as the `EnsureProfileInput` provider/defaults source (depends on T011, T014, T015)
- [X] T017 [US1] Implement `fetchProfile(): Promise<UserProfile>` in `backendProfileClient.ts` (depends on T012, T016)
- [X] T018 [US1] In `src/lib/contexts/UserContext.tsx`'s bootstrap `useEffect`, replace the `createOrUpdateUserProfile` callback's `userService.getUserProfile`/`createUserProfile`/`addProviderToUser` calls with a single `backendProfileClient.fetchProfile()` call, preserving the existing loading/error handling (FR-008) (depends on T013, T017) — also added a `toast.error` on bootstrap profile-load failure (previously silent beyond a redirect), since FR-008/AS-3 require a visible error state
- [X] T019 [US1] Add `src/test/architecture/profile-no-firestore.test.ts` — static import guard scanning `src/pages/Profile.tsx`, `src/features/auth/**`, and `src/lib/contexts/UserContext.tsx` for forbidden `firebase/firestore` imports, mirroring `src/test/architecture/dashboard-no-firestore.test.ts` (research.md §10) (depends on T018) — its "userService.ts no longer exists" assertion goes green after T030 (US2) deletes that file
- [X] T020 [US1] Add `e2e/profile.spec.ts` — view flow: existing user sees correct profile fields; brand-new user sees correctly-defaulted profile on first load; simulated `GET /api/profile` failure shows a visible error state; network assertion that no request reaches a Firebase/Firestore endpoint while loading Mi Perfil (depends on T018, T019) — verified against the real Firebase Emulator Suite (`firebase emulators:exec`), all passing

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Update my display name (Priority: P1)

**Goal**: `PATCH /api/profile` updates the requesting user's display name via the backend only; Mi Perfil's edit form saves through it, the new name persists after reload, a blank name is rejected client-side with no network call, and a backend failure leaves the previously saved name displayed with a clear error.

**Independent Test**: Change the display name, save, reload, confirm the new name persists and the save request only reached the backend. Submit a blank name and confirm no request fires. Simulate a backend failure and confirm the prior name remains displayed with an error shown.

### Tests for User Story 2 ⚠️

- [X] T021 [P] [US2] Unit test for the `updateDisplayName` use-case (rejects empty/whitespace-only input, trims, persists and returns the updated profile) in `server/test/application/use-cases/profile/UpdateDisplayName.test.ts`
- [X] T022 [P] [US2] Unit test for `FirestoreProfileAdapter.updateDisplayName` — same DEVIATION as T010: unit-tests the pure `toProfileRecord`/`unionMissingProviders` helpers; the "updates displayName/updatedAt only, other fields incl. legacy `joinedBoards` untouched" write-path guarantee (FR-009/SC-004) is asserted at the E2E level instead — in `FirestoreProfileAdapter.test.ts`
- [X] T023 [P] [US2] Contract test for `PATCH /api/profile` (200 updated profile, 400 empty/blank `displayName`, 401) in `profile.test.ts`
- [X] T024 [P] [US2] Unit test for `backendProfileClient.updateDisplayName(name)` in `backendProfileClient.test.ts`

### Implementation for User Story 2

- [X] T025 [US2] Implement the `updateDisplayName` use-case in `server/src/application/use-cases/profile/UpdateDisplayName.ts` (depends on T021)
- [X] T026 [US2] Implement `FirestoreProfileAdapter.updateDisplayName` in `FirestoreProfileAdapter.ts` (depends on T022)
- [X] T027 [US2] Implement the `PATCH /api/profile` route handler in `profile.ts` (depends on T023, T025, T026)
- [X] T028 [US2] Implement `updateDisplayName(displayName): Promise<UserProfile>` in `backendProfileClient.ts` (depends on T024, T027)
- [X] T029 [US2] In `src/lib/contexts/UserContext.tsx`'s `updateDisplayName` action (passed to `Profile.tsx`'s `UserProfileForm` as `onSave`), replace the `userService.updateUserProfile` call with `backendProfileClient.updateDisplayName`, preserving the existing optimistic-update/error-handling behavior (depends on T028) — also switched its failure toast to a generic clear message (was surfacing the raw `fetch()` error text) per FR-008/US2 Acceptance Scenario 3
- [X] T030 [US2] Delete `src/features/auth/services/userService.ts` and `src/test/features/auth/userService.test.ts` — every live call site (`getUserProfile`, `createUserProfile`, `updateUserProfile`, `addProviderToUser`) has now moved to `backendProfileClient`; the remaining methods are confirmed dead code (research.md §7, §9) (depends on T018, T029)
- [X] T031 [US2] Extend `e2e/profile.spec.ts` with the edit-display-name flow: save persists after reload; blank submission makes no network call; a simulated `PATCH /api/profile` failure leaves the prior name displayed with a visible error; network assertion that no request reaches a Firebase/Firestore endpoint while saving (SC-002) (depends on T029, T030) — the persist/blank/failure scenarios each sign in as their own dedicated identity rather than the shared test account, since the persist scenario permanently renames whoever it signs in as and the shared account is reused by every other spec in the suite's single emulator run

**Checkpoint**: User Stories 1 AND 2 (both P1) are independently functional — this is the MVP.

---

## Phase 5: User Story 3 - Sign out (Priority: P1)

**Goal**: Confirm sign-out remains backend-authoritative and unaffected by this migration — no source changes are needed (research.md §5: `POST /api/auth/logout` is already called exclusively for session termination, and the residual `firebase/auth` `signOut()` call is a local, network-free operation that does not violate FR-001/SC-002).

**Independent Test**: Sign in, click "Cerrar sesión", confirm the app returns to a signed-out state and a subsequent `GET /api/profile` is rejected with `401`. Simulate a logout failure and confirm a clear error message with no ambiguous half-signed-out state.

### Tests for User Story 3

> No production code changes are required for this story (research.md §5). The task below adds the E2E coverage Mi Perfil currently lacks.

- [X] T032 [US3] Add sign-out scenarios to `e2e/profile.spec.ts`: successful "Cerrar sesión" click leads to a signed-out state and a subsequent `GET /api/profile` returns `401`; a simulated `POST /api/auth/logout` failure shows a clear, visible error message and leaves the app in a consistent (not ambiguous) state; network assertion that no request reaches a Firebase/Firestore endpoint during sign-out (SC-002 — expected to hold trivially per research.md §5, but asserted explicitly for regression safety) (depends on T020) — the failure case asserts via react-hot-toast's `role="status"` appearing rather than error text, since `handleSignOut`'s catch is intentionally left unchanged (no production code changes for this story, research.md §5) and its toast can surface a raw, non-"error"-worded `fetch()` message

**Checkpoint**: User Stories 1–3 (all P1) are independently functional.

---

## Phase 6: User Story 4 - Manage linked sign-in methods and connected AI assistants without regression (Priority: P2)

**Goal**: Confirm `LinkedProvidersCard`/`useLinkedProviders` and `ConnectedAppsCard`/`useConnectedApps`/`connectedAppsService` continue working exactly as before now that `userProfile` is backend-sourced, with no new direct Firebase calls introduced (research.md §6: no source changes are needed here either — both already derive from `userProfile` or call already-backend-mediated endpoints).

**Independent Test**: View the linked-providers list and confirm it matches the account's actual providers; link an additional provider and confirm it completes. View the connected-AI-assistants list and confirm it matches authorized clients; revoke one and confirm immediate removal. Confirm no new Firebase calls appear in either flow.

### Tests for User Story 4

> No production code changes are required for this story (research.md §6). Tasks below are regression coverage only.

- [X] T033 [P] [US4] Run `src/test/features/auth/LinkedProvidersCard.test.tsx` and confirm it passes unchanged against the new `backendProfileClient`-sourced `userProfile` (no code change expected — research.md §6) — confirmed passing (6/6) with zero source changes
- [X] T034 [P] [US4] Extend `e2e/profile.spec.ts` (or `e2e/authentication.spec.ts`) with a scenario confirming the linked-providers list is correct and "link an additional provider" still completes end-to-end after this migration, with a network assertion that no new direct Firebase/Firestore requests are introduced by Mi Perfil (depends on T020) — added to `e2e/profile.spec.ts`; "link an additional provider" is verified only up to the redirect affordance being present (clicking "Vincular" is a full-page redirect to a real OAuth provider, which the emulator cannot serve — same limitation `authentication.spec.ts` already documents for sign-in)
- [X] T035 [P] [US4] Extend the same spec with a scenario confirming the Connected AI Assistants list and revoke flow (`e2e/mcp-connector.spec.ts` may already cover part of this — extend rather than duplicate) still work unchanged from Mi Perfil, with the same no-new-Firebase-calls assertion (depends on T020) — extended `e2e/mcp-connector.spec.ts`'s existing connect/list/revoke test in place with a Firestore-request-tracking assertion, rather than duplicating that flow in `profile.spec.ts`

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full-feature validation across all stories.

- [X] T036 [P] Run the full `quickstart.md` validation pass (sections 1–4 and 7: zero-Firebase-call check, all four user stories, unaffected disabled-placeholder controls, unauthorized cross-profile access check) against the emulator — covered by the full `e2e/profile.spec.ts` run (§1–3) plus `profile.test.ts`'s cross-uid contract test (§7); §4 (Exportar/Eliminar disabled) verified by inspection — `Profile.tsx` is unchanged by this feature
- [X] T037 [P] Update `server/README.md`'s architecture tree and endpoint table to add the new `profile` slice (`application/ports/profile.ts`, `application/use-cases/profile/`, `adapters/firebase/FirestoreProfileAdapter.ts`, `http/routes/profile.ts`, `GET`/`PATCH /api/profile`), mirroring how `auth`/`boards`/`mcp` are already documented
- [X] T038 Run `npm run test:server:coverage` and `npm run test:coverage`; confirm both remain at/above the 80% branches/functions/lines/statements floor (`vitest.config.ts`) per constitution Principle VI — server: 83.6/86.21/80.21/83.6% (floor 80%); frontend: passes its already-audited baseline thresholds (78/64/50/50%, root `vitest.config.ts`'s documented honest floor, not this feature's concern to raise)
- [X] T039 Run `npm run lint`, `npm run type-check`, and `npm run type-check:server`; fix any errors — 0 errors (107 pre-existing warnings, none in this feature's files); both type-checks clean
- [X] T040 Run `npm run e2e` (full Playwright suite against the emulator) and confirm all new/updated specs pass — 43/43 passed, incl. all 9 new `profile.spec.ts` tests and the extended `mcp-connector.spec.ts` test
- [X] T041 Validate SC-001: measure `GET /api/profile` and `PATCH /api/profile` response times (DevTools Network tab or a Playwright timing assertion) on a warm backend and after a cold serverless start; confirm both are within the 3 s (p95 warm) / 5 s (p95 cold) targets, per `quickstart.md` §6 — measured via curl against the local dev server + emulator: first-ever `GET /api/profile` (profile creation, coldest local case) ~3.4s; warm `GET` ~4-5ms, warm `PATCH` ~7-11ms — both comfortably within target (note: local dev timing, not a real Vercel cold start, which cannot be simulated in this environment)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–6)**: All depend on Foundational completion. Implement **sequentially in priority order (US1 → US2 → US3 → US4)** — see the shared-file note above.
- **Polish (Phase 7)**: Depends on all four user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational. No dependency on other stories.
- **US2 (P1)**: Starts after Foundational. Independently testable; shares `FirestoreProfileAdapter.ts`/`profile.ts`/`backendProfileClient.ts`/`UserContext.tsx` with US1 (sequential file edits, not a functional dependency). Also performs the `userService.ts` deletion (T030), which requires US1's bootstrap migration (T018) to have already landed.
- **US3 (P1)**: No production dependency on US1/US2 (sign-out is untouched), but its E2E task (T032) is appended to the same `e2e/profile.spec.ts` file created in US1 (T020) — sequence after US1.
- **US4 (P2)**: Same file-sequencing reason as US3 — sequence after US1. Optional fast-follow after the P1 MVP (US1–US3).

### Within Each User Story

- Tests are written and confirmed failing before implementation (constitution Principle I), where new production code exists (US1, US2).
- Use-case before adapter method before route handler before frontend client function before UI wiring before E2E spec.
- Story checkpoint reached (independently testable) before moving to the next priority.

### Parallel Opportunities

- T002 and T008 (Foundational) can run in parallel — distinct files, no interdependency.
- Within US1's or US2's Tests block, all four listed tests touch distinct files and can run in parallel.
- T033, T034, T035 (US4) touch distinct files/specs and can run in parallel.
- Across stories: not parallel-safe for the shared adapter/router/client/context files (see shared-file note).

---

## Parallel Example: User Story 1

```bash
# Launch all four US1 tests together (distinct files):
Task: "Unit test for ensureUserProfile use-case in server/test/application/use-cases/profile/EnsureUserProfile.test.ts"
Task: "Unit test for FirestoreProfileAdapter.ensureProfile in server/test/adapters/firebase/FirestoreProfileAdapter.test.ts"
Task: "Contract test for GET /api/profile in server/test/http/routes/profile.test.ts"
Task: "Unit test for backendProfileClient.fetchProfile() in src/test/features/auth/backendProfileClient.test.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1–3, all P1)

Spec.md marks view, edit, and sign-out all as P1 — treat US1–US3 together as this feature's MVP, not US1 alone:

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: US1 (view profile) → validate independently
4. Complete Phase 4: US2 (update display name) → validate independently
5. Complete Phase 5: US3 (sign out, verification-only) → validate independently
6. **STOP and VALIDATE**: run `quickstart.md` sections 1–3; this is a demoable, independently-shippable increment
7. Complete Phase 6: US4 (linked providers/MCP regression, P2) as a fast-follow
8. Complete Phase 7: Polish

### Incremental Delivery

Each story phase ends at a checkpoint where Mi Perfil is fully functional with that story's capability backend-mediated (or verified unaffected) and everything else unchanged — safe to pause and ship after any checkpoint, including after US1 alone if a smaller first slice is preferred.

### Team Strategy

Because of the shared-file constraint noted above, this feature is best executed by one implementer moving through phases sequentially rather than split across a team by user story. If parallelized, coordinate merges of `FirestoreProfileAdapter.ts`, `profile.ts`, `profile.test.ts`, `backendProfileClient.ts`, `backendProfileClient.test.ts`, `UserContext.tsx`, and `e2e/profile.spec.ts` explicitly to avoid conflicts.

---

## Notes

- [P] tasks = different files, no dependencies (see shared-file note for what does *not* qualify here).
- [Story] label maps each task to its user story for traceability.
- Verify each test fails before implementing (TDD, constitution Principle I), for US1/US2 where new production code exists.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- US3 and US4 intentionally have no "Implementation" section — research.md confirms both are already fully satisfied by existing code; their tasks exist solely to add the regression E2E coverage Mi Perfil currently lacks.
- `userService.ts`'s deletion (T030) is placed in US2 rather than Setup/Foundational because it cannot happen until *both* of its live call-site groups (bootstrap in US1, `updateUserProfile` in US2) have migrated off it.
