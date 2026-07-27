import { createHash } from 'node:crypto';
import type { ClockPort, RandomPort } from '../../ports';
import type { McpConnectionStorePort, McpTokenServicePort } from '../../ports/mcp';
import { McpConnection, type McpConnectionData } from '../../../domain/mcp/McpConnection';
import { AppError } from '../../../domain/errors';

export const MCP_ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

export class InvalidGrantError extends AppError {
    constructor(message = 'The grant is invalid, expired, or already used') {
        super('invalid_grant', message, 400);
        this.name = 'InvalidGrantError';
    }
}

function hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
    return createHash('sha256').update(codeVerifier).digest('base64url') === codeChallenge;
}

export interface ExchangeMcpTokenDeps {
    connectionStore: McpConnectionStorePort;
    tokenService: McpTokenServicePort;
    clock: ClockPort;
    random: RandomPort;
}

export type ExchangeMcpTokenInput =
    | { grantType: 'authorization_code'; code: string; redirectUri: string; clientId: string; codeVerifier: string }
    | { grantType: 'refresh_token'; refreshToken: string; clientId: string };

export interface ExchangeMcpTokenResult {
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    refreshToken: string;
}

/** POST /api/mcp/token (contracts/oauth-endpoints.md) — both grant types. */
export async function exchangeMcpToken(deps: ExchangeMcpTokenDeps, input: ExchangeMcpTokenInput): Promise<ExchangeMcpTokenResult> {
    const now = deps.clock.nowSeconds();

    if (input.grantType === 'authorization_code') {
        const record = await deps.connectionStore.consumeAuthorizationCode(input.code, now);
        if (!record) throw new InvalidGrantError();
        if (record.clientId !== input.clientId || record.redirectUri !== input.redirectUri) throw new InvalidGrantError();
        if (!verifyPkce(input.codeVerifier, record.codeChallenge)) throw new InvalidGrantError();
        if (!record.connectionId) throw new InvalidGrantError();

        const connection = await deps.connectionStore.getConnectionById(record.connectionId);
        if (!connection) throw new InvalidGrantError();

        const refreshToken = deps.random.sessionId();
        const activated = connection.activated(hashRefreshToken(refreshToken));
        await deps.connectionStore.saveConnection(activated);

        const accessToken = await deps.tokenService.issue(
            { sub: activated.data.uid, connectionId: activated.data.id, clientId: activated.data.clientId },
            now,
            MCP_ACCESS_TOKEN_TTL_SECONDS,
        );
        return { accessToken, tokenType: 'Bearer', expiresIn: MCP_ACCESS_TOKEN_TTL_SECONDS, refreshToken };
    }

    // grantType === 'refresh_token'
    const hashed = hashRefreshToken(input.refreshToken);
    const connection = await deps.connectionStore.getConnectionByRefreshTokenHash(hashed);
    if (!connection || !connection.isActive || connection.data.clientId !== input.clientId) throw new InvalidGrantError();

    const newRefreshToken = deps.random.sessionId();
    const rotated = new McpConnection({ ...connection.data, refreshTokenHash: hashRefreshToken(newRefreshToken) } as McpConnectionData);
    await deps.connectionStore.saveConnection(rotated);

    const accessToken = await deps.tokenService.issue(
        { sub: rotated.data.uid, connectionId: rotated.data.id, clientId: rotated.data.clientId },
        now,
        MCP_ACCESS_TOKEN_TTL_SECONDS,
    );
    return { accessToken, tokenType: 'Bearer', expiresIn: MCP_ACCESS_TOKEN_TTL_SECONDS, refreshToken: newRefreshToken };
}
