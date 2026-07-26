import express, { type Express } from 'express';
import type { ServerConfig } from '../config/env';
import type { Observability } from '../application/ports/observability';
import { correlationId } from './middleware/correlationId';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';

export interface AppDeps {
    config: ServerConfig;
    observability: Observability;
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
    // Auth routes are mounted here in User Story 2.

    // Terminal handlers
    app.use(notFoundHandler());
    app.use(errorHandler(observability.logger));

    return app;
}
