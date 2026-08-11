import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { AuthProviderType, EnsureProfileInput, ProfilePort, ProfileRecord } from '../../application/ports/profile';
import { InMemoryTtlCache } from '../cache/InMemoryTtlCache';

export const USERS = 'users';

/** Per-instance profile cache TTL (040, FR-003, clarified at 60s). Cross-instance
 * staleness up to this window is accepted; the instance that handles an explicit
 * rename invalidates its own entry immediately rather than waiting out the TTL. */
export const PROFILE_CACHE_TTL_MS = 60_000;

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
    private readonly cache = new InMemoryTtlCache<string, ProfileRecord>();

    constructor(private readonly db: Firestore) {}

    async ensureProfile(input: EnsureProfileInput): Promise<ProfileRecord> {
        // 040, FR-002/FR-003: a cache hit serves both a repeat lookup within the same
        // request cycle and any lookup within the 60s window, without a Firestore read.
        const cached = this.cache.get(input.uid);
        if (cached) return cached;

        const docRef = this.db.collection(USERS).doc(input.uid);
        const snap = await docRef.get();

        if (snap.exists) {
            const existing = toProfileRecord(snap.id, snap.data()!);
            const providers = unionMissingProviders(existing.providers, input.providers);
            if (providers.length === existing.providers.length) {
                this.cache.set(input.uid, existing, PROFILE_CACHE_TTL_MS);
                return existing;
            }
            await docRef.update({ providers, updatedAt: FieldValue.serverTimestamp() });
            const updated = await docRef.get();
            const record = toProfileRecord(updated.id, updated.data()!);
            this.cache.set(input.uid, record, PROFILE_CACHE_TTL_MS);
            return record;
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
        const record = toProfileRecord(created.id, created.data()!);
        this.cache.set(input.uid, record, PROFILE_CACHE_TTL_MS);
        return record;
    }

    async updateDisplayName(uid: string, displayName: string): Promise<ProfileRecord> {
        // Invalidate first (not just overwrite-on-return) so a concurrent ensureProfile
        // read that races this write can never observe a stale cached name (040, FR-003).
        this.cache.delete(uid);
        const docRef = this.db.collection(USERS).doc(uid);
        await docRef.update({ displayName, updatedAt: FieldValue.serverTimestamp() });
        const updated = await docRef.get();
        const record = toProfileRecord(updated.id, updated.data()!);
        this.cache.set(uid, record, PROFILE_CACHE_TTL_MS);
        return record;
    }
}
