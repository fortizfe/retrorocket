import { createContext, useContext, useState, ReactNode } from 'react';
import { useBoardEvents, type BoardConnectionState } from '@/lib/hooks/useBoardEvents';

/**
 * Raw (unparsed) board-events snapshot, as delivered by GET /api/boards/:id/events
 * (contracts/realtime-events.md). Each consuming hook (useOptimizedCards, useCardGroups,
 * useTypingStatus, useParticipants) parses its own slice into its typed shape.
 */
export interface BoardEventsSnapshot {
    board: unknown;
    participants: unknown[];
    cards: unknown[];
    groups: unknown[];
    typing: unknown[];
    actionItems: unknown[];
    sentiment: unknown[];
    /** Present only when this connection belongs to the board's own facilitator (FR-004). */
    notes?: unknown[];
}

interface BoardEventsContextValue {
    snapshot: BoardEventsSnapshot | null;
    connectionState: BoardConnectionState;
}

const EMPTY: BoardEventsContextValue = { snapshot: null, connectionState: 'connecting' };

const BoardEventsContext = createContext<BoardEventsContextValue>(EMPTY);

/**
 * Opens exactly ONE SSE connection per board (feature 017) and fans the resulting
 * snapshot/incremental events out to every hook that needs board real-time data via
 * context, instead of each hook opening its own redundant EventSource to the same URL.
 */
export function BoardEventsProvider({ retrospectiveId, children }: Readonly<{ retrospectiveId?: string; children: ReactNode }>) {
    const [snapshot, setSnapshot] = useState<BoardEventsSnapshot | null>(null);

    const { connectionState } = useBoardEvents(retrospectiveId, {
        onSnapshot: (data) => setSnapshot(data as BoardEventsSnapshot),
        on: {
            board: (data) => setSnapshot((prev) => (prev ? { ...prev, board: data } : prev)),
            participants: (data) => setSnapshot((prev) => (prev ? { ...prev, participants: data as unknown[] } : prev)),
            cards: (data) => setSnapshot((prev) => (prev ? { ...prev, cards: data as unknown[] } : prev)),
            groups: (data) => setSnapshot((prev) => (prev ? { ...prev, groups: data as unknown[] } : prev)),
            typing: (data) => setSnapshot((prev) => (prev ? { ...prev, typing: data as unknown[] } : prev)),
            actionItems: (data) => setSnapshot((prev) => (prev ? { ...prev, actionItems: data as unknown[] } : prev)),
            sentiment: (data) => setSnapshot((prev) => (prev ? { ...prev, sentiment: data as unknown[] } : prev)),
            notes: (data) => setSnapshot((prev) => (prev ? { ...prev, notes: data as unknown[] } : prev)),
        },
    });

    return (
        <BoardEventsContext.Provider value={{ snapshot, connectionState }}>
            {children}
        </BoardEventsContext.Provider>
    );
}

export function useBoardEventsContext(): BoardEventsContextValue {
    return useContext(BoardEventsContext);
}
