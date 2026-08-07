# Contracts: Fix Typing Indicator Ghost State on Column Switch

No contract changes. This feature does not add, remove, or modify any external interface:

- `POST /api/retrospectives/:id/typing` (REST write endpoint) — unchanged request/response shape.
- The WebSocket `typingStatus` `entity_change` event (`created`/`updated`/`deleted`, `TypingStatusDTO` payload) — unchanged.
- `TypingStatusPort` / `FirestoreTypingStatusAdapter` — unchanged doc shape and doc id pattern.

The fix is entirely internal to the client's write-forwarding layer (`OptimizedTypingStatusService`), which sits *behind* the `POST /api/retrospectives/:id/typing` contract, not as part of it — see research.md §2 and §5 for the confirmation that no consumer of these contracts is affected.
