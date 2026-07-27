import type { McpConnectionStorePort } from '../../ports/mcp';

export interface ConnectionSummary {
    id: string;
    clientName: string;
    createdAt: number;
    status: 'pending' | 'active' | 'revoked';
}

/** GET /api/mcp/connections (session-cookie-authenticated; contracts/oauth-endpoints.md). */
export async function listConnections(deps: { connectionStore: McpConnectionStorePort }, uid: string): Promise<ConnectionSummary[]> {
    const connections = await deps.connectionStore.listConnectionsForUser(uid);
    return connections.map((c) => ({
        id: c.data.id,
        clientName: c.data.clientName,
        createdAt: c.data.createdAt,
        status: c.data.status,
    }));
}
