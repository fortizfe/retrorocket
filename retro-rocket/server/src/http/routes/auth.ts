import { Router, type Request, type Response } from 'express';
import type {
    ClockPort,
    IdentityStorePort,
    OAuthProviderPort,
    OAuthStateCodecPort,
    RandomPort,
    SessionServicePort,
} from '../../application/ports';
import { isOAuthProvider, type OAuthProvider } from '../../domain/auth/types';
import { AppError, NotFoundError } from '../../domain/errors';
import { startOAuthLogin, startLinkProvider } from '../../application/use-cases/StartOAuthLogin';
import { completeOAuthLogin } from '../../application/use-cases/CompleteOAuthLogin';
import { getCurrentSession, refreshSession } from '../../application/use-cases/session';
import { logout } from '../../application/use-cases/Logout';
import {
    SESSION_COOKIE,
    clearOAuthStateCookie,
    clearSessionCookie,
    readCookie,
    setOAuthStateCookie,
    setSessionCookie,
} from '../cookies';

export interface AuthRouterDeps {
    providers: Partial<Record<OAuthProvider, OAuthProviderPort>>;
    identityStore: IdentityStorePort;
    sessionService: SessionServicePort;
    stateCodec: OAuthStateCodecPort;
    clock: ClockPort;
    random: RandomPort;
    /** Set the Secure cookie flag (true in production/https). */
    secure: boolean;
    /** Where to send the browser when a login fails (SPA sign-in surface). */
    signInErrorRedirect?: string;
}

function resolveProvider(deps: AuthRouterDeps, raw: string | string[]): OAuthProviderPort {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (isOAuthProvider(value) && deps.providers[value]) return deps.providers[value]!;
    throw new NotFoundError(`Unknown auth provider: ${value}`);
}

function firstQuery(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

/**
 * Backend-orchestrated auth (FR-008…FR-016). Full-page redirect login/callback plus the
 * session/refresh/logout JSON endpoints the SPA calls. All routes are under /api/auth/*.
 */
export function authRouter(deps: AuthRouterDeps): Router {
    const router = Router();
    const errorRedirect = deps.signInErrorRedirect ?? '/';

    // Begin login → 302 to the provider (FR-008).
    router.get('/api/auth/login/:provider', async (req: Request, res: Response) => {
        const provider = resolveProvider(deps, req.params.provider);
        const { authorizationUrl, stateCookieValue } = await startOAuthLogin(
            { provider, clock: deps.clock, random: deps.random, stateCodec: deps.stateCodec },
            { returnTo: firstQuery(req.query.returnTo) },
        );
        setOAuthStateCookie(res, stateCookieValue, deps.secure);
        res.redirect(302, authorizationUrl);
    });

    // Begin proactive provider linking for a logged-in user → 302 to the provider (FR-013).
    router.get('/api/auth/link/:provider', async (req: Request, res: Response) => {
        const provider = resolveProvider(deps, req.params.provider);
        const session = await deps.sessionService.verify(readCookie(req, SESSION_COOKIE) ?? '', deps.clock.nowSeconds());
        if (!session) {
            return res.redirect(302, `${errorRedirect}?auth_error=unauthenticated`);
        }
        const { authorizationUrl, stateCookieValue } = await startLinkProvider(
            { provider, clock: deps.clock, random: deps.random, stateCodec: deps.stateCodec },
            { uid: session.data.sub, returnTo: firstQuery(req.query.returnTo) },
        );
        setOAuthStateCookie(res, stateCookieValue, deps.secure);
        res.redirect(302, authorizationUrl);
    });

    // Provider callback → establish session, redirect to the SPA (FR-014). Handles both
    // login and link (the stored state's linkUid selects the behaviour).
    router.get('/api/auth/callback/:provider', async (req: Request, res: Response) => {
        const provider = resolveProvider(deps, req.params.provider);

        // Provider-reported error / user cancellation.
        const providerError = firstQuery(req.query.error);
        if (providerError) {
            clearOAuthStateCookie(res, deps.secure);
            return res.redirect(302, `${errorRedirect}?auth_error=${encodeURIComponent(providerError)}`);
        }

        try {
            const result = await completeOAuthLogin(
                {
                    provider,
                    identityStore: deps.identityStore,
                    sessionService: deps.sessionService,
                    stateCodec: deps.stateCodec,
                    clock: deps.clock,
                },
                {
                    code: firstQuery(req.query.code) ?? '',
                    state: firstQuery(req.query.state) ?? '',
                    stateCookieValue: readCookie(req, 'rr_oauth_state'),
                },
            );
            clearOAuthStateCookie(res, deps.secure);
            const maxAge = result.session.cookieMaxAgeSeconds(deps.clock.nowSeconds());
            setSessionCookie(res, result.sessionToken, maxAge, deps.secure);
            return res.redirect(302, result.returnTo);
        } catch (error) {
            // In a full-page redirect flow, surface auth failures as a localized SPA state
            // rather than a raw JSON 401 (FR-015).
            clearOAuthStateCookie(res, deps.secure);
            const code = error instanceof AppError ? error.code : 'auth_failed';
            return res.redirect(302, `${errorRedirect}?auth_error=${encodeURIComponent(code)}`);
        }
    });

    // Current session + fresh custom token for the SPA (FR-010a, FR-011).
    router.get('/api/auth/session', async (req: Request, res: Response) => {
        const out = await getCurrentSession(
            { sessionService: deps.sessionService, identityStore: deps.identityStore, clock: deps.clock },
            readCookie(req, SESSION_COOKIE),
        );
        if (out.refreshedCookie) {
            setSessionCookie(res, out.refreshedCookie.token, out.refreshedCookie.maxAgeSeconds, deps.secure);
        }
        res.status(200).json(out.result);
    });

    // Explicit refresh (FR-010a). Throws SessionExpiredError → 401 via the error handler.
    router.post('/api/auth/refresh', async (req: Request, res: Response) => {
        const out = await refreshSession(
            { sessionService: deps.sessionService, identityStore: deps.identityStore, clock: deps.clock },
            readCookie(req, SESSION_COOKIE),
        );
        setSessionCookie(res, out.refreshedCookie!.token, out.refreshedCookie!.maxAgeSeconds, deps.secure);
        res.status(200).json(out.result);
    });

    // Terminate the session (FR-012).
    router.post('/api/auth/logout', async (req: Request, res: Response) => {
        await logout({ sessionService: deps.sessionService, clock: deps.clock }, readCookie(req, SESSION_COOKIE));
        clearSessionCookie(res, deps.secure);
        res.status(204).end();
    });

    return router;
}
