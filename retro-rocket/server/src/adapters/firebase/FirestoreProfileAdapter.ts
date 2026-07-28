import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { AuthProviderType, EnsureProfileInput, ProfilePort, ProfileRecord } from '../../application/ports/profile';

export const USERS = 'users';

/**
 * Exported so this pure mapping/union logic can be unit-tested directly — the rest of
 * the adapter is thin firebase-admin query composition that, consistent with
 * FirestoreBoardsAdapter/FirestoreRetrospectiveReadAdapter/FirestoreMcpConnectionAdapter
 * elsewhere in this codebase, is verified end-to-end by the Playwright E2E suite against
 * the emulator rather than mocked at the Vitest level.
 */
export function toDate(value: unknown): Date {
    if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    return value instanceof Date ? value : new Date(value as string);
}

export function toProfileRecord(uid: string, data: FirebaseFirestore.DocumentData): ProfileRecord {
    return {
        uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL ?? null,
        providers: data.providers ?? [],
        primaryProvider: data.primaryProvider,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
    };
}

/** Providers present in `providers` but missing from `existing`, preserving `existing`'s order first. */
export function unionMissingProviders(existing: AuthProviderType[], providers: AuthProviderType[]): AuthProviderType[] {
    const missing = providers.filter((p) => !existing.includes(p));
    return missing.length > 0 ? [...existing, ...missing] : existing;
}

/**
 * Read/write Admin SDK access to the users/{uid} document for the "Mi Perfil" screen
 * (feature 018) — the backend's first server-side owner of this collection (research.md
 * §2). Kept separate from FirebaseIdentityAdapter (Firebase Auth custom claims).
 */
export class FirestoreProfileAdapter implements ProfilePort {
    constructor(private readonly db: Firestore) {}

    async ensureProfile(input: EnsureProfileInput): Promise<ProfileRecord> {
        const docRef = this.db.collection(USERS).doc(input.uid);
        const snap = await docRef.get();

        if (snap.exists) {
            const existing = toProfileRecord(snap.id, snap.data()!);
            const providers = unionMissingProviders(existing.providers, input.providers);
            if (providers.length === existing.providers.length) {
                return existing;
            }
            await docRef.update({ providers, updatedAt: FieldValue.serverTimestamp() });
            const updated = await docRef.get();
            return toProfileRecord(updated.id, updated.data()!);
        }

        const primaryProvider: AuthProviderType = input.providers[0] ?? 'google';
        const displayName = input.displayName ?? input.email.split('@')[0] ?? 'Usuario';
        await docRef.set({
            uid: input.uid,
            email: input.email,
            displayName,
            photoURL: input.photoURL,
            providers: input.providers,
            primaryProvider,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        const created = await docRef.get();
        return toProfileRecord(created.id, created.data()!);
    }

    async updateDisplayName(uid: string, displayName: string): Promise<ProfileRecord> {
        const docRef = this.db.collection(USERS).doc(uid);
        await docRef.update({ displayName, updatedAt: FieldValue.serverTimestamp() });
        const updated = await docRef.get();
        return toProfileRecord(updated.id, updated.data()!);
    }
}
