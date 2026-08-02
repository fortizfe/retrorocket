---

description: "Task list template for feature implementation"
---

# Tasks: Fix MCP Connections Always Resolving as Rejected

**Input**: Design documents from `/specs/025-fix-mcp-connection-rejection/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/token-rate-limit-delta.md, quickstart.md (all present)

**Tests**: Per the project constitution (Principle I, TDD — NON-NEGOTIABLE), tests are included and MUST be written and confirmed failing before their corresponding implementation task. This holds for T002–T005 (Foundational), which genuinely fail against the pre-fix code. T012–T015 and T017–T019 (User Story 1 and 2 phases) are a documented exception, mirroring the pattern established in `specs/023-fix-mcp-connection-management/tasks.md` and `specs/024-fix-mcp-connection-status/tasks.md`: because the Foundational phase (T006–T011) already implements the fix both stories rely on, these scenario-level and regression-guard tests are expected to pass immediately when first written — there is no red phase for them, and that is expected, not a sign of a missing implementation step.

**Organization**: Tasks are grouped by user story (from spec.md: US1 = P1 "connecting an AI client actually succeeds", US2 = P1 "reconnecting a revoked connection works through the normal flow") to enable independent implementation and testing of each story. Both stories exercise the same underlying fix — the `POST /api/mcp/token` rate-limit key resolver — so that shared mechanism is built and unit/route-tested once in the Foundational phase; each story's phase then proves its own spec.md acceptance scenarios end-to-end on top of it. All file paths are relative to `retro-rocket/` (the repo's single npm package).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2) — omitted for Setup/Foundational/Polish

## Path Conventions

Single-package monorepo: backend at `server/src/` (hexagonal: `http/routes`, `http/middleware`, `application/use-cases`, `application/ports`, `adapters/observability`) with tests at `server/test/`; E2E specs at `e2e/`. Paths below are exact, confirmed against the existing codebase.

---

## Phase 1: Setup

**Purpose**: Confirm the environment is ready. No new dependencies or scaffolding are required for this fix (per plan.md's Technical Context — no new library, no new collection, no new domain entity).

- [X] T001 Confirm branch `025-fix-mcp-connection-rejection` is checked out, `npm install` is up to date, and the existing baseline passes: `npm run test:server` green before making any change — no code changes in this task.

**Checkpoint**: Environment confirmed; no new setup needed before foundational/user-story work begins.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Both User Story 1 and User Story 2 exercise the identical `POST /api/mcp/token` code path (an `authorization_code` or `refresh_token` grant going through `tokenLimiter`), so the actual fix — resolving the request's real `uid` instead of trusting `req.ip` — is genuinely shared groundwork, mirroring how `024-fix-mcp-connection-status`'s Phase 2 held its shared `'failed'`-status foundation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests (write first; confirm FAIL before implementation)

- [X] T002 [P] Add a failing test in `server/test/http/routes/mcpToken.test.ts`'s `describe('tokenLimiter ...')` block: mint two distinct users' authorization codes (e.g. `client()`-registered client, two different `sessionCookieFor` uids via `issuedCode`-style helpers) and send 61 `POST /api/mcp/token` requests for **user A** — reusing user A's same, single authorization code across all 61 (`getAuthorizationRequest` resolves `uid` from the record regardless of whether it has already been consumed, so reuse is sufficient to exhaust user A's own bucket; no need to mint 61 distinct codes here, unlike T003) — all with the same `X-Forwarded-For`, then send **user B**'s first, single request for their own valid code with that same `X-Forwarded-For` — assert user B's request does **not** return `429` (research.md §1/§2 — the direct regression test for "always rejected").
- [X] T003 [P] Add a failing test in the same block: a single resolvable user sends 61 `POST /api/mcp/token` requests, each referencing a freshly-minted authorization code belonging to that same user (`getAuthorizationRequest` resolves each to the same `uid` without consuming it, so many distinct codes for one user are usable here), all from **different** `X-Forwarded-For` values each time — assert the 61st still returns `429` (per-`uid` protection is preserved, not removed, per Clarification Q1; proves the key is genuinely `uid`-based, not IP-based, since varying the IP does not evade it).
- [X] T004 [P] Add a failing test in the same block asserting `res.body` on a `429` triggered by the T003 scenario still matches the existing `ApiErrorBody` envelope (`{ error: { code: 'rate_limited', message }, correlationId }`) — confirms the envelope contract (contracts/token-rate-limit-delta.md) is unchanged by the rescoping.
- [X] T005 [P] Add a `fakeMetrics()` helper to `server/test/application/use-cases/mcp/mcpFakes.ts` returning a `MetricsPort` whose `increment`/`timing` are `vi.fn()`; wire it as the default `deps.metrics` in `server/test/http/routes/mcpTestApp.ts` (respecting `options.overrides`, same pattern as every other dep in that file). Then add a failing test in `mcpToken.test.ts`: trigger a `429` via the T003 scenario (resolvable identity) and assert `metrics.increment` was called with `('mcp.token.rate_limited', { keyType: 'uid' })`; trigger a `429` via a bogus/unresolvable code repeated 61 times from one IP (existing scenario) and assert it was called with `keyType: 'ip'`; assert `metrics.increment` is **not** called on a successful (`200`) exchange.

### Implementation

- [X] T006 Export `hashRefreshToken` from `server/src/application/use-cases/mcp/ExchangeMcpToken.ts` (currently a private module-level function) so it has one single source of truth and can be reused by the new key resolver without duplication.
- [X] T007 In `server/src/http/routes/mcp.ts`, add an async `mcpTokenKeyGenerator(deps: { connectionStore: McpConnectionStorePort }, req, res)` function: for `body.grant_type === 'authorization_code'` with a non-empty `body.code`, call `deps.connectionStore.getAuthorizationRequest(code)` (non-consuming) and, if found, set `res.locals.mcpRateLimitKeyType = 'uid'` and return `` `mcp-uid:${record.uid}` ``; for `body.grant_type === 'refresh_token'` with a non-empty `body.refresh_token`, hash it with the now-exported `hashRefreshToken` and call `deps.connectionStore.getConnectionByRefreshTokenHash(hash)`, same pattern keyed on `connection.data.uid`; otherwise (or if lookup returns null), set `res.locals.mcpRateLimitKeyType = 'ip'` and return `` `ip:${ipKeyGenerator(req.ip ?? 'unknown')}` `` (import `ipKeyGenerator` from `express-rate-limit`, mirroring `rateLimiting.ts:35`). Wire this as `tokenLimiter`'s `keyGenerator` option. Depends on T006. Makes T002 and T003 pass.
- [X] T008 Add `metrics: MetricsPort` to the `McpRouterDeps` interface in `mcp.ts` (import `MetricsPort` from `../../application/ports/observability`). Depends on T007.
- [X] T009 Update `tokenLimiter`'s `handler` in `mcp.ts` to also call `deps.metrics.increment('mcp.token.rate_limited', { keyType: res.locals.mcpRateLimitKeyType ?? 'ip' })` before responding — makes T005 pass. Depends on T008 (needs `metrics` on `McpRouterDeps`, and `res.locals.mcpRateLimitKeyType` to be set by the key generator on the same request).
- [X] T010 Update `buildMcpDeps` in `server/src/http/mcp-wiring.ts`: add a `metrics: MetricsPort` parameter and include it in the returned `McpRouterDeps` object. Depends on T008.
- [X] T011 Update `server/src/http/composition-root.ts`'s call to `buildMcpDeps(...)` to pass `observability.metrics` as the new argument. Depends on T010.

**Checkpoint**: The per-`uid` rate-limit key resolver and its metric are fully implemented and unit/route-tested — both User Story 1 and User Story 2 can now build their end-to-end scenario tests on top of it.

---

## Phase 3: User Story 1 - Connecting an AI client actually succeeds (Priority: P1) 🎯 MVP

**Goal**: A user completing the standard authorize → consent → token-exchange flow for an AI client for the first time gets a working, accepted connection — even when another user's traffic through the same AI client (same apparent IP) is present in the same 15-minute window. Explicit consent denial and genuinely invalid requests are unaffected and still resolve as rejected.

**Independent Test**: Drive a full authorize → consent → token-exchange sequence for a never-before-connected client while another (different) user's traffic saturates what would have been a shared IP bucket, and confirm the exchange still succeeds (`200`, working access token). Separately, confirm an explicit-deny flow and a genuinely invalid token request are both still rejected.

### Tests for User Story 1 (write first; confirm FAIL before implementation)

- [X] T012 [P] [US1] Add a failing test in `server/test/http/routes/mcpToken.test.ts`: using the existing `issuedCode(app)` helper for **user A**, exhaust a shared IP bucket with 60 unrelated (e.g. bogus-code, unresolvable) requests from `X-Forwarded-For: '203.0.113.60'`, then complete a full, fresh authorize → consent → token-exchange sequence for **user B** using that same `X-Forwarded-For` and assert it returns `200` with a working `access_token`/`refresh_token` — the end-to-end version of T002, driven through the real authorize/consent flow rather than directly-minted codes (spec.md US1 Acceptance Scenario 1).
- [X] T013 [P] [US1] Add a failing test in the same file covering spec.md US1 Acceptance Scenario 2: complete one full token exchange for a user, then immediately start and complete a **second**, independent authorize → consent → token-exchange sequence for the same user shortly after, both under simulated shared-IP load (as in T012) — assert the second exchange also succeeds and is not rejected because of the earlier, already-completed one.
- [X] T014 [US1] Extend `e2e/mcp-connector.spec.ts`: simulate a second registered client/session completing its own authorize → consent → token-exchange sequence concurrently with (or immediately before) the existing single-user flow, and confirm both end up with working, active connections — the browser-level regression test for the reported bug.
- [X] T015 [US1] Regression guard (expected to already pass — see the note under **Tests** at the top of this file): confirm `server/test/http/routes/mcpAuthorize.test.ts`'s existing `'denying redirects with access_denied and creates no connection'` test, and `server/test/application/use-cases/mcp/ExchangeMcpToken.test.ts`'s existing `InvalidGrantError` cases (reused code, expired code, redirect_uri mismatch, PKCE mismatch), all still pass unmodified after T007's key-resolver change. These are the only tasks in this feature that verify spec.md US1 Acceptance Scenarios 3 & 4 (explicit consent denial, and genuinely invalid/expired/malformed requests, still resolve as rejected) and the matching exception clauses in FR-002/FR-005 — neither path is touched by T006–T011, but nothing else in this task list re-runs them explicitly.

### Implementation for User Story 1

- [X] T016 [US1] Verification checkpoint, no new implementation expected: run T012–T015 against the Foundational implementation in `server/src/http/routes/mcp.ts`; if any fail, fix the key resolver or `handler` in that file before proceeding (User Story 1 is fully satisfied by the Foundational phase, T006–T011).

**Checkpoint**: User Story 1 is fully functional and independently testable/shippable as the complete "connections always rejected" fix for first-time connections, proven at the route and browser-E2E levels under the exact shared-IP condition that caused the original bug.

---

## Phase 4: User Story 2 - Reconnecting a revoked connection works through the normal flow (Priority: P1)

**Goal**: A user who previously revoked an AI client's access can reconnect it by performing the standard connection flow again — and this keeps working even under the same shared-IP contention that Phase 3 proved User Story 1 is now immune to. The newly re-established connection is genuinely usable, and repeated revoke/reconnect cycles each succeed independently.

**Independent Test**: Revoke an existing connection, then, under simulated shared-IP load from another user's traffic, start a brand-new authorization attempt for the same client and confirm it completes and results in a working, accepted connection that can make a real MCP tool call.

### Tests for User Story 2 (write first; confirm FAIL before implementation)

- [X] T017 [P] [US2] Add a failing test in `server/test/http/routes/mcpToken.test.ts`, extending the existing "a fresh reconnection after revoking a prior connection succeeds" test: run it under simulated shared-IP load (60 unrelated requests from the same `X-Forwarded-For` immediately before the revoke-then-reconnect sequence, as in T012) and assert the reconnection's token exchange still returns `200` (spec.md US2 Acceptance Scenario 1).
- [X] T018 [P] [US2] Add a failing test in the same file covering spec.md US2 Acceptance Scenario 3: revoke and reconnect the same client **three times** in quick succession (each under the same simulated shared-IP load), and assert every reconnection attempt independently returns `200` with a new, distinct `active` connection — none of them rejected because of the earlier cycles.
- [X] T019 [US2] Extend `e2e/mcp-connector.spec.ts`'s existing revoke-then-reconnect test: after the reconnection succeeds, make a real MCP tool call (`POST /api/mcp` with `list_retrospectives`) using the freshly issued access token and confirm it succeeds (`200`) — proves the reconnection is genuinely usable end-to-end (spec.md US2 Acceptance Scenario 2), while the shared-IP condition from T017/T018 is present.

### Implementation for User Story 2

- [X] T020 [US2] Verification checkpoint, no new implementation expected: run T017–T019 against the Foundational implementation in `server/src/http/routes/mcp.ts`; if any fail (e.g. in how `getConnectionByRefreshTokenHash`/`getAuthorizationRequest` behave across multiple revoke/reconnect cycles for the same user), fix it in that file before proceeding (User Story 2 is fully satisfied by the Foundational phase, T006–T011).

**Checkpoint**: Both User Story 1 and User Story 2 are independently functional — a user can connect for the first time or reconnect after a revoke, and neither is ever erroneously rejected due to another user's or an earlier attempt's activity.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verify the feature end-to-end against the project's quality gates before calling it done.

- [X] T021 [P] Run `npm run test:server:coverage`; confirm it stays ≥ 80% branches/functions/lines/statements (Constitution VI — no lowering the threshold) across every file touched by this feature (`mcp.ts`, `mcp-wiring.ts`, `composition-root.ts`, `ExchangeMcpToken.ts`).
- [X] T022 [P] Explicitly run `server/test/architecture/domain-isolation.test.ts` and `server/test/architecture/mcp-read-only.test.ts`; confirm both still pass unmodified — this feature must not regress either gate (plan.md Constraints; no domain-layer change is introduced).
- [X] T023 Confirm `toolLimiter` (`POST /api/mcp`) and every other rate limiter are unchanged — run `server/test/http/routes/mcpTools.test.ts` and `server/test/http/middleware/rateLimiting.test.ts` and confirm no regression (plan.md's explicit "toolLimiter unchanged" scope boundary, research.md §2).
- [X] T024 Walk through `quickstart.md` §1–§6 manually against the real dev stack + Firestore emulator, including the observability spot-check in §5 (confirm the `mcp.token.rate_limited` metric line appears with the correct `keyType` for both a resolvable-user throttle and a garbage-request throttle, and does not appear on success).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS both user stories (T006 → T007 → T008 → T009 → T010 → T011 is a strict chain; T002–T005 can be written in parallel with each other before that chain).
- **User Stories (Phase 3, 4)**: Both depend only on Foundational phase completion, not on each other — they can proceed in parallel (if staffed) or sequentially in priority order. Both are P1; User Story 1 is suggested first since it is the simpler, more general case (a first-time connection), and User Story 2 layers the revoke/reconnect scenario on top of the same, already-proven mechanism.
- **Polish (Phase 5)**: Depends on both user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependency on User Story 2.
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) — no dependency on User Story 1 (its tests reuse the same `mcpToken.test.ts` file and the existing revoke-then-reconnect test as a base, but do not require Phase 3's tasks to have landed first).

### Within Each User Story

- Tests (T012/T013, T017/T018) MUST be written before any implementation task in that phase; per the exception documented under **Tests** at the top of this file, they are expected to already pass once Foundational is done, not fail (T016, T020 — expected to be no-ops, but must still be checked).
- T015 (US1's regression guard) and its implicit US2 equivalent (re-covered by T021's full-suite run) are expected to already pass — same documented exception.
- E2E test (T014, T019) can follow the route-level tests in the same phase.
- Story complete before moving to Polish.

### Parallel Opportunities

- T002, T003, T004, T005 (Foundational tests) can be written in parallel — different assertions within the same describe block, but no shared mutable state between them.
- Once Foundational (Phase 2) is fully merged, T012/T013/T015 (US1) and T017/T018 (US2) can be written in parallel by different people, since both only read the already-completed Foundational implementation.
- T021, T022 (Polish) can run in parallel.

---

## Parallel Example: Foundational tests

```bash
# Launch all Foundational test-writing together (before any implementation):
Task: "Two different users sharing an IP are isolated in server/test/http/routes/mcpToken.test.ts"
Task: "One user's own excessive activity is still throttled in server/test/http/routes/mcpToken.test.ts"
Task: "429 envelope shape unchanged in server/test/http/routes/mcpToken.test.ts"
Task: "429 emits the correct mcp.token.rate_limited metric in server/test/http/routes/mcpToken.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — this is where the actual fix lives)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently (quickstart.md §2, §4)
5. Deploy/demo if ready — this alone already fixes "always rejected" for first-time connections

### Incremental Delivery

1. Complete Setup + Foundational → the core rate-limit fix and its metric are ready and proven at the route level.
2. Add User Story 1 → test independently → deploy/demo (MVP! — fixes the most commonly reported case).
3. Add User Story 2 → test independently → deploy/demo (closes the revoke/reconnect case explicitly called out in the bug report).
4. Each story adds end-to-end/E2E confidence without changing the underlying fix.

---

## Notes

- [P] tasks = different files or independent assertions, no dependencies.
- [Story] label maps task to specific user story for traceability.
- Both user stories share one implementation (Foundational); this is expected and documented, not a process violation — the split exists to keep each story's spec.md acceptance scenarios independently verifiable, not because the code itself splits.
- Verify tests fail before implementing for T002–T005 only. T012/T013/T015, T017/T018 are the documented exception (see **Tests** at the top of this file) and are expected to already pass once Foundational (T006–T011) is done.
- Commit after each task or logical group.
- Stop at any checkpoint to validate story independently.
