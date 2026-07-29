import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { SaveSentimentResultInput, SentimentResultDTO, SentimentResultPort, SentimentType } from '../../application/ports/sentiment';

const SENTIMENT_RESULTS = 'sentimentResults';

function toDate(value: unknown): Date {
    if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    return value instanceof Date ? value : new Date(value as string);
}

export function toSentimentResult(data: FirebaseFirestore.DocumentData): SentimentResultDTO {
    return {
        retrospectiveId: data.retrospectiveId,
        cardId: data.cardId,
        sentiment: data.sentiment,
        confidence: data.confidence,
        modelId: data.modelId,
        modelVersion: data.modelVersion,
        contentHash: data.contentHash,
        isOverride: data.isOverride ?? false,
        overrideBy: data.overrideBy ?? null,
        analyzedAt: toDate(data.analyzedAt),
    };
}

/**
 * Read/write Admin SDK access to the sentimentResults collection (feature 019).
 * Preserves the deterministic `{retroId}_{cardId}` doc id and contentHash/
 * modelVersion cache-invalidation fields exactly (data-model.md).
 */
export class FirestoreSentimentResultAdapter implements SentimentResultPort {
    constructor(private readonly db: Firestore) {}

    async listResults(retrospectiveId: string): Promise<SentimentResultDTO[]> {
        const snap = await this.db.collection(SENTIMENT_RESULTS).where('retrospectiveId', '==', retrospectiveId).get();
        return snap.docs.map((doc) => toSentimentResult(doc.data()));
    }

    async getResult(retrospectiveId: string, cardId: string): Promise<SentimentResultDTO | null> {
        const snap = await this.db.collection(SENTIMENT_RESULTS).doc(`${retrospectiveId}_${cardId}`).get();
        if (!snap.exists) return null;
        return toSentimentResult(snap.data()!);
    }

    /**
     * Auto-analysis save — any participant. Unlike the retired client-side
     * saveResultWithHash (which unconditionally wrote isOverride:false on every
     * call, relying solely on the frontend hook never calling it for an already-
     * overridden card), this preserves an existing isOverride/overrideBy if set —
     * defense in depth against a stray auto-save clobbering a facilitator's override.
     */
    async saveResult(input: SaveSentimentResultInput): Promise<SentimentResultDTO> {
        const docId = `${input.retrospectiveId}_${input.cardId}`;
        const docRef = this.db.collection(SENTIMENT_RESULTS).doc(docId);
        const existing = await docRef.get();
        const existingData = existing.exists ? existing.data()! : undefined;

        const data: FirebaseFirestore.DocumentData = {
            retrospectiveId: input.retrospectiveId,
            cardId: input.cardId,
            sentiment: input.sentiment,
            confidence: input.confidence,
            modelId: input.modelId,
            modelVersion: input.modelVersion,
            contentHash: input.contentHash,
            isOverride: existingData?.isOverride ?? false,
            overrideBy: existingData?.overrideBy ?? null,
            analyzedAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data, { merge: true });

        const updated = await docRef.get();
        return toSentimentResult(updated.data()!);
    }

    async saveOverride(retrospectiveId: string, cardId: string, uid: string, sentiment: SentimentType): Promise<SentimentResultDTO> {
        const docId = `${retrospectiveId}_${cardId}`;
        const docRef = this.db.collection(SENTIMENT_RESULTS).doc(docId);
        await docRef.set(
            {
                retrospectiveId,
                cardId,
                sentiment,
                confidence: 1,
                isOverride: true,
                overrideBy: uid,
                analyzedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
        );

        const updated = await docRef.get();
        return toSentimentResult(updated.data()!);
    }
}
