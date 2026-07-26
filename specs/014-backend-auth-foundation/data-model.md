# Phase 1 Data Model: Backend Foundation & Auth

**Feature**: 014-backend-auth-foundation | **Date**: 2026-07-26

These are **domain/transport models**, not database schemas — the backend is stateless and stores nothing (Firestore, unchanged, remains the only datastore and is client-side). Types below are conceptual; concrete TS lives in `server/src/domain`.

---

## 1. UserIdentity (domain entity)

The authenticated person, keyed by email, mapped to a single Firebase uid.

| Field | Type | Notes |
|-------|------|-------|
| `uid` | string | Firebase uid (canonical id). Stable across providers for the same email. |
| `email` | string | Lowercased. Identity key. MUST be provider-verified to be trusted. |
| `displayName` | string \| null | From provider profile. |
| `photoURL` | string \| null | From provider profile. |
| `providers` | `AuthProviderType[]` | Subset of `['google','github']`; grows as accounts link. |

**Validation / rules**
- `email` MUST be present and marked verified by the provider; otherwise `CompleteOAuthLogin` fails with `EmailNotVerifiedError` (no silent merge — FR-013/FR-015).
- Resolution: `getUserByEmail(email)` → existing uid (add provider if new); else `createUser`. Two providers, same verified email → **same uid** (account linking).
- `providers` set-unions the current provider on each successful login.

---

## 2. Session (domain value object → JWT cookie)

Backend-owned authenticated state. Serialized into the signed `httpOnly` cookie; never persisted server-side.

| Claim | Type | Notes |
|-------|------|-------|
| `sub` | string | Firebase uid. |
| `email` | string | Convenience; authoritative source is `sub`. |
| `sid` | string | Random session id (per login), for logging/correlation. |
| `iat` | number (epoch s) | Issued-at. |
| `exp` | number (epoch s) | Soft expiry `iat + 1h` → drives silent refresh. |
| `absExp` | number (epoch s) | Absolute max lifetime `first iat + 30d`; preserved unchanged across refreshes. |

**State transitions**
```
(none) --login/callback success--> ACTIVE (exp fresh, absExp set)
ACTIVE --now >= exp AND now < absExp, on /session or /refresh--> ACTIVE (exp rotated, absExp kept)
ACTIVE --now >= absExp--> EXPIRED (401 → client must re-authenticate)
ACTIVE --POST /logout--> TERMINATED (cookie cleared)
```

**Rules**
- Cookie attributes: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=<until absExp>`.
- On any refresh, `absExp` is copied forward unchanged (silent refresh cannot extend beyond the absolute max — FR-010a).
- Verification failure (bad signature / expired / tampered) → treated as unauthenticated.

---

## 3. OAuthState (transient value object)

Anti-forgery + PKCE material for one in-flight login. Stored in a short-lived signed `httpOnly` cookie (`oauth_state`), not server-side.

| Field | Type | Notes |
|-------|------|-------|
| `state` | string | Random; echoed by provider, compared on callback (FR-014). |
| `codeVerifier` | string \| null | PKCE verifier (Google); null where unsupported. |
| `provider` | `AuthProviderType` | Which provider this handshake targets. |
| `createdAt` | number (epoch s) | For TTL (e.g., 10 min); expired state → reject. |
| `returnTo` | string | Safe, same-origin relative path to return the user to (validated allowlist; defaults to `/`). |

**Rules**: callback MUST match `state` and `provider` from the cookie and be within TTL, else `InvalidOAuthStateError` (401). `returnTo` MUST be a relative, same-origin path (open-redirect guard).

---

## 4. ClientAuthResult (transport DTO → SPA)

Returned by `GET /api/auth/session` (and set-up after callback) so the browser can hydrate Firestore access.

| Field | Type | Notes |
|-------|------|-------|
| `authenticated` | boolean | Whether a valid session cookie was present. |
| `user` | `PublicUser \| null` | `{ uid, email, displayName, photoURL, providers }` — no secrets. |
| `firebaseCustomToken` | string \| null | Short-lived custom token for `signInWithCustomToken`; present only when authenticated. |

**Rules**: `firebaseCustomToken` is single-use/short-lived; the SPA exchanges it immediately and does not store it. Never logged (FR-007a/FR-018).

---

## 5. HealthStatus (transport DTO)

Returned by `GET /api/health`.

| Field | Type | Notes |
|-------|------|-------|
| `status` | `'ok' \| 'degraded'` | Liveness/readiness. |
| `version` | string | Build/commit identifier. |
| `time` | string (ISO-8601) | Server time. |

---

## 6. ApiError (transport DTO)

Uniform error envelope for all endpoints (FR-004).

| Field | Type | Notes |
|-------|------|-------|
| `error.code` | string | Stable machine code (e.g., `invalid_oauth_state`, `email_not_verified`, `session_expired`, `not_found`, `internal`). |
| `error.message` | string | Human-readable, safe (no stack/secret). |
| `correlationId` | string | Ties the response to logs/traces (FR-007a). |

---

## Entity relationships

```
UserIdentity (1) ──has──> (1..2) AuthProviderType  [google|github]
OAuthState  (per in-flight login) ──resolves to──> UserIdentity
Session     (per login)           ──references──> UserIdentity.uid (sub)
ClientAuthResult                  ──projects──> UserIdentity (PublicUser) + custom token
```
