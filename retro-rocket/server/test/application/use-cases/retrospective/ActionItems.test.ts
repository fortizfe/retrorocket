import { describe, it, expect } from 'vitest';
import { createActionItem, editActionItem, deleteActionItem } from '../../../../src/application/use-cases/retrospective/ActionItems';
import { createRetrospectiveFakeStore } from './retrospectiveFakes';
import { AppError, NotFoundError } from '../../../../src/domain/errors';

describe('createActionItem', () => {
    it('creates an action item for the retrospective', async () => {
        const { actionItemPort } = createRetrospectiveFakeStore();
        const item = await createActionItem(
            { actionItemPort },
            { retrospectiveId: 'r1', content: 'Follow up with the team', createdBy: 'u1', assignedTo: 'u2', assignedToName: 'U Two' },
        );
        expect(item).toMatchObject({ retrospectiveId: 'r1', content: 'Follow up with the team', createdBy: 'u1', assignedTo: 'u2', assignedToName: 'U Two' });
    });

    it('rejects empty content', async () => {
        const { actionItemPort } = createRetrospectiveFakeStore();
        await expect(createActionItem({ actionItemPort }, { retrospectiveId: 'r1', content: '   ', createdBy: 'u1' })).rejects.toThrow(AppError);
    });
});

describe('editActionItem/deleteActionItem', () => {
    it('lets any participant edit and delete an action item directly (FR-015 — not restricted to its creator)', async () => {
        const { actionItemPort } = createRetrospectiveFakeStore();
        const item = await createActionItem({ actionItemPort }, { retrospectiveId: 'r1', content: 'Original', createdBy: 'u1' });

        const edited = await editActionItem({ actionItemPort }, { actionItemId: item.id, content: 'Updated' });
        expect(edited.content).toBe('Updated');

        await deleteActionItem({ actionItemPort }, { actionItemId: item.id });
        expect(await actionItemPort.getActionItem(item.id)).toBeNull();
    });

    it('throws NotFoundError for a nonexistent action item', async () => {
        const { actionItemPort } = createRetrospectiveFakeStore();
        await expect(editActionItem({ actionItemPort }, { actionItemId: 'does-not-exist', content: 'x' })).rejects.toThrow(NotFoundError);
        await expect(deleteActionItem({ actionItemPort }, { actionItemId: 'does-not-exist' })).rejects.toThrow(NotFoundError);
    });
});
