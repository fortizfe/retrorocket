import {
    collection,
    doc,
    setDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/services/firebase';
import { SentimentResult, SentimentType } from '@/features/boards/types/sentiment';
import { FIRESTORE_COLLECTIONS } from '@/lib/utils/constants';

const col = () => collection(db!, FIRESTORE_COLLECTIONS.SENTIMENT_RESULTS);

/** Deterministic document ID — upsertable without a query. */
function resultDocId(retrospectiveId: string, cardId: string): string {
    return `${retrospectiveId}_${cardId}`;
}

export class SentimentResultsService {
    /**
     * Saves an automatic result with the card's **content hash** plus model id and
     * inference-stack version, so stale results can be detected on the next load
     * (F1/FR-004). `saveResultWithHash` is the sole write path for auto results.
     */
    static async saveResultWithHash(
        retrospectiveId: string,
        result: SentimentResult,
        contentHash: string
    ): Promise<void> {
        const id = resultDocId(retrospectiveId, result.cardId);
        await setDoc(doc(col(), id), {
            retrospectiveId,
            cardId: result.cardId,
            sentiment: result.sentiment,
            confidence: result.confidence,
            modelId: result.modelId ?? '',
            modelVersion: result.modelVersion ?? '',
            isOverride: false,
            overrideBy: null,
            contentHash,
            analyzedAt: serverTimestamp(),
        }, { merge: true });
    }

    static async loadResults(
        retrospectiveId: string
    ): Promise<Map<string, SentimentResult>> {
        const q = query(col(), where('retrospectiveId', '==', retrospectiveId));
        const snap = await getDocs(q);
        const map = new Map<string, SentimentResult>();
        snap.forEach(d => {
            const data = d.data();
            map.set(data.cardId, {
                cardId: data.cardId,
                sentiment: data.sentiment as SentimentType,
                confidence: data.confidence,
                modelId: data.modelId ?? '',
                modelVersion: data.modelVersion ?? '',
                isOverride: data.isOverride === true,
                timestamp: data.analyzedAt?.toDate() ?? new Date(),
                contentHash: data.contentHash ?? '',
            });
        });
        return map;
    }

    static async deleteResult(retrospectiveId: string, cardId: string): Promise<void> {
        await deleteDoc(doc(col(), resultDocId(retrospectiveId, cardId)));
    }

    static async saveOverride(
        retrospectiveId: string,
        cardId: string,
        sentiment: SentimentType,
        facilitatorId: string
    ): Promise<void> {
        const id = resultDocId(retrospectiveId, cardId);
        await setDoc(doc(col(), id), {
            sentiment,
            confidence: 1.0,
            isOverride: true,
            overrideBy: facilitatorId,
            analyzedAt: serverTimestamp(),
        }, { merge: true });
    }
}
