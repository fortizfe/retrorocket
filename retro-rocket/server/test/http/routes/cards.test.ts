import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildBoardsTestApp, defaultUser, sessionCookieFor } from '../boardsTestApp';
import type { BoardWithColumns, Participant } from '../../../src/application/ports/boards';
import type { Card } from '../../../src/application/ports/cards';

const BOARD: BoardWithColumns = {
    id: 'b1', title: 'X', templateId: 'default', createdBy: 'u1', createdByName: 'Ana', locale: 'en',
    createdAt: new Date(), updatedAt: new Date(), participantCount: 0, isActive: true, columns: [],
};

// u2 is a board participant (not the creator, not the card owner) — used to distinguish
// "no board access at all" (404) from "board access but not the card owner" (403).
const PARTICIPANT_U2: Participant = {
    id: 'p2', retrospectiveId: 'b1', userId: 'u2', name: 'Bob', photoURL: null, joinedAt: new Date(), isFacilitator: false, isActive: false,
};

const CARD: Card = {
    id: 'c1', retrospectiveId: 'b1', content: 'Original', column: 'helped', createdBy: 'u1',
    createdAt: new Date(), updatedAt: new Date(), likes: [], reactions: [], order: 0,
};

describe('POST /api/boards/:id/cards', () => {
    it('creates a card for a board participant/creator', async () => {
        const { app, user } = buildBoardsTestApp({ boards: [BOARD] });
        const res = await request(app).post('/api/boards/b1/cards').set('Cookie', sessionCookieFor(user.uid)).send({ content: 'Hello', column: 'helped' });
        expect(res.status).toBe(201);
        expect(res.body.content).toBe('Hello');
    });

    it('rejects a requester with no board access', async () => {
        const { app } = buildBoardsTestApp({ boards: [BOARD], signedInUser: defaultUser({ uid: 'stranger' }) });
        const res = await request(app).post('/api/boards/b1/cards').set('Cookie', sessionCookieFor('stranger')).send({ content: 'Hello', column: 'helped' });
        expect(res.status).toBe(404);
    });
});

describe('PATCH /api/boards/:id/cards/:cardId', () => {
    it('allows the owner to edit their card', async () => {
        const { app, user } = buildBoardsTestApp({ boards: [BOARD], cards: [CARD], signedInUser: defaultUser({ uid: 'u1' }) });
        const res = await request(app).patch('/api/boards/b1/cards/c1').set('Cookie', sessionCookieFor(user.uid)).send({ content: 'Edited' });
        expect(res.status).toBe(200);
        expect(res.body.content).toBe('Edited');
    });

    it('rejects a non-owner edit with 403', async () => {
        const { app } = buildBoardsTestApp({ boards: [BOARD], cards: [CARD], participants: [PARTICIPANT_U2], signedInUser: defaultUser({ uid: 'u2' }) });
        const res = await request(app).patch('/api/boards/b1/cards/c1').set('Cookie', sessionCookieFor('u2')).send({ content: 'Hacked' });
        expect(res.status).toBe(403);
    });
});

describe('DELETE /api/boards/:id/cards/:cardId', () => {
    it('allows the owner to delete their card', async () => {
        const { app, user } = buildBoardsTestApp({ boards: [BOARD], cards: [CARD], signedInUser: defaultUser({ uid: 'u1' }) });
        const res = await request(app).delete('/api/boards/b1/cards/c1').set('Cookie', sessionCookieFor(user.uid));
        expect(res.status).toBe(204);
    });
});

describe('POST /api/boards/:id/cards/:cardId/like', () => {
    it('toggles a like for the requester', async () => {
        const { app, user } = buildBoardsTestApp({ boards: [BOARD], cards: [CARD], participants: [PARTICIPANT_U2], signedInUser: defaultUser({ uid: 'u2' }) });
        const res = await request(app).post('/api/boards/b1/cards/c1/like').set('Cookie', sessionCookieFor(user.uid));
        expect(res.status).toBe(200);
        expect(res.body.liked).toBe(true);
    });
});

describe('PUT and DELETE /api/boards/:id/cards/:cardId/reaction', () => {
    it('sets then removes a reaction', async () => {
        const { app, user } = buildBoardsTestApp({ boards: [BOARD], cards: [CARD], participants: [PARTICIPANT_U2], signedInUser: defaultUser({ uid: 'u2' }) });
        const put = await request(app).put('/api/boards/b1/cards/c1/reaction').set('Cookie', sessionCookieFor(user.uid)).send({ emoji: '🎉' });
        expect(put.status).toBe(200);
        expect(put.body.reactions).toHaveLength(1);

        const del = await request(app).delete('/api/boards/b1/cards/c1/reaction').set('Cookie', sessionCookieFor(user.uid));
        expect(del.status).toBe(200);
        expect(del.body.reactions).toHaveLength(0);
    });
});

describe('PATCH /api/boards/:id/cards/reorder', () => {
    it('applies a batch reorder', async () => {
        const card2: Card = { ...CARD, id: 'c2', order: 1 };
        const { app, user } = buildBoardsTestApp({ boards: [BOARD], cards: [CARD, card2], signedInUser: defaultUser({ uid: 'u1' }) });
        const res = await request(app)
            .patch('/api/boards/b1/cards/reorder')
            .set('Cookie', sessionCookieFor(user.uid))
            .send({ updates: [{ cardId: 'c1', order: 9 }, { cardId: 'c2', order: 0 }] });
        expect(res.status).toBe(200);
        expect(res.body.cards[0].id).toBe('c2');
    });
});
