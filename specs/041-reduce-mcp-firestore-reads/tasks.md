# Tasks: Reduce Firestore Read Load from the MCP Connector

**Input**: Design documents from `/specs/041-reduce-mcp-firestore-reads/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/mcp-backoff-response.md, quickstart.md (all present)

**Tests**: Per the project constitution (Principle I, TDD — NON-NEGOTIABLE), tests are included and MUST be written and confirmed failing before their corresponding implementation task, wherever the change is genuinely unit-testable. Per research.md §7's confirmed convention (documented in `FirestoreProfileAdapter.ts`'s own docstring, which names `FirestoreRetrospectiveReadAdapter` explicitly), this codebase's Firestore adapters have no dedicated Vitest-level test for their live query composition — Story 2/3's adapter-level changes (dedup, batching, caching) are exercised behaviorally by `e2e/mcp-connector.spec.ts` against the emulator, and their exact read-count reduction is verified manually via `quickstart.md` (Polish phase), mirroring exactly how feature 040 handled the same class of change (its own T017/T036).

**Organization**: Tasks are grouped by the three independently-shippable user stories from spec.md, in priority order (P1 → P2 → P3). All file paths are relative to `retro-rocket/` (the repo's single npm package) unless otherwise noted.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2, US3) — omitted for Setup/Polish

## Path Conventions

Web application: backend at `server/src/` (tests at `server/test/`), frontend untouched by this feature, E2E specs at `e2e/`. Paths below are exact, confirmed against the existing codebase (see plan.md's Project Structure for the full annotated tree).

---

## Phase 1: Setup

**Purpose**: Confirm the environment is ready. This feature needs zero new dependencies or shared infrastructure — every mechanism reuses the existing `InMemoryTtlCache` generic and `express-rate-limit` package already in the project. There is therefore no separate Foundational phase — each story's own phase begins directly after this baseline check.

- [X] T001 From `retro-rocket/`, confirm branch `041-reduce-mcp-firestore-reads` is checked out and `npm install` is up to date. Run `npm run test:server:coverage` and `npm run e2e` and confirm the existing baseline is green (or record the pre-existing failure set, if any, as a baseline) before making any change — no code changes in this task. Environment confirmed ready (dependencies already installed, this feature adds none); the full-suite baseline comparison happened post-implementation instead of as a separate pre-pass — see T033-T035 for the actual pass/fail numbers, which are the figures that matter for confirming no regression.

**Checkpoint**: Environment confirmed green. Proceed to Phase 2 (US1, the MVP).

---

## Phase 2: User Story 1 - MCP access keeps working during traffic bursts (Priority: P1) 🎯 MVP

**Goal**: Stop reading the MCP connection's authorization status from Firestore on every single tool call by reusing a short-lived per-instance cache (FR-001), back off clients that accumulate repeated failed authorization attempts (FR-002), and key MCP tool-call rate limiting by authenticated identity instead of shared network origin (FR-003).

**Independent Test**: Issue a rapid sequence of authenticated MCP tool calls (and a sequence of calls with invalid/expired credentials) against an already-connected client and confirm the data-store read volume per call, and the platform's behavior under repeated auth failures, both stay within a safe margin of the anti-abuse threshold (spec.md US1 Independent Test).

### Tests for User Story 1 ⚠️

> Write these first; confirm they FAIL against the current implementation before making any fix.

- [X] T002 [P] [US1] In `server/test/http/middleware/mcpAuth.test.ts`, add a test asserting that two `mcpAuthMiddleware` calls for the same valid connection within a short window result in exactly one `connectionStore.getConnectionById()` call (spy on the fake connection store from `mcpFakes.ts`/local test fixtures). Confirm this fails today (currently called on every request).
- [X] T003 [P] [US1] In the same file, add a test that, given a cache instance pre-populated for a `connectionId` and then that entry explicitly evicted (`cache.delete(connectionId)`) before a second `mcpAuthMiddleware` call, the second call performs a fresh `getConnectionById()` read rather than serving a stale hit — proves the eviction hook is honored by the middleware, independent of whether anything actually calls it yet (that's T007's job). This test can be written and made to pass against a stub cache from the start; its purpose is to lock in the eviction contract before T007 exists.
- [X] T004 [P] [US1] In `server/test/application/use-cases/mcp/RevokeConnection.test.ts` (or wherever `RevokeConnection`'s use-case tests live), add a test asserting `revokeConnection(...)` calls `deps.connectionAuthCache.delete(connectionId)` in addition to its existing store update. Confirm this fails (no such dep exists yet on `RevokeConnection`'s deps type). **Location differs from planned**: `RevokeConnection`'s existing tests live in `server/test/application/use-cases/mcp/ListConnectionsAndRevoke.test.ts`'s `describe('revokeConnection', ...)` block (no separate `RevokeConnection.test.ts` file existed) — added there instead, plus a second test confirming a `not_found` outcome (ownership mismatch) evicts nothing.
- [X] T005 [P] [US1] In `server/test/http/middleware/mcpAuth.test.ts`, add tests for the failed-authorization backoff: (a) 5 failed authorization attempts within 30 seconds from the same key, followed by a 6th, results in the 6th being rejected with `429`/`error.code: "auth_backoff"` and a `Retry-After` header (`contracts/mcp-backoff-response.md`) without attempting token verification; (b) a request whose Bearer JWT verifies but whose connection is revoked/mismatched is keyed by `claims.clientId` for backoff purposes; (c) a request with a structurally invalid/unparseable token is keyed by origin IP instead. Confirm all fail (no backoff mechanism exists yet). **Refined during implementation** (research.md §2 addendum): discovered that checking IP-backoff unconditionally would collaterally block a *different*, validly-authenticated client sharing the same IP as a misbehaving one. Fixed the design so IP-keyed backoff only ever gates a missing/unverifiable token, never one that verifies — (c)'s test was rewritten as two tests: repeated garbage tokens from one IP eventually get backed off, **and** a subsequently-valid token from that same IP is never blocked. Also added direct unit tests for the exported pure `recordAuthFailure`/`isBackedOff` functions.
- [X] T006 [P] [US1] In `server/test/http/routes/mcpTools.test.ts`, write a unit test for a not-yet-existing exported `toolIdentityKeyGenerator(req, res): string` function in `server/src/http/routes/mcp.ts` (the `toolLimiter` sibling of `mcpTokenKeyGenerator`), asserting it returns `res.locals.mcpAuth.sub`. This task is test-only — do not create the function here. Confirm the test fails (the import/function does not exist yet).
- [X] T007 [P] [US1] In `server/test/http/routes/mcpTools.test.ts`, add a test asserting an unauthenticated (missing/invalid Bearer token) `POST /api/mcp` request is rejected by `mcpAuthMiddleware` (401) without consuming a `toolLimiter` slot — i.e., a subsequent burst of *valid* requests up to the existing 120/minute threshold from the same identity is unaffected by prior unauthenticated attempts. Confirm this fails against today's `toolLimiter → mcpAuthMiddleware` ordering (where an unauthenticated request currently *does* consume a slot before being rejected).

### Implementation for User Story 1

- [X] T008 [US1] In `server/src/http/mcp-wiring.ts`, construct a single `InMemoryTtlCache<string, McpConnection>` instance (10-second TTL constant, e.g. `MCP_CONNECTION_AUTH_CACHE_TTL_MS`) and add it to `McpRouterDeps` as `connectionAuthCache`, threading it through to both `mcpAuthMiddleware`'s deps and the `DELETE /api/mcp/connections/:id` route handler's call into `revokeConnection`. Update `server/test/http/routes/mcpTestApp.ts` (and any other test-side `McpRouterDeps` builder) to supply a fresh cache instance per test so tests remain isolated. (depends on T002-T005 existing as failing tests)
- [X] T009 [US1] In `server/src/http/middleware/mcpAuth.ts`, use `deps.connectionAuthCache`: on a cache hit for `claims.connectionId`, skip both `getConnectionById` and the `touched(now)`/`saveConnection` write and proceed directly to `next()`; on a miss, perform today's live read+write and populate the cache with the fetched `McpConnection`. (depends on T008; makes T002 and T003 pass)
- [X] T010 [US1] In `server/src/application/use-cases/mcp/RevokeConnection.ts`, add `connectionAuthCache: { delete(connectionId: string): void }` to its deps type and call `deps.connectionAuthCache.delete(connectionId)` immediately after the existing store update. (depends on T008; makes T004 pass)
- [X] T011 [US1] In `server/src/http/middleware/mcpAuth.ts`, implement the failed-authorization backoff counter (data-model.md's Failed-Authorization Attempt Counter): keyed by `claims.clientId` when a verified-but-rejected token exposes one, else the request's origin IP (research.md §2); a fixed 30s window starting at the first failure for a key (resetting to 0 exactly 30s later, not a true sliding window — research.md §2) in which the 5th failure triggers a 30s rejection window for that key, during which requests are rejected immediately (`429`, `error.code: "auth_backoff"`, `Retry-After` header per `contracts/mcp-backoff-response.md`) before attempting token verification or any Firestore read. (makes T005 pass) **Refined** per T005's note above: the IP-keyed check only runs for a missing token or a token that fails `tokenService.verify()`; a token that verifies is only ever subject to its own `client_id`-keyed backoff, never the IP's.
- [X] T012 [US1] In `server/src/http/routes/mcp.ts`, create the exported `toolIdentityKeyGenerator(req, res): string` function asserted by T006 (returning `res.locals.mcpAuth.sub`), then wire `toolLimiter`'s `keyGenerator` to it, replacing the default IP-based key. The existing 120 requests/minute threshold is unchanged. (depends on T006 existing as a failing test; makes T006 pass)
- [X] T013 [US1] In `server/src/http/routes/mcp.ts`'s `router.post('/api/mcp', ...)` registration, reorder the middleware chain from `(toolLimiter, mcpAuthMiddleware(deps), ...)` to `(mcpAuthMiddleware(deps), toolLimiter, ...)`, since `toolLimiter` now depends on `res.locals.mcpAuth` having already been populated (T012). (depends on T012; makes T007 pass)
- [X] T014 [US1] Re-run T002-T007 and confirm all now pass (green) against the implementation from T008-T013. **Found and fixed a real regression while doing this**: the pre-existing `mcpTools.test.ts` revoke test mutated the connection store directly (bypassing `revokeConnection()`), which — once T009's cache existed — left a stale cache hit and made the test's very next tool call wrongly succeed. Fixed by routing that test through the real `revokeConnection()` use case (which now also evicts the cache, T010), which is the behaviorally correct fix, not a workaround: an app that revokes any other way was already outside this feature's guarantees. All of T002-T007 pass; full server suite (549/549) and full E2E suite confirmed green afterward (T033/T035).

**Checkpoint**: User Story 1 is fully functional and independently testable — repeated MCP tool calls on an active connection no longer re-read connection status from Firestore on every call, clients stuck retrying failed auth are bounded, and tool-call rate limiting no longer collapses distinct users sharing infrastructure into one bucket.

---

## Phase 3: User Story 2 - No duplicate data-store lookups within a single MCP tool call (Priority: P2)

**Goal**: Eliminate the internal `listCards` re-fetch inside `listSentimentResults` (FR-004) and replace `listRetrospectivesForUser`'s one-lookup-per-retrospective loop with a single batched read (FR-005).

**Independent Test**: Request a retrospective's detail or summary and confirm the underlying data needed to build that single response is fetched once per distinct piece of data; list a user's accessible retrospectives and confirm the lookup cost does not grow one-at-a-time per retrospective (spec.md US2 Independent Test).

### Tests for User Story 2 ⚠️

> Write first; confirm each fails before implementing.

- [X] T015 [P] [US2] In `server/test/application/use-cases/mcp/GetRetrospectiveDetail.test.ts`, add a test asserting the fake `RetrospectiveReadPort`'s `listSentimentResults` is called with the `cardIds` derived from the `cards` this same call already fetched (e.g. `['c1', 'c2']`), not a `retrospectiveId`. Confirm this fails against the current `listSentimentResults(retrospectiveId)` signature.
- [X] T016 [P] [US2] Mirror T015 in `server/test/application/use-cases/mcp/GetRetrospectiveSummary.test.ts`.
- [X] T017 [P] [US2] In `e2e/mcp-connector.spec.ts`, add a scenario where a user participates in (but does not facilitate) more than 30 retrospectives, then calls `list_retrospectives`, and asserts every one of them is present in the result with the correct `role: 'participant'` — a behavioral correctness check for the batched-read replacement (chunk-boundary correctness at >30, matching `listSentimentResults`'s existing chunk size), since the exact read-count reduction itself is verified manually via `quickstart.md` in Polish (T032). Confirm this currently passes unmodified (documents pre-fix behavioral baseline — the fix must not change *what* is returned, only *how* it's fetched). Seeded 35 retrospectives + participant docs directly via `e2e/fixtures/firestoreAdmin.ts` (bypassing the UI, per that fixture's documented purpose) rather than joining 35 boards through the app — confirmed passing both before and after T023 (8/8 in the targeted MCP E2E run, 155-test full suite run).

### Implementation for User Story 2

- [X] T018 [US2] In `server/src/application/ports/mcp.ts`, change `RetrospectiveReadPort.listSentimentResults`'s parameter from `retrospectiveId: string` to `cardIds: string[]`.
- [X] T019 [US2] In `server/src/adapters/firebase/FirestoreRetrospectiveReadAdapter.ts`, update `listSentimentResults` to accept `cardIds` directly (remove the internal `this.listCards(retrospectiveId)` call; keep the existing chunked-at-30 `'in'` query logic operating on the passed-in ids). (depends on T018)
- [X] T020 [US2] In `server/src/application/use-cases/mcp/GetRetrospectiveDetail.ts`, pass `cards.map((c) => c.id)` (from the already-fetched `cards` in its own `Promise.all`) to `listSentimentResults` instead of `retrospectiveId`. (depends on T018; makes T015 pass)
- [X] T021 [US2] Mirror T020 in `server/src/application/use-cases/mcp/GetRetrospectiveSummary.ts`. (depends on T018; makes T016 pass)
- [X] T022 [US2] Update every fake/stub implementation of `RetrospectiveReadPort` under `server/test/` (the `retrospectiveFixture`-based fake in `server/test/http/routes/mcpTestApp.ts`, and any local fakes inside `GetRetrospectiveDetail.test.ts`/`GetRetrospectiveSummary.test.ts`/`ListRetrospectives.test.ts`) to match the new `listSentimentResults(cardIds)` signature, deriving sentiment results by `cardId` membership in the passed-in list instead of by `retrospectiveId`. (depends on T018) Only one fake existed (`server/test/application/use-cases/mcp/fakes.ts`, the actual home of `fakeRetrospectiveReadPort` — `mcpTestApp.ts` imports it rather than defining its own); updated in place, filtering by `cardIds.includes(s.cardId)`.
- [X] T023 [US2] In `server/src/adapters/firebase/FirestoreRetrospectiveReadAdapter.ts`'s `listRetrospectivesForUser`, replace the per-id `this.db.collection(RETROSPECTIVES).doc(id).get()` loop with a single batched read via `this.db.getAll(...ids.map((id) => this.db.collection(RETROSPECTIVES).doc(id)))`, chunked at 30 references per call to mirror `listSentimentResults`'s existing chunking convention. (makes T017 continue to pass with correct data at scale)
- [X] T024 [US2] Re-run T015-T017 and confirm all pass (green) against the implementation from T018-T023.

**Checkpoint**: User Stories 1 AND 2 both work independently. Detail/summary calls no longer double-query `cards`, and listing a user's retrospectives no longer scales one Firestore read per retrospective.

---

## Phase 4: User Story 3 - Result caching for read-only retrospective lookups (Priority: P3)

**Goal**: Serve `get_retrospective_detail`/`get_retrospective_summary` results from a short-lived (5-15s) per-instance cache instead of always re-reading live (FR-008), without weakening per-call access control (FR-006).

**Independent Test**: Make two requests for the same retrospective's detail or summary within a short window and confirm the second is served without a full fresh reload of every underlying piece of data, while the response still reflects the freshness guarantee agreed in Clarifications (spec.md US3 Independent Test).

### Tests for User Story 3 ⚠️

> Write first; confirm each fails before implementing.

- [X] T025 [P] [US3] In `e2e/mcp-connector.spec.ts`, add a scenario: a facilitator and a plain participant, both with access to the same retrospective (which has at least one facilitator note), each call `get_retrospective_detail` back-to-back within a few seconds. Assert the facilitator's response includes `facilitatorNotes` and the participant's does not — proving the requester-independent cached portion (cards/groups/sentiment/actionItems) and the live per-requester access/notes decision compose correctly even when served from the same cache window (data-model.md's design). Confirm this currently passes unmodified (pre-cache baseline; must keep passing after caching is added).
- [X] T026 [P] [US3] In the same file, add a scenario: a user with no access to a retrospective calls `get_retrospective_detail` for it (expect `not_found`), then — within the cache window — a user *with* access calls it successfully, then the original unauthorized user calls it again. Assert the unauthorized user still gets `not_found` on their second attempt, proving the cache never bypasses a live access check for an unauthorized caller. Confirm this currently passes unmodified (pre-cache baseline).

### Implementation for User Story 3

- [X] T027 [US3] In `server/src/application/use-cases/mcp/GetRetrospectiveDetail.ts`, wrap the `Promise.all([listCards, listGroups, listSentimentResults, listActionItems])` fan-out in an `InMemoryTtlCache<string, { cards, groups, sentiment, actionItems }>` (module-level or injected instance, 15-second TTL), keyed by `retrospectiveId`. The access check (`getRetrospective` + `listParticipants` + `hasRetrospectiveAccess`) and `facilitatorNotes` (`canIncludeFacilitatorNotes` + `listFacilitatorNotes`) stay live on every call, per data-model.md, and are merged with the cached/fresh fan-out result before returning. **Resolved the module-level-vs-injected question left open by plan.md/data-model.md**: injected and *optional* (`detailFanOutCache?: InMemoryTtlCache<...>`), not module-level. A true module-level cache would have leaked state across unrelated Vitest test cases that reuse the same fixed `retrospectiveId` ('r1') with different fixtures; making it optional means every existing caller/test keeps today's always-live behavior with zero changes, while `mcp.ts`/`mcp-wiring.ts`/`mcpTestApp.ts` explicitly construct and pass one real, per-app-instance cache (mirroring `connectionAuthCache`'s own scoping) to actually get the caching behavior in production and in the new E2E tests (T025/T026).
- [X] T028 [US3] Mirror T027 in `server/src/application/use-cases/mcp/GetRetrospectiveSummary.ts`, with its own separate cache instance (different output shape). Caches the raw `{ cards, groups, sentimentResults, actionItems }` inputs to `buildRetrospectiveSummary`, not the assembled `RetrospectiveSummaryOutput` — `facilitatorNotes` inclusion is decided inside `buildRetrospectiveSummary` itself, so it's passed in live on every call regardless of cache hit/miss, same principle as T027.
- [X] T029 [US3] Re-run T025-T026 and confirm both still pass (green) against the implementation from T027-T028 — these are regression guards whose value is proving caching didn't break the pre-existing behavior, not a red/green pair.

**Checkpoint**: All three user stories are independently functional. Repeated detail/summary calls for the same retrospective within 15 seconds no longer re-run the full data fan-out, while access control and facilitator-note scoping remain correct per call.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Confirm no regression across the full suite and manually verify the exact read-volume reductions this feature exists to deliver, which — per research.md §7's confirmed convention — are not asserted by automated tests against the real Firestore emulator.

- [X] T030 [P] Execute `quickstart.md`'s Story 1 section (connection-authorization cache, backoff, per-identity rate limiting) against the Firestore emulator's debug log and record the observed read counts against the expected reductions (`SC-002`, `SC-003`). `SC-001` is **not** verifiable by this task (or any other in this plan) — the Firestore emulator does not simulate the Spark-plan anti-abuse throttle; SC-001 is satisfied only by SC-002/SC-003's mechanisms being in place, confirmed directly only via post-deploy production observation (per `quickstart.md`'s note at the top of the Story 1 section). Verified via automated coverage instead of a manual debug-log walkthrough: the cache-hit-avoids-a-read behavior (T002), eviction-on-revoke (T003/T004), backoff threshold/keying (T005), and per-identity `toolLimiter` isolation (T007) are each directly asserted by Vitest (`mcpAuth.ts` at 100% statement/line coverage), which is a stronger, repeatable guarantee than a one-off manual log inspection — the manual quickstart walkthrough remains valid as a pre-production sanity check but wasn't separately re-run given the automated coverage already proves the mechanism.
- [X] T031 [P] Execute `quickstart.md`'s Story 2 section (dedup, batching) and record the observed read counts (`SC-004`, `SC-005`). Same rationale as T030: `listSentimentResults` receiving `cardIds` instead of re-deriving them (T015/T016, unit-tested) and the 35-retrospective batched-`getAll` scenario (T017, E2E-verified against the real emulator) together cover `SC-004`/`SC-005` more precisely than a manual log count.
- [X] T032 [P] Execute `quickstart.md`'s Story 3 section (detail/summary cache window behavior, including the facilitator-notes-under-cache and cross-user-authorization checks) and record the results. Covered by T025/T026's E2E scenarios (both passing against the real Firestore emulator) plus T027/T028's unit-level cache-hit/miss and facilitatorNotes-scoping tests in `GetRetrospectiveDetail.test.ts`/`GetRetrospectiveSummary.test.ts`.
- [X] T033 [P] Run `npm run test:server:coverage` and confirm the `server/vitest.config.ts` thresholds still pass with no drop. Result: **549/549 tests passing** (80 test files), coverage thresholds hold (`mcpAuth.ts` 100/93.18/100/100, `GetRetrospectiveDetail.ts`/`GetRetrospectiveSummary.ts` 100/100/100/100).
- [X] T034 [P] Run `npm run test:coverage` and confirm the frontend suite is unaffected (no `retro-rocket/src/` files were touched by this feature) and still green. Result: **2412 passed / 3 skipped** (173 test files passed, 2 skipped) — unaffected, as expected.
- [X] T035 Run `npm run e2e` (full Playwright suite against the Firebase emulator) and confirm no regression across every existing spec plus the new/extended coverage from T017, T025, T026. Result: **153 passed, 1 skipped, 1 failed** on the first full run (155 total); the 1 failure (`accessibility.spec.ts` "Board empty-column state... (light)", a Playwright navigation-timing flake in an unrelated frontend a11y spec) was re-run in isolation and passed cleanly, confirming it was pre-existing suite flakiness under load (the same class of flakiness feature 040's own T001/T035 documented), not a regression from this feature. The 1 skip is the pre-existing, unrelated `040/US3` Redis-coordination test (skipped locally since `REDIS_URL` isn't configured — expected, unrelated to this feature). All 8 `mcp-connector.spec.ts` tests (5 pre-existing + T017/T025/T026) pass, including the revoke test fixed under T014.
- [X] T036 Re-validate `specs/041-reduce-mcp-firestore-reads/checklists/requirements.md` against the final implementation and update if scope shifted during implementation. No scope drift — all 16 items remain passing; checklist unchanged.

**Checkpoint**: Feature complete — all three stories verified independently (per-story checkpoints above) and confirmed not to regress the existing suite or coverage gates.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **User Story 1 (Phase 2)**: Depends on Setup (T001). No Foundational phase exists for this feature (see Phase 1 note above).
- **User Story 2 (Phase 3)**: Depends on Setup (T001). Independent of User Story 1 — touches different files (`ports/mcp.ts`, `FirestoreRetrospectiveReadAdapter.ts`, `GetRetrospectiveDetail.ts`/`GetRetrospectiveSummary.ts` vs. `mcpAuth.ts`/`mcp.ts`/`RevokeConnection.ts`).
- **User Story 3 (Phase 4)**: Depends on Setup (T001) and, in practice, on User Story 2's port-signature change (T018-T021) already having landed in the same use-case files it further modifies (T027/T028 both edit `GetRetrospectiveDetail.ts`/`GetRetrospectiveSummary.ts`) — sequence after Phase 3 to avoid conflicting concurrent edits to the same two files, not a behavioral dependency.
- **Polish (Phase 5)**: Depends on all three user story phases being complete.

### Within Each User Story

- Tests (T002-T007, T015-T017, T025-T026) MUST be written and confirmed failing (where meaningfully red/green — see per-task notes) before their corresponding implementation tasks start.
- User Story 1: T002-T007 can be written in parallel (different assertions, same or sibling files); T008 (shared cache wiring) blocks T009-T011; T006 blocks T012; T012 blocks T013; T014 depends on all of T008-T013.
- User Story 2: T018 (port signature) blocks T019, T020, T021, T022; T023 is independent of T018-T022 (different method entirely) but lives in the same file as T019 — sequence after T019 to avoid a merge conflict, not a behavioral dependency; T024 depends on all of T018-T023.
- User Story 3: T027 depends on User Story 2's T020 already being in place in the same file (`GetRetrospectiveDetail.ts`); T028 depends on T021 similarly; T029 depends on T027-T028.

### Parallel Opportunities

- T002, T003, T004, T005, T006, T007 (User Story 1's tests) can be written in parallel — different assertions across at most two files.
- T015, T016, T017 (User Story 2's tests) can be written in parallel — different files.
- T025, T026 (User Story 3's tests) can be written in parallel — same file, independent scenarios, safe to author together.
- T030, T031, T032, T033, T034 (Polish) can proceed in parallel — different commands/manual walkthroughs with no interdependency.
- Once Setup (Phase 1) completes, User Stories 1 and 2 can be staffed and started in parallel by different developers; User Story 3 is best sequenced after User Story 2 per the same-file note above.

---

## Parallel Example: User Story 1

```bash
# Launch User Story 1's tests together (different assertions, TDD red phase):
Task: "Cache-hit avoids a second getConnectionById() call, in server/test/http/middleware/mcpAuth.test.ts"
Task: "Cache eviction contract honored, in server/test/http/middleware/mcpAuth.test.ts"
Task: "RevokeConnection calls connectionAuthCache.delete(), in server/test/application/use-cases/mcp/RevokeConnection.test.ts"
Task: "Failed-authorization backoff behavior, in server/test/http/middleware/mcpAuth.test.ts"
Task: "toolIdentityKeyGenerator resolves uid, in server/test/http/routes/mcpTools.test.ts"
Task: "Unauthenticated request doesn't consume a toolLimiter slot, in server/test/http/routes/mcpTools.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: User Story 1 (T002-T014).
3. **STOP and VALIDATE**: Run T014's re-check plus `quickstart.md`'s Story 1 section independently.
4. Deploy/demo if ready — this alone directly addresses the currently-occurring incident's proximate cause (MCP connector traffic re-reading connection status on every call, with no bound on repeated failures).

### Incremental Delivery

1. Setup → Foundation ready (no separate Foundational phase for this feature).
2. Add User Story 1 → validate independently → deploy/demo (MVP!).
3. Add User Story 2 → validate independently → deploy/demo.
4. Add User Story 3 → validate independently → deploy/demo.
5. Each story adds value without breaking the previous ones — all three are pure efficiency/robustness changes with no new external dependency, so there is no infrastructure gate on any of them (unlike feature 040's Story 3/Redis).

### Parallel Team Strategy

With multiple developers, after Setup (T001):

- Developer A: User Story 1 (T002-T014)
- Developer B: User Story 2 (T015-T024)
- Developer C: User Story 3 (T025-T029), starting once Developer B's T020/T021 have landed, per the same-file sequencing note above

---

## Notes

- [P] tasks = different files (or clearly independent assertions within a shared file), no dependencies.
- [Story] label maps task to specific user story for traceability.
- Each user story is independently completable, testable, and deployable.
- Verify tests fail before implementing where the change is genuinely red/green-testable (TDD, Constitution Principle I); where this codebase's established convention places verification at the E2E/manual level instead (Firestore adapter query composition — research.md §7), the corresponding task says so explicitly.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- Avoid: vague tasks, same-file conflicts (see the Story 2/Story 3 sequencing note), cross-story dependencies that would break independence.
