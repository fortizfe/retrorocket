# Quickstart: Validating Mi Perfil Backend-Mediated Firebase Access

Prerequisites: Firebase emulator suite configured (as used by `npm run e2e`), repo dependencies installed (`npm install` at `retro-rocket/`).

## 1. Run the backend and frontend together against the emulator

```bash
cd retro-rocket
npm run emulators &        # firebase emulators:start --only auth,firestore
npm run dev:all            # runs `vite` (frontend) + `vite-node --watch server/src/dev-server.ts` (backend) concurrently
```

## 2. Sign in and confirm zero direct Firebase calls from Mi Perfil

1. Open the app, sign in (Google/GitHub, or `/api/auth/test-login` in emulator/test mode) — this is the **first** sign-in for this user, so profile creation is exercised.
2. Open DevTools Network, filter by domain, navigate to Mi Perfil.
3. **Expected**: a single `GET /api/profile` request (plus the app-wide `/api/auth/session` already made at bootstrap). Zero requests to any `*.googleapis.com`/`*.firebaseio.com`/`identitytoolkit.googleapis.com` endpoint triggered by Mi Perfil itself. (The one-time `signInWithCustomToken` call from `bootstrapSession()` at sign-in, and `firebase/auth`'s local, network-free `signOut()`, are expected and out of scope — see spec Assumptions and research.md §5.)
4. Confirm the displayed display name, email, avatar, primary provider, and member-since date match what the user had before this migration (SC-004) — compare against a profile that predates this branch if available (e.g. an emulator snapshot from before deploying this change), same regression-safety check `017`'s quickstart used for boards.

## 3. Exercise each user story

**View profile (US1)**: Reload Mi Perfil for an existing user; confirm the same fields render, sourced from `GET /api/profile` (`contracts/profile-api.yaml`). Kill the backend (or `page.route('**/api/profile', route => route.abort('failed'))` in a quick DevTools/Playwright check) and reload: confirm a visible error state appears, not a blank page or crash (FR-008).

**First sign-in (US1, Acceptance Scenario 2)**: Using the emulator, sign in as a brand-new user (no prior `users/{uid}` doc). Confirm `GET /api/profile` returns `201`-equivalent defaults (`200` with a freshly-created doc): display name from OAuth identity or email prefix, avatar from the OAuth provider, `primaryProvider` set, `createdAt` set — and Mi Perfil renders them correctly with no direct Firestore write visible in the Network tab.

**Update display name (US2)**: Change the display name, save, confirm:
   - `PATCH /api/profile` fires and returns `200` with the new value.
   - The new name is reflected immediately in the UI and persists after a page reload.
   - Submitting an empty/blank name is rejected client-side with **no** `PATCH /api/profile` request made at all (Acceptance Scenario 2).
   - Simulate a backend failure (`page.route('**/api/profile', route => route.abort('failed'))` on the `PATCH`) and confirm a clear error message appears and the previously saved name remains displayed (no partial update, Acceptance Scenario 3).

**Sign out (US3)**: Click "Cerrar sesión"; confirm `POST /api/auth/logout` fires, the app returns to signed-out state, and a subsequent request to any session-authenticated endpoint (e.g. `GET /api/profile`) is rejected with `401`. Simulate a logout failure and confirm a clear error message with no ambiguous half-signed-out state (Acceptance Scenario 2).

**Linked providers / connected AI assistants (US4, regression only)**: Confirm the linked-providers list still matches the account's actual providers and that linking an additional one still completes via the existing `/api/auth/link/:provider` redirect. Confirm the connected-AI-assistants list still matches authorized MCP clients and that revoking one removes it immediately. Confirm the Network tab shows no new direct Firebase calls introduced by this feature in either flow (research.md §6).

## 4. Regression-check unaffected controls

Confirm "Exportar mis datos" and "Eliminar cuenta" remain visibly disabled with no click handler (FR-012) — no code changes here, just verify nothing accidentally enabled them.

## 5. Automated checks

```bash
npm run test:server           # backend unit tests, incl. new profile use-cases/adapter/routes
npm run test:run              # frontend unit tests, incl. new backendProfileClient, updated UserContext tests
npm run type-check:server && npm run type-check
npm run lint
npm run e2e                   # Playwright, incl. new profile.spec.ts critical-flow spec
```

All must pass, and `server/vitest.config.ts` / root `vitest.config.ts` coverage thresholds (80% branches/functions/lines/statements) must hold, per constitution Principles I, VI, VII.

## 6. Validate the SC-001 performance target

1. **Warm**: with `npm run dev:all` already running for a few minutes, open DevTools Network, and time `GET /api/profile` and `PATCH /api/profile` from request start to response. **Expected**: each under 3 s.
2. **Cold**: restart `npm run dev:server` (or deploy a preview and hit it immediately after a period of inactivity) and repeat both timed requests. **Expected**: each under 5 s.
3. Record the observed timings; if either target is missed, treat it as a regression against the baseline already established in `014-backend-auth-foundation`'s SC-005, not a new, looser target for this feature.

## 7. Validate SC-005 (unauthorized cross-profile access)

Since `uid` always comes from the verified session (never a request parameter — data-model.md), there is no endpoint shape that accepts "read/modify another user's profile." Confirm this by inspection of `contracts/profile-api.yaml` (no `:uid`/`:id` parameter on either route) and by a direct REST-client check: calling `GET`/`PATCH /api/profile` with **no** session cookie returns `401` (not another user's data), and calling it with **a different user's** valid session cookie returns only that session's own profile — there is no way to address another user's document at all.
