import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { SessionServicePort } from '../../../src/application/ports';
import { createRateLimiter } from '../../../src/http/middleware/rateLimiting';
import { SESSION_COOKIE } from '../../../src/http/cookies';

function fixedClock() {
    return { nowSeconds: () => 0 };
}

/** Mirrors retrospectivesTestApp.ts's fakeSessionServiceWithUser — token 'session-<uid>'. */
function fakeSessionService(): SessionServicePort {
    return {
        issue: vi.fn(),
        verify: vi.fn(async (token: string) => {
            if (!token.startsWith('session-')) return null;
            const sub = token.slice('session-'.length);
            return { data: { sub } } as never;
        }),
        refresh: vi.fn(),
    };
}

function cookieHeader(value: string): string {
    return `${SESSION_COOKIE}=${encodeURIComponent(value)}`;
}

function buildApp(limit: number, trustProxy = false) {
    const app = express();
    if (trustProxy) app.set('trust proxy', true);
    app.use(
        createRateLimiter({
            sessionService: fakeSessionService(),
            clock: fixedClock(),
            windowMs: 60_000,
            limit,
        }),
    );
    app.get('/x', (_req, res) => res.status(200).json({ ok: true }));
    return app;
}

describe('shared rate-limit key resolver (research.md §1, FR-002)', () => {
    it('keys two distinct authenticated sessions independently — one session exhausting its limit does not throttle another', async () => {
        const app = buildApp(1);

        const a1 = await request(app).get('/x').set('Cookie', cookieHeader('session-user-a'));
        expect(a1.status).toBe(200);

        // Session A's own 2nd request within the window is throttled (limit=1) — confirms the
        // key resolver is actually distinguishing identities, not just accepting everything.
        const a2 = await request(app).get('/x').set('Cookie', cookieHeader('session-user-a'));
        expect(a2.status).toBe(429);

        // Session B's FIRST request must still succeed — not co-throttled with A's bucket.
        const b1 = await request(app).get('/x').set('Cookie', cookieHeader('session-user-b'));
        expect(b1.status).toBe(200);
    });

    it('falls back to trust-proxy-aware IP keying when no valid session cookie is present, still isolating distinct clients', async () => {
        const app = buildApp(1, true);

        const ip1First = await request(app).get('/x').set('X-Forwarded-For', '203.0.113.10');
        expect(ip1First.status).toBe(200);

        const ip1Second = await request(app).get('/x').set('X-Forwarded-For', '203.0.113.10');
        expect(ip1Second.status).toBe(429);

        // A different client IP must not be affected by the first client's exhausted bucket —
        // this is the exact shared-bucket bug (research.md §1) this resolver fixes.
        const ip2First = await request(app).get('/x').set('X-Forwarded-For', '203.0.113.20');
        expect(ip2First.status).toBe(200);
    });

    it('still rejects a genuinely excessive volume from a single identity (FR-003 — narrows false positives, does not remove abuse protection)', async () => {
        const app = buildApp(2);

        await request(app).get('/x').set('Cookie', cookieHeader('session-user-c'));
        await request(app).get('/x').set('Cookie', cookieHeader('session-user-c'));
        const third = await request(app).get('/x').set('Cookie', cookieHeader('session-user-c'));

        expect(third.status).toBe(429);
    });

    it('returns the app-wide ApiErrorBody envelope, not express-rate-limit\'s default response shape (FR-004, contracts/rate-limiting-contract.md)', async () => {
        const app = express();
        app.use((_req, res, next) => {
            res.locals.correlationId = 'test-correlation-id';
            next();
        });
        app.use(
            createRateLimiter({
                sessionService: fakeSessionService(),
                clock: fixedClock(),
                windowMs: 60_000,
                limit: 1,
            }),
        );
        app.get('/x', (_req, res) => res.status(200).json({ ok: true }));

        await request(app).get('/x').set('Cookie', cookieHeader('session-user-d'));
        const throttled = await request(app).get('/x').set('Cookie', cookieHeader('session-user-d'));

        expect(throttled.status).toBe(429);
        expect(throttled.body).toEqual({
            error: { code: 'rate_limited', message: expect.any(String) },
            correlationId: 'test-correlation-id',
        });
    });
});
