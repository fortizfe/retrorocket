import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { buildRetrospectiveTestApp, sessionCookieFor } from './retrospectivesTestApp';
import type { FakeRetrospectiveRecord } from '../../application/use-cases/retrospective/retrospectiveFakes';
import type { CardDTO } from '../../../src/application/ports/cards';
import type { ProfileRecord } from '../../../src/application/ports/profile';
import { inMemoryProfilePort } from '../../application/use-cases/profile/profileFakes';
import { ConflictError, NotFoundError } from '../../../src/domain/errors';
import type { CardGroupDTO, CardGroupPort } from '../../../src/application/ports/cards';

function profile(overrides: Partial<ProfileRecord> = {}): ProfileRecord {
    return {
        uid: 'u1',
        email: 'u1@example.com',
        displayName: 'Configured Name',
        photoURL: null,
        providers: ['google'],
        primaryProvider: 'google',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

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

    // 045-idle-connection-cleanup, US5/FR-007.
    it('401s for a session past its soft TTL, even though it is cryptographically valid', async () => {
        const { app } = buildRetrospectiveTestApp({
            retrospectives: [board()],
            overrides: {
                sessionService: {
                    issue: vi.fn(),
                    verify: vi.fn(async () => ({ data: { sub: 'u1' }, isActive: () => false }) as never),
                    refresh: vi.fn(),
                },
            },
        });
        const res = await request(app).get('/api/retrospectives/r1').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(401);
    });

    it('404s for a nonexistent board', async () => {
        const { app } = buildRetrospectiveTestApp();
        const res = await request(app).get('/api/retrospectives/missing').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(404);
    });

    // 051-anonymous-board-mode, anonymity-api-contract.md: the board-state response
    // gains isAnonymous alongside columnGroupingStates, defaulting to false.
    it('includes isAnonymous in the response body, reflecting the board record', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board({ isAnonymous: false })] });
        const res = await request(app).get('/api/retrospectives/r1').set('Cookie', sessionCookieFor('u1'));
        expect(res.body.isAnonymous).toBe(false);
    });

    it('includes isAnonymous: true in the response body for an anonymous board', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board({ isAnonymous: true })] });
        const res = await request(app).get('/api/retrospectives/r1').set('Cookie', sessionCookieFor('u1'));
        expect(res.body.isAnonymous).toBe(true);
    });
});

// US3, research.md §1: the WebSocket reconnect flow's REST resync (backendRealtimeClient.ts —
// GET /api/retrospectives/:id, performed on every reconnect) must not be able to throttle a
// participant because of a *different* participant's simultaneous reconnect. The WS upgrade
// endpoint's own concurrent-connection cap is already session-scoped (019, research.md §5;
// contracts/rate-limiting-contract.md) and unaffected by this fix — only the REST resync,
// governed by retrospectiveLimiter, needed the same session-first/trust-proxy-aware keying
// as auth.ts's authLimiter (server/test/http/routes/authLogin.test.ts).
describe('retrospectiveLimiter — reconnect-storm isolation (US3, FR-002, FR-010)', () => {
    it('two participants reconnecting (repeated GET /api/retrospectives/:id resyncs) at the same time are throttled independently', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], overrides: { testMode: false } });
        const sessionA = sessionCookieFor('reconnect-user-a');
        const sessionB = sessionCookieFor('reconnect-user-b');

        let lastA;
        for (let i = 0; i < 401; i++) {
            lastA = await request(app).get('/api/retrospectives/r1').set('Cookie', sessionA);
        }
        expect(lastA!.status).toBe(429);

        // Participant B's resync must still succeed — a reconnect storm from A (e.g. a
        // dropped connection retried aggressively) must never throttle B's own reconnect.
        const bRes = await request(app).get('/api/retrospectives/r1').set('Cookie', sessionB);
        expect(bRes.status).toBe(200);
    });

    it('a legitimately throttled resync returns the ApiErrorBody envelope (FR-004)', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], overrides: { testMode: false } });
        const session = sessionCookieFor('reconnect-user-c');

        let throttled;
        for (let i = 0; i < 401; i++) {
            throttled = await request(app).get('/api/retrospectives/r1').set('Cookie', session);
        }

        expect(throttled!.status).toBe(429);
        expect(throttled!.body).toEqual({
            error: { code: 'rate_limited', message: expect.any(String) },
            correlationId: expect.any(String),
        });
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

    it('captures the caller\'s currently configured Profile display name as the participant name, not the raw session name (spec 036-fix-display-name-fallback)', async () => {
        const { app } = buildRetrospectiveTestApp({
            retrospectives: [board()],
            overrides: { profilePort: inMemoryProfilePort([profile({ uid: 'u1', displayName: 'Configured Name' })]) },
        });
        const res = await request(app).post('/api/retrospectives/r1/join').set('Cookie', sessionCookieFor('u1'));
        // fakeSessionServiceWithUser sets session.user.displayName to 'User u1' — the seeded
        // profile's 'Configured Name' must win.
        expect(res.body.name).toBe('Configured Name');
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

    it('captures the caller\'s display name as createdByName (spec 020-user-display-name-fix)', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app)
            .post('/api/retrospectives/r1/cards')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ content: 'Great sprint', column: 'col1' });
        expect(res.body.createdByName).toBe('User u1');
    });

    it('captures the caller\'s currently configured Profile display name as createdByName, not the raw session name (spec 036-fix-display-name-fallback)', async () => {
        const { app } = buildRetrospectiveTestApp({
            retrospectives: [board()],
            overrides: { profilePort: inMemoryProfilePort([profile({ uid: 'u1', displayName: 'Configured Name' })]) },
        });
        const res = await request(app)
            .post('/api/retrospectives/r1/cards')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ content: 'Great sprint', column: 'col1' });
        // fakeSessionServiceWithUser sets session.user.displayName to 'User u1' — the seeded
        // profile's 'Configured Name' must win, proving the fix resolves via the profile, not the session.
        expect(res.body.createdByName).toBe('Configured Name');
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

    it('captures the caller\'s currently configured Profile display name as the like\'s username, not the raw session name (spec 036-fix-display-name-fallback)', async () => {
        const { app } = buildRetrospectiveTestApp({
            retrospectives: [board()],
            cards: [card()],
            overrides: { profilePort: inMemoryProfilePort([profile({ uid: 'u1', displayName: 'Configured Name' })]) },
        });
        const res = await request(app).post('/api/cards/c1/like').set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body.likes).toEqual([expect.objectContaining({ userId: 'u1', username: 'Configured Name' })]);
    });
});

describe('PUT /api/cards/:id/reaction', () => {
    it("sets the caller's reaction", async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card()] });
        const res = await request(app).put('/api/cards/c1/reaction').set('Cookie', sessionCookieFor('u1')).send({ emoji: '👍' });
        expect(res.status).toBe(200);
        expect(res.body.reactions).toEqual([expect.objectContaining({ userId: 'u1', emoji: '👍' })]);
    });

    it('captures the caller\'s currently configured Profile display name as the reaction\'s username, not the raw session name (spec 036-fix-display-name-fallback)', async () => {
        const { app } = buildRetrospectiveTestApp({
            retrospectives: [board()],
            cards: [card()],
            overrides: { profilePort: inMemoryProfilePort([profile({ uid: 'u1', displayName: 'Configured Name' })]) },
        });
        const res = await request(app).put('/api/cards/c1/reaction').set('Cookie', sessionCookieFor('u1')).send({ emoji: '👍' });
        expect(res.status).toBe(200);
        expect(res.body.reactions).toEqual([expect.objectContaining({ userId: 'u1', emoji: '👍', username: 'Configured Name' })]);
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

    it('captures the caller\'s currently configured Profile display name as the typing signal\'s username, not the raw session name (spec 036-fix-display-name-fallback)', async () => {
        const setTypingStatusSpy = vi.fn(async () => {});
        const { app } = buildRetrospectiveTestApp({
            retrospectives: [board()],
            overrides: {
                typingStatusPort: { setTypingStatus: setTypingStatusSpy, clearAllForUser: vi.fn(async () => {}) },
                profilePort: inMemoryProfilePort([profile({ uid: 'u1', displayName: 'Configured Name' })]),
            },
        });
        const res = await request(app)
            .post('/api/retrospectives/r1/typing')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ column: 'col1', isActive: true });
        expect(res.status).toBe(204);
        expect(setTypingStatusSpy).toHaveBeenCalledWith('r1', 'u1', 'Configured Name', 'col1', true);
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
        expect(res.body).toMatchObject({ headCardId: 'c1', memberCardIds: ['c2'], column: 'col1' });
    });

    it("derives the group's column from the head card even if a different value is sent (spec 046, FR-003)", async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' })] });
        const res = await request(app)
            .post('/api/retrospectives/r1/groups')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ headCardId: 'c1', memberCardIds: ['c2'], column: 'not-the-real-column' });
        expect(res.status).toBe(201);
        expect(res.body.column).toBe('col1');
    });

    it('404s when headCardId does not correspond to an existing card (spec 046, FR-003)', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c2' })] });
        const res = await request(app)
            .post('/api/retrospectives/r1/groups')
            .set('Cookie', sessionCookieFor('u1'))
            .send({ headCardId: 'does-not-exist', memberCardIds: ['c2'] });
        expect(res.status).toBe(404);
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
    it('removes the head from a 3-card group, promoting a new head (group survives)', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' }), card({ id: 'c3' })] });
        const created = await request(app).post('/api/retrospectives/r1/groups').set('Cookie', sessionCookieFor('u1')).send({ headCardId: 'c1', memberCardIds: ['c2', 'c3'] });
        const res = await request(app).delete(`/api/groups/${created.body.id}/cards/c1`).set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(200);
        expect(res.body.headCardId).toBe('c2');
        expect(res.body.memberCardIds).toEqual(['c3']);
    });

    it('204s and dissolves the group (I5) when a single removal leaves one card in a 2-card group', async () => {
        const { app, deps } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' })] });
        const created = await request(app).post('/api/retrospectives/r1/groups').set('Cookie', sessionCookieFor('u1')).send({ headCardId: 'c1', memberCardIds: ['c2'] });
        const res = await request(app).delete(`/api/groups/${created.body.id}/cards/c2`).set('Cookie', sessionCookieFor('u1'));
        expect(res.status).toBe(204);
        expect(await deps.cardGroupPort.getGroup(created.body.id)).toBeNull();
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

// 051-anonymous-board-mode, US3, T045 (red phase): PUT /api/retrospectives/:id/anonymity
// does not exist yet (T051) — supertest requests below hit Express's 404 fallback
// today, so every assertion here is expected to fail until the route is added.
describe('PUT /api/retrospectives/:id/anonymity', () => {
    it('401s without a session cookie', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).put('/api/retrospectives/r1/anonymity').send({ isAnonymous: true });
        expect(res.status).toBe(401);
    });

    it('403s for a non-facilitator', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).put('/api/retrospectives/r1/anonymity').set('Cookie', sessionCookieFor('someone-else')).send({ isAnonymous: true });
        expect(res.status).toBe(403);
    });

    it('400s when isAnonymous is not a boolean', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).put('/api/retrospectives/r1/anonymity').set('Cookie', sessionCookieFor('facilitator-uid')).send({ isAnonymous: 'yes' });
        expect(res.status).toBe(400);
    });

    it('200s with the updated value for the facilitator', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()] });
        const res = await request(app).put('/api/retrospectives/r1/anonymity').set('Cookie', sessionCookieFor('facilitator-uid')).send({ isAnonymous: true });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 'r1', isAnonymous: true });
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

// ---------------------------------------------------------------------------
// 059-drag-to-group-cards, T007 (red phase). The new CardGroupPort methods
// (moveCard / setGroupTitle / renormalizeColumnOrder) are stubbed per test on top of the
// shared fake store, so these route tests do not depend on the fake's implementation
// (retrospectiveFakes.ts, T004). The stub is swapped in after the app is built; the router
// reads deps.cardGroupPort at request time.
// ---------------------------------------------------------------------------
type NewGroupPortMethods = {
    moveCard: ReturnType<typeof vi.fn>;
    setGroupTitle: ReturnType<typeof vi.fn>;
    renormalizeColumnOrder: ReturnType<typeof vi.fn>;
};

function appWithStubbedGroupPort(stubs: Partial<NewGroupPortMethods> = {}, seed: Parameters<typeof buildRetrospectiveTestApp>[0] = {}) {
    const built = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' })], ...seed });
    const port = {
        ...built.deps.cardGroupPort,
        moveCard: vi.fn(async () => ({ dissolvedGroupIds: [] as string[] })),
        setGroupTitle: vi.fn(async (groupId: string, title: string | null) => groupDto({ id: groupId, title: title ?? undefined })),
        renormalizeColumnOrder: vi.fn(async () => undefined),
        ...stubs,
    };
    built.deps.cardGroupPort = port as unknown as CardGroupPort;
    return { ...built, port: port as typeof port & { setGroupCollapse: ReturnType<typeof vi.fn> } };
}

function groupDto(overrides: Partial<CardGroupDTO> = {}): CardGroupDTO {
    return {
        id: 'g1',
        retrospectiveId: 'r1',
        column: 'col1',
        headCardId: 'c1',
        memberCardIds: ['c2'],
        isCollapsed: true,
        createdAt: new Date(),
        createdBy: 'u1',
        order: 1,
        ...overrides,
    };
}

const groupConflict = () => new ConflictError('Cards cannot be grouped', 'group_conflict' as never);

describe('POST /api/retrospectives/:id/cards/:cardId/move (C0)', () => {
    const url = '/api/retrospectives/r1/cards/c1/move';

    it('200s with { createdGroupId, dissolvedGroupIds } and forwards the target to the port', async () => {
        const { app, port } = appWithStubbedGroupPort({ moveCard: vi.fn(async () => ({ createdGroupId: 'g9', dissolvedGroupIds: ['g1'] })) });
        const res = await request(app).post(url).set('Cookie', sessionCookieFor('u1')).send({ target: { kind: 'card', cardId: 'c2' } });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ createdGroupId: 'g9', dissolvedGroupIds: ['g1'] });
        expect(port.moveCard).toHaveBeenCalledWith('r1', 'c1', { kind: 'card', cardId: 'c2' });
    });

    it('200s with an empty dissolvedGroupIds and no createdGroupId for a plain position move', async () => {
        const { app, port } = appWithStubbedGroupPort();
        const res = await request(app).post(url).set('Cookie', sessionCookieFor('u1')).send({ target: { kind: 'position', order: 1712345678.5 } });
        expect(res.status).toBe(200);
        expect(res.body.dissolvedGroupIds).toEqual([]);
        expect(res.body.createdGroupId).toBeUndefined();
        expect(port.moveCard).toHaveBeenCalledWith('r1', 'c1', { kind: 'position', order: 1712345678.5 });
    });

    it('forwards a group target', async () => {
        const { app, port } = appWithStubbedGroupPort();
        const res = await request(app).post(url).set('Cookie', sessionCookieFor('u1')).send({ target: { kind: 'group', groupId: 'g2' } });
        expect(res.status).toBe(200);
        expect(port.moveCard).toHaveBeenCalledWith('r1', 'c1', { kind: 'group', groupId: 'g2' });
    });

    it.each([
        ['a missing target', {}],
        ['an unknown target kind', { target: { kind: 'column', id: 'x' } }],
        ['a non-finite position order', { target: { kind: 'position', order: 'NaN' } }],
        ['a position target without order', { target: { kind: 'position' } }],
        ['a card target without cardId', { target: { kind: 'card' } }],
        ['a group target without groupId', { target: { kind: 'group' } }],
        ['a card target equal to the source card (M1)', { target: { kind: 'card', cardId: 'c1' } }],
    ])('400s invalid_request for %s (M1) without calling the port', async (_label, body) => {
        const { app, port } = appWithStubbedGroupPort();
        const res = await request(app).post(url).set('Cookie', sessionCookieFor('u1')).send(body);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('invalid_request');
        expect(port.moveCard).not.toHaveBeenCalled();
    });

    it('404s when the port reports a missing card/group (M2/M3)', async () => {
        const { app } = appWithStubbedGroupPort({ moveCard: vi.fn(async () => { throw new NotFoundError('Card not found'); }) });
        const res = await request(app).post(url).set('Cookie', sessionCookieFor('u1')).send({ target: { kind: 'card', cardId: 'c2' } });
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('not_found');
    });

    it('409s with error code group_conflict when the port reports a grouping conflict (M4/M5/M7)', async () => {
        const { app } = appWithStubbedGroupPort({ moveCard: vi.fn(async () => { throw groupConflict(); }) });
        const res = await request(app).post(url).set('Cookie', sessionCookieFor('u1')).send({ target: { kind: 'card', cardId: 'c2' } });
        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('group_conflict');
    });

    it('401s without a session cookie', async () => {
        const { app } = appWithStubbedGroupPort();
        const res = await request(app).post(url).send({ target: { kind: 'position', order: 1 } });
        expect(res.status).toBe(401);
    });
});

describe('POST /api/retrospectives/:id/column-order (C4)', () => {
    const url = '/api/retrospectives/r1/column-order';
    const items = [
        { kind: 'group', id: 'g1', order: 1024 },
        { kind: 'card', id: 'c7', order: 2048 },
    ];

    it('204s and forwards (retrospectiveId, columnId, items) to the port', async () => {
        const { app, port } = appWithStubbedGroupPort();
        const res = await request(app).post(url).set('Cookie', sessionCookieFor('u1')).send({ columnId: 'what-went-well', items });
        expect(res.status).toBe(204);
        expect(port.renormalizeColumnOrder).toHaveBeenCalledWith('r1', 'what-went-well', items);
    });

    it('accepts exactly 500 items', async () => {
        const { app } = appWithStubbedGroupPort();
        const many = Array.from({ length: 500 }, (_, i) => ({ kind: 'card', id: `c${i}`, order: i * 1024 }));
        const res = await request(app).post(url).set('Cookie', sessionCookieFor('u1')).send({ columnId: 'col1', items: many });
        expect(res.status).toBe(204);
    });

    it.each([
        ['missing columnId', { items }],
        ['empty items', { columnId: 'col1', items: [] }],
        ['more than 500 items', { columnId: 'col1', items: Array.from({ length: 501 }, (_, i) => ({ kind: 'card', id: `c${i}`, order: i })) }],
        ['a non-finite order', { columnId: 'col1', items: [{ kind: 'card', id: 'c1', order: 'abc' }] }],
        ['duplicate items', { columnId: 'col1', items: [{ kind: 'card', id: 'c1', order: 1 }, { kind: 'card', id: 'c1', order: 2 }] }],
        ['an invalid item kind', { columnId: 'col1', items: [{ kind: 'column', id: 'c1', order: 1 }] }],
    ])('400s (R1) for %s without calling the port', async (_label, body) => {
        const { app, port } = appWithStubbedGroupPort();
        const res = await request(app).post(url).set('Cookie', sessionCookieFor('u1')).send(body);
        expect(res.status).toBe(400);
        expect(port.renormalizeColumnOrder).not.toHaveBeenCalled();
    });

    it('404s when the port reports a missing item (R2)', async () => {
        const { app } = appWithStubbedGroupPort({ renormalizeColumnOrder: vi.fn(async () => { throw new NotFoundError('Card not found'); }) });
        const res = await request(app).post(url).set('Cookie', sessionCookieFor('u1')).send({ columnId: 'col1', items });
        expect(res.status).toBe(404);
    });

    it('409s with group_conflict when the port reports an item outside the column or grouped (R3)', async () => {
        const { app } = appWithStubbedGroupPort({ renormalizeColumnOrder: vi.fn(async () => { throw groupConflict(); }) });
        const res = await request(app).post(url).set('Cookie', sessionCookieFor('u1')).send({ columnId: 'col1', items });
        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('group_conflict');
    });

    it('401s without a session cookie', async () => {
        const { app } = appWithStubbedGroupPort();
        const res = await request(app).post(url).send({ columnId: 'col1', items });
        expect(res.status).toBe(401);
    });
});

describe('PATCH /api/groups/:id — partial update with title (C3)', () => {
    it('{ title } only: sets the title and never touches isCollapsed', async () => {
        const { app, port } = appWithStubbedGroupPort({}, { groups: [groupDto()] });
        const collapse = vi.spyOn(port, 'setGroupCollapse');
        const res = await request(app).patch('/api/groups/g1').set('Cookie', sessionCookieFor('u1')).send({ title: '  Deploy pain  ' });
        expect(res.status).toBe(200);
        expect(port.setGroupTitle).toHaveBeenCalledWith('g1', 'Deploy pain');
        expect(collapse).not.toHaveBeenCalled();
        expect(res.body).toMatchObject({ id: 'g1', title: 'Deploy pain' });
    });

    it('{ title } only leaves a previously collapsed group collapsed (end-to-end with the fake store)', async () => {
        const { app, deps } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' })], groups: [groupDto({ isCollapsed: true })] });
        const res = await request(app).patch('/api/groups/g1').set('Cookie', sessionCookieFor('u1')).send({ title: 'Renamed' });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ title: 'Renamed', isCollapsed: true });
        expect((await deps.cardGroupPort.getGroup('g1'))?.isCollapsed).toBe(true);
    });

    it('{ isCollapsed } only does not touch the title', async () => {
        const { app, port } = appWithStubbedGroupPort({}, { groups: [groupDto({ isCollapsed: false, title: 'Keep me' })] });
        const res = await request(app).patch('/api/groups/g1').set('Cookie', sessionCookieFor('u1')).send({ isCollapsed: true });
        expect(res.status).toBe(200);
        expect(port.setGroupTitle).not.toHaveBeenCalled();
        expect(res.body).toMatchObject({ isCollapsed: true, title: 'Keep me' });
    });

    it.each([
        ['empty string', ''],
        ['whitespace only', '   '],
        ['null', null],
    ])('%s title clears the stored title (port receives null)', async (_label, title) => {
        const { app, port } = appWithStubbedGroupPort({}, { groups: [groupDto({ title: 'Old' })] });
        const res = await request(app).patch('/api/groups/g1').set('Cookie', sessionCookieFor('u1')).send({ title });
        expect(res.status).toBe(200);
        expect(port.setGroupTitle).toHaveBeenCalledWith('g1', null);
    });

    it('accepts a 60-character title and rejects 61 with 400', async () => {
        const { app, port } = appWithStubbedGroupPort({}, { groups: [groupDto()] });
        const ok = await request(app).patch('/api/groups/g1').set('Cookie', sessionCookieFor('u1')).send({ title: 'a'.repeat(60) });
        expect(ok.status).toBe(200);
        port.setGroupTitle.mockClear();
        const tooLong = await request(app).patch('/api/groups/g1').set('Cookie', sessionCookieFor('u1')).send({ title: 'a'.repeat(61) });
        expect(tooLong.status).toBe(400);
        expect(port.setGroupTitle).not.toHaveBeenCalled();
    });

    it.each([
        ['an empty body', {}],
        ['a non-boolean isCollapsed', { isCollapsed: 'yes' }],
        ['a non-string title', { title: 42 }],
        ['only unknown fields', { foo: 'bar' }],
    ])('400s for %s without writing', async (_label, body) => {
        const { app, port } = appWithStubbedGroupPort({}, { groups: [groupDto()] });
        const collapse = vi.spyOn(port, 'setGroupCollapse');
        const res = await request(app).patch('/api/groups/g1').set('Cookie', sessionCookieFor('u1')).send(body);
        expect(res.status).toBe(400);
        expect(port.setGroupTitle).not.toHaveBeenCalled();
        expect(collapse).not.toHaveBeenCalled();
    });

    it('404s when the group does not exist', async () => {
        const { app } = appWithStubbedGroupPort({ setGroupTitle: vi.fn(async () => { throw new NotFoundError('Group not found'); }) });
        const res = await request(app).patch('/api/groups/missing').set('Cookie', sessionCookieFor('u1')).send({ title: 'x' });
        expect(res.status).toBe(404);
    });
});

describe('POST /api/retrospectives/:id/groups — hardening (C1 P1)', () => {
    const post = (app: Parameters<typeof request>[0], body: unknown) => request(app).post('/api/retrospectives/r1/groups').set('Cookie', sessionCookieFor('u1')).send(body as object);

    it('400s when memberCardIds has 51 entries (cap is 50) and does not create the group', async () => {
        const cards = Array.from({ length: 52 }, (_, i) => card({ id: `m${i}` }));
        const { app, deps } = buildRetrospectiveTestApp({ retrospectives: [board()], cards });
        const res = await post(app, { headCardId: 'm0', memberCardIds: cards.slice(1, 52).map((c) => c.id) });
        expect(res.status).toBe(400);
        expect(await deps.cardGroupPort.listGroups('r1')).toHaveLength(0);
    });

    it('accepts exactly 50 members', async () => {
        const cards = Array.from({ length: 51 }, (_, i) => card({ id: `m${i}` }));
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards });
        const res = await post(app, { headCardId: 'm0', memberCardIds: cards.slice(1).map((c) => c.id) });
        expect(res.status).toBe(201);
    });

    it('400s on duplicate members and when memberCardIds contains the head card', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' })] });
        expect((await post(app, { headCardId: 'c1', memberCardIds: ['c2', 'c2'] })).status).toBe(400);
        expect((await post(app, { headCardId: 'c1', memberCardIds: ['c1'] })).status).toBe(400);
    });

    it('400s on an invalid origin and forwards a valid one', async () => {
        const { app, deps } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' })] });
        expect((await post(app, { headCardId: 'c1', memberCardIds: ['c2'], origin: 'bogus' })).status).toBe(400);
        const spy = vi.spyOn(deps.cardGroupPort, 'createGroup');
        const ok = await post(app, { headCardId: 'c1', memberCardIds: ['c2'], origin: 'manual' });
        expect(ok.status).toBe(201);
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({ origin: 'manual' }));
    });

    it("defaults origin to 'suggestion' when omitted", async () => {
        const { app, deps } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' })] });
        const spy = vi.spyOn(deps.cardGroupPort, 'createGroup');
        const ok = await post(app, { headCardId: 'c1', memberCardIds: ['c2'] });
        expect(ok.status).toBe(201);
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({ origin: 'suggestion' }));
    });

    it('400s when title is longer than 60 characters (P6)', async () => {
        const { app } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' })] });
        expect((await post(app, { headCardId: 'c1', memberCardIds: ['c2'], title: 'a'.repeat(61) })).status).toBe(400);
    });

    it('409s with group_conflict when the port reports a conflict (P3-P5)', async () => {
        const { app, deps } = buildRetrospectiveTestApp({ retrospectives: [board()], cards: [card({ id: 'c1' }), card({ id: 'c2' })] });
        vi.spyOn(deps.cardGroupPort, 'createGroup').mockRejectedValue(groupConflict());
        const res = await post(app, { headCardId: 'c1', memberCardIds: ['c2'] });
        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('group_conflict');
    });
});
