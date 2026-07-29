/**
 * WebSocket client for the retrospective board's real-time delivery channel (feature
 * 019, GET /api/retrospectives/:id/live). One connection per open board. Implements
 * reconnect-with-exponential-backoff and resync-on-(re)connect exactly per
 * contracts/realtime-protocol.md: the browser automatically attaches the rr_session
 * cookie to the same-origin upgrade request, so no token/handshake message is needed.
 */

export type RealtimeEntity = 'card' | 'group' | 'actionItem' | 'timer' | 'typingStatus' | 'participant' | 'retrospective' | 'facilitatorNote';
export type RealtimeOp = 'created' | 'updated' | 'deleted';

export interface EntityChangeEvent {
    type: 'entity_change';
    entity: RealtimeEntity;
    op: RealtimeOp;
    id: string;
    data?: Record<string, unknown>;
}

export interface RealtimeClientHandlers {
    onEvent(event: EntityChangeEvent): void;
    /**
     * Called after every successful (re)connection. MUST resync full board state
     * (getBoardState()) before returning — events are buffered/dropped until this
     * resolves, guaranteeing no missed-event gap ever produces a stale/"ghost" card.
     */
    onConnect(): void | Promise<void>;
}

export interface RealtimeClient {
    close(): void;
}

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 15000;
/** WebSocket.readyState's OPEN value (spec-fixed at 1) — compared as a literal rather
 * than via `ws.OPEN` since that constant is only guaranteed on the WebSocket class
 * itself in some environments/test doubles, not necessarily on every instance. */
const WS_OPEN = 1;

type WebSocketFactory = (url: string) => WebSocket;

function defaultUrl(retrospectiveId: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/retrospectives/${encodeURIComponent(retrospectiveId)}/live`;
}

function isEntityChangeEvent(value: unknown): value is EntityChangeEvent {
    return !!value && typeof value === 'object' && (value as { type?: unknown }).type === 'entity_change';
}

/** Connects to the board's live channel; call the returned client's close() on unmount. */
export function connectRealtimeClient(
    retrospectiveId: string,
    handlers: RealtimeClientHandlers,
    wsFactory: WebSocketFactory = (url) => new WebSocket(url),
): RealtimeClient {
    let closedByCaller = false;
    let backoffMs = INITIAL_BACKOFF_MS;
    let socket: WebSocket | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let readyForEvents = false;

    function stopHeartbeat(): void {
        if (heartbeatTimer !== undefined) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = undefined;
        }
    }

    function connect(): void {
        readyForEvents = false;
        const ws = wsFactory(defaultUrl(retrospectiveId));
        socket = ws;

        ws.onopen = () => {
            backoffMs = INITIAL_BACKOFF_MS;
            heartbeatTimer = setInterval(() => {
                if (ws.readyState === WS_OPEN) ws.send(JSON.stringify({ type: 'ping' }));
            }, HEARTBEAT_INTERVAL_MS);

            void Promise.resolve(handlers.onConnect()).then(() => {
                readyForEvents = true;
            });
        };

        ws.onmessage = (event: MessageEvent) => {
            if (!readyForEvents) return;
            let message: unknown;
            try {
                message = JSON.parse(String(event.data));
            } catch {
                return;
            }
            if (isEntityChangeEvent(message)) handlers.onEvent(message);
        };

        ws.onclose = () => {
            stopHeartbeat();
            if (closedByCaller) return;
            const delay = backoffMs;
            backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
            reconnectTimer = setTimeout(connect, delay);
        };

        ws.onerror = () => {
            ws.close();
        };
    }

    connect();

    return {
        close(): void {
            closedByCaller = true;
            stopHeartbeat();
            if (reconnectTimer !== undefined) clearTimeout(reconnectTimer);
            socket?.close();
        },
    };
}
