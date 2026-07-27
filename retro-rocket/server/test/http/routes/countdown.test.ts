import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildBoardsTestApp, defaultUser, sessionCookieFor } from '../boardsTestApp';
import type { BoardWithColumns } from '../../../src/application/ports/boards';

const BOARD: BoardWithColumns = {
    id: 'b1', title: 'X', templateId: 'default', createdBy: 'facilitator-1', createdByName: 'Ana', locale: 'en',
    createdAt: new Date(), updatedAt: new Date(), participantCount: 1, isActive: true, columns: [],
};

describe('POST /api/boards/:id/countdown', () => {
    it('creates a timer for the facilitator', async () => {
        const { app } = buildBoardsTestApp({ boards: [BOARD], signedInUser: defaultUser({ uid: 'facilitator-1' }) });
        const res = await request(app).post('/api/boards/b1/countdown').set('Cookie', sessionCookieFor('facilitator-1')).send({ duration: 300 });
        expect(res.status).toBe(201);
        expect(res.body.duration).toBe(300);
    });

    it('rejects a non-facilitator with 403', async () => {
        const { app } = buildBoardsTestApp({
            boards: [BOARD],
            signedInUser: defaultUser({ uid: 'u2' }),
            participants: [{ id: 'p2', retrospectiveId: 'b1', userId: 'u2', name: 'Bob', photoURL: null, joinedAt: new Date(), isFacilitator: false, isActive: true }],
        });
        const res = await request(app).post('/api/boards/b1/countdown').set('Cookie', sessionCookieFor('u2')).send({ duration: 300 });
        expect(res.status).toBe(403);
    });
});

describe('POST /api/boards/:id/countdown/start | /pause | /reset', () => {
    it('starts, pauses, and resets the timer', async () => {
        const { app } = buildBoardsTestApp({ boards: [BOARD], signedInUser: defaultUser({ uid: 'facilitator-1' }) });
        const cookie = sessionCookieFor('facilitator-1');
        await request(app).post('/api/boards/b1/countdown').set('Cookie', cookie).send({ duration: 100 });

        const started = await request(app).post('/api/boards/b1/countdown/start').set('Cookie', cookie);
        expect(started.status).toBe(200);
        expect(started.body.isRunning).toBe(true);

        const paused = await request(app).post('/api/boards/b1/countdown/pause').set('Cookie', cookie);
        expect(paused.status).toBe(200);
        expect(paused.body.isPaused).toBe(true);

        const reset = await request(app).post('/api/boards/b1/countdown/reset').set('Cookie', cookie);
        expect(reset.status).toBe(200);
        expect(reset.body.duration).toBe(100);
    });
});

describe('DELETE /api/boards/:id/countdown', () => {
    it('deletes the timer for the facilitator', async () => {
        const { app } = buildBoardsTestApp({ boards: [BOARD], signedInUser: defaultUser({ uid: 'facilitator-1' }) });
        const cookie = sessionCookieFor('facilitator-1');
        await request(app).post('/api/boards/b1/countdown').set('Cookie', cookie).send({ duration: 100 });

        const res = await request(app).delete('/api/boards/b1/countdown').set('Cookie', cookie);
        expect(res.status).toBe(204);
    });
});
