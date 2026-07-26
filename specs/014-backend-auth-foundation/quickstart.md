# Quickstart & Validation: Backend Foundation & Auth

**Feature**: 014-backend-auth-foundation | **Date**: 2026-07-26

A run/validation guide proving the feature works end-to-end. Implementation details live in `tasks.md`; contracts in [`contracts/auth-api.yaml`](./contracts/auth-api.yaml); models in [`data-model.md`](./data-model.md).

All commands run from the Vercel project root: `retro-rocket/`.

## Prerequisites

- Node.js 20.x, npm
- Firebase CLI (for the Auth + Firestore emulators, already used by the repo)
- Backend env (local `.env`, never committed):
  - `SESSION_SIGNING_KEY` — session JWT signing secret
  - `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET`
  - `OAUTH_REDIRECT_BASE_URL` — e.g. `http://localhost:3000`
  - `FIREBASE_SERVICE_ACCOUNT` (or emulator settings) for `firebase-admin`
  - `AUTH_TEST_MODE=true` **only** for emulator/E2E runs

## Setup

```bash
cd retro-rocket
npm install                 # includes new backend deps (express, firebase-admin, jose, arctic, cookie)
```

## Run locally (same-origin)

```bash
# Terminal A — backend + emulators
npm run emulators           # Firebase Auth + Firestore emulators
npm run dev:server          # Express app on :3001

# Terminal B — frontend (proxies /api → :3001)
npm run dev                 # Vite SPA on :3000
```

Open http://localhost:3000. `/api/*` is proxied to the backend, preserving same-origin cookies (FR-002a).

## Validation scenarios

### V1 — Backend foundation is live (User Story 1)
```bash
curl -s http://localhost:3000/api/health | jq
```
**Expect**: `{ "status": "ok", "version": "...", "time": "..." }`.
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/does-not-exist
```
**Expect**: `404` with a JSON `ApiError` body (structured error + `correlationId`), not an HTML page or a crash.

### V2 — Backend-driven sign-in (User Story 2)
1. In the app, click **Continue with Google** (or GitHub).
2. **Expect**: full-page redirect to the provider, consent, redirect back through `/api/auth/callback/:provider`, landing authenticated on the dashboard.
3. Inspect cookies: an `rr_session` cookie exists with `HttpOnly`, `Secure`, `SameSite=Lax` and is **not** readable from `document.cookie`.
4. **Expect**: no OAuth handshake initiated by client JS (the browser navigates to `/api/...`; the Firebase popup path is gone).

### V3 — Session hydration + Firestore continuity (User Story 3)
```bash
# with the session cookie from a browser session:
curl -s http://localhost:3000/api/auth/session -b "rr_session=<cookie>" | jq
```
**Expect**: `{ authenticated: true, user: {...}, firebaseCustomToken: "..." }`. In the app, the token is exchanged via `signInWithCustomToken`, after which existing features (open board, add/vote/group cards, countdown, export) work unchanged under the existing `firestore.rules` (`sign_in_provider == 'custom'` passes).

### V4 — Persistence + silent refresh (FR-010a, SC-008)
1. Sign in, close the browser, reopen within the absolute lifetime → still signed in (Firebase SDK session + `/api/auth/session` rehydration).
2. `POST /api/auth/refresh` → `200` with a rotated cookie and a new custom token; `absExp` unchanged.

### V5 — Logout (FR-012)
```bash
curl -s -X POST http://localhost:3000/api/auth/logout -b "rr_session=<cookie>" -i | grep -i set-cookie
```
**Expect**: `204`, `Set-Cookie` clears `rr_session`; a subsequent `/api/auth/session` returns `{ authenticated: false }`.

### V6 — Failure states, no silent failures (FR-015)
- Forged/expired `state` on callback → `401` `ApiError` with code `invalid_oauth_state`; app shows a localized error and stays signed out.
- Provider error / user cancels → app returns to sign-in with a clear message.

## Tests & gates (must pass before merge)

```bash
npm run test:server         # Vitest (node env) — backend unit tests, ≥80% coverage
npm run test:coverage       # Frontend units incl. refactored auth client
npm run e2e                 # Playwright auth flow vs emulator (uses AUTH_TEST_MODE test-login)
npm run type-check          # tsc strict (frontend + server)
npm run lint                # ESLint
```

**Definition of done for this feature** (maps to Success Criteria):
- `GET /api/health` healthy (SC-001); sign-in reaches authenticated state (SC-002).
- All existing critical E2E flows pass — zero regression (SC-003).
- Backend suite ≥ 80% coverage, runs in CI (SC-004).
- Time-to-authenticated ≤ 3 s p95 warm / ≤ 5 s p95 with cold start (SC-005).
- No provider secret / signing key in the client bundle (SC-006) — verify: `grep -R "OAUTH_CLIENT_SECRET\|SESSION_SIGNING_KEY" dist/` returns nothing.
- Failure states never silent (SC-007); restart keeps session (SC-008); logs/metrics/traces carry a correlation id and no secrets/PII (SC-009).

## Deploy note

Update `vercel.json` so `/api/*` is excluded from the SPA rewrite (e.g. `/((?!assets/|api/).*) → /index.html`); otherwise auth calls return `index.html`. Set all backend env vars in Vercel project settings (never `VITE_`-prefixed — those ship to the client).
