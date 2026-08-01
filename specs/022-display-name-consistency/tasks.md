# Tasks: Consistent Display Name Resolution Across the App

**Input**: Design documents from `/specs/022-display-name-consistency/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/display-name-resolution.md, quickstart.md (all present)

**Tests**: Included and sequenced before their corresponding implementation task in every phase, per this project's constitution (Principle I, TDD, NON-NEGOTIABLE). Phase 4 (US2) and part of Phase 5 (US3) are exceptions by design — the behavior they cover is a structural consequence of the shared resolver built in Phase 2/3, so their tasks add **safety-net / regression coverage** confirming each surface's fallback path, rather than driving new production code (see each phase's Goal note).

**Organization**: Tasks are grouped by user story (spec.md) to enable independent implementation and testing of each story. All file paths are relative to `retro-rocket/` (repository root) unless stated otherwise.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Establish a clean, known-good baseline before making any change.

- [X] T001 Run the existing full check suite on branch `022-display-name-consistency` and record the baseline result: `npm run test:run`, `npm run test:server`, `npm run type-check`, `npm run type-check:server`, `npm run lint` — retro-rocket/ (repository root)

**Checkpoint**: Baseline is green (or any pre-existing failures are noted and excluded from this feature's scope) before Phase 2 begins.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the single shared resolution primitive — `resolveDisplayName` (generalized from `resolveAuthorDisplayName`) and the updated `groupReactions` that uses it — that every display surface in US1 and US2 routes through (contracts/display-name-resolution.md §2, data-model.md). US3 does not depend on this phase and may proceed independently after Setup.

**⚠️ CRITICAL**: US1 and US2 cannot be correctly implemented until this phase is complete. Note: this phase intentionally leaves the two pre-existing call sites (`DraggableCard.tsx`, `GroupedCardList.tsx`, `useColumnGrouping.ts`) referencing the old `resolveAuthorDisplayName` signature — adapting them is grouped together with the new call sites in Phase 3 (US1), since plan.md treats all ~9 call sites as one coordinated adoption (FR-005: no two surfaces may disagree). Expect `npm run type-check` to fail between this checkpoint and Phase 3's completion.

- [X] T002 Write failing unit tests in `src/test/lib/utils/cardHelpers.test.ts` for: (a) a new `resolveDisplayName(userId, capturedName, participants, fallbackLabel)` covering the full priority order — live `participants` match wins over `capturedName`, `capturedName` used only when no participant match exists, `fallbackLabel` used only when neither exists, never returns a raw `userId`, two participants sharing a display name resolve independently by `userId` (rewrite the existing `resolveAuthorDisplayName` describe block accordingly); and (b) an updated `groupReactions(reactions, participants, fallbackLabel)` asserting the returned `users: string[]` reflects resolved current names (via `resolveDisplayName`) and a new parallel `userIds: string[]` carries the raw `reaction.userId` values
- [X] T003 [P] Add `userIds: string[]` to `GroupedReaction` in `src/features/boards/types/card.ts` (parallel-indexed with `users`, per data-model.md)
- [X] T004 Implement `resolveDisplayName` (generalized from `resolveAuthorDisplayName`) and the updated `groupReactions` (using `resolveDisplayName` internally to populate `users`, plus the new `userIds`) in `src/lib/utils/cardHelpers.ts`, per contracts/display-name-resolution.md §2 — makes T002 pass
- [X] T005 [P] Widen `UnifiedExportData.participants` in `src/features/boards/types/export.ts` from `Array<{ name: string; joinedAt: Date }>` to `Participant[]` (research.md §7.1 — the real `Participant[]`, including `userId`, is already forwarded at runtime by `RetrospectiveTopbar.tsx` → `ImprovedExportPopover.tsx`; this is a type-only widening, structurally compatible with existing consumers)

**Checkpoint**: `resolveDisplayName` and `groupReactions` are fully implemented and unit-tested in isolation. Phase 3 adapts every display surface to use them.

> **Note (FR-002 traceability)**: FR-002 ("capture id+display name at the moment of each user-attributed action") requires no task in this file — `createdByName`/`username`/participant `name` are already captured server-side today (research.md §6). This feature only changes which of those already-captured values display resolution *prefers* (this Foundational phase), not whether they're captured.

---

## Phase 3: User Story 1 - Every surface shows a user's currently configured display name (Priority: P1) 🎯 MVP

**Goal**: A rename in the Profile page is reflected everywhere a user is referenced — card author label, group-by-user header, like tooltip, reaction tooltip, participant list, and exports — live, without a page reload, for boards already open by other participants.

**Independent Test**: Create a card, like a card, react to a card, and join a board as one user; rename that user via Profile; reload/observe a second, already-open session and confirm every surface shows the new name, including a freshly generated export.

### Backend: rename fan-out (FR-002, FR-007, SC-002)

- [X] T006 [P] [US1] Write a failing adapter test for `renameParticipantsForUser(uid, name)` in `server/test/adapters/firebase/FirestoreRetrospectiveBoardAdapter.test.ts` — asserts `.name` is updated on every `participants` doc matching `userId`, across multiple retrospectives; writes are chunked into ≤500-doc batches when a user has joined many boards; and it no-ops (no error) when the user has never joined anything
- [X] T007 [US1] Add `renameParticipantsForUser(uid: string, name: string): Promise<void>` to `ParticipantPort` in `server/src/application/ports/retrospective.ts`, and implement it in `FirestoreRetrospectiveBoardAdapter` (`server/src/adapters/firebase/FirestoreRetrospectiveBoardAdapter.ts`) — query `participants` where `userId == uid`, batch-update `.name` for every match, chunked per Firestore's 500-write batch limit — makes T006 pass
- [X] T008 [P] [US1] Write a failing use-case test in `server/test/application/use-cases/profile/UpdateDisplayName.test.ts` asserting `updateDisplayName` calls `participantPort.renameParticipantsForUser(uid, displayName)` synchronously after a successful `profilePort.updateDisplayName` call, and that a `profilePort` failure short-circuits without invoking the fan-out
- [X] T009 [US1] Add a `participantPort: ParticipantPort` dependency to `updateDisplayName` in `server/src/application/use-cases/profile/UpdateDisplayName.ts`, calling `renameParticipantsForUser` after a successful rename (data-model.md's `updateDisplayName` snippet) — makes T008 pass
- [X] T010 [US1] Wire the new dependency end-to-end: add `participantPort: ParticipantPort` to `ProfileRouterDeps` in `server/src/http/routes/profile.ts` (pass through to the `PATCH /api/profile` handler's use-case call), and construct/pass a `FirestoreRetrospectiveBoardAdapter(db)` instance from `server/src/http/profile-wiring.ts` — depends on T007, T009

### Frontend: adopt `resolveDisplayName` on every surface (FR-001, FR-001a, FR-005, FR-006, FR-010, FR-011)

- [X] T011 [P] [US1] Write failing component tests in `src/test/features/boards/retrospective/LikeButton.test.tsx` asserting a new `participants` prop is used to resolve each like's tooltip name via `resolveDisplayName` (current participant name preferred over the captured `like.username`), never a raw uid
- [X] T012 [US1] Add a `participants?: Participant[]` prop to `LikeButton` (`src/features/boards/retrospective/components/LikeButton.tsx`); build `createTooltipText`'s usernames via `resolveDisplayName(like.userId, like.username, participants, fallbackLabel)` instead of raw `like.username` — makes T011 pass — depends on T004, T011
- [X] T013 [P] [US1] Write failing component tests in `src/test/features/boards/retrospective/EmojiReactions.test.tsx` asserting the "is this my reaction" pill highlight uses `reaction.userIds?.includes(currentUserId)` (fixing the pre-existing bug of comparing a uid against the `users` username array) and that tooltip text still renders the already-resolved `users` strings unchanged
- [X] T014 [US1] In `src/features/boards/retrospective/components/EmojiReactions.tsx`, change the `computedReaction` lookup from `reaction.users?.includes(currentUserId)` to `reaction.userIds?.includes(currentUserId)` — makes T013 pass — depends on T003, T013
- [X] T015 [P] [US1] Write a failing test in `src/test/features/boards/retrospective/DraggableCard.test.tsx` asserting the card author label now shows the live `participants` match (current name) even when `card.createdByName` (captured name) differs — verifying FR-001a's priority flip — and that `likesCount`, the reactions' `count`, and `card.votes` rendered by the card are unchanged by the refactor (FR-010 regression check) — depends on T004
- [X] T016 [US1] Update `src/features/boards/retrospective/components/DraggableCard.tsx`: adapt the card-author `resolveAuthorDisplayName(card, participants, fallback)` call to `resolveDisplayName(card.createdBy, card.createdByName, participants, fallback)`; adapt the `groupReactions(card.reactions ?? [])` call to `groupReactions(card.reactions ?? [], participants, fallback)`; pass `participants={participants}` down to `LikeButton` — makes T015 pass — depends on T004, T012, T015
- [X] T017 [P] [US1] Write a failing test in `src/test/features/boards/clustering/GroupedCardList.test.tsx` asserting the group-by-user header now shows the live `participants` match (current name) even when the group's first card's `createdByName` (captured name) differs — verifying FR-001a's priority flip — depends on T004
- [X] T018 [US1] Update `src/features/boards/clustering/components/GroupedCardList.tsx`'s group-header call from `resolveAuthorDisplayName(cardsInGroup[0], participants, fallback)` to `resolveDisplayName(cardsInGroup[0].createdBy, cardsInGroup[0].createdByName, participants, fallback)` — makes T017 pass — depends on T004, T017
- [X] T019 [P] [US1] Write failing tests in `src/test/features/boards/clustering/useColumnGrouping.test.ts` (extend) asserting: (a) the sort label for a group now prefers the live `participants` match over the captured name (FR-001a), and alphabetical ordering (FR-011) is computed from that resolved label; (b) two participants who share an identical resolved display name but have different `userId`s produce two distinct groups, never merged into one (FR-006, SC-005); (c) group membership (which cards fall in which group) and each group's card count are unchanged by the resolver refactor — grouping keys remain `userId`-based, never name-based (FR-010) — depends on T004
- [X] T020 [US1] Update `src/features/boards/clustering/hooks/useColumnGrouping.ts`'s `displayLabelOf` from `resolveAuthorDisplayName(groups[key][0], participants, fallbackLabel)` to `resolveDisplayName(groups[key][0].createdBy, groups[key][0].createdByName, participants, fallbackLabel)` — grouping keys (`card.createdBy`) and sort mechanics are otherwise untouched, satisfying FR-010 by construction — makes T019 pass — depends on T004, T019

### Exports (FR-005, SC-001)

- [X] T021 [P] [US1] Write a failing test in `src/test/features/boards/export/txtExportService.test.ts` asserting the author line in `buildCardMetadata` uses `resolveDisplayName` (current participant name preferred over `card.createdByName`) and never renders the raw `card.createdBy` uid
- [X] T022 [US1] In `src/features/boards/export/services/txtExportService.ts`, replace the raw `card.createdBy` interpolation (`buildCardMetadata`, ~line 736-737: `` `Autor: ${card.createdBy}` ``) with `resolveDisplayName(card.createdBy, card.createdByName, data.participants, fallbackLabel)` — makes T021 pass — depends on T004, T005, T021
- [X] T023 [P] [US1] Write a failing test in `src/test/features/boards/export/pdfExportService.test.ts` asserting `createCard`'s author line uses `resolveDisplayName`, never the raw `card.createdBy` uid
- [X] T024 [US1] In `src/features/boards/export/services/pdfExportService.ts`, replace the raw interpolation (~line 593: `` `ℹ️ Autor: ${card.createdBy || 'Anónimo'}` ``) with `resolveDisplayName(card.createdBy, card.createdByName, data.participants, fallbackLabel)` — makes T023 pass — depends on T004, T005, T023
- [X] T025 [P] [US1] Write a failing test in `src/test/features/boards/export/docxExportService.test.ts` asserting `buildCardMetadata`'s author line uses `resolveDisplayName`, never the raw `card.createdBy` uid
- [X] T026 [US1] In `src/features/boards/export/services/docxExportService.ts`, replace the raw interpolation (~line 907-908: `` `Autor: ${card.createdBy}` ``) with `resolveDisplayName(card.createdBy, card.createdByName, participants, fallbackLabel)` — makes T025 pass — depends on T004, T005, T025
- [X] T027 [P] [US1] Widen the three export services' local `participants` option-type declarations (`Array<{ name: string; joinedAt: Date }>`) and `ImprovedExportPopover.tsx`'s `participants` prop type to `Participant[]`, matching T005's widened `UnifiedExportData.participants` so `userId` is available end-to-end at the type level

### E2E (FR-007, SC-001, SC-002)

- [X] T028 [US1] Extend `e2e/retrospective-board.spec.ts` with a two-browser-context test (following the existing `group-by-user headers... never raw uids` test's pattern): participant A creates a card, likes a card, and reacts to a card; a second, already-open session confirms A's original name on the card author label, like tooltip, reaction tooltip, and participant list; **without reloading**, A renames via `/perfil`; the second session confirms all four surfaces update live to the new name (quickstart Scenario A)
- [X] T029 [P] [US1] Extend `e2e/export.spec.ts` asserting the downloaded PDF/DOCX/TXT files' content contains a resolved display name for the card author and zero occurrences of the raw uid (quickstart Scenario G, current-author case)

**Checkpoint**: User Story 1 is fully functional and independently testable — every surface shows the currently configured name, live, everywhere including exports; same-name participants stay distinct; grouping/vote/like/reaction counts are unaffected.

---

## Phase 4: User Story 2 - Deleted users' past contributions still show a real name (Priority: P2)

**Goal**: Confirm the safety net — every surface falls back to the name captured at the time of the action (or a generic label if neither exists) once a user's account no longer has a corresponding `participants` match, per the resolution order `resolveDisplayName` already implements (Phase 2) and every surface already calls (Phase 3). No new production code is expected in this phase; its tasks add regression coverage per surface, using the "no matching `participants` doc" fixture technique `020-user-display-name-fix` established for simulating a deleted account (research.md §4).

**Independent Test**: Seed a card/like/reaction/participant whose `userId` has no matching `participants` doc (simulating a deleted account); confirm every surface shows the captured/last-known name, or the generic fallback if no captured name exists either — never a raw uid, blank field, or error.

- [X] T030 [P] [US2] Add tests to `src/test/features/boards/retrospective/DraggableCard.test.tsx` asserting the card author label falls back to `card.createdByName` when no `participants` match exists, and to the generic fallback label when neither exists
- [X] T031 [P] [US2] Add tests to `src/test/features/boards/retrospective/LikeButton.test.tsx` asserting the like tooltip falls back to `like.username` when no `participants` match exists, and to the generic fallback label when neither exists
- [X] T032 [P] [US2] Add tests to `src/test/features/boards/retrospective/EmojiReactions.test.tsx` (via `groupReactions`) asserting the reaction tooltip falls back to `reaction.username` when no `participants` match exists, and to the generic fallback label when neither exists
- [X] T033 [P] [US2] Add tests to `src/test/features/boards/export/txtExportService.test.ts` asserting the exported author line falls back to the captured name, then the generic fallback, for a card whose author has no `participants` match — zero raw-uid occurrences in the output
- [X] T034 [P] [US2] Add tests to `src/test/features/boards/export/pdfExportService.test.ts` asserting the same fallback behavior — zero raw-uid occurrences in the output
- [X] T035 [P] [US2] Add tests to `src/test/features/boards/export/docxExportService.test.ts` asserting the same fallback behavior — zero raw-uid occurrences in the output
- [X] T036 [P] [US2] Add tests to `src/test/features/boards/participants/ParticipantList.test.tsx`, `ResponsiveParticipantDisplay.test.tsx`, and `CompactAvatarGroup.test.tsx` asserting a participant entry for a user with no matching account still shows its stored `name` (last fan-out value) rather than disappearing, blanking, or showing a raw id — confirms all three already-existing, already-tested components (plan.md's Project Structure: "UNCHANGED") need no code change (data-model.md)
- [X] T037 [US2] Extend `e2e/retrospective-board.spec.ts` (or add a focused new spec) seeding — via emulator/test fixtures — a card, like, reaction, and participant entry whose `userId` has no `participants` doc; confirm each still shows its captured/legacy name (or the generic fallback for content with neither) rather than a raw uid, error, or blank field (quickstart Scenario E, SC-003)

**Checkpoint**: User Stories 1 AND 2 both work independently — current names propagate live, and deleted/legacy authors degrade gracefully everywhere.

---

## Phase 5: User Story 3 - New users start with a sensible default display name (Priority: P3)

**Goal**: Pin the existing Google/GitHub-derived default display name behavior (research.md §4/assumptions: already implemented) as a guaranteed, tested contract, closing the one identified coverage gap (GitHub's no-public-name → username fallback) and adding end-to-end confirmation.

**Independent Test**: Connect a brand-new account via Google (or GitHub) without visiting the Profile page, then create a card; confirm the card's author label and the Profile page both show the name obtained from the connected account.

- [X] T038 [P] [US3] Add a test case to the `GithubOAuthAdapter` describe block in `server/test/adapters/oauth/oauth.test.ts` asserting that when the GitHub `/user` response has `name: null`, `displayName` falls back to `login` (`GithubOAuthAdapter.ts:67`'s `user.name ?? user.login ?? null` — currently only the has-a-name branch is covered) — FR-008 acceptance scenario 2
- [X] T039 [US3] Add a Playwright E2E test (extend `e2e/authentication.spec.ts` or `e2e/profile.spec.ts`) asserting a brand-new Google-connected account shows the provider-derived name immediately on a freshly created card, and that the Profile page shows the same name as the current, editable value — without visiting Profile first (quickstart Scenario F; FR-008, FR-009, SC-004)

**Checkpoint**: All user stories are independently functional. Combined with US1/US2, every user — new, renamed, or deleted — is represented by a real, resolvable display name everywhere.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all three stories together.

- [X] T040 [P] Spot-check accessibility (WCAG 2.1 AA, both light/dark themes) on the changed tooltip/label surfaces (`LikeButton`, `EmojiReactions`, group headers) — text-content-only change, confirm no contrast/focus regression; confirm no new i18n keys were introduced (the existing `retrospective.grouping.unknownAuthor` key is reused everywhere per FR-005/plan.md)
- [X] T041 Manually run through quickstart.md Scenarios A-G end-to-end against local dev servers + Firebase emulators
- [X] T042 Run the full check suite again and confirm it is green, including the 80% coverage floor in both `vitest.config.ts` / `server/vitest.config.ts`: `npm run test:run`, `npm run test:server`, `npm run type-check`, `npm run type-check:server`, `npm run lint` — retro-rocket/ (repository root)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS User Story 1 and User Story 2 (not User Story 3)
- **User Story 1 (Phase 3)**: Depends on Foundational (T002-T005) completion
- **User Story 2 (Phase 4)**: Depends on User Story 1's call-site adoption (T011-T027) being in place — its tests exercise the fallback path on already-wired surfaces
- **User Story 3 (Phase 5)**: Depends only on Setup — fully independent of Foundational/US1/US2, may run in parallel with any of them
- **Polish (Phase 6)**: Depends on all three user stories being complete

### Within Each User Story

- Tests are written and confirmed failing before their corresponding implementation task — including at each individual call site (T015→T016, T017→T018, T019→T020), not just at the shared-resolver level (T002→T004)
- Backend fan-out before frontend call-site adoption is not required by data dependency, but is ordered first in Phase 3 for logical grouping
- Story complete before moving to the next priority (or run in parallel with US3, which has no shared files)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (none in this feature — single task)
- T003 and T005 (Phase 2) can run in parallel with each other and with T002 (different files)
- Within Phase 3: the backend track (T006-T010), the `LikeButton`/`EmojiReactions` track (T011-T014), and the export track (T021-T027) touch disjoint files and can be parallelized across contributors; `DraggableCard.tsx` (T016) must wait for `LikeButton`'s new prop (T012) and its own preceding test (T015); `GroupedCardList.tsx` (T018) waits on its own preceding test (T017); `useColumnGrouping.ts` (T020) waits on its own preceding test (T019)
- All of Phase 4 (T030-T036) can run in parallel — each targets a different test file
- Phase 5 (US3) can run in parallel with Phases 2-4 entirely — no shared files
- E2E tasks per phase (T028/T029, T037, T039) are best run after their phase's unit/component work lands, to avoid redundant debugging

---

## Parallel Example: User Story 1

```bash
# Backend track:
Task: "Write a failing adapter test for renameParticipantsForUser in server/test/adapters/firebase/FirestoreRetrospectiveBoardAdapter.test.ts"
Task: "Write a failing use-case test in server/test/application/use-cases/profile/UpdateDisplayName.test.ts"

# Frontend component track:
Task: "Write failing component tests in src/test/features/boards/retrospective/LikeButton.test.tsx"
Task: "Write failing component tests in src/test/features/boards/retrospective/EmojiReactions.test.tsx"
Task: "Write a failing test in src/test/features/boards/retrospective/DraggableCard.test.tsx"
Task: "Write a failing test in src/test/features/boards/clustering/GroupedCardList.test.tsx"
Task: "Write failing tests in src/test/features/boards/clustering/useColumnGrouping.test.ts"

# Export track:
Task: "Write a failing test in src/test/features/boards/export/txtExportService.test.ts"
Task: "Write a failing test in src/test/features/boards/export/pdfExportService.test.ts"
Task: "Write a failing test in src/test/features/boards/export/docxExportService.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks US1 and US2)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart Scenarios A, B, C, D, and G's current-author case independently
5. Deploy/demo if ready — this alone fixes the core defect (every surface agrees, live)

### Incremental Delivery

1. Complete Setup + Foundational → foundation ready (US1/US2 unblocked)
2. Add User Story 1 → validate independently → deploy/demo (MVP!)
3. Add User Story 2 → validate independently (deleted/legacy fallback across every surface) → deploy/demo
4. Add User Story 3 → validate independently (new-user default name) — can be delivered any time, even before US1/US2, since it has no shared files
5. Polish → final full-suite validation

### Parallel Team Strategy

With multiple developers:

1. One developer completes Setup + Foundational
2. Once Foundational is done:
   - Developer A: User Story 1 backend track (T006-T010)
   - Developer B: User Story 1 frontend track (T011-T020) + exports (T021-T027)
   - Developer C: User Story 3 (fully independent, can start immediately after Setup)
3. Once User Story 1 lands, any developer picks up User Story 2 (pure test coverage, highly parallelizable across T030-T036)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No new Firestore collection, WebSocket event type, or backend read endpoint is introduced anywhere in this feature (research.md §1, §5, §8/Constraints) — every task above stays inside that boundary
- FR-002 (capture id+display name at action time for cards/likes/reactions/joins) is intentionally task-less — already implemented and captured server-side today (research.md §6); this feature only changes which already-captured value display resolution prefers
- Verify tests fail before implementing (Phase 2 and Phase 3, including each individual call-site test T015/T017/T019); Phase 4 and part of Phase 5 are safety-net/regression coverage by design — see each phase's Goal note
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence (US3 is fully decoupled from US1/US2 by design)
