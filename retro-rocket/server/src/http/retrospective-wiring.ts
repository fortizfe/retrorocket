import { getFirestore } from 'firebase-admin/firestore';
import { Redis } from 'ioredis';
import type { RedisLike } from '../adapters/firebase/redis/RedisLike';
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
import { RedisBoardCoordinationAdapter } from '../adapters/firebase/redis/RedisBoardCoordinationAdapter';
import { CoordinatedRealtimeGatewayAdapter } from '../adapters/firebase/redis/CoordinatedRealtimeGatewayAdapter';
import { attachRedisConnectionLogging } from '../adapters/firebase/redis/RedisConnectionObservability';
import { FirestoreProfileAdapter } from '../adapters/firebase/FirestoreProfileAdapter';
import { SystemClock } from '../adapters/system';

/** 040, US3: two separate ioredis connections per process — Redis puts a connection
 * into subscriber-only mode once SUBSCRIBE is called, so the command path
 * (SET/EVAL/PUBLISH) and the subscription path can't share one connection. */
function buildRealtimeGateway(db: ReturnType<typeof getFirestore>, redisUrl: string | undefined, logger: LoggerPort): RealtimeGatewayPort {
    if (!redisUrl) {
        logger.warn('redis_coordination_disabled', { reason: 'REDIS_URL not configured — falling back to uncoordinated per-instance listeners' });
        return new FirestoreRealtimeGatewayAdapter(db);
    }
    // ioredis's `Redis` class has a heavily overloaded `set`/`eval` surface (extra
    // optional trailing args across its various overload branches) that TypeScript's
    // structural check on function-typed properties rejects even though the exact call
    // shape RedisBoardCoordinationAdapter actually uses is valid at runtime (verified
    // against a real Redis instance, e2e/concurrent-board-network.spec.ts). Narrowing
    // the cast to this one wiring boundary keeps RedisLike itself simple and
    // ioredis-agnostic for testability, rather than widening it to match ioredis's
    // full typings.
    const rawCommandClient = new Redis(redisUrl);
    const rawSubscriberClient = new Redis(redisUrl);
    // 043: without an `error` listener, ioredis falls back to its own noisy
    // "[ioredis] Unhandled error event" console logger for every failed (re)connect
    // attempt — this replaces that with bounded, structured logging (contracts/
    // redis-connection-logging.md) via the app's own LoggerPort.
    attachRedisConnectionLogging(rawCommandClient, 'command', logger, redisUrl);
    attachRedisConnectionLogging(rawSubscriberClient, 'subscriber', logger, redisUrl);
    const commandClient = rawCommandClient as unknown as RedisLike;
    const subscriberClient = rawSubscriberClient as unknown as RedisLike;
    const coordinator = new RedisBoardCoordinationAdapter(commandClient, subscriberClient);
    return new CoordinatedRealtimeGatewayAdapter(db, coordinator);
}

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
        realtimeGateway: buildRealtimeGateway(db, config.redisUrl, logger),
        profilePort: new FirestoreProfileAdapter(db),
        sessionService,
        clock: new SystemClock(),
        testMode: config.authTestMode,
    };
}
