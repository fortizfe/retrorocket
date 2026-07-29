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

export interface RealtimeUpgradeDeps {
    sessionService: SessionServicePort;
    clock: ClockPort;
    realtimeGateway: RealtimeGatewayPort;
    retrospectiveBoardPort: { getRetrospective(id: string): Promise<RetrospectiveDTO | null> };
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
    const session = token ? await deps.sessionService.verify(token, deps.clock.nowSeconds()) : null;

    if (!session) {
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
        setupConnection(ws, retrospectiveId, uid, deps.realtimeGateway);
    });
}

function completeThenClose(wss: WebSocketServer, req: http.IncomingMessage, socket: Socket, head: Buffer, code: number): void {
    wss.handleUpgrade(req, socket, head, (ws) => {
        ws.close(code);
    });
}

function setupConnection(ws: WebSocket, retrospectiveId: string, uid: string, gateway: RealtimeGatewayPort): void {
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

    ws.on('close', () => gateway.unregister(connection));
}
