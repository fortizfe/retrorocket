import { describe, expect, it } from 'vitest';
import { renameBoard } from '../../../../src/application/use-cases/boards/RenameBoard';
import { ForbiddenError, NotFoundError } from '../../../../src/domain/errors';
import { inMemoryBoardStore } from './fakes';
import type { BoardWithColumns } from '../../../../src/application/ports/boards';

const BOARD: BoardWithColumns = {
    id: 'b1', title: 'Old title', templateId: 'default', createdBy: 'owner-1', createdByName: 'Ana', locale: 'en',
    createdAt: new Date(), updatedAt: new Date(), participantCount: 0, isActive: true, columns: [],
};

describe('renameBoard', () => {
    it('renames the board for its creator', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);

        const result = await renameBoard({ boardReadPort: boardStore, boardWritePort: boardStore }, { boardId: 'b1', requesterUid: 'owner-1', updates: { title: 'New title' } });

        expect(result.title).toBe('New title');
    });

    it('rejects a non-creator with 403', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);

        await expect(
            renameBoard({ boardReadPort: boardStore, boardWritePort: boardStore }, { boardId: 'b1', requesterUid: 'u2', updates: { title: 'Hijacked' } }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('rejects a nonexistent board', async () => {
        const boardStore = inMemoryBoardStore([]);

        await expect(
            renameBoard({ boardReadPort: boardStore, boardWritePort: boardStore }, { boardId: 'missing', requesterUid: 'owner-1', updates: { title: 'X' } }),
        ).rejects.toThrow(NotFoundError);
    });

    it('updates description independently of title', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);

        const result = await renameBoard({ boardReadPort: boardStore, boardWritePort: boardStore }, { boardId: 'b1', requesterUid: 'owner-1', updates: { description: 'New description' } });

        expect(result.title).toBe('Old title');
        expect(result.description).toBe('New description');
    });
});
