import { AppError } from '../errors';
import type { OAuthProvider, PublicUser } from './types';

export const SESSION_SOFT_TTL_SECONDS = 60 * 60; // 1 hour (soft, rotating) — FR-010a
export const SESSION_ABSOLUTE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days (absolute max) — FR-010a

export class SessionExpiredError extends AppError {
    constructor() {
        super('session_expired', 'Session has reached its absolute maximum lifetime; re-authentication required', 401);
        this.name = 'SessionExpiredError';
    }
}

/** Claims embedded in the signed session cookie. Times are epoch seconds. */
export interface SessionData {
    sub: string;
    email: string;
    sid: string;
    iat: number;
    exp: number;
    absExp: number;
    user: PublicUser;
}

/**
 * Backend-owned session (value object). Carries a soft expiry that drives silent
 * refresh and an absolute expiry that caps the lifetime regardless of refreshes.
 */
export class Session {
    constructor(public readonly data: SessionData) {}

    /** Issue a brand-new session for a freshly authenticated user. */
    static issue(user: PublicUser, nowSeconds: number, sid: string): Session {
        return new Session({
            sub: user.uid,
            email: user.email,
            sid,
            iat: nowSeconds,
            exp: nowSeconds + SESSION_SOFT_TTL_SECONDS,
            absExp: nowSeconds + SESSION_ABSOLUTE_TTL_SECONDS,
            user,
        });
    }

    /** Soft window still open (no refresh needed). */
    isActive(nowSeconds: number): boolean {
        return nowSeconds < this.data.exp && nowSeconds < this.data.absExp;
    }

    /** Within the absolute lifetime (a refresh is still permitted). */
    canRefresh(nowSeconds: number): boolean {
        return nowSeconds < this.data.absExp;
    }

    /**
     * Rotate the soft window forward, preserving the original absolute expiry (a silent
     * refresh can never extend the session past its absolute max). Throws once the
     * absolute lifetime is exceeded.
     */
    refreshed(nowSeconds: number): Session {
        if (!this.canRefresh(nowSeconds)) throw new SessionExpiredError();
        return new Session({
            ...this.data,
            iat: nowSeconds,
            exp: Math.min(nowSeconds + SESSION_SOFT_TTL_SECONDS, this.data.absExp),
        });
    }

    /** Seconds until the absolute expiry — used for the cookie Max-Age. */
    cookieMaxAgeSeconds(nowSeconds: number): number {
        return Math.max(0, this.data.absExp - nowSeconds);
    }

    get providers(): OAuthProvider[] {
        return this.data.user.providers;
    }
}
