import { Router } from 'express';
import type { ServerConfig } from '../../config/env';

export interface HealthStatus {
    status: 'ok' | 'degraded';
    version: string;
    time: string;
}

/** Liveness/readiness probe (FR-002). */
export function healthRouter(config: Pick<ServerConfig, 'version'>): Router {
    const router = Router();
    router.get('/api/health', (_req, res) => {
        const status: HealthStatus = {
            status: 'ok',
            version: config.version,
            time: new Date().toISOString(),
        };
        res.status(200).json(status);
    });
    return router;
}
