import type { IdentityStorePort } from '../../application/ports';
import { UserIdentity, type ProviderProfile } from '../../domain/auth/UserIdentity';
import type { OAuthProvider } from '../../domain/auth/types';

/**
 * Minimal subset of the firebase-admin Auth surface this adapter depends on. The real
 * `getAuth()` instance satisfies it structurally; tests inject a fake, so unit tests
 * need no live emulator (the emulator is exercised in US3 E2E).
 */
export interface FirebaseUserRecordLike {
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    customClaims?: Record<string, unknown>;
}

export interface FirebaseAuthLike {
    getUser(uid: string): Promise<FirebaseUserRecordLike>;
    getUserByEmail(email: string): Promise<FirebaseUserRecordLike>;
    createUser(props: { email: string; displayName?: string; photoURL?: string }): Promise<FirebaseUserRecordLike>;
    setCustomUserClaims(uid: string, claims: Record<string, unknown>): Promise<void>;
    createCustomToken(uid: string, developerClaims?: Record<string, unknown>): Promise<string>;
}

interface LinkedAccount {
    provider: OAuthProvider;
    providerAccountId: string;
    email: string;
}

function isUserNotFound(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'auth/user-not-found';
}

/**
 * Resolves the canonical Firebase user by verified email (get-or-create), unioning the
 * provider so two providers sharing an email map to one uid (FR-013), and mints custom
 * tokens for client-side Firestore continuity (FR-011).
 */
export class FirebaseIdentityAdapter implements IdentityStorePort {
    constructor(private readonly auth: FirebaseAuthLike) {}

    async resolveUser(profile: ProviderProfile, normalizedEmail: string): Promise<UserIdentity> {
        let record: FirebaseUserRecordLike;
        try {
            record = await this.auth.getUserByEmail(normalizedEmail);
        } catch (error) {
            if (!isUserNotFound(error)) throw error;
            record = await this.auth.createUser({
                email: normalizedEmail,
                displayName: profile.displayName ?? undefined,
                photoURL: profile.photoURL ?? undefined,
            });
        }

        const existing = Array.isArray(record.customClaims?.providers)
            ? (record.customClaims!.providers as OAuthProvider[])
            : [];
        const providers = existing.includes(profile.provider) ? existing : [...existing, profile.provider];

        if (providers.length !== existing.length) {
            await this.auth.setCustomUserClaims(record.uid, { ...(record.customClaims ?? {}), providers });
        }

        return new UserIdentity(
            record.uid,
            normalizedEmail,
            record.displayName ?? profile.displayName ?? null,
            record.photoURL ?? profile.photoURL ?? null,
            providers,
        );
    }

    async linkProviderToUser(uid: string, profile: ProviderProfile, normalizedEmail: string): Promise<UserIdentity> {
        const record = await this.auth.getUser(uid);
        const claims = record.customClaims ?? {};

        const existingProviders = Array.isArray(claims.providers) ? (claims.providers as OAuthProvider[]) : [];
        const providers = existingProviders.includes(profile.provider)
            ? existingProviders
            : [...existingProviders, profile.provider];

        const existingLinks = Array.isArray(claims.linkedAccounts) ? (claims.linkedAccounts as LinkedAccount[]) : [];
        const alreadyLinked = existingLinks.some(
            (l) => l.provider === profile.provider && l.providerAccountId === profile.providerAccountId,
        );
        const linkedAccounts = alreadyLinked
            ? existingLinks
            : [...existingLinks, { provider: profile.provider, providerAccountId: profile.providerAccountId, email: normalizedEmail }];

        await this.auth.setCustomUserClaims(uid, { ...claims, providers, linkedAccounts });

        return new UserIdentity(
            uid,
            record.email ?? normalizedEmail,
            record.displayName ?? profile.displayName ?? null,
            record.photoURL ?? profile.photoURL ?? null,
            providers,
        );
    }

    async mintCustomToken(uid: string): Promise<string> {
        return this.auth.createCustomToken(uid);
    }
}
