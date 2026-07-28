# Phase 1 Data Model: Mi Perfil Backend-Mediated Firebase Access

Firestore remains the system of record; the `users/{uid}` document's schema is unchanged (no migration). This document describes the Firestore data shape the new backend adapter consumes/produces, and the DTOs it exposes through `ProfilePort` to the application layer (mirroring the level of detail in `017-dashboard-backend-access`'s `data-model.md`).

## Firestore collection touched (existing, unchanged schema)

### `users/{uid}`

| Field | Type | Notes |
|---|---|---|
| `uid` | string | Firebase uid; document id duplicated into the doc body (matches today's `createUserProfile`). |
| `email` | string | From the OAuth identity at creation; not user-editable. |
| `displayName` | string | User-editable via `PATCH /api/profile`; defaults to OAuth display name or email-prefix at creation. |
| `photoURL` | string \| null | From the OAuth provider; read-only, no upload capability (spec Assumptions). |
| `providers` | `AuthProviderType[]` | Subset of `['google','github']` (`'apple'` reserved in the type but unused); unioned with the session's authoritative provider list on every `GET /api/profile` (research.md §4). |
| `primaryProvider` | `AuthProviderType` | Set once at creation from the first provider used to sign in; not changed by this feature. |
| `joinedBoards` | `string[]` | Legacy field; left untouched in existing docs, no longer read/written by this feature (research.md §7). |
| `createdAt` | Timestamp | Server-set once, at first sign-in; never updated. |
| `updatedAt` | Timestamp | Server-set (`FieldValue.serverTimestamp()`), bumped on `displayName` update and on provider-union. |

No new Firestore collection is introduced. No `firestore.rules` change is needed — `firebase-admin` (used exclusively server-side) bypasses client-facing security rules by design, and the browser no longer accesses this collection at all for Mi Perfil's operations after this feature ships.

## Application-layer DTOs (`server/src/application/ports/profile.ts`)

```ts
export type AuthProviderType = 'google' | 'github' | 'apple';

export interface ProfileRecord {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  providers: AuthProviderType[];
  primaryProvider: AuthProviderType;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnsureProfileInput {
  uid: string;
  email: string;
  displayName: string | null;   // from session PublicUser; null falls back to email-prefix at creation
  photoURL: string | null;
  providers: AuthProviderType[]; // authoritative provider set from the current session identity
}

export interface ProfilePort {
  /**
   * Get-or-create: returns the existing users/{uid} doc (unioning in any providers
   * present in EnsureProfileInput.providers but missing from the stored doc, persisting
   * if changed), or creates it with OAuth-derived defaults if absent. Idempotent.
   */
  ensureProfile(input: EnsureProfileInput): Promise<ProfileRecord>;
  /** Updates displayName only; throws if the profile does not exist (should not happen —
   * every session-authenticated request has already gone through ensureProfile at least once). */
  updateDisplayName(uid: string, displayName: string): Promise<ProfileRecord>;
}
```

`ProfilePort` is a new, separate port from `IdentityStorePort` (Firebase Auth custom claims — OAuth resolution, provider linking, custom-token minting) and from `BoardsPort`/`RetrospectiveReadPort` (unrelated Firestore collections) — per constitution Principle IV (SOLID/Interface Segregation), matching the existing precedent of `boards.ts` being kept separate from the MCP read port (`017`'s research.md §4).

## Transport DTO (`GET`/`PATCH /api/profile` JSON response)

```ts
export interface ProfileResponse {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  providers: AuthProviderType[];
  primaryProvider: AuthProviderType;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}
```

This matches the frontend's existing `UserProfile` type (`src/features/auth/types/user.ts`) field-for-field except `joinedBoards`, which is dropped from the wire shape (research.md §7) since no UI reads it.

## Validation rules (enforced in use-cases, not just at the HTTP boundary)

- `displayName` (on `PATCH /api/profile`): required, non-empty after trim → `400 invalid_request` otherwise (matches `UserProfileForm`'s existing client-side check, now also enforced server-side per constitution's "client + server validation" standard).
- `ensureProfile`: authorization is implicit — `uid` always comes from the verified session (`session.sub`), never from a request body/param, so there is no "wrong user" input to reject (research.md §3).
- Reads/writes are always scoped to the requesting session's own `uid`; no endpoint accepts a `uid`/`:id` path or body parameter for profile operations (unlike `boards.ts`, which must authorize per-resource because a board id is caller-supplied).

## State transitions

```
(no users/{uid} doc) --first GET /api/profile after sign-in--> created (defaults from session PublicUser)
created/existing     --subsequent GET /api/profile, session has a provider not yet in doc--> providers unioned, updatedAt bumped
created/existing     --PATCH /api/profile { displayName }, non-blank--> displayName replaced, updatedAt bumped
created/existing     --PATCH /api/profile { displayName: '' or blank }--> rejected (400), doc unchanged
```

No new lifecycle states beyond what exists today; this feature does not add a profile "deletion" or "deactivation" state ("Eliminar cuenta" remains a disabled placeholder — FR-012).

## Relationships

```
User (uid, from session) 1---1 ProfileRecord (users/{uid})
ProfileRecord.providers  *---1 AuthProviderType  [google|github]  (also mirrored in Firebase Auth custom claims via IdentityStorePort, independently)
```
