# Quickstart: Validating Dashboard Backend-Mediated Firebase Access

Prerequisites: Firebase emulator suite configured (as used by `npm run e2e`), repo dependencies installed (`npm install` at `retro-rocket/`).

## 1. Run the backend and frontend together against the emulator

```bash
cd retro-rocket
npm run emulators &        # firebase emulators:start --only auth,firestore
npm run dev:all            # runs `vite` (frontend) + `vite-node --watch server/src/dev-server.ts` (backend) concurrently
```

## 2. Sign in and confirm zero direct Firestore calls from the Dashboard

1. Open the app, sign in (Google/GitHub, or `/api/auth/test-login` in emulator/test mode).
2. Open the browser DevTools Network tab, filter by domain, navigate to the Dashboard ("Mis tableros").
3. **Expected**: requests to `/api/boards` (and `/api/auth/session`) only. Zero requests to any `*.googleapis.com`/`*.firebaseio.com` Firestore endpoint triggered by the Dashboard itself. (The one-time `signInWithCustomToken` call from `bootstrapSession()` at sign-in is expected and out of scope — see spec Assumptions.)

## 3. Exercise each user story

**List (US1)**: With a user that has both created and joined boards, confirm the Dashboard shows all of them, correctly split by the "created"/"joined" filter counts, matching `GET /api/boards`'s response (`contracts/boards-api.yaml`). **SC-004 check**: use a board and a `participants` membership that were created *before* this feature's code existed (e.g. seed data from an emulator snapshot predating this branch, or any board created via the old direct-Firestore path prior to deploying this change) and confirm it lists correctly, categorized correctly — proving no pre-existing board or membership became invisible under the new `participants`-derived query (research.md §3).

**Create (US2)**: Click "New Board", pick each template (Default, Mad-Sad-Glad, Start-Stop-Continue) in turn, confirm:
   - A `POST /api/boards` call fires and returns `201 { boardId }`.
   - The new board appears in the list and the browser navigates to `/retro/{boardId}`.
   - The board's columns (verify by opening it) match the chosen template plus the automatic action-items column.

**Join (US3)**: As a second user, use "Join a retrospective" with a board ID created above:
   - A `POST /api/boards/{id}/join` call fires and returns `200`.
   - The board now appears in that user's Dashboard list under "joined".
   - Submitting the same ID again does not create a duplicate entry (still one board in the list).
   - Submitting a bogus/nonexistent ID surfaces a visible error, no crash.

**Rename/Delete (US4)**: As the board's owner:
   - Rename it via the edit modal; confirm `PATCH /api/boards/{id}` fires and the new title is reflected immediately and after a page reload.
   - Delete it; confirm `DELETE /api/boards/{id}` fires, the board disappears from the list, and re-fetching `GET /api/boards` no longer includes it.
   - As a *different*, non-owner user who is a participant of some board, confirm the UI offers no rename/delete affordance for that board, and (optionally) confirm a direct `PATCH`/`DELETE` call against it from a REST client returns `403`.

## 4. Regression-check unaffected controls

With a list of 15+ boards, confirm search, sort (name/date), filter (all/created/joined), grid/list view toggle, and pagination all behave exactly as before — these are pure frontend operations over the `GET /api/boards` response and should need no behavior change (spec FR-007).

## 5. Automated checks

```bash
npm run test:server           # backend unit tests, incl. new boards use-cases/adapter/routes
npm run test:run              # frontend unit tests, incl. new backendBoardsClient
npm run type-check:server && npm run type-check
npm run lint
npm run e2e                   # Playwright, incl. updated board create/join/delete critical-flow specs
```

All must pass, and `server/vitest.config.ts` / root `vitest.config.ts` coverage thresholds (80% branches/functions/lines/statements) must hold, per constitution Principles I, VI, VII.

## 6. Validate the SC-001 performance target

1. **Warm**: with `npm run dev:all` already running for a few minutes (backend "warm"), open DevTools Network, and time `GET /api/boards`, `POST /api/boards`, and `POST /api/boards/{id}/join` from request start to response. **Expected**: each under 3 s.
2. **Cold**: restart `npm run dev:server` (or, closer to production, deploy a preview and hit it immediately after a period of inactivity so the serverless function cold-starts) and repeat the same three timed requests. **Expected**: each under 5 s.
3. Record the observed timings; if either target is missed, treat it as a regression against the baseline already established in `014-backend-auth-foundation`'s SC-005, not a new, looser target for this feature.
