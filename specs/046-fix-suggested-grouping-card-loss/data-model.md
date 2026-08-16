# Phase 1 Data Model: Fix Suggested Grouping Card Loss

No new entities are introduced. This feature corrects how two existing entities' relationship is derived, persisted, and repaired.

## Card Group (`CardGroupDTO` / Firestore `groups` collection)

Already defined (spec 044 / feature 019). Fields relevant to this fix:

| Field | Type | Change in this feature |
|---|---|---|
| `column` | `string` | **Invariant strengthened**: MUST always equal the `column` of the group's `headCardId` card. Previously settable to an arbitrary (often empty) client-supplied value at creation time; now server-derived, never client-supplied, and self-corrected on read if found to be wrong (FR-003, FR-009). |
| `headCardId` | `string` | Unchanged. Now also used as the *source of truth* for `column`, not just group identity. |
| `memberCardIds` | `string[]` | Unchanged. |

**New invariant**: `group.column === cards.find(c => c.id === group.headCardId).column`, for every group, at all times a client can observe it. This is enforced two ways:
1. **At creation** (going forward): `CardGrouping.createCardGroup` derives `column` from the head card before persisting — the invariant can never be violated by a new write.
2. **At read** (for pre-existing data): `GetBoardState` reconciles and repairs any group whose persisted `column` doesn't match its head card's actual `column` before returning the board state (FR-009). This is idempotent — once repaired, the invariant holds for all future reads without repeating the reconciliation write.

## Card (`CardDTO` / Firestore `cards` collection)

No schema change. `card.column` becomes the sole authoritative source for the `column` of any group the card heads — already an existing field, now given a new consumer (`createCardGroup`, `GetBoardState`'s reconciliation pass).

## Relationship: Grouping Suggestion → Card Group

Unchanged as a concept (spec 044): accepting a `GroupSuggestion` calls the same `createGroup`/`createCardGroup` path as any other group-creation entry point. This fix does not add a distinct code path for suggestion-originated groups — it corrects the shared `createCardGroup` path that all group-creation flows (manual and suggestion-accepted) already go through, which is why manually created groups were never affected by this bug (they may have been supplying `column` correctly already, or happened not to exercise the same gap) while suggestion-accepted groups always were.

## New port method

`CardGroupPort.repairGroupColumn(groupId: string, column: string): Promise<void>` — a narrow, single-field Firestore update (`groups/{groupId}.column`), used only by `GetBoardState`'s reconciliation pass. Not exposed over HTTP; it is not a new user-facing capability, only an internal self-heal primitive.
