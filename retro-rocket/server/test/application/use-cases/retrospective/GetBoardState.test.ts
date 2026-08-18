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

    // spec 046, FR-009/SC-005: a group persisted before the fix (or by any other bug)
    // with a `column` that doesn't match its head card's actual column must be
    // self-healed on the very next board load — both in the response and in storage,
    // so it stays fixed on every subsequent load too, not just this one.
    it("repairs a group's column to match its head card's actual column, and persists the correction (spec 046, FR-009)", async () => {
        const store = createRetrospectiveFakeStore({
            retrospectives: [board()],
            cards: [{ id: 'c1', content: 'x', column: 'col1', createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(), retrospectiveId: 'r1', votes: 0, likes: [], reactions: [], order: 0 }],
            groups: [{ id: 'g1', retrospectiveId: 'r1', column: '', headCardId: 'c1', memberCardIds: [], isCollapsed: false, createdAt: new Date(), createdBy: 'u1', order: 0 }],
        });

        const result = await getBoardState({ ...store }, { retrospectiveId: 'r1', uid: 'u1' });
        expect(result.groups).toHaveLength(1);
        expect(result.groups[0].column).toBe('col1');

        const persisted = await store.cardGroupPort.listGroups('r1');
        expect(persisted[0].column).toBe('col1');
    });

    it("leaves an already-correct group's column untouched (no unnecessary repair)", async () => {
        const store = createRetrospectiveFakeStore({
            retrospectives: [board()],
            cards: [{ id: 'c1', content: 'x', column: 'col1', createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(), retrospectiveId: 'r1', votes: 0, likes: [], reactions: [], order: 0 }],
            groups: [{ id: 'g1', retrospectiveId: 'r1', column: 'col1', headCardId: 'c1', memberCardIds: [], isCollapsed: false, createdAt: new Date(), createdBy: 'u1', order: 0 }],
        });

        const result = await getBoardState({ ...store }, { retrospectiveId: 'r1', uid: 'u1' });
        expect(result.groups[0].column).toBe('col1');
    });

    // 051-anonymous-board-mode, anonymity-api-contract.md: GET /api/retrospectives/:id's
    // board state must include isAnonymous, matching whatever the board port's
    // getRetrospective() returns — this use-case spreads the whole board DTO
    // (`{ ...board, isFacilitator, ... }`), so this locks in that passthrough contract
    // explicitly rather than relying on it being incidental. NOTE: this test may
    // already pass with zero production changes to GetBoardState.ts once the
    // FirestoreRetrospectiveBoardAdapter's toRetrospective() default (adapter task)
    // lands, since retrospectiveFakes.ts's getRetrospective() already defaults
    // isAnonymous to false — it's written anyway to pin the contract down.
    it('includes isAnonymous in the resolved board state, matching the board port', async () => {
        const notAnonymous = createRetrospectiveFakeStore({ retrospectives: [board({ isAnonymous: false })] });
        const resultFalse = await getBoardState({ ...notAnonymous }, { retrospectiveId: 'r1', uid: 'u1' });
        expect(resultFalse.isAnonymous).toBe(false);

        const anonymous = createRetrospectiveFakeStore({ retrospectives: [board({ isAnonymous: true })] });
        const resultTrue = await getBoardState({ ...anonymous }, { retrospectiveId: 'r1', uid: 'u1' });
        expect(resultTrue.isAnonymous).toBe(true);
    });
});
