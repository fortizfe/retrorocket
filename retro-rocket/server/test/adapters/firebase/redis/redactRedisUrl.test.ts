import { describe, it, expect } from 'vitest';
import { redactRedisUrl } from '../../../../src/adapters/firebase/redis/redactRedisUrl';

// redactRedisUrl backs the `redis_connection_configured` log event (043,
// contracts/redis-connection-logging.md), which exists specifically to answer "did
// REDIS_URL even parse into a usable host" from production logs without ever printing
// credentials. The malformed-JSON-blob case below mirrors the exact shape observed for
// production REDIS_URL via `vercel env ls` during this feature's specification.

describe('redactRedisUrl', () => {
    it('extracts host/port and tls:false from a plain redis:// URL with credentials', () => {
        const result = redactRedisUrl('redis://default:s3cr3t@my-host.example.com:6380');

        expect(result).toEqual({ host: 'my-host.example.com', port: 6380, tls: false });
    });

    it('extracts host and tls:true from a rediss:// URL, defaulting the port when omitted', () => {
        const result = redactRedisUrl('rediss://default:s3cr3t@climbing-mantis-12345.upstash.io');

        expect(result).toEqual({ host: 'climbing-mantis-12345.upstash.io', port: 6379, tls: true });
    });

    it('never includes the password in the returned value', () => {
        const result = redactRedisUrl('rediss://default:s3cr3t@my-host.example.com:6379');

        expect(JSON.stringify(result)).not.toContain('s3cr3t');
    });

    it('reports a parse error for a non-URL, base64-JSON-blob-shaped value', () => {
        // Mirrors what `vercel env ls` showed for production REDIS_URL: a value that
        // base64-decodes to `{"v":"v2","c":...}` rather than a redis(s):// connection string.
        const result = redactRedisUrl('eyJ2IjoidjIiLCJjIjoic29tZS1jaXBoZXJ0ZXh0In0');

        expect(result).toEqual({ parseError: true });
    });

    it('reports a parse error for an unsupported protocol', () => {
        const result = redactRedisUrl('https://not-a-redis-url.example.com');

        expect(result).toEqual({ parseError: true });
    });

    it('reports a parse error when REDIS_URL is undefined', () => {
        const result = redactRedisUrl(undefined);

        expect(result).toEqual({ parseError: true });
    });

    it('reports a parse error for an empty string', () => {
        const result = redactRedisUrl('');

        expect(result).toEqual({ parseError: true });
    });
});
