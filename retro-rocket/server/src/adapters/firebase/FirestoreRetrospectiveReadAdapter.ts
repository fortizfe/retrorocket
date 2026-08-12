import type { Firestore } from 'firebase-admin/firestore';
import type {
    ActionItemRecord,
    CardGroupRecord,
    CardRecord,
    FacilitatorNoteRecord,
    ParticipantRecord,
    RetrospectiveAccessRecord,
    RetrospectiveListEntry,
    RetrospectiveReadPort,
    SentimentResultRecord,
} from '../../application/ports/mcp';

const RETROSPECTIVES = 'retrospectives';
const PARTICIPANTS = 'participants';
const CARDS = 'cards';
const GROUPS = 'groups';
const ACTION_ITEMS = 'actionItems';
const SENTIMENT_RESULTS = 'sentimentResults';
const FACILITATOR_NOTES = 'facilitatorNotes';

function toDate(value: unknown): Date {
    if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    return value instanceof Date ? value : new Date(value as string);
}

/**
 * Read-only Admin SDK access to retrospective data (data-model.md's "read-only projections").
 * FR-013: this interface exposes no write methods at all — that is the compile-time
 * enforcement that nothing exposed through the MCP connector can mutate retrospective data.
 */
export class FirestoreRetrospectiveReadAdapter implements RetrospectiveReadPort {
    constructor(private readonly db: Firestore) {}

    async getRetrospective(retrospectiveId: string): Promise<RetrospectiveAccessRecord | null> {
        const snap = await this.db.collection(RETROSPECTIVES).doc(retrospectiveId).get();
        if (!snap.exists) return null;
        const data = snap.data()!;
        return { id: snap.id, title: data.title, createdBy: data.createdBy, createdAt: toDate(data.createdAt) };
    }

    async listRetrospectivesForUser(uid: string): Promise<RetrospectiveListEntry[]> {
        const entries = new Map<string, RetrospectiveListEntry>();

        const owned = await this.db.collection(RETROSPECTIVES).where('createdBy', '==', uid).get();
        for (const doc of owned.docs) {
            const data = doc.data();
            entries.set(doc.id, { id: doc.id, title: data.title, createdAt: toDate(data.createdAt), role: 'facilitator' });
        }

        const participations = await this.db.collection(PARTICIPANTS).where('userId', '==', uid).get();
        const joinedIds = [...new Set(participations.docs.map((d) => d.data().retrospectiveId as string))].filter(
            (id) => !entries.has(id),
        );

        // 041, FR-005: a single batched getAll() per chunk instead of one .doc().get()
        // per joined retrospective — chunked at 30 to mirror listSentimentResults'
        // existing 'in'-query chunk size (bounding any single RPC's payload size), not
        // because getAll() itself has that cap.
        for (let i = 0; i < joinedIds.length; i += 30) {
            const chunk = joinedIds.slice(i, i + 30);
            const refs = chunk.map((id) => this.db.collection(RETROSPECTIVES).doc(id));
            if (refs.length === 0) continue;
            const snaps = await this.db.getAll(...refs);
            for (const snap of snaps) {
                if (!snap.exists) continue;
                const data = snap.data()!;
                entries.set(snap.id, { id: snap.id, title: data.title, createdAt: toDate(data.createdAt), role: 'participant' });
            }
        }

        return [...entries.values()];
    }

    async listCards(retrospectiveId: string): Promise<CardRecord[]> {
        const snap = await this.db.collection(CARDS).where('retrospectiveId', '==', retrospectiveId).get();
        return snap.docs.map((doc) => {
            const data = doc.data();
            const reactionCounts = new Map<string, number>();
            for (const r of (data.reactions ?? []) as Array<{ emoji: string }>) {
                reactionCounts.set(r.emoji, (reactionCounts.get(r.emoji) ?? 0) + 1);
            }
            const likeCount = ((data.likes ?? []) as unknown[]).length;
            if (likeCount > 0) reactionCounts.set('like', likeCount);
            return {
                id: doc.id,
                content: data.content,
                column: data.column,
                createdBy: data.createdBy,
                createdAt: toDate(data.createdAt),
                votes: data.votes,
                reactions: [...reactionCounts.entries()].map(([emoji, count]) => ({ emoji, count })),
            };
        });
    }

    async listGroups(retrospectiveId: string): Promise<CardGroupRecord[]> {
        const snap = await this.db.collection(GROUPS).where('retrospectiveId', '==', retrospectiveId).get();
        return snap.docs.map((doc) => {
            const data = doc.data();
            const cardIds = [data.headCardId, ...((data.memberCardIds ?? []) as string[])].filter(Boolean);
            return { id: doc.id, title: data.title ?? data.column, cardIds };
        });
    }

    async listParticipants(retrospectiveId: string): Promise<ParticipantRecord[]> {
        const snap = await this.db.collection(PARTICIPANTS).where('retrospectiveId', '==', retrospectiveId).get();
        return snap.docs.map((doc) => {
            const data = doc.data();
            return { name: data.name, userId: data.userId, joinedAt: toDate(data.joinedAt) };
        });
    }

    async listSentimentResults(cardIds: string[]): Promise<SentimentResultRecord[]> {
        if (cardIds.length === 0) return [];

        // Firestore 'in' queries cap at 30 values — chunk rather than scanning the whole
        // collection, both for cost and for the free-tier read-volume budget (FR-015).
        const results: SentimentResultRecord[] = [];
        for (let i = 0; i < cardIds.length; i += 30) {
            const chunk = cardIds.slice(i, i + 30);
            const snap = await this.db.collection(SENTIMENT_RESULTS).where('cardId', 'in', chunk).get();
            for (const doc of snap.docs) {
                const data = doc.data();
                results.push({ cardId: data.cardId, sentiment: data.sentiment, confidence: data.confidence });
            }
        }
        return results;
    }

    async listActionItems(retrospectiveId: string): Promise<ActionItemRecord[]> {
        const snap = await this.db.collection(ACTION_ITEMS).where('retrospectiveId', '==', retrospectiveId).get();
        return snap.docs.map((doc) => {
            const data = doc.data();
            return {
                content: data.content,
                assignedToName: data.assignedToName ?? null,
                dueDate: data.dueDate ? toDate(data.dueDate) : null,
            };
        });
    }

    async listFacilitatorNotes(retrospectiveId: string): Promise<FacilitatorNoteRecord[]> {
        const snap = await this.db.collection(FACILITATOR_NOTES).where('retrospectiveId', '==', retrospectiveId).get();
        return snap.docs.map((doc) => {
            const data = doc.data();
            return { content: data.content, timestamp: toDate(data.timestamp) };
        });
    }
}
