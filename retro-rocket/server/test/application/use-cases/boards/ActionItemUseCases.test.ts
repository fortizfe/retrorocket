import { describe, expect, it } from 'vitest';
import { createActionItem } from '../../../../src/application/use-cases/boards/CreateActionItem';
import { convertCardToActionItem } from '../../../../src/application/use-cases/boards/ConvertCardToActionItem';
import { updateActionItem } from '../../../../src/application/use-cases/boards/UpdateActionItem';
import { deleteActionItem } from '../../../../src/application/use-cases/boards/DeleteActionItem';
import { ForbiddenError, NotFoundError } from '../../../../src/domain/errors';
import { inMemoryBoardStore } from './fakes';
import { inMemoryActionItemStore } from './facilitatorFakes';
import type { BoardWithColumns } from '../../../../src/application/ports/boards';

const BOARD: BoardWithColumns = {
    id: 'b1',
    title: 'Sprint 42 Retro',
    templateId: 'default',
    createdBy: 'facilitator-1',
    createdByName: 'Ana',
    locale: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    participantCount: 1,
    isActive: true,
    columns: [],
};

describe('createActionItem', () => {
    it('creates an action item for the facilitator', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const actionItemPort = inMemoryActionItemStore();

        const item = await createActionItem({ boardReadPort: boardStore, actionItemPort }, { boardId: 'b1', requesterUid: 'facilitator-1', content: 'Fix the pipeline', assignedTo: 'u2', assignedToName: 'Bob' });

        expect(item.content).toBe('Fix the pipeline');
        expect(item.assignedTo).toBe('u2');
        expect(item.createdBy).toBe('facilitator-1');
    });

    it('rejects a non-facilitator', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const actionItemPort = inMemoryActionItemStore();

        await expect(
            createActionItem({ boardReadPort: boardStore, actionItemPort }, { boardId: 'b1', requesterUid: 'u2', content: 'Sneaky item' }),
        ).rejects.toThrow(ForbiddenError);
    });
});

describe('convertCardToActionItem', () => {
    it('creates an action item from card content', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const actionItemPort = inMemoryActionItemStore();

        const item = await convertCardToActionItem({ boardReadPort: boardStore, actionItemPort }, { boardId: 'b1', requesterUid: 'facilitator-1', cardContent: 'Speed up CI' });

        expect(item.content).toBe('Speed up CI');
    });

    it('rejects a non-facilitator', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const actionItemPort = inMemoryActionItemStore();

        await expect(
            convertCardToActionItem({ boardReadPort: boardStore, actionItemPort }, { boardId: 'b1', requesterUid: 'u2', cardContent: 'Speed up CI' }),
        ).rejects.toThrow(ForbiddenError);
    });
});

describe('updateActionItem / deleteActionItem', () => {
    it('updates an action item as the facilitator', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const actionItemPort = inMemoryActionItemStore();
        const created = await createActionItem({ boardReadPort: boardStore, actionItemPort }, { boardId: 'b1', requesterUid: 'facilitator-1', content: 'Fix the pipeline' });

        const updated = await updateActionItem({ boardReadPort: boardStore, actionItemPort }, { boardId: 'b1', itemId: created.id, requesterUid: 'facilitator-1', updates: { content: 'Fix the pipeline for real' } });

        expect(updated.content).toBe('Fix the pipeline for real');
    });

    it('rejects a non-facilitator updating', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const actionItemPort = inMemoryActionItemStore();
        const created = await createActionItem({ boardReadPort: boardStore, actionItemPort }, { boardId: 'b1', requesterUid: 'facilitator-1', content: 'Fix the pipeline' });

        await expect(
            updateActionItem({ boardReadPort: boardStore, actionItemPort }, { boardId: 'b1', itemId: created.id, requesterUid: 'u2', updates: { content: 'hijacked' } }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('deletes an action item as the facilitator', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const actionItemPort = inMemoryActionItemStore();
        const created = await createActionItem({ boardReadPort: boardStore, actionItemPort }, { boardId: 'b1', requesterUid: 'facilitator-1', content: 'Fix the pipeline' });

        await deleteActionItem({ boardReadPort: boardStore, actionItemPort }, { boardId: 'b1', itemId: created.id, requesterUid: 'facilitator-1' });

        expect(await actionItemPort.getActionItem(created.id)).toBeNull();
    });

    it('rejects updating an action item from the wrong board', async () => {
        const boardStore = inMemoryBoardStore([BOARD]);
        const actionItemPort = inMemoryActionItemStore([
            { id: 'a1', retrospectiveId: 'other-board', content: 'x', createdBy: 'facilitator-1', assignedTo: null, assignedToName: null, dueDate: null, order: 1, createdAt: new Date(), updatedAt: new Date() },
        ]);

        await expect(
            updateActionItem({ boardReadPort: boardStore, actionItemPort }, { boardId: 'b1', itemId: 'a1', requesterUid: 'facilitator-1', updates: { content: 'y' } }),
        ).rejects.toThrow(NotFoundError);
    });
});
