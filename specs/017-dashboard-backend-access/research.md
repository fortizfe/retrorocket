# Phase 0 Research: Dashboard Backend-Mediated Firebase Access

All items below were resolved through direct codebase inspection (no `NEEDS CLARIFICATION` markers remained after `/speckit-clarify`); this document records the resulting design decisions and their rationale.

## 1. API surface shape

**Decision**: Five new REST endpoints under a new `/api/boards` router, session-cookie authenticated, following the exact route/use-case/error-envelope conventions of `server/src/http/routes/mcp.ts` and `auth.ts`:

- `GET /api/boards` — list boards for the requesting user (created + joined)
- `POST /api/boards` — create a board from a template
- `POST /api/boards/:id/join` — join a board by ID
- `PATCH /api/boards/:id` — rename a board (title)
- `DELETE /api/boards/:id` — permanently delete a board

**Rationale**: Matches the resource-oriented style already used for `/api/mcp/connections`; a `boardsRouter` mounted the same way `authRouter`/`mcpRouter` are mounted in `app.ts` (guarded by an optional `boardsDeps`, 503 config-error fallback when absent) requires no change to the app's composition pattern.

**Alternatives considered**: A single `POST /api/boards/actions` RPC-style endpoint — rejected as inconsistent with the REST conventions already established by both prior backend features.

## 2. Authentication

**Decision**: Reuse `SessionServicePort.verify(cookie, now)` exactly as `requireSession()` does in `mcp.ts` (`server/src/http/routes/mcp.ts:45-49`); no new auth mechanism.

**Rationale**: Spec FR-010 explicitly requires reusing existing session auth; the `rr_session` httpOnly cookie is already sent by the browser (`credentials: 'include'`) on every request via existing frontend fetch clients.

## 3. Membership / "joined boards" source of truth

**Decision**: The new `BoardsPort.listBoardsForUser(uid)` derives "joined" boards from the `participants` collection (`where('userId', '==', uid)`), the same pattern `FirestoreRetrospectiveReadAdapter.listRetrospectivesForUser` already implements for the MCP connector (`server/src/adapters/firebase/FirestoreRetrospectiveReadAdapter.ts:44-65`). It does **not** read or write the frontend's `users.joinedBoards` array or the `userBoardHistory` collection.

**Rationale**:
- `joinedBoards`/`userBoardHistory` are pure duplicate bookkeeping on top of `participants` — every join already writes a `participants` document (`participantService.addParticipant`), which is the actual authorization-relevant record.
- A repo-wide search confirms `joinedBoards`/`userBoardHistory` are read/written **only** by `userService.ts` (the code this feature replaces) — no other screen depends on them, so this simplification carries zero regression risk for out-of-scope screens.
- The read-derivation pattern is already implemented, tested, and shipped in `015-mcp-read-server`; reusing the same approach (rather than replicating the frontend's chunked `where('__name__','in',...)` query over an array) is directly favored by constitution Principle V (Simplicity/YAGNI).
- This satisfies spec FR-009 (no data loss): every board a user has already joined has a corresponding `participants` doc today, so nothing becomes invisible under the new query.

**Alternatives considered**: Port the frontend's `joinedBoards`-array-based query as-is — rejected as needless duplication of already-solved logic and a less reliable source of truth (two collections can drift; `participants` cannot drift from itself).

## 4. Port boundary: new `BoardsPort`, not an extension of `RetrospectiveReadPort`

**Decision**: Define a new `application/ports/boards.ts` (`BoardsPort`) with list/create/join/rename/delete methods, implemented by a new `FirestoreBoardsAdapter`. Do **not** add write methods to the existing `RetrospectiveReadPort` used by the MCP connector.

**Rationale**: `RetrospectiveReadPort`'s own doc comment states it is "the compile-time enforcement of 'every MCP-exposed operation is read-only'" (`server/src/application/ports/mcp.ts:83-88`). Adding write methods there would silently weaken that guarantee for a completely unrelated feature. Constitution Principle IV (SOLID — Interface Segregation) supports keeping these as two separate ports.

## 5. Board creation — template/column definitions

**Decision**: Port the existing `BOARD_TEMPLATES` / `ACTION_COLUMN` definitions (`src/features/create-board/boardTemplates.ts`) into a small backend domain constant (e.g. `server/src/domain/boards/templates.ts`), duplicated rather than shared, since frontend and backend are separate deployable units with no shared package today (consistent with how backend already duplicates its own domain types instead of importing from `src/`).

**Rationale**: The backend `domain/` layer must not import frontend code (enforced by `test/architecture/domain-isolation.test.ts`'s spirit — no cross-boundary imports). The template data is small, stable (3 templates), and already changes rarely; duplication here is proportionate, not premature abstraction.

**Alternatives considered**: Extracting a shared `packages/shared` template package — rejected as disproportionate infrastructure work for three static template definitions, and out of scope for a single-screen migration.

## 5a. Board creation — write atomicity, and the creator as first participant

**Decision**: `FirestoreBoardsAdapter.createBoard` writes the `retrospectives` doc, its `columns` subcollection, **and** a `participants` record for the creator (with `participantCount: 1`, not `0`) in a single `firebase-admin` `WriteBatch`, rather than as separate operations.

**Rationale**:
- Today's frontend `createBoardFromTemplate` (`src/features/create-board/createBoardFromTemplate.ts`) performs an `addDoc` followed by a separate `Promise.all` of column writes — not atomic, so a crash between the two leaves an orphaned, column-less board. Spec User Story 2's Acceptance Scenario 3 explicitly requires "no partial/orphaned board is left behind" on a failed create. Since this logic is being rewritten server-side anyway, using a `WriteBatch` (trivial with `firebase-admin`) closes this pre-existing gap essentially for free, rather than porting it forward unchanged.
- Separately, `CreateBoardFlow.tsx` today performs a *third* write right after creation: it adds the creator to `participants` and increments `participantCount` to 1 (so the not-yet-migrated board detail screen's participant list/presence shows the creator immediately). Folding that into the same atomic batch — rather than a second round-trip from the frontend — preserves that existing behavior exactly while also closing the same partial-failure gap for it (spec FR-011: out-of-scope screens must keep working unchanged).

**Alternatives considered**: Port the two-step write as-is (matching today's exact code path) — rejected because the atomic version is no more complex to write and directly satisfies the acceptance scenario's letter instead of only its historical equivalent.

## 6. Delete semantics

**Decision**: `BoardsPort.deleteBoard(id, uid)` deletes only the top-level `retrospectives/{id}` document — matching `OptimizedRetrospectiveService.deleteRetrospectiveCompletely`'s **actual current behavior** exactly (`src/lib/services/OptimizedRetrospectiveService.ts:63-78`), which does not cascade-delete `cards`, `participants`, `groups`, etc. today.

**Rationale**: Spec FR-009/Assumptions require preserving existing behavior, not introducing new behavior. Cascade-deleting subcollections would be a functional change beyond this migration's scope (and beyond the Dashboard screen, since those subcollections belong to the not-yet-migrated board-detail experience). Fixing that pre-existing gap is explicitly out of scope (KISS/YAGNI) and can be proposed as its own follow-up if desired.

## 7. Rename/edit scope

**Decision**: `PATCH /api/boards/:id` accepts `{ title: string }`. Only `title` is wired from the frontend, matching `EditRetrospectiveModal.tsx`'s actual current UI (which only exposes a title field, despite the `Retrospective` entity also having a `description` field that isn't user-editable from this screen today).

**Rationale**: Matches real current behavior exactly (spec User Story 4 says "rename/edit... title and description" at the capability-description level; the concrete UI today only edits title). Adding a description field to the endpoint's request shape for forward-compatibility is free; wiring a UI control for it is not requested and is out of scope.

## 8. Authorization enforcement

**Decision**: Each use-case (`RenameBoard`, `DeleteBoard`) independently loads the board, compares `board.createdBy === uid`, and throws a `403 forbidden` `AppError` (new, alongside existing `AppError`/`NotFoundError`/`ConfigError` in `domain/errors.ts`) if not the owner — enforced in application code, not relied upon from any client-visible rule.

**Rationale**: Spec FR-005/FR-006/SC-005 require server-side rejection regardless of UI. This mirrors the ownership-check-in-use-case pattern already used implicitly by MCP's facilitator-notes-privacy logic (`domain/mcp/FacilitatorAccess.ts`).

## 9. Rate limiting

**Decision**: Apply a `boardsLimiter` (`express-rate-limit`, same shape as `mcp.ts`'s `tokenLimiter`/`toolLimiter`) to the `/api/boards` router.

**Rationale**: Consistent with the existing per-router rate-limiting convention in `auth.ts` and `mcp.ts`; blunts abuse (e.g. board-creation spam) within the same Vercel free-tier budget constraint `015` already operates under.

## 10. Frontend client shape

**Decision**: New `src/features/dashboard/services/backendBoardsClient.ts` exporting typed functions (`listBoards`, `createBoard`, `joinBoard`, `renameBoard`, `deleteBoard`), using `fetch(..., { credentials: 'include' })` and throwing on non-OK responses — the exact shape of `connectedAppsService.ts` and `backendAuthClient.ts`.

**Rationale**: Codebase-consistent; no new HTTP client library needed (Principle III — no new dependency).

## 11. Coexistence with not-yet-migrated Firebase client SDK usage

**Decision**: No change to `bootstrapSession()`'s Firebase custom-token sign-in (`src/features/auth/services/backendAuthClient.ts:60-66`); it continues to run so that other, not-yet-migrated screens keep working against Firestore directly.

**Rationale**: Spec FR-011 explicitly scopes this feature to the Dashboard only; removing the custom-token bootstrap would break every other screen, which is exactly the big-bang risk the prior reverted attempt (`ccf0aab`) ran into.
