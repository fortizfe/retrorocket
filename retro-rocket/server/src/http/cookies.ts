import type { CookieOptions, Request, Response } from 'express';

export const SESSION_COOKIE = 'rr_session';
export const OAUTH_STATE_COOKIE = 'rr_oauth_state';
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10; // 10 minutes

// Cookies are ALWAYS httpOnly + Secure + SameSite=Lax. Secure is a hard literal (not a
// runtime flag) so the security posture is unconditional and statically verifiable. Modern
// browsers treat `http://localhost` as a secure context, so Secure cookies still work for
// local dev and the Playwright (Chromium) E2E suite.
const SESSION_OPTIONS: CookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };

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

export function setSessionCookie(res: Response, token: string, maxAgeSeconds: number): void {
    res.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: maxAgeSeconds * 1000 });
}

export function clearSessionCookie(res: Response): void {
    res.clearCookie(SESSION_COOKIE, SESSION_OPTIONS);
}

export function setOAuthStateCookie(res: Response, value: string): void {
    res.cookie(OAUTH_STATE_COOKIE, value, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: OAUTH_STATE_MAX_AGE_SECONDS * 1000 });
}

export function clearOAuthStateCookie(res: Response): void {
    res.clearCookie(OAUTH_STATE_COOKIE, SESSION_OPTIONS);
}
