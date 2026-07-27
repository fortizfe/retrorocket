import { describe, expect, it } from 'vitest';
import { saveSentimentResult } from '../../../../src/application/use-cases/boards/SaveSentimentResult';
import { overrideSentimentResult } from '../../../../src/application/use-cases/boards/OverrideSentimentResult';
import { deleteSentimentResult } from '../../../../src/application/use-cases/boards/DeleteSentimentResult';
import { ForbiddenError, NotFoundError } from '../../../../src/domain/errors';
import { inMemoryBoardStore } from './fakes';
import { inMemorySentimentStore } from './facilitatorFakes';
import type { BoardWithColumns } from '../../../../src/application/ports/boards';

const BOARD: BoardWithColumns = {
    id: 'b1',
    title: 'Sprint 42 Retro',
    templateId: 'default',
    createdBy: 'facilitator-1',
    createdByName: 'Ana',
    locale: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    participantCount: 1,
    isActive: true,
    columns: [],
};

describe('saveSentimentResult', () => {
    it('saves a new result (any participant)', async () => {
        const sentimentPort = inMemorySentimentStore();

        const result = await saveSentimentResult({ sentimentPort }, { retrospectiveId: 'b1', cardId: 'c1', sentiment: 'positive', confidence: 0.9, contentHash: 'h1' });

        expect(result.sentiment).toBe('positive');
        expect(result.isOverride).toBe(false);
    });

    it('does not overwrite when contentHash is unchanged (upsert-if-changed semantics)', async () => {
        const sentimentPort = inMemorySentimentStore();
        await saveSentimentResult({ sentimentPort }, { retrospectiveId: 'b1', cardId: 'c1', sentiment: 'positive', confidence: 0.9, contentHash: 'h1' });

        const second = await saveSentimentResult({ sentimentPort }, { retrospectiveId: 'b1', cardId: 'c1', sentiment: 'negative', confidence: 0.5, contentHash: 'h1' });

        expect(second.sentiment).toBe('positive');
    });

    it('overwrites when contentHash changes', async () => {
        const sentimentPort = inMemorySentimentStore();
        await saveSentimentResult({ sentimentPort }, { retrospectiveId: 'b1', cardId: 'c1', sentiment: 'positive', confidence: 0.9, contentHash: 'h1' });

        const second = await saveSentimentResult({ sentimentPort }, { retrospectiveId: 'b1', cardId: 'c1', sentiment: 'negative', confidence: 0.5, contentHash: 'h2' });

        expect(second.sentiment).toBe('negative');
    });

    it('never lets an auto-analysis overwrite a manual override (FR-014, last-write-wins scoped to same-kind writes only)', async () => {
        const sentimentPort = inMemorySentimentStore();
        await sentimentPort.saveOverride('b1', 'c1', 'neutral', 'facilitator-1');

        const result = await saveSentimentResult({ sentimentPort }, { retrospectiveId: 'b1', cardId: 'c1', sentiment: 'positive', confidence: 0.9, contentHash: 'h1' });

        expect(result.isOverride).toBe(true);
        expect(result.sentiment).toBe('neutral');
    });
});

describe('overrideSentimentResult', () => {
    it('overrides as the facilitator', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const sentimentPort = inMemorySentimentStore();

        const result = await overrideSentimentResult({ boardReadPort: boardStore, sentimentPort }, { boardId: 'b1', cardId: 'c1', requesterUid: 'facilitator-1', sentiment: 'negative' });

        expect(result.isOverride).toBe(true);
        expect(result.overrideBy).toBe('facilitator-1');
        expect(result.confidence).toBe(1);
    });

    it('rejects a non-facilitator', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const sentimentPort = inMemorySentimentStore();

        await expect(
            overrideSentimentResult({ boardReadPort: boardStore, sentimentPort }, { boardId: 'b1', cardId: 'c1', requesterUid: 'u2', sentiment: 'negative' }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('rejects a nonexistent board', async () => {
        const boardStore = inMemoryBoardStore([]);
        const sentimentPort = inMemorySentimentStore();

        await expect(
            overrideSentimentResult({ boardReadPort: boardStore, sentimentPort }, { boardId: 'missing', cardId: 'c1', requesterUid: 'facilitator-1', sentiment: 'negative' }),
        ).rejects.toThrow(NotFoundError);
    });
});

describe('deleteSentimentResult', () => {
    it('deletes the result', async () => {
        const sentimentPort = inMemorySentimentStore();
        await saveSentimentResult({ sentimentPort }, { retrospectiveId: 'b1', cardId: 'c1', sentiment: 'positive', confidence: 0.9, contentHash: 'h1' });

        await deleteSentimentResult({ sentimentPort }, { boardId: 'b1', cardId: 'c1' });

        expect(await sentimentPort.listResults('b1')).toHaveLength(0);
    });
});
