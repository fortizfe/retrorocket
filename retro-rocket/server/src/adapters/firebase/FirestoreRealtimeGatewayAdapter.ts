import type { DocumentChangeType, Firestore } from 'firebase-admin/firestore';
import type { RealtimeConnection, RealtimeEntity, RealtimeEvent, RealtimeGatewayPort, RealtimeOp } from '../../application/ports/realtime';

type Unsubscribe = () => void;

const CARDS = 'cards';
const GROUPS = 'groups';
const ACTION_ITEMS = 'actionItems';
const RETROSPECTIVES = 'retrospectives';
const FACILITATOR_NOTES = 'facilitatorNotes';
const TYPING_STATUS = 'typingStatus';
const PARTICIPANTS = 'participants';
const COUNTDOWN_TIMERS = 'countdown_timers';

/** Server-enforced hard TTL for typing-status docs — the only mechanism that clears a
 * typing indicator when a participant disconnects without sending an explicit stop
 * (feature 026, research.md §3). Bounded at 3s/500ms so a disconnected participant's
 * indicator clears for other viewers within ~3.5s worst case, matching the client's own
 * 3-second inactivity grace period (useTypingStatus.ts). */
const TYPING_STATUS_TTL_MS = 3000;
const TYPING_STATUS_SWEEP_INTERVAL_MS = 500;

/**
 * Exported so this pure Firestore-docChanges()-to-wire-event translation logic can be
 * unit-tested directly — the rest of the adapter is thin firebase-admin listener/
 * WebSocket-relay composition that, consistent with FirestoreBoardsAdapter/
 * FirestoreProfileAdapter elsewhere in this codebase, is verified end-to-end by the
 * Playwright E2E suite against the emulator rather than mocked at the Vitest level.
 */
export function toOp(changeType: DocumentChangeType): RealtimeOp {
    switch (changeType) {
        case 'added':
            return 'created';
        case 'modified':
            return 'updated';
        case 'removed':
            return 'deleted';
    }
}

/**
 * Recursively converts every Firestore Timestamp-like value (and plain Date) reachable
 * from `value` into an ISO-8601 string, walking arrays and plain objects. Without this,
 * a raw `doc.data()` payload would serialize Timestamps as `{ _seconds, _nanoseconds }`
 * over JSON.stringify — this keeps every wire event's `data` shaped exactly like the
 * REST GET response for that entity type, per contracts/realtime-protocol.md, without
 * the gateway needing to import each story-specific adapter's own mapping function.
 */
export function serializeFirestoreValue(value: unknown): unknown {
    if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate().toISOString();
    }
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(serializeFirestoreValue);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serializeFirestoreValue(v)]));
    }
    return value;
}

export function toEntityChangeEvent(
    entity: RealtimeEntity,
    changeType: DocumentChangeType,
    id: string,
    data: Record<string, unknown> | undefined,
): RealtimeEvent {
    const op = toOp(changeType);
    if (op === 'deleted') return { type: 'entity_change', entity, op, id };
    const serialized = data ? { id, ...(serializeFirestoreValue(data) as Record<string, unknown>) } : data;
    return { type: 'entity_change', entity, op, id, data: serialized };
}

/** facilitatorNote events are only ever delivered to the connection whose uid matches
 * the note's facilitatorId (FR-013's visibility scoping applied over the wire). */
export function isVisibleToConnection(entity: RealtimeEntity, data: Record<string, unknown> | undefined, connectionUid: string): boolean {
    if (entity !== 'facilitatorNote') return true;
    return data?.facilitatorId === connectionUid;
}

function toDate(value: unknown): Date {
    if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    return value instanceof Date ? value : new Date(value as string);
}

interface BoardWatch {
    connections: Set<RealtimeConnection>;
    unsubscribers: Unsubscribe[];
    sweepInterval: ReturnType<typeof setInterval>;
}

/**
 * Per-board, reference-counted server-side Firestore listeners relaying translated
 * change events to registered WebSocket connections (research.md §1). The single
 * concrete implementation of RealtimeGatewayPort.
 */
export class FirestoreRealtimeGatewayAdapter implements RealtimeGatewayPort {
    private readonly boards = new Map<string, BoardWatch>();

    constructor(private readonly db: Firestore) {}

    register(connection: RealtimeConnection): void {
        const { retrospectiveId } = connection;
        let watch = this.boards.get(retrospectiveId);
        if (!watch) {
            watch = this.startWatch(retrospectiveId);
            this.boards.set(retrospectiveId, watch);
        }
        watch.connections.add(connection);
    }

    unregister(connection: RealtimeConnection): void {
        const watch = this.boards.get(connection.retrospectiveId);
        if (!watch) return;
        watch.connections.delete(connection);
        if (watch.connections.size === 0) {
            for (const unsubscribe of watch.unsubscribers) unsubscribe();
            clearInterval(watch.sweepInterval);
            this.boards.delete(connection.retrospectiveId);
        }
    }

    private broadcast(retrospectiveId: string, entity: RealtimeEntity, changeType: DocumentChangeType, id: string, data: Record<string, unknown> | undefined): void {
        const watch = this.boards.get(retrospectiveId);
        if (!watch) return;
        for (const connection of watch.connections) {
            if (!isVisibleToConnection(entity, data, connection.uid)) continue;
            connection.send(toEntityChangeEvent(entity, changeType, id, data));
        }
    }

    private watchCollection(retrospectiveId: string, collection: string, entity: RealtimeEntity, field = 'retrospectiveId'): Unsubscribe {
        return this.db
            .collection(collection)
            .where(field, '==', retrospectiveId)
            .onSnapshot((snapshot) => {
                for (const change of snapshot.docChanges()) {
                    this.broadcast(retrospectiveId, entity, change.type, change.doc.id, change.doc.data());
                }
            });
    }

    private startWatch(retrospectiveId: string): BoardWatch {
        const unsubscribers: Unsubscribe[] = [
            this.watchCollection(retrospectiveId, CARDS, 'card'),
            this.watchCollection(retrospectiveId, GROUPS, 'group'),
            this.watchCollection(retrospectiveId, ACTION_ITEMS, 'actionItem'),
            this.watchCollection(retrospectiveId, FACILITATOR_NOTES, 'facilitatorNote'),
            this.watchCollection(retrospectiveId, TYPING_STATUS, 'typingStatus'),
            this.watchCollection(retrospectiveId, PARTICIPANTS, 'participant'),
            this.db.collection(RETROSPECTIVES).doc(retrospectiveId).onSnapshot((snap) => {
                if (!snap.exists) return;
                this.broadcast(retrospectiveId, 'retrospective', 'modified', snap.id, snap.data());
            }),
            this.db.collection(COUNTDOWN_TIMERS).doc(retrospectiveId).onSnapshot((snap) => {
                this.broadcast(retrospectiveId, 'timer', snap.exists ? 'modified' : 'removed', snap.id, snap.data());
            }),
        ];

        const sweepInterval = setInterval(() => {
            void this.sweepStaleTyping(retrospectiveId);
        }, TYPING_STATUS_SWEEP_INTERVAL_MS);

        return { connections: new Set(), unsubscribers, sweepInterval };
    }

    /** Deletes typingStatus docs older than the 5000ms TTL — server-side enforcement
     * independent of any client's own debounce timing (data-model.md). */
    private async sweepStaleTyping(retrospectiveId: string): Promise<void> {
        const now = Date.now();
        const snap = await this.db.collection(TYPING_STATUS).where('retrospectiveId', '==', retrospectiveId).get();
        const stale = snap.docs.filter((doc) => now - toDate(doc.data().timestamp).getTime() > TYPING_STATUS_TTL_MS);
        if (stale.length === 0) return;
        const batch = this.db.batch();
        for (const doc of stale) batch.delete(doc.ref);
        await batch.commit();
    }
}
