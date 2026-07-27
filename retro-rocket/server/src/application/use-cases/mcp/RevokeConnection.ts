import type { ClockPort } from '../../ports';
import type { McpConnectionStorePort } from '../../ports/mcp';

export type RevokeConnectionResult = 'revoked' | 'not_found';

/**
 * DELETE /api/mcp/connections/:id (contracts/oauth-endpoints.md). Ownership mismatches
 * are reported as 'not_found' (not 'forbidden') so a caller can't learn that a connection
 * id belongs to someone else. Idempotent: revoking an already-revoked connection still
 * returns 'revoked' (McpConnection.revoked is itself idempotent).
 */
export async function revokeConnection(
    deps: { connectionStore: McpConnectionStorePort; clock: ClockPort },
    params: { connectionId: string; uid: string },
): Promise<RevokeConnectionResult> {
    const connection = await deps.connectionStore.getConnectionById(params.connectionId);
    if (!connection || connection.data.uid !== params.uid) return 'not_found';

    const revoked = connection.revoked(deps.clock.nowSeconds());
    await deps.connectionStore.saveConnection(revoked);
    return 'revoked';
}
