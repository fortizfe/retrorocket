/**
 * Client for the backend-orchestrated authentication API. The browser never performs the
 * OAuth handshake itself: sign-in and provider-linking are full-page redirects to the
 * backend, and the backend session (httpOnly cookie) is the SPA's sole credential — no
 * Firebase custom token, no client-side Firebase Auth involvement at all (feature 017
 * FR-006/FR-013, superseding the temporary custom-token bridge from feature 014).
 */

export type BackendProvider = 'google' | 'github';

export interface BackendUser {
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    providers: BackendProvider[];
    primaryProvider: BackendProvider;
    /** ISO-ish timestamp string from the backend (Firebase Auth's user creation time). */
    createdAt: string;
}

export interface SessionResult {
    authenticated: boolean;
    user: BackendUser | null;
}

const API = '/api/auth';
const UNAUTHENTICATED: SessionResult = { authenticated: false, user: null };

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

/** Read the current backend session. */
export async function fetchSession(): Promise<SessionResult> {
    try {
        const res = await fetch(`${API}/session`, { credentials: 'include' });
        if (!res.ok) return UNAUTHENTICATED;
        return (await res.json()) as SessionResult;
    } catch {
        return UNAUTHENTICATED;
    }
}

/** Establish the app session for the SPA. Purely a session read — no Firebase involved. */
export async function bootstrapSession(): Promise<SessionResult> {
    return fetchSession();
}

/** Update the user's editable display name (Profile page). */
export async function updateDisplayName(displayName: string): Promise<SessionResult> {
    const res = await fetch(`${API}/profile`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
    });
    if (!res.ok) throw new Error(`Failed to update display name (status ${res.status})`);
    return (await res.json()) as SessionResult;
}

/** Terminate the backend session. */
export async function logout(): Promise<void> {
    await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
}
