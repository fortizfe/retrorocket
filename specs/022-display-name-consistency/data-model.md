# Data Model: Consistent Display Name Resolution Across the App

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

This feature adds one backend write-side capability (a fan-out on rename), extends one existing view-model type, and generalizes one existing frontend resolver function. No entity is removed or renamed, no Firestore schema field is removed, and no migration is required (research.md §1, §2).

## Participant (`participants/{id}`, extended semantics — no new fields)

| Field | Type | Change | Notes |
|---|---|---|---|
| `id`, `retrospectiveId`, `userId`, `photoURL?`, `joinedAt` | unchanged | unchanged | |
| `name` | `string` | **semantics extended** | Previously: captured once at join time, never refreshed on rejoin (020-era behavior). **Now**: also updated by the new profile-rename fan-out (see `ParticipantPort.renameParticipantsForUser` below) every time the matching user changes their display name, for as long as their account exists. Once the account stops receiving renames (deleted, or simply never renamed again), `name` naturally freezes at its last fan-out value — this *is* the "last-known name" fallback required by FR-003, with no separate deleted-account check needed (research.md §2). |

**Validation rules** (unchanged): `name` is always server-derived (from the session at join time, or from the new profile-fan-out at rename time); never accepted as arbitrary client input.

## ProfilePort (extended) / new ParticipantPort method

`server/src/application/ports/profile.ts` gains no new methods (research.md §5) — `updateDisplayName`'s use case gains a second dependency instead. `server/src/application/ports/retrospective.ts`'s `ParticipantPort` gains one new method:

```ts
export interface ParticipantPort {
    listParticipants(retrospectiveId: string): Promise<ParticipantDTO[]>;
    join(retrospectiveId: string, uid: string, userName: string, photoURL: string | null): Promise<ParticipantDTO>;
    /** NEW: fan-out for a display-name change — updates `name` on every participants
     * doc where userId === uid, across every retrospective the user has ever joined.
     * Idempotent, no-op if the user has never joined anything. Chunks writes in
     * batches of ≤500 (Firestore batch-write limit). */
    renameParticipantsForUser(uid: string, name: string): Promise<void>;
}
```

Implemented by `FirestoreRetrospectiveBoardAdapter` (same adapter that already implements `join`): query `participants` where `userId == uid`, batch-update `.name` for every match.

`UpdateDisplayNameParams`/the `updateDisplayName` use case (`server/src/application/use-cases/profile/UpdateDisplayName.ts`) gains a second dependency:

```ts
export async function updateDisplayName(
    deps: { profilePort: ProfilePort; participantPort: ParticipantPort },
    params: UpdateDisplayNameParams,
): Promise<ProfileRecord> {
    const displayName = params.displayName.trim();
    if (!displayName) throw new AppError('invalid_request', 'displayName is required', 400);
    const profile = await deps.profilePort.updateDisplayName(params.uid, displayName);
    await deps.participantPort.renameParticipantsForUser(params.uid, displayName);
    return profile;
}
```

The fan-out is awaited synchronously within the same `PATCH /api/profile` request (no new background-job infrastructure; matches research.md §1's "existing Firestore-to-WebSocket relay does the rest" design) — the wire response shape of `PATCH /api/profile` is unchanged.

## Card / Like / Reaction (unchanged shape, resolution priority changes)

No field changes. `Card.createdByName?`, `Like.username`, `Reaction.username` (all already existing, server-captured — research.md §6) remain exactly as-is and keep their existing meaning: the name captured at the moment of that action. What changes is which value the UI prefers when displaying them (see `resolveDisplayName` below).

## GroupedReaction (extended — one new field)

| Field | Type | Change | Notes |
|---|---|---|---|
| `emoji`, `count` | unchanged | unchanged | |
| `users` | `string[]` | **semantics extended** | Previously: raw captured `reaction.username` values. **Now**: resolved current display names (via `resolveDisplayName`), for tooltip rendering — `EmojiReactions.tsx`'s tooltip-building code is unchanged (still consumes `string[]`). |
| `userIds` | `string[]` | **NEW** | The raw `reaction.userId` values, parallel-indexed with `users`. Enables correct "is this my reaction" membership checks (`userIds.includes(currentUserId)`), fixing a pre-existing latent bug where `EmojiReactions.tsx` compared a uid against the (username-only) `users` array (research.md §7.3). |

## `resolveDisplayName` (generalized from `resolveAuthorDisplayName`, `src/lib/utils/cardHelpers.ts`)

```ts
/**
 * Resolves any user-attributed identifier to a display name, applying the same
 * order everywhere (FR-005): the board's own (fan-out-kept-current) participant
 * record first, then the name captured at the time of the action, then a generic
 * fallback. Never returns the raw uid.
 */
export const resolveDisplayName = (
    userId: string,
    capturedName: string | undefined,
    participants: Participant[] | undefined,
    fallbackLabel: string
): string => {
    const participant = participants?.find(p => p.userId === userId);
    if (participant?.name) return participant.name;
    if (capturedName) return capturedName;
    return fallbackLabel;
};
```

**Resolution order** (FR-001, FR-001a, FR-003, FR-004 — flips 020's original order, research.md §2):
1. Live match in the board's `participants` array by `userId` → `participant.name` (kept current by the rename fan-out while the account exists; frozen at its last value once it doesn't).
2. Else, the name captured at the time of the action (`createdByName` / `username`) — reached only when no participant record exists at all (pre-`020` legacy data, per the boundary condition in research.md §2).
3. Else, `fallbackLabel` (existing i18n key `retrospective.grouping.unknownAuthor`, reused as-is — research.md keeps this generic key rather than introducing per-surface copies).

**Call sites** (all pass the same shared function — FR-005's "no two surfaces disagree"):

| Site | File | Was |
|---|---|---|
| Card author label | `DraggableCard.tsx` | already called `resolveAuthorDisplayName(card, participants, fallback)` |
| Group-by-user header | `GroupedCardList.tsx`, `useColumnGrouping.ts` | already called `resolveAuthorDisplayName(...)` |
| Like tooltip | `LikeButton.tsx` | rendered `like.username` directly — **new** |
| Reaction tooltip | `EmojiReactions.tsx` (via `groupReactions`) | rendered `reaction.username` directly — **new** |
| TXT export author line | `txtExportService.ts` | rendered `card.createdBy` (raw uid) — **new** |
| PDF export author line | `pdfExportService.ts` | rendered `card.createdBy` (raw uid) — **new** |
| DOCX export author line | `docxExportService.ts` | rendered `card.createdBy` (raw uid) — **new** |

`ParticipantList.tsx` / `ResponsiveParticipantDisplay.tsx` / `CompactAvatarGroup.tsx` need **no changes** — they already render `participant.name` directly, which becomes always-current as a side effect of the backend fan-out (research.md §2).

## Relationships

```
User Account (users/{uid})
  │ rename (PATCH /api/profile)
  ▼ fan-out (NEW: ParticipantPort.renameParticipantsForUser)
Participant (participants/{id}, one per retrospective the user joined)
  │ existing Firestore-to-WebSocket relay (019/021, unchanged)
  ▼
Every connected client on that retrospective's board (existing 'participant'/'updated' event, unchanged)

Card.createdBy / Like.userId / Reaction.userId
  ──── matches ────> Participant.userId  (resolution: current name if matched, else the entity's own captured name, else generic fallback)
```

No new relationships are introduced; every edge in this diagram already existed structurally in `019`/`020`/`021` — this feature changes what flows over the `users → participants` edge (previously: name at join time only; now: also every subsequent rename) and which of the two existing name sources (`participants.name` vs. the entity's own captured name) resolution prefers.
