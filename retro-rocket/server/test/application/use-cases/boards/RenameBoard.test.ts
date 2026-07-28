import { describe, it, expect } from 'vitest';
import { renameBoard } from '../../../../src/application/use-cases/boards/RenameBoard';
import { inMemoryBoardsPort, type FakeBoardRecord } from './boardsFakes';
import { AppError, ForbiddenError, NotFoundError } from '../../../../src/domain/errors';

function board(overrides: Partial<FakeBoardRecord>): FakeBoardRecord {
    return {
        id: 'b1',
        title: 'Old Title',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        participantCount: 1,
        isActive: true,
        createdBy: 'owner',
        ...overrides,
    };
}

describe('renameBoard', () => {
    it('renames a board the caller owns', async () => {
        const boardsPort = inMemoryBoardsPort([board({})]);
        await renameBoard({ boardsPort }, { boardId: 'b1', uid: 'owner', title: 'New Title' });
        const [updated] = await boardsPort.listBoardsForUser('owner');
        expect(updated.title).toBe('New Title');
    });

    it('rejects a non-owner with ForbiddenError, leaving the title unchanged', async () => {
        const boardsPort = inMemoryBoardsPort([board({})]);
        await expect(
            renameBoard({ boardsPort }, { boardId: 'b1', uid: 'someone-else', title: 'Hijack' }),
        ).rejects.toThrow(ForbiddenError);
        const [unchanged] = await boardsPort.listBoardsForUser('owner');
        expect(unchanged.title).toBe('Old Title');
    });

    it('rejects an empty title without calling the port', async () => {
        const boardsPort = inMemoryBoardsPort([board({})]);
        await expect(renameBoard({ boardsPort }, { boardId: 'b1', uid: 'owner', title: '   ' })).rejects.toThrow(AppError);
    });

    it('rejects renaming a nonexistent board', async () => {
        const boardsPort = inMemoryBoardsPort([]);
        await expect(renameBoard({ boardsPort }, { boardId: 'missing', uid: 'u1', title: 'X' })).rejects.toThrow(NotFoundError);
    });
});
