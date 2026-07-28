# RetroRocket Backend

A standalone, hexagonally-architected backend service (TypeScript + Express) that serves
same-origin under `/api/*` on the RetroRocket Vercel project. It is the home for backend
responsibilities — starting with authentication, and structured so future MCP-exposed
capabilities can be added without re-architecture.

> Feature: [`specs/014-backend-auth-foundation`](../../specs/014-backend-auth-foundation/)

## Architecture (ports & adapters)

```
server/src/
├── domain/            # Pure business types & rules — no framework/SDK imports
│   ├── errors.ts      # AppError hierarchy (code + httpStatus)
│   ├── auth/          # UserIdentity, Session, OAuthState, types
│   └── boards/        # templates.ts — ported BOARD_TEMPLATES/ACTION_COLUMN constants
├── application/
│   ├── ports/         # Interfaces the domain/use-cases depend on
│   │   ├── index.ts   # OAuthProvider, IdentityStore, SessionService, OAuthStateCodec, Clock, Random
│   │   ├── boards.ts  # BoardsPort — list/create/join/rename/delete boards
│   │   └── observability/  # Logger, Metrics, Tracer
│   └── use-cases/     # StartOAuthLogin, CompleteOAuthLogin, session (get/refresh), Logout, startLinkProvider
│       └── boards/    # ListBoardsForUser, CreateBoard, JoinBoard, RenameBoard, DeleteBoard
├── adapters/          # Driven adapters implementing the ports
│   ├── oauth/         # Google (PKCE + id_token) & GitHub (REST) via arctic
│   ├── firebase/      # firebase-admin identity store, custom-token minting, and FirestoreBoardsAdapter
│   ├── session/       # jose-signed session JWT + OAuth-state codec
│   ├── observability/ # stdout structured logs/metrics/tracing (with redaction)
│   └── system.ts      # SystemClock, SystemRandom
├── http/              # Driving adapter (Express)
│   ├── app.ts         # Builds the Express app (middleware + routes)
│   ├── composition-root.ts  # Wires ports → adapters (only place adapters are chosen)
│   ├── auth-wiring.ts # Env-guarded construction of the auth subsystem
│   ├── boards-wiring.ts # Env-guarded construction of the Dashboard boards subsystem
│   ├── routes/        # health, auth, boards
│   ├── middleware/    # correlationId, errorHandler
│   └── cookies.ts     # httpOnly/Secure/SameSite=Lax cookie helpers
└── config/env.ts      # Fail-fast environment configuration
```

The **domain never imports Express or Firebase** (enforced by a test in
`test/architecture/domain-isolation.test.ts`). The Vercel serverless shell lives at
`../api/index.ts` and simply delegates every `/api/*` request to the single Express
app; the same app runs locally via `server/src/dev-server.ts`.

## Authentication model

- **Backend-orchestrated OAuth** (Google, GitHub) via full-page redirect. The browser
  never performs the OAuth handshake itself.
- The backend is the **session authority**: it issues a stateless signed JWT in an
  `httpOnly`, `Secure`, `SameSite=Lax` cookie (`rr_session`), with a 1-hour soft expiry
  (silent refresh) and a 30-day absolute lifetime.
- Firestore stays client-side, so the backend also mints a **Firebase custom token** the
  SPA exchanges via `signInWithCustomToken` — this reports `sign_in_provider == 'custom'`,
  which satisfies the existing `firestore.rules` (no rule changes).
- Identity is keyed by verified email (get-or-create); a second provider for the same
  email links to the same uid. Logged-in users can proactively link another provider via
  `GET /api/auth/link/:provider`.

### Endpoints (`../specs/014-backend-auth-foundation/contracts/auth-api.yaml`)

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/health` | Liveness/readiness |
| GET  | `/api/auth/login/:provider` | Begin login (302 to provider) |
| GET  | `/api/auth/link/:provider` | Begin proactive linking (requires session) |
| GET  | `/api/auth/callback/:provider` | OAuth callback (login or link) |
| GET  | `/api/auth/session` | Current session + fresh custom token |
| POST | `/api/auth/refresh` | Explicit session refresh |
| POST | `/api/auth/logout` | Terminate the session |
| POST | `/api/auth/test-login` | **Emulator/E2E only** (`AUTH_TEST_MODE=true`) |

## Running & testing

```bash
# from retro-rocket/
npm run dev:server          # Express on :3001 (Vite proxies /api → :3001)
npm run dev:all             # SPA + backend together
npm run test:server         # Vitest (node env)
npm run test:server:coverage # enforces the 80% coverage floor (Constitution VI)
npm run type-check:server   # tsc --noEmit for the server
```

## Dashboard boards ("My Boards")

> Feature: [`specs/017-dashboard-backend-access`](../../specs/017-dashboard-backend-access/)

Backs the Dashboard screen: listing, creating, joining, renaming, and deleting boards no
longer touch Firestore directly from the browser — the SPA calls these endpoints instead,
authenticated by the same `rr_session` cookie as everything else. "Joined" boards are
derived from the `participants` collection (not the frontend's legacy `users.joinedBoards`
array/`userBoardHistory` collection, which this feature does not read or write). Screens
outside the Dashboard (individual board real-time collaboration, facilitator tools, export)
remain unmigrated and keep working exactly as before.

### Endpoints (`../specs/017-dashboard-backend-access/contracts/boards-api.yaml`)

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/api/boards` | List the signed-in user's created + joined boards |
| POST   | `/api/boards` | Create a board from a template |
| POST   | `/api/boards/:id/join` | Join a board by ID (idempotent) |
| PATCH  | `/api/boards/:id` | Rename a board (owner only) |
| DELETE | `/api/boards/:id` | Permanently delete a board (owner only) |

`FirestoreBoardsAdapter` (like `FirestoreRetrospectiveReadAdapter`/`FirestoreMcpConnectionAdapter`)
has no dedicated Vitest-level Firestore mock — its query/write composition is exercised by
the Playwright E2E suite against the emulator (`e2e/dashboard-list.spec.ts`,
`board-creation.spec.ts`, `board-join.spec.ts`, `dashboard-manage.spec.ts`); only its pure
mapping helpers are unit-tested directly.

## Configuration

See [`../.env.example`](../.env.example). Backend secrets (`SESSION_SIGNING_KEY`, OAuth
client id/secret, `FIREBASE_SERVICE_ACCOUNT`) are **server-only** — never `VITE_`-prefixed,
so they never reach the client bundle. If the minimum config is absent, `/api/health` still
serves and auth routes return a `503 config_error`.
