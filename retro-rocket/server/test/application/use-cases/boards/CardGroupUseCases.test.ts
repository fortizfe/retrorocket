import { describe, expect, it } from 'vitest';
import { createCardGroup } from '../../../../src/application/use-cases/boards/CreateCardGroup';
import { disbandCardGroup } from '../../../../src/application/use-cases/boards/DisbandCardGroup';
import { addCardToGroup } from '../../../../src/application/use-cases/boards/AddCardToGroup';
import { removeCardFromGroup } from '../../../../src/application/use-cases/boards/RemoveCardFromGroup';
import { setGroupCollapseState } from '../../../../src/application/use-cases/boards/SetGroupCollapseState';
import { setColumnGroupingState } from '../../../../src/application/use-cases/boards/SetColumnGroupingState';
import { AppError } from '../../../../src/domain/errors';
import { inMemoryCardGroupStore } from './cardFakes';
import type { CardGroup } from '../../../../src/application/ports/cards';

function group(overrides: Partial<CardGroup> = {}): CardGroup {
    return {
        id: 'g1', retrospectiveId: 'b1', column: 'helped', headCardId: 'c1', memberCardIds: ['c2', 'c3'],
        isCollapsed: false, createdAt: new Date(), createdBy: 'u1', order: 0, ...overrides,
    };
}

describe('createCardGroup', () => {
    it('creates a group with the given head and members', async () => {
        const cardGroupPort = inMemoryCardGroupStore();
        const created = await createCardGroup({ cardGroupPort }, { retrospectiveId: 'b1', headCardId: 'c1', memberCardIds: ['c2'], createdBy: 'u1' });
        expect(created.headCardId).toBe('c1');
        expect(created.memberCardIds).toEqual(['c2']);
    });

    it('rejects an empty member list', async () => {
        const cardGroupPort = inMemoryCardGroupStore();
        await expect(createCardGroup({ cardGroupPort }, { retrospectiveId: 'b1', headCardId: 'c1', memberCardIds: [], createdBy: 'u1' })).rejects.toThrow(AppError);
    });
});

describe('disbandCardGroup', () => {
    it('removes the group', async () => {
        const cardGroupPort = inMemoryCardGroupStore([group()]);
        await disbandCardGroup({ cardGroupPort }, 'g1');
        expect(await cardGroupPort.getGroup('g1')).toBeNull();
    });
});

describe('addCardToGroup', () => {
    it('adds a card to the member list', async () => {
        const cardGroupPort = inMemoryCardGroupStore([group()]);
        const updated = await addCardToGroup({ cardGroupPort }, 'g1', 'c4');
        expect(updated.memberCardIds).toContain('c4');
    });
});

describe('removeCardFromGroup', () => {
    it('promotes the next member to head when the head is removed', async () => {
        const cardGroupPort = inMemoryCardGroupStore([group()]);
        const updated = await removeCardFromGroup({ cardGroupPort }, 'c1');
        expect(updated?.headCardId).toBe('c2');
        expect(updated?.memberCardIds).toEqual(['c3']);
    });

    it('disbands the group when the head is removed with no members to promote', async () => {
        const cardGroupPort = inMemoryCardGroupStore([group({ memberCardIds: [] })]);
        const result = await removeCardFromGroup({ cardGroupPort }, 'c1');
        expect(result).toBeNull();
        expect(await cardGroupPort.getGroup('g1')).toBeNull();
    });

    it('disbands the group when the last remaining member is removed', async () => {
        const cardGroupPort = inMemoryCardGroupStore([group({ memberCardIds: ['c2'] })]);
        const result = await removeCardFromGroup({ cardGroupPort }, 'c2');
        expect(result).toBeNull();
        expect(await cardGroupPort.getGroup('g1')).toBeNull();
    });
});

describe('setGroupCollapseState', () => {
    it('updates the collapsed flag, with concurrent updates resolving last-write-wins (FR-014)', async () => {
        const cardGroupPort = inMemoryCardGroupStore([group()]);
        await setGroupCollapseState({ cardGroupPort }, 'g1', true);
        const second = await setGroupCollapseState({ cardGroupPort }, 'g1', false);
        expect(second.isCollapsed).toBe(false);
    });
});

describe('setColumnGroupingState', () => {
    it('persists and returns the opaque UI state blob', async () => {
        const cardGroupPort = inMemoryCardGroupStore();
        await setColumnGroupingState({ cardGroupPort }, 'b1', { helped: { mode: 'grouped' } });
        expect(await cardGroupPort.getColumnGroupingState('b1')).toEqual({ helped: { mode: 'grouped' } });
    });
});
