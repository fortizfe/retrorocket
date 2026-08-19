# Phase 0 Research: Retrospective-Team Association

No `NEEDS CLARIFICATION` markers remain in the Technical Context (this feature reuses the existing
web-app stack unchanged — see plan.md). The items below are the design decisions this feature
still needed to make, each with rationale and rejected alternatives.

## 1. Where team-name resolution for dashboard display happens

**Decision**: `FirestoreBoardsAdapter.listBoardsForUser` resolves each returned board's team name by
a batched, chunked read directly against the existing `teams` collection (`where('__name__', 'in',
chunk)`, 30-id chunks) — the exact same pattern the adapter already uses to resolve `participants` →
`retrospectives` joins.

**Rationale**: `FirestoreBoardsAdapter` already reads a second flat collection it doesn't "own"
(`participants`) inside `listBoardsForUser`; extending that to a third (`teams`) for a pure id→name
lookup is consistent with the adapter's existing shape and needs no new abstraction. This is
read-only display metadata with no authorization semantics — it doesn't belong behind `TeamsPort`,
whose job (per 054) is enforcing team *invariants* (membership, ownership), not serving arbitrary
name lookups to other features.

**Alternatives considered**:
- **Denormalize `teamName` onto the retrospective doc at creation time.** Rejected: would silently
  go stale if a team is ever renamed in a future iteration (054 doesn't support renaming today, but
  nothing in this spec should assume it never will); a live lookup is strictly more correct at
  negligible extra cost (one batched query already within the existing request).
- **Inject `TeamsPort` into `ListBoardsForUser` and join at the use-case layer.** Rejected as
  unnecessary indirection (Simplicity/YAGNI) for a single-collection, no-auth-logic lookup — the
  precedent for a genuine cross-slice *authorization* call (item 2 below) is different from a
  display-only join.
- **Return only `teamId` to the client and have the frontend resolve names from its own
  `useTeamsQuery()` cache.** Rejected: only correct for boards linked to teams the *viewer*
  belongs to. A board tied to a team the viewer isn't a member of (e.g., they joined via link) must
  still display *some* team identity per FR-011 — the viewer's own "my teams" list can't supply
  that. The backend must resolve the name regardless of the viewer's own membership.

## 2. Where creation-time team-membership authorization happens

**Decision**: `CreateBoard` (application/use-cases/boards/CreateBoard.ts) gains a `teamsPort` dependency
scoped to `Pick<TeamsPort, 'getMembership'>` and, when `teamId` is provided, calls
`teamsPort.getMembership(teamId, params.createdBy)`; a `null` result throws `ForbiddenError`
(`403 forbidden`) before any board data is written (FR-004).

**Rationale**: `TeamsPort.getMembership(teamId, userId): Promise<TeamMembershipRecord | null>`
already exists and is already exercised by 054's own use-cases — reusing it keeps the "is this uid a
member of this team" invariant owned in exactly one place (the Teams slice), per Interface
Segregation/Dependency Inversion. No new port method is needed.

**Alternatives considered**:
- **Query `teamMemberships` directly from `FirestoreBoardsAdapter`.** Rejected: duplicates logic
  `TeamsPort` already owns, couples the Boards adapter to the `teamMemberships` schema, and would
  drift if that schema changes independently (054's data-model.md documents it as internal to the
  Teams slice).
- **Trust the frontend to only ever submit a `teamId` the user belongs to (client-side scoping via
  `useTeamsQuery()` is already sufficient in practice).** Rejected: FR-004's edge case explicitly
  requires server-side rejection of a manipulated request; client-side scoping is UX, not
  authorization.

## 3. Dashboard team-filter option source

**Decision**: The dashboard's team filter is populated from `GET /api/teams` (via the existing,
unmodified `useTeamsQuery()` hook) — every team the viewing user currently belongs to, plus a
"no team" option — independent of which teams currently appear among the user's own boards.

**Rationale**: This directly encodes the Clarifications session's second answer (2026-08-19):
"Every team the viewing user currently belongs to... shown even if a given team currently has zero
matching boards in the list." It also means this part of the feature needs **zero backend changes**
— `GET /api/teams` (054) already returns exactly the needed shape, and `useTeamsQuery()` is already
built and used elsewhere (`Teams.tsx`).

**Alternatives considered**: Deriving filter options from `boards[].teamId` (client-side, no extra
fetch) — this was the recommended default going into clarification but was explicitly overridden by
the user in favor of the "my teams" source; not revisited.

## 4. Where the team indicator is (and isn't) rendered

**Decision**: A team badge/label is added only to `BoardRow.tsx` (the dashboard's board-list row). No
change is made to any retrospective-session component (`RetrospectivePage` or its children).

**Rationale**: Directly encodes the Clarifications session's first answer (2026-08-19): the
indicator must never be visible inside an open retrospective session, so a participant who joins via
link but isn't part of the team can't learn the team association from within the session (FR-011).
Confining the change to `BoardRow.tsx` also means the feature's frontend footprint inside the
retrospective/session codebase is exactly zero — nothing there needs to know `teamId` exists.

**Alternatives considered**: Showing it in-session to everyone, or in-session only to team members —
both explicitly rejected during clarification (Options B and C).

## 5. Team-picker UI in the creation flow

**Decision**: `CreateBoardFlow.tsx`'s "details" step gains a plain `<select>` (native select, matching
the codebase's existing form-control conventions — e.g. the anonymous-mode checkbox on the same
step), populated via `useTeamsQuery()`, defaulting to no selection (`teamId: null`). The control is
omitted entirely (not shown as disabled) when the facilitator belongs to zero teams.

**Rationale**: Satisfies FR-012 ("MUST NOT require... to interact with any team-related control")
literally and avoids a dead/disabled control with no purpose — consistent with Simplicity (KISS).

**Alternatives considered**: Always rendering the control in a disabled/empty state with an
explanatory message — adds a UI branch and copy for zero behavioral benefit when omission already
satisfies the requirement; rejected (YAGNI).

## 6. Team association is immutable after creation (this iteration)

**Decision**: No `PATCH`-style "change retrospective's team" capability is added. `teamId` is set
once, at `POST /api/boards` time, and never updated by this feature.

**Rationale**: Directly follows the spec's Assumptions ("changing... a retrospective's team
association after it has been created is out of scope and deferred to a later iteration"), mirroring
how 054 itself deliberately deferred team deletion. Keeps this feature's surface area to exactly
what spec.md's functional requirements ask for.

## 7. Testing approach

**Decision**: 
- Backend: Vitest unit tests for `CreateBoard`'s new membership-validation branches (team provided +
  member; team provided + not a member → 403; no team provided → unchanged behavior), using fake
  `BoardsPort`/`TeamsPort` implementations, mirroring the existing `CreateBoard.test.ts` structure.
  `FirestoreBoardsAdapter`'s new `teams` read stays under the project's existing, documented
  exception for thin Admin-SDK adapter code (E2E-covered, not unit-mocked) — same treatment every
  other adapter method already receives.
- Frontend: Vitest + Testing Library for `useBoardListQuery`'s new team-filter branch, `BoardControlsBar`'s
  new filter control, `BoardRow`'s new badge, and `CreateBoardFlow`'s new team `<select>` (including
  the "0 teams → control omitted" case).
- E2E: Playwright scenarios extending the existing dashboard/boards specs — create with/without a
  team, filter the dashboard by team and by "no team," and a negative assertion that no team
  identifier or name appears anywhere in the retrospective session's rendered output or network
  responses used by session components.

**Rationale**: Matches constitution Principles I/VI/VII exactly as 054 did for its own use-cases and
UI, with the addition of an explicit negative E2E check for FR-005/FR-011's "must not change access,
must not leak in-session" guarantees — these are the feature's highest-consequence requirements and
warrant a test that fails loudly if violated, not just an absence of a positive assertion.
