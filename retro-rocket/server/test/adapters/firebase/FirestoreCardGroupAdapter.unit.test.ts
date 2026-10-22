import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreCardGroupAdapter } from '../../../src/adapters/firebase/FirestoreCardGroupAdapter';
import { AppError, ConflictError, NotFoundError } from '../../../src/domain/errors';

// Mock-based behaviour tests for the transactional grouping code (spec 059). They run in the plain
// `test:server` run (CI has no Firestore emulator); the emulator-backed counterpart lives in
// FirestoreCardGroupAdapter.test.ts. The fake below is a small in-memory Firestore: transactions
// buffer their writes and apply them only when the callback resolves, so a thrown invariant error
// leaves the store untouched (the atomicity the adapter relies on).

const { DELETE, TS } = vi.hoisted(() => ({ DELETE: Symbol('delete'), TS: Symbol('serverTimestamp') }));

vi.mock('firebase-admin/firestore', () => ({
    FieldValue: { delete: () => DELETE, serverTimestamp: () => TS },
}));

type Data = Record<string, unknown>;

/** Server timestamps resolve to a concrete Date when a write is applied. */
const resolve = (value: unknown): unknown => (value === TS ? new Date('2026-06-01T00:00:00Z') : value);

class FakeFirestore {
    readonly store = new Map<string, Data>();
    private autoId = 0;

    seed(path: string, data: Data): void {
        this.store.set(path, { ...data });
    }

    get(path: string): Data | undefined {
        return this.store.get(path);
    }

    private snapshot(path: string) {
        const data = this.store.get(path);
        const id = path.split('/')[1]!;
        return { id, exists: data !== undefined, data: () => (data ? { ...data } : undefined), ref: this.docRef(path) };
    }

    private applyUpdate(path: string, fields: Data): void {
        const current = this.store.get(path);
        if (!current) throw new Error(`NOT_FOUND: ${path}`);
        for (const [key, value] of Object.entries(fields)) {
            if (value === DELETE) delete current[key];
            else current[key] = resolve(value);
        }
    }

    docRef(path: string) {
        return {
            id: path.split('/')[1]!,
            path,
            get: async () => this.snapshot(path),
            update: async (fields: Data) => this.applyUpdate(path, fields),
        };
    }

    private query(col: string, field: string, value: unknown) {
        return {
            __query: true as const,
            run: () =>
                [...this.store.keys()]
                    .filter((p) => p.startsWith(`${col}/`) && this.store.get(p)![field] === value)
                    .map((p) => this.snapshot(p)),
            get: async () => ({ docs: this.query(col, field, value).run() }),
        };
    }

    collection(col: string) {
        return {
            doc: (id?: string) => this.docRef(`${col}/${id ?? `auto${++this.autoId}`}`),
            where: (field: string, _op: string, value: unknown) => this.query(col, field, value),
        };
    }

    async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
        const writes: Array<() => void> = [];
        const tx = {
            get: async (target: { __query?: true; run?: () => unknown; path?: string }) =>
                target.__query ? { docs: target.run!() } : this.snapshot(target.path!),
            getAll: async (...refs: Array<{ path: string }>) => refs.map((r) => this.snapshot(r.path)),
            set: (ref: { path: string }, data: Data) =>
                writes.push(() => this.store.set(ref.path, Object.fromEntries(Object.entries(data).map(([k, v]) => [k, resolve(v)])))),
            update: (ref: { path: string }, fields: Data) => writes.push(() => this.applyUpdate(ref.path, fields)),
            delete: (ref: { path: string }) => writes.push(() => void this.store.delete(ref.path)),
        };
        const result = await fn(tx);
        writes.forEach((w) => w());
        return result;
    }
}

const RETRO = 'r1';
const COL = 'col1';

function card(order: number, extra: Data = {}): Data {
    return { retrospectiveId: RETRO, column: COL, order, createdBy: 'u1', ...extra };
}

function grouped(groupId: string, order: number, extra: Data = {}): Data {
    return card(order, { groupId, ...extra });
}

function group(head: string, members: string[], order: number, extra: Data = {}): Data {
    return { retrospectiveId: RETRO, column: COL, headCardId: head, memberCardIds: members, order, isCollapsed: false, createdAt: new Date('2026-01-01'), createdBy: 'u1', ...extra };
}

let fake: FakeFirestore;
let adapter: FirestoreCardGroupAdapter;

beforeEach(() => {
    fake = new FakeFirestore();
    adapter = new FirestoreCardGroupAdapter(fake as unknown as Firestore);
});

async function rejection(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (e) {
        return e;
    }
    throw new Error('expected rejection');
}

async function expectConflict(promise: Promise<unknown>): Promise<void> {
    const err = await rejection(promise);
    expect(err).toBeInstanceOf(ConflictError);
    expect((err as ConflictError).code).toBe('group_conflict');
}

async function expectNotFound(promise: Promise<unknown>): Promise<void> {
    expect(await rejection(promise)).toBeInstanceOf(NotFoundError);
}

describe('createGroup', () => {
    beforeEach(() => {
        fake.seed('cards/a', card(3));
        fake.seed('cards/b', card(4));
        fake.seed('cards/c', card(5));
    });

    it('creates the group in the head card slot with origin and flags every card', async () => {
        const dto = await adapter.createGroup({ retrospectiveId: RETRO, column: COL, headCardId: 'a', memberCardIds: ['b', 'c'], createdBy: 'u9', origin: 'manual', title: 'T' });

        expect(dto).toMatchObject({ headCardId: 'a', memberCardIds: ['b', 'c'], order: 3, origin: 'manual', title: 'T', column: COL, createdBy: 'u9' });
        expect(fake.get('cards/a')).toMatchObject({ groupId: dto.id, isGroupHead: true });
        expect(fake.get('cards/a')).not.toHaveProperty('groupOrder');
        expect(fake.get('cards/b')).toMatchObject({ groupId: dto.id, isGroupHead: false, groupOrder: 0 });
        expect(fake.get('cards/c')).toMatchObject({ groupId: dto.id, isGroupHead: false, groupOrder: 1 });
    });

    it('defaults origin to suggestion, omits an absent title and falls back to order 0', async () => {
        fake.seed('cards/a', { retrospectiveId: RETRO, column: COL });
        const dto = await adapter.createGroup({ retrospectiveId: RETRO, column: COL, headCardId: 'a', memberCardIds: ['b'], createdBy: 'u1' });
        expect(dto.origin).toBe('suggestion');
        expect(dto.title).toBeUndefined();
        expect(dto.order).toBe(0);
    });

    it('rejects an empty or duplicated member list with 400', async () => {
        for (const input of [
            { headCardId: 'a', memberCardIds: [] },
            { headCardId: 'a', memberCardIds: ['a'] },
        ]) {
            const err = await rejection(adapter.createGroup({ retrospectiveId: RETRO, column: COL, createdBy: 'u1', ...input }));
            expect(err).toBeInstanceOf(AppError);
            expect((err as AppError).httpStatus).toBe(400);
        }
    });

    it('P2: 404 when any card is missing, with no writes', async () => {
        await expectNotFound(adapter.createGroup({ retrospectiveId: RETRO, column: COL, headCardId: 'a', memberCardIds: ['ghost'], createdBy: 'u1' }));
        expect(fake.get('cards/a')).not.toHaveProperty('groupId');
    });

    it('P3: 409 when a card belongs to another retrospective', async () => {
        fake.seed('cards/b', card(4, { retrospectiveId: 'other' }));
        await expectConflict(adapter.createGroup({ retrospectiveId: RETRO, column: COL, headCardId: 'a', memberCardIds: ['b'], createdBy: 'u1' }));
    });

    it('P4: 409 when a member is in another column than the head', async () => {
        fake.seed('cards/b', card(4, { column: 'col2' }));
        await expectConflict(adapter.createGroup({ retrospectiveId: RETRO, column: COL, headCardId: 'a', memberCardIds: ['b'], createdBy: 'u1' }));
    });

    it('P5: 409 when a card is already grouped, leaving the store untouched', async () => {
        fake.seed('cards/b', grouped('gX', 4));
        await expectConflict(adapter.createGroup({ retrospectiveId: RETRO, column: COL, headCardId: 'a', memberCardIds: ['b', 'c'], createdBy: 'u1' }));
        expect(fake.get('cards/c')).not.toHaveProperty('groupId');
        expect([...fake.store.keys()].some((k) => k.startsWith('groups/'))).toBe(false);
    });
});

describe('addCardToGroup', () => {
    beforeEach(() => {
        fake.seed('groups/g1', group('a', ['b'], 5));
        fake.seed('cards/a', grouped('g1', 5, { isGroupHead: true }));
        fake.seed('cards/b', grouped('g1', 5, { isGroupHead: false, groupOrder: 0 }));
        fake.seed('cards/x', card(9));
    });

    it('appends the card as last member, keeping the group order', async () => {
        const dto = await adapter.addCardToGroup('g1', 'x');
        expect(dto.memberCardIds).toEqual(['b', 'x']);
        expect(dto.order).toBe(5);
        expect(fake.get('cards/x')).toMatchObject({ groupId: 'g1', isGroupHead: false, groupOrder: 1 });
    });

    it('A1/A2: 404 for a missing group or card', async () => {
        await expectNotFound(adapter.addCardToGroup('nope', 'x'));
        await expectNotFound(adapter.addCardToGroup('g1', 'nope'));
    });

    it('A3: 409 for a card in another column', async () => {
        fake.seed('cards/x', card(9, { column: 'col2' }));
        await expectConflict(adapter.addCardToGroup('g1', 'x'));
    });

    it('A3: 409 for a card in another retrospective', async () => {
        fake.seed('cards/x', card(9, { retrospectiveId: 'other' }));
        await expectConflict(adapter.addCardToGroup('g1', 'x'));
    });

    it('A4: 409 for a card already in a group, leaving the group unchanged', async () => {
        fake.seed('cards/x', grouped('g2', 9));
        await expectConflict(adapter.addCardToGroup('g1', 'x'));
        expect(fake.get('groups/g1')!.memberCardIds).toEqual(['b']);
    });
});

describe('removeCardFromGroup', () => {
    it('promotes the next card to head when the head of a 3-card group leaves, and reindexes members', async () => {
        fake.seed('groups/g1', group('a', ['b', 'c'], 5));
        fake.seed('cards/a', grouped('g1', 5, { isGroupHead: true }));
        fake.seed('cards/b', grouped('g1', 5, { isGroupHead: false, groupOrder: 0 }));
        fake.seed('cards/c', grouped('g1', 5, { isGroupHead: false, groupOrder: 1 }));

        const dto = await adapter.removeCardFromGroup('g1', 'a');

        expect(dto).toMatchObject({ headCardId: 'b', memberCardIds: ['c'] });
        expect(fake.get('cards/b')).toMatchObject({ isGroupHead: true });
        expect(fake.get('cards/b')).not.toHaveProperty('groupOrder');
        expect(fake.get('cards/c')).toMatchObject({ groupOrder: 0 });
        expect(fake.get('cards/a')).not.toHaveProperty('groupId');
        expect(fake.get('cards/a')).not.toHaveProperty('isGroupHead');
    });

    it('keeps the head and reindexes when a middle member leaves', async () => {
        fake.seed('groups/g1', group('a', ['b', 'c'], 5));
        fake.seed('cards/a', grouped('g1', 5, { isGroupHead: true }));
        fake.seed('cards/b', grouped('g1', 5, { isGroupHead: false, groupOrder: 0 }));
        fake.seed('cards/c', grouped('g1', 5, { isGroupHead: false, groupOrder: 1 }));

        const dto = await adapter.removeCardFromGroup('g1', 'b');

        expect(dto).toMatchObject({ headCardId: 'a', memberCardIds: ['c'] });
        expect(fake.get('cards/c')).toMatchObject({ groupOrder: 0 });
    });

    it('places the leaver at the midpoint to the column next item after the group', async () => {
        fake.seed('groups/g1', group('a', ['b', 'c'], 5));
        fake.seed('cards/a', grouped('g1', 5, { isGroupHead: true }));
        fake.seed('cards/b', grouped('g1', 5, { isGroupHead: false, groupOrder: 0 }));
        fake.seed('cards/c', grouped('g1', 5, { isGroupHead: false, groupOrder: 1 }));
        fake.seed('cards/x', card(9)); // next ungrouped card
        fake.seed('groups/g2', group('y', ['z'], 7)); // closer group wins
        fake.seed('cards/lower', card(2)); // before the group: ignored
        fake.seed('cards/other-col', card(6, { column: 'col2' })); // other column: ignored
        fake.seed('cards/y', grouped('g2', 7)); // grouped cards are not column items

        await adapter.removeCardFromGroup('g1', 'c');

        expect(fake.get('cards/c')!.order).toBe(6); // (5 + 7) / 2
    });

    it('places the leaver at group order + 1 when nothing follows the group', async () => {
        fake.seed('groups/g1', group('a', ['b', 'c'], 5));
        fake.seed('cards/a', grouped('g1', 5, { isGroupHead: true }));
        fake.seed('cards/b', grouped('g1', 5, { isGroupHead: false, groupOrder: 0 }));
        fake.seed('cards/c', grouped('g1', 5, { isGroupHead: false, groupOrder: 1 }));

        await adapter.removeCardFromGroup('g1', 'c');

        expect(fake.get('cards/c')!.order).toBe(6);
    });

    it('dissolves a 2-card group: returns null, deletes the group and the survivor takes the group order', async () => {
        fake.seed('groups/g1', group('a', ['b'], 5));
        fake.seed('cards/a', grouped('g1', 99, { isGroupHead: true }));
        fake.seed('cards/b', grouped('g1', 99, { isGroupHead: false, groupOrder: 0 }));
        fake.seed('cards/x', card(8));

        const result = await adapter.removeCardFromGroup('g1', 'b');

        expect(result).toBeNull();
        expect(fake.get('groups/g1')).toBeUndefined();
        expect(fake.get('cards/a')).toEqual(expect.objectContaining({ order: 5 }));
        expect(fake.get('cards/a')).not.toHaveProperty('groupId');
        expect(fake.get('cards/a')).not.toHaveProperty('isGroupHead');
        expect(fake.get('cards/b')!.order).toBe(6.5); // (5 + 8) / 2
        expect(fake.get('cards/b')).not.toHaveProperty('groupId');
    });

    it('survivor falls back to order 0 when the group has no numeric order', async () => {
        fake.seed('groups/g1', group('a', ['b'], 5, { order: undefined }));
        fake.seed('cards/a', grouped('g1', 99, { isGroupHead: true }));
        fake.seed('cards/b', grouped('g1', 99, { groupOrder: 0 }));
        await adapter.removeCardFromGroup('g1', 'b');
        expect(fake.get('cards/a')!.order).toBe(0);
    });

    it('404 for a missing group or card', async () => {
        fake.seed('groups/g1', group('a', ['b'], 5));
        await expectNotFound(adapter.removeCardFromGroup('nope', 'a'));
        await expectNotFound(adapter.removeCardFromGroup('g1', 'ghost'));
    });

    it('I1: 409 when the card does not claim the group, or the group does not list it', async () => {
        fake.seed('groups/g1', group('a', ['b'], 5));
        fake.seed('cards/q', grouped('g1', 1)); // claims g1 but is not listed
        fake.seed('cards/b', card(2)); // listed but does not claim g1
        await expectConflict(adapter.removeCardFromGroup('g1', 'q'));
        await expectConflict(adapter.removeCardFromGroup('g1', 'b'));
    });
});

describe('moveCard', () => {
    beforeEach(() => {
        fake.seed('cards/s', card(1));
        fake.seed('cards/t', card(2));
    });

    it('position: writes the order and clears grouping fields on an ungrouped card', async () => {
        const result = await adapter.moveCard(RETRO, 's', { kind: 'position', order: 4.5 });
        expect(result).toEqual({ dissolvedGroupIds: [] });
        expect(fake.get('cards/s')!.order).toBe(4.5);
    });

    it('position: takes a card out of a 3-card group without dissolving it', async () => {
        fake.seed('groups/g1', group('h', ['s', 'm'], 5));
        fake.seed('cards/h', grouped('g1', 5, { isGroupHead: true }));
        fake.seed('cards/s', grouped('g1', 5, { isGroupHead: false, groupOrder: 0 }));
        fake.seed('cards/m', grouped('g1', 5, { isGroupHead: false, groupOrder: 1 }));

        const result = await adapter.moveCard(RETRO, 's', { kind: 'position', order: 9 });

        expect(result.dissolvedGroupIds).toEqual([]);
        expect(fake.get('groups/g1')).toMatchObject({ headCardId: 'h', memberCardIds: ['m'] });
        expect(fake.get('cards/s')).toMatchObject({ order: 9 });
        expect(fake.get('cards/s')).not.toHaveProperty('groupId');
    });

    it('position: dissolves a 2-card group and the survivor takes the group slot', async () => {
        fake.seed('groups/g1', group('h', ['s'], 5));
        fake.seed('cards/h', grouped('g1', 5, { isGroupHead: true }));
        fake.seed('cards/s', grouped('g1', 5, { isGroupHead: false, groupOrder: 0 }));

        const result = await adapter.moveCard(RETRO, 's', { kind: 'position', order: 9 });

        expect(result).toEqual({ dissolvedGroupIds: ['g1'] });
        expect(fake.get('groups/g1')).toBeUndefined();
        expect(fake.get('cards/h')).toEqual(expect.objectContaining({ order: 5 }));
        expect(fake.get('cards/h')).not.toHaveProperty('groupId');
        expect(fake.get('cards/s')!.order).toBe(9);
    });

    it('card: creates a manual group in the target slot with the target as head', async () => {
        const result = await adapter.moveCard(RETRO, 's', { kind: 'card', cardId: 't' });

        expect(result.dissolvedGroupIds).toEqual([]);
        const id = result.createdGroupId!;
        expect(fake.get(`groups/${id}`)).toMatchObject({ headCardId: 't', memberCardIds: ['s'], origin: 'manual', order: 2, createdBy: 'u1', column: COL });
        expect(fake.get('cards/t')).toMatchObject({ groupId: id, isGroupHead: true });
        expect(fake.get('cards/s')).toMatchObject({ groupId: id, isGroupHead: false, groupOrder: 0 });
    });

    it('card: falls back to order 0 and empty creator when the target and source lack them', async () => {
        fake.seed('cards/s', { retrospectiveId: RETRO, column: COL });
        fake.seed('cards/t', { retrospectiveId: RETRO, column: COL });
        const { createdGroupId } = await adapter.moveCard(RETRO, 's', { kind: 'card', cardId: 't' });
        expect(fake.get(`groups/${createdGroupId}`)).toMatchObject({ order: 0, createdBy: '' });
    });

    it('card: a grouped source leaving a 2-card group dissolves it and still creates the new group', async () => {
        fake.seed('groups/g1', group('h', ['s'], 5));
        fake.seed('cards/h', grouped('g1', 5, { isGroupHead: true }));
        fake.seed('cards/s', grouped('g1', 5, { isGroupHead: false, groupOrder: 0 }));

        const result = await adapter.moveCard(RETRO, 's', { kind: 'card', cardId: 't' });

        expect(result.dissolvedGroupIds).toEqual(['g1']);
        expect(result.createdGroupId).toBeDefined();
        expect(fake.get('groups/g1')).toBeUndefined();
        expect(fake.get('cards/h')!.order).toBe(5);
    });

    it('group: appends the card as last member of the target group', async () => {
        fake.seed('groups/g2', group('t', ['u'], 7));
        fake.seed('cards/t', grouped('g2', 7, { isGroupHead: true }));
        fake.seed('cards/u', grouped('g2', 7, { isGroupHead: false, groupOrder: 0 }));

        const result = await adapter.moveCard(RETRO, 's', { kind: 'group', groupId: 'g2' });

        expect(result).toEqual({ dissolvedGroupIds: [] });
        expect(fake.get('groups/g2')).toMatchObject({ memberCardIds: ['u', 's'], order: 7 });
        expect(fake.get('cards/s')).toMatchObject({ groupId: 'g2', isGroupHead: false, groupOrder: 1 });
    });

    it('group: moves a card between groups, dissolving the source group when it drops below 2', async () => {
        fake.seed('groups/g1', group('h', ['s'], 5));
        fake.seed('cards/h', grouped('g1', 5, { isGroupHead: true }));
        fake.seed('cards/s', grouped('g1', 5, { isGroupHead: false, groupOrder: 0 }));
        fake.seed('groups/g2', group('t', ['u'], 7));

        const result = await adapter.moveCard(RETRO, 's', { kind: 'group', groupId: 'g2' });

        expect(result.dissolvedGroupIds).toEqual(['g1']);
        expect(fake.get('groups/g2')!.memberCardIds).toEqual(['u', 's']);
        expect(fake.get('cards/h')!.order).toBe(5);
    });

    it('M1: rejects a non-finite position and a self-target with 400', async () => {
        for (const target of [
            { kind: 'position', order: Number.NaN },
            { kind: 'position', order: Infinity },
            { kind: 'card', cardId: 's' },
        ] as const) {
            const err = await rejection(adapter.moveCard(RETRO, 's', target));
            expect((err as AppError).httpStatus).toBe(400);
        }
    });

    it('M2: 404 when the source is missing or belongs to another retrospective', async () => {
        await expectNotFound(adapter.moveCard(RETRO, 'ghost', { kind: 'position', order: 1 }));
        fake.seed('cards/s', card(1, { retrospectiveId: 'other' }));
        await expectNotFound(adapter.moveCard(RETRO, 's', { kind: 'position', order: 1 }));
    });

    it('M3: 404 for a missing target card or group', async () => {
        await expectNotFound(adapter.moveCard(RETRO, 's', { kind: 'card', cardId: 'ghost' }));
        await expectNotFound(adapter.moveCard(RETRO, 's', { kind: 'group', groupId: 'ghost' }));
    });

    it('M4: 409 when the target card or group is in another column or retrospective', async () => {
        fake.seed('cards/t', card(2, { column: 'col2' }));
        await expectConflict(adapter.moveCard(RETRO, 's', { kind: 'card', cardId: 't' }));
        fake.seed('cards/t', card(2, { retrospectiveId: 'other' }));
        await expectConflict(adapter.moveCard(RETRO, 's', { kind: 'card', cardId: 't' }));
        fake.seed('groups/g2', group('t', ['u'], 7, { column: 'col2' }));
        await expectConflict(adapter.moveCard(RETRO, 's', { kind: 'group', groupId: 'g2' }));
        fake.seed('groups/g3', group('t', ['u'], 7, { retrospectiveId: 'other' }));
        await expectConflict(adapter.moveCard(RETRO, 's', { kind: 'group', groupId: 'g3' }));
    });

    it('M5: 409 when the target card is already grouped, with no writes', async () => {
        fake.seed('cards/t', grouped('g2', 2));
        await expectConflict(adapter.moveCard(RETRO, 's', { kind: 'card', cardId: 't' }));
        expect(fake.get('cards/s')).not.toHaveProperty('groupId');
    });

    it('M6: 400 when the card is already in the target group', async () => {
        fake.seed('groups/g1', group('h', ['s'], 5));
        fake.seed('cards/h', grouped('g1', 5, { isGroupHead: true }));
        fake.seed('cards/s', grouped('g1', 5, { isGroupHead: false, groupOrder: 0 }));
        const err = await rejection(adapter.moveCard(RETRO, 's', { kind: 'group', groupId: 'g1' }));
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).httpStatus).toBe(400);
    });

    it('M7: 409 when the source group is missing or does not list the source', async () => {
        fake.seed('cards/s', grouped('ghost', 1));
        await expectConflict(adapter.moveCard(RETRO, 's', { kind: 'position', order: 1 }));
        fake.seed('groups/ghost', group('h', ['other'], 5));
        await expectConflict(adapter.moveCard(RETRO, 's', { kind: 'position', order: 1 }));
    });
});

describe('setGroupTitle', () => {
    beforeEach(() => fake.seed('groups/g1', group('a', ['b'], 5, { title: 'Old' })));

    it('sets a title', async () => {
        const dto = await adapter.setGroupTitle('g1', 'New');
        expect(dto.title).toBe('New');
    });

    it('null removes the stored title', async () => {
        const dto = await adapter.setGroupTitle('g1', null);
        expect(dto.title).toBeUndefined();
        expect(fake.get('groups/g1')).not.toHaveProperty('title');
    });

    it('404 for a missing group', async () => {
        await expectNotFound(adapter.setGroupTitle('ghost', 'x'));
    });
});

describe('renormalizeColumnOrder', () => {
    beforeEach(() => {
        fake.seed('cards/a', card(0.1));
        fake.seed('cards/b', card(0.2));
        fake.seed('groups/g1', group('h', ['m'], 0.15));
    });

    it('writes every item order across cards and groups', async () => {
        await adapter.renormalizeColumnOrder(RETRO, COL, [
            { kind: 'card', id: 'a', order: 0 },
            { kind: 'group', id: 'g1', order: 1 },
            { kind: 'card', id: 'b', order: 2 },
        ]);
        expect(fake.get('cards/a')!.order).toBe(0);
        expect(fake.get('groups/g1')!.order).toBe(1);
        expect(fake.get('cards/b')!.order).toBe(2);
    });

    it('R2: 404 for a missing or foreign item, with no writes', async () => {
        await expectNotFound(adapter.renormalizeColumnOrder(RETRO, COL, [{ kind: 'card', id: 'a', order: 0 }, { kind: 'card', id: 'ghost', order: 1 }]));
        fake.seed('cards/b', card(0.2, { retrospectiveId: 'other' }));
        await expectNotFound(adapter.renormalizeColumnOrder(RETRO, COL, [{ kind: 'card', id: 'a', order: 0 }, { kind: 'card', id: 'b', order: 1 }]));
        expect(fake.get('cards/a')!.order).toBe(0.1);
    });

    it('R3: 409 for an item in another column or a grouped card, with no writes', async () => {
        fake.seed('cards/b', card(0.2, { column: 'col2' }));
        await expectConflict(adapter.renormalizeColumnOrder(RETRO, COL, [{ kind: 'card', id: 'a', order: 0 }, { kind: 'card', id: 'b', order: 1 }]));
        fake.seed('cards/b', grouped('g1', 0.2));
        await expectConflict(adapter.renormalizeColumnOrder(RETRO, COL, [{ kind: 'card', id: 'a', order: 0 }, { kind: 'card', id: 'b', order: 1 }]));
        expect(fake.get('cards/a')!.order).toBe(0.1);
    });
});
