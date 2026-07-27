import type { RequestHandler } from 'express';
import type { ClockPort, SessionServicePort } from '../../application/ports';
import { AppError } from '../../domain/errors';
import { readCookie, SESSION_COOKIE } from '../cookies';

export interface RequireSessionDeps {
    sessionService: SessionServicePort;
    clock: ClockPort;
}

/**
 * Session-cookie auth for every `/api/boards/*` route (mirrors the `requireSession` inline
 * helper already used by routes/auth.ts and routes/mcp.ts, but as reusable middleware since
 * the boards surface has many more routes). Sets `res.locals.uid` for downstream handlers.
 */
export function requireSession(deps: RequireSessionDeps): RequestHandler {
    return (req, res, next) => {
        const token = readCookie(req, SESSION_COOKIE);
        if (!token) {
            next(new AppError('unauthenticated', 'Sign-in required', 401));
            return;
        }

        deps.sessionService
            .verify(token, deps.clock.nowSeconds())
            .then((session) => {
                if (!session) {
                    next(new AppError('unauthenticated', 'Sign-in required', 401));
                    return;
                }
                res.locals.uid = session.data.sub;
                res.locals.user = session.data.user;
                next();
            })
            .catch(next);
    };
}
