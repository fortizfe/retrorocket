import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { ClockPort, RandomPort, SessionServicePort } from '../../application/ports';
import type { McpClientStorePort, McpConnectionStorePort, RetrospectiveReadPort } from '../../application/ports/mcp';
import { AppError, NotFoundError } from '../../domain/errors';
import { readCookie, SESSION_COOKIE } from '../cookies';
import { mcpAuthMiddleware, type McpAuthDeps } from '../middleware/mcpAuth';
import { registerMcpClient } from '../../application/use-cases/mcp/RegisterMcpClient';
import { startMcpAuthorization, decideMcpAuthorization } from '../../application/use-cases/mcp/AuthorizeMcpConnection';
import { classifyOrigin } from '../../domain/mcp/ConnectionOrigin';
import { exchangeMcpToken } from '../../application/use-cases/mcp/ExchangeMcpToken';
import { listConnections } from '../../application/use-cases/mcp/ListConnections';
import { revokeConnection } from '../../application/use-cases/mcp/RevokeConnection';
import { listRetrospectives } from '../../application/use-cases/mcp/ListRetrospectives';
import { getRetrospectiveDetail } from '../../application/use-cases/mcp/GetRetrospectiveDetail';
import { getRetrospectiveSummary } from '../../application/use-cases/mcp/GetRetrospectiveSummary';

export interface McpRouterDeps extends McpAuthDeps {
    clientStore: McpClientStorePort;
    connectionStore: McpConnectionStorePort;
    retrospectiveReadPort: RetrospectiveReadPort;
    sessionService: SessionServicePort;
    clock: ClockPort;
    random: RandomPort;
    /** Public base URL of this deployment (e.g. https://retrorocket.example.com). */
    baseUrl: string;
    /** SPA route to send an unauthenticated user to sign in; receives ?returnTo=... */
    signInRedirect: string;
    /** SPA route that renders the consent screen; receives ?requestCode=...&clientName=... */
    consentRedirect: string;
}

function firstQuery(value: unknown): string {
    const v = Array.isArray(value) ? value[0] : value;
    return typeof v === 'string' ? v : '';
}

function correlationOf(res: Response): string {
    const id = res.locals.correlationId;
    return typeof id === 'string' && id !== '' ? id : 'unknown';
}

async function requireSession(req: Request, deps: McpRouterDeps): Promise<{ sub: string }> {
    const session = await deps.sessionService.verify(readCookie(req, SESSION_COOKIE) ?? '', deps.clock.nowSeconds());
    if (!session) throw new AppError('unauthenticated', 'Sign-in required', 401);
    return session.data as { sub: string };
}

/** Builds a fresh McpServer with the three read-only tools, scoped to one authenticated uid. */
function buildMcpToolServer(retrospectiveReadPort: RetrospectiveReadPort, requesterUid: string): McpServer {
    const server = new McpServer({ name: 'retrorocket-mcp', version: '1.0.0' });

    server.registerTool(
        'list_retrospectives',
        { description: "List the retrospectives the connected user has access to (as facilitator or participant)." },
        async () => {
            const retrospectives = await listRetrospectives({ retrospectiveReadPort }, requesterUid);
            return { content: [{ type: 'text', text: JSON.stringify({ retrospectives }) }] };
        },
    );

    server.registerTool(
        'get_retrospective_detail',
        {
            description: 'Get the full detail of one retrospective: cards, groups, reactions, participants, sentiment, action items.',
            inputSchema: { retrospectiveId: z.string() },
        },
        async ({ retrospectiveId }) => {
            try {
                const detail = await getRetrospectiveDetail({ retrospectiveReadPort }, { retrospectiveId, requesterUid });
                return { content: [{ type: 'text', text: JSON.stringify(detail) }] };
            } catch (err) {
                if (err instanceof NotFoundError) {
                    return { content: [{ type: 'text', text: JSON.stringify({ error: { code: 'not_found', message: err.message } }) }], isError: true };
                }
                throw err;
            }
        },
    );

    server.registerTool(
        'get_retrospective_summary',
        {
            description: 'Get a structured, report-ready summary of one retrospective.',
            inputSchema: { retrospectiveId: z.string() },
        },
        async ({ retrospectiveId }) => {
            try {
                const summary = await getRetrospectiveSummary({ retrospectiveReadPort }, { retrospectiveId, requesterUid });
                return { content: [{ type: 'text', text: JSON.stringify(summary) }] };
            } catch (err) {
                if (err instanceof NotFoundError) {
                    return { content: [{ type: 'text', text: JSON.stringify({ error: { code: 'not_found', message: err.message } }) }], isError: true };
                }
                throw err;
            }
        },
    );

    return server;
}

/**
 * MCP connector routes (feature 015): Dynamic Client Registration, OAuth 2.1 authorize/
 * token, connection management, well-known metadata, and the read-only MCP tool
 * transport itself. All routes are new; /api/auth/* (feature 014) is reused as-is for
 * the underlying Google/GitHub sign-in step.
 */
export function mcpRouter(deps: McpRouterDeps): Router {
    const router = Router();

    // Same rationale as auth.ts's authLimiter: blunt brute-force/resource exhaustion
    // within Vercel's free-tier request budget (FR-015, FR-016). Unlike
    // auth/boards/profile/retrospectives, these two stay IP-keyed (the default
    // `express-rate-limit` behavior) rather than switching to rateLimiting.ts's
    // session-first resolver: both routes are authenticated by an MCP client
    // (OAuth token exchange / Bearer access token), never by the browser's rr_session
    // cookie, so there is no session identity to key on here. What both already needed
    // — and tokenLimiter was still missing — is app.ts's trust-proxy fix (T005, which
    // benefits every router including this one for free) plus the same ApiErrorBody
    // envelope every other limiter in the app returns (FR-004) (021, research.md §1).
    const tokenLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 60,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        validate: false,
        handler: (_req, res) => {
            res.status(429).json({ error: { code: 'rate_limited', message: 'Too many requests — please wait a moment and try again.' }, correlationId: correlationOf(res) });
        },
    });
    const toolLimiter = rateLimit({
        windowMs: 60 * 1000,
        limit: 120,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        validate: false,
        handler: (_req, res) => {
            res.status(429).json({ error: { code: 'rate_limited', message: 'Too many requests' }, correlationId: correlationOf(res) });
        },
    });

    // --- Discovery ---------------------------------------------------------

    router.get('/.well-known/oauth-authorization-server', (_req, res) => {
        res.status(200).json({
            issuer: deps.baseUrl,
            authorization_endpoint: `${deps.baseUrl}/api/mcp/authorize`,
            token_endpoint: `${deps.baseUrl}/api/mcp/token`,
            registration_endpoint: `${deps.baseUrl}/api/mcp/register`,
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code', 'refresh_token'],
            code_challenge_methods_supported: ['S256'],
            token_endpoint_auth_methods_supported: ['none'],
        });
    });

    router.get('/.well-known/oauth-protected-resource', (_req, res) => {
        res.status(200).json({ resource: `${deps.baseUrl}/api/mcp`, authorization_servers: [deps.baseUrl] });
    });

    // --- Dynamic Client Registration ----------------------------------------

    router.post('/api/mcp/register', async (req, res) => {
        const body = req.body as { client_name?: unknown; redirect_uris?: unknown };
        const client = await registerMcpClient(
            { clientStore: deps.clientStore, clock: deps.clock, random: deps.random },
            {
                clientName: typeof body.client_name === 'string' ? body.client_name : '',
                redirectUris: Array.isArray(body.redirect_uris) ? body.redirect_uris.map(String) : [],
            },
        );
        res.status(201).json({
            client_id: client.data.clientId,
            client_name: client.data.clientName,
            redirect_uris: client.data.redirectUris,
            token_endpoint_auth_method: 'none',
        });
    });

    // --- Authorization -------------------------------------------------------

    router.get('/api/mcp/authorize', async (req, res) => {
        const result = await startMcpAuthorization(
            { clientStore: deps.clientStore, connectionStore: deps.connectionStore, sessionService: deps.sessionService, clock: deps.clock, random: deps.random },
            {
                clientId: firstQuery(req.query.client_id),
                redirectUri: firstQuery(req.query.redirect_uri),
                codeChallenge: firstQuery(req.query.code_challenge),
                codeChallengeMethod: firstQuery(req.query.code_challenge_method),
                state: firstQuery(req.query.state),
                sessionToken: readCookie(req, SESSION_COOKIE),
            },
        );

        switch (result.kind) {
            case 'invalid_client_or_redirect':
                return res.status(400).json({
                    error: { code: 'invalid_request', message: 'Unknown client_id or unregistered redirect_uri' },
                    correlationId: correlationOf(res),
                });
            case 'redirect_error':
                return res.redirect(302, `${result.redirectUri}?error=${encodeURIComponent(result.error)}&state=${encodeURIComponent(result.state)}`);
            case 'needs_login':
                return res.redirect(302, `${deps.signInRedirect}?returnTo=${encodeURIComponent(req.originalUrl)}`);
            case 'consent':
                return res.redirect(
                    302,
                    `${deps.consentRedirect}?requestCode=${encodeURIComponent(result.requestCode)}&clientName=${encodeURIComponent(result.clientName)}`,
                );
        }
    });

    router.post('/api/mcp/authorize/decision', async (req, res) => {
        const session = await requireSession(req, deps);
        const body = req.body as { requestCode?: unknown; approve?: unknown };
        if (typeof body.requestCode !== 'string' || typeof body.approve !== 'boolean') {
            throw new AppError('invalid_request', 'requestCode and approve are required', 400);
        }

        const result = await decideMcpAuthorization(
            { connectionStore: deps.connectionStore, clock: deps.clock, random: deps.random },
            {
                requestCode: body.requestCode,
                uid: session.sub,
                approve: body.approve,
                origin: classifyOrigin(req.header('user-agent')),
            },
        );
        if (result.kind === 'not_found') throw new NotFoundError('Authorization request not found, already decided, or expired');

        const url = new URL(result.redirectUri);
        for (const [key, value] of Object.entries(result.params)) url.searchParams.set(key, value);
        res.status(200).json({ redirectUrl: url.toString() });
    });

    // --- Token exchange -------------------------------------------------------

    router.post('/api/mcp/token', tokenLimiter, async (req, res) => {
        const body = req.body as Record<string, unknown>;
        const tokenDeps = { connectionStore: deps.connectionStore, tokenService: deps.tokenService, clock: deps.clock, random: deps.random };

        if (body.grant_type === 'authorization_code') {
            const result = await exchangeMcpToken(tokenDeps, {
                grantType: 'authorization_code',
                code: String(body.code ?? ''),
                redirectUri: String(body.redirect_uri ?? ''),
                clientId: String(body.client_id ?? ''),
                codeVerifier: String(body.code_verifier ?? ''),
            });
            return res.status(200).json({
                access_token: result.accessToken,
                token_type: result.tokenType,
                expires_in: result.expiresIn,
                refresh_token: result.refreshToken,
            });
        }

        if (body.grant_type === 'refresh_token') {
            const result = await exchangeMcpToken(tokenDeps, {
                grantType: 'refresh_token',
                refreshToken: String(body.refresh_token ?? ''),
                clientId: String(body.client_id ?? ''),
            });
            return res.status(200).json({
                access_token: result.accessToken,
                token_type: result.tokenType,
                expires_in: result.expiresIn,
                refresh_token: result.refreshToken,
            });
        }

        throw new AppError('unsupported_grant_type', 'grant_type must be authorization_code or refresh_token', 400);
    });

    // --- Connection management (session-cookie authenticated) -----------------

    router.get('/api/mcp/connections', async (req, res) => {
        const session = await requireSession(req, deps);
        const connections = await listConnections({ connectionStore: deps.connectionStore }, session.sub);
        res.status(200).json({
            connections: connections.map((c) => ({
                id: c.id,
                clientName: c.clientName,
                createdAt: new Date(c.createdAt * 1000).toISOString(),
                status: c.status,
                origin: c.origin,
                lastUsedAt: c.lastUsedAt !== null ? new Date(c.lastUsedAt * 1000).toISOString() : null,
            })),
        });
    });

    router.delete('/api/mcp/connections/:id', async (req, res) => {
        const session = await requireSession(req, deps);
        const result = await revokeConnection({ connectionStore: deps.connectionStore, clock: deps.clock }, { connectionId: req.params.id, uid: session.sub });
        if (result === 'not_found') throw new NotFoundError('Connection not found');
        res.status(204).end();
    });

    // --- MCP tool transport (Streamable HTTP, stateless — FR-014: no caching) --

    router.post('/api/mcp', toolLimiter, mcpAuthMiddleware(deps), async (req, res) => {
        const auth = res.locals.mcpAuth as { sub: string };
        const server = buildMcpToolServer(deps.retrospectiveReadPort, auth.sub);
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        res.on('close', () => {
            void transport.close();
            void server.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    });

    return router;
}
