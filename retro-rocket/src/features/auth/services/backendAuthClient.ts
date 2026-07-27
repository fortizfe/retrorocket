import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/services/firebase';

/**
 * Client for the backend-orchestrated authentication API (feature 014). The browser no
 * longer performs the OAuth handshake itself (FR-009): sign-in and provider-linking are
 * full-page redirects to the backend, and the backend session (httpOnly cookie) is the
 * source of truth. The backend returns a short-lived Firebase custom token so the client
 * can keep its existing Firestore access working (FR-011).
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
    try {
        const res = await fetch(`${API}/session`, { credentials: 'include' });
        if (!res.ok) return UNAUTHENTICATED;
        return (await res.json()) as SessionResult;
    } catch {
        return UNAUTHENTICATED;
    }
}

/**
 * Fetch the backend session and, when authenticated, hydrate the Firebase client session
 * via the returned custom token so client-side Firestore access continues to work.
 */
export async function bootstrapSession(): Promise<SessionResult> {
    const result = await fetchSession();
    if (result.authenticated && result.firebaseCustomToken && auth) {
        await signInWithCustomToken(auth, result.firebaseCustomToken);
    }
    return result;
}

/** Terminate the backend session. Callers should also sign out of Firebase. */
export async function logout(): Promise<void> {
    await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
}
