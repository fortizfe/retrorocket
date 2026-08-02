---

description: "Task list template for feature implementation"
---

# Tasks: Fix MCP Connection Status Reporting and Reconnection Flow

**Input**: Design documents from `/specs/024-fix-mcp-connection-status/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/connection-status-delta.md, quickstart.md (all present)

**Tests**: Per the project constitution (Principle I, TDD — NON-NEGOTIABLE), tests are included and MUST be written and confirmed failing before their corresponding implementation task. One task (T017) is a documented exception: it is a regression-guard test for behavior that already exists and passes today — it still lands as a test, just without a red phase, mirroring the documented exception pattern from `specs/023-fix-mcp-connection-management/tasks.md`.

**Organization**: Tasks are grouped by user story (from spec.md: US1 = P1 "failed connections never look successful", US2 = P1 "reconnecting after a revoke actually works", US3 = P2 "automated coverage for this part of the app") to enable independent implementation and testing of each story. All file paths are relative to `retro-rocket/` (the repo's single npm package).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2, US3) — omitted for Setup/Foundational/Polish

## Path Conventions

Single-package monorepo: backend at `server/src/` (hexagonal: `http/routes`, `http/middleware`, `application/use-cases`, `application/ports`, `domain/mcp`, `adapters/firebase`) with tests at `server/test/`; frontend at `src/` with tests at `src/test/`; E2E specs at `e2e/`. Paths below are exact, confirmed against the existing codebase.

---

## Phase 1: Setup

**Purpose**: Confirm the environment is ready. No new dependencies, tooling, or scaffolding are required for this fix (per plan.md's Technical Context — no new library, no new collection, no new port method).

- [X] T001 Confirm branch `024-fix-mcp-connection-status` is checked out, `npm install` is up to date, and the existing baseline passes: `npm run test:server` and `npm run test:run` both green before making any change — no code changes in this task.

**Checkpoint**: Environment confirmed; no new setup needed before foundational/user-story work begins.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The new `'failed'` terminal status and `failedAt` field on `McpConnection` (data-model.md) are required by **both** User Story 1 (`ListConnections`'s lazy-expiry) and User Story 2 (`ExchangeMcpToken`'s explicit-signal marking) — this is genuinely shared groundwork, unlike 023 where nothing was shared between its two stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests (write first; confirm FAIL before implementation)

- [X] T002 [P] Add failing test cases in `server/test/domain/mcp/McpConnection.test.ts`: `.failed(nowSeconds)` transitions a `'pending'` connection to `status: 'failed'` with `failedAt` set to `nowSeconds`; calling `.failed(nowSeconds)` on an `'active'`, `'revoked'`, or already-`'failed'` connection is a no-op (returns the connection unchanged, including its original `failedAt`/`revokedAt`) — mirrors the existing `.revoked()` idempotency tests in the same file.
- [X] T003 [P] Add failing test cases in `server/test/adapters/firebase/FirestoreMcpConnectionAdapter.test.ts`'s `describe('hydrateConnectionData', ...)` block: a legacy document with no `failedAt` key at all (not `null`, genuinely absent, matching the file's existing `legacyDoc` fixture) is hydrated with `failedAt: null`; a document with `failedAt` already present is preserved unchanged.

### Implementation

- [X] T004 Update `server/src/domain/mcp/McpConnection.ts`: add `'failed'` to `McpConnectionStatus`, add `failedAt: number | null` to `McpConnectionData` (and to `createPending`'s constructed record, initialized to `null`), and add `failed(nowSeconds: number): McpConnection` — `pending → failed` setting `failedAt`, no-op for any other current status — makes T002 pass.
- [X] T005 Update `server/src/adapters/firebase/FirestoreMcpConnectionAdapter.ts`'s `hydrateConnectionData` to backfill `failedAt: raw.failedAt ?? null`, the same defensive pattern already used for `origin`/`lastUsedAt` — makes T003 pass. Depends on T004 (the `McpConnectionData` type must include `failedAt` first).

**Checkpoint**: `'failed'` status foundation ready — both User Story 1 and User Story 2 can now build on it independently.

---

## Phase 3: User Story 1 - Failed connection attempts never look successful (Priority: P1) 🎯 MVP

**Goal**: `GET /api/mcp/connections` never includes a connection attempt that hasn't fully and successfully completed — neither a fresh, still-in-progress `'pending'` attempt, nor one that has gone stale past its authorization-code window, nor one explicitly marked `'failed'` — and this holds even when a genuinely active connection for the same AI client exists side by side with it. A stale `'pending'` connection is durably persisted as `'failed'` the first time it's encountered, which also migrates any already-stuck records from before this fix shipped (FR-009), with no separate script.

**Independent Test**: Seed a `'pending'` connection aged past `MCP_AUTHORIZATION_REQUEST_TTL_SECONDS`, call `listConnections`/`GET /api/mcp/connections`, and confirm it is excluded from the result AND persisted as `'failed'` afterward. Seed a fresh (just-created) `'pending'` connection and confirm it is also excluded from the result but left untouched in storage (not yet `'failed'`). Seed one active and one stale-pending connection for the same client and confirm only the active one is affected/returned.

### Tests for User Story 1 (write first; confirm FAIL before implementation)

- [X] T006 [P] [US1] Add a failing test case in `server/test/application/use-cases/mcp/ListConnectionsAndRevoke.test.ts`'s `describe('listConnections', ...)` block: seed a `'pending'` connection created "now" (via `McpConnection.createPending`, no `.activated()`), call `listConnections({ connectionStore, clock: fixedClock() }, 'u1')`, and assert it is excluded from the result AND that `connectionStore.getConnectionById(...)` still reports `status: 'pending'` afterward (untouched — too young to expire).
- [X] T007 [P] [US1] Add a failing test case in the same `describe('listConnections', ...)` block: seed a `'pending'` connection with `createdAt` set far enough in the past that it's older than `MCP_AUTHORIZATION_REQUEST_TTL_SECONDS` relative to the clock passed in, call `listConnections`, and assert it is excluded from the result AND that `connectionStore.getConnectionById(...)` now reports `status: 'failed'` with `failedAt` set — the lazy-expiry-and-persist behavior (FR-008b, FR-009).
- [X] T008 [P] [US1] Add a failing test case in the same `describe('listConnections', ...)` block covering spec.md's US1 Acceptance Scenario 2 / FR-003: seed one `'active'` connection **and** one stale (past-TTL) `'pending'` connection for the **same** `uid` and **same** `clientId`, call `listConnections`, and assert the result contains only the active connection, and that the stale pending one is independently transitioned to `'failed'` in storage without altering the active connection's fields (mirrors the existing same-client-isolation pattern already established for `revokeConnection` in this file).
- [X] T009 [P] [US1] Add a failing test case in `server/test/http/routes/mcpConnections.test.ts`'s `describe('GET /api/mcp/connections', ...)` block: seed one fresh `'pending'` connection and one stale `'pending'` connection (using `buildMcpTestApp`'s `overrides.clock` to control age, per `mcpTestApp.ts`), call the route, and assert `res.body.connections` contains neither — the direct HTTP-level regression test for the reported "failed connections appear as successful" bug.
- [X] T010 [P] [US1] Add a failing test case in `retro-rocket/src/test/features/auth/services/connectedAppsService.test.ts`: mock `fetch` to return a `GET /api/mcp/connections` body containing one entry with `status: 'pending'` alongside one with `status: 'active'` (simulating an API-level regression), and assert `fetchConnectedApps()` returns only the `'active'` entry — the defensive client-side filter (research.md §5).
- [X] T011 [US1] Extend `e2e/mcp-connector.spec.ts`: register a client, drive the real consent screen to approval, then call `POST /api/mcp/token` with a deliberately wrong `code_verifier` (so the token exchange fails). Navigate to `/perfil` and confirm the client name never appears in the Connected Apps list, including after a page reload.

### Implementation for User Story 1

- [X] T012 [US1] Update `listConnections` in `server/src/application/use-cases/mcp/ListConnections.ts`: add a `clock: ClockPort` dependency; before mapping, for each `'pending'` connection whose `nowSeconds - createdAt > MCP_AUTHORIZATION_REQUEST_TTL_SECONDS` (imported from `AuthorizeMcpConnection.ts`), call `connection.failed(now)` and `connectionStore.saveConnection(...)`; narrow the final filter/return type so only `status === 'active'` connections are ever returned (dropping the now-unused `'pending'` branch of `ConnectionSummary['status']`) — makes T006, T007, and T008 pass. Depends on T004.
- [X] T013 [US1] Update the `GET /api/mcp/connections` handler in `server/src/http/routes/mcp.ts` to pass `clock: deps.clock` into `listConnections`'s deps — makes T009 pass. Depends on T012.
- [X] T014 [P] [US1] Update `retro-rocket/src/features/auth/services/connectedAppsService.ts`: narrow `ConnectedApp['status']` to the literal `'active'`, and filter the response in `fetchConnectedApps()` to `status === 'active'` before returning — makes T010 pass.

**Checkpoint**: User Story 1 is fully functional and independently testable/shippable as the complete display-bug fix — a failed or stale attempt is never shown as connected, at the use-case, HTTP-route, frontend-service, and browser-E2E levels, including when a genuine sibling connection for the same client exists alongside it.

---

## Phase 4: User Story 2 - Reconnecting after a revoke actually works (Priority: P1)

**Goal**: Every distinct authorization_code failure condition in `POST /api/mcp/token` is individually diagnosable (a unique error message, no longer a single generic string for four different causes) and immediately marks its associated connection `'failed'` rather than leaving it stuck `'pending'`. A user who revokes an AI client, or who has never connected one before, can complete the standard authorize → consent → token-exchange flow and end up with a genuinely working active connection.

**Independent Test**: Drive each of the four `InvalidGrantError` conditions in isolation and confirm each produces a distinct message and leaves the connection `'failed'`. Revoke an existing connection, then run a brand-new authorize/consent/token-exchange sequence for the same client and confirm it succeeds end-to-end, including a real subsequent MCP tool call.

### Tests for User Story 2 (write first; confirm FAIL before implementation)

- [X] T015 [P] [US2] Add/update failing test cases in `server/test/application/use-cases/mcp/ExchangeMcpToken.test.ts`'s `describe('exchangeMcpToken — authorization_code grant', ...)` block: assert each of the four existing failure cases (`rejects a code reused a second time`, `rejects an expired code`, `rejects a redirect_uri mismatch`, `rejects a PKCE verifier that does not match the stored challenge`) now throws an `InvalidGrantError` whose `.message` is **distinct per case** (no two of the four share the same string) — all four currently throw the identical default message, so all four assertions are expected to fail before implementation (research.md §3).
- [X] T016 [P] [US2] Add failing test cases in the same block: for each of the `redirect_uri`/`client_id` mismatch, PKCE-mismatch, and reused-code cases (where a `connectionId` is resolvable from the authorization-code record), assert that `connectionStore.getConnectionById(...)` reports the associated connection as `status: 'failed'` with `failedAt` set after the rejected call — the explicit-signal failure-marking (FR-008a).
- [X] T017 [P] [US2] Add a test case in `server/test/http/routes/mcpToken.test.ts`: complete a full authorize → consent → token-exchange sequence for a client (via the existing `issuedCode(app)` helper), revoke the resulting connection via `deps.connectionStore`, then run a **second**, brand-new authorize → consent → token-exchange sequence for the same `client_id` and assert it succeeds (`200`, a fresh `access_token`/`refresh_token`) and results in a new, distinct, `'active'` connection (SC-002). **Note**: this should already PASS against current code — `RevokeConnection` only ever touches the single connection looked up by id, and nothing in the authorize/token logic depends on prior connections for the same client — so this is a regression-guard test proving the reconnection path itself was never structurally broken, written test-first as a documented artifact per Constitution I, mirroring 023's T003 exception. This is the one documented exception in this feature (see header note).
- [X] T018 [US2] Extend `e2e/mcp-connector.spec.ts`: after the existing revoke assertion in the first test (or as a new test), complete a brand-new register → authorize → consent → token-exchange sequence for the same test client, then make a real MCP tool call (`POST /api/mcp` with `list_retrospectives`) using the freshly issued access token and confirm it succeeds (`200`) — proves reconnection is not just accepted by `/token` but genuinely usable end-to-end (spec.md US2 Acceptance Scenario 3).

### Implementation for User Story 2

- [X] T019 [US2] Update `server/src/application/use-cases/mcp/ExchangeMcpToken.ts`'s `authorization_code` branch: give each of the four failure conditions a distinct `InvalidGrantError` message; on the "code not found/already consumed/expired" branch, additionally call `connectionStore.getAuthorizationRequest(input.code)` to resolve a `connectionId` even though `consumeAuthorizationCode` returned `null`; whenever a `connectionId` is resolvable on any failure branch, fetch that connection and call `connectionStore.saveConnection(connection.failed(now))` before throwing — makes T015, T016 pass (T017 already passes and must remain passing). Depends on T004.

**Checkpoint**: User Story 2 is fully functional and independently testable — every OAuth failure mode is now individually diagnosable in logs (`errorHandler.ts`'s existing `request_error` log entry, research.md §3) and durably marks its connection `'failed'` (feeding directly into User Story 1's exclusion), and the reconnection path itself is proven correct end-to-end, including a real tool call.

---

## Phase 5: User Story 3 - Automated coverage for this part of the app (Priority: P2)

**Goal**: The test suite added across Phases 2–4 demonstrably closes the two coverage gaps identified during this feature's investigation — no prior test seeded a `'pending'`-only connection through `GET /api/mcp/connections`, and no prior test asserted a reconnection succeeds after a revoke — and the full suite passes as one, not just in isolation per file.

**Independent Test**: Run the full targeted test suite for this area and confirm it passes; confirm the two previously-identified gaps are each covered by a specifically-named test from Phases 2–4.

- [X] T020 [P] [US3] Run `npm run test:server -- mcp` and `npm run test:run -- connectedApps` together (not just individually) and confirm every test added in Phases 2–4 passes as part of the full suite, with no cross-test interference (e.g., shared fake-store state leaking between `it` blocks).
- [X] T021 [US3] Cross-check and record (in this file, updating this task's checkbox only — no code change) that: (a) T009 is the first test in this codebase asserting `GET /api/mcp/connections` excludes a seeded `'pending'`-only connection, and (b) T017 is the first test asserting a full reconnection succeeds after a revoke for the same client — both previously-unverified behaviors per this feature's investigation (spec.md User Story 3 Acceptance Scenario 2).
- [X] T022 [US3] Run `npm run e2e`, including the T011 and T018 extensions to `mcp-connector.spec.ts`, and confirm the full E2E suite passes together.

**Checkpoint**: All three user stories are independently functional, and the automated safety net specifically named in spec.md's US3 is confirmed to exist and close the identified gaps.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify the feature end-to-end against the project's quality gates before calling it done.

- [X] T023 [P] Run `npm run test:server:coverage` and `npm run test:coverage`; confirm both stay ≥ 80% branches/functions/lines/statements (Constitution VI — no lowering the threshold) across every file touched by this feature.
- [X] T024 [P] Explicitly run `server/test/architecture/domain-isolation.test.ts` and the MCP read-only enforcement test (`mcp-read-only.test.ts` or equivalent); confirm both still pass unmodified — this feature must not regress either gate (plan.md Constraints).
- [X] T025 Walk through `quickstart.md` §1–§4 manually against the real dev stack + Firestore emulator, including the log-message spot-check in §3 step 5 (confirm the `request_error` log's `detail` field now names the specific failure condition rather than a generic string). **Decision gate for FR-004**: if this walkthrough surfaces a genuine, unresolved reconnection failure beyond the message/diagnostics fix (research.md §6's H1 hypothesis — a cause outside this repository's OAuth logic, e.g. discovery metadata or deployment-level), do not consider FR-004/FR-005 satisfied — loop back to `/speckit-plan` or `/speckit-tasks` to scope the follow-up fix before closing this feature.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks** both User Story 1 and User Story 2 (both need `McpConnection.failed()`).
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on User Story 2.
- **User Story 2 (Phase 4)**: Depends on Foundational. No dependency on User Story 1 — can be implemented in parallel with it once Phase 2 is done.
- **User Story 3 (Phase 5)**: Depends on both User Story 1 and User Story 2 being complete (it verifies the combined suite and cross-references gaps closed by both).
- **Polish (Phase 6)**: Depends on User Story 3.

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational. Ships alone as a complete fix for the reported display bug.
- **User Story 2 (P1)**: Depends only on Foundational. Independent of User Story 1's implementation, though both build on the same `McpConnection.failed()` foundation.
- **User Story 3 (P2)**: Depends on both US1 and US2 — it is explicitly a verification pass over the coverage both stories produced, not new production behavior.

### Within Each User Story

- Tests MUST be written and confirmed FAILING before their corresponding implementation task (T017 is the one documented exception — a regression guard for already-correct behavior, per Constitution I's documented-exception pattern).
- Foundational domain change (`McpConnection.failed()`) before either use case that consumes it.
- Application use cases (`ListConnections`, `ExchangeMcpToken`) before their HTTP route wiring.
- Backend response shape before frontend type/service changes.
- Story complete (all its tasks + checkpoint) before moving to the next phase.

### Parallel Opportunities

- Phase 2: T002 and T003 (different files) can run in parallel; T004 and T005 are sequential (T005 depends on T004's type change).
- Phase 3 tests: T006, T007, and T008 are additions to the same file (`ListConnectionsAndRevoke.test.ts`) but independent test cases with no shared state, following this repo's established convention (023's tasks.md) of marking same-file-different-test-case additions as [P]; T009 and T010 are in distinct files and also parallel; T011 (E2E) can run in parallel with all of them but is best validated once Phase 3 implementation lands.
- Phase 3 implementation: T014 (frontend) has no dependency on T012/T013 (backend) and can run in parallel with them.
- Phase 4 tests: T015, T016, and T017 are all in distinct files/blocks and can run in parallel; T018 (E2E) is best run once T019 lands.
- Phase 5: T020 and T022 are independent suite runs and can run in parallel; T021 (documentation cross-check) can run any time after T009/T017 exist.
- Phase 6: T023 and T024 are independent checks and can run in parallel; T025 should run last.
- **Cross-story**: once Phase 2 (Foundational) is done, all of Phase 3 (US1) and Phase 4 (US2) can proceed in parallel by different developers, since neither depends on the other's implementation.

---

## Parallel Example: Foundational + User Stories 1 & 2 (Tests)

```bash
# Phase 2 (must land first):
Task: "Failing tests for .failed() transition in server/test/domain/mcp/McpConnection.test.ts"
Task: "Failing tests for failedAt backfill in server/test/adapters/firebase/FirestoreMcpConnectionAdapter.test.ts"

# Once Phase 2 is done, Phase 3 (US1) and Phase 4 (US2) test-writing can run together:
Task: "Failing test for fresh-pending exclusion in server/test/application/use-cases/mcp/ListConnectionsAndRevoke.test.ts"
Task: "Failing test for stale-pending expiry+persistence in server/test/application/use-cases/mcp/ListConnectionsAndRevoke.test.ts"
Task: "Failing test for mixed active+pending-same-client independence in server/test/application/use-cases/mcp/ListConnectionsAndRevoke.test.ts"
Task: "Failing test for route-level pending exclusion in server/test/http/routes/mcpConnections.test.ts"
Task: "Failing test for defensive status filter in retro-rocket/src/test/features/auth/services/connectedAppsService.test.ts"
Task: "Failing tests for distinct InvalidGrantError messages in server/test/application/use-cases/mcp/ExchangeMcpToken.test.ts"
Task: "Failing tests for explicit-signal failure-marking in server/test/application/use-cases/mcp/ExchangeMcpToken.test.ts"
Task: "Regression-guard test for revoke-then-reconnect in server/test/http/routes/mcpToken.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks both stories).
3. Complete Phase 3: User Story 1 — the reported display bug fix.
4. **STOP and VALIDATE**: Run `quickstart.md` §2 manually; confirm a failed/incomplete attempt never appears as connected.
5. Ship this alone if time-boxed — it resolves the "failed connections appear as successful" half of the report even before the reconnection-flow investigation (User Story 2) lands.

### Incremental Delivery

1. Setup → Foundational → Phase 3 (US1) → validate → ship the display-bug fix.
2. Add Phase 4 (US2) → validate the reconnection flow end-to-end, including the improved diagnostics → ship.
3. Phase 5 (US3) confirms the combined test suite closes the identified coverage gaps.
4. Phase 6 Polish gates the final merge (coverage, architecture/read-only regression checks, full quickstart walkthrough, and the FR-004 decision gate in T025).

### Parallel Team Strategy

With two developers: complete Phase 1 + Phase 2 (Foundational) together first (it blocks both stories), then one developer takes Phase 3 (US1) while the other takes Phase 4 (US2) — neither depends on the other's implementation. Reconvene for Phase 5 (US3), which needs both done.

---

## Notes

- [P] tasks = different files (or independent test cases within the same file, per this repo's established convention), no dependency on an incomplete task.
- [Story] label maps task to specific user story for traceability.
- User Story 1 and User Story 2 are each independently shippable; User Story 3 is a verification pass over the combined coverage, not new production behavior.
- Verify each test fails before implementing the task that makes it pass (T017 is the one documented exception — a regression guard for already-correct behavior).
- FR-003 (independent attempt tracking) is verified explicitly by T008 (an active connection and a stale-pending connection for the same client/uid, asserting the active one is unaffected), in addition to being structurally guaranteed — every connection has its own `id`, so marking one `'failed'` cannot affect another.
- FR-006 (no regression of 023's revoked-connection exclusion) is a strict subset of T012's narrowed `status === 'active'` filter — no separate task needed; T012 makes this true by construction, and the pre-existing revoked-exclusion test in `ListConnectionsAndRevoke.test.ts` (023) continues to run against it unmodified.
- SC-003 (first-time connection succeeds) is covered by `mcpToken.test.ts`'s pre-existing, unmodified test case ("exchanges a valid code + PKCE verifier for an access + refresh token") — no new task was needed since this feature does not change that code path's happy-path behavior; noted here for traceability against spec.md.
- FR-004's "identify and correct the underlying defect" is satisfied by this task set only for the concretely-verified defect (indistinguishable `InvalidGrantError` messages, research.md §3/§6). T025 is the decision gate: if the live quickstart walkthrough surfaces a genuine unresolved failure beyond that fix (research.md §6's H1 hypothesis), treat it as a signal to scope a follow-up fix rather than closing this feature silently.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before continuing.
