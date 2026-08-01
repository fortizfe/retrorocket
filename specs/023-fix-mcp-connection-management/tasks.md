---

description: "Task list template for feature implementation"
---

# Tasks: Fix MCP Connection Management

**Input**: Design documents from `/specs/023-fix-mcp-connection-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/connections-endpoint-delta.md, quickstart.md (all present)

**Tests**: Per the project constitution (Principle I, TDD — NON-NEGOTIABLE), tests are included and MUST be written and confirmed failing before their corresponding implementation task. Two tasks (T003, T027) are exceptions noted explicitly below: they are regression-guard tests for behavior that already exists and passes today — they still land as tests, just without a red phase.

**Organization**: Tasks are grouped by user story (from spec.md: US1 = P1, US2 = P2) to enable independent implementation and testing of each story. All file paths are relative to `retro-rocket/` (the repo's single npm package).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Which user story this task belongs to (US1, US2) — omitted for Setup/Foundational/Polish

## Path Conventions

Single-package monorepo: backend at `server/src/` (hexagonal: `http/routes`, `http/middleware`, `application/use-cases`, `application/ports`, `domain/mcp`, `adapters/firebase`) with tests at `server/test/`; frontend at `src/` with tests at `src/test/`; E2E specs at `e2e/`. Paths below are exact, confirmed against the existing codebase.

---

## Phase 1: Setup

**Purpose**: Confirm the environment is ready. No new dependencies, tooling, or scaffolding are required for this fix (per plan.md's Technical Context — no new library, no new collection, no new port method).

- [X] T001 Confirm branch `023-fix-mcp-connection-management` is checked out, `npm install` is up to date, and the existing baseline passes: `npm run test:server` and `npm run test:run` both green before making any change — no code changes in this task.

**Checkpoint**: Environment confirmed; no new setup needed before user story work begins.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: N/A for this feature. Per research.md §1, User Story 1's fix (`ListConnections` excluding `revoked` connections) requires no schema change and no shared groundwork. User Story 2's additions (`origin`, `lastUsedAt`) are new, purely additive fields that don't block or alter Story 1's fix. There is no blocking prerequisite work shared by both stories — proceed directly to Phase 3.

---

## Phase 3: User Story 1 - Revoking an AI client connection actually removes it (Priority: P1) 🎯 MVP

**Goal**: A connection a user revokes never reappears in the "connected/active" list shown by `GET /api/mcp/connections` — not right after revoking, and not after a page reload or new session — and revoking one connection never touches a sibling connection to the same AI client.

**Independent Test**: Seed one `active` and one `revoked` connection for the same user, call `GET /api/mcp/connections`, and confirm only the `active` one is returned. Seed two `active` connections for the same user/client, revoke one, confirm the other is untouched. End-to-end: revoke a real connection via the Profile page's "Revocar" button, reload the page, and confirm it does not reappear.

### Tests for User Story 1 (write first; confirm FAIL before implementation)

- [X] T002 [P] [US1] Add a failing test case in `server/test/application/use-cases/mcp/ListConnectionsAndRevoke.test.ts`'s `describe('listConnections', ...)` block: seed a third, `revoked` connection for `'u1'` (in addition to the existing `mine`/`someoneElses` fixtures) and assert `listConnections({ connectionStore }, 'u1')` does NOT include it in the result.
- [X] T003 [P] [US1] Add a test case in `server/test/application/use-cases/mcp/ListConnectionsAndRevoke.test.ts`'s `describe('revokeConnection', ...)` block covering spec.md's US1 Acceptance Scenario 4 / FR-004 / SC-003: seed two `active` connections for the **same** `uid` (`'u1'`) and the **same** `clientId` (e.g. `c1` and `c3`), revoke `c1`, and assert `c3` is still `'active'` and its other fields are unchanged. **Note**: this should already PASS against current code — `revokeConnection` only ever touches the single connection looked up by id, so this is a regression guard for that acceptance scenario, not new behavior. It still belongs here as a test-first artifact so any future change that breaks per-connection isolation is caught immediately.
- [X] T004 [P] [US1] Add a failing test case in `server/test/http/routes/mcpConnections.test.ts`'s `describe('GET /api/mcp/connections', ...)` block: seed a connection, revoke it via `deps.connectionStore.saveConnection(revokedConnection)` (or by calling `DELETE /api/mcp/connections/:id` first), then `GET /api/mcp/connections` and assert `res.body.connections` does not contain it — this is the direct regression test for the reported "still shows as active after reload" bug.
- [X] T005 [US1] Extend `e2e/mcp-connector.spec.ts`: immediately after the existing revoke assertion (`await expect(connectedAppRow).toHaveCount(0, ...)`), add `await page.reload()` followed by a re-assertion that `connectedAppRow` still has count 0 — the literal user-reported scenario, proven against the real browser/backend/Firestore emulator stack.

### Implementation for User Story 1

- [X] T006 [US1] Update `listConnections` in `server/src/application/use-cases/mcp/ListConnections.ts` to filter `connections` down to `status !== 'revoked'` before mapping to `ConnectionSummary` — makes T002, T004, and T005 pass (T003 already passes; this change doesn't touch the revoke path it guards). No change is needed to the `GET /api/mcp/connections` route handler itself (`server/src/http/routes/mcp.ts`), since it already just maps whatever `listConnections` returns. Depends on T002.

**Checkpoint**: User Story 1 is fully functional and independently testable — revoked connections are excluded at the use-case, HTTP-route, and browser-E2E levels, and same-client connection isolation on revoke is explicitly guarded. This alone is shippable as the bug fix.

---

## Phase 4: User Story 2 - Telling apart multiple connections from the same AI client (Priority: P2)

**Goal**: When a user has more than one connection for the same AI client (e.g. Claude mobile + Claude desktop), each entry in the Connected Apps list shows an automatically detected origin category ("Desktop"/"Mobile"/"Web"/"Unknown" — never IP/location-derived, per spec.md Clarifications) and an exact last-used timestamp (or a "never used yet" state), so the user can confidently revoke the right one — and this is verified by the project's real automated WCAG 2.1 AA gate, not just a manual check.

**Independent Test**: Authorize the same test client twice using two different `User-Agent` strings, make one MCP tool call through one of the two, and confirm the Connected Apps list shows two entries with the same `clientName` but distinct origin labels, one with a last-used time and one without.

### Tests for User Story 2 (write first; confirm FAIL before implementation)

- [X] T007 [P] [US2] Create `server/test/domain/mcp/ConnectionOrigin.test.ts` with failing test cases for `classifyOrigin(userAgent)`: returns `'desktop'` for a UA containing an `Electron` token (e.g. `"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ... ClaudeDesktop/1.2.3 Chrome/120.0.0.0 Electron/28.0.0 Safari/537.36"`); returns `'mobile'` for a UA containing `Mobile`/`iPhone`/`Android` tokens (e.g. an iPhone Safari UA); returns `'web'` for a plain desktop-browser UA with neither marker; returns `'unknown'` for `undefined`, an empty string, or a non-browser UA (e.g. `"curl/8.0.1"`).
- [X] T008 [P] [US2] Add failing test cases in `server/test/domain/mcp/McpConnection.test.ts`: `createPending` stores a supplied `origin` on `data.origin`, and defaults to `'unknown'` when `origin` is omitted; a fresh `createPending` has `data.lastUsedAt === null`; a new `touched(nowSeconds)` method returns a copy with `data.lastUsedAt === nowSeconds` (called on an `activated()` connection).
- [X] T009 [P] [US2] Add a failing test case in `server/test/application/use-cases/mcp/AuthorizeMcpConnection.test.ts`'s `decideMcpAuthorization` tests: when `input.origin` is `'mobile'`, the `McpConnection` passed to `connectionStore.decideAuthorizationRequest(...)`'s `decision.connection` has `data.origin === 'mobile'`.
- [X] T010 [P] [US2] Add a failing test case in `server/test/application/use-cases/mcp/ListConnectionsAndRevoke.test.ts`'s `describe('listConnections', ...)` block: a connection created with a specific `origin` and a `touched()` `lastUsedAt` is returned by `listConnections` with matching `origin` and `lastUsedAt` fields on its `ConnectionSummary`.
- [X] T011 [P] [US2] Add a failing test case in `server/test/http/routes/mcpAuthorize.test.ts`'s `describe('POST /api/mcp/authorize/decision', ...)` block: send the approval request with a mobile-like `User-Agent` header set, then look up the resulting connection (via `deps.connectionStore.getAuthorizationRequest(requestCode)` → `connectionId` → `deps.connectionStore.getConnectionById(...)`) and assert `data.origin === 'mobile'`.
- [X] T012 [P] [US2] Add a failing test case in `server/test/http/middleware/mcpAuth.test.ts`: extend the file's `storeWith` fake so `saveConnection` records the last-saved connection, then assert that after a successful `/protected` request, the recorded connection's `data.lastUsedAt` equals the middleware's clock time (`NOW`).
- [X] T013 [P] [US2] Add a failing test case in `server/test/http/routes/mcpConnections.test.ts`'s `describe('GET /api/mcp/connections', ...)` block: a seeded connection with a known `origin` and `lastUsedAt` is reflected in `res.body.connections[0].origin` and `.lastUsedAt`.
- [X] T014 [P] [US2] Create `src/test/features/auth/components/ConnectedAppsCard.test.tsx` (new file — no prior unit test exists for this component) with failing test cases: given two connections sharing the same `clientName` but different `origin` values, both distinct origin labels are rendered; given a connection with `lastUsedAt: null`, a "never used yet" state is rendered instead of a last-used date.
- [X] T015 [P] [US2] Create `src/test/features/auth/services/connectedAppsService.test.ts` (new file — no prior test exists for this service, and it is being modified by this feature) with a failing test case: mock `fetch` to return a `GET /api/mcp/connections` body containing `origin` and `lastUsedAt` fields, and assert `fetchConnectedApps()` passes both through unchanged onto the returned `ConnectedApp[]`. Closes the "production code changed with no preceding test" gap for this file.
- [X] T016 [US2] Extend `e2e/mcp-connector.spec.ts` (or add a sibling spec in `e2e/`): using a second Playwright browser context created with a mobile-like `userAgent` override, register and authorize a second connection for the same test client, then confirm the real Profile page shows two entries for that client with visibly distinct origin labels. Best run after the Phase 4 implementation tasks below exist, since it exercises the full stack.

### Implementation for User Story 2

- [X] T017 [P] [US2] Create `server/src/domain/mcp/ConnectionOrigin.ts` exporting `type ConnectionOrigin = 'desktop' | 'mobile' | 'web' | 'unknown'` and `classifyOrigin(userAgent: string | undefined): ConnectionOrigin`, implementing the heuristic from research.md §2 (Electron marker → `'desktop'`; Mobile/Android/iPhone/iPad marker → `'mobile'`; a recognizable browser UA otherwise → `'web'`; missing/unrecognized → `'unknown'`) — makes T007 pass. Pure function, no imports from `express`/`firebase-admin`/`jose` (must pass `domain-isolation.test.ts`).
- [X] T018 [US2] Update `server/src/domain/mcp/McpConnection.ts`: add `origin: ConnectionOrigin` and `lastUsedAt: number | null` to `McpConnectionData`; give `createPending` an optional `origin` param (default `'unknown'`) and initialize `lastUsedAt: null`; add `touched(nowSeconds: number): McpConnection` returning a copy with `lastUsedAt` set to `nowSeconds` — makes T008 pass. Depends on T017 (imports `ConnectionOrigin`).
- [X] T019 [US2] Update `DecideMcpAuthorizationInput` and `decideMcpAuthorization` in `server/src/application/use-cases/mcp/AuthorizeMcpConnection.ts` to accept an `origin: ConnectionOrigin` field and pass it into `McpConnection.createPending({ ..., origin: input.origin })` — makes T009 pass. Depends on T018.
- [X] T020 [US2] Update `ConnectionSummary` and `listConnections` in `server/src/application/use-cases/mcp/ListConnections.ts` to include `origin` and `lastUsedAt`, read from `c.data.origin`/`c.data.lastUsedAt` — makes T010 pass. Depends on T018.
- [X] T021 [US2] Update the `POST /api/mcp/authorize/decision` handler in `server/src/http/routes/mcp.ts` to read `req.header('user-agent')`, classify it with `classifyOrigin`, and pass the result as `origin` in the call to `decideMcpAuthorization` — makes T011 pass. Depends on T017, T019.
- [X] T022 [US2] Update `mcpAuthMiddleware` in `server/src/http/middleware/mcpAuth.ts` to call `connection.touched(now)` and `await deps.connectionStore.saveConnection(...)` immediately after the existing `isActive`/`uid` check succeeds, before `next()` — makes T012 pass. Depends on T018.
- [X] T023 [US2] Update the `GET /api/mcp/connections` handler in `server/src/http/routes/mcp.ts` to map `origin` and `lastUsedAt` (as an ISO 8601 string, or `null`) into each entry of the JSON response — makes T013 pass. Depends on T020.
- [X] T024 [P] [US2] Extend `ConnectedApp` in `src/features/auth/services/connectedAppsService.ts` with `origin: 'desktop' | 'mobile' | 'web' | 'unknown'` and `lastUsedAt: string | null`, matching the backend response shape from T023 — makes T015 pass.
- [X] T025 [P] [US2] Add new i18next keys under `mcpConnector.connectedApps.*` to `src/locales/en.json` and `src/locales/es.json`: `originDesktop`, `originMobile`, `originWeb`, `originUnknown` (short labels), `lastUsedOn` (with a `{{date}}` placeholder, mirroring the existing `connectedOn` key), and `neverUsedYet`.
- [X] T026 [US2] Update `src/features/auth/components/ConnectedAppsCard.tsx` to render, per connection: an icon+text origin label (never conveyed by color alone, per WCAG 2.1 AA/Constitution VIII) using the T025 keys, and either a "last used {{date}}" line (`lastUsedOn`) or the `neverUsedYet` fallback when `lastUsedAt` is `null` — makes T014 pass. Depends on T024, T025.
- [X] T027 [US2] Extend `e2e/accessibility.spec.ts`'s existing `Dashboard & Profile have no WCAG 2.1 AA violations` test (both `light`/`dark` iterations): before navigating to `/perfil` and scanning, register/authorize at least one MCP test connection for the signed-in user (reusing `mcp-connector.spec.ts`'s register→authorize→approve→token-exchange steps, or a shared helper extracted from it) so the populated Connected Apps list — including the new origin-label and last-used markup — is actually exercised by the real, merge-blocking axe-core gate, not left unrendered. Depends on T026 (the UI must exist to scan).

**Checkpoint**: Both User Story 1 and User Story 2 are independently functional — Story 1's fix is untouched by Story 2's additive fields, Story 2 builds cleanly on top without breaking Story 1's behavior or tests, and the project's real automated accessibility gate now covers the new UI.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verify the feature end-to-end against the project's quality gates before calling it done.

- [X] T028 [P] Run `npm run test:server:coverage` and `npm run test:coverage`; confirm both stay ≥ 80% branches/functions/lines/statements (Constitution VI — no lowering the threshold).
- [X] T029 [P] i18n spot-check per `quickstart.md` §5: switch the app to Spanish and confirm the new origin/last-used strings render from `es.json` with no missing-key warnings.
- [X] T030 Run the full `npm run e2e` suite (now including T027's extended accessibility coverage) and walk through `quickstart.md` §2–§3 manually (revoke → reload regression; two-origin distinguishing flow) against the real dev stack.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Empty for this feature (see note above) — does not block Phase 3.
- **User Story 1 (Phase 3)**: Depends only on Setup. No dependency on User Story 2.
- **User Story 2 (Phase 4)**: Depends only on Setup. Touches two files Story 1 also touches (`ListConnections.ts`, `mcpConnections.test.ts`) but strictly additively — does not require Story 1's changes to be present first, though implementing them in priority order (as below) avoids any merge friction.
- **Polish (Phase 5)**: Depends on both user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories. Ships alone as a complete bug fix.
- **User Story 2 (P2)**: No hard dependency on User Story 1's fix, but is only meaningful once revoked connections are correctly excluded (Story 1), so implement in priority order.

### Within Each User Story

- Tests MUST be written and confirmed FAILING before their corresponding implementation task (except T003 and T027's baseline pre-check, which guard already-correct behavior).
- Domain (`McpConnection`, `ConnectionOrigin`) before application use cases.
- Application use cases before HTTP routes/middleware.
- Backend response shape before frontend type/UI changes.
- Story complete (all its tasks + checkpoint) before moving to the next priority.

### Parallel Opportunities

- Phase 3: T002, T003, and T004 (different describe blocks / different files) can run in parallel; T005 (E2E) touches a fourth file and can also run in parallel with them.
- Phase 4 tests: T007–T015 are all in distinct files and can all run in parallel; T016 (E2E) is best run once the Phase 4 implementation tasks land.
- Phase 4 implementation: T017 has no dependencies and can start immediately; T024/T025 (frontend type + locales) are independent of every backend task and can run in parallel with T018–T023.
- Phase 5: T028, T029 are independent checks and can run in parallel; T030 should run last.

---

## Parallel Example: User Story 2 (Tests)

```bash
# Launch all Phase 4 test-writing tasks together (distinct files, all TDD "red" first):
Task: "Failing tests for classifyOrigin in server/test/domain/mcp/ConnectionOrigin.test.ts"
Task: "Failing tests for origin/lastUsedAt/touched in server/test/domain/mcp/McpConnection.test.ts"
Task: "Failing test for origin passthrough in server/test/application/use-cases/mcp/AuthorizeMcpConnection.test.ts"
Task: "Failing test for origin/lastUsedAt in server/test/application/use-cases/mcp/ListConnectionsAndRevoke.test.ts"
Task: "Failing test for UA-derived origin in server/test/http/routes/mcpAuthorize.test.ts"
Task: "Failing test for lastUsedAt touch in server/test/http/middleware/mcpAuth.test.ts"
Task: "Failing test for origin/lastUsedAt in server/test/http/routes/mcpConnections.test.ts"
Task: "Failing tests for origin labels/last-used rendering in src/test/features/auth/components/ConnectedAppsCard.test.tsx"
Task: "Failing test for origin/lastUsedAt passthrough in src/test/features/auth/services/connectedAppsService.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Skip Phase 2 (empty for this feature).
3. Complete Phase 3: User Story 1 — the reported bug fix.
4. **STOP and VALIDATE**: Run `quickstart.md` §2 manually; confirm a revoked connection never reappears after reload.
5. Ship this alone if time-boxed — it fully resolves the user's reported bug independent of the distinguishing-info enhancement.

### Incremental Delivery

1. Setup → Phase 3 (US1) → validate → ship the bug fix.
2. Add Phase 4 (US2) → validate distinguishing info end-to-end, including the extended a11y gate → ship the enhancement.
3. Phase 5 Polish gates the final merge (coverage, i18n, full E2E).

### Parallel Team Strategy

With two developers: one takes Phase 3 (US1) end-to-end while the other starts Phase 4's domain/application layer (T007, T008, T017, T018 first, since nothing there depends on Phase 3); reconvene for Phase 4's HTTP/frontend layer once both are ready.

---

## Notes

- [P] tasks = different files, no dependency on an incomplete task.
- [Story] label maps task to specific user story for traceability.
- User Story 1 is independently shippable as the complete bug fix; User Story 2 is a pure addition on top.
- Verify each test fails before implementing the task that makes it pass (T003 and T027 are the two documented exceptions — regression guards for already-correct behavior).
- FR-003 (idempotent revoke) and FR-006 (no reactivation after revoke) are already satisfied and covered by pre-existing tests in `McpConnection.test.ts` (`McpConnection.revoked`'s idempotency, `McpConnection.activated`'s `InvalidConnectionTransitionError`) — no new task is needed for either; noted here for traceability against spec.md.
- Commit after each task or logical group.
- Stop at either checkpoint to validate a story independently before continuing.
