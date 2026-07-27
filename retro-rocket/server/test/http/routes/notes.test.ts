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

describe('POST /api/boards/:id/notes', () => {
    it('creates a note for the facilitator', async () => {
        const { app } = buildBoardsTestApp({ boards: [BOARD], signedInUser: FACILITATOR });
        const res = await request(app).post('/api/boards/b1/notes').set('Cookie', sessionCookieFor('facilitator-1')).send({ content: 'Watch the timebox' });
        expect(res.status).toBe(201);
        expect(res.body.content).toBe('Watch the timebox');
    });

    it('rejects a non-facilitator with 403 (research.md §2\'s dead-rule finding, now closed)', async () => {
        const { app } = buildBoardsTestApp({
            boards: [BOARD],
            signedInUser: OTHER,
            participants: [{ id: 'p2', retrospectiveId: 'b1', userId: 'u2', name: 'Bob', photoURL: null, joinedAt: new Date(), isFacilitator: false, isActive: true }],
        });
        const res = await request(app).post('/api/boards/b1/notes').set('Cookie', sessionCookieFor('u2')).send({ content: 'Sneaky note' });
        expect(res.status).toBe(403);
    });
});

describe('PATCH /api/boards/:id/notes/:noteId and DELETE', () => {
    it('updates and deletes a note the facilitator owns', async () => {
        const { app } = buildBoardsTestApp({ boards: [BOARD], signedInUser: FACILITATOR });
        const cookie = sessionCookieFor('facilitator-1');
        const created = await request(app).post('/api/boards/b1/notes').set('Cookie', cookie).send({ content: 'old' });

        const updated = await request(app).patch(`/api/boards/b1/notes/${created.body.id}`).set('Cookie', cookie).send({ content: 'new' });
        expect(updated.status).toBe(200);
        expect(updated.body.content).toBe('new');

        const deleted = await request(app).delete(`/api/boards/b1/notes/${created.body.id}`).set('Cookie', cookie);
        expect(deleted.status).toBe(204);
    });
});
