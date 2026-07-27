import type { ClockPort, SessionServicePort } from '../ports';
import { SessionExpiredError } from '../../domain/auth/Session';
import type { PublicUser } from '../../domain/auth/types';

export interface SessionQueryDeps {
    sessionService: SessionServicePort;
    clock: ClockPort;
}

/** Shape returned to the SPA (see contracts/auth-session-change.md, feature 017). */
export interface ClientAuthResult {
    authenticated: boolean;
    user: PublicUser | null;
}

export interface RefreshedCookie {
    token: string;
    maxAgeSeconds: number;
}

export interface SessionQueryOutput {
    result: ClientAuthResult;
    /** Non-null when the session cookie was rotated and the route must re-set it. */
    refreshedCookie: RefreshedCookie | null;
}

const UNAUTHENTICATED: SessionQueryOutput = {
    result: { authenticated: false, user: null },
    refreshedCookie: null,
};

/**
 * Reads the current session for the SPA. Silently rotates the session cookie once its
 * soft window has lapsed but the absolute lifetime remains (FR-010a). No Firebase custom
 * token is minted here — the session cookie is the SPA's sole credential (feature 017).
 */
export async function getCurrentSession(
    deps: SessionQueryDeps,
    sessionCookie: string | undefined,
): Promise<SessionQueryOutput> {
    const now = deps.clock.nowSeconds();
    if (!sessionCookie) return UNAUTHENTICATED;

    const session = await deps.sessionService.verify(sessionCookie, now);
    if (!session) return UNAUTHENTICATED;

    let current = session;
    let refreshedCookie: RefreshedCookie | null = null;
    if (!session.isActive(now)) {
        if (!session.canRefresh(now)) return UNAUTHENTICATED;
        const rotated = await deps.sessionService.refresh(session, now);
        current = rotated.session;
        refreshedCookie = { token: rotated.token, maxAgeSeconds: rotated.session.cookieMaxAgeSeconds(now) };
    }

    return {
        result: { authenticated: true, user: current.data.user },
        refreshedCookie,
    };
}

/**
 * Explicit refresh (POST /api/auth/refresh). Rotates the session unconditionally within
 * the absolute lifetime; throws SessionExpiredError (→ 401) when absent or expired.
 */
export async function refreshSession(
    deps: SessionQueryDeps,
    sessionCookie: string | undefined,
): Promise<SessionQueryOutput> {
    const now = deps.clock.nowSeconds();
    const session = sessionCookie ? await deps.sessionService.verify(sessionCookie, now) : null;
    if (!session || !session.canRefresh(now)) throw new SessionExpiredError();

    const rotated = await deps.sessionService.refresh(session, now);
    return {
        result: { authenticated: true, user: rotated.session.data.user },
        refreshedCookie: { token: rotated.token, maxAgeSeconds: rotated.session.cookieMaxAgeSeconds(now) },
    };
}
