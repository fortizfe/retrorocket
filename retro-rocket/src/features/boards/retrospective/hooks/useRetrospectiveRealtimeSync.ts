import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuthContext } from '@/lib/contexts/useUserContext';
import { connectRealtimeClient, type EntityChangeEvent, type RealtimeClient } from '../services/backendRealtimeClient';
import { onHiddenFor } from '../services/documentVisibility';
import {
    BackendRequestError,
    getBoardState,
    joinBoard,
    type ActionItem,
    type Card,
    type CardGroup,
    type CountdownTimer,
    type FacilitatorNote,
    type Participant,
    type RetrospectiveState,
} from '../services/backendRetrospectiveClient';

/** Time a backgrounded tab is given before its realtime connection is paused
 * (045-idle-connection-cleanup, FR-001, fixed via /speckit-clarify — not configurable). */
const BACKGROUND_GRACE_MS = 120_000;

/**
 * The single hook owning this screen's board state (US1): fetches full state + joins
 * on mount, opens the live channel, and generically reduces every entity_change event
 * into that state — built generically now (T035) so no later story needs to touch
 * this event-dispatch switch, only its own write calls.
 */
export interface RetrospectiveRealtimeSync {
    board: RetrospectiveState | null;
    loading: boolean;
    error: string | null;
    /** True once the backend has confirmed the board no longer exists (US1 Acceptance
     * Scenario 4) — distinct from a transient load error. */
    notFound: boolean;
    /** Live typing signals (US3) — not part of RetrospectiveState/GetBoardState's
     * response (data-model.md's typingStatus is a short-lived, WS-only signal), so
     * tracked as its own slice alongside `board` rather than through applyEntityChange. */
    typingStatuses: TypingStatusEntry[];
    /** True once the automatic reconnect budget has been exhausted after a prolonged
     * network failure (045-idle-connection-cleanup, US2/FR-004) — distinct from
     * `notFound`/`error`, since the board may still be perfectly valid and cached data
     * (`board`) remains showable; only live updates are paused until retryConnection()
     * is called. */
    connectionLost: boolean;
    /** Manually retries the realtime connection after `connectionLost` — resets the
     * automatic retry budget and reconnects immediately. */
    retryConnection: () => void;
}

export interface TypingStatusEntry {
    id: string;
    userId: string;
    username: string;
    retrospectiveId: string;
    column: string;
    timestamp: Date;
}

function upsertById<T extends { id: string }>(list: T[], id: string, item: T | undefined, op: EntityChangeEvent['op']): T[] {
    if (op === 'deleted' || !item) return list.filter((existing) => existing.id !== id);
    const index = list.findIndex((existing) => existing.id === id);
    if (index === -1) return [...list, item];
    return list.map((existing, i) => (i === index ? item : existing));
}

function withId(event: EntityChangeEvent): (Record<string, unknown> & { id: string }) | undefined {
    return event.data ? { ...event.data, id: event.id } : undefined;
}

/**
 * Pure reducer applying one live entity_change event onto the current board state.
 * Exported for direct unit testing. Casts event.data (Record<string, unknown>, already
 * shaped like the REST GET response for that entity per contracts/realtime-protocol.md)
 * into the corresponding client-facing type; Date fields arrive as ISO strings over the
 * wire exactly like the REST responses, and the *FromDTO mappers aren't exported from
 * backendRetrospectiveClient.ts, so date-bearing fields are parsed inline below.
 */
export function applyEntityChange(state: RetrospectiveState, event: EntityChangeEvent): RetrospectiveState {
    const raw = withId(event);

    switch (event.entity) {
        case 'card': {
            const card = raw ? (parseCard(raw) as Card) : undefined;
            return { ...state, cards: upsertById(state.cards, event.id, card, event.op) };
        }
        case 'group': {
            const group = raw ? (parseGroup(raw) as CardGroup) : undefined;
            return { ...state, groups: upsertById(state.groups, event.id, group, event.op) };
        }
        case 'actionItem': {
            const item = raw ? (parseActionItem(raw) as ActionItem) : undefined;
            return { ...state, actionItems: upsertById(state.actionItems, event.id, item, event.op) };
        }
        case 'participant': {
            const participant = raw ? (parseParticipant(raw) as Participant) : undefined;
            return { ...state, participants: upsertById(state.participants, event.id, participant, event.op) };
        }
        case 'facilitatorNote': {
            const note = raw ? (parseNote(raw) as FacilitatorNote) : undefined;
            return { ...state, myFacilitatorNotes: upsertById(state.myFacilitatorNotes, event.id, note, event.op) };
        }
        case 'timer': {
            const timer = raw ? (parseTimer(raw) as CountdownTimer) : null;
            return { ...state, timer: event.op === 'deleted' ? null : timer };
        }
        case 'retrospective': {
            if (event.op === 'deleted' || !event.data) return state;
            return { ...state, ...parseRetrospectiveFields(event.data) };
        }
        case 'typingStatus':
            // Typing indicators are owned by US3's separate typing-state slice, not
            // this board-state reducer — see applyTypingStatusChange below.
            return state;
        default:
            return state;
    }
}

/** Sibling reducer for the typing-status slice (US3) — same upsert-by-id shape as
 * applyEntityChange, but operates on TypingStatusEntry[], not RetrospectiveState. */
export function applyTypingStatusChange(typingStatuses: TypingStatusEntry[], event: EntityChangeEvent): TypingStatusEntry[] {
    if (event.entity !== 'typingStatus') return typingStatuses;
    const raw = withId(event);
    const entry = raw ? (parseTypingStatus(raw) as TypingStatusEntry) : undefined;
    return upsertById(typingStatuses, event.id, entry, event.op);
}

function parseTypingStatus(raw: Record<string, unknown>): TypingStatusEntry {
    return { ...raw, timestamp: new Date(raw.timestamp as string) } as unknown as TypingStatusEntry;
}

function parseCard(raw: Record<string, unknown>): Card {
    return {
        ...raw,
        createdAt: new Date(raw.createdAt as string),
        updatedAt: new Date(raw.updatedAt as string),
        likes: ((raw.likes as Array<Record<string, unknown>>) ?? []).map((l) => ({ ...l, timestamp: new Date(l.timestamp as string) })) as Card['likes'],
        reactions: ((raw.reactions as Array<Record<string, unknown>>) ?? []).map((r) => ({ ...r, timestamp: new Date(r.timestamp as string) })) as Card['reactions'],
    } as unknown as Card;
}

function parseGroup(raw: Record<string, unknown>): CardGroup {
    return { ...raw, createdAt: new Date(raw.createdAt as string) } as unknown as CardGroup;
}

function parseActionItem(raw: Record<string, unknown>): ActionItem {
    return {
        ...raw,
        createdAt: new Date(raw.createdAt as string),
        updatedAt: new Date(raw.updatedAt as string),
        dueDate: raw.dueDate ? new Date(raw.dueDate as string) : null,
    } as unknown as ActionItem;
}

function parseParticipant(raw: Record<string, unknown>): Participant {
    return { ...raw, joinedAt: new Date(raw.joinedAt as string) } as unknown as Participant;
}

function parseNote(raw: Record<string, unknown>): FacilitatorNote {
    return { ...raw, timestamp: new Date(raw.timestamp as string) } as unknown as FacilitatorNote;
}

function parseTimer(raw: Record<string, unknown>): CountdownTimer {
    return {
        ...raw,
        startTime: raw.startTime ? new Date(raw.startTime as string) : null,
        endTime: raw.endTime ? new Date(raw.endTime as string) : null,
        createdAt: new Date(raw.createdAt as string),
        updatedAt: new Date(raw.updatedAt as string),
    } as unknown as CountdownTimer;
}

function parseRetrospectiveFields(raw: Record<string, unknown>): Partial<RetrospectiveState> {
    const fields: Partial<RetrospectiveState> = {
        title: raw.title as string,
        description: raw.description as string | undefined,
        participantCount: raw.participantCount as number,
        isActive: raw.isActive as boolean,
        columnGroupingStates: (raw.columnGroupingStates as RetrospectiveState['columnGroupingStates']) ?? {},
    };
    if (raw.updatedAt) fields.updatedAt = new Date(raw.updatedAt as string);
    return fields;
}

function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export function useRetrospectiveRealtimeSync(retrospectiveId: string | undefined): RetrospectiveRealtimeSync {
    const { t } = useTranslation();
    const { signOut } = useAuthContext();
    const [board, setBoard] = useState<RetrospectiveState | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [connectionLost, setConnectionLost] = useState(false);
    const [typingStatuses, setTypingStatuses] = useState<TypingStatusEntry[]>([]);
    const boardRef = useRef<RetrospectiveState | null>(null);
    const typingStatusesRef = useRef<TypingStatusEntry[]>([]);
    const clientRef = useRef<RealtimeClient | null>(null);

    useEffect(() => {
        if (!retrospectiveId) return undefined;

        let cancelled = false;
        boardRef.current = null;
        typingStatusesRef.current = [];
        setBoard(null);
        setTypingStatuses([]);
        setLoading(true);
        setError(null);
        setNotFound(false);
        setConnectionLost(false);

        async function resync(): Promise<void> {
            try {
                // joinBoard() MUST complete before getBoardState() is called — running
                // them concurrently (the previous Promise.all) let the state fetch race
                // ahead of the join and return a snapshot missing the caller's own
                // participant record. Since the corresponding live 'participant created'
                // event for that same join can itself arrive and get dropped (still
                // gated behind this same onConnect call not having resolved yet — see
                // backendRealtimeClient.ts's readyForEvents), that gap was never closed
                // by a later event either, permanently undercounting participants for
                // the caller's own session until its next reconnect.
                await joinBoard(retrospectiveId as string);
                const state = await getBoardState(retrospectiveId as string);
                if (cancelled) return;
                boardRef.current = state;
                setBoard(state);
                // A resync (initial connect or reconnect) supersedes any stale typing
                // signal collected before the gap — start clean rather than risk a
                // "ghost" indicator for someone who stopped typing while disconnected.
                typingStatusesRef.current = [];
                setTypingStatuses([]);
                setLoading(false);
                setError(null);
                setNotFound(false);
            } catch (err) {
                if (cancelled) return;
                if (err instanceof BackendRequestError && err.status === 404) {
                    setNotFound(true);
                }
                setError(messageOf(err));
                setLoading(false);
            }
        }

        const client = connectRealtimeClient(retrospectiveId, {
            onConnect: resync,
            onEvent: (event) => {
                if (cancelled) return;
                if (event.entity === 'typingStatus') {
                    const nextTyping = applyTypingStatusChange(typingStatusesRef.current, event);
                    typingStatusesRef.current = nextTyping;
                    setTypingStatuses(nextTyping);
                    return;
                }
                if (!boardRef.current) return;
                const next = applyEntityChange(boardRef.current, event);
                boardRef.current = next;
                setBoard(next);
            },
            // 045-idle-connection-cleanup, US2/FR-003: the server's own definitive
            // rejections never auto-retry. A 404 reuses the existing "board deleted"
            // full-page state (notFound); a 401 (soft session TTL elapsed, or the
            // session became invalid mid-session) signs the user out so the app's
            // existing AuthWrapper redirect-to-login takes over, instead of a silent
            // retry loop against a session that will never be accepted again.
            onTerminal: (reason) => {
                if (cancelled) return;
                if (reason === 'notFound') {
                    setNotFound(true);
                    return;
                }
                toast.error(t('auth.sessionExpired'));
                void signOut();
            },
            // US2/FR-004: the 5-minute automatic-retry budget was exhausted. Cached
            // board data (if any) stays visible — only live updates are paused until
            // the user retries manually via retryConnection().
            onRetryExhausted: () => {
                if (cancelled) return;
                setConnectionLost(true);
            },
        });
        clientRef.current = client;

        // 045-idle-connection-cleanup, US1/FR-001/FR-002: pause the connection once the
        // tab has been backgrounded for the fixed grace period, and resume it the
        // instant the tab is foregrounded again — resync() (wired as onConnect above)
        // runs on that resume exactly like any other reconnect.
        const unsubscribeVisibility = onHiddenFor(BACKGROUND_GRACE_MS, {
            onHidden: () => client.pause(),
            onResume: () => client.resume(),
        });

        return () => {
            cancelled = true;
            unsubscribeVisibility();
            clientRef.current = null;
            client.close();
        };
        // `t` (react-i18next's translation function) is intentionally omitted: it is
        // only used inside the onTerminal callback for a one-off toast message, and
        // including it would re-run this effect (tearing down and reopening the
        // realtime connection) on every language change or re-render where its
        // reference isn't stable — not a reason to reconnect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retrospectiveId, signOut]);

    return {
        board,
        loading,
        error,
        notFound,
        typingStatuses,
        connectionLost,
        retryConnection: () => {
            setConnectionLost(false);
            clientRef.current?.resume();
        },
    };
}
