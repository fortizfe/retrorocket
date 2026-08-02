import express, { type Express, type Request, type Response } from 'express';
import type { ServerConfig } from '../config/env';
import type { Observability } from '../application/ports/observability';
import { correlationId } from './middleware/correlationId';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { authRouter, type AuthRouterDeps } from './routes/auth';
import { mcpRouter, type McpRouterDeps } from './routes/mcp';
import { boardsRouter, type BoardsRouterDeps } from './routes/boards';
import { profileRouter, type ProfileRouterDeps } from './routes/profile';
import { retrospectiveRouter, type RetrospectiveRouterDeps } from './routes/retrospectives';

export interface AppDeps {
    config: ServerConfig;
    observability: Observability;
    /** Auth wiring; when absent (e.g. missing secrets) auth routes report a config error. */
    authDeps?: AuthRouterDeps;
    /** MCP connector wiring (feature 015); when absent, /api/mcp/* and /.well-known/* 404. */
    mcpDeps?: McpRouterDeps;
    /** Dashboard boards wiring (feature 017); when absent, /api/boards/* report a config error. */
    boardsDeps?: BoardsRouterDeps;
    /** Mi Perfil profile wiring (feature 018); when absent, /api/profile reports a config error. */
    profileDeps?: ProfileRouterDeps;
    /** Retrospective board wiring (feature 019); when absent, its routes report a config error. */
    retrospectiveDeps?: RetrospectiveRouterDeps;
}

/**
 * Builds the single Express application (driving adapter). The same instance is used
 * by the local dev server and the Vercel serverless shell, so behaviour is identical
 * across environments. All routes live under /api/* (same-origin, FR-002a).
 */
export function createApp(deps: AppDeps): Express {
    const { config, observability } = deps;
    const app = express();

    // Vercel's edge network sits in front of this Function as a single proxy hop, setting
    // X-Forwarded-For to the real client's address. Without trusting that one hop, Express's
    // req.ip falls back to the connecting socket's own address (the proxy's, not the client's),
    // collapsing every distinct user into the same address for IP-keyed rate limiting — the
    // root cause of the shared-bucket 429s fixed by this feature (research.md §1, FR-002).
    app.set('trust proxy', 1);

    app.disable('x-powered-by');
    app.use(express.json());
    // RFC 6749 §4.1.3/§6 mandates application/x-www-form-urlencoded for the OAuth token
    // endpoint (POST /api/mcp/token) — spec-compliant MCP clients (e.g. Claude's
    // remote-connector backend) send it this way, not JSON. Without this, req.body was
    // left undefined for every such request, crashing with "Cannot read properties of
    // undefined (reading 'grant_type')" — a second, more fundamental cause of MCP
    // connections resolving as rejected than the rate-limiter bug fixed in 025.
    app.use(express.urlencoded({ extended: false }));
    app.use(correlationId());

    // Routes
    app.use(healthRouter(config));

    if (deps.authDeps) {
        app.use(authRouter(deps.authDeps));
    } else {
        // Misconfigured: keep health alive but make auth failures explicit rather than 404.
        app.use('/api/auth', (_req: Request, res: Response) => {
            res.status(503).json({
                error: { code: 'config_error', message: 'Authentication is not configured on this deployment' },
                correlationId: String(res.locals.correlationId ?? 'unknown'),
            });
        });
    }

    if (deps.mcpDeps) {
        app.use(mcpRouter(deps.mcpDeps));
    } else {
        app.use('/api/mcp', (_req: Request, res: Response) => {
            res.status(503).json({
                error: { code: 'config_error', message: 'The MCP connector is not configured on this deployment' },
                correlationId: String(res.locals.correlationId ?? 'unknown'),
            });
        });
    }

    if (deps.boardsDeps) {
        app.use(boardsRouter(deps.boardsDeps));
    } else {
        app.use('/api/boards', (_req: Request, res: Response) => {
            res.status(503).json({
                error: { code: 'config_error', message: 'Dashboard boards are not configured on this deployment' },
                correlationId: String(res.locals.correlationId ?? 'unknown'),
            });
        });
    }

    if (deps.profileDeps) {
        app.use(profileRouter(deps.profileDeps));
    } else {
        app.use('/api/profile', (_req: Request, res: Response) => {
            res.status(503).json({
                error: { code: 'config_error', message: 'Mi Perfil is not configured on this deployment' },
                correlationId: String(res.locals.correlationId ?? 'unknown'),
            });
        });
    }

    if (deps.retrospectiveDeps) {
        app.use(retrospectiveRouter(deps.retrospectiveDeps));
    } else {
        app.use(['/api/retrospectives', '/api/cards', '/api/groups', '/api/action-items', '/api/notes'], (_req: Request, res: Response) => {
            res.status(503).json({
                error: { code: 'config_error', message: 'The retrospective board is not configured on this deployment' },
                correlationId: String(res.locals.correlationId ?? 'unknown'),
            });
        });
    }

    // Terminal handlers
    app.use(notFoundHandler());
    app.use(errorHandler(observability.logger));

    return app;
}
