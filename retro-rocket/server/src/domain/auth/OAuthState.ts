import { AppError } from '../errors';
import type { OAuthProvider } from './types';

export const OAUTH_STATE_TTL_SECONDS = 60 * 10; // 10 minutes

export class InvalidOAuthStateError extends AppError {
    constructor(message = 'Invalid, expired, or forged OAuth state') {
        super('invalid_oauth_state', message, 401);
        this.name = 'InvalidOAuthStateError';
    }
}

export interface OAuthStateData {
    state: string;
    codeVerifier: string | null;
    provider: OAuthProvider;
    createdAt: number;
    returnTo: string;
}

/**
 * Anti-forgery + PKCE material for one in-flight login. Persisted only in a short-lived
 * signed cookie (stateless backend). `returnTo` is constrained to a same-origin relative
 * path to prevent open redirects (FR-014).
 */
export class OAuthState {
    constructor(public readonly data: OAuthStateData) {}

    static create(params: {
        state: string;
        codeVerifier: string | null;
        provider: OAuthProvider;
        nowSeconds: number;
        returnTo?: string;
    }): OAuthState {
        return new OAuthState({
            state: params.state,
            codeVerifier: params.codeVerifier,
            provider: params.provider,
            createdAt: params.nowSeconds,
            returnTo: sanitizeReturnTo(params.returnTo),
        });
    }

    /**
     * Verify a callback against this stored state: provider + state string must match and
     * the state must not be expired. Throws InvalidOAuthStateError otherwise.
     */
    assertMatches(params: { state: string; provider: OAuthProvider; nowSeconds: number }): void {
        const expired = params.nowSeconds - this.data.createdAt > OAUTH_STATE_TTL_SECONDS;
        if (expired || this.data.provider !== params.provider || this.data.state !== params.state) {
            throw new InvalidOAuthStateError();
        }
    }
}

/**
 * Only same-origin relative paths are allowed as post-login redirect targets. Anything
 * absolute, protocol-relative, or malformed collapses to '/'.
 */
export function sanitizeReturnTo(returnTo?: string): string {
    if (!returnTo) return '/';
    // Must start with a single '/' and not be protocol-relative ('//host') or a backslash trick.
    if (!returnTo.startsWith('/') || returnTo.startsWith('//') || returnTo.startsWith('/\\')) return '/';
    if (returnTo.includes('://')) return '/';
    return returnTo;
}
