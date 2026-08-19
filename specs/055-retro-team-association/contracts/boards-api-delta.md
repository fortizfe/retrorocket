# API Contract Delta: Boards API — Team Association

This feature does not introduce any new endpoint. It's a delta over the existing
`specs/017-dashboard-backend-access/contracts/boards-api.yaml` (`/api/boards`), authorized the same
way (session-cookie, `requireSession`, same `ApiError` envelope). Only the two changed
operations are documented here; everything else in that contract (`/boards/{id}/join`,
`PATCH`/`DELETE /boards/{id}`) is unchanged by this feature and not repeated.

`GET /api/teams` (used by the frontend to populate both the creation-flow team picker and the
dashboard's team filter) is **also unchanged** — see `specs/054-team-management/contracts/teams-api.md`.

---

## `POST /api/boards` (changed)

Create a new board from a template — now optionally associated with one of the caller's teams
(FR-001, FR-002, FR-003, FR-004).

**Request body** — one new optional field:

```json
{
  "templateId": "string (required)",
  "title": "string (required, non-empty)",
  "locale": "es | en",
  "isAnonymous": "boolean (optional, default false)",
  "teamId": "string | null (optional, default null)"
}
```

**Responses**:
- `201 Created` — `{ "boardId": "string" }` (unchanged shape).
- `400 validation_error` — invalid `templateId` or empty `title` (unchanged).
- `401 unauthenticated` (unchanged).
- **`403 forbidden` (new)** — `teamId` was provided but the requesting user is not currently a
  member of that team (FR-004, User Story 1 AC4). The board is **not** created — this is a hard
  rejection, not a silent fallback to no-team.

---

## `GET /api/boards` (changed)

List boards created or joined by the requesting user — each `BoardSummary` now carries its team
association, if any (FR-011).

**Response** `200 OK` — `BoardSummary` gains two fields:

```json
{
  "boards": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "templateId": "string (optional)",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601",
      "participantCount": 0,
      "isActive": true,
      "createdBy": "string",
      "isCreator": true,
      "teamId": "string | null",
      "teamName": "string | null"
    }
  ]
}
```

- `teamId`: the raw team reference, or `null` when the board has no team association (existing
  boards created before this feature was shipped are always `null`, per FR-006).
- `teamName`: the associated team's current display name, resolved server-side at read time
  regardless of whether the *requesting* user is a member of that team (research.md item 1) —
  `null` whenever `teamId` is `null`.

No other response field changes. `401 unauthenticated` unchanged.

---

## Unchanged, for clarity

- `POST /api/boards/{id}/join`, `PATCH /api/boards/{id}`, `DELETE /api/boards/{id}`: no request or
  response change. In particular, join behavior is untouched — `teamId` plays no role in whether a
  join succeeds (FR-005).
- Any `BoardSummary` returned from these three endpoints includes `teamId` (mirroring the stored
  field) but `teamName` is always `null` there — team-name resolution is deliberately scoped to the
  `listBoardsForUser` path only (data-model.md, research.md item 4): the dashboard is the only
  surface allowed to display a team's identity.
