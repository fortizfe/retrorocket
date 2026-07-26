import express, { type Express } from 'express';
import { correlationId } from '../../../src/http/middleware/correlationId';
import { errorHandler, notFoundHandler } from '../../../src/http/middleware/errorHandler';
import { authRouter, type AuthRouterDeps } from '../../../src/http/routes/auth';
import {
    fixedClock,
    fakeRandom,
    fakeProvider,
    fakeStateCodec,
    fakeIdentityStore,
    fakeSessionService,
    NOW,
} from '../../application/use-cases/fakes';

export { NOW, fakeStateCodec, fakeSessionService } from '../../application/use-cases/fakes';

export function buildAuthTestApp(overrides: Partial<AuthRouterDeps> = {}): Express {
    const deps: AuthRouterDeps = {
        providers: { google: fakeProvider({ provider: 'google', usesPKCE: true }), github: fakeProvider({ provider: 'github', usesPKCE: false }) },
        identityStore: fakeIdentityStore(),
        sessionService: fakeSessionService(),
        stateCodec: fakeStateCodec(),
        clock: fixedClock(),
        random: fakeRandom(),
        secure: false,
        ...overrides,
    };

    const app = express();
    app.use(express.json());
    app.use(correlationId());
    app.use(authRouter(deps));
    app.use(notFoundHandler());
    app.use(errorHandler());
    return app;
}

/** Build a Cookie request header value (URL-encoded to match the reader). */
export function cookieHeader(name: string, value: string): string {
    return `${name}=${encodeURIComponent(value)}`;
}

/** Join the Set-Cookie header(s) of a supertest response (typed as string upstream). */
export function setCookies(res: { headers: Record<string, unknown> }): string {
    const raw = res.headers['set-cookie'];
    return (Array.isArray(raw) ? raw : raw ? [raw] : []).join(';');
}

export { NOW as CLOCK_NOW };
