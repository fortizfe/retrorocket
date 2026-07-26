import { describe, it, expect } from 'vitest';
import { JoseSessionAdapter, JoseOAuthStateCodec } from '../../../src/adapters/session/JoseSessionAdapter';
import { OAuthState } from '../../../src/domain/auth/OAuthState';
import { SESSION_SOFT_TTL_SECONDS } from '../../../src/domain/auth/Session';
import type { PublicUser } from '../../../src/domain/auth/types';

const user: PublicUser = { uid: 'u1', email: 'a@b.com', displayName: 'A', photoURL: null, providers: ['google'] };
const NOW = Math.floor(Date.now() / 1000);

describe('JoseSessionAdapter', () => {
    const svc = new JoseSessionAdapter('test-signing-key-0123456789');

    it('issues a verifiable token carrying the session claims', async () => {
        const { token, session } = await svc.issue(user, NOW);
        expect(token.split('.')).toHaveLength(3);
        const verified = await svc.verify(token, NOW);
        expect(verified?.data.sub).toBe('u1');
        expect(verified?.data.user).toEqual(user);
        expect(verified?.data.exp).toBe(session.data.exp);
    });

    it('rejects a token signed with a different key', async () => {
        const { token } = await svc.issue(user, NOW);
        const other = new JoseSessionAdapter('a-completely-different-key-9876');
        expect(await other.verify(token, NOW)).toBeNull();
    });

    it('rejects a tampered token', async () => {
        const { token } = await svc.issue(user, NOW);
        const tampered = token.slice(0, -3) + 'aaa';
        expect(await svc.verify(tampered, NOW)).toBeNull();
    });

    it('rejects a token past its absolute expiry', async () => {
        const { session } = await svc.issue(user, NOW);
        const { token } = await svc.issue(user, NOW);
        expect(await svc.verify(token, session.data.absExp + 10)).toBeNull();
    });

    it('refreshes into a new token with a rotated soft expiry', async () => {
        const { session } = await svc.issue(user, NOW);
        const refreshAt = NOW + SESSION_SOFT_TTL_SECONDS + 5;
        const { token, session: refreshed } = await svc.refresh(session, refreshAt);
        expect(refreshed.data.exp).toBe(refreshAt + SESSION_SOFT_TTL_SECONDS);
        expect(refreshed.data.absExp).toBe(session.data.absExp);
        expect((await svc.verify(token, refreshAt))?.data.exp).toBe(refreshed.data.exp);
    });
});

describe('JoseOAuthStateCodec', () => {
    const codec = new JoseOAuthStateCodec('state-key-abc');

    it('round-trips an OAuth state', async () => {
        const state = OAuthState.create({ state: 'st', codeVerifier: 'cv', provider: 'google', nowSeconds: NOW, returnTo: '/x' });
        const decoded = await codec.decode(await codec.encode(state));
        expect(decoded?.data).toEqual(state.data);
    });

    it('returns null for a tampered or foreign-signed cookie', async () => {
        const state = OAuthState.create({ state: 'st', codeVerifier: null, provider: 'github', nowSeconds: NOW });
        const encoded = await codec.encode(state);
        expect(await codec.decode(encoded.slice(0, -3) + 'zzz')).toBeNull();
        expect(await new JoseOAuthStateCodec('other').decode(encoded)).toBeNull();
        expect(await codec.decode('not-a-jwt')).toBeNull();
    });
});
