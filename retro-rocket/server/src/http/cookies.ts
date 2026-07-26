import type { CookieOptions, Request, Response } from 'express';

export const SESSION_COOKIE = 'rr_session';
export const OAUTH_STATE_COOKIE = 'rr_oauth_state';
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10; // 10 minutes

/** Minimal request-cookie reader (Express does not parse cookies by default). */
export function readCookie(req: Request, name: string): string | undefined {
    const header = req.headers.cookie;
    if (!header) return undefined;
    for (const part of header.split(';')) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        if (part.slice(0, eq).trim() === name) {
            return decodeURIComponent(part.slice(eq + 1).trim());
        }
    }
    return undefined;
}

function options(secure: boolean, maxAgeSeconds: number): CookieOptions {
    return { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: maxAgeSeconds * 1000 };
}

function clearOptions(secure: boolean): CookieOptions {
    return { httpOnly: true, secure, sameSite: 'lax', path: '/' };
}

export function setSessionCookie(res: Response, token: string, maxAgeSeconds: number, secure: boolean): void {
    res.cookie(SESSION_COOKIE, token, options(secure, maxAgeSeconds));
}

export function clearSessionCookie(res: Response, secure: boolean): void {
    res.clearCookie(SESSION_COOKIE, clearOptions(secure));
}

export function setOAuthStateCookie(res: Response, value: string, secure: boolean): void {
    res.cookie(OAUTH_STATE_COOKIE, value, options(secure, OAUTH_STATE_MAX_AGE_SECONDS));
}

export function clearOAuthStateCookie(res: Response, secure: boolean): void {
    res.clearCookie(OAUTH_STATE_COOKIE, clearOptions(secure));
}
