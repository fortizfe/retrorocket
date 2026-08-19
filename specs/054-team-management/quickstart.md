# Quickstart: Validating Team Management Foundation

Manual/E2E validation steps proving the feature works end-to-end, once implemented per tasks.md.
References contracts/teams-api.md and data-model.md rather than duplicating request/response shapes.

## Prerequisites

- Firebase emulators running (`npm run emulators` — Auth + Firestore), same as every other backend
  feature's local/E2E setup.
- Backend dev server running (`npm run dev:server`) and frontend dev server running (`npm run dev`),
  or both together via `npm run dev:all`.
- Two signed-in RetroRocket accounts available (e.g. two browser profiles, or Playwright's existing
  multi-context pattern used by other E2E specs) — call them **Owner** and **Invitee**. Both must have
  signed in at least once so their `users/{uid}` profile docs exist (research.md item 2 — lookup only
  finds users who have a profile doc).

## Scenario 1 — Create a team and become owner (User Story 1)

1. As **Owner**, navigate to `/teams`.
2. Trigger team creation, submit a name only (no description) → team appears, Owner shown as owner.
3. Create a second team with both a name and a description → both stored and visible.
4. Attempt to submit the creation form with an empty name → rejected with an inline error, no team
   created.

**Expected**: `POST /api/teams` returns `201` for steps 2–3, `400 validation_error` for step 4;
`GET /api/teams` for Owner lists both created teams with `myRole: "owner"`.

## Scenario 2 — Owner manages membership (User Story 2)

1. As **Owner**, open the first team from Scenario 1, add **Invitee** by their exact email.
2. Reload the team screen → Invitee appears in the roster with `role: "member"`.
3. Attempt to add Invitee again → rejected as already a member, no duplicate row.
4. Attempt to look up an email with no matching account → "no matching user" message, nothing added.
5. As **Invitee**, attempt to add or remove a member on this team → denied (Invitee is not owner).
6. As **Owner**, remove Invitee from the roster → Invitee no longer listed.
7. Re-add Invitee, then as **Invitee**, leave the team voluntarily → Invitee no longer listed, no
   Owner action was needed.

**Expected**: matches `contracts/teams-api.md`'s `POST/DELETE /api/teams/:id/members[/:userId]`
status codes for each step (`201`, `409 conflict`, `404 not_found`/`user_not_found`, `403 forbidden`,
`204`).

## Scenario 3 — View roster and personal teams overview (User Story 3)

1. Re-add Invitee to the team (as Owner).
2. As **Invitee**, open `/teams` → sees the team listed with `myRole: "member"`.
3. As **Invitee**, open the team detail screen → sees the full roster including Owner.
4. As a third, brand-new account with no team memberships, open `/teams` → sees an empty state, not
   an error.

**Expected**: `GET /api/teams` and `GET /api/teams/:id` responses match every member's actual current
state; empty-teams case returns `{ "teams": [] }`, not an error.

## Scenario 4 — Ownership transfer and the ownerless edge case (Clarifications, FR-013/FR-014)

1. As **Owner**, with Invitee still a member, leave the team (`DELETE /api/teams/:id/members/:ownerUid`
   with `userId == self`).
2. Re-fetch the team → Invitee is now `role: "owner"` (earliest-joined remaining member, research.md
   item 4); former Owner no longer listed.
3. As the new owner (**Invitee**), leave the team while being its only remaining member.

**Expected**: step 1 returns `204` (another member remained); step 3 returns `200
{ "teamEmptied": true }` per contracts/teams-api.md — the team doc still exists (`ownerId` now
pointing at a uid with no membership) but no further membership actions are possible on it (FR-014,
FR-015).

## Out-of-scope checks (negative assertions worth keeping in mind, not new endpoints)

- No retrospective/board anywhere references a `teamId` (FR-016).
- No team-level metrics or health-check survey UI exists anywhere in `/teams` or `/teams/:id`
  (FR-017, FR-018).
