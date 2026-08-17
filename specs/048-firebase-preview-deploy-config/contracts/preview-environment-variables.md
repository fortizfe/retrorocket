# Contract: Vercel Preview Environment Variables

This fixes the complete set of environment variables the application reads at build/run time in the Preview scope, so future changes to either the app's `.env.example`/`.env.firebase-template` or Vercel's stored values don't silently drift apart. It complements — and does not replace — [008-firebase-preview-domains](../../008-firebase-preview-domains/spec.md)'s own contracts, which govern the Firebase authorized-domains side of preview sign-in.

## Frontend (build-time, `VITE_`-prefixed — bundled into the client)

| Variable | Consumer | Preview value |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | `retro-rocket/src/lib/services/firebase.ts` | `retrorocket-staging`'s Web app API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | same | `retrorocket-staging.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | same | `retrorocket-staging` |
| `VITE_FIREBASE_STORAGE_BUCKET` | same | `retrorocket-staging.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | same | `retrorocket-staging`'s sender ID |
| `VITE_FIREBASE_APP_ID` | same | `retrorocket-staging`'s Web app ID |

**Status**: All six already correctly set in Vercel's Preview scope (verified via `vercel env pull --environment=preview`). No change required by this feature.

## Backend (server-only — MUST NOT be `VITE_`-prefixed)

| Variable | Consumer | Preview value | Status before this feature |
|---|---|---|---|
| `SESSION_SIGNING_KEY` | `server/src/http/auth-wiring.ts`, `mcp-wiring.ts` | New, Preview-dedicated key | Missing (Production-only) |
| `FIREBASE_SERVICE_ACCOUNT` | `server/src/http/auth-wiring.ts` (`getFirebaseAuth`) | Service-account JSON scoped to `retrorocket-staging` with custom-token-minting rights | Missing (Production-only) |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | `server/src/http/auth-wiring.ts` | Staging (or shared) Google OAuth Client credentials | Missing (Production-only) |
| `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` | `server/src/http/auth-wiring.ts` | Existing values | Already present for Preview |
| `OAUTH_REDIRECT_BASE_URL` | `server/src/http/auth-wiring.ts`, `mcp-wiring.ts` | Per-deploy, from the assigned PR Preview Alias Slot — **not** a static Vercel-stored Preview value | Missing, and not settable as a single static value (see [pr-preview-alias-cli.md](./pr-preview-alias-cli.md)) |
| `AUTH_TEST_MODE` | `server/src/config/env.ts`, mounts `/api/auth/test-login` | MUST stay unset/`false` in Preview | Not evaluated by this feature — out of scope; mounting a credential-less login bypass on a publicly reachable preview URL is a security regression this feature must not introduce |

## Unaffected (verify only, no change)

`REDIS_URL`, `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN` — already scoped to Preview, Production, and Development identically; not in scope for this feature.

## Change policy

Any application code change that adds a new environment variable the backend or frontend reads MUST update this contract in the same change — otherwise a future preview deploy can silently regress into the same "quietly disabled" failure mode this feature exists to fix (see `research.md` §3 on `auth-wiring.ts`'s soft-fail behavior).
