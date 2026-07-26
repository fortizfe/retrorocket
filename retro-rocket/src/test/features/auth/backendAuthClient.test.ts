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

    it('fetchSession returns unauthenticated on a non-OK response or network error', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false }) as unknown as Response));
        expect(await fetchSession()).toEqual({ authenticated: false, user: null, firebaseCustomToken: null });
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
        expect(await fetchSession()).toEqual({ authenticated: false, user: null, firebaseCustomToken: null });
    });

    it('bootstrapSession signs into Firebase with the custom token when authenticated', async () => {
        const body = { authenticated: true, user: { uid: 'u1' }, firebaseCustomToken: 'ct-123' };
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => body }) as unknown as Response));
        await bootstrapSession();
        expect(signInWithCustomToken).toHaveBeenCalledWith({}, 'ct-123');
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
