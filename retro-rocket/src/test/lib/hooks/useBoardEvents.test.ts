import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBoardEvents } from '@/lib/hooks/useBoardEvents';

type Listener = (event: { data: string }) => void;

class FakeEventSource {
    static instances: FakeEventSource[] = [];
    url: string;
    closed = false;
    private readonly listeners = new Map<string, Set<Listener>>();

    constructor(url: string, _init?: EventSourceInit) {
        this.url = url;
        FakeEventSource.instances.push(this);
    }

    addEventListener(type: string, listener: Listener): void {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type)!.add(listener);
    }

    removeEventListener(type: string, listener: Listener): void {
        this.listeners.get(type)?.delete(listener);
    }

    close(): void {
        this.closed = true;
    }

    emit(type: string, data: unknown): void {
        const event = { data: JSON.stringify(data) };
        this.listeners.get(type)?.forEach((listener) => listener(event));
    }
}

describe('useBoardEvents', () => {
    beforeEach(() => {
        FakeEventSource.instances = [];
        vi.stubGlobal('EventSource', FakeEventSource);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('does not connect when boardId is undefined', () => {
        renderHook(() => useBoardEvents(undefined, {}));
        expect(FakeEventSource.instances).toHaveLength(0);
    });

    it('connects to the board events endpoint and starts in "connecting" state', () => {
        const { result } = renderHook(() => useBoardEvents('b1', {}));
        expect(FakeEventSource.instances[0].url).toBe('/api/boards/b1/events');
        expect(result.current.connectionState).toBe('connecting');
    });

    it('moves to "connected" on open', () => {
        const { result } = renderHook(() => useBoardEvents('b1', {}));
        act(() => FakeEventSource.instances[0].emit('open', undefined));
        expect(result.current.connectionState).toBe('connected');
    });

    it('calls onSnapshot with the parsed payload and sets "connected"', () => {
        const onSnapshot = vi.fn();
        const { result } = renderHook(() => useBoardEvents('b1', { onSnapshot }));

        act(() => FakeEventSource.instances[0].emit('snapshot', { board: { id: 'b1' } }));

        expect(onSnapshot).toHaveBeenCalledWith({ board: { id: 'b1' } });
        expect(result.current.connectionState).toBe('connected');
    });

    it('dispatches a named incremental event to its registered handler', () => {
        const onCardCreated = vi.fn();
        renderHook(() => useBoardEvents('b1', { on: { 'card.created': onCardCreated } }));

        act(() => FakeEventSource.instances[0].emit('card.created', { id: 'c1' }));

        expect(onCardCreated).toHaveBeenCalledWith({ id: 'c1' });
    });

    it('moves to "reconnecting" on error', () => {
        const { result } = renderHook(() => useBoardEvents('b1', {}));
        act(() => FakeEventSource.instances[0].emit('open', undefined));
        act(() => FakeEventSource.instances[0].emit('error', undefined));
        expect(result.current.connectionState).toBe('reconnecting');
    });

    it('closes the EventSource on unmount', () => {
        const { unmount } = renderHook(() => useBoardEvents('b1', {}));
        const instance = FakeEventSource.instances[0];
        unmount();
        expect(instance.closed).toBe(true);
    });
});
