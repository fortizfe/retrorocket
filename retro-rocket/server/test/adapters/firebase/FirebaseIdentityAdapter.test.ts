import { describe, it, expect, vi } from 'vitest';
import {
    FirebaseIdentityAdapter,
    type FirebaseAuthLike,
    type FirebaseUserRecordLike,
} from '../../../src/adapters/firebase/FirebaseIdentityAdapter';
import type { ProviderProfile } from '../../../src/domain/auth/UserIdentity';

function profile(overrides: Partial<ProviderProfile> = {}): ProviderProfile {
    return {
        provider: 'google',
        providerAccountId: 'acc-1',
        email: 'a@b.com',
        emailVerified: true,
        displayName: 'A',
        photoURL: 'p.png',
        ...overrides,
    };
}

class NotFound extends Error {
    code = 'auth/user-not-found';
}

function fakeAuth(existing?: FirebaseUserRecordLike): FirebaseAuthLike & { records: FirebaseUserRecordLike[] } {
    const records: FirebaseUserRecordLike[] = existing ? [existing] : [];
    return {
        records,
        getUserByEmail: vi.fn(async (email: string) => {
            const found = records.find((r) => r.email === email);
            if (!found) throw new NotFound();
            return found;
        }),
        createUser: vi.fn(async (props) => {
            const rec: FirebaseUserRecordLike = { uid: 'new-uid', ...props };
            records.push(rec);
            return rec;
        }),
        setCustomUserClaims: vi.fn(async (uid: string, claims: Record<string, unknown>) => {
            const rec = records.find((r) => r.uid === uid);
            if (rec) rec.customClaims = claims;
        }),
        createCustomToken: vi.fn(async (uid: string) => `custom-token-for-${uid}`),
    };
}

describe('FirebaseIdentityAdapter.resolveUser', () => {
    it('creates a new user (with the initial provider) when none exists for the email', async () => {
        const auth = fakeAuth();
        const identity = await new FirebaseIdentityAdapter(auth).resolveUser(profile(), 'a@b.com');
        expect(auth.createUser).toHaveBeenCalledWith({ email: 'a@b.com', displayName: 'A', photoURL: 'p.png' });
        expect(identity.uid).toBe('new-uid');
        expect(identity.providers).toEqual(['google']);
    });

    it('links a second provider to the SAME uid for the same email (account linking)', async () => {
        const auth = fakeAuth({ uid: 'existing-uid', email: 'a@b.com', customClaims: { providers: ['google'] } });
        const identity = await new FirebaseIdentityAdapter(auth).resolveUser(profile({ provider: 'github' }), 'a@b.com');
        expect(auth.createUser).not.toHaveBeenCalled();
        expect(auth.setCustomUserClaims).toHaveBeenCalledWith('existing-uid', { providers: ['google', 'github'] });
        expect(identity.uid).toBe('existing-uid');
        expect(identity.providers).toEqual(['google', 'github']);
    });

    it('does not rewrite claims when the provider is already linked', async () => {
        const auth = fakeAuth({ uid: 'existing-uid', email: 'a@b.com', customClaims: { providers: ['google'] } });
        await new FirebaseIdentityAdapter(auth).resolveUser(profile({ provider: 'google' }), 'a@b.com');
        expect(auth.setCustomUserClaims).not.toHaveBeenCalled();
    });

    it('propagates unexpected errors (not user-not-found)', async () => {
        const auth = fakeAuth();
        auth.getUserByEmail = vi.fn(async () => {
            throw new Error('network');
        });
        await expect(new FirebaseIdentityAdapter(auth).resolveUser(profile(), 'a@b.com')).rejects.toThrow('network');
    });
});

describe('FirebaseIdentityAdapter.mintCustomToken', () => {
    it('delegates to createCustomToken', async () => {
        const auth = fakeAuth();
        expect(await new FirebaseIdentityAdapter(auth).mintCustomToken('u1')).toBe('custom-token-for-u1');
    });
});
