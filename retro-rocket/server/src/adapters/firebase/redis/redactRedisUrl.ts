const DEFAULT_REDIS_PORT = 6379;

export type RedactedRedisTarget = { host: string; port: number; tls: boolean } | { parseError: true };

/**
 * Parses `REDIS_URL` into a host/port/tls summary that's safe to log — never returns
 * credentials. Backs the `redis_connection_configured` log event (043,
 * contracts/redis-connection-logging.md), which exists to answer, from the very next
 * deploy's logs, whether `REDIS_URL` even parsed into a usable Redis target at all.
 */
export function redactRedisUrl(url: string | undefined): RedactedRedisTarget {
    if (!url) return { parseError: true };

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return { parseError: true };
    }

    if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:') return { parseError: true };
    if (!parsed.hostname) return { parseError: true };

    return {
        host: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : DEFAULT_REDIS_PORT,
        tls: parsed.protocol === 'rediss:',
    };
}
