import { describe, it, expect, vi } from 'vitest';
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

    // 051-anonymous-board-mode, T017: the adapter (not this use-case) is responsible
    // for defaulting an omitted isAnonymous to false (data-model.md) — this use-case's
    // only job is to pass whatever the caller provided straight through unchanged.
    it('passes isAnonymous through unchanged to boardsPort.createBoard when provided', async () => {
        const boardsPort = inMemoryBoardsPort();
        const createBoardSpy = vi.spyOn(boardsPort, 'createBoard');

        await createBoard(
            { boardsPort },
            { templateId: 'default', title: 'X', locale: 'en', createdBy: 'u1', createdByName: 'U', isAnonymous: true },
        );

        expect(createBoardSpy).toHaveBeenCalledWith(expect.objectContaining({ isAnonymous: true }));
    });

    it('leaves isAnonymous undefined on boardsPort.createBoard when the caller omits it', async () => {
        const boardsPort = inMemoryBoardsPort();
        const createBoardSpy = vi.spyOn(boardsPort, 'createBoard');

        await createBoard(
            { boardsPort },
            { templateId: 'default', title: 'X', locale: 'en', createdBy: 'u1', createdByName: 'U' },
        );

        expect(createBoardSpy).toHaveBeenCalledTimes(1);
        expect(createBoardSpy.mock.calls[0][0].isAnonymous).toBeUndefined();
    });
});
