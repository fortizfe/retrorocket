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
        getUser: vi.fn(async (uid: string) => {
            const found = records.find((r) => r.uid === uid);
            if (!found) throw new NotFound();
            return found;
        }),
        getUserByEmail: vi.fn(async (email: string) => {
            const found = records.find((r) => r.email === email);
            if (!found) throw new NotFound();
            return found;
        }),
        createUser: vi.fn(async (props) => {
            const rec: FirebaseUserRecordLike = { uid: 'new-uid', metadata: { creationTime: '2026-01-01T00:00:00.000Z' }, ...props };
            records.push(rec);
            return rec;
        }),
        updateUser: vi.fn(async (uid: string, props: { displayName?: string }) => {
            const rec = records.find((r) => r.uid === uid);
            if (!rec) throw new NotFound();
            Object.assign(rec, props);
            return rec;
        }),
        setCustomUserClaims: vi.fn(async (uid: string, claims: Record<string, unknown>) => {
            const rec = records.find((r) => r.uid === uid);
            if (rec) rec.customClaims = claims;
        }),
    };
}

describe('FirebaseIdentityAdapter.resolveUser', () => {
    it('creates a new user (with the initial provider as primaryProvider) when none exists for the email', async () => {
        const auth = fakeAuth();
        const identity = await new FirebaseIdentityAdapter(auth).resolveUser(profile(), 'a@b.com');
        expect(auth.createUser).toHaveBeenCalledWith({ email: 'a@b.com', displayName: 'A', photoURL: 'p.png' });
        expect(identity.uid).toBe('new-uid');
        expect(identity.providers).toEqual(['google']);
        expect(identity.primaryProvider).toBe('google');
        expect(identity.createdAt).toBe('2026-01-01T00:00:00.000Z');
        expect(auth.setCustomUserClaims).toHaveBeenCalledWith('new-uid', { providers: ['google'], primaryProvider: 'google' });
    });

    it('links a second provider to the SAME uid for the same email (account linking), preserving primaryProvider', async () => {
        const auth = fakeAuth({ uid: 'existing-uid', email: 'a@b.com', customClaims: { providers: ['google'], primaryProvider: 'google' } });
        const identity = await new FirebaseIdentityAdapter(auth).resolveUser(profile({ provider: 'github' }), 'a@b.com');
        expect(auth.createUser).not.toHaveBeenCalled();
        expect(auth.setCustomUserClaims).toHaveBeenCalledWith('existing-uid', { providers: ['google', 'github'], primaryProvider: 'google' });
        expect(identity.uid).toBe('existing-uid');
        expect(identity.providers).toEqual(['google', 'github']);
        expect(identity.primaryProvider).toBe('google');
    });

    it('falls back to the first provider as primaryProvider for a pre-existing record with no primaryProvider claim', async () => {
        const auth = fakeAuth({ uid: 'existing-uid', email: 'a@b.com', customClaims: { providers: ['google'] } });
        const identity = await new FirebaseIdentityAdapter(auth).resolveUser(profile({ provider: 'google' }), 'a@b.com');
        expect(identity.primaryProvider).toBe('google');
    });

    it('does not rewrite claims when the provider is already linked and primaryProvider is already set', async () => {
        const auth = fakeAuth({ uid: 'existing-uid', email: 'a@b.com', customClaims: { providers: ['google'], primaryProvider: 'google' } });
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

describe('FirebaseIdentityAdapter.linkProviderToUser', () => {
    it('attaches a provider + linked account to an existing uid regardless of email, preserving primaryProvider', async () => {
        const auth = fakeAuth({ uid: 'u-1', email: 'primary@x.com', customClaims: { providers: ['google'], primaryProvider: 'google' } });
        const identity = await new FirebaseIdentityAdapter(auth).linkProviderToUser(
            'u-1',
            profile({ provider: 'github', email: 'different@github.com', providerAccountId: 'gh-99' }),
            'different@github.com',
        );
        expect(identity.uid).toBe('u-1');
        expect(identity.providers).toEqual(['google', 'github']);
        expect(identity.primaryProvider).toBe('google');
        expect(auth.setCustomUserClaims).toHaveBeenCalledWith('u-1', {
            providers: ['google', 'github'],
            linkedAccounts: [{ provider: 'github', providerAccountId: 'gh-99', email: 'different@github.com' }],
            primaryProvider: 'google',
        });
    });

    it('is idempotent when the provider account is already linked', async () => {
        const auth = fakeAuth({
            uid: 'u-1',
            email: 'primary@x.com',
            customClaims: {
                providers: ['google', 'github'],
                primaryProvider: 'google',
                linkedAccounts: [{ provider: 'github', providerAccountId: 'gh-99', email: 'x' }],
            },
        });
        await new FirebaseIdentityAdapter(auth).linkProviderToUser('u-1', profile({ provider: 'github', providerAccountId: 'gh-99' }), 'x');
        expect(auth.setCustomUserClaims).toHaveBeenCalledWith(
            'u-1',
            expect.objectContaining({ linkedAccounts: [{ provider: 'github', providerAccountId: 'gh-99', email: 'x' }] }),
        );
    });
});

describe('FirebaseIdentityAdapter.updateDisplayName', () => {
    it('persists the new display name on the Auth user record', async () => {
        const auth = fakeAuth({
            uid: 'u-1',
            email: 'a@b.com',
            displayName: 'Old Name',
            customClaims: { providers: ['google'], primaryProvider: 'google' },
        });
        const identity = await new FirebaseIdentityAdapter(auth).updateDisplayName('u-1', 'New Name');

        expect(auth.updateUser).toHaveBeenCalledWith('u-1', { displayName: 'New Name' });
        expect(identity.displayName).toBe('New Name');
        expect(identity.providers).toEqual(['google']);
        expect(identity.primaryProvider).toBe('google');
    });
});
