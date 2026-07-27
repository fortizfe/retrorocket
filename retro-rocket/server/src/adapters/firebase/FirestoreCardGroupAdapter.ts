import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { CardGroup, CardGroupPort } from '../../application/ports/cards';
import { CARDS, GROUPS, RETROSPECTIVES } from './collections';
import { toDate } from './firestoreUtil';

/**
 * Admin SDK access to the `groups` collection (card clustering, data-model.md). Group
 * mutations use Firestore transactions/batches so member/head card refs and the group
 * document stay consistent (matches today's already-correct writeBatch usage, ported to
 * the Admin SDK — research.md §5).
 */
export class FirestoreCardGroupAdapter implements CardGroupPort {
    constructor(private readonly db: Firestore) {}

    async getGroup(groupId: string): Promise<CardGroup | null> {
        const doc = await this.db.collection(GROUPS).doc(groupId).get();
        if (!doc.exists) return null;
        return this.toGroup(doc.id, doc.data()!);
    }

    async listGroups(retrospectiveId: string): Promise<CardGroup[]> {
        const snap = await this.db
            .collection(GROUPS)
            .where('retrospectiveId', '==', retrospectiveId)
            .orderBy('order', 'asc')
            .get();
        return snap.docs.map((doc) => this.toGroup(doc.id, doc.data()));
    }

    async createGroup(retrospectiveId: string, headCardId: string, memberCardIds: string[], createdBy: string, title?: string): Promise<CardGroup> {
        const headSnap = await this.db.collection(CARDS).doc(headCardId).get();
        if (!headSnap.exists) throw new Error(`Head card ${headCardId} not found`);
        const headData = headSnap.data()!;

        const groupRef = this.db.collection(GROUPS).doc();
        const now = FieldValue.serverTimestamp();
        const batch = this.db.batch();

        batch.set(groupRef, {
            retrospectiveId,
            column: headData.column,
            headCardId,
            memberCardIds,
            title: title ?? null,
            isCollapsed: false,
            createdAt: now,
            createdBy,
            order: Date.now(),
        });
        batch.update(this.db.collection(CARDS).doc(headCardId), { groupId: groupRef.id, isGroupHead: true, groupOrder: 0 });
        memberCardIds.forEach((cardId, index) => {
            batch.update(this.db.collection(CARDS).doc(cardId), { groupId: groupRef.id, isGroupHead: false, groupOrder: index + 1 });
        });

        await batch.commit();
        return (await this.getGroup(groupRef.id))!;
    }

    async disbandGroup(groupId: string): Promise<void> {
        const group = await this.getGroup(groupId);
        if (!group) return;

        const batch = this.db.batch();
        const clearRef = (cardId: string) =>
            batch.update(this.db.collection(CARDS).doc(cardId), {
                groupId: FieldValue.delete(),
                isGroupHead: FieldValue.delete(),
                groupOrder: FieldValue.delete(),
            });
        clearRef(group.headCardId);
        group.memberCardIds.forEach(clearRef);
        batch.delete(this.db.collection(GROUPS).doc(groupId));
        await batch.commit();
    }

    async addCardToGroup(groupId: string, cardId: string): Promise<CardGroup> {
        const group = await this.getGroup(groupId);
        if (!group) throw new Error(`Group ${groupId} not found`);

        const memberCardIds = [...group.memberCardIds, cardId];
        const batch = this.db.batch();
        batch.update(this.db.collection(GROUPS).doc(groupId), { memberCardIds });
        batch.update(this.db.collection(CARDS).doc(cardId), { groupId, isGroupHead: false, groupOrder: memberCardIds.length });
        await batch.commit();
        return (await this.getGroup(groupId))!;
    }

    async removeCardFromGroup(cardId: string): Promise<CardGroup | null> {
        const cardSnap = await this.db.collection(CARDS).doc(cardId).get();
        if (!cardSnap.exists) return null;
        const groupId = cardSnap.data()!.groupId as string | undefined;
        if (!groupId) return null;

        const group = await this.getGroup(groupId);
        if (!group) return null;

        const batch = this.db.batch();
        const clearCardRef = (id: string) =>
            batch.update(this.db.collection(CARDS).doc(id), {
                groupId: FieldValue.delete(),
                isGroupHead: FieldValue.delete(),
                groupOrder: FieldValue.delete(),
            });

        if (group.headCardId === cardId) {
            clearCardRef(cardId);
            const [promoted, ...remaining] = group.memberCardIds;
            if (!promoted) {
                // No members left — disband entirely.
                batch.delete(this.db.collection(GROUPS).doc(groupId));
                await batch.commit();
                return null;
            }
            batch.update(this.db.collection(GROUPS).doc(groupId), { headCardId: promoted, memberCardIds: remaining });
            batch.update(this.db.collection(CARDS).doc(promoted), { isGroupHead: true, groupOrder: 0 });
            remaining.forEach((id, index) => batch.update(this.db.collection(CARDS).doc(id), { groupOrder: index + 1 }));
            await batch.commit();
            return (await this.getGroup(groupId))!;
        }

        const memberCardIds = group.memberCardIds.filter((id) => id !== cardId);
        clearCardRef(cardId);
        if (memberCardIds.length === 0) {
            // Head with no members is no longer a meaningful group.
            clearCardRef(group.headCardId);
            batch.delete(this.db.collection(GROUPS).doc(groupId));
            await batch.commit();
            return null;
        }
        batch.update(this.db.collection(GROUPS).doc(groupId), { memberCardIds });
        await batch.commit();
        return (await this.getGroup(groupId))!;
    }

    async setGroupCollapsed(groupId: string, isCollapsed: boolean): Promise<CardGroup> {
        await this.db.collection(GROUPS).doc(groupId).update({ isCollapsed });
        return (await this.getGroup(groupId))!;
    }

    async saveColumnGroupingState(retrospectiveId: string, states: Record<string, unknown>): Promise<void> {
        await this.db.collection(RETROSPECTIVES).doc(retrospectiveId).update({ columnGroupingStates: states });
    }

    async getColumnGroupingState(retrospectiveId: string): Promise<Record<string, unknown>> {
        const doc = await this.db.collection(RETROSPECTIVES).doc(retrospectiveId).get();
        return (doc.data()?.columnGroupingStates as Record<string, unknown>) ?? {};
    }

    private toGroup(id: string, data: FirebaseFirestore.DocumentData): CardGroup {
        return {
            id,
            retrospectiveId: data.retrospectiveId,
            column: data.column,
            headCardId: data.headCardId,
            memberCardIds: data.memberCardIds ?? [],
            title: data.title ?? undefined,
            isCollapsed: data.isCollapsed ?? false,
            createdAt: toDate(data.createdAt),
            createdBy: data.createdBy,
            order: data.order ?? 0,
        };
    }
}
