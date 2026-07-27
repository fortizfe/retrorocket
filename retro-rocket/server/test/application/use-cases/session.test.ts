import { describe, it, expect } from 'vitest';
import { getCurrentSession, refreshSession } from '../../../src/application/use-cases/session';
import { logout } from '../../../src/application/use-cases/Logout';
import { SessionExpiredError, Session, SESSION_SOFT_TTL_SECONDS } from '../../../src/domain/auth/Session';
import { fixedClock, fakeIdentityStore, fakeSessionService, NOW } from './fakes';
import type { PublicUser } from '../../../src/domain/auth/types';

const user: PublicUser = { uid: 'uid-1', email: 'a@b.com', displayName: 'A', photoURL: null, providers: ['google'] };

function deps(now = NOW) {
    return { sessionService: fakeSessionService(), identityStore: fakeIdentityStore(), clock: fixedClock(now) };
}

async function tokenIssuedAt(now: number): Promise<string> {
    const { token } = await fakeSessionService().issue(user, now);
    return token;
}

describe('getCurrentSession', () => {
    it('returns unauthenticated when no cookie is present', async () => {
        const out = await getCurrentSession(deps(), undefined);
        expect(out.result).toEqual({ authenticated: false, user: null, firebaseCustomToken: null });
        expect(out.refreshedCookie).toBeNull();
    });

    it('returns the user + a fresh custom token when active (no rotation)', async () => {
        const token = await tokenIssuedAt(NOW);
        const out = await getCurrentSession(deps(NOW + 10), token);
        expect(out.result.authenticated).toBe(true);
        expect(out.result.user).toEqual(user);
        expect(out.result.firebaseCustomToken).toBe('ct-uid-1');
        expect(out.refreshedCookie).toBeNull();
    });

    it('silently rotates the cookie once the soft window lapses (within absolute)', async () => {
        const token = await tokenIssuedAt(NOW);
        const out = await getCurrentSession(deps(NOW + SESSION_SOFT_TTL_SECONDS + 5), token);
        expect(out.result.authenticated).toBe(true);
        expect(out.refreshedCookie).toBeTruthy();
        expect(out.refreshedCookie).not.toBe(token);
    });

    it('returns unauthenticated for a tampered/invalid cookie', async () => {
        const out = await getCurrentSession(deps(), 'not-a-valid-token');
        expect(out.result.authenticated).toBe(false);
    });
});

describe('refreshSession', () => {
    it('rotates unconditionally within the absolute lifetime', async () => {
        const token = await tokenIssuedAt(NOW);
        const out = await refreshSession(deps(NOW + 10), token);
        expect(out.refreshedCookie).toBeTruthy();
        expect(out.result.firebaseCustomToken).toBe('ct-uid-1');
    });

    it('throws 401 (SessionExpiredError) when absent or past absolute expiry', async () => {
        await expect(refreshSession(deps(), undefined)).rejects.toThrowError(SessionExpiredError);
        const session = Session.issue(user, NOW, 'sid');
        const past = session.data.absExp + 10;
        const token = JSON.stringify(session.data);
        await expect(refreshSession(deps(past), token)).rejects.toThrowError(SessionExpiredError);
    });
});

describe('logout', () => {
    it('resolves the user id from a valid cookie and never throws', async () => {
        const token = await tokenIssuedAt(NOW);
        expect(await logout(deps(NOW + 10), token)).toEqual({ userId: 'uid-1' });
        expect(await logout(deps(), undefined)).toEqual({ userId: null });
        expect(await logout(deps(), 'garbage')).toEqual({ userId: null });
    });
});
