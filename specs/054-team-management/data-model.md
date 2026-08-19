# Phase 1 Data Model: Team Management Foundation

Derived from spec.md's Key Entities section and Functional Requirements. Storage shape follows the
decisions in research.md (items 1 and 3): two flat, backend-only Firestore collections.

## Team

Firestore collection: `teams`. One document per team.

| Field | Type | Notes |
|---|---|---|
| `id` | string (doc id) | Firestore auto-generated document id. |
| `name` | string | Required, non-empty (FR-001). No global-uniqueness constraint (spec Assumptions). |
| `description` | string \| null | Optional (FR-001). Stored as `null`/absent when not provided. |
| `ownerId` | string (uid) | Currently designated owner. Exactly one at a time (spec Assumptions). Updated in place on ownership transfer (FR-013) — the team doc itself is never deleted (FR-015). |
| `createdBy` | string (uid) | The original creator (FR-002). Immutable audit field; distinct from `ownerId`, which can change after transfer. |
| `createdAt` | Timestamp | Set once, at creation. |
| `updatedAt` | Timestamp | Bumped whenever `name`, `description`, or `ownerId` changes. |

**Validation rules**:
- `name`: required, non-empty after trimming (FR-001, User Story 1 AC3).
- `description`: optional; when present, stored as provided (no format constraint from the spec).
- `ownerId` MUST always reference a uid that also has an active `teamMemberships` doc with
  `role: 'owner'` for this team — the two collections are kept in lockstep by the use-cases (item
  below), not by a database-level constraint (Firestore has none).

**Lifecycle**:
- Created by `createTeam` (FR-001, FR-002): one `Team` doc + one `TeamMembership` doc (`role:
  'owner'`) written together.
- Never deleted in this iteration (FR-015). A team that loses its last member (FR-014) still exists
  as a `Team` doc with `ownerId` pointing at a uid that no longer has a corresponding `teamMemberships`
  doc — a recognizable "ownerless" state future iterations can detect and act on.

## TeamMembership

Firestore collection: `teamMemberships`. One document per `(teamId, userId)` pair — the join model
between `Team` and a RetroRocket user (identified by uid, per the existing `UserIdentity` /
`ProfileRecord` model).

| Field | Type | Notes |
|---|---|---|
| `id` | string (doc id) | Firestore auto-generated, or a deterministic `${teamId}_${userId}` id — either works; a deterministic id makes the FR-007 duplicate-prevention check a single `get()` instead of a query, so prefer it. |
| `teamId` | string | References `teams/{teamId}`. |
| `userId` | string (uid) | The member. References the user's `uid` (same identity space as `Retrospective.createdBy`, `ProfileRecord.uid`, etc. — no new identity concept introduced). |
| `role` | `'owner' \| 'member'` | Exactly one `owner` membership must exist per team while the team has any members at all (FR-013, FR-014). |
| `joinedAt` | Timestamp | When this membership was created. Used to pick the ownership-transfer target (research.md item 4: earliest `joinedAt` among remaining members). |

**Validation / invariants**:
- Uniqueness: at most one `TeamMembership` doc per `(teamId, userId)` pair (FR-007). Enforced by the
  deterministic-id approach above, checked before write.
- Exactly one `role: 'owner'` membership per team at any time the team has ≥1 member (FR-002, FR-013).
- A membership is only ever created for a `userId` that already has a `users/{uid}` profile doc
  (FR-006) — enforced by the `addTeamMember` use-case performing the email lookup from research.md
  item 2 before writing.

**State transitions**:

```text
                    createTeam
                        │
                        ▼
              [owner membership created]
                        │
        ┌───────────────┼───────────────────────┐
        │               │                       │
   addTeamMember   removeTeamMember        leaveTeam (self)
   (owner only,     (owner only,           ┌──────┴──────┐
   FR-003/004)       FR-005)          non-owner        owner
        │               │             leaves           leaves
        ▼               ▼             (FR-012)     ┌────┴─────┐
  [member          [membership                     │          │
   membership       deleted]                 other members   sole
   created,                                   remain          member
   role:'member']                                 │            │
                                                    ▼            ▼
                                          [ownership auto-  [team has
                                           transfers to      zero members,
                                           earliest-joined   ownerId now
                                           remaining          points to a
                                           member, FR-013;    uid with no
                                           former owner's     membership —
                                           membership         "ownerless",
                                           deleted or         FR-014/FR-015]
                                           demoted depending
                                           on whether they
                                           left entirely or
                                           just stepped down]
```

## Relationships

- `Team 1 ── * TeamMembership *── 1 User` (existing `uid` identity — no new `User` entity introduced;
  `TeamMembership.userId` and `Team.ownerId`/`createdBy` reference the same uid space already used by
  `ProfileRecord.uid` / `UserIdentity`).
- A `User` (uid) can have memberships in multiple `Team`s simultaneously (FR-011) — no query or
  storage change needed beyond `where('userId', '==', uid)` over `teamMemberships`.

## Derived read shapes (API-facing, not stored)

- **TeamSummary** (used for `GET /api/teams` and `GET /api/teams/:id`): `Team` fields plus a
  `memberCount` and the requester's own `role` in that team — computed at read time from
  `teamMemberships`, not stored redundantly on `Team`.
- **TeamMemberView** (used for the roster, `GET /api/teams/:id`): `TeamMembership.role` +
  `joinedAt`, joined with the corresponding `ProfileRecord` (`displayName`, `email`, `photoURL`) for
  display — the same join pattern `resolveDisplayName` already does in `routes/boards.ts`.
