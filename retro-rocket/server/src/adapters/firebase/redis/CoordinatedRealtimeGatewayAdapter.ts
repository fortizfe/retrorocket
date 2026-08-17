import type { Firestore } from 'firebase-admin/firestore';
import type { RealtimeConnection, RealtimeEvent, RealtimeGatewayPort } from '../../../application/ports/realtime';
import { isVisibleToConnection, toEntityChangeEvent, startFirestoreBoardListeners, type FirestoreBoardListenerSet } from '../FirestoreRealtimeGatewayAdapter';
import { RedisBoardCoordinationAdapter, DEFAULT_LEASE_MS } from './RedisBoardCoordinationAdapter';
import { RedisFailOpenTracker } from './RedisFailOpenTracker';

const DEFAULT_REDIS_OP_TIMEOUT_MS = 3000;
/** Fail-open recovery retry cadence while degraded (contracts/redis-coordination-
 * protocol.md's Failure semantics recommends 10-30s; using the low end so recovery is
 * noticed promptly without hammering a still-unreachable Redis). */
const DEFAULT_RECOVERY_RETRY_MS = 10_000;
/** Fixed via /speckit-clarify (045-idle-connection-cleanup, FR-006) — mirrors
 * FirestoreRealtimeGatewayAdapter's own TEARDOWN_GRACE_MS for the Redis-coordinated
 * variant: how long ownership/subscription/listeners are kept alive with zero local
 * connections before actually releasing them. */
const TEARDOWN_GRACE_MS = 30_000;

type BoardMode = 'connecting' | 'owner' | 'subscriber' | 'direct';

interface CoordinatedBoardState {
    connections: Set<RealtimeConnection>;
    mode: BoardMode;
    firestoreListeners: FirestoreBoardListenerSet | undefined;
    subscribed: boolean;
    ticker: ReturnType<typeof setInterval>;
    /** Set while connections.size === 0 and teardown is pending (US4); cleared/
     * cancelled if a new connection registers before it fires. */
    pendingTeardown?: ReturnType<typeof setTimeout>;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Redis operation timed out')), ms);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error: unknown) => {
                clearTimeout(timer);
                reject(error instanceof Error ? error : new Error(String(error)));
            },
        );
    });
}

/**
 * Implements RealtimeGatewayPort by coordinating board-listener ownership across
 * backend instances via Redis (040, US3; contracts/redis-coordination-protocol.md),
 * so exactly one instance's Firestore listeners are ever active for a given board
 * regardless of how many instances are concurrently serving it — with a fail-open
 * fallback to FirestoreRealtimeGatewayAdapter's own uncoordinated behavior whenever
 * Redis is unreachable, per FR-008a.
 *
 * Per-board state machine (`CoordinatedBoardState.mode`):
 *   connecting → owner   : this instance won the lease; runs Firestore listeners,
 *                          publishing translated events to Redis instead of
 *                          delivering directly, and also subscribes to its own
 *                          board's channel (uniform delivery path, §5).
 *   connecting → subscriber : another instance already owns it; only subscribes.
 *   any → direct          : a Redis operation failed/timed out (fail-open); runs
 *                          Firestore listeners delivering straight to local
 *                          connections, exactly like FirestoreRealtimeGatewayAdapter.
 *   owner/subscriber/direct → owner/subscriber : reconcile() runs every tickIntervalMs
 *                          (leaseMs/3) — renews if owner, otherwise attempts
 *                          acquisition (§1's trigger (b), the periodic re-check that
 *                          guarantees hand-off completes after a graceful release, not
 *                          just a crash).
 *
 * Excluded from Vitest coverage (server/vitest.config.ts) as thin orchestration glue
 * over live ioredis + firebase-admin calls, exercised by the Playwright E2E suite
 * against the emulator + a real Redis instance — the lease/pub-sub decision logic it
 * composes (RedisBoardCoordinationAdapter, RedisFailOpenTracker) is fully unit-tested.
 */
export class CoordinatedRealtimeGatewayAdapter implements RealtimeGatewayPort {
    private readonly boards = new Map<string, CoordinatedBoardState>();
    private readonly reconciling = new Set<string>();
    private readonly failOpen = new RedisFailOpenTracker();
    private readonly tickIntervalMs: number;
    private readonly redisOpTimeoutMs: number;

    constructor(
        private readonly db: Firestore,
        private readonly redisCoordinator: RedisBoardCoordinationAdapter,
        options: { leaseMs?: number; redisOpTimeoutMs?: number; recoveryRetryMs?: number } = {},
    ) {
        const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
        this.tickIntervalMs = Math.min(leaseMs / 3, options.recoveryRetryMs ?? DEFAULT_RECOVERY_RETRY_MS);
        this.redisOpTimeoutMs = options.redisOpTimeoutMs ?? DEFAULT_REDIS_OP_TIMEOUT_MS;
    }

    register(connection: RealtimeConnection): void {
        const { retrospectiveId } = connection;
        let state = this.boards.get(retrospectiveId);
        if (!state) {
            state = {
                connections: new Set(),
                mode: 'connecting',
                firestoreListeners: undefined,
                subscribed: false,
                ticker: setInterval(() => void this.reconcile(retrospectiveId), this.tickIntervalMs),
            };
            this.boards.set(retrospectiveId, state);
            void this.reconcile(retrospectiveId);
        } else if (state.pendingTeardown !== undefined) {
            // 045-idle-connection-cleanup, US4: a new connection arrived within the
            // grace window — cancel the pending teardown and restart the ticker
            // (paused while there were zero connections). Ownership/subscription/
            // listeners were never released, so no fresh reconcile is required.
            clearTimeout(state.pendingTeardown);
            state.pendingTeardown = undefined;
            state.ticker = setInterval(() => void this.reconcile(retrospectiveId), this.tickIntervalMs);
        }
        state.connections.add(connection);
    }

    unregister(connection: RealtimeConnection): void {
        const { retrospectiveId } = connection;
        const state = this.boards.get(retrospectiveId);
        if (!state) return;
        state.connections.delete(connection);
        if (state.connections.size > 0 || state.pendingTeardown !== undefined) return;

        // 045-idle-connection-cleanup, US4/FR-006: pause reconciliation (nothing to
        // reconcile with zero local connections) but keep ownership/subscription/
        // listeners alive for a brief grace period in case this is just a
        // micro-reconnect, instead of releasing everything immediately.
        clearInterval(state.ticker);
        state.pendingTeardown = setTimeout(() => {
            this.stopFirestoreListeners(state);
            // Best-effort: the board's state is being discarded either way (line below),
            // so a rejection here (e.g. the shared Redis connection cycling/closing under
            // load) has nothing left to fail open *into* — unlike every other Redis call
            // in this class, .catch() here is a deliberate no-op, not a mode switch. Safe
            // to swallow: a failed unsubscribe just leaves a harmless stale subscription
            // (cleaned up on the client's own reconnect), and a failed release is covered
            // by the ownership lease's own PX TTL (RedisBoardCoordinationAdapter) expiring
            // it naturally. Previously bare `void`, which turned any rejection into an
            // unhandled promise rejection — observed destabilizing the concurrent-session
            // E2E spec's own test run when 10 simultaneous unregister/register cycles hit
            // this path at once.
            if (state.subscribed) this.redisCoordinator.unsubscribe(retrospectiveId).catch(() => {});
            if (state.mode === 'owner') this.redisCoordinator.release(retrospectiveId).catch(() => {});
            this.failOpen.clear(retrospectiveId);
            this.boards.delete(retrospectiveId);
        }, TEARDOWN_GRACE_MS);
    }

    /** Runs once immediately on first registration, then every tickIntervalMs while
     * the board has ≥1 local connection: renews ownership if owner, otherwise attempts
     * acquisition (trigger (b)). Any Redis error/timeout anywhere in this method is
     * fail-open — the board falls back to direct local Firestore listeners. Guarded
     * against overlapping invocations for the same board. */
    private async reconcile(retrospectiveId: string): Promise<void> {
        if (this.reconciling.has(retrospectiveId)) return;
        this.reconciling.add(retrospectiveId);
        try {
            const state = this.boards.get(retrospectiveId);
            if (!state || state.connections.size === 0) return;

            try {
                if (this.redisCoordinator.isOwner(retrospectiveId)) {
                    const renewed = await withTimeout(this.redisCoordinator.renew(retrospectiveId), this.redisOpTimeoutMs);
                    this.failOpen.recordSuccess(retrospectiveId);
                    if (renewed) {
                        await this.becomeOwner(retrospectiveId, state);
                        return;
                    }
                    // Lease was lost between ticks (another instance already won it after
                    // expiry) — fall through to attempt a fresh acquisition this same tick.
                }

                const acquired = await withTimeout(this.redisCoordinator.tryAcquire(retrospectiveId), this.redisOpTimeoutMs);
                this.failOpen.recordSuccess(retrospectiveId);
                if (acquired) {
                    await this.becomeOwner(retrospectiveId, state);
                } else {
                    await this.becomeSubscriber(retrospectiveId, state);
                }
            } catch {
                this.failOpen.recordFailure(retrospectiveId);
                this.enterDirectMode(retrospectiveId, state);
            }
        } finally {
            this.reconciling.delete(retrospectiveId);
        }
    }

    private async becomeOwner(retrospectiveId: string, state: CoordinatedBoardState): Promise<void> {
        if (state.mode !== 'owner') {
            state.mode = 'owner';
            this.stopFirestoreListeners(state);
            state.firestoreListeners = startFirestoreBoardListeners(this.db, retrospectiveId, (entity, changeType, id, data) => {
                const event = toEntityChangeEvent(entity, changeType, id, data);
                this.redisCoordinator.publish(retrospectiveId, event).catch(() => {
                    this.failOpen.recordFailure(retrospectiveId);
                    this.enterDirectMode(retrospectiveId, state);
                });
            });
        }
        await this.ensureSubscribed(retrospectiveId, state);
    }

    private async becomeSubscriber(retrospectiveId: string, state: CoordinatedBoardState): Promise<void> {
        if (state.mode !== 'subscriber') {
            state.mode = 'subscriber';
            this.stopFirestoreListeners(state);
        }
        await this.ensureSubscribed(retrospectiveId, state);
    }

    /** Fail-open fallback (FR-008a): runs Firestore listeners delivering straight to
     * this instance's own local connections, bypassing Redis entirely — identical to
     * FirestoreRealtimeGatewayAdapter's uncoordinated behavior, scoped to this board.
     * Synchronously flips `state.mode` as its first statement (no `await` before it)
     * so a concurrent caller (reconcile's tick vs. a publish failure) can't both enter
     * this method believing they're first. */
    private enterDirectMode(retrospectiveId: string, state: CoordinatedBoardState): void {
        if (state.mode === 'direct') return;
        state.mode = 'direct';
        this.stopFirestoreListeners(state);
        state.firestoreListeners = startFirestoreBoardListeners(this.db, retrospectiveId, (entity, changeType, id, data) => {
            const event = toEntityChangeEvent(entity, changeType, id, data);
            this.deliverLocally(state, event);
        });
    }

    private async ensureSubscribed(retrospectiveId: string, state: CoordinatedBoardState): Promise<void> {
        if (state.subscribed) return;
        await withTimeout(
            this.redisCoordinator.subscribe(retrospectiveId, (event) => this.deliverLocally(state, event)),
            this.redisOpTimeoutMs,
        );
        state.subscribed = true;
    }

    private stopFirestoreListeners(state: CoordinatedBoardState): void {
        state.firestoreListeners?.unsubscribe();
        state.firestoreListeners = undefined;
    }

    private deliverLocally(state: CoordinatedBoardState, event: RealtimeEvent): void {
        for (const connection of state.connections) {
            if (!isVisibleToConnection(event.entity, event.data, connection.uid)) continue;
            connection.send(event);
        }
    }
}
