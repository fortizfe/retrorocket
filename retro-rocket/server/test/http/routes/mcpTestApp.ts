import express, { type Express } from 'express';
import { correlationId } from '../../../src/http/middleware/correlationId';
import { errorHandler, notFoundHandler } from '../../../src/http/middleware/errorHandler';
import { mcpRouter, type McpRouterDeps } from '../../../src/http/routes/mcp';
import { JoseMcpTokenAdapter } from '../../../src/adapters/session/JoseMcpTokenAdapter';
import {
    inMemoryClientStore,
    inMemoryConnectionStore,
    sequentialRandom,
    fixedClock,
    fakeSessionServiceFor,
    fakeMetrics,
    NOW,
} from '../../application/use-cases/mcp/mcpFakes';
import { fakeRetrospectiveReadPort, type FakeRetrospectiveFixture } from '../../application/use-cases/mcp/fakes';
import { McpClientRegistration } from '../../../src/domain/mcp/McpClientRegistration';

export { NOW } from '../../application/use-cases/mcp/mcpFakes';

export const BASE_URL = 'http://localhost:3001';
export const SIGN_IN_REDIRECT = '/';
export const CONSENT_REDIRECT = '/mcp/consent';

export interface McpTestAppOptions {
    registeredClients?: McpClientRegistration[];
    signedInUid?: string;
    retrospectiveFixture?: FakeRetrospectiveFixture;
    overrides?: Partial<McpRouterDeps>;
}

export function buildMcpTestApp(options: McpTestAppOptions = {}): { app: Express; deps: McpRouterDeps } {
    const deps: McpRouterDeps = {
        clientStore: inMemoryClientStore(options.registeredClients ?? []),
        connectionStore: inMemoryConnectionStore(),
        tokenService: new JoseMcpTokenAdapter('test-mcp-signing-key'),
        retrospectiveReadPort: fakeRetrospectiveReadPort(options.retrospectiveFixture ?? {}),
        sessionService: fakeSessionServiceFor(options.signedInUid ?? 'u1'),
        clock: fixedClock(),
        random: sequentialRandom(),
        metrics: fakeMetrics(),
        baseUrl: BASE_URL,
        signInRedirect: SIGN_IN_REDIRECT,
        consentRedirect: CONSENT_REDIRECT,
        ...options.overrides,
    };

    const app = express();
    // Mirrors createApp()'s trust-proxy setting (server/src/http/app.ts) so IP-keyed
    // rate-limit behavior in tests reflects the real, single-Vercel-hop configuration.
    app.set('trust proxy', 1);
    app.use(express.json());
    // Mirrors app.ts: RFC 6749 mandates application/x-www-form-urlencoded for the OAuth
    // token endpoint, which real MCP clients use — without this, req.body was left
    // undefined for that content type and every real token exchange 500'd.
    app.use(express.urlencoded({ extended: false }));
    app.use(correlationId());
    app.use(mcpRouter(deps));
    app.use(notFoundHandler());
    app.use(errorHandler());
    return { app, deps };
}

export function sessionCookieFor(uid: string): string {
    return `rr_session=${encodeURIComponent(`session-${uid}`)}`;
}

export { NOW as CLOCK_NOW };
