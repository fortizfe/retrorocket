import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { FirestoreCardGroupAdapter, toCardGroup } from '../../../src/adapters/firebase/FirestoreCardGroupAdapter';

describe('toCardGroup', () => {
    const data = {
        retrospectiveId: 'r1',
        column: 'col1',
        headCardId: 'c1',
        memberCardIds: ['c2', 'c3'],
        isCollapsed: false,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: 'u1',
        order: 2,
    };

    it('maps a Firestore document into a CardGroupDTO', () => {
        expect(toCardGroup('g1', data)).toMatchObject({ id: 'g1', headCardId: 'c1', memberCardIds: ['c2', 'c3'] });
    });

    it('omits title when absent rather than setting it to undefined', () => {
        const group = toCardGroup('g1', data);
        expect(group.title).toBeUndefined();
    });

    it('preserves a present title', () => {
        expect(toCardGroup('g1', { ...data, title: 'Custom Title' }).title).toBe('Custom Title');
    });

    it('defaults memberCardIds to [] and isCollapsed to false when absent', () => {
        const { memberCardIds: _m, isCollapsed: _c, ...rest } = data;
        void _m;
        void _c;
        expect(toCardGroup('g1', rest)).toMatchObject({ memberCardIds: [], isCollapsed: false });
    });
});

it('toCardGroup maps origin when present and leaves it undefined when absent (legacy)', () => {
    const base = {
        retrospectiveId: 'r1',
        column: 'col1',
        headCardId: 'c1',
        memberCardIds: ['c2'],
        isCollapsed: false,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: 'u1',
        order: 2,
    };
    expect(toCardGroup('g1', { ...base, origin: 'manual' })).toMatchObject({ origin: 'manual' });
    expect(toCardGroup('g1', { ...base, origin: 'suggestion' })).toMatchObject({ origin: 'suggestion' });
    expect(toCardGroup('g1', base).origin).toBeUndefined();
});

// ---------------------------------------------------------------------------
// 059-drag-to-group-cards, T006 (red phase). Transactional grouping behavior against the
// Firestore EMULATOR (transactions, contention and FieldValue.delete cannot be faithfully
// faked). Run with:
//   firebase emulators:exec --only firestore "npm run test:server -- FirestoreCardGroupAdapter"
// The block is skipped when FIRESTORE_EMULATOR_HOST is unset (plain `npm run test:server`).
// ---------------------------------------------------------------------------
const HAS_EMULATOR = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

function emulatorDb(): Firestore {
    const name = 'group-adapter-059';
    const app = getApps().some((a) => a.name === name) ? getApp(name) : initializeApp({ projectId: 'demo-retrorocket-059' }, name);
    return getFirestore(app);
}

const conflict = { code: 'group_conflict', httpStatus: 409 };
const notFound = { code: 'not_found', httpStatus: 404 };

describe.skipIf(!HAS_EMULATOR)('FirestoreCardGroupAdapter (059, emulator)', () => {
    let db: Firestore;
    let adapter: FirestoreCardGroupAdapter;
    let r: string; // retrospective id, unique per test so no cleanup is needed

    beforeAll(() => {
        db = emulatorDb();
        adapter = new FirestoreCardGroupAdapter(db);
    });

    // Unique ids per test.
    let seq = 0;
    const id = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}-${seq++}`;
    function fresh() {
        r = id('retro');
    }

    async function seedCard(over: Record<string, unknown> & { id: string }) {
        const { id: cardId, ...rest } = over;
        await db.collection('cards').doc(cardId).set({
            content: 'x',
            column: 'col1',
            createdBy: 'u1',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: r,
            votes: 0,
            likes: [],
            reactions: [],
            order: 0,
            ...rest,
        });
        return cardId;
    }

    /** Seeds a consistent group and its member cards (head + members). */
    async function seedGroup(gid: string, head: string, members: string[], over: Record<string, unknown> = {}) {
        await db.collection('groups').doc(gid).set({
            retrospectiveId: r,
            column: 'col1',
            headCardId: head,
            memberCardIds: members,
            isCollapsed: false,
            createdAt: new Date(),
            createdBy: 'u1',
            order: 0,
            ...over,
        });
        await db.collection('cards').doc(head).set({ groupId: gid, isGroupHead: true }, { merge: true });
        for (let i = 0; i < members.length; i++) {
            await db.collection('cards').doc(members[i]).set({ groupId: gid, isGroupHead: false, groupOrder: i }, { merge: true });
        }
    }

    const card = async (cid: string) => (await db.collection('cards').doc(cid).get()).data()!;
    const group = async (gid: string) => await db.collection('groups').doc(gid).get();
    const groupsOfRetro = async () => (await db.collection('groups').where('retrospectiveId', '==', r).get()).docs;

    // ----- C1: createGroup -------------------------------------------------
    describe('createGroup (C1)', () => {
        it('P2: rejects with not_found when any card is missing, and writes nothing', async () => {
            fresh();
            const head = await seedCard({ id: id('h') });
            await expect(adapter.createGroup({ retrospectiveId: r, column: 'col1', headCardId: head, memberCardIds: ['missing-card'], createdBy: 'u1' })).rejects.toMatchObject(notFound);
            expect(await groupsOfRetro()).toHaveLength(0);
            expect((await card(head)).groupId).toBeUndefined();
        });

        it('P3: rejects with group_conflict when a card belongs to another retrospective', async () => {
            fresh();
            const head = await seedCard({ id: id('h') });
            const other = await seedCard({ id: id('o'), retrospectiveId: 'someone-elses-retro' });
            await expect(adapter.createGroup({ retrospectiveId: r, column: 'col1', headCardId: head, memberCardIds: [other], createdBy: 'u1' })).rejects.toMatchObject(conflict);
            expect(await groupsOfRetro()).toHaveLength(0);
        });

        it("P4: rejects with group_conflict when a member is not in the head's column", async () => {
            fresh();
            const head = await seedCard({ id: id('h'), column: 'col1' });
            const m = await seedCard({ id: id('m'), column: 'col2' });
            await expect(adapter.createGroup({ retrospectiveId: r, column: 'col1', headCardId: head, memberCardIds: [m], createdBy: 'u1' })).rejects.toMatchObject(conflict);
            expect(await groupsOfRetro()).toHaveLength(0);
        });

        it('P5: rejects with group_conflict when any card is already grouped, leaving the other group intact', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const head = await seedCard({ id: id('h') });
            const gid = id('g');
            await seedGroup(gid, a, [b]);
            await expect(adapter.createGroup({ retrospectiveId: r, column: 'col1', headCardId: head, memberCardIds: [b], createdBy: 'u1' })).rejects.toMatchObject(conflict);
            expect((await card(b)).groupId).toBe(gid);
            expect((await card(head)).groupId).toBeUndefined();
            expect(await groupsOfRetro()).toHaveLength(1);
        });

        it("sets group.order = head card's order, persists origin, and keeps votes untouched", async () => {
            fresh();
            const head = await seedCard({ id: id('h'), order: 1712345678.5, votes: 3 });
            const m = await seedCard({ id: id('m'), order: 7, votes: 2 });
            const created = await adapter.createGroup({ retrospectiveId: r, column: 'col1', headCardId: head, memberCardIds: [m], createdBy: 'u1', origin: 'manual' });
            expect(created).toMatchObject({ order: 1712345678.5, origin: 'manual', headCardId: head, memberCardIds: [m] });
            expect(await card(head)).toMatchObject({ groupId: created.id, isGroupHead: true, votes: 3 });
            expect(await card(m)).toMatchObject({ groupId: created.id, isGroupHead: false, groupOrder: 0, votes: 2 });
        });
    });

    // ----- C2: addCardToGroup ----------------------------------------------
    describe('addCardToGroup (C2)', () => {
        it('A1: rejects with not_found when the group is missing', async () => {
            fresh();
            const c = await seedCard({ id: id('c') });
            await expect(adapter.addCardToGroup('no-such-group', c)).rejects.toMatchObject(notFound);
        });

        it('A2: rejects with not_found when the card is missing', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const gid = id('g');
            await seedGroup(gid, a, [b]);
            await expect(adapter.addCardToGroup(gid, 'no-such-card')).rejects.toMatchObject(notFound);
        });

        it('A3: rejects with group_conflict when the card is in another column or retrospective', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const gid = id('g');
            await seedGroup(gid, a, [b]);
            const otherCol = await seedCard({ id: id('oc'), column: 'col2' });
            const otherRetro = await seedCard({ id: id('or'), retrospectiveId: 'someone-elses-retro' });
            await expect(adapter.addCardToGroup(gid, otherCol)).rejects.toMatchObject(conflict);
            await expect(adapter.addCardToGroup(gid, otherRetro)).rejects.toMatchObject(conflict);
            expect((await group(gid)).data()!.memberCardIds).toEqual([b]);
        });

        it('A4: rejects with group_conflict when the card is already grouped', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const x = await seedCard({ id: id('x') });
            const y = await seedCard({ id: id('y') });
            const g1 = id('g');
            const g2 = id('g');
            await seedGroup(g1, a, [b]);
            await seedGroup(g2, x, [y]);
            await expect(adapter.addCardToGroup(g1, y)).rejects.toMatchObject(conflict);
            expect((await group(g1)).data()!.memberCardIds).toEqual([b]);
            expect((await card(y)).groupId).toBe(g2);
        });

        it('appends the card, sets groupOrder, and leaves group.order unchanged', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const c = await seedCard({ id: id('c') });
            const gid = id('g');
            await seedGroup(gid, a, [b], { order: 42 });
            const updated = await adapter.addCardToGroup(gid, c);
            expect(updated).toMatchObject({ memberCardIds: [b, c], order: 42 });
            expect(await card(c)).toMatchObject({ groupId: gid, isGroupHead: false, groupOrder: 1 });
        });
    });

    // ----- C2b: removeCardFromGroup ----------------------------------------
    describe('removeCardFromGroup (C2b)', () => {
        it('dissolves a 2-card group: returns null, deletes the group, remaining card takes group.order', async () => {
            fresh();
            const a = await seedCard({ id: id('a'), order: 99 });
            const b = await seedCard({ id: id('b'), order: 98 });
            const gid = id('g');
            await seedGroup(gid, a, [b], { order: 10 });
            const result = await adapter.removeCardFromGroup(gid, b);
            expect(result).toBeNull();
            expect((await group(gid)).exists).toBe(false);
            const remaining = await card(a);
            expect(remaining.order).toBe(10);
            expect(remaining.groupId).toBeUndefined();
            expect(remaining.isGroupHead).toBeUndefined();
            expect(remaining.groupOrder).toBeUndefined();
        });

        it('places the removed card right after its former group (midpoint to the next column item)', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const next = await seedCard({ id: id('n'), order: 20 });
            const gid = id('g');
            await seedGroup(gid, a, [b], { order: 10 });
            await adapter.removeCardFromGroup(gid, b);
            void next;
            expect((await card(b)).order).toBe(15);
            expect((await card(b)).groupId).toBeUndefined();
        });

        it('places the removed card at group.order + 1 when the group is last in its column', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            // A card in a different column must not count as "next item".
            await seedCard({ id: id('other-col'), column: 'col2', order: 11.5 });
            const gid = id('g');
            await seedGroup(gid, a, [b], { order: 10 });
            await adapter.removeCardFromGroup(gid, b);
            expect((await card(b)).order).toBe(11);
        });

        it('considers other groups as next items when placing the removed card', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const x = await seedCard({ id: id('x') });
            const y = await seedCard({ id: id('y') });
            const g1 = id('g');
            const g2 = id('g');
            await seedGroup(g1, a, [b], { order: 10 });
            await seedGroup(g2, x, [y], { order: 14 });
            await adapter.removeCardFromGroup(g1, b);
            expect((await card(b)).order).toBe(12);
        });

        it('keeps a 3-card group, promoting the first member when the head is removed and reindexing', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const c = await seedCard({ id: id('c') });
            const gid = id('g');
            await seedGroup(gid, a, [b, c], { order: 5 });
            const result = await adapter.removeCardFromGroup(gid, a);
            expect(result).toMatchObject({ headCardId: b, memberCardIds: [c] });
            expect(await card(b)).toMatchObject({ isGroupHead: true });
            expect((await card(b)).groupOrder).toBeUndefined();
            expect(await card(c)).toMatchObject({ groupId: gid, isGroupHead: false, groupOrder: 0 });
            expect((await card(a)).groupId).toBeUndefined();
        });

        it('rejects with not_found when the group is missing', async () => {
            fresh();
            await expect(adapter.removeCardFromGroup('no-such-group', 'c')).rejects.toMatchObject(notFound);
        });
    });

    // ----- C0: moveCard ----------------------------------------------------
    describe('moveCard (C0)', () => {
        it('M2: 404 when the source card does not exist or belongs to another retrospective', async () => {
            fresh();
            const t = await seedCard({ id: id('t') });
            const foreign = await seedCard({ id: id('f'), retrospectiveId: 'someone-elses-retro' });
            await expect(adapter.moveCard(r, 'no-such-card', { kind: 'card', cardId: t })).rejects.toMatchObject(notFound);
            await expect(adapter.moveCard(r, foreign, { kind: 'card', cardId: t })).rejects.toMatchObject(notFound);
        });

        it('M3: 404 when the target card or group does not exist, with no writes', async () => {
            fresh();
            const s = await seedCard({ id: id('s') });
            await expect(adapter.moveCard(r, s, { kind: 'card', cardId: 'no-such-card' })).rejects.toMatchObject(notFound);
            await expect(adapter.moveCard(r, s, { kind: 'group', groupId: 'no-such-group' })).rejects.toMatchObject(notFound);
            expect(await groupsOfRetro()).toHaveLength(0);
        });

        it('M4: 409 when the target is in another column or retrospective', async () => {
            fresh();
            const s = await seedCard({ id: id('s') });
            const t = await seedCard({ id: id('t'), column: 'col2' });
            const tForeign = await seedCard({ id: id('tf'), retrospectiveId: 'someone-elses-retro' });
            const a = await seedCard({ id: id('a'), column: 'col2' });
            const b = await seedCard({ id: id('b'), column: 'col2' });
            const gid = id('g');
            await seedGroup(gid, a, [b], { column: 'col2' });
            await expect(adapter.moveCard(r, s, { kind: 'card', cardId: t })).rejects.toMatchObject(conflict);
            await expect(adapter.moveCard(r, s, { kind: 'card', cardId: tForeign })).rejects.toMatchObject(conflict);
            await expect(adapter.moveCard(r, s, { kind: 'group', groupId: gid })).rejects.toMatchObject(conflict);
            expect(await groupsOfRetro()).toHaveLength(1);
            expect((await card(s)).groupId).toBeUndefined();
        });

        it('M5: 409 when the target card is already grouped', async () => {
            fresh();
            const s = await seedCard({ id: id('s') });
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const gid = id('g');
            await seedGroup(gid, a, [b]);
            await expect(adapter.moveCard(r, s, { kind: 'card', cardId: b })).rejects.toMatchObject(conflict);
            expect((await card(s)).groupId).toBeUndefined();
            expect((await group(gid)).data()!.memberCardIds).toEqual([b]);
        });

        it("M6: 400 invalid_request when the target group is the source's own group", async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const gid = id('g');
            await seedGroup(gid, a, [b]);
            await expect(adapter.moveCard(r, b, { kind: 'group', groupId: gid })).rejects.toMatchObject({ code: 'invalid_request', httpStatus: 400 });
        });

        it("M7: 409 when the source's group no longer lists the source (broken I1), with no writes", async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const orphan = await seedCard({ id: id('o'), groupId: 'will-not-list-me', isGroupHead: false, groupOrder: 0 });
            const gid = 'will-not-list-me';
            await db.collection('groups').doc(gid).set({ retrospectiveId: r, column: 'col1', headCardId: a, memberCardIds: [b], isCollapsed: false, createdAt: new Date(), createdBy: 'u1', order: 0 });
            const t = await seedCard({ id: id('t') });
            await expect(adapter.moveCard(r, orphan, { kind: 'card', cardId: t })).rejects.toMatchObject(conflict);
            expect((await group(gid)).data()!.memberCardIds).toEqual([b]);
            expect((await card(t)).groupId).toBeUndefined();
        });

        it('ungrouped -> position: sets order only (plain reorder)', async () => {
            fresh();
            const s = await seedCard({ id: id('s'), order: 1, votes: 4 });
            const result = await adapter.moveCard(r, s, { kind: 'position', order: 1712345678.5 });
            expect(result).toEqual({ dissolvedGroupIds: [] });
            expect(await card(s)).toMatchObject({ order: 1712345678.5, votes: 4 });
        });

        it('ungrouped -> card: creates a manual, untitled group with order = target.order and the target as head', async () => {
            fresh();
            const s = await seedCard({ id: id('s'), order: 1, votes: 2 });
            const t = await seedCard({ id: id('t'), order: 30, votes: 5 });
            const result = await adapter.moveCard(r, s, { kind: 'card', cardId: t });
            expect(result.dissolvedGroupIds).toEqual([]);
            expect(result.createdGroupId).toEqual(expect.any(String));
            const g = (await group(result.createdGroupId!)).data()!;
            expect(g).toMatchObject({ retrospectiveId: r, column: 'col1', headCardId: t, memberCardIds: [s], origin: 'manual', order: 30 });
            expect(g.title).toBeUndefined();
            expect(await card(t)).toMatchObject({ groupId: result.createdGroupId, isGroupHead: true, votes: 5 });
            expect(await card(s)).toMatchObject({ groupId: result.createdGroupId, isGroupHead: false, groupOrder: 0, votes: 2 });
        });

        it('ungrouped -> group: appends to the group, which keeps its order', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const s = await seedCard({ id: id('s') });
            const gid = id('g');
            await seedGroup(gid, a, [b], { order: 8 });
            const result = await adapter.moveCard(r, s, { kind: 'group', groupId: gid });
            expect(result).toEqual({ dissolvedGroupIds: [] });
            expect((await group(gid)).data()).toMatchObject({ memberCardIds: [b, s], order: 8 });
            expect(await card(s)).toMatchObject({ groupId: gid, isGroupHead: false, groupOrder: 1 });
        });

        it('grouped (2-card) -> position: dissolves the group, remaining card takes group.order, source gets the new order', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const gid = id('g');
            await seedGroup(gid, a, [b], { order: 10 });
            const result = await adapter.moveCard(r, b, { kind: 'position', order: 77 });
            expect(result).toEqual({ dissolvedGroupIds: [gid] });
            expect((await group(gid)).exists).toBe(false);
            expect((await card(a)).order).toBe(10);
            expect((await card(a)).groupId).toBeUndefined();
            const moved = await card(b);
            expect(moved.order).toBe(77);
            expect(moved.groupId).toBeUndefined();
            expect(moved.isGroupHead).toBeUndefined();
            expect(moved.groupOrder).toBeUndefined();
        });

        it('grouped (3-card) head -> position: group survives with a promoted head and reindexed members', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const c = await seedCard({ id: id('c') });
            const gid = id('g');
            await seedGroup(gid, a, [b, c], { order: 10 });
            const result = await adapter.moveCard(r, a, { kind: 'position', order: 5 });
            expect(result).toEqual({ dissolvedGroupIds: [] });
            expect((await group(gid)).data()).toMatchObject({ headCardId: b, memberCardIds: [c], order: 10 });
            expect(await card(b)).toMatchObject({ isGroupHead: true });
            expect(await card(c)).toMatchObject({ groupOrder: 0 });
            expect((await card(a)).groupId).toBeUndefined();
        });

        it('grouped -> card: detaches (dissolving the old group) and creates a new group on the target', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const t = await seedCard({ id: id('t'), order: 55 });
            const g1 = id('g');
            await seedGroup(g1, a, [b], { order: 10 });
            const result = await adapter.moveCard(r, b, { kind: 'card', cardId: t });
            expect(result.dissolvedGroupIds).toEqual([g1]);
            expect(result.createdGroupId).toEqual(expect.any(String));
            expect((await group(g1)).exists).toBe(false);
            expect((await card(a)).order).toBe(10);
            expect((await group(result.createdGroupId!)).data()).toMatchObject({ headCardId: t, memberCardIds: [b], origin: 'manual', order: 55 });
        });

        it('grouped -> other group: detaches (dissolving the old group) and appends to the target group', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const x = await seedCard({ id: id('x') });
            const y = await seedCard({ id: id('y') });
            const g1 = id('g');
            const g2 = id('g');
            await seedGroup(g1, a, [b], { order: 10 });
            await seedGroup(g2, x, [y], { order: 20 });
            const result = await adapter.moveCard(r, b, { kind: 'group', groupId: g2 });
            expect(result.dissolvedGroupIds).toEqual([g1]);
            expect(result.createdGroupId).toBeUndefined();
            expect((await group(g1)).exists).toBe(false);
            expect((await group(g2)).data()).toMatchObject({ memberCardIds: [y, b], order: 20 });
            expect(await card(b)).toMatchObject({ groupId: g2, isGroupHead: false, groupOrder: 1 });
            expect((await card(a)).order).toBe(10);
        });

        it('two concurrent moves onto the same ungrouped target leave exactly one group and exactly one 409', async () => {
            fresh();
            const t = await seedCard({ id: id('t') });
            const x = await seedCard({ id: id('x') });
            const y = await seedCard({ id: id('y') });
            const results = await Promise.allSettled([adapter.moveCard(r, x, { kind: 'card', cardId: t }), adapter.moveCard(r, y, { kind: 'card', cardId: t })]);
            const fulfilled = results.filter((p) => p.status === 'fulfilled');
            const rejected = results.filter((p): p is PromiseRejectedResult => p.status === 'rejected');
            expect(fulfilled).toHaveLength(1);
            expect(rejected).toHaveLength(1);
            expect(rejected[0].reason).toMatchObject(conflict);
            const groups = await groupsOfRetro();
            expect(groups).toHaveLength(1);
            expect(groups[0].data().headCardId).toBe(t);
            expect(groups[0].data().memberCardIds).toHaveLength(1);
        });
    });

    // ----- C3: setGroupTitle -----------------------------------------------
    describe('setGroupTitle (C3)', () => {
        it('sets the title and does not touch isCollapsed', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const gid = id('g');
            await seedGroup(gid, a, [b], { isCollapsed: true });
            const updated = await adapter.setGroupTitle(gid, 'Deploy pain');
            expect(updated).toMatchObject({ id: gid, title: 'Deploy pain', isCollapsed: true });
            expect((await group(gid)).data()!.title).toBe('Deploy pain');
        });

        it('null deletes the stored title field (never stores empty/null)', async () => {
            fresh();
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const gid = id('g');
            await seedGroup(gid, a, [b], { title: 'Old title' });
            const updated = await adapter.setGroupTitle(gid, null);
            expect(updated.title).toBeUndefined();
            expect('title' in (await group(gid)).data()!).toBe(false);
        });

        it('rejects with not_found when the group is missing', async () => {
            fresh();
            await expect(adapter.setGroupTitle('no-such-group', 'x')).rejects.toMatchObject(notFound);
        });
    });

    // ----- C4: renormalizeColumnOrder --------------------------------------
    describe('renormalizeColumnOrder (C4)', () => {
        it('writes every item order in one transaction (cards and groups)', async () => {
            fresh();
            const c1 = await seedCard({ id: id('c1'), order: 1.0001 });
            const c2 = await seedCard({ id: id('c2'), order: 1.0002 });
            const a = await seedCard({ id: id('a') });
            const b = await seedCard({ id: id('b') });
            const gid = id('g');
            await seedGroup(gid, a, [b], { order: 1.00015 });
            await adapter.renormalizeColumnOrder(r, 'col1', [
                { kind: 'card', id: c1, order: 1024 },
                { kind: 'group', id: gid, order: 2048 },
                { kind: 'card', id: c2, order: 3072 },
            ]);
            expect((await card(c1)).order).toBe(1024);
            expect((await group(gid)).data()!.order).toBe(2048);
            expect((await card(c2)).order).toBe(3072);
        });

        it('R2: 404 when an item does not exist or belongs to another retrospective, with no writes', async () => {
            fresh();
            const c1 = await seedCard({ id: id('c1'), order: 1 });
            const foreign = await seedCard({ id: id('f'), order: 2, retrospectiveId: 'someone-elses-retro' });
            await expect(
                adapter.renormalizeColumnOrder(r, 'col1', [
                    { kind: 'card', id: c1, order: 1024 },
                    { kind: 'card', id: 'no-such-card', order: 2048 },
                ]),
            ).rejects.toMatchObject(notFound);
            await expect(
                adapter.renormalizeColumnOrder(r, 'col1', [
                    { kind: 'card', id: c1, order: 1024 },
                    { kind: 'card', id: foreign, order: 2048 },
                ]),
            ).rejects.toMatchObject(notFound);
            expect((await card(c1)).order).toBe(1);
        });

        it('R3: 409 when an item is in another column, with no writes', async () => {
            fresh();
            const c1 = await seedCard({ id: id('c1'), order: 1 });
            const other = await seedCard({ id: id('o'), order: 2, column: 'col2' });
            await expect(
                adapter.renormalizeColumnOrder(r, 'col1', [
                    { kind: 'card', id: c1, order: 1024 },
                    { kind: 'card', id: other, order: 2048 },
                ]),
            ).rejects.toMatchObject(conflict);
            expect((await card(c1)).order).toBe(1);
            expect((await card(other)).order).toBe(2);
        });

        it('R3: 409 when a card item is grouped', async () => {
            fresh();
            const a = await seedCard({ id: id('a'), order: 1 });
            const b = await seedCard({ id: id('b'), order: 2 });
            const gid = id('g');
            await seedGroup(gid, a, [b]);
            await expect(adapter.renormalizeColumnOrder(r, 'col1', [{ kind: 'card', id: b, order: 1024 }])).rejects.toMatchObject(conflict);
            expect((await card(b)).order).toBe(2);
        });
    });
});
