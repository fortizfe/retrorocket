import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/http/app';
import { createStdoutObservability } from '../../src/adapters/observability/stdout';
import type { ServerConfig } from '../../src/config/env';

function testConfig(): ServerConfig {
    return { nodeEnv: 'test', version: 'test', serverPort: 3001, authTestMode: true };
}

describe('trust proxy configuration (research.md §1, FR-002)', () => {
    it('trusts exactly one proxy hop — Vercel\'s single edge hop in front of this Function', () => {
        const app = createApp({ config: testConfig(), observability: createStdoutObservability() });

        // Express resolves req.ip via this same 'trust proxy' setting internally (the
        // `proxy-addr` library), which is also what the shared rate limiter's key resolver
        // relies on (server/test/http/middleware/rateLimiting.test.ts) — asserting the setting
        // directly on the real app is the precise, stable way to verify this fix without
        // depending on route-registration order in this otherwise black-box app.
        expect(app.get('trust proxy')).toBe(1);
    });
});
