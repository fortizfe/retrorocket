# Phase 0 Research: Mi Perfil Backend-Mediated Firebase Access

All items below were resolved through direct codebase inspection (no `NEEDS CLARIFICATION` markers remain in spec.md); this document records the resulting design decisions and their rationale.

## 1. API surface shape

**Decision**: Two new endpoints under a new `/api/profile` router, session-cookie authenticated, following the exact route/use-case/error-envelope conventions of `server/src/http/routes/boards.ts` (itself modeled on `auth.ts`/`mcp.ts`):

- `GET /api/profile` — get-or-create the requesting user's profile (idempotent; also reconciles linked providers) and return it.
- `PATCH /api/profile` — update the requesting user's display name.

No separate "create profile" endpoint is introduced; profile creation is folded into `GET /api/profile` as an idempotent get-or-create, mirroring the idempotent-`joinBoard` precedent from `017-dashboard-backend-access` (research.md §"Alternatives considered" there explicitly favors folding create-if-absent into the read path over a separate RPC).

No new sign-out endpoint is introduced: `POST /api/auth/logout` (from `014-backend-auth-foundation`) already exists, is already session-authoritative, and Mi Perfil's sign-out button already calls it exclusively for session termination (see §5).

**Rationale**: Matches the resource-oriented style already used for `/api/boards` and `/api/mcp/connections`. A `profileRouter` mounted the same way `boardsRouter`/`mcpRouter` are mounted in `app.ts` (guarded by an optional `profileDeps`, 503 config-error fallback when absent) requires no change to the app's composition pattern.

**Alternatives considered**: Folding profile data into the existing `GET /api/auth/session` response — rejected because `session.ts`'s `ClientAuthResult.user` is a `PublicUser` derived from Firebase Auth custom claims (see §2), not the richer Firestore-backed profile (no `primaryProvider`, no `createdAt`); conflating the two would couple the stateless session-identity concern with the stateful Firestore-profile concern, weakening the separation `014` already established. A dedicated `/api/profile` resource keeps these concerns apart (constitution Principle IV — SOLID/Interface Segregation), consistent with how `015`/`017` each added their own resource-scoped router rather than growing `auth.ts`.

## 2. The core gap: no server-side `users/{uid}` Firestore document today

**Decision**: Introduce a new `ProfilePort` + `FirestoreProfileAdapter` (mirroring `BoardsPort`/`FirestoreBoardsAdapter` from `017`) that owns the `users/{uid}` Firestore document server-side via `firebase-admin`.

**Rationale**: Direct inspection of `server/src/adapters/firebase/FirebaseIdentityAdapter.ts` confirms the backend's *only* existing server-side user-identity state is Firebase Auth **custom claims** (`providers`, `linkedAccounts`), used by `IdentityStorePort` for OAuth resolution/linking and custom-token minting. The richer profile Mi Perfil displays and edits today — `displayName` (user-editable), `photoURL`, `primaryProvider`, `createdAt` — lives *only* in a Firestore `users/{uid}` document written directly from the browser by `src/features/auth/services/userService.ts`. No backend code reads or writes this collection today. This is the single piece of net-new backend work this feature requires; everything else (session auth, provider linking redirects, MCP connections) is already backend-mediated and needs no new backend logic, only migration of the three profile operations.

**Alternatives considered**: Storing `displayName`/`primaryProvider`/`createdAt` as additional Firebase Auth custom claims instead of a Firestore document — rejected because custom claims are capped at 1000 bytes total and are refreshed only on token mint (not read live), making them a poor fit for a value the user edits interactively and expects to see reflected immediately (FR-001, Acceptance Scenario 1 of User Story 2); Firestore, read/written directly by `firebase-admin` (which bypasses `firestore.rules` by design, so no rule change is needed), is the natural fit and keeps the existing document/schema exactly as-is (FR-009 — no data loss, no migration).

## 3. Authentication & authorization

**Decision**: Reuse `SessionServicePort.verify(cookie, now)` exactly as `requireSession()` does in `boards.ts` (`server/src/http/routes/boards.ts:28-32`); no new auth mechanism. Because `session.sub` is the Firebase uid, every profile read/write is inherently scoped to "your own profile" — there is no `:uid` path parameter to authorize against another user's profile, closing FR-011 by construction rather than by an explicit ownership check (unlike `boards.ts`'s `renameBoard`/`deleteBoard`, which need an explicit `createdBy === uid` check because a board's id is caller-supplied and not implicitly the caller's own).

**Rationale**: Spec FR-010 explicitly requires reusing existing session auth; the `rr_session` httpOnly cookie is already sent by the browser (`credentials: 'include'`) on every request via existing frontend fetch clients (`backendAuthClient.ts`, `backendBoardsClient.ts`, `connectedAppsService.ts`).

## 4. Provider reconciliation — moving `UserContext.createOrUpdateUserProfile`'s union logic server-side

**Decision**: `GET /api/profile`'s use-case (`EnsureUserProfile`) takes the session's `PublicUser` (`session.data.user`, already containing the Firebase-Auth-custom-claims-derived `providers` array — see `server/src/application/use-cases/session.ts:39-63`, `ports/index.ts:21-31`) as its authoritative provider source:

1. If a `users/{uid}` document exists: union any providers present in `session.user.providers` but missing from `profile.providers`, persist if changed, and return the (possibly updated) profile. The stored `displayName`/`photoURL` are **not** overwritten from the session on subsequent logins — only providers are unioned.
2. If no document exists: create one using `displayName: session.user.displayName ?? session.user.email.split('@')[0] ?? 'Usuario'`, `photoURL: session.user.photoURL`, `providers: session.user.providers`, `primaryProvider: session.user.providers[0] ?? 'google'`, `createdAt`/`updatedAt: now`.

**Rationale**: This is a line-for-line server-side port of `UserContext.tsx`'s existing `createOrUpdateUserProfile` callback (`src/lib/contexts/UserContext.tsx:89-136`), which today performs this exact union/create logic against Firestore directly from the browser on every app bootstrap. Moving it into the `EnsureUserProfile` use-case (invoked by `GET /api/profile`) satisfies FR-004 (auto-create on first sign-in, same defaults, zero direct Firestore write from the browser) without changing the observable defaults a user sees.

**Scope note**: `UserContext.tsx`'s bootstrap `useEffect` (lines 205-250) is app-wide, not literally inside `pages/Profile.tsx` — but the spec's Assumptions section explicitly includes it ("the first-time profile creation that happens implicitly on session bootstrap and feeds this screen's data"). `UserContext`'s public shape (`userProfile: UserProfile | null`, `updateDisplayName`, `signOut`) is unchanged, so every other consumer of `userProfile` elsewhere in the app continues to receive the identical shape/values, satisfying FR-013 (out-of-scope screens unaffected).

## 5. Sign-out flow — already effectively backend-authoritative

**Decision**: No change to the sign-out call sequence in `UserContext.tsx`'s `handleSignOut` (lines 148-165): `await backendLogout()` (`POST /api/auth/logout`) first, then a best-effort `await signOutUser()` (Firebase Auth client SDK) wrapped in try/catch whose failure is explicitly ignored because "the backend session is the authority."

**Rationale**: `firebase/auth`'s client-SDK `signOut()` is a **local-only** operation (clears persisted auth state in IndexedDB/local storage) — it does not itself make a network request to any Firebase endpoint. Confirming this: it satisfies SC-002 ("zero direct network requests from the browser to any Firebase/Firestore/Firebase Auth endpoint... while... signing out") as written today, with zero code changes needed. It also satisfies the spec's Assumptions ("Mi Perfil's own load, save, and sign-out operations MUST NOT depend on it for authorization") because the resulting signed-out UI state is driven entirely by the `backendLogout()` call succeeding, not by `signOutUser()`. FR-005 is therefore already satisfied by existing code; this feature's only sign-out-related work is the User Story 3 regression verification (E2E) and, if the profile-no-Firestore architecture guard test (§9) is written broadly, confirming it does not misfire on the (permitted) `firebase/auth` import.

**Alternatives considered**: Removing the `signOutUser()` call entirely — rejected as unnecessary scope expansion (YAGNI): it causes no network call, so it does not violate any FR/SC, and removing it would touch the shared app-wide Firebase Auth bridge the spec's Assumptions explicitly keep out of scope.

## 6. Linked sign-in providers and connected AI assistants — verify, don't rebuild

**Decision**: No backend or route changes for either capability. `LinkedProvidersCard.tsx` + `useLinkedProviders.ts` derive their list purely from `userProfile.providers` (already in `UserContext`, no network call of their own) and `startLinkProvider()` (`backendAuthClient.ts`, full-page redirect to the already-existing `/api/auth/link/:provider`). `ConnectedAppsCard.tsx` + `useConnectedApps.ts` + `connectedAppsService.ts` already call `GET`/`DELETE /api/mcp/connections` exclusively (feature `015`).

**Rationale**: Direct inspection confirms zero `firebase/*` imports in any of these five files. Once `userProfile` is backend-sourced (§4), `LinkedProvidersCard`/`useLinkedProviders` need no code change at all — they already only read a prop that will keep the same shape. This satisfies FR-006/FR-007 as "verify no regression" rather than "build new."

## 7. Deliberately dropped: `joinedBoards` / `userBoardHistory` maintenance

**Decision**: The new `ProfilePort`/`FirestoreProfileAdapter` does not read, write, or expose `joinedBoards` or the `userBoardHistory` collection. Existing `users/{uid}.joinedBoards` fields in previously-written documents are left untouched (not deleted, not migrated) — just no longer maintained going forward.

**Rationale**: Repo-wide inspection confirms `userService.ts`'s `addBoardToUserHistory`, `getUserBoardHistory`, `getUserBoards`, `addJoinedBoard`, and `removeJoinedBoard` have **zero callers** anywhere in `src/` outside `userService.ts` itself and its own unit test — this bookkeeping was already fully superseded by `017-dashboard-backend-access`'s `participants`-collection-derived board listing (that feature's research.md §3 independently reached the same "dead code" conclusion for the frontend's `joinedBoards` array). Porting genuinely dead code server-side would violate constitution Principle V (Simplicity/YAGNI). Leaving old field values in place (rather than stripping them) trivially satisfies FR-009 (no data loss) since nothing reads them either way.

**Alternatives considered**: Porting these methods into `ProfilePort` "for completeness" — rejected as speculative generality with a confirmed-zero call count.

## 8. Frontend client shape

**Decision**: New `src/features/auth/services/backendProfileClient.ts` exporting `fetchProfile(): Promise<UserProfile>` and `updateDisplayName(displayName: string): Promise<UserProfile>`, using `fetch(..., { credentials: 'include' })` and throwing on non-OK responses — the exact shape of `backendAuthClient.ts`/`backendBoardsClient.ts`/`connectedAppsService.ts`.

**Rationale**: Codebase-consistent; no new HTTP client library needed (Principle III — no new dependency). Placed in `features/auth/services/` (not a new `features/profile/`) because that is exactly where the code it replaces (`userService.ts`) and its sibling (`backendAuthClient.ts`) already live — matches the existing file organization, not a new area.

## 9. Retiring `userService.ts` entirely

**Decision**: Delete `src/features/auth/services/userService.ts` and its test `src/test/features/auth/userService.test.ts` outright, rather than leaving it in place unused or partially trimmed.

**Rationale**: Once `UserContext.tsx` is repointed at `backendProfileClient` (§4, §8), every one of `userService.ts`'s methods loses its only caller (`getUserProfile`, `createUserProfile`, `updateUserProfile`, `addProviderToUser` were the only four with any caller at all, and all four calls move to the backend; the remaining six methods were already dead per §7). Leaving a fully-unused Firestore-direct module in the tree would both violate Simplicity/YAGNI and create an easy-to-miss regression path (a future change could accidentally re-import it). This directly advances FR-001 for Mi Perfil's feature area: after this change, no file under `src/features/auth/**` imports `firebase/firestore` at all.

## 10. Architecture guard test

**Decision**: Add `src/test/architecture/profile-no-firestore.test.ts`, statically scanning `src/pages/Profile.tsx`, `src/features/auth/**`, and `src/lib/contexts/UserContext.tsx` for forbidden `firebase/firestore` imports (and, after §9, confirming `userService.ts` no longer exists) — same `execSync('find ...')` + regex structure as the existing `src/test/architecture/dashboard-no-firestore.test.ts` from `017`.

**Rationale**: `dashboard-no-firestore.test.ts` is a proven, already-CI-enforced precedent for exactly this kind of import-boundary guarantee; reusing its structure is both consistent (Principle V) and gives FR-001/SC-002 a permanent, automated regression guard rather than a one-time manual check. The guard intentionally allows `firebase/auth` imports (needed for `signInWithCustomToken`/`signOut`, §5) — it targets `firebase/firestore` specifically, mirroring the Dashboard guard's own scope.

## 11. Validation rules for display-name update

**Decision**: `PATCH /api/profile` rejects an empty/blank (post-trim) `displayName` with `400 invalid_request`, matching the existing inline-`AppError` pattern already used in `auth.ts:179` (no new `ValidationError` domain class introduced — Simplicity). The frontend's existing client-side check in `UserProfileForm.tsx` (unchanged by this feature) continues to block submission of a blank name before any network call is made, satisfying Acceptance Scenario 2 of User Story 2 ("rejects it... without contacting the backend or Firebase").

**Rationale**: Constitution's "Error Handling & Resilience" / "client + server validation" standard requires both layers; the frontend already has this check (out of scope to change) and the backend gains the same check as defense-in-depth for direct API callers.

## 12. Rate limiting

**Decision**: Apply a `profileLimiter` (`express-rate-limit`, same shape as `boards.ts`'s `boardsLimiter`, skipped when `testMode`) to the `/api/profile` router.

**Rationale**: Consistent with the existing per-router rate-limiting convention in `auth.ts`, `mcp.ts`, and `boards.ts`.

## 13. `firestore.rules` for `users/{uid}` — left unchanged, deliberately

**Decision**: This feature does not modify `firestore.rules`'s existing client-facing rule for the `users/{uid}` collection (whatever self-read/write rule already permits the authenticated client to access its own document). The browser stops *using* direct access to this collection for Mi Perfil's operations (FR-001), but the rule itself is not tightened to deny it outright.

**Rationale**: Unlike `015-mcp-read-server`'s three new collections (`mcpClients`, `mcpAuthorizationCodes`, `mcpConnections`), which had **no prior client access to preserve** and so could be given a clean deny-all-from-client rule, `users/{uid}` is an existing collection whose current rule is depended upon by the still-in-place, app-wide Firebase custom-token bridge (`bootstrapSession()`, §13 below) for screens outside this feature's scope. Auditing and possibly tightening that rule is a cross-cutting change affecting more than Mi Perfil — outside this feature's boundary (spec FR-013) — and isn't required by any FR/SC here: the constitution's "Real-Time Data Security" standard requires not *weakening* existing rules, not proactively tightening them within an unrelated feature. Since the backend's `firebase-admin` access bypasses rules entirely regardless of what the client-facing rule says, this feature's own guarantees (FR-001, FR-011) hold independent of the rule's current shape.

**Alternatives considered**: Tightening `users/{uid}`'s rule to deny direct client writes now that Mi Perfil's browser code no longer needs them — rejected for this feature specifically because it would need to be verified against every other still-not-migrated consumer of that collection first (a repo-wide audit outside this feature's scope), and because leaving it unchanged cannot regress anything (Real-Time Data Security's actual bar). Worth revisiting as its own small follow-up once all screens that touch `users/{uid}` directly are enumerated and migrated or explicitly deemed out of scope.

## 14. Coexistence with the app-wide Firebase custom-token bridge

**Decision**: No change to `bootstrapSession()`'s Firebase custom-token sign-in (`backendAuthClient.ts:60-66`); it continues to run so that not-yet-migrated screens (real-time board collaboration) keep working against Firestore directly.

**Rationale**: Spec Assumptions explicitly scope this out; identical reasoning to `017`'s research.md §11.
