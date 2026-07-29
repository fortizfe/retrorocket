# Data Model: Show Display Names Instead of User IDs on Retro Board Cards

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

This is a narrow, additive change to one existing entity plus one new internal view model used only during rendering. No entity is removed, renamed, or has a breaking type change; no state machine or lifecycle changes.

## Card (extended)

Represents a single retrospective contribution. Extends the existing entity (`retro-rocket/src/features/boards/types/card.ts`, mirrored server-side by `CardDTO` in `server/src/application/ports/cards.ts` and the Firestore document mapped by `FirestoreCardAdapter`).

| Field | Type | Change | Notes |
|---|---|---|---|
| `id` | `string` | unchanged | |
| `content` | `string` | unchanged | |
| `column` | `string` | unchanged | |
| `createdBy` | `string` | unchanged | Firebase uid of the author. Remains the grouping key for uniqueness (FR-003) and the identity used to match against `Participant.userId`. **Must never be rendered directly to the user** (this is the defect being fixed). |
| `createdByName` | `string \| undefined` | **NEW** | The author's display name, captured once at card-creation time (server-derived, never client-supplied). Present on all cards created after this fix ships; absent on cards created before it ("legacy cards"). Immutable after creation — if the author later changes their display name, previously created cards keep the name captured at creation time (same behavior as the existing `boards.createdByName` precedent). |
| `createdAt`, `updatedAt`, `retrospectiveId`, `color?`, `votes?`, `likes?`, `reactions?`, `order?`, `groupId?`, `isGroupHead?`, `groupOrder?` | unchanged | unchanged | Not affected by this feature. |

**Validation rules**:
- `createdByName`, when present, is a non-empty string (server derives it from `displayNameOf(session.user)`, which already guarantees a non-empty fallback of `'Anonymous'`).
- `createdByName` is never accepted as client input on card creation; it is always derived server-side from the authenticated session, matching the trust model already used for `createdBy`.
- Consumers (UI) MUST NOT render `createdBy` as a user-facing label under any circumstance — it is an internal identifier only.

## CreateCardInput / CreateCardParams (backend-internal, extended)

Internal types used across `application/ports/cards.ts` (`CreateCardInput`) and `application/use-cases/retrospective/CardLifecycle.ts` (`CreateCardParams`) for the create-card write path. **Not** the public HTTP request body — the client does not send a name.

| Field | Type | Change |
|---|---|---|
| `createdBy` | `string` | unchanged |
| `createdByName` | `string` | **NEW** — populated by the route handler from `displayNameOf(session.user)` before invoking the use case |
| `content`, `column`, `retrospectiveId`, `color?`, `groupId?` | unchanged | unchanged |

## Participant (unchanged)

`retro-rocket/src/features/boards/types/participant.ts` — used only as a **fallback resolver** for legacy cards that lack `createdByName`.

| Field | Type | Role in this feature |
|---|---|---|
| `userId` | `string` | Matched against a legacy card's `createdBy` to resolve a live display name. |
| `name` | `string` | The resolved fallback name when a match is found. |
| `id`, `retrospectiveId`, `joinedAt`, `photoURL?` | unchanged | Not used by this feature. |

## ResolvedAuthorGroup (new internal view model, rendering-only)

Not persisted — computed by `useColumnGrouping.ts`'s `groupCards` when `criteria === 'user'`, to carry both the uniqueness key and the label/sort value through to `GroupedCardList.tsx`.

| Field | Type | Purpose |
|---|---|---|
| `authorId` | `string` | The raw `card.createdBy` uid — used as the grouping key so two participants sharing a display name are never merged (FR-003). |
| `displayLabel` | `string` | The name to render as the group header and to sort groups by (A→Z). Resolution order: `card.createdByName` → live `participants` lookup by `userId === authorId` → localized generic fallback label. |
| `cards` | `Card[]` | The cards belonging to this author, unchanged from current grouping behavior. |

**Resolution algorithm** (display name for a given card, used identically for both the per-card `CardHeader` label and the group `displayLabel`):
1. If `card.createdByName` is present and non-empty → use it.
2. Else, look up `participants.find(p => p.userId === card.createdBy)?.name` → if found, use it.
3. Else → use the localized generic fallback label (i18next key, not hardcoded).

This same three-step resolution is shared by both render sites (`DraggableCard.tsx` → `CardHeader.tsx`, and `useColumnGrouping.ts` → `GroupedCardList.tsx`) to keep the two Functional Requirements (FR-001, FR-002) behaviorally consistent, per the spec's Assumptions.

## Relationships

```
Retrospective (1) ──< Participant (many)   [userId ↔ Firebase uid]
Retrospective (1) ──< Card (many)          [createdBy: Firebase uid, createdByName: captured at creation]
Card.createdBy ──── matches ────> Participant.userId   (fallback resolution only, for legacy cards)
```

No new relationships are introduced; `Card.createdBy` already implicitly relates to `Participant.userId` today (it's simply never resolved to a name in the two buggy render sites).
