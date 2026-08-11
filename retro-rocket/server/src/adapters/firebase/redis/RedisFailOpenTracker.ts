export type BoardHealthState = 'coordinated' | 'degraded';

export interface BoardHealthTransition {
    state: BoardHealthState;
    /** True only when this call actually changed the board's state — lets the caller
     * (CoordinatedRealtimeGatewayAdapter) act only on genuine degrade/recovery edges
     * instead of on every single Redis call. */
    transitioned: boolean;
}

/**
 * Pure per-board health-state tracker behind the fail-open behavior required by
 * `FR-008a`/contracts/redis-coordination-protocol.md's Failure semantics. A board
 * defaults to 'coordinated'; a failed Redis operation marks it 'degraded'; a later
 * successful operation marks it 'recovered' back to 'coordinated'. Holds no Redis
 * connection or Firestore listener state itself — CoordinatedRealtimeGatewayAdapter
 * acts on the transitions this reports.
 */
export class RedisFailOpenTracker {
    private readonly degraded = new Set<string>();

    getState(retrospectiveId: string): BoardHealthState {
        return this.degraded.has(retrospectiveId) ? 'degraded' : 'coordinated';
    }

    recordFailure(retrospectiveId: string): BoardHealthTransition {
        const wasDegraded = this.degraded.has(retrospectiveId);
        this.degraded.add(retrospectiveId);
        return { state: 'degraded', transitioned: !wasDegraded };
    }

    recordSuccess(retrospectiveId: string): BoardHealthTransition {
        const wasDegraded = this.degraded.has(retrospectiveId);
        this.degraded.delete(retrospectiveId);
        return { state: 'coordinated', transitioned: wasDegraded };
    }

    clear(retrospectiveId: string): void {
        this.degraded.delete(retrospectiveId);
    }
}
