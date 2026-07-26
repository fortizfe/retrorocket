import { decodeJwt } from 'jose';
import type { OAuthProviderPort } from '../../application/ports';
import type { ProviderProfile } from '../../domain/auth/UserIdentity';

/** Structural subset of arctic's Google client (injectable for tests). */
export interface ArcticGoogleClient {
    createAuthorizationURL(state: string, codeVerifier: string, scopes: string[]): URL;
    validateAuthorizationCode(code: string, codeVerifier: string): Promise<{ idToken(): string }>;
}

const DEFAULT_SCOPES = ['openid', 'email', 'profile'];

/**
 * Google OAuth (PKCE). Profile is read from the returned id_token — a Google-signed JWT
 * delivered directly by the token endpoint over TLS, so decoding (not re-verifying) is
 * sufficient here.
 */
export class GoogleOAuthAdapter implements OAuthProviderPort {
    readonly provider = 'google' as const;
    readonly usesPKCE = true;

    constructor(
        private readonly client: ArcticGoogleClient,
        private readonly scopes: string[] = DEFAULT_SCOPES,
    ) {}

    createAuthorizationURL(state: string, codeVerifier: string | null): URL {
        if (!codeVerifier) throw new Error('Google OAuth requires a PKCE code verifier');
        return this.client.createAuthorizationURL(state, codeVerifier, this.scopes);
    }

    async exchangeCode(code: string, codeVerifier: string | null): Promise<ProviderProfile> {
        if (!codeVerifier) throw new Error('Google OAuth requires a PKCE code verifier');
        const tokens = await this.client.validateAuthorizationCode(code, codeVerifier);
        const claims = decodeJwt(tokens.idToken());
        return {
            provider: 'google',
            providerAccountId: String(claims.sub ?? ''),
            email: typeof claims.email === 'string' ? claims.email : null,
            emailVerified: claims.email_verified === true,
            displayName: typeof claims.name === 'string' ? claims.name : null,
            photoURL: typeof claims.picture === 'string' ? claims.picture : null,
        };
    }
}
