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

/**
 * Wraps the board's SSE channel (`GET /api/boards/:id/events`) in a React hook. Relies on
 * the browser's native EventSource auto-reconnect (research.md §1) to satisfy FR-011 —
 * this hook only surfaces the resulting connection state, it never re-implements retry
 * logic itself. `boardId` undefined/empty means "not connected yet."
 */
export function useBoardEvents(boardId: string | undefined, options: UseBoardEventsOptions): UseBoardEventsResult {
    const [connectionState, setConnectionState] = useState<BoardConnectionState>('connecting');
    const optionsRef = useRef(options);
    optionsRef.current = options;

    useEffect(() => {
        if (!boardId) return undefined;

        setConnectionState('connecting');
        const source = new EventSource(`/api/boards/${boardId}/events`, { withCredentials: true });

        const handleOpen = () => setConnectionState('connected');
        const handleError = () => setConnectionState('reconnecting');
        const handleSnapshot = (event: Event) => {
            setConnectionState('connected');
            optionsRef.current.onSnapshot?.(JSON.parse((event as MessageEvent).data));
        };

        source.addEventListener('open', handleOpen);
        source.addEventListener('error', handleError);
        source.addEventListener('snapshot', handleSnapshot);

        const namedEventNames = Object.keys(optionsRef.current.on ?? {});
        const namedListeners: Array<[string, (event: Event) => void]> = namedEventNames.map((name) => {
            const listener = (event: Event) => {
                optionsRef.current.on?.[name]?.(JSON.parse((event as MessageEvent).data));
            };
            source.addEventListener(name, listener);
            return [name, listener];
        });

        return () => {
            source.removeEventListener('open', handleOpen);
            source.removeEventListener('error', handleError);
            source.removeEventListener('snapshot', handleSnapshot);
            for (const [name, listener] of namedListeners) source.removeEventListener(name, listener);
            source.close();
        };
    }, [boardId]);

    return { connectionState };
}
