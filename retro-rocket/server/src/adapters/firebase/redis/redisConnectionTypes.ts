/**
 * Shared types for Redis connection-state logging (043,
 * contracts/redis-connection-logging.md; data-model.md). Two independent instances of
 * this state machine exist per warm serverless instance — one per `RedisConnectionRole`
 * (retrospective-wiring.ts's commandClient and subscriberClient).
 */
export type RedisConnectionRole = 'command' | 'subscriber';

export type RedisConnectionState = 'connecting' | 'ready' | 'reconnecting' | 'errored' | 'ended';

export interface RedisConnectionLogEvent {
    role: RedisConnectionRole;
    state: RedisConnectionState;
    /** Omitted on the very first transition out of the initial 'connecting' state. */
    previousState?: RedisConnectionState;
    /** Present only when `state` is 'errored' or 'reconnecting'. */
    errorCode?: string;
    /** Present only when `state` is 'errored' or 'reconnecting'. */
    errorMessage?: string;
    /** Failed attempts collapsed into the unhealthy period being reported, per FR-003's
     * bounded-log-volume requirement. */
    attempts?: number;
}
