# Contract: Boards API (`/api/boards/*`)

All routes are mounted on the existing backend, same-origin under `/api/boards/*`, authenticated via the existing httpOnly session cookie (no request body auth field — same pattern as `/api/auth/*` and `/api/mcp/*`). All responses use the existing `{ error: { code, message }, correlationId }` envelope on failure (`server/src/http/middleware/errorHandler.ts`).

## `POST /api/boards`

Create a board from a template (replaces `createBoardFromTemplate.ts`).

Request:
```json
{ "templateId": "default" | "mad-sad-glad" | "start-stop-continue", "title": "Sprint 42 Retro", "description": "optional" }
```
- `createdBy`, `createdByName`, `locale` are derived server-side from the session — never client-supplied.

Response `201`:
```json
{ "id": "abc123", "title": "Sprint 42 Retro", "templateId": "default", "createdAt": "...", "columns": [ { "id": "helped", "i18nKey": "columns.helped", "type": "regular", "order": 0 }, "..." ] }
```
Always includes the automatic action-items column (User Story 4, Acceptance Scenario 1).

## `GET /api/boards`

List the current user's boards — owned + joined (replaces `userService.getUserBoards`, the single canonical implementation per research.md §3).

Response `200`:
```json
{ "boards": [ { "id": "abc123", "title": "...", "isCreator": true, "createdAt": "...", "updatedAt": "..." } ] }
```
Empty `boards: []` for a new user — never an error (User Story 4, Acceptance Scenario 2).

## `GET /api/boards/:id`

Fetch one board's metadata + columns (one-time; live updates come from the events stream, see `realtime-events.md`).

Response `200`: same shape as the `POST /api/boards` response. `404 not_found` if the board doesn't exist or the requester is neither its creator nor a participant.

## `PATCH /api/boards/:id`

Rename/edit a board (replaces `EditRetrospectiveModal`'s direct `updateRetrospective` call).

Request: `{ "title"?: "...", "description"?: "..." }`. Only the board's creator may call this — `403 forbidden` otherwise.

Response `200`: updated board shape (same as `GET`).

## `DELETE /api/boards/:id`

Full cascade delete (research.md §3) — only the board's creator may call this (`403 forbidden` otherwise). Removes the board doc, its `columns` subcollection, and every card/group/participant/countdown/facilitator-note/action-item/sentiment-result/typing-status document referencing it.

Response `204`.

## `POST /api/boards/:id/join`

Consolidates the current 4-step client flow (`joinRetrospectiveById` → `addParticipant` → `incrementParticipantCount` → `userService.addBoardToUserHistory`/`addJoinedBoard`) into one backend-transactional operation (User Story 4, Acceptance Scenario 3).

Request: `{}` (board id from the path, user from the session).

Behavior:
- If the board doesn't exist or `isActive == false`: `404 not_found`.
- If the requester already has a participant record for this board: no-op (idempotent), still returns `200` with `isNew: false`.
- Otherwise: creates the `participants` doc, increments `participantCount`, records `userBoardHistory`, adds the board id to the user's `joinedBoards` — all server-side, replacing the current multi-round-trip client orchestration.

Response `200`: `{ "board": { ...same shape as GET }, "isNew": true }`.
