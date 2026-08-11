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
 * (feature 026, research.md §3). Bounded at 3s so a disconnected participant's
 * indicator clears for other viewers within ~3.5s worst case, matching the client's own
 * 3-second inactivity grace period (useTypingStatus.ts). The sweep that enforces this
 * TTL is event-driven (040, US2): scheduled from the typingStatus listener's own
 * observed writes instead of an unconditional fixed-interval poll, eliminating the
 * background cost while a board is open but idle. */
const TYPING_STATUS_TTL_MS = 3000;

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

/** Milliseconds from `now` until `writeTimestamp + ttlMs`, clamped to 0 if already
 * past. Pure decision logic behind the event-driven sweep schedule (040, US2) —
 * exported so it can be unit-tested directly, mirroring toOp/toEntityChangeEvent. */
export function computeSweepDelayMs(writeTimestamp: Date, now: Date, ttlMs: number): number {
    return Math.max(0, writeTimestamp.getTime() + ttlMs - now.getTime());
}

/** Raw translated-change callback fed by startFirestoreBoardListeners — same shape as
 * FirestoreRealtimeGatewayAdapter's own private broadcast() took before the 040/US3
 * extraction, just decoupled from "deliver to local connections" so a caller can redirect
 * it (e.g. to Redis publish) instead. */
export type FirestoreChangeSink = (entity: RealtimeEntity, changeType: DocumentChangeType, id: string, data: Record<string, unknown> | undefined) => void;

export interface FirestoreBoardListenerSet {
    unsubscribe(): void;
}

/**
 * Owns the Firestore onSnapshot listeners + event-driven typing-status sweep for a
 * single board, invoking `onEvent` for every translated change instead of delivering
 * directly to WebSocket connections. Extracted from FirestoreRealtimeGatewayAdapter
 * (040, research.md §6) so Story 3's CoordinatedRealtimeGatewayAdapter can redirect the
 * board's owning instance's translated events to Redis pub/sub, reusing the exact same
 * listener-composition and sweep-scheduling logic instead of duplicating it.
 * FirestoreRealtimeGatewayAdapter itself uses this with `onEvent` wired straight to its
 * own local broadcast — its behavior is unchanged by this extraction.
 */
export function startFirestoreBoardListeners(db: Firestore, retrospectiveId: string, onEvent: FirestoreChangeSink): FirestoreBoardListenerSet {
    let pendingSweep: ReturnType<typeof setTimeout> | undefined;

    function watchCollection(collection: string, entity: RealtimeEntity, field = 'retrospectiveId'): Unsubscribe {
        return db
            .collection(collection)
            .where(field, '==', retrospectiveId)
            .onSnapshot((snapshot) => {
                for (const change of snapshot.docChanges()) {
                    onEvent(entity, change.type, change.doc.id, change.doc.data());
                }
            });
    }

    /** Like watchCollection, but for typingStatus specifically: every observed write
     * also (re)schedules the TTL sweep (040, US2) — an event-driven timer anchored to
     * real activity instead of an unconditional fixed-interval poll. Any previously
     * pending sweep is cleared first so repeated writes reschedule a single timer
     * rather than accumulating parallel ones. */
    function watchTypingStatus(): Unsubscribe {
        return db
            .collection(TYPING_STATUS)
            .where('retrospectiveId', '==', retrospectiveId)
            .onSnapshot((snapshot) => {
                const changes = snapshot.docChanges();
                for (const change of changes) {
                    onEvent('typingStatus', change.type, change.doc.id, change.doc.data());
                }
                // Only an actual write (added/modified) needs a future staleness check
                // scheduled — a 'removed' change (including one caused by the sweep's
                // own delete) has nothing left to sweep, and rescheduling from it would
                // just trigger an immediate, empty follow-up sweep query.
                const writes = changes.filter((change) => change.type !== 'removed');
                if (writes.length === 0) return;
                const latestWrite = writes.reduce((latest, change) => {
                    const timestamp = toDate(change.doc.data().timestamp);
                    return timestamp > latest ? timestamp : latest;
                }, new Date(0));
                clearTimeout(pendingSweep);
                const delay = computeSweepDelayMs(latestWrite, new Date(), TYPING_STATUS_TTL_MS);
                pendingSweep = setTimeout(() => {
                    void sweepStaleTyping(db, retrospectiveId);
                }, delay);
            });
    }

    const unsubscribers: Unsubscribe[] = [
        watchCollection(CARDS, 'card'),
        watchCollection(GROUPS, 'group'),
        watchCollection(ACTION_ITEMS, 'actionItem'),
        watchCollection(FACILITATOR_NOTES, 'facilitatorNote'),
        watchTypingStatus(),
        watchCollection(PARTICIPANTS, 'participant'),
        db.collection(RETROSPECTIVES).doc(retrospectiveId).onSnapshot((snap) => {
            if (!snap.exists) return;
            onEvent('retrospective', 'modified', snap.id, snap.data());
        }),
        db.collection(COUNTDOWN_TIMERS).doc(retrospectiveId).onSnapshot((snap) => {
            onEvent('timer', snap.exists ? 'modified' : 'removed', snap.id, snap.data());
        }),
    ];

    return {
        unsubscribe() {
            for (const unsubscribe of unsubscribers) unsubscribe();
            clearTimeout(pendingSweep);
        },
    };
}

/** Deletes typingStatus docs older than the TTL — server-side enforcement independent
 * of any client's own debounce timing (data-model.md). Module-level (not a method) so
 * startFirestoreBoardListeners can call it without needing a class instance. */
async function sweepStaleTyping(db: Firestore, retrospectiveId: string): Promise<void> {
    const now = Date.now();
    const snap = await db.collection(TYPING_STATUS).where('retrospectiveId', '==', retrospectiveId).get();
    const stale = snap.docs.filter((doc) => now - toDate(doc.data().timestamp).getTime() > TYPING_STATUS_TTL_MS);
    if (stale.length === 0) return;
    const batch = db.batch();
    for (const doc of stale) batch.delete(doc.ref);
    await batch.commit();
}

interface BoardWatch {
    connections: Set<RealtimeConnection>;
    listeners: FirestoreBoardListenerSet;
}

/**
 * Per-board, reference-counted server-side Firestore listeners relaying translated
 * change events to registered WebSocket connections (research.md §1). The default,
 * uncoordinated implementation of RealtimeGatewayPort — used directly when Story 3's
 * Redis coordination (040) isn't configured (`REDIS_URL` absent), and internally by
 * CoordinatedRealtimeGatewayAdapter's fail-open fallback when Redis is temporarily
 * unreachable.
 */
export class FirestoreRealtimeGatewayAdapter implements RealtimeGatewayPort {
    private readonly boards = new Map<string, BoardWatch>();

    constructor(private readonly db: Firestore) {}

    register(connection: RealtimeConnection): void {
        const { retrospectiveId } = connection;
        let watch = this.boards.get(retrospectiveId);
        if (!watch) {
            const listeners = startFirestoreBoardListeners(this.db, retrospectiveId, (entity, changeType, id, data) => {
                this.broadcast(retrospectiveId, entity, changeType, id, data);
            });
            watch = { connections: new Set(), listeners };
            this.boards.set(retrospectiveId, watch);
        }
        watch.connections.add(connection);
    }

    unregister(connection: RealtimeConnection): void {
        const watch = this.boards.get(connection.retrospectiveId);
        if (!watch) return;
        watch.connections.delete(connection);
        if (watch.connections.size === 0) {
            watch.listeners.unsubscribe();
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
}
