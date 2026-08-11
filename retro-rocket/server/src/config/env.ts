import { ConfigError } from '../domain/errors';

export interface ServerConfig {
    nodeEnv: string;
    version: string;
    serverPort: number;
    authTestMode: boolean;
    /** Redis connection string backing Story 3's cross-instance listener coordination
     * (040, contracts/redis-coordination-protocol.md). Absent means that story is
     * disabled for this deployment — retrospective-wiring.ts falls back to the
     * uncoordinated FirestoreRealtimeGatewayAdapter, exactly like every deployment
     * before this feature. No `requireVars` entry: this is optional, not required. */
    redisUrl: string | undefined;
}

/**
 * Fail-fast assertion that the given environment variables are present and non-empty.
 * Throws a single ConfigError listing every missing key (never leaks values).
 */
export function requireVars(source: NodeJS.ProcessEnv, keys: string[]): void {
    const missing = keys.filter((k) => {
        const v = source[k];
        return v === undefined || v.trim() === '';
    });
    if (missing.length > 0) {
        throw new ConfigError(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

/**
 * Load the base server configuration used by every request path. Applies safe
 * defaults for optional values and fails fast on an invalid port.
 */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): ServerConfig {
    const rawPort = source.SERVER_PORT ?? '3001';
    const serverPort = Number(rawPort);
    if (!Number.isInteger(serverPort) || serverPort <= 0 || serverPort > 65535) {
        throw new ConfigError(`Invalid SERVER_PORT: "${rawPort}" (expected an integer 1-65535)`);
    }

    return {
        nodeEnv: source.NODE_ENV ?? 'development',
        version: source.BACKEND_VERSION ?? 'dev',
        serverPort,
        authTestMode: source.AUTH_TEST_MODE === 'true',
        redisUrl: source.REDIS_URL || undefined,
    };
}
