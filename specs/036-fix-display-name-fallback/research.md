# Phase 0 Research: Fix Configured Display Name Not Used on New Boards

No items in Technical Context were left as `NEEDS CLARIFICATION` — both scope-impacting decisions (no backfill of already-affected records; typing-status is in scope) were already resolved in the spec's `/speckit-clarify` session. What follows is the code-level investigation confirming the root cause and choosing a fix approach.

## 1. Root cause (confirmed)

**Decision**: Two separate, never-synced stores hold a user's "name" today:

1. **Session-cached name**: `session.user.displayName`, set once from the raw Google/GitHub OAuth profile at login (`FirebaseIdentityAdapter.resolveUser`, `server/src/adapters/firebase/FirebaseIdentityAdapter.ts:44-73`) and carried forward unchanged into `PublicUser` on every session refresh (`server/src/application/use-cases/session.ts:39-83` reuses `session.data.user` verbatim — it is never re-derived from Firestore).
2. **Profile-configured name**: `users/{uid}.displayName`, the field the "Mi Perfil" page reads and edits (`server/src/application/ports/profile.ts:11-20`, `FirestoreProfileAdapter.ts`), seeded from the OAuth name only on first profile creation (correct per FR-008 of spec 022) and updated thereafter only by `PATCH /api/profile`.

The defect: a shared local helper, duplicated verbatim in both route files —

```ts
// server/src/http/routes/retrospectives.ts:52-53 (also server/src/http/routes/boards.ts:34-36)
export function displayNameOf(user: PublicUser | undefined): string {
    return user?.displayName ?? user?.email ?? 'Anonymous';
}
```

— is called at every point a name is captured into a new Firestore record, always reading store #1 (session), never store #2 (profile):

- `retrospectives.ts:177` — participant `userName` on retrospective join
- `retrospectives.ts:192` — card `createdByName` on card creation
- `retrospectives.ts:229` — like `username`
- `retrospectives.ts:239` — reaction `username`
- `retrospectives.ts:257` — typing status `username`
- `boards.ts:98` — board `createdByName` on board creation
- `boards.ts:108` — participant `userName` on board join

**Why this only reproduces on a brand-new board**: the client's shared name-resolution helper (`resolveDisplayName`, `src/lib/utils/cardHelpers.ts:77-87`) prefers the live `participants` collection entry over any name captured on the card/like/reaction itself. On a board a user has interacted with *before*, their participant doc was already corrected the last time they saved a new name on the Profile page — `UpdateDisplayName.ts:16-28` calls `participantPort.renameParticipantsForUser(uid, displayName)`, which patches every existing participant doc across every board that uid already belongs to. New cards on that old board still get the wrong `createdByName` baked in via `displayNameOf`, but the render path never notices because it prefers the already-correct `participant.name`. On a *brand-new* board, `createBoard`/`join` create that participant doc for the very first time (`FirestoreBoardsAdapter.ts:116-123`, `FirestoreRetrospectiveBoardAdapter.ts:126-169`), using the stale session-cached name — there is no pre-existing corrected record to hide behind, so the wrong name is both the participant's `name` and the card's `createdByName`, and it renders everywhere for that board.

**Alternatives considered**: None — this is a confirmed root cause via direct code inspection (file:line evidence above), not a hypothesis requiring further investigation.

## 2. Fix approach: resolve through the existing `ensureUserProfile` use case at each write site

**Decision**: Replace `displayNameOf(session.user)` at all seven call sites (`retrospectives.ts` ×5, `boards.ts` ×2) with a call to the existing `ensureUserProfile` use case (`server/src/application/use-cases/profile/EnsureUserProfile.ts`) — the same one `GET /api/profile` already calls (`server/src/http/routes/profile.ts:69-79`) — passing the same session-derived fallback fields (`uid`, `email`, `displayName`, `photoURL`, `providers`), and reading `.displayName` off the returned `ProfileRecord`. This requires:

1. Adding `profilePort: ProfilePort` to `RetrospectiveRouterDeps` (`retrospectives.ts`) and `BoardsRouterDeps` (`boards.ts`).
2. Constructing and injecting `new FirestoreProfileAdapter(db)` in `retrospective-wiring.ts` and `boards-wiring.ts`, mirroring the existing pattern in `profile-wiring.ts`.
3. Replacing the local `displayNameOf` helper's call sites with an async resolution (the route handlers are already `async`, so this is a straightforward `await`).

**Rationale**: `ensureProfile` is a get-or-create that is safe to call repeatedly — if the profile doc already exists, it returns the existing `displayName` untouched (only unioning providers if new ones appear); if it doesn't exist yet, it creates it with the correct OAuth-derived default, exactly matching FR-008's existing, correct behavior. This is the *same* source of truth `GET /api/profile` already uses, satisfying FR-004's "never disagrees with what the user sees as their own configured name." It requires no new dependency (Constitution III/V) and no new abstraction — `ProfilePort` already exists and is already the sole owner of profile resolution (Constitution IV).

**Alternatives considered**:
- *Re-derive `session.user.displayName` from Firestore on every session refresh/verify*: rejected — this would change `SessionServicePort`'s behavior for every authenticated request across the entire app (not just these six write sites), a materially larger blast radius for the same outcome, and would still need the exact same Firestore read this fix already performs, just relocated to a shared, higher-traffic code path.
- *Read directly from the board's own `participants` collection instead of the profile*: rejected — this is exactly the anti-pattern FR-001a of spec 022 already rejected (a board-local record is not authoritative for "current"), and does not even solve the reported bug: at card-creation/join time on a brand-new board, no participant doc exists yet to read from (chicken-and-egg).
- *Add a new, simpler `ProfilePort.getDisplayName(uid)` method instead of reusing `ensureProfile`*: rejected per Simplicity (V) — `ensureProfile` already does exactly what's needed (returns the current `displayName`, self-healing a missing/first-time profile in the same call), and a narrower method would duplicate get-or-create logic that already exists and is already tested (`FirestoreProfileAdapter.test.ts`, `EnsureUserProfile.test.ts`).
- *Denormalize the profile's `displayName` into the session at login only, refreshed periodically*: rejected — this is the exact mechanism already in place today (`session.user.displayName`) and is precisely what causes the bug; a periodic refresh would only narrow the staleness window, not close it, and adds new session-lifecycle complexity for no benefit over resolving at the point of write.

## 3. Regression surface

**Decision**: No change to any REST endpoint's request/response shape, the WebSocket `entity_change` event shapes, or the Firestore document shapes for `participants`, `cards`, likes/reactions, or `typingStatus`. `FirestoreBoardsAdapter`, `FirestoreRetrospectiveBoardAdapter`, `FirestoreCardAdapter`, `FirestoreTypingStatusAdapter` are all unchanged — they continue to receive a plain `name`/`createdByName`/`username` string; only the *caller's* source for that string changes. The client's `resolveDisplayName` helper and every one of its call sites (`DraggableCard.tsx`, `LikeButton.tsx`, `GroupedCardList.tsx`, the export services) are unchanged — they already implement the correct precedence (live participant name, then captured name, then fallback) per spec 022, and only need the participant/card records they read to carry the right value from creation onward.

**Rationale**: Confirms the Technical Context's "no wire-protocol change" claim — this is a pure backend write-source correction, the smallest change that resolves the confirmed root cause across all six affected write paths named in the spec.

## 4. Test strategy

**Decision**: Extend `server/test/http/routes/boards.test.ts` and `retrospectives.test.ts` with cases that seed a session whose `user.displayName` (via the existing `fakeSessionServiceWithUser` fixture) differs from a profile record seeded into a new `inMemoryProfilePort` (already implemented in `server/test/application/use-cases/profile/profileFakes.ts`, reused as-is) wired into the test-app builders' default deps, and assert the created board/card/participant/like/reaction/typing-status record carries the *profile's* name, not the session's. Add one new Playwright E2E case to `e2e/retrospective-board.spec.ts` reproducing the exact reported scenario end-to-end: `signInAs` with one name, `PATCH /api/profile` to a different one, then create a brand-new board and card, asserting the configured name renders immediately with no reload and no rename event — the specific gap the existing rename-propagation test at `retrospective-board.spec.ts:440` does not cover (that test renames *after* content already exists on an *existing* board).

**Rationale**: Per Constitution I (TDD, NON-NEGOTIABLE), these test cases must be written first (red against the current `displayNameOf` behavior), then the fix applied to turn them green.
