import type { RequestHandler } from 'express';
import type { ClockPort } from '../../application/ports';
import type { McpConnectionStorePort, McpTokenServicePort } from '../../application/ports/mcp';

export interface McpAuthDeps {
    tokenService: McpTokenServicePort;
    connectionStore: McpConnectionStorePort;
    clock: ClockPort;
}

function unauthorized(res: import('express').Response) {
    const correlationId = typeof res.locals.correlationId === 'string' ? res.locals.correlationId : 'unknown';
    res.status(401).json({ error: { code: 'unauthorized', message: 'Missing, invalid, expired, or revoked access token' }, correlationId });
}

/**
 * Bearer-auth for the /api/mcp transport (FR-005, Clarification 2026-07-27 Q1): verifies
 * the JWT, then performs a LIVE Firestore read of the connection's status before letting
 * any tool call through — a revoked connection is rejected on its very next request, not
 * merely once its token happens to expire.
 */
export function mcpAuthMiddleware(deps: McpAuthDeps): RequestHandler {
    return (req, res, next) => {
        const header = req.header('authorization');
        const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
        if (!token) return unauthorized(res);

        const now = deps.clock.nowSeconds();
        deps.tokenService
            .verify(token, now)
            .then(async (claims) => {
                if (!claims) return unauthorized(res);
                const connection = await deps.connectionStore.getConnectionById(claims.connectionId);
                if (!connection || !connection.isActive || connection.data.uid !== claims.sub) {
                    return unauthorized(res);
                }
                await deps.connectionStore.saveConnection(connection.touched(now));
                res.locals.mcpAuth = claims;
                next();
            })
            .catch(next);
    };
}
