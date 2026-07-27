# Contract Change: `/api/auth/session` (amends feature 014's `auth-api.yaml`)

This is a small, targeted amendment to the existing auth contract (`specs/014-backend-auth-foundation/contracts/auth-api.yaml`), not a new subsystem.

## `GET /api/auth/session` — response shape change

**Before** (feature 014): `SessionResult = { authenticated, user, firebaseCustomToken }`, where `firebaseCustomToken` existed solely so the frontend could call `signInWithCustomToken` and keep the Firebase client SDK's direct Firestore access working (research.md §6/§7).

**After** (this feature):
```json
{
  "authenticated": true,
  "user": {
    "uid": "...", "email": "...", "displayName": "...", "photoURL": "...",
    "providers": ["google", "github"], "primaryProvider": "google",
    "joinedBoards": ["boardId1", "boardId2"]
  }
}
```
- `firebaseCustomToken` field is **removed** — nothing in the frontend consumes it anymore (FR-006, FR-013).
- `user` is extended with the profile fields (`joinedBoards`, provider list) that `userService.getUserProfile` used to require a separate Firestore read for (research.md §6) — one round trip now serves what used to take two.

## `POST /api/auth/test-login` (E2E-only, `AUTH_TEST_MODE`)

No response shape change; the E2E fixture (`e2e/fixtures/auth-helpers.ts`) simply stops performing the trailing `signInWithCustomToken` step, since nothing downstream needs it (research.md §7).

## Frontend impact

`backendAuthClient.ts`'s `bootstrapSession()` no longer calls `signInWithCustomToken`; `UserContext.tsx` no longer makes any follow-up `userService` Firestore call to hydrate/create the profile (research.md §6) — the session response alone is sufficient.
