import { describe, it, expect, vi, afterEach } from 'vitest';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import WebSocket from 'ws';
import { attachRealtimeUpgrade, HeartbeatMonitor, type RealtimeUpgradeDeps } from '../../../src/http/ws/realtimeUpgrade';
import type { SessionServicePort } from '../../../src/application/ports';
import type { RealtimeGatewayPort } from '../../../src/application/ports/realtime';
import type { RetrospectiveDTO } from '../../../src/application/ports/retrospective';

function fakeSessionService(validTokens: Record<string, string> = { 'session-u1': 'u1' }, activeTokens?: Set<string>): SessionServicePort {
    return {
        issue: vi.fn(),
        verify: vi.fn(async (token: string) => {
            const uid = validTokens[token];
            if (!uid) return null;
            return { data: { sub: uid }, isActive: () => !activeTokens || activeTokens.has(token) } as never;
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
            return { id, title: 't', createdBy: 'owner', createdAt: new Date(), updatedAt: new Date(), participantCount: 1, isActive: true, columnGroupingStates: {}, isAnonymous: false };
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

    // 045-idle-connection-cleanup, US5/FR-007.
    it('closes with 4401 when the session is cryptographically valid but past its soft TTL', async () => {
        const { server, url } = await startServer({
            sessionService: fakeSessionService({ 'session-u1': 'u1' }, new Set()), // no token is "active"
            clock: { nowSeconds: () => 0 },
            realtimeGateway: fakeGateway(),
            retrospectiveBoardPort: fakeBoardPort(),
        });
        activeServer = server;

        const ws = new WebSocket(`${url}/api/retrospectives/board-1/live`, { headers: { Cookie: 'rr_session=session-u1' } });
        const code = await new Promise<number>((resolve) => ws.on('close', (c) => resolve(c)));
        expect(code).toBe(4401);
    });

    // 045-idle-connection-cleanup, US3/FR-005: the server-side protocol-level liveness
    // sweep. The termination *decision* logic is fully covered by the HeartbeatMonitor
    // unit tests below (no real socket needed there). This integration test instead
    // proves the wiring around it doesn't produce false positives — a real, normally-
    // responding `ws` client (which auto-replies to protocol pings, like every real
    // client/browser) must NOT be terminated across several heartbeat intervals. A true
    // "client goes silent" integration test was attempted with `ws.pause()` but proved
    // unreliable (Node's `close` event did not fire deterministically on the paused
    // socket even after the server called `terminate()`), so it was dropped rather than
    // leave a flaky/hanging test in the suite — HeartbeatMonitor's own tests already
    // prove the termination logic is correct.
    describe('server-side heartbeat sweep', () => {
        it('keeps a connection that responds normally to pings alive past several heartbeat intervals', async () => {
            const gateway = fakeGateway();
            const { server, url } = await startServer({
                sessionService: fakeSessionService(),
                clock: { nowSeconds: () => 0 },
                realtimeGateway: gateway,
                retrospectiveBoardPort: fakeBoardPort(),
                heartbeatIntervalMs: 20,
                maxMissedHeartbeats: 2,
            });
            activeServer = server;

            const ws = new WebSocket(`${url}/api/retrospectives/board-1/live`, { headers: { Cookie: 'rr_session=session-u1' } });
            await new Promise<void>((resolve) => ws.on('open', () => resolve()));
            // A normal `ws` client auto-responds to protocol pings — no explicit
            // handling needed here for that; just wait past several intervals.
            await new Promise<void>((resolve) => setTimeout(resolve, 120));
            expect(gateway.unregister).not.toHaveBeenCalled();
            ws.close();
        });
    });
});

describe('HeartbeatMonitor', () => {
    it('sends a ping (returns false) on the first tick', () => {
        const monitor = new HeartbeatMonitor(2);
        expect(monitor.tick()).toBe(false);
    });

    it('does not terminate after a single missed pong (below the threshold)', () => {
        const monitor = new HeartbeatMonitor(2);
        monitor.tick(); // ping #1 sent
        expect(monitor.tick()).toBe(false); // 1 missed so far, ping #2 sent
    });

    it('terminates once consecutive missed pongs reach the threshold', () => {
        const monitor = new HeartbeatMonitor(2);
        monitor.tick(); // ping #1
        monitor.tick(); // 1 missed, ping #2
        expect(monitor.tick()).toBe(true); // 2 missed — terminate
    });

    it('a pong resets the missed count, so a single subsequent silence does not terminate', () => {
        const monitor = new HeartbeatMonitor(2);
        monitor.tick(); // ping #1
        monitor.tick(); // 1 missed, ping #2
        monitor.onPong();
        expect(monitor.tick()).toBe(false); // fresh streak, ping #3
        expect(monitor.tick()).toBe(false); // 1 missed, ping #4
    });

    it('respects a threshold of 1 (terminate on the very first missed pong)', () => {
        const monitor = new HeartbeatMonitor(1);
        monitor.tick(); // ping #1
        expect(monitor.tick()).toBe(true); // 1 missed already meets the threshold
    });
});
