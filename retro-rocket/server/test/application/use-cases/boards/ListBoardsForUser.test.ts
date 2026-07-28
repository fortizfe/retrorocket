import { describe, it, expect } from 'vitest';
import { listBoardsForUser } from '../../../../src/application/use-cases/boards/ListBoardsForUser';
import { inMemoryBoardsPort, type FakeBoardRecord } from './boardsFakes';

function board(overrides: Partial<FakeBoardRecord>): FakeBoardRecord {
    return {
        id: 'b',
        title: 'Board',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        participantCount: 1,
        isActive: true,
        createdBy: 'someone',
        ...overrides,
    };
}

describe('listBoardsForUser', () => {
    it('returns boards the user created and boards they joined, correctly flagged, with no duplicates', async () => {
        const boardsPort = inMemoryBoardsPort(
            [
                board({ id: 'b1', title: 'Mine', createdBy: 'u1' }),
                board({ id: 'b2', title: 'Theirs', createdBy: 'u2' }),
                board({ id: 'b3', title: 'Unrelated', createdBy: 'u3' }),
            ],
            [{ boardId: 'b2', uid: 'u1' }],
        );

        const result = await listBoardsForUser({ boardsPort }, 'u1');

        expect(result).toHaveLength(2);
        expect(result.find((b) => b.id === 'b1')).toMatchObject({ isCreator: true });
        expect(result.find((b) => b.id === 'b2')).toMatchObject({ isCreator: false });
        expect(result.find((b) => b.id === 'b3')).toBeUndefined();
    });

    it('returns an empty list for a user with no boards', async () => {
        const boardsPort = inMemoryBoardsPort();
        expect(await listBoardsForUser({ boardsPort }, 'ghost')).toEqual([]);
    });
});
