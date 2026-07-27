import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import { FirestoreRealtimeRelay, type RelaySource } from '../../../src/adapters/firebase/FirestoreRealtimeRelay';

function fakeResponse(): { res: Response; writes: string[]; headers: Record<string, string> } {
    const writes: string[] = [];
    const headers: Record<string, string> = {};
    const res = {
        setHeader: (key: string, value: string) => {
            headers[key] = value;
        },
        flushHeaders: () => {},
        write: (chunk: string) => {
            writes.push(chunk);
            return true;
        },
    } as unknown as Response;
    return { res, writes, headers };
}

describe('FirestoreRealtimeRelay', () => {
    it('sends an initial snapshot event as text/event-stream', async () => {
        const { res, writes, headers } = fakeResponse();
        const relay = new FirestoreRealtimeRelay();

        const cleanup = await relay.connect(res, { getSnapshot: async () => ({ board: { id: 'b1' } }), sources: [] });

        expect(headers['Content-Type']).toBe('text/event-stream');
        expect(writes[0]).toBe(`event: snapshot\ndata: ${JSON.stringify({ board: { id: 'b1' } })}\n\n`);
        cleanup();
    });

    it("translates a source's change into its named incremental SSE event", async () => {
        const { res, writes } = fakeResponse();
        const relay = new FirestoreRealtimeRelay();
        let emit: (data: unknown) => void = () => {};

        const source: RelaySource = {
            event: 'card',
            subscribe: (onData) => {
                emit = onData;
                return () => {};
            },
        };

        const cleanup = await relay.connect(res, { getSnapshot: async () => ({}), sources: [source] });
        emit({ id: 'c1' });

        expect(writes).toContain(`event: card\ndata: ${JSON.stringify({ id: 'c1' })}\n\n`);
        cleanup();
    });

    it('sends a heartbeat comment line on the configured cadence', async () => {
        vi.useFakeTimers();
        try {
            const { res, writes } = fakeResponse();
            const relay = new FirestoreRealtimeRelay();

            const cleanup = await relay.connect(res, { getSnapshot: async () => ({}), sources: [], heartbeatIntervalMs: 1000 });
            await vi.advanceTimersByTimeAsync(3500);

            expect(writes.filter((w) => w === ': heartbeat\n\n')).toHaveLength(3);
            cleanup();
        } finally {
            vi.useRealTimers();
        }
    });

    it('unsubscribes every source and stops the heartbeat on cleanup', async () => {
        vi.useFakeTimers();
        try {
            const { res, writes } = fakeResponse();
            const relay = new FirestoreRealtimeRelay();
            const unsubscribe = vi.fn();
            const source: RelaySource = { event: 'card', subscribe: () => unsubscribe };

            const cleanup = await relay.connect(res, { getSnapshot: async () => ({}), sources: [source] });
            cleanup();
            expect(unsubscribe).toHaveBeenCalledOnce();

            const writesAtCleanup = writes.length;
            await vi.advanceTimersByTimeAsync(60_000);
            expect(writes.length).toBe(writesAtCleanup);
        } finally {
            vi.useRealTimers();
        }
    });
});
