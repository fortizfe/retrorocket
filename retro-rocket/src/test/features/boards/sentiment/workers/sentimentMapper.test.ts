import { describe, it, expect } from 'vitest';
import { mapSentiment } from '@/features/boards/sentiment/workers/sentimentMapper';
import { SENTIMENT_MODELS } from '@/features/boards/types/sentiment';

const ROBERTA = 'Xenova/twitter-roberta-base-sentiment-latest';
const ROBERTUITO = 'Xenova/robertuito-sentiment-analysis';
const DISTILBERT = SENTIMENT_MODELS[0].id;
const STAR = 'Xenova/bert-base-multilingual-uncased-sentiment';

describe('mapSentiment — per-model label mapping to the 3-category taxonomy (FR-004)', () => {
    it('maps twitter-roberta readable labels', () => {
        expect(mapSentiment([{ label: 'positive', score: 0.9 }], ROBERTA).sentiment).toBe('positive');
        expect(mapSentiment([{ label: 'negative', score: 0.9 }], ROBERTA).sentiment).toBe('negative');
        expect(mapSentiment([{ label: 'neutral', score: 0.9 }], ROBERTA).sentiment).toBe('neutral');
    });

    it('maps twitter-roberta LABEL_0/1/2 scheme', () => {
        expect(mapSentiment([{ label: 'LABEL_2', score: 0.8 }], ROBERTA).sentiment).toBe('positive');
        expect(mapSentiment([{ label: 'LABEL_0', score: 0.8 }], ROBERTA).sentiment).toBe('negative');
        expect(mapSentiment([{ label: 'LABEL_1', score: 0.8 }], ROBERTA).sentiment).toBe('neutral');
    });

    it('maps RoBERTuito POS/NEG/NEU labels', () => {
        expect(mapSentiment([{ label: 'POS', score: 0.7 }], ROBERTUITO).sentiment).toBe('positive');
        expect(mapSentiment([{ label: 'NEG', score: 0.7 }], ROBERTUITO).sentiment).toBe('negative');
        expect(mapSentiment([{ label: 'NEU', score: 0.7 }], ROBERTUITO).sentiment).toBe('neutral');
    });

    it('maps the distilbert multilingual default labels', () => {
        expect(mapSentiment([{ label: 'positive', score: 0.6 }], DISTILBERT).sentiment).toBe('positive');
        expect(mapSentiment([{ label: 'negative', score: 0.6 }], DISTILBERT).sentiment).toBe('negative');
    });

    it('maps the star-rating fallback model (1-5 stars)', () => {
        expect(mapSentiment([{ label: '1 star', score: 0.5 }], STAR).sentiment).toBe('negative');
        expect(mapSentiment([{ label: '3 stars', score: 0.5 }], STAR).sentiment).toBe('neutral');
        expect(mapSentiment([{ label: '5 stars', score: 0.5 }], STAR).sentiment).toBe('positive');
    });

    it('preserves the model score as confidence and is safe on empty output', () => {
        expect(mapSentiment([{ label: 'POS', score: 0.42 }], ROBERTUITO).confidence).toBeCloseTo(0.42, 2);
        expect(mapSentiment([], ROBERTA)).toEqual({ sentiment: 'neutral', confidence: 0 });
    });
});
