# Contracts: Fix Configured Display Name Not Used on New Boards

No contract changes. This fix does not add, remove, or modify any external interface:

- `POST /api/retrospectives/:id/join`, `POST /api/retrospectives/:id/cards`, `POST /api/retrospectives/:id/cards/:cardId/like`, `POST /api/retrospectives/:id/cards/:cardId/reaction`, `POST /api/retrospectives/:id/typing`, `POST /api/boards`, `POST /api/boards/:id/join` — unchanged request/response shapes for all seven endpoints.
- The WebSocket `entity_change` events for `participants`, `cards`, likes/reactions, and `typingStatus` — unchanged payload shapes.
- `ParticipantPort` / `CardPort` / `TypingStatusPort` / `BoardsPort` — unchanged method signatures and doc shapes.
- `GET /api/profile` / `PATCH /api/profile` / `ProfilePort` — unchanged; this fix only adds two new *callers* of the already-existing `ensureUserProfile` use case (from `boards.ts` and `retrospectives.ts`), which itself is untouched.

The fix is entirely internal to how each affected route handler derives the string it was already passing into these unchanged write methods — see `research.md` §1–3 for the confirmation that no consumer of any of the above contracts is affected, and `data-model.md` for confirmation that no Firestore document shape changes.

The one interface that *does* change is internal composition, not an external contract: `RetrospectiveRouterDeps` and `BoardsRouterDeps` (TypeScript interfaces defined in `server/src/http/routes/retrospectives.ts` and `boards.ts`, consumed only by their own wiring files and test-app builders) each gain one new required field, `profilePort: ProfilePort`, mirroring the field `ProfileRouterDeps` already declares.
