import { loadConfig } from '../config/env';
import { createStdoutObservability } from '../adapters/observability/stdout';
import { createApp } from './app';
import { buildAuthDeps } from './auth-wiring';
import type { Express } from 'express';

/**
 * Composition root: resolves configuration, wires ports to their concrete adapters,
 * and returns the ready-to-serve Express app. This is the only place where concrete
 * adapters are selected — the rest of the code depends on ports.
 */
export function buildApp(source: NodeJS.ProcessEnv = process.env): Express {
    const config = loadConfig(source);
    const observability = createStdoutObservability({ service: 'retrorocket-backend', env: config.nodeEnv });
    const authDeps = buildAuthDeps(source, config, observability.logger) ?? undefined;
    return createApp({ config, observability, authDeps });
}
