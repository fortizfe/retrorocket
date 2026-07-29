import { describe, it, expect } from 'vitest';
import { saveSentimentResult, saveSentimentOverride } from '../../../../src/application/use-cases/retrospective/Sentiment';
import { createRetrospectiveFakeStore } from './retrospectiveFakes';
import { ForbiddenError, NotFoundError } from '../../../../src/domain/errors';

function seedStore() {
    return createRetrospectiveFakeStore({
        retrospectives: [
            {
                id: 'r1',
                title: 'Board',
                createdBy: 'facilitator-uid',
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 1,
                isActive: true,
                columnGroupingStates: {},
            },
        ],
        cards: [
            {
                id: 'card-1',
                content: 'Something we learned',
                column: 'helped',
                createdBy: 'participant-uid',
                createdAt: new Date(),
                updatedAt: new Date(),
                retrospectiveId: 'r1',
                votes: 0,
                likes: [],
                reactions: [],
                order: 0,
            },
        ],
    });
}

describe('saveSentimentResult', () => {
    it('saves a computed result for the card — any participant', async () => {
        const { cardPort, sentimentResultPort } = seedStore();
        const result = await saveSentimentResult(
            { cardPort, sentimentResultPort },
            { cardId: 'card-1', sentiment: 'positive', confidence: 0.9, contentHash: 'hash1' },
        );
        expect(result).toMatchObject({ retrospectiveId: 'r1', cardId: 'card-1', sentiment: 'positive', confidence: 0.9, contentHash: 'hash1' });
    });

    it('throws NotFoundError for a nonexistent card', async () => {
        const { cardPort, sentimentResultPort } = seedStore();
        await expect(
            saveSentimentResult({ cardPort, sentimentResultPort }, { cardId: 'does-not-exist', sentiment: 'positive', confidence: 0.9, contentHash: 'hash1' }),
        ).rejects.toThrow(NotFoundError);
    });
});

describe('saveSentimentOverride', () => {
    it('saves a manual override for the facilitator', async () => {
        const { cardPort, retrospectiveBoardPort, sentimentResultPort } = seedStore();
        const result = await saveSentimentOverride(
            { cardPort, retrospectiveBoardPort, sentimentResultPort },
            { cardId: 'card-1', uid: 'facilitator-uid', sentiment: 'negative' },
        );
        expect(result).toMatchObject({ retrospectiveId: 'r1', cardId: 'card-1', sentiment: 'negative', isOverride: true, overrideBy: 'facilitator-uid' });
    });

    it('rejects a non-facilitator with ForbiddenError', async () => {
        const { cardPort, retrospectiveBoardPort, sentimentResultPort } = seedStore();
        await expect(
            saveSentimentOverride({ cardPort, retrospectiveBoardPort, sentimentResultPort }, { cardId: 'card-1', uid: 'someone-else', sentiment: 'negative' }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('throws NotFoundError for a nonexistent card', async () => {
        const { cardPort, retrospectiveBoardPort, sentimentResultPort } = seedStore();
        await expect(
            saveSentimentOverride({ cardPort, retrospectiveBoardPort, sentimentResultPort }, { cardId: 'does-not-exist', uid: 'facilitator-uid', sentiment: 'negative' }),
        ).rejects.toThrow(NotFoundError);
    });
});
