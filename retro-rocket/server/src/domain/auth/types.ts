// Backend-local auth vocabulary. Kept independent of the frontend's types so the
// hexagonal core never imports from src/ (Constitution IV / FR-003).

export type OAuthProvider = 'google' | 'github';

export const OAUTH_PROVIDERS: readonly OAuthProvider[] = ['google', 'github'] as const;

export function isOAuthProvider(value: string): value is OAuthProvider {
    return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

/** Non-sensitive user projection returned to the client. */
export interface PublicUser {
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    providers: OAuthProvider[];
    /** The provider first used to create this account — shown on the Profile page. */
    primaryProvider: OAuthProvider;
    /** ISO-ish timestamp string (Firebase Auth's UserRecord.metadata.creationTime) — "member since". */
    createdAt: string;
}
