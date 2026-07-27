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
    metadata?: { creationTime: string };
}

export interface FirebaseAuthLike {
    getUser(uid: string): Promise<FirebaseUserRecordLike>;
    getUserByEmail(email: string): Promise<FirebaseUserRecordLike>;
    createUser(props: { email: string; displayName?: string; photoURL?: string }): Promise<FirebaseUserRecordLike>;
    updateUser(uid: string, props: { displayName?: string }): Promise<FirebaseUserRecordLike>;
    setCustomUserClaims(uid: string, claims: Record<string, unknown>): Promise<void>;
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
        let isNewUser = false;
        try {
            record = await this.auth.getUserByEmail(normalizedEmail);
        } catch (error) {
            if (!isUserNotFound(error)) throw error;
            record = await this.auth.createUser({
                email: normalizedEmail,
                displayName: profile.displayName ?? undefined,
                photoURL: profile.photoURL ?? undefined,
            });
            isNewUser = true;
        }

        const existing = Array.isArray(record.customClaims?.providers)
            ? (record.customClaims!.providers as OAuthProvider[])
            : [];
        const providers = existing.includes(profile.provider) ? existing : [...existing, profile.provider];
        // Set once, at account creation, and never changed afterward (Profile page's "primary
        // provider" — linking additional providers later must not retroactively change it).
        const primaryProvider = (record.customClaims?.primaryProvider as OAuthProvider | undefined) ?? providers[0];

        if (providers.length !== existing.length || isNewUser) {
            await this.auth.setCustomUserClaims(record.uid, { ...(record.customClaims ?? {}), providers, primaryProvider });
        }

        return new UserIdentity(
            record.uid,
            normalizedEmail,
            record.displayName ?? profile.displayName ?? null,
            record.photoURL ?? profile.photoURL ?? null,
            providers,
            primaryProvider,
            record.metadata?.creationTime ?? new Date().toISOString(),
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

        // Linking a second provider must never change which one was primary.
        const primaryProvider = (claims.primaryProvider as OAuthProvider | undefined) ?? existingProviders[0] ?? profile.provider;
        await this.auth.setCustomUserClaims(uid, { ...claims, providers, linkedAccounts, primaryProvider });

        return new UserIdentity(
            uid,
            record.email ?? normalizedEmail,
            record.displayName ?? profile.displayName ?? null,
            record.photoURL ?? profile.photoURL ?? null,
            providers,
            primaryProvider,
            record.metadata?.creationTime ?? new Date().toISOString(),
        );
    }

    async updateDisplayName(uid: string, displayName: string): Promise<UserIdentity> {
        const updated = await this.auth.updateUser(uid, { displayName });
        const providers = Array.isArray(updated.customClaims?.providers) ? (updated.customClaims!.providers as OAuthProvider[]) : [];
        const primaryProvider = (updated.customClaims?.primaryProvider as OAuthProvider | undefined) ?? providers[0];

        return new UserIdentity(
            updated.uid,
            updated.email ?? '',
            updated.displayName ?? displayName,
            updated.photoURL ?? null,
            providers,
            primaryProvider,
            updated.metadata?.creationTime ?? new Date().toISOString(),
        );
    }
}
