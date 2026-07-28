import type { EnsureProfileInput, ProfilePort, ProfileRecord } from '../../../../src/application/ports/profile';

/**
 * In-memory ProfilePort replicating FirestoreProfileAdapter's observable behavior
 * (get-or-create with OAuth defaults, provider-union without overwriting
 * displayName/photoURL, displayName-only update) — mirrors boardsFakes.ts's
 * inMemoryBoardsPort, shared by use-case tests and profileTestApp.ts.
 */
export function inMemoryProfilePort(seed: ProfileRecord[] = []): ProfilePort {
    const profiles = new Map<string, ProfileRecord>(seed.map((p) => [p.uid, { ...p }]));

    return {
        async ensureProfile(input: EnsureProfileInput): Promise<ProfileRecord> {
            const existing = profiles.get(input.uid);

            if (existing) {
                const missing = input.providers.filter((p) => !existing.providers.includes(p));
                if (missing.length > 0) {
                    const updated: ProfileRecord = {
                        ...existing,
                        providers: [...existing.providers, ...missing],
                        updatedAt: new Date(),
                    };
                    profiles.set(input.uid, updated);
                    return { ...updated };
                }
                return { ...existing };
            }

            const now = new Date();
            const created: ProfileRecord = {
                uid: input.uid,
                email: input.email,
                displayName: input.displayName ?? input.email.split('@')[0] ?? 'Usuario',
                photoURL: input.photoURL,
                providers: input.providers,
                primaryProvider: input.providers[0] ?? 'google',
                createdAt: now,
                updatedAt: now,
            };
            profiles.set(input.uid, created);
            return { ...created };
        },

        async updateDisplayName(uid: string, displayName: string): Promise<ProfileRecord> {
            const existing = profiles.get(uid);
            if (!existing) throw new Error('Profile not found');
            const updated: ProfileRecord = { ...existing, displayName, updatedAt: new Date() };
            profiles.set(uid, updated);
            return { ...updated };
        },
    };
}
