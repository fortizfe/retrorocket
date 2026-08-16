import { describe, it, expect } from 'vitest';
import {
    createCardGroup,
    disbandCardGroup,
    addCardToGroup,
    removeCardFromGroup,
    setGroupCollapse,
    saveColumnGroupingState,
} from '../../../../src/application/use-cases/retrospective/CardGrouping';
import { createRetrospectiveFakeStore } from './retrospectiveFakes';
import { AppError, NotFoundError } from '../../../../src/domain/errors';

function seededCard(overrides: Partial<import('../../../../src/application/ports/cards').CardDTO> = {}) {
    return { id: 'c1', content: 'x', column: 'col1', createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(), retrospectiveId: 'r1', votes: 0, likes: [], reactions: [], order: 0, ...overrides };
}

function seededBoard() {
    return { id: 'r1', title: 'Retro', createdBy: 'facilitator-uid', createdAt: new Date(), updatedAt: new Date(), participantCount: 1, isActive: true, columnGroupingStates: {} };
}

describe('createCardGroup', () => {
    it('creates a group with head + member cards', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c1' }), seededCard({ id: 'c2' })] });
        const group = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c1', memberCardIds: ['c2'], createdBy: 'u1' });
        expect(group).toMatchObject({ headCardId: 'c1', memberCardIds: ['c2'] });
    });

    it('400s when memberCardIds is empty', async () => {
        const store = createRetrospectiveFakeStore();
        await expect(createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c1', memberCardIds: [], createdBy: 'u1' })).rejects.toThrow(AppError);
    });

    // spec 046: the group's column must always be derived from the head card's actual
    // column — the use case takes no `column` input at all anymore — since a
    // caller-supplied value (previously always empty) is the root cause of cards
    // silently disappearing after accepting a grouping suggestion. The route-level
    // test (retrospectives.test.ts) additionally confirms an arbitrary client-supplied
    // `column` in the raw HTTP body is ignored.
    it("derives the group's column from the head card (spec 046, FR-003)", async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c1', column: 'improve' }), seededCard({ id: 'c2', column: 'improve' })] });
        const group = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c1', memberCardIds: ['c2'], createdBy: 'u1' });
        expect(group.column).toBe('improve');
    });

    it('rejects with NotFoundError when headCardId does not correspond to any existing card (spec 046, FR-003)', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c2' })] });
        await expect(
            createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'does-not-exist', memberCardIds: ['c2'], createdBy: 'u1' }),
        ).rejects.toThrow(NotFoundError);
    });
});

describe('disbandCardGroup', () => {
    it('disbands a group', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c1' }), seededCard({ id: 'c2' })] });
        const group = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c1', memberCardIds: ['c2'], createdBy: 'u1' });
        await disbandCardGroup({ ...store }, { groupId: group.id });
        expect(await store.cardGroupPort.getGroup(group.id)).toBeNull();
    });
});

describe('addCardToGroup', () => {
    it('adds a card to an existing group', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c1' }), seededCard({ id: 'c2' }), seededCard({ id: 'c3' })] });
        const group = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c1', memberCardIds: ['c2'], createdBy: 'u1' });
        const updated = await addCardToGroup({ ...store }, { groupId: group.id, cardId: 'c3' });
        expect(updated.memberCardIds).toContain('c3');
    });
});

describe('removeCardFromGroup', () => {
    it('promotes a new head when the head card is removed', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c1' }), seededCard({ id: 'c2' })] });
        const group = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c1', memberCardIds: ['c2'], createdBy: 'u1' });
        const updated = await removeCardFromGroup({ ...store }, { groupId: group.id, cardId: 'c1' });
        expect(updated?.headCardId).toBe('c2');
    });

    it('disbands the group when the last member is removed', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c1' }), seededCard({ id: 'c2' })] });
        const group = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c1', memberCardIds: ['c2'], createdBy: 'u1' });
        await removeCardFromGroup({ ...store }, { groupId: group.id, cardId: 'c2' });
        const updated = await removeCardFromGroup({ ...store }, { groupId: group.id, cardId: 'c1' });
        expect(updated).toBeNull();
    });
});

describe('setGroupCollapse', () => {
    it('sets the collapse display state', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c1' }), seededCard({ id: 'c2' })] });
        const group = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c1', memberCardIds: ['c2'], createdBy: 'u1' });
        const updated = await setGroupCollapse({ ...store }, { groupId: group.id, isCollapsed: true });
        expect(updated.isCollapsed).toBe(true);
    });
});

describe('saveColumnGroupingState', () => {
    it('saves the per-column grouping display preference', async () => {
        const store = createRetrospectiveFakeStore({ retrospectives: [seededBoard()] });
        await saveColumnGroupingState({ ...store }, { retrospectiveId: 'r1', states: { col1: { criteria: 'user', activeGroups: ['g1'] } } });
        const board = await store.retrospectiveBoardPort.getRetrospective('r1');
        expect(board?.columnGroupingStates).toEqual({ col1: { criteria: 'user', activeGroups: ['g1'] } });
    });
});
