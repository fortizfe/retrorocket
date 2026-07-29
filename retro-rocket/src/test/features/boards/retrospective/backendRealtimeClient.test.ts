import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectRealtimeClient, type EntityChangeEvent } from '@/features/boards/retrospective/services/backendRealtimeClient';

class FakeWebSocket {
    static instances: FakeWebSocket[] = [];
    static readonly OPEN = 1;
    static readonly CLOSED = 3;
    readyState = 0;
    onopen: (() => void) | null = null;
    onclose: ((event: { code: number }) => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    sent: string[] = [];
    readonly url: string;

    constructor(url: string) {
        this.url = url;
        FakeWebSocket.instances.push(this);
    }

    send(data: string): void {
        this.sent.push(data);
    }

    close(): void {
        this.readyState = FakeWebSocket.CLOSED;
        this.onclose?.({ code: 1000 });
    }

    triggerOpen(): void {
        this.readyState = FakeWebSocket.OPEN;
        this.onopen?.();
    }

    triggerMessage(data: unknown): void {
        this.onmessage?.({ data: JSON.stringify(data) });
    }

    triggerClose(code = 1006): void {
        this.readyState = FakeWebSocket.CLOSED;
        this.onclose?.({ code });
    }
}

function factory(): (url: string) => FakeWebSocket {
    return (url: string) => new FakeWebSocket(url);
}

const sampleEvent: EntityChangeEvent = { type: 'entity_change', entity: 'card', op: 'created', id: 'c1', data: { content: 'hi' } };

describe('connectRealtimeClient', () => {
    beforeEach(() => {
        FakeWebSocket.instances = [];
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('opens a connection and calls onConnect on open', async () => {
        const onConnect = vi.fn(async () => {});
        const onEvent = vi.fn();
        connectRealtimeClient('retro-1', { onConnect, onEvent }, factory() as unknown as (url: string) => WebSocket);

        const ws = FakeWebSocket.instances[0];
        expect(ws.url).toContain('/api/retrospectives/retro-1/live');
        ws.triggerOpen();
        await vi.waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1));
    });

    it('dispatches entity_change messages to onEvent after resync completes', async () => {
        let resolveConnect!: () => void;
        const onConnect = vi.fn(() => new Promise<void>((resolve) => (resolveConnect = resolve)));
        const onEvent = vi.fn();
        connectRealtimeClient('retro-1', { onConnect, onEvent }, factory() as unknown as (url: string) => WebSocket);

        const ws = FakeWebSocket.instances[0];
        ws.triggerOpen();

        // An event arriving before the resync (onConnect) resolves must NOT be dispatched
        // — the impending REST resync already reflects (or will be superseded by) it.
        ws.triggerMessage(sampleEvent);
        expect(onEvent).not.toHaveBeenCalled();

        resolveConnect();
        await vi.waitFor(() => {});
        await Promise.resolve();
        await Promise.resolve();

        ws.triggerMessage(sampleEvent);
        expect(onEvent).toHaveBeenCalledWith(sampleEvent);
    });

    it('reconnects with exponential backoff after an unexpected close', async () => {
        const onConnect = vi.fn(async () => {});
        connectRealtimeClient('retro-1', { onConnect, onEvent: vi.fn() }, factory() as unknown as (url: string) => WebSocket);

        FakeWebSocket.instances[0].triggerOpen();
        await vi.waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1));

        FakeWebSocket.instances[0].triggerClose(1006);
        expect(FakeWebSocket.instances).toHaveLength(1); // no immediate reconnect

        await vi.advanceTimersByTimeAsync(999);
        expect(FakeWebSocket.instances).toHaveLength(1); // not yet — 1000ms initial backoff
        await vi.advanceTimersByTimeAsync(1);
        expect(FakeWebSocket.instances).toHaveLength(2);

        // A second consecutive failure (this reconnect attempt never successfully opens)
        // doubles the backoff to 2000ms rather than resetting to the 1000ms initial value.
        FakeWebSocket.instances[1].triggerClose(1006);
        await vi.advanceTimersByTimeAsync(1999);
        expect(FakeWebSocket.instances).toHaveLength(2);
        await vi.advanceTimersByTimeAsync(1);
        expect(FakeWebSocket.instances).toHaveLength(3);

        // A successful open resets the backoff back to 1000ms for the next disconnect.
        FakeWebSocket.instances[2].triggerOpen();
        await vi.waitFor(() => expect(onConnect).toHaveBeenCalledTimes(2));
        FakeWebSocket.instances[2].triggerClose(1006);
        await vi.advanceTimersByTimeAsync(1000);
        expect(FakeWebSocket.instances).toHaveLength(4);
    });

    it('does not reconnect after an intentional close() call', async () => {
        const onConnect = vi.fn(async () => {});
        const client = connectRealtimeClient('retro-1', { onConnect, onEvent: vi.fn() }, factory() as unknown as (url: string) => WebSocket);

        FakeWebSocket.instances[0].triggerOpen();
        await vi.waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1));

        client.close();
        await vi.advanceTimersByTimeAsync(60_000);
        expect(FakeWebSocket.instances).toHaveLength(1);
    });

    it('sends a heartbeat ping on an interval while connected', async () => {
        const onConnect = vi.fn(async () => {});
        connectRealtimeClient('retro-1', { onConnect, onEvent: vi.fn() }, factory() as unknown as (url: string) => WebSocket);

        const ws = FakeWebSocket.instances[0];
        ws.triggerOpen();
        await vi.waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1));

        await vi.advanceTimersByTimeAsync(15_000);
        expect(ws.sent).toContainEqual(JSON.stringify({ type: 'ping' }));
    });
});
