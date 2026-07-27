---
description: "Task list template for feature implementation"
---

# Tasks: Remote Read-Only MCP Server for Retrospective Reporting

**Input**: Design documents from `/specs/015-mcp-read-server/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Per the project constitution (TDD, NON-NEGOTIABLE), tests are included below and MUST be written before their corresponding implementation task, following the existing pattern in `retro-rocket/server/test/` (which mirrors `retro-rocket/server/src/` 1:1).

**Organization**: Tasks are grouped by user story (from spec.md) in priority order (P1, P1, P2, P2, P3) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- File paths are exact and relative to the repository root (`retro-rocket/` prefix included)

## Path Conventions

This feature extends the existing hexagonal backend at `retro-rocket/server/src/` (mirrored 1:1 by `retro-rocket/server/test/`) and adds a new card to the existing `retro-rocket/src/features/auth/components/` directory, rendered from the existing `retro-rocket/src/pages/Profile.tsx`, per `plan.md`'s Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization for the new capability

- [X] T001 Add `@modelcontextprotocol/sdk` to `retro-rocket/package.json` dependencies and run `npm install`
- [X] T002 [P] Create empty directory scaffolding: `retro-rocket/server/src/domain/mcp/`, `retro-rocket/server/src/application/use-cases/mcp/`, `retro-rocket/server/test/domain/mcp/`, `retro-rocket/server/test/adapters/session/` (existing), `retro-rocket/server/test/http/routes/` (existing) — no new frontend directories are needed: the Connected Apps UI is added to the existing `retro-rocket/src/features/auth/components/` and `.../services/` directories, alongside `LinkedProvidersCard.tsx`
- [X] T003 [P] Confirm `retro-rocket/server/tsconfig.json` and `retro-rocket/server/vitest.config.ts` include patterns already cover the new `src/domain/mcp/**`, `src/application/use-cases/mcp/**`, `test/domain/mcp/**` paths (no existing test/coverage inclusion is scoped narrower than `src/**`/`test/**`); adjust only if a narrower glob is found

**Checkpoint**: Repository ready for foundational work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Unit test for `McpConnection` status transitions (`pending`→`active`→`revoked`, no path back to `active`) in `retro-rocket/server/test/domain/mcp/McpConnection.test.ts`
- [X] T005 Implement the `McpConnection` domain entity per `data-model.md` in `retro-rocket/server/src/domain/mcp/McpConnection.ts` (makes T004 pass)
- [X] T006 [P] Unit test for the MCP access-token adapter: issues a valid JWT, verifies a valid token, rejects an expired token, rejects a tampered/invalid-signature token, in `retro-rocket/server/test/adapters/session/JoseMcpTokenAdapter.test.ts` (mirrors the existing `server/test/adapters/session/JoseSessionAdapter.test.ts`)
- [X] T007 Implement `JoseMcpTokenAdapter` (implements `McpTokenServicePort`; `jose`-based JWT carrying `{ sub, connectionId, client_id, iat, exp }`, per `research.md` §3) in `retro-rocket/server/src/adapters/session/JoseMcpTokenAdapter.ts` (makes T006 pass). This lives in `adapters/session/`, **not** `domain/mcp/` — mirroring the existing `Session`/`JoseSessionAdapter` split — because `server/test/architecture/domain-isolation.test.ts` already forbids `jose` (and `firebase-admin`/`express`) imports anywhere under `server/src/domain/`; putting the JWT helper in `domain/` would fail that existing test.
- [X] T008 [P] Define `RetrospectiveReadPort`, `McpConnectionStorePort`, `McpClientStorePort`, and `McpTokenServicePort` interfaces per `data-model.md` in `retro-rocket/server/src/application/ports/mcp.ts`
- [X] T009 [P] Add deny-all-from-client Firestore security rules for the three new collections (`mcpClients`, `mcpAuthorizationCodes`, `mcpConnections` — Admin SDK bypasses rules, so these are explicit denies, not grants) in `retro-rocket/firestore.rules`
- [X] T010 Mount the MCP Streamable HTTP server (via `@modelcontextprotocol/sdk`, zero tools registered yet) at `POST /api/mcp` in `retro-rocket/server/src/http/routes/mcp.ts`, and wire it into `retro-rocket/server/src/http/app.ts` and `retro-rocket/server/src/http/composition-root.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Connect and revoke an AI assistant (Priority: P1) 🎯 MVP

**Goal**: A user can authorize their own AI client using their existing RetroRocket (Google/GitHub) sign-in, see every currently authorized connection in RetroRocket, and revoke any of them — with revocation rejecting that connection's very next request.

**Independent Test**: Run `quickstart.md` steps 2–4 (register a client, authorize as a signed-in user, exchange the code for a token) and step 7 (revoke, then confirm the immediate next call is rejected) — no retrospective data is read in this story.

### Tests for User Story 1

> **NOTE: Write these tests FIRST and confirm they FAIL before implementation**

- [X] T011 [P] [US1] Contract test for `POST /api/mcp/register` (Dynamic Client Registration: valid request → `201` with `client_id`; missing `redirect_uris` → `400`) in `retro-rocket/server/test/http/routes/mcpRegister.test.ts`
- [X] T012 [P] [US1] Contract test for `GET /api/mcp/authorize` (no session → redirects into `/api/auth/login/:provider`; signed-in + approve → redirects to `redirect_uri` with a code; deny → `error=access_denied`; unknown `client_id`/mismatched `redirect_uri` → `error=invalid_request`, no code/connection created) in `retro-rocket/server/test/http/routes/mcpAuthorize.test.ts`
- [X] T013 [P] [US1] Contract test for `POST /api/mcp/token` (valid code+PKCE → `200` with access+refresh token; reused/expired code → `invalid_grant`; PKCE/redirect_uri mismatch → rejected; `grant_type: refresh_token` mints a new access token for an active connection and fails with `invalid_grant` for a revoked one) in `retro-rocket/server/test/http/routes/mcpToken.test.ts`
- [X] T014 [P] [US1] Contract test for `GET /api/mcp/connections` and `DELETE /api/mcp/connections/:id` (session-cookie-authenticated; list shows only the caller's own connections with name+date; delete on someone else's connection id is rejected; delete is idempotent — `204` even if already revoked) in `retro-rocket/server/test/http/routes/mcpConnections.test.ts`
- [X] T015 [P] [US1] Unit test for the MCP bearer-auth middleware: valid token + `active` connection passes through to the next handler; valid token + `revoked` connection is rejected; expired/invalid-signature token is rejected — in `retro-rocket/server/test/http/middleware/mcpAuth.test.ts`

### Implementation for User Story 1

- [X] T016 [P] [US1] Implement the `McpClientRegistration` domain entity per `data-model.md` in `retro-rocket/server/src/domain/mcp/McpClientRegistration.ts`
- [X] T017 [US1] Implement `FirestoreMcpConnectionAdapter` (CRUD for `mcpClients`, `mcpAuthorizationCodes`, `mcpConnections`, implementing the ports from T008) in `retro-rocket/server/src/adapters/firebase/FirestoreMcpConnectionAdapter.ts` (depends on T008, T016)
- [X] T018 [P] [US1] Implement the `RegisterMcpClient` use-case in `retro-rocket/server/src/application/use-cases/mcp/RegisterMcpClient.ts` (depends on T017)
- [X] T019 [P] [US1] Implement the `AuthorizeMcpConnection` use-case — reuses the existing `StartOAuthLogin`/`CompleteOAuthLogin` use-cases for the underlying Google/GitHub handshake, then creates a `pending` `McpConnection` and an `McpAuthorizationCode` on consent approval — in `retro-rocket/server/src/application/use-cases/mcp/AuthorizeMcpConnection.ts` (depends on T017)
- [X] T020 [P] [US1] Implement the `ExchangeMcpToken` use-case (authorization_code and refresh_token grants, per `contracts/oauth-endpoints.md`) in `retro-rocket/server/src/application/use-cases/mcp/ExchangeMcpToken.ts` (depends on T007, T017)
- [X] T021 [P] [US1] Implement the `ListConnections` and `RevokeConnection` use-cases in `retro-rocket/server/src/application/use-cases/mcp/ListConnections.ts` and `retro-rocket/server/src/application/use-cases/mcp/RevokeConnection.ts` (depends on T017)
- [X] T022 [US1] Wire `POST /api/mcp/register`, `GET /api/mcp/authorize`, `POST /api/mcp/token`, `GET /api/mcp/connections`, `DELETE /api/mcp/connections/:id` routes in `retro-rocket/server/src/http/routes/mcp.ts` (depends on T018–T021; makes T011–T014 pass)
- [X] T023 [US1] Add `GET /.well-known/oauth-authorization-server` and `GET /.well-known/oauth-protected-resource` metadata routes per `contracts/oauth-endpoints.md` in `retro-rocket/server/src/http/routes/mcp.ts`
- [X] T024 [US1] Implement the MCP bearer-auth middleware (JWT verify via T007, then a live Firestore read of the connection's status via T017 before allowing any tool call through) applied to the `/api/mcp` transport mount in `retro-rocket/server/src/http/middleware/mcpAuth.ts` (depends on T007, T017; makes T015 pass)
- [X] T025 [P] [US1] Build the OAuth consent screen (client name, Allow/Deny) in `retro-rocket/src/features/auth/components/McpConsentScreen.tsx`, adding i18n keys for every currently supported locale
- [X] T026 [P] [US1] Build the Connected Apps card and its API service (list connections with name + authorized date; revoke button) in `retro-rocket/src/features/auth/components/ConnectedAppsCard.tsx` and `retro-rocket/src/features/auth/services/connectedAppsService.ts`, modeled directly on the existing `retro-rocket/src/features/auth/components/LinkedProvidersCard.tsx` (same card/list/action pattern), adding i18n keys for every currently supported locale
- [X] T027 [US1] Render `ConnectedAppsCard` from the existing `retro-rocket/src/pages/Profile.tsx`, alongside the existing `LinkedProvidersCard` (no new route or navigation entry needed — this codebase has no separate "settings" area; the profile page at `/perfil` is the existing account-management surface) (depends on T026)
- [X] T028 [US1] Verify WCAG 2.1 AA conformance (contrast, visible focus, keyboard operability, no color-only cues) for the consent screen and the Connected Apps card in both light and dark themes (depends on T025–T027)

**Checkpoint**: User Story 1 is fully functional and independently testable — a user can connect, see, and revoke an AI client, with the next request after revocation rejected.

---

## Phase 4: User Story 4 - Facilitator notes stay private (Priority: P1)

**Goal**: A single, shared, well-tested rule decides whether facilitator notes may be included in a response — ready for User Story 3 and User Story 5 to wire in, so the privacy guarantee can never be implemented twice, slightly differently.

**Independent Test**: Unit-test `FacilitatorAccess.canIncludeFacilitatorNotes` directly against fixture retrospectives/uids — this does not require the MCP tool infrastructure (US2/US3/US5) to exist yet.

### Tests for User Story 4

- [X] T029 [P] [US4] Unit test for `FacilitatorAccess.canIncludeFacilitatorNotes`: returns `true` when the requester uid equals the retrospective's `createdBy`; returns `false` for any other (including participant) uid — in `retro-rocket/server/test/domain/mcp/FacilitatorAccess.test.ts`

### Implementation for User Story 4

- [X] T030 [US4] Implement `FacilitatorAccess.canIncludeFacilitatorNotes(retrospective, requesterUid)` per `research.md` §7 in `retro-rocket/server/src/domain/mcp/FacilitatorAccess.ts` (makes T029 pass)

**Checkpoint**: The shared privacy rule is implemented and independently verified, ready to be consumed by User Story 3 and User Story 5.

---

## Phase 5: User Story 2 - List my retrospectives (Priority: P2)

**Goal**: An authorized connection can list every retrospective the connected user has access to (as facilitator or participant), including ones created/joined after authorization.

**Independent Test**: `quickstart.md` step 5, first bullet — call `list_retrospectives` and verify it returns exactly the seeded retrospective(s) for that user and nothing belonging to another user.

### Tests for User Story 2

- [X] T031 [P] [US2] Contract test for the `list_retrospectives` MCP tool per `contracts/mcp-tools.md`: returns retrospectives the user created (`role: "facilitator"`) or joined (`role: "participant"`); returns `{ "retrospectives": [] }` for a user with none; never includes another user's retrospective; **and** — per FR-006/Clarification Q2 — a retrospective created or joined *after* the connection was authorized still appears on the very next `list_retrospectives` call, with no re-authorization — in `retro-rocket/server/test/http/routes/mcpToolsList.test.ts`

### Implementation for User Story 2

- [X] T032 [P] [US2] Implement `listRetrospectivesForUser` (retrospectives where `createdBy == uid` OR a `Participant` with `userId == uid` exists) on a new read-only `FirestoreRetrospectiveReadAdapter` in `retro-rocket/server/src/adapters/firebase/FirestoreRetrospectiveReadAdapter.ts`
- [X] T033 [US2] Implement the `ListRetrospectives` use-case in `retro-rocket/server/src/application/use-cases/mcp/ListRetrospectives.ts` (depends on T032)
- [X] T034 [US2] Register the `list_retrospectives` tool (schema + handler, protected by the T024 bearer-auth middleware) in `retro-rocket/server/src/http/routes/mcp.ts` (depends on T033, T024; makes T031 pass)

**Checkpoint**: User Stories 1, 4, and 2 all work independently; an authorized connection can now discover its retrospectives.

---

## Phase 6: User Story 3 - View retrospective detail (Priority: P2)

**Goal**: An authorized connection can fetch one retrospective's full detail — cards, groupings, reactions, participants, sentiment, action items — with facilitator notes included only for that retrospective's facilitator.

**Independent Test**: `quickstart.md` steps 5–6 — call `get_retrospective_detail` as the facilitator (notes present) and again as a participant (notes key absent); confirm an inaccessible/nonexistent id yields the same `not_found` error.

### Tests for User Story 3

- [X] T035 [P] [US3] Contract test for `get_retrospective_detail` per `contracts/mcp-tools.md`: full shape with cards/groups/reactions/participants/sentiment/actionItems; empty collections (not an error) for a board with no cards yet; sentiment section omits cards with no result rather than fabricating one; identical `not_found` for a nonexistent id and one the connection has no access to; **and** — per SC-004 — every field returned matches the corresponding field the existing `UnifiedExportData`/export pipeline produces for the same seeded retrospective (cross-check against the fixtures already used by `retro-rocket/src/test/features/boards/export/*.test.ts`) — in `retro-rocket/server/test/http/routes/mcpToolsDetail.test.ts`
- [X] T036 [P] [US3] Contract test: `get_retrospective_detail` includes `facilitatorNotes` when the connection's uid is the retrospective's facilitator, and the key is entirely absent (not `null`/`[]`) when it is a participant connection — in `retro-rocket/server/test/http/routes/mcpToolsDetailFacilitatorNotes.test.ts`

### Implementation for User Story 3

- [X] T037 [P] [US3] Extend `FirestoreRetrospectiveReadAdapter` with read-only methods for cards, groups, likes/reactions, sentiment results, action items, and facilitator notes, per `data-model.md`, in `retro-rocket/server/src/adapters/firebase/FirestoreRetrospectiveReadAdapter.ts`
- [X] T038 [US3] Implement the `GetRetrospectiveDetail` use-case — rejects with a uniform `not_found` when the retrospective doesn't exist or the connection has no access (FR-009), and calls `FacilitatorAccess.canIncludeFacilitatorNotes` (T030) to decide whether to include the facilitator-notes section — in `retro-rocket/server/src/application/use-cases/mcp/GetRetrospectiveDetail.ts` (depends on T037, T030)
- [X] T039 [US3] Register the `get_retrospective_detail` tool in `retro-rocket/server/src/http/routes/mcp.ts` (depends on T038, T024; makes T035–T036 pass)

**Checkpoint**: User Stories 1, 4, 2, and 3 all work independently — an assistant can now discover and read full retrospective detail with facilitator notes correctly gated.

---

## Phase 7: User Story 5 - Get a report-ready summary (Priority: P3)

**Goal**: An authorized connection can fetch one structured, report-ready summary of a retrospective in a single call.

**Independent Test**: `quickstart.md` step 5, third bullet — call `get_retrospective_summary` and verify grouped feedback, standout items, sentiment breakdown, and action items are all present, with facilitator notes gated exactly as in User Story 3, and no error for a minimal-data retrospective (sections with nothing simply omitted).

### Tests for User Story 5

- [X] T040 [P] [US5] Contract test for `get_retrospective_summary` per `contracts/mcp-tools.md`: grouped feedback by column/group, standout/most-reacted items, sentiment breakdown counts, action items with owners; facilitator-notes gating identical to User Story 3; a minimal-data retrospective (no reactions/action items) returns a valid summary with those sections omitted rather than an error; **and**, per FR-009, identical `not_found` for a nonexistent retrospective id and one the connection has no access to (the same equivalence already required of `get_retrospective_detail` in T035, restated here because `get_retrospective_summary` is a separate tool/code path); **and** — per SC-004 — the summary's underlying figures (card counts, action items) match the same seeded retrospective's `UnifiedExportData` fixtures, consistent with T035's cross-check — in `retro-rocket/server/test/http/routes/mcpToolsSummary.test.ts`

### Implementation for User Story 5

- [X] T041 [P] [US5] Implement the pure `RetrospectiveSummary` aggregation logic (group cards by column/group, rank standout items by reaction count, tally the sentiment breakdown) per `data-model.md` in `retro-rocket/server/src/domain/mcp/RetrospectiveSummary.ts`
- [X] T042 [US5] Implement the `GetRetrospectiveSummary` use-case, composing `FirestoreRetrospectiveReadAdapter` reads (T037) with the `RetrospectiveSummary` aggregation (T041) and `FacilitatorAccess` gating (T030), reusing the same `not_found` access check as User Story 3 — in `retro-rocket/server/src/application/use-cases/mcp/GetRetrospectiveSummary.ts` (depends on T037, T041, T030)
- [X] T043 [US5] Register the `get_retrospective_summary` tool in `retro-rocket/server/src/http/routes/mcp.ts` (depends on T042, T024; makes T040 pass)

**Checkpoint**: All five user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validation and hardening that spans every user story above

- [X] T044 [P] Add a Playwright E2E spec covering the full flow (authorize → list → detail as facilitator → detail as participant → summary → revoke → next call rejected) against the Firebase emulator in `retro-rocket/e2e/mcp-connector.spec.ts`
- [X] T045 [P] Apply rate limiting to `/api/mcp/token` and the `/api/mcp` tool-call endpoint (reusing the `express-rate-limit` pattern already used in `retro-rocket/server/src/http/routes/auth.ts`) so a client exceeding free-tier-appropriate limits gets a distinguishable `rate_limited` error (FR-016) in `retro-rocket/server/src/http/routes/mcp.ts`
- [X] T046 Run `npm run test:server:coverage` and confirm the existing 80% branches/functions/lines/statements floor is maintained with the new code included
- [ ] T047 Manually run through `quickstart.md` end-to-end against the local emulator stack and record the outcome of each step
- [X] T048 [P] Document the new MCP connector (what it is, how a user connects an AI client, how to revoke) in the project's existing README/docs
- [ ] T049 Per FR-015/SC-006: after adding `@modelcontextprotocol/sdk` (T001) and all MCP routes, run the existing `npm run build`/bundle-backend pipeline and confirm (a) the bundled `retro-rocket/api/_backend.mjs` output is still a single function (no second Vercel function/project introduced) and (b) its size and the `GetRetrospectiveSummary`/`GetRetrospectiveDetail` p95 latency from T044's E2E run stay comfortably within Vercel's free-tier function size/execution limits; record the measured numbers against the <10s p95 target in `plan.md`'s Performance Goals
- [X] T050 [P] Optional hardening for FR-013: add an architecture test asserting `FirestoreRetrospectiveReadAdapter` calls no Firestore write method (`set`/`update`/`delete`/`add`), following the same static-scan style as `retro-rocket/server/test/architecture/domain-isolation.test.ts`, in `retro-rocket/server/test/architecture/mcp-read-only.test.ts`
- [ ] T051 [P] Optional hardening: add `@firebase/rules-unit-testing` as a dev dependency and write a rules test confirming client SDK reads/writes are denied on `mcpClients`, `mcpAuthorizationCodes`, and `mcpConnections` (the deny-all rules added in T009) in `retro-rocket/test/firestore-rules/mcp.rules.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3, P1)**: Depends on Foundational only
- **User Story 4 (Phase 4, P1)**: Depends on Foundational only (does not depend on US1 — it is a pure domain rule)
- **User Story 2 (Phase 5, P2)**: Depends on Foundational; its tool call is protected by the bearer-auth middleware built in US1 (T024), so US1 must be complete first in practice even though the spec priorities list US2 after US4
- **User Story 3 (Phase 6, P2)**: Depends on Foundational, US1 (T024 middleware), and US4 (T030 `FacilitatorAccess`)
- **User Story 5 (Phase 7, P3)**: Depends on Foundational, US1 (T024 middleware), and US4 (T030 `FacilitatorAccess`); independent of US2/US3's own tasks (does not reuse their use-case code, only the shared adapter methods from T037)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### Within Each User Story

- Tests MUST be written and FAIL before implementation (constitution Principle I, NON-NEGOTIABLE)
- Domain entities/pure logic before adapters; adapters before use-cases; use-cases before route wiring
- Story complete (checkpoint reached) before moving to the next priority

### Parallel Opportunities

- Setup tasks marked [P] (T002, T003) run in parallel
- Foundational tasks marked [P] (T004, T006, T008, T009) run in parallel; T005 waits on T004, T007 waits on T006
- Once Foundational is done, **US1 and US4 can be built in parallel** (different files, no shared dependency between them)
- Once US1 (T024) and US4 (T030) are both done, **US2, US3, and US5 can largely proceed in parallel** by different developers, since each registers a different tool and touches different use-case files (all three do extend the same `FirestoreRetrospectiveReadAdapter` file, so T032/T037 should be coordinated or done sequentially by one owner)
- All contract/unit tests within a phase marked [P] run in parallel
- Polish tasks marked [P] (T044, T045, T048, T050, T051) run in parallel; T046, T047, T049 are sequential validation steps best run after the others land

---

## Parallel Example: User Story 1

```bash
# Launch all User Story 1 tests together (after Foundational is done):
Task: "Contract test for POST /api/mcp/register in retro-rocket/server/test/http/routes/mcpRegister.test.ts"
Task: "Contract test for GET /api/mcp/authorize in retro-rocket/server/test/http/routes/mcpAuthorize.test.ts"
Task: "Contract test for POST /api/mcp/token in retro-rocket/server/test/http/routes/mcpToken.test.ts"
Task: "Contract test for GET/DELETE /api/mcp/connections in retro-rocket/server/test/http/routes/mcpConnections.test.ts"
Task: "Unit test for the MCP bearer-auth middleware in retro-rocket/server/test/http/middleware/mcpAuth.test.ts"

# Once those fail as expected, launch the independent use-case implementations together:
Task: "Implement RegisterMcpClient in retro-rocket/server/src/application/use-cases/mcp/RegisterMcpClient.ts"
Task: "Implement AuthorizeMcpConnection in retro-rocket/server/src/application/use-cases/mcp/AuthorizeMcpConnection.ts"
Task: "Implement ExchangeMcpToken in retro-rocket/server/src/application/use-cases/mcp/ExchangeMcpToken.ts"
Task: "Implement ListConnections and RevokeConnection in retro-rocket/server/src/application/use-cases/mcp/ListConnections.ts and RevokeConnection.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `quickstart.md` steps 2–4 and 7 pass; the trust boundary (connect/list/revoke, immediate rejection) works end to end
5. Note: US1 alone proves the connection/authorization boundary but delivers no report-generation value yet — for a demoable "generate a report" MVP, continue through US4 → US2 → US3 before stopping

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 (connect/revoke) + US4 (facilitator-notes rule, built in parallel) → trust boundary and privacy rule both proven independently
3. US2 (list) → an assistant can discover retrospectives
4. US3 (detail, wiring US4's rule) → an assistant can read full retrospective content, correctly privacy-gated — this is the first checkpoint that delivers the feature's core promise
5. US5 (summary) → an assistant can produce a report-ready summary in one call
6. Polish → E2E coverage, rate limiting, coverage floor, docs

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done: Developer A takes US1, Developer B takes US4 (fully independent of each other)
3. Once both are done: Developer A takes US2, Developer B takes US3, Developer C takes US5 (coordinate on the shared `FirestoreRetrospectiveReadAdapter` file — T032/T037 touch the same file)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify each test fails before implementing against it
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- US2/US3/US5 all extend the same `FirestoreRetrospectiveReadAdapter.ts` file (T032, T037) — treat that file as a serialization point even when otherwise working those stories in parallel
- T050 and T051 are optional hardening (LOW priority, from analysis findings L1/L2) — skip them without blocking any user story if time is constrained; T049 (free-tier fit check) is not optional, since it is the only task validating FR-015/SC-006
