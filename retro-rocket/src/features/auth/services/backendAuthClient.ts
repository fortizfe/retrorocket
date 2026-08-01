/**
 * Client for the backend-orchestrated authentication API (feature 014). The browser no
 * longer performs the OAuth handshake itself (FR-009): sign-in and provider-linking are
 * full-page redirects to the backend, and the backend session (httpOnly cookie) is the
 * source of truth. The backend still returns a short-lived Firebase custom token
 * (`firebaseCustomToken`) in its response for backward-compatible shape, but nothing in
 * the browser signs into Firebase with it anymore (021, research.md §4) — the last two
 * direct-Firestore reads that call needed (the board-columns listener and the
 * participant-photo cache) have themselves been removed, so no browser code depends on an
 * authenticated Firebase client context (FR-005).
 */

export type BackendProvider = 'google' | 'github';

export interface BackendUser {
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    providers: BackendProvider[];
}

export interface SessionResult {
    authenticated: boolean;
    user: BackendUser | null;
    firebaseCustomToken: string | null;
}

const API = '/api/auth';
const UNAUTHENTICATED: SessionResult = { authenticated: false, user: null, firebaseCustomToken: null };

function withReturnTo(path: string, returnTo?: string): string {
    return returnTo ? `${path}?returnTo=${encodeURIComponent(returnTo)}` : path;
}

/** Redirect the browser to begin backend-orchestrated sign-in (FR-008). */
export function startLogin(provider: BackendProvider, returnTo?: string): void {
    window.location.assign(withReturnTo(`${API}/login/${provider}`, returnTo));
}

/** Redirect the browser to link an additional provider to the current account (FR-013). */
export function startLinkProvider(provider: BackendProvider, returnTo?: string): void {
    window.location.assign(withReturnTo(`${API}/link/${provider}`, returnTo));
}

/** Read the current backend session (does not touch Firebase). */
export async function fetchSession(): Promise<SessionResult> {
    let res: Response;
    try {
        res = await fetch(`${API}/session`, { credentials: 'include' });
    } catch {
        // Network-level failure (offline, DNS, etc.) — unchanged from prior behavior: treated
        // as "can't tell, assume signed out" rather than a visible error.
        return UNAUTHENTICATED;
    }

    if (res.status === 429) {
        // US1/FR-004: a throttled session check is not "signed out" — silently reporting
        // UNAUTHENTICATED here (as every other non-OK response below still does) is exactly the
        // reported symptom's UX gap: the user just sees a login screen with no indication
        // anything went wrong. Throwing routes this into UserProvider's existing catch block,
        // which already surfaces a visible toast for any session-bootstrap failure.
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message ?? 'Too many requests — please wait a moment and try again.');
    }
    if (!res.ok) return UNAUTHENTICATED;
    return (await res.json()) as SessionResult;
}

/** Fetch the backend session. Kept as its own function (rather than inlining fetchSession
 * at call sites) since UserContext's bootstrap effect is the one place this API is
 * consumed — a thin wrapper keeps that call site's intent explicit. */
export async function bootstrapSession(): Promise<SessionResult> {
    return fetchSession();
}

/** Terminate the backend session. Callers should also sign out of Firebase. */
export async function logout(): Promise<void> {
    await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
}
