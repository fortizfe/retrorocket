import { describe, it, expect } from 'vitest';
import { startMcpAuthorization, decideMcpAuthorization } from '../../../../src/application/use-cases/mcp/AuthorizeMcpConnection';
import { McpClientRegistration } from '../../../../src/domain/mcp/McpClientRegistration';
import { inMemoryClientStore, inMemoryConnectionStore, fixedClock, sequentialRandom, fakeSessionServiceFor, NOW } from './mcpFakes';

const REDIRECT_URI = 'https://claude.ai/callback';

function registeredClient() {
    return McpClientRegistration.register({ clientId: 'client1', clientName: 'Claude', redirectUris: [REDIRECT_URI], nowSeconds: NOW });
}

describe('startMcpAuthorization', () => {
    it('rejects an unknown client_id without redirecting (redirect_uri not trusted yet)', async () => {
        const result = await startMcpAuthorization(
            {
                clientStore: inMemoryClientStore([]),
                connectionStore: inMemoryConnectionStore(),
                sessionService: fakeSessionServiceFor('u1'),
                clock: fixedClock(),
                random: sequentialRandom(),
            },
            { clientId: 'unknown', redirectUri: REDIRECT_URI, codeChallenge: 'cc', codeChallengeMethod: 'S256', state: 'st', sessionToken: undefined },
        );
        expect(result.kind).toBe('invalid_client_or_redirect');
    });

    it('rejects a redirect_uri not registered for the client', async () => {
        const result = await startMcpAuthorization(
            {
                clientStore: inMemoryClientStore([registeredClient()]),
                connectionStore: inMemoryConnectionStore(),
                sessionService: fakeSessionServiceFor('u1'),
                clock: fixedClock(),
                random: sequentialRandom(),
            },
            { clientId: 'client1', redirectUri: 'https://evil.example/callback', codeChallenge: 'cc', codeChallengeMethod: 'S256', state: 'st', sessionToken: undefined },
        );
        expect(result.kind).toBe('invalid_client_or_redirect');
    });

    it('reports needs_login when there is no valid session', async () => {
        const result = await startMcpAuthorization(
            {
                clientStore: inMemoryClientStore([registeredClient()]),
                connectionStore: inMemoryConnectionStore(),
                sessionService: fakeSessionServiceFor('u1'),
                clock: fixedClock(),
                random: sequentialRandom(),
            },
            { clientId: 'client1', redirectUri: REDIRECT_URI, codeChallenge: 'cc', codeChallengeMethod: 'S256', state: 'st', sessionToken: undefined },
        );
        expect(result.kind).toBe('needs_login');
    });

    it('creates a consent request when signed in with a valid client/redirect_uri', async () => {
        const connectionStore = inMemoryConnectionStore();
        const result = await startMcpAuthorization(
            {
                clientStore: inMemoryClientStore([registeredClient()]),
                connectionStore,
                sessionService: fakeSessionServiceFor('u1'),
                clock: fixedClock(),
                random: sequentialRandom(),
            },
            {
                clientId: 'client1',
                redirectUri: REDIRECT_URI,
                codeChallenge: 'challenge-abc',
                codeChallengeMethod: 'S256',
                state: 'st',
                sessionToken: 'session-u1',
            },
        );
        expect(result.kind).toBe('consent');
        if (result.kind === 'consent') {
            expect(result.clientName).toBe('Claude');
            const record = await connectionStore.getAuthorizationRequest(result.requestCode);
            expect(record?.uid).toBe('u1');
            expect(record?.approved).toBeNull();
        }
    });
});

describe('decideMcpAuthorization', () => {
    async function withConsentRequest() {
        const connectionStore = inMemoryConnectionStore();
        const start = await startMcpAuthorization(
            {
                clientStore: inMemoryClientStore([registeredClient()]),
                connectionStore,
                sessionService: fakeSessionServiceFor('u1'),
                clock: fixedClock(),
                random: sequentialRandom(),
            },
            { clientId: 'client1', redirectUri: REDIRECT_URI, codeChallenge: 'challenge-abc', codeChallengeMethod: 'S256', state: 'st-1', sessionToken: 'session-u1' },
        );
        if (start.kind !== 'consent') throw new Error('expected consent');
        return { connectionStore, requestCode: start.requestCode };
    }

    it('on approval, creates a pending connection and redirects with a code + the original state', async () => {
        const { connectionStore, requestCode } = await withConsentRequest();
        const result = await decideMcpAuthorization(
            { connectionStore, clock: fixedClock(), random: sequentialRandom() },
            { requestCode, uid: 'u1', approve: true },
        );
        expect(result.kind).toBe('redirect');
        if (result.kind === 'redirect') {
            expect(result.redirectUri).toBe(REDIRECT_URI);
            expect(result.params.code).toBe(requestCode);
            expect(result.params.state).toBe('st-1');
        }
        const record = await connectionStore.getAuthorizationRequest(requestCode);
        expect(record?.approved).toBe(true);
        expect(record?.connectionId).not.toBeNull();
    });

    it('on denial, redirects with access_denied and creates no connection', async () => {
        const { connectionStore, requestCode } = await withConsentRequest();
        const result = await decideMcpAuthorization(
            { connectionStore, clock: fixedClock(), random: sequentialRandom() },
            { requestCode, uid: 'u1', approve: false },
        );
        expect(result.kind).toBe('redirect');
        if (result.kind === 'redirect') expect(result.params.error).toBe('access_denied');
        const record = await connectionStore.getAuthorizationRequest(requestCode);
        expect(record?.connectionId).toBeNull();
    });

    it('rejects a decision from a uid other than the one who started the request', async () => {
        const { connectionStore, requestCode } = await withConsentRequest();
        const result = await decideMcpAuthorization(
            { connectionStore, clock: fixedClock(), random: sequentialRandom() },
            { requestCode, uid: 'someone-else', approve: true },
        );
        expect(result.kind).toBe('not_found');
    });
});
