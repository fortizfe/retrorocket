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

    close(code = 1000): void {
        this.readyState = FakeWebSocket.CLOSED;
        this.onclose?.({ code });
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

    // 045-idle-connection-cleanup, US1: pause()/resume().
    describe('pause() / resume()', () => {
        it('pause() closes the socket with code 1000 and does not schedule a reconnect', async () => {
            const onConnect = vi.fn(async () => {});
            const client = connectRealtimeClient('retro-1', { onConnect, onEvent: vi.fn() }, factory() as unknown as (url: string) => WebSocket);

            const ws = FakeWebSocket.instances[0];
            ws.triggerOpen();
            await vi.waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1));

            client.pause();
            expect(ws.readyState).toBe(FakeWebSocket.CLOSED);

            await vi.advanceTimersByTimeAsync(60_000);
            expect(FakeWebSocket.instances).toHaveLength(1); // no auto-reconnect while paused
        });

        it('resume() reconnects immediately with no backoff delay', async () => {
            const onConnect = vi.fn(async () => {});
            const client = connectRealtimeClient('retro-1', { onConnect, onEvent: vi.fn() }, factory() as unknown as (url: string) => WebSocket);

            FakeWebSocket.instances[0].triggerOpen();
            await vi.waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1));

            client.pause();
            client.resume();
            expect(FakeWebSocket.instances).toHaveLength(2);
        });

        it('resume() is a no-op if the connection is already open', async () => {
            const onConnect = vi.fn(async () => {});
            const client = connectRealtimeClient('retro-1', { onConnect, onEvent: vi.fn() }, factory() as unknown as (url: string) => WebSocket);

            FakeWebSocket.instances[0].triggerOpen();
            await vi.waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1));

            client.resume();
            expect(FakeWebSocket.instances).toHaveLength(1);
        });

        it('a pause()d connection resumes and reconnects after a subsequent transient failure, unaffected by the paused streak', async () => {
            const onConnect = vi.fn(async () => {});
            const client = connectRealtimeClient('retro-1', { onConnect, onEvent: vi.fn() }, factory() as unknown as (url: string) => WebSocket);

            FakeWebSocket.instances[0].triggerOpen();
            await vi.waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1));
            client.pause();
            client.resume();

            FakeWebSocket.instances[1].triggerOpen();
            await vi.waitFor(() => expect(onConnect).toHaveBeenCalledTimes(2));
            FakeWebSocket.instances[1].triggerClose(1006);
            await vi.advanceTimersByTimeAsync(1000); // reset INITIAL_BACKOFF_MS, not some leftover longer delay
            expect(FakeWebSocket.instances).toHaveLength(3);
        });
    });

    // 045-idle-connection-cleanup, US2: terminal close codes + the 5-minute retry budget.
    describe('terminal closes and the retry budget', () => {
        it('does not reconnect after a 4401 (unauthenticated) close and calls onTerminal', async () => {
            const onConnect = vi.fn(async () => {});
            const onTerminal = vi.fn();
            connectRealtimeClient('retro-1', { onConnect, onEvent: vi.fn(), onTerminal }, factory() as unknown as (url: string) => WebSocket);

            FakeWebSocket.instances[0].triggerOpen();
            await vi.waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1));

            FakeWebSocket.instances[0].triggerClose(4401);
            expect(onTerminal).toHaveBeenCalledWith('unauthenticated');

            await vi.advanceTimersByTimeAsync(60_000);
            expect(FakeWebSocket.instances).toHaveLength(1);
        });

        it('does not reconnect after a 4404 (board not found) close and calls onTerminal', async () => {
            const onConnect = vi.fn(async () => {});
            const onTerminal = vi.fn();
            connectRealtimeClient('retro-1', { onConnect, onEvent: vi.fn(), onTerminal }, factory() as unknown as (url: string) => WebSocket);

            FakeWebSocket.instances[0].triggerOpen();
            await vi.waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1));

            FakeWebSocket.instances[0].triggerClose(4404);
            expect(onTerminal).toHaveBeenCalledWith('notFound');

            await vi.advanceTimersByTimeAsync(60_000);
            expect(FakeWebSocket.instances).toHaveLength(1);
        });

        it('stops retrying and calls onRetryExhausted once 5 minutes of total elapsed failure time pass', async () => {
            const onConnect = vi.fn(async () => {});
            const onRetryExhausted = vi.fn();
            connectRealtimeClient('retro-1', { onConnect, onEvent: vi.fn(), onRetryExhausted }, factory() as unknown as (url: string) => WebSocket);

            // Never let onConnect resolve — every attempt just fails immediately. Keep
            // closing each newly-opened socket until the budget check itself (inside
            // the onclose handler) reports exhaustion — bounded by an iteration cap so
            // a real bug here fails fast instead of hanging.
            let instanceIndex = 0;
            while (!onRetryExhausted.mock.calls.length && instanceIndex < 50) {
                FakeWebSocket.instances[instanceIndex].triggerClose(1006);
                instanceIndex++;
                await vi.advanceTimersByTimeAsync(30_000); // MAX_BACKOFF_MS ceiling, well past worst-case doubling
            }

            expect(onRetryExhausted).toHaveBeenCalledTimes(1);
            const countAtExhaustion = FakeWebSocket.instances.length;
            await vi.advanceTimersByTimeAsync(60_000);
            expect(FakeWebSocket.instances).toHaveLength(countAtExhaustion); // no further attempts
        });

        it('resume() after retry exhaustion tries again immediately and resets the budget', async () => {
            const onConnect = vi.fn(async () => {});
            const onRetryExhausted = vi.fn();
            const client = connectRealtimeClient('retro-1', { onConnect, onEvent: vi.fn(), onRetryExhausted }, factory() as unknown as (url: string) => WebSocket);

            let instanceIndex = 0;
            while (!onRetryExhausted.mock.calls.length && instanceIndex < 50) {
                FakeWebSocket.instances[instanceIndex].triggerClose(1006);
                instanceIndex++;
                await vi.advanceTimersByTimeAsync(30_000);
            }
            expect(onRetryExhausted).toHaveBeenCalledTimes(1);

            const countBeforeResume = FakeWebSocket.instances.length;
            client.resume();
            expect(FakeWebSocket.instances).toHaveLength(countBeforeResume + 1);

            FakeWebSocket.instances[FakeWebSocket.instances.length - 1].triggerOpen();
            await vi.waitFor(() => expect(onConnect).toHaveBeenCalled());
        });

        it('a successful reconnection resets the retry budget so a later, independent failure streak gets its own full 5 minutes', async () => {
            const onConnect = vi.fn(async () => {});
            const onRetryExhausted = vi.fn();
            connectRealtimeClient('retro-1', { onConnect, onEvent: vi.fn(), onRetryExhausted }, factory() as unknown as (url: string) => WebSocket);

            FakeWebSocket.instances[0].triggerOpen();
            await vi.waitFor(() => expect(onConnect).toHaveBeenCalledTimes(1));

            // 4 minutes of transient failures — short of the 5-minute budget.
            let instanceIndex = 1;
            const deadline = Date.now() + 4 * 60 * 1000;
            while (Date.now() < deadline && instanceIndex < 50) {
                FakeWebSocket.instances[instanceIndex - 1].triggerClose(1006);
                instanceIndex++;
                await vi.advanceTimersByTimeAsync(30_000);
            }
            expect(onRetryExhausted).not.toHaveBeenCalled();

            // A successful open now resets the budget clock.
            FakeWebSocket.instances[FakeWebSocket.instances.length - 1].triggerOpen();
            await vi.waitFor(() => expect(onConnect).toHaveBeenCalledTimes(2));

            // Another ~4 minutes of failures should still not exhaust the budget, since
            // it restarted from the successful open above.
            const secondDeadline = Date.now() + 4 * 60 * 1000;
            while (Date.now() < secondDeadline && instanceIndex < 100) {
                FakeWebSocket.instances[instanceIndex - 1].triggerClose(1006);
                instanceIndex++;
                await vi.advanceTimersByTimeAsync(30_000);
            }
            expect(onRetryExhausted).not.toHaveBeenCalled();
        });
    });
});
