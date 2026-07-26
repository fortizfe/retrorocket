import { vi } from 'vitest';
import type {
    ClockPort,
    IdentityStorePort,
    OAuthProviderPort,
    OAuthStateCodecPort,
    RandomPort,
    SessionServicePort,
} from '../../../src/application/ports';
import { UserIdentity, type ProviderProfile } from '../../../src/domain/auth/UserIdentity';
import { OAuthState } from '../../../src/domain/auth/OAuthState';
import { Session } from '../../../src/domain/auth/Session';
import type { OAuthProvider, PublicUser } from '../../../src/domain/auth/types';

export const NOW = 1_700_000_000;

export function fixedClock(now = NOW): ClockPort {
    return { nowSeconds: () => now };
}

export function fakeRandom(): RandomPort {
    return { state: () => 'state-xyz', codeVerifier: () => 'verifier-xyz', sessionId: () => 'sid-xyz' };
}

export function fakeProvider(overrides: Partial<OAuthProviderPort> & { provider?: OAuthProvider } = {}): OAuthProviderPort {
    const profile: ProviderProfile = {
        provider: overrides.provider ?? 'google',
        providerAccountId: 'acc-1',
        email: 'user@example.com',
        emailVerified: true,
        displayName: 'User',
        photoURL: null,
    };
    return {
        provider: overrides.provider ?? 'google',
        usesPKCE: overrides.usesPKCE ?? true,
        createAuthorizationURL: overrides.createAuthorizationURL ?? vi.fn(() => new URL('https://provider/authorize?state=state-xyz')),
        exchangeCode: overrides.exchangeCode ?? vi.fn(async () => profile),
    };
}

/** In-memory codec that just round-trips through JSON (integrity assumed, TTL via domain). */
export function fakeStateCodec(): OAuthStateCodecPort {
    return {
        encode: async (s) => JSON.stringify(s.data),
        decode: async (v) => {
            try {
                return new OAuthState(JSON.parse(v));
            } catch {
                return null;
            }
        },
    };
}

export function fakeIdentityStore(): IdentityStorePort {
    return {
        resolveUser: vi.fn(async (profile: ProviderProfile, email: string) =>
            new UserIdentity('uid-1', email, profile.displayName, profile.photoURL, [profile.provider]),
        ),
        mintCustomToken: vi.fn(async (uid: string) => `ct-${uid}`),
    };
}

/** Real session semantics without crypto — issues plain-JSON "tokens". */
export function fakeSessionService(): SessionServicePort {
    return {
        issue: async (user: PublicUser, now: number) => {
            const session = Session.issue(user, now, 'sid-xyz');
            return { token: JSON.stringify(session.data), session };
        },
        verify: async (token: string, now: number) => {
            try {
                const session = new Session(JSON.parse(token));
                return session.data.absExp > now ? session : null;
            } catch {
                return null;
            }
        },
        refresh: async (session, now) => {
            const refreshed = session.refreshed(now);
            return { token: JSON.stringify(refreshed.data), session: refreshed };
        },
    };
}
