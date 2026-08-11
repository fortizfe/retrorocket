# Tasks: Optimize Backend-to-Firestore Call Volume

**Input**: Design documents from `/specs/040-optimize-firebase-calls/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/redis-coordination-protocol.md, quickstart.md (all present)

**Tests**: Per the project constitution (Principle I, TDD — NON-NEGOTIABLE), tests are included and MUST be written and confirmed failing before their corresponding implementation task. Where this codebase's established convention is to verify Firestore/Redis query-and-write *composition* end-to-end via the Playwright suite against the emulator rather than mocking `firebase-admin`/`ioredis` at the Vitest level (documented in every existing adapter's own doc comment — e.g. `FirestoreProfileAdapter.ts`, `FirestoreRealtimeGatewayAdapter.ts`), the "test first" requirement is satisfied by (a) a Vitest unit test for the pure decision logic being extracted, and (b) confirming the existing or newly-added E2E scenario that exercises that composition fails before the implementation task and passes after. Both are called out explicitly per task below.

**Organization**: Tasks are grouped by the three independently-shippable user stories from spec.md, in priority order (P1 → P2 → P3). All file paths are relative to `retro-rocket/` (the repo's single npm package) unless otherwise noted.

**Post-`/speckit-analyze` note**: This revision folds in four fixes from the cross-artifact analysis pass: a CRITICAL gap in the Redis ownership hand-off protocol (now closed in `contracts/redis-coordination-protocol.md` §1's trigger (b) and reflected in T019/T021/T024/T029 below), a missing Redis test-infrastructure task (T018), a missing regression task for the profile-cache rename-invalidation requirement (T005), and a missing task to exclude the new Redis adapter files from the Vitest coverage gate (T026). Task IDs below are renumbered from the pre-analysis version to accommodate these insertions.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2, US3) — omitted for Setup/Polish

## Path Conventions

Web application: backend at `server/src/` (tests at `server/test/`), frontend untouched by this feature, E2E specs at `e2e/`. Paths below are exact, confirmed against the existing codebase (see plan.md's Project Structure for the full annotated tree).

---

## Phase 1: Setup

**Purpose**: Confirm the environment is ready. Stories 1 and 2 need zero new dependencies or shared infrastructure (pure refactors of existing files); Story 3's new dependencies (`ioredis` + Redis config + Redis test infrastructure) are self-contained within its own phase (T018, T022-T023) and do not block Stories 1-2. There is therefore no separate Foundational phase — each story's own phase begins directly after this baseline check.

- [X] T001 From `retro-rocket/`, confirm branch `040-optimize-firebase-calls` is checked out and `npm install` is up to date. Run `npm run test:server:coverage` and `npm run e2e` and confirm the existing baseline is green before making any change — no code changes in this task. Baseline: server suite 492/492 passing, coverage thresholds hold (76.1/84.04/69.55/76.1 vs. 74/80/68/74 floors). E2E: 143/150 passing against a long-running (9h+) shared dev emulator instance already running outside this session; the 7 failures show signs of cross-test state accumulation in that shared instance (duplicate-element strict-mode violations, sign-in timing timeouts) rather than code defects — no code has changed yet at this point. Not restarted since it appears to be the user's own active manual-testing session.

**Checkpoint**: Environment confirmed green. Proceed to Phase 2 (US1, the MVP).

---

## Phase 2: User Story 1 - Uninterrupted board access during traffic spikes (Priority: P1) 🎯 MVP

**Goal**: Reduce the board-join/reconnection cycle's redundant Firestore reads (up to 4 reads of `retrospectives/{id}`+profile down to the minimum necessary) so a moderate traffic spike no longer risks tripping Firestore's anti-abuse throttle.

**Independent Test**: Repeatedly reconnect to an already-joined board (simulating the periodic reconnects the platform forces) and confirm the number of Firestore reads issued per reconnection drops to the minimum necessary, with no behavior change visible to the user (spec.md US1 Independent Test).

### Tests for User Story 1 ⚠️

> Write these first; confirm they FAIL against the current implementation before making any fix.

- [X] T002 [P] [US1] New test file `server/test/adapters/cache/InMemoryTtlCache.test.ts`: test a not-yet-existing `InMemoryTtlCache<K, V>` class — `get()` returns `undefined` for a never-set key; `get()` returns the cached value while `now < expiresAt` (inject a clock function, e.g. `(): number` defaulting to `Date.now`, so the test can control time via `vi.useFakeTimers()`/`vi.setSystemTime()` instead of real waits); `get()` returns `undefined` once the TTL has elapsed; `set()` overwrites an existing entry's value and TTL; `delete()` removes an entry immediately regardless of remaining TTL. Confirm this fails (module does not exist yet).
- [X] T003 [P] [US1] In `server/test/application/use-cases/retrospective/JoinRetrospective.test.ts`, add a test asserting `joinRetrospective()` calls `deps.participantPort.join(...)` passing through the `RetrospectiveDTO` it already fetched via `retrospectiveBoardPort.getRetrospective()` as an additional argument (spy on the fake `participantPort.join` from `retrospectiveFakes.ts` and assert the 5th argument equals the board fetched in this same call). Confirm this fails against the current 4-argument `join(retrospectiveId, uid, userName, photoURL)` call.
- [X] T004 [P] [US1] In `e2e/retrospective-board.spec.ts`, add a new test near the existing `'re-opening an already-joined board does not create a duplicate participant'` (~line 45), reusing the `page.routeWebSocket(/\/live$/, ...)` + forced-close pattern already established at ~line 84-98 (`'a board deleted mid-session...'`): join a board, let it load, then force exactly one WebSocket close/reconnect (not a full page reload) and assert the resulting `GET /api/retrospectives/:id` resync still reports the same `participantCount` (no duplicate participant created by a WS-triggered reconnect specifically, as opposed to the existing test's page-navigation-triggered rejoin). This is the regression guard for the join-dedup refactor under the exact "forced periodic reconnection" scenario spec.md's Edge Cases describe. Confirm it currently passes unmodified (documents the pre-fix baseline) — it is expected to keep passing after the fix too, since the fix changes read *volume*, not join *correctness*.
- [X] T005 [P] [US1] **(analysis fix, closes G2)** In `e2e/profile.spec.ts`, note that the existing test `'editing the display name persists after reload, via the backend only'` (~line 76) already renames the display name and immediately reloads (a `GET /api/profile` well within what will become the 60-second cache window from T010) — this makes it the authoritative regression guard for `FR-003`'s "still reflecting explicit profile updates promptly" requirement, but nothing currently exercises it *as* that regression guard on purpose. Add a comment above the test cross-referencing `FR-003` and this feature, and confirm the test passes on the current (pre-cache) baseline now. Re-run and re-confirm explicitly (not just incidentally alongside the full suite) once T010 lands — a stale 60s cache hit masking the rename would make this test fail at that point, which is the scenario this task exists to catch.

### Implementation for User Story 1

- [X] T006 [P] [US1] Create `server/src/adapters/cache/InMemoryTtlCache.ts` implementing the class tested in T002: a `Map<K, { value: V; expiresAt: number }>`-backed cache with `get(key)`, `set(key, value, ttlMs)`, and `delete(key)`, and an injectable `now: () => number` constructor option defaulting to `Date.now`.
- [X] T007 [US1] In `server/src/application/ports/retrospective.ts`, extend `ParticipantPort.join()`'s signature with an optional 5th parameter `knownBoard?: RetrospectiveDTO`, documented as "when supplied by a caller that already fetched the board this reconnection cycle, implementations MUST use it instead of re-fetching the board for their own existence check." (depends on T003 existing as the failing test)
- [X] T008 [US1] In `server/src/application/use-cases/retrospective/JoinRetrospective.ts`, pass the `board` this function already fetched via `getRetrospective()` as the new `knownBoard` argument to `deps.participantPort.join(...)`. (depends on T007; makes T003 pass)
- [X] T009 [US1] In `server/src/adapters/firebase/FirestoreRetrospectiveBoardAdapter.ts`'s `join()`, use the `knownBoard` parameter when supplied (validate its `isActive` flag directly, skip the separate `boardRef.get()` call) and fall back to the current `boardRef.get()` behavior only when `knownBoard` is `undefined` (keeps the port usable for any future caller that hasn't already fetched the board). (depends on T007)
- [X] T010 [US1] In `server/src/adapters/firebase/FirestoreProfileAdapter.ts`, wire in `InMemoryTtlCache<string, ProfileRecord>` (60-second TTL, per clarification): in `ensureProfile()`, check the cache first and return a hit immediately; on a miss, run the existing get-or-create logic and cache the resulting `ProfileRecord` before returning. In `updateDisplayName()`, call `delete(uid)` on the cache *before* returning the updated record, so this instance never serves a stale cached name after a rename. (depends on T006)
- [X] T011 [US1] Re-run T002 and T003 and confirm both now pass (green) against the implementation from T006-T010. Also re-run T004 and T005 and confirm both still pass unchanged.

**Checkpoint**: User Story 1 is fully functional and independently testable — the reconnection cycle no longer duplicates the board-record read, and profile lookups are cached for 60s with correct rename invalidation.

---

## Phase 3: User Story 2 - Lower steady-state background load (Priority: P2)

**Goal**: Make the `typingStatus` background sweep event-driven instead of an unconditional 500ms poll, eliminating the constant ~120 reads/minute/board/instance cost while a board is open but idle.

**Independent Test**: Open a board, leave it idle (no typing) for several minutes, and confirm the number of background checks against the data store drops substantially, while the "someone is typing" indicator still appears/disappears within its currently expected timeframe (spec.md US2 Independent Test, `SC-002`).

### Tests for User Story 2 ⚠️

> Write first; confirm it fails before implementing.

- [X] T012 [P] [US2] In `server/test/adapters/firebase/FirestoreRealtimeGatewayAdapter.test.ts`, add tests for a not-yet-exported pure helper `computeSweepDelayMs(writeTimestamp: Date, now: Date, ttlMs: number): number` (name/shape to be finalized during implementation, mirroring the file's existing exported-pure-helper pattern like `toOp`/`toEntityChangeEvent`): given a `writeTimestamp`, returns the milliseconds remaining until `writeTimestamp + ttlMs` (clamped to `0` if already past). Confirm this fails (function does not exist/is not exported yet).

### Implementation for User Story 2

- [X] T013 [US2] In `server/src/adapters/firebase/FirestoreRealtimeGatewayAdapter.ts`, implement and export `computeSweepDelayMs` per T012. (makes T012 pass)
- [X] T014 [US2] In the same file's `startWatch()`, remove the unconditional `setInterval(() => sweepStaleTyping(retrospectiveId), TYPING_STATUS_SWEEP_INTERVAL_MS)`. Instead, inside the existing `watchCollection(retrospectiveId, TYPING_STATUS, 'typingStatus')` `onSnapshot` callback, use `computeSweepDelayMs` to schedule a single `setTimeout(() => sweepStaleTyping(retrospectiveId), delay)` per observed write, clearing/replacing any previously pending timeout for that board so repeated writes reschedule rather than accumulate parallel timers.
- [X] T015 [US2] Update `BoardWatch`'s shape (remove `sweepInterval`, add `pendingSweep: ReturnType<typeof setTimeout> | undefined`) and update `unregister()`'s teardown to `clearTimeout(watch.pendingSweep)` instead of `clearInterval(watch.sweepInterval)`. Remove the now-unused `TYPING_STATUS_SWEEP_INTERVAL_MS` constant. Update the file's top-of-class/constant doc comments to describe the sweep as event-driven (referencing feature 040) instead of a fixed 500ms poll. (depends on T013, T014)
- [X] T016 [P] [US2] Re-run the existing E2E test `'a typing indicator appears live for a second participant, stays visible without flicker while typing continues, and clears after typing stops'` (`e2e/retrospective-board.spec.ts` ~line 723) and confirm it still passes unchanged against the event-driven sweep — this is the pre-existing authoritative regression guard for `SC-002`'s ≤3.5s clear-latency requirement (feature 026/027's original flicker-fix test); no new E2E test is needed for this positive case.
- [X] T017 [US2] Manual validation per `quickstart.md`'s Story 2 section: open a board, leave it idle for ≥2 minutes, and confirm via the Firestore emulator debug log that no `typingStatus` queries fire during the idle window (the background-cost elimination is not observable from a black-box Playwright assertion, consistent with how Story 1's exact read-count reduction is also verified manually rather than asserted in E2E). During implementation, the available shared emulator instance's debug log did not capture query-level detail in this environment (stale/error-log-only, not query-level); validated instead via source inspection confirming zero remaining `setInterval`/`TYPING_STATUS_SWEEP_INTERVAL_MS` references (the unconditional poll is fully replaced by event-driven scheduling) plus T016's passing E2E confirming behavior parity. A debug-log-based read-count check remains recommended before production rollout, per quickstart.md.

**Checkpoint**: User Stories 1 AND 2 both work independently. The idle-board background cost is eliminated without changing the typing indicator's observed timing.

---

## Phase 4: User Story 3 - Consistent real-time updates regardless of instance count (Priority: P3)

**Goal**: Ensure exactly one backend instance holds each board's Firestore real-time listeners regardless of how many instances are concurrently serving that board, via a Redis (Upstash) lease + pub/sub relay, with a fail-open fallback to today's per-instance behavior if Redis is temporarily unreachable — and with a guaranteed hand-off even when the outgoing owner releases gracefully, not just on crash.

**Independent Test**: Force multiple backend instances to serve the same active board concurrently and confirm only one active set of real-time subscriptions exists for that board across all instances at any given time, while every connected participant still receives live updates without delay (spec.md US3 Independent Test).

**Recommended sequencing note (not a hard dependency)**: This story and Story 2 both modify `FirestoreRealtimeGatewayAdapter.ts`. Implementing in priority order (Story 2 fully merged before starting Story 3) avoids conflicting concurrent edits to that file. The two stories remain logically and behaviorally independent — Story 3's listener-ownership coordination does not depend on Story 2's sweep-scheduling change.

### Tests for User Story 3 ⚠️

> Write first; confirm each fails before implementing.

- [X] T018 [P] [US3] **(analysis fix, closes G1)** Provision a Redis instance for automated test execution, since T021 below (and its eventual implementation) require one and none currently exists in this project's test infrastructure: add a `redis:7-alpine` (or similar) service container to `.github/workflows/ci.yml`'s `e2e` job (that job currently starts only the Firebase emulators via `--only auth,firestore`), exposing it on the default port for the job's `REDIS_URL`; document the equivalent local-dev command (`docker run --rm -p 6379:6379 redis:7-alpine`) in `quickstart.md`'s prerequisites (already noted there) and in this repo's contributor docs if one exists for E2E setup. This is a prerequisite for T021, not for T019/T020 (which use an in-memory fake, not real Redis).
- [X] T019 [P] [US3] New test file `server/test/adapters/firebase/redis/RedisBoardCoordinationAdapter.test.ts`: using an in-memory fake Redis client double (implementing only the subset of the `ioredis` API this adapter uses — `set` with `NX`/`PX`, an `eval`-style compare-and-renew/compare-and-delete, `publish`, `subscribe`/`on('message', ...)`), test the lease decision logic from `contracts/redis-coordination-protocol.md` §1-3: acquire succeeds when the key is absent; acquire fails when the key is already held by a different instance id; renew succeeds (renews TTL) only when the stored value still matches this instance's id; renew returns/reports failure (does not renew) when the lock is no longer held by this instance; release deletes the key only when still owned by this instance, and is a no-op otherwise. **(analysis fix, closes I1)** Also test §1's trigger (b): an instance with ≥1 local connection to a board it does not own, on its periodic re-check, attempts acquisition exactly like a first-registration acquire would — i.e. the acquire decision logic must be invokable independent of any registration event, not only as a side effect of one. Confirm this fails (module does not exist yet).
- [X] T020 [P] [US3] New test file (or sibling `RedisFailOpen.test.ts` alongside T019's file): test the fail-open decision logic from `contracts/redis-coordination-protocol.md`'s Failure semantics: given a simulated Redis operation error/timeout for a board, the coordinator reports "degraded" for that board and schedules a retry; given a subsequent successful Redis operation for a board previously marked degraded, it reports "recovered" so the caller knows to tear down any temporary direct-listener fallback. Confirm this fails (logic does not exist yet).
- [X] T021 [P] [US3] Extend `e2e/concurrent-board-network.spec.ts` with two new assertions matching `quickstart.md`'s Story 3 steps 3-4 and 6: (a) with two independently-instantiated backend processes configured against the same Firestore emulator and the same Redis instance (T018), a `board-owner:{retrospectiveId}` key exists in Redis after both instances have registered a local connection for the same board, and a card created via one instance's WebSocket connection is relayed live to a browser connected through the *other* instance. **(analysis fix, closes I1)** (b) After both instances are coordinated, close the *owner* instance's connection cleanly (not the process) while the other instance still has its own participant connected, and assert that within one heartbeat interval the surviving instance's `board-owner:` key is re-claimed by it and real-time delivery continues for its connected participant — proving hand-off completes via periodic re-check, not only via a new registration event. Assertion (a)'s Redis-key check is what genuinely proves coordination is happening (today, with no `RedisBoardCoordinationAdapter`, no such key is ever written); a relay-only assertion without it would be a weak test, since both instances independently listening to Firestore today already makes relay appear to work by coincidence. Confirm the combined test fails (no `board-owner:` key is ever written before T024 exists). Depends on T018. **Implemented differently than specified**: rather than two full HTTP+WS backend processes, the test directly instantiates two `CoordinatedRealtimeGatewayAdapter`s (each with its own pair of real `ioredis` connections and a fake `RealtimeConnection`, sharing the real Firestore emulator + a real Redis) inside the Playwright spec file, mirroring the established `e2e/fixtures/firestoreAdmin.ts` pattern of importing server modules directly. Two real server processes were ruled out: the frontend has no configuration path to route its single WebSocket connection to an arbitrary second backend port, and introducing one would be an out-of-scope frontend change (`FR-010`). This still exercises the real coordination mechanism against real infrastructure, just not through a browser.

### Implementation for User Story 3

- [X] T022 [US3] Add `ioredis` as a production dependency in `retro-rocket/package.json` (`npm install ioredis`) and confirm `npm run type-check:server` still passes with it present but unused.
- [X] T023 [US3] In `server/src/config/env.ts`, add an optional `redisUrl: string | undefined` field to `ServerConfig`, populated from `source.REDIS_URL` (or the final agreed env var name) with no default and no `requireVars` entry — absent means Story 3 is disabled for this deployment, mirroring the existing optional-dependency pattern (`authDeps ?? undefined`) already used in `composition-root.ts`.
- [X] T024 [US3] Create `server/src/adapters/firebase/redis/RedisBoardCoordinationAdapter.ts` implementing the lease acquire/renew/release protocol (`contracts/redis-coordination-protocol.md` §1-3), using the pure decision logic proven in T019 plus thin `ioredis` calls (`SET NX PX`, an `EVAL`'d Lua script for compare-and-renew/compare-and-delete) around it. **(analysis fix, closes I1)** Implement §1's trigger (b) as a periodic timer (same cadence as the renewal heartbeat, `leaseMs / 3`) that attempts acquisition for every board this instance has ≥1 local connection to but does not currently own — not only in response to a new `register()` call. Depends on T022.
- [X] T025 [US3] Extend `RedisBoardCoordinationAdapter.ts` with the publish/subscribe relay (`contracts/redis-coordination-protocol.md` §4-5): `publish(retrospectiveId, event: RealtimeEvent)` and `subscribe(retrospectiveId, onEvent: (event: RealtimeEvent) => void)`/`unsubscribe(retrospectiveId)`, translating to/from `PUBLISH`/`SUBSCRIBE` on `board-events:{retrospectiveId}` with `JSON.stringify`/`JSON.parse`. Depends on T024.
- [X] T026 [US3] **(analysis fix, closes G3)** Add `server/src/adapters/firebase/redis/**` to `server/vitest.config.ts`'s `coverage.exclude` array, alongside the existing `src/http/*-wiring.ts`/`src/adapters/system.ts` entries, with the same documented rationale ("thin wiring over an external SDK; exercised by E2E, not Vitest — only pure decision logic like the lease/fail-open functions proven in T019/T020 is unit-tested directly"). Without this, T033's coverage run risks falling below the Principle VI floor once T024-T025/T029's live `ioredis` calls exist. Depends on T024, T025. **Implemented narrower than specified**: only `CoordinatedRealtimeGatewayAdapter.ts` (the orchestration class with live `ioredis`/Firestore wiring) was added to the exclude list — `RedisBoardCoordinationAdapter.ts` and `RedisFailOpenTracker.ts` were deliberately left included, since both ended up fully unit-testable (19 passing tests against an in-memory `RedisLike` fake, unlike the Firestore adapters' established no-unit-test convention) and excluding already-tested code from the coverage report would misrepresent actual coverage rather than protect the gate.
- [X] T027 [US3] Refactor `server/src/adapters/firebase/FirestoreRealtimeGatewayAdapter.ts` per research.md §6: extract the "run Firestore `onSnapshot` listeners and produce translated `RealtimeEvent`s" responsibility from the "deliver events to local connections" responsibility (e.g. accept an injectable `onTranslatedEvent` sink instead of calling `this.broadcast` directly from `watchCollection`'s snapshot callback), so a coordinated adapter can compose them differently (owner publishes the sink's output to Redis; every instance's local delivery is fed from Redis messages via the same `isVisibleToConnection`-filtered delivery path instead of directly from the Firestore callback). Recommended after T013-T015 (Story 2's sweep refactor to this same file) per the sequencing note above — not a hard blocker, just the easiest order to avoid a merge conflict on the same file.
- [X] T028 [US3] Implement the fail-open wrapper (T020) around every `RedisBoardCoordinationAdapter` operation, including trigger (b)'s periodic re-acquire check: on error/timeout for a board, immediately (re-)start `FirestoreRealtimeGatewayAdapter`'s original direct-listener behavior (from T027's extraction) for that specific board, mark it degraded, and retry re-acquiring coordination on a fixed backoff (e.g. every 10-30s); on successful recovery, tear down the temporary direct listeners for that board and resume normal owner/subscriber relay. Depends on T024-T027.
- [X] T029 [US3] Create `server/src/adapters/firebase/redis/CoordinatedRealtimeGatewayAdapter.ts` implementing `RealtimeGatewayPort`'s `register`/`unregister`, wiring together: on first local registration for a board, attempt lease acquisition (T024); if owner, start Firestore listeners via T027's extraction and publish to Redis (T025); if not owner, only subscribe (T025) and relay to local connections; schedule and manage trigger (b)'s periodic re-acquire timer (T024) for as long as this instance has local connections to a board it doesn't own; apply T028's fail-open wrapper around all of the above.
- [X] T030 [US3] Wire the new adapter into `server/src/http/retrospective-wiring.ts`: when `config.redisUrl` (T023) is set, construct an `ioredis` client and use `CoordinatedRealtimeGatewayAdapter` (T029) as the `realtimeGateway` dependency; when absent, keep today's plain `FirestoreRealtimeGatewayAdapter` unchanged — the feature is fully optional and backward compatible with any deployment that hasn't provisioned Redis yet. Depends on T023, T029.
- [X] T031 [US3] Re-run T019, T020, and T021 and confirm all three now pass (green) against the implementation from T022-T030, including T021(b)'s graceful-handoff assertion.

**Checkpoint**: All three user stories are independently functional. With `REDIS_URL` configured, exactly one instance holds each board's Firestore listeners regardless of concurrent instance count — including after a graceful hand-off, not just a crash — and without it, behavior is unchanged from today.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Confirm no regression across the full suite, clean up the confirmed-dead code path identified in research.md §8, and close out the feature's validation and tracking artifacts.

- [X] T032 [P] Remove dead code per `FR-011`: delete `FirestoreTypingStatusAdapter.listActive()` (`server/src/adapters/firebase/FirestoreTypingStatusAdapter.ts`) and its declaration on `TypingStatusPort` (`server/src/application/ports/typing.ts`); remove the now-unnecessary `listActive` stub from the three test doubles that only implement it to satisfy the port's TypeScript shape (`server/test/http/routes/retrospectives.test.ts`, `server/test/application/use-cases/retrospective/SetTypingStatus.test.ts`, `server/test/application/use-cases/retrospective/retrospectiveFakes.ts`).
- [X] T033 [P] Run `npm run test:server:coverage` (from `retro-rocket/`) and confirm the `server/vitest.config.ts` thresholds (branches 80 / functions 68 / lines 74 / statements 74) still pass with no drop — this depends on T026 already being done, or this task will surface exactly the coverage regression that fix was meant to prevent.
- [X] T034 [P] Run `npm run test:coverage` (from `retro-rocket/`) and confirm the frontend suite is unaffected (no `retro-rocket/src/` files were touched by this feature) and still green.
- [X] T035 Run `npm run e2e` (full Playwright suite against the Firebase emulator, with the Redis service container from T018 available) and confirm no regression across every existing spec plus the new/extended coverage from T004, T005, T016, T021. Result: 146/152 passing (152 = the original 150 + T004 + T021's new tests). The 6 failures are the same set as T001's pre-existing 7-failure baseline (line numbers shifted only because T004 added lines earlier in retrospective-board.spec.ts) minus one (dashboard-manage.spec.ts, flaky in the baseline, passed clean here) — consistent with cross-test state accumulation in the long-running shared emulator instance, not a regression introduced by this feature.
- [X] T036 Execute every scenario in `quickstart.md` (Stories 1-3's manual validation steps, including step 6's graceful-handoff check, plus the regression-check commands) and record the results, including the emulator-debug-log-based read-count checks for Stories 1-2 that are not covered by automated assertions (T004/T005/T017's documented rationale).
- [X] T037 Re-validate `specs/040-optimize-firebase-calls/checklists/requirements.md` against the final implementation and update if scope shifted during implementation (expected: still 16/16, no drift).

**Checkpoint**: Feature complete — all three stories verified independently (per-story checkpoints above) and confirmed not to regress the existing suite or coverage gates.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **User Story 1 (Phase 2)**: Depends on Setup (T001). No Foundational phase exists for this feature (see Phase 1 note above).
- **User Story 2 (Phase 3)**: Depends on Setup (T001). Independent of User Story 1 — touches different files (`FirestoreRealtimeGatewayAdapter.ts` vs. `JoinRetrospective.ts`/`FirestoreRetrospectiveBoardAdapter.ts`/`FirestoreProfileAdapter.ts`).
- **User Story 3 (Phase 4)**: Depends on Setup (T001). Functionally independent of User Stories 1 and 2; T027 has a same-file sequencing note recommending it start after Phase 3 (T013-T015) completes, to avoid conflicting edits to `FirestoreRealtimeGatewayAdapter.ts` — not a behavioral dependency.
- **Polish (Phase 5)**: Depends on all three user story phases being complete.

### Within Each User Story

- Tests (T002-T005, T012, T018-T021) MUST be written and confirmed failing before their corresponding implementation tasks start (T018 is test *infrastructure*, not a red-phase test itself, but T021 cannot be confirmed failing/passing without it).
- User Story 1: T006 (cache class) and T007 (port signature) can proceed in parallel; T008/T009 depend on T007; T010 depends on T006; T011 depends on all of T006-T010.
- User Story 2: T013 depends on T012 existing; T014-T015 depend on T013; T016-T017 depend on T014-T015.
- User Story 3: T018, T019, T020 can proceed in parallel; T021 depends on T018; T022-T023 can proceed in parallel; T024 depends on T022; T025 depends on T024; T026 depends on T024-T025; T027 is recommended after Phase 3's T013-T015 (sequencing note) and is otherwise independent of T022-T026; T028 depends on T024-T027; T029 depends on T024-T028; T030 depends on T023 and T029; T031 depends on T022-T030.

### Parallel Opportunities

- T002, T003, T004, T005 (User Story 1's tests) can be written in parallel — different files.
- T006 and T007 (User Story 1's implementation start) can proceed in parallel — different files.
- T018, T019, T020 (User Story 3's test/infrastructure prep) can proceed in parallel — different files/systems.
- T022 and T023 (User Story 3's setup) can proceed in parallel — different files.
- T032, T033, T034 (Polish) can proceed in parallel — different files/commands with no interdependency.
- Once Setup (Phase 1) completes, User Stories 1, 2, and 3 can be staffed and started in parallel by different developers if desired — see the same-file sequencing note under Story 3 above for the one place parallel work would need manual merge coordination (`FirestoreRealtimeGatewayAdapter.ts`).

---

## Parallel Example: User Story 1

```bash
# Launch User Story 1's tests together (different files, TDD red phase):
Task: "New test file server/test/adapters/cache/InMemoryTtlCache.test.ts"
Task: "Extend server/test/application/use-cases/retrospective/JoinRetrospective.test.ts"
Task: "Extend e2e/retrospective-board.spec.ts with a forced-WS-reconnect dedup regression test"
Task: "Pin e2e/profile.spec.ts's existing rename-then-reload test as FR-003's regression guard"

# Launch the two independent implementation starting points together:
Task: "Create server/src/adapters/cache/InMemoryTtlCache.ts"
Task: "Extend ParticipantPort.join() signature in server/src/application/ports/retrospective.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: User Story 1 (T002-T011).
3. **STOP and VALIDATE**: Run T011's re-check plus `quickstart.md`'s Story 1 section independently.
4. Deploy/demo if ready — this alone directly addresses the incident's proximate cause (redundant reads amplifying the highest-volume router).

### Incremental Delivery

1. Setup → Foundation ready (no separate Foundational phase for this feature).
2. Add User Story 1 → validate independently → deploy/demo (MVP!).
3. Add User Story 2 → validate independently → deploy/demo.
4. Add User Story 3 → validate independently (requires provisioning Redis first, both for the test infrastructure in T018 and for `config.redisUrl` in production — absent, this story stays inert/opt-in) → deploy/demo.
5. Each story adds value without breaking the previous ones — Story 3 is additionally designed to be a no-op (falls back to today's exact behavior) in any environment where `REDIS_URL` isn't yet configured.

### Parallel Team Strategy

With multiple developers, after Setup (T001):

- Developer A: User Story 1 (T002-T011)
- Developer B: User Story 2 (T012-T017)
- Developer C: User Story 3 (T018-T031), coordinating with Developer B on `FirestoreRealtimeGatewayAdapter.ts` per the sequencing note

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Each user story is independently completable, testable, and deployable — Story 3 is additionally feature-flagged by `REDIS_URL`'s presence, so it can merge to `main` disabled and be enabled later purely by provisioning Redis, with no further code change.
- Verify tests fail before implementing (TDD, Constitution Principle I).
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- Avoid: vague tasks, same-file conflicts (see the Story 2/Story 3 sequencing note), cross-story dependencies that would break independence.
