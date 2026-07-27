import { getFirestore } from 'firebase-admin/firestore';
import type { ServerConfig } from '../config/env';
import type { LoggerPort } from '../application/ports/observability';
import type { SessionServicePort } from '../application/ports';
import type { McpRouterDeps } from './routes/mcp';
import { JoseMcpTokenAdapter } from '../adapters/session/JoseMcpTokenAdapter';
import { FirestoreMcpConnectionAdapter } from '../adapters/firebase/FirestoreMcpConnectionAdapter';
import { FirestoreRetrospectiveReadAdapter } from '../adapters/firebase/FirestoreRetrospectiveReadAdapter';
import { SystemClock, SystemRandom } from '../adapters/system';

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
        baseUrl,
        signInRedirect: '/',
        consentRedirect: '/mcp/consent',
    };
}
