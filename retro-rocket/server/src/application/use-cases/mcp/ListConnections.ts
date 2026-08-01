import type { McpConnectionStorePort } from '../../ports/mcp';
import type { ConnectionOrigin } from '../../../domain/mcp/ConnectionOrigin';

export interface ConnectionSummary {
    id: string;
    clientName: string;
    createdAt: number;
    status: 'pending' | 'active';
    origin: ConnectionOrigin;
    lastUsedAt: number | null;
}

/** GET /api/mcp/connections (session-cookie-authenticated; contracts/oauth-endpoints.md). */
export async function listConnections(deps: { connectionStore: McpConnectionStorePort }, uid: string): Promise<ConnectionSummary[]> {
    const connections = await deps.connectionStore.listConnectionsForUser(uid);
    return connections
        .filter((c) => c.data.status !== 'revoked')
        .map((c) => ({
            id: c.data.id,
            clientName: c.data.clientName,
            createdAt: c.data.createdAt,
            status: c.data.status as 'pending' | 'active',
            origin: c.data.origin,
            lastUsedAt: c.data.lastUsedAt,
        }));
}
