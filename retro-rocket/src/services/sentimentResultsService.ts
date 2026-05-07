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
import { db } from './firebase';
import { SentimentResult, SentimentType } from '../types/sentiment';
import { hashContent } from '../hooks/useSentimentCache';
import { FIRESTORE_COLLECTIONS } from '../utils/constants';

const col = () => collection(db as any, FIRESTORE_COLLECTIONS.SENTIMENT_RESULTS);

/** Deterministic document ID — upsertable without a query. */
function resultDocId(retrospectiveId: string, cardId: string): string {
    return `${retrospectiveId}_${cardId}`;
}

export class SentimentResultsService {
    static async saveResult(retrospectiveId: string, result: SentimentResult): Promise<void> {
        const id = resultDocId(retrospectiveId, result.cardId);
        await setDoc(doc(col(), id), {
            retrospectiveId,
            cardId: result.cardId,
            sentiment: result.sentiment,
            confidence: result.confidence,
            modelId: result.modelId ?? '',
            isOverride: false,
            overrideBy: null,
            contentHash: hashContent(result.cardId), // caller should pass content hash; use cardId as fallback
            analyzedAt: serverTimestamp(),
        }, { merge: true });
    }

    /** Saves a result with the card's content hash so stale results can be detected on next load. */
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
            isOverride: false,
            overrideBy: null,
            contentHash,
            analyzedAt: serverTimestamp(),
        }, { merge: true });
    }

    static async loadResults(retrospectiveId: string): Promise<Map<string, SentimentResult & { contentHash: string }>> {
        const q = query(col(), where('retrospectiveId', '==', retrospectiveId));
        const snap = await getDocs(q);
        const map = new Map<string, SentimentResult & { contentHash: string }>();
        snap.forEach(d => {
            const data = d.data();
            map.set(data.cardId, {
                cardId: data.cardId,
                sentiment: data.sentiment as SentimentType,
                confidence: data.confidence,
                modelId: data.modelId,
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
