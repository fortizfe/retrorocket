import { getFirestore } from 'firebase-admin/firestore';
import type { ServerConfig } from '../config/env';
import type { LoggerPort } from '../application/ports/observability';
import type { SessionServicePort } from '../application/ports';
import type { BoardsRouterDeps } from './routes/boards';
import { FirestoreBoardsAdapter } from '../adapters/firebase/FirestoreBoardsAdapter';
import { SystemClock } from '../adapters/system';

/**
 * Composition glue for the Dashboard boards feature (017), mirrors mcp-wiring.ts. Reuses
 * the same session service as the web session (no new secret introduced). Returns null
 * when the app-session dependency isn't available. Excluded from unit coverage — thin
 * wiring over firebase-admin, exercised by the E2E suite against the emulator.
 */
export function buildBoardsDeps(
    _source: NodeJS.ProcessEnv,
    _config: ServerConfig,
    logger: LoggerPort,
    sessionService: SessionServicePort | undefined,
): BoardsRouterDeps | null {
    if (!sessionService) {
        logger.warn('boards_disabled', { reason: 'missing the session service' });
        return null;
    }

    const db = getFirestore();

    return {
        boardsPort: new FirestoreBoardsAdapter(db),
        sessionService,
        clock: new SystemClock(),
    };
}
