import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildBoardsTestApp, sessionCookieFor } from './boardsTestApp';
import type { FakeBoardRecord } from '../../application/use-cases/boards/boardsFakes';

function board(overrides: Partial<FakeBoardRecord>): FakeBoardRecord {
    return {
        id: 'b1',
        title: 'Board',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        participantCount: 1,
        isActive: true,
        createdBy: 'owner',
        ...overrides,
    };
}

describe('GET /api/boards', () => {
    it('lists the signed-in user’s created and joined boards', async () => {
        const { app } = buildBoardsTestApp({
            boards: [board({ id: 'b1', createdBy: 'u1' }), board({ id: 'b2', createdBy: 'u2' })],
            memberships: [{ boardId: 'b2', uid: 'u1' }],
        });
        const res = await request(app).get('/api/boards').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body.boards).toHaveLength(2);
    });

    it('401s without a session cookie', async () => {
        const { app } = buildBoardsTestApp();
        const res = await request(app).get('/api/boards');
        expect(res.status).toBe(401);
    });
});

describe('POST /api/boards', () => {
    it('creates a board and returns 201 with a boardId', async () => {
        const { app } = buildBoardsTestApp();
        const res = await request(app)
            .post('/api/boards')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ templateId: 'default', title: 'New Board', locale: 'en' });
        expect(res.status).toBe(201);
        expect(res.body.boardId).toBeTruthy();
    });

    it('400s on an invalid template', async () => {
        const { app } = buildBoardsTestApp();
        const res = await request(app)
            .post('/api/boards')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ templateId: 'not-a-template', title: 'X', locale: 'en' });
        expect(res.status).toBe(400);
    });

    it('400s on an empty title', async () => {
        const { app } = buildBoardsTestApp();
        const res = await request(app)
            .post('/api/boards')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ templateId: 'default', title: '   ', locale: 'en' });
        expect(res.status).toBe(400);
    });

    it('401s without a session cookie', async () => {
        const { app } = buildBoardsTestApp();
        const res = await request(app).post('/api/boards').send({ templateId: 'default', title: 'X', locale: 'en' });
        expect(res.status).toBe(401);
    });
});

describe('POST /api/boards/:id/join', () => {
    it('joins an active board and returns it', async () => {
        const { app } = buildBoardsTestApp({ boards: [board({ id: 'b1', createdBy: 'owner' })] });
        const res = await request(app).post('/api/boards/b1/join').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 'b1', participantCount: 2, isCreator: false });
    });

    it('is idempotent for a re-join', async () => {
        const { app } = buildBoardsTestApp({
            boards: [board({ id: 'b1', createdBy: 'owner' })],
            memberships: [{ boardId: 'b1', uid: 'u1' }],
        });
        const res = await request(app).post('/api/boards/b1/join').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body.participantCount).toBe(1);
    });

    it('404s for a nonexistent board', async () => {
        const { app } = buildBoardsTestApp();
        const res = await request(app).post('/api/boards/missing/join').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(404);
    });

    it('401s without a session cookie', async () => {
        const { app } = buildBoardsTestApp({ boards: [board({})] });
        const res = await request(app).post('/api/boards/b1/join');
        expect(res.status).toBe(401);
    });
});

describe('PATCH /api/boards/:id', () => {
    it('renames a board the caller owns', async () => {
        const { app } = buildBoardsTestApp({ boards: [board({ id: 'b1', createdBy: 'u1' })] });
        const res = await request(app)
            .patch('/api/boards/b1')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ title: 'Renamed' });
        expect(res.status).toBe(204);
    });

    it('403s for a non-owner', async () => {
        const { app } = buildBoardsTestApp({ boards: [board({ id: 'b1', createdBy: 'owner' })] });
        const res = await request(app)
            .patch('/api/boards/b1')
            .set('Cookie', sessionCookieFor('someone-else'))
            .send({ title: 'Hijack' });
        expect(res.status).toBe(403);
    });

    it('404s for a nonexistent board', async () => {
        const { app } = buildBoardsTestApp();
        const res = await request(app)
            .patch('/api/boards/missing')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ title: 'X' });
        expect(res.status).toBe(404);
    });

    it('401s without a session cookie', async () => {
        const { app } = buildBoardsTestApp({ boards: [board({ id: 'b1' })] });
        const res = await request(app).patch('/api/boards/b1').send({ title: 'X' });
        expect(res.status).toBe(401);
    });
});

describe('DELETE /api/boards/:id', () => {
    it('deletes a board the caller owns', async () => {
        const { app } = buildBoardsTestApp({ boards: [board({ id: 'b1', createdBy: 'u1' })] });
        const res = await request(app).delete('/api/boards/b1').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(204);
    });

    it('403s for a non-owner', async () => {
        const { app } = buildBoardsTestApp({ boards: [board({ id: 'b1', createdBy: 'owner' })] });
        const res = await request(app).delete('/api/boards/b1').set('Cookie', sessionCookieFor('someone-else'));
        expect(res.status).toBe(403);
    });

    it('404s for a nonexistent board', async () => {
        const { app } = buildBoardsTestApp();
        const res = await request(app).delete('/api/boards/missing').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(404);
    });

    it('401s without a session cookie', async () => {
        const { app } = buildBoardsTestApp({ boards: [board({ id: 'b1' })] });
        const res = await request(app).delete('/api/boards/b1');
        expect(res.status).toBe(401);
    });
});
