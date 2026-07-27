import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireSession } from '../../../src/http/middleware/requireSession';
import type { SessionServicePort } from '../../../src/application/ports';

function fakeReq(cookieHeader?: string): Request {
    return { headers: { cookie: cookieHeader } } as unknown as Request;
}

function fakeRes(): Response {
    return { locals: {} } as unknown as Response;
}

describe('requireSession middleware', () => {
    it('calls next with an AppError when no session cookie is present', () => {
        const sessionService = { verify: vi.fn() } as unknown as SessionServicePort;
        const next = vi.fn() as NextFunction;

        requireSession({ sessionService, clock: { nowSeconds: () => 1 } })(fakeReq(), fakeRes(), next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'unauthenticated' }));
    });

    it('calls next with an AppError when the session is invalid/expired', async () => {
        const sessionService = { verify: vi.fn().mockResolvedValue(null) } as unknown as SessionServicePort;
        const next = vi.fn() as NextFunction;

        await new Promise<void>((resolve) => {
            requireSession({ sessionService, clock: { nowSeconds: () => 1 } })(
                fakeReq('rr_session=bad'),
                fakeRes(),
                (...args) => {
                    (next as (...a: unknown[]) => void)(...args);
                    resolve();
                },
            );
        });

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'unauthenticated' }));
    });

    it('sets res.locals.uid/user and calls next() on a valid session', async () => {
        const user = { uid: 'u1', email: 'u1@example.com', displayName: 'Ana', photoURL: null, providers: ['google'] };
        const sessionService = {
            verify: vi.fn().mockResolvedValue({ data: { sub: 'u1', user } }),
        } as unknown as SessionServicePort;
        const res = fakeRes();
        const next = vi.fn() as NextFunction;

        await new Promise<void>((resolve) => {
            requireSession({ sessionService, clock: { nowSeconds: () => 1 } })(fakeReq('rr_session=good'), res, (...args) => {
                (next as (...a: unknown[]) => void)(...args);
                resolve();
            });
        });

        expect(res.locals.uid).toBe('u1');
        expect(res.locals.user).toEqual(user);
        expect(next).toHaveBeenCalledWith();
    });

    it('forwards an unexpected verification error to next()', async () => {
        const failure = new Error('boom');
        const sessionService = { verify: vi.fn().mockRejectedValue(failure) } as unknown as SessionServicePort;
        const next = vi.fn() as NextFunction;

        await new Promise<void>((resolve) => {
            requireSession({ sessionService, clock: { nowSeconds: () => 1 } })(fakeReq('rr_session=x'), fakeRes(), (...args) => {
                (next as (...a: unknown[]) => void)(...args);
                resolve();
            });
        });

        expect(next).toHaveBeenCalledWith(failure);
    });
});
