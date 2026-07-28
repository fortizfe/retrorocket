# Phase 1 Data Model: Dashboard Backend-Mediated Firebase Access

Firestore remains the system of record; nothing here changes storage schema. This document describes the read-only Firestore data shapes the new backend adapter consumes/produces, and the DTOs it exposes through `BoardsPort` to the application layer (mirroring the level of detail in `015-mcp-read-server`'s `data-model.md`).

## Firestore collections touched (existing, unchanged schema)

### `retrospectives/{id}`

| Field | Type | Notes |
|---|---|---|
| `title` | string | required |
| `description` | string | present since creation (`''` default), not currently editable from the Dashboard |
| `templateId` | string | one of `default` \| `madSadGlad` \| `startStopContinue` |
| `createdBy` | string (uid) | owner |
| `createdByName` | string | display name at creation time |
| `locale` | `'es' \| 'en'` | |
| `createdAt` | Timestamp | server-set |
| `updatedAt` | Timestamp | server-set, bumped on rename/participant-count change |
| `participantCount` | number | incremented on join |
| `isActive` | boolean | must be `true` to allow joining |

Subcollection `retrospectives/{id}/columns/{columnId}`: `{ i18nKey, type: 'regular' | 'action', order, defaultColor, createdAt }` — written once at creation from the chosen template; not modified by this feature.

### `participants/{id}`

| Field | Type | Notes |
|---|---|---|
| `retrospectiveId` | string | |
| `userId` | string (uid) | |
| `name` | string | |
| `joinedAt` | Timestamp | |
| `isActive` | boolean | |
| `photoURL` | string \| null | optional |

Used both to record a join and, per research.md §3, as the sole source of truth for which boards a user has "joined" (queried by `userId`).

## Application-layer DTOs (`server/src/application/ports/boards.ts`)

```ts
export interface BoardSummary {
  id: string;
  title: string;
  description: string;
  templateId?: string; // absent for boards created before templateId was introduced
  createdAt: Date;
  updatedAt: Date;
  participantCount: number;
  isActive: boolean;
  createdBy: string;
  isCreator: boolean; // true if createdBy === requesting uid
}

export interface CreateBoardInput {
  templateId: 'default' | 'madSadGlad' | 'startStopContinue';
  title: string;
  createdBy: string; // uid
  createdByName: string;
  locale: 'es' | 'en';
}

export interface BoardsPort {
  listBoardsForUser(uid: string): Promise<BoardSummary[]>;
  createBoard(input: CreateBoardInput): Promise<{ boardId: string }>; // writes the retrospective doc + its columns subcollection atomically (single WriteBatch)
  getBoard(id: string): Promise<BoardSummary | null>;
  joinBoard(id: string, uid: string, userName: string): Promise<BoardSummary>;
  renameBoard(id: string, uid: string, title: string): Promise<void>; // throws ForbiddenError if uid !== createdBy
  deleteBoard(id: string, uid: string): Promise<void>;                // throws ForbiddenError if uid !== createdBy
}
```

`ForbiddenError` is a new `AppError` subclass (`domain/errors.ts`, `code: 'forbidden'`, `httpStatus: 403`), alongside the existing `NotFoundError`/`ConfigError`, per research.md §8.

## Validation rules (enforced in use-cases, not just at the HTTP boundary)

- `title`: required, non-empty after trim (matches `CreateBoardFlow`'s and `EditRetrospectiveModal`'s existing client-side check — now also enforced server-side per constitution's "client + server validation" standard).
- `templateId`: must be one of the three known template IDs; unknown IDs rejected with `400 invalid_request` (matches `createBoardFromTemplate`'s existing `Invalid template ID` check, ported server-side).
- `joinBoard`: target board must exist and `isActive === true`, else `404 not_found` (matches `joinRetrospectiveById`'s existing "no existe o no está disponible" / "ya no está activo" checks). If the uid already has a `participants` doc for that board (or is the owner), the call is idempotent — returns the board without creating a duplicate.
- `renameBoard` / `deleteBoard`: requesting uid must equal `board.createdBy`, else `403 forbidden`.

## State transitions

No new lifecycle states. `isActive` continues to gate joinability exactly as today; this feature does not add or remove any board lifecycle state.

## Relationships

```
User (uid, from session) 1---* Retrospective (as owner, via createdBy)
User (uid, from session) 1---* Participant  *---1 Retrospective (as joined member)
Retrospective 1---* Column (subcollection, written once at creation)
```
