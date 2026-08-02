import type { ClockPort, RandomPort, SessionServicePort } from '../../ports';
import type { McpClientStorePort, McpConnectionStorePort } from '../../ports/mcp';
import { McpConnection } from '../../../domain/mcp/McpConnection';
import type { ConnectionOrigin } from '../../../domain/mcp/ConnectionOrigin';

export const MCP_AUTHORIZATION_REQUEST_TTL_SECONDS = 60 * 10; // 10 minutes, mirrors OAuthState's TTL

export interface StartMcpAuthorizationDeps {
    clientStore: McpClientStorePort;
    connectionStore: McpConnectionStorePort;
    sessionService: SessionServicePort;
    clock: ClockPort;
    random: RandomPort;
}

export interface StartMcpAuthorizationInput {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    state: string;
    sessionToken: string | undefined;
}

export type StartMcpAuthorizationResult =
    /** client_id unknown or redirect_uri not registered — redirect_uri is NOT trusted, so no redirect happens. */
    | { kind: 'invalid_client_or_redirect' }
    /** redirect_uri IS trusted; safe to bounce the browser back with ?error=...&state=... */
    | { kind: 'redirect_error'; error: string; redirectUri: string; state: string }
    | { kind: 'needs_login' }
    | { kind: 'consent'; requestCode: string; clientName: string; uid: string };

/** GET /api/mcp/authorize, before the user has Allowed/Denied (contracts/oauth-endpoints.md). */
export async function startMcpAuthorization(
    deps: StartMcpAuthorizationDeps,
    input: StartMcpAuthorizationInput,
): Promise<StartMcpAuthorizationResult> {
    const client = await deps.clientStore.getById(input.clientId);
    if (!client || !client.allowsRedirectUri(input.redirectUri)) {
        return { kind: 'invalid_client_or_redirect' };
    }

    if (input.codeChallengeMethod !== 'S256' || !input.codeChallenge) {
        return { kind: 'redirect_error', error: 'invalid_request', redirectUri: input.redirectUri, state: input.state };
    }

    const now = deps.clock.nowSeconds();
    const session = input.sessionToken ? await deps.sessionService.verify(input.sessionToken, now) : null;
    if (!session) {
        return { kind: 'needs_login' };
    }

    const requestCode = deps.random.state();
    await deps.connectionStore.createAuthorizationRequest({
        code: requestCode,
        clientId: client.data.clientId,
        clientName: client.data.clientName,
        uid: session.data.sub,
        redirectUri: input.redirectUri,
        codeChallenge: input.codeChallenge,
        state: input.state,
        nowSeconds: now,
        ttlSeconds: MCP_AUTHORIZATION_REQUEST_TTL_SECONDS,
    });

    return { kind: 'consent', requestCode, clientName: client.data.clientName, uid: session.data.sub };
}

export interface DecideMcpAuthorizationDeps {
    connectionStore: McpConnectionStorePort;
    clock: ClockPort;
    random: RandomPort;
}

export interface DecideMcpAuthorizationInput {
    requestCode: string;
    /** The uid of the currently signed-in user deciding — re-checked against the request's uid. */
    uid: string;
    approve: boolean;
    /** Classified from the consent-decision request's User-Agent header (research.md §2/§3). */
    origin: ConnectionOrigin;
}

export type DecideMcpAuthorizationResult =
    | { kind: 'not_found' }
    | { kind: 'redirect'; redirectUri: string; params: Record<string, string> };

/** The consent screen's Allow/Deny decision (McpConsentScreen.tsx calls this via the backend). */
export async function decideMcpAuthorization(
    deps: DecideMcpAuthorizationDeps,
    input: DecideMcpAuthorizationInput,
): Promise<DecideMcpAuthorizationResult> {
    const record = await deps.connectionStore.getAuthorizationRequest(input.requestCode);
    if (!record || record.uid !== input.uid || record.approved !== null) {
        return { kind: 'not_found' };
    }
    // The route handler's error message already promised "not found, already decided, or
    // expired" (mcp.ts) — this request-level expiry was never actually enforced here, only
    // later at token-exchange time (ExchangeMcpToken.ts's own, separate expiresAt check).
    // A user who takes longer than MCP_AUTHORIZATION_REQUEST_TTL_SECONDS to click Allow
    // would see the approval "succeed" here, only for the code to fail as inexplicably
    // "expired" moments later when the AI client exchanges it — surfacing as a confusing,
    // seemingly random connection failure instead of a clear "this request expired, retry."
    if (record.expiresAt < deps.clock.nowSeconds()) {
        return { kind: 'not_found' };
    }

    if (!input.approve) {
        await deps.connectionStore.decideAuthorizationRequest(input.requestCode, { approved: false });
        return { kind: 'redirect', redirectUri: record.redirectUri, params: { error: 'access_denied', state: record.state } };
    }

    const connection = McpConnection.createPending({
        id: deps.random.sessionId(),
        uid: input.uid,
        clientId: record.clientId,
        clientName: record.clientName,
        nowSeconds: deps.clock.nowSeconds(),
        origin: input.origin,
    });
    await deps.connectionStore.decideAuthorizationRequest(input.requestCode, { approved: true, connection });

    return { kind: 'redirect', redirectUri: record.redirectUri, params: { code: input.requestCode, state: record.state } };
}
