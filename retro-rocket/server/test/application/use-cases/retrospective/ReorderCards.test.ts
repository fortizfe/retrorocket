import { describe, it, expect, vi } from 'vitest';
import { reorderCards } from '../../../../src/application/use-cases/retrospective/ReorderCards';
import type { CardPort } from '../../../../src/application/ports/cards';

function fakeCardPort(): CardPort {
    return {
        listCards: vi.fn(async () => []),
        createCard: vi.fn(),
        editCard: vi.fn(),
        deleteCard: vi.fn(),
        voteCard: vi.fn(),
        toggleLike: vi.fn(),
        setReaction: vi.fn(),
        removeReaction: vi.fn(),
        reorderCards: vi.fn(async () => {}),
        getCard: vi.fn(),
    };
}

describe('reorderCards', () => {
    it('delegates the full batch to the port in one atomic call', async () => {
        const cardPort = fakeCardPort();
        const updates = [
            { cardId: 'c1', order: 0 },
            { cardId: 'c2', order: 1, column: 'col2' },
        ];
        await reorderCards({ cardPort }, { retrospectiveId: 'r1', updates });
        expect(cardPort.reorderCards).toHaveBeenCalledTimes(1);
        expect(cardPort.reorderCards).toHaveBeenCalledWith('r1', updates);
    });
});
