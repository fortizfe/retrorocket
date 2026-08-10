# Phase 1 Data Model: Fix Configured Display Name Not Used on New Boards

No new entities, fields, collections, or state transitions are introduced by this fix. It corrects which existing, already-modeled value is read at the moment a name is captured into an existing entity; the affected entities are documented here for traceability only.

## User Profile (`users/{uid}`, unchanged)

The authoritative record of a user's configured display name (feature 018).

- **Fields relevant here**: `uid`, `email`, `displayName` (the "Mi Perfil" configurable value), `photoURL`, `providers`.
- **Access pattern this fix relies on**: `ProfilePort.ensureProfile(input)` — get-or-create, idempotent. Returns the existing `displayName` untouched when the profile already exists (only unions `providers`); creates it with the OAuth-derived default when it doesn't (unchanged FR-008 behavior). This fix calls it from six additional sites, all of which already have every field `EnsureProfileInput` requires (`uid`, `email`, `displayName`, `photoURL`, `providers`) available on the verified session, identical to what `GET /api/profile` already passes.
- **No schema change.**

## Session (`PublicUser`, unchanged shape, unchanged lifecycle)

- **Field involved**: `user.displayName` — the raw OAuth name captured at login. This fix stops *reading* it as the name-of-record for new writes at the six affected call sites; it is not removed, renamed, or altered, since other code (unaffected by this fix) may still reference it and the session's shape is out of scope per the spec's Assumptions.

## Card (`cards/{id}`, unchanged shape)

- **Field involved**: `createdByName`, captured once at creation (spec 020). This fix changes only the *value* supplied at creation time (`retrospectives.ts:192`), from `displayNameOf(session.user)` to the resolved `ProfileRecord.displayName`. No new field, no change to how `createdByName` is later read/displayed (`resolveDisplayName`, unchanged).

## Participant (board membership, unchanged shape)

- **Field involved**: `name`, captured once the first time a uid joins/creates a specific board (`retrospectives.ts:177`, `boards.ts:98,108`). Same nature of change as Card above — value source corrected, shape unchanged. Existing participant docs (already corrected via `renameParticipantsForUser`, or not yet affected) are untouched by this fix — consistent with the clarified no-backfill decision.

## Like / Reaction / Typing Status (unchanged shapes)

- **Field involved**: `username`, captured per-action (`retrospectives.ts:229,239,257`). Same nature of change — value source corrected, shape and lifecycle (including typing status's TTL/disconnect-safety sweep) unchanged.

## Relationships

No relationship between entities changes. No new entity is introduced. The only cross-cutting change is that `RetrospectiveRouterDeps` and `BoardsRouterDeps` (dependency-injection interfaces, not data entities) each gain one new field, `profilePort: ProfilePort`, mirroring the dependency `ProfileRouterDeps` already declares.
