# Quickstart: Validating Retrospective-Team Association

Manual/E2E validation steps proving the feature works end-to-end, once implemented per tasks.md.
References contracts/boards-api-delta.md and data-model.md rather than duplicating request/response
shapes.

## Prerequisites

- Firebase emulators running (`npm run emulators` — Auth + Firestore).
- Backend dev server + frontend dev server running (`npm run dev:all`, or both separately).
- Two signed-in RetroRocket accounts, both with at least one team already set up via the 054 team
  feature: call them **Facilitator** (belongs to "Team Alpha") and **Outsider** (belongs to no
  teams, or to a different team — not "Team Alpha"). A third account, **Anyone**, needs no team
  membership at all and is used purely to test link-based joining.

## Scenario 1 — Create a retrospective linked to a team (User Story 1)

1. As **Facilitator**, open the board-creation flow and reach the details step.
2. Confirm the team picker is present and lists "Team Alpha" (and any other teams Facilitator
   belongs to).
3. Select "Team Alpha", submit → board is created.
4. On the dashboard, confirm the new board shows a "Team Alpha" indicator.
5. Create a second board **without** selecting any team → dashboard shows no indicator for it, and
   it behaves identically to a pre-feature board (open it, rename it, delete it — all unaffected).
6. As **Outsider** (who does not belong to "Team Alpha"), attempt to create a board while somehow
   specifying "Team Alpha"'s id directly at the API level (bypassing the UI, which would never offer
   it) → rejected with `403 forbidden` (contracts/boards-api-delta.md); no board is created.

**Expected**: `POST /api/boards` returns `201` for steps 3 and 5, `403 forbidden` for step 6;
`GET /api/boards` for Facilitator shows `teamId`/`teamName` set for the Scenario-1 board and `null`
for the un-linked one.

## Scenario 2 — Facilitator with zero teams is never blocked (Edge Case)

1. As a brand-new account with no team memberships, open the board-creation flow.
2. Confirm the team picker control does not appear at all (not shown disabled — omitted).
3. Complete creation with just a title → succeeds exactly as it did before this feature existed.

**Expected**: No team-related friction anywhere in the flow (FR-012); the created board has
`teamId: null`.

## Scenario 3 — Filter the dashboard by team (User Story 2)

1. As **Facilitator**, with a mix of boards from Scenario 1 (one linked to "Team Alpha", one
   unlinked) plus any others already on the dashboard, open the team filter control.
2. Confirm it lists every team Facilitator belongs to (not just teams with a matching board) — per
   the Clarifications session, this must include a team with zero current boards if Facilitator
   belongs to one.
3. Select "Team Alpha" → only the Team-Alpha-linked board is shown.
4. Select "No team" → only unlinked boards are shown.
5. Combine the "Team Alpha" filter with the existing search box (type part of that board's title) →
   result still narrows correctly.
6. Clear the team filter → the full board list returns, exactly as before this feature existed.

**Expected**: Filter options come from `GET /api/teams` (contracts, 054), not from the boards
already loaded; filtered results always match `board.teamId` (or its absence) exactly.

## Scenario 4 — Team association does not change who can join (User Story 1 AC4 / FR-005, negative)

1. As **Facilitator**, copy the link/ID of the Scenario-1 board (linked to "Team Alpha").
2. As **Anyone** (no team memberships at all, not a member of "Team Alpha"), open that link/ID and
   join.
3. Confirm the join succeeds exactly as it would for an unlinked board — same steps, same latency,
   no team-membership prompt or gate of any kind.

**Expected**: `POST /api/boards/{id}/join` behavior and response shape are byte-for-byte identical
to a non-team-linked board's join (contracts/boards-api-delta.md's "unchanged" section).

## Scenario 5 — Team identity never leaks inside the session (User Story 3 AC3 / FR-011, negative)

1. As **Anyone** (from Scenario 4), with the Scenario-1 board now open in the retrospective session
   view (not the dashboard), inspect the rendered UI for any team name, badge, or identifier.
2. Inspect the network responses the session view itself triggers (card/column/participant fetches,
   not `/api/boards` list calls) for a `teamId`/`teamName` field.

**Expected**: No team identifier or name appears anywhere in the open session's UI or the
session-specific network traffic — confirms FR-011's "MUST NOT appear inside the open retrospective
session itself" and research.md item 4's decision that `teamName` is only ever populated by the
`listBoardsForUser` (dashboard) path.

## Out-of-scope checks (negative assertions worth keeping in mind, not new endpoints)

- No `PATCH`-style endpoint exists to change a retrospective's team after creation (spec
  Assumptions — deferred).
- A team-linked retrospective whose creator later leaves that team (via the 054 `/teams` UI) keeps
  its `teamId` unchanged — reload the dashboard and confirm the indicator still shows "Team Alpha".
