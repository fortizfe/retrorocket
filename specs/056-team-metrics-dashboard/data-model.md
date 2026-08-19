# Phase 1 Data Model: Team Retrospective Metrics Dashboard

No new Firestore collection and no new persisted field is introduced by this feature. It is a
read-only aggregation, computed on demand, over five already-existing collections: `teams`,
`teamMemberships` (both 054), `retrospectives` (including its `teamId` field from 055), `actionItems`,
and `sentimentResults` (both pre-existing, feature 019). This document describes the **derived**
read shape the new endpoint returns (API-facing only — never stored as its own document).

## TeamMetricsSummary (derived, API-facing)

Returned by `TeamMetricsPort.getTeamMetrics(teamId)` (`server/src/application/ports/teamMetrics.ts`)
and by `GET /api/teams/:id/metrics` (contracts/team-metrics-api.md).

| Field | Type | Notes |
|---|---|---|
| `teamId` | string | Echoes the requested team's id. |
| `retrospectiveCount` | number | Count of `retrospectives` docs with `teamId == teamId` (FR-005). `0` for a team with none (FR-010). |
| `averageParticipants` | number | Mean of `participantCount` across those retrospectives, computed in-memory (research.md item 3). `0` when `retrospectiveCount` is `0`. Not rounded to an integer — carries one decimal place for readability (e.g. `4.3`), consistent with the existing `moodScore` precision convention. |
| `actionItemsCreated` | number | Sum of `actionItems` docs whose `retrospectiveId` is one of the team's retrospective ids (FR-007, research.md item 4). Created-count only — no completed/pending breakdown (spec Clarifications, 2026-08-19: no completion field exists yet). |
| `moodEvolution` | `RetrospectiveMoodPoint[]` | One entry per team retrospective, ordered ascending by that retrospective's `createdAt` (FR-008). Empty array when `retrospectiveCount` is `0`. |

## RetrospectiveMoodPoint (derived, nested in TeamMetricsSummary)

| Field | Type | Notes |
|---|---|---|
| `retrospectiveId` | string | The source retrospective's id. |
| `retrospectiveTitle` | string | The retrospective's `title` field, for display context in the list. |
| `createdAt` | Date (ISO-8601 on the wire) | Determines this point's position in chronological order. |
| `moodScore` | number \| null | `1`-`10` (one decimal place), computed per research.md item 5 from that retrospective's confident `sentimentResults`. `null` when the retrospective has zero confident sentiment results — rendered as an explicit "no data" state, never a default/zero score (FR-009). |

## Relationships

- `Team 1 ── * Retrospective` via `Retrospective.teamId` (already established by 055) — the set this
  feature aggregates over.
- `Retrospective 1 ── * ActionItem` via `ActionItem.retrospectiveId` (pre-existing, feature 019).
- `Retrospective 1 ── * SentimentResult` via `SentimentResult.retrospectiveId` (pre-existing, feature
  019; doc id `{retrospectiveId}_{cardId}`).
- Access to the derived `TeamMetricsSummary` for a given `teamId` requires an active
  `TeamMembership` (`Team 1 ── * TeamMembership *── 1 User`, 054) for the requesting uid — enforced
  by the use-case, not by this read shape itself (data-model.md's job here is the shape, not the
  gate; see contracts/team-metrics-api.md for the 403 behavior).

## Computation notes

- **`averageParticipants` with zero retrospectives**: defined as `0`, not `NaN`/`null` — the panel's
  empty state (FR-010) treats this the same as every other zero-valued field, no special-casing
  needed in the UI beyond the existing empty-state branch.
- **`moodScore` "no data" is per-retrospective, not all-or-nothing**: a team can have some
  retrospectives with a `moodScore` and others with `null` in the same `moodEvolution` array (e.g. an
  older retrospective predating sentiment analysis, or one with too few analyzable cards) — each
  point is independent (FR-009, Edge Cases).
- **Ordering is fixed server-side**: `moodEvolution` is always returned pre-sorted ascending by
  `createdAt`; the frontend does not re-sort.
- **No pagination fields**: per research.md item 7 (full history, no bound), this shape has no
  cursor/`hasMore`/limit fields in this iteration. Adding one later (per that item's rationale) would
  be additive, not a breaking change to this shape.
