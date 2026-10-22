import { describe, it, expect, vi } from 'vitest';
import {
    createCardGroup,
    disbandCardGroup,
    addCardToGroup,
    removeCardFromGroup,
    setGroupCollapse,
    saveColumnGroupingState,
    moveCard,
    updateCardGroup,
    renormalizeColumnOrder,
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
    it('promotes a new head when the head card is removed (3-card group, I5 leaves 2)', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c1' }), seededCard({ id: 'c2' }), seededCard({ id: 'c3' })] });
        const group = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c1', memberCardIds: ['c2', 'c3'], createdBy: 'u1' });
        const updated = await removeCardFromGroup({ ...store }, { groupId: group.id, cardId: 'c1' });
        expect(updated?.headCardId).toBe('c2');
        expect(updated?.memberCardIds).toEqual(['c3']);
    });

    it('dissolves the group (returns null) when a removal leaves a single card (I5)', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c1' }), seededCard({ id: 'c2' })] });
        const group = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c1', memberCardIds: ['c2'], createdBy: 'u1' });
        const updated = await removeCardFromGroup({ ...store }, { groupId: group.id, cardId: 'c2' });
        expect(updated).toBeNull();
        expect(await store.cardGroupPort.getGroup(group.id)).toBeNull();
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

// ---------------------------------------------------------------------------
// 059-drag-to-group-cards (T005)
// ---------------------------------------------------------------------------

async function expectAppError(promise: Promise<unknown>, code: string, status: number) {
    const err = await promise.then(
        () => null,
        (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe(code);
    expect((err as AppError).httpStatus).toBe(status);
}

/** Spies every method of the fake port so tests can assert the use case rejected before delegating. */
function spiedStore(seed: Parameters<typeof createRetrospectiveFakeStore>[0]) {
    const store = createRetrospectiveFakeStore(seed);
    const port = store.cardGroupPort;
    const spies = {
        createGroup: vi.spyOn(port, 'createGroup'),
        moveCard: vi.spyOn(port, 'moveCard'),
        setGroupTitle: vi.spyOn(port, 'setGroupTitle'),
        setGroupCollapse: vi.spyOn(port, 'setGroupCollapse'),
        renormalizeColumnOrder: vi.spyOn(port, 'renormalizeColumnOrder'),
    };
    return { store, spies };
}

function cardsFor(ids: string[], overrides: Record<string, Partial<ReturnType<typeof seededCard>>> = {}) {
    return ids.map((id, i) => seededCard({ id, order: (i + 1) * 10, ...overrides[id] }));
}

describe('moveCard (C0) — State transitions table', () => {
    describe('source: ungrouped', () => {
        it('-> position(order): plain reorder sets order, no grouping fields, empty result', async () => {
            const store = createRetrospectiveFakeStore({ cards: cardsFor(['c1', 'c2']) });
            const result = await moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c1', target: { kind: 'position', order: 15 } });
            expect(result.createdGroupId).toBeUndefined();
            expect(result.dissolvedGroupIds ?? []).toEqual([]);
            const card = await store.cardPort.getCard('c1');
            expect(card?.order).toBe(15);
            expect(card?.groupId).toBeUndefined();
        });

        it('-> card(T): creates a manual group {head T, members [source]} with order = T.order and no title', async () => {
            const store = createRetrospectiveFakeStore({ cards: cardsFor(['c1', 'c2']) });
            const result = await moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c1', target: { kind: 'card', cardId: 'c2' } });
            expect(result.createdGroupId).toBeTruthy();
            expect(result.dissolvedGroupIds ?? []).toEqual([]);
            const group = await store.cardGroupPort.getGroup(result.createdGroupId!);
            expect(group).toMatchObject({ headCardId: 'c2', memberCardIds: ['c1'], origin: 'manual', order: 20, column: 'col1' });
            expect(group?.title).toBeUndefined();
            expect(await store.cardPort.getCard('c1')).toMatchObject({ groupId: group?.id, isGroupHead: false });
            expect(await store.cardPort.getCard('c2')).toMatchObject({ groupId: group?.id, isGroupHead: true });
        });

        it('-> group(G): appends to G, keeps G.order, creates/dissolves nothing', async () => {
            const store = createRetrospectiveFakeStore({ cards: cardsFor(['c1', 'c2', 'c3']) });
            const g = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c2', memberCardIds: ['c3'], createdBy: 'u1' });
            const result = await moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c1', target: { kind: 'group', groupId: g.id } });
            expect(result.createdGroupId).toBeUndefined();
            expect(result.dissolvedGroupIds ?? []).toEqual([]);
            const after = await store.cardGroupPort.getGroup(g.id);
            expect(after?.memberCardIds).toEqual(['c3', 'c1']);
            expect(after?.order).toBe(g.order);
        });
    });

    describe('source: grouped in S', () => {
        async function threeCardGroup() {
            const store = createRetrospectiveFakeStore({ cards: cardsFor(['c1', 'c2', 'c3', 'c4', 'c5']) });
            const s = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c1', memberCardIds: ['c2', 'c3'], createdBy: 'u1' });
            return { store, s };
        }
        async function twoCardGroup() {
            const store = createRetrospectiveFakeStore({ cards: cardsFor(['c1', 'c2', 'c3', 'c4', 'c5']) });
            const s = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c1', memberCardIds: ['c2'], createdBy: 'u1' });
            return { store, s };
        }

        it('-> position: detaches a member of a 3-card group, S survives, card gets order and loses grouping fields', async () => {
            const { store, s } = await threeCardGroup();
            const result = await moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c3', target: { kind: 'position', order: 45 } });
            expect(result.dissolvedGroupIds ?? []).toEqual([]);
            const card = await store.cardPort.getCard('c3');
            expect(card?.order).toBe(45);
            expect(card?.groupId).toBeUndefined();
            expect(card?.isGroupHead).toBeUndefined();
            expect((await store.cardGroupPort.getGroup(s.id))?.memberCardIds).toEqual(['c2']);
        });

        it('-> position: head promotion — moving the head of a 3-card group promotes memberCardIds[0]', async () => {
            const { store, s } = await threeCardGroup();
            await moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c1', target: { kind: 'position', order: 45 } });
            const after = await store.cardGroupPort.getGroup(s.id);
            expect(after?.headCardId).toBe('c2');
            expect(after?.memberCardIds).toEqual(['c3']);
            expect(await store.cardPort.getCard('c2')).toMatchObject({ isGroupHead: true });
        });

        it('-> position: dissolve-at-1 — S disappears, survivor gets order = S.order, result lists S', async () => {
            const { store, s } = await twoCardGroup();
            const result = await moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c2', target: { kind: 'position', order: 45 } });
            expect(result.dissolvedGroupIds).toEqual([s.id]);
            expect(await store.cardGroupPort.getGroup(s.id)).toBeNull();
            const survivor = await store.cardPort.getCard('c1');
            expect(survivor?.groupId).toBeUndefined();
            expect(survivor?.order).toBe(s.order);
            expect((await store.cardPort.getCard('c2'))?.order).toBe(45);
        });

        it('-> card(T): detaches (dissolving S at 1) then creates a manual group on T', async () => {
            const { store, s } = await twoCardGroup();
            const result = await moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c2', target: { kind: 'card', cardId: 'c4' } });
            expect(result.dissolvedGroupIds).toEqual([s.id]);
            expect(result.createdGroupId).toBeTruthy();
            expect(await store.cardGroupPort.getGroup(s.id)).toBeNull();
            expect(await store.cardGroupPort.getGroup(result.createdGroupId!)).toMatchObject({ headCardId: 'c4', memberCardIds: ['c2'], origin: 'manual', order: 40 });
            expect((await store.cardPort.getCard('c1'))?.groupId).toBeUndefined();
        });

        it('-> card(T): S survives when it keeps 2+ cards, and a new group is still created', async () => {
            const { store, s } = await threeCardGroup();
            const result = await moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c3', target: { kind: 'card', cardId: 'c4' } });
            expect(result.dissolvedGroupIds ?? []).toEqual([]);
            expect(result.createdGroupId).toBeTruthy();
            expect((await store.cardGroupPort.getGroup(s.id))?.memberCardIds).toEqual(['c2']);
        });

        it('-> group(G), G != S: detaches (dissolving S at 1) and appends to G', async () => {
            const { store, s } = await twoCardGroup();
            const g = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c4', memberCardIds: ['c5'], createdBy: 'u1' });
            const result = await moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c2', target: { kind: 'group', groupId: g.id } });
            expect(result.dissolvedGroupIds).toEqual([s.id]);
            expect(await store.cardGroupPort.getGroup(s.id)).toBeNull();
            expect((await store.cardGroupPort.getGroup(g.id))?.memberCardIds).toEqual(['c5', 'c2']);
        });

        it('-> group(G = S): 400 invalid_request (M6) and nothing changes', async () => {
            const { store, s } = await threeCardGroup();
            await expectAppError(
                moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c2', target: { kind: 'group', groupId: s.id } }),
                'invalid_request',
                400,
            );
            expect(await store.cardGroupPort.getGroup(s.id)).toMatchObject({ headCardId: 'c1', memberCardIds: ['c2', 'c3'] });
        });
    });

    describe('M1 input validation (use case, before the port)', () => {
        const base = { retrospectiveId: 'r1', cardId: 'c1' };
        const invalidTargets: Array<[string, unknown]> = [
            ['missing target', undefined],
            ['null target', null],
            ['unknown kind', { kind: 'bogus' }],
            ['position without order', { kind: 'position' }],
            ['position with string order', { kind: 'position', order: '5' }],
            ['position with NaN order', { kind: 'position', order: Number.NaN }],
            ['position with Infinity order', { kind: 'position', order: Number.POSITIVE_INFINITY }],
            ['position with -Infinity order', { kind: 'position', order: Number.NEGATIVE_INFINITY }],
            ['card without cardId', { kind: 'card' }],
            ['card with empty cardId', { kind: 'card', cardId: '' }],
            ['card with non-string cardId', { kind: 'card', cardId: 7 }],
            ['card targeting itself', { kind: 'card', cardId: 'c1' }],
            ['group without groupId', { kind: 'group' }],
            ['group with empty groupId', { kind: 'group', groupId: '' }],
        ];

        it.each(invalidTargets)('rejects %s with 400 invalid_request and never calls the port', async (_name, target) => {
            const { store, spies } = spiedStore({ cards: cardsFor(['c1', 'c2']) });
            await expectAppError(moveCard({ ...store }, { ...base, target: target as never }), 'invalid_request', 400);
            expect(spies.moveCard).not.toHaveBeenCalled();
        });

        it('accepts order 0 and negative orders (finite numbers)', async () => {
            const store = createRetrospectiveFakeStore({ cards: cardsFor(['c1', 'c2']) });
            await moveCard({ ...store }, { ...base, target: { kind: 'position', order: 0 } });
            expect((await store.cardPort.getCard('c1'))?.order).toBe(0);
            await moveCard({ ...store }, { ...base, target: { kind: 'position', order: -4.5 } });
            expect((await store.cardPort.getCard('c1'))?.order).toBe(-4.5);
        });
    });

    describe('port-surfaced errors (M2-M5, M7)', () => {
        it('M2: unknown source card -> 404 not_found', async () => {
            const store = createRetrospectiveFakeStore({ cards: cardsFor(['c2']) });
            await expectAppError(moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'nope', target: { kind: 'position', order: 1 } }), 'not_found', 404);
        });

        it('M2: source card from another retrospective -> 404 not_found', async () => {
            const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c1', retrospectiveId: 'other' })] });
            await expectAppError(moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c1', target: { kind: 'position', order: 1 } }), 'not_found', 404);
        });

        it('M3: unknown target card -> 404 and no writes', async () => {
            const store = createRetrospectiveFakeStore({ cards: cardsFor(['c1']) });
            await expectAppError(moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c1', target: { kind: 'card', cardId: 'nope' } }), 'not_found', 404);
            expect((await store.cardPort.getCard('c1'))?.groupId).toBeUndefined();
        });

        it('M3: unknown target group -> 404', async () => {
            const store = createRetrospectiveFakeStore({ cards: cardsFor(['c1']) });
            await expectAppError(moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c1', target: { kind: 'group', groupId: 'nope' } }), 'not_found', 404);
        });

        it('M4: target card in another column -> 409 group_conflict', async () => {
            const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c1' }), seededCard({ id: 'c2', column: 'col2' })] });
            await expectAppError(moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c1', target: { kind: 'card', cardId: 'c2' } }), 'group_conflict', 409);
        });

        it('M4: target group in another column -> 409 group_conflict', async () => {
            const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c1' }), seededCard({ id: 'c2', column: 'col2' }), seededCard({ id: 'c3', column: 'col2' })] });
            const g = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c2', memberCardIds: ['c3'], createdBy: 'u1' });
            await expectAppError(moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c1', target: { kind: 'group', groupId: g.id } }), 'group_conflict', 409);
        });

        it('M5: target card already grouped -> 409 group_conflict and the source is untouched', async () => {
            const store = createRetrospectiveFakeStore({ cards: cardsFor(['c1', 'c2', 'c3']) });
            await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c2', memberCardIds: ['c3'], createdBy: 'u1' });
            await expectAppError(moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c1', target: { kind: 'card', cardId: 'c3' } }), 'group_conflict', 409);
            expect((await store.cardPort.getCard('c1'))?.groupId).toBeUndefined();
        });

        it('M7: source claims a group it is not listed in -> 409 group_conflict and no writes', async () => {
            const group = { id: 'g1', retrospectiveId: 'r1', column: 'col1', headCardId: 'c2', memberCardIds: ['c3'], isCollapsed: false, createdAt: new Date(), createdBy: 'u1', order: 20 };
            const store = createRetrospectiveFakeStore({
                cards: [seededCard({ id: 'c1', order: 10, groupId: 'g1' }), seededCard({ id: 'c2', order: 20, groupId: 'g1', isGroupHead: true }), seededCard({ id: 'c3', order: 30, groupId: 'g1' })],
                groups: [group],
            });
            await expectAppError(moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c1', target: { kind: 'position', order: 99 } }), 'group_conflict', 409);
            expect((await store.cardPort.getCard('c1'))?.order).toBe(10);
            expect((await store.cardGroupPort.getGroup('g1'))?.memberCardIds).toEqual(['c3']);
        });

        it('M7: source claims a group that does not exist -> 409 group_conflict', async () => {
            const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c1', groupId: 'ghost' })] });
            await expectAppError(moveCard({ ...store }, { retrospectiveId: 'r1', cardId: 'c1', target: { kind: 'position', order: 1 } }), 'group_conflict', 409);
        });
    });
});

describe('updateCardGroup (C3) — partial semantics', () => {
    async function collapsedGroup(title?: string) {
        const store = createRetrospectiveFakeStore({ cards: cardsFor(['c1', 'c2']) });
        const g = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c1', memberCardIds: ['c2'], title, createdBy: 'u1' });
        await setGroupCollapse({ ...store }, { groupId: g.id, isCollapsed: true });
        return { store, g };
    }

    it('title-only never touches isCollapsed (and does not call setGroupCollapse)', async () => {
        const { store, g } = await collapsedGroup();
        const spy = vi.spyOn(store.cardGroupPort, 'setGroupCollapse');
        const updated = await updateCardGroup({ ...store }, { groupId: g.id, title: 'Perf' });
        expect(updated.title).toBe('Perf');
        expect(updated.isCollapsed).toBe(true);
        expect(spy).not.toHaveBeenCalled();
    });

    it('isCollapsed-only never touches the title (and does not call setGroupTitle)', async () => {
        const { store, g } = await collapsedGroup('Keep me');
        const spy = vi.spyOn(store.cardGroupPort, 'setGroupTitle');
        const updated = await updateCardGroup({ ...store }, { groupId: g.id, isCollapsed: false });
        expect(updated.isCollapsed).toBe(false);
        expect(updated.title).toBe('Keep me');
        expect(spy).not.toHaveBeenCalled();
    });

    it('applies both fields when both are present', async () => {
        const { store, g } = await collapsedGroup();
        const updated = await updateCardGroup({ ...store }, { groupId: g.id, isCollapsed: false, title: 'Both' });
        expect(updated).toMatchObject({ title: 'Both', isCollapsed: false });
    });

    it('trims the title before storing it', async () => {
        const { store, g } = await collapsedGroup();
        const spy = vi.spyOn(store.cardGroupPort, 'setGroupTitle');
        const updated = await updateCardGroup({ ...store }, { groupId: g.id, title: '  Spaced out  ' });
        expect(updated.title).toBe('Spaced out');
        expect(spy).toHaveBeenCalledWith(g.id, 'Spaced out');
    });

    it.each([
        ['empty string', ''],
        ['whitespace only', '   \t '],
        ['null', null],
    ])('%s deletes the stored title (port receives null)', async (_n, value) => {
        const { store, g } = await collapsedGroup('Old title');
        const spy = vi.spyOn(store.cardGroupPort, 'setGroupTitle');
        const updated = await updateCardGroup({ ...store }, { groupId: g.id, title: value });
        expect(updated.title).toBeUndefined();
        expect(spy).toHaveBeenCalledWith(g.id, null);
        expect(updated.isCollapsed).toBe(true);
    });

    it('accepts exactly 60 characters (after trim)', async () => {
        const { store, g } = await collapsedGroup();
        const title = 'a'.repeat(60);
        const updated = await updateCardGroup({ ...store }, { groupId: g.id, title: ` ${title} ` });
        expect(updated.title).toBe(title);
    });

    it('rejects more than 60 characters with 400 invalid_request before the port', async () => {
        const { store, g } = await collapsedGroup('Old');
        const spy = vi.spyOn(store.cardGroupPort, 'setGroupTitle');
        await expectAppError(updateCardGroup({ ...store }, { groupId: g.id, title: 'a'.repeat(61) }), 'invalid_request', 400);
        expect(spy).not.toHaveBeenCalled();
        expect((await store.cardGroupPort.getGroup(g.id))?.title).toBe('Old');
    });

    it('rejects an empty update (neither field) with 400 invalid_request', async () => {
        const { store, g } = await collapsedGroup();
        await expectAppError(updateCardGroup({ ...store }, { groupId: g.id }), 'invalid_request', 400);
    });

    it('rejects wrong types (non-boolean isCollapsed, non-string title) with 400 invalid_request', async () => {
        const { store, g } = await collapsedGroup();
        await expectAppError(updateCardGroup({ ...store }, { groupId: g.id, isCollapsed: 'yes' as never }), 'invalid_request', 400);
        await expectAppError(updateCardGroup({ ...store }, { groupId: g.id, title: 42 as never }), 'invalid_request', 400);
    });

    it('404s for a missing group', async () => {
        const store = createRetrospectiveFakeStore();
        await expectAppError(updateCardGroup({ ...store }, { groupId: 'nope', title: 'x' }), 'not_found', 404);
        await expectAppError(updateCardGroup({ ...store }, { groupId: 'nope', isCollapsed: true }), 'not_found', 404);
    });
});

describe('renormalizeColumnOrder (C4, R1)', () => {
    const items = [
        { kind: 'card' as const, id: 'c1', order: 1024 },
        { kind: 'card' as const, id: 'c2', order: 2048 },
    ];

    it('writes every order in the column', async () => {
        const store = createRetrospectiveFakeStore({ cards: cardsFor(['c1', 'c2']) });
        await renormalizeColumnOrder({ ...store }, { retrospectiveId: 'r1', columnId: 'col1', items });
        expect((await store.cardPort.getCard('c1'))?.order).toBe(1024);
        expect((await store.cardPort.getCard('c2'))?.order).toBe(2048);
    });

    it('orders groups together with cards', async () => {
        const store = createRetrospectiveFakeStore({ cards: cardsFor(['c1', 'c2', 'c3']) });
        const g = await createCardGroup({ ...store }, { retrospectiveId: 'r1', headCardId: 'c2', memberCardIds: ['c3'], createdBy: 'u1' });
        await renormalizeColumnOrder({ ...store }, { retrospectiveId: 'r1', columnId: 'col1', items: [{ kind: 'group', id: g.id, order: 1024 }, { kind: 'card', id: 'c1', order: 2048 }] });
        expect((await store.cardGroupPort.getGroup(g.id))?.order).toBe(1024);
        expect((await store.cardPort.getCard('c1'))?.order).toBe(2048);
    });

    const bad: Array<[string, unknown]> = [
        ['empty list', []],
        ['non-array', 'nope'],
        ['501 items', Array.from({ length: 501 }, (_, i) => ({ kind: 'card', id: `x${i}`, order: i }))],
        ['NaN order', [{ kind: 'card', id: 'c1', order: Number.NaN }]],
        ['Infinity order', [{ kind: 'card', id: 'c1', order: Number.POSITIVE_INFINITY }]],
        ['duplicate kind+id', [{ kind: 'card', id: 'c1', order: 1 }, { kind: 'card', id: 'c1', order: 2 }]],
        ['unknown kind', [{ kind: 'thing', id: 'c1', order: 1 }]],
        ['missing id', [{ kind: 'card', order: 1 }]],
    ];
    it.each(bad)('R1: rejects %s with 400 invalid_request and never calls the port', async (_n, value) => {
        const { store, spies } = spiedStore({ cards: cardsFor(['c1', 'c2']) });
        await expectAppError(renormalizeColumnOrder({ ...store }, { retrospectiveId: 'r1', columnId: 'col1', items: value as never }), 'invalid_request', 400);
        expect(spies.renormalizeColumnOrder).not.toHaveBeenCalled();
    });

    it('accepts exactly 500 items', async () => {
        const many = Array.from({ length: 500 }, (_, i) => seededCard({ id: `x${i}`, order: i }));
        const store = createRetrospectiveFakeStore({ cards: many });
        await expect(
            renormalizeColumnOrder({ ...store }, { retrospectiveId: 'r1', columnId: 'col1', items: many.map((c, i) => ({ kind: 'card' as const, id: c.id, order: i * 1024 })) }),
        ).resolves.not.toThrow();
    });

    it('R2: missing item -> 404 not_found', async () => {
        const store = createRetrospectiveFakeStore({ cards: cardsFor(['c1']) });
        await expectAppError(renormalizeColumnOrder({ ...store }, { retrospectiveId: 'r1', columnId: 'col1', items }), 'not_found', 404);
    });

    it('R3: item in another column or grouped card -> 409 group_conflict and no writes', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c1', order: 10 }), seededCard({ id: 'c2', order: 20, column: 'col2' })] });
        await expectAppError(renormalizeColumnOrder({ ...store }, { retrospectiveId: 'r1', columnId: 'col1', items }), 'group_conflict', 409);
        expect((await store.cardPort.getCard('c1'))?.order).toBe(10);

        const store2 = createRetrospectiveFakeStore({ cards: cardsFor(['c1', 'c2']) });
        await createCardGroup({ ...store2 }, { retrospectiveId: 'r1', headCardId: 'c1', memberCardIds: ['c2'], createdBy: 'u1' });
        await expectAppError(renormalizeColumnOrder({ ...store2 }, { retrospectiveId: 'r1', columnId: 'col1', items }), 'group_conflict', 409);
    });
});

describe('createCardGroup hardening (C1)', () => {
    const base = { retrospectiveId: 'r1', headCardId: 'c1', createdBy: 'u1' };

    it("P1: defaults origin to 'suggestion' when omitted (passed explicitly to the port)", async () => {
        const { store, spies } = spiedStore({ cards: cardsFor(['c1', 'c2']) });
        const group = await createCardGroup({ ...store }, { ...base, memberCardIds: ['c2'] });
        expect(spies.createGroup).toHaveBeenCalledWith(expect.objectContaining({ origin: 'suggestion' }));
        expect(group.origin).toBe('suggestion');
    });

    it("P1: honours an explicit origin 'manual'", async () => {
        const { store, spies } = spiedStore({ cards: cardsFor(['c1', 'c2']) });
        await createCardGroup({ ...store }, { ...base, memberCardIds: ['c2'], origin: 'manual' });
        expect(spies.createGroup).toHaveBeenCalledWith(expect.objectContaining({ origin: 'manual' }));
    });

    it('P1: takes the head card slot (order = head.order)', async () => {
        const store = createRetrospectiveFakeStore({ cards: cardsFor(['c1', 'c2']) });
        const group = await createCardGroup({ ...store }, { ...base, memberCardIds: ['c2'] });
        expect(group.order).toBe(10);
    });

    it('P1: accepts 50 members', async () => {
        const ids = Array.from({ length: 50 }, (_, i) => `m${i}`);
        const store = createRetrospectiveFakeStore({ cards: [seededCard({ id: 'c1' }), ...ids.map((id) => seededCard({ id }))] });
        const group = await createCardGroup({ ...store }, { ...base, memberCardIds: ids });
        expect(group.memberCardIds).toHaveLength(50);
    });

    const invalid: Array<[string, Record<string, unknown>]> = [
        ['51 members', { memberCardIds: Array.from({ length: 51 }, (_, i) => `m${i}`) }],
        ['duplicate members', { memberCardIds: ['c2', 'c2'] }],
        ['head among the members', { memberCardIds: ['c2', 'c1'] }],
        ['invalid origin', { memberCardIds: ['c2'], origin: 'bogus' }],
        ['title over 60 chars', { memberCardIds: ['c2'], title: 'a'.repeat(61) }],
        ['title over 60 chars even with padding', { memberCardIds: ['c2'], title: ` ${'a'.repeat(61)} ` }],
    ];
    it.each(invalid)('P1/P6: rejects %s with 400 invalid_request before touching the port', async (_n, extra) => {
        const { store, spies } = spiedStore({ cards: cardsFor(['c1', 'c2']) });
        await expectAppError(createCardGroup({ ...store }, { ...base, ...(extra as object) } as never), 'invalid_request', 400);
        expect(spies.createGroup).not.toHaveBeenCalled();
    });

    it('P6: trims the title', async () => {
        const { store, spies } = spiedStore({ cards: cardsFor(['c1', 'c2']) });
        const group = await createCardGroup({ ...store }, { ...base, memberCardIds: ['c2'], title: '  Latency  ' });
        expect(group.title).toBe('Latency');
        expect(spies.createGroup).toHaveBeenCalledWith(expect.objectContaining({ title: 'Latency' }));
    });

    it.each([
        ['empty', ''],
        ['whitespace', '   '],
    ])('P6: %s title is omitted (never stored as "")', async (_n, title) => {
        const { store, spies } = spiedStore({ cards: cardsFor(['c1', 'c2']) });
        const group = await createCardGroup({ ...store }, { ...base, memberCardIds: ['c2'], title });
        expect(group.title).toBeUndefined();
        const input = spies.createGroup.mock.calls[0]![0] as { title?: string };
        expect(input.title).toBeUndefined();
    });

    it('P6: accepts a title of exactly 60 characters', async () => {
        const store = createRetrospectiveFakeStore({ cards: cardsFor(['c1', 'c2']) });
        const group = await createCardGroup({ ...store }, { ...base, memberCardIds: ['c2'], title: 'a'.repeat(60) });
        expect(group.title).toHaveLength(60);
    });
});
