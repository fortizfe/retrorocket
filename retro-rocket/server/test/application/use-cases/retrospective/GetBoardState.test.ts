import { describe, it, expect } from 'vitest';
import { getBoardState } from '../../../../src/application/use-cases/retrospective/GetBoardState';
import { createRetrospectiveFakeStore } from './retrospectiveFakes';
import { NotFoundError } from '../../../../src/domain/errors';

function board(overrides: Partial<import('./retrospectiveFakes').FakeRetrospectiveRecord> = {}) {
    return {
        id: 'r1',
        title: 'Sprint Retro',
        createdBy: 'facilitator-uid',
        createdAt: new Date(),
        updatedAt: new Date(),
        participantCount: 1,
        isActive: true,
        columnGroupingStates: {},
        ...overrides,
    };
}

describe('getBoardState', () => {
    it('assembles the full board state — columns, cards, groups, actionItems, participants, timer, sentimentResults', async () => {
        const store = createRetrospectiveFakeStore({
            retrospectives: [board()],
            columns: [{ id: 'col1', i18nKey: 'columns.went_well', type: 'regular', order: 0, defaultColor: 'green' }],
            cards: [{ id: 'c1', content: 'x', column: 'col1', createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(), retrospectiveId: 'r1', votes: 0, likes: [], reactions: [], order: 0 }],
        });

        const result = await getBoardState({ ...store }, { retrospectiveId: 'r1', uid: 'u1' });

        expect(result.id).toBe('r1');
        expect(result.columns).toHaveLength(1);
        expect(result.cards).toHaveLength(1);
        expect(result.groups).toEqual([]);
        expect(result.actionItems).toEqual([]);
        expect(result.timer).toBeNull();
        expect(result.sentimentResults).toEqual([]);
        expect(result.isFacilitator).toBe(false);
    });

    it('sets isFacilitator=true and includes myFacilitatorNotes only when the caller is the board creator', async () => {
        const store = createRetrospectiveFakeStore({
            retrospectives: [board()],
            facilitatorNotes: [{ id: 'n1', content: 'private note', timestamp: new Date(), retrospectiveId: 'r1', facilitatorId: 'facilitator-uid' }],
        });

        const asFacilitator = await getBoardState({ ...store }, { retrospectiveId: 'r1', uid: 'facilitator-uid' });
        expect(asFacilitator.isFacilitator).toBe(true);
        expect(asFacilitator.myFacilitatorNotes).toHaveLength(1);

        const asParticipant = await getBoardState({ ...store }, { retrospectiveId: 'r1', uid: 'someone-else' });
        expect(asParticipant.isFacilitator).toBe(false);
        expect(asParticipant.myFacilitatorNotes).toEqual([]);
    });

    it('throws NotFoundError for a nonexistent board', async () => {
        const store = createRetrospectiveFakeStore();
        await expect(getBoardState({ ...store }, { retrospectiveId: 'missing', uid: 'u1' })).rejects.toThrow(NotFoundError);
    });
});
