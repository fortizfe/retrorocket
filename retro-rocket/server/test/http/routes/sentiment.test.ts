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
const PARTICIPANT_U2 = { id: 'p2', retrospectiveId: 'b1', userId: 'u2', name: 'Bob', photoURL: null, joinedAt: new Date(), isFacilitator: false, isActive: true };

describe('PUT /api/boards/:id/cards/:cardId/sentiment', () => {
    it('saves a result for any participant', async () => {
        const { app } = buildBoardsTestApp({ boards: [BOARD], signedInUser: OTHER, participants: [PARTICIPANT_U2] });
        const res = await request(app)
            .put('/api/boards/b1/cards/c1/sentiment')
            .set('Cookie', sessionCookieFor('u2'))
            .send({ sentiment: 'positive', confidence: 0.9, contentHash: 'h1' });
        expect(res.status).toBe(200);
        expect(res.body.sentiment).toBe('positive');
        expect(res.body.isOverride).toBe(false);
    });

    it('rejects a non-participant with 404 (board access not established)', async () => {
        const { app } = buildBoardsTestApp({ boards: [BOARD], signedInUser: OTHER });
        const res = await request(app)
            .put('/api/boards/b1/cards/c1/sentiment')
            .set('Cookie', sessionCookieFor('u2'))
            .send({ sentiment: 'positive', confidence: 0.9, contentHash: 'h1' });
        expect(res.status).toBe(404);
    });
});

describe('PUT /api/boards/:id/cards/:cardId/sentiment/override', () => {
    it('overrides as the facilitator', async () => {
        const { app } = buildBoardsTestApp({ boards: [BOARD], signedInUser: FACILITATOR });
        const res = await request(app)
            .put('/api/boards/b1/cards/c1/sentiment/override')
            .set('Cookie', sessionCookieFor('facilitator-1'))
            .send({ sentiment: 'negative' });
        expect(res.status).toBe(200);
        expect(res.body.isOverride).toBe(true);
        expect(res.body.overrideBy).toBe('facilitator-1');
    });

    it('rejects a non-facilitator with 403', async () => {
        const { app } = buildBoardsTestApp({ boards: [BOARD], signedInUser: OTHER, participants: [PARTICIPANT_U2] });
        const res = await request(app)
            .put('/api/boards/b1/cards/c1/sentiment/override')
            .set('Cookie', sessionCookieFor('u2'))
            .send({ sentiment: 'negative' });
        expect(res.status).toBe(403);
    });
});

describe('DELETE /api/boards/:id/cards/:cardId/sentiment', () => {
    it('deletes the result for any participant', async () => {
        const { app } = buildBoardsTestApp({ boards: [BOARD], signedInUser: FACILITATOR });
        const cookie = sessionCookieFor('facilitator-1');
        await request(app).put('/api/boards/b1/cards/c1/sentiment').set('Cookie', cookie).send({ sentiment: 'positive', confidence: 0.9, contentHash: 'h1' });

        const res = await request(app).delete('/api/boards/b1/cards/c1/sentiment').set('Cookie', cookie);
        expect(res.status).toBe(204);
    });
});
