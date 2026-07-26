import express, { type Express, type Request, type Response } from 'express';
import type { ServerConfig } from '../config/env';
import type { Observability } from '../application/ports/observability';
import { correlationId } from './middleware/correlationId';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { authRouter, type AuthRouterDeps } from './routes/auth';

export interface AppDeps {
    config: ServerConfig;
    observability: Observability;
    /** Auth wiring; when absent (e.g. missing secrets) auth routes report a config error. */
    authDeps?: AuthRouterDeps;
}

/**
 * Builds the single Express application (driving adapter). The same instance is used
 * by the local dev server and the Vercel serverless shell, so behaviour is identical
 * across environments. All routes live under /api/* (same-origin, FR-002a).
 */
export function createApp(deps: AppDeps): Express {
    const { config, observability } = deps;
    const app = express();

    app.disable('x-powered-by');
    app.use(express.json());
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

    // Terminal handlers
    app.use(notFoundHandler());
    app.use(errorHandler(observability.logger));

    return app;
}
