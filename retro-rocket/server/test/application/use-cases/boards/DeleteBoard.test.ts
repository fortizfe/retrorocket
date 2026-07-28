import { describe, it, expect } from 'vitest';
import { deleteBoard } from '../../../../src/application/use-cases/boards/DeleteBoard';
import { inMemoryBoardsPort, type FakeBoardRecord } from './boardsFakes';
import { ForbiddenError, NotFoundError } from '../../../../src/domain/errors';

function board(overrides: Partial<FakeBoardRecord>): FakeBoardRecord {
    return {
        id: 'b1',
        title: 'Board',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        participantCount: 1,
        isActive: true,
        createdBy: 'owner',
        ...overrides,
    };
}

describe('deleteBoard', () => {
    it('deletes a board the caller owns', async () => {
        const boardsPort = inMemoryBoardsPort([board({})]);
        await deleteBoard({ boardsPort }, { boardId: 'b1', uid: 'owner' });
        expect(await boardsPort.getBoard('b1')).toBeNull();
    });

    it('rejects a non-owner with ForbiddenError, leaving the board intact', async () => {
        const boardsPort = inMemoryBoardsPort([board({})]);
        await expect(deleteBoard({ boardsPort }, { boardId: 'b1', uid: 'someone-else' })).rejects.toThrow(ForbiddenError);
        expect(await boardsPort.getBoard('b1')).not.toBeNull();
    });

    it('rejects deleting a nonexistent board', async () => {
        const boardsPort = inMemoryBoardsPort([]);
        await expect(deleteBoard({ boardsPort }, { boardId: 'missing', uid: 'u1' })).rejects.toThrow(NotFoundError);
    });
});
