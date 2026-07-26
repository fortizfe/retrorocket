---
description: "Task list for Backend Service Foundation & Backend-Driven Authentication"
---

# Tasks: Backend Service Foundation & Backend-Driven Authentication

**Input**: Design documents from `/specs/014-backend-auth-foundation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-api.yaml

**Tests**: Included and REQUIRED. Per the project constitution (Principle I — TDD, NON-NEGOTIABLE; Principle VI — 80% coverage floor), every test task MUST be written and MUST FAIL before its corresponding implementation task.

**Organization**: Tasks are grouped by user story (US1, US2, US3 from spec.md) so each story is independently implementable and testable.

## Path Conventions

Vercel project root is `retro-rocket/`. Backend lives in `retro-rocket/server/` (hexagonal source) and `retro-rocket/api/` (serverless shell); existing frontend in `retro-rocket/src/`. All paths below are repo-root-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Backend project scaffolding within the existing Vercel project.

- [X] T001 Add backend runtime deps and dev types to `retro-rocket/package.json` — installed for MVP: `express`, `cookie`, `supertest`, `concurrently`, `@types/express`, `@types/cookie`, `@types/supertest`. **Deferred to US2** (not yet needed): `firebase-admin`, `jose`, `arctic`.
- [X] T002 [P] Create backend TS config `retro-rocket/server/tsconfig.json` (strict, `module`/`moduleResolution` for Node 20, `outDir` isolated from the Vite build)
- [X] T003 [P] Create backend test config `retro-rocket/server/vitest.config.ts` (Node environment, coverage thresholds branches/functions/lines/statements = 80 per Principle VI)
- [X] T004 [P] Add npm scripts (`dev:server`, `dev:all`, `test:server`, `test:server:coverage`) to `retro-rocket/package.json`
- [X] T005 [P] Create hexagonal directory skeleton under `retro-rocket/server/src/` (`domain/auth/`, `application/ports/`, `application/use-cases/`, `adapters/`, `http/routes/`, `http/middleware/`, `config/`) with placeholder barrels
- [X] T006 [P] Extend ESLint to lint `retro-rocket/server/**` and `retro-rocket/api/**` in `retro-rocket/eslint.config.js`
- [X] T007 Update `retro-rocket/vercel.json` SPA rewrite to exclude `/api/*` (e.g. `/((?!assets/|api/).*) → /index.html`) so auth requests are not swallowed by `index.html`
- [X] T008 [P] Document backend env vars in `retro-rocket/.env.example` (`SESSION_SIGNING_KEY`, `GOOGLE_OAUTH_CLIENT_ID/SECRET`, `GITHUB_OAUTH_CLIENT_ID/SECRET`, `OAUTH_REDIRECT_BASE_URL`, `FIREBASE_SERVICE_ACCOUNT`, `AUTH_TEST_MODE`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared backend infrastructure every user story depends on: config, observability, middleware, the Express app, and the serverless/dev shells.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T009 [P] Write failing test for validated env config (fail-fast on missing/invalid) in `retro-rocket/server/test/config/env.test.ts`
- [X] T010 Implement fail-fast env config in `retro-rocket/server/src/config/env.ts` (make T009 pass)
- [X] T011 [P] Define observability ports (`LoggerPort`, `MetricsPort`, `TracerPort`) in `retro-rocket/server/src/application/ports/observability/`
- [X] T012 [P] Write failing test for structured logger + secret/PII redaction + correlation id in `retro-rocket/server/test/adapters/observability/logger.test.ts`
- [X] T013 Implement stdout-JSON Logger/Metrics/Tracer adapters with redaction in `retro-rocket/server/src/adapters/observability/` (FR-007a; make T012 pass)
- [X] T014 [P] Write failing test for correlation-id middleware (generates id, echoes response header) in `retro-rocket/server/test/http/middleware/correlationId.test.ts`
- [X] T015 Implement correlation-id middleware in `retro-rocket/server/src/http/middleware/correlationId.ts`
- [X] T016 [P] Write failing test for error-handler + not-found middleware (uniform `ApiError` envelope, no stack/secret leak) in `retro-rocket/server/test/http/middleware/errorHandler.test.ts`
- [X] T017 Implement `ApiError` envelope + error-handler + not-found middleware in `retro-rocket/server/src/http/middleware/errorHandler.ts` (FR-004)
- [X] T018 Implement Express app factory (mounts middleware; accepts injected routes/deps) in `retro-rocket/server/src/http/app.ts`
- [X] T019 Implement composition root wiring ports→adapters in `retro-rocket/server/src/http/composition-root.ts`
- [X] T020 Implement Vercel catch-all serverless shell delegating to the Express app in `retro-rocket/api/[[...path]].ts` (memoize heavy init at module scope for cold-start safety, FR-006)
- [X] T021 Implement standalone local dev-server (`:3001`) in `retro-rocket/server/src/dev-server.ts`
- [X] T022 Add Vite dev proxy `'/api' → 'http://localhost:3001'` in `retro-rocket/vite.config.ts` (same-origin parity, FR-002a)

**Checkpoint**: Express app boots locally and via the serverless shell; middleware, config, and observability are in place.

---

## Phase 3: User Story 1 - A deployable, testable backend foundation exists (Priority: P1) 🎯 MVP

**Goal**: A live, verified backend: health/readiness endpoint, structured not-found handling, and demonstrable hexagonal isolation + coverage, deployable to Vercel.

**Independent Test**: `GET /api/health` returns healthy; an unknown route returns a structured 404 `ApiError`; the backend test suite passes at ≥80% coverage; deploys to Vercel serverless.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T023 [P] [US1] Contract test for `GET /api/health` (200, `{status,version,time}`) in `retro-rocket/server/test/http/routes/health.test.ts`
- [X] T024 [P] [US1] Test unknown route returns structured 404 `ApiError` (not HTML/crash) in `retro-rocket/server/test/http/routes/notFound.test.ts`
- [X] T025 [P] [US1] Architecture test asserting `domain/` has no `express`/`firebase-admin` imports in `retro-rocket/server/test/architecture/domain-isolation.test.ts` (Principle IV / FR-003)

### Implementation for User Story 1

- [X] T026 [US1] Implement `HealthStatus` DTO + health route in `retro-rocket/server/src/http/routes/health.ts` (make T023 pass)
- [X] T027 [US1] Mount health route and not-found handler in `retro-rocket/server/src/http/app.ts` (make T024 pass)
- [X] T028 [US1] Add backend CI step (type-check + `test:server` with coverage gate) to `.github/workflows/` and mark it a required check (Principle VI / Workflow gates)
- [X] T029 [US1] Validate quickstart V1 (health + structured 404) locally and verify the serverless shell via `vercel dev`, noting cold-start latency to inform SC-005 (measured in T076)

**Checkpoint**: The backend foundation is live, tested, and deployable — demonstrable on its own (MVP).

---

## Phase 4: User Story 2 - Users authenticate through the backend (Priority: P1)

**Goal**: Google/GitHub sign-in orchestrated server-side via full-page redirect; backend becomes session authority (httpOnly cookie) and issues a Firebase custom token so client Firestore keeps working; account linking, session refresh, and logout handled by the backend.

**Independent Test**: Complete Google (and GitHub) sign-in through the app; land authenticated; `rr_session` httpOnly cookie set; `GET /api/auth/session` returns the user + a custom token; sign-out clears the session.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [ ] T030 [P] [US2] Test `UserIdentity` domain rules (verified-email requirement, provider set-union) in `retro-rocket/server/test/domain/auth/UserIdentity.test.ts`
- [ ] T031 [P] [US2] Test `Session` value object + state transitions (`exp`/`absExp`, refresh keeps `absExp`) in `retro-rocket/server/test/domain/auth/Session.test.ts`
- [ ] T032 [P] [US2] Test `OAuthState` (state match, PKCE, `returnTo` same-origin guard, TTL) in `retro-rocket/server/test/domain/auth/OAuthState.test.ts`
- [ ] T033 [P] [US2] Test `JoseSessionAdapter` (sign/verify/refresh, reject tampered/expired) in `retro-rocket/server/test/adapters/session/JoseSessionAdapter.test.ts`
- [ ] T034 [P] [US2] Test `FirebaseIdentityAdapter` against the Auth emulator (get-or-create by email, link second provider to same uid, mint custom token) in `retro-rocket/server/test/adapters/firebase/FirebaseIdentityAdapter.test.ts`
- [ ] T035 [P] [US2] Test Google + GitHub OAuth adapters (authorize URL, code exchange, profile mapping) with mocked HTTP in `retro-rocket/server/test/adapters/oauth/`
- [ ] T036 [P] [US2] Test `StartOAuthLogin` use case (issues state cookie + redirect URL) in `retro-rocket/server/test/application/use-cases/StartOAuthLogin.test.ts`
- [ ] T037 [P] [US2] Test `CompleteOAuthLogin` use case (state validation, linking, session+token issuance, `EmailNotVerifiedError`) in `retro-rocket/server/test/application/use-cases/CompleteOAuthLogin.test.ts`
- [ ] T038 [P] [US2] Test `GetCurrentSession` + `RefreshSession` (silent refresh, `absExp` boundary → 401) in `retro-rocket/server/test/application/use-cases/session.test.ts`
- [ ] T039 [P] [US2] Test `Logout` use case (clears session) in `retro-rocket/server/test/application/use-cases/Logout.test.ts`
- [ ] T040 [P] [US2] Contract tests for `/api/auth/login/:provider` + `/callback/:provider` (302, Set-Cookie, 401 invalid state) in `retro-rocket/server/test/http/routes/authLogin.test.ts`
- [ ] T041 [P] [US2] Contract tests for `/api/auth/session`, `/refresh`, `/logout` in `retro-rocket/server/test/http/routes/authSession.test.ts`
- [ ] T042 [P] [US2] Test `backendAuthClient` (calls `/api/auth/*`, exchanges custom token via `signInWithCustomToken`) in `retro-rocket/src/test/features/auth/backendAuthClient.test.ts`

### Implementation for User Story 2

- [ ] T043 [P] [US2] Implement `UserIdentity` domain entity in `retro-rocket/server/src/domain/auth/UserIdentity.ts`
- [ ] T044 [P] [US2] Implement `Session` value object in `retro-rocket/server/src/domain/auth/Session.ts`
- [ ] T045 [P] [US2] Implement `OAuthState` value object in `retro-rocket/server/src/domain/auth/OAuthState.ts`
- [ ] T046 [P] [US2] Define ports `OAuthProviderPort`, `IdentityStorePort`, `SessionServicePort`, `ClockPort` in `retro-rocket/server/src/application/ports/`
- [ ] T047 [US2] Implement `JoseSessionAdapter` in `retro-rocket/server/src/adapters/session/JoseSessionAdapter.ts` (make T033 pass)
- [ ] T048 [US2] Implement `FirebaseIdentityAdapter` in `retro-rocket/server/src/adapters/firebase/FirebaseIdentityAdapter.ts` (make T034 pass)
- [ ] T049 [US2] Implement `GoogleOAuthAdapter` + `GithubOAuthAdapter` (via `arctic`) in `retro-rocket/server/src/adapters/oauth/` (make T035 pass)
- [ ] T050 [US2] Implement `StartOAuthLogin` in `retro-rocket/server/src/application/use-cases/StartOAuthLogin.ts`
- [ ] T051 [US2] Implement `CompleteOAuthLogin` (linking + session + custom token) in `retro-rocket/server/src/application/use-cases/CompleteOAuthLogin.ts`
- [ ] T052 [US2] Implement `GetCurrentSession` + `RefreshSession` in `retro-rocket/server/src/application/use-cases/` (make T038 pass)
- [ ] T053 [US2] Implement `Logout` in `retro-rocket/server/src/application/use-cases/Logout.ts`
- [ ] T054 [US2] Implement auth routes (login, callback, session, refresh, logout) with cookie handling in `retro-rocket/server/src/http/routes/auth.ts` (make T040, T041 pass)
- [ ] T055 [US2] Register auth routes and wire OAuth/identity/session adapters in `retro-rocket/server/src/http/composition-root.ts` + `app.ts`
- [ ] T056 [US2] Implement `backendAuthClient` in `retro-rocket/src/features/auth/services/backendAuthClient.ts` (make T042 pass)
- [ ] T057 [US2] Refactor sign-in trigger to full-page navigate to `/api/auth/login/:provider` (remove popup) in `retro-rocket/src/features/auth/components/AuthButtonGroup.tsx`
- [ ] T058 [US2] Refactor `UserContext` so the backend session is the source of truth (bootstrap session + custom-token exchange on load; logout via backend) in `retro-rocket/src/lib/contexts/UserContext.tsx`
- [ ] T059 [US2] Retire client-side OAuth handshake in `retro-rocket/src/features/auth/services/accountLinking.ts` and `authProvider.ts` (linking now server-side; update dependents)
- [ ] T060 [US2] Add i18n keys for new auth loading/error states to all locales in `retro-rocket/src/locales/*` (Principle — Internationalization)
- [ ] T061 [US2] Validate quickstart V2 (backend sign-in for Google + GitHub; httpOnly cookie present; no client-side OAuth)

**Checkpoint**: End-to-end backend-driven authentication works for both providers.

---

## Phase 5: User Story 3 - Existing client features keep working after the auth refactor (Priority: P2)

**Goal**: Zero functional regression — Firestore continuity under the custom-token session, deterministic E2E for critical flows, and an emulator-only test-auth path.

**Independent Test**: The existing critical-flow Playwright suite (board create, card add/vote/group, countdown, export, sign-in/out) passes unchanged against the new auth path.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [ ] T062 [P] [US3] Test env-gated `test-login` route: mounted only when `AUTH_TEST_MODE=true`, 404 otherwise in `retro-rocket/server/test/http/routes/testLogin.test.ts` (FR-016)
- [ ] T063 [P] [US3] E2E: backend sign-in + sign-out flow (redirect/test-login) in `retro-rocket/e2e/auth.spec.ts`
- [ ] T064 [P] [US3] E2E regression: board create, card add/vote/group, countdown, export pass under new auth in `retro-rocket/e2e/` (FR-017 / SC-003)

### Implementation for User Story 3

- [ ] T065 [US3] Implement guarded `test-login` route (emulator custom token, same identity+session path) in `retro-rocket/server/src/http/routes/testLogin.ts` (make T062 pass)
- [ ] T066 [US3] Update Playwright global-setup/helpers to establish sessions via `/api/auth/test-login` (replacing `__e2eSignIn`) in `retro-rocket/e2e/`
- [ ] T067 [US3] Verify Firestore continuity: authenticated custom-token session reads/writes pass existing `firestore.rules` (`sign_in_provider == 'custom'`) — assertion in `retro-rocket/e2e/auth.spec.ts` and/or a hydration integration test
- [ ] T068 [US3] Validate quickstart V3–V6 (session hydration, persistence/silent refresh, logout, failure states — SC-007/SC-008)

**Checkpoint**: All existing critical flows work under backend-driven auth; no regressions.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T069 [P] Verify no provider secret / signing key in the client bundle: `grep -R "OAUTH_CLIENT_SECRET\|SESSION_SIGNING_KEY" retro-rocket/dist/` returns nothing (SC-006 / FR-018)
- [ ] T070 [P] Confirm backend suite ≥80% coverage and the CI required check is enforced (SC-004)
- [ ] T071 [P] Write backend README (architecture, ports/adapters, env, run/deploy) in `retro-rocket/server/README.md`
- [ ] T072 Accessibility pass on the sign-in surface (visible focus, contrast, use-of-color) in both themes per Principle VIII
- [ ] T073 [P] Observability review: every request logs a correlation id and emits latency/error/auth metrics; no secrets/tokens/PII in logs/traces (SC-009)
- [ ] T074 [P] Update root `README.md`/`docs/` to describe the new backend and same-origin `/api/*` topology
- [ ] T075 Run full `quickstart.md` validation end-to-end and confirm all Success Criteria (SC-001…SC-009)
- [ ] T076 [P] Measure time-to-authenticated and assert SC-005 thresholds (≤3 s p95 warm, ≤5 s p95 including a cold serverless start) — capture warm vs cold-start timings during `vercel dev`/preview and record in the quickstart validation notes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **US1 (Phase 3)**: Depends on Foundational. MVP.
- **US2 (Phase 4)**: Depends on Foundational; independently testable. Shares the app/middleware from Phase 2 with US1 but does not require US1's health route.
- **US3 (Phase 5)**: Depends on Foundational; exercises US2's auth in E2E, so in practice runs after US2 is functional (its regression suite validates US2 + existing flows together).
- **Polish (Phase 6)**: After the desired stories are complete.

### User Story Dependencies

- **US1 (P1)**: Foundational only. No dependency on other stories.
- **US2 (P1)**: Foundational only. Independently testable via its own contract/integration tests.
- **US3 (P2)**: Foundational; validates end-to-end behavior of US2 + legacy flows (E2E depends on US2 being implemented to pass green).

### Within Each User Story (TDD)

- Test tasks MUST be written and FAIL before their implementation task.
- Domain → ports → adapters → use-cases → routes → frontend.
- Story complete and green before moving to the next priority.

---

## Parallel Opportunities

- All `[P]` Setup tasks (T002–T006, T008) can run together.
- Foundational `[P]` tests (T009, T012, T014, T016) can be authored in parallel; their implementations are sequential where they touch `app.ts`.
- US1 tests T023–T025 are all `[P]`.
- US2 is highly parallel at the test layer: T030–T042 are independent files and can be written together; domain implementations T043–T046 are `[P]`; adapter implementations (T047–T049) touch distinct files and can parallelize once their tests exist.
- US3 tests T062–T064 are `[P]`.
- Polish tasks T069, T070, T071, T073, T074 are `[P]`.

### Parallel Example: User Story 2 (test-first burst)

```bash
# Author these failing tests together, then implement to green:
Task: "Test UserIdentity rules in server/test/domain/auth/UserIdentity.test.ts"
Task: "Test Session transitions in server/test/domain/auth/Session.test.ts"
Task: "Test OAuthState guards in server/test/domain/auth/OAuthState.test.ts"
Task: "Test JoseSessionAdapter in server/test/adapters/session/JoseSessionAdapter.test.ts"
Task: "Contract tests for auth login/callback in server/test/http/routes/authLogin.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (`/api/health`, structured 404, coverage, deploy). Demo the live backend.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → deployable backend (MVP).
3. US2 → backend-driven auth → test independently → demo.
4. US3 → regression-proof continuity → test independently → demo.
5. Polish → hardening, docs, full quickstart validation.

---

## Notes

- `[P]` = different files, no incomplete dependencies. Tasks that both edit `app.ts`/`composition-root.ts` are intentionally NOT marked `[P]`.
- Every `[Story]` task traces to a user story; Setup/Foundational/Polish carry no story label by design.
- Verify each test FAILS before implementing (Principle I).
- Do not weaken `firestore.rules`; custom-token sign-in must satisfy existing non-anonymous rules.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
