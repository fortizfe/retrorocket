import { getFirestore } from 'firebase-admin/firestore';
import type { ServerConfig } from '../config/env';
import type { LoggerPort, MetricsPort } from '../application/ports/observability';
import type { SessionServicePort } from '../application/ports';
import type { McpRouterDeps } from './routes/mcp';
import { JoseMcpTokenAdapter } from '../adapters/session/JoseMcpTokenAdapter';
import { FirestoreMcpConnectionAdapter } from '../adapters/firebase/FirestoreMcpConnectionAdapter';
import { FirestoreRetrospectiveReadAdapter } from '../adapters/firebase/FirestoreRetrospectiveReadAdapter';
import { SystemClock, SystemRandom } from '../adapters/system';
import { InMemoryTtlCache } from '../adapters/cache/InMemoryTtlCache';
import type { McpConnection } from '../domain/mcp/McpConnection';
import type { CachedDetailFanOut } from '../application/use-cases/mcp/GetRetrospectiveDetail';
import type { CachedSummaryFanOut } from '../application/use-cases/mcp/GetRetrospectiveSummary';

/**
 * Composition glue for the MCP connector (mirrors auth-wiring.ts): resolves env,
 * initializes the Firestore Admin SDK, and wires ports to adapters. Reuses the same
 * SESSION_SIGNING_KEY as the web session (research.md §3 — same precedent as
 * JoseSessionAdapter/JoseOAuthStateCodec already sharing that secret) so no new
 * required secret is introduced. Returns null when the app-session dependency (needed
 * for the authorize/consent hand-off) isn't available. Excluded from unit coverage —
 * thin wiring over firebase-admin, exercised by the E2E suite against the emulator.
 */
export function buildMcpDeps(
    source: NodeJS.ProcessEnv,
    _config: ServerConfig,
    logger: LoggerPort,
    sessionService: SessionServicePort | undefined,
    metrics: MetricsPort,
): McpRouterDeps | null {
    const signingKey = source.SESSION_SIGNING_KEY;
    const baseUrl = source.MCP_PUBLIC_BASE_URL ?? source.OAUTH_REDIRECT_BASE_URL;

    if (!signingKey || !baseUrl || !sessionService) {
        logger.warn('mcp_disabled', { reason: 'missing SESSION_SIGNING_KEY, a base URL, or the session service' });
        return null;
    }

    const db = getFirestore();

    return {
        clientStore: new FirestoreMcpConnectionAdapter(db),
        connectionStore: new FirestoreMcpConnectionAdapter(db),
        tokenService: new JoseMcpTokenAdapter(signingKey),
        retrospectiveReadPort: new FirestoreRetrospectiveReadAdapter(db),
        sessionService,
        clock: new SystemClock(),
        random: new SystemRandom(),
        metrics,
        baseUrl,
        signInRedirect: '/',
        consentRedirect: '/mcp/consent',
        // 041, FR-001: one cache instance shared by mcpAuthMiddleware (populates/reads
        // it) and the DELETE /api/mcp/connections/:id route's revokeConnection() call
        // (evicts it on revoke) — both wired to the same instance here so a revoke is
        // enforced on this instance's very next request, not just after the TTL elapses.
        connectionAuthCache: new InMemoryTtlCache<string, McpConnection>(),
        // 041, FR-008/Story 3: one instance per app, shared across every /api/mcp
        // request this instance serves — see GetRetrospectiveDetail.ts's docstring.
        detailFanOutCache: new InMemoryTtlCache<string, CachedDetailFanOut>(),
        summaryFanOutCache: new InMemoryTtlCache<string, CachedSummaryFanOut>(),
    };
}
