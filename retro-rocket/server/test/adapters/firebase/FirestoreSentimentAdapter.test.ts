import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreSentimentAdapter } from '../../../src/adapters/firebase/FirestoreSentimentAdapter';
import { FakeFirestore } from './fakeFirestore';

function adapter(): FirestoreSentimentAdapter {
    return new FirestoreSentimentAdapter(new FakeFirestore() as unknown as Firestore);
}

describe('FirestoreSentimentAdapter', () => {
    it('saves and lists a result', async () => {
        const sentiment = adapter();
        const saved = await sentiment.saveResult({ retrospectiveId: 'b1', cardId: 'c1', sentiment: 'positive', confidence: 0.9, contentHash: 'h1' });
        expect(saved.sentiment).toBe('positive');
        expect(saved.isOverride).toBe(false);

        const list = await sentiment.listResults('b1');
        expect(list).toHaveLength(1);
    });

    it('does not overwrite when contentHash is unchanged', async () => {
        const sentiment = adapter();
        await sentiment.saveResult({ retrospectiveId: 'b1', cardId: 'c1', sentiment: 'positive', confidence: 0.9, contentHash: 'h1' });
        const second = await sentiment.saveResult({ retrospectiveId: 'b1', cardId: 'c1', sentiment: 'negative', confidence: 0.5, contentHash: 'h1' });
        expect(second.sentiment).toBe('positive');
    });

    it('overwrites when contentHash changes', async () => {
        const sentiment = adapter();
        await sentiment.saveResult({ retrospectiveId: 'b1', cardId: 'c1', sentiment: 'positive', confidence: 0.9, contentHash: 'h1' });
        const second = await sentiment.saveResult({ retrospectiveId: 'b1', cardId: 'c1', sentiment: 'negative', confidence: 0.5, contentHash: 'h2' });
        expect(second.sentiment).toBe('negative');
    });

    it('never lets a new auto-analysis overwrite a manual override', async () => {
        const sentiment = adapter();
        await sentiment.saveOverride('b1', 'c1', 'neutral', 'facilitator-1');
        const result = await sentiment.saveResult({ retrospectiveId: 'b1', cardId: 'c1', sentiment: 'positive', confidence: 0.9, contentHash: 'h1' });
        expect(result.isOverride).toBe(true);
        expect(result.sentiment).toBe('neutral');
    });

    it('sets isOverride/overrideBy/confidence on override', async () => {
        const sentiment = adapter();
        const result = await sentiment.saveOverride('b1', 'c1', 'negative', 'facilitator-1');
        expect(result.isOverride).toBe(true);
        expect(result.overrideBy).toBe('facilitator-1');
        expect(result.confidence).toBe(1);
    });

    it('deletes a result', async () => {
        const sentiment = adapter();
        await sentiment.saveResult({ retrospectiveId: 'b1', cardId: 'c1', sentiment: 'positive', confidence: 0.9, contentHash: 'h1' });
        await sentiment.deleteResult('b1', 'c1');
        expect(await sentiment.listResults('b1')).toHaveLength(0);
    });
});
