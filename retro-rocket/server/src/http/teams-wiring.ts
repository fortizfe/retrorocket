import { getFirestore } from 'firebase-admin/firestore';
import type { ServerConfig } from '../config/env';
import type { LoggerPort } from '../application/ports/observability';
import type { SessionServicePort } from '../application/ports';
import type { TeamsRouterDeps } from './routes/teams';
import { FirestoreTeamsAdapter } from '../adapters/firebase/FirestoreTeamsAdapter';
import { FirestoreTeamMetricsAdapter } from '../adapters/firebase/FirestoreTeamMetricsAdapter';
import { FirestoreProfileAdapter } from '../adapters/firebase/FirestoreProfileAdapter';
import { SystemClock } from '../adapters/system';

/**
 * Composition glue for the Team Management feature (054), mirrors boards-wiring.ts.
 * Reuses the same session service as the web session (no new secret introduced).
 * Returns null when the app-session dependency isn't available. Excluded from unit
 * coverage — thin wiring over firebase-admin, exercised by the E2E suite against the
 * emulator.
 */
export function buildTeamsDeps(
    _source: NodeJS.ProcessEnv,
    config: ServerConfig,
    logger: LoggerPort,
    sessionService: SessionServicePort | undefined,
): TeamsRouterDeps | null {
    if (!sessionService) {
        logger.warn('teams_disabled', { reason: 'missing the session service' });
        return null;
    }

    const db = getFirestore();

    return {
        teamsPort: new FirestoreTeamsAdapter(db),
        profilePort: new FirestoreProfileAdapter(db),
        teamMetricsPort: new FirestoreTeamMetricsAdapter(db),
        sessionService,
        clock: new SystemClock(),
        testMode: config.authTestMode,
    };
}
