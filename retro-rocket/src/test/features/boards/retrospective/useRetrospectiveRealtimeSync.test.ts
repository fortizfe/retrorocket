import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyEntityChange, applyTypingStatusChange, useRetrospectiveRealtimeSync } from '@/features/boards/retrospective/hooks/useRetrospectiveRealtimeSync';
import type { RetrospectiveState } from '@/features/boards/retrospective/services/backendRetrospectiveClient';
import type { EntityChangeEvent } from '@/features/boards/retrospective/services/backendRealtimeClient';

const mockGetBoardState = vi.fn();
const mockJoinBoard = vi.fn();
const mockConnectRealtimeClient = vi.fn();

vi.mock('@/features/boards/retrospective/services/backendRetrospectiveClient', async () => {
    const actual = await vi.importActual<typeof import('@/features/boards/retrospective/services/backendRetrospectiveClient')>(
        '@/features/boards/retrospective/services/backendRetrospectiveClient',
    );
    return {
        ...actual,
        getBoardState: (...args: unknown[]) => mockGetBoardState(...args),
        joinBoard: (...args: unknown[]) => mockJoinBoard(...args),
    };
});

vi.mock('@/features/boards/retrospective/services/backendRealtimeClient', () => ({
    connectRealtimeClient: (...args: unknown[]) => mockConnectRealtimeClient(...args),
}));

function baseState(overrides: Partial<RetrospectiveState> = {}): RetrospectiveState {
    return {
        id: 'r1',
        title: 'Retro',
        createdBy: 'facilitator-uid',
        isFacilitator: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        participantCount: 1,
        isActive: true,
        columnGroupingStates: {},
        columns: [],
        cards: [],
        groups: [],
        actionItems: [],
        participants: [],
        timer: null,
        myFacilitatorNotes: [],
        sentimentResults: [],
        ...overrides,
    };
}

describe('applyEntityChange', () => {
    it('adds a new card on a created event', () => {
        const event: EntityChangeEvent = {
            type: 'entity_change',
            entity: 'card',
            op: 'created',
            id: 'c1',
            data: { content: 'hi', column: 'col1', createdBy: 'u1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', retrospectiveId: 'r1', votes: 0, likes: [], reactions: [], order: 0 },
        };
        const next = applyEntityChange(baseState(), event);
        expect(next.cards).toHaveLength(1);
        expect(next.cards[0]).toMatchObject({ id: 'c1', content: 'hi' });
        expect(next.cards[0].createdAt).toBeInstanceOf(Date);
    });

    it('replaces an existing card on an updated event', () => {
        const existing = baseState({ cards: [{ id: 'c1', content: 'old', column: 'col1', createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(), retrospectiveId: 'r1', votes: 0, likes: [], reactions: [], order: 0 }] });
        const event: EntityChangeEvent = {
            type: 'entity_change',
            entity: 'card',
            op: 'updated',
            id: 'c1',
            data: { content: 'new', column: 'col1', createdBy: 'u1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', retrospectiveId: 'r1', votes: 3, likes: [], reactions: [], order: 0 },
        };
        const next = applyEntityChange(existing, event);
        expect(next.cards).toHaveLength(1);
        expect(next.cards[0]).toMatchObject({ content: 'new', votes: 3 });
    });

    it('removes a card on a deleted event', () => {
        const existing = baseState({ cards: [{ id: 'c1', content: 'x', column: 'col1', createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(), retrospectiveId: 'r1', votes: 0, likes: [], reactions: [], order: 0 }] });
        const event: EntityChangeEvent = { type: 'entity_change', entity: 'card', op: 'deleted', id: 'c1' };
        expect(applyEntityChange(existing, event).cards).toEqual([]);
    });

    it('sets the timer to null on a deleted timer event', () => {
        const existing = baseState({ timer: { retrospectiveId: 'r1', startTime: null, duration: 300, originalDuration: 300, isRunning: false, isPaused: false, endTime: null, createdBy: 'u1', createdAt: new Date(), updatedAt: new Date() } });
        const event: EntityChangeEvent = { type: 'entity_change', entity: 'timer', op: 'deleted', id: 'r1' };
        expect(applyEntityChange(existing, event).timer).toBeNull();
    });

    it('merges retrospective metadata fields on an updated retrospective event, leaving other state untouched', () => {
        const existing = baseState({ cards: [{ id: 'c1', content: 'x', column: 'col1', createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(), retrospectiveId: 'r1', votes: 0, likes: [], reactions: [], order: 0 }] });
        const event: EntityChangeEvent = {
            type: 'entity_change',
            entity: 'retrospective',
            op: 'updated',
            id: 'r1',
            data: { title: 'Renamed', participantCount: 5, isActive: true, columnGroupingStates: {} },
        };
        const next = applyEntityChange(existing, event);
        expect(next.title).toBe('Renamed');
        expect(next.participantCount).toBe(5);
        expect(next.cards).toHaveLength(1);
    });

    it('is a no-op for typingStatus events (owned by a separate slice)', () => {
        const existing = baseState();
        const event: EntityChangeEvent = { type: 'entity_change', entity: 'typingStatus', op: 'created', id: 't1', data: {} };
        expect(applyEntityChange(existing, event)).toBe(existing);
    });
});

describe('applyTypingStatusChange', () => {
    it('adds a new typing entry on a created event', () => {
        const event: EntityChangeEvent = {
            type: 'entity_change',
            entity: 'typingStatus',
            op: 'created',
            id: 'r1_u1_col1',
            data: { userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'col1', timestamp: '2026-01-01T00:00:00.000Z' },
        };
        const next = applyTypingStatusChange([], event);
        expect(next).toHaveLength(1);
        expect(next[0]).toMatchObject({ id: 'r1_u1_col1', userId: 'u1', column: 'col1' });
    });

    it('removes an entry on a deleted event (typing stopped)', () => {
        const existing = [{ id: 'r1_u1_col1', userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'col1', timestamp: new Date() }];
        const event: EntityChangeEvent = { type: 'entity_change', entity: 'typingStatus', op: 'deleted', id: 'r1_u1_col1' };
        expect(applyTypingStatusChange(existing, event)).toEqual([]);
    });

    it('ignores non-typingStatus events', () => {
        const existing = [{ id: 'r1_u1_col1', userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'col1', timestamp: new Date() }];
        const event: EntityChangeEvent = { type: 'entity_change', entity: 'card', op: 'created', id: 'c1', data: {} };
        expect(applyTypingStatusChange(existing, event)).toBe(existing);
    });

    it('converges to the participant\'s actual latest activity across a create/refresh/stop/restart sequence, with no stale state stuck in between (FR-007)', () => {
        const created: EntityChangeEvent = {
            type: 'entity_change', entity: 'typingStatus', op: 'created', id: 'r1_u1_col1',
            data: { userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'col1', timestamp: '2026-01-01T00:00:00.000Z' },
        };
        const refreshed: EntityChangeEvent = {
            type: 'entity_change', entity: 'typingStatus', op: 'updated', id: 'r1_u1_col1',
            data: { userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'col1', timestamp: '2026-01-01T00:00:02.000Z' },
        };
        const stopped: EntityChangeEvent = { type: 'entity_change', entity: 'typingStatus', op: 'deleted', id: 'r1_u1_col1' };
        const restarted: EntityChangeEvent = {
            type: 'entity_change', entity: 'typingStatus', op: 'created', id: 'r1_u1_col1',
            data: { userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'col1', timestamp: '2026-01-01T00:00:05.000Z' },
        };

        let state = applyTypingStatusChange([], created);
        expect(state).toHaveLength(1);

        state = applyTypingStatusChange(state, refreshed);
        expect(state).toHaveLength(1);
        expect(state[0].timestamp).toEqual(new Date('2026-01-01T00:00:02.000Z'));

        state = applyTypingStatusChange(state, stopped);
        expect(state).toEqual([]);

        state = applyTypingStatusChange(state, restarted);
        expect(state).toHaveLength(1);
        expect(state[0].timestamp).toEqual(new Date('2026-01-01T00:00:05.000Z'));
    });
});

describe('useRetrospectiveRealtimeSync', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConnectRealtimeClient.mockImplementation(() => ({ close: vi.fn() }));
    });

    it('starts in a loading state and calls getBoardState + joinBoard via the realtime client onConnect', async () => {
        const state = baseState();
        mockGetBoardState.mockResolvedValue(state);
        mockJoinBoard.mockResolvedValue({ id: 'p1', name: 'Me', userId: 'u1', retrospectiveId: 'r1', joinedAt: new Date(), photoURL: null });

        const { result } = renderHook(() => useRetrospectiveRealtimeSync('r1'));
        expect(result.current.loading).toBe(true);

        expect(mockConnectRealtimeClient).toHaveBeenCalledWith('r1', expect.objectContaining({ onConnect: expect.any(Function), onEvent: expect.any(Function) }));

        const onConnect = mockConnectRealtimeClient.mock.calls[0][1].onConnect as () => Promise<void>;
        await onConnect();

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.board?.id).toBe('r1');
        expect(mockGetBoardState).toHaveBeenCalledWith('r1');
        expect(mockJoinBoard).toHaveBeenCalledWith('r1');
    });

    it('awaits joinBoard() to fully complete before calling getBoardState() — a concurrent Promise.all previously let the state fetch race ahead of the join and return a snapshot missing the caller\'s own participant record', async () => {
        const callOrder: string[] = [];
        mockJoinBoard.mockImplementation(async () => {
            callOrder.push('joinBoard-start');
            await new Promise((resolve) => setTimeout(resolve, 10));
            callOrder.push('joinBoard-end');
            return { id: 'p1', name: 'Me', userId: 'u1', retrospectiveId: 'r1', joinedAt: new Date(), photoURL: null };
        });
        mockGetBoardState.mockImplementation(async () => {
            callOrder.push('getBoardState-start');
            return baseState();
        });

        renderHook(() => useRetrospectiveRealtimeSync('r1'));
        const onConnect = mockConnectRealtimeClient.mock.calls[0][1].onConnect as () => Promise<void>;
        await onConnect();

        expect(callOrder).toEqual(['joinBoard-start', 'joinBoard-end', 'getBoardState-start']);
    });

    it('surfaces a visible error state when the initial load fails', async () => {
        mockGetBoardState.mockRejectedValue(new Error('network down'));
        mockJoinBoard.mockResolvedValue({});

        const { result } = renderHook(() => useRetrospectiveRealtimeSync('r1'));
        const onConnect = mockConnectRealtimeClient.mock.calls[0][1].onConnect as () => Promise<void>;
        await onConnect();

        await waitFor(() => expect(result.current.error).toBe('network down'));
        expect(result.current.loading).toBe(false);
        expect(result.current.notFound).toBe(false);
    });

    it('sets notFound=true when the board has been deleted (a 404 BackendRequestError)', async () => {
        const { BackendRequestError } = await import('@/features/boards/retrospective/services/backendRetrospectiveClient');
        mockGetBoardState.mockRejectedValue(new BackendRequestError('El tablero especificado no existe o no está disponible', 404));
        mockJoinBoard.mockResolvedValue({});

        const { result } = renderHook(() => useRetrospectiveRealtimeSync('r1'));
        const onConnect = mockConnectRealtimeClient.mock.calls[0][1].onConnect as () => Promise<void>;
        await onConnect();

        await waitFor(() => expect(result.current.notFound).toBe(true));
    });

    it('applies a live onEvent update to board state once loaded', async () => {
        const state = baseState();
        mockGetBoardState.mockResolvedValue(state);
        mockJoinBoard.mockResolvedValue({});

        const { result } = renderHook(() => useRetrospectiveRealtimeSync('r1'));
        const { onConnect, onEvent } = mockConnectRealtimeClient.mock.calls[0][1] as { onConnect: () => Promise<void>; onEvent: (e: EntityChangeEvent) => void };
        await onConnect();
        await waitFor(() => expect(result.current.loading).toBe(false));

        onEvent({
            type: 'entity_change',
            entity: 'card',
            op: 'created',
            id: 'c1',
            data: { content: 'live!', column: 'col1', createdBy: 'u1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', retrospectiveId: 'r1', votes: 0, likes: [], reactions: [], order: 0 },
        });

        await waitFor(() => expect(result.current.board?.cards).toHaveLength(1));
    });

    it('closes the realtime client on unmount', () => {
        const close = vi.fn();
        mockConnectRealtimeClient.mockReturnValue({ close });
        mockGetBoardState.mockResolvedValue(baseState());
        mockJoinBoard.mockResolvedValue({});

        const { unmount } = renderHook(() => useRetrospectiveRealtimeSync('r1'));
        unmount();
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('does nothing when retrospectiveId is undefined', () => {
        const { result } = renderHook(() => useRetrospectiveRealtimeSync(undefined));
        expect(result.current.loading).toBe(true);
        expect(mockConnectRealtimeClient).not.toHaveBeenCalled();
    });

    it('tracks a live typingStatus event separately from board.cards', async () => {
        mockGetBoardState.mockResolvedValue(baseState());
        mockJoinBoard.mockResolvedValue({});

        const { result } = renderHook(() => useRetrospectiveRealtimeSync('r1'));
        const { onConnect, onEvent } = mockConnectRealtimeClient.mock.calls[0][1] as { onConnect: () => Promise<void>; onEvent: (e: EntityChangeEvent) => void };
        await onConnect();
        await waitFor(() => expect(result.current.loading).toBe(false));

        onEvent({
            type: 'entity_change',
            entity: 'typingStatus',
            op: 'created',
            id: 'r1_u2_col1',
            data: { userId: 'u2', username: 'Bob', retrospectiveId: 'r1', column: 'col1', timestamp: '2026-01-01T00:00:00.000Z' },
        });

        await waitFor(() => expect(result.current.typingStatuses).toHaveLength(1));
        expect(result.current.board?.cards).toEqual([]);

        onEvent({ type: 'entity_change', entity: 'typingStatus', op: 'deleted', id: 'r1_u2_col1' });
        await waitFor(() => expect(result.current.typingStatuses).toHaveLength(0));
    });
});
