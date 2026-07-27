import { describe, expect, it, vi } from 'vitest';
import { deleteBoardCascade } from '../../../../src/application/use-cases/boards/DeleteBoardCascade';
import { ForbiddenError, NotFoundError } from '../../../../src/domain/errors';
import { inMemoryBoardStore } from './fakes';
import type { BoardWithColumns } from '../../../../src/application/ports/boards';

const BOARD: BoardWithColumns = {
    id: 'b1', title: 'X', templateId: 'default', createdBy: 'owner-1', createdByName: 'Ana', locale: 'en',
    createdAt: new Date(), updatedAt: new Date(), participantCount: 0, isActive: true, columns: [],
};

describe('deleteBoardCascade', () => {
    it('deletes the board for its creator', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);

        await deleteBoardCascade({ boardReadPort: boardStore, boardWritePort: boardStore }, { boardId: 'b1', requesterUid: 'owner-1' });

        expect(await boardStore.getBoard('b1')).toBeNull();
    });

    it('rejects a non-creator with 403 and does not delete', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);

        await expect(
            deleteBoardCascade({ boardReadPort: boardStore, boardWritePort: boardStore }, { boardId: 'b1', requesterUid: 'u2' }),
        ).rejects.toThrow(ForbiddenError);
        expect(await boardStore.getBoard('b1')).not.toBeNull();
    });

    it('rejects a nonexistent board', async () => {
        const boardStore = inMemoryBoardStore([]);

        await expect(
            deleteBoardCascade({ boardReadPort: boardStore, boardWritePort: boardStore }, { boardId: 'missing', requesterUid: 'owner-1' }),
        ).rejects.toThrow(NotFoundError);
    });

    it('delegates the actual cascade to the port (cross-collection cleanup is an adapter-level concern)', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const cascadeSpy = vi.spyOn(boardStore, 'deleteBoardCascade');

        await deleteBoardCascade({ boardReadPort: boardStore, boardWritePort: boardStore }, { boardId: 'b1', requesterUid: 'owner-1' });

        expect(cascadeSpy).toHaveBeenCalledWith('b1');
    });
});
