import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { CardDTO, CardPort, CreateCardInput, LikeDTO, ReactionDTO, ReorderUpdate } from '../../application/ports/cards';
import { ForbiddenError, NotFoundError } from '../../domain/errors';

const CARDS = 'cards';

function toDate(value: unknown): Date {
    if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    return value instanceof Date ? value : new Date(value as string);
}

/**
 * Exported so this pure mapping logic can be unit-tested directly — see
 * FirestoreBoardsAdapter.ts's doc comment for the rationale shared across every
 * adapter in this codebase.
 */
export function toCard(id: string, data: FirebaseFirestore.DocumentData): CardDTO {
    return {
        id,
        content: data.content,
        column: data.column,
        createdBy: data.createdBy,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
        retrospectiveId: data.retrospectiveId,
        color: data.color,
        votes: data.votes ?? 0,
        likes: ((data.likes ?? []) as Array<Record<string, unknown>>).map(
            (l): LikeDTO => ({ userId: l.userId as string, username: l.username as string, timestamp: toDate(l.timestamp) }),
        ),
        reactions: ((data.reactions ?? []) as Array<Record<string, unknown>>).map(
            (r): ReactionDTO => ({ userId: r.userId as string, username: r.username as string, emoji: r.emoji as string, timestamp: toDate(r.timestamp) }),
        ),
        order: data.order ?? 0,
        groupId: data.groupId,
        isGroupHead: data.isGroupHead,
        groupOrder: data.groupOrder,
    };
}

/**
 * Read/write Admin SDK access to the cards collection (feature 019). Reads (listCards/
 * getCard) are implemented in US1 since GetBoardState depends on them for every story's
 * board load; writes are implemented across US2 (create/edit/delete/vote/like/react)
 * and US4 (reorder) — vote/like/reaction use atomic FieldValue.increment()/
 * arrayUnion()/arrayRemove() (research.md §7); reorder uses a single atomic WriteBatch
 * (research.md §8).
 */
export class FirestoreCardAdapter implements CardPort {
    constructor(private readonly db: Firestore) {}

    async listCards(retrospectiveId: string): Promise<CardDTO[]> {
        const snap = await this.db.collection(CARDS).where('retrospectiveId', '==', retrospectiveId).get();
        return snap.docs.map((doc) => toCard(doc.id, doc.data()));
    }

    async getCard(cardId: string): Promise<CardDTO | null> {
        const snap = await this.db.collection(CARDS).doc(cardId).get();
        if (!snap.exists) return null;
        return toCard(snap.id, snap.data()!);
    }

    async createCard(input: CreateCardInput): Promise<CardDTO> {
        const docRef = this.db.collection(CARDS).doc();
        await docRef.set({
            content: input.content,
            column: input.column,
            createdBy: input.createdBy,
            retrospectiveId: input.retrospectiveId,
            color: input.color,
            votes: 0,
            likes: [],
            reactions: [],
            // Timestamp-based ordering (matches the current client's exact scheme) —
            // new cards naturally sort after existing ones without a count query.
            order: Date.now(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        const snap = await docRef.get();
        return toCard(snap.id, snap.data()!);
    }

    async editCard(cardId: string, uid: string, updates: { content?: string; color?: string }): Promise<CardDTO> {
        const docRef = this.db.collection(CARDS).doc(cardId);
        const snap = await docRef.get();
        if (!snap.exists) throw new NotFoundError('Card not found');
        if (snap.data()?.createdBy !== uid) throw new ForbiddenError("Not this card's owner");

        const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
        if (updates.content !== undefined) patch.content = updates.content;
        if (updates.color !== undefined) patch.color = updates.color;
        await docRef.update(patch);

        const updated = await docRef.get();
        return toCard(updated.id, updated.data()!);
    }

    async deleteCard(cardId: string, uid: string): Promise<void> {
        const docRef = this.db.collection(CARDS).doc(cardId);
        const snap = await docRef.get();
        if (!snap.exists) throw new NotFoundError('Card not found');
        if (snap.data()?.createdBy !== uid) throw new ForbiddenError("Not this card's owner");
        await docRef.delete();
    }

    /** Atomic FieldValue.increment() — immune to the old client's read-then-write
     * race (research.md §7); no lost updates under concurrent votes (FR-008). */
    async voteCard(cardId: string, delta: number): Promise<CardDTO> {
        const docRef = this.db.collection(CARDS).doc(cardId);
        const snap = await docRef.get();
        if (!snap.exists) throw new NotFoundError('Card not found');
        await docRef.update({ votes: FieldValue.increment(delta), updatedAt: FieldValue.serverTimestamp() });
        const updated = await docRef.get();
        return toCard(updated.id, updated.data()!);
    }

    /** Toggle (add-or-remove) is inherently a read-decide-write operation — wrapped in
     * a Firestore transaction (automatically retried on conflict) so the decision and
     * write are atomic together, giving the same no-lost-update guarantee FR-009
     * requires as arrayUnion/arrayRemove would for a non-conditional array op. */
    async toggleLike(cardId: string, uid: string, username: string): Promise<CardDTO> {
        const docRef = this.db.collection(CARDS).doc(cardId);
        await this.db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            if (!snap.exists) throw new NotFoundError('Card not found');
            const likes = (snap.data()!.likes ?? []) as Array<Record<string, unknown>>;
            const alreadyLiked = likes.some((l) => l.userId === uid);
            const nextLikes = alreadyLiked ? likes.filter((l) => l.userId !== uid) : [...likes, { userId: uid, username, timestamp: new Date() }];
            tx.update(docRef, { likes: nextLikes, updatedAt: FieldValue.serverTimestamp() });
        });
        const updated = await docRef.get();
        if (!updated.exists) throw new NotFoundError('Card not found');
        return toCard(updated.id, updated.data()!);
    }

    async setReaction(cardId: string, uid: string, username: string, emoji: string): Promise<CardDTO> {
        const docRef = this.db.collection(CARDS).doc(cardId);
        await this.db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            if (!snap.exists) throw new NotFoundError('Card not found');
            const reactions = ((snap.data()!.reactions ?? []) as Array<Record<string, unknown>>).filter((r) => r.userId !== uid);
            reactions.push({ userId: uid, username, emoji, timestamp: new Date() });
            tx.update(docRef, { reactions, updatedAt: FieldValue.serverTimestamp() });
        });
        const updated = await docRef.get();
        if (!updated.exists) throw new NotFoundError('Card not found');
        return toCard(updated.id, updated.data()!);
    }

    async removeReaction(cardId: string, uid: string): Promise<CardDTO> {
        const docRef = this.db.collection(CARDS).doc(cardId);
        await this.db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            if (!snap.exists) throw new NotFoundError('Card not found');
            const reactions = ((snap.data()!.reactions ?? []) as Array<Record<string, unknown>>).filter((r) => r.userId !== uid);
            tx.update(docRef, { reactions, updatedAt: FieldValue.serverTimestamp() });
        });
        const updated = await docRef.get();
        if (!updated.exists) throw new NotFoundError('Card not found');
        return toCard(updated.id, updated.data()!);
    }

    /** Single atomic WriteBatch — all updates commit or none do (FR-010), fixing the
     * current client's non-atomic sequential batchUpdateCardOrder (research.md §8).
     * Firestore batches cap at 500 operations, far above any realistic single-column
     * reorder card count, so no chunking is needed. */
    async reorderCards(retrospectiveId: string, updates: ReorderUpdate[]): Promise<void> {
        const batch = this.db.batch();
        for (const update of updates) {
            const docRef = this.db.collection(CARDS).doc(update.cardId);
            const patch: FirebaseFirestore.DocumentData = { order: update.order, updatedAt: FieldValue.serverTimestamp() };
            if (update.column !== undefined) patch.column = update.column;
            batch.update(docRef, patch);
        }
        void retrospectiveId;
        await batch.commit();
    }
}
