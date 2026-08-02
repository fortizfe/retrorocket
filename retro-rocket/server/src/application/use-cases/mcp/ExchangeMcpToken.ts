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

/**
 * Marks the connection tied to a failed authorization_code exchange as `failed` (024,
 * FR-008a's explicit-signal path) — a no-op if the connection is missing, or is anything
 * other than `pending` (e.g. already `active` from an earlier, genuinely successful
 * exchange of the same code being replayed: `McpConnection.failed()` correctly leaves a
 * working connection alone rather than retroactively breaking it).
 */
async function markConnectionFailed(
    deps: { connectionStore: McpConnectionStorePort },
    connectionId: string | null,
    now: number,
): Promise<void> {
    if (!connectionId) return;
    const connection = await deps.connectionStore.getConnectionById(connectionId);
    if (!connection) return;
    await deps.connectionStore.saveConnection(connection.failed(now));
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
        if (!record) {
            // consumeAuthorizationCode only reports null/not-consumable, not why — look up
            // the raw record for a specific, diagnosable message (research.md §3) and to
            // resolve a connectionId even though it was never returned to us above.
            const raw = await deps.connectionStore.getAuthorizationRequest(input.code);
            await markConnectionFailed(deps, raw?.connectionId ?? null, now);
            if (!raw) throw new InvalidGrantError('Authorization code is unknown');
            if (raw.approved !== true) throw new InvalidGrantError('Authorization was denied or has not been completed yet');
            if (raw.consumedAt !== null) throw new InvalidGrantError('Authorization code has already been used');
            throw new InvalidGrantError('Authorization code has expired');
        }
        if (record.clientId !== input.clientId || record.redirectUri !== input.redirectUri) {
            await markConnectionFailed(deps, record.connectionId, now);
            throw new InvalidGrantError('client_id or redirect_uri does not match the original authorization request');
        }
        if (!verifyPkce(input.codeVerifier, record.codeChallenge)) {
            await markConnectionFailed(deps, record.connectionId, now);
            throw new InvalidGrantError('code_verifier does not match the original code_challenge');
        }
        if (!record.connectionId) throw new InvalidGrantError('Authorization has no associated connection to activate');

        const connection = await deps.connectionStore.getConnectionById(record.connectionId);
        if (!connection) throw new InvalidGrantError('The connection record for this authorization could not be found');

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
