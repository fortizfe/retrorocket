import { describe, expect, it } from 'vitest';
import { createCard } from '../../../../src/application/use-cases/boards/CreateCard';
import { AppError } from '../../../../src/domain/errors';
import { inMemoryCardStore } from './cardFakes';

describe('createCard', () => {
    it('creates a card with the given content/column/color', async () => {
        const cardPort = inMemoryCardStore();
        const card = await createCard({ cardPort }, { retrospectiveId: 'b1', content: 'Great sprint', column: 'helped', createdBy: 'u1', color: 'pastelGreen' });
        expect(card.content).toBe('Great sprint');
        expect(card.likes).toEqual([]);
        expect(card.reactions).toEqual([]);
    });

    it('rejects empty content', async () => {
        const cardPort = inMemoryCardStore();
        await expect(createCard({ cardPort }, { retrospectiveId: 'b1', content: '   ', column: 'helped', createdBy: 'u1' })).rejects.toThrow(AppError);
    });
});
