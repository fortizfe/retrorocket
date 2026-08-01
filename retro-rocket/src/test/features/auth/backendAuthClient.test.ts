import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Firebase client service + SDK before importing the module under test.
vi.mock('@/lib/services/firebase', () => ({ auth: {} }));
const signInWithCustomToken = vi.fn(async () => ({}));
vi.mock('firebase/auth', () => ({ signInWithCustomToken: (...args: unknown[]) => signInWithCustomToken(...args) }));

import { startLogin, startLinkProvider, fetchSession, bootstrapSession, logout } from '@/features/auth/services/backendAuthClient';

describe('backendAuthClient', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        signInWithCustomToken.mockClear();
        const assign = vi.fn();
        Object.defineProperty(window, 'location', { value: { assign }, writable: true, configurable: true });
    });

    it('startLogin redirects to /api/auth/login/:provider with returnTo', () => {
        startLogin('google', '/dashboard');
        expect(window.location.assign).toHaveBeenCalledWith('/api/auth/login/google?returnTo=%2Fdashboard');
    });

    it('startLinkProvider redirects to /api/auth/link/:provider', () => {
        startLinkProvider('github', '/settings');
        expect(window.location.assign).toHaveBeenCalledWith('/api/auth/link/github?returnTo=%2Fsettings');
    });

    it('fetchSession returns the parsed session on success', async () => {
        const body = { authenticated: true, user: { uid: 'u1', email: 'a@b.com', displayName: 'A', photoURL: null, providers: ['google'] }, firebaseCustomToken: 'ct' };
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => body }) as unknown as Response));
        expect(await fetchSession()).toEqual(body);
        expect(fetch).toHaveBeenCalledWith('/api/auth/session', { credentials: 'include' });
    });

    it('fetchSession returns unauthenticated on a 401 (genuinely signed out) or a network error', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401 }) as unknown as Response));
        expect(await fetchSession()).toEqual({ authenticated: false, user: null, firebaseCustomToken: null });
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
        expect(await fetchSession()).toEqual({ authenticated: false, user: null, firebaseCustomToken: null });
    });

    // US1/FR-004: a 429 must never be silently treated as "signed out" — that hides the real
    // cause from the user and is exactly the reported "can't even log in" symptom's UX gap.
    it('fetchSession throws (does not silently report unauthenticated) on a 429 rate-limited response', async () => {
        const body = { error: { code: 'rate_limited', message: 'Too many requests — please wait a moment and try again.' }, correlationId: 'cid-1' };
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, json: async () => body }) as unknown as Response));

        await expect(fetchSession()).rejects.toThrow('Too many requests — please wait a moment and try again.');
    });

    it('bootstrapSession propagates the 429 error rather than swallowing it', async () => {
        const body = { error: { code: 'rate_limited', message: 'Too many requests — please wait a moment and try again.' }, correlationId: 'cid-1' };
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, json: async () => body }) as unknown as Response));

        await expect(bootstrapSession()).rejects.toThrow('Too many requests — please wait a moment and try again.');
        expect(signInWithCustomToken).not.toHaveBeenCalled();
    });

    // 021, research.md §4: once no browser code depends on an authenticated Firebase client
    // context (the columns listener and the participant-photo cache — both removed), this
    // call serves no purpose and is itself a direct browser-to-Firebase request (FR-005).
    it('bootstrapSession does NOT sign into Firebase, even when the backend session is authenticated', async () => {
        const body = { authenticated: true, user: { uid: 'u1' }, firebaseCustomToken: 'ct-123' };
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => body }) as unknown as Response));
        const result = await bootstrapSession();
        expect(signInWithCustomToken).not.toHaveBeenCalled();
        expect(result).toEqual(body);
    });

    it('bootstrapSession does not sign in when unauthenticated', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ authenticated: false, user: null, firebaseCustomToken: null }) }) as unknown as Response));
        await bootstrapSession();
        expect(signInWithCustomToken).not.toHaveBeenCalled();
    });

    it('logout POSTs to /api/auth/logout with credentials', async () => {
        const fetchMock = vi.fn(async () => ({ ok: true }) as unknown as Response);
        vi.stubGlobal('fetch', fetchMock);
        await logout();
        expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST', credentials: 'include' });
    });
});
