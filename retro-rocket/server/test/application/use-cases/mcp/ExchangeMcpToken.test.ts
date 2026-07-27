import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { exchangeMcpToken, InvalidGrantError } from '../../../../src/application/use-cases/mcp/ExchangeMcpToken';
import { McpConnection } from '../../../../src/domain/mcp/McpConnection';
import { inMemoryConnectionStore, fakeTokenService, fixedClock, sequentialRandom, NOW } from './mcpFakes';

const REDIRECT_URI = 'https://claude.ai/callback';
const VERIFIER = 'test-code-verifier-xyz';
const CHALLENGE = createHash('sha256').update(VERIFIER).digest('base64url');

async function withApprovedCode(connectionStore = inMemoryConnectionStore()) {
    await connectionStore.createAuthorizationRequest({
        code: 'code1',
        clientId: 'client1',
        clientName: 'Claude',
        uid: 'u1',
        redirectUri: REDIRECT_URI,
        codeChallenge: CHALLENGE,
        state: 'st',
        nowSeconds: NOW,
        ttlSeconds: 600,
    });
    const connection = McpConnection.createPending({ id: 'conn1', uid: 'u1', clientId: 'client1', clientName: 'Claude', nowSeconds: NOW });
    await connectionStore.decideAuthorizationRequest('code1', { approved: true, connection });
    return connectionStore;
}

describe('exchangeMcpToken — authorization_code grant', () => {
    it('issues an access + refresh token for a valid code + PKCE verifier', async () => {
        const connectionStore = await withApprovedCode();
        const result = await exchangeMcpToken(
            { connectionStore, tokenService: fakeTokenService(), clock: fixedClock(), random: sequentialRandom() },
            { grantType: 'authorization_code', code: 'code1', redirectUri: REDIRECT_URI, clientId: 'client1', codeVerifier: VERIFIER },
        );
        expect(result.tokenType).toBe('Bearer');
        expect(result.accessToken).toBeTruthy();
        expect(result.refreshToken).toBeTruthy();

        const connection = await connectionStore.getConnectionById('conn1');
        expect(connection?.isActive).toBe(true);
    });

    it('rejects a code reused a second time', async () => {
        const connectionStore = await withApprovedCode();
        const deps = { connectionStore, tokenService: fakeTokenService(), clock: fixedClock(), random: sequentialRandom() };
        const input = { grantType: 'authorization_code' as const, code: 'code1', redirectUri: REDIRECT_URI, clientId: 'client1', codeVerifier: VERIFIER };
        await exchangeMcpToken(deps, input);
        await expect(exchangeMcpToken(deps, input)).rejects.toThrow(InvalidGrantError);
    });

    it('rejects an expired code', async () => {
        const connectionStore = inMemoryConnectionStore();
        await connectionStore.createAuthorizationRequest({
            code: 'code1', clientId: 'client1', clientName: 'Claude', uid: 'u1', redirectUri: REDIRECT_URI,
            codeChallenge: CHALLENGE, state: 'st', nowSeconds: NOW, ttlSeconds: 1,
        });
        const connection = McpConnection.createPending({ id: 'conn1', uid: 'u1', clientId: 'client1', clientName: 'Claude', nowSeconds: NOW });
        await connectionStore.decideAuthorizationRequest('code1', { approved: true, connection });

        await expect(
            exchangeMcpToken(
                { connectionStore, tokenService: fakeTokenService(), clock: fixedClock(NOW + 1000), random: sequentialRandom() },
                { grantType: 'authorization_code', code: 'code1', redirectUri: REDIRECT_URI, clientId: 'client1', codeVerifier: VERIFIER },
            ),
        ).rejects.toThrow(InvalidGrantError);
    });

    it('rejects a redirect_uri mismatch', async () => {
        const connectionStore = await withApprovedCode();
        await expect(
            exchangeMcpToken(
                { connectionStore, tokenService: fakeTokenService(), clock: fixedClock(), random: sequentialRandom() },
                { grantType: 'authorization_code', code: 'code1', redirectUri: 'https://wrong/callback', clientId: 'client1', codeVerifier: VERIFIER },
            ),
        ).rejects.toThrow(InvalidGrantError);
    });

    it('rejects a PKCE verifier that does not match the stored challenge', async () => {
        const connectionStore = await withApprovedCode();
        await expect(
            exchangeMcpToken(
                { connectionStore, tokenService: fakeTokenService(), clock: fixedClock(), random: sequentialRandom() },
                { grantType: 'authorization_code', code: 'code1', redirectUri: REDIRECT_URI, clientId: 'client1', codeVerifier: 'wrong-verifier' },
            ),
        ).rejects.toThrow(InvalidGrantError);
    });
});

describe('exchangeMcpToken — refresh_token grant', () => {
    it('mints a fresh access token for an active connection and rotates the refresh token', async () => {
        const connectionStore = await withApprovedCode();
        const first = await exchangeMcpToken(
            { connectionStore, tokenService: fakeTokenService(), clock: fixedClock(), random: sequentialRandom() },
            { grantType: 'authorization_code', code: 'code1', redirectUri: REDIRECT_URI, clientId: 'client1', codeVerifier: VERIFIER },
        );
        const refreshed = await exchangeMcpToken(
            { connectionStore, tokenService: fakeTokenService(), clock: fixedClock(NOW + 100), random: sequentialRandom() },
            { grantType: 'refresh_token', refreshToken: first.refreshToken, clientId: 'client1' },
        );
        expect(refreshed.accessToken).toBeTruthy();
        expect(refreshed.refreshToken).not.toBe(first.refreshToken);
    });

    it('fails with invalid_grant for a revoked connection', async () => {
        const connectionStore = await withApprovedCode();
        const first = await exchangeMcpToken(
            { connectionStore, tokenService: fakeTokenService(), clock: fixedClock(), random: sequentialRandom() },
            { grantType: 'authorization_code', code: 'code1', redirectUri: REDIRECT_URI, clientId: 'client1', codeVerifier: VERIFIER },
        );
        const connection = await connectionStore.getConnectionById('conn1');
        await connectionStore.saveConnection(connection!.revoked(NOW + 5));

        await expect(
            exchangeMcpToken(
                { connectionStore, tokenService: fakeTokenService(), clock: fixedClock(NOW + 100), random: sequentialRandom() },
                { grantType: 'refresh_token', refreshToken: first.refreshToken, clientId: 'client1' },
            ),
        ).rejects.toThrow(InvalidGrantError);
    });
});
