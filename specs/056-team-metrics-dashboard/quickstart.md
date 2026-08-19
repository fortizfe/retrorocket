# Quickstart: Validating the Team Retrospective Metrics Dashboard

Manual/E2E validation steps proving the feature works end-to-end, once implemented per tasks.md.
References contracts/team-metrics-api.md and data-model.md rather than duplicating request/response
shapes.

## Prerequisites

- Firebase emulators running (`npm run emulators` — Auth + Firestore).
- Backend dev server + frontend dev server running (`npm run dev:all`, or both separately).
- Three signed-in RetroRocket accounts: **Owner** and **Member**, both belonging to "Team Alpha"
  (Owner created it, per the 054 team feature); **Outsider**, who belongs to no team or to a
  different team — not "Team Alpha".
- At least two retrospectives already created and associated with "Team Alpha" (per the 055
  retro-team-association feature), with different `participantCount`s and at least one action item
  created in each. On at least one of them, analyze sentiment on enough cards to produce confident
  results (per the existing sentiment-analysis flow); leave at least one other team retrospective
  with no analyzed cards at all.

## Scenario 1 — Owner or member views the populated panel (User Story 1 & 2)

1. As **Owner**, open Team Alpha's detail page (`/teams/{id}`) and locate the metrics panel.
2. Confirm `retrospectiveCount` matches the number of retrospectives created against "Team Alpha".
3. Confirm the displayed average participants figure matches the mean of those retrospectives'
   participant counts (data-model.md's `averageParticipants`).
4. Confirm the displayed action items total matches the sum of action items across those same
   retrospectives (created-count only — no completed/pending breakdown is shown anywhere).
5. Repeat steps 1-4 as **Member** (not the owner) — same values, same access.

**Expected**: `GET /api/teams/{id}/metrics` returns `200 OK` for both Owner and Member, with
identical `retrospectiveCount`/`averageParticipants`/`actionItemsCreated` values
(contracts/team-metrics-api.md).

## Scenario 2 — Mood evolution, including a "no data" point (User Story 3)

1. Still on the panel from Scenario 1, locate the mood evolution list.
2. Confirm the retrospective with analyzed, confident sentiment shows a numeric mood score (`1`-`10`).
3. Confirm the retrospective with no analyzed cards shows an explicit "no data" indicator — not a
   zero, not a default score, and visually distinguishable without relying on color alone (WCAG 2.1
   AA — text/icon, not color-only).
4. Confirm the list is ordered chronologically (oldest retrospective first).

**Expected**: `moodEvolution` in the API response is sorted ascending by `createdAt`; the entry for
the unanalyzed retrospective has `moodScore: null` (data-model.md).

## Scenario 3 — Non-member is denied (User Story 1 AC2, negative)

1. As **Outsider**, attempt to load Team Alpha's metrics panel through the normal UI path (should not
   even be reachable/visible without being a member).
2. As **Outsider**, call `GET /api/teams/{teamAlphaId}/metrics` directly (bypassing the UI).

**Expected**: `403 forbidden` (contracts/team-metrics-api.md); no metrics data of any kind is present
in the response body.

## Scenario 4 — Membership loss is enforced on next request, not live (Clarifications, 2026-08-19)

1. As **Member**, open Team Alpha's metrics panel and leave it open (do not reload).
2. As **Owner**, remove **Member** from "Team Alpha" (054's existing remove-member flow).
3. Back as **Member**, without reloading, confirm the already-rendered panel is not required to
   disappear or show an error immediately.
4. As **Member**, reload the page (or navigate away and back).

**Expected**: Step 3 has no required behavior either way (not actively torn down); step 4's fresh
request returns `403 forbidden` (research.md item 2) — access is denied on the next request, not via
live monitoring of the already-open view.

## Scenario 5 — Team with zero retrospectives shows an empty state (Edge Case)

1. As **Owner**, create a brand-new team with no retrospectives associated to it yet.
2. Open that team's metrics panel.

**Expected**: `retrospectiveCount: 0`, `averageParticipants: 0`, `actionItemsCreated: 0`,
`moodEvolution: []` (`200 OK`, not an error) — the panel renders a clear empty state rather than a
blank or broken layout (FR-010, SC-004).

## Out-of-scope checks (negative assertions worth keeping in mind, not new endpoints)

- No query parameter narrows the panel to a date range or a "last N retrospectives" window — it is
  always the team's full history (research.md item 7).
- No control anywhere on the panel lets a user mark an action item as completed, or shows a
  completed/pending breakdown — that capability does not exist yet (spec Clarifications).
- Viewing the panel does not change access to any underlying retrospective, board, or action item
  (FR-012) — confirm a non-member who can join a Team-Alpha-linked retrospective via its link/ID
  (per 055's existing behavior) still can, entirely independent of whether they can see this panel.
