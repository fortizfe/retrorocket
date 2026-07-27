import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildBoardsTestApp, sessionCookieFor } from '../boardsTestApp';
import type { BoardWithColumns } from '../../../src/application/ports/boards';
import type { Card, CardGroup } from '../../../src/application/ports/cards';

const BOARD: BoardWithColumns = {
    id: 'b1', title: 'X', templateId: 'default', createdBy: 'u1', createdByName: 'Ana', locale: 'en',
    createdAt: new Date(), updatedAt: new Date(), participantCount: 0, isActive: true, columns: [],
};

const HEAD: Card = { id: 'c1', retrospectiveId: 'b1', content: 'Head', column: 'helped', createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(), likes: [], reactions: [], order: 0 };
const MEMBER: Card = { id: 'c2', retrospectiveId: 'b1', content: 'Member', column: 'helped', createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(), likes: [], reactions: [], order: 1 };

const GROUP: CardGroup = {
    id: 'g1', retrospectiveId: 'b1', column: 'helped', headCardId: 'c1', memberCardIds: ['c2'],
    isCollapsed: false, createdAt: new Date(), createdBy: 'u1', order: 0,
};

describe('POST /api/boards/:id/groups', () => {
    it('creates a group', async () => {
        const { app, user } = buildBoardsTestApp({ boards: [BOARD], cards: [HEAD, MEMBER] });
        const res = await request(app)
            .post('/api/boards/b1/groups')
            .set('Cookie', sessionCookieFor(user.uid))
            .send({ headCardId: 'c1', memberCardIds: ['c2'] });
        expect(res.status).toBe(201);
        expect(res.body.headCardId).toBe('c1');
    });
});

describe('DELETE /api/boards/:id/groups/:groupId', () => {
    it('disbands the group', async () => {
        const { app, user } = buildBoardsTestApp({ boards: [BOARD], cards: [HEAD, MEMBER], groups: [GROUP] });
        const res = await request(app).delete('/api/boards/b1/groups/g1').set('Cookie', sessionCookieFor(user.uid));
        expect(res.status).toBe(204);
    });
});

describe('PUT /api/boards/:id/groups/:groupId/cards/:cardId', () => {
    it('adds a card to the group', async () => {
        const extra: Card = { ...MEMBER, id: 'c3' };
        const { app, user } = buildBoardsTestApp({ boards: [BOARD], cards: [HEAD, MEMBER, extra], groups: [GROUP] });
        const res = await request(app).put('/api/boards/b1/groups/g1/cards/c3').set('Cookie', sessionCookieFor(user.uid));
        expect(res.status).toBe(200);
        expect(res.body.memberCardIds).toContain('c3');
    });
});

describe('DELETE /api/boards/:id/groups/:groupId/cards/:cardId', () => {
    it('removes a card, promoting the next member to head when needed', async () => {
        const { app, user } = buildBoardsTestApp({ boards: [BOARD], cards: [HEAD, MEMBER], groups: [GROUP] });
        const res = await request(app).delete('/api/boards/b1/groups/g1/cards/c1').set('Cookie', sessionCookieFor(user.uid));
        expect(res.status).toBe(200);
        expect(res.body.headCardId).toBe('c2');
    });
});

describe('PATCH /api/boards/:id/groups/:groupId', () => {
    it('sets the collapsed flag', async () => {
        const { app, user } = buildBoardsTestApp({ boards: [BOARD], cards: [HEAD, MEMBER], groups: [GROUP] });
        const res = await request(app).patch('/api/boards/b1/groups/g1').set('Cookie', sessionCookieFor(user.uid)).send({ isCollapsed: true });
        expect(res.status).toBe(200);
        expect(res.body.isCollapsed).toBe(true);
    });
});

describe('GET and PATCH /api/boards/:id/column-grouping', () => {
    it('returns an empty object before anything is saved', async () => {
        const { app, user } = buildBoardsTestApp({ boards: [BOARD] });
        const res = await request(app).get('/api/boards/b1/column-grouping').set('Cookie', sessionCookieFor(user.uid));
        expect(res.status).toBe(200);
        expect(res.body.states).toEqual({});
    });

    it('persists and reads back the column-grouping UI state', async () => {
        const { app, user } = buildBoardsTestApp({ boards: [BOARD] });
        const patch = await request(app)
            .patch('/api/boards/b1/column-grouping')
            .set('Cookie', sessionCookieFor(user.uid))
            .send({ states: { helped: { mode: 'grouped' } } });
        expect(patch.status).toBe(200);
        expect(patch.body.states).toEqual({ helped: { mode: 'grouped' } });

        const get = await request(app).get('/api/boards/b1/column-grouping').set('Cookie', sessionCookieFor(user.uid));
        expect(get.body.states).toEqual({ helped: { mode: 'grouped' } });
    });
});

describe('POST /api/boards/:id/typing', () => {
    it('accepts a typing status update', async () => {
        const { app, user } = buildBoardsTestApp({ boards: [BOARD] });
        const res = await request(app)
            .post('/api/boards/b1/typing')
            .set('Cookie', sessionCookieFor(user.uid))
            .send({ column: 'helped', isActive: true });
        expect(res.status).toBe(204);
    });
});
