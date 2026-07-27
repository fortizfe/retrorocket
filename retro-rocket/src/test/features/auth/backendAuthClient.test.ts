import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startLogin, startLinkProvider, fetchSession, bootstrapSession, updateDisplayName, logout } from '@/features/auth/services/backendAuthClient';

describe('backendAuthClient', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
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

    it('fetchSession returns the parsed session on success, with no Firebase custom token', async () => {
        const body = {
            authenticated: true,
            user: { uid: 'u1', email: 'a@b.com', displayName: 'A', photoURL: null, providers: ['google'], primaryProvider: 'google', createdAt: '2026-01-01T00:00:00.000Z' },
        };
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => body }) as unknown as Response));
        expect(await fetchSession()).toEqual(body);
        expect(fetch).toHaveBeenCalledWith('/api/auth/session', { credentials: 'include' });
    });

    it('fetchSession returns unauthenticated on a non-OK response or network error', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false }) as unknown as Response));
        expect(await fetchSession()).toEqual({ authenticated: false, user: null });
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
        expect(await fetchSession()).toEqual({ authenticated: false, user: null });
    });

    it('bootstrapSession is purely a session read (no Firebase involvement)', async () => {
        const body = { authenticated: true, user: { uid: 'u1' } };
        const fetchMock = vi.fn(async () => ({ ok: true, json: async () => body }) as unknown as Response);
        vi.stubGlobal('fetch', fetchMock);
        const result = await bootstrapSession();
        expect(result).toEqual(body);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('updateDisplayName PATCHes /api/auth/profile and returns the updated session', async () => {
        const body = { authenticated: true, user: { uid: 'u1', displayName: 'New Name' } };
        const fetchMock = vi.fn(async () => ({ ok: true, json: async () => body }) as unknown as Response);
        vi.stubGlobal('fetch', fetchMock);

        const result = await updateDisplayName('New Name');

        expect(result).toEqual(body);
        expect(fetchMock).toHaveBeenCalledWith('/api/auth/profile', {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName: 'New Name' }),
        });
    });

    it('updateDisplayName throws on a non-OK response', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 400 }) as unknown as Response));
        await expect(updateDisplayName('')).rejects.toThrow();
    });

    it('logout POSTs to /api/auth/logout with credentials', async () => {
        const fetchMock = vi.fn(async () => ({ ok: true }) as unknown as Response);
        vi.stubGlobal('fetch', fetchMock);
        await logout();
        expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST', credentials: 'include' });
    });
});
