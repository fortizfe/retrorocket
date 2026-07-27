import { useEffect, useRef, useState } from 'react';

export type BoardConnectionState = 'connecting' | 'connected' | 'reconnecting';

export type BoardEventHandler<T = unknown> = (data: T) => void;

export interface UseBoardEventsOptions {
    /** Called on (re)connect with the full current-state snapshot (contracts/realtime-events.md). */
    onSnapshot?: BoardEventHandler;
    /** Named incremental-event handlers, e.g. `{ 'card.created': handler }`. */
    on?: Record<string, BoardEventHandler>;
}

export interface UseBoardEventsResult {
    connectionState: BoardConnectionState;
}

interface Subscriber {
    dispatchSnapshot: (data: unknown) => void;
    dispatchNamed: (name: string, data: unknown) => void;
    notifyState: (state: BoardConnectionState) => void;
}

interface SharedConnection {
    source: EventSource;
    subscribers: Set<Subscriber>;
    state: BoardConnectionState;
    /** The most recent `snapshot` payload, if any has arrived yet. */
    lastSnapshot: unknown;
    hasSnapshot: boolean;
    /** Named-event listeners already wired onto `source`, so each name is registered once. */
    registeredNames: Set<string>;
}

// Several independent hooks (BoardEventsProvider, useParticipants, useCountdown — the
// latter two each mounted from more than one place, e.g. the topbar AND the page) all
// want the same board's event stream. Without sharing, every one of them opened its own
// EventSource, which under HTTP/1.1 dev servers can easily exceed the browser's ~6
// connections-per-origin cap and starve every other request (including plain POSTs) once
// enough boards/components pile up. One real connection per board ID, ref-counted via the
// subscriber set, fixes that regardless of how many hook instances ask for it.
const sharedConnections = new Map<string, SharedConnection>();

function ensureConnection(boardId: string): SharedConnection {
    const existing = sharedConnections.get(boardId);
    if (existing) return existing;

    const source = new EventSource(`/api/boards/${boardId}/events`, { withCredentials: true });
    const conn: SharedConnection = {
        source,
        subscribers: new Set(),
        state: 'connecting',
        lastSnapshot: null,
        hasSnapshot: false,
        registeredNames: new Set(),
    };

    const setState = (state: BoardConnectionState) => {
        conn.state = state;
        conn.subscribers.forEach((s) => s.notifyState(state));
    };

    source.addEventListener('open', () => setState('connected'));
    source.addEventListener('error', () => setState('reconnecting'));
    source.addEventListener('snapshot', (event) => {
        setState('connected');
        const data = JSON.parse((event as MessageEvent).data);
        conn.lastSnapshot = data;
        conn.hasSnapshot = true;
        conn.subscribers.forEach((s) => s.dispatchSnapshot(data));
    });

    sharedConnections.set(boardId, conn);
    return conn;
}

/** Wires a listener for `name` onto the shared connection the first time any subscriber asks for it. */
function ensureNamedListener(conn: SharedConnection, name: string): void {
    if (conn.registeredNames.has(name)) return;
    conn.registeredNames.add(name);
    conn.source.addEventListener(name, (event) => {
        const data = JSON.parse((event as MessageEvent).data);
        conn.subscribers.forEach((s) => s.dispatchNamed(name, data));
    });
}

/**
 * Wraps the board's SSE channel (`GET /api/boards/:id/events`) in a React hook. Relies on
 * the browser's native EventSource auto-reconnect (research.md §1) to satisfy FR-011 —
 * this hook only surfaces the resulting connection state, it never re-implements retry
 * logic itself. `boardId` undefined/empty means "not connected yet."
 *
 * Multiple call sites for the same `boardId` share one underlying EventSource (see
 * `ensureConnection` above) instead of each opening a redundant connection.
 */
export function useBoardEvents(boardId: string | undefined, options: UseBoardEventsOptions): UseBoardEventsResult {
    const [connectionState, setConnectionState] = useState<BoardConnectionState>('connecting');
    const optionsRef = useRef(options);
    optionsRef.current = options;

    useEffect(() => {
        if (!boardId) return undefined;

        const conn = ensureConnection(boardId);
        setConnectionState(conn.state);

        const subscriber: Subscriber = {
            dispatchSnapshot: (data) => optionsRef.current.onSnapshot?.(data),
            dispatchNamed: (name, data) => optionsRef.current.on?.[name]?.(data),
            notifyState: (state) => setConnectionState(state),
        };
        conn.subscribers.add(subscriber);
        for (const name of Object.keys(optionsRef.current.on ?? {})) {
            ensureNamedListener(conn, name);
        }

        // The `snapshot` SSE event fires once per connection, right after it opens — a
        // subscriber joining a connection some other hook already established (shared
        // per boardId, see `ensureConnection`) would otherwise never see it, since
        // EventSource never replays past events to new listeners.
        if (conn.hasSnapshot) subscriber.dispatchSnapshot(conn.lastSnapshot);

        return () => {
            conn.subscribers.delete(subscriber);
            if (conn.subscribers.size === 0) {
                conn.source.close();
                sharedConnections.delete(boardId);
            }
        };
    }, [boardId]);

    return { connectionState };
}
