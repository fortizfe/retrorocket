import { describe, expect, it } from 'vitest';
import { createBoard } from '../../../../src/application/use-cases/boards/CreateBoard';
import { AppError } from '../../../../src/domain/errors';
import { inMemoryBoardStore } from './fakes';

describe('createBoard', () => {
    it('creates a board with the template columns plus the automatic action-items column', async () => {
        const boardWritePort = inMemoryBoardStore();

        const board = await createBoard(
            { boardWritePort },
            { templateId: 'default', title: 'Sprint 42 Retro', createdBy: 'u1', createdByName: 'Ana', locale: 'en' },
        );

        expect(board.title).toBe('Sprint 42 Retro');
        expect(board.templateId).toBe('default');
        expect(board.createdBy).toBe('u1');
        expect(board.isActive).toBe(true);
        expect(board.participantCount).toBe(0);
        expect(board.columns.map((c) => c.id)).toEqual(['helped', 'hindered', 'improve', 'actionItems']);
        expect(board.columns.at(-1)).toMatchObject({ type: 'action' });
    });

    it('creates boards for each valid template with the correct column set', async () => {
        const boardWritePort = inMemoryBoardStore();

        const madSadGlad = await createBoard(
            { boardWritePort },
            { templateId: 'madSadGlad', title: 'MSG', createdBy: 'u1', createdByName: 'Ana', locale: 'en' },
        );
        expect(madSadGlad.columns.map((c) => c.id)).toEqual(['mad', 'sad', 'glad', 'actionItems']);

        const startStopContinue = await createBoard(
            { boardWritePort },
            { templateId: 'startStopContinue', title: 'SSC', createdBy: 'u1', createdByName: 'Ana', locale: 'en' },
        );
        expect(startStopContinue.columns.map((c) => c.id)).toEqual(['start', 'stop', 'continue', 'actionItems']);
    });

    it('rejects an unknown template id', async () => {
        const boardWritePort = inMemoryBoardStore();

        await expect(
            createBoard(
                { boardWritePort },
                { templateId: 'not-a-template', title: 'X', createdBy: 'u1', createdByName: 'Ana', locale: 'en' },
            ),
        ).rejects.toThrow(AppError);
    });

    it('rejects an empty title', async () => {
        const boardWritePort = inMemoryBoardStore();

        await expect(
            createBoard(
                { boardWritePort },
                { templateId: 'default', title: '   ', createdBy: 'u1', createdByName: 'Ana', locale: 'en' },
            ),
        ).rejects.toThrow(AppError);
    });
});
