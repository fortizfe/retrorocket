import { getFirestore } from 'firebase-admin/firestore';
import type { ServerConfig } from '../config/env';
import type { LoggerPort } from '../application/ports/observability';
import type { SessionServicePort } from '../application/ports';
import type { BoardsRouterDeps } from './routes/boards';
import { FirestoreBoardAdapter } from '../adapters/firebase/FirestoreBoardAdapter';
import { FirestoreParticipantAdapter } from '../adapters/firebase/FirestoreParticipantAdapter';
import { FirestoreCardAdapter } from '../adapters/firebase/FirestoreCardAdapter';
import { FirestoreCardGroupAdapter } from '../adapters/firebase/FirestoreCardGroupAdapter';
import { FirestoreTypingAdapter } from '../adapters/firebase/FirestoreTypingAdapter';
import { FirestoreCountdownAdapter } from '../adapters/firebase/FirestoreCountdownAdapter';
import { FirestoreFacilitatorNotesAdapter } from '../adapters/firebase/FirestoreFacilitatorNotesAdapter';
import { FirestoreActionItemAdapter } from '../adapters/firebase/FirestoreActionItemAdapter';
import { FirestoreSentimentAdapter } from '../adapters/firebase/FirestoreSentimentAdapter';
import { SystemClock } from '../adapters/system';

/**
 * Composition glue for the boards bounded context (mirrors auth-wiring.ts/mcp-wiring.ts).
 * Reuses the Firebase Admin SDK app already initialized by buildAuthDeps and the same
 * session service, so no new required secret is introduced. Returns null (503 config_error)
 * when the session service isn't available. Excluded from unit coverage — thin composition
 * glue over firebase-admin, exercised by E2E against the emulator (see server/vitest.config.ts).
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
    const clock = new SystemClock();
    const boardAdapter = new FirestoreBoardAdapter(db);
    const participantAdapter = new FirestoreParticipantAdapter(db);
    const cardAdapter = new FirestoreCardAdapter(db);
    const cardGroupAdapter = new FirestoreCardGroupAdapter(db);
    const typingAdapter = new FirestoreTypingAdapter(db);
    const countdownAdapter = new FirestoreCountdownAdapter(db, clock);
    const facilitatorNotesAdapter = new FirestoreFacilitatorNotesAdapter(db);
    const actionItemAdapter = new FirestoreActionItemAdapter(db);
    const sentimentAdapter = new FirestoreSentimentAdapter(db);

    return {
        db,
        boardReadPort: boardAdapter,
        boardWritePort: boardAdapter,
        participantPort: participantAdapter,
        cardPort: cardAdapter,
        cardGroupPort: cardGroupAdapter,
        typingPort: typingAdapter,
        countdownPort: countdownAdapter,
        facilitatorNotesPort: facilitatorNotesAdapter,
        actionItemPort: actionItemAdapter,
        sentimentPort: sentimentAdapter,
        sessionService,
        clock,
    };
}
