import { describe, it, expect } from 'vitest';
import { isFresh } from '@/features/boards/sentiment/domain/staleness';
import { hashContent } from '@/features/boards/sentiment/domain/contentHash';
import type { SentimentResult } from '@/features/boards/types/sentiment';

const TEXT = 'the team did great work';
const MODEL = 'model-a';
const VERSION = 'hf-transformers-3';

function stored(overrides: Partial<SentimentResult> = {}): SentimentResult {
    return {
        cardId: 'c',
        sentiment: 'positive',
        confidence: 0.9,
        timestamp: new Date(),
        contentHash: hashContent(TEXT),
        modelId: MODEL,
        modelVersion: VERSION,
        ...overrides,
    };
}

describe('isFresh', () => {
    it('is true only when content hash, model id, and model version all match', () => {
        expect(isFresh(stored(), TEXT, MODEL, VERSION)).toBe(true);
    });

    it('is stale when the text changed', () => {
        expect(isFresh(stored(), 'different text now', MODEL, VERSION)).toBe(false);
    });

    it('is stale when the model id changed', () => {
        expect(isFresh(stored(), TEXT, 'model-b', VERSION)).toBe(false);
    });

    it('is stale when the model version changed', () => {
        expect(isFresh(stored(), TEXT, MODEL, 'hf-transformers-4')).toBe(false);
    });

    it('treats an override as always fresh regardless of text or model', () => {
        const override = stored({ isOverride: true, contentHash: 'anything', modelId: '', modelVersion: '' });
        expect(isFresh(override, 'totally new text', 'other-model', 'other-version')).toBe(true);
    });

    it('is false for a missing stored result', () => {
        expect(isFresh(undefined, TEXT, MODEL, VERSION)).toBe(false);
    });
});
