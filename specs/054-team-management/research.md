# Phase 0 Research: Team Management Foundation

All items below were either resolved during `/speckit-clarify` (recorded in spec.md's Clarifications
section) or are architecture decisions made by surveying the existing codebase for the established
pattern to reuse. No open `NEEDS CLARIFICATION` markers remain in the Technical Context.

## 1. Where team data lives and how it's accessed

**Decision**: Two new top-level Firestore collections, `teams` and `teamMemberships`, accessed
**exclusively from the backend** via the Firebase Admin SDK (a `TeamsPort` interface + a
`FirestoreTeamsAdapter` implementation), mirroring `server/src/application/ports/boards.ts` +
`FirestoreBoardsAdapter.ts`. `firestore.rules` gets an explicit `allow read, write: if false;` deny
block for both collections, the same treatment already given to `mcpClients` / `mcpConnections` /
`mcpAuthorizationCodes` — the Admin SDK bypasses security rules entirely, so the deny is what stops
any client-side Firestore SDK call from touching these collections directly.

**Rationale**: Every backend feature added since 017 (boards dashboard) and 018 (profile) moved off
direct client-side Firestore reads/writes in favor of session-cookie-authenticated REST endpoints
backed by Admin SDK ports/adapters — it's the established, current direction of the codebase, not
just one option among several. It also makes it trivial to enforce the business rules the spec
requires (exact-email-only lookup, no duplicate memberships, ownership auto-transfer, owner-only
add/remove) as server-side invariants instead of `firestore.rules` expressions, which cannot express
"the caller is this team's current owner" without an extra document read anyway.

**Alternatives considered**:
- *Direct client Firestore SDK access with rules-based authorization* — rejected: inconsistent with
  every recent feature, and Firestore rules alone can't cleanly express "exactly one active owner,
  auto-transfer on departure" as a write-time invariant.
- *Subcollection under each team doc for membership* (`teams/{teamId}/members/{uid}`) — see item 3
  below; rejected in favor of a flat collection.

## 2. Looking up an existing user by exact email (FR-003)

**Decision**: Query the existing `users` Firestore collection (the Profile store, `ProfilePort` /
`FirestoreProfileAdapter`, `users/{uid}` docs already containing `email`, `displayName`, `photoURL`)
with `where('email', '==', normalizedEmail)`, where `normalizedEmail` is lower-cased/trimmed the same
way `FirebaseIdentityAdapter` already normalizes email for its own lookup. Returns the matching
profile or `null` — never creates anything.

**Rationale**: A `users/{uid}` profile doc only exists once someone has actually signed in and
`ensureProfile` has run for them, which is exactly the "existing RetroRocket user" the spec means
(FR-006) — it's a better fit than the alternative below and requires no new denormalized data.

**Alternatives considered**:
- *`firebase-admin/auth`'s `getUserByEmail`* (used today by `FirebaseIdentityAdapter` as part of a
  get-or-create login flow) — rejected as the direct lookup mechanism: calling it standalone still
  returns Firebase Auth users who have never actually used RetroRocket (no profile doc yet created
  by any actual login), and reusing the existing wrapper risks accidentally invoking its
  create-if-missing branch, which would violate FR-006 (only existing RetroRocket users, and never
  silently create an account as a side effect of someone else's search).
- *New standalone "user directory" collection* — rejected as duplicate data; `users/{uid}` already
  has everything needed (email, displayName, photoURL) for search + roster display.

## 3. Membership storage shape (Team ↔ User)

**Decision**: A flat, top-level `teamMemberships` collection, one document per `(teamId, userId)`
pair, with fields `teamId`, `userId`, `role` (`'owner' | 'member'`), `joinedAt`. Mirrors the existing
`participants` collection used for board membership (`server/src/adapters/firebase/FirestoreBoardsAdapter.ts`).

**Rationale**: The spec's User Story 3 needs two symmetric queries — "everyone in team X"
(`where('teamId','==',id)`) and "every team user Y belongs to" (`where('userId','==',uid)`) — both of
which a flat collection with a composite-friendly shape serves directly with simple, already-proven
query patterns (`participants` does the equivalent `where('userId','==',uid)` lookup today in
`listBoardsForUser`). A subcollection under each team doc would make the "teams I belong to" query a
collection-group query — a query pattern not used anywhere else in this codebase — for no benefit,
violating Simplicity (Principle V).

**Alternatives considered**:
- *Subcollection `teams/{teamId}/members/{uid}`* — rejected per above (forces a collection-group
  query for the reverse lookup; inconsistent with the `participants` precedent).
- *Array of member uids embedded on the team doc* — rejected: can't hold per-member metadata
  (`role`, `joinedAt`) needed for the ownership-transfer rule (FR-013, "longest-standing member")
  without a second read anyway, and large arrays are a known Firestore write-contention anti-pattern.

## 4. Ownership transfer rule (FR-013)

**Decision** (already fixed in spec.md's Clarifications): when the owner leaves a team that still has
other members, ownership transfers to the remaining member with the earliest `joinedAt`. Implemented
as a pure, unit-testable helper (`selectNextOwner(members: TeamMembership[]): TeamMembership`) in the
`leaveTeam` / ownership-transfer use-case, operating on data already fetched from `TeamsPort` — no new
Firestore query shape needed beyond what item 3 already provides.

## 5. Frontend structure and routing

**Decision**: New feature module `src/features/teams/` (components/hooks/services/types), following
the shape of `src/features/dashboard/` and `src/features/profile/`. A `backendTeamsClient.ts` service
mirrors `backendBoardsClient.ts`'s fetch conventions (`credentials: 'include'`, `{ error: { code,
message } }` envelope unwrapping). Two new lazy-loaded pages, `src/pages/Teams.tsx` (list of teams the
user belongs to + create action, satisfying User Story 3's "teams overview") and
`src/pages/TeamDetail.tsx` (single team's roster + add/remove/leave, User Stories 1–2), registered in
`App.tsx` as `/teams` and `/teams/:id`, inside the existing `AuthGuard` (same protection level as
`/dashboard` and `/perfil` — no new auth mechanism needed).

**Rationale**: Reuses every existing convention (lazy route, `AuthGuard`, fetch-based backend client,
toast-based error surfacing via `react-hot-toast`, i18next namespacing) instead of introducing new
patterns, per Principle II (Library-First / decoupled feature module) and Principle V (Simplicity).

## 6. i18n

**Decision**: New top-level `teams` key in `src/locales/en.json` and `src/locales/es.json`, sibling to
the existing `dashboard`, `profile`, etc. namespaces. All user-visible strings (form labels, empty
states, error messages, confirmation copy for leave/remove/ownership-transfer) go through this key —
no hardcoded strings, per the constitution's Internationalization standard.

## 7. Testing approach

**Decision**:
- Backend: Vitest unit tests for every use-case (`createTeam`, `addTeamMember`, `removeTeamMember`,
  `leaveTeam` incl. the `selectNextOwner` helper, `listTeamsForUser`, `listTeamMembers`) against a
  fake `TeamsPort`, following the existing `server/test/application/use-cases/boards/*` pattern.
  `FirestoreTeamsAdapter` itself follows the codebase's established, already-documented exception (see
  `server/vitest.config.ts` coverage excludes and every existing Firestore adapter's own docstring):
  thin Admin SDK query/write composition, verified by the Playwright E2E suite against the emulator
  rather than mocked at the Vitest level; only pure mapping helpers (e.g. `toTeamSummary`) get direct
  unit tests.
- Frontend: Vitest + Testing Library for `src/features/teams/**` components/hooks, following
  `src/test/features/dashboard/**`'s existing structure.
- E2E: a Playwright spec covering the golden path (create team → add member by email → member sees
  roster and appears in their teams overview → owner removes a member → a member leaves voluntarily →
  owner leaves and ownership auto-transfers), consistent with how boards/profile (017/018) each got
  E2E coverage for their primary flows.
