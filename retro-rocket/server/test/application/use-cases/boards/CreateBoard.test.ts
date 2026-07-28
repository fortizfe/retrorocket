import { describe, it, expect } from 'vitest';
import { createBoard } from '../../../../src/application/use-cases/boards/CreateBoard';
import { inMemoryBoardsPort } from './boardsFakes';
import { AppError } from '../../../../src/domain/errors';

describe('createBoard', () => {
    it('creates a board with the trimmed title and the requesting user as owner', async () => {
        const boardsPort = inMemoryBoardsPort();
        const result = await createBoard(
            { boardsPort },
            { templateId: 'default', title: '  My Board  ', locale: 'en', createdBy: 'u1', createdByName: 'User One' },
        );

        expect(result.boardId).toBeTruthy();
        const boards = await boardsPort.listBoardsForUser('u1');
        expect(boards).toHaveLength(1);
        expect(boards[0]).toMatchObject({ title: 'My Board', createdBy: 'u1', isCreator: true });
    });

    it.each(['default', 'madSadGlad', 'startStopContinue'] as const)('accepts the %s template', async (templateId) => {
        const boardsPort = inMemoryBoardsPort();
        await expect(
            createBoard({ boardsPort }, { templateId, title: 'X', locale: 'en', createdBy: 'u1', createdByName: 'U' }),
        ).resolves.toMatchObject({ boardId: expect.any(String) });
    });

    it('rejects an unknown templateId', async () => {
        const boardsPort = inMemoryBoardsPort();
        await expect(
            createBoard({ boardsPort }, { templateId: 'nope', title: 'X', locale: 'en', createdBy: 'u1', createdByName: 'U' }),
        ).rejects.toThrow(AppError);
    });

    it('rejects an empty (or whitespace-only) title', async () => {
        const boardsPort = inMemoryBoardsPort();
        await expect(
            createBoard({ boardsPort }, { templateId: 'default', title: '   ', locale: 'en', createdBy: 'u1', createdByName: 'U' }),
        ).rejects.toThrow(AppError);
    });
});
