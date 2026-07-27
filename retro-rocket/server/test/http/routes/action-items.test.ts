import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildBoardsTestApp, defaultUser, sessionCookieFor } from '../boardsTestApp';
import type { BoardWithColumns } from '../../../src/application/ports/boards';

const BOARD: BoardWithColumns = {
    id: 'b1', title: 'X', templateId: 'default', createdBy: 'facilitator-1', createdByName: 'Ana', locale: 'en',
    createdAt: new Date(), updatedAt: new Date(), participantCount: 1, isActive: true, columns: [],
};

const FACILITATOR = defaultUser({ uid: 'facilitator-1' });
const OTHER = defaultUser({ uid: 'u2' });

describe('POST /api/boards/:id/action-items', () => {
    it('creates an action item for the facilitator', async () => {
        const { app } = buildBoardsTestApp({ boards: [BOARD], signedInUser: FACILITATOR });
        const res = await request(app)
            .post('/api/boards/b1/action-items')
            .set('Cookie', sessionCookieFor('facilitator-1'))
            .send({ content: 'Fix CI', assignedTo: 'u2', assignedToName: 'Bob' });
        expect(res.status).toBe(201);
        expect(res.body.content).toBe('Fix CI');
        expect(res.body.assignedTo).toBe('u2');
    });

    it('rejects a non-facilitator with 403', async () => {
        const { app } = buildBoardsTestApp({
            boards: [BOARD],
            signedInUser: OTHER,
            participants: [{ id: 'p2', retrospectiveId: 'b1', userId: 'u2', name: 'Bob', photoURL: null, joinedAt: new Date(), isFacilitator: false, isActive: true }],
        });
        const res = await request(app).post('/api/boards/b1/action-items').set('Cookie', sessionCookieFor('u2')).send({ content: 'Sneaky item' });
        expect(res.status).toBe(403);
    });
});

describe('POST /api/boards/:id/action-items/from-card', () => {
    it('creates an action item from card content', async () => {
        const { app } = buildBoardsTestApp({ boards: [BOARD], signedInUser: FACILITATOR });
        const res = await request(app)
            .post('/api/boards/b1/action-items/from-card')
            .set('Cookie', sessionCookieFor('facilitator-1'))
            .send({ cardContent: 'Speed up CI' });
        expect(res.status).toBe(201);
        expect(res.body.content).toBe('Speed up CI');
    });
});

describe('PATCH /api/boards/:id/action-items/:itemId and DELETE', () => {
    it('updates and deletes an action item as the facilitator', async () => {
        const { app } = buildBoardsTestApp({ boards: [BOARD], signedInUser: FACILITATOR });
        const cookie = sessionCookieFor('facilitator-1');
        const created = await request(app).post('/api/boards/b1/action-items').set('Cookie', cookie).send({ content: 'A' });

        const updated = await request(app).patch(`/api/boards/b1/action-items/${created.body.id}`).set('Cookie', cookie).send({ content: 'A revised' });
        expect(updated.status).toBe(200);
        expect(updated.body.content).toBe('A revised');

        const deleted = await request(app).delete(`/api/boards/b1/action-items/${created.body.id}`).set('Cookie', cookie);
        expect(deleted.status).toBe(204);
    });
});
