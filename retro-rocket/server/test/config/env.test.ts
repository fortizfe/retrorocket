import { describe, it, expect } from 'vitest';
import { loadConfig, requireVars } from '../../src/config/env';
import { ConfigError } from '../../src/domain/errors';

describe('requireVars', () => {
    it('passes when all keys are present and non-empty', () => {
        expect(() => requireVars({ A: '1', B: 'x' }, ['A', 'B'])).not.toThrow();
    });

    it('throws a ConfigError listing every missing key', () => {
        expect(() => requireVars({ A: '1' }, ['A', 'B', 'C'])).toThrowError(ConfigError);
        try {
            requireVars({ A: '1', B: '  ' }, ['A', 'B', 'C']);
        } catch (e) {
            expect((e as ConfigError).message).toContain('B');
            expect((e as ConfigError).message).toContain('C');
            expect((e as ConfigError).message).not.toContain('A');
        }
    });

    it('treats whitespace-only values as missing', () => {
        expect(() => requireVars({ A: '   ' }, ['A'])).toThrowError(ConfigError);
    });
});

describe('loadConfig', () => {
    it('applies safe defaults when optional vars are absent', () => {
        const config = loadConfig({});
        expect(config.nodeEnv).toBe('development');
        expect(config.version).toBe('dev');
        expect(config.serverPort).toBe(3001);
        expect(config.authTestMode).toBe(false);
    });

    it('reads provided values', () => {
        const config = loadConfig({
            NODE_ENV: 'production',
            BACKEND_VERSION: 'abc123',
            SERVER_PORT: '4000',
            AUTH_TEST_MODE: 'true',
        });
        expect(config.nodeEnv).toBe('production');
        expect(config.version).toBe('abc123');
        expect(config.serverPort).toBe(4000);
        expect(config.authTestMode).toBe(true);
    });

    it('fails fast on an invalid port', () => {
        expect(() => loadConfig({ SERVER_PORT: 'not-a-number' })).toThrowError(ConfigError);
        expect(() => loadConfig({ SERVER_PORT: '0' })).toThrowError(ConfigError);
        expect(() => loadConfig({ SERVER_PORT: '70000' })).toThrowError(ConfigError);
    });

    it('only enables test mode for the exact string "true"', () => {
        expect(loadConfig({ AUTH_TEST_MODE: 'TRUE' }).authTestMode).toBe(false);
        expect(loadConfig({ AUTH_TEST_MODE: '1' }).authTestMode).toBe(false);
    });
});
