import * as http from 'node:http';
import { loadConfig } from '../config/env';
import { createStdoutObservability } from '../adapters/observability/stdout';
import { createApp } from './app';
import { buildAuthDeps } from './auth-wiring';
import { buildMcpDeps } from './mcp-wiring';
import { buildBoardsDeps } from './boards-wiring';
import { buildProfileDeps } from './profile-wiring';
import { buildRetrospectiveDeps } from './retrospective-wiring';
import { buildTeamsDeps } from './teams-wiring';
import { attachRealtimeUpgrade } from './ws/realtimeUpgrade';

/**
 * Composition root: resolves configuration, wires ports to their concrete adapters,
 * and returns the ready-to-serve http.Server (the Express app mounted on it, plus the
 * retrospective board's WebSocket upgrade handling attached to the same server
 * instance — Vercel's documented pattern for Node.js Function WebSockets, research.md
 * §1). This is the only place where concrete adapters are selected — the rest of the
 * code depends on ports.
 */
export function buildApp(source: NodeJS.ProcessEnv = process.env): http.Server {
    const config = loadConfig(source);
    const observability = createStdoutObservability({ service: 'retrorocket-backend', env: config.nodeEnv });
    const authDeps = buildAuthDeps(source, config, observability.logger) ?? undefined;
    const mcpDeps = buildMcpDeps(source, config, observability.logger, authDeps?.sessionService, observability.metrics) ?? undefined;
    const boardsDeps = buildBoardsDeps(source, config, observability.logger, authDeps?.sessionService) ?? undefined;
    const profileDeps = buildProfileDeps(source, config, observability.logger, authDeps?.sessionService) ?? undefined;
    const retrospectiveDeps = buildRetrospectiveDeps(source, config, observability.logger, authDeps?.sessionService) ?? undefined;
    const teamsDeps = buildTeamsDeps(source, config, observability.logger, authDeps?.sessionService) ?? undefined;

    const app = createApp({ config, observability, authDeps, mcpDeps, boardsDeps, profileDeps, retrospectiveDeps, teamsDeps });
    const server = http.createServer(app);

    if (retrospectiveDeps) {
        attachRealtimeUpgrade(server, retrospectiveDeps);
    }

    return server;
}
