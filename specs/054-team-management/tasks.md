---

description: "Task list template for feature implementation"
---

# Tasks: Team Management Foundation

**Input**: Design documents from `/specs/054-team-management/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/teams-api.md, quickstart.md

**Tests**: Per the project constitution (Principle I, TDD — NON-NEGOTIABLE), tests MUST be written before their corresponding implementation task and MUST fail first. Every test task below is REQUIRED, not optional. Firestore adapter code is exempt from Vitest-level unit tests per the codebase's own documented, pre-existing convention (research.md item 7 / `server/vitest.config.ts` coverage excludes) and is instead covered by the Playwright E2E tasks.

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task includes exact file paths, matching the layout in plan.md's Project Structure

## Path Conventions

Existing monorepo layout (plan.md): backend `retro-rocket/server/src/` + `retro-rocket/server/test/`, frontend `retro-rocket/src/` + `retro-rocket/src/test/`, E2E `retro-rocket/e2e/`. All paths below are relative to `retro-rocket/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Non-code prerequisites shared by every story.

- [X] T001 [P] Add an empty `"teams": {}` namespace to `src/locales/en.json` and `src/locales/es.json`, sibling to the existing `dashboard`/`profile` keys (research.md item 6) — per-story keys are added inside it later.
- [X] T002 [P] Add an explicit `allow read, write: if false;` deny block for the `teams` and `teamMemberships` collections to `firestore.rules`, matching the existing `mcpClients`/`mcpConnections`/`mcpAuthorizationCodes` treatment (research.md item 1) — Admin SDK access only.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The port/adapter/wiring/route-mount/client/page skeleton every user story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 [P] Define `TeamsPort` interface and supporting types (`TeamRecord`, `TeamMembershipRecord`, `TeamSummary`, `TeamMemberView`, `CreateTeamInput`, `AddTeamMemberInput`) in `server/src/application/ports/teams.ts`, per data-model.md and contracts/teams-api.md — mirrors `server/src/application/ports/boards.ts`'s shape.
- [X] T004 Implement `FirestoreTeamsAdapter` (full `TeamsPort` implementation: `createTeam`, `listTeamsForUser`, `getTeamWithMembers`, `findUserByEmail`, `addMember` with transactional duplicate-prevention, `removeMembership`, `transferOwnership`) in `server/src/adapters/firebase/FirestoreTeamsAdapter.ts`, per data-model.md and research.md items 1–3 (depends on T003). No dedicated Vitest unit test per the adapter exception noted above.
- [X] T005 [P] Wire `TeamsPort` dependency injection in `server/src/http/teams-wiring.ts`, mirroring `server/src/http/boards-wiring.ts` (depends on T004).
- [X] T006 Create the `server/src/http/routes/teams.ts` router skeleton (rate limiter + reused `requireSession` pattern, no endpoints yet, mirrors `server/src/http/routes/boards.ts`'s structure) and mount it behind `deps.teamsDeps` in `server/src/http/app.ts`, then wire `teamsDeps` into `server/src/http/composition-root.ts` (depends on T005).
- [X] T007 [P] Create `src/features/teams/types/team.ts` (Team, TeamSummary, TeamMemberView types mirroring the contracts/teams-api.md DTOs) and a `src/features/teams/services/backendTeamsClient.ts` skeleton (API base constant + the existing `errorMessageOf`-style envelope helper, mirrors `src/features/dashboard/services/backendBoardsClient.ts`, no endpoint functions yet).
- [X] T008 [P] Register two new lazy routes, `/teams` and `/teams/:id`, in `src/App.tsx` pointing at new placeholder page components `src/pages/Teams.tsx` and `src/pages/TeamDetail.tsx` (empty shells), inside the existing `AuthGuard` wrapper — same protection level as `/dashboard` and `/perfil`.

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Create a team and become its owner (Priority: P1) 🎯 MVP

**Goal**: Any authenticated user can create a team (name required, description optional) and is automatically recorded as its owner; they can see the team they just created.

**Independent Test**: Create a team with just a name and verify it appears with the creator shown as owner; create one with a description too; submitting with no name is rejected — all without touching membership management.

### Tests for User Story 1 ⚠️ (write first, confirm they fail)

- [X] T009 [P] [US1] Unit test `createTeam` use-case (name required/non-empty validation, creator auto-assigned as owner) against a fake `TeamsPort` in `server/test/application/use-cases/teams/CreateTeam.test.ts` (add a shared `teamsFakes.ts` alongside it, mirroring `server/test/application/use-cases/boards/boardsFakes.ts`).
- [X] T010 [P] [US1] Unit test `listTeamsForUser` use-case (returns every team the uid has a membership in, with `myRole`) in `server/test/application/use-cases/teams/ListTeamsForUser.test.ts`.
- [X] T011 [P] [US1] Component test for `TeamCreateForm` (empty-name submission blocked with inline error; name+description submission calls the create handler) in `src/test/features/teams/TeamCreateForm.test.tsx`.

### Implementation for User Story 1

- [X] T012 [US1] Implement `createTeam` use-case in `server/src/application/use-cases/teams/CreateTeam.ts` (depends on T009, T003, T004).
- [X] T013 [US1] Implement `listTeamsForUser` use-case in `server/src/application/use-cases/teams/ListTeamsForUser.ts` (depends on T010, T003, T004).
- [X] T014 [US1] Add `POST /api/teams` (name/description, 400 on empty name) and `GET /api/teams` endpoints, with response serialization per contracts/teams-api.md, to `server/src/http/routes/teams.ts` (depends on T012, T013, T006).
- [X] T015 [P] [US1] Implement `createTeam` and `listTeams` functions in `src/features/teams/services/backendTeamsClient.ts`, mirroring `backendBoardsClient.ts`'s fetch conventions (depends on T007, T014).
- [X] T016 [P] [US1] Implement a `useTeamsQuery` hook (loading/error/data states) in `src/features/teams/hooks/useTeamsQuery.ts` (depends on T015).
- [X] T017 [US1] Build the `TeamCreateForm` component (name required, description optional, inline validation, toast on success/failure via `react-hot-toast`) in `src/features/teams/components/TeamCreateForm.tsx` — use the `apple-design`/`emil-design-eng` skill package for the form's visual/interaction design per constitution Principle IX (depends on T011).
- [X] T018 [US1] Build `src/pages/Teams.tsx`: renders the create-team trigger (`TeamCreateForm`) and the list of the user's teams via `useTeamsQuery`, with an owner/member role badge per team (depends on T016, T017).
- [X] T019 [P] [US1] Add `teams.create.*` and `teams.list.*` i18n keys (form labels, validation error, success toast, role badge copy) to `src/locales/en.json` and `src/locales/es.json` (depends on T001).
- [X] T020 [US1] WCAG 2.1 AA pass on `TeamCreateForm`/`Teams.tsx` — keyboard operability, visible focus indicators, contrast, no color-only state — in both light and dark themes, per constitution Principle VIII (depends on T017, T018).

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable.

---

## Phase 4: User Story 2 - Owner manages team membership (Priority: P2)

**Goal**: From a team's screen, the owner can look up an existing RetroRocket user by exact email and add them, remove any non-owner member, and any non-owner member can leave voluntarily; if the owner leaves a team with other members, ownership auto-transfers to the longest-standing remaining member.

**Independent Test**: Owner searches for another existing user by email, adds them, confirms they appear in the roster, then removes them and confirms they no longer appear; a non-owner member leaves on their own; an owner leaving a team with other members triggers ownership transfer — all independent of any metrics/retro-linking/health-check functionality.

### Tests for User Story 2 ⚠️ (write first, confirm they fail)

- [X] T021 [P] [US2] Unit test `selectNextOwner` pure helper (picks the remaining member with the earliest `joinedAt`, excluding the departing owner) in `server/test/domain/teams/selectNextOwner.test.ts`.
- [X] T022 [P] [US2] Unit test `addTeamMember` use-case (owner-only 403 for non-owners, exact-email lookup, `user_not_found` when no account matches, `409 conflict` on existing membership) in `server/test/application/use-cases/teams/AddTeamMember.test.ts`.
- [X] T023 [P] [US2] Unit test `removeTeamMember` use-case (owner removes a non-owner; a non-owner removes themself; a non-owner attempting to remove someone else is denied) in `server/test/application/use-cases/teams/RemoveTeamMember.test.ts`.
- [X] T024 [P] [US2] Unit test `leaveTeam` owner-departure use-case (ownership transfers to `selectNextOwner`'s pick when other members remain; returns a "team emptied" result when the owner was the sole member) in `server/test/application/use-cases/teams/LeaveTeam.test.ts`.
- [X] T025 [P] [US2] Unit test `getTeamWithMembers` use-case (any member — owner or not — can read the full roster; a non-member is denied) in `server/test/application/use-cases/teams/GetTeamWithMembers.test.ts`.
- [X] T026 [P] [US2] Playwright E2E covering quickstart.md Scenarios 2 and 4 (add by email, duplicate rejection, not-found lookup, non-owner denied, owner removes member, member leaves voluntarily, owner leaves with others remaining → ownership transfers, owner leaves as sole member → team emptied) in `e2e/team-management.spec.ts`.

### Implementation for User Story 2

- [X] T027 [US2] Implement `selectNextOwner` in `server/src/domain/teams/selectNextOwner.ts` (depends on T021).
- [X] T028 [US2] Implement `addTeamMember` use-case in `server/src/application/use-cases/teams/AddTeamMember.ts` (depends on T022, T003, T004).
- [X] T029 [US2] Implement `removeTeamMember` use-case (owner-removes-other and non-owner self-leave branches) in `server/src/application/use-cases/teams/RemoveTeamMember.ts` (depends on T023, T003, T004).
- [X] T030 [US2] Implement `leaveTeam` owner-departure use-case (uses `selectNextOwner`; returns the emptied-team result per FR-014) in `server/src/application/use-cases/teams/LeaveTeam.ts` (depends on T027, T024, T003, T004).
- [X] T031 [US2] Implement `getTeamWithMembers` use-case (403 for non-members) in `server/src/application/use-cases/teams/GetTeamWithMembers.ts` (depends on T025, T003, T004).
- [X] T032 [US2] Add `GET /api/teams/:id`, `POST /api/teams/:id/members`, and `DELETE /api/teams/:id/members/:userId` endpoints (dispatching the three removal cases per contracts/teams-api.md) to `server/src/http/routes/teams.ts` (depends on T028, T029, T030, T031, T014).
- [X] T033 [P] [US2] Implement `getTeam`, `addTeamMember`, and `removeTeamMember` functions in `src/features/teams/services/backendTeamsClient.ts` (depends on T015, T032).
- [X] T034 [P] [US2] Implement a `useTeamQuery` hook (single team + roster, loading/error/data) in `src/features/teams/hooks/useTeamQuery.ts` (depends on T033).
- [X] T035 [P] [US2] Implement a `useTeamMembershipActions` hook (add/remove/leave, refetches the team query on success, surfaces errors) in `src/features/teams/hooks/useTeamMembershipActions.ts` (depends on T033).
- [X] T036 [US2] Build the `AddMemberByEmailForm` component (owner-only, exact-email input, not-found/duplicate error states) in `src/features/teams/components/AddMemberByEmailForm.tsx` — use the `apple-design`/`emil-design-eng` skill package per Principle IX (depends on T035).
- [X] T037 [US2] Build the `TeamMemberList` component (remove control for the owner on other members, leave control for the caller's own row, owner/member role badges, ownership-transfer notice copy) in `src/features/teams/components/TeamMemberList.tsx` (depends on T035).
- [X] T038 [US2] Build `src/pages/TeamDetail.tsx`: fetches the team via `useTeamQuery`, renders `TeamMemberList` and (owner-only) `AddMemberByEmailForm`, gated by the caller's `role` in the response (depends on T034, T036, T037).
- [X] T039 [P] [US2] Add `teams.members.*` i18n keys (add/remove/leave copy, not-found/duplicate errors, ownership-transfer notice) to `src/locales/en.json` and `src/locales/es.json` (depends on T001).
- [X] T040 [US2] WCAG 2.1 AA pass on `AddMemberByEmailForm`/`TeamMemberList` — keyboard operability, visible focus, contrast, no color-only state — in both themes, per constitution Principle VIII (depends on T036, T037).

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - View team roster and personal team memberships (Priority: P3)

**Goal**: Any team member (owner or not) can view a team's full roster read-only, and any user can see an accurate overview of every team they belong to, including a clean empty state when they belong to none. (The backend read path — `getTeamWithMembers`'s any-member access, `listTeamsForUser`'s full-membership enumeration — was already built and tested in US1/US2; this story delivers the remaining member-facing presentation: read-only gating and the empty state.)

**Independent Test**: A non-owner member opens a team's screen and sees every current member listed but no add/remove controls; a user belonging to several teams sees all of them on their overview; a user in zero teams sees an explicit empty state — all independent of the add/remove actions themselves.

### Tests for User Story 3 ⚠️ (write first, confirm they fail)

- [X] T041 [P] [US3] Component test: `TeamDetail.tsx` hides `AddMemberByEmailForm` and the remove-member control (showing only a "leave" control on the caller's own row) when the caller's role is `member`, not `owner`, in `src/test/features/teams/TeamDetail.page.test.tsx`.
- [X] T042 [P] [US3] Component test: `Teams.tsx` renders an explicit empty state when the user belongs to zero teams, and otherwise lists every membership (owned and joined) with the correct role badge, in `src/test/features/teams/Teams.page.test.tsx`.
- [X] T043 [P] [US3] Playwright E2E covering quickstart.md Scenario 3 (a member views a team's roster read-only, sees the team on their own overview, and a brand-new account sees the empty state) in `e2e/team-management.spec.ts`.

### Implementation for User Story 3

- [X] T044 [US3] Add the read-only rendering branch to `src/pages/TeamDetail.tsx` for non-owner members — hide owner-only controls, keep the "leave team" control on the caller's own row (depends on T041, T038).
- [X] T045 [US3] Add the explicit empty-state view (copy + illustration/placeholder consistent with existing empty states, e.g. `Teams.tsx` belongs-to-zero-teams case) to `src/pages/Teams.tsx` (depends on T042, T018).
- [X] T046 [P] [US3] Add `teams.overview.emptyState` and `teams.detail.readOnlyNotice` i18n keys to `src/locales/en.json` and `src/locales/es.json` (depends on T001).
- [X] T047 [US3] WCAG 2.1 AA pass on the empty state and the read-only roster view, in both themes, per constitution Principle VIII (depends on T044, T045).

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Whole-feature validation once all desired stories are complete.

- [X] T048 Run every quickstart.md scenario (1–4) end-to-end against the emulator and record the outcome.
- [X] T049 [P] Run `npm run test:server:coverage` and confirm `server/src/application/use-cases/teams/**` and `server/src/domain/teams/**` keep the thresholds in `server/vitest.config.ts` (branches 80 / functions 68 / lines 74 / statements 74).
- [X] T050 [P] Run `npm run test:coverage` and confirm `src/features/teams/**` keeps the 80/80/80/80 thresholds in `vitest.config.ts`.
- [X] T051 Add a "Teams" navigation entry point (e.g. a header/nav link to `/teams`) consistent with the existing Dashboard/Profile navigation — use the `apple-design`/`emil-design-eng` skill package for any visual/motion decision per Principle IX.
- [X] T052 [P] Run `npm run type-check`, `npm run type-check:server`, and `npm run lint` and fix any findings across all new `teams` files.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Stories (Phase 3–5)**: All depend on Foundational phase completion.
  - US1 has no dependency on US2/US3.
  - US2 depends on US1's `Teams.tsx`/`TeamCreateForm` only in the sense that a team must exist to manage membership on it — functionally independent code, but exercised against a team created via US1's flow (or directly via the `POST /api/teams` contract, for isolated testing).
  - US3 builds its two component tasks (T044, T045) on top of `TeamDetail.tsx` (T038, US2) and `Teams.tsx` (T018, US1) rather than duplicating those files — see the Goal note in Phase 5 for why this story's own footprint is intentionally small.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### Within Each User Story

- Tests MUST be written and FAIL before their corresponding implementation task (constitution Principle I).
- Use-cases before routes; routes before frontend client functions; client functions before hooks; hooks before components; components before pages.
- WCAG pass is the last task in each story, once that story's UI exists.

### Parallel Opportunities

- T001–T002 (Setup) run in parallel.
- T003, T005, T007, T008 (Foundational) are marked [P] — different files; T004 and T006 are not (they depend on the immediately preceding task and, in T006's case, touch shared app-wiring files).
- Within each story, all test tasks marked [P] can run in parallel (different test files); within implementation, tasks marked [P] touch different files and can run in parallel, while unmarked tasks form a sequential chain (typically because they add another endpoint/branch to the same shared file such as `routes/teams.ts`, `backendTeamsClient.ts`, or a shared page component).
- US1 and US2's backend use-case tests (T009–T011, T021–T026) can be written in parallel by different people once Foundational is done, since they touch entirely separate files.

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test createTeam use-case in server/test/application/use-cases/teams/CreateTeam.test.ts"
Task: "Unit test listTeamsForUser use-case in server/test/application/use-cases/teams/ListTeamsForUser.test.ts"
Task: "Component test TeamCreateForm in src/test/features/teams/TeamCreateForm.test.tsx"

# Launch independent-file implementation tasks for User Story 1 together:
Task: "Implement createTeam and listTeams client functions in src/features/teams/services/backendTeamsClient.ts"
Task: "Implement useTeamsQuery hook in src/features/teams/hooks/useTeamsQuery.ts"
Task: "Add teams.create.*/teams.list.* i18n keys to src/locales/en.json and src/locales/es.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 independently.
5. Deploy/demo if ready — a user can create a team and see themselves as owner, even with no membership management yet.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. Add User Story 1 → validate with quickstart.md Scenario 1 → deploy/demo (MVP!).
3. Add User Story 2 → validate with Scenarios 2 and 4 → deploy/demo.
4. Add User Story 3 → validate with Scenario 3 → deploy/demo.
5. Phase 6 Polish → full quickstart.md pass, coverage/lint/type-check verification.

### Parallel Team Strategy

With multiple developers, once Foundational (Phase 2) is done:

- Developer A: User Story 1 (T009–T020).
- Developer B: starts User Story 2's backend use-cases and tests (T021–T032) against the `TeamsPort` contract from T003 — doesn't need US1's UI to exist, only the port.
- Developer C: prepares User Story 3's test scaffolding (T041–T043) against the contracts, ready to implement (T044–T047) as soon as T018 and T038 land.

---

## Notes

- [P] tasks touch different files with no unfinished dependency between them.
- [Story] labels map every user-story-phase task to its story in spec.md for traceability.
- Each user story is independently completable and testable per its Independent Test description.
- Verify each test fails before implementing the task it covers (TDD, Principle I).
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before continuing.
- Out of scope for every task above (per spec.md FR-016–FR-018, do not implement): retrospective/board linkage to a team, team-level metrics, health-check surveys.
