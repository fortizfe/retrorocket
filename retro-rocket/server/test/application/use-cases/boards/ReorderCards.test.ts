import { describe, expect, it } from 'vitest';
import { reorderCards } from '../../../../src/application/use-cases/boards/ReorderCards';
import { inMemoryCardStore } from './cardFakes';
import type { Card } from '../../../../src/application/ports/cards';

const CARD_A: Card = { id: 'c1', retrospectiveId: 'b1', content: 'A', column: 'helped', createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(), likes: [], reactions: [], order: 0 };
const CARD_B: Card = { id: 'c2', retrospectiveId: 'b1', content: 'B', column: 'helped', createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(), likes: [], reactions: [], order: 1 };

describe('reorderCards', () => {
    it('applies every order/column update in one call', async () => {
        const cardPort = inMemoryCardStore([CARD_A, CARD_B]);
        await reorderCards({ cardPort }, { updates: [{ cardId: 'c1', order: 5 }, { cardId: 'c2', order: 1, column: 'improve' }] });

        const a = await cardPort.getCard('c1');
        const b = await cardPort.getCard('c2');
        expect(a?.order).toBe(5);
        expect(b?.order).toBe(1);
        expect(b?.column).toBe('improve');
    });

    it('is a no-op for an empty update list', async () => {
        const cardPort = inMemoryCardStore([CARD_A]);
        await expect(reorderCards({ cardPort }, { updates: [] })).resolves.toBeUndefined();
    });
});
