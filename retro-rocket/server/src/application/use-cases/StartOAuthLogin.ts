import type { ClockPort, OAuthProviderPort, OAuthStateCodecPort, RandomPort } from '../ports';
import { OAuthState } from '../../domain/auth/OAuthState';

export interface StartOAuthLoginDeps {
    provider: OAuthProviderPort;
    clock: ClockPort;
    random: RandomPort;
    stateCodec: OAuthStateCodecPort;
}

export interface StartOAuthLoginResult {
    authorizationUrl: string;
    /** Signed value to store in the short-lived oauth_state cookie. */
    stateCookieValue: string;
}

/**
 * Begins a login: generates anti-forgery state (+ PKCE where the provider supports it),
 * builds the provider authorization URL, and packages the state for the oauth_state
 * cookie. The backend stays stateless — nothing is persisted server-side.
 */
export async function startOAuthLogin(
    deps: StartOAuthLoginDeps,
    params: { returnTo?: string },
): Promise<StartOAuthLoginResult> {
    const now = deps.clock.nowSeconds();
    const state = deps.random.state();
    const codeVerifier = deps.provider.usesPKCE ? deps.random.codeVerifier() : null;

    const oauthState = OAuthState.create({
        state,
        codeVerifier,
        provider: deps.provider.provider,
        nowSeconds: now,
        returnTo: params.returnTo,
    });

    const url = deps.provider.createAuthorizationURL(state, codeVerifier);
    const stateCookieValue = await deps.stateCodec.encode(oauthState);

    return { authorizationUrl: url.toString(), stateCookieValue };
}
