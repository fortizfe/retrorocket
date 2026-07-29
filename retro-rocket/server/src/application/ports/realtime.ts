// ---------------------------------------------------------------------------
// RealtimeGatewayPort — the abstraction ordinary route handlers and the
// WebSocket upgrade layer depend on to register/unregister a board connection
// and receive translated Firestore change events. Its one concrete adapter is
// FirestoreRealtimeGatewayAdapter (research.md §1). Kept as its own port
// (Interface Segregation) so ordinary write routes never depend on WebSocket
// internals, and the WS layer never depends on firebase-admin directly.
// ---------------------------------------------------------------------------

export type RealtimeEntity =
    | 'card'
    | 'group'
    | 'actionItem'
    | 'timer'
    | 'typingStatus'
    | 'participant'
    | 'retrospective'
    | 'facilitatorNote';

export type RealtimeOp = 'created' | 'updated' | 'deleted';

export interface RealtimeEvent {
    type: 'entity_change';
    entity: RealtimeEntity;
    op: RealtimeOp;
    id: string;
    /** Full current entity, mirroring the REST GET shape. Omitted when op === 'deleted'. */
    data?: Record<string, unknown>;
}

export interface RealtimeConnection {
    /** The board this connection is scoped to for the connection's lifetime. */
    readonly retrospectiveId: string;
    /** The connection's caller uid — used to filter facilitatorNote events (FR-013). */
    readonly uid: string;
    send(event: RealtimeEvent): void;
}

export interface RealtimeGatewayPort {
    /**
     * Registers a connection for its board, lazily starting the board's server-side
     * Firestore listeners on first registration (reference-counted per board).
     */
    register(connection: RealtimeConnection): void;
    /**
     * Unregisters a connection; tears down the board's Firestore listeners once the
     * last connection for that board is unregistered.
     */
    unregister(connection: RealtimeConnection): void;
}
