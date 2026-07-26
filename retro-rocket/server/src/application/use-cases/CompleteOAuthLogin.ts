import type { ClockPort, IdentityStorePort, OAuthProviderPort, OAuthStateCodecPort, SessionServicePort } from '../ports';
import { InvalidOAuthStateError } from '../../domain/auth/OAuthState';
import { assertVerifiedEmail } from '../../domain/auth/UserIdentity';
import type { Session } from '../../domain/auth/Session';
import type { PublicUser } from '../../domain/auth/types';

export interface CompleteOAuthLoginDeps {
    provider: OAuthProviderPort;
    identityStore: IdentityStorePort;
    sessionService: SessionServicePort;
    stateCodec: OAuthStateCodecPort;
    clock: ClockPort;
}

export interface CompleteOAuthLoginResult {
    sessionToken: string;
    session: Session;
    customToken: string;
    user: PublicUser;
    returnTo: string;
    /** True when this callback linked a provider to an existing session rather than logging in. */
    isLink: boolean;
}

/**
 * Completes a login callback: validates the anti-forgery state (FR-014), exchanges the
 * code for the verified provider profile, resolves/links the Firebase identity (FR-013),
 * issues the app session, and mints the client's Firebase custom token (FR-011).
 */
export async function completeOAuthLogin(
    deps: CompleteOAuthLoginDeps,
    params: { code: string; state: string; stateCookieValue: string | undefined },
): Promise<CompleteOAuthLoginResult> {
    const now = deps.clock.nowSeconds();

    if (!params.stateCookieValue) throw new InvalidOAuthStateError('Missing OAuth state cookie');
    const stored = await deps.stateCodec.decode(params.stateCookieValue);
    if (!stored) throw new InvalidOAuthStateError();
    stored.assertMatches({ state: params.state, provider: deps.provider.provider, nowSeconds: now });

    const profile = await deps.provider.exchangeCode(params.code, stored.data.codeVerifier);
    const email = assertVerifiedEmail(profile);

    const isLink = stored.data.linkUid !== null;
    const identity = isLink
        ? await deps.identityStore.linkProviderToUser(stored.data.linkUid!, profile, email)
        : await deps.identityStore.resolveUser(profile, email);
    const user = identity.toPublicUser();

    // Re-issue the session either way so the cookie carries the current provider list.
    const { token, session } = await deps.sessionService.issue(user, now);
    const customToken = await deps.identityStore.mintCustomToken(identity.uid);

    return { sessionToken: token, session, customToken, user, returnTo: stored.data.returnTo, isLink };
}
