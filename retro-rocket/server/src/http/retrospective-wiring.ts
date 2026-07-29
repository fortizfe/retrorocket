import { getFirestore } from 'firebase-admin/firestore';
import type { ServerConfig } from '../config/env';
import type { LoggerPort } from '../application/ports/observability';
import type { SessionServicePort } from '../application/ports';
import type { RealtimeGatewayPort } from '../application/ports/realtime';
import type { RetrospectiveRouterDeps } from './routes/retrospectives';
import { FirestoreRetrospectiveBoardAdapter } from '../adapters/firebase/FirestoreRetrospectiveBoardAdapter';
import { FirestoreCardAdapter } from '../adapters/firebase/FirestoreCardAdapter';
import { FirestoreCardGroupAdapter } from '../adapters/firebase/FirestoreCardGroupAdapter';
import { FirestoreActionItemAdapter } from '../adapters/firebase/FirestoreActionItemAdapter';
import { FirestoreFacilitatorNoteAdapter } from '../adapters/firebase/FirestoreFacilitatorNoteAdapter';
import { FirestoreSentimentResultAdapter } from '../adapters/firebase/FirestoreSentimentResultAdapter';
import { FirestoreTypingStatusAdapter } from '../adapters/firebase/FirestoreTypingStatusAdapter';
import { FirestoreRealtimeGatewayAdapter } from '../adapters/firebase/FirestoreRealtimeGatewayAdapter';
import { SystemClock } from '../adapters/system';

/** Superset of RetrospectiveRouterDeps consumed by both the REST router and the
 * WebSocket upgrade handler (attachRealtimeUpgrade), so one wiring call serves both. */
export interface RetrospectiveDeps extends RetrospectiveRouterDeps {
    realtimeGateway: RealtimeGatewayPort;
}

/**
 * Composition glue for the retrospective board screen (feature 019), mirrors
 * boards-wiring.ts/profile-wiring.ts. Reuses the same session service as the web
 * session (no new secret introduced). Returns null when the app-session dependency
 * isn't available. Excluded from unit coverage — thin wiring over firebase-admin,
 * exercised by the E2E suite against the emulator.
 */
export function buildRetrospectiveDeps(
    _source: NodeJS.ProcessEnv,
    config: ServerConfig,
    logger: LoggerPort,
    sessionService: SessionServicePort | undefined,
): RetrospectiveDeps | null {
    if (!sessionService) {
        logger.warn('retrospective_disabled', { reason: 'missing the session service' });
        return null;
    }

    const db = getFirestore();
    const retrospectiveBoardAdapter = new FirestoreRetrospectiveBoardAdapter(db);

    return {
        retrospectiveBoardPort: retrospectiveBoardAdapter,
        participantPort: retrospectiveBoardAdapter,
        cardPort: new FirestoreCardAdapter(db),
        cardGroupPort: new FirestoreCardGroupAdapter(db),
        actionItemPort: new FirestoreActionItemAdapter(db),
        facilitatorNotePort: new FirestoreFacilitatorNoteAdapter(db),
        sentimentResultPort: new FirestoreSentimentResultAdapter(db),
        typingStatusPort: new FirestoreTypingStatusAdapter(db),
        realtimeGateway: new FirestoreRealtimeGatewayAdapter(db),
        sessionService,
        clock: new SystemClock(),
        testMode: config.authTestMode,
    };
}
