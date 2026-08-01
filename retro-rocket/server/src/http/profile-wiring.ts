import { getFirestore } from 'firebase-admin/firestore';
import type { ServerConfig } from '../config/env';
import type { LoggerPort } from '../application/ports/observability';
import type { SessionServicePort } from '../application/ports';
import type { ProfileRouterDeps } from './routes/profile';
import { FirestoreProfileAdapter } from '../adapters/firebase/FirestoreProfileAdapter';
import { FirestoreRetrospectiveBoardAdapter } from '../adapters/firebase/FirestoreRetrospectiveBoardAdapter';
import { SystemClock } from '../adapters/system';

/**
 * Composition glue for the "Mi Perfil" profile feature (018), mirrors boards-wiring.ts.
 * Reuses the same session service as the web session (no new secret introduced). Returns
 * null when the app-session dependency isn't available. Excluded from unit coverage —
 * thin wiring over firebase-admin, exercised by the E2E suite against the emulator.
 */
export function buildProfileDeps(
    _source: NodeJS.ProcessEnv,
    config: ServerConfig,
    logger: LoggerPort,
    sessionService: SessionServicePort | undefined,
): ProfileRouterDeps | null {
    if (!sessionService) {
        logger.warn('profile_disabled', { reason: 'missing the session service' });
        return null;
    }

    const db = getFirestore();

    return {
        profilePort: new FirestoreProfileAdapter(db),
        participantPort: new FirestoreRetrospectiveBoardAdapter(db),
        sessionService,
        clock: new SystemClock(),
        testMode: config.authTestMode,
    };
}
