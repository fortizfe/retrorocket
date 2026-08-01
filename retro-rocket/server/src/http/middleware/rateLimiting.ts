import type { Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { ClockPort, SessionServicePort } from '../../application/ports';
import { readCookie, SESSION_COOKIE } from '../cookies';
import type { ApiErrorBody } from './errorHandler';

export interface RateLimiterDeps {
    sessionService: SessionServicePort;
    clock: ClockPort;
}

export interface RateLimiterConfig extends RateLimiterDeps {
    windowMs: number;
    limit: number;
}

/**
 * Resolves the identity a rate-limit bucket is keyed on: the authenticated session's user id
 * when a valid `rr_session` cookie is present, falling back to the client IP (via
 * `express-rate-limit`'s own IPv6-safe helper, relying on `app.set('trust proxy', ...)` already
 * being configured — server/src/http/app.ts) otherwise.
 *
 * Without this, every router's limiter keyed on the raw `req.ip` behind Vercel's proxy, which
 * collapsed distinct users into one shared bucket — a handful of legitimate teammates' combined
 * traffic was enough to 429 everyone, including new sign-ins (research.md §1, FR-002).
 */
export function sessionAwareKeyGenerator(deps: RateLimiterDeps) {
    return async (req: Request): Promise<string> => {
        const token = readCookie(req, SESSION_COOKIE);
        if (token) {
            const session = await deps.sessionService.verify(token, deps.clock.nowSeconds());
            const sub = (session?.data as { sub?: string } | undefined)?.sub;
            if (sub) return `session:${sub}`;
        }
        return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
    };
}

/**
 * Shared limiter factory used by every router (auth, boards, profile, retrospectives, mcp) —
 * one implementation instead of five near-identical inline configs (Simplicity). Resizing
 * `windowMs`/`limit` per-router stays the caller's decision; only the key strategy and the
 * throttled-response envelope are centralized here.
 */
export function createRateLimiter(config: RateLimiterConfig) {
    return rateLimit({
        windowMs: config.windowMs,
        limit: config.limit,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        // Trust-proxy/IP validations are noisy and not applicable to the serverless model,
        // mirroring the pre-existing per-router convention.
        validate: false,
        keyGenerator: sessionAwareKeyGenerator(config),
        handler: (_req: Request, res: Response) => {
            const correlationId = typeof res.locals.correlationId === 'string' ? res.locals.correlationId : 'unknown';
            const body: ApiErrorBody = {
                error: { code: 'rate_limited', message: 'Too many requests — please wait a moment and try again.' },
                correlationId,
            };
            res.status(429).json(body);
        },
    });
}
