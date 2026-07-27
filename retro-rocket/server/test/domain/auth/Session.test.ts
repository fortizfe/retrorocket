import { describe, it, expect } from 'vitest';
import {
    Session,
    SESSION_SOFT_TTL_SECONDS,
    SESSION_ABSOLUTE_TTL_SECONDS,
    SessionExpiredError,
} from '../../../src/domain/auth/Session';
import type { PublicUser } from '../../../src/domain/auth/types';

const user: PublicUser = {
    uid: 'u1',
    email: 'a@b.com',
    displayName: 'A',
    photoURL: null,
    providers: ['google'],
    primaryProvider: 'google',
    createdAt: '2026-01-01T00:00:00.000Z',
};
const T0 = 1_000_000;

describe('Session.issue', () => {
    it('sets soft and absolute expiries from now', () => {
        const s = Session.issue(user, T0, 'sid-1');
        expect(s.data.sub).toBe('u1');
        expect(s.data.exp).toBe(T0 + SESSION_SOFT_TTL_SECONDS);
        expect(s.data.absExp).toBe(T0 + SESSION_ABSOLUTE_TTL_SECONDS);
        expect(s.data.user).toEqual(user);
    });
});

describe('Session lifecycle', () => {
    it('is active within the soft window and inactive after it', () => {
        const s = Session.issue(user, T0, 'sid-1');
        expect(s.isActive(T0 + 10)).toBe(true);
        expect(s.isActive(T0 + SESSION_SOFT_TTL_SECONDS + 1)).toBe(false);
    });

    it('can refresh until the absolute expiry, preserving absExp', () => {
        const s = Session.issue(user, T0, 'sid-1');
        const refreshAt = T0 + SESSION_SOFT_TTL_SECONDS + 5;
        const r = s.refreshed(refreshAt);
        expect(r.data.absExp).toBe(s.data.absExp); // unchanged
        expect(r.data.exp).toBe(refreshAt + SESSION_SOFT_TTL_SECONDS);
        expect(r.data.sid).toBe('sid-1');
    });

    it('never extends exp beyond the absolute expiry', () => {
        const s = Session.issue(user, T0, 'sid-1');
        const nearEnd = s.data.absExp - 10;
        expect(s.refreshed(nearEnd).data.exp).toBe(s.data.absExp);
    });

    it('throws once the absolute lifetime is exceeded', () => {
        const s = Session.issue(user, T0, 'sid-1');
        expect(s.canRefresh(s.data.absExp + 1)).toBe(false);
        expect(() => s.refreshed(s.data.absExp + 1)).toThrowError(SessionExpiredError);
    });

    it('reports cookie max-age as remaining seconds until absolute expiry', () => {
        const s = Session.issue(user, T0, 'sid-1');
        expect(s.cookieMaxAgeSeconds(T0)).toBe(SESSION_ABSOLUTE_TTL_SECONDS);
        expect(s.cookieMaxAgeSeconds(s.data.absExp + 100)).toBe(0);
    });
});
