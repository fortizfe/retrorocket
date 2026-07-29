import { describe, it, expect, vi, afterEach } from 'vitest';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import WebSocket from 'ws';
import { attachRealtimeUpgrade, type RealtimeUpgradeDeps } from '../../../src/http/ws/realtimeUpgrade';
import type { SessionServicePort } from '../../../src/application/ports';
import type { RealtimeGatewayPort } from '../../../src/application/ports/realtime';
import type { RetrospectiveDTO } from '../../../src/application/ports/retrospective';

function fakeSessionService(validTokens: Record<string, string> = { 'session-u1': 'u1' }): SessionServicePort {
    return {
        issue: vi.fn(),
        verify: vi.fn(async (token: string) => {
            const uid = validTokens[token];
            if (!uid) return null;
            return { data: { sub: uid } } as never;
        }),
        refresh: vi.fn(),
    };
}

function fakeGateway(): RealtimeGatewayPort {
    return { register: vi.fn(), unregister: vi.fn() };
}

function fakeBoardPort(boards: Record<string, boolean> = { 'board-1': true }) {
    return {
        getRetrospective: vi.fn(async (id: string): Promise<RetrospectiveDTO | null> => {
            if (!boards[id]) return null;
            return { id, title: 't', createdBy: 'owner', createdAt: new Date(), updatedAt: new Date(), participantCount: 1, isActive: true, columnGroupingStates: {} };
        }),
    };
}

async function startServer(deps: RealtimeUpgradeDeps): Promise<{ server: http.Server; url: string }> {
    const server = http.createServer((_req, res) => res.end());
    attachRealtimeUpgrade(server, deps);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    return { server, url: `ws://127.0.0.1:${port}` };
}

let activeServer: http.Server | undefined;

afterEach(async () => {
    if (activeServer) {
        await new Promise<void>((resolve) => activeServer!.close(() => resolve()));
        activeServer = undefined;
    }
});

describe('GET /api/retrospectives/:id/live (WebSocket upgrade)', () => {
    it('accepts a connection with a valid session cookie for an existing board', async () => {
        const gateway = fakeGateway();
        const { server, url } = await startServer({
            sessionService: fakeSessionService(),
            clock: { nowSeconds: () => 0 },
            realtimeGateway: gateway,
            retrospectiveBoardPort: fakeBoardPort(),
        });
        activeServer = server;

        const ws = new WebSocket(`${url}/api/retrospectives/board-1/live`, { headers: { Cookie: 'rr_session=session-u1' } });
        await new Promise<void>((resolve, reject) => {
            ws.on('open', resolve);
            ws.on('error', reject);
        });
        expect(gateway.register).toHaveBeenCalledTimes(1);
        ws.close();
    });

    it('closes with 4401 when the session cookie is missing', async () => {
        const { server, url } = await startServer({
            sessionService: fakeSessionService(),
            clock: { nowSeconds: () => 0 },
            realtimeGateway: fakeGateway(),
            retrospectiveBoardPort: fakeBoardPort(),
        });
        activeServer = server;

        const ws = new WebSocket(`${url}/api/retrospectives/board-1/live`);
        const code = await new Promise<number>((resolve) => ws.on('close', (c) => resolve(c)));
        expect(code).toBe(4401);
    });

    it('closes with 4401 when the session cookie is invalid', async () => {
        const { server, url } = await startServer({
            sessionService: fakeSessionService(),
            clock: { nowSeconds: () => 0 },
            realtimeGateway: fakeGateway(),
            retrospectiveBoardPort: fakeBoardPort(),
        });
        activeServer = server;

        const ws = new WebSocket(`${url}/api/retrospectives/board-1/live`, { headers: { Cookie: 'rr_session=garbage' } });
        const code = await new Promise<number>((resolve) => ws.on('close', (c) => resolve(c)));
        expect(code).toBe(4401);
    });

    it('closes with 4404 for an unknown board', async () => {
        const { server, url } = await startServer({
            sessionService: fakeSessionService(),
            clock: { nowSeconds: () => 0 },
            realtimeGateway: fakeGateway(),
            retrospectiveBoardPort: fakeBoardPort({}),
        });
        activeServer = server;

        const ws = new WebSocket(`${url}/api/retrospectives/missing-board/live`, { headers: { Cookie: 'rr_session=session-u1' } });
        const code = await new Promise<number>((resolve) => ws.on('close', (c) => resolve(c)));
        expect(code).toBe(4404);
    });

    it('replies to a ping message with pong', async () => {
        const { server, url } = await startServer({
            sessionService: fakeSessionService(),
            clock: { nowSeconds: () => 0 },
            realtimeGateway: fakeGateway(),
            retrospectiveBoardPort: fakeBoardPort(),
        });
        activeServer = server;

        const ws = new WebSocket(`${url}/api/retrospectives/board-1/live`, { headers: { Cookie: 'rr_session=session-u1' } });
        await new Promise<void>((resolve) => ws.on('open', () => resolve()));
        const reply = new Promise<unknown>((resolve) => {
            ws.on('message', (raw) => resolve(JSON.parse(raw.toString())));
        });
        ws.send(JSON.stringify({ type: 'ping' }));
        await expect(reply).resolves.toEqual({ type: 'pong' });
        ws.close();
    });

    it('unregisters the connection from the gateway on close', async () => {
        const gateway = fakeGateway();
        const { server, url } = await startServer({
            sessionService: fakeSessionService(),
            clock: { nowSeconds: () => 0 },
            realtimeGateway: gateway,
            retrospectiveBoardPort: fakeBoardPort(),
        });
        activeServer = server;

        const ws = new WebSocket(`${url}/api/retrospectives/board-1/live`, { headers: { Cookie: 'rr_session=session-u1' } });
        await new Promise<void>((resolve) => ws.on('open', () => resolve()));
        ws.close();
        await new Promise<void>((resolve) => ws.on('close', () => resolve()));
        // The server-side 'close' handler (which calls gateway.unregister) can run a tick
        // after the client observes its own close event — give it a moment to settle.
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
        expect(gateway.unregister).toHaveBeenCalledTimes(1);
    });
});
