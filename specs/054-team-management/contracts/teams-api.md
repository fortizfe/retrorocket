# API Contract: Teams

Session-cookie-authenticated REST endpoints under `/api/teams`, following the exact conventions of
`server/src/http/routes/boards.ts` (see research.md item 1): every request requires a valid session
cookie (`requireSession`, 401 `unauthenticated` if absent/expired); every error response uses the
existing envelope from `server/src/http/middleware/errorHandler.ts`:

```json
{ "error": { "code": "string", "message": "string" }, "correlationId": "string" }
```

Dates are serialized as ISO-8601 strings, mirroring `BoardSummaryDTO`.

---

## `POST /api/teams`

Create a team. Caller becomes its owner (FR-001, FR-002).

**Request body**:

```json
{ "name": "string (required, non-empty)", "description": "string (optional)" }
```

**Responses**:
- `201 Created` — `{ "teamId": "string" }`
- `400 validation_error` — `name` missing or empty (User Story 1 AC3).
- `401 unauthenticated`

---

## `GET /api/teams`

List every team the caller currently belongs to (FR-010).

**Response** `200 OK`:

```json
{
  "teams": [
    {
      "id": "string",
      "name": "string",
      "description": "string | null",
      "ownerId": "string",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601",
      "memberCount": 0,
      "myRole": "owner | member"
    }
  ]
}
```

Empty array (not an error) when the caller belongs to no teams (User Story 3 AC3).

---

## `GET /api/teams/:id`

Team detail + full member roster (FR-009). Caller must be a current member (any role).

**Response** `200 OK`:

```json
{
  "id": "string",
  "name": "string",
  "description": "string | null",
  "ownerId": "string",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "members": [
    {
      "userId": "string",
      "displayName": "string",
      "email": "string",
      "photoURL": "string | null",
      "role": "owner | member",
      "joinedAt": "ISO-8601"
    }
  ]
}
```

**Errors**:
- `404 not_found` — team does not exist.
- `403 forbidden` — caller is not a member of this team.

---

## `POST /api/teams/:id/members`

Owner looks up an existing RetroRocket user by exact email and adds them (FR-003, FR-004). Owner-only.

**Request body**:

```json
{ "email": "string (required, exact match, case/whitespace-insensitive per research.md item 2)" }
```

**Responses**:
- `201 Created` — the new `TeamMemberView` entry (same shape as one item of `GET /api/teams/:id`'s
  `members` array).
- `403 forbidden` — caller is not this team's owner (FR-008).
- `404 not_found` — team does not exist, **or** no RetroRocket account matches that email (FR-003:
  "system indicates no matching user was found" — surfaced as a single `user_not_found` code so the
  client can't distinguish "team missing" from "user missing" by status code alone; the message text
  differentiates them for the UI).
- `409 conflict` — the user is already a member (FR-007, User Story 2 AC4).

---

## `DELETE /api/teams/:id/members/:userId`

Removes a member. Three cases, all handled by this one endpoint:

1. **Owner removes another member** (`userId` ≠ caller, caller is owner) — FR-005.
2. **A non-owner member removes themself** (`userId` == caller, caller is not owner) — FR-012.
3. **The owner removes themself** (`userId` == caller, caller is owner) — triggers the FR-013/FR-014
   ownership-transfer-or-empty logic from data-model.md.

Anything else (a non-owner trying to remove someone other than themself) is `403 forbidden` (FR-008,
User Story 2 AC5).

**Response**:
- `204 No Content` on success (case 1 or 2), or on case 3 when another member remains (ownership
  silently transferred server-side per FR-013 — the client re-fetches `GET /api/teams/:id` to see the
  new owner).
- `200 OK` with `{ "teamEmptied": true }` on case 3 when the owner was the sole remaining member
  (FR-014) — distinguishes this terminal state from the ordinary `204` so the client can navigate the
  caller away from a now-inert team instead of re-fetching it.
- `403 forbidden`, `404 not_found` (team or membership doesn't exist).
