import type * as http from 'node:http';
import type { Socket } from 'node:net';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ClockPort, SessionServicePort } from '../../application/ports';
import type { RealtimeConnection, RealtimeGatewayPort } from '../../application/ports/realtime';
import type { RetrospectiveDTO } from '../../application/ports/retrospective';
import { SESSION_COOKIE } from '../cookies';

const PATH_PATTERN = /^\/api\/retrospectives\/([^/]+)\/live$/;

/** Custom app-level close codes mirroring HTTP status codes (realtime-protocol.md). */
const CLOSE_UNAUTHENTICATED = 4401;
const CLOSE_NOT_FOUND = 4404;

/** Fixed via /speckit-clarify (045-idle-connection-cleanup, FR-005) — server-side
 * liveness sweep cadence and miss threshold. Not user/env-configurable in production;
 * only overridable through RealtimeUpgradeDeps for fast, deterministic tests. */
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;
const DEFAULT_MAX_MISSED_HEARTBEATS = 2;

/**
 * Pure decision logic behind the server-side WebSocket liveness sweep (045-idle-
 * connection-cleanup, US3/FR-005) — deliberately extracted from the `ws.ping()`/
 * `ws.on('pong')`/`ws.terminate()` wiring in setupConnection() below so it can be unit-
 * tested directly with no real socket involved, mirroring this codebase's established
 * pattern of pulling pure scheduling/decision logic out of thin I/O glue (see
 * computeSweepDelayMs in FirestoreRealtimeGatewayAdapter.ts). One tick == one heartbeat
 * interval elapsing without an intervening onPong() call.
 */
export class HeartbeatMonitor {
    private missed = 0;
    private awaitingPong = false;

    constructor(private readonly maxMissedHeartbeats: number) {}

    /** Call once per heartbeat interval. Returns true when the connection should be
     * terminated now (maxMissedHeartbeats consecutive un-ponged pings); false when a
     * ping should be sent for this tick instead. */
    tick(): boolean {
        if (this.awaitingPong) {
            this.missed++;
            if (this.missed >= this.maxMissedHeartbeats) return true;
        }
        this.awaitingPong = true;
        return false;
    }

    /** Call whenever a pong is received — clears the miss count. */
    onPong(): void {
        this.awaitingPong = false;
        this.missed = 0;
    }
}

export interface RealtimeUpgradeDeps {
    sessionService: SessionServicePort;
    clock: ClockPort;
    realtimeGateway: RealtimeGatewayPort;
    retrospectiveBoardPort: { getRetrospective(id: string): Promise<RetrospectiveDTO | null> };
    /** Test-only override of the FR-005 heartbeat cadence — defaults to 30s/2 misses. */
    heartbeatIntervalMs?: number;
    maxMissedHeartbeats?: number;
}

function readRawCookie(cookieHeader: string | undefined, name: string): string | undefined {
    if (!cookieHeader) return undefined;
    for (const part of cookieHeader.split(';')) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        if (part.slice(0, eq).trim() === name) {
            return decodeURIComponent(part.slice(eq + 1).trim());
        }
    }
    return undefined;
}

/**
 * Attaches the WebSocket upgrade handling for GET /api/retrospectives/:id/live to an
 * existing http.Server (research.md §1, §4; contracts/realtime-protocol.md). Session
 * auth is verified during the 'upgrade' event, before the handshake completes for the
 * happy path; rejected connections still complete the handshake so a proper WebSocket
 * close code (4401/4404) can be delivered to the client, per the protocol contract.
 */
export function attachRealtimeUpgrade(server: http.Server, deps: RealtimeUpgradeDeps): void {
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (req: http.IncomingMessage, socket: Socket, head: Buffer) => {
        const pathname = (req.url ?? '').split('?')[0];
        const match = PATH_PATTERN.exec(pathname);
        if (!match) {
            socket.destroy();
            return;
        }
        const retrospectiveId = decodeURIComponent(match[1]);

        void handleUpgrade(req, socket, head, retrospectiveId, deps, wss);
    });
}

async function handleUpgrade(
    req: http.IncomingMessage,
    socket: Socket,
    head: Buffer,
    retrospectiveId: string,
    deps: RealtimeUpgradeDeps,
    wss: WebSocketServer,
): Promise<void> {
    const token = readRawCookie(req.headers.cookie, SESSION_COOKIE);
    const now = deps.clock.nowSeconds();
    const session = token ? await deps.sessionService.verify(token, now) : null;

    // 045-idle-connection-cleanup, US5/FR-007: a session past its soft TTL is rejected
    // the same way an invalid session is — even though it's still within its absolute
    // TTL and would otherwise pass verify(). Recoverable via the client's existing
    // silent-refresh flow for a genuinely present user (contracts/session-soft-ttl-
    // enforcement.md).
    if (!session || !session.isActive(now)) {
        completeThenClose(wss, req, socket, head, CLOSE_UNAUTHENTICATED);
        return;
    }

    const uid = (session.data as unknown as { sub: string }).sub;
    const board = await deps.retrospectiveBoardPort.getRetrospective(retrospectiveId);
    if (!board) {
        completeThenClose(wss, req, socket, head, CLOSE_NOT_FOUND);
        return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
        setupConnection(
            ws,
            retrospectiveId,
            uid,
            deps.realtimeGateway,
            deps.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS,
            deps.maxMissedHeartbeats ?? DEFAULT_MAX_MISSED_HEARTBEATS,
        );
    });
}

function completeThenClose(wss: WebSocketServer, req: http.IncomingMessage, socket: Socket, head: Buffer, code: number): void {
    wss.handleUpgrade(req, socket, head, (ws) => {
        ws.close(code);
    });
}

function setupConnection(
    ws: WebSocket,
    retrospectiveId: string,
    uid: string,
    gateway: RealtimeGatewayPort,
    heartbeatIntervalMs: number,
    maxMissedHeartbeats: number,
): void {
    const connection: RealtimeConnection = {
        retrospectiveId,
        uid,
        send(event) {
            if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(event));
        },
    };

    gateway.register(connection);

    ws.on('message', (raw: Buffer) => {
        try {
            const message = JSON.parse(raw.toString()) as { type?: string };
            if (message?.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
        } catch {
            // Malformed client message — the protocol is read-only from the client's
            // perspective besides ping, so silently ignoring anything else is safe.
        }
    });

    // 045-idle-connection-cleanup, US3/FR-005: protocol-level (not the JSON message
    // above) liveness sweep — independent of the client's own 15s JSON keep-alive ping,
    // which nothing today inspects for staleness. Pruned connections free their
    // gateway registration (and, transitively, the board's data subscription — US4)
    // within heartbeatIntervalMs * maxMissedHeartbeats instead of waiting on an
    // unbounded TCP-level detection.
    const monitor = new HeartbeatMonitor(maxMissedHeartbeats);
    const heartbeatTimer = setInterval(() => {
        if (monitor.tick()) {
            ws.terminate();
            return;
        }
        ws.ping();
    }, heartbeatIntervalMs);
    ws.on('pong', () => monitor.onPong());

    ws.on('close', () => {
        clearInterval(heartbeatTimer);
        gateway.unregister(connection);
    });
}
