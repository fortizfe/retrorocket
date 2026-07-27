import type { Response } from 'express';
import type { DocumentReference, Query } from 'firebase-admin/firestore';

/**
 * One named real-time channel feeding the SSE stream. `event` is the SSE `event:` name
 * (contracts/realtime-events.md); `subscribe` starts listening and returns an unsubscribe
 * function. Kept Firestore-agnostic so the relay itself is unit-testable with plain fakes
 * (research.md §1) — `docSource`/`collectionSource` below are the Firestore-specific
 * adapters that implement this interface over the Admin SDK's real-time listeners.
 */
export interface RelaySource {
    event: string;
    subscribe(onData: (data: unknown) => void, onError: (err: Error) => void): () => void;
}

export interface RealtimeRelayOptions {
    /** Computed once per connection and sent as the initial `snapshot` event. */
    getSnapshot(): Promise<Record<string, unknown>>;
    sources: RelaySource[];
    /** ms between heartbeat comment lines; defaults to 15s. */
    heartbeatIntervalMs?: number;
}

const DEFAULT_HEARTBEAT_MS = 15_000;

/**
 * Per-connection SSE relay (contracts/realtime-events.md). One instance serves one
 * `GET /api/boards/:id/events` connection: sends an initial `snapshot`, then forwards each
 * source's changes as a named incremental event, plus a periodic heartbeat comment so the
 * frontend can distinguish "quiet but connected" from a dead connection (FR-009/FR-011).
 */
export class FirestoreRealtimeRelay {
    async connect(res: Response, options: RealtimeRelayOptions): Promise<() => void> {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        const write = (event: string, data: unknown): void => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        const snapshot = await options.getSnapshot();
        write('snapshot', snapshot);

        const unsubscribes = options.sources.map((source) =>
            source.subscribe(
                (data) => write(source.event, data),
                () => {
                    // Best-effort: a source-level error only stops that one source; the
                    // connection stays open (other sources + heartbeat keep flowing).
                },
            ),
        );

        const heartbeat = setInterval(() => {
            res.write(': heartbeat\n\n');
        }, options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_MS);

        return () => {
            clearInterval(heartbeat);
            for (const unsubscribe of unsubscribes) unsubscribe();
        };
    }
}

/** Wraps a single Firestore document's real-time listener as a RelaySource. */
export function docSource<T>(
    event: string,
    ref: DocumentReference,
    mapDoc: (data: FirebaseFirestore.DocumentData | undefined, exists: boolean) => T,
): RelaySource {
    return {
        event,
        subscribe(onData, onError) {
            return ref.onSnapshot((snap) => onData(mapDoc(snap.data(), snap.exists)), onError);
        },
    };
}

/** Wraps a Firestore query's real-time listener (whole result set per change) as a RelaySource. */
export function collectionSource<T>(
    event: string,
    query: Query,
    mapDocs: (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => T,
): RelaySource {
    return {
        event,
        subscribe(onData, onError) {
            return query.onSnapshot((snap) => onData(mapDocs(snap.docs)), onError);
        },
    };
}
