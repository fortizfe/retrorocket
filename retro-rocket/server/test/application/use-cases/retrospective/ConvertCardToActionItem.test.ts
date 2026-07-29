import { describe, it, expect } from 'vitest';
import { convertCardToActionItem } from '../../../../src/application/use-cases/retrospective/ConvertCardToActionItem';
import { createRetrospectiveFakeStore } from './retrospectiveFakes';
import { ForbiddenError, NotFoundError } from '../../../../src/domain/errors';

function seedStore() {
    return createRetrospectiveFakeStore({
        retrospectives: [
            {
                id: 'r1',
                title: 'Board',
                createdBy: 'facilitator-uid',
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 1,
                isActive: true,
                columnGroupingStates: {},
            },
        ],
        cards: [
            {
                id: 'card-1',
                content: 'Something we learned',
                column: 'helped',
                createdBy: 'participant-uid',
                createdAt: new Date(),
                updatedAt: new Date(),
                retrospectiveId: 'r1',
                votes: 0,
                likes: [],
                reactions: [],
                order: 0,
            },
        ],
    });
}

describe('convertCardToActionItem', () => {
    it("creates an action item from the card's content, attributed to the facilitator", async () => {
        const { cardPort, actionItemPort, retrospectiveBoardPort } = seedStore();
        const item = await convertCardToActionItem(
            { cardPort, actionItemPort, retrospectiveBoardPort },
            { cardId: 'card-1', uid: 'facilitator-uid', assignedTo: 'participant-uid', assignedToName: 'Participant', dueDate: null },
        );
        expect(item).toMatchObject({
            retrospectiveId: 'r1',
            content: 'Something we learned',
            createdBy: 'facilitator-uid',
            assignedTo: 'participant-uid',
            assignedToName: 'Participant',
        });
    });

    it('rejects a non-facilitator with ForbiddenError', async () => {
        const { cardPort, actionItemPort, retrospectiveBoardPort } = seedStore();
        await expect(
            convertCardToActionItem({ cardPort, actionItemPort, retrospectiveBoardPort }, { cardId: 'card-1', uid: 'someone-else' }),
        ).rejects.toThrow(ForbiddenError);
    });

    it('throws NotFoundError for a nonexistent card', async () => {
        const { cardPort, actionItemPort, retrospectiveBoardPort } = seedStore();
        await expect(
            convertCardToActionItem({ cardPort, actionItemPort, retrospectiveBoardPort }, { cardId: 'does-not-exist', uid: 'facilitator-uid' }),
        ).rejects.toThrow(NotFoundError);
    });
});
