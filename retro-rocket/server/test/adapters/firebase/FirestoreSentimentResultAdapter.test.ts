import { describe, it, expect } from 'vitest';
import { toSentimentResult } from '../../../src/adapters/firebase/FirestoreSentimentResultAdapter';

describe('toSentimentResult', () => {
    it('maps a Firestore sentimentResults document into a SentimentResultDTO', () => {
        const analyzedAt = { toDate: () => new Date('2026-07-01T10:00:00Z') };
        const data = {
            retrospectiveId: 'r1',
            cardId: 'card-1',
            sentiment: 'positive',
            confidence: 0.87,
            modelId: 'm1',
            modelVersion: 'v1',
            contentHash: 'hash1',
            isOverride: false,
            overrideBy: null,
            analyzedAt,
        };

        expect(toSentimentResult(data)).toEqual({
            retrospectiveId: 'r1',
            cardId: 'card-1',
            sentiment: 'positive',
            confidence: 0.87,
            modelId: 'm1',
            modelVersion: 'v1',
            contentHash: 'hash1',
            isOverride: false,
            overrideBy: null,
            analyzedAt: new Date('2026-07-01T10:00:00Z'),
        });
    });

    it('defaults isOverride to false and overrideBy to null when absent', () => {
        const analyzedAt = { toDate: () => new Date('2026-07-01T10:00:00Z') };
        const data = { retrospectiveId: 'r1', cardId: 'card-1', sentiment: 'neutral', confidence: 0.5, contentHash: 'hash2', analyzedAt };

        expect(toSentimentResult(data)).toMatchObject({ isOverride: false, overrideBy: null });
    });
});
