import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { Card, CardPort, CreateCardInput, Like, Reaction, ReorderCardUpdate, UpdateCardInput } from '../../application/ports/cards';
import { CARDS } from './collections';
import { toDate } from './firestoreUtil';

/**
 * Admin SDK access to the `cards` collection. Uses Firestore transactions for
 * toggleLike/setReaction/removeReaction and a single batch for reorderCards so these
 * operations are properly atomic (research.md §5 — fixing today's non-atomic races).
 */
export class FirestoreCardAdapter implements CardPort {
    constructor(private readonly db: Firestore) {}

    async getCard(cardId: string): Promise<Card | null> {
        const doc = await this.db.collection(CARDS).doc(cardId).get();
        if (!doc.exists) return null;
        return this.toCard(doc.id, doc.data()!);
    }

    async listCards(retrospectiveId: string): Promise<Card[]> {
        const snap = await this.db
            .collection(CARDS)
            .where('retrospectiveId', '==', retrospectiveId)
            .orderBy('order', 'asc')
            .get();
        return snap.docs.map((doc) => this.toCard(doc.id, doc.data()));
    }

    async createCard(input: CreateCardInput): Promise<Card> {
        const ref = this.db.collection(CARDS).doc();
        const now = FieldValue.serverTimestamp();
        await ref.set({
            retrospectiveId: input.retrospectiveId,
            content: input.content,
            column: input.column,
            createdBy: input.createdBy,
            color: input.color ?? null,
            createdAt: now,
            updatedAt: now,
            likes: [],
            reactions: [],
            order: Date.now(),
        });
        return (await this.getCard(ref.id))!;
    }

    async updateCard(cardId: string, updates: UpdateCardInput): Promise<Card> {
        await this.db
            .collection(CARDS)
            .doc(cardId)
            .update({ ...updates, updatedAt: FieldValue.serverTimestamp() } as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>);
        return (await this.getCard(cardId))!;
    }

    async deleteCard(cardId: string): Promise<void> {
        await this.db.collection(CARDS).doc(cardId).delete();
    }

    async toggleLike(cardId: string, userId: string, username: string): Promise<Card> {
        const ref = this.db.collection(CARDS).doc(cardId);
        await this.db.runTransaction(async (tx) => {
            const doc = await tx.get(ref);
            if (!doc.exists) return;
            const likes = ((doc.data()!.likes ?? []) as Like[]).filter((l) => l.userId !== userId);
            const alreadyLiked = ((doc.data()!.likes ?? []) as Like[]).some((l) => l.userId === userId);
            if (!alreadyLiked) likes.push({ userId, username, timestamp: new Date() });
            tx.update(ref, { likes, updatedAt: FieldValue.serverTimestamp() });
        });
        return (await this.getCard(cardId))!;
    }

    async setReaction(cardId: string, userId: string, username: string, emoji: string): Promise<Card> {
        const ref = this.db.collection(CARDS).doc(cardId);
        await this.db.runTransaction(async (tx) => {
            const doc = await tx.get(ref);
            if (!doc.exists) return;
            const reactions = ((doc.data()!.reactions ?? []) as Reaction[]).filter((r) => r.userId !== userId);
            reactions.push({ userId, username, emoji, timestamp: new Date() });
            tx.update(ref, { reactions, updatedAt: FieldValue.serverTimestamp() });
        });
        return (await this.getCard(cardId))!;
    }

    async removeReaction(cardId: string, userId: string): Promise<Card> {
        const ref = this.db.collection(CARDS).doc(cardId);
        await this.db.runTransaction(async (tx) => {
            const doc = await tx.get(ref);
            if (!doc.exists) return;
            const reactions = ((doc.data()!.reactions ?? []) as Reaction[]).filter((r) => r.userId !== userId);
            tx.update(ref, { reactions, updatedAt: FieldValue.serverTimestamp() });
        });
        return (await this.getCard(cardId))!;
    }

    async reorderCards(updates: ReorderCardUpdate[]): Promise<void> {
        const batch = this.db.batch();
        for (const update of updates) {
            const ref = this.db.collection(CARDS).doc(update.cardId);
            const data: Record<string, unknown> = { order: update.order, updatedAt: FieldValue.serverTimestamp() };
            if (update.column !== undefined) data.column = update.column;
            batch.update(ref, data as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>);
        }
        await batch.commit();
    }

    private toCard(id: string, data: FirebaseFirestore.DocumentData): Card {
        return {
            id,
            retrospectiveId: data.retrospectiveId,
            content: data.content,
            column: data.column,
            createdBy: data.createdBy,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
            color: data.color ?? undefined,
            votes: data.votes,
            likes: ((data.likes ?? []) as Array<Record<string, unknown>>).map((l) => ({
                userId: l.userId as string,
                username: l.username as string,
                timestamp: toDate(l.timestamp),
            })),
            reactions: ((data.reactions ?? []) as Array<Record<string, unknown>>).map((r) => ({
                userId: r.userId as string,
                username: r.username as string,
                emoji: r.emoji as string,
                timestamp: toDate(r.timestamp),
            })),
            order: data.order ?? 0,
            groupId: data.groupId ?? undefined,
            isGroupHead: data.isGroupHead ?? undefined,
            groupOrder: data.groupOrder ?? undefined,
        };
    }
}
