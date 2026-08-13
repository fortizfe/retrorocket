import type { LoggerPort } from '../../../application/ports/observability';
import { redactRedisUrl } from './redactRedisUrl';
import type { RedisConnectionRole, RedisConnectionState } from './redisConnectionTypes';

/**
 * The narrow slice of `ioredis`'s `EventEmitter` surface this module depends on —
 * defined as our own interface (mirroring `RedisLike`'s existing convention) so a
 * lightweight fake double can implement it exactly for unit tests, rather than depending
 * on `ioredis`'s concrete `Redis` type.
 */
export interface RedisEventEmitterLike {
    on(event: 'error', listener: (error: Error) => void): void;
    on(event: 'reconnecting', listener: () => void): void;
    on(event: 'ready', listener: () => void): void;
    on(event: 'end', listener: () => void): void;
}

type Bucket = 'healthy' | 'unhealthy' | 'ended';

function errorCodeOf(error: Error | undefined): string | undefined {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    return typeof code === 'string' ? code : undefined;
}

/**
 * Attaches `error`/`reconnecting`/`ready`/`end` listeners to a Redis client and routes
 * every connection-state transition through the given `LoggerPort` as one of the
 * structured events in contracts/redis-connection-logging.md, instead of leaving errors
 * to `ioredis`'s own noisy "[ioredis] Unhandled error event" fallback logger (the exact
 * raw text this module replaces — that fallback only exists because no `error` listener
 * was previously registered on these clients).
 *
 * Log volume is bounded by only emitting on a *bucket* transition (healthy ↔ unhealthy ↔
 * ended), not on every individual retry — consecutive error/reconnecting events while
 * already unhealthy just accumulate `attempts` for the eventual recovery/end log,
 * mirroring the transition-only reporting idiom `RedisFailOpenTracker` already uses for
 * per-board health (043, data-model.md).
 */
export function attachRedisConnectionLogging(
    client: RedisEventEmitterLike,
    role: RedisConnectionRole,
    logger: LoggerPort,
    redisUrl: string | undefined,
): void {
    logger.info('redis_connection_configured', { role, ...redactRedisUrl(redisUrl) });

    let state: RedisConnectionState = 'connecting';
    let bucket: Bucket | undefined;
    let attempts = 0;
    let unhealthySince: number | undefined;

    function enterUnhealthy(nextState: RedisConnectionState, error?: Error): void {
        attempts += 1;
        const wasUnhealthy = bucket === 'unhealthy';
        const previousState = state;
        state = nextState;
        if (wasUnhealthy) return;

        bucket = 'unhealthy';
        unhealthySince = Date.now();
        logger.warn('redis_connection_unhealthy', {
            role,
            state,
            previousState,
            errorCode: errorCodeOf(error),
            errorMessage: error?.message,
        });
    }

    client.on('error', (error) => enterUnhealthy('errored', error));
    client.on('reconnecting', () => enterUnhealthy('reconnecting'));

    client.on('ready', () => {
        const wasUnhealthy = bucket === 'unhealthy';
        state = 'ready';
        bucket = 'healthy';
        if (wasUnhealthy) {
            logger.info('redis_connection_recovered', {
                role,
                attempts,
                unhealthyForMs: unhealthySince !== undefined ? Date.now() - unhealthySince : undefined,
            });
        }
        attempts = 0;
        unhealthySince = undefined;
    });

    client.on('end', () => {
        const previousState = state;
        state = 'ended';
        bucket = 'ended';
        logger.error('redis_connection_ended', { role, previousState });
    });
}
