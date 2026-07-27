import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { SaveSentimentInput, SentimentPort, SentimentResult, SentimentType } from '../../application/ports/facilitator';
import { SENTIMENT_RESULTS } from './collections';
import { toDate } from './firestoreUtil';

/** Deterministic document ID — upsertable without a query (matches today's resultDocId). */
function docId(retrospectiveId: string, cardId: string): string {
    return `${retrospectiveId}_${cardId}`;
}

/**
 * Admin SDK access to the `sentimentResults` collection. The on-device inference itself
 * stays entirely client-side (FR-007) — this adapter only persists/retrieves its output.
 */
export class FirestoreSentimentAdapter implements SentimentPort {
    constructor(private readonly db: Firestore) {}

    async listResults(retrospectiveId: string): Promise<SentimentResult[]> {
        const snap = await this.db.collection(SENTIMENT_RESULTS).where('retrospectiveId', '==', retrospectiveId).get();
        return snap.docs.map((doc) => this.toResult(doc.data()));
    }

    async saveResult(input: SaveSentimentInput): Promise<SentimentResult> {
        const id = docId(input.retrospectiveId, input.cardId);
        const ref = this.db.collection(SENTIMENT_RESULTS).doc(id);
        const existing = await ref.get();
        if (existing.exists) {
            const data = existing.data()!;
            if (data.isOverride === true) return this.toResult(data);
            if (data.contentHash === input.contentHash) return this.toResult(data);
        }

        await ref.set({
            retrospectiveId: input.retrospectiveId,
            cardId: input.cardId,
            sentiment: input.sentiment,
            confidence: input.confidence,
            modelId: input.modelId ?? '',
            modelVersion: input.modelVersion ?? '',
            contentHash: input.contentHash,
            isOverride: false,
            overrideBy: null,
            analyzedAt: FieldValue.serverTimestamp(),
        });
        return (await this.getResult(input.retrospectiveId, input.cardId))!;
    }

    async saveOverride(retrospectiveId: string, cardId: string, sentiment: SentimentType, overrideBy: string): Promise<SentimentResult> {
        const id = docId(retrospectiveId, cardId);
        await this.db.collection(SENTIMENT_RESULTS).doc(id).set(
            {
                retrospectiveId,
                cardId,
                sentiment,
                confidence: 1.0,
                isOverride: true,
                overrideBy,
                analyzedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
        );
        return (await this.getResult(retrospectiveId, cardId))!;
    }

    async deleteResult(retrospectiveId: string, cardId: string): Promise<void> {
        await this.db.collection(SENTIMENT_RESULTS).doc(docId(retrospectiveId, cardId)).delete();
    }

    private async getResult(retrospectiveId: string, cardId: string): Promise<SentimentResult | null> {
        const doc = await this.db.collection(SENTIMENT_RESULTS).doc(docId(retrospectiveId, cardId)).get();
        if (!doc.exists) return null;
        return this.toResult(doc.data()!);
    }

    private toResult(data: FirebaseFirestore.DocumentData): SentimentResult {
        return {
            retrospectiveId: data.retrospectiveId,
            cardId: data.cardId,
            sentiment: data.sentiment,
            confidence: data.confidence,
            modelId: data.modelId ?? '',
            modelVersion: data.modelVersion ?? '',
            contentHash: data.contentHash ?? '',
            isOverride: data.isOverride === true,
            overrideBy: data.overrideBy ?? null,
            timestamp: toDate(data.analyzedAt),
        };
    }
}
