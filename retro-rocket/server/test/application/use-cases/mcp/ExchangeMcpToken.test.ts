import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { exchangeMcpToken } from '../../../../src/application/use-cases/mcp/ExchangeMcpToken';
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

    it('rejects a code reused a second time, with a message distinguishing it from other invalid_grant causes, and leaves the (already active) connection untouched', async () => {
        const connectionStore = await withApprovedCode();
        const deps = { connectionStore, tokenService: fakeTokenService(), clock: fixedClock(), random: sequentialRandom() };
        const input = { grantType: 'authorization_code' as const, code: 'code1', redirectUri: REDIRECT_URI, clientId: 'client1', codeVerifier: VERIFIER };
        await exchangeMcpToken(deps, input);
        await expect(exchangeMcpToken(deps, input)).rejects.toThrow('Authorization code has already been used');

        // 024, research.md §3: replaying an already-consumed code must not retroactively
        // break the connection that code's *first, genuinely successful* exchange activated.
        const connection = await connectionStore.getConnectionById('conn1');
        expect(connection?.data.status).toBe('active');
    });

    it('rejects an expired code, with a message distinct from a reused one, and marks the never-activated connection failed (024, FR-008a)', async () => {
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
        ).rejects.toThrow('Authorization code has expired');

        const failed = await connectionStore.getConnectionById('conn1');
        expect(failed?.data.status).toBe('failed');
        expect(failed?.data.failedAt).toBe(NOW + 1000);
    });

    it('rejects a redirect_uri mismatch, with a distinct message, and marks the connection failed (024, FR-008a)', async () => {
        const connectionStore = await withApprovedCode();
        await expect(
            exchangeMcpToken(
                { connectionStore, tokenService: fakeTokenService(), clock: fixedClock(), random: sequentialRandom() },
                { grantType: 'authorization_code', code: 'code1', redirectUri: 'https://wrong/callback', clientId: 'client1', codeVerifier: VERIFIER },
            ),
        ).rejects.toThrow('client_id or redirect_uri does not match the original authorization request');

        const failed = await connectionStore.getConnectionById('conn1');
        expect(failed?.data.status).toBe('failed');
        expect(failed?.data.failedAt).toBe(NOW);
    });

    it('rejects a PKCE verifier that does not match the stored challenge, with a distinct message, and marks the connection failed (024, FR-008a)', async () => {
        const connectionStore = await withApprovedCode();
        await expect(
            exchangeMcpToken(
                { connectionStore, tokenService: fakeTokenService(), clock: fixedClock(), random: sequentialRandom() },
                { grantType: 'authorization_code', code: 'code1', redirectUri: REDIRECT_URI, clientId: 'client1', codeVerifier: 'wrong-verifier' },
            ),
        ).rejects.toThrow('code_verifier does not match the original code_challenge');

        const failed = await connectionStore.getConnectionById('conn1');
        expect(failed?.data.status).toBe('failed');
        expect(failed?.data.failedAt).toBe(NOW);
    });

    it('gives each of the four authorization_code failure conditions a distinct message (024, research.md §3)', async () => {
        const messages = new Set<string>();

        const reusedStore = await withApprovedCode();
        const reusedDeps = { connectionStore: reusedStore, tokenService: fakeTokenService(), clock: fixedClock(), random: sequentialRandom() };
        const reusedInput = { grantType: 'authorization_code' as const, code: 'code1', redirectUri: REDIRECT_URI, clientId: 'client1', codeVerifier: VERIFIER };
        await exchangeMcpToken(reusedDeps, reusedInput);
        try {
            await exchangeMcpToken(reusedDeps, reusedInput);
        } catch (err) {
            messages.add((err as Error).message);
        }

        const expiredStore = inMemoryConnectionStore();
        await expiredStore.createAuthorizationRequest({
            code: 'code2', clientId: 'client1', clientName: 'Claude', uid: 'u1', redirectUri: REDIRECT_URI,
            codeChallenge: CHALLENGE, state: 'st', nowSeconds: NOW, ttlSeconds: 1,
        });
        await expiredStore.decideAuthorizationRequest('code2', {
            approved: true,
            connection: McpConnection.createPending({ id: 'conn2', uid: 'u1', clientId: 'client1', clientName: 'Claude', nowSeconds: NOW }),
        });
        try {
            await exchangeMcpToken(
                { connectionStore: expiredStore, tokenService: fakeTokenService(), clock: fixedClock(NOW + 1000), random: sequentialRandom() },
                { grantType: 'authorization_code', code: 'code2', redirectUri: REDIRECT_URI, clientId: 'client1', codeVerifier: VERIFIER },
            );
        } catch (err) {
            messages.add((err as Error).message);
        }

        const mismatchStore = await withApprovedCode(inMemoryConnectionStore());
        try {
            await exchangeMcpToken(
                { connectionStore: mismatchStore, tokenService: fakeTokenService(), clock: fixedClock(), random: sequentialRandom() },
                { grantType: 'authorization_code', code: 'code1', redirectUri: 'https://wrong/callback', clientId: 'client1', codeVerifier: VERIFIER },
            );
        } catch (err) {
            messages.add((err as Error).message);
        }

        const pkceStore = await withApprovedCode(inMemoryConnectionStore());
        try {
            await exchangeMcpToken(
                { connectionStore: pkceStore, tokenService: fakeTokenService(), clock: fixedClock(), random: sequentialRandom() },
                { grantType: 'authorization_code', code: 'code1', redirectUri: REDIRECT_URI, clientId: 'client1', codeVerifier: 'wrong-verifier' },
            );
        } catch (err) {
            messages.add((err as Error).message);
        }

        expect(messages.size).toBe(4);
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

    it('fails with a distinct, non-generic message for a revoked connection — not the old generic "expired" wording that made a stale reconnect look like an expiry (bug: revoking once blocked reconnecting)', async () => {
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
        ).rejects.toThrow('This connection has been revoked');
    });

    it('fails with a distinct message for an unknown/already-rotated refresh token', async () => {
        const connectionStore = inMemoryConnectionStore();
        await expect(
            exchangeMcpToken(
                { connectionStore, tokenService: fakeTokenService(), clock: fixedClock(), random: sequentialRandom() },
                { grantType: 'refresh_token', refreshToken: 'never-issued', clientId: 'client1' },
            ),
        ).rejects.toThrow('Refresh token is unknown');
    });

    it('fails with a distinct message for a client_id mismatch', async () => {
        const connectionStore = await withApprovedCode();
        const first = await exchangeMcpToken(
            { connectionStore, tokenService: fakeTokenService(), clock: fixedClock(), random: sequentialRandom() },
            { grantType: 'authorization_code', code: 'code1', redirectUri: REDIRECT_URI, clientId: 'client1', codeVerifier: VERIFIER },
        );
        await expect(
            exchangeMcpToken(
                { connectionStore, tokenService: fakeTokenService(), clock: fixedClock(NOW + 100), random: sequentialRandom() },
                { grantType: 'refresh_token', refreshToken: first.refreshToken, clientId: 'someone-elses-client' },
            ),
        ).rejects.toThrow('client_id does not match');
    });
});
