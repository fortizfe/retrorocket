import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture setDoc payloads.
const setDocCalls: Array<{ id: unknown; data: Record<string, unknown> }> = [];

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(() => ({ __col: true })),
    doc: vi.fn((_col, id) => ({ __id: id })),
    setDoc: vi.fn((ref: { __id: unknown }, data: Record<string, unknown>) => {
        setDocCalls.push({ id: ref.__id, data });
        return Promise.resolve();
    }),
    getDocs: vi.fn(() => Promise.resolve({
        forEach: (cb: (d: { data: () => Record<string, unknown> }) => void) => {
            [
                {
                    cardId: 'card-1', sentiment: 'positive', confidence: 0.9,
                    modelId: 'model-a', modelVersion: 'hf-transformers-3',
                    contentHash: 'HASH-1', isOverride: false,
                    analyzedAt: { toDate: () => new Date('2026-01-01') },
                },
            ].forEach(data => cb({ data: () => data }));
        },
    })),
    deleteDoc: vi.fn(() => Promise.resolve()),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({})),
    serverTimestamp: vi.fn(() => 'SERVER_TS'),
}));

vi.mock('@/lib/services/firebase', () => ({ db: {} }));
vi.mock('@/lib/utils/constants', () => ({ FIRESTORE_COLLECTIONS: { SENTIMENT_RESULTS: 'sentimentResults' } }));

import { SentimentResultsService } from '@/features/boards/sentiment/services/sentimentResultsService';
import type { SentimentResult } from '@/features/boards/types/sentiment';

beforeEach(() => { setDocCalls.length = 0; });

describe('SentimentResultsService.saveResultWithHash', () => {
    it('persists the passed content hash (of card text, not cardId) plus modelId and modelVersion', async () => {
        const result: SentimentResult = {
            cardId: 'card-1', sentiment: 'negative', confidence: 0.8, timestamp: new Date(),
            modelId: 'model-a', modelVersion: 'hf-transformers-3',
        };
        await SentimentResultsService.saveResultWithHash('retro-1', result, 'CONTENT-HASH-XYZ');

        expect(setDocCalls).toHaveLength(1);
        const { id, data } = setDocCalls[0];
        expect(id).toBe('retro-1_card-1');
        expect(data.contentHash).toBe('CONTENT-HASH-XYZ');
        expect(data.modelId).toBe('model-a');
        expect(data.modelVersion).toBe('hf-transformers-3');
        expect(data.isOverride).toBe(false);
    });

    it('defaults modelId/modelVersion to empty strings when absent', async () => {
        const result: SentimentResult = {
            cardId: 'card-2', sentiment: 'neutral', confidence: 0.3, timestamp: new Date(),
        };
        await SentimentResultsService.saveResultWithHash('retro-1', result, 'H');
        expect(setDocCalls[0].data.modelId).toBe('');
        expect(setDocCalls[0].data.modelVersion).toBe('');
    });
});

describe('SentimentResultsService.loadResults', () => {
    it('returns records carrying contentHash, modelId, and modelVersion', async () => {
        const map = await SentimentResultsService.loadResults('retro-1');
        const rec = map.get('card-1')!;
        expect(rec.contentHash).toBe('HASH-1');
        expect(rec.modelId).toBe('model-a');
        expect(rec.modelVersion).toBe('hf-transformers-3');
        expect(rec.sentiment).toBe('positive');
    });
});
