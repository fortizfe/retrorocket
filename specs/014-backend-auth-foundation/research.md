# Phase 0 Research: Backend Foundation & Backend-Driven Auth

**Feature**: 014-backend-auth-foundation | **Date**: 2026-07-26

This document resolves the open technical decisions implied by the spec + clarifications so Phase 1 design has no `NEEDS CLARIFICATION` items.

---

## R1 — Express on Vercel serverless (same-origin `/api/*`)

**Decision**: Build a single Express `app` in `server/src/http/app.ts` and expose it to Vercel through a catch-all function `api/[[...path]].ts` that hands `(req, res)` to the Express app. In production, Vercel routes every `/api/*` request to that function; the SPA is served as static output from the same domain → same origin, first-party cookies, no CORS.

**Rationale**: One Express app is the unit of testing and local execution; the Vercel shell stays trivial. Same origin is a hard requirement (FR-002a) and is achieved for free by placing functions under the project's `api/` directory alongside the static build.

**Key implementation notes**:
- `vercel.json` currently rewrites `/((?!assets/).*) → /index.html`. This MUST be updated so `/api/*` is **not** rewritten to the SPA (exclude `api/` in the rewrite negative-lookahead, e.g. `/((?!assets/|api/).*)`), otherwise auth requests would return `index.html`.
- Functions are **stateless**; no in-memory session store may be assumed across invocations (cold starts) → session state lives in the cookie (see R4).
- Keep the handler lean; heavy init (firebase-admin app) is memoized at module scope to survive warm invocations.

**Alternatives considered**:
- One file per route under `api/` (no Express): rejected — loses the single testable app, middleware composition, and the Express requirement from the stakeholder.
- Separate backend origin (`api.retrorocket.app`): rejected in `/speckit-clarify` (Q1=A) — would force cross-site cookies/CORS.

---

## R2 — Local development with same-origin `/api`

**Decision**: Run the Express app standalone in dev via a small `server/src/dev-server.ts` (listens on `:3001`) and add a Vite dev proxy: `server.proxy = { '/api': 'http://localhost:3001' }`. Add scripts `dev:server` and a combined `dev:all` (concurrently). `vercel dev` remains the deploy-parity fallback for verifying the serverless shell.

**Rationale**: The Vite proxy preserves same-origin semantics in the browser (cookies work) with the fastest inner loop and no Vercel CLI dependency for everyday work. `vercel dev` is slower but validates the `api/` shell before deploy.

**Alternatives considered**: `vercel dev` only — rejected as the primary loop (slower, more moving parts); direct cross-origin dev — rejected (breaks cookie parity with prod).

---

## R3 — Backend-orchestrated OAuth (Google + GitHub), full-page redirect

**Decision**: Implement the standard **OAuth 2.0 authorization-code flow** on the backend using `arctic` (provider presets for Google and GitHub, actively maintained, framework-agnostic, small). Flow per provider behind `OAuthProviderPort`:
1. `GET /api/auth/login/:provider` → generate `state` (+ PKCE `code_verifier` for Google), store them in a short-lived signed, `httpOnly` cookie, and 302-redirect the browser to the provider authorize URL.
2. Provider redirects back to `GET /api/auth/callback/:provider?code&state`.
3. Backend validates `state` against the cookie (anti-forgery, FR-014), exchanges `code` for tokens, and fetches the verified user profile (email, name, avatar, provider account id).
4. Hand the verified identity to the identity store (R4) to resolve the Firebase uid + mint a custom token, issue the session cookie, then 302-redirect to the SPA (authenticated).

**Rationale**: Doing real OAuth server-side is exactly the clarified model (Q1 "OAuth fully in backend", redirect flow Q3=A). `arctic` avoids hand-rolling token exchange/PKCE while keeping provider specifics inside adapters. State/PKCE in a signed cookie keeps the backend stateless.

**Alternatives considered**:
- `openid-client`: heavier, OIDC-centric; GitHub isn't OIDC. Kept as fallback.
- Firebase's own OAuth (client popup): rejected — that is the client-side flow being removed.
- `passport` + strategies: heavier, callback-middleware model fits Express but adds session/state machinery we don't want in serverless.

---

## R4 — Identity mapping, account linking, and the client data credential

**Decision**: `FirebaseIdentityAdapter` (implements `IdentityStorePort`) uses `firebase-admin`:
- Resolve/create the canonical user by **email** via `getUserByEmail` → else `createUser`. This makes email the identity key, so signing in with Google or GitHub for the same email maps to **one Firebase uid** — satisfying account-linking behavior (FR-013) at the backend without client `linkWithCredential`.
- Record the provider on the user (custom claims / provider list) for auditability.
- Mint a **custom token** with `createCustomToken(uid)` returned to the client so it can `signInWithCustomToken` and keep Firestore access. Verified: custom-token sessions report `sign_in_provider == 'custom'`, which passes the existing `firestore.rules` (only `anonymous` is blocked) — **no rule change** required.

**Rationale**: Centralizes identity in the backend, preserves today's "same email = same account" behavior, and keeps client-side Firestore working untouched (spec Assumptions + Data scope).

**Edge case**: same email, different provider casing / unverified email → treat provider email as authoritative only when the provider marks it verified; otherwise surface an auth error rather than silently merging (FR-015). Detailed in `data-model.md`.

**Alternatives considered**: per-provider uid + client-side linking (status quo) — rejected; it keeps linking logic in the browser, contrary to the refactor.

---

## R5 — Session mechanism (backend session authority)

**Decision**: The backend issues its own **signed JWT** as the app session, set as an `httpOnly`, `Secure`, `SameSite=Lax` cookie (Q2=A). Signed/verified with `jose` (HS256 using `SESSION_SIGNING_KEY`, or EdDSA if a keypair is preferred). Claims: `sub` (Firebase uid), `email`, `iat`, `exp` (short, e.g. 1h), `sid` (session id), `absExp` (absolute max lifetime, e.g. 30 days).

- **Persistence + silent refresh (Q4=A / FR-010a)**: cookie `Max-Age` spans the session; on `GET /api/auth/session` or `POST /api/auth/refresh`, if `now < absExp` the backend rotates a fresh short-`exp` cookie and returns a fresh Firebase custom token. Past `absExp` → 401, client must re-auth.
- **Firestore continuity across restarts**: once the client does `signInWithCustomToken`, the Firebase client SDK maintains its own auto-refreshing session (survives restarts), so Firestore keeps working; the app calls `/api/auth/session` on load to (re)hydrate a custom token when the Firebase session is absent.
- **Logout (FR-012)**: `POST /api/auth/logout` clears the cookie. Because JWTs are stateless, "invalidate everywhere" is achieved by keeping session lifetime short and clearing client state + Firebase sign-out; a lightweight server-side denylist is out of scope this iteration (documented; short `exp` bounds exposure).

**Rationale**: Stateless JWT fits serverless (no session store, cold-start safe), backend stays the authority, and `httpOnly` keeps the token unreadable by JS (XSS mitigation). Matches all clarifications.

**Alternatives considered**: server session store (Redis/Upstash) — rejected as YAGNI now (adds infra); Firebase session cookies — rejected (re-couples session to client ID token). Both revisitable if hard revocation becomes a requirement.

---

## R6 — Local/E2E authentication without the real provider UI (FR-016)

**Decision**: Expose a **guarded** test-auth route `POST /api/auth/test-login` that is only mounted when `AUTH_TEST_MODE=true` (set exclusively in emulator-backed E2E/dev). It accepts an email/uid, runs the same identity + session issuance path as a real callback (minting a custom token against the Auth **emulator**), and sets the session cookie — bypassing only the external redirect. Playwright uses it to establish sessions for non-login specs; a dedicated login spec still exercises the real redirect routes with a mocked provider where feasible.

**Rationale**: Mirrors the existing `__e2eSignIn` custom-token hook philosophy, keeps E2E deterministic, and never ships to production (env-gated, fails closed).

**Alternatives considered**: driving Google/GitHub consent UI in CI — rejected (flaky, against ToS, requires real creds).

---

## R7 — Observability baseline (Q5=B / FR-007a)

**Decision**: Behind `LoggerPort`/`MetricsPort`/`TracerPort` ports:
- **Logging**: structured JSON to stdout (Vercel captures it) with a per-request **correlation id** (generated in `correlationId` middleware, echoed in a response header). A tiny wrapper (or `pino`) — decided in tasks; port keeps it swappable. Redaction list ensures secrets/tokens/PII never logged.
- **Metrics**: request latency, error rate, auth success/failure counters. Emitted as structured metric log lines by default (queryable in Vercel), with the port allowing a real backend (e.g., OpenTelemetry/OTLP) later without touching use cases.
- **Tracing**: propagate the correlation id as the trace id across use-case boundaries; full OTel exporter wiring is optional this iteration but the port + span boundaries are established now.

**Rationale**: Satisfies the clarified "logging + metrics + tracing" baseline while honoring KISS — ports let a heavier telemetry backend be added when MCP/load justifies it, with no domain changes.

**Alternatives considered**: logging-only (rejected in clarify Q5); full OTel collector now — deferred (infra weight without current load).

---

## R8 — Dependency vetting (Constitution III)

| Dependency | Purpose | Maintenance | License | Client-bundle impact |
|-----------|---------|-------------|---------|----------------------|
| `express` | HTTP framework (mandated) | Active, ubiquitous | MIT | None (server-only tree) |
| `firebase-admin` | Identity store + custom tokens | Google-maintained | Apache-2.0 | None (server-only) |
| `jose` | Sign/verify session JWT | Active | MIT | None (server-only) |
| `arctic` | OAuth2 authorize/token for Google & GitHub | Active | MIT | None (server-only) |
| `cookie` (+ types) | Parse/serialize Set-Cookie | Active | MIT | None (server-only) |

All permissive, maintained, isolated to `server/`/`api/`, and not duplicating existing capability. `vitest` is already in the repo. Final logger/metrics lib chosen during tasks behind the ports.

---

## Resolved unknowns summary

| Topic | Resolution |
|-------|-----------|
| Serverless Express pattern | Catch-all `api/[[...path]].ts` → single Express app (R1) |
| Local same-origin dev | Vite proxy `/api` → standalone Express `:3001` (R2) |
| OAuth flow | Server-side auth-code + PKCE via `arctic`, redirect flow (R3) |
| Account linking | Email-keyed single Firebase uid via Admin SDK (R4) |
| Client Firestore continuity | Firebase custom token; `sign_in_provider=custom` passes rules (R4) |
| Session | Stateless signed JWT cookie, short exp + absolute max, silent refresh (R5) |
| E2E/local auth | Env-gated `test-login` route against emulator (R6) |
| Observability | Ports for structured logs + metrics + tracing; stdout default (R7) |

No `NEEDS CLARIFICATION` items remain.
