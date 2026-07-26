import type { OAuthProviderPort } from '../../application/ports';
import type { ProviderProfile } from '../../domain/auth/UserIdentity';

/** Structural subset of arctic's GitHub client (injectable for tests). */
export interface ArcticGithubClient {
    createAuthorizationURL(state: string, scopes: string[]): URL;
    validateAuthorizationCode(code: string): Promise<{ accessToken(): string }>;
}

export type FetchLike = typeof fetch;

interface GithubUser {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string | null;
    email: string | null;
}

interface GithubEmail {
    email: string;
    primary: boolean;
    verified: boolean;
}

const DEFAULT_SCOPES = ['read:user', 'user:email'];

/**
 * GitHub OAuth (no PKCE). The profile + verified primary email are read from the REST
 * API using the access token.
 */
export class GithubOAuthAdapter implements OAuthProviderPort {
    readonly provider = 'github' as const;
    readonly usesPKCE = false;

    constructor(
        private readonly client: ArcticGithubClient,
        private readonly fetchFn: FetchLike = fetch,
        private readonly scopes: string[] = DEFAULT_SCOPES,
    ) {}

    createAuthorizationURL(state: string, _codeVerifier: string | null): URL {
        return this.client.createAuthorizationURL(state, this.scopes);
    }

    async exchangeCode(code: string, _codeVerifier: string | null): Promise<ProviderProfile> {
        const tokens = await this.client.validateAuthorizationCode(code);
        const headers = {
            Authorization: `Bearer ${tokens.accessToken()}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'retrorocket',
        };

        const userRes = await this.fetchFn('https://api.github.com/user', { headers });
        if (!userRes.ok) throw new Error(`GitHub user fetch failed: ${userRes.status}`);
        const user = (await userRes.json()) as GithubUser;

        const emailsRes = await this.fetchFn('https://api.github.com/user/emails', { headers });
        const emails = emailsRes.ok ? ((await emailsRes.json()) as GithubEmail[]) : [];
        const primary = emails.find((e) => e.primary) ?? emails[0];

        return {
            provider: 'github',
            providerAccountId: String(user.id),
            email: primary?.email ?? user.email ?? null,
            emailVerified: primary?.verified ?? false,
            displayName: user.name ?? user.login ?? null,
            photoURL: user.avatar_url ?? null,
        };
    }
}
