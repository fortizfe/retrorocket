import type { OAuthProvider, PublicUser } from '../../domain/auth/types';
import type { ProviderProfile, UserIdentity } from '../../domain/auth/UserIdentity';
import type { Session } from '../../domain/auth/Session';
import type { OAuthState } from '../../domain/auth/OAuthState';

/** Wall clock, injectable for deterministic tests. Returns epoch SECONDS. */
export interface ClockPort {
    nowSeconds(): number;
}

/** One OAuth 2.0 identity provider (Google, GitHub) — a driven adapter. */
export interface OAuthProviderPort {
    readonly provider: OAuthProvider;
    /** Whether this provider uses PKCE (Google yes, GitHub no). */
    readonly usesPKCE: boolean;
    createAuthorizationURL(state: string, codeVerifier: string | null): URL;
    exchangeCode(code: string, codeVerifier: string | null): Promise<ProviderProfile>;
}

/** Resolves/links the canonical user and mints the client's Firestore credential. */
export interface IdentityStorePort {
    /** Get-or-create the user by verified email, unioning the provider (FR-013). */
    resolveUser(profile: ProviderProfile, normalizedEmail: string): Promise<UserIdentity>;
    /**
     * Attach a provider to an already-authenticated user (proactive linking from
     * settings), regardless of the provider email. Records the provider + account id.
     */
    linkProviderToUser(uid: string, profile: ProviderProfile, normalizedEmail: string): Promise<UserIdentity>;
    /** Mint a short-lived Firebase custom token for signInWithCustomToken (FR-011). */
    mintCustomToken(uid: string): Promise<string>;
}

/** Issues/verifies/refreshes the signed session token carried by the httpOnly cookie. */
export interface SessionServicePort {
    issue(user: PublicUser, nowSeconds: number): Promise<{ token: string; session: Session }>;
    verify(token: string, nowSeconds: number): Promise<Session | null>;
    refresh(session: Session, nowSeconds: number): Promise<{ token: string; session: Session }>;
}

/** Encodes/decodes the short-lived OAuth state into the signed oauth_state cookie. */
export interface OAuthStateCodecPort {
    encode(state: OAuthState): Promise<string>;
    decode(cookieValue: string): Promise<OAuthState | null>;
}

/** Cryptographic randomness for state/PKCE/session ids. */
export interface RandomPort {
    state(): string;
    codeVerifier(): string;
    sessionId(): string;
}
