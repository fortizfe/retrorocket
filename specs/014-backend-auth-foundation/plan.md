# Implementation Plan: Backend Service Foundation & Backend-Driven Authentication

**Branch**: `014-backend-auth-foundation` | **Date**: 2026-07-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-backend-auth-foundation/spec.md`

## Summary

Introduce a standalone, hexagonally-architected backend service (TypeScript + Express.js) deployed as **same-origin serverless HTTP functions** under `/api/*` on the existing Vercel project, and move the authentication flow into it. The backend orchestrates a **full-page-redirect OAuth** handshake with Google and GitHub, becomes the **session authority** via an `httpOnly`/`Secure`/`SameSite=Lax` cookie, and — because Firestore access stays client-side — issues the browser a **Firebase custom token** so the existing Firestore security rules (which only block `anonymous`) keep authorizing client reads/writes unchanged. Domain and application logic sit behind ports/adapters with Node-environment unit tests at the constitutional 80% floor; the auth flow gains Playwright E2E coverage. Firestore/data access and MCP capabilities are explicitly out of scope; the service is merely structured so MCP handlers can be added later without re-architecture.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 20.x (Vercel serverless runtime)

**Primary Dependencies**:
- Backend runtime: `express` (HTTP framework — driving adapter), `firebase-admin` (identity store + custom-token minting), a JWT library (`jose`) for the signed session cookie, `cookie`/`cookie-parser` for cookie handling, and an OAuth 2.0 authorization-code client (`arctic` — actively maintained, provider presets for Google & GitHub; alternative `openid-client`). See `research.md` for the decision.
- Backend tests: `vitest` (Node environment) — reuses the toolchain already committed in the repo.
- Frontend (existing): React 18 + Vite + `firebase` (client SDK, retained only for Firestore + `signInWithCustomToken`).

**Storage**: No new datastore. Firestore remains the client-side data store (unchanged rules). The backend is **stateless** — session state is carried entirely in the signed cookie (no server session store).

**Testing**: Vitest unit tests for backend domain/application (Node env, 80% floor); Vitest for changed frontend units; Playwright E2E for the auth flow against the Firebase Emulator Suite.

**Target Platform**: Vercel serverless functions (same origin/domain as the SPA, `/api/*` path), plus the existing Vite SPA.

**Project Type**: Web application — existing frontend (`retro-rocket/src`) + new backend (`retro-rocket/server` and `retro-rocket/api`) within the existing Vercel project root `retro-rocket/`.

**Performance Goals**: No perceptible regression in time-to-authenticated versus today, including a cold serverless start (spec SC-005). Health endpoint healthy on 100% of steady-state checks (SC-001).

**Constraints**:
- Same-origin `/api/*`, first-party cookies, no CORS (FR-002a).
- Stateless functions tolerant of cold starts (FR-006).
- OAuth provider secrets and session-signing key live only in backend env; never shipped to the browser (FR-018).
- No weakening of `firestore.rules` (constitution — Real-Time Data Security).

**Scale/Scope**: Team-scale collaborative app. This iteration: ~6 HTTP endpoints (health + auth), 2 OAuth provider adapters, 1 identity adapter, 1 session adapter, ~5 use cases, and the frontend auth-delegation refactor. No MCP, no data endpoints.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Impact & Compliance | Status |
|-----------|---------------------|--------|
| I. TDD (NON-NEGOTIABLE) | Every backend use case, adapter, and domain rule is written test-first (red→green→refactor). `tasks.md` will order tests before implementation. | ✅ PASS |
| II. Library-First | Backend is a decoupled module (`server/`) with explicit public boundaries (ports); domain has no framework/Firebase imports. Frontend auth client is a self-contained module. | ✅ PASS |
| III. Prefer Proven Third-Party Libraries | New deps (`express`, `firebase-admin`, `jose`, `arctic`) are actively maintained, permissively licensed, and not duplicating existing capability; backend deps never enter the client bundle (isolated tree). Vetting recorded in `research.md`. | ✅ PASS |
| IV. SOLID | Hexagonal ports/adapters enforce Dependency Inversion; Firebase sits behind `IdentityStorePort`; OAuth providers behind `OAuthProviderPort`. Domain is testable without live Firebase. | ✅ PASS |
| V. Simplicity (KISS/YAGNI) | Reuses the existing single package + Vercel project (no monorepo restructure); stateless cookie session (no session DB); only the two existing providers; no MCP now. Deviations justified in Complexity Tracking. | ✅ PASS |
| VI. Unit Testing & 80% Floor (NON-NEGOTIABLE) | New backend code ships its **own** Vitest config with the constitutional 80% thresholds (the legacy frontend thresholds were temporarily lowered per a documented follow-up and are not lowered further by this feature). | ✅ PASS |
| VII. E2E with Playwright (NON-NEGOTIABLE) | Authentication is a listed critical flow; the redirect-based sign-in/out is covered by Playwright against the emulator, using a guarded test-auth path where the real provider UI cannot be driven (FR-016). | ✅ PASS |
| VIII. Accessibility WCAG 2.1 AA | The only user-facing surface change is the sign-in trigger (now navigates to `/api/auth/login/:provider`); existing accessible button semantics, focus, and contrast are preserved in both themes; error/loading states remain announced. | ✅ PASS |
| Strict Type Safety | Backend is TS strict; no `any` without justified inline comment. | ✅ PASS |
| Real-Time Data Security | `firestore.rules` unchanged; custom-token sign-in yields `sign_in_provider == 'custom'`, satisfying existing non-anonymous rules. Client + rules validation both remain in force. | ✅ PASS |
| Internationalization | Any new user-visible auth text (errors, loading) is added via i18next to all locales; no hardcoded strings. | ✅ PASS |
| Error Handling & Resilience | Loading/error/reconnection states for auth are explicit; no silent failures (FR-015); structured backend errors (FR-004). | ✅ PASS |

**Gate result: PASS.** No unjustified violations. Justified complexity is recorded in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/014-backend-auth-foundation/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── auth-api.yaml     # OpenAPI for /api/health + /api/auth/*
├── checklists/
│   └── requirements.md   # From /speckit-specify + /speckit-clarify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

The Vercel project root is `retro-rocket/`. The backend is added as an isolated tree; the frontend under `retro-rocket/src/` is untouched except for the auth-delegation refactor.

```text
retro-rocket/
├── api/                              # Vercel serverless entrypoint (thin driving shell)
│   └── [[...path]].ts                # Catch-all → hands the request to the Express app
│
├── server/                           # Hexagonal backend (Node; own tsconfig + vitest)
│   ├── src/
│   │   ├── domain/                   # Pure domain — no express, no firebase
│   │   │   └── auth/
│   │   │       ├── UserIdentity.ts
│   │   │       ├── Session.ts
│   │   │       ├── OAuthState.ts
│   │   │       └── errors.ts
│   │   ├── application/
│   │   │   ├── ports/
│   │   │   │   ├── OAuthProviderPort.ts
│   │   │   │   ├── IdentityStorePort.ts      # get-or-link user, mint custom token
│   │   │   │   ├── SessionServicePort.ts     # issue/verify/refresh signed cookie
│   │   │   │   ├── ClockPort.ts
│   │   │   │   └── observability/{LoggerPort,MetricsPort,TracerPort}.ts
│   │   │   └── use-cases/
│   │   │       ├── StartOAuthLogin.ts
│   │   │       ├── CompleteOAuthLogin.ts
│   │   │       ├── GetCurrentSession.ts
│   │   │       ├── RefreshSession.ts
│   │   │       └── Logout.ts
│   │   ├── adapters/                          # Driven adapters implement ports
│   │   │   ├── oauth/{GoogleOAuthAdapter,GithubOAuthAdapter}.ts
│   │   │   ├── firebase/FirebaseIdentityAdapter.ts
│   │   │   ├── session/JoseSessionAdapter.ts
│   │   │   └── observability/{...}.ts
│   │   ├── http/                             # Driving adapter (Express)
│   │   │   ├── app.ts                        # builds & wires the Express app
│   │   │   ├── composition-root.ts           # dependency wiring (ports→adapters)
│   │   │   ├── routes/{health.ts,auth.ts}
│   │   │   └── middleware/{correlationId,errorHandler,cookies}.ts
│   │   └── config/env.ts                     # validated env access (fail-fast)
│   ├── test/                                 # Vitest (node env) mirrors src/
│   ├── tsconfig.json
│   └── vitest.config.ts                      # 80% thresholds
│
├── src/                              # EXISTING frontend (React/Vite) — minimal edits
│   ├── features/auth/                # Refactor: delegate to backend, drop popup handshake
│   │   └── services/backendAuthClient.ts     # calls /api/auth/*; signInWithCustomToken
│   └── lib/contexts/UserContext.tsx  # backend session becomes source of truth
│
├── vite.config.ts                    # add dev proxy: /api → local express
├── vercel.json                       # ensure /api not swallowed by SPA rewrite
└── package.json                      # add backend deps + scripts (dev:server, test:server)
```

**Structure Decision**: Web application with an isolated backend inside the existing Vercel project. The hexagonal source lives in `retro-rocket/server/src` (domain → application/ports → adapters → http), and `retro-rocket/api/[[...path]].ts` is the thin Vercel serverless shell that delegates every `/api/*` request to the single Express app built in `server/src/http/app.ts`. This keeps one deployable unit and one origin (satisfying FR-002a) while keeping backend code out of the client bundle (Vite only bundles what `src/` imports). A separate `server/tsconfig.json` and `server/vitest.config.ts` isolate the Node build/test surface from the jsdom frontend suite.

## Complexity Tracking

| Deviation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Add a backend module + new runtime deps (express, firebase-admin, jose, arctic) | The feature's entire purpose is to introduce a backend and move auth server-side; MCP roadmap requires it | "Keep everything client-side" is the status quo this feature exists to change — not viable |
| Two source trees (`server/` + `api/`) in one package rather than a fresh npm-workspaces monorepo | Same-origin deployment and minimal disruption; Vite already ignores non-`src/` trees, so no client-bundle leakage | Full monorepo restructure is larger, riskier, and unnecessary for one backend module (violates YAGNI now); can be revisited when MCP lands |
| Backend-signed JWT session cookie instead of Firebase session cookies | Backend must be the session authority independent of the client SDK; JWT is stateless (fits serverless, no session store) | Firebase session cookies require the client to first obtain an ID token, re-coupling the session to the client SDK we are moving away from |
