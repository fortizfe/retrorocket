# Quickstart: Validating Backend-Mediated Firebase Access

Prerequisites: Firebase Emulator Suite installed (`firebase-tools`, already a devDependency), repo dependencies installed (`npm install` at `retro-rocket/`).

## 1. Run the stack locally against the emulator

```bash
cd retro-rocket
npm run emulators        # Firestore (+ Auth, until dropped per research.md §7) emulator, background
AUTH_TEST_MODE=true npm run dev:all   # frontend (vite) + backend (vite-node) concurrently
```

Expected: `http://localhost:5173` loads the landing page; `http://localhost:3000/api/health` (or whatever port `dev:server` binds) returns `200 { "status": "ok" }`.

## 2. Prove zero direct frontend→Firebase calls (SC-002)

1. Open browser DevTools → Network tab, filter by domain, before signing in.
2. Sign in via `POST /api/auth/test-login` (or the real OAuth button in a non-emulator run).
3. Create a board (`POST /api/boards`), add a card, like it, group two cards, start the facilitator countdown, write a facilitator note, export to PDF.
4. **Pass condition**: every network request in the filtered list has `Request URL` starting with `/api/` (same-origin) — none point at `*.googleapis.com`, `*.firebaseio.com`, `firestore.googleapis.com`, or any Firebase/Google Identity endpoint. This is the automatable version of SC-002 and should become a Playwright assertion (e.g. asserting on `page.on('request', ...)` for the duration of a full E2E scenario) rather than only a manual check.

## 3. Prove real-time sync still works end-to-end (User Story 2, SC-003)

1. Open the same board in two browser windows (or two Playwright browser contexts), both signed in as different users.
2. In window A: create a card. **Pass condition**: it appears in window B within 2 seconds, with no manual refresh.
3. In window A: like the card. **Pass condition**: the like count updates in window B within 2 seconds.
4. In window B: drag two cards together to form a group. **Pass condition**: window A reflects the group (head + members) within 2 seconds.
5. Close window A's connection (e.g. DevTools → Network → offline toggle) for 10 seconds, then restore it. **Pass condition**: window A's UI shows a disconnected/reconnecting state while offline (FR-009/FR-011), then automatically resumes and catches up on whatever changed while it was gone (via the `snapshot` event on reconnect, `contracts/realtime-events.md`) — no manual page reload required.

## 4. Prove facilitator-only data stays facilitator-only (FR-004, SC-005)

1. As the board's facilitator, write a facilitator note.
2. As a different (non-facilitator) participant on the same board, open DevTools Network and inspect the `GET /api/boards/:id/events` stream's traffic.
3. **Pass condition**: no `note.*` event ever appears in the non-facilitator's stream — not even a filtered/redacted one (`contracts/realtime-events.md`).
4. As the non-facilitator, attempt `POST /api/boards/:id/countdown/start` directly (e.g. via `curl` with that user's session cookie). **Pass condition**: `403 forbidden`.

## 5. Prove existing data survived the migration (FR-008, SC-004)

Using data seeded into the Firestore emulator (or a staging project snapshot) from *before* this feature's backend endpoints existed:
1. `GET /api/boards` for a user who owns/joined pre-migration boards. **Pass condition**: those boards are listed.
2. `GET /api/boards/:id` for one of them. **Pass condition**: cards, groups, countdown history, facilitator notes, and sentiment results created under the old direct-Firestore code are all present and correctly shaped.
3. Export that board to PDF/DOCX. **Pass condition**: output matches what the pre-migration export would have produced (same sections, same data).

## 6. Full regression pass (SC-001)

Run the full existing test suites — they are the primary mechanism for SC-001, not a new artifact:

```bash
npm run test:run              # frontend unit/integration (Vitest)
npm run test:server           # backend unit (Vitest, server/)
npm run e2e                   # Playwright E2E against the emulator
npm run type-check && npm run type-check:server
npm run lint
```

All must pass with coverage floors intact (Constitution Principle VI) before this feature is considered complete.
