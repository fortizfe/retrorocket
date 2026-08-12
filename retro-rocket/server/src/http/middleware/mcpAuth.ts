import type { RequestHandler, Request, Response } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';
import type { ClockPort } from '../../application/ports';
import type { McpConnection } from '../../domain/mcp/McpConnection';
import type { McpConnectionStorePort, McpTokenServicePort } from '../../application/ports/mcp';
import { InMemoryTtlCache } from '../../adapters/cache/InMemoryTtlCache';

export interface McpAuthDeps {
    tokenService: McpTokenServicePort;
    connectionStore: McpConnectionStorePort;
    clock: ClockPort;
    /** 041, FR-001: short-lived per-instance cache avoiding a live getConnectionById()
     * read (plus the touched()/saveConnection() write) on every single tool call for a
     * recently-confirmed-active connection. One instance per app/composition-root —
     * constructed once in mcp-wiring.ts/mcpTestApp.ts, NOT module-level, so independent
     * apps (and independent tests) never leak cache state into each other. */
    connectionAuthCache: InMemoryTtlCache<string, McpConnection>;
}

/** 041, FR-001: upper bound of the 5-10s window agreed in Clarifications (research.md
 * §1) — the upper bound is used deliberately, to maximize the read reduction while
 * staying within the agreed limit. */
export const MCP_CONNECTION_AUTH_CACHE_TTL_MS = 10_000;

/** 041, FR-002 (Clarifications): a fixed 30s window — resets exactly 30s after the
 * first failure for a key, not a true sliding window (research.md §2's "Window
 * algorithm"). Once a key accumulates MCP_AUTH_BACKOFF_THRESHOLD failures inside one
 * window, it is rejected for MCP_AUTH_BACKOFF_DURATION_MS. */
export const MCP_AUTH_BACKOFF_WINDOW_MS = 30_000;
export const MCP_AUTH_BACKOFF_THRESHOLD = 5;
export const MCP_AUTH_BACKOFF_DURATION_MS = 30_000;

function unauthorized(res: Response) {
    const correlationId = typeof res.locals.correlationId === 'string' ? res.locals.correlationId : 'unknown';
    res.status(401).json({ error: { code: 'unauthorized', message: 'Missing, invalid, expired, or revoked access token' }, correlationId });
}

/** 041, contracts/mcp-backoff-response.md. */
function authBackoff(res: Response, retryAfterMs: number) {
    const correlationId = typeof res.locals.correlationId === 'string' ? res.locals.correlationId : 'unknown';
    res.status(429)
        .set('Retry-After', String(Math.max(0, Math.ceil(retryAfterMs / 1000))))
        .json({
            error: { code: 'auth_backoff', message: 'Too many failed authorization attempts — please wait before retrying.' },
            correlationId,
        });
}

export interface AuthBackoffState {
    count: number;
    windowStart: number;
    backoffUntil: number | null;
}

/**
 * Pure decision logic (041, research.md §2) — exported for direct unit testing,
 * mirroring FirestoreRealtimeGatewayAdapter.ts's toOp/computeSweepDelayMs pattern. All
 * timestamps are real wall-clock milliseconds (Date.now()-based), independent of the
 * domain ClockPort — consistent with InMemoryTtlCache's own default clock and every
 * other TTL cache in this codebase (FirestoreProfileAdapter's profile cache, feature
 * 040), since this is cache-freshness bookkeeping, not domain-modeled time.
 */
export function recordAuthFailure(existing: AuthBackoffState | undefined, now: number): AuthBackoffState {
    if (isBackedOff(existing, now)) return existing!;
    const sameWindow = existing !== undefined && now < existing.windowStart + MCP_AUTH_BACKOFF_WINDOW_MS;
    const windowStart = sameWindow ? existing!.windowStart : now;
    const count = (sameWindow ? existing!.count : 0) + 1;
    const backoffUntil = count >= MCP_AUTH_BACKOFF_THRESHOLD ? now + MCP_AUTH_BACKOFF_DURATION_MS : null;
    return { count, windowStart, backoffUntil };
}

/** Pure predicate (041, research.md §2). */
export function isBackedOff(state: AuthBackoffState | undefined, now: number): boolean {
    return state?.backoffUntil != null && now < state.backoffUntil;
}

function ttlMsFor(state: AuthBackoffState, now: number): number {
    const deadline = state.backoffUntil ?? state.windowStart + MCP_AUTH_BACKOFF_WINDOW_MS;
    return Math.max(1, deadline - now);
}

function resolveIpKey(req: Request): string {
    return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
}

/**
 * Bearer-auth for the /api/mcp transport (FR-005, Clarification 2026-07-27 Q1): verifies
 * the JWT, then performs a LIVE Firestore read of the connection's status before letting
 * any tool call through — a revoked connection is rejected on its very next request, not
 * merely once its token happens to expire. 041 additions: FR-001 skips the live read (and
 * its accompanying touched()/saveConnection() write) on a recent cache hit; FR-002 backs
 * off a key (client_id when resolvable — i.e. once a token verifies but is otherwise
 * rejected — else origin IP) that has accumulated repeated failures, rejecting further
 * attempts immediately without verifying a token or reading Firestore.
 */
export function mcpAuthMiddleware(deps: McpAuthDeps): RequestHandler {
    // Per-middleware-instance (i.e. per app/composition-root), not module-level — same
    // scoping rationale as connectionAuthCache above; prevents test pollution across
    // independently-built apps/tests that would otherwise share failure counts.
    const backoffState = new InMemoryTtlCache<string, AuthBackoffState>();

    function recordFailureAndReject(res: Response, key: string, now: number): void {
        const next = recordAuthFailure(backoffState.get(key), now);
        backoffState.set(key, next, ttlMsFor(next, now));
        unauthorized(res);
    }

    return (req, res, next) => {
        const now = Date.now();
        const ipKey = resolveIpKey(req);

        function ipBackedOffOrRecordFailure(): boolean {
            const ipState = backoffState.get(ipKey);
            if (isBackedOff(ipState, now)) {
                authBackoff(res, ipState!.backoffUntil! - now);
                return true;
            }
            recordFailureAndReject(res, ipKey, now);
            return true;
        }

        const header = req.header('authorization');
        const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
        // A missing/malformed token can never succeed, so it's cheapest to apply the
        // IP-keyed backoff here, before any verification attempt (research.md §2 — the
        // common case for the incident's garbage-token traffic). A token that *does*
        // verify below is never subject to this IP-keyed check, even if the same IP has
        // recent failures — otherwise one bad client would collaterally block every
        // other, genuinely valid, request sharing its network origin.
        if (!token) return ipBackedOffOrRecordFailure();

        const nowSeconds = deps.clock.nowSeconds();
        deps.tokenService
            .verify(token, nowSeconds)
            .then(async (claims) => {
                if (!claims) return ipBackedOffOrRecordFailure();

                const clientKey = `client_id:${claims.clientId}`;
                const clientState = backoffState.get(clientKey);
                if (isBackedOff(clientState, now)) return authBackoff(res, clientState!.backoffUntil! - now);

                const cached = deps.connectionAuthCache.get(claims.connectionId);
                if (cached) {
                    res.locals.mcpAuth = claims;
                    return next();
                }

                const connection = await deps.connectionStore.getConnectionById(claims.connectionId);
                if (!connection || !connection.isActive || connection.data.uid !== claims.sub) {
                    return recordFailureAndReject(res, clientKey, now);
                }
                await deps.connectionStore.saveConnection(connection.touched(nowSeconds));
                deps.connectionAuthCache.set(claims.connectionId, connection, MCP_CONNECTION_AUTH_CACHE_TTL_MS);
                res.locals.mcpAuth = claims;
                next();
            })
            .catch(next);
    };
}
