import type { ClockPort } from '../../ports';
import type { McpConnectionStorePort } from '../../ports/mcp';
import type { ConnectionOrigin } from '../../../domain/mcp/ConnectionOrigin';
import { MCP_AUTHORIZATION_REQUEST_TTL_SECONDS } from './AuthorizeMcpConnection';

export interface ConnectionSummary {
    id: string;
    clientName: string;
    createdAt: number;
    status: 'active';
    origin: ConnectionOrigin;
    lastUsedAt: number | null;
}

/**
 * GET /api/mcp/connections (session-cookie-authenticated; contracts/oauth-endpoints.md).
 * Only fully-completed (`active`) connections are ever returned (024, FR-001/FR-002) — a
 * `pending` connection whose authorization code has definitively expired
 * (`MCP_AUTHORIZATION_REQUEST_TTL_SECONDS` past `createdAt`, the same deadline the code
 * itself is bound by) can never still be activated, so it is lazily transitioned to
 * `failed` and persisted here before being excluded. This also migrates any already-stuck
 * `pending` records from before this fix shipped (FR-009), with no separate backfill.
 */
export async function listConnections(
    deps: { connectionStore: McpConnectionStorePort; clock: ClockPort },
    uid: string,
): Promise<ConnectionSummary[]> {
    const connections = await deps.connectionStore.listConnectionsForUser(uid);
    const now = deps.clock.nowSeconds();

    const settled = await Promise.all(
        connections.map(async (c) => {
            if (c.data.status === 'pending' && now - c.data.createdAt > MCP_AUTHORIZATION_REQUEST_TTL_SECONDS) {
                const failed = c.failed(now);
                await deps.connectionStore.saveConnection(failed);
                return failed;
            }
            return c;
        }),
    );

    return settled
        .filter((c) => c.data.status === 'active')
        .map((c) => ({
            id: c.data.id,
            clientName: c.data.clientName,
            createdAt: c.data.createdAt,
            status: 'active' as const,
            origin: c.data.origin,
            lastUsedAt: c.data.lastUsedAt,
        }));
}
