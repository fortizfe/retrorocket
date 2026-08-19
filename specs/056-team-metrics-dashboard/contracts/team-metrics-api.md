# API Contract: Team Metrics

Session-cookie-authenticated REST endpoint added to `/api/teams`, following the exact conventions of
`server/src/http/routes/teams.ts` (contracts/teams-api.md, 054): every request requires a valid
session cookie (`requireSession`, `401 unauthenticated` if absent/expired); every error response uses
the existing envelope from `server/src/http/middleware/errorHandler.ts`:

```json
{ "error": { "code": "string", "message": "string" }, "correlationId": "string" }
```

Dates are serialized as ISO-8601 strings, mirroring every other `*DTO` in this codebase.

---

## `GET /api/teams/:id/metrics`

Aggregated, read-only retrospective metrics for one team, computed across its full history
(data-model.md's `TeamMetricsSummary`). Caller must be a current member of the team (owner or
member) — same requirement as `GET /api/teams/:id` (FR-002/FR-003).

**Response** `200 OK`:

```json
{
  "teamId": "string",
  "retrospectiveCount": 0,
  "averageParticipants": 0,
  "actionItemsCreated": 0,
  "moodEvolution": [
    {
      "retrospectiveId": "string",
      "retrospectiveTitle": "string",
      "createdAt": "ISO-8601",
      "moodScore": 7.4
    },
    {
      "retrospectiveId": "string",
      "retrospectiveTitle": "string",
      "createdAt": "ISO-8601",
      "moodScore": null
    }
  ]
}
```

`moodEvolution` is always sorted ascending by `createdAt` (oldest first). `moodScore` is `null` for a
retrospective with no confident sentiment results (FR-009) — the client must render this as an
explicit "no data" state, not as a zero score. All numeric totals are `0` and `moodEvolution` is `[]`
for a team with no associated retrospectives (FR-010) — this is a normal `200 OK`, not an error.

**Errors**:
- `401 unauthenticated` — no valid session.
- `403 forbidden` — caller is not currently an owner or member of this team (FR-003). This covers
  **both** "the team doesn't exist" and "the team exists but the caller isn't a member" — the
  underlying check (`TeamsPort.getMembership`) can't and doesn't need to distinguish them, so this
  endpoint deliberately doesn't leak whether a given team id exists to a non-member (a stricter
  posture than `GET /api/teams/:id`'s separate `404`, which is fine here since nothing about a
  metrics panel needs to reveal team existence). Re-evaluated on every request; a caller whose
  membership ended after they last loaded the panel gets this on their *next* request, not via any
  live push while an already-open view stays rendered (Clarifications, 2026-08-19 — see research.md
  item 2).

**Explicitly out of scope for this endpoint** (spec Assumptions / Clarifications):
- No query parameters for date range, pagination, or a "last N" bound — always full history
  (research.md item 7).
- No action-item completion/status breakdown — `actionItemsCreated` is a created-only total; no
  `actionItemsCompleted` field exists (spec Clarifications, 2026-08-19).
- No write operations — this endpoint is `GET`-only and changes nothing (FR-012).
