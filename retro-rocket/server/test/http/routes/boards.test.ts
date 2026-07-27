import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildBoardsTestApp, defaultUser, sessionCookieFor } from '../boardsTestApp';
import type { BoardWithColumns } from '../../../src/application/ports/boards';

const ACTIVE_BOARD: BoardWithColumns = {
    id: 'b1',
    title: 'Sprint 42 Retro',
    templateId: 'default',
    createdBy: 'u1',
    createdByName: 'Ana',
    locale: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    participantCount: 0,
    isActive: true,
    columns: [{ id: 'helped', i18nKey: 'retrospective.columns.helped', type: 'regular', order: 0, defaultColor: 'bg-green-50' }],
};

describe('POST /api/boards', () => {
    it('rejects an unauthenticated request', async () => {
        const { app } = buildBoardsTestApp();
        const res = await request(app).post('/api/boards').send({ templateId: 'default', title: 'X' });
        expect(res.status).toBe(401);
    });

    it('creates a board for the signed-in user', async () => {
        const { app, user } = buildBoardsTestApp();
        const res = await request(app)
            .post('/api/boards')
            .set('Cookie', sessionCookieFor(user.uid))
            .send({ templateId: 'default', title: 'Sprint 42 Retro' });

        expect(res.status).toBe(201);
        expect(res.body.title).toBe('Sprint 42 Retro');
        expect(res.body.createdBy).toBe(user.uid);
        expect(res.body.columns.at(-1)).toMatchObject({ id: 'actionItems' });
    });

    it('rejects an unknown template id with 400', async () => {
        const { app, user } = buildBoardsTestApp();
        const res = await request(app)
            .post('/api/boards')
            .set('Cookie', sessionCookieFor(user.uid))
            .send({ templateId: 'nope', title: 'X' });
        expect(res.status).toBe(400);
    });
});

describe('GET /api/boards/:id', () => {
    it('returns the board for its creator', async () => {
        const { app, user } = buildBoardsTestApp({ signedInUser: defaultUser({ uid: 'u1' }), boards: [ACTIVE_BOARD] });
        const res = await request(app).get('/api/boards/b1').set('Cookie', sessionCookieFor(user.uid));
        expect(res.status).toBe(200);
        expect(res.body.id).toBe('b1');
    });

    it('returns 404 for a board the requester cannot access', async () => {
        const { app } = buildBoardsTestApp({ signedInUser: defaultUser({ uid: 'stranger' }), boards: [ACTIVE_BOARD] });
        const res = await request(app).get('/api/boards/b1').set('Cookie', sessionCookieFor('stranger'));
        expect(res.status).toBe(404);
    });

    it('returns 404 for a nonexistent board', async () => {
        const { app, user } = buildBoardsTestApp();
        const res = await request(app).get('/api/boards/missing').set('Cookie', sessionCookieFor(user.uid));
        expect(res.status).toBe(404);
    });
});

describe('POST /api/boards/:id/join', () => {
    it('joins a new participant and reflects the incremented count', async () => {
        const { app } = buildBoardsTestApp({ signedInUser: defaultUser({ uid: 'u2' }), boards: [ACTIVE_BOARD] });
        const res = await request(app).post('/api/boards/b1/join').set('Cookie', sessionCookieFor('u2'));

        expect(res.status).toBe(200);
        expect(res.body.isNew).toBe(true);
        expect(res.body.board.participantCount).toBe(1);
        expect(res.body.participant.userId).toBe('u2');
        expect(typeof res.body.participant.id).toBe('string');
        expect(typeof res.body.participant.joinedAt).toBe('string');
    });

    it('is idempotent on a second join by the same user', async () => {
        const { app } = buildBoardsTestApp({ signedInUser: defaultUser({ uid: 'u2' }), boards: [ACTIVE_BOARD] });
        const first = await request(app).post('/api/boards/b1/join').set('Cookie', sessionCookieFor('u2'));
        const res = await request(app).post('/api/boards/b1/join').set('Cookie', sessionCookieFor('u2'));

        expect(res.status).toBe(200);
        expect(res.body.isNew).toBe(false);
        expect(res.body.board.participantCount).toBe(1);
        expect(res.body.participant.id).toBe(first.body.participant.id);
    });

    it('returns 404 for a nonexistent board', async () => {
        const { app, user } = buildBoardsTestApp();
        const res = await request(app).post('/api/boards/missing/join').set('Cookie', sessionCookieFor(user.uid));
        expect(res.status).toBe(404);
    });
});

describe('GET /api/boards', () => {
    it('lists owned and joined boards for the current user', async () => {
        const owned = ACTIVE_BOARD;
        const other: BoardWithColumns = { ...ACTIVE_BOARD, id: 'b2', createdBy: 'facilitator-2' };
        const { app } = buildBoardsTestApp({
            signedInUser: defaultUser({ uid: 'u1' }),
            boards: [owned, other],
            participants: [{ id: 'p1', retrospectiveId: 'b2', userId: 'u1', name: 'Ana', photoURL: null, joinedAt: new Date(), isFacilitator: false, isActive: true }],
        });

        const res = await request(app).get('/api/boards').set('Cookie', sessionCookieFor('u1'));

        expect(res.status).toBe(200);
        expect(res.body.boards).toHaveLength(2);
        const owned1 = res.body.boards.find((b: { id: string }) => b.id === 'b1');
        const joined1 = res.body.boards.find((b: { id: string }) => b.id === 'b2');
        expect(owned1.isCreator).toBe(true);
        expect(joined1.isCreator).toBe(false);
    });

    it('returns an empty list for a new user', async () => {
        const { app, user } = buildBoardsTestApp();
        const res = await request(app).get('/api/boards').set('Cookie', sessionCookieFor(user.uid));

        expect(res.status).toBe(200);
        expect(res.body.boards).toEqual([]);
    });
});

describe('PATCH /api/boards/:id', () => {
    it('renames the board for its creator', async () => {
        const { app } = buildBoardsTestApp({ signedInUser: defaultUser({ uid: 'u1' }), boards: [ACTIVE_BOARD] });
        const res = await request(app).patch('/api/boards/b1').set('Cookie', sessionCookieFor('u1')).send({ title: 'New title' });

        expect(res.status).toBe(200);
        expect(res.body.title).toBe('New title');
    });

    it('rejects a non-creator with 403', async () => {
        const { app } = buildBoardsTestApp({
            signedInUser: defaultUser({ uid: 'u2' }),
            boards: [ACTIVE_BOARD],
            participants: [{ id: 'p2', retrospectiveId: 'b1', userId: 'u2', name: 'Bob', photoURL: null, joinedAt: new Date(), isFacilitator: false, isActive: true }],
        });
        const res = await request(app).patch('/api/boards/b1').set('Cookie', sessionCookieFor('u2')).send({ title: 'Hijacked' });

        expect(res.status).toBe(403);
    });

    it('returns 404 for a nonexistent board', async () => {
        const { app, user } = buildBoardsTestApp();
        const res = await request(app).patch('/api/boards/missing').set('Cookie', sessionCookieFor(user.uid)).send({ title: 'X' });
        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/boards/:id', () => {
    it('deletes the board for its creator', async () => {
        const { app } = buildBoardsTestApp({ signedInUser: defaultUser({ uid: 'u1' }), boards: [ACTIVE_BOARD] });
        const res = await request(app).delete('/api/boards/b1').set('Cookie', sessionCookieFor('u1'));

        expect(res.status).toBe(204);
        const getRes = await request(app).get('/api/boards/b1').set('Cookie', sessionCookieFor('u1'));
        expect(getRes.status).toBe(404);
    });

    it('rejects a non-creator with 403', async () => {
        const { app } = buildBoardsTestApp({
            signedInUser: defaultUser({ uid: 'u2' }),
            boards: [ACTIVE_BOARD],
            participants: [{ id: 'p2', retrospectiveId: 'b1', userId: 'u2', name: 'Bob', photoURL: null, joinedAt: new Date(), isFacilitator: false, isActive: true }],
        });
        const res = await request(app).delete('/api/boards/b1').set('Cookie', sessionCookieFor('u2'));

        expect(res.status).toBe(403);
    });
});
