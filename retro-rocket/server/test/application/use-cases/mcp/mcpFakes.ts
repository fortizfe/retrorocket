import { vi } from 'vitest';
import type { ClockPort, RandomPort, SessionServicePort } from '../../../../src/application/ports';
import type {
    CreateAuthorizationRequestParams,
    McpAccessTokenClaims,
    McpAuthorizationCodeRecord,
    McpClientStorePort,
    McpConnectionStorePort,
    McpTokenServicePort,
} from '../../../../src/application/ports/mcp';
import { McpClientRegistration } from '../../../../src/domain/mcp/McpClientRegistration';
import { McpConnection } from '../../../../src/domain/mcp/McpConnection';

export const NOW = 1_700_000_000;

export function fixedClock(now = NOW): ClockPort {
    return { nowSeconds: () => now };
}

let counter = 0;
export function sequentialRandom(): RandomPort {
    return {
        state: () => `rand-${++counter}`,
        codeVerifier: () => `verifier-${++counter}`,
        sessionId: () => `id-${++counter}`,
    };
}

export function inMemoryClientStore(clients: McpClientRegistration[] = []): McpClientStorePort {
    const byId = new Map(clients.map((c) => [c.data.clientId, c]));
    return {
        register: async (client) => {
            byId.set(client.data.clientId, client);
        },
        getById: async (clientId) => byId.get(clientId) ?? null,
    };
}

export function inMemoryConnectionStore(): McpConnectionStorePort {
    const codes = new Map<string, McpAuthorizationCodeRecord>();
    const connections = new Map<string, McpConnection>();
    return {
        createAuthorizationRequest: async (params: CreateAuthorizationRequestParams) => {
            codes.set(params.code, {
                code: params.code,
                clientId: params.clientId,
                clientName: params.clientName,
                uid: params.uid,
                redirectUri: params.redirectUri,
                codeChallenge: params.codeChallenge,
                state: params.state,
                connectionId: null,
                approved: null,
                expiresAt: params.nowSeconds + params.ttlSeconds,
                consumedAt: null,
            });
        },
        getAuthorizationRequest: async (code) => codes.get(code) ?? null,
        decideAuthorizationRequest: async (code, decision) => {
            const record = codes.get(code);
            if (!record) return;
            record.approved = decision.approved;
            record.connectionId = decision.connection?.data.id ?? null;
            if (decision.approved && decision.connection) connections.set(decision.connection.data.id, decision.connection);
        },
        consumeAuthorizationCode: async (code, now) => {
            const record = codes.get(code);
            if (!record || record.approved !== true || record.consumedAt !== null || record.expiresAt < now) return null;
            record.consumedAt = now;
            return { ...record };
        },
        getConnectionById: async (id) => connections.get(id) ?? null,
        getConnectionByRefreshTokenHash: async (hash) =>
            [...connections.values()].find((c) => c.data.refreshTokenHash === hash) ?? null,
        saveConnection: async (connection) => {
            connections.set(connection.data.id, connection);
        },
        listConnectionsForUser: async (uid) => [...connections.values()].filter((c) => c.data.uid === uid),
    };
}

export function fakeTokenService(): McpTokenServicePort {
    return {
        issue: vi.fn(async (claims: McpAccessTokenClaims) => `token:${JSON.stringify(claims)}`),
        verify: vi.fn(async (token: string) => {
            if (!token.startsWith('token:')) return null;
            try {
                return JSON.parse(token.slice('token:'.length));
            } catch {
                return null;
            }
        }),
    };
}

/**
 * Generic fake: any token of the form "session-<uid>" verifies as a session for <uid>.
 * The optional `uid` param is a convenience default for call sites that only ever need
 * one signed-in user; passing a different "session-<other>" token still works.
 */
export function fakeSessionServiceFor(uid?: string): SessionServicePort {
    void uid;
    return {
        issue: vi.fn(),
        verify: vi.fn(async (token: string) => {
            if (!token.startsWith('session-')) return null;
            return { data: { sub: token.slice('session-'.length) } } as never;
        }),
        refresh: vi.fn(),
    };
}
