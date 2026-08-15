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
    /**
     * Called when the server closes the connection for a definitive reason (045-idle-
     * connection-cleanup, FR-003) — the client does NOT auto-reconnect for either case;
     * the caller decides what "sign in again" / "board gone" means for its UI.
     */
    onTerminal?(reason: 'unauthenticated' | 'notFound'): void;
    /**
     * Called once the 5-minute transient-retry budget (FR-004) is exhausted following
     * repeated non-terminal close/error events. Automatic reconnection stops; call the
     * returned client's resume() to try again (manual retry).
     */
    onRetryExhausted?(): void;
}

export interface RealtimeClient {
    /** Tears down the connection permanently — no further reconnect, paused or manual. */
    close(): void;
    /**
     * Deliberately closes the connection without scheduling a reconnect (045-idle-
     * connection-cleanup, US1) — used when the tab has been backgrounded for the
     * configured grace period. A later resume() call reconnects immediately.
     */
    pause(): void;
    /**
     * Reconnects immediately, bypassing backoff, and resets the retry-exhaustion budget.
     * Used both to resume a visibility-paused connection (US1) and for a user-triggered
     * manual retry after the retry budget is exhausted (US2). A no-op if already
     * connected.
     */
    resume(): void;
}

/** Server-assigned close codes for a definitive rejection (mirrors the source of truth
 * in server/src/http/ws/realtimeUpgrade.ts's CLOSE_UNAUTHENTICATED/CLOSE_NOT_FOUND —
 * duplicated here as two literal constants rather than a shared package, since two
 * integers don't justify a cross-workspace dependency). */
const CLOSE_UNAUTHENTICATED = 4401;
const CLOSE_NOT_FOUND = 4404;

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 15000;
/** Total elapsed time a streak of non-terminal reconnect failures is allowed to keep
 * retrying automatically before giving up and asking for a manual retry (FR-004). */
const RETRY_BUDGET_MS = 5 * 60 * 1000;
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
    let pausedByVisibility = false;
    let backoffMs = INITIAL_BACKOFF_MS;
    let socket: WebSocket | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let readyForEvents = false;
    /** Timestamp (ms) of the first failure in the current non-terminal failure streak,
     * or null while healthy — the anchor for the 5-minute retry budget (FR-004). Reset
     * on every successful open. */
    let firstFailureAt: number | null = null;

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
            firstFailureAt = null;
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

        ws.onclose = (event: CloseEvent) => {
            stopHeartbeat();
            if (closedByCaller) return;

            // A deliberate pause (US1) is consumed here and does NOT schedule a
            // reconnect — the caller is expected to call resume() once the tab is
            // foregrounded again (FR-001/FR-002).
            if (pausedByVisibility) {
                pausedByVisibility = false;
                return;
            }

            // The server's own definitive rejections (FR-003) — never auto-retry.
            if (event.code === CLOSE_UNAUTHENTICATED) {
                handlers.onTerminal?.('unauthenticated');
                return;
            }
            if (event.code === CLOSE_NOT_FOUND) {
                handlers.onTerminal?.('notFound');
                return;
            }

            // Transient failure — keep retrying with exponential backoff, but only for
            // up to RETRY_BUDGET_MS of total elapsed time since the streak began
            // (FR-004). A prior successful open already reset firstFailureAt to null.
            if (firstFailureAt === null) firstFailureAt = Date.now();
            if (Date.now() - firstFailureAt >= RETRY_BUDGET_MS) {
                handlers.onRetryExhausted?.();
                return;
            }

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
        pause(): void {
            if (closedByCaller || pausedByVisibility) return;
            pausedByVisibility = true;
            if (reconnectTimer !== undefined) {
                clearTimeout(reconnectTimer);
                reconnectTimer = undefined;
            }
            // If there's no live socket (e.g. a reconnect attempt is currently
            // backing off), there's nothing to close — pausedByVisibility stays true
            // and resume() below still restarts cleanly.
            socket?.close(1000);
        },
        resume(): void {
            if (closedByCaller) return;
            if (socket !== null && socket.readyState === WS_OPEN) return; // already connected
            pausedByVisibility = false;
            if (reconnectTimer !== undefined) {
                clearTimeout(reconnectTimer);
                reconnectTimer = undefined;
            }
            backoffMs = INITIAL_BACKOFF_MS;
            firstFailureAt = null;
            connect();
        },
    };
}
