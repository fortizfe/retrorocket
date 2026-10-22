import { FieldValue, type DocumentReference, type Firestore, type Transaction } from 'firebase-admin/firestore';
import type { CardGroupDTO, CardGroupPort, ColumnOrderItem, CreateCardGroupInput, GroupOrigin, MoveCardResult, MoveTarget } from '../../application/ports/cards';
import { AppError, ConflictError, NotFoundError } from '../../domain/errors';

const GROUPS = 'groups';
const CARDS = 'cards';

function toDate(value: unknown): Date {
    if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    return value instanceof Date ? value : new Date(value as string);
}

export function toCardGroup(id: string, data: FirebaseFirestore.DocumentData): CardGroupDTO {
    return {
        id,
        retrospectiveId: data.retrospectiveId,
        column: data.column,
        headCardId: data.headCardId,
        memberCardIds: data.memberCardIds ?? [],
        title: data.title,
        isCollapsed: data.isCollapsed ?? false,
        createdAt: toDate(data.createdAt),
        createdBy: data.createdBy,
        order: data.order ?? 0,
        origin: data.origin,
    };
}

/** Grouping invariant violation (spec 059): surfaces as `409 group_conflict`. */
function groupConflict(message: string): ConflictError {
    return new ConflictError(message, 'group_conflict');
}

/** I1: the card must claim this group and the group must list the card. */
function requireListed(groupId: string, group: FirebaseFirestore.DocumentData, cardId: string, card: FirebaseFirestore.DocumentData): void {
    const listed = group.headCardId === cardId || ((group.memberCardIds ?? []) as string[]).includes(cardId);
    if (card.groupId !== groupId || !listed) throw groupConflict('Card is not a member of the group');
}

/**
 * Write-only half of a card leaving its group (spec 059 data-model I1-I5), shared by
 * removeCardFromGroup and moveCard. Promotes a new head when the head leaves, reindexes
 * `groupOrder`, and dissolves the group when fewer than 2 cards remain (I5) — the survivor then
 * takes the group's `order` so it keeps the slot. It does NOT touch the leaving card itself: the
 * caller's `attachInTx` writes that card once. Must be called after every read of the transaction.
 * @returns true when the group was dissolved.
 */
function detachInTx(tx: Transaction, db: Firestore, groupRef: DocumentReference, group: FirebaseFirestore.DocumentData, cardId: string): boolean {
    const remaining = [group.headCardId as string, ...((group.memberCardIds ?? []) as string[])].filter((id) => id !== cardId);

    if (remaining.length < 2) {
        tx.delete(groupRef);
        for (const survivorId of remaining) {
            tx.update(db.collection(CARDS).doc(survivorId), {
                groupId: FieldValue.delete(),
                isGroupHead: FieldValue.delete(),
                groupOrder: FieldValue.delete(),
                order: typeof group.order === 'number' ? group.order : 0,
                updatedAt: FieldValue.serverTimestamp(),
            });
        }
        return true;
    }

    const [newHeadId, ...members] = remaining;
    tx.update(groupRef, { headCardId: newHeadId, memberCardIds: members, updatedAt: FieldValue.serverTimestamp() });
    if (newHeadId !== group.headCardId) {
        tx.update(db.collection(CARDS).doc(newHeadId!), { isGroupHead: true, groupOrder: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
    }
    members.forEach((memberId, index) => {
        tx.update(db.collection(CARDS).doc(memberId), { groupOrder: index, updatedAt: FieldValue.serverTimestamp() });
    });
    return false;
}

/** Where a card lands in `attachInTx`. */
type AttachTarget =
    | { kind: 'position'; order: number }
    | { kind: 'group'; groupRef: DocumentReference; group: FirebaseFirestore.DocumentData }
    | {
          kind: 'newGroup';
          groupRef: DocumentReference;
          retrospectiveId: string;
          column: string;
          headCardId: string;
          memberCardIds: string[];
          title?: string;
          origin: GroupOrigin;
          order: number;
          createdBy: string;
      };

/**
 * Write-only half of a card arriving somewhere (spec 059 placement rules): a plain position
 * (grouping fields cleared), the end of an existing group (the group keeps its `order`), or a
 * brand-new group that takes `order` (the target/head card's slot). `cardId` is the moving card;
 * `newGroup` writes the head and every member itself, so it ignores `cardId`. Must be called after
 * every read of the transaction.
 */
function attachInTx(tx: Transaction, db: Firestore, cardId: string, target: AttachTarget): void {
    const cardRef = (id: string) => db.collection(CARDS).doc(id);
    const now = FieldValue.serverTimestamp();

    if (target.kind === 'position') {
        tx.update(cardRef(cardId), {
            order: target.order,
            groupId: FieldValue.delete(),
            isGroupHead: FieldValue.delete(),
            groupOrder: FieldValue.delete(),
            updatedAt: now,
        });
    } else if (target.kind === 'group') {
        const memberCardIds = [...((target.group.memberCardIds ?? []) as string[]), cardId];
        tx.update(target.groupRef, { memberCardIds, updatedAt: now });
        tx.update(cardRef(cardId), { groupId: target.groupRef.id, isGroupHead: false, groupOrder: memberCardIds.length - 1, updatedAt: now });
    } else {
        const groupData: Record<string, unknown> = {
            retrospectiveId: target.retrospectiveId,
            column: target.column,
            headCardId: target.headCardId,
            memberCardIds: target.memberCardIds,
            isCollapsed: false,
            createdAt: now,
            createdBy: target.createdBy,
            order: target.order,
            origin: target.origin,
        };
        if (target.title !== undefined) groupData.title = target.title;
        tx.set(target.groupRef, groupData);
        tx.update(cardRef(target.headCardId), { groupId: target.groupRef.id, isGroupHead: true, groupOrder: FieldValue.delete(), updatedAt: now });
        target.memberCardIds.forEach((memberId, index) => {
            tx.update(cardRef(memberId), { groupId: target.groupRef.id, isGroupHead: false, groupOrder: index, updatedAt: now });
        });
    }
}

/**
 * Read/write Admin SDK access to the groups collection (feature 019), including
 * head-card promotion/reindexing on member removal (mirrors the retired client-side
 * cardGroupService.ts's exact logic, now atomic via a single WriteBatch per operation).
 */
export class FirestoreCardGroupAdapter implements CardGroupPort {
    constructor(private readonly db: Firestore) {}

    async listGroups(retrospectiveId: string): Promise<CardGroupDTO[]> {
        const snap = await this.db.collection(GROUPS).where('retrospectiveId', '==', retrospectiveId).get();
        return snap.docs.map((doc) => toCardGroup(doc.id, doc.data()));
    }

    async getGroup(groupId: string): Promise<CardGroupDTO | null> {
        const snap = await this.db.collection(GROUPS).doc(groupId).get();
        if (!snap.exists) return null;
        return toCardGroup(snap.id, snap.data()!);
    }

    async createGroup(input: CreateCardGroupInput): Promise<CardGroupDTO> {
        const ids = [input.headCardId, ...input.memberCardIds];
        if (input.memberCardIds.length < 1 || new Set(ids).size !== ids.length) {
            throw new AppError('invalid_request', 'A group needs a head and at least one distinct member', 400);
        }
        const groupRef = this.db.collection(GROUPS).doc();

        await this.db.runTransaction(async (tx) => {
            // Reads first (Firestore requires every read to precede any write).
            const snaps = await tx.getAll(...ids.map((cardId) => this.db.collection(CARDS).doc(cardId)));
            const cards = snaps.map((snap) => {
                if (!snap.exists) throw new NotFoundError('Card not found'); // P2
                return snap.data()!;
            });
            const head = cards[0]!;
            for (const card of cards) {
                // P3 + P4: same retrospective as the request and same column as the head.
                if (card.retrospectiveId !== input.retrospectiveId || card.column !== head.column) {
                    throw groupConflict('Cards must belong to the same retrospective column');
                }
                if (card.groupId) throw groupConflict('Card is already in a group'); // P5
            }

            attachInTx(tx, this.db, input.headCardId, {
                kind: 'newGroup',
                groupRef,
                retrospectiveId: input.retrospectiveId,
                column: head.column as string,
                headCardId: input.headCardId,
                memberCardIds: input.memberCardIds,
                title: input.title,
                origin: input.origin ?? 'suggestion',
                order: typeof head.order === 'number' ? head.order : 0,
                createdBy: input.createdBy,
            });
        });

        const created = await groupRef.get();
        return toCardGroup(created.id, created.data()!);
    }

    async disbandGroup(groupId: string): Promise<void> {
        const groupRef = this.db.collection(GROUPS).doc(groupId);
        const groupSnap = await groupRef.get();
        if (!groupSnap.exists) throw new NotFoundError('Group not found');
        const group = groupSnap.data()!;

        const batch = this.db.batch();
        const allCardIds = [group.headCardId, ...((group.memberCardIds ?? []) as string[])];
        for (const cardId of allCardIds) {
            batch.update(this.db.collection(CARDS).doc(cardId), {
                groupId: FieldValue.delete(),
                isGroupHead: FieldValue.delete(),
                groupOrder: FieldValue.delete(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }
        batch.delete(groupRef);
        await batch.commit();
    }

    async addCardToGroup(groupId: string, cardId: string): Promise<CardGroupDTO> {
        const groupRef = this.db.collection(GROUPS).doc(groupId);
        await this.db.runTransaction(async (tx) => {
            const [groupSnap, cardSnap] = await tx.getAll(groupRef, this.db.collection(CARDS).doc(cardId));
            if (!groupSnap.exists) throw new NotFoundError('Group not found'); // A1
            if (!cardSnap.exists) throw new NotFoundError('Card not found'); // A2
            const group = groupSnap.data()!;
            const card = cardSnap.data()!;
            // A3: same retrospective and column. A4: card is ungrouped.
            if (card.retrospectiveId !== group.retrospectiveId || card.column !== group.column) {
                throw groupConflict('Card is not in the same retrospective column as the group');
            }
            if (card.groupId) throw groupConflict('Card is already in a group');

            attachInTx(tx, this.db, cardId, { kind: 'group', groupRef, group });
        });
        const updated = await groupRef.get();
        return toCardGroup(updated.id, updated.data()!);
    }

    async removeCardFromGroup(groupId: string, cardId: string): Promise<CardGroupDTO | null> {
        const groupRef = this.db.collection(GROUPS).doc(groupId);
        const cardRef = this.db.collection(CARDS).doc(cardId);

        const dissolved = await this.db.runTransaction(async (tx) => {
            const [groupSnap, cardSnap] = await tx.getAll(groupRef, cardRef);
            if (!groupSnap.exists) throw new NotFoundError('Group not found');
            if (!cardSnap.exists) throw new NotFoundError('Card not found');
            const group = groupSnap.data()!;
            const card = cardSnap.data()!;
            requireListed(groupId, group, cardId, card); // I1

            // Placement (data-model "No new index"): the retrospective-scoped equality queries
            // listGroups/GetBoardState already use, then the column's next item in memory.
            const [cardsSnap, groupsSnap] = await Promise.all([
                tx.get(this.db.collection(CARDS).where('retrospectiveId', '==', group.retrospectiveId)),
                tx.get(this.db.collection(GROUPS).where('retrospectiveId', '==', group.retrospectiveId)),
            ]);
            const groupOrder = typeof group.order === 'number' ? group.order : 0;
            const candidateOrders = [
                ...cardsSnap.docs.filter((d) => d.id !== cardId && !d.data().groupId && d.data().column === group.column).map((d) => d.data().order),
                ...groupsSnap.docs.filter((d) => d.id !== groupId && d.data().column === group.column).map((d) => d.data().order ?? 0),
            ].filter((o): o is number => typeof o === 'number' && o > groupOrder);
            const placedOrder = candidateOrders.length > 0 ? (groupOrder + Math.min(...candidateOrders)) / 2 : groupOrder + 1;

            const didDissolve = detachInTx(tx, this.db, groupRef, group, cardId);
            attachInTx(tx, this.db, cardId, { kind: 'position', order: placedOrder });
            return didDissolve;
        });

        if (dissolved) return null;
        const updated = await groupRef.get();
        return toCardGroup(updated.id, updated.data()!);
    }

    async moveCard(retrospectiveId: string, cardId: string, target: MoveTarget): Promise<MoveCardResult> {
        // M1 backstop (the use case validates first; the port stays safe on its own).
        if (target.kind === 'position' && !Number.isFinite(target.order)) throw new AppError('invalid_request', 'order must be a finite number', 400);
        if (target.kind === 'card' && target.cardId === cardId) throw new AppError('invalid_request', 'A card cannot target itself', 400);

        const cardRef = this.db.collection(CARDS).doc(cardId);
        return this.db.runTransaction(async (tx) => {
            // Reads first.
            const sourceSnap = await tx.get(cardRef);
            if (!sourceSnap.exists || sourceSnap.data()!.retrospectiveId !== retrospectiveId) throw new NotFoundError('Card not found'); // M2
            const source = sourceSnap.data()!;

            const sourceGroupRef = source.groupId ? this.db.collection(GROUPS).doc(source.groupId as string) : undefined;
            const targetCardRef = target.kind === 'card' ? this.db.collection(CARDS).doc(target.cardId) : undefined;
            const targetGroupRef = target.kind === 'group' ? this.db.collection(GROUPS).doc(target.groupId) : undefined;
            const refs = [sourceGroupRef, targetCardRef, targetGroupRef].filter((r): r is NonNullable<typeof r> => r !== undefined);
            const snaps = refs.length > 0 ? await tx.getAll(...refs) : [];
            const snapOf = (ref: typeof sourceGroupRef) => (ref ? snaps[refs.indexOf(ref)] : undefined);
            const sourceGroupSnap = snapOf(sourceGroupRef);
            const targetCardSnap = snapOf(targetCardRef);
            const targetGroupSnap = snapOf(targetGroupRef);

            if (targetCardSnap) {
                if (!targetCardSnap.exists) throw new NotFoundError('Target card not found'); // M3
                const t = targetCardSnap.data()!;
                if (t.retrospectiveId !== retrospectiveId || t.column !== source.column) throw groupConflict('Target is not in the same retrospective column'); // M4
                if (t.groupId) throw groupConflict('Target card is already in a group'); // M5
            }
            if (targetGroupSnap) {
                if (!targetGroupSnap.exists) throw new NotFoundError('Target group not found'); // M3
                const t = targetGroupSnap.data()!;
                if (t.retrospectiveId !== retrospectiveId || t.column !== source.column) throw groupConflict('Target is not in the same retrospective column'); // M4
                if (source.groupId === targetGroupSnap.id) throw new AppError('invalid_request', 'Card is already in the target group', 400); // M6
            }
            if (sourceGroupRef) {
                // M7 (I1): the source's group must exist and list the source.
                if (!sourceGroupSnap?.exists) throw groupConflict('Card references a group that does not exist');
                requireListed(sourceGroupRef.id, sourceGroupSnap.data()!, cardId, source);
            }

            // Writes.
            const result: MoveCardResult = { dissolvedGroupIds: [] };
            if (sourceGroupRef && detachInTx(tx, this.db, sourceGroupRef, sourceGroupSnap!.data()!, cardId)) {
                result.dissolvedGroupIds.push(sourceGroupRef.id);
            }

            if (target.kind === 'position') {
                attachInTx(tx, this.db, cardId, { kind: 'position', order: target.order });
            } else if (targetGroupSnap) {
                attachInTx(tx, this.db, cardId, { kind: 'group', groupRef: targetGroupSnap.ref, group: targetGroupSnap.data()! });
            } else {
                const t = targetCardSnap!.data()!;
                const groupRef = this.db.collection(GROUPS).doc();
                attachInTx(tx, this.db, cardId, {
                    kind: 'newGroup',
                    groupRef,
                    retrospectiveId,
                    column: t.column as string,
                    headCardId: targetCardSnap!.id,
                    memberCardIds: [cardId],
                    origin: 'manual',
                    order: typeof t.order === 'number' ? t.order : 0,
                    createdBy: (source.createdBy as string | undefined) ?? '',
                });
                result.createdGroupId = groupRef.id;
            }
            return result;
        });
    }

    async setGroupTitle(groupId: string, title: string | null): Promise<CardGroupDTO> {
        const groupRef = this.db.collection(GROUPS).doc(groupId);
        const snap = await groupRef.get();
        if (!snap.exists) throw new NotFoundError('Group not found');
        await groupRef.update({ title: title === null ? FieldValue.delete() : title, updatedAt: FieldValue.serverTimestamp() });
        const updated = await groupRef.get();
        return toCardGroup(updated.id, updated.data()!);
    }

    async renormalizeColumnOrder(retrospectiveId: string, columnId: string, items: ColumnOrderItem[]): Promise<void> {
        await this.db.runTransaction(async (tx) => {
            const refs = items.map((item) => this.db.collection(item.kind === 'card' ? CARDS : GROUPS).doc(item.id));
            const snaps = await tx.getAll(...refs);
            // R2 first (any missing/foreign item -> 404), then R3 (column / grouped -> 409); no writes until both pass.
            snaps.forEach((snap) => {
                if (!snap.exists || snap.data()!.retrospectiveId !== retrospectiveId) throw new NotFoundError('Item not found');
            });
            snaps.forEach((snap, index) => {
                const data = snap.data()!;
                if (data.column !== columnId) throw groupConflict('Item is not in the column');
                if (items[index]!.kind === 'card' && data.groupId) throw groupConflict('Card is grouped');
            });
            snaps.forEach((snap, index) => {
                tx.update(snap.ref, { order: items[index]!.order, updatedAt: FieldValue.serverTimestamp() });
            });
        });
    }

    async setGroupCollapse(groupId: string, isCollapsed: boolean): Promise<CardGroupDTO> {
        const groupRef = this.db.collection(GROUPS).doc(groupId);
        const snap = await groupRef.get();
        if (!snap.exists) throw new NotFoundError('Group not found');
        await groupRef.update({ isCollapsed, updatedAt: FieldValue.serverTimestamp() });
        const updated = await groupRef.get();
        return toCardGroup(updated.id, updated.data()!);
    }

    /** Corrects a group's column association (self-heal repair, spec 046 FR-009) —
     * called by GetBoardState when a group's persisted column no longer matches its
     * head card's actual column. */
    async repairGroupColumn(groupId: string, column: string): Promise<void> {
        await this.db.collection(GROUPS).doc(groupId).update({ column, updatedAt: FieldValue.serverTimestamp() });
    }
}
