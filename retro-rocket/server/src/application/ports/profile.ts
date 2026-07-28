// ---------------------------------------------------------------------------
// ProfilePort — read/write Firestore access for the "Mi Perfil" screen
// (feature 018). Deliberately separate from IdentityStorePort (Firebase Auth
// custom claims — OAuth resolution, provider linking, custom-token minting)
// and from BoardsPort/RetrospectiveReadPort (unrelated Firestore collections),
// per Interface Segregation (research.md §2, data-model.md).
// ---------------------------------------------------------------------------

export type AuthProviderType = 'google' | 'github' | 'apple';

export interface ProfileRecord {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string | null;
    providers: AuthProviderType[];
    primaryProvider: AuthProviderType;
    createdAt: Date;
    updatedAt: Date;
}

export interface EnsureProfileInput {
    uid: string;
    email: string;
    /** From the session PublicUser; null falls back to email-prefix at creation. */
    displayName: string | null;
    photoURL: string | null;
    /** Authoritative provider set from the current session identity. */
    providers: AuthProviderType[];
}

export interface ProfilePort {
    /**
     * Get-or-create: returns the existing users/{uid} doc (unioning in any providers
     * present in EnsureProfileInput.providers but missing from the stored doc, persisting
     * if changed), or creates it with OAuth-derived defaults if absent. Idempotent.
     */
    ensureProfile(input: EnsureProfileInput): Promise<ProfileRecord>;
    /**
     * Updates displayName only; throws if the profile does not exist (should not happen —
     * every session-authenticated request has already gone through ensureProfile at least once).
     */
    updateDisplayName(uid: string, displayName: string): Promise<ProfileRecord>;
}
