# Phase 1 Data Model: Fix Typing Indicator Ghost State on Column Switch

No new entities, fields, or state transitions are introduced by this feature. It corrects the *ordering* of writes to an existing entity's already-defined lifecycle; the entity and its lifecycle are documented here for traceability only, unchanged from feature 026.

## Typing Indicator

Represents one participant's live "is typing" status in one specific column of a retrospective board.

- **Identity**: composite of `retrospectiveId`, `userId`, `column` — realized as the Firestore doc id `{retrospectiveId}_{userId}_{column}` (`FirestoreTypingStatusAdapter.typingStatusDocId`, unchanged).
- **Fields**: `userId`, `username`, `retrospectiveId`, `column`, `timestamp` (server-assigned, used both for display recency and the disconnect-safety TTL sweep).
- **Lifecycle** (unchanged):
  - Created/refreshed: client calls with `isActive:true` → doc is `.set()` with a fresh `timestamp`.
  - Cleared: client calls with `isActive:false` → doc is `.delete()`.
  - Safety-net cleared: server sweep deletes any doc whose `timestamp` is older than the TTL (~3s), independent of client signals.
- **Constraint this feature enforces** (behavioral, not schema): for a single identity (`retrospectiveId`+`userId`+`column`), the sequence of create/delete operations observed by the server MUST match the sequence the client issued them in — this is the property that was previously unguaranteed and is the entire scope of this fix. No new field or index is needed to enforce it; it is enforced by serializing the *client's* outbound writes per identity before they are sent (see research.md §2).

No relationships to other entities change. No new entity is introduced.
