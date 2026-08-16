import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { CardGroupDTO, CardGroupPort, CreateCardGroupInput } from '../../application/ports/cards';
import { NotFoundError } from '../../domain/errors';

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
    };
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
        const groupRef = this.db.collection(GROUPS).doc();
        const groupData: Record<string, unknown> = {
            retrospectiveId: input.retrospectiveId,
            column: input.column,
            headCardId: input.headCardId,
            memberCardIds: input.memberCardIds,
            isCollapsed: false,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: input.createdBy,
            order: 0,
        };
        if (input.title !== undefined) groupData.title = input.title;

        const batch = this.db.batch();
        batch.set(groupRef, groupData);
        batch.update(this.db.collection(CARDS).doc(input.headCardId), {
            groupId: groupRef.id,
            isGroupHead: true,
            updatedAt: FieldValue.serverTimestamp(),
        });
        input.memberCardIds.forEach((cardId, index) => {
            batch.update(this.db.collection(CARDS).doc(cardId), {
                groupId: groupRef.id,
                isGroupHead: false,
                groupOrder: index,
                updatedAt: FieldValue.serverTimestamp(),
            });
        });
        await batch.commit();

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
        const groupSnap = await groupRef.get();
        if (!groupSnap.exists) throw new NotFoundError('Group not found');
        const group = groupSnap.data()!;
        const newMemberCardIds = [...((group.memberCardIds ?? []) as string[]), cardId];

        const batch = this.db.batch();
        batch.update(groupRef, { memberCardIds: newMemberCardIds, updatedAt: FieldValue.serverTimestamp() });
        batch.update(this.db.collection(CARDS).doc(cardId), {
            groupId,
            isGroupHead: false,
            groupOrder: newMemberCardIds.length - 1,
            updatedAt: FieldValue.serverTimestamp(),
        });
        await batch.commit();

        const updated = await groupRef.get();
        return toCardGroup(updated.id, updated.data()!);
    }

    async removeCardFromGroup(groupId: string, cardId: string): Promise<CardGroupDTO | null> {
        const groupRef = this.db.collection(GROUPS).doc(groupId);
        const groupSnap = await groupRef.get();
        if (!groupSnap.exists) throw new NotFoundError('Group not found');
        const group = groupSnap.data()!;
        const memberCardIds = (group.memberCardIds ?? []) as string[];

        const batch = this.db.batch();
        let disbanded = false;

        if (group.headCardId === cardId) {
            if (memberCardIds.length > 0) {
                const [newHeadCardId, ...rest] = memberCardIds;
                batch.update(groupRef, { headCardId: newHeadCardId, memberCardIds: rest, updatedAt: FieldValue.serverTimestamp() });
                batch.update(this.db.collection(CARDS).doc(newHeadCardId), {
                    isGroupHead: true,
                    groupOrder: FieldValue.delete(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
                rest.forEach((memberId, index) => {
                    batch.update(this.db.collection(CARDS).doc(memberId), { groupOrder: index, updatedAt: FieldValue.serverTimestamp() });
                });
            } else {
                batch.delete(groupRef);
                disbanded = true;
            }
        } else {
            const newMemberCardIds = memberCardIds.filter((id) => id !== cardId);
            batch.update(groupRef, { memberCardIds: newMemberCardIds, updatedAt: FieldValue.serverTimestamp() });
            newMemberCardIds.forEach((memberId, index) => {
                batch.update(this.db.collection(CARDS).doc(memberId), { groupOrder: index, updatedAt: FieldValue.serverTimestamp() });
            });
        }

        batch.update(this.db.collection(CARDS).doc(cardId), {
            groupId: FieldValue.delete(),
            isGroupHead: FieldValue.delete(),
            groupOrder: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        await batch.commit();

        if (disbanded) return null;
        const updated = await groupRef.get();
        return toCardGroup(updated.id, updated.data()!);
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
