import { describe, it, expect, vi } from 'vitest';
import { attachRedisConnectionLogging } from '../../../../src/adapters/firebase/redis/RedisConnectionObservability';
import type { RedisEventEmitterLike } from '../../../../src/adapters/firebase/redis/RedisConnectionObservability';
import type { LoggerPort, LogFields } from '../../../../src/application/ports/observability';

// attachRedisConnectionLogging replaces ioredis's own "[ioredis] Unhandled error event"
// fallback logger (the exact raw text observed in production) with bounded, structured
// LoggerPort calls, per 043's contracts/redis-connection-logging.md. This fake
// event-emitter double mirrors RedisBoardCoordinationAdapter.test.ts's FakeRedis
// approach — attachRedisConnectionLogging depends on a narrow, project-owned interface
// (RedisEventEmitterLike), not the full ioredis SDK, so a small in-memory fake is
// practical here too.

class FakeEmitter implements RedisEventEmitterLike {
    private readonly errorListeners: Array<(error: Error) => void> = [];
    private readonly reconnectingListeners: Array<() => void> = [];
    private readonly readyListeners: Array<() => void> = [];
    private readonly endListeners: Array<() => void> = [];

    on(event: 'error' | 'reconnecting' | 'ready' | 'end', listener: (...args: never[]) => void): void {
        if (event === 'error') this.errorListeners.push(listener as (error: Error) => void);
        else if (event === 'reconnecting') this.reconnectingListeners.push(listener as () => void);
        else if (event === 'ready') this.readyListeners.push(listener as () => void);
        else if (event === 'end') this.endListeners.push(listener as () => void);
    }

    emitError(error: Error): void {
        for (const listener of this.errorListeners) listener(error);
    }

    emitReconnecting(): void {
        for (const listener of this.reconnectingListeners) listener();
    }

    emitReady(): void {
        for (const listener of this.readyListeners) listener();
    }

    emitEnd(): void {
        for (const listener of this.endListeners) listener();
    }
}

/** Records every call instead of writing anywhere, so assertions can inspect exactly
 * what would have reached the real logger — and, implicitly, that nothing ever falls
 * through to a raw console/ioredis fallback path instead. */
class FakeLogger implements LoggerPort {
    readonly info = vi.fn<(message: string, fields?: LogFields) => void>();
    readonly warn = vi.fn<(message: string, fields?: LogFields) => void>();
    readonly error = vi.fn<(message: string, fields?: LogFields) => void>();

    child(): LoggerPort {
        return this;
    }
}

function timeoutError(): Error {
    const error = new Error('connect ETIMEDOUT') as NodeJS.ErrnoException;
    error.code = 'ETIMEDOUT';
    return error;
}

describe('attachRedisConnectionLogging', () => {
    it('logs exactly one redis_connection_configured info entry at construction, with a redacted target', () => {
        const emitter = new FakeEmitter();
        const logger = new FakeLogger();

        attachRedisConnectionLogging(emitter, 'command', logger, 'redis://default:s3cr3t@my-host.example.com:6379');

        expect(logger.info).toHaveBeenCalledTimes(1);
        expect(logger.info).toHaveBeenCalledWith('redis_connection_configured', {
            role: 'command',
            host: 'my-host.example.com',
            port: 6379,
            tls: false,
        });
    });

    it('collapses a run of consecutive error/reconnecting events into a single redis_connection_unhealthy warn log', () => {
        const emitter = new FakeEmitter();
        const logger = new FakeLogger();
        attachRedisConnectionLogging(emitter, 'command', logger, 'redis://host:6379');

        emitter.emitError(timeoutError());
        emitter.emitReconnecting();
        emitter.emitError(timeoutError());
        emitter.emitReconnecting();

        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith('redis_connection_unhealthy', {
            role: 'command',
            state: 'errored',
            previousState: 'connecting',
            errorCode: 'ETIMEDOUT',
            errorMessage: 'connect ETIMEDOUT',
        });
    });

    it('emits exactly one redis_connection_recovered info log on transition back to ready, with the collapsed attempt count', () => {
        const emitter = new FakeEmitter();
        const logger = new FakeLogger();
        attachRedisConnectionLogging(emitter, 'subscriber', logger, 'redis://host:6379');

        emitter.emitError(timeoutError());
        emitter.emitReconnecting();
        emitter.emitError(timeoutError());
        emitter.emitReady();

        expect(logger.info).toHaveBeenCalledTimes(2); // configured + recovered
        expect(logger.info).toHaveBeenLastCalledWith(
            'redis_connection_recovered',
            expect.objectContaining({ role: 'subscriber', attempts: 3 }),
        );
    });

    it('does not log redis_connection_recovered on the very first successful connect (never was unhealthy)', () => {
        const emitter = new FakeEmitter();
        const logger = new FakeLogger();
        attachRedisConnectionLogging(emitter, 'command', logger, 'redis://host:6379');

        emitter.emitReady();

        expect(logger.info).toHaveBeenCalledTimes(1); // only redis_connection_configured
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it('logs a redis_connection_ended error entry when the connection ends', () => {
        const emitter = new FakeEmitter();
        const logger = new FakeLogger();
        attachRedisConnectionLogging(emitter, 'command', logger, 'redis://host:6379');

        emitter.emitEnd();

        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith('redis_connection_ended', {
            role: 'command',
            previousState: 'connecting',
        });
    });

    it('never calls the console/global object directly — everything routes through LoggerPort', () => {
        const emitter = new FakeEmitter();
        const logger = new FakeLogger();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        attachRedisConnectionLogging(emitter, 'command', logger, 'redis://host:6379');
        emitter.emitError(timeoutError());
        emitter.emitReady();
        emitter.emitEnd();

        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
