import type { AddressInfo } from 'node:net';
import http from 'node:http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { buildMcpTestApp } from './mcpTestApp';
import { McpConnection } from '../../../src/domain/mcp/McpConnection';
import type { McpRouterDeps } from '../../../src/http/routes/mcp';

const RETRO = { id: 'r1', title: 'Sprint 42', createdBy: 'facilitator-1', createdAt: new Date('2026-07-01') };

async function startServer(app: import('express').Express) {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    return { server, url: `http://127.0.0.1:${port}/api/mcp` };
}

async function connectedClient(url: string, accessToken: string): Promise<Client> {
    const transport = new StreamableHTTPClientTransport(new URL(url), {
        requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(transport);
    return client;
}

async function mintAccessToken(deps: McpRouterDeps, uid: string): Promise<string> {
    const connection = McpConnection.createPending({ id: `conn-${uid}`, uid, clientId: 'client1', clientName: 'Test', nowSeconds: deps.clock.nowSeconds() }).activated(
        'hash',
    );
    await deps.connectionStore.saveConnection(connection);
    return deps.tokenService.issue({ sub: uid, connectionId: connection.data.id, clientId: 'client1' }, deps.clock.nowSeconds(), 3600);
}

function textResult(res: { content: Array<{ type: string; text?: string }> }): unknown {
    const first = res.content[0];
    return first?.text ? JSON.parse(first.text) : undefined;
}

describe('MCP tool transport (Streamable HTTP)', () => {
    let server: http.Server;
    let url: string;
    let deps: McpRouterDeps;
    let facilitatorClient: Client;
    let participantClient: Client;

    beforeAll(async () => {
        const built = buildMcpTestApp({
            retrospectiveFixture: {
                retrospectives: [RETRO],
                listEntries: [{ id: 'r1', title: 'Sprint 42', createdAt: RETRO.createdAt, role: 'facilitator' }],
                participants: [{ name: 'Bob', userId: 'participant-2', joinedAt: new Date() }],
                cards: [
                    { id: 'c1', content: 'went well', column: 'helped', createdBy: 'facilitator-1', createdAt: new Date(), reactions: [{ emoji: '👍', count: 3 }] },
                ],
                actionItems: [{ content: 'Improve standups', assignedToName: 'Bob', dueDate: null }],
                facilitatorNotes: [{ content: 'private facilitator note', timestamp: new Date() }],
            },
        });
        deps = built.deps;
        const started = await startServer(built.app);
        server = started.server;
        url = started.url;

        facilitatorClient = await connectedClient(url, await mintAccessToken(deps, 'facilitator-1'));
        participantClient = await connectedClient(url, await mintAccessToken(deps, 'participant-2'));
    });

    afterAll(async () => {
        await facilitatorClient.close();
        await participantClient.close();
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('list_retrospectives returns the retrospective for the facilitator', async () => {
        const res = await facilitatorClient.callTool({ name: 'list_retrospectives', arguments: {} });
        const body = textResult(res as never) as { retrospectives: Array<{ id: string; role: string }> };
        expect(body.retrospectives).toEqual([expect.objectContaining({ id: 'r1', role: 'facilitator' })]);
    });

    it('get_retrospective_detail includes facilitatorNotes for the facilitator', async () => {
        const res = await facilitatorClient.callTool({ name: 'get_retrospective_detail', arguments: { retrospectiveId: 'r1' } });
        const body = textResult(res as never) as { cards: unknown[]; facilitatorNotes?: unknown[] };
        expect(body.cards).toHaveLength(1);
        expect(body.facilitatorNotes).toHaveLength(1);
    });

    it('get_retrospective_detail omits facilitatorNotes entirely for a participant', async () => {
        const res = await participantClient.callTool({ name: 'get_retrospective_detail', arguments: { retrospectiveId: 'r1' } });
        const body = textResult(res as never) as Record<string, unknown>;
        expect(body).not.toHaveProperty('facilitatorNotes');
    });

    it('get_retrospective_detail returns not_found for a nonexistent id, as a tool error', async () => {
        const res = await facilitatorClient.callTool({ name: 'get_retrospective_detail', arguments: { retrospectiveId: 'nope' } });
        expect((res as { isError?: boolean }).isError).toBe(true);
        const body = textResult(res as never) as { error: { code: string } };
        expect(body.error.code).toBe('not_found');
    });

    it('get_retrospective_summary includes standoutItems/actionItems and gates facilitatorNotes the same way', async () => {
        const facilitatorRes = await facilitatorClient.callTool({ name: 'get_retrospective_summary', arguments: { retrospectiveId: 'r1' } });
        const facilitatorBody = textResult(facilitatorRes as never) as { standoutItems: unknown[]; actionItems: unknown[]; facilitatorNotes?: string[] };
        expect(facilitatorBody.standoutItems).toHaveLength(1);
        expect(facilitatorBody.actionItems).toHaveLength(1);
        expect(facilitatorBody.facilitatorNotes).toEqual(['private facilitator note']);

        const participantRes = await participantClient.callTool({ name: 'get_retrospective_summary', arguments: { retrospectiveId: 'r1' } });
        const participantBody = textResult(participantRes as never) as Record<string, unknown>;
        expect(participantBody).not.toHaveProperty('facilitatorNotes');
    });

    it('rejects a tool call once the connection has been revoked (Clarification Q1)', async () => {
        const revokeToken = await mintAccessToken(deps, 'to-be-revoked');
        const client = await connectedClient(url, revokeToken);
        const connection = await deps.connectionStore.getConnectionById('conn-to-be-revoked');
        await deps.connectionStore.saveConnection(connection!.revoked(deps.clock.nowSeconds()));

        await expect(client.callTool({ name: 'list_retrospectives', arguments: {} })).rejects.toThrow();
        await client.close();
    });
});
