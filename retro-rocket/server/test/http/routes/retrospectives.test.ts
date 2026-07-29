import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildRetrospectiveTestApp, sessionCookieFor } from './retrospectivesTestApp';
import type { FakeRetrospectiveRecord } from '../../application/use-cases/retrospective/retrospectiveFakes';
import type { CardDTO } from '../../../src/application/ports/cards';

function board(overrides: Partial<FakeRetrospectiveRecord> = {}): FakeRetrospectiveRecord {
    return {
        id: 'r1',
        title: 'Sprint Retro',
        createdBy: 'facilitator-uid',
        createdAt: new Date(),
        updatedAt: new Date(),
        participantCount: 1,
        isActive: true,
        columnGroupingStates: {},
        ...overrides,
    };
}

function card(overrides: Partial<CardDTO> = {}): CardDTO {
    return {
        id: 'c1',
        content: 'x',
        column: 'col1',
        createdBy: 'owner-uid',
        createdAt: new Date(),
        updatedAt: new Date(),
        retrospectiveId: 'r1',
        votes: 0,
        likes: [],
        reactions: [],
        order: 0,
        ...overrides,
    };
}

describe('GET /api/retrospectives/:id', () => {
    it('returns the full board state for a signed-in caller', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).get('/api/retrospectives/r1').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 'r1', title: 'Sprint Retro', isFacilitator: false });
        expect(res.body.cards).toEqual([]);
        expect(res.body.columns).toEqual([]);
    });

    it('sets isFacilitator true for the board creator', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).get('/api/retrospectives/r1').set('Cookie', sessionCookieFor('facilitator-uid'));
        expect(res.body.isFacilitator).toBe(true);
    });

    it('401s without a session cookie', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).get('/api/retrospectives/r1');
        expect(res.status).toBe(401);
    });

    it('404s for a nonexistent board', async () => {
        const { app } = buildRetrospectiveTestApp();
        const res = await request(app).get('/api/retrospectives/missing').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(404);
    });
});

describe('POST /api/retrospectives/:id/join', () => {
    it('joins the board and returns the participant record', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).post('/api/retrospectives/r1/join').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ userId: 'u1', retrospectiveId: 'r1' });
    });

    it('is idempotent for a re-join', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const first = await request(app).post('/api/retrospectives/r1/join').set('Cookie', sessionCookieFor('u1'));
        const second = await request(app).post('/api/retrospectives/r1/join').set('Cookie', sessionCookieFor('u1'));
        expect(second.body.id).toBe(first.body.id);
    });

    it('404s for a nonexistent board', async () => {
        const { app } = buildRetrospectiveTestApp();
        const res = await request(app).post('/api/retrospectives/missing/join').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(404);
    });

    it('401s without a session cookie', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).post('/api/retrospectives/r1/join');
        expect(res.status).toBe(401);
    });
});

describe('POST /api/retrospectives/:id/cards', () => {
    it('creates a card', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app)
            .post('/api/retrospectives/r1/cards')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ content: 'Great sprint', column: 'col1' });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ content: 'Great sprint', column: 'col1', createdBy: 'u1' });
    });

    it('401s without a session cookie', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).post('/api/retrospectives/r1/cards').send({ content: 'x', column: 'col1' });
        expect(res.status).toBe(401);
    });
});

describe('PATCH /api/cards/:id', () => {
    it('edits a card the caller owns', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ createdBy: 'u1' })] });
        const res = await request(app).patch('/api/cards/c1').set('Cookie', sessionCookieFor('u1')).send({ content: 'updated' });
        expect(res.status).toBe(200);
        expect(res.body.content).toBe('updated');
    });

    it('403s for a non-owner', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ createdBy: 'u1' })] });
        const res = await request(app).patch('/api/cards/c1').set('Cookie', sessionCookieFor('someone-else')).send({ content: 'hijack' });
        expect(res.status).toBe(403);
    });

    it('401s without a session cookie', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card()] });
        const res = await request(app).patch('/api/cards/c1').send({ content: 'x' });
        expect(res.status).toBe(401);
    });
});

describe('DELETE /api/cards/:id', () => {
    it('deletes a card the caller owns', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ createdBy: 'u1' })] });
        const res = await request(app).delete('/api/cards/c1').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(204);
    });

    it('403s for a non-owner', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ createdBy: 'u1' })] });
        const res = await request(app).delete('/api/cards/c1').set('Cookie', sessionCookieFor('someone-else'));
        expect(res.status).toBe(403);
    });
});

describe('POST /api/cards/:id/vote', () => {
    it('increments votes by default', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card()] });
        const res = await request(app).post('/api/cards/c1/vote').set('Cookie', sessionCookieFor('u1')).send({});
        expect(res.status).toBe(200);
        expect(res.body.votes).toBe(1);
    });

    it('decrements votes when increment=false', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ votes: 3 })] });
        const res = await request(app).post('/api/cards/c1/vote').set('Cookie', sessionCookieFor('u1')).send({ increment: false });
        expect(res.body.votes).toBe(2);
    });

    it('401s without a session cookie', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card()] });
        const res = await request(app).post('/api/cards/c1/vote').send({});
        expect(res.status).toBe(401);
    });
});

describe('POST /api/cards/:id/like', () => {
    it('toggles a like for the caller', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card()] });
        const res = await request(app).post('/api/cards/c1/like').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body.likes).toHaveLength(1);
    });
});

describe('PUT /api/cards/:id/reaction', () => {
    it("sets the caller's reaction", async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card()] });
        const res = await request(app).put('/api/cards/c1/reaction').set('Cookie', sessionCookieFor('u1')).send({ emoji: '👍' });
        expect(res.status).toBe(200);
        expect(res.body.reactions).toEqual([expect.objectContaining({ userId: 'u1', emoji: '👍' })]);
    });
});

describe('DELETE /api/cards/:id/reaction', () => {
    it("removes the caller's reaction", async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card()] });
        await request(app).put('/api/cards/c1/reaction').set('Cookie', sessionCookieFor('u1')).send({ emoji: '👍' });
        const res = await request(app).delete('/api/cards/c1/reaction').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body.reactions).toEqual([]);
    });
});

describe('POST /api/retrospectives/:id/typing', () => {
    it('records the typing signal', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app)
            .post('/api/retrospectives/r1/typing')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ column: 'col1', isActive: true });
        expect(res.status).toBe(204);
    });

    it('401s without a session cookie', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).post('/api/retrospectives/r1/typing').send({ column: 'col1', isActive: true });
        expect(res.status).toBe(401);
    });
});

describe('POST /api/retrospectives/:id/cards/reorder', () => {
    it('applies a batch of reorder updates atomically', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' })] });
        const res = await request(app)
            .post('/api/retrospectives/r1/cards/reorder')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ updates: [{ cardId: 'c1', order: 1 }, { cardId: 'c2', order: 0 }] });
        expect(res.status).toBe(204);
    });

    it('401s without a session cookie', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).post('/api/retrospectives/r1/cards/reorder').send({ updates: [] });
        expect(res.status).toBe(401);
    });
});

describe('POST /api/retrospectives/:id/groups', () => {
    it('creates a group', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' })] });
        const res = await request(app)
            .post('/api/retrospectives/r1/groups')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ headCardId: 'c1', memberCardIds: ['c2'] });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ headCardId: 'c1', memberCardIds: ['c2'] });
    });
});

describe('PATCH /api/groups/:id', () => {
    it("updates the group's collapse display state", async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' })] });
        const created = await request(app).post('/api/retrospectives/r1/groups').set('Cookie', sessionCookieFor('u1')).send({ headCardId: 'c1', memberCardIds: ['c2'] });
        const res = await request(app).patch(`/api/groups/${created.body.id}`).set('Cookie', sessionCookieFor('u1')).send({ isCollapsed: true });
        expect(res.status).toBe(200);
        expect(res.body.isCollapsed).toBe(true);
    });
});

describe('DELETE /api/groups/:id', () => {
    it('disbands a group', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' })] });
        const created = await request(app).post('/api/retrospectives/r1/groups').set('Cookie', sessionCookieFor('u1')).send({ headCardId: 'c1', memberCardIds: ['c2'] });
        const res = await request(app).delete(`/api/groups/${created.body.id}`).set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(204);
    });
});

describe('POST /api/groups/:id/cards', () => {
    it('adds a card to a group', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' }), card({ id: 'c3' })] });
        const created = await request(app).post('/api/retrospectives/r1/groups').set('Cookie', sessionCookieFor('u1')).send({ headCardId: 'c1', memberCardIds: ['c2'] });
        const res = await request(app).post(`/api/groups/${created.body.id}/cards`).set('Cookie', sessionCookieFor('u1')).send({ cardId: 'c3' });
        expect(res.status).toBe(200);
        expect(res.body.memberCardIds).toContain('c3');
    });
});

describe('DELETE /api/groups/:id/cards/:cardId', () => {
    it('removes a card from a group, promoting a new head', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' })] });
        const created = await request(app).post('/api/retrospectives/r1/groups').set('Cookie', sessionCookieFor('u1')).send({ headCardId: 'c1', memberCardIds: ['c2'] });
        const res = await request(app).delete(`/api/groups/${created.body.id}/cards/c1`).set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body.headCardId).toBe('c2');
    });

    it('204s (group disbanded) when the last member is removed', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' })] });
        const created = await request(app).post('/api/retrospectives/r1/groups').set('Cookie', sessionCookieFor('u1')).send({ headCardId: 'c1', memberCardIds: ['c2'] });
        await request(app).delete(`/api/groups/${created.body.id}/cards/c2`).set('Cookie', sessionCookieFor('u1'));
        const res = await request(app).delete(`/api/groups/${created.body.id}/cards/c1`).set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(204);
    });
});

describe('PATCH /api/retrospectives/:id/column-grouping', () => {
    it('saves the per-column grouping display preference', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app)
            .patch('/api/retrospectives/r1/column-grouping')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ col1: { criteria: 'user', activeGroups: ['g1'] } });
        expect(res.status).toBe(204);
    });

    it('401s without a session cookie', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).patch('/api/retrospectives/r1/column-grouping').send({});
        expect(res.status).toBe(401);
    });
});

describe('PUT /api/retrospectives/:id/timer', () => {
    it('configures a timer for the facilitator', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).put('/api/retrospectives/r1/timer').set('Cookie', sessionCookieFor('facilitator-uid')).send({ duration: 300 });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ retrospectiveId: 'r1', duration: 300, originalDuration: 300, isRunning: false });
    });

    it('403s for a non-facilitator', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).put('/api/retrospectives/r1/timer').set('Cookie', sessionCookieFor('someone-else')).send({ duration: 300 });
        expect(res.status).toBe(403);
    });
});

describe('POST /api/retrospectives/:id/timer/start,pause,reset', () => {
    it('starts, pauses, and resets the timer for the facilitator', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        await request(app).put('/api/retrospectives/r1/timer').set('Cookie', sessionCookieFor('facilitator-uid')).send({ duration: 300 });

        const started = await request(app).post('/api/retrospectives/r1/timer/start').set('Cookie', sessionCookieFor('facilitator-uid'));
        expect(started.status).toBe(200);
        expect(started.body.isRunning).toBe(true);

        const paused = await request(app).post('/api/retrospectives/r1/timer/pause').set('Cookie', sessionCookieFor('facilitator-uid'));
        expect(paused.status).toBe(200);
        expect(paused.body.isPaused).toBe(true);

        const reset = await request(app).post('/api/retrospectives/r1/timer/reset').set('Cookie', sessionCookieFor('facilitator-uid'));
        expect(reset.status).toBe(200);
        expect(reset.body.isPaused).toBe(false);
    });

    it('403s start for a non-facilitator', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        await request(app).put('/api/retrospectives/r1/timer').set('Cookie', sessionCookieFor('facilitator-uid')).send({ duration: 300 });
        const res = await request(app).post('/api/retrospectives/r1/timer/start').set('Cookie', sessionCookieFor('someone-else'));
        expect(res.status).toBe(403);
    });
});

describe('DELETE /api/retrospectives/:id/timer', () => {
    it('deletes the timer for the facilitator', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        await request(app).put('/api/retrospectives/r1/timer').set('Cookie', sessionCookieFor('facilitator-uid')).send({ duration: 300 });
        const res = await request(app).delete('/api/retrospectives/r1/timer').set('Cookie', sessionCookieFor('facilitator-uid'));
        expect(res.status).toBe(204);
    });

    it('403s for a non-facilitator', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        await request(app).put('/api/retrospectives/r1/timer').set('Cookie', sessionCookieFor('facilitator-uid')).send({ duration: 300 });
        const res = await request(app).delete('/api/retrospectives/r1/timer').set('Cookie', sessionCookieFor('someone-else'));
        expect(res.status).toBe(403);
    });
});

describe('POST /api/retrospectives/:id/notes', () => {
    it("creates a note authored by the caller", async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).post('/api/retrospectives/r1/notes').set('Cookie', sessionCookieFor('u1')).send({ content: 'Private note' });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ content: 'Private note', retrospectiveId: 'r1', facilitatorId: 'u1' });
    });

    it('401s without a session cookie', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).post('/api/retrospectives/r1/notes').send({ content: 'x' });
        expect(res.status).toBe(401);
    });
});

describe('PATCH /api/notes/:id', () => {
    it("edits the caller's own note", async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const created = await request(app).post('/api/retrospectives/r1/notes').set('Cookie', sessionCookieFor('u1')).send({ content: 'Original' });
        const res = await request(app).patch(`/api/notes/${created.body.id}`).set('Cookie', sessionCookieFor('u1')).send({ content: 'Updated' });
        expect(res.status).toBe(200);
        expect(res.body.content).toBe('Updated');
    });

    it('403s for a non-author', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const created = await request(app).post('/api/retrospectives/r1/notes').set('Cookie', sessionCookieFor('u1')).send({ content: 'Original' });
        const res = await request(app).patch(`/api/notes/${created.body.id}`).set('Cookie', sessionCookieFor('someone-else')).send({ content: 'Hijack' });
        expect(res.status).toBe(403);
    });
});

describe('DELETE /api/notes/:id', () => {
    it("deletes the caller's own note", async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const created = await request(app).post('/api/retrospectives/r1/notes').set('Cookie', sessionCookieFor('u1')).send({ content: 'Original' });
        const res = await request(app).delete(`/api/notes/${created.body.id}`).set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(204);
    });

    it('403s for a non-author', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const created = await request(app).post('/api/retrospectives/r1/notes').set('Cookie', sessionCookieFor('u1')).send({ content: 'Original' });
        const res = await request(app).delete(`/api/notes/${created.body.id}`).set('Cookie', sessionCookieFor('someone-else'));
        expect(res.status).toBe(403);
    });
});

describe('POST /api/cards/:id/convert-to-action-item', () => {
    it("creates an action item from the card's content for the facilitator", async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1', content: 'Learned something' })] });
        const res = await request(app)
            .post('/api/cards/c1/convert-to-action-item')
            .set('Cookie', sessionCookieFor('facilitator-uid'))
            .send({ assignedTo: 'u2', assignedToName: 'U Two' });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ content: 'Learned something', retrospectiveId: 'r1', createdBy: 'facilitator-uid', assignedTo: 'u2', assignedToName: 'U Two' });
    });

    it('403s for a non-facilitator', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' })] });
        const res = await request(app).post('/api/cards/c1/convert-to-action-item').set('Cookie', sessionCookieFor('someone-else')).send({});
        expect(res.status).toBe(403);
    });
});

describe('POST /api/retrospectives/:id/action-items', () => {
    it('creates an action item directly (not via card conversion)', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app)
            .post('/api/retrospectives/r1/action-items')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ content: 'Ship the fix', assignedTo: 'u2', assignedToName: 'U Two' });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ content: 'Ship the fix', retrospectiveId: 'r1', createdBy: 'u1', assignedTo: 'u2', assignedToName: 'U Two' });
    });

    it('401s without a session cookie', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).post('/api/retrospectives/r1/action-items').send({ content: 'x' });
        expect(res.status).toBe(401);
    });
});

describe('PATCH /api/action-items/:id', () => {
    it('edits an action item — any participant, not just its creator (FR-015)', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const created = await request(app).post('/api/retrospectives/r1/action-items').set('Cookie', sessionCookieFor('u1')).send({ content: 'Original' });
        const res = await request(app).patch(`/api/action-items/${created.body.id}`).set('Cookie', sessionCookieFor('u2')).send({ content: 'Updated' });
        expect(res.status).toBe(200);
        expect(res.body.content).toBe('Updated');
    });

    it('404s for a nonexistent action item', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).patch('/api/action-items/does-not-exist').set('Cookie', sessionCookieFor('u1')).send({ content: 'x' });
        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/action-items/:id', () => {
    it('deletes an action item — any participant', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const created = await request(app).post('/api/retrospectives/r1/action-items').set('Cookie', sessionCookieFor('u1')).send({ content: 'To delete' });
        const res = await request(app).delete(`/api/action-items/${created.body.id}`).set('Cookie', sessionCookieFor('u2'));
        expect(res.status).toBe(204);
    });

    it('404s for a nonexistent action item', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).delete('/api/action-items/does-not-exist').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(404);
    });
});

describe('PUT /api/cards/:id/sentiment', () => {
    it('saves a computed sentiment result — any participant', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' })] });
        const res = await request(app)
            .put('/api/cards/c1/sentiment')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ sentiment: 'positive', confidence: 0.9, contentHash: 'hash1' });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ retrospectiveId: 'r1', cardId: 'c1', sentiment: 'positive', confidence: 0.9, contentHash: 'hash1' });
    });

    it('401s without a session cookie', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' })] });
        const res = await request(app).put('/api/cards/c1/sentiment').send({ sentiment: 'positive', confidence: 0.9, contentHash: 'hash1' });
        expect(res.status).toBe(401);
    });
});

describe('PUT /api/cards/:id/sentiment/override', () => {
    it('saves a facilitator override', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' })] });
        const res = await request(app)
            .put('/api/cards/c1/sentiment/override')
            .set('Cookie', sessionCookieFor('facilitator-uid'))
            .send({ sentiment: 'negative' });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ retrospectiveId: 'r1', cardId: 'c1', sentiment: 'negative', isOverride: true, overrideBy: 'facilitator-uid' });
    });

    it('403s for a non-facilitator', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' })] });
        const res = await request(app).put('/api/cards/c1/sentiment/override').set('Cookie', sessionCookieFor('someone-else')).send({ sentiment: 'negative' });
        expect(res.status).toBe(403);
    });
});
